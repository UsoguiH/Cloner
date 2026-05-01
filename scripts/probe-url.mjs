import { chromium } from 'playwright';

const URL = process.argv[2];
if (!URL) {
  console.error('usage: node probe-url.mjs <url>');
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const failures = [];
const errors = [];
page.on('response', (r) => { if (r.status() >= 400) failures.push({ s: r.status(), u: r.url() }); });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('framenavigated', (f) => { if (f === page.mainFrame()) console.log('nav:', f.url()); });

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

try {
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, { timeout: 20000 });
  console.log('SW controlling page');
} catch {
  console.log('SW never took control');
}

await page.waitForTimeout(6000);

const dim = await page.evaluate(() => {
  const picks = document.querySelectorAll('[data-clone-saas-pick]');
  const keeps = document.querySelectorAll('[data-clone-saas-keep]');
  const r = picks[0]?.getBoundingClientRect();
  return {
    bodyHeight: document.body?.scrollHeight,
    pickCount: picks.length,
    keepCount: keeps.length,
    pickRect: r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null,
    pickText: picks[0]?.innerText?.slice(0, 200),
    isControlled: !!navigator.serviceWorker?.controller,
    bodyTextSample: document.body?.innerText?.slice(0, 200),
  };
});

console.log(JSON.stringify(dim, null, 2));
console.log('failures:', failures.length);
for (const f of failures.slice(0, 10)) console.log(' ', f.s, f.u);
console.log('errors:', errors.length);
for (const e of errors.slice(0, 5)) console.log(' ', e.slice(0, 200));

await page.screenshot({ path: 'F:/[Claude code]/UI Cloner SaaS/probe-url.png', fullPage: false });
await browser.close();
