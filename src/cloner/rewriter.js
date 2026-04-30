/**
 * URL rewriting for HTML and CSS.
 *
 * - HTML: rewrite href/src/srcset/style attributes that point at captured assets.
 *   Unknown URLs are left intact (better online than broken offline).
 * - CSS:  rewrite url(...) and @import using a tolerant regex pass.
 * - JS:   intentionally NOT rewritten — see RESEARCH.md §3.
 *
 * Paths are written relative to the consuming file (`consumerRelPath`):
 *   - HTML lives at root        → `assets/foo.webp`
 *   - CSS lives at `assets/x.css` → `foo.webp`  (same directory, no `assets/` prefix)
 */
import path from 'node:path';

const HTML_URL_ATTRS = [
  'href', 'src', 'data', 'poster', 'action', 'formaction',
  // common lazy-load attrs from WordPress, jQuery plugins, lozad, lazysizes etc.
  'data-src', 'data-bg', 'data-background', 'data-background-image',
  'data-poster', 'data-lazy', 'data-original', 'data-image', 'data-href',
];
const HTML_SRCSET_ATTRS = ['srcset', 'data-srcset', 'data-lazy-srcset'];
const CSP_META_RE = /<meta[^>]+http-equiv=["']?content-security-policy["']?[^>]*>/gi;
const STYLE_BLOCK_RE = /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi;

function decodeEntities(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&#x26;/gi, '&')
    .replace(/&#38;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x2F;/gi, '/')
    .replace(/&#47;/g, '/');
}

export function rewriteHTML(html, baseUrl, assetMap, opts = {}) {
  const consumerRelPath = opts.consumerRelPath || 'index.html';
  let out = html;

  // Strip CSP meta tags so the offline clone can run inline scripts
  out = out.replace(CSP_META_RE, '');

  // Strip <base> — it changes how relative URLs resolve and would break
  // both file:// opens and our /preview static-mount serving.
  out = out.replace(/<base\b[^>]*>/gi, '');

  // Once we rewrite asset URLs, SRI integrity hashes no longer match the
  // file bytes the browser fetches, so the resource is blocked entirely.
  // crossorigin triggers CORS preflight on local-served files for no
  // benefit, and nonce attributes are invalid after we stripped CSP.
  // Removing all three is the standard fix for "offline clone renders
  // as a blank page" — without this, one blocked stylesheet kills layout.
  out = out.replace(/\s+(integrity|crossorigin|nonce)=("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // Rewrite HTML attributes: src=, href=, etc.
  for (const attr of HTML_URL_ATTRS) {
    const re = new RegExp(`(\\s${attr}=["'])([^"']+)(["'])`, 'gi');
    out = out.replace(re, (m, p1, url, p3) => {
      const decoded = decodeEntities(url);
      const local = resolveLocal(decoded, baseUrl, assetMap, consumerRelPath);
      return local ? `${p1}${local}${p3}` : m;
    });
  }

  // Rewrite srcset and its lazy-load variants
  for (const attr of HTML_SRCSET_ATTRS) {
    const re = new RegExp(`(\\s${attr}=["'])([^"']+)(["'])`, 'gi');
    out = out.replace(re, (m, p1, srcset, p3) => {
      const rewritten = srcset
        .split(',')
        .map((part) => {
          const trimmed = part.trim();
          if (!trimmed) return '';
          const space = trimmed.search(/\s/);
          const url = space === -1 ? trimmed : trimmed.slice(0, space);
          const desc = space === -1 ? '' : trimmed.slice(space);
          const local = resolveLocal(decodeEntities(url), baseUrl, assetMap, consumerRelPath);
          return `${local || url}${desc}`;
        })
        .filter(Boolean)
        .join(', ');
      return `${p1}${rewritten}${p3}`;
    });
  }

  // Inline style="background-image: url(...)" rewriting
  out = out.replace(/(style=["'])([^"']+)(["'])/gi, (m, p1, css, p3) => {
    return `${p1}${rewriteCSSUrls(css, baseUrl, assetMap, consumerRelPath)}${p3}`;
  });

  // Rewrite CSS inside <style>...</style> blocks
  out = out.replace(STYLE_BLOCK_RE, (m, open, css, close) => {
    return `${open}${rewriteCSSUrls(css, baseUrl, assetMap, consumerRelPath)}${close}`;
  });

  // Strip analytics script tags entirely if requested
  if (opts.stripAnalytics && opts.analyticsHosts) {
    const stripped = opts.strippedScriptUrls instanceof Set ? opts.strippedScriptUrls : null;
    // External: <script src="https://www.googletagmanager.com/..."> or first-
    // party-proxied analytics (caught upstream and listed in strippedScriptUrls).
    out = out.replace(
      /<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/gi,
      (m, url) => {
        try {
          const u = new URL(decodeEntities(url), baseUrl).toString();
          if (stripped && stripped.has(u)) return '';
          const parsed = new URL(u);
          if (opts.analyticsHosts.has(parsed.hostname)) return '';
        } catch {}
        return m;
      }
    );
    // Inline: <script>...gtag(...)...</script>, dataLayer init, FB pixel, etc.
    const inlineAnalyticsPattern = /googletagmanager|google-analytics|google_tag_manager|google_tags_first_party|doubleclick\.net|gtm\.start|gtm\.js|GTM-[A-Z0-9]{4,}|AW-[0-9]{6,}|gtag\s*\(|_gaq|fbq\s*\(|connect\.facebook\.net|_satellite|mixpanel\.|amplitude\.|segment\.io|hotjar|clarity\.ms|['"]dataLayer['"]/i;
    out = out.replace(
      /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi,
      (m, body) => inlineAnalyticsPattern.test(body) ? '' : m
    );
  }

  // Append adopted stylesheets as a final <style> in <head>
  if (opts.adoptedStylesheets && opts.adoptedStylesheets.length) {
    const block = `<style data-clone-adopted>${opts.adoptedStylesheets.join(
      '\n'
    )}</style>`;
    if (/<\/head>/i.test(out)) {
      out = out.replace(/<\/head>/i, `${block}</head>`);
    } else {
      out = block + out;
    }
  }

  return out;
}

export function rewriteCSS(css, baseUrl, assetMap, consumerRelPath) {
  return rewriteCSSUrls(css, baseUrl, assetMap, consumerRelPath);
}

/**
 * Rewrite ES module import/export specifiers in JS so relative imports point
 * at the cloner's hash-prefixed filenames. Modern bundlers (Vite, Astro,
 * Rollup, esbuild) emit minified modules whose imports look like:
 *
 *   import{x}from"./preload-helper.BlTxHScW.js"
 *   import"./styles.css"
 *   export*from"./util.js"
 *   import("./chunk.js")
 *
 * The cloner saves the imported file as `assets/<hash>-preload-helper...js`,
 * so the original `./preload-helper.BlTxHScW.js` no longer resolves.
 *
 * Browsers also reject bare specifiers in modules — `import"foo.js"` errors
 * with "Failed to resolve module specifier" — so when the resolved relative
 * path collapses to a bare basename (same directory), prepend `./`.
 */
export function rewriteJS(js, baseUrl, assetMap, consumerRelPath, docUrl) {
  const fix = (rel) => {
    if (!rel) return null;
    return /^(\.\.?\/|\/)/.test(rel) ? rel : `./${rel}`;
  };

  // Try both the script's own URL (for normal `./foo.js` imports) and the
  // document URL (for Vite `__vite__mapDeps` strings, which the preload helper
  // resolves relative to `assetsURL`/document origin, not the script).
  const resolve = (raw) => {
    let local = resolveLocal(raw, baseUrl, assetMap, consumerRelPath);
    if (!local && docUrl && docUrl !== baseUrl) {
      local = resolveLocal(raw, docUrl, assetMap, consumerRelPath);
    }
    return fix(local);
  };

  // import/export ... from "..."
  js = js.replace(/\bfrom\s*(['"])([^'"\n]+)\1/g, (m, q, raw) => {
    const local = resolve(raw);
    return local ? `from${q}${local}${q}` : m;
  });

  // dynamic import("..." [, ...])
  js = js.replace(/\bimport\s*\(\s*(['"])([^'"\n]+)\1/g, (m, q, raw) => {
    const local = resolve(raw);
    return local ? `import(${q}${local}${q}` : m;
  });

  // side-effect import "..." — must be at start-of-line or after a separator
  // so we don't mangle the keyword `import` that appears as a method name.
  js = js.replace(/(^|[\s;{}(),=>?:])import\s*(['"])([^'"\n]+)\2/g, (m, prefix, q, raw) => {
    const local = resolve(raw);
    return local ? `${prefix}import${q}${local}${q}` : m;
  });

  // String literals that look like asset paths — Vite emits a `__vite__mapDeps`
  // array of bare strings ("_astro/Foo.HASH.js") that the preload helper feeds
  // into `import()`. They aren't import statements, so the rules above miss
  // them, but they still need to point at our hashed filenames. Match strings
  // with at least one `/` ending in a recognizable extension; resolve returns
  // null for anything not in assetMap, so non-asset strings pass through.
  const ASSET_STRING_RE = /(['"])((?:[\w\-]+\/)+[\w\-.]+\.(?:js|mjs|css|json|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|eot|mp4|webm|ogg|mp3|wav))\1/g;
  js = js.replace(ASSET_STRING_RE, (m, q, raw) => {
    const local = resolve(raw);
    return local ? `${q}${local}${q}` : m;
  });

  // Vite's __vitePreload helper hard-codes the asset URL prefix at build
  // time, e.g. `const v=function(l){return"/"+l}` for sites served from `/`.
  // Once we rewrite mapDeps to point at hashed neighbors of the helper, that
  // hard-coded `/` prefix turns `./hashed-foo.js` into `/hashed-foo.js` and
  // breaks the lookup. Detect by the helper's signature event name and swap
  // the prefix function for one that resolves against `import.meta.url`.
  if (/vite:preloadError/.test(js)) {
    js = js.replace(
      /return\s*(['"])\/\1\s*\+\s*([A-Za-z_$][\w$]*)/g,
      'return new URL($2,import.meta.url).href'
    );
  }

  return js;
}

function rewriteCSSUrls(css, baseUrl, assetMap, consumerRelPath = 'index.html') {
  // url("..."), url('...'), url(...)
  let out = css.replace(
    /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi,
    (m, q, url) => {
      const trimmed = url.trim();
      if (trimmed.startsWith('data:')) return m;
      const local = resolveLocal(decodeEntities(trimmed), baseUrl, assetMap, consumerRelPath);
      return local ? `url(${q}${local}${q})` : m;
    }
  );

  // @import "..." and @import url(...)
  out = out.replace(
    /@import\s+(?:url\(\s*)?(['"])([^'"]+)\1(?:\s*\))?\s*;/gi,
    (m, q, url) => {
      const local = resolveLocal(decodeEntities(url), baseUrl, assetMap, consumerRelPath);
      return local ? `@import ${q}${local}${q};` : m;
    }
  );

  return out;
}

function resolveLocal(url, baseUrl, assetMap, consumerRelPath = 'index.html') {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('javascript:') || url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:')) {
    return null;
  }
  let abs;
  try {
    abs = new URL(url, baseUrl).toString();
  } catch {
    return null;
  }
  // Strip fragment for lookup but reattach if matched
  const hashIdx = abs.indexOf('#');
  const hash = hashIdx >= 0 ? abs.slice(hashIdx) : '';
  const lookup = hashIdx >= 0 ? abs.slice(0, hashIdx) : abs;

  const entry = assetMap.get(lookup) || assetMap.get(abs);
  if (!entry) return null;

  // path of the consumer's directory, e.g.
  //   consumerRelPath='index.html'   → from=''
  //   consumerRelPath='assets/x.css' → from='assets'
  const from = path.posix.dirname(consumerRelPath);
  const rel = from === '.' || from === ''
    ? entry.relPath
    : path.posix.relative(from, entry.relPath);
  return rel + hash;
}
