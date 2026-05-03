// =============================================================================
// clone.saas — sidebar + main view controller
// =============================================================================

const $ = (id) => document.getElementById(id);

// Sidebar
const projectsList = $('projects-list');
const projectsEmpty = $('projects-empty');
const newProjectBtn = $('new-project-btn');
const activeProjectBtn = $('active-project');
const projectsCount = $('projects-count');
const projectsExpand = $('projects-expand');
const activeAvatar = $('active-avatar');
const activeName = $('active-name');

// Topbar
const crumbActive = $('crumb-active');
const topbarActions = $('topbar-actions');

// Views
const viewClone = $('view-clone');
const viewProject = $('view-project');

// Clone form
const form = $('clone-form');
const urlInput = $('url');
const submitBtn = $('submit');

// Project detail
const projectAvatar = $('project-avatar');
const projectUrlEl = $('project-url');
const projectIdEl = $('project-id');
const projectBadge = $('project-badge');
const projectProgressCard = $('project-progress');
const progressPhase = $('progress-phase');
const progressCounts = $('progress-counts');
const progressFill = $('progress-fill');
const progressMsg = $('progress-msg');
const projectErrorCard = $('project-error');
const projectErrorText = $('project-error-text');
const projectActionsCard = $('project-actions');
const actionDownload = $('action-download');
const actionPick = $('action-pick');
const actionPreview = $('action-preview');
const actionManifest = $('action-manifest');
const extractSelectorInput = $('extract-selector');
const extractBtn = $('extract-btn');
const extractAgentBtn = $('extract-agent-btn');
const extractStatus = $('extract-status');
const projectStatsCard = $('project-stats');
const statReplayed = $('stat-replayed');
const statBytes = $('stat-bytes');
const statOverrides = $('stat-overrides');
const statShadow = $('stat-shadow');

const phaseLabels = {
  queued: 'Queued',
  launching: 'Launching browser',
  navigating: 'Navigating',
  scrolling: 'Scrolling',
  interacting: 'Interacting',
  extracting: 'Extracting DOM',
  processing: 'Processing assets',
  rewriting: 'Rewriting URLs',
  packaging: 'Packaging launcher ZIP',
  done: 'Complete',
};

const PHASE_ORDER = [
  'queued', 'launching', 'navigating', 'scrolling',
  'interacting', 'extracting', 'processing', 'rewriting', 'packaging', 'done',
];

// =============================================================================
// Credits (client-side, persisted in localStorage)
// =============================================================================

const CREDITS_KEY = 'cloneSaas.credits';
const CREDITS_MAX = 100;

const creditPill = $('credit-pill');
const creditFill = $('credit-fill');
const creditMaxEl = $('credit-max');
const creditUpgrade = $('credit-upgrade');

function readCredits() {
  const raw = localStorage.getItem(CREDITS_KEY);
  if (raw === null || raw === '') return CREDITS_MAX;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > CREDITS_MAX) return CREDITS_MAX;
  return n;
}
function writeCredits(n) {
  localStorage.setItem(CREDITS_KEY, String(Math.max(0, Math.min(CREDITS_MAX, n))));
}
function renderCredits() {
  const n = readCredits();
  // Replace text node before the separator
  const sep = creditPill.querySelector('.credit-card__pill-sep');
  // Find the leading text node
  if (creditPill.firstChild && creditPill.firstChild.nodeType === 3) {
    creditPill.firstChild.nodeValue = String(n);
  } else {
    creditPill.insertBefore(document.createTextNode(String(n)), sep);
  }
  creditMaxEl.textContent = String(CREDITS_MAX);
  const pct = (n / CREDITS_MAX) * 100;
  creditFill.style.width = `${pct}%`;
  creditPill.classList.toggle('is-low', n > 0 && n <= 20);
  creditPill.classList.toggle('is-empty', n === 0);
  creditFill.classList.toggle('is-low', n > 0 && n <= 20);
}
function decrementCredits(by = 1) {
  writeCredits(readCredits() - by);
  renderCredits();
}

renderCredits();
creditUpgrade.addEventListener('click', () => {
  // Placeholder: top up to MAX. Replace with billing flow when available.
  writeCredits(CREDITS_MAX);
  renderCredits();
});

// =============================================================================
// Profile (derived from email; no auth backend yet)
// =============================================================================

const profileBtn = $('profile-btn');
const profileAvatar = $('profile-avatar');
const profileName = $('profile-name');
const profileEmail = $('profile-email');
const helpBtn = $('help-btn');
const giftBtn = $('gift-btn');

(function initProfile() {
  const email = profileEmail.textContent.trim() || 'user@local';
  const local = email.split('@')[0];
  const display = local.charAt(0).toUpperCase() + local.slice(1).replace(/\d+$/, '');
  profileName.textContent = display || 'Account';
  profileAvatar.textContent = (local[0] || '?').toUpperCase();
})();

profileBtn.addEventListener('click', () => {
  // Placeholder for future account menu
});
helpBtn.addEventListener('click', () => {
  window.open('https://github.com/', '_blank', 'noopener');
});
giftBtn.addEventListener('click', () => {
  // Quick visual: top up credits as a "gift"
  writeCredits(CREDITS_MAX);
  renderCredits();
});

// =============================================================================
// State
// =============================================================================

const projects = new Map();        // id -> job summary
const projectOrder = [];           // ids in display order
const subscriptions = new Map();   // id -> EventSource
let activeId = null;               // currently selected project id, or null
let projectsExpanded = false;      // sidebar list collapsed to first PROJECTS_COLLAPSED_LIMIT
const PROJECTS_COLLAPSED_LIMIT = 5;
const statsCache = new Map();      // id -> { replayed, bytes, overrides, shadow }

// =============================================================================
// Avatar helpers
// =============================================================================

function avatarColorIndex(seed) {
  let h = 0;
  for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) % 8;
}

function fallbackLetter(job) {
  const h = job.hostname || '';
  return (h[0] || '?').toUpperCase();
}

function faviconSources(job) {
  const out = [];
  if (job.favicon) out.push(job.favicon);
  try {
    const u = new URL(job.url);
    out.push(`https://icons.duckduckgo.com/ip3/${u.hostname}.ico`);
    out.push(`${u.protocol}//${u.hostname}/favicon.ico`);
  } catch {}
  return out;
}

function avatarHTML(job, size = 'sm') {
  const idx = avatarColorIndex(job.hostname || job.id);
  const letter = fallbackLetter(job);
  const cls = size === 'lg' ? 'avatar avatar--lg' : 'avatar';
  const sources = faviconSources(job);
  const dataSrcs = escapeHtml(JSON.stringify(sources));
  // Letter is the always-visible fallback; <img> is layered on top and removes
  // itself if every source fails so the letter stays readable.
  return `
    <span class="${cls} avatar--c${idx}">
      <span class="avatar__letter">${escapeHtml(letter)}</span>
      ${sources.length ? `<img class="avatar__img" alt="" loading="lazy" data-srcs='${dataSrcs}' />` : ''}
    </span>
  `;
}

// Wire fallback-source chain on freshly inserted avatar images.
function bootAvatarImages(root = document) {
  const imgs = root.querySelectorAll('img.avatar__img[data-srcs]:not([data-bound])');
  imgs.forEach((img) => {
    img.dataset.bound = '1';
    let srcs;
    try { srcs = JSON.parse(img.dataset.srcs || '[]'); } catch { srcs = []; }
    let i = 0;
    const tryNext = () => {
      if (i >= srcs.length) { img.remove(); return; }
      img.src = srcs[i++];
    };
    img.addEventListener('error', tryNext);
    tryNext();
  });
}

// =============================================================================
// Sidebar — projects list
// =============================================================================

function renderProjects() {
  projectsList.innerHTML = '';
  const total = projectOrder.length;
  projectsEmpty.hidden = total > 0;

  // Active project must always be visible — if it's outside the collapsed
  // window, expand automatically.
  const activeIdx = activeId ? projectOrder.indexOf(activeId) : -1;
  if (activeIdx >= PROJECTS_COLLAPSED_LIMIT) projectsExpanded = true;

  const limit = projectsExpanded ? total : Math.min(PROJECTS_COLLAPSED_LIMIT, total);
  const visibleIds = projectOrder.slice(0, limit);

  visibleIds.forEach((id, i) => {
    const job = projects.get(id);
    if (!job) return;
    const li = document.createElement('li');
    li.className = 'project-item-wrap';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'project-item' + (id === activeId ? ' is-active' : '');
    btn.dataset.id = id;
    btn.setAttribute('role', 'option');
    btn.setAttribute('aria-selected', id === activeId ? 'true' : 'false');
    const shortcut = i < 9 ? `<span class="kbd-hint rail-hide">${i + 1}</span>` : '';
    btn.innerHTML = `
      ${avatarHTML(job, 'sm')}
      <span class="project-item__name rail-hide" title="${escapeHtml(job.hostname || job.url)}">${escapeHtml(job.hostname || job.url)}</span>
      ${shortcut}
    `;
    btn.addEventListener('click', () => selectProject(id));
    li.appendChild(btn);
    projectsList.appendChild(li);
  });

  // Header count + expand toggle
  if (total > 0) {
    projectsCount.hidden = false;
    projectsCount.textContent = String(total);
  } else {
    projectsCount.hidden = true;
  }
  if (total > PROJECTS_COLLAPSED_LIMIT) {
    projectsExpand.hidden = false;
    projectsExpand.classList.toggle('is-open', projectsExpanded);
    const remaining = total - PROJECTS_COLLAPSED_LIMIT;
    projectsExpand.querySelector('.projects__expand-text').textContent =
      projectsExpanded ? 'Show less' : `Show ${remaining} more`;
  } else {
    projectsExpand.hidden = true;
  }

  // When expanded, cap the list height + scroll inside it so "Show less"
  // remains in place without forcing the user to scroll the whole sidebar.
  projectsList.classList.toggle('is-scrollable', projectsExpanded && total > PROJECTS_COLLAPSED_LIMIT);

  renderActiveProjectHeader();
  bootAvatarImages(projectsList);
}

function renderActiveProjectHeader() {
  if (!activeId) {
    activeAvatar.innerHTML = `<span class="avatar avatar--lg">?</span>`;
    activeName.textContent = 'No project selected';
    activeProjectBtn.setAttribute('aria-expanded', 'false');
    return;
  }
  const job = projects.get(activeId);
  if (!job) return;
  activeAvatar.innerHTML = avatarHTML(job, 'lg');
  activeName.textContent = job.hostname || job.url;
  activeProjectBtn.setAttribute('aria-expanded', 'true');
  bootAvatarImages(activeAvatar);
}

// =============================================================================
// View switching
// =============================================================================

function showCloneView() {
  activeId = null;
  viewClone.hidden = false;
  viewProject.hidden = true;
  crumbActive.textContent = 'New clone';
  topbarActions.innerHTML = '';
  renderProjects();
  setTimeout(() => urlInput.focus(), 30);
}

function selectProject(id) {
  if (!projects.has(id)) return;
  activeId = id;
  viewClone.hidden = true;
  viewProject.hidden = false;
  renderProjects();
  renderProjectDetail();
}

function renderProjectDetail() {
  if (!activeId) return;
  const job = projects.get(activeId);
  if (!job) return;

  crumbActive.textContent = job.hostname || 'Project';
  topbarActions.innerHTML = `
    <a class="btn btn--ghost btn--sm" href="${escapeHtml(job.url)}" target="_blank" rel="noopener">View source</a>
  `;

  projectAvatar.innerHTML = avatarHTML(job, 'lg');
  bootAvatarImages(projectAvatar);
  projectUrlEl.textContent = job.url;
  projectIdEl.textContent = `Job ${job.id}`;

  projectBadge.className = `badge ${job.status}`;
  projectBadge.textContent = job.status;

  // Progress
  const phase = job.progress?.phase || 'queued';
  progressPhase.textContent = phaseLabels[phase] || phase;
  const captured = job.progress?.captured ?? 0;
  const total = job.progress?.total ?? 0;
  progressCounts.textContent = total > 0 ? `${captured}/${total} assets` : '';
  let pct;
  if (job.status === 'completed') pct = 100;
  else if (total > 0) pct = Math.min(98, Math.round((captured / total) * 90) + 5);
  else pct = phaseToPct(phase);
  progressFill.style.width = `${pct}%`;
  progressMsg.textContent = job.progress?.message || '';

  // Hide progress card if completed (replaced by stats + actions)
  projectProgressCard.hidden = job.status === 'completed';

  // Error
  if (job.status === 'failed' && job.error) {
    projectErrorCard.hidden = false;
    projectErrorText.textContent = job.error;
  } else {
    projectErrorCard.hidden = true;
  }

  // Actions
  if (job.status === 'completed') {
    projectActionsCard.hidden = false;
    actionDownload.href = `/api/jobs/${job.id}/download`;
    actionPreview.href = `/api/jobs/${job.id}/preview`;
    actionManifest.href = `/api/jobs/${job.id}/manifest`;
    actionPick.onclick = () => openPicker(job.id);

    extractBtn.onclick = () => {
      extractAndDownload(job.id, extractSelectorInput.value.trim());
    };
    extractAgentBtn.onclick = () => {
      extractAgentAndDownload(job.id, extractSelectorInput.value.trim());
    };
    extractSelectorInput.onkeydown = (e) => {
      if (e.key === 'Enter') extractAndDownload(job.id, extractSelectorInput.value.trim());
    };

    // Stats
    projectStatsCard.hidden = false;
    refreshStats(job.id);
  } else {
    projectActionsCard.hidden = true;
    projectStatsCard.hidden = true;
  }
}

function phaseToPct(phase) {
  const idx = PHASE_ORDER.indexOf(phase);
  if (idx < 0) return 5;
  return Math.round((idx / (PHASE_ORDER.length - 1)) * 100);
}

// =============================================================================
// Stats fetcher (uses /manifest endpoint)
// =============================================================================

async function refreshStats(jobId) {
  if (statsCache.has(jobId)) {
    applyStats(statsCache.get(jobId));
    return;
  }
  try {
    const res = await fetch(`/api/jobs/${jobId}/manifest`);
    if (!res.ok) return;
    const m = await res.json();
    const s = m.stats || {};
    const stats = {
      replayed: s.replayed ?? s.requests ?? 0,
      bytes: s.replayBytes ?? 0,
      overrides: s.settledOverrides ?? 0,
      shadow: s.shadowRoots ?? 0,
    };
    statsCache.set(jobId, stats);
    if (jobId === activeId) applyStats(stats);
  } catch {}
}

function applyStats(s) {
  statReplayed.textContent = formatNum(s.replayed);
  statBytes.textContent = formatBytes(s.bytes);
  statOverrides.textContent = formatNum(s.overrides);
  statShadow.textContent = formatNum(s.shadow);
}

function formatNum(n) {
  if (!n) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function formatBytes(n) {
  if (!n) return '0';
  const KB = 1024, MB = KB * 1024;
  if (n >= MB) return `${(n / MB).toFixed(1)} MB`;
  if (n >= KB) return `${(n / KB).toFixed(0)} KB`;
  return `${n} B`;
}

// =============================================================================
// Clone form
// =============================================================================

function readOptions() {
  const cookiesText = $('opt-cookies').value.trim();
  let cookies = [];
  if (cookiesText) {
    try { cookies = JSON.parse(cookiesText); } catch {
      alert('Cookies field must be valid JSON.');
      throw new Error('bad cookies');
    }
  }
  const selectorsText = $('opt-selectors').value.trim();
  const interactionSelectors = selectorsText
    ? selectorsText.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  return {
    scrollCapture: $('opt-scroll').checked,
    fullInteraction: $('opt-interact').checked,
    stripAnalytics: $('opt-strip-analytics').checked,
    device: $('opt-device').value,
    waitMs: Number($('opt-wait').value) || 2500,
    interactionSelectors,
    cookies,
  };
}

function normalizeUrl(raw) {
  const v = raw.trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!$('opt-ack').checked) {
    alert('Please confirm you have the right to clone this URL.');
    return;
  }
  if (readCredits() <= 0) {
    alert('You are out of credits. Click "Get more credits" to top up.');
    return;
  }
  const fullUrl = normalizeUrl(urlInput.value);
  if (!fullUrl) return;
  let options;
  try { options = readOptions(); } catch { return; }

  submitBtn.disabled = true;
  const labelEl = submitBtn.querySelector('.btn--swap__label');
  const original = labelEl.textContent;
  labelEl.textContent = 'Submitting…';
  try {
    const res = await fetch('/api/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: fullUrl, options }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`Submit failed: ${err.error || res.status}`);
      return;
    }
    const created = await res.json();
    decrementCredits(1);
    // Server returns the full summary
    upsertProject(created);
    subscribeToJob(created.id);
    urlInput.value = '';
    selectProject(created.id);
  } finally {
    submitBtn.disabled = false;
    labelEl.textContent = original;
  }
});

newProjectBtn.addEventListener('click', showCloneView);
activeProjectBtn.addEventListener('click', () => {
  if (!activeId) showCloneView();
});
projectsExpand.addEventListener('click', () => {
  projectsExpanded = !projectsExpanded;
  renderProjects();
});

// =============================================================================
// Project upsert + SSE
// =============================================================================

function upsertProject(job) {
  const existing = projects.get(job.id);
  if (!existing) {
    projects.set(job.id, job);
    projectOrder.unshift(job.id);
  } else {
    projects.set(job.id, { ...existing, ...job });
  }
  renderProjects();
  if (job.id === activeId) renderProjectDetail();
}

function subscribeToJob(id) {
  if (subscriptions.has(id)) return;
  const es = new EventSource(`/api/jobs/${id}/events`);
  subscriptions.set(id, es);

  es.addEventListener('message', (e) => {
    const event = JSON.parse(e.data);
    const cur = projects.get(id) || { id };
    if (event.type === 'snapshot') {
      upsertProject(event.job);
    } else if (event.type === 'progress') {
      upsertProject({ ...cur, progress: event.progress });
    } else if (event.type === 'status') {
      const next = { ...cur, status: event.status };
      if (event.error) next.error = event.error;
      upsertProject(next);
      if (['completed', 'failed'].includes(event.status)) {
        es.close();
        subscriptions.delete(id);
        if (event.status === 'completed' && id === activeId) {
          statsCache.delete(id);
          refreshStats(id);
        }
      }
    }
  });

  es.onerror = () => {
    es.close();
    subscriptions.delete(id);
  };
}

async function loadInitialJobs() {
  try {
    const res = await fetch('/api/jobs');
    const jobs = await res.json();
    // Server returns most-recent first already; we reverse to push older first then unshift newer
    for (let i = jobs.length - 1; i >= 0; i--) {
      upsertProject(jobs[i]);
      const j = jobs[i];
      if (j.status === 'pending' || j.status === 'running') {
        subscribeToJob(j.id);
      }
    }
  } catch (err) {
    console.error('failed to load jobs', err);
  }
}

// =============================================================================
// Component extract (HTML-only)
// =============================================================================

async function extractAndDownload(jobId, selector) {
  if (!selector) { extractStatus.textContent = 'enter a selector'; return; }
  extractBtn.disabled = true;
  const original = extractBtn.textContent;
  extractBtn.textContent = 'Extracting…';
  extractStatus.textContent = '';
  try {
    const res = await fetch(`/api/jobs/${jobId}/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selector }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      extractStatus.textContent = err.error || `failed (${res.status})`;
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
    extractStatus.textContent = 'downloaded';
  } catch (err) {
    extractStatus.textContent = err.message;
  } finally {
    extractBtn.disabled = false;
    extractBtn.textContent = original;
  }
}

// AI-agent export — small ZIP optimized for LLM ingestion
async function extractAgentAndDownload(jobId, selector) {
  if (!selector) { extractStatus.textContent = 'enter a selector'; return; }
  extractAgentBtn.disabled = true;
  const original = extractAgentBtn.textContent;
  extractAgentBtn.textContent = 'Bundling…';
  extractStatus.textContent = '';
  try {
    const res = await fetch(`/api/jobs/${jobId}/extract-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selector }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      extractStatus.textContent = err.error || `failed (${res.status})`;
      return;
    }
    const blob = await res.blob();
    const dispo = res.headers.get('Content-Disposition') || '';
    const m = /filename="([^"]+)"/.exec(dispo);
    const filename = m ? m[1] : `agent-${jobId}.zip`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
    extractStatus.textContent = 'agent bundle downloaded';
  } catch (err) {
    extractStatus.textContent = err.message;
  } finally {
    extractAgentBtn.disabled = false;
    extractAgentBtn.textContent = original;
  }
}

// =============================================================================
// Picker modal (preserved logic)
// =============================================================================

const pickerModal = $('picker-modal');
const pickerIframe = $('picker-iframe');
const pickerSelector = $('picker-selector');
const pickerBundle = $('picker-bundle');
const pickerAgent = $('picker-agent');
const pickerStatus = $('picker-status');
const pickerClose = $('picker-close');
const pickerChips = $('picker-canvas-chips');
const pickerEmpty = $('picker-canvas-empty');
const pickerCanvasFrame = $('picker-canvas-frame');
const pickerCount = $('picker-count');
const pickerClear = $('picker-clear');

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
  pickerBundle.innerHTML = 'Complete &amp; Download';
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
  pickerAgent.disabled = pickerSelectors.length === 0;
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
  } catch {}
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

pickerAgent.addEventListener('click', async () => {
  const jobId = activePickJobId;
  if (!jobId || pickerSelectors.length === 0) return;
  // Use the most recently picked selector — the agent endpoint takes one
  // component at a time. Multi-component agent bundles aren't a meaningful
  // unit (each component is a self-contained artifact).
  const selector = pickerSelectors[pickerSelectors.length - 1];
  pickerAgent.disabled = true;
  const original = pickerAgent.textContent;
  pickerAgent.textContent = 'Bundling…';
  pickerStatus.textContent = `Building agent bundle for ${selector}…`;
  pickerStatus.className = 'picker-modal__status';
  try {
    const res = await fetch(`/api/jobs/${jobId}/extract-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selector }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      pickerStatus.textContent = err.error || `failed (${res.status})`;
      pickerStatus.className = 'picker-modal__status error';
      return;
    }
    const blob = await res.blob();
    const dispo = res.headers.get('Content-Disposition') || '';
    const m = /filename="([^"]+)"/.exec(dispo);
    const filename = m ? m[1] : `agent-${jobId}.zip`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
    pickerStatus.textContent = `Downloaded ${filename}.`;
    pickerStatus.className = 'picker-modal__status ok';
  } catch (err) {
    pickerStatus.textContent = err.message;
    pickerStatus.className = 'picker-modal__status error';
  } finally {
    pickerAgent.disabled = pickerSelectors.length === 0;
    pickerAgent.textContent = original;
  }
});

pickerBundle.addEventListener('click', async () => {
  const jobId = activePickJobId;
  if (!jobId || pickerSelectors.length === 0) return;
  pickerBundle.disabled = true;
  pickerClear.disabled = true;
  pickerBundle.textContent = `Bundling ${pickerSelectors.length}…`;
  pickerStatus.textContent = `Extracting ${pickerSelectors.length} component${pickerSelectors.length === 1 ? '' : 's'} and packaging launcher ZIP. Can take 10–60s.`;
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
      pickerBundle.innerHTML = 'Complete &amp; Download';
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
    pickerBundle.innerHTML = 'Complete &amp; Download';
  } catch (err) {
    pickerStatus.textContent = err.message;
    pickerStatus.className = 'picker-modal__status error';
    pickerBundle.disabled = false;
    pickerClear.disabled = false;
    pickerBundle.innerHTML = 'Complete &amp; Download';
  }
});

// =============================================================================
// Keyboard shortcuts
// =============================================================================

document.addEventListener('keydown', (e) => {
  // Esc closes picker
  if (e.key === 'Escape' && !pickerModal.hidden) {
    closePicker();
    return;
  }

  const target = e.target;
  const inField = target instanceof HTMLElement && (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );

  // Cmd/Ctrl + 1..9 → switch project
  if ((e.metaKey || e.ctrlKey) && /^[1-9]$/.test(e.key)) {
    const idx = Number(e.key) - 1;
    const id = projectOrder[idx];
    if (id) {
      e.preventDefault();
      selectProject(id);
    }
    return;
  }

  // N → new clone (only when not typing)
  if (!inField && (e.key === 'n' || e.key === 'N') && !e.metaKey && !e.ctrlKey && !e.altKey) {
    e.preventDefault();
    showCloneView();
  }
});

// =============================================================================
// Utils
// =============================================================================

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// =============================================================================
// Boot
// =============================================================================

showCloneView();
loadInitialJobs();
