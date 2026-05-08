// Re-applies the updated scoreCandidate / blocklist / threshold to existing
// brand-principles.json files. Saves a one-shot Playwright re-run on every
// job — the raw heading + body + source.url are already stored.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { _internal } from '../src/design-md/extract/brand-principles.js';

const { scoreCandidate } = _internal;
const MIN_SCORE = 3;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const JOBS_DIR = path.join(ROOT, 'jobs');

function findLatestBenchJobs() {
  const all = fs.readdirSync(JOBS_DIR).filter((d) => d.startsWith('bench-'));
  const bySite = new Map();
  for (const d of all) {
    const m = /^bench-([^-]+)-(.+)$/.exec(d);
    if (!m) continue;
    const site = m[1];
    const stat = fs.statSync(path.join(JOBS_DIR, d));
    const prev = bySite.get(site);
    if (!prev || stat.mtimeMs > prev.mtime) bySite.set(site, { id: d, mtime: stat.mtimeMs });
  }
  return [...bySite.values()].map((v) => v.id);
}

function refilter(jobId) {
  const jp = path.join(JOBS_DIR, jobId, 'output', 'design-md', 'brand-principles.json');
  if (!fs.existsSync(jp)) {
    console.log(`[skip] ${jobId}: no brand-principles.json`);
    return;
  }
  const data = JSON.parse(fs.readFileSync(jp, 'utf8'));
  const before = data.principles.length;
  const kept = [];
  for (const p of data.principles) {
    const url = p.source?.url || '';
    const tag = p.source?.tag || 'h2';
    const score = scoreCandidate({ heading: p.heading, body: p.body, tag }, url);
    if (score >= MIN_SCORE) kept.push({ ...p, _score: score });
  }
  kept.sort((a, b) => b._score - a._score);
  for (const k of kept) delete k._score;
  data.principles = kept;
  fs.writeFileSync(jp, JSON.stringify(data, null, 2));
  console.log(`[${jobId}] ${before} → ${kept.length} principles`);
}

const args = process.argv.slice(2);
const ids = args.length ? args : findLatestBenchJobs();
console.log(`Refiltering: ${ids.join(', ')}\n`);
for (const id of ids) refilter(id);
