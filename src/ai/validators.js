// AI stage output validator — the choke point for hard rule #1 (no invented tokens).
//
// Every LLM response in the design.md pipeline flows through validateStageOutput.
// It runs three independent checks and returns a discriminated union the loop
// runner (step 7) can branch on:
//
//   1. Envelope shape    — does the wrapper match _shared.json#/$defs/Envelope?
//   2. Stage schema      — does envelope.data match the stage's JSON Schema?
//   3. Harvest allowlist — does every x-harvested value appear in the per-job
//                          harvest set, i.e. did the AI invent anything?
//
// All three are run when possible so the loop runner sees the full failure
// surface in one round-trip. Envelope failures short-circuit (the inner
// payload's stage is unknown until the envelope is well-formed).
//
// Pure function: no I/O, no side effects, no logging. Caller decides retry,
// fallback, or escalation.

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { SHARED, getSchema, collectHarvestedFields } from './schemas/index.js';

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(SHARED, SHARED.$id);

const envelopeValidator = ajv.compile({
  $ref: 'https://clone.saas/schemas/_shared.json#/$defs/Envelope',
});

const stageValidatorCache = new Map();
function getStageValidator(stage) {
  if (!stageValidatorCache.has(stage)) {
    stageValidatorCache.set(stage, ajv.compile(getSchema(stage)));
  }
  return stageValidatorCache.get(stage);
}

const HARVESTED_KINDS = ['hex', 'tokenPath', 'probeId', 'selector'];

function normalizeAllowlist(raw = {}) {
  const out = {};
  for (const kind of HARVESTED_KINDS) {
    const set = new Set();
    const items = raw[kind];
    if (items) {
      for (const v of items) {
        if (typeof v !== 'string') continue;
        set.add(kind === 'hex' ? v.toLowerCase() : v);
      }
    }
    out[kind] = set;
  }
  return out;
}

// Splits a schema path like "blocks[].hex" into ["blocks", "[]", "hex"].
const PATH_RE = /([a-zA-Z_$][a-zA-Z0-9_$]*)|(\[\])/g;
function pathSegments(path) {
  const segs = [];
  let m;
  PATH_RE.lastIndex = 0;
  while ((m = PATH_RE.exec(path))) segs.push(m[1] || m[2]);
  return segs;
}

// Yields concrete (path, value) pairs for every leaf reachable from `root` via
// the given schema path. Skips undefined intermediates so optional fields don't
// produce false positives.
function* walkPath(root, schemaPath) {
  if (schemaPath === '') {
    if (root !== undefined) yield { path: '', value: root };
    return;
  }
  const segs = pathSegments(schemaPath);
  yield* recurse(root, segs, '');
}
function* recurse(node, segs, accum) {
  if (node === undefined || node === null) return;
  if (segs.length === 0) {
    yield { path: accum, value: node };
    return;
  }
  const [head, ...rest] = segs;
  if (head === '[]') {
    if (!Array.isArray(node)) return;
    for (let i = 0; i < node.length; i++) {
      yield* recurse(node[i], rest, `${accum}[${i}]`);
    }
  } else {
    if (typeof node !== 'object') return;
    yield* recurse(node[head], rest, accum ? `${accum}.${head}` : head);
  }
}

function checkHarvest(stage, data, allowlist) {
  const fields = collectHarvestedFields(getSchema(stage));
  const seen = new Set();
  const errors = [];
  for (const { path: schemaPath, harvestedKind } of fields) {
    const dedupKey = `${schemaPath}|${harvestedKind}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    const allowed = allowlist[harvestedKind];
    for (const { path, value } of walkPath(data, schemaPath)) {
      if (typeof value !== 'string') continue;
      const cmp = harvestedKind === 'hex' ? value.toLowerCase() : value;
      if (!allowed.has(cmp)) {
        errors.push({
          kind: 'harvest',
          path,
          harvestedKind,
          value,
          message: `Value at '${path}' (${harvestedKind}='${value}') is not in the per-job harvest allowlist. AI may not invent ${harvestedKind} values.`,
        });
      }
    }
  }
  return errors;
}

function ajvErrorsToList(kind, prefix, ajvErrors) {
  return (ajvErrors || []).map((e) => {
    const where = `${prefix}${e.instancePath || ''}` || '/';
    let msg = e.message || 'failed validation';
    if (e.params && e.keyword === 'additionalProperties' && e.params.additionalProperty) {
      msg = `unexpected property '${e.params.additionalProperty}'`;
    } else if (e.keyword === 'enum' && e.params?.allowedValues) {
      msg = `${msg} (${e.params.allowedValues.join('|')})`;
    } else if (e.keyword === 'required' && e.params?.missingProperty) {
      msg = `missing required property '${e.params.missingProperty}'`;
    }
    return {
      kind,
      path: where,
      keyword: e.keyword,
      message: `${where}: ${msg}`,
      value: e.data,
    };
  });
}

// Validate an Envelope (the outer wrapper added by the stage runner).
// `opts.stage`      — expected stage name; mismatch is reported as envelope error.
// `opts.allowlist`  — per-job harvested-value sets.
// Returns: { ok: true, data, envelope } | { ok: false, errors, envelope? }.
export function validateStageOutput(envelope, opts = {}) {
  const allowlist = normalizeAllowlist(opts.allowlist);
  const errors = [];

  if (!envelope || typeof envelope !== 'object') {
    return {
      ok: false,
      errors: [
        {
          kind: 'envelope',
          path: '/',
          message: 'envelope is not an object',
        },
      ],
    };
  }

  const envelopeOk = envelopeValidator(envelope);
  if (!envelopeOk) {
    return {
      ok: false,
      errors: ajvErrorsToList('envelope', '', envelopeValidator.errors),
    };
  }

  if (opts.stage && envelope.stage !== opts.stage) {
    errors.push({
      kind: 'envelope',
      path: '/stage',
      message: `expected stage '${opts.stage}', got '${envelope.stage}'`,
    });
    return { ok: false, errors, envelope };
  }

  const stage = envelope.stage;
  let dataValidator;
  try {
    dataValidator = getStageValidator(stage);
  } catch (err) {
    errors.push({
      kind: 'envelope',
      path: '/stage',
      message: `unknown stage '${stage}': ${err.message}`,
    });
    return { ok: false, errors, envelope };
  }

  const data = envelope.data ?? {};
  const dataOk = dataValidator(data);
  if (!dataOk) {
    errors.push(...ajvErrorsToList('schema', '/data', dataValidator.errors));
  }

  errors.push(...checkHarvest(stage, data, allowlist));

  if (errors.length) return { ok: false, errors, envelope };
  return { ok: true, data, envelope };
}

// Validate just an inner `data` payload against a stage. Useful for tests and
// for callers that already unwrapped the envelope.
export function validateData(stage, data, allowlistRaw = {}) {
  const allowlist = normalizeAllowlist(allowlistRaw);
  const errors = [];
  let dataValidator;
  try {
    dataValidator = getStageValidator(stage);
  } catch (err) {
    return {
      ok: false,
      errors: [{ kind: 'envelope', path: '/stage', message: `unknown stage '${stage}': ${err.message}` }],
    };
  }
  if (!dataValidator(data ?? {})) {
    errors.push(...ajvErrorsToList('schema', '', dataValidator.errors));
  }
  errors.push(...checkHarvest(stage, data ?? {}, allowlist));
  if (errors.length) return { ok: false, errors };
  return { ok: true, data };
}

// Compact human-readable rendering for logs and bench reports.
export function summarizeErrors(errors) {
  if (!errors || errors.length === 0) return 'no errors';
  const byKind = { envelope: [], schema: [], harvest: [] };
  for (const e of errors) (byKind[e.kind] || (byKind[e.kind] = [])).push(e);
  const parts = [];
  for (const [kind, list] of Object.entries(byKind)) {
    if (!list.length) continue;
    parts.push(`${list.length} ${kind}: ` + list.slice(0, 5).map((e) => e.message).join('; ') + (list.length > 5 ? `; +${list.length - 5} more` : ''));
  }
  return parts.join(' | ');
}
