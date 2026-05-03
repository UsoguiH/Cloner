import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';

const jobId = process.argv[2] || 'sq9kfzgruxgu';
const cwd = path.resolve(`jobs/${jobId}/output`);

const proc = spawn(process.execPath, ['serve.cjs'], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
const ready = new Promise((resolve) => {
  proc.stdout.on('data', (b) => {
    const s = b.toString();
    process.stdout.write('[serve] ' + s);
    if (s.includes('Open http://')) resolve();
  });
  proc.stderr.on('data', (b) => process.stderr.write('[serve.err] ' + b.toString()));
});
await ready;
await new Promise((r) => setTimeout(r, 500));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const fails = [];
page.on('requestfailed', (req) => fails.push({ url: req.url().slice(0, 100), err: req.failure()?.errorText }));

await page.goto('http://127.0.0.1:8080/', { waitUntil: 'load' });
await page.waitForTimeout(4500);
await page.screenshot({ path: `probe-served-${jobId}.png` });
console.log('errors:', errors.length);
errors.slice(0, 3).forEach((e) => console.log('  ', e.slice(0, 200)));
console.log('failed reqs:', fails.length);
fails.slice(0, 5).forEach((f) => console.log('  ', f.err, '→', f.url));

const buttonText = await page.evaluate(() =>
  Array.from(document.querySelectorAll('button')).map((b) => b.innerText).filter(Boolean).slice(0, 8)
);
console.log('buttons:', buttonText);

// Click the apple intelligence button
try {
  const clicked = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((el) => /apple intelligence/i.test(el.innerText));
    if (b) { b.click(); return true; }
    return false;
  });
  console.log('clicked apple button:', clicked);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `probe-served-${jobId}-clicked.png` });
  console.log('after click → errors:', errors.length, 'fails:', fails.length);
} catch (e) {
  console.log('click failed:', e.message);
}

await browser.close();
proc.kill();
