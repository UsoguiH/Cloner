import { chromium } from 'playwright';

const URL = process.argv[2] || 'http://127.0.0.1:8080/';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const errors = [];
const failedRequests = [];
const swRequests = [];

page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push('console.error: ' + msg.text());
});
page.on('requestfailed', (req) => {
  failedRequests.push(`${req.failure()?.errorText} ${req.method()} ${req.url()}`);
});
page.on('response', (resp) => {
  if (resp.fromServiceWorker()) {
    swRequests.push(resp.url());
  }
});

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
try { await page.waitForLoadState('load', { timeout: 10000 }); } catch {}
try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch {}
await page.waitForTimeout(2500);

const swActive = await page.evaluate(() => {
  return navigator.serviceWorker && navigator.serviceWorker.controller != null;
});
const docTitle = await page.title();
const visibleBodyText = await page.evaluate(() => (document.body && document.body.innerText || '').slice(0, 200));

console.log(JSON.stringify({
  swActive,
  docTitle,
  swRequestCount: swRequests.length,
  failedRequests: failedRequests.slice(0, 8),
  errors: errors.slice(0, 10),
  visibleBodyText,
}, null, 2));

await browser.close();
