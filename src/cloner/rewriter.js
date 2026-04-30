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
 * Rewrite asset URLs that appear as string literals inside JS bundles.
 *
 * Bundlers (Vite, webpack, esbuild) emit dynamic-import target paths and
 * worker URLs as plain string literals — `"_astro/Foo.HASH.js"`,
 * `"/assets/anim.HASH.riv"`, etc. The browser resolves these at runtime,
 * which fails offline because we saved the file under a hash-prefixed
 * name in `assets/`. We can't safely rewrite arbitrary JS, but a literal
 * with a content-hash segment is essentially unique — replacing it is
 * collision-free in practice.
 *
 * Strategy: for each asset, register its URL pathname and (when the
 * basename has a hash-like segment) its basename. Walk every string
 * literal in the JS, normalize, and if the literal matches a registered
 * pathname or hashed basename, swap in the local path relative to the
 * consuming JS file.
 */
export function rewriteJS(js, baseUrl, assetMap, consumerRelPath = 'index.html') {
  const byPath = new Map();      // '/_astro/foo.HASH.js' -> entry
  const byBasename = new Map();  // 'foo.HASH.js' -> entry (or null when ambiguous)

  // Hash-like basename: 6+ alnum chars adjacent to extension. Matches Vite's
  // `name.aBcDeF12.js`, webpack's `123.HASH.css`, dato CDN UUIDs, etc.
  const HASHED_BASENAME = /(^|[._-])[A-Za-z0-9_-]{6,}\.[a-z0-9]+$/i;

  for (const [url, entry] of assetMap.entries()) {
    let u;
    try { u = new URL(url); } catch { continue; }
    const p = u.pathname;
    if (p && p !== '/') byPath.set(p, entry);
    const base = p.split('/').pop();
    if (base && HASHED_BASENAME.test(base)) {
      if (byBasename.has(base)) byBasename.set(base, null);
      else byBasename.set(base, entry);
    }
  }

  if (byPath.size === 0 && byBasename.size === 0) return js;

  const fromDir = path.posix.dirname(consumerRelPath);
  const toLocal = (entry) => {
    if (!entry) return null;
    if (fromDir === '.' || fromDir === '') return entry.relPath;
    return path.posix.relative(fromDir, entry.relPath);
  };

  // Walk string literals: "...", '...', `...`. Inside template literals we
  // only handle the case with no ${} interpolation (single chunk).
  return js.replace(
    /(["'`])((?:\\.|(?!\1)[^\\\n\r])+)\1/g,
    (match, quote, raw) => {
      // Strip query/fragment for lookup; re-attach to result.
      const qIdx = raw.search(/[?#]/);
      const tail = qIdx >= 0 ? raw.slice(qIdx) : '';
      const body = qIdx >= 0 ? raw.slice(0, qIdx) : raw;
      if (!body || body.length > 512) return match;
      // Skip if it looks like data:/blob:/full URL we don't host, but allow
      // absolute URLs against the same origin (covered by pathname lookup).
      if (/^(data:|blob:|javascript:|mailto:|tel:|#)/i.test(body)) return match;

      // Try pathname lookup. Accept '/x', 'x', './x', '../x' forms.
      const pathCandidates = [];
      const stripped = body.replace(/^\.{1,2}\//, '');
      pathCandidates.push(stripped.startsWith('/') ? stripped : '/' + stripped);
      // Also try original with leading slash if it doesn't have one.
      if (!body.startsWith('/')) pathCandidates.push('/' + body.replace(/^\.{1,2}\//, ''));

      let entry = null;
      for (const c of pathCandidates) {
        if (byPath.has(c)) { entry = byPath.get(c); break; }
      }
      if (!entry) {
        const base = body.split('/').pop();
        if (base && byBasename.has(base)) entry = byBasename.get(base);
      }
      if (!entry) return match;

      const local = toLocal(entry);
      if (!local) return match;
      return `${quote}${local}${tail}${quote}`;
    }
  );
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
