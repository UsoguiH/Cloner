import { normalizeColor } from '../extract/var-trace.js';
import { contrastRatio, passesAA } from './contrast.js';

const TEXT_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'A', 'LABEL', 'SPAN', 'LI', 'STRONG', 'EM', 'BODY']);
const BUTTON_TAGS = new Set(['BUTTON']);
const SURFACE_HINTS = ['card', 'panel', 'tile', 'surface', 'box'];

function isLikelyButton(probe) {
  if (BUTTON_TAGS.has(probe.tagName)) return true;
  const cls = (probe.className || '').toLowerCase();
  if (probe.tagName === 'A' && (cls.includes('btn') || cls.includes('button') || cls.includes('cta'))) return true;
  return false;
}

function isLikelyText(probe) {
  return TEXT_TAGS.has(probe.tagName);
}

function isLikelySurface(probe) {
  const cls = (probe.className || '').toLowerCase();
  return SURFACE_HINTS.some((h) => cls.includes(h));
}

// Build a usage map keyed by normalized hex.
// Each entry tracks: total weighted area, count, byProperty counts, byTag counts,
// the var() refs that produce this hex, and a sampling of probe IDs as evidence.
export function buildColorUsage(computed, tokenIndex) {
  const usage = new Map(); // hex -> { ... }
  const colorProps = ['background-color', 'color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color'];

  const ensure = (hex) => {
    if (!usage.has(hex)) {
      usage.set(hex, {
        hex,
        count: 0,
        weightedArea: 0,
        byProperty: { 'background-color': 0, 'color': 0, 'border': 0 },
        byTag: {},
        varRefs: new Set(),
        evidence: [],
        likelyButtonBg: 0,
        likelyTextOnText: 0,
        likelySurfaceBg: 0,
      });
    }
    return usage.get(hex);
  };

  for (const probe of computed.probes) {
    const area = Math.max(1, (probe.rect?.width || 0) * (probe.rect?.height || 0));
    const isButton = isLikelyButton(probe);
    const isText = isLikelyText(probe);
    const isSurface = isLikelySurface(probe);
    for (const prop of colorProps) {
      const info = probe.properties[prop];
      if (!info) continue;
      const hex = normalizeColor(info.value);
      if (!hex || hex === 'transparent') continue;
      const e = ensure(hex);
      e.count += 1;
      e.weightedArea += area;
      const bucket = prop === 'background-color' ? 'background-color' : (prop === 'color' ? 'color' : 'border');
      e.byProperty[bucket] = (e.byProperty[bucket] || 0) + 1;
      e.byTag[probe.tagName] = (e.byTag[probe.tagName] || 0) + 1;
      if (info.primaryRef) e.varRefs.add(info.primaryRef);
      else for (const r of (info.varRefs || [])) e.varRefs.add(r);
      if (e.evidence.length < 5) {
        e.evidence.push({ probeId: probe.id, prop, selector: probe.selector });
      }
      if (isButton && prop === 'background-color') e.likelyButtonBg += area;
      if (isText && prop === 'color') e.likelyTextOnText += area;
      if (isSurface && prop === 'background-color') e.likelySurfaceBg += area;
    }
  }

  // Materialize Sets to arrays for easier downstream serialization
  for (const e of usage.values()) {
    e.varRefs = [...e.varRefs];
  }
  return usage;
}

// Translucent colors are overlays, not roles. The @google/design.md linter
// also rejects 8-digit hex outright — emitting one is a hard error.
function isOpaque(hex) {
  return typeof hex === 'string' && hex.length === 7;
}

function pickByMax(usage, scoreFn, exclude = new Set()) {
  let best = null;
  let bestScore = -Infinity;
  for (const e of usage.values()) {
    if (exclude.has(e.hex)) continue;
    if (!isOpaque(e.hex)) continue;
    const s = scoreFn(e);
    if (s > bestScore) { best = e; bestScore = s; }
  }
  return best && bestScore > 0 ? best : null;
}

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex);
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

// Saturation in HSV space — neutrals (gray/black/white) get ~0
function saturation(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const max = Math.max(...rgb);
  const min = Math.min(...rgb);
  if (max === 0) return 0;
  return (max - min) / max;
}

function isNeutral(hex) {
  return saturation(hex) < 0.1;
}

// CSS custom-property names that signal "this is the brand identity color"
// — scored by how unambiguous the name is. Higher = stronger evidence.
//
// Rationale: probe-evidence (where colors land in computed styles) is biased
// by surface area — a CTA button covers fewer pixels than body text, so a
// gray body color outranks a saturated brand accent. CSS variables often
// carry the design-system intent directly in the name. Linear declares
// `--color-brand-bg: #5e6ad2` even on a homepage where the lavender never
// reaches a probed element. We mine this signal as a separate evidence
// layer and let it preempt frequency-based picks when the name is
// unambiguous AND the value is saturated.
const TOKEN_BRAND_PATTERNS = [
  { re: /^--(?:color-)?brand-(?:bg|background|accent|primary)$/i, score: 110 },
  { re: /^--(?:color-)?brand$/i, score: 100 },
  { re: /^--(?:color-)?brand[-_]/i, score: 90 },
  { re: /^--(?:color-)?primary$/i, score: 80 },
  { re: /^--(?:color-)?primary[-_](?:bg|background|color|main|500|600)$/i, score: 80 },
  { re: /^--(?:color-)?accent$/i, score: 75 },
  { re: /^--(?:color-)?accent[-_]/i, score: 65 },
  { re: /^--(?:color-)?cta(?:[-_]bg)?$/i, score: 60 },
  { re: /^--color-(?:indigo|purple|violet|blue|red|green|orange|pink|teal|cyan|magenta|coral)$/i, score: 35 },
];

function scoreTokenName(name) {
  for (const { re, score } of TOKEN_BRAND_PATTERNS) {
    if (re.test(name)) return score;
  }
  return 0;
}

// Recognize hex literals in custom-property values. Skip color-mix(),
// rgba(), gradients — the var-trace stage already resolves chains
// elsewhere, and we want the *originally declared* hex for brand-identity
// reasoning. A token like `--color-brand-bg-hover:
// color-mix(...,--color-brand-bg,...)` should not contribute its own hex.
function extractDirectHex(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})\b/i.exec(trimmed);
  if (!m) return null;
  let h = m[1].toLowerCase();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length === 8) return null; // skip translucent — same rule as opaque-only roles
  return `#${h}`;
}

// Names that signal "this token holds the page/canvas background." Used
// for theme detection — match a theme's bg token against the canvas we
// picked from probe evidence. The theme whose bg matches is the
// rendered theme; we prefer brand tokens from that theme.
const CANVAS_TOKEN_NAMES = [
  '--color-bg-primary',
  '--color-bg',
  '--color-page-bg',
  '--color-background',
  '--color-canvas',
  '--background',
  '--bg',
  '--canvas',
  '--page-bg',
];

function detectActiveTheme(themes, canvasHex) {
  if (!themes || !canvasHex) return null;
  const canvas = canvasHex.toLowerCase();
  for (const [themeName, themeData] of Object.entries(themes)) {
    const props = themeData?.customProperties || {};
    for (const tokenName of CANVAS_TOKEN_NAMES) {
      const t = props[tokenName];
      if (!t) continue;
      const hex = extractDirectHex(t.value);
      if (hex && hex.toLowerCase() === canvas) return themeName;
    }
  }
  return null;
}

// Build per-hex evidence from CSS custom properties. Returns
//   Map<hex, { hex, score, tokens: [{ name, score, theme }], saturated }>
// where score is the sum of name-scores for all tokens that resolve to
// this hex. Multiple semantic names pointing at one hex stack confidence.
//
// When `themes` (raw .themes structure) and `activeTheme` are provided,
// brand tokens declared in the active theme score 1.5× — this resolves
// the case where a multi-theme site declares `--color-brand-bg` with
// different hexes per theme. Without theme-awareness, last-write-wins
// flattening picks an arbitrary theme's value; with it, we pick the
// theme that actually rendered on the harvested page.
function extractBrandColorTokens({ tokenIndex, themes, activeTheme } = {}) {
  const byHex = new Map();

  const ingest = (name, value, themeName) => {
    const nameScore = scoreTokenName(name);
    if (nameScore <= 0) return;
    const hex = extractDirectHex(value);
    if (!hex) return;
    if (!isOpaque(hex)) return;
    const themeMultiplier = (activeTheme && themeName === activeTheme) ? 1.5 : 1.0;
    const score = nameScore * themeMultiplier;
    if (!byHex.has(hex)) byHex.set(hex, { hex, score: 0, tokens: [], saturated: saturation(hex) >= 0.3 });
    const entry = byHex.get(hex);
    entry.score += score;
    entry.tokens.push({ name, score, theme: themeName || null });
  };

  if (themes) {
    for (const [themeName, themeData] of Object.entries(themes)) {
      const props = themeData?.customProperties || {};
      for (const [name, info] of Object.entries(props)) {
        ingest(name, info?.value, themeName);
      }
    }
  } else if (tokenIndex) {
    // Back-compat path — flat tokenIndex, no theme info.
    for (const [name, info] of Object.entries(tokenIndex)) {
      ingest(name, info?.value, null);
    }
  }
  return byHex;
}

// Mint a usage-shaped record for a hex that exists in tokens but never
// landed on a probed DOM element. Downstream code reads .hex / .varRefs /
// .evidence; supply a stable shape so component classification and
// receipts UIs don't have to special-case token-only colors.
function synthesizeTokenUsage(brandEntry) {
  return {
    hex: brandEntry.hex,
    count: 0,
    weightedArea: 0,
    byProperty: { 'background-color': 0, 'color': 0, 'border': 0 },
    byTag: {},
    varRefs: brandEntry.tokens.map((t) => t.name),
    evidence: brandEntry.tokens.map((t) => ({ source: 'token', tokenName: t.name, nameScore: t.score })),
    likelyButtonBg: 0,
    likelyTextOnText: 0,
    likelySurfaceBg: 0,
    fromTokens: true,
  };
}

export function assignColorRoles(usage, options = {}) {
  const { tokenIndex = null, themes = null } = options;
  const roles = {};
  const used = new Set();

  // canvas: largest weighted-area background, preferring body/html owners
  const canvas = pickByMax(usage, (e) => {
    let s = e.byProperty['background-color'] * e.weightedArea;
    if (e.byTag['BODY']) s *= 4;
    if (e.byTag['HTML']) s *= 4;
    if (e.byTag['MAIN']) s *= 2;
    return s;
  });
  if (canvas) {
    roles.canvas = canvas;
    used.add(canvas.hex);
  }

  // primary, pass 1 — token evidence. Mine CSS custom properties for
  // semantically-named brand colors. Pick the highest-scoring saturated
  // candidate that beats the contrast floor vs canvas. If the hex is not
  // already in probe usage, mint a synthetic entry so downstream code can
  // treat it uniformly. This path preempts frequency-ranking and is the
  // single fix that resolves the Linear-lavender bug: their
  // `--color-brand-bg: #5e6ad2` is declared but never reaches a probed
  // element, so probe evidence alone can never surface it.
  let primary = null;
  if (tokenIndex || themes) {
    const activeTheme = detectActiveTheme(themes, canvas?.hex || null);
    const brandTokens = extractBrandColorTokens({ tokenIndex, themes, activeTheme });
    let bestEntry = null;
    let bestScore = -Infinity;
    for (const entry of brandTokens.values()) {
      if (used.has(entry.hex)) continue;
      if (!entry.saturated) continue;
      if (canvas && contrastRatio(entry.hex, canvas.hex) < 3) continue;
      if (entry.score > bestScore) { bestScore = entry.score; bestEntry = entry; }
    }
    if (bestEntry) {
      const existing = usage.get(bestEntry.hex);
      const record = existing || synthesizeTokenUsage(bestEntry);
      record.brandTokenEvidence = bestEntry.tokens;
      record.brandTokenScore = bestEntry.score;
      record.activeTheme = activeTheme;
      if (!existing) usage.set(record.hex, record);
      primary = record;
    }
  }

  // primary, pass 2 — original heuristic. Largest button-bg score with ≥3:1
  // contrast vs canvas. Used when no token evidence qualified.
  if (!primary) {
    primary = pickByMax(usage, (e) => {
      if (e.likelyButtonBg <= 0) return -1;
      if (canvas && contrastRatio(e.hex, canvas.hex) < 3) return -1;
      return e.likelyButtonBg;
    }, used);
  }
  // Fallback: brand-accent heuristic. Prefers a color that's
  //   1) saturated (not gray/black/white)
  //   2) used across multiple distinct tag types (not just <a>, which would be the browser default link blue)
  //   3) covers significant weighted screen area
  if (!primary) {
    primary = pickByMax(usage, (e) => {
      if (isNeutral(e.hex)) return -1;
      if (canvas && contrastRatio(e.hex, canvas.hex) < 3) return -1;
      if (e.count < 3) return -1;
      const tagDiversity = Object.keys(e.byTag).length;
      // Penalize colors used only on anchors (default link blue artifact)
      const anchorOnly = tagDiversity === 1 && e.byTag['A'];
      if (anchorOnly) return -1;
      return saturation(e.hex) * tagDiversity * Math.sqrt(e.weightedArea);
    }, used);
  }
  if (primary) {
    roles.primary = primary;
    used.add(primary.hex);
  }

  // ink: most-used color across text-bearing probes, ≥4.5:1 vs canvas if we can
  const ink = pickByMax(usage, (e) => {
    let s = e.likelyTextOnText;
    if (canvas && contrastRatio(e.hex, canvas.hex) < 4.5) s *= 0.3;
    return s;
  }, used);
  if (ink) {
    roles.ink = ink;
    used.add(ink.hex);
  }

  // ink-muted: a NEUTRAL secondary text color — exclude saturated brand accents.
  // Only assign if there's a clean signal (≥3 usages, near-neutral, distinct from ink).
  const inkMuted = pickByMax(usage, (e) => {
    if (e.byProperty['color'] === 0) return -1;
    if (e.byProperty['color'] < 3) return -1;
    if (saturation(e.hex) > 0.25) return -1;
    if (canvas && contrastRatio(e.hex, canvas.hex) < 3) return -1;
    return e.byProperty['color'] * e.weightedArea;
  }, used);
  if (inkMuted) {
    roles['ink-muted'] = inkMuted;
    used.add(inkMuted.hex);
  }

  // on-primary: text color on probes whose bg is primary (computed elsewhere via classify)
  // Will be filled by component classifier — leave as a placeholder if a high-contrast white/black pair fits
  if (primary) {
    const black = '#000000';
    const white = '#ffffff';
    const cBlack = contrastRatio(primary.hex, black);
    const cWhite = contrastRatio(primary.hex, white);
    const better = cWhite >= cBlack ? white : black;
    roles['on-primary'] = {
      hex: better,
      synthesized: true,
      varRefs: [],
      evidence: [],
    };
  }

  // surface-1: card-like backgrounds distinct from canvas
  const surface = pickByMax(usage, (e) => {
    if (e.byProperty['background-color'] === 0) return -1;
    if (canvas && e.hex === canvas.hex) return -1;
    return e.likelySurfaceBg + e.byProperty['background-color'];
  }, used);
  if (surface) {
    roles['surface-1'] = surface;
    used.add(surface.hex);
  }

  // hairline: ONLY emit if the color is actually used as a border somewhere.
  // No bleed from text/bg fallbacks.
  const hairline = pickByMax(usage, (e) => {
    if (e.byProperty['border'] === 0) return -1;
    return e.byProperty['border'] * 10;
  }, used);
  if (hairline) {
    roles.hairline = hairline;
    used.add(hairline.hex);
  }

  return roles;
}
