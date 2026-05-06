#!/usr/bin/env node
// Self-test for src/ai/stages/copy-generation.js — runs in milliseconds, no
// API calls, no Playwright. Asserts the contract callers depend on:
//
//   1. empty-input → { ok:false, code:'empty-input' }                 (no-op guard)
//   2. no-key      → { ok:false, code:'no-key' }                      (graceful degrade)
//   3. cache hit   → { ok:true, fromCache:true, envelope: <shape> }   (zero-cost replay)
//   4. sidecar     → copy-generation.envelope.json lands in jobDir/output/design-md
//   5. round-trip  → loadCopyGenerationEnvelope decodes the sidecar back identical
//
// The cache test pre-seeds the disk cache with a digest matching what
// buildInputDigest() will compute for our fixture, so runCopyGenerationStage
// short-circuits to the cache hit branch without an API call.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  runCopyGenerationStage,
  loadCopyGenerationEnvelope,
  _internal,
} from '../src/ai/stages/copy-generation.js';

const failures = [];
const ok = (name) => console.log(`  ok    ${name}`);
const fail = (name, why) => {
  failures.push(`${name} — ${why}`);
  console.log(`  FAIL  ${name} — ${why}`);
};

function makeJobDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'copy-gen-check-'));
  fs.mkdirSync(path.join(dir, 'output', 'design-md'), { recursive: true });
  return dir;
}

console.log('runCopyGenerationStage early-exit guards');

// Case 1: empty input must short-circuit before any key check.
{
  const r = await runCopyGenerationStage({
    jobDir: makeJobDir(),
    siteName: 'X',
    colors: [],
    typography: [],
  });
  if (r.ok) fail('empty input → ok:false', `got ok:${r.ok}`);
  else if (r.code !== 'empty-input') fail('empty input → code:empty-input', `got code:${r.code}`);
  else ok('empty input → { ok:false, code:"empty-input" }');
}

// Case 2: no key must degrade gracefully.
{
  const savedKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const r = await runCopyGenerationStage({
      jobDir: makeJobDir(),
      siteName: 'Linear',
      sourceUrl: 'https://linear.app/',
      colors: [{ name: 'primary', hex: '#5e6ad2', displayName: 'Linear Indigo', roleDescription: 'A vibrant indigo' }],
      typography: [{ name: 'button', fontFamily: 'InterVariable', fontSize: '14px', fontWeight: 500 }],
    });
    if (r.ok) fail('no key → ok:false', `got ok:${r.ok}`);
    else if (r.code !== 'no-key') fail('no key → code:no-key', `got code:${r.code}`);
    else ok('no key → { ok:false, code:"no-key" }');
  } finally {
    if (savedKey !== undefined) process.env.GEMINI_API_KEY = savedKey;
  }
}

console.log('cache hit path (zero API call)');

{
  const savedKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'self-test-stub-key-not-used';
  try {
    const jobDir = makeJobDir();
    const colors = [
      { name: 'primary', hex: '#5e6ad2', displayName: 'Linear Indigo', roleDescription: 'Vibrant indigo accent.' },
      { name: 'canvas', hex: '#08090a', displayName: 'Deep Canvas', roleDescription: 'Foundational dark backdrop.' },
    ];
    const typography = [
      { name: 'button', fontFamily: 'InterVariable', fontSize: '14px', fontWeight: 500 },
      { name: 'headline', fontFamily: 'InterDisplay', fontSize: '48px', fontWeight: 600 },
    ];
    const siteName = 'Linear';
    const sourceUrl = 'https://linear.app/';
    const modelId = 'gemini-3-pro-preview';

    const userPrompt = _internal.buildUserPrompt({ siteName, sourceUrl, colors, typography });
    const digest = _internal.buildInputDigest({
      colors,
      typography,
      modelId,
      screenshotBufs: [],
      prompt: _internal.SYSTEM_PROMPT + '\n\n' + userPrompt,
    });

    const fakeEnvelope = {
      stage: 'copy-generation',
      modelId,
      generatedAt: '2026-05-07T12:00:00Z',
      inputDigest: digest,
      data: {
        brandThesis: 'Linear is a project tool that pares software planning down to its essentials, presenting it on a confidently dark canvas.',
        voiceProfile: [
          { trait: 'Confident', explanation: 'The dense Deep Canvas and unadorned typography signal a tool that trusts its users to navigate without hand-holding.' },
          { trait: 'Plainspoken', explanation: 'Type runs uniform InterVariable across surfaces, with no ornamental flourishes or gradients vying for attention.' },
          { trait: 'Builder-first', explanation: 'Linear Indigo is reserved for active states, leaving the document body to feel like a tool rather than a marketing surface.' },
        ],
        sectionBlurbs: [
          { section: 'overview', blurb: 'Linear is a project tool with one of the most consistent dark-canvas systems in software.', confidence: 0.9 },
          { section: 'color-system', blurb: 'Linear leans almost entirely on Deep Canvas and high-contrast ink, reserving Linear Indigo for moments of focused brand expression.', confidence: 0.92 },
          { section: 'typography', blurb: 'Type runs uniform InterVariable across the experience, with InterDisplay reserved for marketing-scale headlines.', confidence: 0.85 },
        ],
        globalConfidence: 0.88,
      },
      thoughtsTokens: 0,
    };

    fs.mkdirSync(_internal.CACHE_DIR, { recursive: true });
    const cachePath = path.join(_internal.CACHE_DIR, `${digest}.json`);
    fs.writeFileSync(cachePath, JSON.stringify(fakeEnvelope, null, 2));

    let r;
    try {
      r = await runCopyGenerationStage({
        jobDir, siteName, sourceUrl, colors, typography,
        screenshotPaths: [], modelId,
      });
    } finally {
      try { fs.unlinkSync(cachePath); } catch {}
    }

    if (!r.ok) {
      fail('cache hit → ok:true', `got ok:${r.ok} code:${r.code} err:${r.error}`);
    } else if (!r.fromCache) {
      fail('cache hit → fromCache:true', 'fromCache flag missing or false');
    } else if (r.envelope?.inputDigest !== digest) {
      fail('cache hit → envelope.inputDigest matches', `got ${r.envelope?.inputDigest}`);
    } else if (r.envelope?.stage !== 'copy-generation') {
      fail('cache hit → envelope.stage', `got ${r.envelope?.stage}`);
    } else if (typeof r.envelope?.data?.brandThesis !== 'string') {
      fail('cache hit → data.brandThesis present', `got ${typeof r.envelope?.data?.brandThesis}`);
    } else if (!Array.isArray(r.envelope?.data?.voiceProfile)) {
      fail('cache hit → data.voiceProfile is array', '');
    } else if (!Array.isArray(r.envelope?.data?.sectionBlurbs)) {
      fail('cache hit → data.sectionBlurbs is array', '');
    } else {
      ok('cache hit → { ok:true, fromCache:true, envelope: <validated shape> }');
    }

    // Case 4: sidecar landed where generate.js expects it
    const sidecarPath = path.join(jobDir, 'output', 'design-md', 'copy-generation.envelope.json');
    if (!fs.existsSync(sidecarPath)) {
      fail('sidecar written', `${sidecarPath} missing`);
    } else {
      const onDisk = JSON.parse(fs.readFileSync(sidecarPath, 'utf8'));
      if (onDisk.inputDigest !== digest) fail('sidecar matches envelope', `digest mismatch on disk`);
      else ok('sidecar written → copy-generation.envelope.json present + matches');
    }

    // Case 5: round-trip
    const roundTrip = loadCopyGenerationEnvelope(jobDir);
    if (!roundTrip || roundTrip.inputDigest !== digest) {
      fail('loadCopyGenerationEnvelope round-trip', 'envelope did not load back identical');
    } else if (roundTrip.data.brandThesis !== fakeEnvelope.data.brandThesis) {
      fail('loadCopyGenerationEnvelope round-trip', 'brandThesis content differs');
    } else {
      ok('loadCopyGenerationEnvelope round-trip');
    }
  } finally {
    if (savedKey !== undefined) process.env.GEMINI_API_KEY = savedKey;
    else delete process.env.GEMINI_API_KEY;
  }
}

if (failures.length) {
  console.error(`\nFAIL  ${failures.length} case(s)`);
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log('\nOK  all copy-generation self-test cases pass');
