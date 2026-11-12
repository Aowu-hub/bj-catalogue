// BJ Catalogue app shell — service worker.
// Keeps the shell (page, icons, manifest) on the phone so the app opens and can show the offline card
// without internet. It never touches the catalogue itself (script.google.com): that always comes live.
// Change APP_VERSION on every publish (vYYYY.MM.DD-HHMM, never reused) so phones pick up the new shell.
const APP_VERSION = 'v2026.11.13-0700';
const CACHE = 'bj-shell-' + APP_VERSION;
const SHELL = ['./', 'index.html', 'manifest.webmanifest',
  'icons/icon-32.png', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
  'icons/maskable-192.png', 'icons/maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('bj-shell-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return; // live catalogue: untouched
  if (req.mode === 'navigate') {
    // Page: network first (gets updates), cached copy when offline.
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)); return res;
    }).catch(() => caches.match('index.html')));
    return;
  }
  // Icons / manifest: cache first.
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req)));
});
