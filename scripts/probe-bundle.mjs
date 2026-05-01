import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2];
if (!ROOT) {
  console.error('usage: node probe-bundle.mjs <bundleDir>');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const f = path.resolve(ROOT, '.' + p);
  if (!fs.existsSync(f)) {
    console.error('miss:', p, '->', f);
    res.writeHead(404);
    return res.end();
  }
  const st = fs.statSync(f);
  if (!st.isFile()) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream',
    'Service-Worker-Allowed': '/',
  });
  fs.createReadStream(f).pipe(res);
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const url = `http://127.0.0.1:${port}/`;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const failures = [];
const errors = [];
page.on('response', (r) => {
  if (r.status() >= 400) failures.push({ s: r.status(), u: r.url() });
});
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

page.on('framenavigated', (f) => {
  if (f === page.mainFrame()) console.log('nav:', f.url());
});

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
// SW boot triggers a reload on cold start. Wait for the reload to settle.
try {
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, { timeout: 15000 });
} catch (e) {
  console.log('controller wait timed out');
}
// After SW takes control, give the page time to lay out via replayed assets.
await page.waitForTimeout(8000);

const dim = await page.evaluate(() => {
  const picks = document.querySelectorAll('[data-clone-saas-pick]');
  const keeps = document.querySelectorAll('[data-clone-saas-keep]');
  const visiblePickRect = picks[0] ? picks[0].getBoundingClientRect() : null;
  const bodyText = (document.body && document.body.innerText || '').slice(0, 200);
  return {
    bodyHeight: document.body.scrollHeight,
    visibleHeight: window.innerHeight,
    pickCount: picks.length,
    keepCount: keeps.length,
    pickBoundingRect: visiblePickRect,
    bodyTextSample: bodyText,
    isControlled: !!navigator.serviceWorker.controller,
  };
});

console.log(JSON.stringify(dim, null, 2));
console.log('failures:', failures.length);
for (const f of failures.slice(0, 15)) console.log(' ', f.s, f.u);
console.log('errors:', errors.length);
for (const e of errors.slice(0, 5)) console.log(' ', e.slice(0, 200));

await page.screenshot({ path: 'F:/[Claude code]/UI Cloner SaaS/probe-bundle.png', fullPage: false });

await browser.close();
server.close();
