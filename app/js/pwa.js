// ── PWA: service worker, durable storage, install prompt ──────────────────────
window._deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window._deferredInstall = e;
  if (state.route && state.route.startsWith('#/more')) render();
});
async function installApp() {
  const p = window._deferredInstall;
  if (!p) { showToast('Use your browser menu → Add to Home Screen'); return; }
  p.prompt();
  await p.userChoice;
  window._deferredInstall = null;
  render();
}
async function requestPersistentStorage() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const already = await navigator.storage.persisted();
      if (!already) await navigator.storage.persist();
    }
  } catch (e) { /* non-fatal */ }
}
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      // Reload once a new service worker takes over, so a stale cached
      // app shell never sits open indefinitely — otherwise skipWaiting()
      // in sw.js claims the page without refreshing what's on screen.
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloaded) return;
        reloaded = true;
        location.reload();
      });
      // Browsers only re-check sw.js for updates on navigation (and at
      // most every 24h). Check explicitly whenever the app is foregrounded
      // so a new deploy is picked up the same day, not a day later.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    }).catch((e) => console.log('SW register failed:', e.message));
  });
}

boot().then(requestPersistentStorage);
