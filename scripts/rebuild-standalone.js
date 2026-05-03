// Rebuild index-standalone.html for an existing job using current standalone.js.
// Usage: node scripts/rebuild-standalone.js <jobId>
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildStandaloneHtml } from '../src/cloner/standalone.js';

const jobId = process.argv[2];
if (!jobId) {
  console.error('usage: node scripts/rebuild-standalone.js <jobId>');
  process.exit(1);
}

const root = path.resolve(process.cwd());
const outputDir = path.join(root, 'jobs', jobId, 'output');
const replayDir = path.join(outputDir, 'replay');
const indexPath = path.join(outputDir, 'index.html');
const standalonePath = path.join(outputDir, 'index-standalone.html');

const jobMeta = JSON.parse(await fs.readFile(path.join(root, 'jobs', jobId, 'job.json'), 'utf8'));
const html = await fs.readFile(indexPath, 'utf8');

console.log(`rebuilding standalone for ${jobId} (${jobMeta.url})…`);
const standalone = await buildStandaloneHtml({ html, replayDir, docUrl: jobMeta.url });
await fs.writeFile(standalonePath, standalone, 'utf8');

const stats = await fs.stat(standalonePath);
const scriptCount = (standalone.match(/<script\b/gi) || []).length;
const srcCount = (standalone.match(/<script[^>]+\bsrc=/gi) || []).length;
console.log(`wrote ${standalonePath}`);
console.log(`  size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
console.log(`  total <script> tags: ${scriptCount}`);
console.log(`  remaining <script src=...>: ${srcCount}`);
console.log(`  bootstrap present: ${standalone.includes('data-clone-saas-standalone-boot')}`);
console.log(`  src interceptor present: ${standalone.includes('HTMLScriptElement.prototype,"src"')}`);
