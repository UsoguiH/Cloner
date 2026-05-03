// File:// runtime shim for cloned source trees.
//
// When a Next.js page is opened from file://, three things break:
//   1. TrustedTypes policies block setting `script.src` to anything that's
//      not been wrapped in a trusted policy. Webpack's chunk loader does
//      `r.src = c.tu(d)` and the resulting URL is a TrustedScriptURL object,
//      which webpack then can't see as a string.
//   2. Absolute paths like /_next/static/chunks/6827.js point at the
//      filesystem root, not the bundle folder, so they 404.
//   3. fetch() to an absolute URL that no longer exists fails the same way.
//
// This shim is injected as the very first script in <head> and:
//   - removes the TrustedTypes meta (browsers ignore it after this point)
//   - intercepts script.src setters to remap absolute paths to ./relative
//   - intercepts fetch() / XMLHttpRequest to do the same remap
//
// The remap is based on a manifest the cloner injects as window.__CLONE_MAP__:
//   { "/_next/static/chunks/6827.<hash>.js": "_next/static/chunks/6827.<hash>.js",
//     "https://skiper-ui.com/_next/static/chunks/6827.<hash>.js": "_next/static/chunks/6827.<hash>.js",
//     ... }
(function () {
  if (location.protocol !== 'file:') return; // server mode handles this natively
  var MAP = (window.__CLONE_MAP__ = window.__CLONE_MAP__ || {});

  // Compute the bundle's base file:// URL once. Everything we resolve will
  // be expressed relative to this so the SPA's path-based asset references
  // land on the right files.
  var BASE = (function () {
    var h = location.href.split('#')[0].split('?')[0];
    var slash = h.lastIndexOf('/');
    return slash >= 0 ? h.slice(0, slash + 1) : h;
  })();

  function strip(u) {
    return u.replace(/[?#].*$/, '');
  }

  function remap(u) {
    if (u == null) return u;
    var s = (typeof u === 'string') ? u : String(u);
    var clean = strip(s);
    // Direct hit (full URL or absolute path)
    if (MAP[clean]) return BASE + MAP[clean];
    if (MAP[s]) return BASE + MAP[s];
    // Try by pathname only (absolute URL → /pathname)
    try {
      var parsed = new URL(s, BASE);
      var pn = parsed.pathname;
      if (MAP[pn]) return BASE + MAP[pn];
      // Last resort: basename match
      var base = pn.split('/').filter(Boolean).pop();
      if (base && MAP['__base__:' + base]) return BASE + MAP['__base__:' + base];
    } catch (_) {}
    return u;
  }

  // 1. Patch HTMLScriptElement.prototype.src setter.
  try {
    var d = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
    if (d && d.set) {
      Object.defineProperty(HTMLScriptElement.prototype, 'src', {
        configurable: true,
        enumerable: true,
        get: function () { return d.get.call(this); },
        set: function (v) { return d.set.call(this, remap(v)); },
      });
    }
  } catch (_) {}

  // 2. Patch setAttribute for src/href on script/link/img.
  try {
    var origSetAttr = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name, value) {
      if (name === 'src' || name === 'href') {
        return origSetAttr.call(this, name, remap(value));
      }
      return origSetAttr.call(this, name, value);
    };
  } catch (_) {}

  // 3. Patch fetch().
  try {
    var origFetch = window.fetch ? window.fetch.bind(window) : null;
    if (origFetch) {
      window.fetch = function (input, init) {
        if (typeof input === 'string') return origFetch(remap(input), init);
        if (input && typeof input.url === 'string') {
          var mapped = remap(input.url);
          if (mapped !== input.url) {
            return origFetch(new Request(mapped, input), init);
          }
        }
        return origFetch(input, init);
      };
    }
  } catch (_) {}

  // 4. Patch XMLHttpRequest.open.
  try {
    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      arguments[1] = remap(url);
      return origOpen.apply(this, arguments);
    };
  } catch (_) {}

  // 5. Strip CSP / TrustedTypes meta tags so dynamic chunk loading works.
  function dropPolicyMetas() {
    var metas = document.querySelectorAll(
      'meta[http-equiv="Content-Security-Policy" i], meta[http-equiv="X-Content-Security-Policy" i]'
    );
    metas.forEach(function (m) { m.parentNode && m.parentNode.removeChild(m); });
  }
  if (document.head) dropPolicyMetas();
  document.addEventListener('readystatechange', dropPolicyMetas);
})();
