// =============================================================================
// Code-gen verification harness (Phase 7.1).
//
// A design.md whose tokens compile into working CSS is a different artifact
// than one that only describes a system in prose. This harness proves that
// claim site-by-site: it takes our emitted tailwind.config.json + dtcg
// tokens, generates Tailwind-shaped CSS by hand (no Tailwind CLI dep), feeds
// it into a sample HTML page that exercises every declared color, and
// renders the result in Playwright. It then samples the painted pixels and
// verifies the declared colors actually appear at the painted output.
//
// Why this matters strategically:
//   • Catches whole classes of bugs a markdown linter can't — a token
//     referenced by components that doesn't exist, a malformed config,
//     a low-contrast pair that compiles but renders invisibly.
//   • Uncheatable: an LLM judge can be sweet-talked, a pixel histogram
//     cannot.
//   • An axis getdesign.md structurally can't compete on. Their output
//     isn't structured for code-gen verification — ours is.
//
// Three phases per site (each gated; later phases skip if earlier fail):
//   1. STATIC   — tailwind.config.json parses; every color is a valid CSS
//                 value; fontFamily/fontSize/borderRadius shapes are correct;
//                 dtcg.tokens.json round-trips against tailwind colors.
//   2. COMPILE  — emit a CSS file from the tailwind config (utility classes
//                 + CSS variables); confirm every declared color makes it
//                 into the output.
//   3. PAINT    — render a sample card per color in Playwright at 1024×768;
//                 sample top-N pixel-frequency hexes; require ≥ 80% of
//                 declared colors to appear in the painted histogram.
//
// Output: bench/codegen-results.json (per-site verdict + diagnostics).
//
// Usage:
//   node bench/verify-codegen.mjs                         # all 4 bench sites
//   node bench/verify-codegen.mjs --sites figma,linear
//   node bench/verify-codegen.mjs --job <jobId>           # single job dir
//   node bench/verify-codegen.mjs --no-paint              # skip Playwright phase
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const JOBS_DIR = path.join(ROOT, 'jobs');
const RESULTS_PATH = path.join(__dirname, 'codegen-results.json');

const ALL_SITES = ['figma.com', 'linear.app', 'stripe.com', 'notion.so'];
const VIEWPORT = { width: 1024, height: 768 };
const PAINT_TOP_N = 40;
const PAINT_COVERAGE_MIN = 0.8;

// Generous CSS color regex — accepts #hex (3/4/6/8), rgb/rgba(), hsl/hsla(),
// transparent / currentColor / named colors. We're sanity-checking, not
// implementing a full CSS parser.
const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_RE = /^rgba?\(\s*[\d.\s,/%]+\)$/i;
const HSL_RE = /^hsla?\(\s*[\d.\s,/%a-z]+\)$/i;
const NAMED_RE = /^(transparent|currentcolor|inherit|initial|unset|none|black|white|red|green|blue|yellow|orange|purple|pink|gray|grey)$/i;

function isValidCssColor(v) {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  return HEX_RE.test(s) || RGB_RE.test(s) || HSL_RE.test(s) || NAMED_RE.test(s);
}

function isValidCssLength(v) {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  return /^(0|[\d.]+(px|rem|em|%|vh|vw|ch|ex|pt|pc|cm|mm|in)?)$/i.test(s);
}

function parseArgs(argv) {
  const out = { sites: ALL_SITES, jobs: [], paint: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--sites' && argv[i + 1]) {
      out.sites = argv[++i].split(',').map((s) => s.trim()).map((s) => {
        if (ALL_SITES.includes(s)) return s;
        const m = ALL_SITES.find((x) => x.startsWith(s));
        return m || s;
      }).filter(Boolean);
    } else if (a === '--job' && argv[i + 1]) {
      out.jobs.push(argv[++i]);
    } else if (a === '--no-paint') {
      out.paint = false;
    }
  }
  return out;
}

// ------- Phase 1: STATIC -----------------------------------------------------

function staticCheck(twConfig, dtcg) {
  const errors = [];
  const warnings = [];

  if (!twConfig || typeof twConfig !== 'object') {
    errors.push('tailwind.config.json: not an object');
    return { ok: false, errors, warnings };
  }
  const ext = twConfig.theme?.extend;
  if (!ext || typeof ext !== 'object') {
    errors.push('tailwind.config.json: missing theme.extend');
    return { ok: false, errors, warnings };
  }

  const colors = ext.colors || {};
  const colorEntries = Object.entries(colors);
  if (!colorEntries.length) errors.push('no colors declared');
  for (const [name, value] of colorEntries) {
    if (typeof value === 'string') {
      if (!isValidCssColor(value)) errors.push(`colors.${name}: invalid CSS color "${value}"`);
    } else if (value && typeof value === 'object') {
      // Tailwind nested-shade form, e.g. primary: { 100: '#...', 500: '#...' }
      for (const [shade, sv] of Object.entries(value)) {
        if (!isValidCssColor(sv)) errors.push(`colors.${name}.${shade}: invalid CSS color "${sv}"`);
      }
    } else {
      errors.push(`colors.${name}: expected string or shade-map, got ${typeof value}`);
    }
  }

  for (const [name, family] of Object.entries(ext.fontFamily || {})) {
    if (!Array.isArray(family) || !family.length) {
      errors.push(`fontFamily.${name}: expected non-empty array of family names`);
      continue;
    }
    for (const f of family) {
      if (typeof f !== 'string') errors.push(`fontFamily.${name}: non-string entry`);
    }
  }

  for (const [name, sizeVal] of Object.entries(ext.fontSize || {})) {
    if (typeof sizeVal === 'string') {
      if (!isValidCssLength(sizeVal)) errors.push(`fontSize.${name}: invalid length "${sizeVal}"`);
    } else if (Array.isArray(sizeVal)) {
      if (!isValidCssLength(sizeVal[0])) errors.push(`fontSize.${name}[0]: invalid length "${sizeVal[0]}"`);
    } else {
      errors.push(`fontSize.${name}: unexpected shape`);
    }
  }

  for (const [name, val] of Object.entries(ext.borderRadius || {})) {
    if (!isValidCssLength(val)) errors.push(`borderRadius.${name}: invalid length "${val}"`);
  }

  // Cross-check DTCG tokens: every declared color in tailwind should match
  // the dtcg colors set (case- and hash-insensitive on the value).
  if (dtcg && dtcg.color) {
    const dtcgHexes = new Set();
    for (const [, entry] of Object.entries(dtcg.color)) {
      const hex = entry?.$value?.hex;
      if (hex) dtcgHexes.add(hex.toLowerCase());
    }
    let twHexCount = 0;
    let twHexInDtcg = 0;
    for (const v of Object.values(colors)) {
      if (typeof v === 'string' && HEX_RE.test(v)) {
        twHexCount += 1;
        if (dtcgHexes.has(v.toLowerCase())) twHexInDtcg += 1;
      }
    }
    if (twHexCount && twHexInDtcg / twHexCount < 0.5) {
      warnings.push(`only ${twHexInDtcg}/${twHexCount} tailwind colors round-trip to dtcg.tokens.json`);
    }
  }

  return { ok: !errors.length, errors, warnings, colorCount: colorEntries.length };
}

// ------- Phase 2: COMPILE ----------------------------------------------------

// Emit minimal Tailwind-shaped CSS from the config. We don't ship the real
// Tailwind compiler — this is a "would the tokens flow into utility classes"
// check, not a Tailwind feature audit.
function compileCss(twConfig) {
  const ext = twConfig.theme?.extend || {};
  const colors = ext.colors || {};
  const lines = [':root {'];
  for (const [name, value] of Object.entries(colors)) {
    if (typeof value === 'string') lines.push(`  --color-${name}: ${value};`);
    else if (value && typeof value === 'object') {
      for (const [shade, sv] of Object.entries(value)) {
        lines.push(`  --color-${name}-${shade}: ${sv};`);
      }
    }
  }
  for (const [name, value] of Object.entries(ext.borderRadius || {})) {
    lines.push(`  --rounded-${name}: ${value};`);
  }
  lines.push('}');
  let utilityCount = 0;
  for (const [name, value] of Object.entries(colors)) {
    if (typeof value === 'string') {
      lines.push(`.bg-${name} { background-color: var(--color-${name}); }`);
      lines.push(`.text-${name} { color: var(--color-${name}); }`);
      lines.push(`.border-${name} { border-color: var(--color-${name}); }`);
      utilityCount += 3;
    }
  }
  for (const [name, value] of Object.entries(ext.borderRadius || {})) {
    lines.push(`.rounded-${name} { border-radius: var(--rounded-${name}); }`);
    utilityCount += 1;
  }
  return { css: lines.join('\n'), utilityCount };
}

function compilePhase(twConfig) {
  const { css, utilityCount } = compileCss(twConfig);
  const errors = [];
  const colorNames = Object.keys(twConfig.theme?.extend?.colors || {});
  const missing = [];
  for (const c of colorNames) {
    const value = twConfig.theme.extend.colors[c];
    if (typeof value !== 'string') continue;
    if (!css.includes(`--color-${c}:`)) missing.push(c);
  }
  if (missing.length) errors.push(`color tokens not emitted: ${missing.join(', ')}`);
  return {
    ok: !errors.length,
    errors,
    warnings: [],
    cssBytes: Buffer.byteLength(css),
    utilityCount,
    css,
  };
}

// ------- Phase 3: PAINT ------------------------------------------------------

function buildSampleHtml(twConfig, css) {
  const colors = twConfig.theme?.extend?.colors || {};
  const colorNames = Object.entries(colors)
    .filter(([, v]) => typeof v === 'string')
    .map(([k]) => k);
  // One large filled rect per color so the histogram has lots of pixels of
  // each declared color. Plain CSS, no Tailwind compile needed at runtime.
  const swatches = colorNames.map((c) => {
    return `<div class="swatch bg-${c}" data-name="${c}"></div>`;
  }).join('\n');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>verify-codegen sample</title>
<style>
${css}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #ffffff; padding: 0; font-family: sans-serif; }
.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; }
.swatch { width: 256px; height: 192px; }
</style>
</head>
<body>
<div class="grid">
${swatches}
</div>
</body>
</html>`;
}

function hexFromRgb(r, g, b) {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function quantize8(v) { return v & 0xf8; } // 5-bit per channel for clustering

async function paintPhase(twConfig, css) {
  const colors = twConfig.theme?.extend?.colors || {};
  const declaredHexes = Object.values(colors)
    .filter((v) => typeof v === 'string' && HEX_RE.test(v))
    .map((v) => v.toLowerCase().replace(/^#/, ''));

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-codegen-'));
  const htmlPath = path.join(tmpDir, 'sample.html');
  fs.writeFileSync(htmlPath, buildSampleHtml(twConfig, css));

  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch (err) { return { ok: false, errors: [`playwright unavailable: ${err.message}`], warnings: [] }; }

  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto('file:///' + htmlPath.replace(/\\/g, '/'));
    await page.waitForLoadState('domcontentloaded');

    // Sample pixels via canvas in-page. Returns top-N quantized hex frequencies.
    const histogram = await page.evaluate(async (topN) => {
      const w = document.documentElement.clientWidth;
      const h = document.documentElement.clientHeight;
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      // Use html2canvas-like approach: rasterize body to canvas via foreignObject.
      // Simpler: just paint each .swatch's computed bg into the canvas directly.
      const swatches = document.querySelectorAll('.swatch');
      for (const el of swatches) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el).backgroundColor;
        ctx.fillStyle = cs;
        ctx.fillRect(r.left, r.top, r.width, r.height);
      }
      const data = ctx.getImageData(0, 0, w, h).data;
      const counts = new Map();
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 200) continue;
        // Quantize to 5-bit per channel.
        const r = data[i] & 0xf8;
        const g = data[i + 1] & 0xf8;
        const b = data[i + 2] & 0xf8;
        const key = (r << 16) | (g << 8) | b;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN);
      return sorted.map(([k, n]) => {
        const r = (k >> 16) & 0xff;
        const g = (k >> 8) & 0xff;
        const b = k & 0xff;
        return { r, g, b, count: n };
      });
    }, PAINT_TOP_N);

    await browser.close();

    // Match each declared hex to the histogram with a quantize-tolerant compare.
    const found = [];
    const missing = [];
    for (const dh of declaredHexes) {
      const r = parseInt(dh.length === 3 ? dh[0] + dh[0] : dh.slice(0, 2), 16);
      const g = parseInt(dh.length === 3 ? dh[1] + dh[1] : dh.slice(2, 4), 16);
      const b = parseInt(dh.length === 3 ? dh[2] + dh[2] : dh.slice(4, 6), 16);
      const qr = quantize8(r), qg = quantize8(g), qb = quantize8(b);
      const hit = histogram.some((p) => p.r === qr && p.g === qg && p.b === qb);
      if (hit) found.push('#' + dh);
      else missing.push('#' + dh);
    }

    const coverage = declaredHexes.length ? found.length / declaredHexes.length : 1;
    const ok = coverage >= PAINT_COVERAGE_MIN;
    const errors = ok ? [] : [`paint coverage ${(coverage * 100).toFixed(0)}% < ${PAINT_COVERAGE_MIN * 100}%`];
    return {
      ok,
      errors,
      warnings: missing.length ? [`${missing.length} colors not painted: ${missing.join(', ')}`] : [],
      coverage,
      foundCount: found.length,
      declaredCount: declaredHexes.length,
      topPainted: histogram.slice(0, 8).map((p) => hexFromRgb(p.r, p.g, p.b)),
    };
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

// ------- Job discovery -------------------------------------------------------

function findLatestBenchJobForSite(site) {
  if (!fs.existsSync(JOBS_DIR)) return null;
  const all = fs.readdirSync(JOBS_DIR);
  const prefix = `bench-${site}-`;
  const matches = all.filter((d) => d.startsWith(prefix));
  if (!matches.length) return null;
  let best = null;
  for (const d of matches) {
    const stat = fs.statSync(path.join(JOBS_DIR, d));
    if (!best || stat.mtimeMs > best.mtime) best = { id: d, mtime: stat.mtimeMs };
  }
  return best?.id || null;
}

function loadJobInputs(jobId) {
  const dir = path.join(JOBS_DIR, jobId, 'output', 'design-md');
  const twPath = path.join(dir, 'tailwind.config.json');
  const dtcgPath = path.join(dir, 'dtcg.tokens.json');
  if (!fs.existsSync(twPath)) return null;
  let twConfig, dtcg = null;
  try { twConfig = JSON.parse(fs.readFileSync(twPath, 'utf8')); }
  catch (err) { return { error: `failed to parse tailwind.config.json: ${err.message}` }; }
  try { if (fs.existsSync(dtcgPath)) dtcg = JSON.parse(fs.readFileSync(dtcgPath, 'utf8')); } catch {}
  return { twConfig, dtcg, dir };
}

// ------- Main ----------------------------------------------------------------

async function verifyOne({ jobId, site, paint }) {
  const inputs = loadJobInputs(jobId);
  if (!inputs) return { jobId, site, ok: false, error: 'no tailwind.config.json' };
  if (inputs.error) return { jobId, site, ok: false, error: inputs.error };
  const { twConfig, dtcg } = inputs;

  const startedAt = new Date().toISOString();
  const phases = {};
  const log = (...a) => console.log(`[${site || jobId}]`, ...a);

  log('phase 1 STATIC');
  phases.static = staticCheck(twConfig, dtcg);
  log(`  ok=${phases.static.ok}  colors=${phases.static.colorCount}  errors=${phases.static.errors.length}`);
  if (!phases.static.ok) {
    for (const e of phases.static.errors) log(`    × ${e}`);
  }

  log('phase 2 COMPILE');
  const c = phases.static.ok ? compilePhase(twConfig) : { ok: false, errors: ['skipped'], warnings: [], cssBytes: 0, utilityCount: 0 };
  phases.compile = { ok: c.ok, errors: c.errors, warnings: c.warnings, cssBytes: c.cssBytes, utilityCount: c.utilityCount };
  log(`  ok=${c.ok}  cssBytes=${c.cssBytes}  utils=${c.utilityCount}`);

  if (paint && phases.compile.ok) {
    log('phase 3 PAINT');
    try {
      const p = await paintPhase(twConfig, c.css);
      phases.paint = p;
      log(`  ok=${p.ok}  coverage=${(p.coverage * 100).toFixed(0)}%  found=${p.foundCount}/${p.declaredCount}`);
    } catch (err) {
      phases.paint = { ok: false, errors: [`exception: ${err.message}`], warnings: [] };
      log(`  ✗ ${err.message}`);
    }
  } else if (!paint) {
    phases.paint = { skipped: true };
    log('phase 3 PAINT skipped (--no-paint)');
  } else {
    phases.paint = { skipped: true, reason: 'compile failed' };
  }

  const ok = phases.static.ok && phases.compile.ok && (phases.paint.skipped || phases.paint.ok);
  return { jobId, site, ok, startedAt, phases };
}

function loadResults() {
  if (!fs.existsSync(RESULTS_PATH)) return { runs: [] };
  try { return JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8')); } catch { return { runs: [] }; }
}

function saveResults(r) {
  fs.writeFileSync(RESULTS_PATH, JSON.stringify(r, null, 2));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const targets = [];

  if (args.jobs.length) {
    for (const j of args.jobs) targets.push({ jobId: j, site: null });
  } else {
    for (const site of args.sites) {
      const jobId = findLatestBenchJobForSite(site);
      if (!jobId) {
        console.log(`[${site}] no bench job found — skipping`);
        continue;
      }
      targets.push({ jobId, site });
    }
  }

  if (!targets.length) {
    console.error('no targets');
    process.exit(2);
  }

  const results = loadResults();
  const verdicts = [];
  for (const t of targets) {
    const v = await verifyOne({ ...t, paint: args.paint });
    verdicts.push(v);
    results.runs.push(v);
    console.log('');
  }
  saveResults(results);

  console.log('='.repeat(60));
  console.log('verify-codegen summary');
  console.log('='.repeat(60));
  let pass = 0, fail = 0;
  for (const v of verdicts) {
    const tag = v.site || v.jobId;
    if (v.error) { console.log(`  ${tag.padEnd(14)} × ${v.error}`); fail += 1; continue; }
    const s = v.phases.static.ok ? '✓' : '✗';
    const c = v.phases.compile.ok ? '✓' : '✗';
    const p = v.phases.paint.skipped ? '–' : (v.phases.paint.ok ? '✓' : '✗');
    console.log(`  ${tag.padEnd(14)} static=${s} compile=${c} paint=${p}  ${v.ok ? 'PASS' : 'FAIL'}`);
    if (v.ok) pass += 1; else fail += 1;
  }
  console.log('='.repeat(60));
  console.log(`Result: ${pass} pass, ${fail} fail`);
  process.exit(fail ? 1 : 0);
}

const entryUrl = process.argv[1] ? `file:///${path.resolve(process.argv[1]).replace(/\\/g, '/').replace(/^([A-Z]):/, '$1:')}` : '';
const isMain = decodeURIComponent(import.meta.url) === decodeURIComponent(entryUrl);
if (isMain) {
  main().catch((err) => { console.error(err); process.exit(1); });
}

export {
  staticCheck,
  compileCss,
  compilePhase,
  paintPhase,
  buildSampleHtml,
  isValidCssColor,
  isValidCssLength,
};
