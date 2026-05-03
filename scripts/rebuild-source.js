// Rebuild the source tree for an existing cloned job using the latest
// extractor. Used both for testing the pipeline and for retrofitting jobs
// that were captured before the source-tree feature existed.
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  buildSourceTree,
  rewriteCssFiles,
  writeIndexHtml,
} from '../src/cloner/source-tree.js';

const jobId = process.argv[2];
if (!jobId) {
  console.error('usage: node scripts/rebuild-source.js <jobId>');
  process.exit(1);
}

const TEMPLATES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'cloner',
  'templates'
);

const outputDir = path.resolve(`jobs/${jobId}/output`);
const sourceDir = path.join(outputDir, 'clone');

const manifest = JSON.parse(
  await fs.readFile(path.join(outputDir, 'replay', 'manifest.json'), 'utf8')
);
const indexHtml = await fs.readFile(path.join(outputDir, 'index.html'), 'utf8');

// Strip the SW-bootstrap script that's been injected into the replay HTML;
// the source tree doesn't use a service worker.
const cleanedHtml = indexHtml.replace(
  /<script[^>]*data-clone-saas-boot[^>]*>[\s\S]*?<\/script>/i,
  ''
);

const docUrl = manifest.docUrl
  || JSON.parse(await fs.readFile(path.join(outputDir, 'manifest.json'), 'utf8')).sourceUrl;

console.log(`extracting source tree for ${jobId} → ${sourceDir}`);
console.log(`  docUrl: ${docUrl}`);
// Wipe existing clone/ so stale files don't linger.
try { await fs.rm(sourceDir, { recursive: true, force: true }); } catch {}

const maps = await buildSourceTree({ outputDir, docUrl, manifest, sourceDir });
console.log(`  wrote ${new Set(maps.urlMap.values()).size} files`);

await rewriteCssFiles({ sourceDir, ...maps });

const shimSource = await fs.readFile(
  path.join(TEMPLATES_DIR, 'file-shim.js'),
  'utf8'
);
await writeIndexHtml({
  capturedHtml: cleanedHtml,
  sourceDir,
  docUrl,
  shimSource,
  ...maps,
});

const stat = await fs.stat(path.join(sourceDir, 'index.html'));
console.log(`  index.html: ${(stat.size / 1024).toFixed(1)} KB`);

// Quick file count by directory.
async function walk(dir, prefix = '') {
  let count = 0, bytes = 0;
  for (const ent of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      const sub = await walk(p, prefix + '  ');
      count += sub.count; bytes += sub.bytes;
    } else {
      const s = await fs.stat(p);
      count += 1; bytes += s.size;
    }
  }
  return { count, bytes };
}
const total = await walk(sourceDir);
console.log(`  total: ${total.count} files, ${(total.bytes / 1024).toFixed(1)} KB`);
