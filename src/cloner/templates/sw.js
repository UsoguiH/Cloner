// clone-saas service worker — replays recorded responses for any URL the
// page asks for. Loaded once per bundle, controls all pages under origin /.

const MANIFEST_URL = '/replay/manifest.json';
let manifest = null;
let manifestPromise = null;

function loadManifest() {
  if (manifestPromise) return manifestPromise;
  manifestPromise = fetch(MANIFEST_URL, { cache: 'no-store' })
    .then((r) => r.json())
    .then((m) => { manifest = m; return m; })
    .catch(() => { manifest = { entries: {}, byPath: {} }; return manifest; });
  return manifestPromise;
}

self.addEventListener('install', (event) => {
  event.waitUntil(loadManifest().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function lookup(url) {
  if (!manifest || !manifest.entries) return null;
  if (manifest.entries[url]) return manifest.entries[url];

  let u;
  try { u = new URL(url); } catch { return null; }

  // Try without query
  const noQuery = u.origin + u.pathname;
  if (manifest.entries[noQuery]) return manifest.entries[noQuery];

  // Try by pathname against the recorded same-origin index
  if (manifest.byPath && manifest.byPath[u.pathname]) {
    const canon = manifest.byPath[u.pathname];
    if (manifest.entries[canon]) return manifest.entries[canon];
  }

  // Try a basename match (last-ditch for hash-renamed assets)
  const last = u.pathname.split('/').pop();
  if (last && manifest.byBasename && manifest.byBasename[last]) {
    const canon = manifest.byBasename[last];
    if (manifest.entries[canon]) return manifest.entries[canon];
  }

  return null;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = req.url;
  // Don't intercept the bundle's own infrastructure
  if (url.indexOf('/replay/') !== -1) return;
  if (url.endsWith('/sw.js')) return;

  event.respondWith(handle(req));
});

async function handle(req) {
  if (!manifest) await loadManifest();

  const entry = lookup(req.url);
  if (entry) {
    try {
      const bodyRes = await fetch('/replay/bodies/' + entry.body);
      if (!bodyRes.ok) {
        return new Response(null, { status: 502, statusText: 'replay body missing' });
      }
      const buf = await bodyRes.arrayBuffer();
      const headers = new Headers();
      if (entry.headers) {
        for (const k of Object.keys(entry.headers)) {
          headers.set(k, entry.headers[k]);
        }
      }
      if (entry.mimeType) headers.set('content-type', entry.mimeType);
      // CORS: opaque for the page is fine, but explicit allow-all is safer
      // for cross-origin resource requests served from our localhost.
      headers.set('access-control-allow-origin', '*');
      return new Response(buf, {
        status: entry.status || 200,
        headers,
      });
    } catch {
      return new Response(null, { status: 502 });
    }
  }

  // Same-origin file fetch — let the static server handle it
  try {
    const u = new URL(req.url);
    if (u.origin === self.location.origin) {
      return await fetch(req);
    }
  } catch {}

  // Unrecorded cross-origin: fail silently with 204 so DevTools doesn't shout
  return new Response(null, { status: 204 });
}
