// Smoke test for Phase 6.2.5 multi-page crawl — runs runDesignMdJob
// against a single site and prints the page summary + variant count.
// Usage: node scripts/smoke-multipage.mjs https://linear.app
import fs from 'node:fs';
import path from 'node:path';
import { runDesignMdJob } from '../src/design-md/run.js';

const url = process.argv[2];
if (!url) {
  console.error('usage: node scripts/smoke-multipage.mjs <url>');
  process.exit(1);
}

const id = `smoke-${new URL(url).hostname.replace(/[^a-z0-9]/g, '-')}-${Date.now().toString(36)}`;
const jobDir = path.resolve(`jobs/${id}`);
fs.mkdirSync(jobDir, { recursive: true });

const job = { id, url, jobDir };

console.log(`[smoke] start ${id} ${url}`);
const t0 = Date.now();
await runDesignMdJob(job, {
  onProgress: (p) => {
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`[+${dt}s] ${p.phase}: ${p.message || ''}`);
  },
});

const dt = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n[smoke] finished in ${dt}s`);

// Summary
const computedPath = path.join(jobDir, 'output/design-md/computed.json');
const designMdPath = path.join(jobDir, 'output/design-md/design.md');
if (fs.existsSync(computedPath)) {
  const c = JSON.parse(fs.readFileSync(computedPath, 'utf8'));
  console.log(`\n=== computed.json ===`);
  console.log(`pages: ${(c.pages || []).map((p) => `${p.slug}(${p.status},${p.probesHarvested ?? '-'})`).join(' | ')}`);
  console.log(`stats:`, c.stats);
}
if (fs.existsSync(designMdPath)) {
  const md = fs.readFileSync(designMdPath, 'utf8');
  // Variant count: only look inside ## Components section
  const compsStart = md.indexOf('\n## Components');
  const compsEnd = compsStart >= 0 ? md.indexOf('\n## ', compsStart + 1) : -1;
  const compsBlock = compsStart >= 0 ? md.slice(compsStart, compsEnd === -1 ? md.length : compsEnd) : '';
  const variantMatches = [...compsBlock.matchAll(/^- \*\*([\w-]+-(?:hover|focus)(?:-\d+)?)\*\*/gm)];
  console.log(`\n=== variants (${variantMatches.length}) ===`);
  for (const m of variantMatches) console.log(`  ${m[1]}`);
}
