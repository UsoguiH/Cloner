// clone-saas SW bootstrap — runs as the FIRST thing in <head>. Registers
// the service worker; on first visit reloads once so the SW is in control
// before the page tries to fetch its dependencies.
(function () {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol === 'file:') return;
  if (navigator.serviceWorker.controller) return; // already controlled, no reload needed
  try {
    navigator.serviceWorker.register('/sw.js').then(function (reg) {
      function takeOver() { location.replace(location.href); }
      if (reg.active && navigator.serviceWorker.controller) takeOver();
      else navigator.serviceWorker.addEventListener('controllerchange', takeOver);
    }).catch(function () {});
  } catch (_) {}
})();
