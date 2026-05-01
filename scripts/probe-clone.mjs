import { chromium } from 'playwright';

const JOB = process.argv[2];
const PORT = process.argv[3] || '3100';
if (!JOB) {
  console.error('usage: node probe-clone.mjs <jobId> [port]');
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const failures = [];
const consoleErrors = [];
page.on('response', (r) => {
  if (r.status() >= 400) {
    failures.push({ status: r.status(), url: r.url(), ct: r.headers()['content-type'] || '' });
  }
});
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});

await page.goto(`http://localhost:${PORT}/api/jobs/${JOB}/preview/`, {
  waitUntil: 'networkidle',
  timeout: 30000,
});

await page.waitForTimeout(1500);

const dim = await page.evaluate(() => ({
  scrollHeight: document.body.scrollHeight,
  imgsTotal: document.querySelectorAll('img').length,
  imgsLoaded: [...document.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth > 0).length,
}));

console.log('--- preview metrics ---');
console.log('scrollHeight:', dim.scrollHeight);
console.log('images loaded:', dim.imgsLoaded, '/', dim.imgsTotal);
console.log('failed responses:', failures.length);
for (const f of failures.slice(0, 30)) {
  console.log(' ', f.status, f.ct, f.url);
}
console.log('console errors:', consoleErrors.length);
for (const e of consoleErrors.slice(0, 10)) {
  console.log(' ', e.slice(0, 200));
}

await page.screenshot({
  path: `F:/[Claude code]/UI Cloner SaaS/probe-clone-${JOB}.png`,
  fullPage: false,
});
console.log('screenshot:', `probe-clone-${JOB}.png`);

await browser.close();
