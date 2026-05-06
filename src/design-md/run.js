import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import { harvestStylesFromPage } from './extract/computed-styles.js';
import { extractCustomProperties } from './extract/custom-properties.js';
import { buildTokenIndex } from './extract/var-trace.js';
import { generateDesignMd } from './generate.js';
import { isAvailable as isAiAvailable } from '../ai/client.js';
import { runRoleNamingStage } from '../ai/stages/role-naming.js';

// ============================================================================
// runDesignMdJob — top-level worker for the DESIGN.md job type.
//
// Unlike runCloneJob, this worker does NOT capture/serve the cloned site. It
// runs a lean Playwright session that:
//   1. navigates to the URL
//   2. waits for hydration
//   3. captures index.html + every stylesheet body (minimum needed by the
//      custom-property extractor — written in a replay-compatible layout so
//      extractCustomProperties() works without modification)
//   4. harvests live computed styles + pseudo-state diffs
//   5. takes screenshots for downstream AI enrichment (Phase 6.2+)
//   6. generates design.md + tokens.json + tailwind.config.json + DTCG tokens
//
// Side effects: writes to <jobDir>/output/{replay,design-md,visual}/.
// Phases reported via onProgress: queued → navigating → harvesting →
// screenshots → generating → complete.
// ============================================================================

const VIEWPORT = { width: 1440, height: 900 };
const NAV_TIMEOUT_MS = 60_000;
const SETTLE_TIMEOUT_MS = 8_000;

export async function runDesignMdJob(job, { onProgress }) {
  const tick = (patch) => { try { onProgress?.(patch); } catch {} };

  const outDir = path.join(job.jobDir, 'output');
  const replayDir = path.join(outDir, 'replay');
  const bodiesDir = path.join(replayDir, 'bodies');
  const dmDir = path.join(outDir, 'design-md');
  const visualDir = path.join(outDir, 'visual');
  for (const d of [outDir, replayDir, bodiesDir, dmDir, visualDir]) {
    fs.mkdirSync(d, { recursive: true });
  }

  let browser;
  try {
    tick({ phase: 'navigating', message: `opening ${job.url}` });
    browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    const page = await ctx.newPage();

    await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });

    // Best-effort settle: wait for network idle, fonts, fall through if slow.
    try {
      await page.waitForLoadState('networkidle', { timeout: SETTLE_TIMEOUT_MS });
    } catch {}
    try {
      await page.evaluate(async () => {
        if (document.fonts) {
          await document.fonts.ready;
        }
      });
    } catch {}

    tick({ phase: 'harvesting', message: 'capturing HTML + CSS' });
    await captureHtmlAndCss(page, job.url, replayDir, bodiesDir);

    // Phase 1: extract CSS custom properties from the saved replay layout.
    let tokensJson;
    try {
      const tokens = extractCustomProperties(job.jobDir);
      tokensJson = {
        jobId: job.id,
        sourceUrl: job.url,
        extractedAt: new Date().toISOString(),
        themes: tokens.themes,
        stats: tokens.stats,
        liveHarvest: true,
      };
    } catch (err) {
      tokensJson = {
        jobId: job.id,
        sourceUrl: job.url,
        extractedAt: new Date().toISOString(),
        themes: {},
        stats: { error: err.message },
        liveHarvest: true,
      };
    }
    fs.writeFileSync(path.join(dmDir, 'tokens.json'), JSON.stringify(tokensJson, null, 2));

    // Phase 2: harvest computed styles + pseudo-state diffs from the live page.
    tick({ phase: 'harvesting', message: 'reading computed styles from live page' });
    const tokenIndex = buildTokenIndex(tokensJson);
    const harvest = await harvestStylesFromPage(page, {
      tokenIndex,
      viewport: page.viewportSize() || VIEWPORT,
      harvestPseudo: true,
    });
    fs.writeFileSync(path.join(dmDir, 'computed.json'), JSON.stringify({
      jobId: job.id,
      harvestedAt: new Date().toISOString(),
      sourceUrl: job.url,
      liveHarvest: true,
      viewport: harvest.viewport,
      probes: harvest.probes,
      stats: harvest.stats,
    }, null, 2));

    // Cleanup probe attributes left on the live page (hygiene).
    try {
      await page.evaluate(() => {
        document.querySelectorAll('[data-design-md-probe]').forEach((el) => {
          el.removeAttribute('data-design-md-probe');
        });
      });
    } catch {}

    // Phase 3: screenshots — feed for downstream AI enrichment (Phase 6.2+).
    tick({ phase: 'screenshots', message: 'capturing visual evidence' });
    try {
      await page.screenshot({
        path: path.join(visualDir, 'desktop-fullpage.png'),
        fullPage: true,
      });
      await page.screenshot({
        path: path.join(visualDir, 'desktop-viewport.png'),
        fullPage: false,
      });
    } catch (err) {
      console.warn(`[design-md ${job.id}] screenshot failed:`, err.message);
    }

    await browser.close();
    browser = null;

    // Phase 4a: dry-generate to extract deterministic roles. We do this
    // before any AI call so the AI stage receives the same name→hex map
    // the markdown will eventually emit. Skipping disk writes lets us
    // discard this pass cleanly if AI fails.
    tick({ phase: 'generating', message: 'extracting deterministic roles' });
    const prelim = generateDesignMd(job.jobDir, { write: false });

    // Phase 4b: AI role-naming. Mints a brand-voice display name and one
    // sentence of role prose per color. Writes an envelope sidecar that
    // the next generate pass picks up via loadAiRoleNames(). Graceful
    // degrade: missing key, validation failure, or any error short-circuits
    // back to the deterministic-only emit path.
    let aiNaming = null;
    if (isAiAvailable() && prelim.roles && Object.keys(prelim.roles).length) {
      const colorMap = {};
      for (const [name, info] of Object.entries(prelim.roles)) {
        if (info?.hex) colorMap[name] = info.hex;
      }
      if (Object.keys(colorMap).length) {
        tick({ phase: 'enriching', message: `naming ${Object.keys(colorMap).length} colors with Gemini` });
        try {
          aiNaming = await runRoleNamingStage({
            jobDir: job.jobDir,
            roles: colorMap,
            screenshotPath: path.join(visualDir, 'desktop-viewport.png'),
            sourceUrl: job.url,
            siteName: prelim.name,
          });
          if (!aiNaming.ok) {
            console.warn(`[design-md ${job.id}] role-naming AI: ${aiNaming.code} ${aiNaming.error || ''}`);
          }
        } catch (err) {
          console.warn(`[design-md ${job.id}] role-naming AI threw: ${err.message}`);
          aiNaming = { ok: false, code: 'threw', error: err.message };
        }
      }
    }

    // Phase 4c: final generate (writes design.md + sidecars). If the AI
    // envelope was written, the three-way provenance branch in generate.js
    // emits `**Linear Lavender** #5e6ad2 (`primary`) — …` instead of the
    // raw role-slug fallback.
    tick({ phase: 'generating', message: 'emitting design.md' });
    const result = generateDesignMd(job.jobDir, { write: true });
    const summary = result.lint?.summary || {};

    tick({
      phase: 'complete',
      message: `design.md ready (${(result.components || []).length} components, lint E${summary.errors ?? '?'}/W${summary.warnings ?? '?'}/I${summary.infos ?? '?'})`,
      verify: {
        status: (summary.errors > 0) ? 'errors' : (summary.warnings > 0 ? 'warnings' : 'ok'),
        sourceUrl: job.url,
        verifiedAt: new Date().toISOString(),
        components: (result.components || []).length,
        lint: summary,
        probesHarvested: harvest.stats.probesHarvested,
        pseudoStateDiffs: harvest.stats.pseudoStateDiffs,
        ai: aiNaming
          ? {
              roleNaming: aiNaming.ok
                ? { ok: true, fromCache: !!aiNaming.fromCache, model: aiNaming.envelope?.modelId, count: aiNaming.envelope?.data?.roles?.length || 0 }
                : { ok: false, code: aiNaming.code },
            }
          : null,
      },
    });
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}

// Save index.html + every loaded stylesheet body in a replay-compatible
// layout so extractCustomProperties() works without changes:
//   <jobDir>/output/replay/manifest.json   { entries: { <url>: { body, mimeType } } }
//   <jobDir>/output/replay/bodies/<sha1>   raw body bytes
//   <jobDir>/output/index.html             root document outerHTML
async function captureHtmlAndCss(page, sourceUrl, replayDir, bodiesDir) {
  const html = await page.content();
  fs.writeFileSync(path.join(path.dirname(replayDir), 'index.html'), html);

  // Enumerate every stylesheet via the CSSOM, serialize each rule list back
  // to text. For external sheets the browser exposes `cssRules` once CORS
  // permits — Playwright's same-origin context covers most public sites.
  // For sheets where access is blocked, we refetch via fetch() (still inside
  // the page) which works because the page already loaded them.
  const sheets = await page.evaluate(async () => {
    const out = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let cssText = '';
      let href = sheet.href || null;
      try {
        const rules = sheet.cssRules || [];
        cssText = Array.from(rules).map((r) => r.cssText).join('\n');
      } catch (_) {
        // CORS/protected sheet — try refetching the resource.
        if (href) {
          try {
            const r = await fetch(href, { credentials: 'omit' });
            if (r.ok) cssText = await r.text();
          } catch {}
        }
      }
      if (cssText) out.push({ href, cssText });
    }
    return out;
  });

  const entries = {};
  let inlineCounter = 0;
  for (const { href, cssText } of sheets) {
    const url = href || `inline://style[${inlineCounter++}]`;
    const sha = crypto.createHash('sha1').update(cssText).digest('hex');
    fs.writeFileSync(path.join(bodiesDir, sha), cssText);
    entries[url] = { body: sha, mimeType: 'text/css' };
  }

  fs.writeFileSync(
    path.join(replayDir, 'manifest.json'),
    JSON.stringify({ sourceUrl, capturedAt: new Date().toISOString(), entries }, null, 2)
  );
}
