# Website Cloning — Technical Research Report

## 0. Reality Check on "100% Fidelity"

Before the technical content: a perfect clone of an arbitrary modern website is **not achievable in the general case**. The reasons are structural, not just engineering effort:

1. **Server-rendered state is hidden behind auth, geo, and per-request logic.** A clone is a snapshot; the original is a function of (user, session, time, geo, A/B bucket).
2. **JIT-loaded code paths are invisible until triggered.** A route, modal, or feature flag that was never reached during capture cannot be cloned.
3. **Server-side computation (search, recommendations, GraphQL resolvers, real-time data) cannot be replicated** — only its observed responses can be cached and replayed.
4. **DRM-protected media (Widevine/PlayReady), encrypted WebSocket payloads, and CSP-locked third-party iframes** are technically uncapturable in a usable form.
5. **Anti-clone defenses** (DOM obfuscation, runtime integrity checks, canvas/WebGL fingerprint gates) are designed specifically to break this.

A realistic target is **"high-fidelity offline snapshot of one rendered state"**, with explicit reporting of what couldn't be captured. That's what this system aims for.

---

## 1. Browser Automation Limitations

### Puppeteer vs. Playwright vs. Selenium

| Dimension | Puppeteer | Playwright | Selenium |
|---|---|---|---|
| Protocol | CDP only (Chromium) | CDP + WebKit + Firefox protocols | WebDriver (W3C) |
| CDP access | Direct, first-class | Direct via `page.context().newCDPSession()` | Limited, indirect |
| Network interception | `page.setRequestInterception` (request-level) + CDP Fetch | `page.route()` + CDP via `CDPSession` | Via BiDi or proxies, awkward |
| Multi-context isolation | Single-context per page | Browser contexts are first-class (cookie/storage isolation) | Profile-based |
| Wait primitives | `waitForNetworkIdle`, selectors | Auto-waiting on actions, `expect()` retries | Explicit waits required |
| Bot detection surface | Higher (Headless Chrome ID, navigator.webdriver) | Same fundamentals; better stealth options | Highest (WebDriver flags very visible) |
| Resource body capture | CDP `Network.getResponseBody` | Same, plus `route.fulfill`/`response.body()` | Requires proxy (mitmproxy, BrowserMob) |

**Verdict for this project: Playwright + CDP.** Playwright gives a higher-level API for clicks/scrolls/waits and exposes raw CDP when we need it. CDP is the only practical way to capture **every** network response body including ones loaded by service workers and inline data.

### Capturing dynamically injected content (SPA / React / Vue / Angular hydration)

- `page.content()` returns the **current serialized DOM**, not the original HTML. After hydration this contains the rendered tree, which is what we want.
- For frameworks that defer hydration (Next.js partial hydration, Astro islands, Qwik resumability), wait beyond `domcontentloaded`:
  - Wait for `networkidle` (no requests for 500 ms)
  - Plus a configurable settle timeout (we use 2–5 s)
  - Plus optional readiness signals: `document.readyState === 'complete'`, absence of pending `requestAnimationFrame` chains, or framework-specific globals (`window.__NEXT_DATA__`, `window.__NUXT__`)
- Hydrated client state (Redux store, React fiber tree) **cannot be losslessly serialized**. Cloning produces a dead DOM — no further client interaction reproduces server-bound logic.

### Lazy-loaded images, infinite scroll, AJAX-dependent content

- **Lazy images (`loading="lazy"`, IntersectionObserver-based)**: forced-eager-load by removing `loading="lazy"` and scrolling the page so observers fire. Some libraries (lozad, lazysizes) require the actual scroll event — programmatic scroll-into-view works.
- **Infinite scroll**: scroll to `document.body.scrollHeight` in a loop until height stops growing or a max-iterations cap is hit. Watch for `IntersectionObserver` sentinels.
- **AJAX-only content**: triggered by user action (clicks, hovers, form input). Cannot be auto-discovered; require either explicit user-provided selector list or aggressive heuristic (click every `<button>` and `<a>` that doesn't navigate). Heuristic clicking is destructive and mostly bad — better to expose it as an opt-in.

### Bot detection / fingerprinting / anti-scraping

Common signals headless Chromium leaks:
- `navigator.webdriver === true`
- `navigator.languages` empty or wrong
- `navigator.plugins` length 0
- WebGL vendor `"Brian Paul"` / renderer `"Mesa OffScreen"`
- Missing `chrome.runtime`
- `Notification.permission === 'denied'` while `Notification.requestPermission` resolves immediately
- Headless UA string
- Consistent timing signatures on `performance.now()`
- Screen dimensions of 800x600
- Missing media devices

Mitigations (in increasing order of aggression and risk):
1. **`playwright-extra` + `puppeteer-extra-plugin-stealth`** — patches the most common leaks. Sufficient for 80% of casual bot walls.
2. **Real Chrome (channel: 'chrome')** instead of bundled Chromium — closer to a real browser fingerprint.
3. **Persistent user data dir** so the profile ages naturally (cookies, history).
4. **Residential/mobile proxies** for IP-reputation gates (Cloudflare, Akamai, PerimeterX).
5. **Manual cookie/session import** — solve the challenge in a real browser, export `Cookie` header, run automation as already-authenticated.

Anti-bot defenses worth flagging as **out of scope**:
- Cloudflare Turnstile / hCaptcha / reCAPTCHA v3 — solving these programmatically is ToS-violating and ethically/legally problematic.
- DataDome, PerimeterX, Akamai Bot Manager — same.

The honest position: **if a site has serious bot protection, treat that as a "do not clone" signal** rather than a problem to defeat.

---

## 2. Network & DevTools Protocol (CDP)

### Intercepting every network request

CDP `Network` domain events:
- `Network.requestWillBeSent` — every request including inline `data:` URIs (excluded by default; can be filtered)
- `Network.responseReceived` — headers, status, MIME, remote address
- `Network.loadingFinished` — body is now available; call `Network.getResponseBody` with `requestId`
- `Network.loadingFailed` — capture for failure manifest
- `Network.webSocketCreated`, `Network.webSocketFrameSent`, `Network.webSocketFrameReceived` — full WS frame log
- `Network.eventSourceMessageReceived` — Server-Sent Events
- `Network.responseReceivedExtraInfo` — full response headers including `Set-Cookie` (the standard event redacts these)

Critical detail: `Network.getResponseBody` **must be called after `loadingFinished`**, and it can fail for some redirects, 204s, and resources served from cache. Always wrap in try/catch and record failures in the manifest.

For service-worker-served responses, also enable `Network.setRequestInterception` (legacy) or the modern `Fetch` domain to see what the SW returned, not just what the page initially asked for. Without this, SW-cached responses look like normal responses but their bodies may be unfetchable.

### HAR with response bodies

Playwright's built-in HAR (`browserContext.recordHar({ content: 'embed' })`) emits HAR 1.2 with `response.content.text` filled in. This is the cheapest path if you don't need real-time streaming. HAR is convenient but:
- ~3x larger than raw assets due to JSON+base64 encoding
- Loses some metadata (initiator chains are simplified)
- Requires post-processing to extract files

This system uses **CDP directly** for live progress reporting, and emits a HAR alongside as a debug artifact.

### Storing every asset class

| Class | MIME hints | Storage |
|---|---|---|
| HTML | `text/html` | UTF-8 text, normalize encoding |
| CSS | `text/css` | UTF-8 text, parse for `url()` and `@import` |
| JS | `application/javascript`, `text/javascript`, `module` | UTF-8 text |
| Images | `image/*` | Binary; preserve original bytes |
| Fonts | `font/*`, `application/font-woff*` | Binary |
| Media | `video/*`, `audio/*` | Binary; HLS/DASH need playlist + segments |
| WASM | `application/wasm` | Binary |
| JSON/XML/AJAX | `application/json`, `application/xml` | Text; useful as "API response cache" if site is replayed |

**Encoding gotcha**: `Network.getResponseBody` returns `{ body, base64Encoded }`. Always honor `base64Encoded` — assuming UTF-8 will corrupt binaries.

### Auth state, cookies, storage

- **Cookies** — `browserContext.cookies()` exports all cookies including HttpOnly. Re-importable with `addCookies()`.
- **localStorage / sessionStorage** — accessible via `page.evaluate(() => ({...localStorage}))`. Only same-origin; per-frame.
- **IndexedDB** — much harder; no built-in dump. Use `idb-keyval`-style traversal in-page, but schemas are app-specific. For most cloning purposes, snapshotting IDB is unnecessary because the offline clone has no JS that reads it. If targeting full app re-execution, this becomes a hard problem.
- **Service Worker registrations** — exposed via CDP `ServiceWorker` domain. Can be enumerated and the SW script captured, but re-installing it locally is awkward (scope and origin restrictions).

For authenticated cloning, the cleanest UX is:
1. User pastes an exported `cookies.json` (Chrome dev tools or extension export).
2. Optionally a Bearer token / `Authorization` header value.
3. System loads cookies into the context before navigation.

This avoids storing the user's password and avoids interactive 2FA flows.

---

## 3. Asset Extraction & Localization

### External resource strategies

- **CDN-hosted JS/CSS**: download as observed by the network layer. Identity is `(url → bytes)`; deduplicate on URL.
- **`@import` chains in CSS**: parse with `postcss` (or a regex fallback). Each `@import` produces a network request that the network layer already saw, so usually no extra fetch needed — just rewrite the URL.
- **Google Fonts / Font Awesome**: the loader CSS references font files via cross-origin `url(...)`. The network layer captures both the loader CSS and the font binaries; we just rewrite both.
- **Dynamically constructed URLs in JS** (`fetch('https://api.example.com/' + id)`): impossible to statically rewrite. We **leave the original URL in the JS** and rely on the response cache only when the page is replayed via a "replay" mode (out of scope for V1; documented).

### URL rewriting

In HTML, rewrite:
- `<a href>`, `<link href>`, `<script src>`, `<img src>`, `<source src>`, `<source srcset>`, `<img srcset>`
- `<video src>`, `<audio src>`, `<track src>`, `<iframe src>`
- `<object data>`, `<embed src>`
- `<meta http-equiv="refresh" content="0;url=...">`
- Inline `style="background-image: url(...)"`
- `<base href>` — strip to avoid breaking relative paths

In CSS, rewrite:
- `url(...)` (quoted and unquoted)
- `@import` (string and url() forms)
- `image-set()` and `-webkit-image-set()`

In JS, **don't rewrite by default**. Static rewriting of arbitrary JS is not safe. Optional best-effort: replace literal absolute URLs that match the captured set, but this breaks string-built URLs.

### CSS-in-JS (styled-components, emotion)

These libraries inject `<style>` elements at runtime. After hydration:
- The injected styles are part of the live `document.styleSheets` collection
- They are **not** in any external file
- `page.content()` includes them as inline `<style>` blocks
- ✅ Captured automatically once the page is rendered

Adopted (constructable) stylesheets via `document.adoptedStyleSheets` are a different beast: they are not serialized by `outerHTML`. Capture them separately:

```js
const adopted = await page.evaluate(() => {
  return [
    ...(document.adoptedStyleSheets || []),
    ...[...document.querySelectorAll('*')].flatMap(el =>
      el.shadowRoot ? [...(el.shadowRoot.adoptedStyleSheets || [])] : [])
  ].map(sheet => [...sheet.cssRules].map(r => r.cssText).join('\n'))
});
```

Then inject as a `<style>` block in the cloned HTML.

### Shadow DOM, iframes, Web Components

**Shadow DOM** (open mode): traverse recursively, replace each shadow host's empty content with `<template shadowrootmode="open">...shadow contents...</template>`. The Declarative Shadow DOM proposal (now shipping in Chrome/Safari/Firefox) makes this rehydratable offline natively.

Closed shadow roots are **not** accessible via standard JS; the only way is CDP `DOM.describeNode` with `pierce: true` plus `DOM.getOuterHTML`. This works because CDP runs at the protocol level below the closed-mode JS guard.

**Iframes**:
- Same-origin: `page.frames()` exposes them; recursively serialize their DOM and inline as `srcdoc`.
- Cross-origin: cannot read content from outside (browser security). Options:
  1. Re-crawl the iframe URL as a separate top-level navigation (often works since most embeds tolerate it).
  2. Leave as-is with original URL (works only when online).
  3. Replace with a screenshot placeholder (worst fidelity, most reliable).

**Web Components**: their custom-element class is JS that registers via `customElements.define`. The class is captured as part of the JS bundle, so the component re-registers when the cloned page loads its scripts. The shadow DOM contents are captured per the strategy above. Result: **works offline if the registering JS works offline**.

### Base64 vs. external files

Trade-off:
- **Inline (base64 data URIs)** — single-file output, no path issues, but ~33% size bloat and CSS parsers slow to a crawl on huge stylesheets.
- **External files** — better caching, smaller HTML, but requires a directory layout that survives the user's filesystem.

This system defaults to **external files for assets > 2 KB, inline for smaller assets** (favicon-sized stuff). Toggleable.

---

## 4. Dynamic & Modern Web Features

### Service Workers

- Capture the SW script via the network layer (it loads on `register()`).
- Capture the **manifest of cached responses** by replaying the SW logic offline — **not feasible in general**, because SWs run arbitrary code (`fetch` event handlers).
- Pragmatic compromise: capture every response the SW is observed serving during the live session; rewrite URLs to point at those cached files. Drop the SW from the offline clone (don't re-register) so the page reads directly from disk.
- Re-registering the SW only makes sense if you're building a true "replay server" rather than static files.

### Web Workers / SharedWorkers

- Their scripts are loaded via `new Worker(url)` and show up in the network log as `type: 'Script'` with initiator `'script'`.
- Capture as ordinary JS files. Rewrite the `new Worker()` URL — but this **requires JS rewriting**, which we said we don't do safely. So in practice, workers may break offline if their URL is dynamically built. Static URLs work.

### WebAssembly

- `.wasm` modules show up as `application/wasm` in the network log. Capture as binary.
- Loaded via `WebAssembly.instantiateStreaming(fetch(url))`. Same JS-URL caveat as workers.
- WASM modules can have follow-on imports (other `.wasm` or JS glue). The network log captures them as their loader requests them. WASM modules with side-channel I/O (network from Rust via `wasm-bindgen`) won't function offline; that's the runtime, not the binary.

### Canvas & SVG

- **Canvas-rendered content**: ephemeral pixels on a `<canvas>` element. The element captures empty in the cloned HTML. Options:
  1. Snapshot via `canvas.toDataURL('image/png')` after render and inject as a sibling `<img>` (kills interactivity).
  2. Capture the JS that draws it; works offline if data is local.
- **SVG animations**: SMIL animates inline; CSS animates via stylesheets; JS animates via `requestAnimationFrame`. All clone correctly because the SVG nodes are in the DOM and the JS/CSS is captured.

### Video/audio & MSE

- Static `<video src="file.mp4">` — captured trivially.
- HLS (`.m3u8` + `.ts` segments) — playlist is text; segments are binary; both captured by network layer. **But**: typical HLS players (hls.js, video.js) construct segment URLs dynamically based on bandwidth ABR. Without rewriting JS, the player will request segments from the original URL when offline. Workaround: serve from a local HTTP server that maps captured paths, or rewrite the playlist to relative paths and hope the player tolerates it.
- DASH (`.mpd` + segments) — same story.
- DRM (Widevine/PlayReady) — **uncapturable in usable form**. Encrypted segments + license server gating.

---

## 5. Edge Cases & 100% Fidelity

### Interaction-dependent rendering

- **Hover states**: usually pure CSS (`:hover`). Captured automatically.
- **Click-revealed content**: not captured unless triggered. Two strategies:
  1. **Selector-driven**: user supplies CSS selectors to click before capture.
  2. **Heuristic auto-explore**: walk the DOM, click every visible `<button>` that doesn't have `type="submit"` or a form ancestor; click every `<a>` whose `href === "#"` or starts with `javascript:`. Risk: may submit forms, send analytics events, navigate away.
- **Modals / dropdowns / tooltips**: usually toggled by class. Capturing all states would require triggering each. Document as a known limit.

### Scroll-triggered animations

`IntersectionObserver` callbacks fire when the target enters viewport. A scroll-to-bottom loop pre-fires them all. Some libraries register observers after first paint; do scroll **after** networkidle, then a second networkidle wait.

### Third-party widgets

- **Chat widgets** (Intercom, Drift, Zendesk) — load asynchronously via boot script + iframe. The iframe is cross-origin; widget state is server-bound. Capturing the boot script gives an empty widget shell offline.
- **Analytics** (GA, Mixpanel, Segment) — fire-and-forget POSTs. Captured but useless offline; also: leaving them in means the cloned page sends analytics on the user's machine, which is **bad behavior**. Strip or sandbox known analytics domains.
- **Payment embeds** (Stripe Elements, Braintree iframes) — cross-origin, security-critical. Don't clone. Replace with a placeholder. Cloning a payment form and serving it under your domain is a fraud/phishing red flag.

### CORS & cross-origin

CORS is a runtime browser policy, not a fetch barrier from CDP. We capture cross-origin assets fine. The issue is offline replay: a cloned page loading from `file://` or a different origin may have CORS errors when its JS tries to `fetch()` cross-origin URLs that no longer respond. This breaks JS that calls live APIs — there is no fix without a replay proxy.

### Content Security Policy (CSP)

CSP headers like `script-src 'self' https://cdn.example.com` block inline scripts and `eval`. When serving the clone:
- If we strip the CSP `<meta>`, things just work.
- If the CSP is in HTTP headers (not meta), it disappears when serving from local FS. ✅ Easier.
- If we inject styles/scripts that the original CSP would block, we need to either remove or relax the policy. Default: **strip CSP `<meta>` tags** in the cloned HTML.

---

## 6. Legal & Ethical Boundaries

This is where engineering meets responsibility. Brief but real:

- **robots.txt**: not legally binding in most jurisdictions, but ignoring it is a strong norm violation and can be evidence of bad faith. The system should fetch and **respect** robots.txt by default, with an opt-out for the user's own sites.
- **Terms of Service**: many sites prohibit automated access or copying. ToS violations are typically civil, not criminal — but in the US, **hiQ v. LinkedIn** (9th Cir. 2022) clarified that scraping public data is generally not a CFAA violation; **Meta v. Bright Data** (2024) reinforced this for public scraping. Authenticated scraping is much riskier.
- **Copyright**: HTML/CSS/JS structure is generally not copyrightable, but content (text, images, video) usually is. A clone made for personal archiving / development reference / interoperability research is fair-use-friendly in the US; redistribution is not.
- **Trademark / passing off**: hosting a clone under a different domain that could deceive users is **legally distinct** from copyright and is often where lawsuits actually land.
- **GDPR / CCPA**: cloning a site that contains personal data (user profiles, comments) means you're now a controller of that data. Don't.
- **Rate limiting**: respect `Crawl-Delay` if set; otherwise default to ≥1 request per second per host with exponential backoff on 429/503. The system uses Playwright's natural pacing, which is already polite (a single tab loading a single page).

**This system's stance**:
1. Display a checkbox: "I have the right to clone this URL." Default unchecked.
2. Fetch and surface the target's robots.txt so users see the site's stated stance.
3. Do not attempt to defeat captchas, WAFs, or bot management products.
4. Do not provide a feature for crawling at high concurrency against external sites.
5. Strip known analytics endpoints from cloned output (privacy-positive default).

---

## Summary of Design Decisions Going Into Implementation

| Question | Decision |
|---|---|
| Browser engine | Playwright + Chromium with raw CDP session |
| Network capture | CDP `Network` domain events, `getResponseBody` per request |
| HTML capture | `page.content()` + shadow-DOM walk + adopted stylesheet dump |
| Iframes | Same-origin inlined as `srcdoc`; cross-origin left as URL |
| URL rewriting | HTML attrs + CSS `url()`/`@import` rewritten; JS left untouched |
| Asset layout | Flattened directory, `<8-char-hash>-<basename>.<ext>` |
| Lazy content | Auto scroll-to-bottom + networkidle wait |
| Interactions | Off by default; opt-in selector list |
| Auth | Cookie import only; no password handling |
| Service workers | Captured but not re-registered |
| CSP | `<meta>` CSP stripped from cloned HTML |
| Analytics | Known domains stripped from output |
| robots.txt | Fetched and surfaced to user; not automatically enforced |
| Output | ZIP with `index.html`, `assets/`, `manifest.json`, `network.har` |

That's the basis for what's built next.
