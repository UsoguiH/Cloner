// clone-saas portable launcher — Node stdlib only, runs anywhere with Node 18+
// Double-click start.bat (Windows) or start.sh (Mac/Linux) to use.
//
// Binds 127.0.0.1:8080 (or the next free port up to 8090), opens the default
// browser, and serves the bundle directory.
//
// When a request can't be satisfied from disk, falls back to replay/manifest.json
// so first-paint stylesheets/scripts/fonts resolve before the service worker
// has a chance to take control. Without this fallback, the browser caches the
// initial 404s and the page renders unstyled even after the SW reload.

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { exec } = require('node:child_process');

const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.cjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.bmp': 'image/bmp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.pdf': 'application/pdf',
  '.wasm': 'application/wasm',
};

let MANIFEST = null;
try {
  const txt = fs.readFileSync(path.join(ROOT, 'replay', 'manifest.json'), 'utf8');
  MANIFEST = JSON.parse(txt);
} catch {
  MANIFEST = { entries: {}, byPath: {}, byBasename: {} };
}

function lookupReplay(urlPath) {
  if (!MANIFEST || !MANIFEST.entries) return null;
  if (MANIFEST.byPath && MANIFEST.byPath[urlPath]) {
    const canon = MANIFEST.byPath[urlPath];
    if (MANIFEST.entries[canon]) return MANIFEST.entries[canon];
  }
  const basename = urlPath.split('/').pop();
  if (basename && MANIFEST.byBasename && MANIFEST.byBasename[basename]) {
    const canon = MANIFEST.byBasename[basename];
    if (MANIFEST.entries[canon]) return MANIFEST.entries[canon];
  }
  return null;
}

function sendReplayEntry(res, entry) {
  const bodyPath = path.join(ROOT, 'replay', 'bodies', entry.body);
  fs.stat(bodyPath, (err, st) => {
    if (err || !st.isFile()) return send404(res);
    const headers = Object.assign({}, entry.headers || {});
    if (entry.mimeType && !headers['content-type']) headers['content-type'] = entry.mimeType;
    headers['access-control-allow-origin'] = '*';
    headers['cache-control'] = 'no-store';
    headers['service-worker-allowed'] = '/';
    headers['content-length'] = st.size;
    res.writeHead(entry.status || 200, headers);
    fs.createReadStream(bodyPath).pipe(res);
  });
}

function send404(res, urlPath) {
  // Send the right Content-Type for the extension so the browser doesn't
  // shout about MIME mismatches when caching the failure.
  let ct = 'text/plain; charset=utf-8';
  if (urlPath) {
    const ext = path.extname(urlPath).toLowerCase();
    if (MIME[ext]) ct = MIME[ext];
  }
  res.writeHead(404, { 'Content-Type': ct, 'Cache-Control': 'no-store' });
  res.end('Not found');
}

function sendFile(res, filePath, urlPath) {
  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) return send404(res, urlPath);
    const ext = path.extname(filePath).toLowerCase();
    const ct = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': ct,
      'Content-Length': st.size,
      'Cache-Control': 'no-store',
      'Service-Worker-Allowed': '/',
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }

  // Always serve the SW from disk (don't replay it).
  if (urlPath === '/sw.js' || urlPath === '/replay/manifest.json' || urlPath.startsWith('/replay/bodies/')) {
    const t = path.resolve(ROOT, '.' + urlPath);
    if (!t.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    return sendFile(res, t, urlPath);
  }

  // For navigations to root or component folders, serve the local index.html.
  let lookupPath = urlPath === '/' ? '/index.html' : urlPath;
  const target = path.resolve(ROOT, '.' + lookupPath);
  if (!target.startsWith(ROOT)) {
    res.writeHead(403);
    res.end();
    return;
  }

  fs.stat(target, (err, st) => {
    if (!err && st.isFile()) return sendFile(res, target, urlPath);
    if (!err && st.isDirectory()) {
      const idx = path.join(target, 'index.html');
      return fs.stat(idx, (e2, s2) => {
        if (!e2 && s2.isFile()) return sendFile(res, idx, urlPath);
        return tryReplay(res, urlPath);
      });
    }
    return tryReplay(res, urlPath);
  });
});

function tryReplay(res, urlPath) {
  const entry = lookupReplay(urlPath);
  if (entry) return sendReplayEntry(res, entry);
  return send404(res, urlPath);
}

function openBrowser(url) {
  const platform = process.platform;
  const cmd =
    platform === 'win32'
      ? `start "" "${url}"`
      : platform === 'darwin'
      ? `open "${url}"`
      : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

function tryListen(port) {
  server.once('error', (e) => {
    if (e.code === 'EADDRINUSE' && port < 8090) {
      tryListen(port + 1);
    } else {
      console.error('Failed to bind port:', e.message);
      process.exit(1);
    }
  });
  server.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${port}/`;
    console.log(`clone-saas bundle serving from ${ROOT}`);
    console.log(`Open ${url} (opening browser now). Press Ctrl+C to stop.`);
    openBrowser(url);
  });
}

tryListen(8080);
