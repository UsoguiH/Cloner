import { chromium } from 'playwright';

const file = 'C:/Users/adelx/Downloads/clone-sq9kfzgruxgu/OPEN_ME.html';
const fileUrl = 'file:///' + file;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const fails = [];
page.on('requestfailed', (req) => fails.push(req.url().slice(0, 80)));

await page.goto(fileUrl, { waitUntil: 'load' });
await page.waitForTimeout(2500);
await page.screenshot({ path: 'probe-user-download.png' });
console.log('errors:', errors.length, 'failed reqs:', fails.length);

const buttonText = await page.evaluate(() => {
  const b = document.querySelector('button');
  return b ? b.innerText : null;
});
console.log('first button text:', JSON.stringify(buttonText));

const hasGradient = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('*')).some(el => {
    const cs = getComputedStyle(el);
    return cs.background && cs.background.includes('gradient');
  });
});
console.log('has gradient styling:', hasGradient);

await browser.close();
