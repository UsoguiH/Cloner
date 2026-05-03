/**
 * Self-contained HTML builder.
 *
 * Takes the replay-mode HTML (which references CSS/JS/images by URL and
 * needs a service worker to load them) and produces a single file with
 * everything inlined. The resulting file works when double-clicked —
 * no server, no SW, no start.bat — and ships the page's JS too so
 * animations and client-side interactivity still run.
 *
 * Strategy:
 *   - Look up every referenced asset in the replay manifest.
 *   - <link rel="stylesheet">  → <style> with nested url() recursively inlined.
 *   - <style> / style=""        → rewrite url() to data: URIs.
 *   - @import inside CSS        → inline the imported sheet recursively.
 *   - <img>, <source>, <video poster>, <link rel="icon"> → data: URIs.
 *   - <script type="module" src> → blob-URL importmap (see inlineModules).
 *   - Classic <script src>       → inline source.
 *   - Inline <script type="module"> → import paths rewritten to importmap keys.
 *
 * The blob/importmap technique sidesteps Chrome's CORS block on file://
 * for ES modules. Dynamic chunks loaded via fetch() (e.g. Next.js RSC
 * payloads) still won't work — those need a server — but most client-side
 * animation runs without them.
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import * as cheerio from 'cheerio';

export async function buildStandaloneHtml({ html, replayDir, docUrl }) {
  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(path.join(replayDir, 'manifest.json'), 'utf8'));
  } catch {
    return html; // no replay data → can't inline; caller writes original
  }
  const bodiesDir = path.join(replayDir, 'bodies');
  const cache = new Map();

  const lookup = async (rawUrl, baseUrl) => {
    if (!rawUrl) return null;
    if (rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')
        || rawUrl.startsWith('#') || rawUrl.startsWith('javascript:')
        || rawUrl.startsWith('mailto:') || rawUrl.startsWith('tel:')) return null;
    let abs;
    try { abs = new URL(rawUrl, baseUrl || docUrl).toString(); } catch { return null; }
    const cleanAbs = abs.replace(/#.*$/, '');
    if (cache.has(cleanAbs)) return cache.get(cleanAbs);

    let entry = manifest.entries?.[cleanAbs] || manifest.entries?.[abs];
    if (!entry) {
      try {
        const u = new URL(cleanAbs);
        if (manifest.byPath?.[u.pathname]) {
          entry = manifest.entries[manifest.byPath[u.pathname]];
        }
        if (!entry && manifest.byBasename) {
          const base = u.pathname.split('/').pop();
          if (base && manifest.byBasename[base]) {
            entry = manifest.entries[manifest.byBasename[base]];
          }
        }
      } catch {}
    }
    if (!entry) { cache.set(cleanAbs, null); return null; }

    let buf;
    try { buf = await fs.readFile(path.join(bodiesDir, entry.body)); }
    catch { cache.set(cleanAbs, null); return null; }
    const result = { buf, mimeType: entry.mimeType || '', absUrl: cleanAbs };
    cache.set(cleanAbs, result);
    return result;
  };

  const toDataUri = (buf, mimeType) => {
    const mt = (mimeType || 'application/octet-stream').split(';')[0].trim();
    return `data:${mt};base64,${buf.toString('base64')}`;
  };

  // Recursively inline url(...) refs and @import inside a CSS string.
  const rewriteCss = async (css, baseUrl, depth = 0) => {
    if (depth > 4) return css; // guard against pathological @import loops
    let s = css;

    // @import "url" / @import url("url")
    const IMPORT_RE = /@import\s+(?:url\(\s*)?(['"]?)([^'")]+)\1\s*\)?\s*([^;]*);/gi;
    const importMatches = [...s.matchAll(IMPORT_RE)];
    for (const m of importMatches.reverse()) {
      const r = await lookup(m[2], baseUrl);
      if (!r) continue;
      const inner = await rewriteCss(r.buf.toString('utf8'), r.absUrl, depth + 1);
      s = s.slice(0, m.index) + `\n/* @import inlined: ${m[2]} */\n` + inner + '\n' + s.slice(m.index + m[0].length);
    }

    // url(...) for fonts/images
    const URL_RE = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
    const out = [];
    let last = 0;
    URL_RE.lastIndex = 0;
    let m2;
    while ((m2 = URL_RE.exec(s)) !== null) {
      const raw = m2[2].trim();
      out.push(s.slice(last, m2.index));
      last = m2.index + m2[0].length;
      if (raw.startsWith('data:') || raw.startsWith('blob:') || raw.startsWith('#')) {
        out.push(m2[0]);
        continue;
      }
      const r = await lookup(raw, baseUrl);
      if (!r) { out.push(m2[0]); continue; }
      out.push(`url("${toDataUri(r.buf, r.mimeType)}")`);
    }
    out.push(s.slice(last));
    return out.join('');
  };

  const $ = cheerio.load(html, { decodeEntities: false });

  // Strip the SW bootstrap (the inline file:// banner already covers the case
  // where someone double-clicks the *replay* index.html).
  $('script[data-clone-saas-boot]').remove();

  // <link rel="stylesheet"> → <style> with everything resolved.
  for (const link of $('link[rel="stylesheet"]').toArray()) {
    const href = $(link).attr('href');
    if (!href) continue;
    const r = await lookup(href);
    if (!r) { $(link).remove(); continue; }
    const css = await rewriteCss(r.buf.toString('utf8'), r.absUrl);
    const media = $(link).attr('media');
    const mediaAttr = media ? ` media="${media.replace(/"/g, '&quot;')}"` : '';
    $(link).replaceWith(`<style data-inlined-from="${href.replace(/"/g, '&quot;')}"${mediaAttr}>${css}</style>`);
  }

  // Inline <style> blocks — rewrite their url() refs and @imports.
  for (const styleEl of $('style').toArray()) {
    const css = $(styleEl).html() || '';
    if (!css || !/url\(|@import/.test(css)) continue;
    const rewritten = await rewriteCss(css, docUrl);
    if (rewritten !== css) $(styleEl).html(rewritten);
  }

  // <link rel="icon"> family → data: href
  for (const link of $('link[rel="icon"], link[rel="shortcut icon"], link[rel*="apple-touch-icon"], link[rel="mask-icon"]').toArray()) {
    const href = $(link).attr('href');
    if (!href) continue;
    const r = await lookup(href);
    if (!r) continue;
    $(link).attr('href', toDataUri(r.buf, r.mimeType));
  }

  // <link rel="preload" | "modulepreload" | "prefetch"> → drop. They reference
  // dynamic chunks and serve no purpose with JS removed.
  $('link[rel="modulepreload"], link[rel="preload"], link[rel="prefetch"], link[rel="dns-prefetch"], link[rel="preconnect"]').remove();

  // <img src> + lazy data-* variants → data:
  const IMG_ATTRS = ['src', 'data-src', 'data-original', 'data-lazy', 'data-bg', 'data-image'];
  for (const el of $('img, source, video, audio, embed, iframe').toArray()) {
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

  // srcset (img + source)
  for (const el of $('[srcset], [data-srcset]').toArray()) {
    for (const a of ['srcset', 'data-srcset']) {
      const v = $(el).attr(a);
      if (!v) continue;
      const parts = v.split(',').map((p) => p.trim()).filter(Boolean);
      const out = [];
      for (const p of parts) {
        const sp = p.search(/\s/);
        const url = sp === -1 ? p : p.slice(0, sp);
        const desc = sp === -1 ? '' : p.slice(sp);
        if (url.startsWith('data:')) { out.push(p); continue; }
        const r = await lookup(url);
        if (!r) { out.push(p); continue; }
        out.push(toDataUri(r.buf, r.mimeType) + desc);
      }
      $(el).attr(a, out.join(', '));
    }
  }

  // Inline style="..." → rewrite url() refs
  for (const el of $('[style]').toArray()) {
    const v = $(el).attr('style') || '';
    if (!v.includes('url(')) continue;
    const rewritten = await rewriteCss(v, docUrl);
    if (rewritten !== v) $(el).attr('style', rewritten);
  }

  await inlineModules({ $, manifest, bodiesDir, docUrl, lookup });

  // Top banner — explains the standalone variant + its limitation.
  const banner =
    '<div id="clone-saas-standalone-banner" style="position:fixed;bottom:0;left:0;right:0;z-index:2147483647;' +
    'padding:6px 12px;background:rgba(22,163,74,0.92);color:#fff;font:11px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;' +
    'text-align:center;backdrop-filter:blur(4px)">' +
    'Standalone preview — opened directly via file://. Scripts, animations and CSS run from inlined data; dynamic server fetches (RSC payloads, lazy chunks) are unavailable. ' +
    'Run <code style="background:rgba(0,0,0,0.25);padding:1px 4px;border-radius:2px">start.bat</code> for the fully interactive version.' +
    '<button onclick="this.parentElement.remove()" style="margin-left:10px;background:transparent;border:1px solid rgba(255,255,255,0.5);color:#fff;cursor:pointer;padding:1px 8px;border-radius:3px;font-size:11px">dismiss</button>' +
    '</div>';
  if ($('body').length) {
    $('body').append(banner);
  } else {
    $.root().append(banner);
  }

  return $.html();
}

/**
 * Walk the replay manifest, collect every JS module, build a base64 →
 * blob-URL importmap bootstrap, and rewrite the page's <script> tags to
 * load from the importmap. The technique:
 *
 *   1. For each JS file in the replay, generate a stable key (`@m/<n>`).
 *   2. Rewrite each module's own static + dynamic imports to use those
 *      keys, so when one module imports `./X.js`, the importmap routes it
 *      to the blob URL of X.
 *   3. Emit a bootstrap <script> that decodes the base64 sources, creates
 *      blob URLs, and `document.write`s an `<script type="importmap">` —
 *      this MUST run before the parser hits any `<script type="module">`,
 *      which is why it sits as the first child of <head>.
 *   4. Replace each `<script type="module" src="X">` with
 *      `<script type="module">import "@m/<key>";</script>`.
 *   5. Inline classic scripts directly. Inline module scripts get their
 *      imports rewritten too.
 *
 * Network fetches (RSC payloads, dynamic chunks loaded via fetch()) still
 * fail on file://. Most animation libraries (framer-motion, GSAP, anime.js)
 * run without them and animations come back to life.
 */
async function inlineModules({ $, manifest, bodiesDir, docUrl, lookup }) {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');

  const PREFIX = '@m/';
  const modulesByUrl = new Map();
  let counter = 0;

  for (const [url, entry] of Object.entries(manifest.entries || {})) {
    const mt = (entry.mimeType || '').toLowerCase();
    const isJs = /javascript|ecmascript/.test(mt) || /\.m?js(\?|#|$)/i.test(url);
    if (!isJs) continue;
    let buf;
    try { buf = await fs.readFile(path.join(bodiesDir, entry.body)); }
    catch { continue; }
    const source = buf.toString('utf8');
    // Skip empty or trivially-broken sources
    if (!source || source.length < 1) continue;
    counter++;
    modulesByUrl.set(url, { key: `${PREFIX}${counter}`, source, absUrl: url });
  }

  if (modulesByUrl.size === 0) {
    // No modules to inline — drop the network <script src> tags so they
    // don't 404 on file://, but keep inline scripts (they may animate).
    $('script[src]').remove();
    return;
  }

  // Helper: resolve a module specifier against a base URL, return key or null.
  const resolveSpecKey = (spec, baseUrl) => {
    if (!spec) return null;
    // Skip bare specifiers (npm-style); real bundles inline these as relative paths.
    if (!spec.startsWith('.') && !spec.startsWith('/') && !/^[a-z]+:\/\//i.test(spec)) return null;
    let abs;
    try { abs = new URL(spec, baseUrl).toString(); } catch { return null; }
    const cleanAbs = abs.replace(/#.*$/, '');
    if (modulesByUrl.has(cleanAbs)) return modulesByUrl.get(cleanAbs).key;
    if (modulesByUrl.has(abs)) return modulesByUrl.get(abs).key;
    try {
      const u = new URL(cleanAbs);
      if (manifest.byPath?.[u.pathname]) {
        const canonical = manifest.byPath[u.pathname];
        if (modulesByUrl.has(canonical)) return modulesByUrl.get(canonical).key;
      }
      if (manifest.byBasename) {
        const base = u.pathname.split('/').pop();
        if (base && manifest.byBasename[base]) {
          const canonical = manifest.byBasename[base];
          if (modulesByUrl.has(canonical)) return modulesByUrl.get(canonical).key;
        }
      }
    } catch {}
    return null;
  };

  // Rewrites covering: static `import ... from "x"`, side-effect `import "x"`,
  // re-export `export ... from "x"`, dynamic `import("x")`. Skips template
  // literals and computed dynamic imports (those need real bundler analysis).
  const rewriteSource = (src, baseUrl) => {
    return src
      // import "x" / import a from "x" / import { a } from "x" / import * as a from "x"
      .replace(/(\bimport\s+(?:[\w*${},\s]+?\s+from\s+)?)(['"])([^'"]+)\2/g, (full, prefix, q, spec) => {
        const key = resolveSpecKey(spec, baseUrl);
        return key ? `${prefix}${q}${key}${q}` : full;
      })
      // export ... from "x"
      .replace(/(\bexport\s+(?:[\w*${},\s]+?\s+from\s+))(['"])([^'"]+)\2/g, (full, prefix, q, spec) => {
        const key = resolveSpecKey(spec, baseUrl);
        return key ? `${prefix}${q}${key}${q}` : full;
      })
      // import("x") (dynamic)
      .replace(/(\bimport\s*\(\s*)(['"])([^'"]+)\2/g, (full, prefix, q, spec) => {
        const key = resolveSpecKey(spec, baseUrl);
        return key ? `${prefix}${q}${key}${q}` : full;
      });
  };

  // Pre-rewrite every module's own imports so cross-module refs resolve
  // through the importmap.
  for (const m of modulesByUrl.values()) {
    m.rewritten = rewriteSource(m.source, m.absUrl);
  }

  // Build the base64 module map + pathname/basename indexes so that any
  // <script src=/some/path.js> injected at RUNTIME (e.g. by webpack's chunk
  // loader) can be remapped to its inlined blob URL.
  const moduleMap = {};
  const pathToKey = {};
  const baseToKey = {};
  for (const m of modulesByUrl.values()) {
    moduleMap[m.key] = Buffer.from(m.rewritten, 'utf8').toString('base64');
    try {
      const u = new URL(m.absUrl);
      const pn = u.pathname;
      if (pn) {
        // Last writer wins is fine; on collisions any inlined source for the
        // same path will work since the original deployment hash is unique.
        pathToKey[pn] = m.key;
        const base = pn.split('/').pop();
        if (base) baseToKey[base] = m.key;
      }
    } catch {}
  }

  // Bootstrap: decode sources → blob URLs → importmap → install runtime
  // src/href interceptor for dynamically-injected <script src> tags.
  //
  // Two ordering constraints:
  //   1. document.write(<importmap>) MUST happen during sync parser execution,
  //      before any <script type="module"> begins loading, otherwise Chrome
  //      rejects the map.
  //   2. The src interceptor MUST be installed before any other script runs,
  //      since webpack/Next.js chunks inject <script src> immediately on boot.
  // The IIFE below covers both because it's the FIRST child of <head>.
  const bootstrap =
    '<script data-clone-saas-standalone-boot>' +
    '(function(){' +
    'var M=' + JSON.stringify(moduleMap) + ';' +
    'var P=' + JSON.stringify(pathToKey) + ';' +
    'var B=' + JSON.stringify(baseToKey) + ';' +
    'var I={};' +
    'for(var k in M){' +
    'var s=atob(M[k]);' +
    'var u=new Uint8Array(s.length);' +
    'for(var i=0;i<s.length;i++)u[i]=s.charCodeAt(i);' +
    'I[k]=URL.createObjectURL(new Blob([u],{type:"application/javascript"}));' +
    '}' +
    // path → blob URL and basename → blob URL lookup tables
    'var BP={};for(var p in P)BP[p]=I[P[p]];' +
    'var BB={};for(var b in B)BB[b]=I[B[b]];' +
    // remap(): given any URL value a runtime caller is about to put on a
    // <script src> / <link href> / fetch(), return the blob URL if we have
    // the asset inlined. Webpack on Chromium passes TrustedScriptURL objects
    // (not plain strings) — convert via String() before matching. Returning
    // a plain string is fine on file:// (no CSP enforcement).
    'function remap(v){' +
    'if(v==null)return v;' +
    'var s=(typeof v==="string")?v:String(v);' +
    'if(s.indexOf("blob:")===0||s.indexOf("data:")===0||s.indexOf("@m/")===0)return v;' +
    'var pn=s;' +
    'try{' +
    'if(/^[a-z]+:\\/\\//i.test(s)||s.indexOf("file:")===0)pn=new URL(s).pathname;' +
    'else if(s.charAt(0)!=="/")pn=new URL(s,location.href).pathname;' +
    'else{var q=s.indexOf("?");pn=q===-1?s:s.slice(0,q);var h=pn.indexOf("#");if(h!==-1)pn=pn.slice(0,h);}' +
    '}catch(e){}' +
    'if(BP[pn])return BP[pn];' +
    'var bn=pn.split("/").pop();' +
    'if(bn&&BB[bn])return BB[bn];' +
    'return v;' +
    '}' +
    // Hook HTMLScriptElement.src setter — webpack does `script.src = url`.
    'try{' +
    'var d=Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype,"src");' +
    'if(d&&d.set){' +
    'Object.defineProperty(HTMLScriptElement.prototype,"src",{configurable:true,enumerable:true,' +
    'get:function(){return d.get.call(this);},' +
    'set:function(v){return d.set.call(this,remap(v));}});' +
    '}' +
    '}catch(e){}' +
    // Hook setAttribute — covers `script.setAttribute("src", url)` paths and
    // also late-attached <link rel="stylesheet" href>. Falls through for
    // unrelated attrs/elements.
    'try{' +
    'var oS=Element.prototype.setAttribute;' +
    'Element.prototype.setAttribute=function(n,v){' +
    'if(typeof n==="string"){' +
    'var ln=n.toLowerCase();' +
    'if((this.tagName==="SCRIPT"&&ln==="src")||(this.tagName==="LINK"&&ln==="href"))v=remap(v);' +
    '}' +
    'return oS.call(this,n,v);' +
    '};' +
    '}catch(e){}' +
    // Hook fetch() too — Next.js fetches the build/route manifests as plain
    // GETs. Only intercept when the URL maps to something inlined.
    'try{' +
    'var oF=window.fetch;' +
    'window.fetch=function(input,init){' +
    'try{' +
    'var url=typeof input==="string"?input:(input&&input.url);' +
    'if(url){var r=remap(url);if(r!==url){' +
    'if(typeof input==="string")input=r;else input=new Request(r,input);' +
    '}}' +
    '}catch(e){}' +
    'return oF.call(this,input,init);' +
    '};' +
    '}catch(e){}' +
    'document.write(\'<script type="importmap">\'+JSON.stringify({imports:I})+\'<\\/script>\');' +
    '})();' +
    '</script>';

  const $head = $('head');
  if ($head.length) $head.prepend(bootstrap);
  else $.root().prepend(`<head>${bootstrap}</head>`);

  // Replace <script src> tags. Modules → load via importmap key. Classic
  // scripts → inline the source directly.
  for (const scriptEl of $('script[src]').toArray()) {
    const $s = $(scriptEl);
    const src = $s.attr('src');
    if (!src) continue;
    let absSrc;
    try { absSrc = new URL(src, docUrl).toString(); } catch { $s.remove(); continue; }
    const cleanAbs = absSrc.replace(/#.*$/, '');
    const m = modulesByUrl.get(cleanAbs)
      || modulesByUrl.get(absSrc)
      || (() => {
        try {
          const u = new URL(cleanAbs);
          if (manifest.byPath?.[u.pathname]) return modulesByUrl.get(manifest.byPath[u.pathname]);
          const base = u.pathname.split('/').pop();
          if (base && manifest.byBasename?.[base]) return modulesByUrl.get(manifest.byBasename[base]);
        } catch {}
        return null;
      })();
    if (!m) {
      // Not in modules — try direct lookup (could be a non-JS that slipped
      // into a script tag via mimetype mismatch). If still nothing, drop.
      const r = await lookup(src);
      if (!r) { $s.remove(); continue; }
      const t = ($s.attr('type') || '').toLowerCase();
      if (t === 'module') { $s.remove(); continue; }
      $s.removeAttr('src').text(r.buf.toString('utf8'));
      continue;
    }
    const t = ($s.attr('type') || '').toLowerCase();
    if (t === 'module') {
      // Strip noModule attr; clear src; replace body with importmap-keyed import
      const attrsToKeep = ['type', 'async', 'defer', 'crossorigin', 'integrity', 'nonce'];
      const oldAttrs = $s.attr() || {};
      for (const k of Object.keys(oldAttrs)) {
        if (!attrsToKeep.includes(k)) $s.removeAttr(k);
      }
      $s.attr('type', 'module').text(`import "${m.key}";`);
    } else {
      // Classic <script src> → inline the body
      $s.removeAttr('src').text(m.source);
    }
  }

  // Inline <script type="module"> bodies: rewrite their imports too so any
  // relative refs they contain resolve through the importmap.
  $('script[type="module"]:not([src])').each((_, el) => {
    const $el = $(el);
    if ($el.attr('data-clone-saas-standalone-boot') !== undefined) return;
    const body = $el.html() || '';
    if (!body.trim()) return;
    const rewritten = rewriteSource(body, docUrl);
    if (rewritten !== body) $el.text(rewritten);
  });
}
