# clone-saas

High-fidelity website cloner. Submit a URL, get back a ZIP containing an offline
copy of the page (HTML + all captured assets + manifest + HAR).

> Read [`RESEARCH.md`](./RESEARCH.md) before reading the code. It explains why
> "100% fidelity" is unachievable in the general case and what trade-offs this
> system makes.

## What it does

1. Launches Chromium via Playwright with a raw CDP session.
2. Records every network response body (CSS, JS, fonts, images, fetched JSON,
   WASM, media) via the CDP `Network` domain.
3. Waits for `networkidle`, optionally scrolls to load lazy content, optionally
   triggers user-supplied selectors.
4. Serializes the rendered DOM, including:
   - Open shadow roots → Declarative Shadow DOM templates
   - Same-origin iframes inlined as `srcdoc`
   - Adopted (constructable) stylesheets dumped as a `<style>` block
5. Rewrites HTML attribute URLs and CSS `url()` / `@import` to point at local
   files. JS is intentionally **not** rewritten (see RESEARCH §3).
6. Strips CSP `<meta>` tags and known analytics endpoints.
7. Packages everything into a ZIP with `index.html`, `assets/`, `manifest.json`,
   and `network.har`.

## What it does *not* do

- Defeat captchas, WAFs, bot management, or DRM.
- Rewrite JS — dynamic `fetch()` calls in cloned JS will hit the original URL.
- Replay server-side state (search results, recommendations, real-time data).
- Re-register service workers in the offline output.
- Crawl multiple pages (single page only, by design — depth=1).

## Running it

Requires Node ≥ 20 and ~500MB free disk for the Chromium download.

```bash
npm install
npm start
# open http://localhost:3000
```

Environment variables:
- `PORT` — HTTP port (default 3000)
- `CLONE_CONCURRENCY` — parallel jobs (default 1; raise carefully — Playwright is
  memory-hungry)

## REST API

- `POST /api/clone` — body `{ "url": "...", "options": { ... } }` → returns `{ id, status }`
- `GET /api/jobs` — list all jobs
- `GET /api/jobs/:id` — single job state
- `GET /api/jobs/:id/events` — SSE stream of progress updates
- `GET /api/jobs/:id/download` — ZIP
- `GET /api/jobs/:id/preview` — open the cloned `index.html`
- `GET /api/jobs/:id/manifest` — JSON manifest
- `GET /api/jobs/:id/files/<path>` — individual file inside the output

### Options

| Field | Default | Notes |
|---|---|---|
| `scrollCapture` | `true` | Auto-scroll to fire IntersectionObserver / lazy loaders |
| `fullInteraction` | `false` | Hover supplied selectors before capture |
| `interactionSelectors` | `[]` | CSS selectors for `fullInteraction` |
| `device` | `"desktop"` | Or `"mobile"` (390x844 iPhone-like UA) |
| `waitMs` | `2500` | Settle timeout after scroll/interactions |
| `stripAnalytics` | `true` | Drop GA / Segment / Mixpanel / etc. from output |
| `cookies` | `[]` | Playwright `addCookies()` format for authenticated pages |
| `extraHeaders` | `{}` | Extra HTTP headers (e.g. `Authorization`) |

## Architecture

```
src/
  server.js              Express HTTP + SSE
  queue.js               In-memory FIFO job queue with concurrency cap
  cloner/
    index.js             Orchestrates a single clone job
    browser.js           (inline in index.js — Playwright launch)
    network.js           CDP Network recorder
    dom.js               Rendered-DOM serializer + autoscroll + interactions
    rewriter.js          HTML/CSS URL rewriting
    packager.js          Asset write + ZIP build
    util.js              Hashing / mime / basename helpers
public/                  Static dashboard (vanilla JS + SSE)
jobs/<id>/               Per-job working dir + output.zip
RESEARCH.md              Pre-build research report
```

## Legal note

This tool is intended for archiving sites you own, offline reading, and
development reference. Don't use it to violate ToS, redistribute copyrighted
content, or impersonate brands. The dashboard requires you to confirm "I have
the right to clone this URL" before submission. That's a soft check — the legal
responsibility is yours.
