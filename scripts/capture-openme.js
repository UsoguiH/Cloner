import { chromium } from 'playwright';
import path from 'node:path';

const jobId = process.argv[2] || 'd5mvwjlh5xq6';
const file = path.resolve(`jobs/${jobId}/output/OPEN_ME.html`);
const fileUrl = 'file:///' + file.replace(/\\/g, '/');

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const fails = [];
page.on('requestfailed', (req) => fails.push(req.url().slice(0, 80)));

await page.goto(fileUrl, { waitUntil: 'load' });
await page.waitForTimeout(2500);
await page.screenshot({ path: `probe-openme-${jobId}.png` });
console.log('errors:', errors.length, 'failed reqs:', fails.length);
const errMsg = await page.evaluate(() => {
  const e = document.body.innerText.match(/Error loading component[\s\S]{0,80}/);
  return e ? e[0] : null;
});
console.log('error overlay:', errMsg);
await browser.close();
