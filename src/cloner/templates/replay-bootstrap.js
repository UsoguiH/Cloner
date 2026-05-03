// clone-saas SW bootstrap — runs as the FIRST thing in <head>. Registers
// the service worker; on first visit reloads once so the SW is in control
// before the page tries to fetch its dependencies.
(function () {
  // file:// can't host a service worker, so the replay layer is dead. Tell
  // the user how to actually open the bundle instead of leaving them with a
  // blank page or broken styles.
  if (location.protocol === 'file:') {
    var show = function () {
      if (document.getElementById('clone-saas-file-banner')) return;
      var bar = document.createElement('div');
      bar.id = 'clone-saas-file-banner';
      bar.style.cssText =
        'position:fixed;top:0;left:0;right:0;z-index:2147483647;' +
        'padding:14px 20px;background:#1a1a1a;color:#fff;' +
        'font:14px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;' +
        'border-bottom:2px solid #ff5722;text-align:center;';
      bar.innerHTML =
        '<strong>You opened the wrong file.</strong> Open <b>OPEN_ME.html</b> in this folder ' +
        '— it renders the page directly, no server needed.<br>' +
        '<span style="opacity:.7;font-size:12px">For the fully interactive version with JS animations, ' +
        'run <code style="background:#333;padding:2px 6px;border-radius:3px">start.bat</code> ' +
        '(Windows) or <code style="background:#333;padding:2px 6px;border-radius:3px">start.sh</code> ' +
        '(macOS/Linux) and open the localhost URL it prints.</span>';
      (document.body || document.documentElement).appendChild(bar);
    };
    if (document.body) show();
    else document.addEventListener('DOMContentLoaded', show);
    return;
  }
  if (!('serviceWorker' in navigator)) return;
  if (navigator.serviceWorker.controller) return; // already controlled, no reload needed

  // Cap reload attempts so a missing/broken SW can't trap the page in a loop.
  var KEY = 'clone-saas-boot-tries';
  var tries = 0;
  try { tries = parseInt(sessionStorage.getItem(KEY) || '0', 10) || 0; } catch (_) {}
  if (tries >= 2) return;

  function takeOver() {
    try { sessionStorage.setItem(KEY, String(tries + 1)); } catch (_) {}
    location.replace(location.href);
  }

  try {
    navigator.serviceWorker.register('/sw.js').then(function (reg) {
      if (reg.active && navigator.serviceWorker.controller) takeOver();
      else navigator.serviceWorker.addEventListener('controllerchange', takeOver);
      // Hard fallback: if controller never appears, give up after 3s.
      setTimeout(function () {
        if (!navigator.serviceWorker.controller) takeOver();
      }, 3000);
    }).catch(function () {});
  } catch (_) {}
})();
