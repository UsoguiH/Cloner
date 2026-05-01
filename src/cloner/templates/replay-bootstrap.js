// clone-saas SW bootstrap — runs as the FIRST thing in <head>. Registers
// the service worker; on first visit reloads once so the SW is in control
// before the page tries to fetch its dependencies.
(function () {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol === 'file:') return;
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
