import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
import { buildTokenIndex, traceProperty } from './var-trace.js';
import { extractCustomProperties } from './custom-properties.js';

// Properties we care about in the design-system sense.
const SPEC_PROPERTIES = [
  'background-color',
  'color',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'text-transform',
  'font-feature-settings',
  'border-radius',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-right-radius',
  'border-bottom-left-radius',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'border-top-style',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'width',
  'height',
  'min-width',
  'min-height',
  'box-shadow',
  'opacity',
  'gap',
  // Motion (Phase 7-extension). Captures transition/animation declarations so
  // src/design-md/extract/motion.js can derive duration/easing tiers.
  'transition-property',
  'transition-duration',
  'transition-timing-function',
  'transition-delay',
  'animation-name',
  'animation-duration',
  'animation-timing-function',
  'animation-delay',
  'animation-iteration-count',
];

// Heuristic candidate selectors for "interesting" elements. Phase 3 will
// classify them into spec components — Phase 2 just enumerates broadly.
const CANDIDATE_SELECTORS = [
  'button',
  '[role="button"]',
  'a[class*="btn"]',
  'a[class*="Button"]',
  '[class*="btn-"]',
  '[class*="Btn"]',
  '[class*="button-"]',
  'input',
  'textarea',
  'select',
  'h1', 'h2', 'h3', 'h4',
  'p',
  'nav',
  'header',
  'footer',
  '[class*="card"]',
  '[class*="Card"]',
  '[class*="hero"]',
  '[class*="Hero"]',
  '[class*="cta"]',
  '[class*="CTA"]',
  '[class*="badge"]',
  '[class*="Badge"]',
  'main > section',
  'main',
  'html',
  'body',
];

const MAX_PROBES_PER_SIGNATURE = 3; // keep up to N instances per class signature for variance
const MAX_TOTAL_PROBES = 200; // hard ceiling per page

const EXT_CT = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.ico': 'image/x-icon',
};

function buildManifestPathIndex(rootDir) {
  const manifestPath = path.join(rootDir, 'replay', 'manifest.json');
  if (!fs.existsSync(manifestPath)) return null;
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch { return null; }
  const byPath = new Map();
  for (const [url, entry] of Object.entries(manifest.entries || {})) {
    if (!entry?.body) continue;
    let pathname;
    try { pathname = new URL(url).pathname; } catch { continue; }
    if (!pathname) continue;
    // Last write wins — newer entries override older ones for the same path.
    byPath.set(pathname, entry);
  }
  return byPath;
}

function makeStaticServer(rootDir) {
  const manifestIndex = buildManifestPathIndex(rootDir);
  const bodiesDir = path.join(rootDir, 'replay', 'bodies');
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      if (urlPath === '/') urlPath = '/index.html';

      // 1) Try manifest-by-pathname (clone-saas SW emulation)
      if (manifestIndex && manifestIndex.has(urlPath)) {
        const entry = manifestIndex.get(urlPath);
        const bodyPath = path.join(bodiesDir, entry.body);
        fs.readFile(bodyPath, (err, data) => {
          if (err) {
            res.statusCode = 404;
            res.end();
            return;
          }
          const ct = entry.mimeType || EXT_CT[path.extname(urlPath).toLowerCase()] || 'application/octet-stream';
          res.setHeader('content-type', ct);
          res.setHeader('access-control-allow-origin', '*');
          res.end(data);
        });
        return;
      }

      // 2) Fall back to filesystem under output/
      const filePath = path.join(rootDir, urlPath);
      if (!filePath.startsWith(rootDir)) {
        res.statusCode = 403;
        res.end();
        return;
      }
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.statusCode = 404;
          res.end();
          return;
        }
        const ct = EXT_CT[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
        res.setHeader('content-type', ct);
        res.setHeader('access-control-allow-origin', '*');
        res.end(data);
      });
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: addr.port });
    });
  });
}

async function discoverProbeNodes(page) {
  // Runs in the page context. Returns lightweight descriptors so we can bind
  // them back to backendNodeIds via document.querySelectorAll on the host side.
  return page.evaluate(({ candidates, maxPerSig, maxTotal }) => {
    const seen = new Map(); // signature -> count
    const probes = [];
    function signatureFor(el) {
      const cls = (el.className && typeof el.className === 'string')
        ? el.className.trim().split(/\s+/).slice(0, 6).join(' ')
        : '';
      return `${el.tagName.toLowerCase()}|${cls}`;
    }
    function selectorFor(el) {
      // Build a stable, queryable selector path. Prefer id; otherwise tag + classes.
      if (el.id) return `${el.tagName.toLowerCase()}#${CSS.escape(el.id)}`;
      const cls = el.className && typeof el.className === 'string'
        ? el.className.trim().split(/\s+/).slice(0, 4).map((c) => `.${CSS.escape(c)}`).join('')
        : '';
      return `${el.tagName.toLowerCase()}${cls}`;
    }
    for (const sel of candidates) {
      let nodes;
      try { nodes = document.querySelectorAll(sel); } catch { continue; }
      for (const el of nodes) {
        const sig = signatureFor(el);
        const count = seen.get(sig) || 0;
        if (count >= maxPerSig) {
          // Bump instance counter on the existing probe
          const existing = probes.find((p) => p.signature === sig);
          if (existing) existing.instanceCount += 1;
          continue;
        }
        seen.set(sig, count + 1);
        const rect = el.getBoundingClientRect();
        const visible = rect.width > 0 && rect.height > 0;
        if (!visible && el.tagName !== 'BODY') continue;
        const probeIndex = probes.length;
        // Stamp the attribute on THIS element directly — querying by selector
        // later may collide when the dedup-by-signature uses more classes than
        // the selector we build.
        el.setAttribute('data-design-md-probe', String(probeIndex));
        // Capture innerText for text-bearing tags (headings, paragraphs,
        // buttons, links, list items). Truncated to 240 chars so the
        // computed.json doesn't bloat. Whitespace-collapsed. Skipped
        // entirely for structural / wrapper tags where text would just
        // be the concatenated content of every descendant.
        const TEXT_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'A', 'BUTTON', 'LI', 'BLOCKQUOTE', 'FIGCAPTION', 'LABEL']);
        let text = null;
        if (TEXT_TAGS.has(el.tagName)) {
          try {
            const raw = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
            if (raw.length >= 2 && raw.length <= 600) text = raw.slice(0, 240);
          } catch { /* ignore */ }
        }
        probes.push({
          signature: sig,
          tagName: el.tagName,
          className: typeof el.className === 'string' ? el.className : '',
          id: el.id || null,
          selector: selectorFor(el),
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          instanceCount: 1,
          probeIndex,
          text,
        });
        if (probes.length >= maxTotal) return probes;
      }
    }
    return probes;
  }, { candidates: CANDIDATE_SELECTORS, maxPerSig: MAX_PROBES_PER_SIGNATURE, maxTotal: MAX_TOTAL_PROBES });
}

async function getBackendNodeIdForProbe(cdp, probeIndex) {
  // DOM.querySelector returns nodeId; we need backendNodeId for getMatchedStyles.
  // We also build a parentId map from the same getDocument response so the
  // pseudo-state pass can walk ancestors for parent-scoped hover rules
  // (`.parent:hover .child { ... }` — common on stripe, common everywhere).
  // The parentMap MUST come from the same getDocument call as the nodeId or
  // the IDs won't match — CDP invalidates nodeIds across getDocument calls.
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeId } = await cdp.send('DOM.querySelector', {
    nodeId: root.nodeId,
    selector: `[data-design-md-probe="${probeIndex}"]`,
  });
  if (!nodeId) return null;
  const { node } = await cdp.send('DOM.describeNode', { nodeId });
  const parentMap = buildParentMap(root);
  return { nodeId, backendNodeId: node.backendNodeId, parentMap };
}

function buildParentMap(rootNode) {
  const map = new Map();
  const walk = (node) => {
    if (!node) return;
    if (Array.isArray(node.children)) {
      for (const c of node.children) {
        if (c?.nodeId) map.set(c.nodeId, node.nodeId);
        walk(c);
      }
    }
  };
  walk(rootNode);
  return map;
}

function ancestorChain(parentMap, nodeId, maxDepth = 5) {
  const out = [];
  let cur = nodeId;
  for (let i = 0; i < maxDepth; i++) {
    const p = parentMap.get(cur);
    if (!p) break;
    out.push(p);
    cur = p;
  }
  return out;
}

// Force a pseudo-state on `forceNodeId`, read computed styles from `readNodeId`,
// return the diff vs `baseIdx`. Always unforces in finally so state never leaks
// into the next probe. Returns {} on any CDP error or empty diff.
async function forcePseudoStateAndDiff(cdp, forceNodeId, readNodeId, state, baseIdx) {
  try {
    await cdp.send('CSS.forcePseudoState', {
      nodeId: forceNodeId,
      forcedPseudoClasses: [state],
    });
    const csForced = await cdp.send('CSS.getComputedStyleForNode', { nodeId: readNodeId });
    return diffComputedProperties(baseIdx, indexComputedStyle(csForced.computedStyle));
  } catch {
    return {};
  } finally {
    try {
      await cdp.send('CSS.forcePseudoState', {
        nodeId: forceNodeId,
        forcedPseudoClasses: [],
      });
    } catch {}
  }
}

function indexComputedStyle(computedArray) {
  const out = {};
  for (const { name, value } of computedArray) {
    out[name] = value;
  }
  return out;
}

// Walk matchedCSSRules + inlineStyle and index each property's *raw* declaration
// text by its property name. If a property is set in multiple rules, we keep
// the most-specific (last in cascade order, which is how matchedCSSRules is
// already returned by CDP).
function indexMatchedDeclarations(matched) {
  const decls = {};
  const collect = (rule, source) => {
    if (!rule || !rule.style || !rule.style.cssProperties) return;
    for (const p of rule.style.cssProperties) {
      if (!p.name) continue;
      if (p.disabled) continue;
      // Only consider ones that have a value (filter out parsed-only entries)
      if (!p.value && !p.text) continue;
      decls[p.name] = {
        value: p.value || '',
        text: p.text || `${p.name}: ${p.value || ''}`,
        source,
        important: p.important || false,
      };
    }
  };
  // matchedCSSRules is in cascade order (least to most specific), so iterate as-is and let later overwrite
  if (matched.matchedCSSRules) {
    for (const m of matched.matchedCSSRules) {
      collect(m.rule, m.rule?.origin || 'regular');
    }
  }
  if (matched.inlineStyle) {
    collect({ style: matched.inlineStyle, origin: 'inline' }, 'inline');
  }
  if (matched.attributesStyle) {
    collect({ style: matched.attributesStyle, origin: 'attributes' }, 'attributes');
  }
  return decls;
}

function summarizeProperty(propName, computedIdx, declIdx, tokenIndex) {
  const computed = computedIdx[propName];
  if (computed == null) return null;
  const decl = declIdx[propName];
  // We may not have a matched declaration if the value is inherited or default.
  const declText = decl ? decl.text : '';
  const trace = traceProperty(declText, computed, tokenIndex);
  return {
    value: computed,
    declText: declText || null,
    declSource: decl ? decl.source : 'inherited-or-default',
    varRefs: trace.varRefs,
    primaryRef: trace.primaryRef,
    resolvable: trace.resolvable,
  };
}

// Harvest styles from a live Playwright page. The page must already be
// settled (fonts loaded, networkidle, hydration complete). This runs the
// probe→CDP loop and an optional :hover pass; it does NOT manage browser
// lifecycle and does NOT route traffic. The caller owns the page.
//
// Side effect: stamps `data-design-md-probe` attributes on harvested
// elements. The caller should not depend on subsequent DOM serialization
// being clean — strip the attribute after if needed, or call this last.
export async function harvestStylesFromPage(page, { tokenIndex, viewport, harvestPseudo = true } = {}) {
  const probes = await discoverProbeNodes(page);

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');

  const results = [];
  const stats = {
    totalProbesDiscovered: probes.length,
    probesHarvested: 0,
    varRefsTotal: 0,
    varRefsResolved: 0,
    varRefsUnresolved: 0,
    propertyHits: 0,
    cdpErrors: 0,
    pseudoStatesProbed: 0,
    pseudoStateDiffs: 0,
  };

  for (const probe of probes) {
    let ids;
    try {
      ids = await getBackendNodeIdForProbe(cdp, probe.probeIndex);
    } catch (err) {
      stats.cdpErrors += 1;
      continue;
    }
    if (!ids) continue;

    let matched, computed;
    try {
      matched = await cdp.send('CSS.getMatchedStylesForNode', { nodeId: ids.nodeId });
      const cs = await cdp.send('CSS.getComputedStyleForNode', { nodeId: ids.nodeId });
      computed = cs.computedStyle;
    } catch (err) {
      stats.cdpErrors += 1;
      continue;
    }

    const computedIdx = indexComputedStyle(computed);
    const declIdx = indexMatchedDeclarations(matched);
    const pseudoRuleCount = countPseudoRules(matched);
    const totalHoverRules = pseudoRuleCount.hover + pseudoRuleCount.hoverInherited + pseudoRuleCount.hoverPseudo;
    const totalFocusRules = pseudoRuleCount.focus + pseudoRuleCount.focusInherited + pseudoRuleCount.focusPseudo;
    stats.pseudoRulesDetectedHover = (stats.pseudoRulesDetectedHover || 0) + totalHoverRules;
    stats.pseudoRulesDetectedFocus = (stats.pseudoRulesDetectedFocus || 0) + totalFocusRules;

    const props = {};
    for (const p of SPEC_PROPERTIES) {
      const summary = summarizeProperty(p, computedIdx, declIdx, tokenIndex);
      if (summary) {
        props[p] = summary;
        stats.propertyHits += 1;
        stats.varRefsTotal += summary.varRefs.length;
        if (summary.primaryRef) stats.varRefsResolved += 1;
        else if (summary.varRefs.length > 0) stats.varRefsUnresolved += 1;
      }
    }

    // Pseudo-state pass — only on probes that look like interactive elements,
    // since hovering a paragraph or footer rarely changes anything and burns
    // ~50ms of CDP per probe. Limit to the obvious targets; cheap heuristic.
    //
    // Two-stage strategy: try forcing the state on the probe itself first
    // (catches `button:hover { ... }` — the common case). If that yields an
    // empty diff, walk up to MAX_ANCESTOR_DEPTH ancestors and force on each
    // (catches `.parent:hover .child { ... }` — common on stripe, where the
    // hover scope is the surrounding card not the inner button). Stop at the
    // first ancestor that produces a diff so we don't double-count cascading
    // hover effects further up the tree.
    let pseudoStates = null;
    if (harvestPseudo && isInteractiveProbe(probe)) {
      pseudoStates = {};
      const chain = ids.parentMap ? ancestorChain(ids.parentMap, ids.nodeId, 5) : [];
      for (const state of ['hover', 'focus']) {
        stats.pseudoStatesProbed += 1;
        let diff = await forcePseudoStateAndDiff(cdp, ids.nodeId, ids.nodeId, state, computedIdx);
        let scope = 'self';
        if (Object.keys(diff).length === 0 && chain.length) {
          for (let depth = 0; depth < chain.length; depth++) {
            const ancestorNodeId = chain[depth];
            const aDiff = await forcePseudoStateAndDiff(cdp, ancestorNodeId, ids.nodeId, state, computedIdx);
            if (Object.keys(aDiff).length > 0) {
              diff = aDiff;
              scope = `ancestor+${depth + 1}`;
              stats.pseudoStateAncestorHits = (stats.pseudoStateAncestorHits || 0) + 1;
              break;
            }
          }
        }
        if (Object.keys(diff).length > 0) {
          // Tag with scope so downstream emit can distinguish self-hover from
          // parent-scoped hover; for now scope is informational and the diff
          // shape stays the same.
          pseudoStates[state] = diff;
          if (scope !== 'self') {
            pseudoStates[`${state}__scope`] = scope;
          }
          stats.pseudoStateDiffs += 1;
        }
      }
      if (Object.keys(pseudoStates).length === 0) pseudoStates = null;
    }

    results.push({
      id: `p${String(probe.probeIndex).padStart(3, '0')}`,
      tagName: probe.tagName,
      className: probe.className,
      idAttr: probe.id,
      selector: probe.selector,
      signature: probe.signature,
      instanceCount: probe.instanceCount,
      rect: probe.rect,
      properties: props,
      pseudoStates,
      pseudoRuleCount,
      text: probe.text || null,
    });
    stats.probesHarvested += 1;
  }

  return {
    probes: results,
    stats,
    viewport: viewport || { width: 1280, height: 800 },
  };
}

function isInteractiveProbe(probe) {
  const tag = probe.tagName;
  if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'LABEL') return true;
  const cls = (probe.className || '').toLowerCase();
  if (/(^|\s|-)(btn|button|cta|link|chip|tag|badge|tile|card|item|nav|menu)(\s|-|$)/.test(cls)) return true;
  return false;
}

// Count :hover / :focus selectors across the matched-styles tree. Provides a
// site-level capture-rate metric: how many hover rules actually exist for this
// probe (self + ancestor + pseudo-element scope) vs how many we converted into
// a pseudo-state diff. Persisted on each probe in computed.json so dashboards
// and bench scripts can compute (variants emitted) / (rules detected) without
// re-querying the live page.
function countPseudoRules(matched) {
  const counts = { hover: 0, focus: 0, hoverInherited: 0, focusInherited: 0, hoverPseudo: 0, focusPseudo: 0 };
  const scanRules = (rules, hoverKey, focusKey) => {
    if (!Array.isArray(rules)) return;
    for (const m of rules) {
      const sels = m?.rule?.selectorList?.selectors;
      if (!Array.isArray(sels)) continue;
      let hasHover = false;
      let hasFocus = false;
      for (const s of sels) {
        const t = s?.text || '';
        if (!hasHover && /:hover\b/.test(t)) hasHover = true;
        if (!hasFocus && /:focus(?:-visible|-within)?\b/.test(t)) hasFocus = true;
      }
      if (hasHover) counts[hoverKey] += 1;
      if (hasFocus) counts[focusKey] += 1;
    }
  };
  scanRules(matched?.matchedCSSRules, 'hover', 'focus');
  if (Array.isArray(matched?.inherited)) {
    for (const inh of matched.inherited) {
      scanRules(inh?.matchedCSSRules, 'hoverInherited', 'focusInherited');
    }
  }
  if (Array.isArray(matched?.pseudoElements)) {
    for (const pe of matched.pseudoElements) {
      scanRules(pe?.matches, 'hoverPseudo', 'focusPseudo');
    }
  }
  return counts;
}

// Return only properties whose value changed under the forced pseudo-state.
// SPEC_PROPERTIES filters keep the diff scoped to design-system-relevant attrs.
function diffComputedProperties(baseIdx, forcedIdx) {
  const diff = {};
  for (const p of SPEC_PROPERTIES) {
    const a = baseIdx[p];
    const b = forcedIdx[p];
    if (b == null || b === a) continue;
    diff[p] = b;
  }
  return diff;
}

export async function harvestComputedStyles(jobDir, options = {}) {
  const tokensPath = path.join(jobDir, 'output', 'design-md', 'tokens.json');
  let tokensJson = null;
  if (fs.existsSync(tokensPath)) {
    tokensJson = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
  } else {
    // Auto-run Phase 1 so var-ref resolution works without a manual prep step.
    const customProps = extractCustomProperties(jobDir);
    tokensJson = { themes: customProps.themes };
    fs.mkdirSync(path.dirname(tokensPath), { recursive: true });
    fs.writeFileSync(
      tokensPath,
      JSON.stringify({
        jobId: path.basename(jobDir),
        sourceUrl: null,
        extractedAt: new Date().toISOString(),
        themes: customProps.themes,
        stats: customProps.stats,
        autoGenerated: true,
      }, null, 2)
    );
  }
  const tokenIndex = buildTokenIndex(tokensJson);

  const outputDir = path.join(jobDir, 'output');
  if (!fs.existsSync(path.join(outputDir, 'index.html'))) {
    throw new Error(`index.html not found in ${outputDir}`);
  }

  const { server, port } = await makeStaticServer(outputDir);
  let browser = null;
  try {
    browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({
      viewport: { width: options.viewportWidth || 1280, height: options.viewportHeight || 800 },
      ignoreHTTPSErrors: true,
      serviceWorkers: 'block', // page bootstraps a SW that reloads — bypass it; we serve from manifest directly
      javaScriptEnabled: true,
    });
    const page = await ctx.newPage();
    await page.route('**/*', (route) => {
      const u = route.request().url();
      if (u.startsWith(`http://127.0.0.1:${port}`) || u.startsWith('data:') || u.startsWith('blob:')) {
        return route.continue();
      }
      return route.abort();
    });

    const url = `http://127.0.0.1:${port}/index.html`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    try {
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    } catch {
      // best effort
    }
    // Wait for fonts to settle so font-family computed values reflect real loaded fonts
    // rather than the fallback stack. Explicitly trigger any FontFace that hasn't auto-loaded
    // yet (fonts declared in CSS but with no rendered glyph — common on hero-only typefaces),
    // then await fonts.ready and a settle window.
    try {
      await page.evaluate(async () => {
        if (!document.fonts) return null;
        const pending = [];
        document.fonts.forEach((face) => {
          if (face.status === 'unloaded') {
            try { pending.push(face.load().catch(() => null)); } catch {}
          }
        });
        await Promise.all(pending);
        return document.fonts.ready;
      });
    } catch {
      // ignore
    }
    await page.waitForTimeout(500);

    return await harvestStylesFromPage(page, {
      tokenIndex,
      viewport: { width: options.viewportWidth || 1280, height: options.viewportHeight || 800 },
      harvestPseudo: options.harvestPseudo !== false,
    });
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.close();
  }
}
