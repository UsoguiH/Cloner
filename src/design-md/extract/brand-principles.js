// =============================================================================
// Brand-principles harvester (Phase 7.2).
//
// Probes a known set of "philosophy" URL paths (/design, /principles, /brand,
// /about, /press, /style) on the same origin and extracts h2/h3 + following
// paragraph pairs. The output feeds the AI design-decisions stage as REAL
// brand-stated rationale, replacing LLM speculation about "why this brand
// chose X." When pages 404 or contain nothing principle-shaped, the result
// is an empty list and the pipeline falls back to current behavior.
//
// Strategic moat: getdesign.md doesn't surface brand-stated principles —
// it speculates. We can ground decisions in actual published source.
//
// Output shape:
//   {
//     principles: [
//       { heading, body, source: { url, h2OrH3 } }   // ≤ N entries
//     ],
//     sources: [{ url, status, hits }]               // for telemetry
//   }
//
// Deterministic. Reuses the existing Playwright page object (no extra
// browser contexts). Each probed URL has a 12s nav timeout — total budget
// for this stage is ≤ 60s on the 5 default candidates.
// =============================================================================

const PRINCIPLE_PATHS = [
  '/design',
  '/design-system',
  '/principles',
  '/brand',
  '/about',
  '/about/values',
  '/about/principles',
  '/style',
  '/handbook',
  '/manifesto',
];

const NAV_TIMEOUT_MS = 12_000;
const SETTLE_MS = 1500;
const MAX_PRINCIPLES = 12;
const MIN_BODY_CHARS = 40;
const MAX_BODY_CHARS = 600;

// Heading text that's almost certainly NOT a design principle (nav, footer,
// legal, blog snippets). Filter aggressively — false-positives feed the AI
// junk; false-negatives just leave us with the same fallback behavior.
const HEADING_BLOCKLIST = /^(privacy|terms|cookies|legal|sitemap|search|menu|sign in|sign up|subscribe|newsletter|share|comments|footer|navigation|table of contents|topics|tags|categories|recent posts|latest|archive|popular|trending|join us|in the news|press|newsroom|careers|contact( us)?|our team|the team|leadership|investors|partners|support|help|blog|events|media|stories|products|features|pricing|customers|case stud(y|ies)|testimonials|enterprise|sales|book (a )?demo|get started|download|integrations|changelog|community|forum|status|api|docs(?!\b)|documentation|tutorials)$/i;

// Heading text that's a strong positive signal — design/brand/values lexicon.
// Used to boost selection priority among extracted candidates.
const PRINCIPLE_LEXICON = /\b(principle|value|belief|philosophy|tenet|ethos|why|how we|we believe|we value|our approach|what we|design|craft|brand|voice|tone|simple|honest|clear|fast|focused|delight|opinion)/i;

function originOf(urlStr) {
  try { return new URL(urlStr).origin; } catch { return null; }
}

async function safeGoto(page, url) {
  try {
    const resp = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: NAV_TIMEOUT_MS,
    });
    if (!resp) return { ok: false, status: 0 };
    const status = resp.status();
    if (status >= 400) return { ok: false, status };
    return { ok: true, status };
  } catch {
    return { ok: false, status: -1 };
  }
}

async function extractFromPage(page, sourceUrl) {
  await page.waitForTimeout(SETTLE_MS);
  return page.evaluate(({ MIN_CHARS, MAX_CHARS }) => {
    const out = [];
    const seen = new Set();
    const textOf = (el) => {
      if (!el) return '';
      return (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
    };
    const isVisible = (el) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
    };
    const findBody = (h) => {
      // Prefer the immediately-following <p> within the same parent block.
      // Skip empty or wrapper-only siblings.
      let cur = h.nextElementSibling;
      let hops = 0;
      while (cur && hops < 6) {
        if (cur.tagName === 'H1' || cur.tagName === 'H2' || cur.tagName === 'H3') break;
        const t = textOf(cur);
        if (t.length >= MIN_CHARS) return t.slice(0, MAX_CHARS);
        cur = cur.nextElementSibling;
        hops += 1;
      }
      // Fallback — first <p> deeper in the parent if next-sibling chain failed.
      const parent = h.parentElement;
      if (parent) {
        const p = parent.querySelector('p');
        if (p && p !== h) {
          const t = textOf(p);
          if (t.length >= MIN_CHARS) return t.slice(0, MAX_CHARS);
        }
      }
      return null;
    };
    const headings = document.querySelectorAll('h2, h3');
    for (const h of headings) {
      if (!isVisible(h)) continue;
      const heading = textOf(h);
      if (!heading || heading.length < 4 || heading.length > 120) continue;
      const sig = heading.toLowerCase();
      if (seen.has(sig)) continue;
      const body = findBody(h);
      if (!body) continue;
      seen.add(sig);
      out.push({
        heading,
        body,
        tag: h.tagName.toLowerCase(),
      });
      if (out.length >= 60) break;
    }
    return out;
  }, { MIN_CHARS: MIN_BODY_CHARS, MAX_CHARS: MAX_BODY_CHARS });
}

// Pages whose path strongly signals brand/design guidelines. Headings from
// these get a path bonus that lets short taxonomic headings ("Naming",
// "Wordmark", "Colors" on linear/brand) survive the score floor without
// rewriting the lexicon for every brand's vocabulary.
const PRINCIPLE_PATH_RE = /\/(brand|design|design-system|principles|style|handbook|manifesto|guidelines|guide)(\b|\/|$)/i;

function scoreCandidate(c, sourceUrl) {
  if (HEADING_BLOCKLIST.test(c.heading)) return -1;

  const onPrinciplePath = sourceUrl && PRINCIPLE_PATH_RE.test(sourceUrl);
  const headingLexicon = PRINCIPLE_LEXICON.test(c.heading);
  // Hard gate: stripe / figma marketing pages are full of "designed", "fast",
  // "simple" — body lexicon alone can't qualify a candidate or every product
  // tagline becomes a "principle." Either the heading itself names a design
  // concept, or we trust the URL is an explicit brand/design page.
  if (!onPrinciplePath && !headingLexicon) return -1;

  let s = 0;
  if (headingLexicon) s += 5;
  if (PRINCIPLE_LEXICON.test(c.body)) s += 2;
  // Prefer concise headings (titles, not full sentences).
  if (c.heading.length <= 50) s += 1;
  // Lightly favor h2 (top-level principle) over h3 (sub-principle).
  if (c.tag === 'h2') s += 0.5;
  // Body length sweet spot: 80–300 chars (one principle paragraph).
  const bl = c.body.length;
  if (bl >= 80 && bl <= 300) s += 1;
  // Source-page bonus — content extracted from an explicit brand/design page
  // is high-trust regardless of the heading vocabulary.
  if (onPrinciplePath) s += 3;
  return s;
}

export async function harvestBrandPrinciples(page, homeUrl, opts = {}) {
  const max = opts.max ?? MAX_PRINCIPLES;
  const origin = originOf(homeUrl);
  if (!origin) return { principles: [], sources: [] };

  const sources = [];
  const all = [];
  for (const p of PRINCIPLE_PATHS) {
    const url = origin + p;
    const r = await safeGoto(page, url);
    if (!r.ok) {
      sources.push({ url, status: r.status, hits: 0 });
      continue;
    }
    let candidates = [];
    try { candidates = await extractFromPage(page, url); }
    catch { candidates = []; }
    sources.push({ url, status: r.status, hits: candidates.length });
    for (const c of candidates) {
      const score = scoreCandidate(c, url);
      if (score < 0) continue;
      all.push({ ...c, score, source: { url, tag: c.tag } });
    }
  }

  // Dedupe across pages by lowercased heading (sites often republish principles).
  const byHeading = new Map();
  for (const c of all) {
    const key = c.heading.toLowerCase();
    const existing = byHeading.get(key);
    if (!existing || c.score > existing.score) byHeading.set(key, c);
  }

  // Minimum score threshold — without this, sites where /design /principles
  // /brand are 401-gated (notion) leak generic /about CTAs ("Join us",
  // "In the news") into the principles list. Score >= 3 requires either a
  // lexicon hit on the heading OR multiple weaker signals stacking.
  const MIN_SCORE = 3;
  const ranked = [...byHeading.values()]
    .filter((c) => c.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score);
  const principles = ranked.slice(0, max).map((c) => ({
    heading: c.heading,
    body: c.body,
    source: { url: c.source.url, tag: c.source.tag },
  }));

  return { principles, sources };
}

export const _internal = { PRINCIPLE_PATHS, scoreCandidate, HEADING_BLOCKLIST, PRINCIPLE_LEXICON };
