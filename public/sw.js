// Service Worker v3 — Suministros SOS 🇻🇪
// Versionado dinámico: cambia BUILD_ID tras cada despliegue para invalidar cache.
const BUILD_ID = '20260627-v3';
const CACHE_NAME = `suministros-sos-${BUILD_ID}`;
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// 1. INSTALACIÓN: Cachear recursos y forzar activación inmediata
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cacheando activos estáticos —', BUILD_ID);
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. ACTIVACIÓN: Limpiar cachés antiguas y tomar control de todos los clientes
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Limpiando caché antigua:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. ESCUCHAR MENSAJE DE SKIP-WAITING desde el cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 4. INTERCEPTACIÓN DE PETICIONES (FETCH)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Excluir WebSockets y métodos no-GET
  if (request.url.includes('realtime') || request.method !== 'GET') return;

  // Ignorar peticiones de desarrollo de Next.js
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.includes('webpack-hmr') ||
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.port === '3000'
  ) return;

  // Estrategia A: Supabase API → Network-First con fallback cache
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          console.log('[SW] Offline — sirviendo Supabase desde caché');
          return caches.match(request);
        })
    );
    return;
  }

  // Estrategia B: Activos estáticos → Cache-First con actualización en background
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(request);
    })
  );
});
