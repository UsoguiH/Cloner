import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { CDPNetworkRecorder } from './network.js';
import { extractRenderedDOM, autoScroll, runInteractions, prefetchCSSAssets } from './dom.js';
import { settleSnapshots } from './settle.js';
import { buildReplayBundle, copyLauncher, readBootstrap } from './replay.js';
import { buildSnapshotHtml } from './snapshot.js';
import { buildSourceTree, rewriteCssFiles, writeIndexHtml } from './source-tree.js';
import { packageZip } from './packager.js';
import { verifyBundle } from './verify.js';
import { backfillMissingAssets } from './backfill.js';

const TEMPLATES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'templates'
);

const ANALYTICS_HOSTS = new Set([
  'www.google-analytics.com',
  'analytics.google.com',
  'www.googletagmanager.com',
  'stats.g.doubleclick.net',
  'connect.facebook.net',
  'www.facebook.com/tr',
  'cdn.segment.com',
  'api.segment.io',
  'cdn.mxpnl.com',
  'api.mixpanel.com',
  'cdn.amplitude.com',
  'api.amplitude.com',
  'browser.sentry-cdn.com',
]);

export async function runCloneJob(job, { onProgress }) {
  const opts = {
    fullInteraction: false,
    scrollCapture: true,
    device: 'desktop',
    cookies: [],
    extraHeaders: {},
    waitMs: 2500,
    stripAnalytics: true,
    ...job.options,
  };

  const outputDir = path.join(job.jobDir, 'output');
  await fs.mkdir(outputDir, { recursive: true });

  // Diagnostics — populated as we go so a late failure has full context.
  const diagnostics = {
    sourceUrl: job.url,
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    blockerHints: [],
    lastPhase: 'launching',
  };
  const recordPhase = (phase) => { diagnostics.lastPhase = phase; };

  let browser = null;
  let page = null;
  let runFailed = false;
  let runError = null;

  try {

  onProgress({ phase: 'launching', message: 'launching browser' });
  recordPhase('launching');

  browser = await launchWithRetry(job);
  const contextOpts = {
    viewport:
      opts.device === 'mobile'
        ? { width: 390, height: 844 }
        : { width: 1440, height: 900 },
    deviceScaleFactor: opts.device === 'mobile' ? 3 : 1,
    userAgent:
      opts.device === 'mobile'
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        : undefined,
    extraHTTPHeaders: opts.extraHeaders,
    serviceWorkers: 'block',
  };
  const context = await browser.newContext(contextOpts);
  if (Array.isArray(opts.cookies) && opts.cookies.length) {
    const normalized = opts.cookies.map(normalizeCookie).filter(Boolean);
    try { await context.addCookies(normalized); } catch (e) {
      console.warn(`[job ${job.id}] cookie import failed:`, e.message);
    }
  }
  page = await context.newPage();

  // Wire up diagnostic listeners — kept lightweight so they don't slow the
  // happy path. The arrays cap at 50 entries per kind so a noisy site can't
  // blow up memory.
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    if (diagnostics.consoleErrors.length < 50) {
      diagnostics.consoleErrors.push(msg.text().slice(0, 500));
    }
  });
  page.on('pageerror', (err) => {
    if (diagnostics.pageErrors.length < 50) {
      diagnostics.pageErrors.push(String(err && err.message || err).slice(0, 500));
    }
  });
  page.on('requestfailed', (req) => {
    if (diagnostics.failedRequests.length >= 100) return;
    diagnostics.failedRequests.push({
      url: req.url().slice(0, 300),
      reason: (req.failure() && req.failure().errorText) || 'unknown',
      method: req.method(),
    });
  });

  const recorder = new CDPNetworkRecorder({ page });
  await recorder.attach();

  onProgress({ phase: 'navigating', message: `navigating to ${job.url}` });
  recordPhase('navigating');

  try {
    await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch (err) {
    throw new Error(`navigation failed: ${err.message}`);
  }

  try {
    await page.waitForLoadState('networkidle', { timeout: 30000 });
  } catch {
    // continue if networkidle never arrives
  }

  if (opts.scrollCapture) {
    onProgress({ phase: 'scrolling', message: 'scrolling for lazy content' });
    recordPhase('scrolling');
    await autoScroll(page);
    try { await page.waitForLoadState('networkidle', { timeout: 15000 }); } catch {}
  }

  if (opts.fullInteraction) {
    onProgress({ phase: 'interacting', message: 'triggering hover/click' });
    recordPhase('interacting');
    await runInteractions(page, opts.interactionSelectors || []);
    try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch {}
  }

  await page.waitForTimeout(opts.waitMs);

  onProgress({ phase: 'extracting', message: 'forcing font + CSS asset fetch' });
  recordPhase('extracting');
  await prefetchCSSAssets(page);
  try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch {}

  onProgress({ phase: 'extracting', message: 'settling animations' });
  let settledOverrides = {};
  try {
    settledOverrides = await settleSnapshots(page);
  } catch (e) {
    console.warn(`[job ${job.id}] settle pass failed:`, e.message);
  }

  onProgress({ phase: 'extracting', message: 'extracting rendered DOM' });
  const extraction = await extractRenderedDOM(page);

  // Detect known anti-bot blockers BEFORE we tear down the page so we can
  // tell the user *why* a clone might look empty (not just "x captured").
  try {
    const blockerHints = await detectBlockers(page);
    if (blockerHints.length) diagnostics.blockerHints = blockerHints;
  } catch {}

  // Backfill — scan the captured DOM + adopted CSS for asset URLs the
  // browser never fetched (autoplay-blocked video, lazy below-the-fold
  // images, range-request media). Pull each via Playwright's request
  // context so authenticated cookies still apply, and inject them into
  // the recorder so downstream consumers see them as ordinary captures.
  try {
    onProgress({ phase: 'extracting', message: 'backfilling missing assets' });
    const bf = await backfillMissingAssets({
      page,
      recorder,
      capturedHtml: extraction.html,
      adoptedCss: extraction.adoptedStylesheets || [],
      baseUrl: job.url,
    });
    diagnostics.backfill = bf;
  } catch (e) {
    console.warn(`[job ${job.id}] backfill pass failed:`, e.message);
  }

  await recorder.flush();
  await browser.close();
  browser = null;
  page = null;

  // Replay bundle: write every recorded response into replay/bodies/<sha1>
  // and an index manifest the bundled service worker reads at boot.
  onProgress({
    phase: 'processing',
    message: 'building replay bundle',
    captured: 0,
    total: recorder.responses.size,
  });

  const replay = await buildReplayBundle({
    recorder,
    outputDir,
    docUrl: job.url,
    isAnalytics,
    opts,
  });
  onProgress({ captured: replay.recorded, total: recorder.responses.size });

  // Copy launcher templates (sw.js, serve.cjs, start.bat, start.sh).
  await copyLauncher(outputDir, TEMPLATES_DIR);

  // Inline the SW-registration bootstrap as the very first thing in <head>
  // so the service worker is registered before any module script starts
  // fetching its dependencies.
  onProgress({ phase: 'rewriting', message: 'wiring service-worker bootstrap' });
  const bootstrapJs = await readBootstrap(TEMPLATES_DIR);
  const bootstrapTag =
    `<script data-clone-saas-boot>${bootstrapJs}</script>`;
  let html = extraction.html;
  if (/<head\b[^>]*>/i.test(html)) {
    html = html.replace(/<head\b[^>]*>/i, (m) => `${m}\n${bootstrapTag}`);
  } else if (/<html\b[^>]*>/i.test(html)) {
    html = html.replace(/<html\b[^>]*>/i, (m) => `${m}<head>${bootstrapTag}</head>`);
  } else {
    html = bootstrapTag + html;
  }

  await fs.writeFile(path.join(outputDir, 'index.html'), html, 'utf8');

  // Post-hydration snapshot — the reliable file:// preview. Spins up a local
  // server, lets the SPA fully render, captures the live DOM + computed
  // stylesheets, then bakes a script-free static HTML with all assets inlined.
  // CSS animations keep running; JS interactions don't. Saved as the fallback
  // `preview.html`.
  onProgress({ phase: 'rewriting', message: 'rendering snapshot' });
  let snapshotHtml = null;
  try {
    snapshotHtml = await buildSnapshotHtml({ outputDir });
    if (snapshotHtml) {
      await fs.writeFile(path.join(outputDir, 'preview.html'), snapshotHtml, 'utf8');
    }
  } catch (e) {
    console.warn(`[job ${job.id}] snapshot build failed:`, e.message);
  }

  // Source tree — the real deliverable. Lays every captured asset under its
  // original URL pathname (./_next/static/chunks/<hash>.js, ./fonts/..., etc.)
  // and produces an index.html with all references rewritten to relative
  // paths plus a small runtime shim so file:// can load lazy chunks. This is
  // what the user double-clicks to see the cloned component with full CSS,
  // assets, and JS-driven animations.
  onProgress({ phase: 'rewriting', message: 'extracting source tree' });
  try {
    const sourceDir = path.join(outputDir, 'clone');
    const replayManifest = JSON.parse(
      await fs.readFile(path.join(outputDir, 'replay', 'manifest.json'), 'utf8')
    );
    const maps = await buildSourceTree({
      outputDir,
      docUrl: job.url,
      manifest: replayManifest,
      sourceDir,
    });
    await rewriteCssFiles({ sourceDir, ...maps });
    const shimSource = await fs.readFile(
      path.join(TEMPLATES_DIR, 'file-shim.js'),
      'utf8'
    );
    await writeIndexHtml({
      capturedHtml: extraction.html,
      sourceDir,
      docUrl: job.url,
      shimSource,
      ...maps,
    });
    // OPEN_ME.html — landing page that explains the three artifacts
    // (preview, real source, server-mode) and lets the user pick.
    const openMeTemplate = await fs.readFile(
      path.join(TEMPLATES_DIR, 'open-me.html'),
      'utf8'
    );
    await fs.writeFile(path.join(outputDir, 'OPEN_ME.html'), openMeTemplate, 'utf8');
  } catch (e) {
    console.warn(`[job ${job.id}] source tree build failed:`, e.message);
  }

  // Persist settle + adopted stylesheets for the picker / isolate route.
  await fs.writeFile(
    path.join(outputDir, 'extraction.json'),
    JSON.stringify({
      settledOverrides,
      adoptedStylesheets: extraction.adoptedStylesheets || [],
      shadowRootCount: extraction.shadowRootCount,
      iframesInlined: extraction.iframesInlined,
      iframesExternal: extraction.iframesExternal,
    }),
    'utf8'
  );

  // Bundle metadata (separate from the replay manifest the SW reads).
  const manifest = {
    sourceUrl: job.url,
    capturedAt: new Date().toISOString(),
    options: opts,
    mode: 'replay',
    stats: {
      requests: recorder.responses.size,
      replayed: replay.recorded,
      replayBytes: replay.totalBytes,
      settledOverrides: Object.keys(settledOverrides || {}).length,
      shadowRoots: extraction.shadowRootCount,
      iframesInlined: extraction.iframesInlined,
      iframesExternal: extraction.iframesExternal,
    },
  };
  await fs.writeFile(
    path.join(outputDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );
  await fs.writeFile(
    path.join(outputDir, 'network.har'),
    JSON.stringify(recorder.toHAR(job.url), null, 2),
    'utf8'
  );

  // Record any URLs whose body we couldn't capture even after the retry
  // pass. The verify gate reads this to decide whether to flag the bundle
  // as completed_with_warnings.
  const failedAssets = [];
  for (const r of recorder.responses.values()) {
    if (r.bodyFetchFailed || (r.error && !r.body)) {
      failedAssets.push({
        url: r.url,
        status: r.status || 0,
        mimeType: r.mimeType || '',
        error: r.error || 'unknown',
      });
    }
  }
  diagnostics.failedAssetCount = failedAssets.length;
  if (failedAssets.length) {
    await fs.writeFile(
      path.join(outputDir, 'failed_assets.json'),
      JSON.stringify(failedAssets, null, 2),
      'utf8'
    );
  }

  // Self-verification gate — open the produced preview.html in a real
  // browser and confirm it actually renders. The result is attached to
  // job.progress so the UI can show a warnings badge.
  onProgress({ phase: 'packaging', message: 'verifying bundle' });
  let verifyResult = null;
  try {
    verifyResult = await verifyBundle({
      outputDir,
      jobUrl: job.url,
      failedAssetCount: failedAssets.length,
    });
    diagnostics.verify = verifyResult;
  } catch (e) {
    console.warn(`[job ${job.id}] verify failed:`, e.message);
  }

  onProgress({ phase: 'packaging', message: 'building ZIP' });
  await packageZip(outputDir, path.join(job.jobDir, 'output.zip'));

  onProgress({
    phase: 'done',
    message: 'complete',
    captured: replay.recorded,
    total: recorder.responses.size,
    verify: verifyResult,
  });
  } catch (err) {
    runFailed = true;
    runError = err;
    // Best-effort: capture a screenshot of whatever the page was showing
    // when we failed. Skip silently if the page is already gone.
    if (page && !page.isClosed?.()) {
      try {
        await page.screenshot({
          path: path.join(outputDir, 'failure.png'),
          fullPage: false,
        });
      } catch {}
      try {
        const blockerHints = await detectBlockers(page);
        if (blockerHints.length && !diagnostics.blockerHints.length) {
          diagnostics.blockerHints = blockerHints;
        }
      } catch {}
    }
    // Augment the error with the most useful diagnostic clues so the user
    // sees them in the failure toast without having to download a file.
    const hints = [];
    if (diagnostics.blockerHints.length) {
      hints.push(`possible blocker: ${diagnostics.blockerHints.join(', ')}`);
    }
    if (diagnostics.pageErrors.length) {
      hints.push(`page error: ${diagnostics.pageErrors[0]}`);
    } else if (diagnostics.consoleErrors.length) {
      hints.push(`console: ${diagnostics.consoleErrors[0]}`);
    }
    const augmented = new Error(
      hints.length
        ? `${err.message} (phase: ${diagnostics.lastPhase}; ${hints.join('; ')})`
        : `${err.message} (phase: ${diagnostics.lastPhase})`
    );
    augmented.stack = err.stack;
    augmented.diagnostics = diagnostics;
    throw augmented;
  } finally {
    diagnostics.completedAt = new Date().toISOString();
    diagnostics.failed = runFailed;
    if (runError) diagnostics.errorMessage = String(runError.message || runError);
    try {
      await fs.writeFile(
        path.join(outputDir, 'diagnostics.json'),
        JSON.stringify(diagnostics, null, 2),
        'utf8'
      );
    } catch {}
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}

/**
 * Look for the fingerprints of well-known anti-bot / challenge pages so we
 * can tell the user *why* a clone came back empty. Runs entirely in-page
 * and never throws — caller should wrap in try/catch.
 */
async function detectBlockers(page) {
  return await page.evaluate(() => {
    const hints = [];
    const has = (sel) => !!document.querySelector(sel);

    if (has('#challenge-form, #cf-challenge-running, #challenge-running, [data-cf-beacon]')) {
      hints.push('Cloudflare challenge');
    }
    if (has('.cf-turnstile, iframe[src*="challenges.cloudflare.com"]')) {
      hints.push('Cloudflare Turnstile');
    }
    if (has('iframe[src*="recaptcha"], .g-recaptcha, #recaptcha')) {
      hints.push('reCAPTCHA');
    }
    if (has('iframe[src*="hcaptcha.com"], .h-captcha')) {
      hints.push('hCaptcha');
    }
    if (has('iframe[src*="datadome"], #datadome-captcha, [data-dd-captcha]')) {
      hints.push('DataDome');
    }
    if (has('#px-captcha, [data-px-captcha]')) {
      hints.push('PerimeterX');
    }

    const text = (document.body && document.body.innerText || '').slice(0, 4000);
    const lower = text.toLowerCase();
    const phrases = [
      'access denied',
      'you have been blocked',
      'attention required',
      'verifying you are human',
      'just a moment',
      'enable javascript and cookies',
      'request unsuccessful',
      'pardon our interruption',
    ];
    for (const p of phrases) {
      if (lower.includes(p)) {
        hints.push(`page text: "${p}"`);
        break;
      }
    }

    // Empty-body sanity check — if the page rendered virtually nothing, the
    // user likely hit a soft block (e.g. SSR refused for headless UA).
    const bodyLen = (document.body && document.body.innerText || '').trim().length;
    if (bodyLen < 50 && document.querySelectorAll('img, svg, canvas').length < 3) {
      hints.push('near-empty document body');
    }

    return Array.from(new Set(hints));
  });
}

async function launchWithRetry(job, attempts = 3) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await chromium.launch({ headless: true });
    } catch (err) {
      lastErr = err;
      console.warn(`[job ${job.id}] chromium.launch attempt ${i}/${attempts} failed: ${err.message}`);
      if (i < attempts) await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
  throw lastErr;
}

function isAnalytics(url) {
  try {
    const u = new URL(url);
    if (ANALYTICS_HOSTS.has(u.hostname)) return true;
    const hp = `${u.hostname}${u.pathname}`;
    for (const h of ANALYTICS_HOSTS) {
      if (hp.startsWith(h)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Accept cookie objects from common browser-extension exports
 * (Cookie-Editor, EditThisCookie, Get cookies.txt, etc.) and convert to
 * Playwright's addCookies() shape.
 */
function normalizeCookie(c) {
  if (!c || !c.name || c.value === undefined) return null;

  const sameSiteMap = {
    no_restriction: 'None',
    unspecified: 'Lax',
    lax: 'Lax',
    strict: 'Strict',
    none: 'None',
    Lax: 'Lax',
    Strict: 'Strict',
    None: 'None',
  };

  const out = {
    name: String(c.name),
    value: String(c.value),
    path: c.path || '/',
    httpOnly: !!c.httpOnly,
    secure: !!c.secure,
  };

  // domain — if hostOnly is true, the extension stored it without the leading dot
  if (c.domain) {
    out.domain = c.domain.startsWith('.') || c.hostOnly ? c.domain : c.domain;
  } else if (c.url) {
    out.url = c.url;
  } else {
    return null; // can't import without a domain
  }

  // expires — Playwright wants seconds (number); extensions use either
  // `expirationDate` (seconds, may be float) or `expires` (seconds or ISO string)
  let exp = c.expirationDate ?? c.expires;
  if (typeof exp === 'string') {
    const parsed = Date.parse(exp);
    if (!isNaN(parsed)) exp = parsed / 1000;
    else exp = undefined;
  }
  if (typeof exp === 'number' && isFinite(exp) && exp > 0) {
    out.expires = Math.floor(exp);
  } else if (c.session === false) {
    // persistent but no expiry given — leave it as session
  }

  if (c.sameSite) {
    const ss = sameSiteMap[c.sameSite];
    if (ss) out.sameSite = ss;
  }

  return out;
}
