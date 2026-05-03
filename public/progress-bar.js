// =============================================================================
// progress-bar.js — top loading bar
//
// Behaviour modelled on the canonical NProgress pattern: a thin coloured bar
// pinned to the top of the viewport that translates from -100% (off-screen
// left) toward 0%, with a glowing "peg" element at the right tip producing a
// soft trail. While indeterminate it trickles forward asymptotically; calling
// `set(0..1)` jumps it to a target; `done()` finishes to 100% then fades out.
// =============================================================================

const TRICKLE_INTERVAL = 240;     // ms between trickle steps while running
const TRICKLE_STEP_MIN = 0.005;
const TRICKLE_STEP_MAX = 0.025;
const MIN_VISIBLE = 0.08;          // start at 8% so the bar is visible immediately
const TRICKLE_CEILING = 0.92;      // never auto-trickle past here
const TRANSITION_MS = 320;
const FADE_OUT_MS = 360;

let _bar = null;
let _value = 0;
let _running = false;
let _trickleTimer = null;
let _fadeTimer = null;

function ensureBar() {
  if (_bar) return _bar;
  const wrap = document.createElement('div');
  wrap.className = 'pbar';
  wrap.setAttribute('role', 'progressbar');
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = '<span class="pbar__fill"><span class="pbar__peg"></span></span>';
  document.body.appendChild(wrap);
  _bar = wrap;
  return wrap;
}

function applyValue(v) {
  ensureBar();
  _value = Math.max(0, Math.min(1, v));
  const fill = _bar.querySelector('.pbar__fill');
  // translate from -100% (hidden) to 0% (full). At v=0.5, translate -50%.
  fill.style.transform = `translate3d(${-100 + _value * 100}%, 0, 0)`;
}

function start() {
  ensureBar();
  if (_fadeTimer) { clearTimeout(_fadeTimer); _fadeTimer = null; }
  _bar.classList.remove('pbar--done');
  _bar.classList.add('pbar--active');
  if (_value < MIN_VISIBLE) applyValue(MIN_VISIBLE);
  _running = true;
  scheduleTrickle();
}

function scheduleTrickle() {
  if (_trickleTimer) clearTimeout(_trickleTimer);
  if (!_running) return;
  _trickleTimer = setTimeout(() => {
    if (!_running) return;
    if (_value < TRICKLE_CEILING) {
      const remaining = TRICKLE_CEILING - _value;
      const step = TRICKLE_STEP_MIN + Math.random() * (TRICKLE_STEP_MAX - TRICKLE_STEP_MIN);
      applyValue(_value + Math.min(step, remaining * 0.4));
    }
    scheduleTrickle();
  }, TRICKLE_INTERVAL);
}

function set(v) {
  ensureBar();
  if (!_running) start();
  // Never go backward — the bar should only advance.
  if (v > _value) applyValue(v);
}

function done() {
  ensureBar();
  _running = false;
  if (_trickleTimer) { clearTimeout(_trickleTimer); _trickleTimer = null; }
  applyValue(1);
  _bar.classList.add('pbar--done');
  _fadeTimer = setTimeout(() => {
    _bar.classList.remove('pbar--active', 'pbar--done');
    applyValue(0);
  }, FADE_OUT_MS);
}

function fail() {
  ensureBar();
  _running = false;
  if (_trickleTimer) { clearTimeout(_trickleTimer); _trickleTimer = null; }
  _bar.classList.add('pbar--error');
  applyValue(1);
  _fadeTimer = setTimeout(() => {
    _bar.classList.remove('pbar--active', 'pbar--done', 'pbar--error');
    applyValue(0);
  }, 700);
}

export const progressBar = { start, set, done, fail };
