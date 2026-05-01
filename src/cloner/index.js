import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { CDPNetworkRecorder } from './network.js';
import { extractRenderedDOM, autoScroll, runInteractions, prefetchCSSAssets } from './dom.js';
import { settleSnapshots } from './settle.js';
import { buildReplayBundle, copyLauncher, readBootstrap } from './replay.js';
import { packageZip } from './packager.js';

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

  onProgress({ phase: 'launching', message: 'launching browser' });

  const browser = await chromium.launch({ headless: true });
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
  const page = await context.newPage();

  const recorder = new CDPNetworkRecorder({ page });
  await recorder.attach();

  onProgress({ phase: 'navigating', message: `navigating to ${job.url}` });

  try {
    await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch (err) {
    await browser.close();
    throw new Error(`navigation failed: ${err.message}`);
  }

  try {
    await page.waitForLoadState('networkidle', { timeout: 30000 });
  } catch {
    // continue if networkidle never arrives
  }

  if (opts.scrollCapture) {
    onProgress({ phase: 'scrolling', message: 'scrolling for lazy content' });
    await autoScroll(page);
    try { await page.waitForLoadState('networkidle', { timeout: 15000 }); } catch {}
  }

  if (opts.fullInteraction) {
    onProgress({ phase: 'interacting', message: 'triggering hover/click' });
    await runInteractions(page, opts.interactionSelectors || []);
    try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch {}
  }

  await page.waitForTimeout(opts.waitMs);

  onProgress({ phase: 'extracting', message: 'forcing font + CSS asset fetch' });
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

  await recorder.flush();
  await browser.close();

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

  onProgress({ phase: 'packaging', message: 'building ZIP' });
  await packageZip(outputDir, path.join(job.jobDir, 'output.zip'));

  onProgress({
    phase: 'done',
    message: 'complete',
    captured: replay.recorded,
    total: recorder.responses.size,
  });
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
