import { chromium } from 'playwright';

const URL = process.argv[2];
if (!URL) { console.error('usage: node probe-sw.mjs <url>'); process.exit(1); }

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

page.on('response', async (r) => {
  if (r.status() >= 400) {
    console.log('FAIL', r.status(), r.url(), 'fromSW=' + (r.fromServiceWorker?.() ?? 'n/a'));
  }
});
page.on('framenavigated', (f) => { if (f === page.mainFrame()) console.log('nav:', f.url()); });

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
try {
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, { timeout: 20000 });
  console.log('SW controlling');
} catch { console.log('no SW'); }

await page.waitForTimeout(8000);

// Test SW directly: try to fetch a known asset and see if SW serves it
const swTest = await page.evaluate(async () => {
  try {
    const r = await fetch('/_nuxt/entry.242f20de.css');
    return { ok: r.ok, status: r.status, ct: r.headers.get('content-type'), len: (await r.text()).length };
  } catch (e) { return { error: String(e) }; }
});
console.log('direct fetch test:', JSON.stringify(swTest));

await page.screenshot({ path: 'F:/[Claude code]/UI Cloner SaaS/probe-sw.png', fullPage: false });
await browser.close();
