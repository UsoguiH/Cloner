// =============================================================================
// AI stage: semantic role naming (Phase 6.4 — first AI stage to ship).
//
// Input  : harvested color roles map { primary: '#5e6ad2', canvas: '#08090a', … }
//          + above-the-fold screenshot bytes
//          + site context (sourceUrl, siteName)
// Output : envelope { stage, modelId, generatedAt, inputDigest, data: { roles: [...] } }
//          where each role item is { tokenPath, displayName, roleDescription, confidence, whereUsed? }
//
// Hard rules honored (CLAUDE.md):
//   • No invented tokens: validator allows only token paths from the input.
//   • No invented hex values: hex never appears in this stage's output schema.
//   • Graceful degrade: returns { ok:false, code:'no-key' } when GEMINI_API_KEY
//     is missing, so callers can continue with deterministic-only output.
//
// Cost-aware: disk cache keyed by sha256(inputDigest) under .cache/ai/role-naming/.
// Identical inputs produce zero API calls. Step 6 (cache.js) will formalize this.
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { safeCall, isAvailable } from '../client.js';
import { validateStageOutput } from '../validators.js';

const STAGE = 'role-naming';
const DEFAULT_MODEL = 'gemini-3-pro-preview';
const FALLBACK_MODEL = 'gemini-2.5-pro';
const CACHE_DIR = path.resolve('.cache', 'ai', 'role-naming');
const ENVELOPE_FILENAME = 'role-naming.envelope.json';

const SYSTEM_PROMPT = `You name colors for a curated design system documentation, in the voice of a senior brand designer (think the prose in Stripe's brand book or Linear's documentation).

For each token path you receive, return:
  • displayName  — a brand-voice label (2–4 words). Examples: "Stripe Purple", "Magenta Promo", "Linear Lavender", "Deep Navy", "Mist Gray", "Hairline Soft". Never just the token slug.
  • roleDescription — one sentence, 60–200 chars, plain prose. State where the color appears and what role it plays. Reference the brand by name. Never reference markdown, hex, code, or yourself.
  • confidence — your self-rating 0..1. Use 0.9+ when the screenshot directly shows the color in a recognizable role. Use 0.7–0.9 when the role is plausible from palette pattern. Below 0.7 means you are guessing — be honest, low confidence triggers a fallback downgrade.

Hard rules:
  • Reference, never invent. Only return tokenPaths from the input list. The hex values are not yours to change or output.
  • Output strictly the JSON shape: { "roles": [ { "tokenPath": "colors.primary", "displayName": "...", "roleDescription": "...", "confidence": 0.0 } ] }
  • Plain prose only. No markdown, no emoji, no leading punctuation.
  • Cover every input tokenPath. Do not add extras.`;

function buildUserPrompt({ roles, sourceUrl, siteName }) {
  const lines = [
    `Site: ${siteName || 'Unknown'}${sourceUrl ? ` (${sourceUrl})` : ''}`,
    '',
    'Harvested color palette (token path → hex):',
  ];
  for (const [name, hex] of Object.entries(roles)) {
    lines.push(`  colors.${name}: ${hex}`);
  }
  lines.push(
    '',
    'Look at the attached screenshot for visual context. Name each color with a brand-voice display name and a one-sentence role description. Output JSON only.',
  );
  return lines.join('\n');
}

function buildInputDigest({ roles, modelId, screenshotBuf, prompt }) {
  const h = crypto.createHash('sha256');
  h.update(`stage=${STAGE}\n`);
  h.update(`model=${modelId}\n`);
  h.update(`prompt=${prompt}\n`);
  // Stable roles serialization (sorted keys).
  const sorted = Object.entries(roles).sort(([a], [b]) => a.localeCompare(b));
  h.update(`roles=${JSON.stringify(sorted)}\n`);
  if (screenshotBuf) h.update(screenshotBuf);
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

export function loadRoleNamingEnvelope(jobDir) {
  try {
    const p = path.join(jobDir, 'output', 'design-md', ENVELOPE_FILENAME);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch { return null; }
}

export async function runRoleNamingStage({
  jobDir,
  roles,
  screenshotPath,
  sourceUrl,
  siteName,
  modelId = DEFAULT_MODEL,
  writeSidecar = true,
}) {
  if (!roles || Object.keys(roles).length === 0) {
    return { ok: false, code: 'empty-roles', error: 'no roles supplied' };
  }
  if (!isAvailable()) {
    return { ok: false, code: 'no-key', error: 'GEMINI_API_KEY not set' };
  }

  let screenshotBuf = null;
  if (screenshotPath && fs.existsSync(screenshotPath)) {
    try { screenshotBuf = fs.readFileSync(screenshotPath); } catch { /* ignore */ }
  }

  const userPrompt = buildUserPrompt({ roles, sourceUrl, siteName });
  const digest = buildInputDigest({
    roles,
    modelId,
    screenshotBuf,
    prompt: SYSTEM_PROMPT + '\n\n' + userPrompt,
  });

  // Cache hit → no API call.
  const cached = tryReadCache(digest);
  if (cached) {
    if (writeSidecar) writeEnvelopeSidecar(jobDir, cached);
    return { ok: true, envelope: cached, fromCache: true };
  }

  const allowlist = {
    tokenPath: Object.keys(roles).map((n) => `colors.${n}`),
    hex: Object.values(roles).map((h) => String(h).toLowerCase()),
  };

  const parts = [];
  if (screenshotBuf) {
    parts.push({
      inlineData: {
        mimeType: 'image/png',
        data: screenshotBuf.toString('base64'),
      },
    });
  }
  parts.push({ text: userPrompt });

  // Try the preferred model; if 404/not-found, retry once with the fallback.
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
    }), { timeoutMs: 300_000 });
    if (r.ok) { resp = r.data; usedModel = m; break; }
    lastError = r;
    // Try fallback on model-not-found / unavailable / timeout. The thinking
    // model (gemini-3-pro-preview) sometimes burns the whole budget on
    // dense palettes; gemini-2.5-pro returns much faster on the same input.
    const errStr = String(r.error || '').toLowerCase();
    if (!/not.?found|unavailable|404|timed out|timeout/.test(errStr)) break;
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
    return {
      ok: false,
      code: 'validation-failed',
      errors: result.errors,
      envelope,
    };
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
