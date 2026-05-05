/**
 * Computed-style snapshot — refactored.
 *
 * The cascade-replay strategy (capture every stylesheet, strip JS, hope the
 * cascade resolves the same way under file://) keeps breaking on real
 * sites. A single missing :root variable, a lost @import, a misordered
 * @layer, an adopted shadow stylesheet, a CSS-in-JS injection that races
 * the snapshot — any one of them silently breaks the rendered output.
 * Each fix has been a new layer of regex; the abstraction is wrong.
 *
 * This pass throws away the cascade entirely. For every visible element
 * we ask the browser via getComputedStyle "what is the FINAL resolved
 * value of every property — after var() resolution, after specificity,
 * after !important, after Tailwind/CSS-in-JS/adopted-sheet contributions?"
 * That value is materialized into a single rule keyed by a generated
 * [data-cs="N"] attribute. Identical-style elements share a class via
 * fingerprint dedup, so the bundle stays compact.
 *
 * What's preserved cascade-side:
 *   - @keyframes  (cascade-independent — the browser only needs the rule
 *                  text plus a matching `animation-name` in computed style)
 *   - @font-face  (with `src: url()` rewritten to data: URIs)
 *   - state-pseudo rules (rules whose selector contains :hover/:focus/etc.)
 *     — the original `class` attribute is kept on every element so these
 *     rules still match their targets
 *
 * Wins:
 *   - Pixel-identical static rendering for any captured state
 *   - Robust to file:// — every asset and font inlined as data:
 *   - Robust to Tailwind v4 / CSS-in-JS / adopted shadow sheets — we
 *     read the browser's resolved values, not the source rules
 *   - CSS keyframe animations alive (browser plays them from computed
 *     `animation: ...` + the preserved @keyframes)
 *   - :hover / :focus interactions still trigger via kept pseudo rules
 *
 * Known limits (V1):
 *   - Responsive @media: baked at the capture viewport (resize doesn't
 *     reflow to mobile rules). Future: capture per breakpoint.
 *   - JS-driven runtime animations (Framer Motion springs, rAF loops):
 *     dead. Same as the previous strip-scripts snapshot.
 *   - Closed shadow DOM: contents inaccessible (browser API limit).
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

function startServer(rootDirArg, manifest) {
  // path.resolve early so the target.startsWith(rootDir) safety check below
  // works no matter what the caller passed (absolute, relative, mixed slashes).
  const rootDir = path.resolve(rootDirArg);
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
    // Service-worker bootstrap reloads the page once the SW is installed —
    // wait for that reload's load event before we measure anything else.
    await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);
    try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch {}

    // Hydration-stability wait. SPA frameworks finish hydrating the DOM
    // a few hundred ms after networkidle (route resolution, IO callbacks,
    // delayed-mount components). Poll until the element count is stable
    // for two consecutive ticks OR the budget elapses.
    const STABILITY_BUDGET = Math.max(settleMs, 8000);
    {
      const t0 = Date.now();
      let last = 0;
      let stable = 0;
      while (Date.now() - t0 < STABILITY_BUDGET) {
        const count = await page.evaluate(() => document.querySelectorAll('*').length).catch(() => 0);
        if (count > 50 && count === last) {
          stable++;
          if (stable >= 2) break;
        } else {
          stable = 0;
        }
        last = count;
        await page.waitForTimeout(700);
      }
    }

    // Drive scroll-triggered animations to completion. Most modern landing
    // pages use ScrollTrigger / IntersectionObserver to play "fade-in" or
    // "slide-up" animations as sections enter the viewport. Until that
    // happens, the elements sit at opacity:0 + offscreen-transform initial
    // state. If we snapshot at scrollTop=0, every below-fold section is
    // captured invisible — verify gate sees text content (innerText reports
    // the raw chars) but the rendered output is blank.
    //
    // Strategy: step-scroll from top to bottom in viewport-sized increments,
    // pausing briefly at each step so ScrollTrigger fires, then return to
    // top. Most sites use `toggleActions: 'play none none none'` (don't
    // reverse on leave) so once played the elements stay visible.
    try {
      await page.evaluate(async () => {
        const total = document.documentElement.scrollHeight;
        const step = window.innerHeight * 0.7;
        for (let y = 0; y < total + window.innerHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 220));
        }
        window.scrollTo(0, 0);
        await new Promise((r) => setTimeout(r, 400));
      });
    } catch {}

    // Animations that are actively in transit when we serialize will bake
    // their *current* in-between transform / opacity into computed style —
    // the snapshot then renders them frozen mid-fade. Force any running
    // browser-managed animation (Web Animations API) to its final state.
    // GSAP timelines using rAF aren't enumerated here, but they typically
    // settle to their final state after their last tween, which the scroll
    // loop above lets play out.
    try {
      await page.evaluate(() => {
        for (const a of document.getAnimations()) {
          try { a.finish(); } catch {}
        }
      });
      await page.waitForTimeout(400);
    } catch {}

    // Heuristic salvage for elements that the animation system left in an
    // initial "invisible" state (opacity:0 + offscreen transform) despite
    // having visible text content. Common when the site uses pure-rAF
    // (GSAP) animations that we can't fast-forward. Force their inline
    // style — getComputedStyle reads these next, baking the final state
    // into the captured rule.
    try {
      await page.evaluate(() => {
        const els = document.querySelectorAll('*');
        for (const el of els) {
          if (!(el instanceof HTMLElement)) continue;
          const cs = getComputedStyle(el);
          if (cs.display === 'none') continue;
          const op = parseFloat(cs.opacity);
          const t = cs.transform;
          const txt = (el.textContent || '').trim();
          // Only recover invisibly-animated text containers — leave purely
          // decorative invisible elements (overlays, off-screen UI) alone.
          if (op === 0 && txt && t && t !== 'none') {
            el.style.opacity = '1';
            el.style.transform = 'none';
            el.style.visibility = 'visible';
          }
        }
      });
      await page.waitForTimeout(200);
    } catch {}

    // Demo-component pages typically gate their animation behind a click.
    // The animation itself is a CSS @keyframes, so once JS adds the active
    // class the animation runs forever via CSS. Pre-clicking the most
    // central button on a page that LOOKS like a single-component demo
    // freezes that active class into the captured DOM.
    try {
      await page.evaluate(() => {
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

    const captured = await page.evaluate(serializeComputedTreeInPage);

    await browser.close();
    server.close();
    return await rewriteSnapshot({ captured, manifest, replayDir, baseHref: url });
  } catch (e) {
    if (browser) await browser.close().catch(() => {});
    server.close();
    throw e;
  }
}

/**
 * In-page serializer. Defined as a real function so we get editor support;
 * Playwright stringifies and evals it inside the target page. NO closure
 * access — every helper must live inside this function body.
 */
function serializeComputedTreeInPage() {
  const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
  const SKIP_TAGS = new Set(['script','noscript','template','meta','link','style','title','base']);
  const STATE_RE = /(?:^|[\s,>~+]):(?:hover|focus|focus-within|focus-visible|active|checked|disabled|enabled|placeholder-shown|target|required|invalid|valid|in-range|out-of-range|read-only|read-write|defined|empty|first-child|last-child|nth-child|first-of-type|last-of-type)\b/i;

  const fpToCid = new Map();
  let cidCounter = 0;
  const baseRules = [];
  const beforeRules = [];
  const afterRules = [];

  const escapeAttr = (s) => String(s)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const escapeText = (s) => String(s)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

  function dumpStyle(cs) {
    const parts = [];
    for (let i = 0; i < cs.length; i++) {
      const name = cs[i];
      // CSS variables already resolved into consumer values — no need to ship.
      if (name.startsWith('--')) continue;
      const v = cs.getPropertyValue(name);
      if (!v) continue;
      parts.push(name + ':' + v);
    }
    return parts.join(';');
  }

  function classify(el) {
    let cs;
    try { cs = getComputedStyle(el); } catch { return null; }
    const baseFp = dumpStyle(cs);
    let beforeFp = '';
    let afterFp = '';
    try {
      const bcs = getComputedStyle(el, '::before');
      const c = bcs.getPropertyValue('content');
      if (c && c !== 'none' && c !== 'normal') beforeFp = dumpStyle(bcs);
    } catch {}
    try {
      const acs = getComputedStyle(el, '::after');
      const c = acs.getPropertyValue('content');
      if (c && c !== 'none' && c !== 'normal') afterFp = dumpStyle(acs);
    } catch {}
    const fp = baseFp + '' + beforeFp + '' + afterFp;
    let cid = fpToCid.get(fp);
    if (cid !== undefined) return cid;
    cid = String(cidCounter++);
    fpToCid.set(fp, cid);
    baseRules.push('[data-cs="' + cid + '"]{' + baseFp + '}');
    if (beforeFp) beforeRules.push('[data-cs="' + cid + '"]::before{' + beforeFp + '}');
    if (afterFp) afterRules.push('[data-cs="' + cid + '"]::after{' + afterFp + '}');
    return cid;
  }

  function isHidden(el) {
    try {
      const cs = getComputedStyle(el);
      if (cs.display === 'none') return true;
    } catch {}
    return false;
  }

  function serializeChildren(parent) {
    let out = '';
    for (const c of parent.childNodes) {
      if (c.nodeType === 3) out += escapeText(c.nodeValue);
      else if (c.nodeType === 1) out += serializeElement(c);
    }
    return out;
  }

  function serializeElement(el) {
    const tag = el.tagName ? el.tagName.toLowerCase() : '';
    if (!tag || SKIP_TAGS.has(tag)) return '';
    if (isHidden(el)) return '';

    const cid = classify(el);
    const attrs = [];
    const seen = new Set();
    for (const a of el.attributes) {
      // Inline style="" is collapsed into computed style — drop it.
      if (a.name === 'style') continue;
      seen.add(a.name);
      attrs.push(' ' + a.name + '="' + escapeAttr(a.value) + '"');
    }
    // Vue/React property bindings set `el.src` / `el.href` without writing
    // the matching attribute. By the time serialize runs, the DOM property
    // may carry the resolved URL while the attribute is still empty. Copy
    // runtime values back into attributes so the static snapshot can load
    // the same resource the live page would have.
    const reflectIfMissing = (attrName, propVal) => {
      if (!propVal) return;
      if (seen.has(attrName)) return;
      const v = String(propVal);
      if (!v || v === 'about:blank') return;
      attrs.push(' ' + attrName + '="' + escapeAttr(v) + '"');
    };
    if (tag === 'img' || tag === 'source' || tag === 'video' || tag === 'audio' || tag === 'iframe') {
      // currentSrc reflects what the browser actually resolved (after
      // <source> election for video/picture); fall back to .src for plain
      // <img>/<iframe> where currentSrc may be empty if not yet loading.
      reflectIfMissing('src', el.currentSrc || el.src);
    }
    if (tag === 'a' || tag === 'link') reflectIfMissing('href', el.href);
    if (tag === 'video' || tag === 'audio') reflectIfMissing('poster', el.poster);
    if (cid !== null) attrs.push(' data-cs="' + cid + '"');
    const open = '<' + tag + attrs.join('') + '>';
    if (VOID.has(tag)) return open;

    // Open shadow roots — re-emit as declarative shadow DOM. Modern browsers
    // parse <template shadowrootmode="open"> back into a real shadow root.
    let shadowMarkup = '';
    if (el.shadowRoot) {
      const inner = serializeChildren(el.shadowRoot);
      shadowMarkup = '<template shadowrootmode="open">' + inner + '</template>';
    }
    return open + shadowMarkup + serializeChildren(el) + '</' + tag + '>';
  }

  // Walk every accessible CSSOM source for @font-face / @keyframes / state-
  // pseudo rules. These three categories survive cascade collapse: keyframes
  // are name-referenced, font-faces are global, and pseudo rules need real
  // selector matching that materialized [data-cs] alone can't reproduce.
  const fontFaces = [];
  const keyframes = [];
  const pseudoRules = [];
  function walkRules(rules) {
    if (!rules) return;
    for (const r of rules) {
      const cn = r.constructor && r.constructor.name;
      if (cn === 'CSSFontFaceRule' || r.type === 5) {
        fontFaces.push(r.cssText);
      } else if (cn === 'CSSKeyframesRule' || r.type === 7) {
        keyframes.push(r.cssText);
      } else if (cn === 'CSSStyleRule' || r.type === 1) {
        if (r.selectorText && STATE_RE.test(r.selectorText)) {
          pseudoRules.push(r.cssText);
        }
      } else if (r.cssRules) {
        // @media, @supports, @layer, @container, @scope — recurse so nested
        // @font-face / @keyframes / pseudo rules surface.
        walkRules(r.cssRules);
      }
    }
  }
  for (const s of document.styleSheets) {
    try { walkRules(s.cssRules); } catch {}
  }
  try {
    for (const s of document.adoptedStyleSheets || []) {
      try { walkRules(s.cssRules); } catch {}
    }
  } catch {}
  document.querySelectorAll('*').forEach((el) => {
    if (!el.shadowRoot) return;
    try { for (const s of el.shadowRoot.adoptedStyleSheets || []) walkRules(s.cssRules); } catch {}
    try {
      for (const styleEl of el.shadowRoot.querySelectorAll('style')) {
        if (styleEl.sheet) walkRules(styleEl.sheet.cssRules);
      }
    } catch {}
  });

  // Classify <html> + <body> too so their bg / color / font apply.
  const htmlCid = document.documentElement ? classify(document.documentElement) : null;
  const bodyCid = document.body ? classify(document.body) : null;

  function dumpAttrs(el) {
    const out = {};
    if (!el || !el.attributes) return out;
    for (const a of el.attributes) {
      if (a.name === 'style') continue;
      out[a.name] = a.value;
    }
    return out;
  }

  return {
    title: document.title || '',
    htmlAttrs: dumpAttrs(document.documentElement),
    bodyAttrs: dumpAttrs(document.body),
    htmlCid,
    bodyCid,
    bodyInner: document.body ? serializeChildren(document.body) : '',
    baseRules,
    beforeRules,
    afterRules,
    fontFaces,
    keyframes,
    pseudoRules,
    elementCount: document.querySelectorAll('*').length,
    uniqueClassCount: cidCounter,
  };
}

async function rewriteSnapshot({ captured, manifest, replayDir, baseHref }) {
  const bodiesDir = path.join(replayDir, 'bodies');
  // Inline assets <= 200 KB as data: URIs. Larger ones get rewritten to
  // `replay/bodies/<sha>` — those files already exist next to the bundle,
  // and `file://` happily loads them even without extensions for image src
  // and CSS url() refs. Keeps the HTML small enough to load fast while
  // still working as a self-contained directory.
  const INLINE_THRESHOLD = 200 * 1024;
  const cache = new Map();

  const lookup = async (rawUrl) => {
    if (!rawUrl) return null;
    const r0 = String(rawUrl).trim();
    if (!r0) return null;
    if (r0.startsWith('data:') || r0.startsWith('blob:') || r0.startsWith('#')) return null;
    if (r0.startsWith('javascript:') || r0.startsWith('mailto:') || r0.startsWith('tel:')) return null;
    let abs;
    try { abs = new URL(r0, baseHref).toString().replace(/#.*$/, ''); } catch { return null; }
    if (cache.has(abs)) return cache.get(abs);
    let entry = manifest.entries?.[abs];
    if (!entry) {
      try {
        const u = new URL(abs);
        if (manifest.byPath?.[u.pathname]) entry = manifest.entries[manifest.byPath[u.pathname]];
        if (!entry && manifest.byBasename) {
          const base = u.pathname.split('/').pop();
          if (base && manifest.byBasename[base]) entry = manifest.entries[manifest.byBasename[base]];
        }
      } catch {}
    }
    if (!entry) { cache.set(abs, null); return null; }
    let buf;
    try { buf = await fsp.readFile(path.join(bodiesDir, entry.body)); }
    catch { cache.set(abs, null); return null; }
    const r = { buf, mimeType: entry.mimeType || '', body: entry.body };
    cache.set(abs, r);
    return r;
  };

  const toDataUri = (buf, mt) =>
    `data:${(mt || 'application/octet-stream').split(';')[0].trim()};base64,${buf.toString('base64')}`;

  // For small bodies, inline as data:; for large bodies, point at the
  // already-on-disk replay file via relative path. Both work under file://.
  const refFor = (r) =>
    r.buf.length > INLINE_THRESHOLD
      ? `replay/bodies/${r.body}`
      : toDataUri(r.buf, r.mimeType);

  // Anything that resolves to the snapshot capture origin (our local server)
  // would land at file:///<drive>/... when the user double-clicks the file.
  // External http(s) URLs may still be served by the live web — leave them.
  const baseOrigin = (() => { try { return new URL(baseHref).origin; } catch { return null; } })();
  const isUnresolvableLocal = (raw) => {
    if (!raw) return false;
    const s = String(raw).trim();
    if (!s) return false;
    if (s.startsWith('data:') || s.startsWith('blob:') || s.startsWith('#')) return false;
    if (s.startsWith('//')) return false;
    if (s.startsWith('/')) return true;
    try { return new URL(s, baseHref).origin === baseOrigin; } catch { return false; }
  };

  const inlineUrlsInCss = async (css) => {
    if (!css || css.indexOf('url(') < 0) return css;
    const matches = [...css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)];
    if (!matches.length) return css;
    const out = [];
    let last = 0;
    for (const m of matches) {
      out.push(css.slice(last, m.index));
      const raw = m[2].trim();
      const r = await lookup(raw);
      if (r) out.push(`url("${refFor(r)}")`);
      else if (isUnresolvableLocal(raw)) out.push('url("about:blank")');
      else out.push(m[0]);
      last = m.index + m[0].length;
    }
    out.push(css.slice(last));
    return out.join('');
  };

  const [fontFacesCss, baseRulesCss, beforeRulesCss, afterRulesCss, pseudoRulesCss] = await Promise.all([
    Promise.all(captured.fontFaces.map(inlineUrlsInCss)).then((arr) => arr.join('\n')),
    Promise.all(captured.baseRules.map(inlineUrlsInCss)).then((arr) => arr.join('\n')),
    Promise.all(captured.beforeRules.map(inlineUrlsInCss)).then((arr) => arr.join('\n')),
    Promise.all(captured.afterRules.map(inlineUrlsInCss)).then((arr) => arr.join('\n')),
    Promise.all(captured.pseudoRules.map(inlineUrlsInCss)).then((arr) => arr.join('\n')),
  ]);
  const keyframesCss = captured.keyframes.join('\n');

  // Body asset rewrites — load into cheerio (decodeEntities off so existing
  // serialized markup round-trips byte-for-byte) and walk the DOM.
  const $ = cheerio.load(
    `<!DOCTYPE html><html><head></head><body>${captured.bodyInner}</body></html>`,
    { decodeEntities: false }
  );

  const IMG_ATTRS = ['src', 'data-src', 'data-original', 'data-lazy', 'data-bg', 'data-image'];
  const BLANK_PNG = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

  for (const el of $('img, source, video, audio, embed, iframe').toArray()) {
    const tag = (el.tagName || '').toLowerCase();
    if (tag === 'iframe') {
      // Iframes pointing at the live origin would 404 on file://. Drop.
      const src = $(el).attr('src');
      if (src && !src.startsWith('data:')) $(el).removeAttr('src');
      continue;
    }
    for (const a of IMG_ATTRS) {
      const v = $(el).attr(a);
      if (!v) continue;
      const r = await lookup(v);
      if (r) { $(el).attr(a, refFor(r)); continue; }
      if (isUnresolvableLocal(v)) {
        if (tag === 'img' && a === 'src') $(el).attr(a, BLANK_PNG);
        else $(el).removeAttr(a);
      }
    }
    const poster = $(el).attr('poster');
    if (poster) {
      const r = await lookup(poster);
      if (r) $(el).attr('poster', refFor(r));
      else if (isUnresolvableLocal(poster)) $(el).removeAttr('poster');
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
        if (r) { out.push(refFor(r) + desc); continue; }
        if (!isUnresolvableLocal(u)) out.push(p);
      }
      if (out.length) $(el).attr(a, out.join(', '));
      else $(el).removeAttr(a);
    }
  }

  const bodyHtml = $('body').html() || '';

  const serializeAttrs = (m) => Object.entries(m || {})
    .map(([k, v]) => v === '' ? ` ${k}` : ` ${k}="${String(v).replaceAll('"', '&quot;')}"`)
    .join('');
  const htmlAttrs = serializeAttrs(captured.htmlAttrs)
    + (captured.htmlCid != null ? ` data-cs="${captured.htmlCid}"` : '');
  const bodyAttrs = serializeAttrs(captured.bodyAttrs)
    + (captured.bodyCid != null ? ` data-cs="${captured.bodyCid}"` : '');

  const titleEsc = String(captured.title || '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

  const stats = `/* clone-saas computed-style snapshot — ${captured.elementCount} elements, ${captured.uniqueClassCount} unique fingerprints */`;

  return [
    '<!DOCTYPE html>',
    `<html${htmlAttrs}>`,
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${titleEsc}</title>`,
    '<style data-clone-saas-snapshot>',
    stats,
    fontFacesCss,
    keyframesCss,
    // Materialized base rules first; ::before/::after layered after; pseudo
    // (state) rules last so they win cascade order at equal specificity and
    // can override the base on hover/focus.
    baseRulesCss,
    beforeRulesCss,
    afterRulesCss,
    pseudoRulesCss,
    '</style>',
    '</head>',
    `<body${bodyAttrs}>`,
    bodyHtml,
    '</body>',
    '</html>',
  ].join('\n');
}
