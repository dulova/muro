// GitHub Pages version: paths are scoped to this app, not the domain root.
const CACHE = 'muroblocks-shell-v1-pages-2';
const FILES = [
  './', './index.html', './styles.css', './game.js',
  './manifest.webmanifest', './assets/icon-192.png', './assets/icon-512.png',
];
const APP_ROOT = new URL('./', self.location.href);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('muroblocks-shell-') && key !== CACHE)
        .map(key => caches.delete(key))
  )));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(APP_ROOT.pathname)) return;
  event.respondWith(
    fetch(req).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy));
      }
      return res;
    }).catch(async () => {
      const cached = await caches.match(req);
      return cached || (req.mode === 'navigate'
        ? (await caches.match(new URL('index.html', APP_ROOT))) || Response.error()
        : Response.error());
    })
  );
});
