// =============================================================================
// Real-asset harvester (Phase 7.3).
//
// Saves the actual files a design.md should ship next to the markdown:
//   • fonts (every @font-face url() resolved + downloaded)
//   • logo (best-guess primary brand mark — header img/svg with site-name alt)
//   • favicon (link[rel*=icon])
//
// Strategic moat: getdesign.md is text. Ours ships an `assets/` directory with
// the brand's actual fonts and logo, plus a `## Assets` section that lists
// them with relative paths. A developer can drop our output into a project
// and have working typography on day one.
//
// Output layout under <jobDir>/output/design-md/assets/:
//   fonts/<hash>.<ext>   — downloaded font files
//   logo.<ext>           — primary brand mark
//   favicon.<ext>        — site favicon
//   manifest.json        — { fonts: [...], logo: {...}|null, favicon: {...}|null }
//
// Deterministic. Single Playwright page reused; no extra browser context.
// Failure falls back gracefully — missing assets just don't appear in
// the ## Assets section.
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const FONT_FETCH_TIMEOUT_MS = 12_000;
const IMG_FETCH_TIMEOUT_MS = 8_000;
const MAX_FONTS = 16;
const MAX_FONT_BYTES = 5 * 1024 * 1024; // 5 MB hard cap per font
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

const FONT_EXT_RE = /\.(woff2|woff|ttf|otf|eot)(\?|$)/i;

function shortHash(input, n = 8) {
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, n);
}

function extOf(urlStr, mime) {
  try {
    const u = new URL(urlStr);
    const m = /\.([a-z0-9]+)(?:\?|$)/i.exec(u.pathname);
    if (m) return m[1].toLowerCase();
  } catch {}
  if (typeof mime === 'string') {
    if (mime.includes('woff2')) return 'woff2';
    if (mime.includes('woff')) return 'woff';
    if (mime.includes('ttf') || mime.includes('truetype')) return 'ttf';
    if (mime.includes('otf') || mime.includes('opentype')) return 'otf';
    if (mime.includes('svg')) return 'svg';
    if (mime.includes('png')) return 'png';
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
    if (mime.includes('webp')) return 'webp';
    if (mime.includes('icon')) return 'ico';
  }
  return 'bin';
}

// Read every @font-face block from every loaded stylesheet, resolving url()
// against the sheet's href. Returns [{ family, url, weight, style }].
async function collectFontFaces(page) {
  return page.evaluate(() => {
    const out = [];
    const sheets = Array.from(document.styleSheets);
    for (const sheet of sheets) {
      let rules;
      try { rules = sheet.cssRules || sheet.rules; }
      catch { continue; } // CORS-blocked sheet, skip silently
      if (!rules) continue;
      const baseHref = sheet.href || location.href;
      for (const rule of rules) {
        // CSSFontFaceRule type === 5
        if (!rule || rule.type !== 5) continue;
        const style = rule.style;
        const family = (style.getPropertyValue('font-family') || '').trim().replace(/^['"]|['"]$/g, '');
        const weight = (style.getPropertyValue('font-weight') || '').trim() || '400';
        const fontStyle = (style.getPropertyValue('font-style') || '').trim() || 'normal';
        const src = style.getPropertyValue('src') || '';
        // Extract every url() — pick the woff2 variant when present (smallest).
        const urls = [];
        const re = /url\(\s*["']?([^"')]+)["']?\s*\)/g;
        let m;
        while ((m = re.exec(src))) {
          let url = m[1];
          try { url = new URL(url, baseHref).href; } catch {}
          urls.push(url);
        }
        // Prefer woff2 first.
        urls.sort((a, b) => {
          const aw = a.includes('.woff2') ? 0 : 1;
          const bw = b.includes('.woff2') ? 0 : 1;
          return aw - bw;
        });
        if (urls.length) {
          out.push({ family, url: urls[0], weight, style: fontStyle, allUrls: urls });
        }
      }
    }
    return out;
  });
}

// Locate the brand's primary logo. Heuristic:
//   1. First <img> inside <header>/role=banner/<a> with site-name in alt.
//   2. First inline <svg> inside header with width ≤ 200 and height ≤ 80.
//   3. First <img> in top 200px with alt or aria-label.
async function findLogo(page, siteName) {
  return page.evaluate((siteNameLower) => {
    const inHeader = (el) => {
      let p = el;
      while (p) {
        const tag = (p.tagName || '').toLowerCase();
        if (tag === 'header' || p.getAttribute?.('role') === 'banner') return true;
        p = p.parentElement;
      }
      return false;
    };
    const altMatchesSite = (alt) => {
      if (!alt) return false;
      const a = String(alt).toLowerCase();
      if (!siteNameLower) return false;
      return a.includes(siteNameLower) || siteNameLower.includes(a);
    };
    // Pass 1: img with site-name in alt, inside header
    const imgs = Array.from(document.querySelectorAll('img'));
    for (const img of imgs) {
      if (!inHeader(img)) continue;
      const alt = img.getAttribute('alt') || '';
      const aria = img.getAttribute('aria-label') || '';
      if (altMatchesSite(alt) || altMatchesSite(aria)) {
        const r = img.getBoundingClientRect();
        if (r.width >= 16 && r.width <= 400 && r.height >= 8 && r.height <= 200) {
          return { kind: 'img', src: img.currentSrc || img.src, alt, width: Math.round(r.width), height: Math.round(r.height) };
        }
      }
    }
    // Pass 2: any img in header with reasonable dims
    for (const img of imgs) {
      if (!inHeader(img)) continue;
      const r = img.getBoundingClientRect();
      if (r.top > 200) continue;
      if (r.width >= 32 && r.width <= 400 && r.height >= 12 && r.height <= 200) {
        return { kind: 'img', src: img.currentSrc || img.src, alt: img.getAttribute('alt') || '', width: Math.round(r.width), height: Math.round(r.height) };
      }
    }
    // Pass 3: inline SVG in header, suitable size
    const svgs = Array.from(document.querySelectorAll('svg'));
    for (const svg of svgs) {
      if (!inHeader(svg)) continue;
      const r = svg.getBoundingClientRect();
      if (r.top > 200) continue;
      if (r.width >= 24 && r.width <= 300 && r.height >= 12 && r.height <= 100) {
        return { kind: 'svg', markup: svg.outerHTML.slice(0, 16384), width: Math.round(r.width), height: Math.round(r.height) };
      }
    }
    return null;
  }, (siteName || '').toLowerCase());
}

async function findFavicon(page) {
  return page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('link[rel*="icon"]'));
    if (!links.length) return null;
    // Prefer larger sizes when declared (e.g., apple-touch-icon-180x180).
    const ranked = links.map((l) => {
      const sizes = (l.getAttribute('sizes') || '').match(/(\d+)x(\d+)/);
      const dim = sizes ? parseInt(sizes[1], 10) : 0;
      return { href: l.href, type: l.getAttribute('type') || '', dim };
    });
    ranked.sort((a, b) => b.dim - a.dim);
    const best = ranked.find((r) => r.href);
    return best ? { url: best.href, type: best.type } : null;
  });
}

async function fetchToBuffer(page, url, timeoutMs, maxBytes) {
  return page.evaluate(async ({ url, timeoutMs, maxBytes }) => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const resp = await fetch(url, { signal: ctrl.signal, credentials: 'omit' });
      clearTimeout(t);
      if (!resp.ok) return { ok: false, status: resp.status };
      const buf = await resp.arrayBuffer();
      if (buf.byteLength > maxBytes) return { ok: false, status: 0, error: 'too-large' };
      const arr = Array.from(new Uint8Array(buf));
      const mime = resp.headers.get('content-type') || '';
      return { ok: true, status: resp.status, bytes: arr, mime };
    } catch (e) {
      return { ok: false, status: 0, error: String(e?.message || e) };
    }
  }, { url, timeoutMs, maxBytes });
}

// Fallback when page.evaluate can't read cross-origin sheets (CORS-tainted —
// stripe + linear + most CDN-hosted CSS). Scans the raw CSS text from the
// replay manifest's saved bodies and extracts @font-face declarations
// directly via regex.
function collectFontFacesFromReplay(jobDir) {
  const manifestPath = path.join(jobDir, 'output', 'replay', 'manifest.json');
  if (!fs.existsSync(manifestPath)) return [];
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
  catch { return []; }

  const bodiesDir = path.join(jobDir, 'output', 'replay', 'bodies');
  const out = [];
  for (const [sheetUrl, entry] of Object.entries(manifest.entries || {})) {
    if (!entry?.body || (entry.mimeType || '').indexOf('css') === -1) continue;
    const bodyPath = path.join(bodiesDir, entry.body);
    if (!fs.existsSync(bodyPath)) continue;
    let css;
    try { css = fs.readFileSync(bodyPath, 'utf8'); }
    catch { continue; }
    const baseHref = sheetUrl.startsWith('http') ? sheetUrl : null;

    const re = /@font-face\s*\{([^}]+)\}/g;
    let m;
    while ((m = re.exec(css))) {
      const block = m[1];
      const fam = /font-family\s*:\s*['"]?([^'";]+)['"]?/i.exec(block);
      const wt = /font-weight\s*:\s*([^;]+)/i.exec(block);
      const sty = /font-style\s*:\s*([^;]+)/i.exec(block);
      const srcLine = /src\s*:\s*([^;]+)/i.exec(block);
      if (!srcLine) continue;
      const urlRe = /url\(\s*["']?([^"')]+)["']?\s*\)/g;
      const urls = [];
      let mu;
      while ((mu = urlRe.exec(srcLine[1]))) {
        let u = mu[1];
        if (baseHref) {
          try { u = new URL(u, baseHref).href; } catch {}
        }
        urls.push(u);
      }
      if (!urls.length) continue;
      urls.sort((a, b) => (a.includes('.woff2') ? 0 : 1) - (b.includes('.woff2') ? 0 : 1));
      out.push({
        family: (fam ? fam[1].trim() : '') || '',
        weight: wt ? wt[1].trim() : '400',
        style: sty ? sty[1].trim() : 'normal',
        url: urls[0],
        allUrls: urls,
      });
    }
  }
  return out;
}

function dedupeFontFaces(faces) {
  // De-dupe by url. Keep first weight/style seen for the family.
  const seen = new Set();
  const out = [];
  for (const f of faces) {
    if (!f.url) continue;
    if (!FONT_EXT_RE.test(f.url) && !/data:font/.test(f.url)) continue;
    if (f.url.startsWith('data:')) continue;
    if (seen.has(f.url)) continue;
    seen.add(f.url);
    out.push(f);
    if (out.length >= MAX_FONTS) break;
  }
  return out;
}

export async function harvestAssets(page, jobDir, { siteName } = {}) {
  const assetsDir = path.join(jobDir, 'output', 'design-md', 'assets');
  const fontsDir = path.join(assetsDir, 'fonts');
  fs.mkdirSync(fontsDir, { recursive: true });

  const manifest = { fonts: [], logo: null, favicon: null };

  // ---- Fonts ----
  let faces = [];
  try { faces = await collectFontFaces(page); } catch { faces = []; }
  // Fallback: cross-origin sheets (CORS-tainted) yield 0 rules from the live
  // CSSStyleSheet API. Scan the replay-saved raw CSS bodies as backup.
  if (faces.length < 2) {
    try {
      const fromReplay = collectFontFacesFromReplay(jobDir);
      // Avoid duplicating any URLs the live evaluate already returned.
      const seenUrls = new Set(faces.map((f) => f.url));
      for (const f of fromReplay) {
        if (!seenUrls.has(f.url)) { faces.push(f); seenUrls.add(f.url); }
      }
    } catch { /* best effort */ }
  }
  faces = dedupeFontFaces(faces);
  for (const f of faces) {
    const r = await fetchToBuffer(page, f.url, FONT_FETCH_TIMEOUT_MS, MAX_FONT_BYTES);
    if (!r.ok) continue;
    const ext = extOf(f.url, r.mime);
    const fname = `${shortHash(f.url)}.${ext}`;
    try {
      fs.writeFileSync(path.join(fontsDir, fname), Buffer.from(r.bytes));
      manifest.fonts.push({
        family: f.family,
        weight: f.weight,
        style: f.style,
        sourceUrl: f.url,
        path: `assets/fonts/${fname}`,
        bytes: r.bytes.length,
      });
    } catch {}
  }

  // ---- Logo ----
  try {
    const logo = await findLogo(page, siteName);
    if (logo) {
      if (logo.kind === 'img' && logo.src) {
        const r = await fetchToBuffer(page, logo.src, IMG_FETCH_TIMEOUT_MS, MAX_LOGO_BYTES);
        if (r.ok) {
          const ext = extOf(logo.src, r.mime);
          const fname = `logo.${ext}`;
          fs.writeFileSync(path.join(assetsDir, fname), Buffer.from(r.bytes));
          manifest.logo = {
            kind: 'img',
            sourceUrl: logo.src,
            path: `assets/${fname}`,
            alt: logo.alt,
            width: logo.width,
            height: logo.height,
            bytes: r.bytes.length,
          };
        }
      } else if (logo.kind === 'svg' && logo.markup) {
        const fname = 'logo.svg';
        fs.writeFileSync(path.join(assetsDir, fname), logo.markup);
        manifest.logo = {
          kind: 'svg',
          path: `assets/${fname}`,
          width: logo.width,
          height: logo.height,
          bytes: Buffer.byteLength(logo.markup),
        };
      }
    }
  } catch {}

  // ---- Favicon ----
  try {
    const fav = await findFavicon(page);
    if (fav?.url) {
      const r = await fetchToBuffer(page, fav.url, IMG_FETCH_TIMEOUT_MS, MAX_LOGO_BYTES);
      if (r.ok) {
        const ext = extOf(fav.url, r.mime);
        const fname = `favicon.${ext}`;
        fs.writeFileSync(path.join(assetsDir, fname), Buffer.from(r.bytes));
        manifest.favicon = {
          sourceUrl: fav.url,
          path: `assets/${fname}`,
          bytes: r.bytes.length,
        };
      }
    }
  } catch {}

  fs.writeFileSync(
    path.join(assetsDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  return manifest;
}

export const _internal = { dedupeFontFaces, extOf, shortHash, FONT_EXT_RE, collectFontFacesFromReplay };
