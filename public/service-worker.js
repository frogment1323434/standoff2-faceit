// ============================================================
// SERVICE WORKER — офлайн-кэш + ускорение загрузки
// ============================================================

const CACHE_NAME = 'so2-faceit-v1';
const RUNTIME_CACHE = 'so2-runtime-v1';

// Файлы для предварительного кэширования
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/css/hud.css',
  '/css/modal.css',
  '/css/responsive.css',
  '/css/voting.css',
  '/css/map-room.css',
  '/css/screenshot.css',
  '/css/matchmaking.css',
  '/css/auth-modal.css',
  '/css/profile-auth.css',
  '/js/api.js',
  '/js/config.js',
  '/js/ranks.js',
  '/js/elo.js',
  '/js/storage.js',
  '/js/notifications.js',
  '/js/auth.js',
  '/js/auth-modal.js',
  '/js/matchmaking.js',
  '/js/voting.js',
  '/js/map-room.js',
  '/js/screenshot.js',
  '/js/lobby.js',
  '/js/leaderboard.js',
  '/js/profile.js',
  '/js/online.js',
  '/js/app.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// ============================================================
// УСТАНОВКА — кэшируем статику
// ============================================================
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker: установка');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Кэшируем файлы...');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('⚠️ Ошибка кэширования:', err.message);
      })
  );
});

// ============================================================
// АКТИВАЦИЯ — чистим старые кэши
// ============================================================
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker: активация');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
            .map((name) => {
              console.log('🗑 Удаляем старый кэш:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// ============================================================
// FETCH — стратегия кэширования
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API-запросы — НЕ кэшируем (всегда свежие)
  if (url.pathname.startsWith('/api/')) {
    return event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Нет подключения к интернету' }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
  }

  // Только GET-запросы кэшируем
  if (request.method !== 'GET') return;

  // Стратегия: сначала сеть, потом кэш (для HTML)
  if (request.headers.get('accept')?.includes('text/html')) {
    return event.respondWith(
      fetch(request)
        .then((response) => {
          // Кэшируем свежую версию
          const cloned = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, cloned);
          });
          return response;
        })
        .catch(() => {
          // Нет сети — отдаём из кэша
          return caches.match(request).then((cached) => {
            return cached || caches.match('/index.html');
          });
        })
    );
  }

  // Для остальных: сначала кэш, потом сеть
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        // Не кэшируем ошибки
        if (!response || response.status !== 200) return response;

        const cloned = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, cloned);
        });

        return response;
      });
    })
  );
});

// ============================================================
// СООБЩЕНИЯ ОТ КЛИЕНТА
// ============================================================
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});