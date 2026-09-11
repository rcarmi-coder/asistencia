const CACHE_NAME = 'asistencia-cache-v6';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css?v=2.5',
  './app.js?v=2.5',
  './manifest.json',
  './icons/tarucas-logo.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

// Instalación: Forzar que el nuevo Service Worker tome el control inmediatamente
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activación: Eliminar TODAS las versiones anteriores de caché
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Borrando caché antigua:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-First para archivos de la app (para ver cambios al instante) con fallback a caché
self.addEventListener('fetch', (event) => {
  // Ignorar llamadas a la API de Google Sheets
  if (event.request.url.includes('script.google.com') || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Si no hay internet, responder desde la caché
        return caches.match(event.request);
      })
  );
});
