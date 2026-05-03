import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';

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
    const result = await page.evaluate(extractInPage, selector);
    if (!result || result.error) return result;
    result.screenshotBase64 = await captureElementScreenshot(page, selector);
    return result;
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
        const r = await page.evaluate(extractInPage, sel);
        if (r && !r.error) {
          r.screenshotBase64 = await captureElementScreenshot(page, sel);
        }
        results.push(r);
      } catch (err) {
        results.push({ error: `extract failed: ${err.message}` });
      }
    }
    return results;
  } finally {
    await browser.close();
  }
}

async function captureElementScreenshot(page, selector) {
  try {
    const buf = await page.locator(selector).first().screenshot({
      type: 'png',
      timeout: 8000,
      animations: 'disabled',
    });
    return buf.toString('base64');
  } catch {
    return null;
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

  // Scroll pass — triggers IntersectionObserver-driven lazy mounts (reveal
  // animations, deferred image hydration, infinite scroll). Without this,
  // many components are still in their pre-hydration empty state when we
  // snapshot, and the picked subtree comes back missing content.
  try {
    await page.evaluate(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const docHeight = () => Math.max(
        document.body ? document.body.scrollHeight : 0,
        document.documentElement ? document.documentElement.scrollHeight : 0
      );
      let last = -1;
      let safety = 0;
      while (safety++ < 50) {
        const here = window.scrollY;
        if (here === last) break;
        last = here;
        window.scrollBy(0, Math.max(400, window.innerHeight * 0.8));
        await sleep(120);
        if (window.scrollY + window.innerHeight >= docHeight() - 4) break;
      }
      window.scrollTo(0, 0);
      await sleep(120);
    });
  } catch {}

  try { await page.waitForLoadState('networkidle', { timeout: 5000 }); } catch {}
  // Grace period for entrance animations / deferred React hydration to complete
  await page.waitForTimeout(900);
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

  // Constructable stylesheets attached to the document itself (Lit, modern
  // design systems, some Tailwind v4 setups). Same handling as <link>/<style>
  // sheets, but they live on document.adoptedStyleSheets and were silently
  // ignored before — this is a major source of "missing styling" reports.
  try {
    for (const s of document.adoptedStyleSheets || []) {
      try { for (const r of s.cssRules) handleRule(r, []); } catch {}
    }
  } catch {}

  // Walk computed styles to surface inline element keyframe refs
  for (const el of allEls) {
    const cs = getComputedStyle(el);
    collectKeyframeRefs(cs);
  }

  // Pseudo-element content capture. A button styled as
  //   .btn::before { content: "→" }
  // contains visible text that never appears in serialized HTML. Without
  // this dump, an agent rebuilding from component.html sees an empty button.
  const PSEUDO_POSITIONS = ['::before', '::after', '::marker'];
  const pseudoContent = [];
  const cssEscape = (s) => (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  const elementPath = (el) => {
    const parts = [];
    let cur = el;
    while (cur && cur !== document.documentElement && parts.length < 8) {
      let p = cur.tagName.toLowerCase();
      if (cur.id) { p += `#${cur.id}`; parts.unshift(p); break; }
      if (cur.classList && cur.classList.length) {
        p += '.' + [...cur.classList].slice(0, 3).map(cssEscape).join('.');
      }
      parts.unshift(p);
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  };
  for (const el of allEls) {
    for (const pos of PSEUDO_POSITIONS) {
      let cs;
      try { cs = getComputedStyle(el, pos); } catch { continue; }
      if (!cs) continue;
      const raw = cs.getPropertyValue('content');
      if (!raw || raw === 'none' || raw === 'normal' || raw === '""' || raw === "''") continue;
      // Normalize: strip outer quotes from string content; leave attr()/counter()/url() intact.
      let display = raw;
      const strMatch = raw.match(/^"((?:\\.|[^"\\])*)"$/) || raw.match(/^'((?:\\.|[^'\\])*)'$/);
      if (strMatch) display = strMatch[1].replace(/\\(.)/g, '$1');
      pseudoContent.push({
        path: elementPath(el),
        position: pos,
        content: display,
        raw,
        color: cs.getPropertyValue('color'),
        background: cs.getPropertyValue('background-color'),
        font: `${cs.getPropertyValue('font-weight')} ${cs.getPropertyValue('font-size')} ${cs.getPropertyValue('font-family')}`.trim(),
      });
    }
  }

  // Per-element computed styles — ground truth for the agent when CSS rule
  // matching misses something (utility classes inside @scope, !important
  // overrides from JS-injected styles, animations frozen at non-default
  // states, etc.). Capped at the most-relevant property set + first 200
  // elements so the bundle stays small.
  const COMPUTED_PROPS = [
    'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index',
    'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'box-sizing', 'overflow', 'overflow-x', 'overflow-y',
    'flex', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items',
    'align-self', 'gap', 'order',
    'grid-template-columns', 'grid-template-rows', 'grid-area',
    'grid-column', 'grid-row',
    'color', 'background-color', 'background-image', 'background-size',
    'background-position', 'background-repeat',
    'font-family', 'font-size', 'font-weight', 'font-style',
    'line-height', 'letter-spacing', 'text-align', 'text-transform',
    'text-decoration', 'white-space', 'word-break',
    'border-top', 'border-right', 'border-bottom', 'border-left',
    'border-radius', 'box-shadow', 'opacity', 'transform', 'transform-origin',
    'transition', 'animation', 'cursor', 'pointer-events', 'visibility',
    'backdrop-filter', 'filter', 'mix-blend-mode',
  ];
  // Defaults that are not interesting to dump (reduces noise massively).
  const SKIP_VALUES = new Set([
    'auto', 'normal', 'none', '0px', '0', 'rgba(0, 0, 0, 0)', 'transparent',
    'visible', 'static', 'baseline', 'currentcolor', 'medium',
  ]);
  const elementComputedStyles = [];
  for (let i = 0; i < Math.min(allEls.length, 200); i++) {
    const el = allEls[i];
    const cs = getComputedStyle(el);
    const props = {};
    for (const p of COMPUTED_PROPS) {
      const v = cs.getPropertyValue(p);
      if (!v) continue;
      const trimmed = v.trim();
      if (!trimmed || SKIP_VALUES.has(trimmed)) continue;
      props[p] = trimmed;
    }
    const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    elementComputedStyles.push({
      path: elementPath(el),
      tag: el.tagName.toLowerCase(),
      box: rect ? {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
      } : null,
      props,
    });
  }

  // Full stylesheet fallback. If the surgical rule-matcher missed something
  // (rare combinator, JS-conditional rule, framework's own utility CSS), the
  // agent still has every CSS rule available from the page as a last resort.
  // Capped at 500 KB to avoid bundle bloat from huge atomic-CSS dumps.
  const FULL_CSS_MAX = 500 * 1024;
  let fullStyles = '';
  const collectAllRulesFromSheet = (sheet) => {
    let rules;
    try { rules = sheet.cssRules; } catch { return; }
    if (!rules) return;
    for (const r of rules) {
      try { fullStyles += r.cssText + '\n'; } catch {}
      if (fullStyles.length > FULL_CSS_MAX) return;
    }
  };
  for (const s of document.styleSheets) {
    if (fullStyles.length > FULL_CSS_MAX) break;
    collectAllRulesFromSheet(s);
  }
  try {
    for (const s of document.adoptedStyleSheets || []) {
      if (fullStyles.length > FULL_CSS_MAX) break;
      collectAllRulesFromSheet(s);
    }
  } catch {}
  if (fullStyles.length > FULL_CSS_MAX) {
    fullStyles = fullStyles.slice(0, FULL_CSS_MAX) + '\n/* truncated */\n';
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
    // Transitive resolution: when a resolved value contains var(--other), enqueue
    // --other on the next pass. Loops until the queue is empty or we run out of
    // ancestors. Without this, themed components miss their second-level tokens
    // (e.g. --btn-bg: var(--brand-500) → grabs --btn-bg, drops --brand-500).
    const queue = new Set(referencedVars);
    let pass = 0;
    while (queue.size > 0 && pass++ < 6) {
      const todo = [...queue];
      queue.clear();
      let cur = root.parentElement;
      while (cur && cur !== document.documentElement.parentElement) {
        const cs = getComputedStyle(cur);
        for (const v of todo) {
          if (resolved[v] !== undefined) continue;
          const val = cs.getPropertyValue('--' + v);
          if (val && val.trim() !== '') {
            resolved[v] = val.trim();
            for (const m of val.matchAll(/var\(\s*--([\w-]+)/g)) {
              if (resolved[m[1]] === undefined) queue.add(m[1]);
            }
          }
        }
        cur = cur.parentElement;
      }
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
    fullStyles,
    pseudoContent,
    elementComputedStyles,
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

// Replay mode: the page's own JS is preserved (the bundled service worker
// replays every recorded URL), so framework reveal animations re-run live.
// No script stripping, no JS-gate class stripping, no framework-specific
// reveal regexes. Settled-DOM overrides (captured during settle pass) are
// belt-and-suspenders to make sure the picked component is visible even
// before JS hydration finishes.

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
 * Build a doc that IS the full cloned page with isolation overlays injected
 * so only the picked sections render. Scripts are preserved — the bundled
 * service worker (replay mode) serves every recorded URL, so animations
 * re-run live.
 *
 * Three injections:
 *   1. <style data-clone-saas-isolate> — hides anything not marked keep/pick.
 *   2. <style data-clone-saas-settle> — settled-DOM overrides per selector,
 *      so animated descendants of the picked subtree render visible even
 *      before JS hydration finishes.
 *   3. <script data-clone-saas-init> — marks picks (data-clone-saas-pick)
 *      and ancestors (data-clone-saas-keep). Re-applies marks on a short
 *      timer to outlast late hydration that re-renders the subtree.
 *
 * Pass selectors = [single] for a per-component file; pass the full array
 * for the composed page.
 */
export function buildIsolatedFullPage(fullPageHtml, selectors, opts = {}) {
  const settledOverrides = opts.settledOverrides || {};

  // Bake the pick/keep marks into the static HTML using cheerio. Without this,
  // the page only becomes visible after the runtime init script's
  // querySelector calls — which can fail when (a) the picker selector relied
  // on hydrated DOM that the static cloned HTML doesn't match exactly, (b) the
  // user opens index.html via file:// (no SW, no JS modules), or (c)
  // framework hydration replaces the subtree before our timer re-applies. By
  // pre-marking, the CSS isolation works on first paint, and the runtime
  // script becomes a fallback / re-applier that survives hydration.
  const $ = cheerio.load(fullPageHtml, { decodeEntities: false });
  const markedSelectors = [];
  selectors.forEach((sel, i) => {
    let target;
    try { target = $(sel).first(); } catch { return; }
    if (!target || target.length === 0) return;
    target.attr('data-clone-saas-pick', String(i + 1));
    let walk = target.parent();
    while (walk && walk.length > 0) {
      const tag = (walk.prop && walk.prop('tagName') || walk.get(0) && walk.get(0).tagName || '').toLowerCase();
      if (tag === 'html') break;
      walk.attr('data-clone-saas-keep', '');
      walk = walk.parent();
    }
    markedSelectors.push(sel);
  });

  const styleTag = `<style data-clone-saas-isolate>${ISOLATE_CSS}</style>`;
  const settleTag = buildSettleStyleTag(settledOverrides);
  const initTag = buildIsolateInitScript(selectors);

  if ($('head').length) {
    $('head').append(`\n${styleTag}`);
    if (settleTag) $('head').append(`\n${settleTag}`);
  } else {
    $.root().prepend(`<head>${styleTag}${settleTag || ''}</head>`);
  }
  if ($('body').length) {
    $('body').append(`\n${initTag}`);
  } else {
    $.root().append(initTag);
  }

  return $.html();
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

function buildSettleStyleTag(overrides) {
  if (!overrides || typeof overrides !== 'object') return '';
  const rules = [];
  for (const [sel, decls] of Object.entries(overrides)) {
    if (!sel || !decls || typeof decls !== 'object') continue;
    const body = Object.entries(decls)
      .map(([prop, val]) => `${cssKebab(prop)}: ${String(val).replace(/[<>]/g, '')} !important;`)
      .join(' ');
    if (body) rules.push(`${sel.replace(/[<>]/g, '')} { ${body} }`);
  }
  if (rules.length === 0) return '';
  return `<style data-clone-saas-settle>${rules.join('\n')}</style>`;
}

function cssKebab(s) {
  return String(s).replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
}

function buildIsolateInitScript(selectors) {
  const sels = JSON.stringify(selectors);
  return `<script data-clone-saas-init>
(function(){
  var SELS = ${sels};
  function apply(){
    if (!document.body) return;
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
    var first = document.querySelector('[data-clone-saas-pick="1"]');
    if (first) { try { first.scrollIntoView({ block: 'start' }); } catch(_) {} }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
  // Re-apply to outlive framework hydration that may re-render the subtree
  // and clear our marks.
  setTimeout(apply, 400);
  setTimeout(apply, 1200);
  setTimeout(apply, 3000);
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
export function inlineHtmlAssets(html, assetsDir, opts = {}) {
  if (!assetsDir || !fs.existsSync(assetsDir)) return html;
  const cache = new Map();
  const { skipScripts = false } = opts;
  // Encoded as data:application/javascript URLs, ES module scripts lose their
  // origin and can't resolve relative `import "./foo.js"` specifiers. For the
  // full-clone ZIP we'd rather keep JS in `assets/` so the page works after
  // extraction, while still inlining CSS/images so it looks right *before*
  // extraction (Windows Explorer's "open inside ZIP" behavior).
  const isScriptRel = (rel) => /\.(?:m?js)(?:[?#]|$)/i.test(rel);

  // 1. Inline <link rel="stylesheet" href="assets/..."> as <style>.
  html = html.replace(/<link\b[^>]*>/gi, (tag) => {
    // <link rel="modulepreload"> targets module JS — preserve in skipScripts mode.
    if (skipScripts && /rel\s*=\s*["']?modulepreload["']?/i.test(tag)) return tag;
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
    if (skipScripts && isScriptRel(rel)) return m;
    const cleanRel = rel.replace(/[?#].*$/, '');
    const dataUrl = readAssetDataUrl(cleanRel, assetsDir, cache);
    return dataUrl ? `${attr}=${q}${dataUrl}${q}` : m;
  });

  // 5. Inline srcset.
  html = html.replace(/srcset\s*=\s*"([^"]*)"/gi, (m, val) => `srcset="${inlineSrcset(val, assetsDir, cache)}"`);
  html = html.replace(/srcset\s*=\s*'([^']*)'/gi, (m, val) => `srcset='${inlineSrcset(val, assetsDir, cache)}'`);

  return html;
}

/**
 * Inline all JS module assets into the HTML so the page works under file://.
 *
 * Chrome blocks ES module loads over file:// via CORS ("blocked by CORS policy:
 * Cross origin requests are only supported for protocol schemes: http, https,
 * data..."), which kills every modern bundle (Astro/Vite/Remix/Next) when
 * users open the downloaded HTML directly. Data: URLs don't work either —
 * relative `import "./foo.js"` inside a data: module can't resolve.
 *
 * Workaround: replace external module scripts with an inline classic-script
 * bootstrap that
 *   1. decodes a base64 map of every JS asset's source,
 *   2. wraps each in a Blob and creates an `URL.createObjectURL` per file,
 *   3. injects a `<script type="importmap">` mapping bare specifiers like
 *      `@mc/<filename>` to those blob URLs,
 *   4. then loads the entry modules through those bare specifiers.
 *
 * Each module's source is pre-rewritten so its own `import "./X.js"` /
 * `import("./X.js")` specifiers reference the same `@mc/X.js` keys, letting
 * the importmap resolve sub-imports through the same blob URL pool.
 *
 * Result: a single self-contained HTML file that runs identical JS modules
 * whether opened via http://, file://, or extracted-from-ZIP.
 */
export function inlineModuleScripts(html, assetsDir) {
  if (!assetsDir || !fs.existsSync(assetsDir)) return html;

  const allFiles = fs.readdirSync(assetsDir);
  const jsFiles = allFiles.filter((f) => /\.(?:m?js)$/i.test(f));
  if (jsFiles.length === 0) return html;

  const PREFIX = '@mc/';
  const fileSet = new Set(jsFiles);

  // Rewrite each module's imports so its sub-imports go through the importmap
  const sources = {};
  for (const f of jsFiles) {
    let code;
    try { code = fs.readFileSync(path.join(assetsDir, f), 'utf8'); }
    catch { continue; }
    sources[f] = rewriteJsImportsToBare(code, fileSet, PREFIX);
  }

  // Build base64 map keyed by '@mc/<filename>'
  const moduleMap = {};
  for (const f of Object.keys(sources)) {
    moduleMap[PREFIX + f] = Buffer.from(sources[f], 'utf8').toString('base64');
  }

  // Bootstrap script: decode → blobs → importmap. Lives at the top of <head>
  // so it runs before any subsequent <script type="module"> begins fetching.
  // Bootstrap must run BEFORE any <script type="module"> in the HTML so the
  // importmap is acquired before module loads start. We use document.write
  // to splice the importmap into the parser stream — Chrome's importmap
  // acquisition runs during parsing, and DOM-API insertion after a module
  // begins loading is rejected ("ignored multiple importmap"). document.write
  // during synchronous parser execution puts the importmap in place before
  // the parser advances to subsequent module scripts.
  const bootstrap =
    '<script data-clone-saas-modulemap>' +
    '(function(){' +
    'var M=' + JSON.stringify(moduleMap) + ';' +
    'var I={};' +
    'for(var k in M){' +
    'var s=atob(M[k]);' +
    'var u=new Uint8Array(s.length);' +
    'for(var i=0;i<s.length;i++)u[i]=s.charCodeAt(i);' +
    'I[k]=URL.createObjectURL(new Blob([u],{type:"application/javascript"}));' +
    '}' +
    'document.write(\'<script type="importmap">\'+JSON.stringify({imports:I})+\'<\\/script>\');' +
    '})();' +
    '</script>';

  // 1. Inject bootstrap as the FIRST element inside <head>
  if (/<head\b[^>]*>/i.test(html)) {
    html = html.replace(/<head\b([^>]*)>/i, `<head$1>\n${bootstrap}\n`);
  } else {
    html = bootstrap + html;
  }

  // 2. Replace <script type="module" src="assets/X"></script> with an inline
  //    module that imports the bare specifier. Browser resolves it through the
  //    importmap to the blob URL.
  const SCRIPT_TAG_RE = /<script\b([^>]*)\bsrc\s*=\s*(["'])assets\/([^"']+)\2([^>]*)>\s*<\/script>/gi;
  html = html.replace(SCRIPT_TAG_RE, (m, before, q, rel, after) => {
    const cleanRel = rel.replace(/[?#].*$/, '');
    if (!fileSet.has(cleanRel)) return m;
    const attrs = before + after;
    if (!/type\s*=\s*["']?module["']?/i.test(attrs)) return m;
    return `<script type="module">import ${q}${PREFIX}${cleanRel}${q};</script>`;
  });

  // 3. Drop <link rel="modulepreload" href="assets/X"> — handled by the bootstrap.
  html = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/rel\s*=\s*["']?modulepreload["']?/i.test(tag)) return tag;
    const m = tag.match(/href\s*=\s*(["'])assets\/([^"']+)\1/i);
    if (!m) return tag;
    const cleanRel = m[2].replace(/[?#].*$/, '');
    return fileSet.has(cleanRel) ? '' : tag;
  });

  // 4. Rewrite imports & asset strings inside INLINE scripts so they also
  //    resolve through the importmap (React Router / Remix manifests embed
  //    asset paths as JSON inside <script>window.__reactRouterManifest=...).
  //    Skip JSON-LD blocks (not JS) and our own bootstrap.
  html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (m, attrs, body) => {
    if (/\bsrc\s*=/i.test(attrs)) return m;
    if (/data-clone-saas-modulemap/i.test(attrs)) return m;
    if (/type=["']?application\/(ld\+json|json)["']?/i.test(attrs)) return m;
    if (!body.trim()) return m;
    const rewritten = rewriteJsImportsToBare(body, fileSet, PREFIX);
    if (rewritten === body) return m;
    return `<script${attrs}>${rewritten}</script>`;
  });

  return html;
}

function rewriteJsImportsToBare(js, fileSet, prefix) {
  // Some module sources skip the cloner's JS rewrite step (e.g. older clones,
  // or imports inside source maps). Build a suffix index so `./foo.HASH.js`
  // still resolves to the disk file `<hash>-foo.HASH.js`.
  const suffixIndex = new Map();
  for (const f of fileSet) {
    const dash = f.indexOf('-');
    if (dash > 0) suffixIndex.set(f.slice(dash + 1), f);
  }

  const tryMap = (raw) => {
    if (!raw) return null;
    let s = raw.replace(/[?#].*$/, '');
    // Skip absolute URLs (http://, https://, data:, blob:) and protocol-relative.
    if (/^[a-z][a-z0-9+.-]*:/i.test(s) || s.startsWith('//')) return null;
    // Anything else with a path separator: pull the basename. Catches
    // `./foo.js`, `../foo.js`, `/assets/foo.js`, `_astro/foo.js`,
    // `assets/foo.js` — same lookup. Bare basenames (no `/`) only match if
    // the literal filename is in the asset set, to avoid false positives on
    // unrelated short JS-named strings inside random scripts.
    const basename = s.includes('/') ? path.posix.basename(s) : s;
    if (!s.includes('/') && !fileSet.has(basename) && !suffixIndex.has(basename)) {
      return null;
    }
    if (fileSet.has(basename)) return prefix + basename;
    const matched = suffixIndex.get(basename);
    return matched ? prefix + matched : null;
  };

  // import ... from "..."
  js = js.replace(/\bfrom\s*(['"])([^'"\n]+)\1/g, (m, q, raw) => {
    const mapped = tryMap(raw);
    return mapped ? `from${q}${mapped}${q}` : m;
  });
  // dynamic import("...")
  js = js.replace(/\bimport\s*\(\s*(['"])([^'"\n]+)\1/g, (m, q, raw) => {
    const mapped = tryMap(raw);
    return mapped ? `import(${q}${mapped}${q}` : m;
  });
  // side-effect import "..."
  js = js.replace(/(^|[\s;{}(),=>?:])import\s*(['"])([^'"\n]+)\2/g, (m, pre, q, raw) => {
    const mapped = tryMap(raw);
    return mapped ? `${pre}import${q}${mapped}${q}` : m;
  });

  // String literals matching known JS asset basenames or absolute /assets/ paths.
  // Catches Vite's __vite__mapDeps and React Router manifest "module":"/assets/foo.js".
  const STR_RE = /(['"])(\/?(?:[\w@\-./]+\/)?[\w\-.]+\.(?:m?js))\1/g;
  js = js.replace(STR_RE, (m, q, raw) => {
    const mapped = tryMap(raw);
    return mapped ? `${q}${mapped}${q}` : m;
  });

  // Vite's preload helper resolves each dep against `import.meta.url` (or
  // prepends "/") when building <link rel="modulepreload"> hints. Since
  // modules now load as blob: URLs, `import.meta.url` is `blob:null/<uuid>`,
  // and `new URL('@mc/foo.js', 'blob:null/...')` throws "Invalid URL" (blob
  // URLs don't support relative resolution). Patch the helper to return the
  // bare specifier unchanged so the importmap can resolve it. The preload
  // <link> hints will 404 silently (preload uses URL parsing, not importmap),
  // but the real `import()` call resolves through the importmap and loads
  // the blob URL — so animations & dynamic chunks run.
  if (/vite:preloadError|modulepreload|__vitePreload/.test(js)) {
    // Pattern A: =function(l){return"/"+l}
    js = js.replace(
      /=\s*function\s*\(\s*([A-Za-z_$][\w$]*)\s*\)\s*\{\s*return\s*(['"])\/\2\s*\+\s*\1\s*\}/g,
      '=function($1){return $1}'
    );
    // Pattern B: =function(l){return new URL(l,import.meta.url).href}
    js = js.replace(
      /=\s*function\s*\(\s*([A-Za-z_$][\w$]*)\s*\)\s*\{\s*return\s+new\s+URL\s*\(\s*\1\s*,\s*[^)]+\)\.href\s*\}/g,
      '=function($1){return $1}'
    );
    // Pattern C: =(l)=>new URL(l,import.meta.url).href  (arrow form)
    js = js.replace(
      /=\s*\(\s*([A-Za-z_$][\w$]*)\s*\)\s*=>\s*new\s+URL\s*\(\s*\1\s*,\s*[^)]+\)\.href/g,
      '=($1)=>$1'
    );
  }

  return js;
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
