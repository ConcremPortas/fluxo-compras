/* ============================================================
   FluxoCompras — Service Worker
   Estratégia: network-first para JS/HTML, cache-first para imagens/CSS
============================================================ */

const CACHE_NAME = 'fluxocompras-v5';

// Apenas imagens e fontes locais ficam em cache (raramente mudam)
const ASSETS_ESTATICOS = [
  '/Logos/logo-cores.png',
  '/Logos/concrem-logo.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_ESTATICOS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Recursos externos (CDNs, fontes, Supabase): deixar passar sem interceptar
  if (url.hostname !== self.location.hostname) return;

  // Apenas GET
  if (event.request.method !== 'GET') return;

  const pathname = url.pathname;

  // JS e HTML: sempre buscar da rede (network-first), sem cache
  if (pathname.endsWith('.js') || pathname.endsWith('.html') || pathname === '/') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Imagens: cache-first (raramente mudam)
  if (pathname.endsWith('.png') || pathname.endsWith('.jpg') || pathname.endsWith('.ico')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // CSS: network-first com fallback ao cache
  if (pathname.endsWith('.css')) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Demais requisições: network com fallback ao index.html (SPA routing)
  event.respondWith(
    fetch(event.request).catch(() => caches.match('/index.html'))
  );
});
