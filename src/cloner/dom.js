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
 */
export async function prefetchCSSAssets(page) {
  await page.evaluate(async () => {
    const urls = new Set();
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
      } catch {
        // cross-origin stylesheets can't be read — already captured by network layer
      }
    }
    await Promise.allSettled(
      [...urls].map((u) => fetch(u, { mode: 'no-cors', credentials: 'include' }).catch(() => {}))
    );
    // Also force any pending FontFace promises to resolve
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
