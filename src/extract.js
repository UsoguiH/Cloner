import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Open a cloned preview, find an element by selector, and return:
 *   - its outerHTML (with open shadow DOM serialized as <template shadowrootmode>)
 *   - every CSS rule that applies to it or any descendant, including @layer,
 *     @container, @scope, @media, @supports wrappers
 *   - referenced @font-face, @keyframes, and :root variable rules
 *   - ancestor CSS custom properties referenced by matching rules
 *   - the original page's <head>, <html>/<body> attrs, and body-level scripts
 *   - the SPA mount-root ancestor (id=__next, root, app, ___gatsby) if any
 *
 * This is a best-effort extractor — covers ~80–90% of components but may miss:
 *   - rules that only match via combinators with elements outside the subtree
 *   - JS-injected styles applied after the element matches
 *   - closed shadow DOM (no programmatic access)
 */
export async function extractComponent({ previewUrl, selector }) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await openPreview(browser, previewUrl);
    return await page.evaluate(extractInPage, selector);
  } finally {
    await browser.close();
  }
}

/**
 * Multi-selector variant. Shares one browser/page across all selectors so the
 * cost of launching Playwright + loading the preview is paid once.
 */
export async function extractMany({ previewUrl, selectors }) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await openPreview(browser, previewUrl);
    const results = [];
    for (const sel of selectors) {
      try {
        results.push(await page.evaluate(extractInPage, sel));
      } catch (err) {
        results.push({ error: `extract failed: ${err.message}` });
      }
    }
    return results;
  } finally {
    await browser.close();
  }
}

async function openPreview(browser, previewUrl) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  // Don't let leftover analytics/CDN noise from the cloned page block us
  page.on('pageerror', () => {});
  await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  try { await page.waitForLoadState('load', { timeout: 8000 }); } catch {}
  try { await page.waitForLoadState('networkidle', { timeout: 5000 }); } catch {}
  await page.waitForTimeout(500);
  return page;
}

// Runs inside the page context. Defined as a top-level function so both
// extractComponent and extractMany can pass it to page.evaluate.
function extractInPage(sel) {
  const root = document.querySelector(sel);
  if (!root) return { error: `selector "${sel}" matched no elements` };

  const allEls = [root, ...root.querySelectorAll('*')];
  const matchingRules = []; // CSSStyleRule cssText (no wrapper)
  const wrappedRules = []; // pre-wrapped rules (e.g. @media/@layer/@container/@supports/@scope)
  const fontFaces = [];
  const keyframesAll = new Map();
  const referencedKeyframes = new Set();
  const rootVars = [];
  const referencedUrls = new Set();

  const collectUrlRefs = (cssText) => {
    for (const m of cssText.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
      const u = (m[1] || '').trim();
      if (u && !u.startsWith('data:')) referencedUrls.add(u);
    }
  };

  // Subtree HTML attribute asset URLs — the CSS-only collection above misses
  // <img src>, <video poster>, <source srcset>, <link href>, lazy data-* attrs,
  // and inline style="background-image: url(...)".
  const URL_ATTRS = ['src', 'href', 'data', 'poster', 'data-src', 'data-bg',
    'data-background', 'data-background-image', 'data-poster', 'data-lazy',
    'data-original', 'data-image', 'data-href'];
  const SRCSET_ATTRS = ['srcset', 'data-srcset', 'data-lazy-srcset'];
  const addUrl = (raw) => {
    if (!raw) return;
    const u = String(raw).trim();
    if (!u || u.startsWith('data:') || u.startsWith('blob:')
        || u.startsWith('#') || u.startsWith('javascript:')
        || u.startsWith('mailto:') || u.startsWith('tel:')) return;
    referencedUrls.add(u);
  };
  for (const el of allEls) {
    if (!el.getAttribute) continue;
    for (const a of URL_ATTRS) {
      const v = el.getAttribute(a);
      if (v) addUrl(v);
    }
    for (const a of SRCSET_ATTRS) {
      const v = el.getAttribute(a);
      if (!v) continue;
      for (const part of v.split(',')) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const space = trimmed.search(/\s/);
        addUrl(space === -1 ? trimmed : trimmed.slice(0, space));
      }
    }
    const inline = el.getAttribute('style');
    if (inline) collectUrlRefs(inline);
  }

  const collectKeyframeRefs = (style) => {
    const anim =
      (style && (style.animationName || style.getPropertyValue('animation-name'))) || '';
    if (!anim || anim === 'none') return;
    for (const a of anim.split(',').map((s) => s.trim().split(/\s+/)[0])) {
      if (a && a !== 'none') referencedKeyframes.add(a);
    }
  };

  // Strip pseudo-elements and stateful pseudo-classes so el.matches() doesn't reject them
  const stripPseudo = (s) =>
    s
      .replace(/::[a-zA-Z-]+(\([^)]*\))?/g, '')
      .replace(/:(hover|focus|focus-within|focus-visible|active|visited|target|checked|disabled|enabled|placeholder-shown|autofill)\b/gi, '');

  const ruleMatches = (rule) => {
    const ruleSel = rule.selectorText;
    if (!ruleSel) return false;
    for (const part of ruleSel.split(',')) {
      let candidate = stripPseudo(part).trim();
      if (!candidate || candidate.startsWith('@')) continue;
      for (const el of allEls) {
        try {
          if (el.matches && el.matches(candidate)) return true;
        } catch {}
      }
    }
    return false;
  };

  // Recursive rule walker. wrapStack holds at-rule preludes (outermost first).
  // When a leaf style rule matches, its cssText is wrapped with each prelude.
  const handleRule = (rule, wrapStack) => {
    const t = rule.constructor.name;
    if (t === 'CSSStyleRule' || rule.type === 1) {
      if (rule.selectorText === ':root' || rule.selectorText === 'html') {
        rootVars.push(rule.cssText);
        return;
      }
      if (ruleMatches(rule)) {
        collectKeyframeRefs(rule.style);
        collectUrlRefs(rule.cssText);
        if (wrapStack.length === 0) {
          matchingRules.push(rule.cssText);
        } else {
          let wrapped = rule.cssText;
          for (let i = wrapStack.length - 1; i >= 0; i--) {
            wrapped = `${wrapStack[i]} {\n  ${wrapped}\n}`;
          }
          wrappedRules.push(wrapped);
        }
      }
    } else if (t === 'CSSFontFaceRule' || rule.type === 5) {
      fontFaces.push(rule.cssText);
      collectUrlRefs(rule.cssText);
    } else if (t === 'CSSKeyframesRule' || rule.type === 7) {
      keyframesAll.set(rule.name, rule.cssText);
    } else if (t === 'CSSMediaRule' || rule.type === 4) {
      const prelude = `@media ${rule.media.mediaText}`;
      for (const sub of rule.cssRules || []) handleRule(sub, [...wrapStack, prelude]);
    } else if (t === 'CSSSupportsRule' || rule.type === 12) {
      const prelude = `@supports ${rule.conditionText}`;
      for (const sub of rule.cssRules || []) handleRule(sub, [...wrapStack, prelude]);
    } else if (t === 'CSSLayerBlockRule') {
      const prelude = rule.name ? `@layer ${rule.name}` : '@layer';
      for (const sub of rule.cssRules || []) handleRule(sub, [...wrapStack, prelude]);
    } else if (t === 'CSSContainerRule') {
      let prelude = '@container';
      if (rule.containerName) prelude += ` ${rule.containerName}`;
      if (rule.conditionText) prelude += ` ${rule.conditionText}`;
      for (const sub of rule.cssRules || []) handleRule(sub, [...wrapStack, prelude]);
    } else if (t === 'CSSScopeRule') {
      let prelude = '@scope';
      try {
        if (rule.start) prelude += ` (${rule.start})`;
        if (rule.end) prelude += ` to (${rule.end})`;
      } catch {}
      for (const sub of rule.cssRules || []) handleRule(sub, [...wrapStack, prelude]);
    }
    // CSSImportRule, CSSPageRule, etc. — skipped
  };

  const handleSheet = (sheet) => {
    let rules;
    try { rules = sheet.cssRules; } catch { return; }
    if (!rules) return;
    for (const rule of rules) handleRule(rule, []);
  };

  for (const sheet of document.styleSheets) handleSheet(sheet);

  // Walk computed styles to surface inline element keyframe refs
  for (const el of allEls) {
    const cs = getComputedStyle(el);
    collectKeyframeRefs(cs);
  }

  // Open shadow DOM — capture adoptedStyleSheets and any inline <style> rules
  // from each shadow root encountered in the subtree. Wrap them as ordinary
  // rules so the self-contained doc still styles them when reattached via
  // <template shadowrootmode>.
  const collectShadowSheets = (shadowRoot) => {
    if (!shadowRoot) return;
    try {
      for (const s of shadowRoot.adoptedStyleSheets || []) {
        try {
          for (const r of s.cssRules) {
            collectUrlRefs(r.cssText);
            matchingRules.push(r.cssText);
          }
        } catch {}
      }
    } catch {}
    try {
      for (const styleEl of shadowRoot.querySelectorAll('style')) {
        if (styleEl.sheet && styleEl.sheet.cssRules) {
          for (const r of styleEl.sheet.cssRules) {
            collectUrlRefs(r.cssText);
            matchingRules.push(r.cssText);
          }
        }
      }
    } catch {}
  };

  // Custom serializer: clones the subtree and re-emits open shadow trees as
  // <template shadowrootmode="open"> children. Modern browsers parse those
  // declarations back into real shadow roots automatically.
  const serialize = (el) => {
    const clone = el.cloneNode(false);
    if (el.shadowRoot) {
      collectShadowSheets(el.shadowRoot);
      try {
        const tpl = document.createElement('template');
        tpl.setAttribute('shadowrootmode', 'open');
        for (const c of el.shadowRoot.childNodes) {
          if (c.nodeType === 1) tpl.content.appendChild(serialize(c));
          else tpl.content.appendChild(c.cloneNode(true));
        }
        clone.appendChild(tpl);
      } catch {}
    }
    for (const c of el.childNodes) {
      if (c.nodeType === 1) clone.appendChild(serialize(c));
      else clone.appendChild(c.cloneNode(true));
    }
    return clone;
  };
  const serializedHtml = serialize(root).outerHTML;

  // Ancestor CSS custom property capture — without this, themed components
  // (declared with --x on <body class="theme-dark">) lose their tokens when
  // picked alone. Walk up and resolve every var name referenced in matched
  // rules to its computed value, then synthesize a :root rule.
  const referencedVars = new Set();
  const allCssText = matchingRules.join('\n') + '\n' + wrappedRules.join('\n');
  for (const m of allCssText.matchAll(/var\(\s*--([\w-]+)/g)) {
    referencedVars.add(m[1]);
  }
  if (referencedVars.size > 0) {
    const resolved = {};
    let cur = root.parentElement;
    while (cur && cur !== document.documentElement.parentElement) {
      const cs = getComputedStyle(cur);
      for (const v of referencedVars) {
        if (resolved[v] !== undefined) continue;
        const val = cs.getPropertyValue('--' + v);
        if (val && val.trim() !== '') resolved[v] = val.trim();
      }
      cur = cur.parentElement;
    }
    const decls = Object.entries(resolved).map(([k, v]) => `  --${k}: ${v};`).join('\n');
    if (decls) rootVars.push(`:root {\n${decls}\n}`);
  }

  // Mount-root detection — if the picked element lives inside a known SPA
  // mount root, capture its tag/attrs so the standalone doc can recreate the
  // hydration target. Without this, Next/React/Vue pages can fail to boot.
  const MOUNT_IDS = new Set(['__next', '__nuxt', 'root', 'app', '___gatsby', 'svelte-app', 'q-app']);
  let mountRoot = null;
  let walk = root.parentElement;
  while (walk && walk !== document.documentElement && walk !== document.body) {
    if (MOUNT_IDS.has(walk.id) || walk.hasAttribute('data-reactroot')) {
      const attrs = {};
      for (const a of walk.attributes) attrs[a.name] = a.value;
      mountRoot = { tag: walk.tagName.toLowerCase(), attrs };
      break;
    }
    walk = walk.parentElement;
  }

  const keyframesOut = [];
  for (const [name, text] of keyframesAll) {
    if (referencedKeyframes.has(name)) keyframesOut.push(text);
  }

  // Capture original page's head + html/body attributes so the self-contained
  // doc can boot with the same CSS, scripts, fonts, theme classes, and meta.
  const headClone = document.head ? document.head.cloneNode(true) : null;
  if (headClone) {
    for (const s of headClone.querySelectorAll('script[data-clone-saas-picker]')) {
      s.remove();
    }
    for (const s of headClone.querySelectorAll('script[data-clone-saas-isolate]')) {
      s.remove();
    }
  }
  const headHtml = headClone ? headClone.innerHTML : '';

  const collectAttrs = (el) => {
    const out = {};
    if (!el || !el.attributes) return out;
    for (const a of el.attributes) out[a.name] = a.value;
    return out;
  };
  const htmlAttrs = collectAttrs(document.documentElement);
  const bodyAttrs = collectAttrs(document.body);

  // Body-level <script> tags that ran on the page but live outside the picked
  // subtree. Preserves init scripts and motion library bootstraps.
  const bodyScripts = document.body
    ? [...document.body.querySelectorAll('script')]
        .filter((s) => !root.contains(s) && !s.hasAttribute('data-clone-saas-isolate'))
        .map((s) => s.outerHTML)
        .join('\n')
    : '';

  return {
    html: serializedHtml,
    css: {
      rootVars,
      fontFaces,
      keyframes: keyframesOut,
      rules: matchingRules,
      media: wrappedRules,
    },
    referencedUrls: [...referencedUrls],
    headHtml,
    htmlAttrs,
    bodyAttrs,
    bodyScripts,
    mountRoot,
    elementCount: allEls.length,
  };
}

// Inlined CSS rules carry url() paths as written in the original CSS file.
// When inlined into a root-level index.html, those break — this helper rewrites
// them to resolve against a sibling assets/ directory.
function prefixCssUrls(css, prefix) {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, q, url) => {
    const u = url.trim();
    if (!u) return m;
    if (u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('#')
        || /^[a-z]+:\/\//i.test(u) || u.startsWith('/')) return m;
    return `url(${q}${prefix}${u}${q})`;
  });
}

// Some frameworks (Webflow IX2, Framer Motion, GSAP, theme libraries) hide
// elements with inline opacity:0 / visibility:hidden / transform offsets and
// rely on JS to animate them in. With scripts stripped for offline
// reliability, those hide-states would freeze the page invisible. Force it
// visible via both CSS (broad strokes) and a small reveal script (specific:
// undoes inline-style opacity/visibility and Webflow's html-class flags).
const VISIBILITY_RESET = `
/* clone-saas: ensure offline visibility */
html, body { visibility: visible !important; opacity: 1 !important; display: block !important; }
[data-clone-saas-composed] body { display: block !important; }
`.trim();

const REVEAL_SCRIPT = `<script data-clone-saas-reveal>
(function(){
  function reveal(){
    var de = document.documentElement;
    // Webflow gates many CSS hide rules behind these classes — strip them so
    // the rules don't apply.
    if (de) de.className = (de.className || '').replace(/\\bw-mod-(js|ix)\\b/g, '').trim();
    // Inline pre-hide states set by IX2 / Framer / GSAP / Astro stagger
    // initializers. Clearing the inline value lets the cascade decide.
    var nodes = document.querySelectorAll('[style*="opacity"], [style*="visibility"], [data-w-id], [data-framer-name], [data-aos]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var s = el.style;
      if (s.opacity === '0' || s.opacity === '0.0') s.opacity = '';
      if (s.visibility === 'hidden') s.visibility = '';
      // IX2 commonly preloads with translate3d(0, 100%, 0) etc. Strip the
      // offset so the element renders in place.
      if ((el.hasAttribute && el.hasAttribute('data-w-id')) && /translate|scale|rotate/i.test(s.transform || '')) {
        s.transform = '';
      }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', reveal);
  else reveal();
})();
</script>`;

// Webflow tags <html> with these classes from a tiny inline bootstrap. With
// no JS, any CSS rule scoped to them (e.g. .w-mod-js [data-w-id] { hidden })
// won't fire if we drop the classes. The reveal script also strips them at
// runtime, but pre-stripping in the static markup means the page already
// renders correctly on the first paint.
const JS_GATE_CLASSES = ['w-mod-js', 'w-mod-ix', 'w-mod-touch', 'js', 'has-js', 'js-enabled'];
function stripJsGateClasses(attrs) {
  if (!attrs || !attrs.class) return attrs;
  const cls = String(attrs.class)
    .split(/\s+/)
    .filter((c) => c && !JS_GATE_CLASSES.includes(c))
    .join(' ');
  const out = { ...attrs };
  if (cls) out.class = cls; else delete out.class;
  return out;
}

// When a doc is opened directly from disk (file://), the original page's
// boot scripts often error-out — module imports fail under CORS, fetch()
// hits unreachable origins, SPA routers fail to find a matching route — and
// many frameworks respond by wiping the body or hiding it behind a "loading"
// overlay. Strip every <script>, <noscript>, and meta-refresh from the head
// so the static markup + styling renders reliably offline. The component's
// declarative shadow DOM, fonts, CSS variables, @keyframes, and @media
// queries all survive — only the runtime JS is removed.
function sanitizeHeadForOffline(headHtml) {
  if (!headHtml) return '';
  return headHtml
    .replace(/<script\b[^>]*\/>/gi, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, '')
    .replace(/<meta[^>]+http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, '');
}

function formatAttrs(attrs) {
  if (!attrs) return '';
  const parts = [];
  for (const [k, v] of Object.entries(attrs)) {
    const val = String(v).replaceAll('"', '&quot;');
    parts.push(val === '' ? ` ${k}` : ` ${k}="${val}"`);
  }
  return parts.join('');
}

/**
 * Build a single doc that IS the full cloned page, with scripts removed and
 * isolation styling/scripting injected so only the picked sections render.
 *
 * This is dramatically more reliable than re-stitching extracted subtrees
 * because the original DOM tree is preserved verbatim — every parent class,
 * grid container, mount-root wrapper, and CSS variable that the section
 * styling depends on is still in place. The only changes are:
 *   1. <script>, <noscript>, <meta http-equiv=refresh> removed from head and
 *      body (so SPA frameworks can't error during boot under file://).
 *   2. JS-gate classes stripped from <html> and <body> (Webflow's w-mod-js
 *      and w-mod-ix gate hide-rules in webflow.shared.css).
 *   3. Optional asset-path rewrite (when the doc lives in a subfolder).
 *   4. One injected <style> that hides anything not marked keep/pick.
 *   5. One injected <script> that, on DOMContentLoaded, marks the picked
 *      elements (data-clone-saas-pick) and their ancestors
 *      (data-clone-saas-keep), then clears Webflow IX2 / Framer / AOS
 *      pre-hide states (inline opacity:0, visibility:hidden, transform).
 *
 * Pass selectors = [single] for a per-component file; pass the full array
 * for the composed page.
 */
export function buildIsolatedFullPage(fullPageHtml, selectors, opts = {}) {
  const assetsPrefix = opts.assetsPrefix || 'assets/';
  let html = fullPageHtml;

  // 1. Strip scripts, noscript, meta-refresh anywhere in the doc.
  html = html
    .replace(/<script\b[^>]*\/>/gi, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, '')
    .replace(/<meta[^>]+http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, '');

  // 2. Strip JS-gate classes from <html> and <body> opening tags.
  html = html.replace(/<(html|body)\b([^>]*)>/i, (m, tag, rest) => {
    const cleaned = rest.replace(/\sclass\s*=\s*"([^"]*)"/i, (_, cls) => {
      const out = cls
        .split(/\s+/)
        .filter((c) => c && !JS_GATE_CLASSES.includes(c))
        .join(' ');
      return out ? ` class="${out}"` : '';
    }).replace(/\sclass\s*=\s*'([^']*)'/i, (_, cls) => {
      const out = cls
        .split(/\s+/)
        .filter((c) => c && !JS_GATE_CLASSES.includes(c))
        .join(' ');
      return out ? ` class="${out}"` : '';
    });
    return `<${tag}${cleaned}>`;
  });
  // The replace above runs once per regex. Run again for <body> if <html>
  // matched first.
  html = html.replace(/<body\b([^>]*)>/i, (m, rest) => {
    const cleaned = rest.replace(/\sclass\s*=\s*"([^"]*)"/i, (_, cls) => {
      const out = cls
        .split(/\s+/)
        .filter((c) => c && !JS_GATE_CLASSES.includes(c))
        .join(' ');
      return out ? ` class="${out}"` : '';
    });
    return `<body${cleaned}>`;
  });

  // 3. Rewrite root-relative-ish asset paths if needed.
  if (assetsPrefix !== 'assets/') {
    html = prefixAssetPaths(html, assetsPrefix);
  }

  // 4 + 5. Inject style + script. The script lives at the end of <body>
  // so the DOM is fully parsed when it executes (no need to wait for
  // DOMContentLoaded in most cases — but we still gate on it as a safety).
  const styleTag = `<style data-clone-saas-isolate>${ISOLATE_CSS}</style>`;
  const initTag = buildIsolateInitScript(selectors);

  if (/<\/head>/i.test(html)) {
    html = html.replace(/<\/head>/i, `${styleTag}\n</head>`);
  } else {
    html = styleTag + html;
  }
  if (/<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, `${initTag}\n</body>`);
  } else {
    html = html + initTag;
  }
  return html;
}

const ISOLATE_CSS = `
html, body { visibility: visible !important; opacity: 1 !important; display: block !important; }
body *:not([data-clone-saas-keep]):not([data-clone-saas-pick]):not([data-clone-saas-pick] *) { display: none !important; }
[data-clone-saas-keep], [data-clone-saas-pick], [data-clone-saas-pick] * {
  opacity: 1 !important;
  visibility: visible !important;
}
[data-clone-saas-pick] { scroll-margin-top: 0; }
`.trim();

function buildIsolateInitScript(selectors) {
  const sels = JSON.stringify(selectors);
  return `<script data-clone-saas-init>
(function(){
  var SELS = ${sels};
  function init(){
    var de = document.documentElement;
    if (de) de.className = (de.className || '').replace(/\\bw-mod-(js|ix|touch)\\b/g, '').trim();
    SELS.forEach(function(sel, i){
      var root;
      try { root = document.querySelector(sel); } catch (_) { return; }
      if (!root) return;
      root.setAttribute('data-clone-saas-pick', String(i + 1));
      var cur = root.parentElement;
      while (cur && cur !== document.documentElement) {
        cur.setAttribute('data-clone-saas-keep', '');
        cur = cur.parentElement;
      }
    });
    // Reveal pass: undo Webflow IX2 / Framer Motion / AOS pre-hide states
    // inside any kept ancestor so animated children render at their final
    // state instead of being stuck invisible.
    var nodes = document.querySelectorAll('[style*="opacity"], [style*="visibility"], [data-w-id], [data-framer-name], [data-aos]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var s = el.style;
      if (s.opacity === '0' || s.opacity === '0.0') s.opacity = '';
      if (s.visibility === 'hidden') s.visibility = '';
      if ((el.hasAttribute && el.hasAttribute('data-w-id')) && /translate|scale|rotate/i.test(s.transform || '')) {
        s.transform = '';
      }
    }
    // Scroll the first pick into view for the per-component case.
    var first = document.querySelector('[data-clone-saas-pick="1"]');
    if (first) { try { first.scrollIntoView({ block: 'start' }); } catch(_) {} }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
</script>`;
}

// Rewrite asset paths in the doc when it lives in a subfolder. The cloner
// emits root-relative-ish paths (href="assets/..." / src="assets/..." /
// url(assets/...) / srcset="assets/...") that resolve next to index.html.
// When per-component files live at components/<NN>/index.html, those need
// "../../assets/" instead.
function prefixAssetPaths(html, prefix) {
  return html
    .replace(/(href|src|data-src|poster)\s*=\s*"assets\//gi, `$1="${prefix}`)
    .replace(/(href|src|data-src|poster)\s*=\s*'assets\//gi, `$1='${prefix}`)
    .replace(/srcset\s*=\s*"([^"]*)"/gi, (m, val) => `srcset="${rewriteSrcset(val, prefix)}"`)
    .replace(/srcset\s*=\s*'([^']*)'/gi, (m, val) => `srcset='${rewriteSrcset(val, prefix)}'`)
    .replace(/url\(\s*(['"]?)assets\//gi, `url($1${prefix}`);
}

function rewriteSrcset(srcset, prefix) {
  return srcset.split(',').map((part) => {
    const trimmed = part.trim();
    if (!trimmed) return trimmed;
    if (trimmed.startsWith('assets/')) return prefix + trimmed.slice('assets/'.length);
    return trimmed;
  }).join(', ');
}

const MIME_BY_EXT = {
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

function mimeForExt(ext) {
  return MIME_BY_EXT[String(ext).toLowerCase()] || 'application/octet-stream';
}

/**
 * Read an asset relative to assetsDir and return a data: URL. Returns null if
 * the file is missing, outside the assets dir, or fails to read. Caches reads
 * via the supplied Map to avoid re-encoding the same asset multiple times in
 * one document.
 */
function readAssetDataUrl(rel, assetsDir, cache) {
  if (cache.has(rel)) return cache.get(rel);
  let result = null;
  try {
    const abs = path.resolve(assetsDir, rel);
    if (abs.startsWith(path.resolve(assetsDir)) && fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      const buf = fs.readFileSync(abs);
      const mime = mimeForExt(path.extname(rel));
      if (mime === 'text/css') {
        // CSS files in assetsDir use bare filename url() refs that resolve
        // relative to the CSS file's own directory (which is assetsDir).
        const css = inlineCssUrls(buf.toString('utf8'), assetsDir, cache, { bareNamesAreAssets: true });
        result = `data:text/css;charset=utf-8;base64,${Buffer.from(css, 'utf8').toString('base64')}`;
      } else {
        result = `data:${mime};base64,${buf.toString('base64')}`;
      }
    }
  } catch {
    result = null;
  }
  cache.set(rel, result);
  return result;
}

function inlineCssUrls(css, assetsDir, cache, opts = {}) {
  const { bareNamesAreAssets = false } = opts;
  return css.replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/g, (m, q, raw) => {
    const url = raw.trim();
    if (/^(data:|https?:|\/\/|#|mailto:|tel:|blob:)/i.test(url)) return m;
    let rel = null;
    if (url.startsWith('assets/')) {
      rel = url.slice('assets/'.length);
    } else if (bareNamesAreAssets && !url.startsWith('/') && !url.startsWith('..')) {
      rel = url;
    }
    if (!rel) return m;
    rel = rel.replace(/[?#].*$/, '');
    const dataUrl = readAssetDataUrl(rel, assetsDir, cache);
    return dataUrl ? `url(${dataUrl})` : m;
  });
}

function inlineSrcset(srcset, assetsDir, cache) {
  return srcset.split(',').map((part) => {
    const trimmed = part.trim();
    if (!trimmed) return trimmed;
    const m = trimmed.match(/^assets\/(\S+?)(\s+\S+)?$/);
    if (!m) return trimmed;
    const rel = m[1].replace(/[?#].*$/, '');
    const desc = m[2] || '';
    const dataUrl = readAssetDataUrl(rel, assetsDir, cache);
    return dataUrl ? `${dataUrl}${desc}` : trimmed;
  }).join(', ');
}

/**
 * Inline every reference to assets/<file> in the document so the resulting
 * HTML is fully self-contained (works under file://, inside Windows Explorer's
 * preview-without-extract, attached to email, etc.).
 *
 * - <link rel="stylesheet" href="assets/foo.css"> → <style>...</style> with
 *   nested url() refs recursively resolved.
 * - href="assets/foo" / src="assets/foo" / data-src= / poster= / srcset=
 *   → data: URL of the asset.
 * - url(assets/foo) inside inline <style> blocks and style="" attrs → data:.
 *
 * `assetsDir` is the absolute path where the cloner wrote shared assets
 * (jobs/<id>/output/assets). Missing/unreadable files leave the original
 * reference untouched (browser shows a broken image, not a corrupted file).
 */
export function inlineHtmlAssets(html, assetsDir) {
  if (!assetsDir || !fs.existsSync(assetsDir)) return html;
  const cache = new Map();

  // 1. Inline <link rel="stylesheet" href="assets/..."> as <style>.
  html = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/rel\s*=\s*["']?stylesheet["']?/i.test(tag)) return tag;
    const hrefMatch = tag.match(/href\s*=\s*(["'])([^"']+)\1/i);
    if (!hrefMatch) return tag;
    const href = hrefMatch[2];
    if (!href.startsWith('assets/')) return tag;
    const rel = href.slice('assets/'.length).replace(/[?#].*$/, '');
    try {
      const abs = path.resolve(assetsDir, rel);
      if (!abs.startsWith(path.resolve(assetsDir)) || !fs.existsSync(abs)) return tag;
      const css = inlineCssUrls(fs.readFileSync(abs, 'utf8'), assetsDir, cache, { bareNamesAreAssets: true });
      const mediaMatch = tag.match(/media\s*=\s*(["'])([^"']+)\1/i);
      const mediaAttr = mediaMatch ? ` media="${mediaMatch[2].replace(/"/g, '&quot;')}"` : '';
      return `<style data-inlined-from="${href.replace(/"/g, '&quot;')}"${mediaAttr}>${css}</style>`;
    } catch {
      return tag;
    }
  });

  // 2. Inline url(assets/...) inside any inline <style> blocks.
  html = html.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (m, attrs, css) => {
    return `<style${attrs}>${inlineCssUrls(css, assetsDir, cache)}</style>`;
  });

  // 3. Inline url(assets/...) inside style="..." attributes.
  html = html.replace(/style\s*=\s*"([^"]*)"/gi, (m, val) => {
    const out = inlineCssUrls(val, assetsDir, cache);
    return out === val ? m : `style="${out}"`;
  });
  html = html.replace(/style\s*=\s*'([^']*)'/gi, (m, val) => {
    const out = inlineCssUrls(val, assetsDir, cache);
    return out === val ? m : `style='${out}'`;
  });

  // 4. Inline href/src/poster/data-src for non-stylesheet refs.
  html = html.replace(/(href|src|data-src|poster)\s*=\s*(["'])assets\/([^"']+)\2/gi, (m, attr, q, rel) => {
    const cleanRel = rel.replace(/[?#].*$/, '');
    const dataUrl = readAssetDataUrl(cleanRel, assetsDir, cache);
    return dataUrl ? `${attr}=${q}${dataUrl}${q}` : m;
  });

  // 5. Inline srcset.
  html = html.replace(/srcset\s*=\s*"([^"]*)"/gi, (m, val) => `srcset="${inlineSrcset(val, assetsDir, cache)}"`);
  html = html.replace(/srcset\s*=\s*'([^']*)'/gi, (m, val) => `srcset='${inlineSrcset(val, assetsDir, cache)}'`);

  return html;
}

export function buildComponentDoc(extraction, { selector, sourceUrl }) {
  if (extraction.error) return null;
  const css = [
    extraction.css.rootVars.length ? `/* :root variables */\n${extraction.css.rootVars.join('\n')}` : '',
    extraction.css.fontFaces.length ? `/* @font-face */\n${extraction.css.fontFaces.join('\n')}` : '',
    extraction.css.keyframes.length ? `/* @keyframes */\n${extraction.css.keyframes.join('\n')}` : '',
    extraction.css.rules.length ? `/* matching rules */\n${extraction.css.rules.join('\n')}` : '',
    extraction.css.media.length ? `/* wrapped rules */\n${extraction.css.media.join('\n')}` : '',
  ].filter(Boolean).join('\n\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Component: ${selector}</title>
<!--
  Extracted from: ${sourceUrl}
  Selector:       ${selector}
  Elements:       ${extraction.elementCount}
  Generated:      ${new Date().toISOString()}
-->
<style>
${css}
</style>
</head>
<body>
${extraction.html}
</body>
</html>
`;
}
