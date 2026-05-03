// Build index-snapshot.html for an existing job by spinning up the local
// replay server, capturing the post-hydration DOM, and inlining everything.
import path from 'node:path';
import fs from 'node:fs/promises';
import { buildSnapshotHtml } from '../src/cloner/snapshot.js';

const jobId = process.argv[2];
if (!jobId) {
  console.error('usage: node scripts/rebuild-snapshot.js <jobId>');
  process.exit(1);
}

const outputDir = path.resolve(`jobs/${jobId}/output`);
const dest = path.join(outputDir, 'index-snapshot.html');

console.log(`building snapshot for ${jobId}…`);
const html = await buildSnapshotHtml({ outputDir });
if (!html) {
  console.error('no replay manifest — cannot snapshot');
  process.exit(1);
}
await fs.writeFile(dest, html, 'utf8');
await fs.writeFile(path.join(outputDir, 'preview.html'), html, 'utf8');
const st = await fs.stat(dest);
console.log(`wrote ${dest}`);
console.log(`  size: ${(st.size / 1024 / 1024).toFixed(2)} MB`);
const scripts = (html.match(/<script\b/gi) || []).length;
const styles = (html.match(/<style\b/gi) || []).length;
console.log(`  <script>: ${scripts}, <style>: ${styles}`);
