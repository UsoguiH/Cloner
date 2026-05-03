/**
 * Post-hydration snapshot builder.
 *
 * The standalone-with-modules approach is fundamentally fragile: TrustedTypes,
 * RSC payloads, dynamic chunks, font-preload CORS — every framework adds new
 * ways for `file://` to fail. So instead of trying to *run* the SPA from a
 * single HTML, we let it run *once* under a real local server, capture the
 * fully-rendered DOM + computed stylesheet text, then bake that into a
 * scripts-stripped HTML with every asset inlined as data URIs.
 *
 * Result: a static HTML showing the component already mounted. CSS-driven
 * animation (gradients, keyframes, hover transitions) keeps working because
 * it lives in CSS. Click-driven JS interactions do NOT — that's the cost of
 * skipping the JS runtime entirely. But the component is *viewable* via
 * double-click, which is what the user asked for.
 */

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.wasm': 'application/wasm',
};

function startServer(rootDir, manifest) {
  const lookupReplay = (urlPath) => {
    if (!manifest?.entries) return null;
    if (manifest.byPath?.[urlPath]) {
      const c = manifest.byPath[urlPath];
      if (manifest.entries[c]) return manifest.entries[c];
    }
    const base = urlPath.split('/').pop();
    if (base && manifest.byBasename?.[base]) {
      const c = manifest.byBasename[base];
      if (manifest.entries[c]) return manifest.entries[c];
    }
    return null;
  };

  const server = http.createServer((req, res) => {
    let urlPath;
    try { urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
    catch { res.writeHead(400); res.end(); return; }

    if (urlPath === '/sw.js' || urlPath === '/replay/manifest.json' || urlPath.startsWith('/replay/bodies/')) {
      const t = path.resolve(rootDir, '.' + urlPath);
      if (!t.startsWith(rootDir)) { res.writeHead(403); res.end(); return; }
      return fs.stat(t, (e, s) => {
        if (e || !s.isFile()) { res.writeHead(404); res.end(); return; }
        const ext = path.extname(t).toLowerCase();
        res.writeHead(200, {
          'Content-Type': MIME[ext] || 'application/octet-stream',
          'Content-Length': s.size, 'Service-Worker-Allowed': '/', 'Cache-Control': 'no-store',
        });
        fs.createReadStream(t).pipe(res);
      });
    }

    const lookupPath = urlPath === '/' ? '/index.html' : urlPath;
    const target = path.resolve(rootDir, '.' + lookupPath);
    if (!target.startsWith(rootDir)) { res.writeHead(403); res.end(); return; }

    fs.stat(target, (err, st) => {
      const sendReplay = () => {
        const e = lookupReplay(urlPath);
        if (!e) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
          return;
        }
        const bodyPath = path.join(rootDir, 'replay', 'bodies', e.body);
        fs.stat(bodyPath, (er, s2) => {
          if (er || !s2.isFile()) { res.writeHead(404); res.end(); return; }
          const headers = { ...(e.headers || {}) };
          if (e.mimeType && !headers['content-type']) headers['content-type'] = e.mimeType;
          headers['access-control-allow-origin'] = '*';
          headers['cache-control'] = 'no-store';
          headers['service-worker-allowed'] = '/';
          headers['content-length'] = s2.size;
          res.writeHead(e.status || 200, headers);
          fs.createReadStream(bodyPath).pipe(res);
        });
      };
      if (!err && st.isFile()) {
        const ext = path.extname(target).toLowerCase();
        res.writeHead(200, {
          'Content-Type': MIME[ext] || 'application/octet-stream',
          'Content-Length': st.size, 'Cache-Control': 'no-store', 'Service-Worker-Allowed': '/',
        });
        return fs.createReadStream(target).pipe(res);
      }
      if (!err && st.isDirectory()) {
        const idx = path.join(target, 'index.html');
        return fs.stat(idx, (e2, s2) => {
          if (!e2 && s2.isFile()) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': s2.size, 'Cache-Control': 'no-store' });
            return fs.createReadStream(idx).pipe(res);
          }
          sendReplay();
        });
      }
      sendReplay();
    });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

export async function buildSnapshotHtml({ outputDir, settleMs = 4500, viewport = { width: 1440, height: 900 } }) {
  const replayDir = path.join(outputDir, 'replay');
  let manifest = null;
  try { manifest = JSON.parse(await fsp.readFile(path.join(replayDir, 'manifest.json'), 'utf8')); }
  catch { return null; }

  const { server, port } = await startServer(outputDir, manifest);
  const url = `http://127.0.0.1:${port}/`;

  let browser;
  try {
    browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport, serviceWorkers: 'allow' });
    const page = await ctx.newPage();

    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    // Service worker takes over and triggers a reload — wait for it.
    await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);
    try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch {}
    await page.waitForTimeout(settleMs);

    // Demo component pages typically gate their animation behind a click. The
    // animation itself is a CSS @keyframes — once JS adds the active class, the
    // animation runs forever via CSS. So clicking the page's main button BEFORE
    // capture freezes the active class into the DOM, and the snapshot keeps
    // animating with no JS at runtime.
    //
    // We only do this when the page LOOKS like a single-component demo
    // (no nav, few buttons, button text like "click to..." / "turn on...").
    // For landing pages, clicking the central CTA usually does something
    // destructive (open menu, play a giant video, navigate) that would bloat
    // or break the snapshot.
    try {
      await page.evaluate(() => {
        // Disqualify landing-page-shaped pages.
        const navLinks = document.querySelectorAll('nav a, header a').length;
        const totalButtons = document.querySelectorAll('button, [role="button"]').length;
        if (navLinks > 3) return;
        if (totalButtons > 6) return;

        const vw = innerWidth, vh = innerHeight;
        const cx = vw / 2, cy = vh / 2;
        const cands = Array.from(document.querySelectorAll('button, [role="button"]'))
          .filter((el) => {
            if (el.closest('nav, header, [data-clone-saas-snapshot-banner]')) return false;
            if (el.disabled) return false;
            const r = el.getBoundingClientRect();
            if (r.width < 40 || r.height < 20) return false;
            if (r.right < 0 || r.bottom < 0 || r.left > vw || r.top > vh) return false;
            const cs = getComputedStyle(el);
            if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.1) return false;
            // Skip play / pause / volume / fullscreen on media elements.
            const t = (el.innerText || '').trim().toLowerCase();
            if (/^(play|pause|mute|unmute|volume|fullscreen|cart|menu|close|×|x)$/.test(t)) return false;
            return true;
          });
        if (!cands.length) return;
        cands.sort((a, b) => {
          const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
          const da = Math.hypot(ra.left + ra.width / 2 - cx, ra.top + ra.height / 2 - cy);
          const db = Math.hypot(rb.left + rb.width / 2 - cx, rb.top + rb.height / 2 - cy);
          return da - db;
        });
        cands[0].click();
      });
      await page.waitForTimeout(800);
    } catch {}

    // Capture: live DOM + every stylesheet's cssText + every adoptedStyleSheet.
    const captured = await page.evaluate(() => {
      const sheets = [];
      // Regular stylesheets — read cssText (works because they're same-origin via local server).
      for (const s of Array.from(document.styleSheets)) {
        try {
          const rules = s.cssRules || s.rules;
          if (!rules) continue;
          const parts = [];
          for (const r of Array.from(rules)) parts.push(r.cssText);
          sheets.push({ media: s.media?.mediaText || '', text: parts.join('\n') });
        } catch (e) { /* CORS or other access error */ }
      }
      // adoptedStyleSheets on document and shadow roots — used by Lit, Tailwind v4.
      const adoptedFrom = [document];
      try {
        document.querySelectorAll('*').forEach((el) => { if (el.shadowRoot) adoptedFrom.push(el.shadowRoot); });
      } catch {}
      const adopted = [];
      for (const root of adoptedFrom) {
        const list = root.adoptedStyleSheets || [];
        for (const s of list) {
          try {
            const parts = [];
            for (const r of Array.from(s.cssRules)) parts.push(r.cssText);
            if (parts.length) adopted.push(parts.join('\n'));
          } catch {}
        }
      }
      // Capture ALL <style> contents too (in case stylesheet API misses some).
      const inlineStyles = [];
      document.querySelectorAll('style').forEach((s) => inlineStyles.push(s.textContent || ''));

      return {
        html: document.documentElement.outerHTML,
        doctype: document.doctype ? `<!DOCTYPE ${document.doctype.name}>` : '<!DOCTYPE html>',
        title: document.title,
        sheets,
        adopted,
        inlineStyles,
        baseHref: document.baseURI,
      };
    });

    await browser.close();
    server.close();
    return await rewriteSnapshot({ captured, manifest, replayDir, baseHref: captured.baseHref });
  } catch (e) {
    if (browser) await browser.close().catch(() => {});
    server.close();
    throw e;
  }
}

async function rewriteSnapshot({ captured, manifest, replayDir, baseHref }) {
  const $ = cheerio.load(`${captured.doctype}\n${captured.html}`, { decodeEntities: false });
  const bodiesDir = path.join(replayDir, 'bodies');
  const cache = new Map();

  const lookup = async (rawUrl) => {
    if (!rawUrl) return null;
    if (rawUrl.startsWith('data:') || rawUrl.startsWith('blob:') || rawUrl.startsWith('#')
        || rawUrl.startsWith('javascript:') || rawUrl.startsWith('mailto:') || rawUrl.startsWith('tel:')) return null;
    let abs;
    try { abs = new URL(rawUrl, baseHref).toString(); } catch { return null; }
    const cleanAbs = abs.replace(/#.*$/, '');
    if (cache.has(cleanAbs)) return cache.get(cleanAbs);

    let entry = manifest.entries?.[cleanAbs] || manifest.entries?.[abs];
    if (!entry) {
      try {
        const u = new URL(cleanAbs);
        if (manifest.byPath?.[u.pathname]) entry = manifest.entries[manifest.byPath[u.pathname]];
        if (!entry && manifest.byBasename) {
          const base = u.pathname.split('/').pop();
          if (base && manifest.byBasename[base]) entry = manifest.entries[manifest.byBasename[base]];
        }
      } catch {}
    }
    if (!entry) { cache.set(cleanAbs, null); return null; }

    let buf;
    try { buf = await fsp.readFile(path.join(bodiesDir, entry.body)); }
    catch { cache.set(cleanAbs, null); return null; }
    const r = { buf, mimeType: entry.mimeType || '', absUrl: cleanAbs };
    cache.set(cleanAbs, r);
    return r;
  };

  const toDataUri = (buf, mt) => `data:${(mt || 'application/octet-stream').split(';')[0].trim()};base64,${buf.toString('base64')}`;

  const rewriteCss = async (css, depth = 0) => {
    if (depth > 4) return css;
    let s = css;
    const IMPORT_RE = /@import\s+(?:url\(\s*)?(['"]?)([^'")]+)\1\s*\)?\s*([^;]*);/gi;
    const importMatches = [...s.matchAll(IMPORT_RE)];
    for (const m of importMatches.reverse()) {
      const r = await lookup(m[2]);
      if (!r) continue;
      const inner = await rewriteCss(r.buf.toString('utf8'), depth + 1);
      s = s.slice(0, m.index) + inner + '\n' + s.slice(m.index + m[0].length);
    }
    const URL_RE = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
    const out = [];
    let last = 0;
    URL_RE.lastIndex = 0;
    let m2;
    while ((m2 = URL_RE.exec(s)) !== null) {
      const raw = m2[2].trim();
      out.push(s.slice(last, m2.index));
      last = m2.index + m2[0].length;
      if (raw.startsWith('data:') || raw.startsWith('blob:') || raw.startsWith('#')) { out.push(m2[0]); continue; }
      const r = await lookup(raw);
      if (!r) { out.push(m2[0]); continue; }
      out.push(`url("${toDataUri(r.buf, r.mimeType)}")`);
    }
    out.push(s.slice(last));
    return out.join('');
  };

  // STRIP every script — the snapshot is post-hydration, JS already did its job.
  $('script').remove();
  // Strip preload/prefetch/modulepreload — they'd 404.
  $('link[rel="preload"], link[rel="prefetch"], link[rel="modulepreload"], link[rel="dns-prefetch"], link[rel="preconnect"]').remove();
  // Strip <link rel="stylesheet"> — we'll inject our captured cssText instead.
  $('link[rel="stylesheet"]').remove();
  // Strip <style> — we'll re-inject all captured styles in a stable order.
  $('style').remove();

  // Inject all captured styles. Order matters for cascade — inlineStyles
  // already in document order (matches what was in <style>), regular sheets
  // (linked + inline) in stylesheet order, adopted last (constructable
  // sheets win over <style>).
  const styleParts = [];
  for (const s of captured.sheets) {
    const css = await rewriteCss(s.text);
    styleParts.push(s.media ? `@media ${s.media} { ${css} }` : css);
  }
  for (const css of captured.adopted) {
    styleParts.push(await rewriteCss(css));
  }
  if (styleParts.length) {
    $('head').append(`<style data-clone-saas-snapshot>${styleParts.join('\n')}</style>`);
  }

  // <link rel="icon"> → data: URI.
  for (const link of $('link[rel="icon"], link[rel="shortcut icon"], link[rel*="apple-touch-icon"], link[rel="mask-icon"]').toArray()) {
    const href = $(link).attr('href');
    if (!href) continue;
    const r = await lookup(href);
    if (!r) continue;
    $(link).attr('href', toDataUri(r.buf, r.mimeType));
  }

  // Images, video, srcset.
  const IMG_ATTRS = ['src', 'data-src', 'data-original', 'data-lazy', 'data-bg', 'data-image'];
  for (const el of $('img, source, video, audio, embed').toArray()) {
    for (const a of IMG_ATTRS) {
      const v = $(el).attr(a);
      if (!v) continue;
      const r = await lookup(v);
      if (!r) continue;
      $(el).attr(a, toDataUri(r.buf, r.mimeType));
    }
    const poster = $(el).attr('poster');
    if (poster) {
      const r = await lookup(poster);
      if (r) $(el).attr('poster', toDataUri(r.buf, r.mimeType));
    }
  }
  for (const el of $('[srcset], [data-srcset]').toArray()) {
    for (const a of ['srcset', 'data-srcset']) {
      const v = $(el).attr(a);
      if (!v) continue;
      const parts = v.split(',').map((p) => p.trim()).filter(Boolean);
      const out = [];
      for (const p of parts) {
        const sp = p.search(/\s/);
        const u = sp === -1 ? p : p.slice(0, sp);
        const desc = sp === -1 ? '' : p.slice(sp);
        if (u.startsWith('data:')) { out.push(p); continue; }
        const r = await lookup(u);
        if (!r) { out.push(p); continue; }
        out.push(toDataUri(r.buf, r.mimeType) + desc);
      }
      $(el).attr(a, out.join(', '));
    }
  }

  // inline style="" url() refs.
  for (const el of $('[style]').toArray()) {
    const v = $(el).attr('style') || '';
    if (!v.includes('url(')) continue;
    const rewritten = await rewriteCss(v);
    if (rewritten !== v) $(el).attr('style', rewritten);
  }

  // Drop iframes — they were pointing at the live origin.
  $('iframe').each((_, el) => {
    const src = $(el).attr('src');
    if (src && !src.startsWith('data:')) $(el).removeAttr('src');
  });

  return $.html();
}
