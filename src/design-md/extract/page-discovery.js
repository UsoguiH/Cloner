// Phase 6.2.5 — multi-page discovery.
//
// getdesign.md harvests one URL. We harvest 5 (home + 4 representative
// secondary pages) and union the token/role/component graphs. The token
// system union is automatically richer: notion's home shows 3 button
// tiers, /pricing surfaces 2 more, /customers shows testimonial cards
// not on home. Page selection is the lever — get this wrong and we
// either miss design-system surface area (too few pages) or pollute it
// with edge tokens from one-off marketing pages (too many).
//
// Strategy: scrape every <a href> on the home page (after hydration —
// same-origin filter against the home hostname), score by path-keyword,
// dedupe by first path segment so we don't pick four `/blog/...` posts,
// take the top N by score. Same-eTLD-but-different-subdomain links are
// rejected by default (linear.app vs developers.linear.app); the design
// system on those subdomains is often distinct enough to skew the union.

const KEYWORD_RULES = [
  { rx: /^\/(pricing|plans|cost)(\/|$)/, score: 5 },
  { rx: /^\/(product|products|features|platform|solutions)(\/|$)/, score: 5 },
  { rx: /^\/(customers|showcase|case-stud)(\/|$)/, score: 4 },
  { rx: /^\/(signup|sign-up|login|sign-in|get-started|start)(\/|$)/, score: 3 },
  { rx: /^\/(blog|changelog|news)(\/|$)/, score: 3 },
  { rx: /^\/(docs|guide|help|support|api)(\/|$)/, score: 3 },
  { rx: /^\/(about|company|team|careers)(\/|$)/, score: 2 },
];

const PENALTY_RULES = [
  { rx: /^\/(legal|terms|privacy|cookie|dpa|security)(\/|$)/, penalty: 100 },
  { rx: /\.(pdf|zip|dmg|exe|tar|gz)(\?|$)/i, penalty: 100 },
];

// Live-DOM scrape happens inside the page; the function we ship to the
// browser must be self-contained — no closures over node-side state.
async function scrapeAnchors(page) {
  return page.$$eval('a[href]', (els) =>
    els.map((a) => ({
      href: a.href || '',
      text: (a.textContent || '').trim().slice(0, 80),
      inNav: !!a.closest('nav, header'),
      inFooter: !!a.closest('footer'),
    }))
  );
}

function scoreCandidate(pathOnly, link) {
  let score = 0;
  for (const rule of KEYWORD_RULES) {
    if (rule.rx.test(pathOnly)) score += rule.score;
  }
  for (const rule of PENALTY_RULES) {
    if (rule.rx.test(pathOnly)) score -= rule.penalty;
  }

  const depth = pathOnly.split('/').filter(Boolean).length;
  if (depth > 3) score -= 5;
  if (/[a-f0-9]{12,}/.test(pathOnly)) score -= 3;

  if (link.inNav) score += 1;
  else if (link.inFooter) score += 0.5;

  return score;
}

export async function discoverPages(page, homeUrl, { max = 5 } = {}) {
  const homeParsed = new URL(homeUrl);
  const homeHost = homeParsed.hostname;

  let raw = [];
  try {
    raw = await scrapeAnchors(page);
  } catch {
    return [{ url: homeUrl, role: 'home' }];
  }

  const seenPaths = new Set();
  const candidates = [];
  for (const link of raw) {
    if (!link.href) continue;
    let u;
    try {
      u = new URL(link.href);
    } catch {
      continue;
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
    if (u.hostname !== homeHost) continue;

    const pathOnly = (u.pathname.replace(/\/+$/, '') || '/').toLowerCase();
    if (pathOnly === '/' || pathOnly === '') continue;
    if (seenPaths.has(pathOnly)) continue;
    seenPaths.add(pathOnly);

    const score = scoreCandidate(pathOnly, link);
    if (score <= 0) continue;

    const segment = pathOnly.split('/').filter(Boolean)[0] || '__root__';
    candidates.push({
      url: `${u.origin}${u.pathname.replace(/\/+$/, '') || '/'}`,
      score,
      segment,
      text: link.text,
    });
  }

  candidates.sort((a, b) => b.score - a.score);

  const picked = [];
  const seenSegs = new Set();
  for (const c of candidates) {
    if (seenSegs.has(c.segment)) continue;
    seenSegs.add(c.segment);
    picked.push({ url: c.url, role: 'discovered', score: c.score, segment: c.segment, text: c.text });
    if (picked.length >= Math.max(0, max - 1)) break;
  }

  return [{ url: homeUrl, role: 'home' }, ...picked];
}

// Slug for filesystem-safe page identifiers (used in screenshot filenames
// and as page IDs in provenance). Empty paths → 'home'; long paths get
// hashed-tail.
export function pageSlug(url) {
  try {
    const u = new URL(url);
    let slug = u.pathname.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    if (!slug) slug = 'home';
    if (slug.length > 40) slug = slug.slice(0, 36) + '-x';
    return slug;
  } catch {
    return 'home';
  }
}
