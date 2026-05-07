// Schema registry for AI stage I/O contracts.
// Each stage has a JSON Schema describing its `data` payload (the inner contents
// of the Envelope defined in _shared.json). The validator (src/ai/validators.js)
// composes these with the Envelope and the per-job harvested-value allowlist.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function load(name) {
  const buf = readFileSync(join(__dirname, name), 'utf8');
  return JSON.parse(buf);
}

export const SHARED = load('_shared.json');

export const SCHEMAS = Object.freeze({
  'color-block-discovery': load('color-block-discovery.json'),
  'role-naming': load('role-naming.json'),
  'variant-recognition': load('variant-recognition.json'),
  'pseudo-state-interpretation': load('pseudo-state-interpretation.json'),
  'copy-generation': load('copy-generation.json'),
  'typography-sample-copy': load('typography-sample-copy.json'),
  'self-critique': load('self-critique.json'),
});

export const STAGE_NAMES = Object.freeze(Object.keys(SCHEMAS));

export function getSchema(stage) {
  const schema = SCHEMAS[stage];
  if (!schema) {
    throw new Error(`Unknown AI stage: ${stage}. Known: ${STAGE_NAMES.join(', ')}`);
  }
  return schema;
}

// Walk a schema and collect all { path, harvestedKind } pairs where the field
// must be drawn from the per-job harvest allowlist. Used by the runtime
// validator to enforce hard rule #1 (no invented tokens).
export function collectHarvestedFields(schema, sharedDefs = SHARED.$defs) {
  const out = [];
  const seen = new WeakSet();

  function visit(node, path) {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);

    if (typeof node.$ref === 'string') {
      // Resolve only refs into _shared.json#/$defs/<Name>.
      // Record x-harvested at the ref site; do NOT descend into the def, since
      // that would double-count the same path.
      const m = node.$ref.match(/^_shared\.json#\/\$defs\/([A-Za-z0-9_]+)$/);
      if (m) {
        const def = sharedDefs[m[1]];
        if (def && def['x-harvested']) {
          out.push({ path, harvestedKind: def['x-harvested'] });
        }
      }
      return;
    }

    if (node['x-harvested']) {
      out.push({ path, harvestedKind: node['x-harvested'] });
    }

    if (node.properties) {
      for (const [k, v] of Object.entries(node.properties)) {
        visit(v, path ? `${path}.${k}` : k);
      }
    }
    if (node.items) visit(node.items, path ? `${path}[]` : '[]');
    for (const key of ['allOf', 'anyOf', 'oneOf']) {
      if (Array.isArray(node[key])) node[key].forEach((s) => visit(s, path));
    }
    if (node.then) visit(node.then, path);
    if (node.else) visit(node.else, path);
  }

  visit(schema, '');
  return out;
}
