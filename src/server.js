import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';
import { JobQueue } from './queue.js';
import { runCloneJob } from './cloner/index.js';
import { extractComponent, buildComponentDoc, buildIsolatedFullPage, inlineHtmlAssets } from './extract.js';

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
      const inserts = [];
      if (wantsPick) {
        inserts.push('<script src="/picker.js" data-clone-saas-picker></script>');
      }
      if (wantsIsolate) {
        inserts.push(buildIsolateScript(isoList));
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

  return express.static(outDir, {
    index: 'index.html',
    redirect: true,
    fallthrough: false,
  })(req, res, next);
});

// Inline isolation script — marks each matched element with a pick attr and
// every ancestor up to <html> with a keep attr, then hides everything else
// via CSS. Listens for `clone-saas-set-selectors` postMessages so the picker
// canvas can update the visible set without reloading the iframe. Posts
// `clone-saas-isolate-ready` to the parent on boot.
function buildIsolateScript(selectors) {
  const initialJSON = JSON.stringify(Array.isArray(selectors) ? selectors : [String(selectors)]);
  return `<script data-clone-saas-isolate>
(function(){
  var SELS = ${initialJSON};
  var STYLE_ID = '__clone_saas_isolate__';
  var CSS = 'html,body{background:#fff!important;visibility:visible!important;opacity:1!important}'
    + 'body *:not([data-clone-saas-keep]):not([data-clone-saas-pick]):not([data-clone-saas-pick] *){display:none!important}'
    + '[data-clone-saas-pick],[data-clone-saas-pick] *{opacity:1!important;visibility:visible!important}';
  function ensureStyle(){
    var s = document.getElementById(STYLE_ID);
    if (!s) {
      s = document.createElement('style');
      s.id = STYLE_ID;
      (document.head||document.documentElement).appendChild(s);
    }
    s.textContent = CSS;
  }
  function clearMarks(){
    var picks = document.querySelectorAll('[data-clone-saas-pick]');
    for (var i=0;i<picks.length;i++) picks[i].removeAttribute('data-clone-saas-pick');
    var keeps = document.querySelectorAll('[data-clone-saas-keep]');
    for (var j=0;j<keeps.length;j++) keeps[j].removeAttribute('data-clone-saas-keep');
  }
  function reveal(){
    var nodes = document.querySelectorAll('[style*="opacity"],[style*="visibility"],[data-w-id],[data-framer-name],[data-aos]');
    for (var i=0;i<nodes.length;i++){
      var el=nodes[i], st=el.style;
      if (st.opacity === '0' || st.opacity === '0.0') st.opacity = '';
      if (st.visibility === 'hidden') st.visibility = '';
      if (el.hasAttribute && el.hasAttribute('data-w-id') && /translate|scale|rotate/i.test(st.transform || '')) st.transform = '';
    }
  }
  function apply(){
    if (!document.body) return;
    ensureStyle();
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
    reveal();
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
  // Re-apply once more in case framework JS races with our marks.
  setTimeout(apply, 400);
  setTimeout(apply, 1200);
})();
</script>`;
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

// Bundle: composed page + per-component pages, all built by stripping JS
// from the full cloned page and revealing only the picked sections via CSS.
// This preserves the original DOM tree (and therefore parent layout context)
// instead of extracting subtrees and re-stitching them. Accepts either a
// single `selector` (legacy) or `selectors: string[]` (multi-pick).
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

  const slugify = (s) => {
    const out = s.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40).replace(/^-+|-+$/g, '');
    return out || 'component';
  };
  const components = selectors.map((sel, i) => ({
    selector: sel,
    folder: `${String(i + 1).padStart(2, '0')}-${slugify(sel)}`,
  }));

  const assetsDir = path.join(outDir, 'assets');
  const hasAssetsDir = fs.existsSync(assetsDir);

  let composedDoc;
  try {
    composedDoc = buildIsolatedFullPage(fullPageHtml, selectors);
    if (hasAssetsDir) composedDoc = inlineHtmlAssets(composedDoc, assetsDir);
  } catch (err) {
    console.error(`[extract-zip ${job.id}] composed build failed:`, err);
    return res.status(500).json({ error: `build failed: ${err.message}` });
  }
  const perComponentDocs = components.map((c) => {
    let doc = buildIsolatedFullPage(fullPageHtml, [c.selector]);
    if (hasAssetsDir) doc = inlineHtmlAssets(doc, assetsDir);
    return doc;
  });

  const manifest = {
    sourceUrl: job.url,
    jobId: job.id,
    selectors,
    components: components.map((c) => ({
      selector: c.selector,
      folder: `components/${c.folder}/`,
    })),
    files: {
      'index.html':
        'OPEN THIS FIRST. Self-contained: stylesheets, fonts, images, and SVGs are inlined as data: URLs so the file works from anywhere (file://, inside the unextracted ZIP, attached to email). Only the picked sections are visible; layout context (parent wrappers, grids, theme variables) is intact because the original DOM tree is preserved.',
      'components/<NN-slug>/index.html':
        'Same self-contained build for a single pick.',
      'full-page/':
        'Reference: the complete cloned page with original JS and external asset folder intact. Open full-page/index.html to inspect interactive behavior.',
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

  zip.append(composedDoc, { name: 'index.html' });
  for (let i = 0; i < components.length; i++) {
    zip.append(perComponentDocs[i], { name: `components/${components[i].folder}/index.html` });
  }
  zip.directory(outDir, 'full-page');
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

Layout
------
index.html
    OPEN THIS FIRST. Truly self-contained — stylesheets, fonts, images,
    and SVGs are inlined as data: URLs. Works from anywhere: opened from
    file://, viewed without extracting the ZIP, attached to an email.
    Only your picked sections are visible; everything else is hidden via
    CSS. Layout context (parent wrappers, container widths, fonts, CSS
    variables) is intact because the original DOM tree is preserved.
    Picks render in DOM order.
components/<NN-slug>/index.html
    Same self-contained build for a single pick. Each per-component file
    is independently portable.
full-page/
    Reference: the complete cloned page with original JS and the external
    assets/ folder intact. Open full-page/index.html (after extracting
    the ZIP) to inspect interactive behavior — but expect framework
    errors when opened from file:// (ES module CORS, fetch failures, SPA
    routing 404s).
manifest.json
    Metadata: source URL, selectors, file roles.

How isolation works
-------------------
Each isolated page:
  1. Strips every <script>, <noscript>, and <meta http-equiv="refresh">.
  2. Removes JS-gate classes (w-mod-js, w-mod-ix, w-mod-touch, js, etc.)
     so frameworks don't keep the body hidden waiting for hydration.
  3. Injects a <style> that hides everything that isn't a picked element,
     an ancestor of one, or a descendant of one.
  4. Injects a tiny init script (the only script in the doc) that:
     - Marks each match with data-clone-saas-pick.
     - Walks up to <html>, marking ancestors data-clone-saas-keep.
     - Clears Webflow IX2 / Framer / AOS pre-hide states (inline
       opacity:0, visibility:hidden, transform offsets) inside kept
       ancestors so animated children render at their final state.

Limitations (read RESEARCH.md in the parent project)
----------------------------------------------------
- Components that only render after JS hydrates (lazy SPA routes,
  React-only DOM) won't appear. Most static-SSR sites are fine.
- Closed shadow DOM, DRM video, ServiceWorker registration, and runtime
  cross-origin fetches — same limits as the cloner itself.
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
  return {
    id: job.id,
    url: job.url,
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
