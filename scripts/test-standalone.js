// Open jobs/<id>/output/index-standalone.html in headless Chromium and capture
// console errors + network failures so we can see why chunk loading fails.
import { chromium } from 'playwright';
import path from 'node:path';

const jobId = process.argv[2] || 'd5mvwjlh5xq6';
const file = path.resolve(`jobs/${jobId}/output/index-standalone.html`);
const fileUrl = 'file:///' + file.replace(/\\/g, '/');

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const consoleMsgs = [];
const requestFails = [];
page.on('console', (msg) => consoleMsgs.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => consoleMsgs.push(`[pageerror] ${err.message}`));
page.on('requestfailed', (req) => requestFails.push(`${req.method()} ${req.url()} → ${req.failure()?.errorText}`));

// Track ALL requests to see what URLs are being fetched
const allReqs = [];
page.on('request', (req) => allReqs.push(req.url()));

console.log('opening:', fileUrl);
await page.goto(fileUrl, { waitUntil: 'load' });
await page.waitForTimeout(3500);

console.log('\n=== console / page errors ===');
for (const m of consoleMsgs) console.log(m);

console.log('\n=== failed requests ===');
for (const r of requestFails) console.log(r);

console.log('\n=== requests to /_next/ chunks ===');
for (const u of allReqs) if (u.includes('_next/static/chunks')) console.log(u);

console.log('\n=== blob: requests ===');
for (const u of allReqs) if (u.startsWith('blob:')) console.log(u);

// Check if chunk 6827 path is in our remap table at runtime
const probe = await page.evaluate(() => {
  const out = { hasMap: false, mapSize: 0, has6827: false, blobFor6827: null };
  // dig into the bootstrap closure isn't possible — instead, test the patch
  try {
    const s = document.createElement('script');
    s.src = '/_next/static/chunks/6827.6722d5753604fbc1.js?dpl=test';
    out.afterSet = s.src;
  } catch(e) { out.err = e.message; }
  return out;
});
console.log('\n=== runtime probe (set script.src = /_next/.../6827...) ===');
console.log(probe);

await browser.close();
