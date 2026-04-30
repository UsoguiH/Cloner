import path from 'node:path';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { CDPNetworkRecorder } from './network.js';
import { extractRenderedDOM, autoScroll, runInteractions, prefetchCSSAssets } from './dom.js';
import { rewriteHTML, rewriteCSS } from './rewriter.js';
import { writeAssets, packageZip } from './packager.js';
import { hashUrl, extFromMime, sanitizeBasename } from './util.js';

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
  const assetsDir = path.join(outputDir, 'assets');
  await fs.mkdir(assetsDir, { recursive: true });

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

  onProgress({ phase: 'extracting', message: 'extracting rendered DOM' });
  const extraction = await extractRenderedDOM(page);

  await recorder.flush();
  await browser.close();

  // Build asset map from recorded responses, skipping the main HTML and analytics noise
  onProgress({
    phase: 'processing',
    message: 'processing assets',
    captured: 0,
    total: recorder.responses.size,
  });

  const docUrl = page.url ? job.url : job.url;
  const assetMap = new Map(); // url -> { localPath, relPath, mime, bytes }
  const failures = [];
  let count = 0;

  const strippedScriptUrls = new Set();

  for (const [url, rec] of recorder.responses.entries()) {
    count++;
    if (count % 8 === 0) {
      onProgress({ captured: count, total: recorder.responses.size });
    }
    if (!rec.body) {
      failures.push({ url, reason: rec.error || 'no body' });
      continue;
    }
    if (url === docUrl) continue; // main HTML handled separately
    if (opts.stripAnalytics) {
      if (isAnalytics(url)) {
        strippedScriptUrls.add(url);
        continue;
      }
      // First-party-proxied analytics (server-side GTM, Cloudflare Web Analytics
      // proxy, etc.) — hostname looks legit, content gives it away.
      if (
        !rec.bodyBase64 &&
        /javascript/i.test(rec.mimeType || '') &&
        jsLooksLikeAnalytics(rec.body)
      ) {
        strippedScriptUrls.add(url);
        continue;
      }
    }

    const ext = extFromMime(rec.mimeType, url);
    const basename = sanitizeBasename(new URL(url).pathname);
    const filename = `${hashUrl(url)}-${basename || 'asset'}${ext}`;
    const relPath = `assets/${filename}`;
    const localPath = path.join(assetsDir, filename);

    const buf = rec.bodyBase64
      ? Buffer.from(rec.body, 'base64')
      : Buffer.from(rec.body, 'utf8');

    assetMap.set(url, {
      localPath,
      relPath,
      mime: rec.mimeType,
      bytes: buf.length,
      isText: !rec.bodyBase64,
      body: buf,
    });
  }

  // Rewrite CSS bodies in place (they may reference other assets).
  // Pass each CSS file's own relPath as the consumer so that url() targets
  // get rewritten relative to that file's location, not the document root.
  for (const entry of assetMap.values()) {
    if (entry.isText && /css/i.test(entry.mime || '')) {
      const baseUrl = findUrlForEntry(assetMap, entry);
      const rewritten = rewriteCSS(
        entry.body.toString('utf8'),
        baseUrl,
        assetMap,
        entry.relPath
      );
      entry.body = Buffer.from(rewritten, 'utf8');
    }
  }

  // Write assets to disk
  await writeAssets(assetMap);

  // Rewrite the main HTML
  onProgress({ phase: 'rewriting', message: 'rewriting URLs' });
  const html = rewriteHTML(extraction.html, job.url, assetMap, {
    stripAnalytics: opts.stripAnalytics,
    analyticsHosts: ANALYTICS_HOSTS,
    strippedScriptUrls,
    adoptedStylesheets: extraction.adoptedStylesheets,
  });

  await fs.writeFile(path.join(outputDir, 'index.html'), html, 'utf8');

  // Write manifest + HAR
  const manifest = {
    sourceUrl: job.url,
    capturedAt: new Date().toISOString(),
    options: opts,
    stats: {
      assets: assetMap.size,
      bytes: [...assetMap.values()].reduce((s, e) => s + e.bytes, 0),
      requests: recorder.responses.size,
      failures: failures.length,
      shadowRoots: extraction.shadowRootCount,
      iframesInlined: extraction.iframesInlined,
      iframesExternal: extraction.iframesExternal,
    },
    assets: [...assetMap.entries()].map(([url, e]) => ({
      url,
      path: e.relPath,
      mime: e.mime,
      bytes: e.bytes,
    })),
    failures,
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
    captured: assetMap.size,
    total: assetMap.size,
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

function jsLooksLikeAnalytics(body) {
  if (typeof body !== 'string') return false;
  const head = body.slice(0, 6000);
  return ANALYTICS_JS_RE.test(head);
}

// Centralized so HTML rewriter and asset filter share the same definition.
export const ANALYTICS_JS_RE = new RegExp(
  [
    'googletagmanager',
    'google-analytics',
    'google_tag_manager',
    'google_tags_first_party',
    'doubleclick\\.net',
    'gtm\\.start',
    'gtm\\.js',
    'GTM-[A-Z0-9]{4,}',
    'AW-[0-9]{6,}',
    'gtag\\s*\\(',
    '_gaq',
    'fbq\\s*\\(',
    'connect\\.facebook\\.net',
    '_satellite',
    'mixpanel\\.',
    'amplitude\\.',
    'segment\\.io',
    'hotjar',
    'clarity\\.ms',
  ].join('|'),
  'i'
);

function findUrlForEntry(map, target) {
  for (const [url, e] of map.entries()) {
    if (e === target) return url;
  }
  return null;
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
