import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { lint as designLint, DtcgEmitterHandler, TailwindEmitterHandler } from '@google/design.md/linter';

import { normalizeColor } from './extract/var-trace.js';
import { contrastRatio, passesAA } from './emit/contrast.js';
import { buildColorUsage, assignColorRoles } from './emit/color-roles.js';
import { buildTypographyScale } from './emit/typography-scale.js';
import { buildRoundedScale } from './emit/rounded-scale.js';
import { buildSpacingScale } from './emit/spacing-scale.js';
import { groupComponents, classifyProbe } from './emit/component-classify.js';
import { compositeOver, resolveProbeBaseBg, bindOrMintRole } from './emit/pseudo-state-roles.js';
import { createProvenance } from '../ai/provenance.js';
import { loadRoleNamingEnvelope } from '../ai/stages/role-naming.js';
import { loadCopyGenerationEnvelope } from '../ai/stages/copy-generation.js';
import { loadColorBlockEnvelope } from '../ai/stages/color-block-discovery.js';
import { loadVariantEnvelopes } from '../ai/stages/variant-recognition.js';
import { loadPseudoStateEnvelope } from '../ai/stages/pseudo-state-interpretation.js';
import { loadTypographySampleEnvelope } from '../ai/stages/typography-sample-copy.js';
import { loadDesignDecisionsEnvelope } from '../ai/stages/design-decisions.js';
import { extractMotion } from './extract/motion.js';
import { extractBreakpoints } from './extract/breakpoints.js';

// Component category inference (deterministic). Mirrors the categorical
// grouping getdesign.md uses ("Buttons", "Pricing Tabs", etc.) so a flat
// list of probe names becomes a navigable spec sheet.
// Each pattern matches the keyword as a hyphen- or word-bounded segment
// anywhere in the component name (so `feature-card` and `card-hero` both
// land in Cards). Order matters: first match wins.
const COMPONENT_CATEGORIES = [
  ['Buttons', /(^|-)(button|btn|cta)(\b|-|$)/i],
  ['Inputs & Forms', /(^|-)(input|field|select|textarea|form|checkbox|radio|toggle|switch)(\b|-|$)/i],
  ['Cards & Containers', /(^|-)(card|tile|panel|container|surface)(\b|-|$)/i],
  ['Header', /(^|-)(header|topbar|appbar|top-nav)(\b|-|$)/i],
  ['Footer', /(^|-)(footer|footnav)(\b|-|$)/i],
  ['Navigation', /(^|-)(nav|menu|tab|breadcrumb|sidebar|pagination)(\b|-|$)/i],
  ['Sections', /(^|-)(section|block|hero|color-block)(\b|-|$)/i],
  ['Badges & Tags', /(^|-)(badge|chip|pill|tag|label|status)(\b|-|$)/i],
  ['Alerts & Banners', /(^|-)(alert|toast|notification|banner|notice|callout)(\b|-|$)/i],
  ['Icons & Avatars', /(^|-)(avatar|icon|logo)(\b|-|$)/i],
  ['Typography', /(^|-)(heading|headline|title|text|subhead|paragraph|caption|eyebrow|link)(\b|-|$)/i],
];

function inferComponentCategory(name) {
  for (const [label, re] of COMPONENT_CATEGORIES) {
    if (re.test(name)) return label;
  }
  return 'Other';
}

const VARIANT_STATE_RE = /-(hover|focus|active|pressed|disabled|loading|selected|error|inverse|outline|ghost)(-\d+)?$/i;

function parentComponentName(name) {
  return name.replace(VARIANT_STATE_RE, '');
}

function variantStateLabel(name) {
  const m = VARIANT_STATE_RE.exec(name);
  if (!m) return null;
  const word = m[1].toLowerCase();
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// Render the per-component spec line — same shape as getdesign.md uses:
// "background `{colors.X}`, text `{colors.Y}`, type `{typography.Z}`,
// padding 10px 20px, rounded `{rounded.W}`."
function componentSpecLine(block) {
  if (!block) return '';
  const parts = [];
  const tk = (s) => (typeof s === 'string' ? s : '');
  // Wrap a value in backticks always when it's a token ref (`{…}`),
  // optional otherwise. `force` makes raw strings get backticks too
  // for fields that conventionally read better in code style.
  const fmt = (v, { force = false } = {}) => {
    const s = tk(v);
    if (!s) return '';
    const isToken = /^\{.+\}$/.test(s);
    return (isToken || force) ? `\`${s}\`` : s;
  };
  if (tk(block.backgroundColor)) parts.push(`background ${fmt(block.backgroundColor, { force: true })}`);
  if (tk(block.textColor)) parts.push(`text ${fmt(block.textColor, { force: true })}`);
  const typo = tk(block.typography) || tk(block.type);
  if (typo) parts.push(`type ${fmt(typo, { force: true })}`);
  if (tk(block.borderColor)) parts.push(`border ${fmt(block.borderColor, { force: true })}`);
  if (tk(block.padding)) parts.push(`padding ${fmt(block.padding)}`);
  if (tk(block.rounded)) parts.push(`rounded ${fmt(block.rounded, { force: true })}`);
  if (tk(block.gap)) parts.push(`gap ${fmt(block.gap)}`);
  if (tk(block.height)) parts.push(`height ${fmt(block.height)}`);
  if (tk(block.width)) parts.push(`width ${fmt(block.width)}`);
  if (block.opacity !== undefined && block.opacity !== null && block.opacity !== '') parts.push(`opacity ${block.opacity}`);
  if (tk(block.transitionsTo)) parts.push(`→ ${fmt(block.transitionsTo, { force: true })}`);
  return parts.length ? parts.join(', ') + '.' : '';
}

// Categorize a color token name into one of the four sections getdesign.md
// uses (Brand & Accent / Surface / Text / Semantic). First match wins.
const COLOR_CATEGORIES = [
  ['Brand & Accent', /^(primary|on-primary|accent|brand)(\b|-|$)/i],
  ['Text', /^(ink|inverse-ink|on-inverse|text|on-canvas|on-surface)(\b|-|$)/i],
  ['Surface', /^(canvas|inverse-canvas|surface|hairline|block|tile|panel|background|bg)(\b|-|$)/i],
  ['Semantic', /^(semantic|success|warning|error|danger|info|overlay|scrim|focus-ring|outline-ring)(\b|-|$)/i],
];

function inferColorCategory(name) {
  for (const [label, re] of COLOR_CATEGORIES) {
    if (re.test(name)) return label;
  }
  return 'Surface';
}

// Convert a kebab token name into a Title-Case display label
// (`block-lime` → "Block Lime", `on-primary` → "On Primary", `ink-muted`
// → "Ink Muted"). Used as a deterministic fallback when no AI display
// name is available.
function tokenToDisplayName(name) {
  return name
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

// Deterministic short rationale per color role — anchored to the role
// taxonomy our extractor emits. Used as a fallback when the AI role-naming
// envelope is absent. One sentence, mirroring the shape of getdesign.md
// blurbs without inventing specifics.
function deterministicColorRationale(name) {
  if (/^primary$/i.test(name)) return 'System primary; default for primary CTAs and headline emphasis.';
  if (/^on-primary$/i.test(name)) return 'Foreground on primary surfaces.';
  if (/^accent/i.test(name)) return 'Accent color reserved for promotional moments; use sparingly.';
  if (/^canvas$/i.test(name)) return 'Default page background.';
  if (/^inverse-canvas$/i.test(name)) return 'Inverse / dark canvas — used for footer, marquee, and inverted story sections.';
  if (/^surface-soft$/i.test(name)) return 'Off-white tile background used for tiles and feature illustrations on the canvas.';
  if (/^surface-1$/i.test(name)) return 'Subtle elevated surface — first tier above canvas.';
  if (/^surface-2$/i.test(name)) return 'Mid elevated surface — second tier above canvas.';
  if (/^surface-3$/i.test(name)) return 'Highest elevated surface — third tier above canvas.';
  if (/^surface-hover$/i.test(name)) return 'Hover-state surface for interactive controls.';
  if (/^hairline$/i.test(name)) return '1px borders on inputs, cards, and table dividers.';
  if (/^hairline-soft$/i.test(name)) return 'Subtler dividers — table row separators and footer column rules.';
  if (/^block-/i.test(name)) return 'Signature pastel section block; used for full-width brand-color story sections.';
  if (/^ink$/i.test(name)) return 'All headline, body, and caption type on light surfaces.';
  if (/^inverse-ink$/i.test(name)) return 'Type on inverse-canvas surfaces (footer, dark blocks).';
  if (/^ink-muted$/i.test(name)) return 'De-emphasized ink — body sub-copy, captions, secondary metadata.';
  if (/^ink-subtle$/i.test(name)) return 'Most-de-emphasized ink — placeholder, helper, and disabled type.';
  if (/^ink-hover$/i.test(name)) return 'Hover-state ink for interactive text.';
  if (/^ink-focus$/i.test(name)) return 'Focus-state ink for keyboard navigation.';
  if (/^semantic-success$/i.test(name)) return 'Success / confirmation glyph fill.';
  if (/^semantic-warning$/i.test(name)) return 'Warning / advisory glyph fill.';
  if (/^semantic-error$/i.test(name)) return 'Error / danger glyph fill.';
  if (/^semantic-info$/i.test(name)) return 'Informational glyph fill.';
  if (/^overlay/i.test(name)) return 'Overlay / scrim base color (translucency applied at render time).';
  // Numeric-suffixed tiers (surface-4, ink-hover-3, hairline-tertiary) reuse
  // the base role's description with a tier annotation, so coverage extends
  // beyond the canonical names.
  const tieredMatch = /^(.*?)-(strong|soft|tertiary|secondary|\d+)$/i.exec(name);
  if (tieredMatch) {
    const base = tieredMatch[1];
    const tier = tieredMatch[2].toLowerCase();
    const baseDesc = deterministicColorRationale(base);
    if (baseDesc) {
      const tierWord = /^\d+$/.test(tier) ? `tier ${tier}` : tier;
      return `${baseDesc.replace(/\.$/, '')} (${tierWord} variant).`;
    }
  }
  return null;
}

// Read the role-naming envelope (Phase 6.4) if it exists. Returns
// { name → { displayName, roleDescription, confidence } } keyed by the colors
// token name (without the 'colors.' prefix), or null if no envelope present.
function loadAiRoleNames(jobDir) {
  const env = loadRoleNamingEnvelope(jobDir);
  const items = env?.data?.roles;
  if (!Array.isArray(items)) return null;
  const out = {};
  for (const item of items) {
    if (!item || typeof item.tokenPath !== 'string') continue;
    const m = /^colors\.(.+)$/.exec(item.tokenPath);
    if (!m) continue;
    out[m[1]] = {
      displayName: item.displayName,
      roleDescription: item.roleDescription,
      confidence: typeof item.confidence === 'number' ? item.confidence : 0,
      modelId: env?.modelId || null,
    };
  }
  return Object.keys(out).length ? out : null;
}

// Read the copy-generation envelope (Phase 6.7) if it exists. Returns the
// payload shape ready for emit, plus modelId for receipts. Per-section
// blurbs are keyed by the canonical enum so the markdown emitter can lookup
// in O(1) when prepending. globalConfidence is exposed at the top so callers
// can short-circuit the whole AI emit when the model self-rates low.
function loadAiCopy(jobDir) {
  const env = loadCopyGenerationEnvelope(jobDir);
  const data = env?.data;
  if (!data || typeof data !== 'object') return null;
  const blurbsByEnum = {};
  for (const item of Array.isArray(data.sectionBlurbs) ? data.sectionBlurbs : []) {
    if (!item || typeof item.section !== 'string') continue;
    blurbsByEnum[item.section] = {
      blurb: item.blurb,
      confidence: typeof item.confidence === 'number' ? item.confidence : (data.globalConfidence ?? 0),
    };
  }
  return {
    brandThesis: typeof data.brandThesis === 'string' ? data.brandThesis : null,
    voiceProfile: Array.isArray(data.voiceProfile) ? data.voiceProfile : [],
    blurbsByEnum,
    globalConfidence: typeof data.globalConfidence === 'number' ? data.globalConfidence : 0,
    modelId: env?.modelId || null,
  };
}

const AI_CONFIDENCE_THRESHOLD = 0.7;

// Color-block discovery envelope (Phase 6.3) — surfaces pastel section
// backgrounds as block-* tokens. Returns { blocks: [...], modelId } or null.
// Each block contains { tokenName: 'block-lime', hex: '#cef33a',
// sectionSelector, viewports[], role, confidence }. Caller folds the high-
// confidence blocks into the role map so they show up in the Colors table
// alongside the deterministic palette.
function loadAiColorBlocks(jobDir) {
  const env = loadColorBlockEnvelope(jobDir);
  const items = env?.data?.blocks;
  if (!Array.isArray(items)) return null;
  const blocks = items
    .filter((b) => b && typeof b.tokenName === 'string' && typeof b.hex === 'string')
    .map((b) => ({
      tokenName: b.tokenName,
      hex: b.hex.toLowerCase(),
      sectionSelector: b.sectionSelector || null,
      viewports: Array.isArray(b.viewports) ? b.viewports : [],
      role: b.role || 'section-background',
      rationale: b.rationale || null,
      confidence: typeof b.confidence === 'number' ? b.confidence : 0,
    }));
  if (!blocks.length) return null;
  return { blocks, modelId: env?.modelId || null };
}

// Variant-recognition envelopes (Phase 6.5) — one per component family. Returns
// { byComponent: { 'button-primary': { description, variants: [...], modelId } } }
// or null. Each variant carries the canonical variantId enum slot, the
// brand-voice label, the source probeId, and a stateDescription.
function loadAiVariants(jobDir) {
  const envs = loadVariantEnvelopes(jobDir);
  if (!envs || !Object.keys(envs).length) return null;
  const byComponent = {};
  for (const [componentName, env] of Object.entries(envs)) {
    const data = env?.data;
    if (!data || !Array.isArray(data.variants)) continue;
    const variants = data.variants
      .filter((v) => v && typeof v.variantId === 'string' && typeof v.probeId === 'string')
      .map((v) => ({
        variantId: v.variantId,
        label: v.label || null,
        probeId: v.probeId,
        stateDescription: v.stateDescription || null,
        rationale: v.rationale || null,
        confidence: typeof v.confidence === 'number' ? v.confidence : 0,
      }));
    if (!variants.length) continue;
    byComponent[componentName] = {
      description: typeof data.componentDescription === 'string' ? data.componentDescription : null,
      variants,
      modelId: env?.modelId || null,
    };
  }
  return Object.keys(byComponent).length ? { byComponent } : null;
}

// Pseudo-state interpretation envelope (Phase 6.6) — classifies each diff as
// role-transition / transient-overlay / no-op. Returns a map keyed by
// `${probeId}|${pseudoState}` so the emitter can decide whether to surface
// the diff (role-transition) or skip / annotate it. Plus a global modelId
// for the receipts.
function loadAiPseudoStates(jobDir) {
  const env = loadPseudoStateEnvelope(jobDir);
  const items = env?.data?.interpretations;
  if (!Array.isArray(items) || !items.length) return null;
  const byKey = {};
  for (const it of items) {
    if (!it || typeof it.probeId !== 'string' || typeof it.pseudoState !== 'string') continue;
    byKey[`${it.probeId}|${it.pseudoState}`] = {
      interpretation: it.interpretation,
      transitionsTo: typeof it.transitionsTo === 'string' ? it.transitionsTo : null,
      rationale: it.rationale || null,
      confidence: typeof it.confidence === 'number' ? it.confidence : 0,
    };
  }
  return Object.keys(byKey).length ? { byKey, modelId: env?.modelId || null } : null;
}

// Typography sample-copy envelope (Phase 6.7b) — supplies on-brand sample text
// per typography token for the live-preview ladder. Returns map { name →
// { stepLabel, sampleText, confidence } } keyed by typography token name (no
// 'typography.' prefix), or null.
function loadAiTypographySamples(jobDir) {
  const env = loadTypographySampleEnvelope(jobDir);
  const items = env?.data?.samples;
  if (!Array.isArray(items) || !items.length) return null;
  const out = {};
  for (const item of items) {
    if (!item || typeof item.tokenPath !== 'string') continue;
    const m = /^typography\.(.+)$/.exec(item.tokenPath);
    if (!m) continue;
    out[m[1]] = {
      stepLabel: item.stepLabel || null,
      sampleText: item.sampleText || null,
      confidence: typeof item.confidence === 'number' ? item.confidence : 0,
      modelId: env?.modelId || null,
    };
  }
  return Object.keys(out).length ? out : null;
}

// Design-decisions envelope (Phase 7.0) — the axis getdesign.md doesn't
// compete on. Returns { decisions[], usageGuidance[], antiPatterns[], modelId }
// or null.
function loadAiDesignDecisions(jobDir) {
  const env = loadDesignDecisionsEnvelope(jobDir);
  const data = env?.data;
  if (!data || typeof data !== 'object') return null;
  return {
    decisions: Array.isArray(data.decisions) ? data.decisions : [],
    usageGuidance: Array.isArray(data.usageGuidance) ? data.usageGuidance : [],
    antiPatterns: Array.isArray(data.antiPatterns) ? data.antiPatterns : [],
    globalConfidence: typeof data.globalConfidence === 'number' ? data.globalConfidence : 0,
    modelId: env?.modelId || null,
  };
}

// Real-asset manifest (Phase 7.3) — fonts, logo, favicon downloaded next to
// the markdown. Returns { fonts[], logo, favicon } or null when absent.
function loadAssetsManifest(jobDir) {
  try {
    const p = path.join(jobDir, 'output', 'design-md', 'assets', 'manifest.json');
    if (!fs.existsSync(p)) return null;
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!data) return null;
    return {
      fonts: Array.isArray(data.fonts) ? data.fonts : [],
      logo: data.logo || null,
      favicon: data.favicon || null,
    };
  } catch { return null; }
}

// Brand-principles harvest (Phase 7.2) — real text scraped from the brand's
// own /design, /principles, /brand pages. Loaded deterministically; emitted
// even when the AI design-decisions stage fails. Returns { principles[] }
// or null when the file is missing/empty.
function loadBrandPrinciples(jobDir) {
  try {
    const p = path.join(jobDir, 'output', 'design-md', 'brand-principles.json');
    if (!fs.existsSync(p)) return null;
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!Array.isArray(data?.principles) || !data.principles.length) return null;
    return { principles: data.principles, sources: Array.isArray(data.sources) ? data.sources : [] };
  } catch { return null; }
}

function pxOrNull(value) {
  if (!value) return null;
  const m = /^([-\d.]+)px/.exec(String(value));
  if (!m) return null;
  return Math.round(parseFloat(m[1]));
}

function pickRoundedName(scale, px) {
  if (px == null || px === 0) return null;
  // Find exact match first; else nearest
  for (const [name, info] of Object.entries(scale)) {
    if (info.px === px) return name;
  }
  let best = null;
  let bestDiff = Infinity;
  for (const [name, info] of Object.entries(scale)) {
    const d = Math.abs(info.px - px);
    if (d < bestDiff) { best = name; bestDiff = d; }
  }
  return bestDiff <= 2 ? best : null;
}

function pickTypographyName(typeScale, family, sizePx, weight) {
  if (!family || sizePx == null) return null;
  for (const [name, info] of Object.entries(typeScale)) {
    if (info.family === family && info.sizePx === sizePx && info.weight === weight) return name;
  }
  // Loose match: family + nearest size
  let best = null;
  let bestDiff = Infinity;
  for (const [name, info] of Object.entries(typeScale)) {
    if (info.family !== family) continue;
    const d = Math.abs(info.sizePx - sizePx);
    if (d < bestDiff) { best = name; bestDiff = d; }
  }
  return bestDiff <= 2 ? best : null;
}

function colorRoleByHex(roles, hex) {
  for (const [name, info] of Object.entries(roles)) {
    if (info.hex === hex) return name;
  }
  return null;
}

// Build a sparse component block from a pseudo-state diff: only properties
// whose value changed, expressed as token refs where possible. Hover/focus
// backgrounds are commonly translucent overlays (rgba(255,255,255,0.05)) over
// a transparent base — we composite once over the resolved base bg so the
// resulting opaque pixel can bind to a real role. When the composite doesn't
// match an existing role within tolerance we mint a new one (`surface-hover`,
// etc.) so the variant has somewhere to point. Mutates `roles` when minting.
function buildPseudoStateBlock(diff, roles, roundedScale, intent, baseBgHex, canvasHex, inkHex) {
  const block = {};
  const refs = new Set();

  if (diff['background-color']) {
    const raw = normalizeColor(diff['background-color']);
    if (raw && raw !== 'transparent') {
      const opaque = compositeOver(raw, baseBgHex || canvasHex);
      if (opaque) {
        const role = bindOrMintRole(roles, opaque, { intent, kind: 'bg', canvasHex, inkHex });
        if (role) {
          block.backgroundColor = `{colors.${role}}`;
          refs.add(`colors.${role}`);
        }
      }
    }
  }
  if (diff['color']) {
    const raw = normalizeColor(diff['color']);
    if (raw && raw !== 'transparent') {
      // Foreground colors are almost always opaque; skip composite (compositeOver
      // returns the input opaque hex unchanged when alpha >= 1).
      const opaque = compositeOver(raw, baseBgHex || canvasHex);
      if (opaque) {
        const role = bindOrMintRole(roles, opaque, { intent, kind: 'fg', canvasHex, inkHex });
        if (role) {
          block.textColor = `{colors.${role}}`;
          refs.add(`colors.${role}`);
        }
      }
    }
  }
  // Border colors arrive as four separate properties (border-top-color, etc.)
  // when forcePseudoState diffs the computed style. If all four match, mint
  // the role into the palette so it appears in the Colors table; the design.md
  // component schema does NOT accept `borderColor` as a sub-token (lint warns),
  // so we don't attach it to the component block — the role binding alone
  // surfaces it without violating the schema.
  const borderHexes = [
    diff['border-top-color'],
    diff['border-right-color'],
    diff['border-bottom-color'],
    diff['border-left-color'],
  ].map((v) => v ? normalizeColor(v) : null);
  if (borderHexes.every((h) => h && h !== 'transparent') && borderHexes.every((h) => h === borderHexes[0])) {
    const opaque = compositeOver(borderHexes[0], baseBgHex || canvasHex);
    if (opaque) {
      const role = bindOrMintRole(roles, opaque, { intent, kind: 'border', canvasHex, inkHex });
      if (role) refs.add(`colors.${role}`);
    }
  }
  const rPx = pxOrNull(diff['border-radius']) ?? pxOrNull(diff['border-top-left-radius']);
  const rName = pickRoundedName(roundedScale, rPx);
  if (rName) {
    block.rounded = `{rounded.${rName}}`;
    refs.add(`rounded.${rName}`);
  }
  // Opacity is the most common hover signal that doesn't need a token.
  // Two guards: (a) skip values within 0.02 of 1 — those are font-rendering
  // artifacts, not design intent (and triggered a lint error: the linter
  // calls raw.match() and expects a string). (b) emit as string so the
  // YAML stays string-typed end-to-end.
  if (diff['opacity']) {
    const o = parseFloat(diff['opacity']);
    if (!Number.isNaN(o) && o >= 0 && o <= 0.98) {
      block.opacity = String(o);
    }
  }

  return { block, refs };
}

function buildComponentBlock(probe, roles, typeScale, roundedScale, allowedColorRoles) {
  const block = {};
  const refs = new Set();

  const bgHex = normalizeColor(probe.properties['background-color']?.value);
  const fgHex = normalizeColor(probe.properties['color']?.value);

  if (bgHex && bgHex !== 'transparent') {
    const role = colorRoleByHex(roles, bgHex);
    if (role && allowedColorRoles.has(role)) {
      block.backgroundColor = `{colors.${role}}`;
      refs.add(`colors.${role}`);
    }
  }
  if (fgHex && fgHex !== 'transparent') {
    const role = colorRoleByHex(roles, fgHex);
    if (role && allowedColorRoles.has(role)) {
      block.textColor = `{colors.${role}}`;
      refs.add(`colors.${role}`);
    }
  }

  const fam = (probe.properties['font-family']?.value || '').split(',')[0].trim().replace(/^["']|["']$/g, '');
  const sizePx = pxOrNull(probe.properties['font-size']?.value);
  const weight = probe.properties['font-weight']?.value;
  const w = weight ? Math.round(Number(weight) / 100) * 100 : null;
  const typoName = pickTypographyName(typeScale, fam, sizePx, w);
  if (typoName) {
    block.typography = `{typography.${typoName}}`;
    refs.add(`typography.${typoName}`);
  }

  const radiusPx = pxOrNull(probe.properties['border-top-left-radius']?.value)
    ?? pxOrNull(probe.properties['border-radius']?.value);
  const roundName = pickRoundedName(roundedScale, radiusPx);
  if (roundName) {
    block.rounded = `{rounded.${roundName}}`;
    refs.add(`rounded.${roundName}`);
  }

  // Padding shorthand
  const pt = pxOrNull(probe.properties['padding-top']?.value);
  const pr = pxOrNull(probe.properties['padding-right']?.value);
  const pb = pxOrNull(probe.properties['padding-bottom']?.value);
  const pl = pxOrNull(probe.properties['padding-left']?.value);
  if (pt != null || pr != null || pb != null || pl != null) {
    const t = pt ?? 0, r = pr ?? 0, b = pb ?? 0, l = pl ?? 0;
    if (t + r + b + l > 0) {
      let pad;
      if (t === r && r === b && b === l) pad = `${t}px`;
      else if (t === b && r === l) pad = `${t}px ${r}px`;
      else pad = `${t}px ${r}px ${b}px ${l}px`;
      block.padding = pad;
    }
  }

  // height for inputs/buttons (avoid for big surfaces)
  const heightPx = pxOrNull(probe.properties['height']?.value);
  if (heightPx && heightPx >= 24 && heightPx <= 120) {
    block.height = `${heightPx}px`;
  }

  return { block, refs };
}

function rolesToColorTable(roles, usedRoles) {
  const out = {};
  for (const name of usedRoles) {
    const info = roles[name];
    if (!info) continue;
    out[name] = info.hex;
  }
  return out;
}

function typoToTable(typeScale, used) {
  const out = {};
  for (const name of used) {
    const info = typeScale[name];
    if (!info) continue;
    const entry = {
      fontFamily: info.family,
      fontSize: `${info.sizePx}px`,
      fontWeight: info.weight,
    };
    if (info.lineHeight != null) entry.lineHeight = info.lineHeight;
    if (info.letterSpacing && info.letterSpacing !== 'normal') entry.letterSpacing = info.letterSpacing;
    out[name] = entry;
  }
  return out;
}

function roundedToTable(scale, used) {
  const out = {};
  for (const name of used) {
    const info = scale[name];
    if (!info) continue;
    out[name] = info.value;
  }
  return out;
}

function spacingToTable(scale, used) {
  const out = {};
  for (const name of used) {
    const info = scale[name];
    if (!info) continue;
    out[name] = info.value;
  }
  return out;
}

function pickSpacingName(scale, px) {
  if (px == null || px === 0) return null;
  for (const [name, info] of Object.entries(scale)) {
    if (info.px === px) return name;
  }
  return null;
}

function sectionMd(name, body) {
  return `## ${name}\n\n${body.trim()}\n\n`;
}

export function generateDesignMd(jobDir, options = {}) {
  const tokensPath = path.join(jobDir, 'output', 'design-md', 'tokens.json');
  const computedPath = path.join(jobDir, 'output', 'design-md', 'computed.json');
  if (!fs.existsSync(computedPath)) {
    throw new Error(`computed.json not found — run harvest.mjs first: ${computedPath}`);
  }
  const tokens = fs.existsSync(tokensPath) ? JSON.parse(fs.readFileSync(tokensPath, 'utf8')) : { themes: {} };
  const computed = JSON.parse(fs.readFileSync(computedPath, 'utf8'));

  // Build token index for var-ref enrichment (kept for evidence trail)
  const tokenIndex = {};
  for (const [theme, data] of Object.entries(tokens.themes || {})) {
    for (const [name, info] of Object.entries(data.customProperties || {})) {
      tokenIndex[name] = info;
    }
  }

  const usage = buildColorUsage(computed, tokenIndex);
  const roles = assignColorRoles(usage, { tokenIndex, themes: tokens.themes || null });
  const typeScale = buildTypographyScale(computed);
  const roundedScale = buildRoundedScale(computed);
  const spacingScale = buildSpacingScale(computed);
  const components = groupComponents(computed, roles);

  // Phase 7-extension: deterministic motion tokens + multi-viewport breakpoints.
  // Both are pure functions of the harvest — no AI, no allowlist needed.
  const motion = extractMotion(computed);
  let visualManifest = null;
  try {
    const idxP = path.join(jobDir, 'output', 'screenshots', 'index.json');
    if (fs.existsSync(idxP)) visualManifest = JSON.parse(fs.readFileSync(idxP, 'utf8'));
  } catch { /* ignore */ }
  const breakpoints = extractBreakpoints(visualManifest, computed);

  // ---------------------------------------------------------------------------
  // AI envelopes (Phase 6.3 / 6.5 / 6.6 / 6.7b). All four are optional — when
  // the orchestrator hasn't run, every loader returns null and emit falls back
  // to deterministic-only output. Loaded up-front so any phase below can
  // reference them.
  // ---------------------------------------------------------------------------
  const aiBlocks = loadAiColorBlocks(jobDir);
  const aiVariants = loadAiVariants(jobDir);
  const aiPseudo = loadAiPseudoStates(jobDir);
  const aiTypoSamples = loadAiTypographySamples(jobDir);
  const aiDecisions = loadAiDesignDecisions(jobDir);
  const brandPrinciples = loadBrandPrinciples(jobDir);
  const assetsManifest = loadAssetsManifest(jobDir);

  // Fold high-confidence block-* discoveries into the role map BEFORE
  // component blocks reference them. Block hexes always come from harvest
  // (validator allowlist), so adding them to roles preserves "no invented
  // tokens." Skip if a block's hex collides with an existing role hex —
  // deterministic role wins per CLAUDE.md hard rule #3.
  const aiBlockNames = new Set();
  if (aiBlocks) {
    const existingHexes = new Set(Object.values(roles).map((r) => (r.hex || '').toLowerCase()));
    for (const b of aiBlocks.blocks) {
      if (b.confidence < AI_CONFIDENCE_THRESHOLD) continue;
      if (existingHexes.has(b.hex)) continue; // deterministic wins
      if (roles[b.tokenName]) continue; // name collision, skip
      roles[b.tokenName] = {
        hex: b.hex,
        evidence: { source: 'llm-color-block-discovery', confidence: b.confidence },
        sectionSelector: b.sectionSelector,
        blockRole: b.role,
        blockViewports: b.viewports,
        rationale: b.rationale,
      };
      aiBlockNames.add(b.tokenName);
      existingHexes.add(b.hex);
    }
  }

  // Build component blocks first to know which tokens are actually referenced.
  const allowedColorRoles = new Set(Object.keys(roles));
  const componentBlocks = {};
  // pseudoBlockMeta: blockName → { probeId, state, componentName }. Lets the
  // pseudo-state interpretation pass (below) resolve a block back to the AI's
  // role-transition / transient-overlay classification by probeId+state.
  const pseudoBlockMeta = {};
  const usedColorRoles = new Set();
  const usedTypo = new Set();
  const usedRound = new Set();
  const usedSpacing = new Set();

  for (const [compName, group] of Object.entries(components)) {
    const { block, refs } = buildComponentBlock(group.probe, roles, typeScale, roundedScale, allowedColorRoles);
    if (Object.keys(block).length === 0) continue;

    // Contrast check: if backgroundColor + textColor pairing fails AA, drop textColor and fall back
    if (block.backgroundColor && block.textColor) {
      const bgRole = block.backgroundColor.replace(/^\{colors\.|\}$/g, '');
      const fgRole = block.textColor.replace(/^\{colors\.|\}$/g, '');
      const bg = roles[bgRole]?.hex;
      const fg = roles[fgRole]?.hex;
      if (bg && fg && !passesAA(bg, fg, false)) {
        delete block.textColor;
        refs.delete(`colors.${fgRole}`);
      }
    }

    componentBlocks[compName] = block;
    for (const ref of refs) {
      const [kind, name] = ref.split('.');
      if (kind === 'colors') usedColorRoles.add(name);
      else if (kind === 'typography') usedTypo.add(name);
      else if (kind === 'rounded') usedRound.add(name);
    }

    // Pseudo-state sibling blocks. A group can carry up to two distinct
    // hover/focus signatures (e.g. a quiet-wash variant and a bordered-icon
    // variant of the same button). The first goes to `${comp}-${state}`,
    // the second to `${comp}-${state}-2` — same role bindings, separate
    // YAML entry so the design system documents both patterns.
    const pseudoProbeList = (group.pseudoProbes && group.pseudoProbes.length)
      ? group.pseudoProbes
      : (group.pseudoProbe ? [group.pseudoProbe] : (group.probe?.pseudoStates ? [group.probe] : []));
    for (let pIdx = 0; pIdx < pseudoProbeList.length; pIdx++) {
      const pseudoSrc = pseudoProbeList[pIdx];
      const pseudo = pseudoSrc?.pseudoStates;
      if (!pseudo || typeof pseudo !== 'object') continue;
      const canvasHex = roles.canvas?.hex || null;
      const inkHex = roles.ink?.hex || null;
      const baseBgHex = resolveProbeBaseBg(pseudoSrc, canvasHex);
      const suffix = pIdx === 0 ? '' : `-${pIdx + 1}`;
      for (const state of ['hover', 'focus']) {
        const diff = pseudo[state];
        if (!diff || Object.keys(diff).length === 0) continue;
        const { block: pBlock, refs: pRefs } = buildPseudoStateBlock(diff, roles, roundedScale, state, baseBgHex, canvasHex, inkHex);
        if (Object.keys(pBlock).length === 0) continue;
        if (pBlock.backgroundColor && pBlock.textColor) {
          const bgRole = pBlock.backgroundColor.replace(/^\{colors\.|\}$/g, '');
          const fgRole = pBlock.textColor.replace(/^\{colors\.|\}$/g, '');
          const bgH = roles[bgRole]?.hex;
          const fgH = roles[fgRole]?.hex;
          if (bgH && fgH && !passesAA(bgH, fgH, false)) {
            delete pBlock.textColor;
            pRefs.delete(`colors.${fgRole}`);
          }
        }
        if (Object.keys(pBlock).length === 0) continue;
        const blockName = `${compName}-${state}${suffix}`;
        // Skip if a prior variant produced an identical block — happens when
        // hover and focus diffs are the same shape on the same probe.
        const existing = componentBlocks[`${compName}-${state}`];
        if (suffix && existing && JSON.stringify(existing) === JSON.stringify(pBlock)) continue;
        componentBlocks[blockName] = pBlock;
        if (pseudoSrc?.probeId != null) {
          pseudoBlockMeta[blockName] = {
            probeId: String(pseudoSrc.probeId),
            state,
            componentName: compName,
          };
        }
        for (const ref of pRefs) {
          const [kind, name] = ref.split('.');
          if (kind === 'colors') usedColorRoles.add(name);
          else if (kind === 'rounded') usedRound.add(name);
        }
      }
    }
  }

  // Apply AI pseudo-state interpretation (Phase 6.6). Drop blocks classified
  // as transient-overlay or no-op with high confidence — those are filter
  // artifacts (focus-visible flicker, opacity-only hover) that pollute the
  // public design system. role-transition blocks stay; the AI may also
  // suggest a transitionsTo token path for the receipts pass below.
  const pseudoBlockTransitions = {}; // blockName → tokenPath
  if (aiPseudo) {
    for (const [blockName, meta] of Object.entries(pseudoBlockMeta)) {
      const hit = aiPseudo.byKey[`${meta.probeId}|${meta.state}`];
      if (!hit) continue;
      if (hit.confidence < AI_CONFIDENCE_THRESHOLD) continue;
      if (hit.interpretation === 'no-op' || hit.interpretation === 'transient-overlay') {
        delete componentBlocks[blockName];
      } else if (hit.interpretation === 'role-transition' && hit.transitionsTo) {
        pseudoBlockTransitions[blockName] = hit.transitionsTo;
      }
    }
  }

  // Synthesize a canonical button-primary anchor if no probe matched one.
  // This guarantees primary + on-primary are referenced (satisfies missing-primary
  // and orphan-tokens rules), and seeds rounded/typography references so those
  // tables aren't empty when observable.
  if (!componentBlocks['button-primary'] && roles.primary && roles['on-primary']) {
    const block = {
      backgroundColor: '{colors.primary}',
      textColor: '{colors.on-primary}',
    };
    usedColorRoles.add('primary');
    usedColorRoles.add('on-primary');

    // Pick a button-ish typography (smallest body / explicit button cluster), fall back to body
    let typoName = Object.keys(typeScale).find((n) => n === 'button')
      || Object.keys(typeScale).find((n) => n === 'body')
      || Object.keys(typeScale).find((n) => /body/.test(n));
    if (typoName) {
      block.typography = `{typography.${typoName}}`;
      usedTypo.add(typoName);
    }

    // Pick the smallest non-full rounded as a sensible button radius (typically sm/md)
    const roundCandidates = Object.entries(roundedScale).filter(([n]) => n !== 'full');
    if (roundCandidates.length) {
      const pick = roundCandidates.find(([n]) => n === 'md') || roundCandidates[0];
      block.rounded = `{rounded.${pick[0]}}`;
      usedRound.add(pick[0]);
    }

    // Prefer a spacing-token reference when an observed value matches; otherwise
    // emit literal padding. Either way the block is valid; using a token also
    // satisfies the spacing-table referenced check.
    const padPx = 16;
    const spaceName = pickSpacingName(spacingScale, padPx)
      || pickSpacingName(spacingScale, 12)
      || pickSpacingName(spacingScale, 8);
    if (spaceName) {
      block.padding = `{spacing.${spaceName}}`;
      usedSpacing.add(spaceName);
    } else {
      block.padding = '8px 16px';
    }
    block.height = '40px';

    componentBlocks['button-primary'] = block;
  }

  // If primary or on-primary still aren't referenced (e.g., no roles found),
  // we'll fail the missing-primary lint — that's a "this site has no extractable
  // design system" signal, which is correct behavior.

  // --- Compose YAML ---
  // The copy-generation envelope (Phase 6.7) supplies brand-voice prose:
  // brandThesis replaces ds.description; voiceProfile + sectionBlurbs feed
  // the markdown body. Loaded before YAML compose so high-confidence AI
  // brandThesis lands in the YAML frontmatter instead of the templated
  // guessDescription stub.
  const aiCopy = loadAiCopy(jobDir);
  const aiCopyAccepted = aiCopy && aiCopy.globalConfidence >= AI_CONFIDENCE_THRESHOLD;

  const fallbackDescription = options.description || guessDescription(computed, roles, typeScale);
  const ds = {
    name: options.name || guessName(computed, jobDir),
    description: (aiCopyAccepted && aiCopy.brandThesis) ? aiCopy.brandThesis : fallbackDescription,
  };
  // Emit the full assigned palette, not just roles that components happened to
  // reference. The harvest surfaces these colors in real DOM probes, so they
  // ARE part of the documented design system — even if our component
  // classifier didn't bind a specific role yet. Filtering by usage produces
  // an artificially thin palette; downstream AI stages (role-naming, copy-
  // generation) want the full breadth to reason about.
  const allColorRoles = new Set([...Object.keys(roles), ...usedColorRoles]);
  const colorsTable = rolesToColorTable(roles, allColorRoles);
  if (Object.keys(colorsTable).length) ds.colors = colorsTable;

  const typoTable = typoToTable(typeScale, usedTypo);
  if (Object.keys(typoTable).length) ds.typography = typoTable;

  const roundTable = roundedToTable(roundedScale, usedRound);
  if (Object.keys(roundTable).length) ds.rounded = roundTable;

  const spacingTable = spacingToTable(spacingScale, usedSpacing);
  if (Object.keys(spacingTable).length) ds.spacing = spacingTable;

  if (Object.keys(componentBlocks).length) ds.components = componentBlocks;

  // ---------------------------------------------------------------------------
  // Provenance write path — the moat per CLAUDE.md hard rule #2.
  //
  // Every leaf claim that ends up in design.md gets a receipt. Today the
  // emitter is fully deterministic, so most stamps are 'harvest'. Slots that
  // future AI stages will own (displayName, roleDescription, sample copy) are
  // stamped 'fallback' now — when phases 6.4 / 6.7b ship, those entries get
  // overwritten with 'llm-*' source and the audit trail upgrades cleanly.
  //
  // Synthesized button-primary fields are stamped 'fallback' (we made them up
  // from defaults when no probe matched) — distinct from harvest so the
  // preview can visually distinguish "we measured this" from "we guessed."
  // ---------------------------------------------------------------------------
  const prov = createProvenance({
    jobId: computed.jobId || tokens.jobId || null,
  });

  // Track which component fields came from a real probe vs the synthesized
  // button-primary fallback above, so we can stamp accordingly.
  const synthesizedComponents = new Set();
  if (componentBlocks['button-primary'] && !components['button-primary']) {
    synthesizedComponents.add('button-primary');
  }

  // colors — stamp every emitted role, not just component-referenced ones
  // (otherwise the palette tokens we just expanded land in YAML but go
  // unsigned in the provenance receipts UI).
  const aiRoleNames = loadAiRoleNames(jobDir);
  const colorMeta = {};
  for (const name of allColorRoles) {
    const info = roles[name];
    if (!info) continue;
    // Skip block-* tokens here — they're stamped in the dedicated AI-blocks
    // loop below (color-block-discovery, not role-naming). Stamping them as
    // role-naming-fallback would clutter the receipts with bogus rows.
    if (aiBlockNames.has(name)) continue;
    prov.setHarvest(`colors.${name}.value`, { confidence: 1.0 });

    const aiHit = aiRoleNames?.[name];
    if (aiHit && aiHit.displayName && aiHit.roleDescription
        && aiHit.confidence >= AI_CONFIDENCE_THRESHOLD) {
      prov.setLLM(`colors.${name}.displayName`, { stage: 'role-naming', confidence: aiHit.confidence });
      prov.setLLM(`colors.${name}.roleDescription`, { stage: 'role-naming', confidence: aiHit.confidence });
      colorMeta[name] = {
        displayName: aiHit.displayName,
        roleDescription: aiHit.roleDescription,
        confidence: aiHit.confidence,
        source: 'llm-role-naming',
      };
    } else if (aiHit) {
      prov.setFallback(`colors.${name}.displayName`, {
        rationale: `llm-role-naming returned displayName="${aiHit.displayName}" with confidence ${aiHit.confidence} (< ${AI_CONFIDENCE_THRESHOLD}); downgraded to fallback.`,
      });
      prov.setFallback(`colors.${name}.roleDescription`, {
        rationale: `llm-role-naming returned a roleDescription with confidence ${aiHit.confidence} (< ${AI_CONFIDENCE_THRESHOLD}); downgraded to fallback.`,
      });
    } else {
      prov.setFallback(`colors.${name}.displayName`, {
        rationale: 'No AI naming available (key absent or stage skipped); deterministic role slug stands in for the display name.',
      });
      prov.setFallback(`colors.${name}.roleDescription`, {
        rationale: 'No AI naming available; canonical role description omitted.',
      });
    }
  }

  // typography
  for (const name of usedTypo) {
    const info = typeScale[name];
    if (!info) continue;
    if (info.family) prov.setHarvest(`typography.${name}.fontFamily`, { confidence: 1.0 });
    if (info.sizePx != null) prov.setHarvest(`typography.${name}.fontSize`, { confidence: 1.0 });
    if (info.weight != null) prov.setHarvest(`typography.${name}.fontWeight`, { confidence: 1.0 });
    if (info.lineHeight != null) prov.setHarvest(`typography.${name}.lineHeight`, { confidence: 1.0 });
    if (info.letterSpacing && info.letterSpacing !== 'normal') {
      prov.setHarvest(`typography.${name}.letterSpacing`, { confidence: 1.0 });
    }
    const sample = aiTypoSamples?.[name];
    if (sample?.sampleText && sample.confidence >= AI_CONFIDENCE_THRESHOLD) {
      prov.setLLM(`typography.${name}.sample`, {
        stage: 'typography-sample-copy',
        confidence: sample.confidence,
      });
    } else if (sample?.sampleText) {
      prov.setFallback(`typography.${name}.sample`, {
        rationale: `llm-typography-sample-copy returned sample with confidence ${sample.confidence} (< ${AI_CONFIDENCE_THRESHOLD}); downgraded.`,
      });
    } else {
      prov.setFallback(`typography.${name}.sample`, {
        rationale: 'No AI sample available (key absent or stage skipped); ladder uses canned sample text.',
      });
    }
  }

  // block-* color tokens minted by color-block-discovery: every emitted
  // block hex is from harvest (validator-enforced), so the value gets a
  // harvest stamp; the *labeling* (kebab name + role + section selector)
  // is the AI's contribution.
  for (const name of aiBlockNames) {
    const info = roles[name];
    if (!info) continue;
    const conf = info.evidence?.confidence ?? 0;
    prov.setHarvest(`colors.${name}.value`, { confidence: 1.0 });
    prov.setLLM(`colors.${name}.tokenName`, { stage: 'color-block-discovery', confidence: conf });
    prov.setLLM(`colors.${name}.role`, { stage: 'color-block-discovery', confidence: conf });
    if (info.sectionSelector) {
      prov.setLLM(`colors.${name}.sectionSelector`, { stage: 'color-block-discovery', confidence: conf });
    }
  }

  // Per-variant labels from variant-recognition (Phase 6.5). Stamps the
  // labels themselves; the underlying probe-derived properties were already
  // stamped by the components loop above (or will be — that loop runs after).
  if (aiVariants) {
    for (const [compName, info] of Object.entries(aiVariants.byComponent)) {
      for (const v of info.variants) {
        if (v.confidence >= AI_CONFIDENCE_THRESHOLD) {
          prov.setLLM(`components.${compName}.variants.${v.variantId}.label`, {
            stage: 'variant-recognition',
            confidence: v.confidence,
          });
          if (v.stateDescription) {
            prov.setLLM(`components.${compName}.variants.${v.variantId}.stateDescription`, {
              stage: 'variant-recognition',
              confidence: v.confidence,
            });
          }
        } else {
          prov.setFallback(`components.${compName}.variants.${v.variantId}.label`, {
            rationale: `llm-variant-recognition returned label='${v.label}' for ${v.variantId} with confidence ${v.confidence} (< ${AI_CONFIDENCE_THRESHOLD}); downgraded.`,
          });
        }
      }
    }
  }

  // Design-decisions provenance (Phase 7.0). One entry per accepted decision
  // and per usageGuidance row. The decisions section is high-confidence-only
  // by virtue of the gate in the emitter.
  if (aiDecisions) {
    aiDecisions.decisions.forEach((d, i) => {
      const conf = typeof d?.confidence === 'number' ? d.confidence : (aiDecisions.globalConfidence || 0.8);
      if (conf >= AI_CONFIDENCE_THRESHOLD) {
        prov.setLLM(`design-decisions.decisions[${i}].rationale`, {
          stage: 'design-decisions',
          confidence: conf,
        });
      }
    });
    aiDecisions.usageGuidance.forEach((g, i) => {
      const conf = typeof g?.confidence === 'number' ? g.confidence : (aiDecisions.globalConfidence || 0.8);
      if (conf >= AI_CONFIDENCE_THRESHOLD && g?.token) {
        prov.setLLM(`design-decisions.usageGuidance[${i}].when`, {
          stage: 'design-decisions',
          confidence: conf,
          tokenPath: g.token,
        });
      }
    });
  }

  // Pseudo-state classifications (Phase 6.6). Stamps each surfaced
  // role-transition with its transitionsTo; transient-overlay/no-op blocks
  // were already removed from componentBlocks above so they don't get a
  // receipt at all (which is correct — they're not in the design system).
  if (aiPseudo) {
    for (const [blockName, transitionsTo] of Object.entries(pseudoBlockTransitions)) {
      const meta = pseudoBlockMeta[blockName];
      if (!meta) continue;
      const hit = aiPseudo.byKey[`${meta.probeId}|${meta.state}`];
      if (!hit) continue;
      prov.setLLM(`components.${blockName}.transitionsTo`, {
        stage: 'pseudo-state-interpretation',
        confidence: hit.confidence,
      });
    }
  }

  // rounded
  for (const name of usedRound) {
    const info = roundedScale[name];
    if (!info) continue;
    prov.setHarvest(`rounded.${name}`, { confidence: 1.0 });
  }

  // spacing
  for (const name of usedSpacing) {
    const info = spacingScale[name];
    if (!info) continue;
    prov.setHarvest(`spacing.${name}`, { confidence: 1.0 });
  }

  // motion (Phase 7-extension) — deterministic, always confidence 1.0.
  if (motion?.durations) {
    for (const tier of ['fast', 'medium', 'slow']) {
      if (motion.durations[tier]) prov.setHarvest(`motion.${tier}`, { confidence: 1.0 });
    }
    for (const e of motion.easings || []) {
      prov.setHarvest(`motion.ease.${e.name}`, { confidence: 1.0 });
    }
  }

  // breakpoints (Phase 7-extension) — every per-viewport delta is harvested.
  if (breakpoints?.deltas?.length) {
    for (const d of breakpoints.deltas) {
      for (const ch of d.changes) {
        prov.setHarvest(`breakpoints.${d.probeId}.${ch.property}`, { confidence: 1.0 });
      }
    }
  }

  // components — every emitted field gets a receipt
  for (const [compName, block] of Object.entries(componentBlocks)) {
    const isSynth = synthesizedComponents.has(compName);
    const stampField = (field) => {
      const fieldPath = `components.${compName}.${field}`;
      if (isSynth) {
        prov.setFallback(fieldPath, {
          rationale: 'Synthesized button-primary anchor; no probe matched. Replace with measured values when a primary CTA is detected.',
        });
      } else {
        prov.setHarvest(fieldPath, { confidence: 1.0 });
      }
    };
    for (const field of Object.keys(block)) stampField(field);
  }

  // System-level metadata
  prov.setFallback('name', {
    rationale: 'Derived from sourceUrl host (deterministic guess). Will be overwritten by llm-copy-generation when AI stage ships.',
  });
  if (aiCopyAccepted && aiCopy.brandThesis) {
    prov.setLLM('description', { stage: 'copy-generation', confidence: aiCopy.globalConfidence });
  } else if (aiCopy && aiCopy.brandThesis) {
    prov.setFallback('description', {
      rationale: `llm-copy-generation returned brandThesis with globalConfidence ${aiCopy.globalConfidence} (< ${AI_CONFIDENCE_THRESHOLD}); downgraded to fallback.`,
    });
  } else {
    prov.setFallback('description', {
      rationale: 'No AI copy available (key absent or stage skipped); templated deterministic description stands in.',
    });
  }

  // Voice profile + section blurbs — only emitted on AI accept; otherwise
  // those design.md sections fall back to the existing deterministic copy
  // and pick up no provenance entry (the rows simply don't exist).
  if (aiCopyAccepted) {
    aiCopy.voiceProfile.forEach((item, i) => {
      if (item?.trait) prov.setLLM(`voice.profile.${i}.trait`, { stage: 'copy-generation', confidence: aiCopy.globalConfidence });
      if (item?.explanation) prov.setLLM(`voice.profile.${i}.explanation`, { stage: 'copy-generation', confidence: aiCopy.globalConfidence });
    });
    for (const [section, b] of Object.entries(aiCopy.blurbsByEnum)) {
      if (b.confidence >= AI_CONFIDENCE_THRESHOLD) {
        prov.setLLM(`sections.${section}.blurb`, { stage: 'copy-generation', confidence: b.confidence });
      } else {
        prov.setFallback(`sections.${section}.blurb`, {
          rationale: `llm-copy-generation returned a blurb for '${section}' with confidence ${b.confidence} (< ${AI_CONFIDENCE_THRESHOLD}); downgraded — section emits without an intro paragraph.`,
        });
      }
    }
  }

  const provenanceJson = prov.toJSON();

  const yamlText = YAML.stringify(ds, { lineWidth: 0 });

  // --- Compose Markdown ---
  // Helper: prepend a high-confidence section blurb in front of the
  // deterministic body. Low-confidence blurbs are dropped (a fallback
  // provenance row was already stamped above).
  const blurb = (sectionEnum) => {
    if (!aiCopyAccepted) return '';
    const b = aiCopy.blurbsByEnum[sectionEnum];
    if (!b || !b.blurb || b.confidence < AI_CONFIDENCE_THRESHOLD) return '';
    return b.blurb.trim() + '\n\n';
  };

  let md = '---\n' + yamlText + '---\n\n';
  md += `# ${ds.name}\n\n`;

  // Overview body: AI overview blurb if present (richer paragraph), else
  // brandThesis (in YAML description), else deterministic guessDescription.
  const overviewBody = aiCopyAccepted && aiCopy.blurbsByEnum.overview?.blurb
    && aiCopy.blurbsByEnum.overview.confidence >= AI_CONFIDENCE_THRESHOLD
    ? aiCopy.blurbsByEnum.overview.blurb
    : ds.description;
  md += sectionMd('Overview', overviewBody);

  // Voice section: emitted only when AI copy is accepted. Three to five
  // trait/explanation pairs from voiceProfile.
  if (aiCopyAccepted && aiCopy.voiceProfile.length) {
    const voiceLines = aiCopy.voiceProfile
      .filter((v) => v?.trait && v?.explanation)
      .map((v) => `- **${v.trait}** — ${v.explanation}`);
    if (voiceLines.length) {
      const lead = blurb('voice');
      md += sectionMd('Voice', lead + voiceLines.join('\n'));
    }
  }

  // aiBlockNames was populated above with the kebab token names that came
  // from color-block-discovery. Each row gets an annotation citing the
  // section role + the AI's rationale, so block-* tokens read distinctly
  // from generic palette roles in the rendered Colors section.
  // Render the Colors section as four subsections (Brand & Accent / Surface
  // / Text / Semantic) — same shape getdesign.md uses. Each row is
  // `**Display Name** ({colors.token}) — description`. AI display name +
  // description (Phase 6.4) take priority; deterministic fallback ensures
  // every row carries a rationale even with no AI envelope.
  let colorsBody;
  const colorEntries = Object.entries(colorsTable);
  if (colorEntries.length === 0) {
    colorsBody = '_No colors extracted._';
  } else {
    const renderRow = ([n, v]) => {
      const meta = colorMeta[n];
      const role = roles[n] || {};
      const isBlock = aiBlockNames.has(n);
      // Display name: AI-provided or Title-Case the token name.
      const displayName = (meta?.displayName) || tokenToDisplayName(n);
      // Description: AI-provided > role rationale (block) > deterministic.
      let description = '';
      if (meta?.roleDescription) description = meta.roleDescription;
      else if (isBlock) description = role.rationale
        || `Section block-tinted background classified as ${role.blockRole || 'section-background'}.`;
      else description = deterministicColorRationale(n) || '';
      const tail = description ? ` — ${description}` : '';
      return `- **${displayName}** (\`{colors.${n}}\`) \`${v}\`${tail}`;
    };
    const CATEGORY_ORDER = ['Brand & Accent', 'Surface', 'Text', 'Semantic'];
    const byCategory = new Map();
    for (const [n, v] of colorEntries) {
      const cat = inferColorCategory(n);
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat).push([n, v]);
    }
    const lines = [];
    for (const cat of CATEGORY_ORDER) {
      const rows = byCategory.get(cat);
      if (!rows?.length) continue;
      lines.push(`### ${cat}`);
      lines.push('');
      lines.push(rows.map(renderRow).join('\n'));
      lines.push('');
    }
    colorsBody = lines.join('\n').trim();
  }
  md += sectionMd('Colors', blurb('color-system') + colorsBody);
  // Typography: render as three subsections matching getdesign.md
  // (Font Family / Hierarchy / Principles). Hierarchy is a table with
  // size / weight / line-height / letter-spacing / use. AI typography
  // sample-copy (Phase 6.7b) when present supplies the "Use" column.
  let typographyBody;
  const typoEntries = Object.entries(typoTable);
  if (typoEntries.length === 0) {
    typographyBody = '_No typography extracted._';
  } else {
    const tlines = [];

    // Font Family — collect unique families and the weight axis observed
    // for each. The weight list is the strongest signal that the brand
    // uses a variable typeface vs a stepped weight family.
    const familiesMap = new Map();
    for (const [, t] of typoEntries) {
      const fam = (t.fontFamily || '').split(',')[0].trim().replace(/^["']|["']$/g, '');
      if (!fam) continue;
      if (!familiesMap.has(fam)) familiesMap.set(fam, { weights: new Set(), full: t.fontFamily });
      if (t.fontWeight !== undefined && t.fontWeight !== null && t.fontWeight !== '') {
        familiesMap.get(fam).weights.add(String(t.fontWeight));
      }
    }
    if (familiesMap.size) {
      tlines.push('### Font Family');
      tlines.push('');
      for (const [fam, info] of familiesMap) {
        const weights = [...info.weights].sort((a, b) => Number(a) - Number(b));
        const fallback = (info.full || '').split(',').slice(1).map((s) => s.trim()).filter(Boolean).join(', ');
        const tailParts = [];
        if (weights.length) tailParts.push(`weights ${weights.join(', ')}`);
        if (fallback) tailParts.push(`fallback \`${fallback}\``);
        const tail = tailParts.length ? ` — ${tailParts.join('; ')}` : '';
        tlines.push(`- **${fam}**${tail}`);
      }
      tlines.push('');
    }

    // Hierarchy — full table including line-height + letter-spacing.
    tlines.push('### Hierarchy');
    tlines.push('');
    tlines.push('| Token | Size | Weight | Line Height | Letter Spacing | Use |');
    tlines.push('|---|---|---|---|---|---|');
    for (const [n, t] of typoEntries) {
      const sample = aiTypoSamples?.[n];
      const use = (sample?.sampleText && sample.confidence >= AI_CONFIDENCE_THRESHOLD)
        ? sample.sampleText.replace(/\|/g, '\\|')
        : '—';
      const lh = (t.lineHeight === undefined || t.lineHeight === null || t.lineHeight === '') ? '—' : t.lineHeight;
      const ls = (t.letterSpacing === undefined || t.letterSpacing === null || t.letterSpacing === '') ? '0' : t.letterSpacing;
      tlines.push(`| \`{typography.${n}}\` | ${t.fontSize || '—'} | ${t.fontWeight ?? '—'} | ${lh} | ${ls} | ${use} |`);
    }
    tlines.push('');

    // Principles — observations derived from the actual harvested data.
    // Compare display vs body line-heights, weight spread, letter-spacing
    // spread. Each principle ships only when its evidence is present.
    const sizes = typoEntries.map(([, t]) => parseFloat(t.fontSize) || 0).filter((n) => n > 0);
    const weights = typoEntries
      .map(([, t]) => Number(t.fontWeight))
      .filter((n) => Number.isFinite(n) && n > 0);
    const lhs = typoEntries.map(([, t]) => parseFloat(t.lineHeight)).filter((n) => Number.isFinite(n) && n > 0);
    const lss = typoEntries.map(([, t]) => parseFloat(t.letterSpacing) || 0);
    const principles = [];
    if (sizes.length >= 3) {
      const max = Math.max(...sizes);
      const min = Math.min(...sizes);
      principles.push(`Type scale spans **${min}px → ${max}px** across ${typoEntries.length} role${typoEntries.length === 1 ? '' : 's'}.`);
    }
    if (weights.length >= 2) {
      const wsorted = [...new Set(weights)].sort((a, b) => a - b);
      if (wsorted.length >= 3) {
        principles.push(`Weight axis exercised at **${wsorted.join(', ')}** — modulating weight is a primary lever for hierarchy.`);
      }
    }
    if (lhs.length >= 2) {
      const lhMin = Math.min(...lhs);
      const lhMax = Math.max(...lhs);
      if (lhMax - lhMin > 0.15) {
        principles.push(`Tight line-heights on display (≈${lhMin}), generous on body (≈${lhMax}). The contrast reinforces that headlines are graphics and body copy is for reading.`);
      }
    }
    if (lss.length >= 2) {
      const lsMin = Math.min(...lss);
      const lsMax = Math.max(...lss);
      if (lsMin < -0.3) {
        principles.push(`Negative letter-spacing scales with size — display tightens to **${lsMin}px**, body stays near zero. Editorial-feeling display type without sacrificing readability.`);
      } else if (lsMax > 0.3) {
        principles.push(`Positive letter-spacing on small/uppercase eyebrows (up to **${lsMax}px**) — taxonomy vs reading copy.`);
      }
    }
    if (principles.length) {
      tlines.push('### Principles');
      tlines.push('');
      for (const p of principles) tlines.push(`- ${p}`);
      tlines.push('');
    }

    // Note on Font Substitutes — for known proprietary or paid families,
    // suggest open-source equivalents. Anchors the design.md to something
    // a developer can actually implement without a font license.
    const FONT_SUBSTITUTES = {
      figmasans: { sub: 'Inter', alt: 'Geist', kind: 'sans' },
      figmamono: { sub: 'JetBrains Mono', alt: 'Geist Mono', kind: 'mono' },
      'sohne-var': { sub: 'Inter', alt: 'Geist', kind: 'sans' },
      sohne: { sub: 'Inter', alt: 'Geist', kind: 'sans' },
      'sohne-mono': { sub: 'JetBrains Mono', alt: 'Geist Mono', kind: 'mono' },
      inter: null, // already open-source
      'gt walsheim': { sub: 'Manrope', alt: 'DM Sans', kind: 'sans' },
      'gt-walsheim': { sub: 'Manrope', alt: 'DM Sans', kind: 'sans' },
      circular: { sub: 'DM Sans', alt: 'Plus Jakarta Sans', kind: 'sans' },
      'sf pro display': { sub: 'Inter', alt: 'Geist', kind: 'sans' },
      'sf pro text': { sub: 'Inter', alt: 'Geist', kind: 'sans' },
      'sf mono': { sub: 'JetBrains Mono', alt: 'Geist Mono', kind: 'mono' },
      'helvetica neue': { sub: 'Inter', alt: 'Manrope', kind: 'sans' },
      helvetica: { sub: 'Inter', alt: 'Manrope', kind: 'sans' },
      monumentgrotesk: { sub: 'Manrope', alt: 'DM Sans', kind: 'sans' },
      'monument grotesk': { sub: 'Manrope', alt: 'DM Sans', kind: 'sans' },
      'soehne-buch': { sub: 'Inter', alt: 'Geist', kind: 'sans' },
      'inter-var': null,
    };
    const subs = [];
    for (const fam of familiesMap.keys()) {
      const info = FONT_SUBSTITUTES[fam.toLowerCase()];
      if (info === null) continue; // open-source already
      if (!info) continue; // unknown
      subs.push({ fam, ...info });
    }
    if (subs.length) {
      tlines.push('### Note on Font Substitutes');
      tlines.push('');
      const families = subs.map((s) => `\`${s.fam}\``).join(' / ');
      const sansSub = subs.find((s) => s.kind === 'sans');
      const monoSub = subs.find((s) => s.kind === 'mono');
      const parts = [];
      if (sansSub) parts.push(`**${sansSub.sub}** (or **${sansSub.alt}**) for the sans`);
      if (monoSub) parts.push(`**${monoSub.sub}** (or **${monoSub.alt}**) for the mono`);
      const body = `If implementing without access to ${families}, suitable open-source substitutes are ${parts.join(', and ')}. Variable-weight subs match the fine-grained weight axis these brands use; expect to manually adjust line-heights by ±0.02 to compensate for x-height differences.`;
      tlines.push(body);
      tlines.push('');
    }

    typographyBody = tlines.join('\n').trim();
  }
  md += sectionMd('Typography', blurb('typography') + typographyBody);
  // Layout: render a Spacing System sub-table + observed component-padding
  // facts + a deterministic Whitespace Philosophy paragraph. Same shape as
  // getdesign.md's Layout section, fed entirely by harvested data.
  let layoutBody;
  {
    const ll = [];
    // Show the full derived scale (not just the subset already wired into
    // components). The unused tokens still inform a designer about the rhythm
    // the brand uses across paddings/margins/gaps. Mark which are referenced
    // so the table doubles as a coverage view.
    const fullScale = Object.entries(spacingScale)
      .map(([name, info]) => ({ name, px: info.px, value: info.value }))
      .sort((a, b) => a.px - b.px);
    if (fullScale.length) {
      ll.push('### Spacing System');
      ll.push('');
      const px = fullScale.map((e) => e.px).filter((n) => Number.isFinite(n) && n > 0);
      if (px.length) {
        const gcd = (a, b) => (b ? gcd(b, a % b) : a);
        let base = px[0];
        for (let i = 1; i < px.length; i++) base = gcd(base, px[i]);
        if (base > 1) ll.push(`- **Base unit**: ${Math.round(base)}px (every emitted spacing token is a multiple).`);
      }
      ll.push('');
      ll.push('| Token | Value | Wired to components |');
      ll.push('|---|---|---|');
      const usedSet = new Set(Object.keys(spacingTable));
      for (const e of fullScale) {
        const wired = usedSet.has(e.name) ? 'yes' : '—';
        ll.push(`| \`{spacing.${e.name}}\` | ${e.value} | ${wired} |`);
      }
      ll.push('');
    }
    // Observed component padding — pull from componentBlocks where padding
    // is set. Useful when no explicit spacing scale was harvested.
    const paddings = Object.entries(componentBlocks)
      .filter(([, b]) => b && typeof b.padding === 'string' && b.padding)
      .slice(0, 6);
    if (paddings.length) {
      ll.push('### Component Padding (observed)');
      ll.push('');
      for (const [name, b] of paddings) {
        ll.push(`- \`{components.${name}}\` — ${b.padding}.`);
      }
      ll.push('');
    }
    // Grid & Container — derive max content width from breakpoints viewport
    // bounding when available; otherwise infer from harvested viewport.
    if (breakpoints?.viewports?.length) {
      ll.push('### Grid & Container');
      ll.push('');
      const desktop = breakpoints.viewports.find((v) => /desktop/i.test(v.name)) || breakpoints.viewports[breakpoints.viewports.length - 1];
      const mobile = breakpoints.viewports.find((v) => /mobile/i.test(v.name)) || breakpoints.viewports[0];
      const desktopW = desktop?.width;
      if (desktopW) {
        ll.push(`- Max content width sits around **${desktopW}px** at the desktop breakpoint — beyond which the layout stops growing and side gutters absorb extra width.`);
      }
      if (mobile?.width && desktop?.width && mobile.width !== desktop.width) {
        ll.push(`- Side gutters scale from desktop down to **${mobile.width}px** mobile; layout collapses to a single column at the smaller breakpoint.`);
      }
      ll.push('');
    }

    // Whitespace Philosophy — one deterministic paragraph derived from the
    // largest observed spacing token. If no large rhythm constant was
    // harvested, fall back to a generic statement.
    const rhythmPx = fullScale.map((e) => e.px).filter((n) => Number.isFinite(n));
    const maxRhythm = rhythmPx.length ? Math.max(...rhythmPx) : 0;
    ll.push('### Whitespace Philosophy');
    ll.push('');
    if (maxRhythm >= 64) {
      ll.push(`White space is a primary structural lever — major sections separate by ~**${maxRhythm}px** of breathing room, letting each block read as a deliberate poster rather than a wall of copy.`);
    } else {
      ll.push('Spacing rhythm derives from a small base unit; sections are distinguished by repeated multiples of the base rather than a single oversized rhythm constant.');
    }
    layoutBody = ll.join('\n').trim() || 'Layout principles derived from observed component spacing and grid behavior.';
  }
  md += sectionMd('Layout', blurb('spacing') + layoutBody);
  // Elevation & Depth: when a brand has block-* tokens, elevation is
  // expressed via color shifts rather than shadows. Note that explicitly
  // and add a Decorative Depth subsection enumerating the depth devices
  // we *can* observe (color blocks, dark inverse-canvas, etc.).
  {
    const blockTokensList = Object.keys(colorsTable).filter((n) => /^block-/.test(n));
    const hasInverseCanvas = !!colorsTable['inverse-canvas'];
    const el = [];
    if (blockTokensList.length) {
      el.push(`This brand expresses depth through **color blocks** rather than shadows. No \`box-shadow\` tokens were harvested — sections separate by transitioning between canvas and one of the \`{colors.block-*}\` tints.`);
      el.push('');
      el.push('### Decorative Depth');
      el.push('');
      el.push(`- **Color-block sections** are the primary depth device. The change from canvas to ${blockTokensList.slice(0, 3).map((n) => `\`{colors.${n}}\``).join(' / ')} is the section break.`);
      if (hasInverseCanvas) {
        el.push('- **Inverse-canvas surfaces** (footer, marquee strips, navy story blocks) introduce contrast through luminance rather than overlaid shadow.');
      }
      el.push('- Elevation is **flat and saturated**, not soft and shadowed — typical card stacks read as collage rather than physical layering.');
    } else {
      el.push('No `box-shadow` tokens harvested from probes on this site. If the brand uses elevation, it isn\'t reaching the elements we sample — re-harvest with extended probe selectors to surface it.');
    }
    md += sectionMd('Elevation & Depth', el.join('\n'));
  }

  // Shapes: convert flat rounded list into a Border Radius Scale table
  // with a deterministic Use column anchored to canonical token names.
  const roundUseDescription = (n, v) => {
    const px = parseFloat(v);
    if (/^xs$/i.test(n) || (px >= 1 && px <= 3)) return 'Anchor / link decoration corners.';
    if (/^sm$/i.test(n) || (px >= 4 && px <= 7)) return 'Small chips, sub-nav tabs.';
    if (/^md$/i.test(n) || (px >= 8 && px <= 16)) return 'Form inputs, list items, image frames.';
    if (/^lg$/i.test(n) || (px >= 17 && px <= 28)) return 'Pricing cards, container sections, large image frames.';
    if (/^xl$/i.test(n) || (px >= 29 && px <= 60)) return 'Hero feature panels, oversized callouts.';
    if (/^2xl$/i.test(n) || (px >= 60 && px <= 120)) return 'Color-block sections, full-width feature surfaces.';
    if (/^pill$/i.test(n) || (px >= 40 && px <= 200)) return 'Pill buttons, tab toggles.';
    if (/^full$/i.test(n) || px >= 999) return 'Circular icon buttons, avatar shapes.';
    return '—';
  };
  let shapesBody;
  if (Object.keys(roundTable).length) {
    const sl = [];
    sl.push('### Border Radius Scale');
    sl.push('');
    sl.push('| Token | Value | Use |');
    sl.push('|---|---|---|');
    for (const [n, v] of Object.entries(roundTable)) {
      sl.push(`| \`{rounded.${n}}\` | ${v} | ${roundUseDescription(n, v)} |`);
    }
    sl.push('');

    // Photography & Illustration Geometry — derive observations from the
    // rounded scale + observed component patterns. Pick the "image radius"
    // as the smallest md/lg-tier value (typical image-frame range 8-16px),
    // falling back to the median radius. Each observation ships only when
    // its evidence is present.
    const obs = [];
    const roundedEntries = Object.entries(roundTable)
      .map(([n, v]) => ({ name: n, px: parseFloat(v) || 0 }))
      .filter((r) => r.px > 0);
    const imageFrame = roundedEntries.find((r) => r.px >= 6 && r.px <= 16)
      || roundedEntries.find((r) => r.px >= 17 && r.px <= 24);
    if (imageFrame) {
      obs.push(`Image frames use \`{rounded.${imageFrame.name}}\` (${imageFrame.px}px) — generous enough to feel friendly, conservative enough to read as editorial.`);
    }
    const stickyRadius = roundedEntries.find((r) => r.px >= 2 && r.px <= 6);
    if (stickyRadius && imageFrame && stickyRadius.name !== imageFrame.name) {
      obs.push(`Smaller decorative tiles preserve a \`{rounded.${stickyRadius.name}}\` corner for elements that should read as physical objects (badges, sticky notes).`);
    }
    const fullRound = roundedEntries.find((r) => r.px >= 999);
    if (fullRound) {
      obs.push(`Circular icon containers use \`{rounded.${fullRound.name}}\` — reserved for icon-button surfaces and status glyphs, not photographic frames.`);
    }
    // Avatar-shape observation derived from component naming.
    const hasAvatar = Object.keys(componentBlocks).some((n) => /avatar/i.test(n));
    if (!hasAvatar) {
      obs.push('No avatar circles appear in marketing surfaces — the brand avoids personification on its public-facing pages.');
    }
    if (obs.length) {
      sl.push('### Photography & Illustration Geometry');
      sl.push('');
      for (const o of obs) sl.push(`- ${o}`);
    }

    shapesBody = sl.join('\n').trim();
  } else {
    shapesBody = '_No rounding tokens extracted._';
  }
  md += sectionMd('Shapes', shapesBody);
  // Components: emit a categorized spec sheet (Buttons / Inputs / Cards / …)
  // with per-component CSS spec lines referencing tokens — the same shape
  // getdesign.md uses. Variants nest under their parent component. AI variant
  // descriptions (Phase 6.5) layer on top when available; the deterministic
  // category + spec line is the floor.
  let componentsBody;
  const compNames = Object.keys(componentBlocks);
  if (compNames.length) {
    // Group: parent → [variants...]
    const parentToChildren = new Map();
    const standalone = [];
    for (const name of compNames) {
      const parent = parentComponentName(name);
      if (parent !== name) {
        if (!parentToChildren.has(parent)) parentToChildren.set(parent, []);
        parentToChildren.get(parent).push(name);
      } else {
        standalone.push(name);
      }
    }
    // Variants whose parent isn't in componentBlocks become standalone too.
    for (const [parent, kids] of parentToChildren) {
      if (!componentBlocks[parent]) {
        standalone.push(parent);
        // Promote first child's block so the parent has a spec line. The
        // remaining children stay nested under the synthesized parent.
        if (!componentBlocks[parent]) componentBlocks[parent] = componentBlocks[kids[0]];
      }
    }

    // Bucket parents by category, preserving stable category order.
    const byCategory = new Map();
    for (const compName of standalone) {
      const cat = inferComponentCategory(compName);
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat).push(compName);
    }
    const CATEGORY_ORDER = [
      'Buttons', 'Inputs & Forms', 'Cards & Containers', 'Navigation',
      'Header', 'Footer', 'Sections', 'Badges & Tags', 'Alerts & Banners',
      'Icons & Avatars', 'Typography', 'Other',
    ];

    const aiByComp = (aiVariants?.byComponent) || {};
    const lines = [];
    for (const cat of CATEGORY_ORDER) {
      const comps = byCategory.get(cat);
      if (!comps?.length) continue;
      lines.push(`### ${cat}`);
      lines.push('');
      for (const compName of comps) {
        const block = componentBlocks[compName];
        const aiInfo = aiByComp[compName];
        const description = aiInfo?.description ? ` — ${aiInfo.description}` : '';
        lines.push(`**\`${compName}\`**${description}`);
        const spec = componentSpecLine(block);
        if (spec) lines.push(`- ${spec}`);
        // Nested variants — merge children that share a state label
        // (e.g. `-hover` + `-hover-2`) so we emit one row per state rather
        // than duplicate Hover lines.
        const kids = parentToChildren.get(compName) || [];
        const byState = new Map();
        for (const childName of kids) {
          const stateLabel = variantStateLabel(childName) || 'Variant';
          if (!byState.has(stateLabel)) byState.set(stateLabel, { merged: {}, ids: [] });
          const slot = byState.get(stateLabel);
          slot.ids.push(childName);
          const cb = componentBlocks[childName] || {};
          for (const [k, v] of Object.entries(cb)) {
            if (slot.merged[k] === undefined && v !== undefined && v !== null && v !== '') {
              slot.merged[k] = v;
            }
          }
        }
        const stateOrder = ['Hover', 'Focus', 'Active', 'Pressed', 'Selected', 'Disabled', 'Inverse', 'Variant'];
        const orderedStates = [...byState.keys()].sort(
          (a, b) => stateOrder.indexOf(a) - stateOrder.indexOf(b),
        );
        for (const stateLabel of orderedStates) {
          const slot = byState.get(stateLabel);
          const aiVariant = (aiInfo?.variants || [])
            .find((v) => slot.ids.includes(v.variantId));
          const aiSuffix = aiVariant?.stateDescription ? ` — ${aiVariant.stateDescription}` : '';
          const childSpec = componentSpecLine(slot.merged);
          lines.push(`  - **${stateLabel}**${aiSuffix}${childSpec ? `: ${childSpec}` : ''}`);
        }
        lines.push('');
      }
    }
    componentsBody = lines.join('\n').trim();
  } else {
    componentsBody = '_No components classified._';
  }
  md += sectionMd('Components', blurb('components') + componentsBody);

  // Motion (Phase 7-extension) — deterministic axis getdesign.md doesn't surface.
  // Renders the duration tier table + observed easings. Skipped when no
  // transition/animation declarations were harvested.
  if (motion && (motion.durations.fast || motion.durations.medium || motion.durations.slow)) {
    const ml = [];
    ml.push('| Tier | Duration | Probes |');
    ml.push('|---|---|---|');
    for (const tier of ['fast', 'medium', 'slow']) {
      const t = motion.durations[tier];
      if (!t) continue;
      ml.push(`| \`motion.${tier}\` | ${t.ms}ms | ${t.sourceCount} |`);
    }
    if (motion.easings.length) {
      ml.push('');
      ml.push('### Easings');
      ml.push('');
      ml.push('| Token | Curve | Probes |');
      ml.push('|---|---|---|');
      for (const e of motion.easings) {
        ml.push(`| \`motion.ease.${e.name}\` | \`${e.value}\` | ${e.sourceCount} |`);
      }
    }
    if (motion.samples.length) {
      // Dedupe by signature — multiple probes often share the same transition
      // declaration; rendering "background at 160ms ease-out" four times in
      // a row is noise, not signal.
      const seen = new Set();
      const sampleLines = [];
      for (const s of motion.samples) {
        const props = s.properties.length ? s.properties.slice(0, 2).join(' + ') : 'animation';
        const sig = `${props}@${s.durationMs}${s.easing || ''}`;
        if (seen.has(sig)) continue;
        seen.add(sig);
        sampleLines.push(`${props} at ${s.durationMs}ms${s.easing ? ` ${s.easing}` : ''}`);
        if (sampleLines.length >= 4) break;
      }
      if (sampleLines.length) {
        ml.push('');
        ml.push('Sample transitions observed: ' + sampleLines.join('; ') + '.');
      }
    }
    md += sectionMd('Motion', ml.join('\n'));
  }

  // Design decisions (Phase 7.0) — the axis getdesign.md doesn't compete on.
  // Three blocks: decisions (rationale), usageGuidance (when/don't), antiPatterns.
  if (aiDecisions
      && (aiDecisions.decisions.length || aiDecisions.usageGuidance.length || aiDecisions.antiPatterns.length)
      && (aiDecisions.globalConfidence === 0 || aiDecisions.globalConfidence >= AI_CONFIDENCE_THRESHOLD)) {
    const dl = [];
    if (aiDecisions.decisions.length) {
      for (const d of aiDecisions.decisions) {
        if (typeof d?.confidence === 'number' && d.confidence < AI_CONFIDENCE_THRESHOLD) continue;
        dl.push(`### ${d.topic}`);
        dl.push('');
        dl.push(d.rationale);
        if (d.evidence) dl.push(`\n_Evidence: ${d.evidence}_`);
        dl.push('');
      }
    }
    if (aiDecisions.usageGuidance.length) {
      dl.push('### Token usage guidance');
      dl.push('');
      dl.push('| Token | Use when | Don\'t use for |');
      dl.push('|---|---|---|');
      for (const g of aiDecisions.usageGuidance) {
        if (typeof g?.confidence === 'number' && g.confidence < AI_CONFIDENCE_THRESHOLD) continue;
        const tk = `\`{${g.token}}\``;
        const when = String(g.when || '').replace(/\|/g, '\\|');
        const dont = String(g.dontUseFor || '').replace(/\|/g, '\\|');
        dl.push(`| ${tk} | ${when} | ${dont} |`);
      }
      dl.push('');
    }
    if (aiDecisions.antiPatterns.length) {
      dl.push('### Anti-patterns');
      dl.push('');
      for (const ap of aiDecisions.antiPatterns) {
        dl.push(`- **${ap.pattern}** — ${ap.why}`);
      }
      dl.push('');
    }
    md += sectionMd('Design decisions', dl.join('\n'));
  }

  // Real assets (Phase 7.3) — emit ## Assets when fonts/logo/favicon were
  // downloaded. Differentiator over getdesign.md: a developer can use these
  // files immediately. Paths are relative to the design.md (assets/...).
  if (assetsManifest && (assetsManifest.fonts.length || assetsManifest.logo || assetsManifest.favicon)) {
    const al = [];
    if (assetsManifest.logo) {
      al.push('### Logo');
      al.push('');
      const dim = assetsManifest.logo.width && assetsManifest.logo.height
        ? `${assetsManifest.logo.width}×${assetsManifest.logo.height}`
        : 'inline svg';
      const src = assetsManifest.logo.sourceUrl ? ` (source: ${assetsManifest.logo.sourceUrl})` : '';
      al.push(`Saved at \`${assetsManifest.logo.path}\` — ${dim}${src}.`);
      al.push('');
      prov.setHarvest('assets.logo', { confidence: 1.0 });
    }
    if (assetsManifest.favicon) {
      al.push('### Favicon');
      al.push('');
      al.push(`Saved at \`${assetsManifest.favicon.path}\` (source: ${assetsManifest.favicon.sourceUrl}).`);
      al.push('');
      prov.setHarvest('assets.favicon', { confidence: 1.0 });
    }
    if (assetsManifest.fonts.length) {
      al.push('### Fonts');
      al.push('');
      al.push('Downloaded next to this file — drop the `assets/fonts/` directory into your project to use them directly.');
      al.push('');
      al.push('| Family | Weight | Style | File | Source |');
      al.push('|---|---|---|---|---|');
      for (const f of assetsManifest.fonts) {
        const fam = String(f.family || '').replace(/\|/g, '\\|');
        const w = String(f.weight || '').replace(/\|/g, '\\|');
        const sty = String(f.style || '').replace(/\|/g, '\\|');
        al.push(`| ${fam} | ${w} | ${sty} | \`${f.path}\` | ${f.sourceUrl} |`);
      }
      al.push('');
      for (let i = 0; i < assetsManifest.fonts.length; i++) {
        prov.setHarvest(`assets.fonts[${i}]`, { confidence: 1.0 });
      }
    }
    md += sectionMd('Assets', al.join('\n'));
  }

  // Brand-stated principles (Phase 7.2) — verbatim text from the brand's own
  // /design /principles /brand pages. Emitted unconditionally when present;
  // this is *their* words, not LLM speculation. getdesign.md doesn't surface
  // this. Provenance is `harvest` (deterministic), confidence = 1.0.
  if (brandPrinciples && brandPrinciples.principles.length) {
    const bl = [];
    bl.push('Quoted from the brand\'s own published design / principles / brand pages — not interpreted, not paraphrased.');
    bl.push('');
    for (let i = 0; i < brandPrinciples.principles.length; i++) {
      const p = brandPrinciples.principles[i];
      bl.push(`### ${p.heading}`);
      bl.push('');
      bl.push(p.body);
      if (p.source?.url) bl.push(`\n_Source: ${p.source.url}_`);
      bl.push('');
      const slot = `brandPrinciples[${i}]`;
      prov.setHarvest(`${slot}.heading`, { confidence: 1.0 });
      prov.setHarvest(`${slot}.body`, { confidence: 1.0 });
    }
    md += sectionMd('Brand principles', bl.join('\n'));

    // Voice — deterministic analysis of the brand's own published copy.
    // Reuses brand-principles bodies as the corpus (real first-party text,
    // not site chrome). Emits 3–5 observation lines with concrete numbers
    // so a designer or copywriter can pattern-match the tone. getdesign.md
    // doesn't surface this — it's a clean differentiator.
    const corpus = brandPrinciples.principles
      .map((p) => `${p.heading}. ${p.body}`)
      .join(' ');
    const sentences = corpus
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 4);
    const words = corpus.match(/\b[a-zA-Z][a-zA-Z'-]*\b/g) || [];
    if (sentences.length >= 3 && words.length >= 30) {
      const vl = [];
      const avgWords = Math.round(words.length / sentences.length);
      let lengthNote;
      if (avgWords <= 10) lengthNote = 'short and punchy — every line lands a single idea, ad-style.';
      else if (avgWords <= 16) lengthNote = 'medium-cadence — long enough to make an argument, short enough to read aloud without losing the reader.';
      else if (avgWords <= 24) lengthNote = 'expository — sentences earn their length by stacking a claim with the reasoning behind it.';
      else lengthNote = 'long-form — paragraphs over headlines; the brand is willing to spend the reader\'s attention.';
      vl.push(`- Sentences average **${avgWords} words** — ${lengthNote}`);

      const youCount = (corpus.match(/\b(you|your|you're|you've|you'll)\b/gi) || []).length;
      const weCount = (corpus.match(/\b(we|our|us)\b/gi) || []).length;
      const brandFirstPerson = weCount > youCount * 1.2;
      const readerFirstPerson = youCount > weCount * 1.2;
      if (brandFirstPerson) {
        vl.push(`- First-person plural dominates ("we", "our" — **${weCount}** mentions vs **${youCount}** "you" mentions): the brand speaks **as itself**, narrating intent rather than addressing the reader directly.`);
      } else if (readerFirstPerson) {
        vl.push(`- Second-person dominates ("you", "your" — **${youCount}** mentions vs **${weCount}** "we" mentions): the copy speaks **at the reader**, framing every claim around what they get.`);
      } else if (youCount + weCount >= 3) {
        vl.push(`- Mixed pronoun stance — **${weCount}** "we"/"our" + **${youCount}** "you"/"your": the brand alternates between stating its own intent and addressing the reader.`);
      } else {
        vl.push(`- Pronoun-light copy — fewer than ${weCount + youCount + 1} "we"/"you" mentions across ${sentences.length} sentences. Tone is **descriptive**, not conversational.`);
      }

      const IMPERATIVE_OPENERS = /^(build|bring|create|design|make|start|try|use|launch|ship|join|get|see|watch|explore|discover|meet|learn|find|introduce|share|collaborate|iterate|customize|connect)\b/i;
      const imperativeOpens = sentences.filter((s) => IMPERATIVE_OPENERS.test(s)).length;
      const imperativeRatio = imperativeOpens / sentences.length;
      if (imperativeRatio >= 0.3) {
        vl.push(`- **${imperativeOpens} of ${sentences.length}** sentences open with an imperative verb (Build, Bring, Create, Make…). The voice is **action-leading** — the reader is invited to do something on almost every beat.`);
      } else if (imperativeOpens >= 1) {
        vl.push(`- ${imperativeOpens} of ${sentences.length} sentences open with an imperative verb. Most beats are descriptive; commands appear sparingly for emphasis.`);
      } else {
        vl.push(`- No sentences open with an imperative verb. Every beat is **descriptive** — the brand explains what it does rather than telling the reader what to do.`);
      }

      const exclaim = (corpus.match(/!/g) || []).length;
      const question = (corpus.match(/\?/g) || []).length;
      if (exclaim + question === 0) {
        vl.push('- Zero exclamation marks, zero questions across the corpus — the register is **measured and confident**, never breathless or interrogative.');
      } else {
        vl.push(`- **${exclaim}** exclamation mark(s), **${question}** question(s) — punctuation is ${exclaim > 0 ? 'occasionally emphatic' : 'measured'}${question > 0 ? '; rhetorical questions invite the reader in' : ''}.`);
      }

      // Lexicon: most-frequent ≥ 6-letter content word, excluding generic.
      const STOP = new Set(['design','design.','design,','figma','figma.','linear','stripe','notion','brand','company','product','platform','users','people','teams','others','great','better','simply']);
      const freq = new Map();
      for (const w of words) {
        const lc = w.toLowerCase();
        if (lc.length < 6) continue;
        if (STOP.has(lc)) continue;
        freq.set(lc, (freq.get(lc) || 0) + 1);
      }
      const topLex = [...freq.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (topLex.length >= 2) {
        vl.push(`- Lexicon hot-spots (used ≥ 2× in the brand-principles corpus): ${topLex.map(([w, n]) => `**${w}** (×${n})`).join(', ')}. Re-use these words in adjacent product copy and the voice will read continuous with the published brand.`);
      }

      md += sectionMd('Voice', `Deterministic analysis of the brand's own published copy from the **Brand principles** sources above. Numbers reflect the actual harvested corpus, not interpretation.\n\n${vl.join('\n')}`);
      prov.setHarvest('voice', { confidence: 0.95 });
    }
  }

  // Do's and Don'ts: brand-specific guidance derived from the actual
  // harvested data. Each rule ships only when its evidence is present —
  // we don't emit "use block-* family" advice on a site without block
  // tokens. Compared to the previous two-line generic stub, this gives
  // a designer real prescriptive guidance per token taxonomy.
  // (Token-derived facts hoisted so the Iteration Guide below can reuse them.)
  const hasPrimary = !!colorsTable.primary;
  const blockTokens = Object.keys(colorsTable).filter((n) => /^block-/.test(n));
  const accentTokens = Object.keys(colorsTable).filter((n) => /^accent-/.test(n));
  const hasInk = !!colorsTable.ink;
  const hasInkMuted = !!colorsTable['ink-muted'] || !!colorsTable['ink-subtle'];
  const roundedNames = new Set(Object.keys(roundTable));
  const pillToken = roundedNames.has('pill') ? 'pill' : (roundedNames.has('full') ? 'full' : null);
  const compNamesSet = new Set(Object.keys(componentBlocks));
  const hasPrimaryComp = [...compNamesSet].some((n) => /^button-primary$/.test(n));
  const hasSecondaryComp = [...compNamesSet].some((n) => /^button-secondary$/.test(n));
  const typoFamilies = new Set();
  const allWeights = new Set();
  for (const [, t] of Object.entries(typoTable)) {
    const fam = (t.fontFamily || '').split(',')[0].trim().replace(/^["']|["']$/g, '');
    if (fam) typoFamilies.add(fam);
    if (t.fontWeight !== undefined && t.fontWeight !== null && t.fontWeight !== '') {
      allWeights.add(String(t.fontWeight));
    }
  }
  const primaryFamily = [...typoFamilies][0];
  const weightAxis = [...allWeights].sort((a, b) => Number(a) - Number(b));
  const sortedRounded = Object.entries(roundTable)
    .map(([n, v]) => [n, parseFloat(v) || 0])
    .sort((a, b) => b[1] - a[1]);
  const largestRounded = sortedRounded[0]?.[0];
  {
    const dos = [];
    const donts = [];

    // Do rules
    if (hasPrimary) {
      dos.push('Reserve `{colors.primary}` for genuine primary CTAs and selected states. Don\'t use it as a decorative accent.');
    }
    if (blockTokens.length && largestRounded) {
      dos.push(`When introducing a story section, choose **one** color block from the \`{colors.block-*}\` family (${blockTokens.length} available) and let it span full content width with \`{rounded.${largestRounded}}\` corners.`);
    }
    if (primaryFamily && weightAxis.length >= 2) {
      dos.push(`Keep type in \`${primaryFamily}\` at variable weights — pick from ${weightAxis.join(', ')} to express hierarchy.`);
    }
    if (pillToken) {
      dos.push(`Compose every CTA as a pill (\`{rounded.${pillToken}}\`)${roundedNames.has('full') ? ' and every icon button as a circle (`{rounded.full}`)' : ''}.`);
    }
    if (blockTokens.length >= 2 && colorsTable.canvas) {
      dos.push('Allow the page to **return to canvas** between every two color blocks so each block reads as deliberate.');
    }
    if (hasPrimaryComp && hasSecondaryComp) {
      dos.push('Pair `{components.button-primary}` and `{components.button-secondary}` whenever a section needs both a primary action and a secondary action — the contrast pair is the brand signature.');
    }

    // Don't rules
    if (hasInk && !hasInkMuted) {
      donts.push('Don\'t introduce mid-gray text. Body hierarchy comes from weight, not from opacity.');
    } else if (hasInkMuted && weightAxis.length >= 3) {
      donts.push('Don\'t reach for opacity to soften body type — the documented muted ink token plus weight modulation already covers de-emphasis.');
    }
    if (blockTokens.length) {
      donts.push('Don\'t add drop shadows to color-block sections — the color is the depth device.');
      donts.push(`Don\'t introduce new accent colors outside the documented \`{colors.block-*}\` palette${accentTokens.length ? ' and accent tokens' : ''}.`);
    } else {
      donts.push('Don\'t introduce new color roles outside the documented palette without updating this file.');
    }
    if (blockTokens.length >= 2) {
      donts.push('Don\'t combine more than one color block visible inside a single viewport — let canvas separate them.');
    }
    if (pillToken) {
      donts.push('Don\'t square off CTAs. Sharp-corner buttons read as a different brand.');
    }
    // Always-on hygiene rule.
    donts.push('Don\'t hardcode hex values in product code — reference tokens via `{colors.*}` / `{typography.*}` so the system stays the single source of truth.');

    const dndLines = [];
    if (dos.length) {
      dndLines.push('### Do');
      dndLines.push('');
      for (const d of dos) dndLines.push(`- ${d}`);
      dndLines.push('');
    }
    if (donts.length) {
      dndLines.push('### Don\'t');
      dndLines.push('');
      for (const d of donts) dndLines.push(`- ${d}`);
    }
    md += sectionMd("Do's and Don'ts", dndLines.join('\n'));
  }
  // Responsive blurb: report the actual harvest viewport(s) and page count.
  // Earlier this section was hardcoded to "1280×800" and called per-breakpoint
  // behavior "deferred to Phase 5" — both stale once multi-page crawl shipped.
  const vpW = computed.viewport?.width;
  const vpH = computed.viewport?.height;
  const vpStr = (vpW && vpH) ? `${vpW}×${vpH}` : 'single viewport';
  const pageCount = Array.isArray(computed.pages) ? computed.pages.length : 1;
  const pageStr = pageCount > 1 ? `${pageCount} pages crawled` : 'home page only';

  // Responsive Behavior — single section with subsections matching the shape
  // of getdesign.md: ### Breakpoints / ### Touch Targets / ### Collapsing
  // Strategy. Each subsection emits only when its evidence is present.
  {
    const rb = [];
    rb.push(`Harvest taken at ${vpStr} (${pageStr}).`);
    rb.push('');

    // ### Breakpoints — full per-viewport deltas table when multi-viewport
    // metrics were sampled, otherwise a short note explaining what's missing.
    rb.push('### Breakpoints');
    rb.push('');
    if (breakpoints?.deltas?.length) {
      const vps = breakpoints.viewports.map((v) => `${v.name} ${v.width}px`).join(' / ');
      rb.push(`Per-viewport probe metrics captured at ${vps}. Properties whose computed value differs across viewports surface here.`);
      rb.push('');
      rb.push('| Element | Property | Mobile | Tablet | Desktop |');
      rb.push('|---|---|---|---|---|');
      const top = breakpoints.deltas.slice(0, 8);
      for (const d of top) {
        const label = d.selector
          ? `\`${String(d.selector).replace(/\|/g, '\\|').slice(0, 48)}\``
          : `\`${d.tagName || d.probeId}\``;
        for (const ch of d.changes) {
          const m = ch.byViewport.mobile;
          const t = ch.byViewport.tablet;
          const dk = ch.byViewport.desktop;
          const fmtCell = (x) => (x == null ? '—' : (typeof x === 'number' ? `${Math.round(x)}` : String(x)));
          rb.push(`| ${label} | \`${ch.property}\` | ${fmtCell(m)} | ${fmtCell(t)} | ${fmtCell(dk)} |`);
        }
      }
      if (breakpoints.deltas.length > top.length) {
        rb.push('');
        rb.push(`_${breakpoints.deltas.length - top.length} additional probe(s) shift across viewports — see \`output/screenshots/index.json\` per-viewport metrics for the full set._`);
      }
      rb.push('');
      rb.push(`_Stats: ${breakpoints.stats.probesWithChange}/${breakpoints.stats.totalProbes} probes shift across viewports; ${breakpoints.stats.propertiesObserved} distinct properties affected._`);
    } else {
      rb.push('Per-breakpoint scales — phone/tablet/desktop variants — were not sampled in this run; re-harvest with a multi-viewport probe pass to populate token-level deltas.');
    }
    rb.push('');

    // ### Touch Targets — derived from observed button / input heights in
    // componentBlocks. We classify by component-name regex into pill/icon/
    // input families and report the observed pixel heights so designers can
    // see if the brand respects the 44px tap-target convention.
    const touchEntries = [];
    for (const [name, b] of Object.entries(componentBlocks)) {
      if (!b || typeof b.height !== 'string') continue;
      const px = parseInt(b.height, 10);
      if (!Number.isFinite(px) || px < 24 || px > 96) continue;
      let family = null;
      if (/icon/i.test(name)) family = 'Icon button';
      else if (/^button/i.test(name)) family = 'Pill / pill-tab button';
      else if (/(input|field|search|select)/i.test(name)) family = 'Form input';
      else if (/avatar/i.test(name)) family = 'Avatar';
      else continue;
      touchEntries.push({ family, name, px });
    }
    if (touchEntries.length) {
      // Group by family, take max height per family (the resting/comfortable size).
      const byFamily = new Map();
      for (const t of touchEntries) {
        const prev = byFamily.get(t.family);
        if (!prev || t.px > prev.px) byFamily.set(t.family, t);
      }
      rb.push('### Touch Targets');
      rb.push('');
      const familyOrder = ['Pill / pill-tab button', 'Icon button', 'Form input', 'Avatar'];
      for (const f of familyOrder) {
        const entry = byFamily.get(f);
        if (!entry) continue;
        const meets = entry.px >= 44;
        const note = meets
          ? 'meets the 44px iOS / 48dp Android tap-target minimum'
          : entry.px >= 40
            ? 'sits between 40–44px — safe on desktop, tight on touch; bump to 44px+ when porting to mobile'
            : 'falls below the 44px tap-target minimum — only safe inside dense desktop tooling, not for primary touch flows';
        rb.push(`- **${f}** — \`{components.${entry.name}}\` resting height **${entry.px}px**, ${note}.`);
      }
      rb.push('');
    }

    // ### Collapsing Strategy — derived from breakpoints viewport set + any
    // grid/columns observations in the harvest. We emit declarative rules
    // anchored to the brand's actual sampled viewport widths so the guidance
    // matches what the harvest saw rather than asserting generic breakpoints.
    if (breakpoints?.viewports?.length >= 2) {
      const sorted = [...breakpoints.viewports].sort((a, b) => a.width - b.width);
      const mobile = sorted[0];
      const tablet = sorted.length >= 3 ? sorted[1] : null;
      const desktop = sorted[sorted.length - 1];
      rb.push('### Collapsing Strategy');
      rb.push('');
      const navHasItems = Object.keys(componentBlocks).some((n) => /nav|menu|header/i.test(n));
      if (navHasItems) {
        rb.push(`- Below ~${mobile.width}px, multi-item top-nav collapses to a hamburger / drawer pattern — the inline links don't fit alongside logo + CTAs at narrower widths.`);
      }
      if (tablet) {
        rb.push(`- Multi-column grids (pricing tiers, feature cards, customer logos) step down through the **${desktop.width}px → ${tablet.width}px → ${mobile.width}px** viewport set: 4-up at desktop typically becomes 2-up at tablet and 1-up (stacked) on mobile.`);
      } else {
        rb.push(`- Multi-column grids step down between **${desktop.width}px** and **${mobile.width}px**: side-by-side layouts collapse to single-column stacks once content can't sit at comfortable widths.`);
      }
      const padNames = Object.keys(componentBlocks).filter((n) => /(card|section|hero|cta-banner)/i.test(n));
      if (padNames.length) {
        rb.push(`- Section padding (\`${padNames.slice(0, 2).map((n) => `{components.${n}}`).join('`, `')}\`) shrinks proportionally below the tablet breakpoint — mobile uses tighter horizontal gutters so content edges don't dominate the viewport.`);
      }
      const hasFooter = Object.keys(componentBlocks).some((n) => /footer/i.test(n));
      if (hasFooter) {
        rb.push(`- Footer column groups stack vertically below ~${mobile.width}px; on wider viewports they sit side-by-side with consistent inter-group spacing.`);
      }
      rb.push('');
    }

    // ### Image Behavior — derived from the asset manifest. We can speak
    // to logo and favicon scaling characteristics (vector vs bitmap) and
    // call out illustration-bearing components by name. We deliberately
    // don't speculate on lazy-loading or rotation animations — those
    // require runtime evidence we don't capture in the still harvest.
    if (assetsManifest && (assetsManifest.logo || assetsManifest.favicon)) {
      const ib = [];
      if (assetsManifest.logo) {
        const ext = String(assetsManifest.logo.path || '').toLowerCase().split('.').pop();
        const isVector = ext === 'svg';
        const dim = assetsManifest.logo.width && assetsManifest.logo.height
          ? `${assetsManifest.logo.width}×${assetsManifest.logo.height}`
          : 'inline-svg sized by container';
        if (isVector) {
          ib.push(`- **Logo** ships as SVG (\`${assetsManifest.logo.path}\`, ${dim}) — scales lossless across every breakpoint, no @1x/@2x asset swaps required.`);
        } else {
          ib.push(`- **Logo** ships as a bitmap (\`${assetsManifest.logo.path}\`, ${dim}) — supply @2x / @3x variants when porting to higher-DPR contexts.`);
        }
      }
      if (assetsManifest.favicon) {
        const fext = String(assetsManifest.favicon.path || '').toLowerCase().split('.').pop();
        ib.push(`- **Favicon** is \`${fext.toUpperCase()}\` (\`${assetsManifest.favicon.path}\`) — keep the on-page logo and the favicon visually anchored to the same wordmark so the browser-tab silhouette reads as the brand.`);
      }
      const illustrationComps = Object.keys(componentBlocks).filter((n) => /(illustration|hero|template|thumbnail|preview|product)/i.test(n));
      if (illustrationComps.length) {
        ib.push(`- Illustration-bearing surfaces (\`${illustrationComps.slice(0, 3).map((n) => `{components.${n}}`).join('`, `')}\`) inherit container width — supply art that crops gracefully from desktop down to mobile rather than depending on fixed pixel dimensions.`);
      }
      if (ib.length) {
        rb.push('### Image Behavior');
        rb.push('');
        for (const line of ib) rb.push(line);
        rb.push('');
      }
    }

    md += sectionMd('Responsive Behavior', rb.join('\n').replace(/\n+$/, ''));
  }
  // Iteration Guide: numbered checklist for designers extending the
  // system. Mirrors getdesign.md's shape (token-referenced, prescriptive)
  // with steps anchored to actual tokens emitted in this design.md.
  {
    const ig = [];
    let i = 1;
    ig.push(`${i++}. Focus on ONE component at a time and reference it by its \`components:\` token name (e.g., ${[...compNamesSet].slice(0, 2).map((n) => `\`{components.${n}}\``).join(', ') || '`{components.button-primary}`'}).`);
    if (blockTokens.length) {
      ig.push(`${i++}. When introducing a new section, decide **first** which \`{colors.block-*}\` token it sits on; the surface choice is the most consequential decision.`);
    }
    const bodyToken = Object.keys(typoTable).find((n) => /^body$/i.test(n))
      || Object.keys(typoTable).find((n) => /body/i.test(n));
    const headlineToken = Object.keys(typoTable).find((n) => /^(headline|display)/i.test(n));
    if (bodyToken) {
      ig.push(`${i++}. Default body type to \`{typography.${bodyToken}}\`${headlineToken ? `; reach for \`{typography.${headlineToken}}\` only inside a story section or hero block` : ''}.`);
    }
    ig.push(`${i++}. Run \`npx @google/design.md lint DESIGN.md\` after edits — \`broken-ref\`, \`contrast-ratio\`, and \`orphaned-tokens\` warnings flag issues automatically.`);
    ig.push(`${i++}. Add new variants as separate component entries (\`-hover\`, \`-focus\`, \`-pressed\`, \`-selected\`) — do not bury them in prose.`);
    if (hasPrimary) {
      ig.push(`${i++}. Keep \`{colors.primary}\` scarce. If two primary actions appear in the same viewport, the section is doing too much — neutralize one to a secondary variant.`);
    }
    if (accentTokens.length) {
      ig.push(`${i++}. Treat \`${accentTokens.map((n) => `{colors.${n}}`).join(', ')}\` as single-shot accents — one promo CTA per page, never two.`);
    }
    ig.push(`${i++}. Re-run the design-md job for a fresh extraction, or regenerate from an existing harvest with \`node src/design-md/generate.mjs <jobId>\`.`);
    md += sectionMd('Iteration Guide', ig.join('\n'));
  }
  // Known Gaps — content-aware. Only flag pseudo-states as a gap if we
  // emitted zero hover/focus variants; otherwise we'd contradict the
  // Components list right above. Same idea for shadow tokens.
  const componentNames = Object.keys(componentBlocks);
  const hasPseudoVariants = componentNames.some((n) => /-(hover|focus|active|pressed)(-|$)/.test(n));
  const gaps = [];
  if (!hasPseudoVariants) {
    gaps.push("- Pseudo-states (`:hover`, `:focus`) not surfaced on probed components.");
  }
  gaps.push("- Elevation / box-shadow tokens not emitted (no shadow evidence on probed elements).");
  if (pageCount <= 1) {
    gaps.push("- Single-page harvest — secondary pages (pricing, product, etc.) not crawled.");
  }
  gaps.push("- Single-viewport snapshot — responsive scales pending.");
  md += sectionMd('Known Gaps', gaps.join('\n'));

  // --- Lint + Tailwind + DTCG emit ---
  // lint() also returns a parsed designSystem and a tailwindConfig; we reuse
  // both to avoid re-parsing the markdown for Tailwind/DTCG output.
  let lint = null;
  let tailwindConfig = null;
  let dtcgTokens = null;
  try {
    lint = designLint(md);
    tailwindConfig = lint?.tailwindConfig?.data || null;
    if (lint?.designSystem) {
      try {
        const dtcg = new DtcgEmitterHandler().execute(lint.designSystem);
        dtcgTokens = dtcg?.data || null;
      } catch (err) {
        dtcgTokens = null;
      }
    }
  } catch (err) {
    lint = { error: err.message };
  }

  if (options.write !== false) {
    const outDir = path.join(jobDir, 'output', 'design-md');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'design.md'), md);
    fs.writeFileSync(
      path.join(outDir, 'lint.json'),
      JSON.stringify({
        summary: lint?.summary || null,
        findings: lint?.findings || [],
        sections: lint?.sections || [],
      }, null, 2)
    );
    if (tailwindConfig) {
      fs.writeFileSync(
        path.join(outDir, 'tailwind.config.json'),
        JSON.stringify(tailwindConfig, null, 2)
      );
    }
    if (dtcgTokens) {
      fs.writeFileSync(
        path.join(outDir, 'dtcg.tokens.json'),
        JSON.stringify(dtcgTokens, null, 2)
      );
    }
    fs.writeFileSync(
      path.join(outDir, 'design-md.provenance.json'),
      JSON.stringify(provenanceJson, null, 2)
    );
  }

  return {
    markdown: md,
    lint,
    tailwindConfig,
    dtcgTokens,
    roles,
    typeScale,
    roundedScale,
    components: Object.keys(componentBlocks),
    name: ds.name,
    description: ds.description,
    sourceUrl: computed.sourceUrl || tokens.sourceUrl || null,
    ds,
    componentBlocks,
    colorMeta,
    aiBlockNames: Array.from(aiBlockNames),
    aiVariants: aiVariants?.byComponent || null,
    aiTypoSamples: aiTypoSamples || null,
    aiDecisions: aiDecisions || null,
    pseudoBlockTransitions,
    provenance: prov,
    provenanceJson,
  };
}

function guessName(computed, jobDir) {
  const candidates = [computed?.sourceUrl];
  // Fallback for legacy jobs whose computed.json predates sourceUrl —
  // read the queue entry from disk if we have the jobDir.
  if (jobDir) {
    try {
      const job = JSON.parse(fs.readFileSync(path.join(jobDir, 'job.json'), 'utf8'));
      if (job?.url) candidates.push(job.url);
    } catch { /* ignore */ }
  }
  candidates.push(computed?.jobId);
  for (const url of candidates) {
    if (typeof url === 'string' && url.startsWith('http')) {
      try {
        const host = new URL(url).hostname.replace(/^www\./, '');
        const root = host.split('.')[0];
        return root.charAt(0).toUpperCase() + root.slice(1);
      } catch { /* ignore */ }
    }
  }
  return 'Site';
}

function guessDescription(computed, roles, typeScale) {
  const canvas = roles.canvas?.hex || '#ffffff';
  const primary = roles.primary?.hex || '#000000';
  const dom = Object.values(typeScale).sort((a, b) => b.weightedArea - a.weightedArea)[0];
  const fam = dom?.family || 'system fonts';
  return `Design system extracted from a structural clone. Canvas ${canvas}, primary accent ${primary}, dominant typeface ${fam}. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources.`;
}
