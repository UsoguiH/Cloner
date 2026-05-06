#!/usr/bin/env node
// Offline diagnostic for assignColorRoles. Loads computed.json from a bench
// job, runs buildColorUsage + assignColorRoles, prints the resulting role
// table and the top rejected candidates per role so we can see why the
// ranker chose what it chose.

import fs from 'node:fs';
import path from 'node:path';
import { buildColorUsage, assignColorRoles } from '../src/design-md/emit/color-roles.js';
import { contrastRatio } from '../src/design-md/emit/contrast.js';

const jobId = process.argv[2];
if (!jobId) {
  console.error('Usage: node scripts/diag-color-roles.mjs <jobId>');
  process.exit(2);
}

const computedPath = path.resolve('jobs', jobId, 'output', 'design-md', 'computed.json');
if (!fs.existsSync(computedPath)) {
  console.error(`Not found: ${computedPath}`);
  process.exit(2);
}

const computed = JSON.parse(fs.readFileSync(computedPath, 'utf8'));

const tokensPath = path.resolve('jobs', jobId, 'output', 'design-md', 'tokens.json');
let tokenIndex = {};
let themes = null;
if (fs.existsSync(tokensPath)) {
  const tokensJson = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
  themes = tokensJson.themes || null;
  for (const [, themeData] of Object.entries(themes || {})) {
    for (const [name, info] of Object.entries(themeData.customProperties || {})) {
      tokenIndex[name] = info;
    }
  }
}

const usage = buildColorUsage(computed, tokenIndex);
const roles = assignColorRoles(usage, { tokenIndex, themes });

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex);
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}
function saturation(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const max = Math.max(...rgb);
  const min = Math.min(...rgb);
  if (max === 0) return 0;
  return (max - min) / max;
}

console.log(`\n=== Job: ${jobId} ===`);
console.log(`Source URL: ${computed.sourceUrl || '(none)'}`);
console.log(`Probes: ${computed.probes?.length ?? 0}`);
console.log(`Distinct colors: ${usage.size}`);

console.log('\n--- Assigned roles ---');
for (const [role, info] of Object.entries(roles)) {
  console.log(`  ${role.padEnd(12)} ${info.hex}  (sat=${saturation(info.hex).toFixed(2)})`);
}

const canvas = roles.canvas;
console.log('\n--- Top 15 colors by weighted area ---');
const all = [...usage.values()]
  .filter((e) => e.hex && e.hex.length === 7)
  .sort((a, b) => b.weightedArea - a.weightedArea)
  .slice(0, 15);
console.log('hex      sat   area       count  bg  txt  bdr  buttonBg  textOnText  surfBg  tags');
for (const e of all) {
  const sat = saturation(e.hex).toFixed(2);
  const area = String(Math.round(e.weightedArea)).padStart(10);
  const count = String(e.count).padStart(5);
  const bg = String(e.byProperty['background-color'] || 0).padStart(3);
  const tx = String(e.byProperty['color'] || 0).padStart(3);
  const bd = String(e.byProperty['border'] || 0).padStart(3);
  const btn = String(Math.round(e.likelyButtonBg)).padStart(8);
  const tot = String(Math.round(e.likelyTextOnText)).padStart(10);
  const sb = String(Math.round(e.likelySurfaceBg)).padStart(7);
  const tags = Object.keys(e.byTag).join(',');
  const cv = canvas ? `  c=${contrastRatio(e.hex, canvas.hex).toFixed(1)}` : '';
  console.log(`${e.hex}  ${sat}  ${area}  ${count}  ${bg}  ${tx}  ${bd}  ${btn}  ${tot}  ${sb}  ${tags}${cv}`);
}

console.log('\n--- Saturated colors (sat >= 0.3) ---');
const sat = all.filter((e) => saturation(e.hex) >= 0.3);
for (const e of sat) {
  console.log(`  ${e.hex} sat=${saturation(e.hex).toFixed(2)} area=${Math.round(e.weightedArea)} count=${e.count} btnBg=${Math.round(e.likelyButtonBg)} bdr=${e.byProperty['border']||0} tags=${Object.keys(e.byTag).join(',')}`);
}
