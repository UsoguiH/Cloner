/**
 * Missing-asset backfill.
 *
 * The CDP recorder catches every body the *browser* fetched. Real-world
 * pages leave gaps:
 *   - <video autoplay> blocked in headless → never fetched
 *   - <img loading="lazy"> below the fold scroll never reached
 *   - Range-request media (206 Partial Content) the recorder can't
 *     reassemble into a complete body
 *   - Assets gated behind interaction (modals, hover, click)
 *
 * Result: the captured HTML references a path the manifest doesn't have,
 * and the snapshot leaves it unresolved. On file:// that turns into
 * `file:///F:/static/videos/foo.mp4` and shows a broken element.
 *
 * Fix: after extraction, scan the captured HTML + adopted stylesheets
 * for every URL-shaped reference (src, srcset, href, poster, content,
 * url() in inline styles) that isn't already in recorder.responses, and
 * download it server-side via Playwright's request context. The context
 * inherits the page's cookies and headers, so authenticated assets work
 * the same as in the live browser. Successful fetches are injected back
 * into the recorder so all downstream consumers (replay bundle, source
 * tree, snapshot) see them as if the browser had fetched them.
 */

const MAX_ASSET_BYTES = 20 * 1024 * 1024; // 20 MB per asset
const PER_REQUEST_TIMEOUT_MS = 10_000;
const PARALLEL = 8;

// Mime types we trust to decode as utf-8. Everything else gets base64.
const TEXT_MIME = /^(text\/|application\/(?:javascript|json|xml|wasm)|image\/svg\+xml)/i;

export async function backfillMissingAssets({ page, recorder, capturedHtml, adoptedCss = [], baseUrl, onProgress }) {
  if (!page || !recorder || !capturedHtml) {
    return { scanned: 0, missing: 0, recovered: 0, failed: 0 };
  }

  const found = collectAssetUrls(capturedHtml, adoptedCss, baseUrl);

  // Vue/React/Nuxt property bindings (`<video :src="...">`) set the DOM
  // property without writing the HTML attribute, so the captured HTML scan
  // misses them entirely. Read live `currentSrc`/`src`/`href`/`poster` off
  // every media element + <a>/<link> directly. This is the only path on
  // SPA frameworks for assets like Vimeo MP4s and Range-request media.
  try {
    const liveUrls = await page.evaluate(() => {
      const out = [];
      const push = (v) => { if (v && typeof v === 'string') out.push(v); };
      for (const el of document.querySelectorAll('video, audio, source, img, iframe, embed')) {
        push(el.currentSrc); push(el.src);
        if (el.tagName === 'VIDEO' || el.tagName === 'AUDIO') push(el.poster);
      }
      for (const el of document.querySelectorAll('a[href], link[href]')) push(el.href);
      return out;
    });
    for (const raw of liveUrls) {
      try {
        const abs = new URL(raw, baseUrl).toString().replace(/#.*$/, '');
        if (!abs.startsWith('data:') && !abs.startsWith('blob:')) found.add(abs);
      } catch {}
    }
  } catch {}

  const missing = [];
  for (const url of found) {
    if (recorder.responses.has(url)) continue;
    if (recorder.responses.has(url.split('?')[0])) continue;
    if (!/^https?:\/\//i.test(url)) continue;
    missing.push(url);
  }

  if (missing.length === 0) {
    return { scanned: found.size, missing: 0, recovered: 0, failed: 0 };
  }

  const ctx = page.context();
  if (!ctx || !ctx.request) {
    return { scanned: found.size, missing: missing.length, recovered: 0, failed: missing.length };
  }

  let recovered = 0;
  let failed = 0;
  let cursor = 0;

  const runOne = async () => {
    while (cursor < missing.length) {
      const i = cursor++;
      const url = missing[i];
      try {
        const r = await ctx.request.fetch(url, {
          timeout: PER_REQUEST_TIMEOUT_MS,
          failOnStatusCode: false,
          maxRedirects: 5,
        });
        const status = r.status();
        if (status >= 400) { failed++; continue; }
        const buf = await r.body();
        if (!buf || buf.length === 0) { failed++; continue; }
        if (buf.length > MAX_ASSET_BYTES) {
          // Don't inject huge bodies — they'd bloat the bundle to no benefit.
          failed++;
          continue;
        }
        const headers = r.headers();
        const mimeType = headers['content-type'] || guessMimeFromUrl(url) || 'application/octet-stream';
        const isText = TEXT_MIME.test(mimeType);
        recorder.responses.set(url, {
          url,
          status,
          mimeType,
          headers,
          body: isText ? buf.toString('utf8') : buf.toString('base64'),
          bodyBase64: !isText,
          backfilled: true,
        });
        recovered++;
      } catch {
        failed++;
      }
      if (onProgress) {
        try { onProgress({ recovered, failed, total: missing.length }); } catch {}
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(PARALLEL, missing.length) }, runOne));

  return {
    scanned: found.size,
    missing: missing.length,
    recovered,
    failed,
  };
}

/**
 * Pull every URL-shaped reference out of the captured HTML and any adopted
 * stylesheet text. Returns absolute URLs resolved against baseUrl.
 *
 * Deliberately permissive — false positives are cheap (a fetch we'd skip
 * anyway because it 404s), but missing a real reference means the bundle
 * stays broken.
 */
function collectAssetUrls(html, adoptedCss, baseUrl) {
  const out = new Set();
  const tryAdd = (raw) => {
    if (!raw) return;
    const s = String(raw).trim();
    if (!s) return;
    if (s.startsWith('data:') || s.startsWith('blob:')) return;
    if (s.startsWith('javascript:') || s.startsWith('mailto:') || s.startsWith('tel:') || s.startsWith('#')) return;
    try {
      const abs = new URL(s, baseUrl).toString().replace(/#.*$/, '');
      out.add(abs);
    } catch {}
  };

  // 1. attribute values: src, href, poster, data-src, action, content, formaction
  const ATTR_RE = /\b(?:src|href|poster|action|formaction|data-src|data-href|data-original|data-lazy|data-bg|data-image|content)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
  let m;
  while ((m = ATTR_RE.exec(html)) !== null) {
    tryAdd(m[1] || m[2] || m[3]);
  }

  // 2. srcset values — comma-separated `url descriptor` pairs
  const SRCSET_RE = /\bsrcset\s*=\s*(?:"([^"]+)"|'([^']+)')/gi;
  while ((m = SRCSET_RE.exec(html)) !== null) {
    const list = m[1] || m[2] || '';
    for (const part of list.split(',')) {
      const u = part.trim().split(/\s+/)[0];
      tryAdd(u);
    }
  }

  // 3. CSS url() refs inside <style> blocks and style="" attrs
  const URL_RE = /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;
  while ((m = URL_RE.exec(html)) !== null) {
    tryAdd(m[1]);
  }

  // 4. CSS url() refs inside adopted stylesheets (Lit, Tailwind v4)
  for (const css of adoptedCss) {
    URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(css)) !== null) {
      tryAdd(m[1]);
    }
  }

  return out;
}

function guessMimeFromUrl(url) {
  try {
    const u = new URL(url);
    const ext = u.pathname.split('.').pop().toLowerCase();
    return EXT_MIME[ext] || null;
  } catch {
    return null;
  }
}

const EXT_MIME = {
  js: 'application/javascript', mjs: 'application/javascript',
  css: 'text/css', json: 'application/json', svg: 'image/svg+xml',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', webp: 'image/webp', avif: 'image/avif',
  ico: 'image/x-icon', woff: 'font/woff', woff2: 'font/woff2',
  ttf: 'font/ttf', otf: 'font/otf',
  mp4: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
  wasm: 'application/wasm',
};
