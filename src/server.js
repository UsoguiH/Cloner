import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';
import { JobQueue } from './queue.js';
import { runCloneJob } from './cloner/index.js';
import { extractComponent, buildComponentDoc, buildIsolatedFullPage } from './extract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const JOBS_DIR = path.join(ROOT, 'jobs');
const PUBLIC_DIR = path.join(ROOT, 'public');

fs.mkdirSync(JOBS_DIR, { recursive: true });

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(PUBLIC_DIR));

const queue = new JobQueue({
  jobsDir: JOBS_DIR,
  worker: runCloneJob,
  concurrency: Number(process.env.CLONE_CONCURRENCY || 1),
});

app.post('/api/clone', (req, res) => {
  const { url, options } = req.body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: 'invalid URL' });
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return res.status(400).json({ error: 'only http(s) URLs are supported' });
  }
  const job = queue.enqueue({ url: parsed.toString(), options: options || {} });
  res.status(202).json({ id: job.id, status: job.status });
});

app.get('/api/jobs', (_req, res) => {
  res.json(queue.list().map(summary));
});

app.get('/api/jobs/:id', (req, res) => {
  const job = queue.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'not found' });
  res.json(summary(job));
});

app.get('/api/jobs/:id/events', (req, res) => {
  const job = queue.get(req.params.id);
  if (!job) return res.status(404).end();

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  const send = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };
  send({ type: 'snapshot', job: summary(job) });

  const off = queue.subscribe(job.id, send);
  req.on('close', () => off());
});

app.get('/api/jobs/:id/manifest', (req, res) => {
  const job = queue.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'not found' });
  const manifestPath = path.join(JOBS_DIR, job.id, 'output', 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: 'manifest not yet available' });
  }
  res.sendFile(manifestPath);
});

app.get('/api/jobs/:id/download', (req, res) => {
  const job = queue.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'not found' });
  const zipPath = path.join(JOBS_DIR, job.id, 'output.zip');
  if (!fs.existsSync(zipPath)) {
    return res.status(404).json({ error: 'output not yet available' });
  }
  const fname = `clone-${job.id}.zip`;
  res.download(zipPath, fname);
});

// Preview the cloned site as a static directory so relative URLs
// (e.g. assets/foo.js) resolve correctly inside the browser.
//   ?pick=1                     → inject picker overlay (postMessage capture)
//   ?isolate=<sel>[&isolate=…]  → hide everything except matched elements + ancestors.
//   ?isolate-mode=1             → inject isolate script with empty initial selector
//                                 list; canvas iframe drives it via postMessage.
app.use('/api/jobs/:id/preview', (req, res, next) => {
  const job = queue.get(req.params.id);
  if (!job) return res.status(404).end();
  const outDir = path.join(JOBS_DIR, job.id, 'output');
  if (!fs.existsSync(outDir)) return res.status(404).end();

  const isIndex = req.path === '/' || req.path === '/index.html';
  const wantsPick = req.query.pick === '1';
  const isoRaw = req.query.isolate;
  const isoList = Array.isArray(isoRaw)
    ? isoRaw.filter((s) => typeof s === 'string' && s.length > 0)
    : (typeof isoRaw === 'string' && isoRaw.length > 0 ? [isoRaw] : []);
  const isolateMode = req.query['isolate-mode'] === '1';
  const wantsIsolate = isoList.length > 0 || isolateMode;

  if (isIndex && (wantsPick || wantsIsolate)) {
    const indexPath = path.join(outDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      let html;
      try { html = fs.readFileSync(indexPath, 'utf8'); } catch { return next(); }
      const settledOverrides = readSettledOverrides(outDir);
      const inserts = [];
      if (wantsPick) {
        inserts.push('<script src="/picker.js" data-clone-saas-picker></script>');
      }
      if (wantsIsolate) {
        inserts.push(buildIsolateScript(isoList, settledOverrides));
      }
      const tag = inserts.join('\n');
      if (/<\/head>/i.test(html)) html = html.replace(/<\/head>/i, `  ${tag}\n</head>`);
      else if (/<body[^>]*>/i.test(html)) html = html.replace(/<body[^>]*>/i, (m) => `${m}\n${tag}`);
      else html = tag + html;
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.set('Cache-Control', 'no-store');
      return res.send(html);
    }
  }

  // Try files on disk first (index.html, sw.js, replay/...).
  return express.static(outDir, {
    index: 'index.html',
    redirect: true,
    fallthrough: true,
  })(req, res, (err) => {
    if (err) return next(err);
    // Fallback: serve recorded asset bodies from replay/manifest.json so the
    // live preview renders without depending on the bundled SW (which only
    // controls the launcher's `/` scope, not `/api/jobs/:id/preview/`).
    serveReplayAsset(outDir, req, res, next);
  });
});

function readSettledOverrides(outDir) {
  try {
    const txt = fs.readFileSync(path.join(outDir, 'extraction.json'), 'utf8');
    const obj = JSON.parse(txt);
    return obj && obj.settledOverrides ? obj.settledOverrides : {};
  } catch {
    return {};
  }
}

let _replayCache = new Map(); // outDir -> { entries, byPath, byBasename }
function loadReplayManifest(outDir) {
  if (_replayCache.has(outDir)) return _replayCache.get(outDir);
  let m = null;
  try {
    const txt = fs.readFileSync(path.join(outDir, 'replay', 'manifest.json'), 'utf8');
    m = JSON.parse(txt);
  } catch {}
  _replayCache.set(outDir, m);
  return m;
}

function serveReplayAsset(outDir, req, res, next) {
  const manifest = loadReplayManifest(outDir);
  if (!manifest) return next();

  // The path inside the preview is /something — map to a candidate URL or
  // basename and look it up.
  const reqPath = req.path || '/';
  const basename = reqPath.split('/').pop();
  let entry = null;
  if (manifest.byPath && manifest.byPath[reqPath]) {
    entry = manifest.entries[manifest.byPath[reqPath]];
  } else if (basename && manifest.byBasename && manifest.byBasename[basename]) {
    entry = manifest.entries[manifest.byBasename[basename]];
  }
  if (!entry) return next();

  const bodyPath = path.join(outDir, 'replay', 'bodies', entry.body);
  if (!fs.existsSync(bodyPath)) return next();

  res.status(entry.status || 200);
  for (const [k, v] of Object.entries(entry.headers || {})) {
    try { res.set(k, v); } catch {}
  }
  if (entry.mimeType && !res.get('content-type')) {
    res.set('content-type', entry.mimeType);
  }
  res.set('access-control-allow-origin', '*');
  fs.createReadStream(bodyPath).pipe(res);
}

// Inline isolation script — marks each matched element with a pick attr and
// every ancestor up to <html> with a keep attr, then hides everything else
// via CSS. Listens for `clone-saas-set-selectors` postMessages so the picker
// canvas can update the visible set without reloading the iframe. Posts
// `clone-saas-isolate-ready` to the parent on boot.
function buildIsolateScript(selectors, settledOverrides) {
  const initialJSON = JSON.stringify(Array.isArray(selectors) ? selectors : [String(selectors)]);
  const settleCss = settledOverridesToCss(settledOverrides);
  const settleJSON = JSON.stringify(settleCss);
  return `<script data-clone-saas-isolate>
(function(){
  var SELS = ${initialJSON};
  var STYLE_ID = '__clone_saas_isolate__';
  var SETTLE_ID = '__clone_saas_settle__';
  var SETTLE_CSS = ${settleJSON};
  var CSS = 'html,body{background:#fff!important;visibility:visible!important;opacity:1!important}'
    + 'body *:not([data-clone-saas-keep]):not([data-clone-saas-pick]):not([data-clone-saas-pick] *){display:none!important}'
    + '[data-clone-saas-pick],[data-clone-saas-pick] *{opacity:1!important;visibility:visible!important}';
  function ensureStyle(id, css){
    var s = document.getElementById(id);
    if (!s) {
      s = document.createElement('style');
      s.id = id;
      (document.head||document.documentElement).appendChild(s);
    }
    s.textContent = css;
  }
  function clearMarks(){
    var picks = document.querySelectorAll('[data-clone-saas-pick]');
    for (var i=0;i<picks.length;i++) picks[i].removeAttribute('data-clone-saas-pick');
    var keeps = document.querySelectorAll('[data-clone-saas-keep]');
    for (var j=0;j<keeps.length;j++) keeps[j].removeAttribute('data-clone-saas-keep');
  }
  function apply(){
    if (!document.body) return;
    ensureStyle(STYLE_ID, CSS);
    if (SETTLE_CSS) ensureStyle(SETTLE_ID, SETTLE_CSS);
    clearMarks();
    var any = false;
    for (var i=0;i<SELS.length;i++){
      var sel = SELS[i], root;
      try { root = document.querySelector(sel); } catch(_) { continue; }
      if (!root) continue;
      root.setAttribute('data-clone-saas-pick', String(i+1));
      var cur = root.parentElement;
      while (cur && cur !== document.documentElement){
        cur.setAttribute('data-clone-saas-keep','');
        cur = cur.parentElement;
      }
      any = true;
    }
    if (any && SELS.length === 1){
      var first = document.querySelector('[data-clone-saas-pick="1"]');
      if (first) setTimeout(function(){ try{first.scrollIntoView({block:'start'});}catch(_){} }, 50);
    }
  }
  function boot(){
    apply();
    try { (window.parent||window).postMessage({ type: 'clone-saas-isolate-ready' }, '*'); } catch(_){ }
  }
  window.addEventListener('message', function(ev){
    var d = ev && ev.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'clone-saas-set-selectors' && Array.isArray(d.selectors)){
      SELS = d.selectors.filter(function(s){ return typeof s === 'string' && s.length>0; });
      apply();
    }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  // Re-apply to outlive framework hydration that may re-render the subtree.
  setTimeout(apply, 400);
  setTimeout(apply, 1200);
  setTimeout(apply, 3000);
})();
</script>`;
}

function settledOverridesToCss(overrides) {
  if (!overrides || typeof overrides !== 'object') return '';
  const rules = [];
  for (const [sel, decls] of Object.entries(overrides)) {
    if (!sel || !decls || typeof decls !== 'object') continue;
    const body = Object.entries(decls)
      .map(([prop, val]) => `${prop.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}: ${String(val).replace(/[<>]/g, '')} !important;`)
      .join(' ');
    if (body) rules.push(`${sel.replace(/[<>]/g, '')} { ${body} }`);
  }
  return rules.join('\n');
}

app.post('/api/jobs/:id/extract', async (req, res) => {
  const job = queue.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'not found' });
  if (job.status !== 'completed') {
    return res.status(409).json({ error: 'job not yet completed' });
  }
  const { selector, format } = req.body || {};
  if (!selector || typeof selector !== 'string') {
    return res.status(400).json({ error: 'selector required' });
  }
  const previewUrl = `http://127.0.0.1:${PORT}/api/jobs/${job.id}/preview/`;
  let extraction;
  try {
    extraction = await extractComponent({ previewUrl, selector });
  } catch (err) {
    console.error(`[extract ${job.id}] ${selector} failed:`, err);
    return res.status(500).json({ error: `extract failed: ${err.message}` });
  }
  if (extraction.error) return res.status(400).json({ error: extraction.error });
  if (!extraction.html) {
    return res.status(500).json({ error: 'extractor returned no html' });
  }

  if (format === 'json') {
    return res.json({
      selector,
      sourceUrl: job.url,
      elementCount: extraction.elementCount,
      html: extraction.html,
      css: extraction.css,
      referencedUrls: extraction.referencedUrls,
    });
  }
  const doc = buildComponentDoc(extraction, { selector, sourceUrl: job.url });
  const safe = selector.replace(/[^a-z0-9_-]+/gi, '_').slice(0, 40) || 'component';
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="${safe}-${job.id}.html"`);
  res.send(doc);
});

// Bundle: launcher + composed page + per-component pages. The bundle shares
// one replay/ directory and one service worker so the same recorded-asset
// pool serves the composed view and every per-component page. The page's
// original JS is preserved (no script stripping) — animations re-run live
// because the SW replays everything. Accepts either a single `selector`
// (legacy) or `selectors: string[]` (multi-pick).
app.post('/api/jobs/:id/extract-zip', async (req, res) => {
  const job = queue.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'not found' });
  if (job.status !== 'completed') {
    return res.status(409).json({ error: 'job not yet completed' });
  }
  const body = req.body || {};
  let selectors = [];
  if (Array.isArray(body.selectors)) {
    selectors = body.selectors
      .filter((s) => typeof s === 'string' && s.trim())
      .map((s) => s.trim());
  } else if (typeof body.selector === 'string' && body.selector.trim()) {
    selectors = [body.selector.trim()];
  }
  if (selectors.length === 0) {
    return res.status(400).json({ error: 'selectors required' });
  }
  if (selectors.length > 20) {
    return res.status(400).json({ error: 'max 20 selectors per bundle' });
  }
  const outDir = path.join(JOBS_DIR, job.id, 'output');
  const fullPagePath = path.join(outDir, 'index.html');
  if (!fs.existsSync(fullPagePath)) {
    return res.status(404).json({ error: 'job output not available' });
  }

  let fullPageHtml;
  try {
    fullPageHtml = fs.readFileSync(fullPagePath, 'utf8');
  } catch (err) {
    console.error(`[extract-zip ${job.id}] read index.html failed:`, err);
    return res.status(500).json({ error: `read failed: ${err.message}` });
  }

  const settledOverrides = readSettledOverrides(outDir);

  const slugify = (s) => {
    const out = s.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40).replace(/^-+|-+$/g, '');
    return out || 'component';
  };
  const components = selectors.map((sel, i) => ({
    selector: sel,
    folder: `${String(i + 1).padStart(2, '0')}-${slugify(sel)}`,
  }));

  let composedDoc;
  let perComponentDocs;
  try {
    composedDoc = buildIsolatedFullPage(fullPageHtml, selectors, { settledOverrides });
    perComponentDocs = components.map((c) =>
      buildIsolatedFullPage(fullPageHtml, [c.selector], { settledOverrides })
    );
  } catch (err) {
    console.error(`[extract-zip ${job.id}] build failed:`, err);
    return res.status(500).json({ error: `build failed: ${err.message}` });
  }

  // Files that must exist in outDir for the bundle to boot.
  const required = ['sw.js', 'serve.cjs', 'start.bat', 'start.sh'];
  for (const f of required) {
    if (!fs.existsSync(path.join(outDir, f))) {
      return res.status(500).json({ error: `bundle missing ${f} — re-clone the job` });
    }
  }
  const replayDir = path.join(outDir, 'replay');
  if (!fs.existsSync(replayDir)) {
    return res.status(500).json({ error: 'bundle missing replay/ — re-clone the job' });
  }

  const manifest = {
    sourceUrl: job.url,
    jobId: job.id,
    selectors,
    mode: 'replay',
    components: components.map((c) => ({
      selector: c.selector,
      folder: `components/${c.folder}/`,
    })),
    files: {
      'start.bat / start.sh':
        'Double-click to launch. Boots a 127.0.0.1:8080 static server, opens the default browser. Requires Node.js (https://nodejs.org/).',
      'index.html':
        'Composed view — every picked section visible together, in original DOM order, with full layout context.',
      'components/<NN-slug>/index.html':
        'One picked section in isolation. Open via the launcher (e.g. http://127.0.0.1:8080/components/01-…/).',
      'replay/':
        'Recorded URL → response body map. The bundled service worker (sw.js) replays from here so original scripts and animations run live.',
    },
    generated: new Date().toISOString(),
  };

  const zipBaseName = selectors.length === 1
    ? `${slugify(selectors[0])}-${job.id}.zip`
    : `components-${selectors.length}-${job.id}.zip`;

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipBaseName}"`);

  const zip = archiver('zip', { zlib: { level: 9 } });
  zip.on('warning', (err) => { if (err.code !== 'ENOENT') console.warn(`[extract-zip ${job.id}]`, err); });
  zip.on('error', (err) => {
    console.error(`[extract-zip ${job.id}] archive error:`, err);
    try { res.status(500).end(); } catch {}
  });
  zip.pipe(res);

  // Top-level: composed-view index + launcher + replay pool.
  zip.append(composedDoc, { name: 'index.html' });
  for (const f of required) {
    zip.file(path.join(outDir, f), { name: f });
  }
  zip.directory(replayDir, 'replay');
  if (fs.existsSync(path.join(outDir, 'extraction.json'))) {
    zip.file(path.join(outDir, 'extraction.json'), { name: 'extraction.json' });
  }

  // Per-component pages share the top-level launcher and replay pool.
  for (let i = 0; i < components.length; i++) {
    zip.append(perComponentDocs[i], { name: `components/${components[i].folder}/index.html` });
  }

  zip.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
  zip.append(buildReadme({ selectors, sourceUrl: job.url, components }), { name: 'README.txt' });

  try { await zip.finalize(); } catch (err) {
    console.error(`[extract-zip ${job.id}] finalize:`, err);
  }
});

function buildReadme({ selectors, sourceUrl, components }) {
  const componentList = components
    .map((c, i) => `  ${String(i + 1).padStart(2, '0')}. components/${c.folder}/index.html      selector: ${c.selector}`)
    .join('\n');
  return `clone-saas component bundle
============================

Source URL : ${sourceUrl}
Components : ${selectors.length}
Generated  : ${new Date().toISOString()}

Picked components (in DOM order)
--------------------------------
${componentList}

How to run
----------
Requires Node.js 18+ (https://nodejs.org/).

  Windows : double-click start.bat
  Mac/Linux: ./start.sh   (or:  node serve.cjs)

The launcher boots http://127.0.0.1:8080 and opens your default browser.

Layout
------
index.html
    Composed view — every picked section rendered together in the
    original DOM order, with full layout context (parent wrappers,
    grids, theme variables) preserved.
components/<NN-slug>/index.html
    One picked section in isolation. Visit
    http://127.0.0.1:8080/components/<NN-slug>/ in the launcher.
sw.js
    Service worker. Replays any URL the page asks for from replay/.
    Original scripts run live, so animations behave like the source.
serve.cjs / start.bat / start.sh
    Stdlib-only launcher. Binds 127.0.0.1:8080–8090.
replay/
    manifest.json + bodies/<sha1> — every recorded response.
extraction.json
    settledOverrides + adoptedStylesheet info captured at clone time.
manifest.json
    Bundle metadata.

How isolation works
-------------------
Each page:
  1. Loads the original cloned <head> with the SW bootstrap inlined.
     The SW takes control on first visit (one-time auto-reload), then
     replays every recorded URL.
  2. Injects a <style> that hides anything that isn't a picked element,
     an ancestor of one, or a descendant of one.
  3. Injects a settled-overrides <style> with the rules captured at
     clone time. This guarantees animated descendants render visible
     even before JS hydration finishes.
  4. Injects a tiny init script that marks picks
     (data-clone-saas-pick) and ancestors (data-clone-saas-keep), and
     re-applies on a short timer in case framework hydration replaces
     the subtree.

Limitations
-----------
- WebSocket / SSE / streaming responses aren't replayed (initial render
  only).
- Live-token, time-keyed, or auth-gated responses replay whatever was
  recorded — they won't refresh.
- Service workers require localhost (or https). The launcher binds to
  127.0.0.1, so it works without admin/root.
`;
}

app.use('/api/jobs/:id/files', (req, res) => {
  const job = queue.get(req.params.id);
  if (!job) return res.status(404).end();
  const rel = decodeURIComponent(req.path.replace(/^\/+/, ''));
  const outDir = path.join(JOBS_DIR, job.id, 'output');
  const target = path.resolve(outDir, rel);
  if (!target.startsWith(outDir)) return res.status(400).end();
  if (!fs.existsSync(target)) return res.status(404).end();
  res.sendFile(target);
});

function summary(job) {
  let hostname = '';
  let favicon = '';
  try {
    const u = new URL(job.url);
    hostname = u.hostname.replace(/^www\./, '');
    favicon = `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
  } catch {}
  return {
    id: job.id,
    url: job.url,
    hostname,
    favicon,
    status: job.status,
    options: job.options,
    progress: job.progress,
    error: job.error,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
  };
}

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`clone-saas listening on http://localhost:${PORT}`);
});
