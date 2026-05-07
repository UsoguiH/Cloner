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
  // when forcePseudoState diffs the computed style. If all four match, emit a
  // single borderColor; otherwise skip — we don't model per-side borders yet.
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
      if (role) {
        block.borderColor = `{colors.${role}}`;
        refs.add(`colors.${role}`);
      }
    }
  }
  const rPx = pxOrNull(diff['border-radius']) ?? pxOrNull(diff['border-top-left-radius']);
  const rName = pickRoundedName(roundedScale, rPx);
  if (rName) {
    block.rounded = `{rounded.${rName}}`;
    refs.add(`rounded.${rName}`);
  }
  // Opacity is the most common hover signal that doesn't need a token.
  if (diff['opacity']) {
    const o = parseFloat(diff['opacity']);
    if (!Number.isNaN(o) && o >= 0 && o <= 1) block.opacity = o;
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

  // Build component blocks first to know which tokens are actually referenced.
  const allowedColorRoles = new Set(Object.keys(roles));
  const componentBlocks = {};
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
        for (const ref of pRefs) {
          const [kind, name] = ref.split('.');
          if (kind === 'colors') usedColorRoles.add(name);
          else if (kind === 'rounded') usedRound.add(name);
        }
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
    // Sample copy is canned today; AI will own it via typography-sample-copy
    prov.setFallback(`typography.${name}.sample`, {
      rationale: 'Canned sample copy heuristic; will be overwritten by llm-typography-sample-copy when AI stage ships.',
    });
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

  md += sectionMd(
    'Colors',
    blurb('color-system') + (
      Object.keys(colorsTable).length
        ? Object.entries(colorsTable).map(([n, v]) => {
            const meta = colorMeta[n];
            if (meta?.displayName && meta?.roleDescription) {
              return `- **${meta.displayName}** \`${v}\` (\`${n}\`) — ${meta.roleDescription}`;
            }
            return `- **${n}** \`${v}\``;
          }).join('\n')
        : '_No colors extracted._'
    )
  );
  md += sectionMd(
    'Typography',
    blurb('typography') + (
      Object.keys(typoTable).length
        ? Object.entries(typoTable).map(([n, t]) => `- **${n}** — ${t.fontFamily} ${t.fontSize}/${t.fontWeight}`).join('\n')
        : '_No typography extracted._'
    )
  );
  md += sectionMd('Layout', blurb('spacing') + 'Layout principles derived from observed component spacing and grid behavior. See spacing tokens below.');
  md += sectionMd('Elevation & Depth', 'Elevation harvest is deferred to Phase 5 (no shadow tokens emitted yet).');
  md += sectionMd(
    'Shapes',
    Object.keys(roundTable).length
      ? Object.entries(roundTable).map(([n, v]) => `- **${n}** \`${v}\``).join('\n')
      : '_No rounding tokens extracted._'
  );
  md += sectionMd(
    'Components',
    blurb('components') + (
      Object.keys(componentBlocks).length
        ? Object.keys(componentBlocks).map((n) => `- **${n}**`).join('\n')
        : '_No components classified._'
    )
  );
  md += sectionMd("Do's and Don'ts",
    "- **Do** reference design tokens via `{colors.*}` / `{typography.*}` rather than raw hex.\n" +
    "- **Don't** introduce new color roles outside the documented palette without updating this file."
  );
  md += sectionMd('Responsive Behavior', 'Single-viewport (1280×800) harvest. Per-breakpoint behavior is deferred to Phase 5.');
  md += sectionMd('Iteration Guide', 'Regenerate from a fresh clone via `node src/design-md/generate.mjs <jobId>`. Token roles are heuristic — review and rename before publishing.');
  md += sectionMd('Known Gaps',
    "- Pseudo-states (`:hover`, `:focus`) not yet captured.\n" +
    "- Elevation/box-shadow tokens not emitted.\n" +
    "- Single-viewport snapshot — responsive scales pending."
  );

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
