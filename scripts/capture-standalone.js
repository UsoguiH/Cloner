import { chromium } from 'playwright';
import path from 'node:path';

const jobId = process.argv[2] || 'd5mvwjlh5xq6';
const file = path.resolve(`jobs/${jobId}/output/index-standalone.html`);
const fileUrl = 'file:///' + file.replace(/\\/g, '/');

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', (err) => errors.push(err.message));
page.on('requestfailed', (req) => {
  const f = req.failure();
  if (f) errors.push(`req-fail: ${req.url().slice(0, 100)} → ${f.errorText}`);
});

await page.goto(fileUrl, { waitUntil: 'load' });
await page.waitForTimeout(4000);

const out = `probe-standalone-${jobId}.png`;
await page.screenshot({ path: out, fullPage: false });
console.log('screenshot:', out);

const errMsg = await page.evaluate(() => {
  const e = document.body.innerText.match(/Error loading component[\s\S]{0,200}/);
  return e ? e[0] : null;
});
console.log('error text on page:', errMsg);
console.log('---');
console.log('first 5 errors/failures:');
errors.slice(0, 5).forEach((m) => console.log('  ', m));

await browser.close();
