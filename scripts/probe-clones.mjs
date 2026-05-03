import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('requestfailed', (r) => errors.push('reqfail: ' + r.url() + ' ' + (r.failure()?.errorText || '')));

await page.goto('http://localhost:3001/?v=' + Date.now(), { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(800);
await page.screenshot({ path: 'probe-clones-default.png', fullPage: false });

// Focus the URL input to verify focus ring
await page.click('#url');
await page.waitForTimeout(300);
await page.screenshot({ path: 'probe-clones-input-focus.png', fullPage: false, clip: { x: 0, y: 0, width: 1440, height: 600 } });

// Open advanced options + submit without ack to fire toast
await page.click('details.options summary');
await page.waitForTimeout(150);
await page.fill('#url', 'mindmarket.com');
await page.click('#submit');
await page.waitForTimeout(700);
await page.screenshot({ path: 'probe-clones-toast.png', fullPage: false });

// Click ack and submit again to start a real clone -> progress bar should show
await page.check('#opt-ack');
await page.click('#submit');
await page.waitForTimeout(500);
await page.screenshot({ path: 'probe-clones-pbar.png', fullPage: false, clip: { x: 0, y: 0, width: 1440, height: 80 } });
await page.waitForTimeout(800);
await page.screenshot({ path: 'probe-clones-pbar-2.png', fullPage: false, clip: { x: 0, y: 0, width: 1440, height: 80 } });

// Spam toasts to see stack
for (let i = 0; i < 3; i++) {
  await page.evaluate(() => {
    const m = window.__tk; // not exposed; trigger via opening details + submit again skip
  });
}
// Easier: use the page's existing toast via repeated invalid submits
await page.uncheck('#opt-ack');
for (let i = 0; i < 3; i++) {
  await page.click('#submit');
  await page.waitForTimeout(120);
}
await page.waitForTimeout(400);
await page.screenshot({ path: 'probe-clones-stack.png', fullPage: false });

// Hover the toaster to expand
const toaster = await page.$('.tk-toaster');
if (toaster) {
  const box = await toaster.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(700);
    await page.screenshot({ path: 'probe-clones-stack-expanded.png', fullPage: false });
  }
}

console.log('errors:', errors.length);
errors.slice(0, 20).forEach((e) => console.log('  -', e));
await browser.close();
