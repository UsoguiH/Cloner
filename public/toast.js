// =============================================================================
// toast.js — vanilla toast manager
//
// Behaviour modelled on the canonical "stacked deck" pattern observed on
// sonner.emilkowal.ski: the newest toast sits in front at scale 1; each older
// toast peeks behind, shrinking 5% and shifting up 14px per layer. Hover
// expands the deck into a vertical column with a fixed gap. New toasts spring
// up from below; users can swipe right to dismiss; auto-timeout is shown via
// a thin progress line at the bottom.
// =============================================================================

const PEEK_SCALE_STEP = 0.05;
const PEEK_Y_STEP = 14;
const STACK_GAP = 14;
const VISIBLE_BEHIND = 2;
const DEFAULT_DURATION = 4500;
const ERROR_DURATION = 7000;
const SWIPE_DISMISS = 80;

let _container = null;
let _toasts = [];
let _expanded = false;
let _idSeed = 0;

function ensureContainer() {
  if (_container) return _container;
  const ol = document.createElement('ol');
  ol.className = 'tk-toaster';
  ol.setAttribute('role', 'region');
  ol.setAttribute('aria-label', 'Notifications');
  document.body.appendChild(ol);
  ol.addEventListener('mouseenter', () => setExpanded(true));
  ol.addEventListener('mouseleave', () => setExpanded(false));
  _container = ol;
  return ol;
}

function setExpanded(v) {
  if (_expanded === v) return;
  _expanded = v;
  _container.classList.toggle('tk-toaster--expanded', v);
  layout();
}

function layout() {
  const live = _toasts.filter((t) => !t.leaving);
  const n = live.length;
  live.forEach((t, i) => {
    if (!t.el) return;
    const fromFront = n - 1 - i;
    let y, scale, opacity;
    if (_expanded) {
      const heightsBehind = live.slice(i + 1).reduce(
        (acc, x) => acc + (x.el?.offsetHeight || 0) + STACK_GAP,
        0
      );
      y = -heightsBehind;
      scale = 1;
      opacity = 1;
    } else {
      y = -fromFront * PEEK_Y_STEP;
      scale = 1 - fromFront * PEEK_SCALE_STEP;
      opacity = fromFront > VISIBLE_BEHIND ? 0 : 1;
    }
    t.el.style.setProperty('--tk-y', `${y}px`);
    t.el.style.setProperty('--tk-scale', String(scale));
    t.el.style.setProperty('--tk-opacity', String(opacity));
    t.el.style.zIndex = String(100 + i);
  });
}

function iconSvg(kind) {
  if (kind === 'success') {
    return '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="currentColor"/><path d="m6.4 10.2 2.5 2.4 4.7-5.2" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  if (kind === 'error') {
    return '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="currentColor"/><path d="M7 7l6 6M13 7l-6 6" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>';
  }
  if (kind === 'loading') {
    return '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" class="tk-spin"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.8" fill="none" stroke-dasharray="36 24" stroke-linecap="round"/></svg>';
  }
  return '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="currentColor"/><path d="M10 6.4v.1M10 9v5" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>';
}

function escape(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function buildEl(t) {
  const li = document.createElement('li');
  li.className = `tk-toast tk-toast--${t.kind}`;
  li.setAttribute('role', t.kind === 'error' ? 'alert' : 'status');
  li.setAttribute('aria-live', t.kind === 'error' ? 'assertive' : 'polite');
  li.style.setProperty('--tk-y', '0px');
  li.style.setProperty('--tk-scale', '1');
  li.style.setProperty('--tk-opacity', '1');
  li.innerHTML = `
    <span class="tk-toast__ic">${iconSvg(t.kind)}</span>
    <div class="tk-toast__body">
      <div class="tk-toast__title">${escape(t.title || '')}</div>
      ${t.description ? `<div class="tk-toast__desc">${escape(t.description)}</div>` : ''}
    </div>
    <button type="button" class="tk-toast__x" aria-label="Dismiss">
      <svg viewBox="0 0 20 20" width="12" height="12"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
    </button>
    ${t.duration > 0 ? `<span class="tk-toast__bar" style="--tk-dur:${t.duration}ms"></span>` : ''}
  `;
  li.querySelector('.tk-toast__x').addEventListener('click', (e) => {
    e.stopPropagation();
    dismiss(t.id);
  });
  attachSwipe(li, t.id);
  return li;
}

function attachSwipe(el, id) {
  let startX = 0;
  let dx = 0;
  let down = false;
  const onDown = (e) => {
    down = true;
    startX = e.touches ? e.touches[0].clientX : e.clientX;
    dx = 0;
    el.classList.add('tk-toast--drag');
  };
  const onMove = (e) => {
    if (!down) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    dx = Math.max(0, x - startX);
    el.style.setProperty('--tk-dx', `${dx}px`);
    el.style.setProperty('--tk-fade', String(Math.max(0, 1 - dx / 220)));
  };
  const onUp = () => {
    if (!down) return;
    down = false;
    el.classList.remove('tk-toast--drag');
    if (dx > SWIPE_DISMISS) {
      el.style.setProperty('--tk-dx', '420px');
      el.style.setProperty('--tk-fade', '0');
      setTimeout(() => dismiss(id), 200);
    } else {
      el.style.setProperty('--tk-dx', '0px');
      el.style.setProperty('--tk-fade', '1');
    }
  };
  el.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  el.addEventListener('touchstart', onDown, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: true });
  window.addEventListener('touchend', onUp);
}

function show({ title = '', description = '', kind = 'info', duration } = {}) {
  ensureContainer();
  if (duration === undefined) {
    duration = kind === 'error' ? ERROR_DURATION : (kind === 'loading' ? 0 : DEFAULT_DURATION);
  }
  const id = ++_idSeed;
  const t = { id, kind, title, description, duration, leaving: false };
  t.el = buildEl(t);
  _container.appendChild(t.el);
  _toasts.push(t);
  requestAnimationFrame(() => {
    t.el.classList.add('tk-toast--in');
    layout();
  });
  if (duration > 0) {
    t.timer = setTimeout(() => dismiss(id), duration);
  }
  return id;
}

function dismiss(id) {
  const t = _toasts.find((x) => x.id === id);
  if (!t || t.leaving) return;
  t.leaving = true;
  if (t.timer) clearTimeout(t.timer);
  t.el?.classList.add('tk-toast--out');
  layout();
  setTimeout(() => {
    if (t.el?.parentNode) t.el.parentNode.removeChild(t.el);
    _toasts = _toasts.filter((x) => x.id !== id);
    layout();
  }, 320);
}

function update(id, patch = {}) {
  const t = _toasts.find((x) => x.id === id);
  if (!t || !t.el) return;
  if (patch.title !== undefined) {
    t.title = patch.title;
    t.el.querySelector('.tk-toast__title').textContent = patch.title;
  }
  if (patch.description !== undefined) {
    t.description = patch.description;
    let d = t.el.querySelector('.tk-toast__desc');
    if (!d) {
      d = document.createElement('div');
      d.className = 'tk-toast__desc';
      t.el.querySelector('.tk-toast__body').appendChild(d);
    }
    d.textContent = patch.description;
  }
  if (patch.kind && patch.kind !== t.kind) {
    t.el.classList.remove(`tk-toast--${t.kind}`);
    t.el.classList.add(`tk-toast--${patch.kind}`);
    t.el.querySelector('.tk-toast__ic').innerHTML = iconSvg(patch.kind);
    t.kind = patch.kind;
  }
  if (patch.duration !== undefined) {
    if (t.timer) clearTimeout(t.timer);
    t.duration = patch.duration;
    if (patch.duration > 0) t.timer = setTimeout(() => dismiss(id), patch.duration);
  }
}

export const toast = {
  show: (opts) => show(opts),
  success: (title, description) => show({ title, description, kind: 'success' }),
  error: (title, description) => show({ title, description, kind: 'error' }),
  info: (title, description) => show({ title, description, kind: 'info' }),
  loading: (title, description) => show({ title, description, kind: 'loading', duration: 0 }),
  dismiss,
  update,
};
