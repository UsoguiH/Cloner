/**
 * DOM extraction: serialize the rendered tree including:
 *   - shadow DOM (open mode) as Declarative Shadow DOM templates
 *   - same-origin iframe contents inlined as srcdoc
 *   - adopted (constructable) stylesheets dumped as a separate <style>
 */

export async function extractRenderedDOM(page) {
  const result = await page.evaluate(() => {
    const iframesInlined = [];
    const iframesExternal = [];
    let shadowRootCount = 0;

    function serialize(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        return escapeText(node.nodeValue);
      }
      if (node.nodeType === Node.COMMENT_NODE) {
        return `<!--${node.nodeValue}-->`;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
      }
      const el = node;
      const tag = el.tagName.toLowerCase();

      // void elements
      const voidEls = new Set([
        'area','base','br','col','embed','hr','img','input',
        'link','meta','param','source','track','wbr'
      ]);

      let out = `<${tag}`;
      for (const attr of el.attributes) {
        out += ` ${attr.name}="${escapeAttr(attr.value)}"`;
      }
      // capture inline computed style for elements styled by CSS-in-JS via classes
      // we leave this off by default — captured stylesheets cover the common case
      out += '>';

      if (voidEls.has(tag)) return out;

      // Iframe handling
      if (tag === 'iframe') {
        try {
          const doc = el.contentDocument;
          if (doc && doc.documentElement) {
            const inner = '<!DOCTYPE html>' + serialize(doc.documentElement);
            iframesInlined.push(el.src || '(inline)');
            out += `</${tag}>`;
            return out.replace('<iframe', `<iframe srcdoc="${escapeAttr(inner)}"`);
          } else if (el.src) {
            iframesExternal.push(el.src);
          }
        } catch {
          if (el.src) iframesExternal.push(el.src);
        }
      }

      // Shadow DOM
      if (el.shadowRoot && el.shadowRoot.mode === 'open') {
        shadowRootCount++;
        let shadowOut = '<template shadowrootmode="open">';
        for (const child of el.shadowRoot.childNodes) {
          shadowOut += serialize(child);
        }
        shadowOut += '</template>';
        out += shadowOut;
      }

      // Special handling for <script> and <style>: keep raw text
      if (tag === 'script' || tag === 'style') {
        out += el.textContent || '';
        out += `</${tag}>`;
        return out;
      }

      // <textarea> defaultValue is in textContent
      if (tag === 'textarea') {
        out += escapeText(el.value || '');
        out += `</${tag}>`;
        return out;
      }

      for (const child of el.childNodes) {
        out += serialize(child);
      }
      out += `</${tag}>`;
      return out;
    }

    function escapeText(s) {
      return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
    }
    function escapeAttr(s) {
      return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll('<', '&lt;');
    }

    // Adopted stylesheets (constructable)
    const adoptedStylesheets = [];
    function collectAdopted(root) {
      const sheets = root.adoptedStyleSheets || [];
      for (const sheet of sheets) {
        try {
          const css = [...sheet.cssRules].map((r) => r.cssText).join('\n');
          if (css) adoptedStylesheets.push(css);
        } catch {}
      }
    }
    collectAdopted(document);
    document.querySelectorAll('*').forEach((el) => {
      if (el.shadowRoot) collectAdopted(el.shadowRoot);
    });

    // Update lazy-load attributes so the cloned page eagerly shows everything
    document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
      img.removeAttribute('loading');
    });

    const html = '<!DOCTYPE html>' + serialize(document.documentElement);
    return {
      html,
      adoptedStylesheets,
      shadowRootCount,
      iframesInlined: iframesInlined.length,
      iframesExternal: iframesExternal.length,
    };
  });

  return result;
}

export async function autoScroll(page) {
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    let last = 0;
    let stable = 0;
    for (let i = 0; i < 40; i++) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
      await sleep(400);
      const h = document.body.scrollHeight;
      if (h === last) {
        stable++;
        if (stable >= 2) break;
      } else {
        stable = 0;
        last = h;
      }
    }
    window.scrollTo(0, 0);
    await sleep(200);
  });
}

/**
 * Many fonts and background images are declared in CSS but only fetched when
 * an element actually renders that glyph or matches that selector. Walk every
 * stylesheet, collect every url(...) reference (especially @font-face), and
 * fire a fetch() for each so the network recorder picks them up.
 *
 * Also force-fetches every <link rel="modulepreload|prefetch|preload"> href.
 * Browsers often defer prefetch links until idle, so by the time we hit
 * networkidle they may not yet be in the recorder. Nuxt, Vite, and Astro
 * route-split bundles rely on these for sub-chunks that are *imported* later
 * by JS — without forcing them, the launcher can't replay them and the page
 * shows console 404s for `/_nuxt/<chunk>.js`, `/assets/<chunk>.js` etc.
 *
 * Same for <script type="module" src> referenced from the HTML — those
 * import sub-chunks at runtime; we walk module-script source text for
 * URL-shaped substrings to coax the imports out at capture time.
 */
export async function prefetchCSSAssets(page) {
  await page.evaluate(async () => {
    const urls = new Set();

    // 1. CSS url(...) refs (fonts, background-images, mask, etc.)
    for (const sheet of document.styleSheets) {
      const baseHref = sheet.href || location.href;
      try {
        const walk = (rules) => {
          for (const rule of rules || []) {
            const text = rule.cssText || '';
            for (const m of text.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
              const u = (m[1] || '').trim();
              if (!u || u.startsWith('data:') || u.startsWith('blob:')) continue;
              try { urls.add(new URL(u, baseHref).toString()); } catch {}
            }
            if (rule.cssRules) walk(rule.cssRules);
          }
        };
        walk(sheet.cssRules);
      } catch {}
    }

    // 2. Every <link rel="..."> with an href — modulepreload, prefetch,
    //    preload, dns-prefetch, alternate, stylesheet, icon. Force-fetch
    //    them all so route-split chunks (Nuxt, Vite, Remix, Astro) land
    //    in the recorder.
    document.querySelectorAll('link[href]').forEach((l) => {
      const rel = (l.getAttribute('rel') || '').toLowerCase();
      if (!rel) return;
      if (
        rel.includes('preload') ||
        rel.includes('prefetch') ||
        rel.includes('modulepreload') ||
        rel.includes('stylesheet') ||
        rel.includes('icon')
      ) {
        try {
          const abs = new URL(l.getAttribute('href'), location.href).toString();
          if (!abs.startsWith('data:') && !abs.startsWith('blob:')) urls.add(abs);
        } catch {}
      }
    });

    // 3. Every <script src> too, and inline <script type=module> body
    //    text scanned for URL-shaped substrings (chunk hashes look like
    //    `entry.66570678.js` or `_nuxt/foo.js` — the recorder only needs
    //    the request to fire once).
    document.querySelectorAll('script[src]').forEach((s) => {
      try {
        const abs = new URL(s.getAttribute('src'), location.href).toString();
        urls.add(abs);
      } catch {}
    });
    const chunkRe = /['"`]((?:\/|\.\/|\.\.\/)?[A-Za-z0-9_./-]+\.(?:js|mjs|css|woff2?|ttf|otf|png|jpe?g|webp|avif|svg|json))['"`]/g;
    document.querySelectorAll('script:not([src])').forEach((s) => {
      const txt = s.textContent || '';
      if (txt.length < 10 || txt.length > 500_000) return;
      for (const m of txt.matchAll(chunkRe)) {
        try {
          const abs = new URL(m[1], location.href).toString();
          if (!abs.startsWith('data:') && !abs.startsWith('blob:')) urls.add(abs);
        } catch {}
      }
    });

    // 4. <img src>, <img srcset>, <source src/srcset>, <video src>,
    //    <audio src>, <iframe src>, <object data>, <embed src>.
    const grabSrc = (sel, attr) => {
      document.querySelectorAll(sel).forEach((el) => {
        const v = el.getAttribute(attr);
        if (!v) return;
        try { urls.add(new URL(v, location.href).toString()); } catch {}
      });
    };
    grabSrc('img[src]', 'src');
    grabSrc('img[data-src]', 'data-src');
    grabSrc('source[src]', 'src');
    grabSrc('video[src]', 'src');
    grabSrc('audio[src]', 'src');
    grabSrc('object[data]', 'data');
    grabSrc('embed[src]', 'src');
    document.querySelectorAll('img[srcset], source[srcset]').forEach((el) => {
      const ss = el.getAttribute('srcset') || '';
      for (const part of ss.split(',')) {
        const url = part.trim().split(/\s+/)[0];
        if (!url) continue;
        try { urls.add(new URL(url, location.href).toString()); } catch {}
      }
    });

    // Fire fetches in batches. `mode: no-cors` lets cross-origin succeed
    // (CDP records the body even on opaque responses).
    const list = [...urls];
    const batchSize = 24;
    for (let i = 0; i < list.length; i += batchSize) {
      const batch = list.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map((u) =>
          fetch(u, { mode: 'no-cors', credentials: 'include', cache: 'force-cache' })
            .catch(() => {})
        )
      );
    }

    // Force any pending FontFace promises to resolve.
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch {}
    }
  });
}

export async function runInteractions(page, selectors) {
  for (const sel of selectors) {
    try {
      const elements = await page.$$(sel);
      for (const el of elements) {
        try {
          await el.hover({ timeout: 1500 });
          await page.waitForTimeout(150);
        } catch {}
      }
    } catch {}
  }
}
