import { chromium } from 'playwright';
import path from 'node:path';

const jobId = process.argv[2] || 'd5mvwjlh5xq6';
const file = path.resolve(`jobs/${jobId}/output/index-snapshot.html`);
const fileUrl = 'file:///' + file.replace(/\\/g, '/');

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const reqFails = [];
page.on('requestfailed', (req) => reqFails.push(req.url().slice(0, 100) + ' → ' + req.failure()?.errorText));
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(fileUrl, { waitUntil: 'load' });
await page.waitForTimeout(3000);
const out = `probe-snapshot-${jobId}.png`;
await page.screenshot({ path: out, fullPage: false });
console.log('screenshot:', out);

const txt = await page.evaluate(() => document.body.innerText.slice(0, 500));
console.log('body text first 500:', txt);
console.log('errors:', errors.length, errors.slice(0, 3));
console.log('failed reqs:', reqFails.length, reqFails.slice(0, 3));

await browser.close();
