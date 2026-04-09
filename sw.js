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

const APP_VERSION = 'iqra-v8.0';
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
  './js/data/juz.js',
  './js/data/sajdah.js',
  './js/data/reciters.js',
  './js/services/store.js',
  './js/services/progress.js',
  './js/services/quran-api.js',
  './js/services/offline.js',
  './js/services/notifications.js',
  './js/services/notif-cards.js',
  './js/services/webpush.js',
  './js/core/firebase.js',
  './js/core/auth.js',
  './js/core/theme.js',
  './js/core/i18n.js',
  './js/core/settings.js',
  './js/pages/overview.js',
  './js/pages/reader.js',
  './js/pages/bookmarks.js',
  './js/pages/profile.js',
  './js/pages/tour.js',
  './fonts/KFGQPCUthmanicScriptHAFS.woff2',
  './fonts/IndoPakNastaleeq.woff2',
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

// ── Activate — delete old caches, then check pending notifs ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k.startsWith('iqra-') && ![SHELL_CACHE, API_CACHE, AUDIO_CACHE].includes(k))
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .then(() => _checkAndReschedule())
  );
});

// ── Fetch — route by origin/hostname ──────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // On every fetch, opportunistically check for overdue notifs.
  // Throttled to once per minute so it has zero performance impact.
  _maybeFetchCheck();

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

  // Prayer times API — always network, no caching
  if (url.hostname === 'api.aladhan.com') {
    event.respondWith(fetch(request));
    return;
  }

  // Firebase / Firestore / GCP — never intercept, always network
  if (url.hostname === 'www.gstatic.com'
      || url.hostname.endsWith('.firebaseapp.com')
      || url.hostname.endsWith('.firebaseio.com')
      || url.hostname === 'firestore.googleapis.com'
      || url.hostname.endsWith('.googleapis.com')) {
    event.respondWith(fetch(request));
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

// ============================================================
// NOTIFICATIONS — Service Worker side
//
// ARCHITECTURE: IndexedDB-backed persistent scheduling.
//
// The old approach used in-memory setTimeout only. When the
// browser kills the SW (which happens ~30s after the app
// closes), all timers were wiped. Notifications never fired.
//
// The new approach:
//   1. Client sends SCHEDULE_NOTIFICATION with absolute
//      fireAt timestamp (epoch ms) — not a relative delay.
//   2. SW writes the full notification record to IndexedDB.
//      IndexedDB survives SW restarts.
//   3. SW sets ONE setTimeout for the soonest pending notif.
//   4. When the SW wakes for ANY reason (fetch, push, activate,
//      or setTimeout fires), _checkAndReschedule() runs:
//        - fires any overdue notifications immediately
//        - sets a new setTimeout for the next pending one
//   5. Result: even if the SW restarts 100 times, the moment
//      it wakes up it checks "am I late?" and catches up.
//      Users who open Iqra daily will never miss a notif.
// ============================================================

const IDB_NAME    = 'iqra-notif-store';
const IDB_VERSION = 1;
const IDB_STORE   = 'scheduled';

// In-memory handle to the soonest pending setTimeout.
// Only one timer at a time — always points at the next notif.
let _nextTimer = null;

// ── IndexedDB helpers ──────────────────────────────────────

function _openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        // notifType is the key: 'aotd' | 'kahf' | 'mulk' | 'test'
        db.createObjectStore(IDB_STORE, { keyPath: 'notifType' });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

async function _idbPut(record) {
  const db = await _openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(IDB_STORE, 'readwrite');
    const st  = tx.objectStore(IDB_STORE);
    const req = st.put(record);
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
    tx.oncomplete = () => resolve();
  });
}

async function _idbDelete(notifType) {
  const db = await _openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(IDB_STORE, 'readwrite');
    const st  = tx.objectStore(IDB_STORE);
    const req = st.delete(notifType);
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
    tx.oncomplete = () => resolve();
  });
}

async function _idbGetAll() {
  const db = await _openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(IDB_STORE, 'readonly');
    const st  = tx.objectStore(IDB_STORE);
    const req = st.getAll();
    req.onsuccess = e => resolve(e.target.result || []);
    req.onerror   = e => reject(e.target.error);
  });
}

// ── Core: check IDB and fire/reschedule ───────────────────
//
// Called on: activate, every fetch (throttled to 1/min),
// every SCHEDULE/CANCEL message, and when setTimeout fires.
//
async function _checkAndReschedule() {
  try {
    const now     = Date.now();
    const pending = await _idbGetAll();

    if (pending.length === 0) return;

    // Separate overdue from future
    const overdue = pending.filter(r => r.fireAt <= now);
    const future  = pending.filter(r => r.fireAt >  now);

    // Fire all overdue notifications
    for (const record of overdue) {
      await _fireNotification(record);
      await _idbDelete(record.notifType);
    }

    // Set ONE setTimeout for the soonest future notification.
    // Clear any existing timer first.
    if (_nextTimer) {
      clearTimeout(_nextTimer);
      _nextTimer = null;
    }

    if (future.length > 0) {
      // Sort ascending — pick the soonest
      future.sort((a, b) => a.fireAt - b.fireAt);
      const next  = future[0];
      // Cap at 23h: avoids JS timer precision drift on very long
      // delays, and _checkAndReschedule will be called again by
      // fetch events on any device the user picks up within 23h.
      const delay = Math.min(next.fireAt - now, 23 * 60 * 60 * 1000);

      _nextTimer = setTimeout(async () => {
        _nextTimer = null;
        await _checkAndReschedule();
      }, delay);
    }

  } catch(e) {
    console.warn('Iqra SW: _checkAndReschedule error', e);
  }
}

// Throttle fetch-triggered checks to once per minute max
let _lastFetchCheck = 0;
function _maybeFetchCheck() {
  const now = Date.now();
  if (now - _lastFetchCheck > 60000) {
    _lastFetchCheck = now;
    _checkAndReschedule(); // fire-and-forget, does not block fetch
  }
}

// ── Message handler ────────────────────────────────────────

self.addEventListener('message', event => {
  const msg = event.data;
  if (!msg) return;

  if (msg.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (msg.type === 'SCHEDULE_NOTIFICATION') {
    _handleSchedule(msg);
    return;
  }

  if (msg.type === 'CANCEL_NOTIFICATION') {
    _handleCancel(msg.notifType);
    return;
  }
});

async function _handleSchedule(msg) {
  const { notifType, fireAt } = msg;

  if (!fireAt || fireAt <= Date.now()) {
    // Already past — skip silently
    return;
  }

  // Persist to IndexedDB — survives SW restarts
  await _idbPut({ ...msg, notifType, fireAt });

  // Update the in-memory timer
  await _checkAndReschedule();
}

async function _handleCancel(notifType) {
  await _idbDelete(notifType);
  await _checkAndReschedule();
}

// ── Fire a notification ────────────────────────────────────

async function _fireNotification(record) {
  const { notifType, data, icon, badge } = record;
  try {
    let title, body;

    if (record.fetchAyah) {
      const result = await _fetchAyahForNotif(
        record.surahNum, record.ayahNum, record.lang,
        record.surahName, record.surahNameUr, record.surahNameHi
      );
      title = result.title;
      body  = result.body;
    } else {
      title = record.title;
      body  = record.body;
    }

    await self.registration.showNotification(title, {
      body,
      icon:     icon  || './icons/icon-192.png',
      badge:    badge || './icons/favicon-32.png',
      tag:      'iqra-' + notifType,
      renotify: false,
      vibrate:  [200, 100, 200],
      data:     data || {},
      actions: [
        { action: 'open',    title: 'Open Iqra' },
        { action: 'dismiss', title: 'Dismiss'   },
      ],
    });
  } catch(e) {
    console.warn('Iqra: notification failed', e);
  }
}

// ── Fetch ayah text for the Ayah of the Day notification ──
// Tries Quran.com for Arabic, AlQuran.cloud for translation.
// Falls back to surah name + ayah number if offline.
async function _fetchAyahForNotif(surahNum, ayahNum, lang, nameEn, nameUr, nameHi) {
  const surahName = lang === 'ur' ? nameUr : lang === 'hi' ? nameHi : nameEn;
  const ayahLabel = lang === 'ur' ? 'آیت' : lang === 'hi' ? 'आयत' : 'Ayah';
  const title = (lang === 'ur' ? 'آج کی آیت' :
                 lang === 'hi' ? 'आज की आयत' : 'Ayah of the Day');
  const fallbackBody = surahName + ' · ' + ayahLabel + ' ' + ayahNum;

  try {
    const arUrl = 'https://api.quran.com/api/v4/verses/by_key/' +
      surahNum + ':' + ayahNum +
      '?language=en&words=false&fields=text_uthmani';

    const edition = lang === 'ur' ? 'ur.jalandhry' :
                    lang === 'hi' ? 'hi.hindi'      : 'en.sahih';
    const trUrl = 'https://api.alquran.cloud/v1/ayah/' +
      surahNum + ':' + ayahNum + '/' + edition;

    const [arRes, trRes] = await Promise.all([fetch(arUrl), fetch(trUrl)]);
    if (!arRes.ok || !trRes.ok) throw new Error('fetch failed');

    const [arData, trData] = await Promise.all([arRes.json(), trRes.json()]);

    const arabic = (arData.verse?.text_uthmani || '')
      .replace(/[ۭ۟۠ۢ]/g, '')
      .trim();
    const translation = (trData.data?.text || '').trim();

    const arabicShort = arabic.length > 42 ? arabic.substring(0, 40) + '…' : arabic;
    const transShort  = translation.length > 82 ? translation.substring(0, 80) + '…' : translation;
    const body = arabicShort + '\n' + transShort;

    return { title, body };

  } catch(e) {
    console.warn('Iqra: ayah fetch for notification failed, using fallback', e.message);
    return { title, body: fallbackBody };
  }
}

// ── Periodic Background Sync — wakes SW on Android PWA ───
// Chrome Android fires this every ~1-4h when PWA is installed.
// Each wake: check IDB for overdue notifications and fire them.
// This is the mechanism that makes notifications work when the
// app is closed. iOS and desktop do not support this API.
self.addEventListener('periodicsync', event => {
  if (event.tag === 'iqra-notif-check') {
    event.waitUntil(_checkAndReschedule());
  }
});

// ── Real push event — from GitHub Actions via Web Push ────
self.addEventListener('push', event => {
  if (!event.data) return;

  let payload;
  try { payload = event.data.json(); }
  catch(e) { payload = { title: 'Iqra', body: event.data.text() }; }

  const { title, body, notifType, surah, ayah, icon, badge } = payload;

  event.waitUntil(
    self.registration.showNotification(title || 'Iqra', {
      body:     body || '',
      icon:     icon  || './icons/icon-192.png',
      badge:    badge || './icons/favicon-32.png',
      tag:      'iqra-' + (notifType || 'push'),
      renotify: false,
      vibrate:  [200, 100, 200],
      data:     { surah: surah || 1, ayah: ayah || 1, notifType },
      actions:  [
        { action: 'open',    title: 'Open Iqra' },
        { action: 'dismiss', title: 'Dismiss'   },
      ],
    })
  );
});

// ── Notification click → open app at correct ayah ─────────
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const data      = event.notification.data || {};
  const surah     = data.surah || 1;
  const ayah      = data.ayah  || 1;
  const notifType = event.notification.tag?.replace('iqra-', '') || '';

  const url = self.registration.scope +
    '?notif=' + notifType +
    '&surah=' + surah +
    '&ayah='  + ayah;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        for (const client of windowClients) {
          if ('focus' in client) {
            client.focus();
            client.navigate(url);
            return;
          }
        }
        return clients.openWindow(url);
      })
  );
});
