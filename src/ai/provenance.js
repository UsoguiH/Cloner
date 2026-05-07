// design-md.provenance.json writer — the moat, per CLAUDE.md hard rule #2.
//
// Every leaf claim in design.md / tokens.json / tailwind.config.json gets a
// receipt: who said it, with what confidence, backed by which probes. The
// sidecar is what makes our output auditable in a way getdesign.md's isn't.
//
// Path scheme: '<tokenPath>.<fieldName>', e.g. 'colors.brand.primary.displayName'.
// Dotted paths let consumers (live preview UI, bench judge) prefix-match all
// fields belonging to a token in one filter.
//
// Downgrade rule (from _shared.json Confidence): an LLM entry whose confidence
// is below the threshold (default 0.7) has its source rewritten to 'fallback'
// at write time, but originalSource and downgraded=true are preserved so the
// audit trail isn't lost. The emitter (step 5) can then choose to substitute a
// deterministic fallback for the user-visible *value* while still reporting
// the AI claim that was rejected.

import { mkdir, readFile, writeFile as fsWrite } from 'node:fs/promises';
import { dirname } from 'node:path';

export const SCHEMA_VERSION = 1;
export const CONFIDENCE_DOWNGRADE_THRESHOLD = 0.7;

export const SOURCE = Object.freeze({
  HARVEST: 'harvest',
  FALLBACK: 'fallback',
});

export function llmSource(stage) {
  if (typeof stage !== 'string' || !stage) {
    throw new Error('llmSource requires a non-empty stage name');
  }
  return `llm-${stage}`;
}

function assertPath(path) {
  if (typeof path !== 'string' || path.length === 0) {
    throw new Error(`provenance path must be a non-empty string, got ${typeof path}`);
  }
}

function assertConfidence(c) {
  if (typeof c !== 'number' || Number.isNaN(c) || c < 0 || c > 1) {
    throw new Error(`confidence must be a number in [0,1], got ${c}`);
  }
}

function dedupeStrings(arr) {
  if (!arr) return [];
  if (!Array.isArray(arr)) {
    throw new Error('probeIds must be an array of strings');
  }
  const seen = new Set();
  const out = [];
  for (const v of arr) {
    if (typeof v !== 'string' || !v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

export function createProvenance(opts = {}) {
  const jobId = opts.jobId ?? null;
  const threshold = typeof opts.threshold === 'number' ? opts.threshold : CONFIDENCE_DOWNGRADE_THRESHOLD;
  if (threshold < 0 || threshold > 1) {
    throw new Error(`threshold must be in [0,1], got ${threshold}`);
  }

  const fields = new Map();
  const stats = new Map();

  const bump = (source, delta) => {
    const next = (stats.get(source) || 0) + delta;
    if (next <= 0) stats.delete(source);
    else stats.set(source, next);
  };

  const set = (path, entry) => {
    assertPath(path);
    if (fields.has(path)) bump(fields.get(path).source, -1);
    fields.set(path, entry);
    bump(entry.source, 1);
    return entry;
  };

  const setHarvest = (path, { confidence = 1.0, probeIds, rationale = null } = {}) => {
    assertConfidence(confidence);
    return set(path, {
      source: SOURCE.HARVEST,
      originalSource: null,
      stage: null,
      confidence,
      probeIds: dedupeStrings(probeIds),
      rationale,
      downgraded: false,
    });
  };

  const setLLM = (path, { stage, confidence, probeIds, rationale = null } = {}) => {
    if (!stage) throw new Error('setLLM requires a stage name');
    assertConfidence(confidence);
    const llm = llmSource(stage);
    const downgraded = confidence < threshold;
    const downgradeNote = `Downgraded: confidence ${confidence.toFixed(2)} < threshold ${threshold}.`;
    return set(path, {
      source: downgraded ? SOURCE.FALLBACK : llm,
      originalSource: downgraded ? llm : null,
      stage,
      confidence,
      probeIds: dedupeStrings(probeIds),
      rationale: downgraded
        ? (rationale ? `${rationale} [${downgradeNote}]` : downgradeNote)
        : rationale,
      downgraded,
    });
  };

  const setFallback = (path, { confidence = 0, rationale = null, probeIds } = {}) => {
    assertConfidence(confidence);
    return set(path, {
      source: SOURCE.FALLBACK,
      originalSource: null,
      stage: null,
      confidence,
      probeIds: dedupeStrings(probeIds),
      rationale,
      downgraded: false,
    });
  };

  const get = (path) => (fields.has(path) ? fields.get(path) : null);
  const has = (path) => fields.has(path);
  const size = () => fields.size;

  // Returns paths whose dotted prefix matches `prefix.`. Used by the live
  // preview to fetch every field belonging to a token in one go.
  const findByPrefix = (prefix) => {
    const out = [];
    const needle = prefix.endsWith('.') ? prefix : `${prefix}.`;
    for (const [path, entry] of fields) {
      if (path === prefix || path.startsWith(needle)) out.push([path, entry]);
    }
    out.sort(([a], [b]) => a.localeCompare(b));
    return out;
  };

  const toJSON = () => {
    const sorted = [...fields.entries()].sort(([a], [b]) => a.localeCompare(b));
    return {
      schemaVersion: SCHEMA_VERSION,
      jobId,
      generatedAt: new Date().toISOString(),
      threshold,
      stats: Object.fromEntries([...stats.entries()].sort(([a], [b]) => a.localeCompare(b))),
      fields: Object.fromEntries(sorted),
    };
  };

  const writeToFile = async (filePath) => {
    if (typeof filePath !== 'string' || !filePath) {
      throw new Error('writeToFile requires a path string');
    }
    await mkdir(dirname(filePath), { recursive: true });
    await fsWrite(filePath, JSON.stringify(toJSON(), null, 2), 'utf8');
    return filePath;
  };

  return {
    set,
    setHarvest,
    setLLM,
    setFallback,
    get,
    has,
    size,
    findByPrefix,
    toJSON,
    writeToFile,
  };
}

// Static reader for tests, the bench judge, and anything outside the pipeline
// that needs to inspect a sidecar without owning the writer instance.
export async function loadProvenance(filePath) {
  const buf = await readFile(filePath, 'utf8');
  const parsed = JSON.parse(buf);
  if (!parsed || typeof parsed !== 'object' || parsed.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`provenance sidecar at ${filePath} has wrong or missing schemaVersion`);
  }
  return parsed;
}
