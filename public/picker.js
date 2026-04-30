// Injected into the cloned preview when ?pick=1 is set.
// DevTools-style element picker: hover highlights bounding box,
// click reports a unique CSS selector to the parent window.
(() => {
  if (window.__cloneSaasPicker) return;
  window.__cloneSaasPicker = true;

  const HIGHLIGHT = '#4f46e5';
  const ZTOP = '2147483647';

  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    border: `2px solid ${HIGHLIGHT}`,
    background: 'rgba(79,70,229,0.12)',
    pointerEvents: 'none',
    zIndex: ZTOP,
    transition: 'top 60ms, left 60ms, width 60ms, height 60ms',
    boxSizing: 'border-box',
    top: '0', left: '0', width: '0', height: '0',
    display: 'none',
  });
  overlay.setAttribute('data-clone-saas-ui', '');

  const label = document.createElement('div');
  Object.assign(label.style, {
    position: 'fixed',
    background: HIGHLIGHT,
    color: 'white',
    font: '12px ui-monospace, SFMono-Regular, Menlo, monospace',
    padding: '2px 6px',
    borderRadius: '3px',
    pointerEvents: 'none',
    zIndex: ZTOP,
    maxWidth: '60vw',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'none',
  });
  label.setAttribute('data-clone-saas-ui', '');

  const banner = document.createElement('div');
  banner.textContent = 'Hover to highlight · Click to pick · Esc to cancel';
  Object.assign(banner.style, {
    position: 'fixed',
    top: '8px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#111827',
    color: 'white',
    font: '13px system-ui, -apple-system, sans-serif',
    padding: '6px 12px',
    borderRadius: '6px',
    pointerEvents: 'none',
    zIndex: ZTOP,
    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
  });
  banner.setAttribute('data-clone-saas-ui', '');

  const attach = () => {
    if (!document.body) { setTimeout(attach, 30); return; }
    document.body.append(overlay, label, banner);
  };
  attach();

  const isOurs = (el) => el && el.nodeType === 1 && el.hasAttribute && el.hasAttribute('data-clone-saas-ui');

  const escapeIdent = (s) => (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/[^a-zA-Z0-9_-]/g, (c) => '\\' + c);

  function selectorFor(el) {
    if (!el || el.nodeType !== 1) return '';
    if (el === document.body) return 'body';
    if (el === document.documentElement) return 'html';
    if (el.id) {
      const sel = '#' + escapeIdent(el.id);
      try { if (document.querySelectorAll(sel).length === 1) return sel; } catch {}
    }
    const path = [];
    let cur = el;
    while (cur && cur.nodeType === 1 && cur !== document.documentElement) {
      let part = cur.tagName.toLowerCase();
      if (cur.id) {
        try {
          const sel = '#' + escapeIdent(cur.id);
          if (document.querySelectorAll(sel).length === 1) {
            path.unshift(sel);
            return path.join(' > ');
          }
        } catch {}
      }
      const parent = cur.parentElement;
      if (parent) {
        const same = [...parent.children].filter((c) => c.tagName === cur.tagName);
        if (same.length > 1) part += `:nth-of-type(${same.indexOf(cur) + 1})`;
      }
      path.unshift(part);
      cur = parent;
    }
    return path.join(' > ');
  }

  function describe(el) {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const cls = (typeof el.className === 'string' ? el.className : (el.className && el.className.baseVal) || '').trim();
    if (cls) s += '.' + cls.split(/\s+/).slice(0, 3).join('.');
    return s;
  }

  let current = null;
  const onMove = (e) => {
    let el = e.target;
    if (!el || isOurs(el)) return;
    if (el === current) return;
    current = el;
    const r = el.getBoundingClientRect();
    overlay.style.display = 'block';
    overlay.style.top = r.top + 'px';
    overlay.style.left = r.left + 'px';
    overlay.style.width = r.width + 'px';
    overlay.style.height = r.height + 'px';
    label.style.display = 'block';
    const top = r.top - 22;
    label.style.top = (top < 0 ? r.top + r.height + 4 : top) + 'px';
    label.style.left = Math.max(0, r.left) + 'px';
    label.textContent = describe(el);
  };

  // Block all interactive events from reaching the cloned page.
  const block = (e) => {
    if (isOurs(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  };
  ['mousedown', 'mouseup', 'dblclick', 'contextmenu', 'submit', 'touchstart', 'touchend', 'pointerdown', 'pointerup'].forEach((t) =>
    document.addEventListener(t, block, true)
  );

  document.addEventListener('mousemove', onMove, true);

  document.addEventListener('click', (e) => {
    if (isOurs(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    const sel = selectorFor(e.target);
    if (!sel) return;
    try { window.parent.postMessage({ type: 'clone-saas-pick', selector: sel }, '*'); } catch {}
  }, true);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      try { window.parent.postMessage({ type: 'clone-saas-cancel' }, '*'); } catch {}
    }
  }, true);
})();
