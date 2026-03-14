// ============================================================
// SERVICE WORKER — Iqra Qur'an Reader
//
// Caching strategy:
//
//   App Shell (Cache First):
//     HTML, CSS, JS, fonts, icons — cached on install,
//     served instantly from cache, updated in background.
//
//   Quran Text API (Network First → Cache Fallback):
//     api.quran.com + api.alquran.cloud — try network first
//     for fresh data, fall back to cache if offline.
//     Cached indefinitely (Quran text never changes).
//
//   Audio (Cache First with Network Fallback):
//     everyayah.com MP3s — cache on first play,
//     served from cache on repeat. Never blocks playback.
//
//   Everything else: Network only.
// ============================================================

const APP_VERSION   = 'iqra-v1.0';
const SHELL_CACHE   = APP_VERSION + '-shell';
const API_CACHE     = APP_VERSION + '-api';
const AUDIO_CACHE   = APP_VERSION + '-audio';

// App shell files — cached on install
const SHELL_FILES = [
  './',
  './index.html',
  './css/design-system.css',
  './css/components.css',
  './app.js',
  './js/data/surahs.js',
  './js/services/store.js',
  './js/services/quran-api.js',
  './js/core/theme.js',
  './js/core/i18n.js',
  './js/core/settings.js',
  './js/pages/overview.js',
  './js/pages/reader.js',
  './js/pages/tour.js',
  './fonts/KFGQPCUthmanicScriptHAFS.woff2',
  './icons/logo-iqra.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png',
  './icons/favicon-32.png',
];

// ── Install — pre-cache app shell ─────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())  // Activate immediately
  );
});

// ── Activate — clean up old caches ────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('iqra-') && ![SHELL_CACHE, API_CACHE, AUDIO_CACHE].includes(key))
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())  // Take control immediately
  );
});

// ── Fetch — route by resource type ────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Audio files — Cache First, network fallback, cache on miss
  if (url.hostname === 'everyayah.com') {
    event.respondWith(cacheFirst(request, AUDIO_CACHE));
    return;
  }

  // Quran API calls — Network First, cache fallback
  if (url.hostname === 'api.quran.com' || url.hostname === 'api.alquran.cloud') {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Google Fonts — Cache First
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // App shell — Cache First
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // Everything else — network only
  event.respondWith(fetch(request));
});

// ── Strategy: Cache First ──────────────────────────────────
// Serve from cache immediately. If not cached, fetch and cache.
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline and not cached — return a graceful offline response
    return offlineFallback(request);
  }
}

// ── Strategy: Network First ────────────────────────────────
// Try network. On success, update cache. On failure, use cache.
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return offlineFallback(request);
  }
}

// ── Offline fallback ───────────────────────────────────────
function offlineFallback(request) {
  const url = new URL(request.url);

  // For API calls — return a structured error response
  if (url.hostname.includes('quran') || url.hostname.includes('alquran')) {
    return new Response(
      JSON.stringify({ error: 'offline', message: 'No internet connection. Please try again when online.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // For navigation — return cached index.html
  if (request.mode === 'navigate') {
    return caches.match('./index.html');
  }

  return new Response('Offline', { status: 503 });
}

// ── Handle skip waiting message from app ──────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
