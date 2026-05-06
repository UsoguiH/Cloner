// =============================================================================
// AI stage: brand-voice copy generation (Phase 6.7 — second AI stage to ship).
//
// Input  : siteName, sourceUrl, color palette (post role-naming labels if any),
//          typography table, above-the-fold + full-page screenshot bytes
// Output : envelope { stage, modelId, generatedAt, inputDigest, data: {
//            brandThesis,
//            voiceProfile: [ { trait, explanation } ],
//            sectionBlurbs:  [ { section, blurb, confidence? } ],
//            globalConfidence
//          } }
//
// Hard rules honored (CLAUDE.md):
//   • No invented tokens: schema for this stage does not expose any
//     x-harvested fields, so the writer cannot emit hex/tokenPath/probeId
//     values. Body text MAY name colors and fonts using the labels we hand
//     it (e.g. "Linear Indigo", "sohne-var"); the validator does not bind
//     those because they are post-AI labels, not harvest values.
//   • Pure prose: schema rejects markdown formatting, lists, code fences.
//   • Graceful degrade: returns { ok:false, code:'no-key' } when GEMINI_API_KEY
//     is missing, so callers continue with deterministic-only output and
//     provenance stamps `fallback` on every prose field.
//
// Cost-aware: disk cache keyed by sha256(inputDigest) under .cache/ai/copy-generation/.
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { safeCall, isAvailable } from '../client.js';
import { validateStageOutput } from '../validators.js';

const STAGE = 'copy-generation';
const DEFAULT_MODEL = 'gemini-3-pro-preview';
const FALLBACK_MODEL = 'gemini-2.5-pro';
const CACHE_DIR = path.resolve('.cache', 'ai', 'copy-generation');
const ENVELOPE_FILENAME = 'copy-generation.envelope.json';

const SYSTEM_PROMPT = `You are a senior brand designer writing the prose blocks of a curated design system documentation. Your voice is plainspoken, observational, and taste-forward — think Stripe's Brand book or Linear's documentation, not marketing copy. Every sentence is grounded in what the screenshot and harvested system actually show.

For the supplied site, return JSON with these fields:

  • brandThesis  — one sentence (20–280 chars). Captures what this product is and how its surface presents itself. No tagline puffery; no "we" voice.

  • voiceProfile — three to five items, each:
      trait        — short adjective or noun phrase (2–40 chars), e.g. "Confident", "Plainspoken", "Builder-first". Letters and basic punctuation only. NEVER include trailing punctuation or wrapping quotes.
      explanation  — one sentence (20–280 chars) justifying the trait from concrete evidence in the screenshot or palette/typography table.

  • sectionBlurbs — zero to twelve items. Choose only from this enum for "section":
      overview, color-system, typography, spacing, components, states, motion, iconography, imagery, voice
    Each item:
      section     — one of the enum values above
      blurb       — one to three sentences (30–600 chars). The intro paragraph for that section in the markdown. State what this site does *with* the system — colors, type, spacing — referencing the brand by name.
      confidence  — 0..1 self-rating; 0.9+ when grounded in clear visual evidence; below 0.7 means you are guessing.

  • globalConfidence — 0..1 self-rating across the whole response.

Hard rules:
  • Plain prose only — never markdown, never bullet lists, never headings, never code fences, never quotation marks around full strings.
  • Reference, never invent. If you mention a hex value, use ONLY values from the supplied palette. If you mention a font, use ONLY families from the typography table. Prefer the brand-voice color names you receive (e.g. "Linear Indigo") over raw hex.
  • Reference the brand by name, not as "the site" or "we".
  • Never describe markdown structure, the design.md format, the harvest pipeline, the AI, or yourself. Talk only about the brand and its visual identity.
  • Output strictly JSON matching the requested shape. No prose wrapper around the JSON.`;

function buildUserPrompt({ siteName, sourceUrl, colors, typography }) {
  const lines = [
    `Site: ${siteName || 'Unknown'}${sourceUrl ? ` (${sourceUrl})` : ''}`,
    '',
    'Color palette (token → hex → brand-voice label if known):',
  ];
  for (const c of colors) {
    const label = c.displayName ? ` (${c.displayName})` : '';
    const desc = c.roleDescription ? ` — ${c.roleDescription}` : '';
    lines.push(`  colors.${c.name}: ${c.hex}${label}${desc}`);
  }
  if (!colors.length) lines.push('  (none harvested)');
  lines.push('', 'Typography (token → family/size/weight):');
  for (const t of typography) {
    lines.push(`  typography.${t.name}: ${t.fontFamily} ${t.fontSize}/${t.fontWeight}`);
  }
  if (!typography.length) lines.push('  (none harvested)');
  lines.push(
    '',
    'Look at the attached screenshot(s) for visual context. Write the brandThesis, voiceProfile, and sectionBlurbs grounded in what you see. Output JSON only.',
  );
  return lines.join('\n');
}

function buildInputDigest({ colors, typography, modelId, screenshotBufs, prompt }) {
  const h = crypto.createHash('sha256');
  h.update(`stage=${STAGE}\n`);
  h.update(`model=${modelId}\n`);
  h.update(`prompt=${prompt}\n`);
  // Stable serialization (sorted keys).
  const sortedColors = [...colors].sort((a, b) => a.name.localeCompare(b.name));
  const sortedTypo = [...typography].sort((a, b) => a.name.localeCompare(b.name));
  h.update(`colors=${JSON.stringify(sortedColors)}\n`);
  h.update(`typography=${JSON.stringify(sortedTypo)}\n`);
  for (const buf of screenshotBufs || []) {
    if (buf) h.update(buf);
  }
  return h.digest('hex');
}

function tryReadCache(digest) {
  try {
    const p = path.join(CACHE_DIR, `${digest}.json`);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch { /* fall through */ }
  return null;
}

function writeCache(digest, envelope) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(path.join(CACHE_DIR, `${digest}.json`), JSON.stringify(envelope, null, 2));
  } catch { /* best effort */ }
}

function writeEnvelopeSidecar(jobDir, envelope) {
  if (!jobDir) return;
  try {
    const dir = path.join(jobDir, 'output', 'design-md');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, ENVELOPE_FILENAME), JSON.stringify(envelope, null, 2));
  } catch { /* best effort */ }
}

export function loadCopyGenerationEnvelope(jobDir) {
  try {
    const p = path.join(jobDir, 'output', 'design-md', ENVELOPE_FILENAME);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch { return null; }
}

export async function runCopyGenerationStage({
  jobDir,
  siteName,
  sourceUrl,
  colors,             // [{ name, hex, displayName?, roleDescription? }]
  typography,         // [{ name, fontFamily, fontSize, fontWeight }]
  screenshotPaths,    // [string] — preferred order: viewport, fullpage
  modelId = DEFAULT_MODEL,
  writeSidecar = true,
}) {
  const safeColors = Array.isArray(colors) ? colors : [];
  const safeTypo = Array.isArray(typography) ? typography : [];
  if (!safeColors.length && !safeTypo.length) {
    return { ok: false, code: 'empty-input', error: 'no colors or typography to describe' };
  }
  if (!isAvailable()) {
    return { ok: false, code: 'no-key', error: 'GEMINI_API_KEY not set' };
  }

  const screenshotBufs = [];
  for (const p of screenshotPaths || []) {
    if (p && fs.existsSync(p)) {
      try { screenshotBufs.push(fs.readFileSync(p)); } catch { /* ignore */ }
    }
  }

  const userPrompt = buildUserPrompt({ siteName, sourceUrl, colors: safeColors, typography: safeTypo });
  const digest = buildInputDigest({
    colors: safeColors,
    typography: safeTypo,
    modelId,
    screenshotBufs,
    prompt: SYSTEM_PROMPT + '\n\n' + userPrompt,
  });

  const cached = tryReadCache(digest);
  if (cached) {
    if (writeSidecar) writeEnvelopeSidecar(jobDir, cached);
    return { ok: true, envelope: cached, fromCache: true };
  }

  // Allowlist is intentionally empty: this stage's schema declares no
  // x-harvested fields, so checkHarvest finds nothing to bind. The schema
  // structure is the entire defense — no hex / tokenPath / probeId / selector
  // appears as a typed leaf in the output.
  const allowlist = {};

  const parts = [];
  for (const buf of screenshotBufs) {
    parts.push({
      inlineData: { mimeType: 'image/png', data: buf.toString('base64') },
    });
  }
  parts.push({ text: userPrompt });

  const tryModels = [modelId];
  if (modelId !== FALLBACK_MODEL) tryModels.push(FALLBACK_MODEL);

  let resp = null;
  let usedModel = null;
  let lastError = null;
  for (const m of tryModels) {
    const r = await safeCall((c) => c.models.generateContent({
      model: m,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
      },
    }), { timeoutMs: 90_000 });
    if (r.ok) { resp = r.data; usedModel = m; break; }
    lastError = r;
    const errStr = String(r.error || '').toLowerCase();
    if (!/not.?found|unavailable|404/.test(errStr)) break;
  }
  if (!resp) {
    return { ok: false, code: lastError?.code || 'call-failed', error: lastError?.error || 'unknown' };
  }

  const text =
    (typeof resp.text === 'string' ? resp.text : '') ||
    resp?.candidates?.[0]?.content?.parts?.[0]?.text ||
    '';
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return {
      ok: false,
      code: 'parse-failed',
      error: `JSON parse failed: ${err.message}`,
      rawText: text.slice(0, 800),
    };
  }

  const usage = resp.usageMetadata || {};
  const envelope = {
    stage: STAGE,
    modelId: resp.modelVersion || usedModel,
    generatedAt: new Date().toISOString(),
    inputDigest: digest,
    data: parsed,
    thoughtsTokens: usage.thoughtsTokenCount || 0,
  };

  const result = validateStageOutput(envelope, { stage: STAGE, allowlist });
  if (!result.ok) {
    return { ok: false, code: 'validation-failed', errors: result.errors, envelope };
  }

  writeCache(digest, envelope);
  if (writeSidecar) writeEnvelopeSidecar(jobDir, envelope);
  return {
    ok: true,
    envelope,
    fromCache: false,
    usage: {
      promptTokens: usage.promptTokenCount,
      candidatesTokens: usage.candidatesTokenCount,
      thoughtsTokens: usage.thoughtsTokenCount,
      totalTokens: usage.totalTokenCount,
    },
  };
}

export const _internal = { buildInputDigest, buildUserPrompt, SYSTEM_PROMPT, ENVELOPE_FILENAME, CACHE_DIR };
