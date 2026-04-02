# IQRA COMPLETION HANDOFF v3.0
**Qur'an World View · Stage 1: Read**
**Status: 100% Complete ✅**
**Date: April 2026**

---

بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ

---

## CURRENT VERSION

**SW Version:** `iqra-v7.8`  
**Zip:** `Iqra-v7.8.zip`  
**Repo:** https://github.com/milestonejourney/Iqra  
**Live:** milestonejourney.github.io/Iqra  

---

## WHAT WAS BUILT (This Chat — v7.x Series)

### ✅ Firebase Auth (v7.1)
- Sign-in with email/password (no sign-up — Worker handles account creation)
- Guest mode — full app works locally, gentle banner nudges sign-in
- Password reset via email
- `onAuthStateChanged` drives all UI state changes
- Profile card transforms: guest banner ↔ signed-in card with email + sync status
- Name is read-only when signed in (pulled from `users/{uid}.name`)
- **Files:** `js/core/firebase.js`, `js/core/auth.js`

### ✅ Firestore Sync (v7.1–v7.8)
- All writes go through `js/services/progress.js` — page files never touch `db` directly
- **Synced:** streak, surahs_read, achievements, reading goal, settings (reciter/sizes), notification prefs, bookmarks, favourites, khatm_count, khatm_history
- **On sign-in:** `loadFromFirestore()` merges remote + local (union, keeps richer data)
- **First sign-in:** migration from localStorage → Firestore automatically
- **Cross-device:** khatm done on device A clears stale completions on device B
- **Firebase project:** `quranworldview-home` (shared with all QWV apps)
- **SDK:** Firebase v8 compat — CDN script tags, `firebase.auth()` / `db.collection()` syntax
- **Collection:** `iqra_progress/{uid}` (top-level, per QWV v2.0 architecture)
- **Subcollection:** `iqra_progress/{uid}/bookmarks/{surah}_{ayah}`

### ✅ Notifications (v6.9–v7.0)
- **Strategy:** Client-side scheduling with IndexedDB persistence
- **SW restart recovery:** On every SW wake (fetch, activate, periodicsync), `_checkAndReschedule()` reads IDB and fires overdue notifications
- **Periodic Background Sync:** Registered on Android PWA — OS wakes SW every 1-4h, fires any overdue notifications even when app is closed
- **3 types:** Ayah of the Day (daily), Friday Al-Kahf (Fridays only), Nightly Al-Mulk (daily)
- **Button state:** Correctly persists across app reopens
- **iOS:** Notifications fire on app open only (iOS doesn't support Periodic Background Sync — FCM needed for full iOS support, deferred to Phase 5+)
- **SW version:** `iqra-v7.8` (bumped on every change to force fresh install)

### ✅ UX Polish (v7.3–v7.8)
- **Sticky compact header:** Surah header sticks at `top: var(--nav-h)` below nav bar; collapses to slim bar on scroll (Arabic name + meaning/meta hide, nav arrows always visible)
- **Tile progress bars:** Not started → clean. In progress → gold bar at bottom. Completed → ✓ mark. Re-reading completed surah → bar shows current position again
- **Resume from tile:** Always resumes from `loadLastAyah(num)` — no more forced ayah 1
- **Khatm ul Quran:** Full-screen celebration with gold particles, Arabic Khatm title, du'a from practice of the Salaf, Alhamdulillah close button
- **Repeatable khatm:** Each khatm stamps `quran_complete_N`, shows "Khatm #N" on modal, resets all 114 `completed_at_N` AND `last_ayah_N` keys for clean slate
- **Khatm in Firestore:** `khatm_count` (never resets) + `khatm_history[]` (array of timestamps)
- **Double-fire lock:** `_khatmInProgress` flag prevents concurrent khatm records

---

## FILE STRUCTURE (New/Modified Files)

```
Iqra/
├── sw.js                          ← iqra-v7.8, IndexedDB notifications, periodicsync
├── index.html                     ← Firebase CDN tags, auth modal, khatm modal, profile card
├── app.js                         ← Auth.init(), _populateAuthUI(), sticky header scroll listener
├── css/
│   └── components.css             ← Auth modal, guest banner, tile progress, khatm CSS added
├── js/
│   ├── core/
│   │   ├── firebase.js            ← NEW: Firebase v8 init, quranworldview-home config
│   │   ├── auth.js                ← NEW: sign-in, sign-out, password reset, modal
│   │   ├── i18n.js                ← Auth strings + khatm strings added (EN/UR/HI, bolchaal)
│   │   └── theme.js               ← Progress.saveSettings() wired on reciter/size changes
│   ├── services/
│   │   ├── progress.js            ← NEW: all Firestore writes, loadFromFirestore, recordKhatm
│   │   ├── store.js               ← khatm helpers: loadKhatmCount, resetKhatmSurahs, awardKhatm
│   │   └── notifications.js       ← fireAt (not delay), _registerPeriodicSync, Progress.saveNotifPrefs
│   └── pages/
│       ├── profile.js             ← Progress.* wired, _updateAuthCard, khatm trigger + lock
│       ├── overview.js            ← tile progress bars, resume fix, Progress.saveFavourites
│       ├── bookmarks.js           ← Progress.saveBookmark/deleteBookmark wired
│       ├── reader.js              ← loadSurah resume logic simplified
│       └── khatm.js               ← NEW: full-screen Khatm celebration module
```

---

## FIREBASE CONFIG

```javascript
// js/core/firebase.js
const firebaseConfig = {
  apiKey:            "AIzaSyCqxgyulLw6nitLSjn89M1u0A7bxbWlt_U",
  authDomain:        "quranworldview-home.firebaseapp.com",
  projectId:         "quranworldview-home",
  storageBucket:     "quranworldview-home.appspot.com",
  messagingSenderId: "349899904697",
  appId:             "1:349899904697:web:b78d66af8f9af2cb80ad68",
};
```

---

## FIRESTORE RULES (Must Be Deployed)

Add these blocks to the live rules on `quranworldview-home` before the `// ── HELPERS` section:

```javascript
// ── APP PROGRESS ─────────────────────────────────────────────
match /iqra_progress/{uid} {
  allow read, write: if isOwner(uid);
}
match /iqra_progress/{uid}/{document=**} {
  allow read, write: if isOwner(uid);
}
```

---

## FIRESTORE DATA STRUCTURE

```javascript
// iqra_progress/{uid}
{
  current_streak:   number,
  longest_streak:   number,
  last_read_date:   'YYYY-MM-DD',
  surahs_read:      number[],          // resets to [] on each khatm
  achievements:     string[],          // achievement IDs
  favourites:       number[],          // surah numbers
  khatm_count:      number,            // total khatms, never resets
  khatm_history:    [{ count, completed_at }],
  reading_goal:     { type, count, start_date },
  settings:         { reciter, arabic_size, translation_size },
  notifications:    { aotd, kahf, mulk: { enabled, time } },
  updated_at:       timestamp,
}

// iqra_progress/{uid}/bookmarks/{surah}_{ayah}
{
  surah_number:  number,
  ayah_number:   number,
  note:          string | null,
  created_at:    timestamp,
}
```

---

## KNOWN LIMITATIONS / FUTURE WORK

| Item | Status | Notes |
|---|---|---|
| FCM push notifications | ⏳ Phase 5+ | Needs Cloudflare Worker FCM sender endpoint. Will give exact-time notifications on iOS too. |
| iOS notifications (closed app) | ⚠️ Partial | Fire on app open only. Periodic Background Sync not supported on iOS Safari. |
| Juz mode | ❌ Not implemented | Current Juz tab is navigation-only (cosmetic labels). Real Juz reading mode = separate session. |
| Offline bookmarks sync | ✅ Works | localStorage is always written first; Firestore syncs when online. |

---

## WHAT NEXT CHAT SHOULD KNOW

1. **Iqra is complete.** Do not add features — deploy and integrate.
2. **Next step:** Copy Iqra into the unified `quranworldview` platform repo under `/iqra/`
3. **Shared auth:** `quranworldview-home` Firebase project is shared across all apps. User signs in once on the Dashboard → auth state persists to Iqra automatically (same Firebase project, same domain).
4. **SW scope:** When Iqra moves from `milestonejourney.github.io/Iqra/` to `quranworldview.com/iqra/`, the SW scope changes. All relative paths (`./`) are already correct and will work at any subfolder depth.
5. **No hard dependencies** on `milestonejourney.github.io` domain — ready to move.

---

## TESTING CHECKLIST BEFORE DEPLOY

- [ ] Sign in with real credentials → name shows, data syncs
- [ ] Guest mode → all features work, banner shows
- [ ] Set notification time 5 min away → close app → notification fires (Android PWA)
- [ ] Read partway through a surah → go to overview → progress bar shows
- [ ] Complete surah → ✓ shows → re-read partway → bar shows again
- [ ] Complete all 114 → Khatm celebration → tiles reset → 0/114
- [ ] Sign in on second device → data matches first device
- [ ] Bookmarks save and appear cross-device
- [ ] Favourites save and appear cross-device

---

*وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ*
*And my success is only through Allah.*

**Qur'an World View · Stage 1: Iqra · 100% Complete**
