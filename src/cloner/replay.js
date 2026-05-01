/**
 * Replay bundle builder.
 *
 * Takes the CDP recorder's response map and writes a directory layout that
 * the bundled service worker (`templates/sw.js`) can replay against:
 *
 *   <outputDir>/
 *     replay/
 *       manifest.json   { entries: { url -> {body,status,headers,mimeType} },
 *                         byPath: { pathname -> canonicalUrl },
 *                         byBasename: { basename -> canonicalUrl } }
 *       bodies/<sha1>   raw response body, one file per URL
 *
 * Headers that conflict with the new transport (content-encoding because the
 * stored body is already decoded; content-length because the size is known
 * from the file; CSP / framing because we want the page to actually run from
 * 127.0.0.1) are stripped. Set-Cookie is dropped because we're not preserving
 * sessions.
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const STRIP_HEADERS = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
  'set-cookie',
  'strict-transport-security',
  'content-security-policy',
  'content-security-policy-report-only',
  'x-frame-options',
  'cross-origin-opener-policy',
  'cross-origin-embedder-policy',
  'cross-origin-resource-policy',
]);

function filterHeaders(h) {
  const out = {};
  for (const [k, v] of Object.entries(h || {})) {
    if (STRIP_HEADERS.has(k.toLowerCase())) continue;
    out[k] = String(v);
  }
  return out;
}

export async function buildReplayBundle({
  recorder,
  outputDir,
  docUrl,
  isAnalytics,
  opts,
}) {
  const replayDir = path.join(outputDir, 'replay');
  const bodiesDir = path.join(replayDir, 'bodies');
  await fs.mkdir(bodiesDir, { recursive: true });

  const entries = {};
  const byPath = {};
  const byBasename = {};
  let recorded = 0;
  let totalBytes = 0;

  for (const [url, rec] of recorder.responses.entries()) {
    if (url === docUrl) continue;
    if (rec.body == null) continue;
    if (opts && opts.stripAnalytics && isAnalytics && isAnalytics(url)) continue;

    const buf = rec.bodyBase64
      ? Buffer.from(rec.body, 'base64')
      : Buffer.from(rec.body, 'utf8');

    const hash = crypto.createHash('sha1').update(url).digest('hex');
    await fs.writeFile(path.join(bodiesDir, hash), buf);

    entries[url] = {
      body: hash,
      status: rec.status || 200,
      headers: filterHeaders(rec.headers),
      mimeType: rec.mimeType || '',
    };

    try {
      const u = new URL(url);
      if (!byPath[u.pathname]) byPath[u.pathname] = url;
      const last = u.pathname.split('/').pop();
      if (last && !byBasename[last]) byBasename[last] = url;
    } catch {}

    recorded++;
    totalBytes += buf.length;
  }

  const manifest = {
    generated: new Date().toISOString(),
    docUrl,
    entries,
    byPath,
    byBasename,
  };
  await fs.writeFile(
    path.join(replayDir, 'manifest.json'),
    JSON.stringify(manifest),
    'utf8'
  );

  return { recorded, totalBytes, dir: replayDir };
}

/**
 * Copy launcher templates (sw.js, serve.cjs, start.bat, start.sh) into a
 * bundle directory. The bootstrap script lives in memory only — it gets
 * inlined into <head> by the caller.
 */
export async function copyLauncher(targetDir, templatesDir) {
  const files = ['sw.js', 'serve.cjs', 'start.bat', 'start.sh'];
  for (const f of files) {
    const src = path.join(templatesDir, f);
    const dst = path.join(targetDir, f);
    await fs.copyFile(src, dst);
    if (f === 'start.sh') {
      try { await fs.chmod(dst, 0o755); } catch {}
    }
  }
}

/**
 * Read the bootstrap snippet to inline at the top of <head>.
 */
export async function readBootstrap(templatesDir) {
  return await fs.readFile(path.join(templatesDir, 'replay-bootstrap.js'), 'utf8');
}
