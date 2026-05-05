/**
 * Self-verification gate.
 *
 * After the bundle is assembled but before zipping, open the produced
 * preview.html (the file users actually double-click) under a real browser
 * via file:// and check whether it renders without errors. Three signals
 * decide pass/warn:
 *
 *   1. Console errors — anything reaching console.error means a runtime
 *      crashed in the snapshot.
 *   2. Failed network requests — non-data: URLs that 4xx, 5xx, or net::ERR.
 *      Snapshot is supposed to be self-contained, so any failed request is
 *      a bundling miss.
 *   3. DOM signals — visible body text, element count, computed background
 *      images. A near-empty body (< 50 chars text, < 30 elements) almost
 *      always means the capture caught the page pre-hydration.
 *
 * Result is written to <outputDir>/verify.json and returned to the caller
 * so the job's progress object can surface it as a UI warning badge.
 */

import path from 'node:path';
import fsp from 'node:fs/promises';
import url from 'node:url';
import { chromium } from 'playwright';

export async function verifyBundle({ outputDir, jobUrl, failedAssetCount = 0 }) {
  const previewPath = path.join(outputDir, 'preview.html');
  // If preview.html wasn't produced, skip — runCloneJob already logged the
  // upstream snapshot failure. Don't double-flag.
  try { await fsp.access(previewPath); }
  catch {
    return { status: 'skipped', reason: 'no preview.html' };
  }

  const fileUrl = url.pathToFileURL(previewPath).toString();
  const consoleErrors = [];
  const failedRequests = [];
  let signals = { textChars: 0, elements: 0, images: 0 };

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      // file:// can host neither service workers nor HTTP requests, so any
      // request firing is a remote dependency the bundle didn't inline.
      serviceWorkers: 'block',
    });
    const page = await ctx.newPage();

    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      if (consoleErrors.length >= 30) return;
      consoleErrors.push(msg.text().slice(0, 400));
    });
    page.on('pageerror', (err) => {
      if (consoleErrors.length >= 30) return;
      consoleErrors.push(`pageerror: ${String(err && err.message || err).slice(0, 400)}`);
    });
    page.on('requestfailed', (req) => {
      if (failedRequests.length >= 30) return;
      const u = req.url();
      // Snapshot inlines assets as data: URIs; data:/blob: failures
      // shouldn't happen and aren't useful signal anyway.
      if (u.startsWith('data:') || u.startsWith('blob:')) return;
      failedRequests.push({
        url: u.slice(0, 300),
        reason: (req.failure() && req.failure().errorText) || 'unknown',
      });
    });
    page.on('response', (res) => {
      const s = res.status();
      if (s < 400) return;
      if (failedRequests.length >= 30) return;
      const u = res.url();
      if (u.startsWith('data:') || u.startsWith('blob:')) return;
      failedRequests.push({ url: u.slice(0, 300), reason: `HTTP ${s}` });
    });

    try {
      await page.goto(fileUrl, { waitUntil: 'load', timeout: 20000 });
    } catch (err) {
      consoleErrors.push(`goto: ${err.message.slice(0, 300)}`);
    }
    // Brief settle: lets CSS animations + @font-face resolve. Snapshot has
    // no JS so DOMContentLoaded already means the tree is final.
    await page.waitForTimeout(800);

    try {
      signals = await page.evaluate(() => ({
        textChars: (document.body && document.body.innerText || '').trim().length,
        elements: document.querySelectorAll('*').length,
        images: document.querySelectorAll('img, svg, picture').length,
      }));
    } catch {}
  } catch (err) {
    consoleErrors.push(`verify launch failed: ${String(err && err.message || err).slice(0, 300)}`);
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }

  // Pass thresholds. These are intentionally lenient — a few CSS 404s for
  // optional fonts shouldn't fail the gate, but a crashed page or empty
  // body should. Tune from real-world data, not guesses.
  const failures = [];
  if (consoleErrors.length > 0) {
    failures.push(`${consoleErrors.length} console error(s)`);
  }
  if (failedRequests.length >= 3) {
    failures.push(`${failedRequests.length} failed network request(s)`);
  }
  if (signals.textChars < 50 && signals.elements < 30) {
    failures.push(`near-empty body (${signals.textChars} chars, ${signals.elements} elements)`);
  }
  if (failedAssetCount > 5) {
    failures.push(`${failedAssetCount} asset bod(ies) failed to capture`);
  }

  const result = {
    status: failures.length ? 'warnings' : 'passed',
    sourceUrl: jobUrl,
    verifiedAt: new Date().toISOString(),
    signals,
    consoleErrors: consoleErrors.slice(0, 10),
    failedRequests: failedRequests.slice(0, 10),
    failedAssetCount,
    failures,
  };

  try {
    await fsp.writeFile(
      path.join(outputDir, 'verify.json'),
      JSON.stringify(result, null, 2),
      'utf8'
    );
  } catch {}

  return result;
}
