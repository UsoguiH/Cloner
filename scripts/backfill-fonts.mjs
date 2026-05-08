// =============================================================================
// One-shot font backfill (Phase 7.3 patch).
//
// CSSStyleSheet.cssRules throws on cross-origin sheets, so linear + stripe
// extracted with the live-only path got 0 fonts. This script uses the
// collectFontFacesFromReplay regex fallback (already shipped in assets.js)
// against existing job dirs and downloads + writes to assets/fonts/, updating
// the manifest in place. No Playwright, no re-extraction.
//
// Usage:
//   node scripts/backfill-fonts.mjs <jobId> [<jobId>...]
//   node scripts/backfill-fonts.mjs --all-bench
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { _internal } from '../src/design-md/extract/assets.js';

const { collectFontFacesFromReplay, dedupeFontFaces, extOf, shortHash } = _internal;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const JOBS_DIR = path.join(ROOT, 'jobs');

const FETCH_TIMEOUT_MS = 15_000;
const MAX_FONT_BYTES = 5 * 1024 * 1024;

async function fetchBuffer(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return { ok: false, status: res.status };
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_FONT_BYTES) return { ok: false, reason: 'too-big', bytes: buf.length };
    const mime = res.headers.get('content-type') || '';
    return { ok: true, buf, mime };
  } catch (err) {
    return { ok: false, reason: err.name === 'AbortError' ? 'timeout' : err.message };
  } finally {
    clearTimeout(timer);
  }
}

async function backfillJob(jobId) {
  const jobDir = path.join(JOBS_DIR, jobId);
  if (!fs.existsSync(jobDir)) {
    console.log(`[skip] ${jobId}: dir not found`);
    return;
  }
  const assetsDir = path.join(jobDir, 'output', 'design-md', 'assets');
  const fontsDir = path.join(assetsDir, 'fonts');
  const manifestPath = path.join(assetsDir, 'manifest.json');
  if (!fs.existsSync(assetsDir)) {
    console.log(`[skip] ${jobId}: no assets dir`);
    return;
  }
  fs.mkdirSync(fontsDir, { recursive: true });

  const existing = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    : { fonts: [], logo: null, favicon: null };

  const seenUrls = new Set((existing.fonts || []).map((f) => f.sourceUrl));

  const rawFaces = collectFontFacesFromReplay(jobDir);
  console.log(`[${jobId}] found ${rawFaces.length} @font-face rules in replay css`);
  const faces = dedupeFontFaces(rawFaces).filter((f) => !seenUrls.has(f.url));
  console.log(`[${jobId}] ${faces.length} new (after dedupe + skip-existing)`);

  let added = 0;
  for (const f of faces) {
    process.stdout.write(`  ${f.family} ${f.weight} ${f.style} → `);
    const r = await fetchBuffer(f.url);
    if (!r.ok) {
      console.log(`fail (${r.reason || r.status})`);
      continue;
    }
    const ext = extOf(f.url, r.mime);
    const fname = `${shortHash(f.url)}.${ext}`;
    fs.writeFileSync(path.join(fontsDir, fname), r.buf);
    existing.fonts.push({
      family: f.family,
      weight: f.weight,
      style: f.style,
      sourceUrl: f.url,
      path: `assets/fonts/${fname}`,
      bytes: r.buf.length,
    });
    added += 1;
    console.log(`ok ${(r.buf.length / 1024).toFixed(1)}KB → ${fname}`);
  }

  fs.writeFileSync(manifestPath, JSON.stringify(existing, null, 2));
  console.log(`[${jobId}] wrote manifest with ${existing.fonts.length} fonts (${added} new)`);
}

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

async function main() {
  const args = process.argv.slice(2);
  let jobIds;
  if (args.includes('--all-bench')) {
    jobIds = findLatestBenchJobs();
    console.log(`Latest bench jobs: ${jobIds.join(', ')}`);
  } else if (args.length) {
    jobIds = args;
  } else {
    console.error('usage: node scripts/backfill-fonts.mjs <jobId> [...]  |  --all-bench');
    process.exit(1);
  }
  for (const j of jobIds) {
    console.log('');
    await backfillJob(j);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
