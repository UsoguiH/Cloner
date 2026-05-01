// clone-saas portable launcher — Node stdlib only, runs anywhere with Node 18+
// Double-click start.bat (Windows) or start.sh (Mac/Linux) to use.
//
// Binds 127.0.0.1:8080 (or the next free port up to 8090), opens the default
// browser, and serves the bundle directory.

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

function send404(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
}

function sendFile(res, filePath) {
  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) return send404(res);
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
  if (urlPath === '/') urlPath = '/index.html';

  const target = path.resolve(ROOT, '.' + urlPath);
  if (!target.startsWith(ROOT)) {
    res.writeHead(403);
    res.end();
    return;
  }

  fs.stat(target, (err, st) => {
    if (err) return send404(res);
    if (st.isDirectory()) sendFile(res, path.join(target, 'index.html'));
    else sendFile(res, target);
  });
});

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
