import { chromium } from 'playwright';
import path from 'node:path';
const file = path.resolve('jobs/d5mvwjlh5xq6/output/index-standalone-debug.html');
const fileUrl = 'file:///' + file.replace(/\\/g, '/');
const browser = await chromium.launch();
const page = await browser.newContext().then(c => c.newPage());
await page.goto(fileUrl, { waitUntil: 'load' });
await page.waitForTimeout(2500);
const log = await page.evaluate(() => {
  return {
    log: window.__remapLog || 'MISSING',
    has6827call: (window.__remapLog || []).filter(v => typeof v === 'string' && v.includes('6827')),
    descriptorCheck: (function() {
      const d = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
      return { hasGetter: !!(d && d.get), hasSetter: !!(d && d.set), srcStr: (d && d.set || '').toString().slice(0, 100) };
    })(),
  };
});
console.log('total remap calls:', Array.isArray(log.log) ? log.log.length : log.log);
console.log('6827 calls:', log.has6827call);
console.log('descriptor:', log.descriptorCheck);
console.log('first 10 calls:', Array.isArray(log.log) ? log.log.slice(0, 10) : []);
await browser.close();
