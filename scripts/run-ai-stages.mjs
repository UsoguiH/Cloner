// Run role-naming + copy-generation on an existing job's harvest, then
// regenerate design.md. Usage: node --env-file=.env scripts/run-ai-stages.mjs <jobId>
import fs from 'node:fs';
import path from 'node:path';
import { generateDesignMd } from '../src/design-md/generate.js';
import { runRoleNamingStage } from '../src/ai/stages/role-naming.js';
import { runCopyGenerationStage } from '../src/ai/stages/copy-generation.js';

const jobId = process.argv[2];
if (!jobId) { console.error('usage: node --env-file=.env scripts/run-ai-stages.mjs <jobId>'); process.exit(1); }

const jobDir = path.resolve('jobs', jobId);
if (!fs.existsSync(jobDir)) { console.error('jobDir not found:', jobDir); process.exit(1); }
const visualDir = path.join(jobDir, 'output', 'visual');
const viewportPng = path.join(visualDir, 'desktop-viewport.png');
const fullpagePng = path.join(visualDir, 'desktop-fullpage.png');

// Read sourceUrl from computed.json (smoke harness skips job.json)
const computed = JSON.parse(fs.readFileSync(path.join(jobDir, 'output', 'design-md', 'computed.json'), 'utf8'));
const sourceUrl = computed.sourceUrl || null;

console.log('[stage 0] dry-generate to read deterministic roles');
const prelim = generateDesignMd(jobDir, { write: false });
const colorMap = {};
for (const [name, info] of Object.entries(prelim.roles || {})) {
  if (info?.hex) colorMap[name] = info.hex;
}
console.log('  roles:', Object.keys(colorMap).length, 'siteName:', prelim.name);

console.log('[stage 1] role-naming');
const t1 = Date.now();
const naming = await runRoleNamingStage({
  jobDir,
  roles: colorMap,
  screenshotPath: viewportPng,
  sourceUrl,
  siteName: prelim.name,
});
console.log(`  ${Date.now() - t1}ms ok=${naming.ok} cache=${naming.fromCache} code=${naming.code || '-'}`);
if (naming.ok) {
  for (const r of naming.envelope.data.roles) {
    console.log(`    ${r.tokenPath.padEnd(22)} → "${r.displayName}" (conf ${r.confidence})`);
  }
} else if (naming.errors) {
  console.log('  errors:', JSON.stringify(naming.errors, null, 2));
}

console.log('[stage 2] copy-generation');
const colorsForCopy = [];
const namingByName = {};
if (naming.ok) {
  for (const r of naming.envelope.data.roles) {
    const m = /^colors\.(.+)$/.exec(r.tokenPath);
    if (m) namingByName[m[1]] = r;
  }
}
for (const [name, info] of Object.entries(prelim.roles || {})) {
  if (!info?.hex) continue;
  const labels = namingByName[name];
  colorsForCopy.push({
    name,
    hex: info.hex,
    displayName: labels?.displayName || null,
    roleDescription: labels?.roleDescription || null,
  });
}
const typoForCopy = [];
for (const [name, t] of Object.entries(prelim.ds?.typography || {})) {
  typoForCopy.push({ name, fontFamily: t.fontFamily || 'unknown', fontSize: t.fontSize || '', fontWeight: t.fontWeight ?? '' });
}
const t2 = Date.now();
const copy = await runCopyGenerationStage({
  jobDir,
  siteName: prelim.name,
  sourceUrl,
  colors: colorsForCopy,
  typography: typoForCopy,
  screenshotPaths: [viewportPng, fullpagePng],
});
console.log(`  ${Date.now() - t2}ms ok=${copy.ok} cache=${copy.fromCache} code=${copy.code || '-'}`);
if (copy.ok) {
  console.log('    brandThesis:', copy.envelope.data.brandThesis);
  console.log('    voiceProfile:', copy.envelope.data.voiceProfile?.length, 'traits');
  console.log('    sectionBlurbs:', copy.envelope.data.sectionBlurbs?.length, 'blurbs');
  console.log('    globalConfidence:', copy.envelope.data.globalConfidence);
} else if (copy.errors) {
  console.log('  errors:', JSON.stringify(copy.errors, null, 2));
}

console.log('[stage 3] regenerate design.md (consumes envelopes)');
const final = generateDesignMd(jobDir, { write: true });
const summary = final.lint?.summary || {};
console.log(`  components=${(final.components || []).length} colors=${Object.keys(final.roles || {}).length} lint E${summary.errors}/W${summary.warnings}/I${summary.infos}`);
console.log('  wrote:', path.join(jobDir, 'output', 'design-md', 'design.md'));
