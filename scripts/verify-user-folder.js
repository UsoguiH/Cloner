import { chromium } from 'playwright';

const folder = process.argv[2] || 'C:/Users/adelx/Downloads/clone-xvcjf4mixqdj';
const fileUrl = 'file:///' + folder + '/preview.html';

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto(fileUrl, { waitUntil: 'load' });
await page.waitForTimeout(2500);
await page.screenshot({ path: 'probe-user-folder.png' });
const btn = await page.evaluate(() => {
  const b = document.querySelector('button');
  return b ? b.innerText : null;
});
console.log('button text:', btn);
await browser.close();
