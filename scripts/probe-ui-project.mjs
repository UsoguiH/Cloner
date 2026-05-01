import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:3100';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push('console.error: ' + msg.text());
});

await page.goto(BASE, { waitUntil: 'networkidle' });

// Click the first project in the sidebar
await page.click('.project-item');
await page.waitForTimeout(800);

const snap = await page.evaluate(() => {
  const visible = (id) => {
    const el = document.getElementById(id);
    if (!el) return null;
    return !el.hidden && el.offsetParent !== null;
  };
  return {
    cloneVisible: visible('view-clone'),
    projectVisible: visible('view-project'),
    crumb: document.getElementById('crumb-active')?.textContent,
    projectUrl: document.getElementById('project-url')?.textContent,
    badge: document.getElementById('project-badge')?.textContent,
    actionsVisible: visible('project-actions'),
    statsVisible: visible('project-stats'),
    statReplayed: document.getElementById('stat-replayed')?.textContent,
    statBytes: document.getElementById('stat-bytes')?.textContent,
    activeName: document.getElementById('active-name')?.textContent,
  };
});

console.log('Project view snapshot:', JSON.stringify(snap, null, 2));
console.log('\nErrors:', errors.length === 0 ? 'none' : errors);

await page.screenshot({ path: 'F:/[Claude code]/UI Cloner SaaS/probe-ui-project.png', fullPage: false });
console.log('Screenshot saved.');

await browser.close();
