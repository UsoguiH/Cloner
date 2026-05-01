import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:3100';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.click('#projects-expand');
await page.waitForTimeout(300);

const snap = await page.evaluate(() => {
  const list = document.getElementById('projects-list');
  const r = list.getBoundingClientRect();
  return {
    visibleCount: document.querySelectorAll('.project-item').length,
    listScrollHeight: list.scrollHeight,
    listClientHeight: list.clientHeight,
    isScrollable: list.classList.contains('is-scrollable'),
    listRectHeight: r.height,
    expandText: document.querySelector('.projects__expand-text')?.textContent,
    expandBtnVisible: !document.getElementById('projects-expand').hidden,
  };
});

console.log('Expanded snap:', JSON.stringify(snap, null, 2));
await page.screenshot({ path: 'F:/[Claude code]/UI Cloner SaaS/probe-ui-expand.png', fullPage: false });

// Also scroll inside the list to verify scrolling works
await page.evaluate(() => {
  document.getElementById('projects-list').scrollTop = 200;
});
await page.waitForTimeout(200);
await page.screenshot({ path: 'F:/[Claude code]/UI Cloner SaaS/probe-ui-expand-scrolled.png', fullPage: false });

await browser.close();
