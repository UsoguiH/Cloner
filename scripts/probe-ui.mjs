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

const snapshot = await page.evaluate(() => {
  const has = (id) => !!document.getElementById(id);
  const visible = (id) => {
    const el = document.getElementById(id);
    if (!el) return null;
    return !el.hidden && el.offsetParent !== null;
  };
  const projectItems = document.querySelectorAll('.project-item').length;
  const sidebarBoot = !!document.querySelector('.sidebar .brand__name');
  const cloneFormVisible = visible('view-clone');
  const projectViewVisible = visible('view-project');
  const featureCards = document.querySelectorAll('.feature-card').length;
  return {
    sidebarBoot,
    has_url_input: has('url'),
    has_submit: has('submit'),
    has_projects_list: has('projects-list'),
    projects_empty_visible: visible('projects-empty'),
    project_count: projectItems,
    cloneFormVisible,
    projectViewVisible,
    featureCards,
    crumb: document.getElementById('crumb-active')?.textContent,
    activeName: document.getElementById('active-name')?.textContent,
  };
});

console.log('UI snapshot:', JSON.stringify(snapshot, null, 2));
console.log('\nErrors:', errors.length === 0 ? 'none' : errors);

// Take a screenshot for visual sanity
await page.screenshot({ path: 'F:/[Claude code]/UI Cloner SaaS/probe-ui.png', fullPage: false });
console.log('\nScreenshot saved to probe-ui.png');

await browser.close();
