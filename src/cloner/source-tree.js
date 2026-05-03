/**
 * Source-tree builder.
 *
 * Takes the replay capture (replay/manifest.json + replay/bodies/<sha1>) and
 * the captured DOM, and lays out a real source folder where every asset lives
 * under its original URL pathname:
 *
 *   clone/
 *   ├── index.html          (the captured HTML, URLs rewritten to relative)
 *   ├── _next/static/css/foo.css
 *   ├── _next/static/chunks/6827.<hash>.js
 *   ├── _next/static/media/<font>.woff2
 *   └── _external/<host>/...    (CDN-hosted assets)
 *
 * Plus a small `runtime/file-shim.js` injected into <head> that:
 *   - removes TrustedTypes policy enforcement (so dynamic chunk loading works)
 *   - rewrites any path-based asset URL (e.g. /_next/static/...) the page
 *     tries to fetch into the relative form, so webpack's lazy chunk loader
 *     and any fetch() call resolve to our local files when opened from file://.
 *
 * Result: a file:// double-click renders the cloned component with full CSS,
 * fonts, and JS animation. No inlining. Each file is at its real size and
 * has its real name.
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import { URL as NodeURL } from 'node:url';
import * as cheerio from 'cheerio';

// MIME → extension fallback for URLs whose path has no recognizable extension
// (e.g. fonts.googleapis.com/css2?family=Inter).
const EXT_FROM_MIME = {
  'text/css': '.css',
  'application/javascript': '.js',
  'text/javascript': '.js',
  'application/json': '.json',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/x-icon': '.ico',
  'image/vnd.microsoft.icon': '.ico',
  'font/woff2': '.woff2',
  'font/woff': '.woff',
  'font/ttf': '.ttf',
  'font/otf': '.otf',
  'application/font-woff2': '.woff2',
  'application/font-woff': '.woff',
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
};

const KNOWN_EXTS = new Set(Object.values(EXT_FROM_MIME));

function sanitizeSegment(seg) {
  // Decode URL-encoded characters first so disk paths use real names
  // (e.g. `[component]` instead of `%5Bcomponent%5D`). Then replace any
  // remaining char disallowed in Windows filenames with '_'.
  let s;
  try { s = decodeURIComponent(seg); } catch { s = seg; }
  return s.replace(/[<>:"|?*\x00-\x1f]/g, '_').replace(/\s+/g, '_');
}

function pathnameToRelative(host, pathname, mimeType, originHost) {
  // Strip leading slash, sanitize segments.
  let p = pathname.replace(/^\/+/, '');
  if (!p) p = 'index';
  const segs = p.split('/').filter(Boolean).map(sanitizeSegment);
  let last = segs[segs.length - 1] || 'index';
  // Ensure there's a recognizable file extension.
  const dotIdx = last.lastIndexOf('.');
  const currentExt = dotIdx >= 0 ? last.slice(dotIdx).toLowerCase() : '';
  if (!KNOWN_EXTS.has(currentExt)) {
    const fallback = EXT_FROM_MIME[(mimeType || '').split(';')[0].trim().toLowerCase()];
    if (fallback) last = last + fallback;
  }
  segs[segs.length - 1] = last;
  const samOrigin = !host || host === originHost;
  return samOrigin
    ? segs.join('/')
    : '_external/' + sanitizeSegment(host) + '/' + segs.join('/');
}

/**
 * Build the source tree on disk and return a URL → relative-path map.
 */
export async function buildSourceTree({ outputDir, docUrl, manifest, sourceDir }) {
  const bodiesDir = path.join(outputDir, 'replay', 'bodies');
  const target = sourceDir;
  await fs.mkdir(target, { recursive: true });

  let originHost = '';
  try { originHost = new NodeURL(docUrl).host; } catch {}

  // url -> relative path (forward slashes, no leading ./)
  const urlMap = new Map();
  // pathname -> rel (for path-only references like /_next/...)
  const pathMap = new Map();
  // basename -> rel (last-resort fallback)
  const baseMap = new Map();

  // Track which target files we've written, so duplicate URLs don't collide.
  const written = new Set();

  for (const [absUrl, entry] of Object.entries(manifest.entries || {})) {
    let u;
    try { u = new NodeURL(absUrl); } catch { continue; }

    // Skip the document itself + Next.js prefetch HTML (other /v1/skiperNN
    // pages we don't actually need locally — they bloat the output).
    if (entry.mimeType && entry.mimeType.startsWith('text/html')) continue;
    if (entry.status && entry.status >= 400) continue;

    const rel = pathnameToRelative(u.host, u.pathname, entry.mimeType, originHost);
    const dest = path.join(target, rel);
    if (!written.has(dest)) {
      try {
        await fs.mkdir(path.dirname(dest), { recursive: true });
        const buf = await fs.readFile(path.join(bodiesDir, entry.body));
        await fs.writeFile(dest, buf);
        written.add(dest);
      } catch {
        continue;
      }
    }
    // Map by full URL, by URL-without-query, by pathname, and by basename.
    const cleanAbs = absUrl.replace(/#.*$/, '');
    urlMap.set(cleanAbs, rel);
    const noQuery = cleanAbs.split('?')[0];
    if (noQuery !== cleanAbs) urlMap.set(noQuery, rel);
    if (!u.host || u.host === originHost) {
      pathMap.set(u.pathname, rel);
    }
    const base = u.pathname.split('/').filter(Boolean).pop();
    if (base && !baseMap.has(base)) baseMap.set(base, rel);
  }

  return { urlMap, pathMap, baseMap, originHost };
}

/**
 * Take a URL appearing in HTML/CSS and return its local relative path,
 * or null if we don't have it.
 */
export function resolveLocal({ rawUrl, baseUrl, urlMap, pathMap, baseMap, originHost }) {
  if (!rawUrl) return null;
  const skips = ['data:', 'blob:', '#', 'javascript:', 'mailto:', 'tel:', 'about:'];
  for (const s of skips) if (rawUrl.startsWith(s)) return null;
  let abs;
  try { abs = new NodeURL(rawUrl, baseUrl).toString(); } catch { return null; }
  const cleanAbs = abs.replace(/#.*$/, '');
  if (urlMap.has(cleanAbs)) return urlMap.get(cleanAbs);
  const noQuery = cleanAbs.split('?')[0];
  if (urlMap.has(noQuery)) return urlMap.get(noQuery);
  try {
    const u = new NodeURL(cleanAbs);
    if (pathMap.has(u.pathname)) return pathMap.get(u.pathname);
    const base = u.pathname.split('/').filter(Boolean).pop();
    if (base && baseMap.has(base)) return baseMap.get(base);
  } catch {}
  return null;
}

/**
 * Compute a forward-slashed relative path from one project-root-relative
 * path to another. Used to rewrite CSS url() refs so they resolve correctly
 * relative to the CSS file's own location (which is how the browser
 * interprets them).
 */
function relFromTo(fromRel, toRel) {
  const fromDir = fromRel.split('/').slice(0, -1);
  const toSegs = toRel.split('/');
  // common prefix
  let i = 0;
  while (i < fromDir.length && i < toSegs.length - 1 && fromDir[i] === toSegs[i]) i++;
  const ups = new Array(fromDir.length - i).fill('..');
  const downs = toSegs.slice(i);
  return [...ups, ...downs].join('/') || './';
}

/**
 * Recursively rewrite url(...) and @import refs in a CSS string to
 * relative paths. Mutates nothing; returns new string.
 *
 * `cssOwnRel` (optional) — the project-root-relative path of the CSS file
 * being rewritten. When provided, output paths are relative to the CSS
 * file's location, which is how the browser interprets them. When omitted
 * (e.g. for inline <style> blocks in HTML), output paths are relative to
 * the document root.
 */
export function rewriteCssUrls(css, baseUrl, maps, cssOwnRel) {
  const adapt = (rel) => (cssOwnRel ? relFromTo(cssOwnRel, rel) : rel);
  let s = css;
  // @import "x" / @import url("x")
  const IMPORT_RE = /@import\s+(?:url\(\s*)?(['"]?)([^'")]+)\1\s*\)?\s*([^;]*);/gi;
  s = s.replace(IMPORT_RE, (m, q, u, media) => {
    const rel = resolveLocal({ rawUrl: u, baseUrl, ...maps });
    if (!rel) return m;
    return `@import url("${adapt(rel)}")${media ? ' ' + media.trim() : ''};`;
  });
  // url(...) refs
  const URL_RE = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
  s = s.replace(URL_RE, (m, q, u) => {
    if (u.startsWith('data:') || u.startsWith('#') || u.startsWith('blob:')) return m;
    const rel = resolveLocal({ rawUrl: u, baseUrl, ...maps });
    if (!rel) return m;
    return `url("${adapt(rel)}")`;
  });
  return s;
}

/**
 * Rewrite extracted CSS files in place so their url() refs point at
 * sibling files in the source tree.
 */
export async function rewriteCssFiles({ sourceDir, urlMap, pathMap, baseMap, originHost }) {
  const cssDestUrl = (rel) => {
    // Reverse-lookup: find the original absUrl whose target is this rel,
    // so we can use it as the base for resolving CSS-relative url() refs.
    for (const [u, r] of urlMap.entries()) if (r === rel) return u;
    return null;
  };

  for (const rel of new Set(urlMap.values())) {
    if (!rel.endsWith('.css')) continue;
    const filePath = path.join(sourceDir, rel);
    let css;
    try { css = await fs.readFile(filePath, 'utf8'); }
    catch { continue; }
    const baseUrl = cssDestUrl(rel) || `https://${originHost}/`;
    const out = rewriteCssUrls(css, baseUrl, { urlMap, pathMap, baseMap, originHost }, rel);
    if (out !== css) await fs.writeFile(filePath, out, 'utf8');
  }
}

/**
 * Build the index.html for the source tree.
 *
 * Takes the captured DOM, rewrites every URL-bearing attribute to point
 * at the local source tree, injects the file:// runtime shim with a
 * URL-to-relative-path map, and writes to {sourceDir}/index.html.
 */
export async function writeIndexHtml({
  capturedHtml,
  sourceDir,
  docUrl,
  shimSource,
  urlMap,
  pathMap,
  baseMap,
  originHost,
}) {
  const $ = cheerio.load(capturedHtml, { decodeEntities: false });
  const maps = { urlMap, pathMap, baseMap, originHost };

  const rewriteAttr = (el, attr) => {
    const v = $(el).attr(attr);
    if (!v) return;
    const rel = resolveLocal({ rawUrl: v, baseUrl: docUrl, ...maps });
    if (rel) $(el).attr(attr, rel);
  };

  // For same-origin URLs we can't resolve in the manifest (un-captured assets),
  // we still want to keep them as relative paths so they don't escape to the
  // filesystem root via `file:///F:/foo`. Returns either the local rel path
  // or, for missing same-origin URLs, a best-effort relative form.
  const rewriteOrCageUrl = (el, attr) => {
    const v = $(el).attr(attr);
    if (!v) return;
    const rel = resolveLocal({ rawUrl: v, baseUrl: docUrl, ...maps });
    if (rel) { $(el).attr(attr, rel); return; }
    // Absolute origin path (`/foo`) → strip leading slash, keep relative form.
    if (v.startsWith('/') && !v.startsWith('//')) {
      $(el).attr(attr, v.replace(/^\/+/, '').replace(/\?.*$/, ''));
      return;
    }
    // Absolute URL on the cloned origin → also relativize.
    try {
      const u = new NodeURL(v, docUrl);
      if (u.host === originHost) {
        const rel2 = u.pathname.replace(/^\/+/, '');
        if (rel2) $(el).attr(attr, rel2);
      }
    } catch {}
  };

  $('link[href]').each((_, el) => rewriteOrCageUrl(el, 'href'));
  $('script[src]').each((_, el) => rewriteOrCageUrl(el, 'src'));
  $('img[src], source[src], video[src], audio[src], embed[src]').each((_, el) => {
    rewriteAttr(el, 'src');
    const poster = $(el).attr('poster');
    if (poster) {
      const rel = resolveLocal({ rawUrl: poster, baseUrl: docUrl, ...maps });
      if (rel) $(el).attr('poster', rel);
    }
  });

  // srcset
  $('[srcset], [data-srcset]').each((_, el) => {
    for (const a of ['srcset', 'data-srcset']) {
      const v = $(el).attr(a);
      if (!v) continue;
      const parts = v.split(',').map((p) => p.trim()).filter(Boolean);
      const out = parts.map((p) => {
        const sp = p.search(/\s/);
        const u = sp === -1 ? p : p.slice(0, sp);
        const desc = sp === -1 ? '' : p.slice(sp);
        if (u.startsWith('data:')) return p;
        const rel = resolveLocal({ rawUrl: u, baseUrl: docUrl, ...maps });
        return (rel || u) + desc;
      });
      $(el).attr(a, out.join(', '));
    }
  });

  // <style> blocks: rewrite url() refs.
  $('style').each((_, el) => {
    const txt = $(el).html() || '';
    if (!txt.includes('url(') && !txt.includes('@import')) return;
    const rew = rewriteCssUrls(txt, docUrl, maps);
    if (rew !== txt) $(el).text(rew);
  });

  // inline style="" url() refs.
  $('[style]').each((_, el) => {
    const v = $(el).attr('style') || '';
    if (!v.includes('url(')) return;
    const rew = rewriteCssUrls(v, docUrl, maps);
    if (rew !== v) $(el).attr('style', rew);
  });

  // Strip preload/prefetch — they reference absolute paths and add no value.
  $('link[rel="preload"], link[rel="prefetch"], link[rel="modulepreload"], link[rel="dns-prefetch"], link[rel="preconnect"]').remove();

  // Strip CSP meta tags (they break dynamic chunks on file://).
  $('meta[http-equiv="Content-Security-Policy" i], meta[http-equiv="X-Content-Security-Policy" i]').remove();

  // Build the URL map for the runtime shim. Include path-based + full-URL keys.
  const shimMap = {};
  for (const [absUrl, rel] of urlMap.entries()) shimMap[absUrl] = rel;
  for (const [pn, rel] of pathMap.entries()) shimMap[pn] = rel;
  for (const [base, rel] of baseMap.entries()) shimMap['__base__:' + base] = rel;

  const shimTag =
    `<script data-clone-saas-file-shim>` +
    `window.__CLONE_MAP__=${JSON.stringify(shimMap)};` +
    shimSource +
    `</script>`;

  // Inject the shim as the first thing in <head>.
  if ($('head').length) {
    $('head').prepend(shimTag);
  } else {
    $.root().prepend(`<head>${shimTag}</head>`);
  }

  await fs.mkdir(sourceDir, { recursive: true });
  await fs.writeFile(path.join(sourceDir, 'index.html'), $.html(), 'utf8');
}
