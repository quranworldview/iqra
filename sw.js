// ============================================================
// SERVICE WORKER — Iqra Qur'an Reader
//
// All paths are relative to the SW file's location.
// This makes the app work whether hosted at root (domain.com/)
// or in a subfolder (domain.com/iqra/) — no 404s.
//
// Caching strategies:
//   App Shell   → Cache First (instant load, offline safe)
//   Quran API   → Network First → Cache (fresh when online,
//                 works offline once a surah has been loaded)
//   Audio MP3s  → Cache First (replay without re-downloading)
// ============================================================

const APP_VERSION = 'iqra-v1.0';
const SHELL_CACHE = APP_VERSION + '-shell';
const API_CACHE   = APP_VERSION + '-api';
const AUDIO_CACHE = APP_VERSION + '-audio';

// Relative paths — work at any hosting subfolder depth
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
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

// ── Install ────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

// ── Activate — delete old caches ──────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k.startsWith('iqra-') && ![SHELL_CACHE, API_CACHE, AUDIO_CACHE].includes(k))
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch — route by origin/hostname ──────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Audio files — cache first so replays are instant and offline
  if (url.hostname === 'everyayah.com') {
    event.respondWith(cacheFirst(request, AUDIO_CACHE));
    return;
  }

  // Quran API — network first so text is always fresh when online
  if (url.hostname === 'api.quran.com' || url.hostname === 'api.alquran.cloud') {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Google Fonts — cache first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // App shell (same origin) — cache first
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // Everything else — straight to network
  event.respondWith(fetch(request));
});

// ── Cache First ────────────────────────────────────────────
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
    return offlineFallback(request);
  }
}

// ── Network First ──────────────────────────────────────────
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
    return cached || offlineFallback(request);
  }
}

// ── Offline fallback ───────────────────────────────────────
function offlineFallback(request) {
  const url = new URL(request.url);
  if (url.hostname.includes('quran') || url.hostname.includes('alquran')) {
    return new Response(
      JSON.stringify({ error: 'offline' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
  if (request.mode === 'navigate') {
    return caches.match('./index.html');
  }
  return new Response('Offline', { status: 503 });
}

// ── Skip waiting — activate new SW immediately ─────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
