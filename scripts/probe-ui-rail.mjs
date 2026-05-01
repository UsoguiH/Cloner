import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:3100';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await page.goto(BASE, { waitUntil: 'networkidle' });

// Move mouse outside the sidebar so it stays in rail mode
await page.mouse.move(800, 400);

const railSnap = await page.evaluate(() => {
  const sb = document.querySelector('.sidebar');
  const sbw = sb.getBoundingClientRect().width;
  const get = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), visible: r.width > 0 && r.height > 0 };
  };
  return {
    sidebarWidth: Math.round(sbw),
    brand: get('.brand'),
    brandMark: get('.brand__mark'),
    newProjectBtn: get('#new-project-btn'),
    newProjectIcon: get('.projects__new-icon'),
    firstNavItem: get('.secondary-nav .nav-item'),
    profileBtn: get('#profile-btn'),
    profileAvatar: get('#profile-avatar'),
    creditCard: get('#credit-card'),
    activeProject: get('#active-project'),
  };
});

console.log('Rail snapshot:', JSON.stringify(railSnap, null, 2));

// Now hover the sidebar and re-screenshot
await page.hover('.sidebar');
await page.waitForTimeout(350);
await page.screenshot({ path: 'F:/[Claude code]/UI Cloner SaaS/probe-ui-hover.png', fullPage: false });
console.log('Hover screenshot saved.');

// Move mouse out and screenshot rail
await page.mouse.move(800, 400);
await page.waitForTimeout(350);
await page.screenshot({ path: 'F:/[Claude code]/UI Cloner SaaS/probe-ui-rail.png', fullPage: false });
console.log('Rail screenshot saved.');

await browser.close();
