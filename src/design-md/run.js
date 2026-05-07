import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import { harvestStylesFromPage } from './extract/computed-styles.js';
import { extractCustomProperties } from './extract/custom-properties.js';
import { buildTokenIndex } from './extract/var-trace.js';
import { discoverPages, pageSlug } from './extract/page-discovery.js';
import { generateDesignMd } from './generate.js';
import { isAvailable as isAiAvailable } from '../ai/client.js';
import { runRoleNamingStage } from '../ai/stages/role-naming.js';
import { runCopyGenerationStage } from '../ai/stages/copy-generation.js';

// ============================================================================
// runDesignMdJob — top-level worker for the DESIGN.md job type.
//
// Phase 6.2.5: this worker now harvests up to 5 pages per site (home +
// 4 representative discovered pages — pricing, customers, docs, signup
// etc.) and unions the harvest. getdesign.md takes a URL; we take a URL
// and crawl. Page selection logic lives in extract/page-discovery.js;
// here we orchestrate: navigate → capture sheets + harvest probes per
// page, then merge into a single manifest + computed.json the rest of
// the pipeline already understands. Probes carry a `pageUrl` field so
// downstream provenance can attribute components/roles to source pages.
//
// Side effects: writes to <jobDir>/output/{replay,design-md,visual}/.
// Phases reported via onProgress: queued → navigating → harvesting →
// screenshots → generating → complete.
// ============================================================================

const VIEWPORT = { width: 1440, height: 900 };
const NAV_TIMEOUT_MS = 60_000;
const SETTLE_TIMEOUT_MS = 8_000;

function readMaxPages() {
  if (process.env.DESIGN_MD_MULTIPAGE === '0') return 1;
  const raw = parseInt(process.env.DESIGN_MD_MAX_PAGES || '5', 10);
  if (!Number.isFinite(raw) || raw < 1) return 5;
  return Math.min(raw, 8);
}

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

    await navigateAndSettle(page, job.url);

    // Capture the post-redirect URL — many marketing sites redirect across
    // hostnames (notion.so → notion.com). Discovery's same-origin filter
    // must use the *final* hostname or it rejects all anchors.
    const effectiveHomeUrl = page.url() || job.url;

    // Discover representative secondary pages from the home anchor graph.
    // This must happen on home — the home nav is what brand-emphasizes
    // the canonical sections. Fallback to home-only if discovery throws.
    const maxPages = readMaxPages();
    let pageList = [{ url: effectiveHomeUrl, role: 'home' }];
    if (maxPages > 1) {
      try {
        pageList = await discoverPages(page, effectiveHomeUrl, { max: maxPages });
      } catch (err) {
        console.warn(`[design-md ${job.id}] page-discovery failed: ${err.message}`);
      }
    }
    tick({
      phase: 'navigating',
      message: `crawling ${pageList.length} page${pageList.length === 1 ? '' : 's'}: ${pageList.map((p) => pageSlug(p.url)).join(', ')}`,
    });

    // Save home HTML once (replay manifest only needs one HTML doc — the
    // custom-property extractor reads it for inline <style> blocks).
    const homeHtml = await page.content();
    fs.writeFileSync(path.join(outDir, 'index.html'), homeHtml);

    // Per-page accumulators. mergedEntries dedupes external sheets across
    // pages by URL (most are global). Inline sheets are namespaced by page
    // slug so two pages' inline blocks don't collide.
    const mergedEntries = {};
    const harvests = []; // { pageUrl, role, viewport, probes, stats }
    const pageSummaries = []; // public manifest of crawled pages

    for (let i = 0; i < pageList.length; i++) {
      const p = pageList[i];
      const slug = pageSlug(p.url);

      // First page is already loaded from the goto+settle above.
      if (i > 0) {
        tick({
          phase: 'navigating',
          message: `[${i + 1}/${pageList.length}] ${p.url}`,
        });
        try {
          await navigateAndSettle(page, p.url);
        } catch (err) {
          console.warn(`[design-md ${job.id}] nav failed for ${p.url}: ${err.message}`);
          pageSummaries.push({ url: p.url, role: p.role, slug, status: 'nav_failed', error: err.message });
          continue;
        }
      }

      tick({
        phase: 'harvesting',
        message: `[${i + 1}/${pageList.length}] capturing CSS for ${slug}`,
      });
      let pageEntries = {};
      try {
        pageEntries = await capturePageStylesheets(page, slug, bodiesDir);
        Object.assign(mergedEntries, pageEntries);
      } catch (err) {
        console.warn(`[design-md ${job.id}] stylesheet capture failed for ${p.url}: ${err.message}`);
      }

      tick({
        phase: 'harvesting',
        message: `[${i + 1}/${pageList.length}] reading computed styles for ${slug}`,
      });
      let harvest = null;
      try {
        // tokenIndex grows monotonically as we accumulate stylesheets;
        // re-build per page so later pages get var-trace enrichment from
        // earlier pages' tokens. Cheap (~10ms per build).
        const interimManifest = {
          sourceUrl: p.url,
          capturedAt: new Date().toISOString(),
          entries: { ...mergedEntries },
        };
        const interimTokens = extractTokensFromInterimManifest(job.jobDir, interimManifest, replayDir);
        const tokenIndex = buildTokenIndex(interimTokens);
        harvest = await harvestStylesFromPage(page, {
          tokenIndex,
          viewport: page.viewportSize() || VIEWPORT,
          harvestPseudo: true,
        });
        // Tag every probe with the page it came from for downstream
        // provenance + multi-page-aware grouping.
        for (const probe of harvest.probes) {
          probe.pageUrl = p.url;
          probe.pageSlug = slug;
        }
        harvests.push({
          pageUrl: p.url,
          role: p.role,
          slug,
          viewport: harvest.viewport,
          probes: harvest.probes,
          stats: harvest.stats,
        });
        pageSummaries.push({
          url: p.url,
          role: p.role,
          slug,
          status: 'ok',
          probesHarvested: harvest.stats.probesHarvested,
          pseudoStateDiffs: harvest.stats.pseudoStateDiffs || 0,
        });
      } catch (err) {
        console.warn(`[design-md ${job.id}] harvest failed for ${p.url}: ${err.message}`);
        pageSummaries.push({ url: p.url, role: p.role, slug, status: 'harvest_failed', error: err.message });
      }

      // Hygiene: clear probe attributes before next nav.
      try {
        await page.evaluate(() => {
          document.querySelectorAll('[data-design-md-probe]').forEach((el) => {
            el.removeAttribute('data-design-md-probe');
          });
        });
      } catch {}

      // Screenshots on home only — visual evidence for AI stages doesn't
      // need every page; multi-viewport breadth is a separate phase.
      if (i === 0) {
        try {
          await page.screenshot({ path: path.join(visualDir, 'desktop-fullpage.png'), fullPage: true });
          await page.screenshot({ path: path.join(visualDir, 'desktop-viewport.png'), fullPage: false });
        } catch (err) {
          console.warn(`[design-md ${job.id}] screenshot failed:`, err.message);
        }
      }
    }

    // Final manifest write — single source of truth across all crawled
    // pages. extractCustomProperties below sees the union.
    fs.writeFileSync(
      path.join(replayDir, 'manifest.json'),
      JSON.stringify(
        {
          sourceUrl: job.url,
          capturedAt: new Date().toISOString(),
          entries: mergedEntries,
          pages: pageSummaries,
        },
        null,
        2
      )
    );

    // Final tokens.json from the merged manifest.
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
        pages: pageSummaries,
      };
    } catch (err) {
      tokensJson = {
        jobId: job.id,
        sourceUrl: job.url,
        extractedAt: new Date().toISOString(),
        themes: {},
        stats: { error: err.message },
        liveHarvest: true,
        pages: pageSummaries,
      };
    }
    fs.writeFileSync(path.join(dmDir, 'tokens.json'), JSON.stringify(tokensJson, null, 2));

    // Union harvests into one computed.json. Probes concat in page order;
    // groupComponents downstream picks reps by area×richness, so a
    // pricing-page button-primary can outrank a home-page one if it has
    // a richer pseudo-state diff.
    const unionedProbes = [];
    const aggregatedStats = {
      probesHarvested: 0,
      pseudoStatesProbed: 0,
      pseudoStateDiffs: 0,
      pseudoStateAncestorHits: 0,
      pseudoRulesDetectedHover: 0,
      pseudoRulesDetectedFocus: 0,
      pagesCrawled: harvests.length,
    };
    let viewport = VIEWPORT;
    for (const h of harvests) {
      unionedProbes.push(...h.probes);
      aggregatedStats.probesHarvested += h.stats.probesHarvested || 0;
      aggregatedStats.pseudoStatesProbed += h.stats.pseudoStatesProbed || 0;
      aggregatedStats.pseudoStateDiffs += h.stats.pseudoStateDiffs || 0;
      aggregatedStats.pseudoStateAncestorHits += h.stats.pseudoStateAncestorHits || 0;
      aggregatedStats.pseudoRulesDetectedHover += h.stats.pseudoRulesDetectedHover || 0;
      aggregatedStats.pseudoRulesDetectedFocus += h.stats.pseudoRulesDetectedFocus || 0;
      viewport = h.viewport || viewport;
    }
    fs.writeFileSync(
      path.join(dmDir, 'computed.json'),
      JSON.stringify(
        {
          jobId: job.id,
          harvestedAt: new Date().toISOString(),
          sourceUrl: job.url,
          liveHarvest: true,
          multiPage: harvests.length > 1,
          pages: pageSummaries,
          viewport,
          probes: unionedProbes,
          stats: aggregatedStats,
        },
        null,
        2
      )
    );

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

    // Phase 4c: brand-voice copy generation. Mints brandThesis (replaces
    // YAML description), voiceProfile (a new ## Voice section), and per-
    // section blurbs (intro paragraphs prepended to ## Colors / Typography
    // / Components / Layout). Uses both screenshots for atmospheric
    // grounding and reuses the role-naming labels — so blurbs can reference
    // "Linear Indigo" or "Stripe Blurple" instead of raw hex. Same graceful
    // degrade as role-naming: any failure path leaves the deterministic
    // emit untouched.
    let aiCopy = null;
    if (isAiAvailable() && (Object.keys(prelim.roles || {}).length || Object.keys(prelim.ds?.typography || {}).length)) {
      const colorsForCopy = [];
      const aiNames = aiNaming?.ok ? indexRoleNamesFromEnvelope(aiNaming.envelope) : {};
      for (const [name, info] of Object.entries(prelim.roles || {})) {
        if (!info?.hex) continue;
        const labels = aiNames[name];
        colorsForCopy.push({
          name,
          hex: info.hex,
          displayName: labels?.displayName || null,
          roleDescription: labels?.roleDescription || null,
        });
      }
      const typoForCopy = [];
      for (const [name, t] of Object.entries(prelim.ds?.typography || {})) {
        typoForCopy.push({
          name,
          fontFamily: t.fontFamily || 'unknown',
          fontSize: t.fontSize || '',
          fontWeight: t.fontWeight ?? '',
        });
      }
      tick({ phase: 'enriching', message: `writing brand-voice copy with Gemini` });
      try {
        aiCopy = await runCopyGenerationStage({
          jobDir: job.jobDir,
          siteName: prelim.name,
          sourceUrl: job.url,
          colors: colorsForCopy,
          typography: typoForCopy,
          screenshotPaths: [
            path.join(visualDir, 'desktop-viewport.png'),
            path.join(visualDir, 'desktop-fullpage.png'),
          ],
        });
        if (!aiCopy.ok) {
          console.warn(`[design-md ${job.id}] copy-generation AI: ${aiCopy.code} ${aiCopy.error || ''}`);
        }
      } catch (err) {
        console.warn(`[design-md ${job.id}] copy-generation AI threw: ${err.message}`);
        aiCopy = { ok: false, code: 'threw', error: err.message };
      }
    }

    // Phase 4d: final generate (writes design.md + sidecars). The three-way
    // provenance branch in generate.js consumes both envelopes:
    //   role-naming    → **Linear Indigo** #5e6ad2 (primary) — …
    //   copy-generation → YAML description, ## Voice, section intros
    tick({ phase: 'generating', message: 'emitting design.md' });
    const result = generateDesignMd(job.jobDir, { write: true });
    const summary = result.lint?.summary || {};

    tick({
      phase: 'complete',
      message: `design.md ready (${pageSummaries.filter((p) => p.status === 'ok').length} pages, ${(result.components || []).length} components, lint E${summary.errors ?? '?'}/W${summary.warnings ?? '?'}/I${summary.infos ?? '?'})`,
      verify: {
        status: (summary.errors > 0) ? 'errors' : (summary.warnings > 0 ? 'warnings' : 'ok'),
        sourceUrl: job.url,
        verifiedAt: new Date().toISOString(),
        components: (result.components || []).length,
        lint: summary,
        pagesCrawled: pageSummaries.filter((p) => p.status === 'ok').length,
        probesHarvested: aggregatedStats.probesHarvested,
        pseudoStateDiffs: aggregatedStats.pseudoStateDiffs,
        ai: (aiNaming || aiCopy)
          ? {
              roleNaming: aiNaming
                ? (aiNaming.ok
                    ? { ok: true, fromCache: !!aiNaming.fromCache, model: aiNaming.envelope?.modelId, count: aiNaming.envelope?.data?.roles?.length || 0 }
                    : { ok: false, code: aiNaming.code })
                : null,
              copyGeneration: aiCopy
                ? (aiCopy.ok
                    ? {
                        ok: true,
                        fromCache: !!aiCopy.fromCache,
                        model: aiCopy.envelope?.modelId,
                        traits: aiCopy.envelope?.data?.voiceProfile?.length || 0,
                        blurbs: aiCopy.envelope?.data?.sectionBlurbs?.length || 0,
                        globalConfidence: aiCopy.envelope?.data?.globalConfidence ?? null,
                      }
                    : { ok: false, code: aiCopy.code })
                : null,
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

async function navigateAndSettle(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
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
}

// Build a temporary tokens.json-shaped object from an in-memory manifest
// so we can call buildTokenIndex without round-tripping through disk.
// extractCustomProperties expects a job dir with output/replay/manifest.json
// + bodies/ on disk; we already have those for the *current* state, so just
// call it through. Returns the same shape as the persisted tokens.json.
function extractTokensFromInterimManifest(jobDir, manifest, replayDir) {
  // Persist a temp manifest at the canonical path so extractCustomProperties
  // sees the latest aggregate. The final write at end of crawl will
  // overwrite this with identical content.
  fs.writeFileSync(path.join(replayDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  try {
    const tokens = extractCustomProperties(jobDir);
    return {
      themes: tokens.themes,
      stats: tokens.stats,
    };
  } catch {
    return { themes: {}, stats: {} };
  }
}

// Flatten role-naming envelope items into a name → labels lookup so the
// copy-generation prompt can quote brand-voice names ("Linear Indigo") next
// to the harvest hex without re-reading the disk sidecar.
function indexRoleNamesFromEnvelope(env) {
  const out = {};
  const items = env?.data?.roles;
  if (!Array.isArray(items)) return out;
  for (const item of items) {
    if (!item || typeof item.tokenPath !== 'string') continue;
    const m = /^colors\.(.+)$/.exec(item.tokenPath);
    if (!m) continue;
    out[m[1]] = {
      displayName: item.displayName,
      roleDescription: item.roleDescription,
      confidence: item.confidence,
    };
  }
  return out;
}

// Capture every loaded stylesheet for the current page and write its body
// to bodiesDir keyed by sha1. Returns { [url]: { body: sha, mimeType } }.
// External sheets dedupe naturally across pages because we use the URL
// as the key; inline sheets are namespaced with the page slug so two
// pages' inline blocks don't collide on `inline://style[0]`.
async function capturePageStylesheets(page, slug, bodiesDir) {
  const sheets = await page.evaluate(async () => {
    const out = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let cssText = '';
      let href = sheet.href || null;
      try {
        const rules = sheet.cssRules || [];
        cssText = Array.from(rules).map((r) => r.cssText).join('\n');
      } catch (_) {
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
    const url = href || `inline://${slug}/style[${inlineCounter++}]`;
    const sha = crypto.createHash('sha1').update(cssText).digest('hex');
    fs.writeFileSync(path.join(bodiesDir, sha), cssText);
    entries[url] = { body: sha, mimeType: 'text/css' };
  }
  return entries;
}
