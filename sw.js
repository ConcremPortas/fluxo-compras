/* ============================================================
   FluxoCompras — Service Worker
   Cache de assets estáticos para uso offline parcial
============================================================ */

const CACHE_NAME    = 'fluxocompras-v1';
const CACHE_OFFLINE = 'fluxocompras-offline-v1';

const ASSETS_SHELL = [
  '/',
  '/index.html',
  '/css/variables.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/pages.css',
  '/js/app.js',
  '/js/storage.js',
  '/js/utils.js',
  '/js/components.js',
  '/js/utils/permissoes.js',
  '/js/utils/fluxoAprovacao.js',
  '/js/utils/notificacoes.js',
  '/js/utils/pdfPrint.js',
  '/js/utils/datepicker.js',
  '/js/utils/logoBase64.js',
  '/Logos/logo-cores.png',
  '/Logos/concrem-logo.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== CACHE_OFFLINE)
            .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (url.hostname.includes('supabase')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok && (
            url.pathname.endsWith('.css') ||
            url.pathname.endsWith('.js')  ||
            url.pathname.endsWith('.png') ||
            url.pathname.endsWith('.jpg')
          )) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return response;
        }).catch(() => caches.match('/index.html'));
      })
    );
  }
});
