#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const jobId = process.argv[2];
if (!jobId) { console.error('Usage: node scripts/diag-pseudo-states.mjs <jobId>'); process.exit(2); }

const computed = JSON.parse(fs.readFileSync(
  path.resolve('jobs', jobId, 'output', 'design-md', 'computed.json'), 'utf8'));

let probesWithPseudo = 0;
const colorBuckets = new Map();
const COLOR_PROPS = new Set(['background-color', 'color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color']);

for (const probe of computed.probes || []) {
  if (!probe.pseudoStates) continue;
  probesWithPseudo += 1;
  for (const [state, diff] of Object.entries(probe.pseudoStates)) {
    for (const [prop, value] of Object.entries(diff)) {
      if (!COLOR_PROPS.has(prop)) continue;
      const m = /rgba?\(([^)]+)\)/.exec(value);
      if (!m) continue;
      const parts = m[1].split(',').map((s) => s.trim());
      const [r, g, b] = parts.map((s) => parseInt(s, 10));
      if (!Number.isFinite(r)) continue;
      const hex = '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
      const key = hex;
      if (!colorBuckets.has(key)) colorBuckets.set(key, { hex, count: 0, contexts: [] });
      const e = colorBuckets.get(key);
      e.count += 1;
      if (e.contexts.length < 5) e.contexts.push({ probeId: probe.id, state, prop, tag: probe.tagName });
    }
  }
}

console.log(`Probes with pseudo-state diffs: ${probesWithPseudo}`);
console.log(`Distinct hex colors that ONLY appear in :hover/:focus diffs:`);
const sorted = [...colorBuckets.values()].sort((a, b) => b.count - a.count);
for (const e of sorted) {
  const ctxStr = e.contexts.map((c) => `${c.probeId}:${c.state}:${c.prop} on ${c.tag}`).join(' | ');
  console.log(`  ${e.hex}  count=${e.count}  ${ctxStr}`);
}
