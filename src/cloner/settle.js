/**
 * Settled-DOM snapshot.
 *
 * Most animation libraries pre-hide elements with inline opacity:0 /
 * visibility:hidden / hide-transform and let JS animate them in when they
 * scroll into view. After autoScroll has visited everything, MOST animations
 * have fired and the inline style is either cleared or set to the visible
 * end-state. The ones that DIDN'T fire (off-screen at scroll-end, hover-only,
 * IntersectionObserver with custom rootMargin, etc.) still have hide-style
 * inline. If the picker isolates one of those, the user sees an empty box.
 *
 * This pass:
 *   1. Walks top-level <body> children and scrollIntoView({ block: 'center' })
 *      each one so any IntersectionObserver fires with a generous rootMargin.
 *   2. Returns one CSS override per element whose inline style would still
 *      hide it. Picker isolation injects these as `<style>el { opacity: 1
 *      !important; ... }` so the picked component is visible regardless of
 *      whether the framework's reveal animation runs.
 *
 * Reuses the selector-builder approach from public/picker.js (escape ids,
 * fall back to nth-of-type chains) so the selectors are stable across
 * captures of the same page.
 */

export async function settleSnapshots(page) {
  return await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const raf4 = () =>
      new Promise((r) => {
        let i = 0;
        const tick = () => (++i < 4 ? requestAnimationFrame(tick) : r());
        requestAnimationFrame(tick);
      });

    function cssEscape(s) {
      try { return CSS.escape(s); }
      catch { return String(s).replace(/[^\w-]/g, '\\$&'); }
    }

    function selectorFor(el) {
      if (!el || el.nodeType !== 1) return null;
      if (el.id) {
        const escaped = '#' + cssEscape(el.id);
        try {
          if (document.querySelectorAll(escaped).length === 1) return escaped;
        } catch {}
      }
      const parts = [];
      let cur = el;
      while (
        cur &&
        cur.nodeType === 1 &&
        cur !== document.body &&
        cur !== document.documentElement
      ) {
        let part = cur.tagName.toLowerCase();
        if (cur.id) {
          const escaped = '#' + cssEscape(cur.id);
          try {
            if (document.querySelectorAll(escaped).length === 1) {
              parts.unshift(escaped);
              cur = null;
              break;
            }
          } catch {}
        }
        const parent = cur.parentElement;
        if (parent) {
          const sib = Array.from(parent.children).filter(
            (c) => c.tagName === cur.tagName
          );
          if (sib.length > 1) {
            const idx = sib.indexOf(cur) + 1;
            part += `:nth-of-type(${idx})`;
          }
        }
        parts.unshift(part);
        cur = parent;
      }
      if (cur === document.body) parts.unshift('body');
      else if (cur === document.documentElement) parts.unshift('html');
      return parts.join(' > ');
    }

    // Pass 1: bring each top-level section into view so IO-driven reveals fire.
    const sections = Array.from(document.body.children).filter(
      (el) => el.nodeType === 1
    );
    for (const section of sections) {
      try { section.scrollIntoView({ block: 'center' }); } catch {}
      await raf4();
      await sleep(120);
    }
    window.scrollTo(0, 0);
    await raf4();
    await sleep(200);

    // Pass 2: scan for elements still pre-hidden inline.
    const overrides = {};
    const candidates = document.querySelectorAll(
      '[style*="opacity"], [style*="visibility"], [style*="transform"], [style*="clip-path"], [style*="filter"]'
    );

    function isHideTransform(t) {
      if (!t || t === 'none') return false;
      // Skip identity-ish transforms.
      if (/^matrix\(\s*1\s*,\s*0\s*,\s*0\s*,\s*1\s*,\s*0\s*,\s*0\s*\)\s*$/.test(t)) return false;
      if (/^translate(?:3d)?\(\s*0(?:px|%)?\s*,\s*0(?:px|%)?\s*(?:,\s*0(?:px|%)?\s*)?\)\s*$/.test(t)) return false;
      // Anything that translates by a non-zero amount, scales to 0, or uses a
      // hide matrix is treated as a hide transform.
      return /translate|scale\s*\(\s*0|matrix/i.test(t);
    }

    function isHideClip(c) {
      if (!c || c === 'none') return false;
      return /inset\s*\(\s*100%|circle\s*\(\s*0|polygon\s*\(\s*[^)]*0%/i.test(c);
    }

    function isHideFilter(f) {
      if (!f || f === 'none') return false;
      return /blur\s*\(\s*\d+(\.\d+)?(px|em|rem)\s*\)|opacity\s*\(\s*0/i.test(f);
    }

    for (const el of candidates) {
      const s = el.style;
      const o = {};
      if (s.opacity !== '' && parseFloat(s.opacity) < 0.99) o.opacity = '1';
      if (s.visibility === 'hidden') o.visibility = 'visible';
      if (isHideTransform(s.transform)) o.transform = 'none';
      if (isHideClip(s.clipPath)) o.clipPath = 'none';
      if (isHideFilter(s.filter)) o.filter = 'none';
      if (Object.keys(o).length === 0) continue;
      const sel = selectorFor(el);
      if (sel && !overrides[sel]) overrides[sel] = o;
    }

    return overrides;
  });
}
