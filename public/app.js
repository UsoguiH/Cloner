const form = document.getElementById('clone-form');
const urlInput = document.getElementById('url');
const submitBtn = document.getElementById('submit');
const list = document.getElementById('job-list');

const phaseLabels = {
  queued: 'Queued',
  launching: 'Launching browser',
  navigating: 'Navigating',
  scrolling: 'Scrolling',
  interacting: 'Interacting',
  extracting: 'Extracting DOM',
  processing: 'Processing assets',
  rewriting: 'Rewriting URLs',
  packaging: 'Packaging ZIP',
  done: 'Complete',
};

const subscriptions = new Map();

function readOptions() {
  const cookiesText = document.getElementById('opt-cookies').value.trim();
  let cookies = [];
  if (cookiesText) {
    try { cookies = JSON.parse(cookiesText); } catch {
      alert('Cookies field must be valid JSON.');
      throw new Error('bad cookies');
    }
  }
  const selectorsText = document.getElementById('opt-selectors').value.trim();
  const interactionSelectors = selectorsText
    ? selectorsText.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  return {
    scrollCapture: document.getElementById('opt-scroll').checked,
    fullInteraction: document.getElementById('opt-interact').checked,
    stripAnalytics: document.getElementById('opt-strip-analytics').checked,
    device: document.getElementById('opt-device').value,
    waitMs: Number(document.getElementById('opt-wait').value) || 2500,
    interactionSelectors,
    cookies,
  };
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!document.getElementById('opt-ack').checked) {
    alert('Please confirm you have the right to clone this URL.');
    return;
  }
  let options;
  try { options = readOptions(); } catch { return; }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting…';
  try {
    const res = await fetch('/api/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: urlInput.value.trim(), options }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`Submit failed: ${err.error || res.status}`);
    } else {
      const job = await res.json();
      addJobCard({ id: job.id, url: urlInput.value.trim(), status: job.status, progress: { phase: 'queued' } });
      subscribeToJob(job.id);
      urlInput.value = '';
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Clone';
  }
});

async function loadInitialJobs() {
  try {
    const res = await fetch('/api/jobs');
    const jobs = await res.json();
    for (const job of jobs) {
      addJobCard(job);
      if (job.status === 'pending' || job.status === 'running') {
        subscribeToJob(job.id);
      }
    }
  } catch (err) {
    console.error('failed to load jobs', err);
  }
}

function addJobCard(job) {
  const existing = document.getElementById(`job-${job.id}`);
  if (existing) {
    updateJobCard(job);
    return;
  }
  const el = document.createElement('div');
  el.className = 'job';
  el.id = `job-${job.id}`;
  el.innerHTML = `
    <div class="url-block">
      <div class="url" title="${escapeHtml(job.url)}">${escapeHtml(job.url)}</div>
      <div class="meta">
        <span class="phase"></span> · <span class="counts"></span>
        · <span class="job-id">${job.id}</span>
      </div>
    </div>
    <div><span class="badge ${job.status}">${job.status}</span></div>
    <div class="progress-row">
      <div class="progress-bar"><div class="progress-fill"></div></div>
      <div class="progress-text">
        <span class="msg"></span>
        <span class="pct"></span>
      </div>
    </div>
    <div class="actions"></div>
    <div class="error" hidden></div>
  `;
  list.prepend(el);
  updateJobCard(job);
}

function updateJobCard(job) {
  const el = document.getElementById(`job-${job.id}`);
  if (!el) return;
  el.querySelector('.badge').className = `badge ${job.status}`;
  el.querySelector('.badge').textContent = job.status;
  const phase = job.progress?.phase || 'queued';
  el.querySelector('.phase').textContent = phaseLabels[phase] || phase;
  const captured = job.progress?.captured ?? 0;
  const total = job.progress?.total ?? 0;
  el.querySelector('.counts').textContent =
    total > 0 ? `${captured}/${total} assets` : 'starting';
  el.querySelector('.msg').textContent = job.progress?.message || '';
  let pct = 0;
  if (job.status === 'completed') pct = 100;
  else if (total > 0) pct = Math.min(98, Math.round((captured / total) * 90) + 5);
  else pct = phaseToPct(phase);
  el.querySelector('.progress-fill').style.width = `${pct}%`;
  el.querySelector('.pct').textContent = `${pct}%`;

  const actions = el.querySelector('.actions');
  actions.innerHTML = '';
  if (job.status === 'completed') {
    actions.innerHTML = `
      <a href="/api/jobs/${job.id}/download">Download ZIP</a>
      <a href="/api/jobs/${job.id}/preview" target="_blank" rel="noopener">Preview</a>
      <a href="/api/jobs/${job.id}/manifest" target="_blank" rel="noopener">Manifest</a>
      <button type="button" class="pick-btn" data-job-id="${job.id}">Pick component</button>
      <div class="extract">
        <input type="text" class="extract-selector" placeholder="CSS selector e.g. .hero, #pricing" />
        <button type="button" class="extract-btn">Extract component (HTML only)</button>
        <span class="extract-status"></span>
      </div>
    `;
    const btn = actions.querySelector('.extract-btn');
    const input = actions.querySelector('.extract-selector');
    const status = actions.querySelector('.extract-status');
    const run = () => extractAndDownload(job.id, input.value.trim(), btn, status);
    btn.addEventListener('click', run);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
    actions.querySelector('.pick-btn').addEventListener('click', () => openPicker(job.id));
  }
  const errEl = el.querySelector('.error');
  if (job.status === 'failed' && job.error) {
    errEl.hidden = false;
    errEl.textContent = job.error;
  } else {
    errEl.hidden = true;
  }
}

function phaseToPct(phase) {
  const order = [
    'queued', 'launching', 'navigating', 'scrolling',
    'interacting', 'extracting', 'processing', 'rewriting', 'packaging', 'done',
  ];
  const idx = order.indexOf(phase);
  if (idx < 0) return 5;
  return Math.round((idx / (order.length - 1)) * 100);
}

function subscribeToJob(id) {
  if (subscriptions.has(id)) return;
  const es = new EventSource(`/api/jobs/${id}/events`);
  subscriptions.set(id, es);

  let local = { id, url: '', status: 'pending', progress: {} };

  es.addEventListener('message', (e) => {
    const event = JSON.parse(e.data);
    if (event.type === 'snapshot') {
      local = event.job;
      addJobCard(local);
      updateJobCard(local);
    } else if (event.type === 'progress') {
      local.progress = event.progress;
      updateJobCard(local);
    } else if (event.type === 'status') {
      local.status = event.status;
      if (event.error) local.error = event.error;
      updateJobCard(local);
      if (['completed', 'failed'].includes(event.status)) {
        es.close();
        subscriptions.delete(id);
      }
    }
  });

  es.onerror = () => {
    es.close();
    subscriptions.delete(id);
  };
}

async function extractAndDownload(jobId, selector, btn, status) {
  if (!selector) { status.textContent = 'enter a selector'; return; }
  btn.disabled = true;
  const prev = btn.textContent;
  btn.textContent = 'Extracting…';
  status.textContent = '';
  try {
    const res = await fetch(`/api/jobs/${jobId}/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selector }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      status.textContent = err.error || `failed (${res.status})`;
      return;
    }
    const blob = await res.blob();
    const dispo = res.headers.get('Content-Disposition') || '';
    const m = /filename="([^"]+)"/.exec(dispo);
    const filename = m ? m[1] : `component-${jobId}.html`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
    status.textContent = 'downloaded';
  } catch (err) {
    status.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = prev;
  }
}

// ---- Picker modal ----------------------------------------------------------

const pickerModal = document.getElementById('picker-modal');
const pickerIframe = document.getElementById('picker-iframe');
const pickerSelector = document.getElementById('picker-selector');
const pickerBundle = document.getElementById('picker-bundle');
const pickerStatus = document.getElementById('picker-status');
const pickerClose = document.getElementById('picker-close');
const pickerChips = document.getElementById('picker-canvas-chips');
const pickerEmpty = document.getElementById('picker-canvas-empty');
const pickerCanvasFrame = document.getElementById('picker-canvas-frame');
const pickerCount = document.getElementById('picker-count');
const pickerClear = document.getElementById('picker-clear');

let activePickJobId = null;
let pickerSelectors = [];
let canvasFrameReady = false;

function openPicker(jobId) {
  activePickJobId = jobId;
  pickerSelectors = [];
  canvasFrameReady = false;
  pickerSelector.value = '';
  pickerStatus.textContent = 'Click any component on the left. It lands at full size on the right.';
  pickerStatus.className = 'picker-modal__status';
  pickerBundle.disabled = true;
  pickerBundle.textContent = 'Complete & Download';
  pickerIframe.src = `/api/jobs/${jobId}/preview/?pick=1`;
  pickerCanvasFrame.src = `/api/jobs/${jobId}/preview/?isolate-mode=1`;
  pickerModal.hidden = false;
  document.body.style.overflow = 'hidden';
  renderChips();
  updateCanvasVisibility();
}

function closePicker() {
  pickerModal.hidden = true;
  pickerIframe.src = 'about:blank';
  pickerCanvasFrame.src = 'about:blank';
  pickerSelectors = [];
  canvasFrameReady = false;
  activePickJobId = null;
  renderChips();
  updateCanvasVisibility();
  document.body.style.overflow = '';
}

function renderChips() {
  pickerCount.textContent = String(pickerSelectors.length);
  pickerClear.disabled = pickerSelectors.length === 0;
  pickerBundle.disabled = pickerSelectors.length === 0;
  if (pickerSelectors.length === 0) {
    pickerChips.innerHTML = '';
    pickerChips.hidden = true;
    return;
  }
  pickerChips.hidden = false;
  pickerChips.innerHTML = '';
  pickerSelectors.forEach((sel, idx) => {
    const chip = document.createElement('span');
    chip.className = 'picker-canvas__chip';
    chip.innerHTML = `
      <span class="picker-canvas__chip-idx">${String(idx + 1).padStart(2, '0')}</span>
      <span class="picker-canvas__chip-sel" title="${escapeHtml(sel)}">${escapeHtml(sel)}</span>
      <button type="button" class="picker-canvas__chip-rm" aria-label="Remove">&times;</button>
    `;
    chip.querySelector('.picker-canvas__chip-rm').addEventListener('click', () => {
      pickerSelectors.splice(idx, 1);
      renderChips();
      pushSelectorsToFrame();
      updateCanvasVisibility();
    });
    pickerChips.appendChild(chip);
  });
}

function updateCanvasVisibility() {
  const has = pickerSelectors.length > 0;
  if (pickerEmpty) pickerEmpty.hidden = has;
  pickerCanvasFrame.hidden = !has;
}

function pushSelectorsToFrame() {
  if (!canvasFrameReady) return;
  const win = pickerCanvasFrame.contentWindow;
  if (!win) return;
  try {
    win.postMessage({ type: 'clone-saas-set-selectors', selectors: pickerSelectors.slice() }, '*');
  } catch (_) {}
}

pickerClose.addEventListener('click', closePicker);
pickerModal.addEventListener('click', (e) => {
  if (e.target === pickerModal) closePicker();
});
pickerClear.addEventListener('click', () => {
  pickerSelectors = [];
  pickerSelector.value = '';
  renderChips();
  pushSelectorsToFrame();
  updateCanvasVisibility();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !pickerModal.hidden) closePicker();
});

window.addEventListener('message', (e) => {
  const data = e.data;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'clone-saas-pick' && data.selector) {
    pickerSelector.value = data.selector;
    if (!pickerSelectors.includes(data.selector)) {
      pickerSelectors.push(data.selector);
      renderChips();
      pushSelectorsToFrame();
      updateCanvasVisibility();
      pickerStatus.textContent = `Added ${pickerSelectors.length}. Pick more or press Complete.`;
      pickerStatus.className = 'picker-modal__status ok';
    }
  } else if (data.type === 'clone-saas-cancel') {
    closePicker();
  } else if (data.type === 'clone-saas-isolate-ready' && e.source === pickerCanvasFrame.contentWindow) {
    canvasFrameReady = true;
    pushSelectorsToFrame();
  }
});

pickerBundle.addEventListener('click', async () => {
  const jobId = activePickJobId;
  if (!jobId || pickerSelectors.length === 0) return;
  pickerBundle.disabled = true;
  pickerClear.disabled = true;
  const original = pickerBundle.textContent;
  pickerBundle.textContent = `Bundling ${pickerSelectors.length}…`;
  pickerStatus.textContent = `Extracting ${pickerSelectors.length} component${pickerSelectors.length === 1 ? '' : 's'} and packaging ZIP. Can take 10–60s.`;
  pickerStatus.className = 'picker-modal__status';
  try {
    const res = await fetch(`/api/jobs/${jobId}/extract-zip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectors: pickerSelectors.slice() }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      pickerStatus.textContent = err.error || `failed (${res.status})`;
      pickerStatus.className = 'picker-modal__status error';
      pickerBundle.disabled = false;
      pickerClear.disabled = false;
      pickerBundle.textContent = original;
      return;
    }
    const blob = await res.blob();
    const dispo = res.headers.get('Content-Disposition') || '';
    const m = /filename="([^"]+)"/.exec(dispo);
    const filename = m ? m[1] : `components-${jobId}.zip`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
    pickerStatus.textContent = `Downloaded ${filename}.`;
    pickerStatus.className = 'picker-modal__status ok';
    pickerBundle.disabled = false;
    pickerClear.disabled = false;
    pickerBundle.textContent = original;
  } catch (err) {
    pickerStatus.textContent = err.message;
    pickerStatus.className = 'picker-modal__status error';
    pickerBundle.disabled = false;
    pickerClear.disabled = false;
    pickerBundle.textContent = original;
  }
});

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

loadInitialJobs();
