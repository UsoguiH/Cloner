import { chromium } from 'playwright';
import path from 'node:path';

const jobId = process.argv[2] || 'sq9kfzgruxgu';
const file = path.resolve(`jobs/${jobId}/output/clone/index.html`);
const fileUrl = 'file:///' + file.replace(/\\/g, '/');

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const fails = [];
page.on('requestfailed', (req) => {
  fails.push({ url: req.url().slice(0, 100), err: req.failure()?.errorText });
});
const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200));
});

await page.goto(fileUrl, { waitUntil: 'load' });
await page.waitForTimeout(4500);
await page.screenshot({ path: `probe-clone-${jobId}.png` });
console.log('errors:', errors.length);
errors.slice(0, 3).forEach((e) => console.log('  pageerror:', e.slice(0, 200)));
console.log('failed reqs:', fails.length);
fails.slice(0, 6).forEach((f) => console.log('  ', f.err, '→', f.url));
console.log('console errors:', consoleErrors.length);
consoleErrors.slice(0, 3).forEach((e) => console.log('  ', e));

const buttonText = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'));
  return btns.map((b) => b.innerText).filter(Boolean);
});
console.log('buttons:', buttonText.slice(0, 5));

// Now try clicking the Apple Intelligence button to see if the lazy chunk loads.
try {
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find(
      (el) => /apple intelligence/i.test(el.innerText)
    );
    if (b) b.click();
  });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `probe-clone-${jobId}-clicked.png` });
  console.log('after click → errors:', errors.length, 'fails:', fails.length);
} catch (e) {
  console.log('click failed:', e.message);
}

await browser.close();
