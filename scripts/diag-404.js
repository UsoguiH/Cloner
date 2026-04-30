// Visit a cloned preview URL and report every failed/404 request.
import { chromium } from 'playwright';

const url = process.argv[2];
if (!url) { console.error('usage: node scripts/diag-404.js <preview-url>'); process.exit(1); }

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

const failures = [];
page.on('response', (r) => {
  const status = r.status();
  if (status >= 400) failures.push({ status, url: r.url() });
});
page.on('requestfailed', (req) => {
  failures.push({ status: 'NET_ERR', url: req.url(), error: req.failure()?.errorText });
});

await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
await page.waitForTimeout(2000);

console.log(`\n=== ${failures.length} failed requests ===`);
const byStatus = {};
for (const f of failures) {
  byStatus[f.status] = (byStatus[f.status] || 0) + 1;
}
console.log('by status:', byStatus);
console.log('');
for (const f of failures.slice(0, 60)) {
  console.log(`  ${f.status}  ${f.url}${f.error ? '  (' + f.error + ')' : ''}`);
}

await browser.close();
