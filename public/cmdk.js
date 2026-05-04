// =============================================================================
// cmdk.js — command palette (Linear / Vercel-DocSearch pattern)
//
// Centered modal with a fuzzy-matched, keyboard-driven action list. Sectioned
// results: "Actions" (new clone, picker, downloads), "Projects" (the cloned
// project list), "Settings" (placeholder). Open with Cmd/Ctrl+K or "/".
// =============================================================================

let _root = null;
let _scrim = null;
let _input = null;
let _list = null;
let _hint = null;
let _items = [];
let _filtered = [];
let _highlight = 0;
let _provider = () => [];

function ensureMounted() {
  if (_root) return;
  const root = document.createElement('div');
  root.className = 'cmdk-root';
  root.hidden = true;
  root.innerHTML = `
    <div class="cmdk-scrim" data-cmdk-scrim></div>
    <div class="cmdk" role="dialog" aria-modal="true" aria-label="Command palette">
      <div class="cmdk__head">
        <svg class="cmdk__head-ic" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <circle cx="11" cy="11" r="6" stroke="currentColor" stroke-width="1.6" fill="none"/>
          <path d="m20 20-3.2-3.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
        <input class="cmdk__input" type="text" placeholder="Type a command or search projects…" autocomplete="off" spellcheck="false" />
        <kbd class="cmdk__esc">Esc</kbd>
      </div>
      <div class="cmdk__list" role="listbox"></div>
      <div class="cmdk__foot">
        <span class="cmdk__hint" data-empty hidden>No matches</span>
        <span class="cmdk__kbds">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
          <span><kbd>Esc</kbd> close</span>
        </span>
      </div>
    </div>
  `;
  document.body.appendChild(root);
  _root = root;
  _scrim = root.querySelector('[data-cmdk-scrim]');
  _input = root.querySelector('.cmdk__input');
  _list = root.querySelector('.cmdk__list');
  _hint = root.querySelector('[data-empty]');

  _scrim.addEventListener('click', close);
  _input.addEventListener('input', () => { _highlight = 0; refresh(); });
  _input.addEventListener('keydown', onKey);
  _list.addEventListener('mousemove', onListHover);
  _list.addEventListener('click', onListClick);
}

function open() {
  ensureMounted();
  _items = _provider() || [];
  _input.value = '';
  _highlight = 0;
  refresh();
  _root.hidden = false;
  // Two-frame defer so the transition sees `is-open` after `hidden=false`.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    _root.classList.add('is-open');
    _input.focus();
  }));
}

function close() {
  if (!_root) return;
  _root.classList.remove('is-open');
  setTimeout(() => { if (_root) _root.hidden = true; }, 180);
}

function isOpen() {
  return _root && _root.classList.contains('is-open');
}

function setProvider(fn) {
  _provider = fn;
}

function score(item, q) {
  if (!q) return 1;
  const hay = `${item.label} ${item.keywords || ''} ${item.group || ''}`.toLowerCase();
  const needle = q.toLowerCase();
  if (hay === needle) return 1000;
  if (hay.startsWith(needle)) return 500;
  if (item.label.toLowerCase().startsWith(needle)) return 400;
  if (hay.includes(needle)) return 100;
  // Fuzzy: every char of needle in order in hay
  let i = 0;
  for (const c of hay) { if (c === needle[i]) i++; if (i === needle.length) break; }
  return i === needle.length ? 10 : 0;
}

function refresh() {
  const q = (_input.value || '').trim();
  _filtered = _items
    .map((it) => ({ it, s: score(it, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.it);

  // Group while preserving sorted order within groups
  const seen = new Map();
  for (const it of _filtered) {
    const g = it.group || 'Other';
    if (!seen.has(g)) seen.set(g, []);
    seen.get(g).push(it);
  }

  _list.innerHTML = '';
  let flatIdx = 0;
  const flat = [];
  for (const [group, items] of seen) {
    const head = document.createElement('div');
    head.className = 'cmdk__group';
    head.textContent = group;
    _list.appendChild(head);
    for (const it of items) {
      const row = document.createElement('div');
      row.className = 'cmdk__item' + (flatIdx === _highlight ? ' is-highlighted' : '');
      row.setAttribute('role', 'option');
      row.dataset.idx = String(flatIdx);
      row.innerHTML = `
        <span class="cmdk__item-ic">${it.icon || ''}</span>
        <span class="cmdk__item-label">${escape(it.label)}</span>
        ${it.subtitle ? `<span class="cmdk__item-sub">${escape(it.subtitle)}</span>` : ''}
        ${it.hint ? `<kbd class="cmdk__item-kbd">${escape(it.hint)}</kbd>` : ''}
      `;
      _list.appendChild(row);
      flat.push(it);
      flatIdx++;
    }
  }
  _filtered = flat;
  _hint.hidden = _filtered.length > 0;
  ensureHighlightVisible();
}

function ensureHighlightVisible() {
  const el = _list.querySelector(`.cmdk__item[data-idx="${_highlight}"]`);
  if (el) el.scrollIntoView({ block: 'nearest' });
}

function setHighlight(i) {
  if (!_filtered.length) return;
  _highlight = (i + _filtered.length) % _filtered.length;
  _list.querySelectorAll('.cmdk__item').forEach((el) => {
    el.classList.toggle('is-highlighted', Number(el.dataset.idx) === _highlight);
  });
  ensureHighlightVisible();
}

function activate(idx) {
  const it = _filtered[idx];
  if (!it) return;
  close();
  try { it.run && it.run(); } catch (e) { console.error('cmdk action failed', e); }
}

function onKey(e) {
  if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(_highlight + 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(_highlight - 1); }
  else if (e.key === 'Enter') { e.preventDefault(); activate(_highlight); }
  else if (e.key === 'Escape') { e.preventDefault(); close(); }
}

function onListHover(e) {
  const row = e.target.closest('.cmdk__item');
  if (!row) return;
  setHighlight(Number(row.dataset.idx));
}
function onListClick(e) {
  const row = e.target.closest('.cmdk__item');
  if (!row) return;
  activate(Number(row.dataset.idx));
}

function escape(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Global keyboard hook — Cmd/Ctrl+K toggles
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault();
    isOpen() ? close() : open();
  }
});

export const cmdk = { open, close, isOpen, setProvider };
