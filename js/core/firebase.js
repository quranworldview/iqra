// ============================================================
// FIREBASE — Iqra Qur'an Reader
// ─────────────────────────────────────────────────────────────
// Firebase v8 compat SDK — loaded via CDN script tags in
// index.html BEFORE this file. Do NOT use v10/modular syntax.
// Do NOT import firebase modules. Do NOT use getAuth(), getDoc().
// This follows the confirmed QWV platform standard (v2.0 doc).
// ─────────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey:            "AIzaSyCqxgyulLw6nitLSjn89M1u0A7bxbWlt_U",
  authDomain:        "quranworldview-home.firebaseapp.com",
  projectId:         "quranworldview-home",
  storageBucket:     "quranworldview-home.appspot.com",
  messagingSenderId: "880026417985",
  appId:             "1:880026417985:web:7bd21b3ded6d6319c6bfc0",
};

// Guard against double-init (e.g. if script is loaded twice)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db   = firebase.firestore();
const auth = firebase.auth();

// ── Collection name constants — prevents typos ─────────────
const COLLECTIONS = {
  USERS:            'users',
  IQRA_PROGRESS:    'iqra_progress',
  USER_REFLECTIONS: 'user_reflections',
  CONFIG:           'config',
  NOTIFICATIONS:    'notifications',
};
