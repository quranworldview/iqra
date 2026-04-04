# IQRA HANDOFF v4.0
**Qur'an World View · Stage 1: Iqra**
**Status: 100% Complete — Ready for Deployment & Integration**
**Date: April 3, 2026**
**Supersedes:** IQRA-HANDOFF-v3.0.md

---

بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ

---

## CURRENT VERSION

**SW Version:** `iqra-v7.9.1`
**Zip:** `Iqra-v7.9.zip`
**Repo:** https://github.com/quranworldview/Iqra
**Live (current):** https://milestonejourney.github.io/Iqra
**Live (target):** https://quranworldview.github.io/iqra/

---

## WHAT THIS DOCUMENT IS

This is the authoritative handoff for Iqra v7.9. It covers:

1. Everything that was built across all sessions (v7.1 → v7.9)
2. Firestore schema — exact fields, exact collection names
3. Integration instructions for the QWV Dashboard
4. Known limitations and deferred work
5. Migration notes for moving to the unified platform
6. Ideas for v8.0 — for when we return

Any Claude working on Iqra, the Dashboard, or platform integration
should read this document before writing a single line of code.

---

## PART 1: COMPLETE FEATURE SET

### 1.1 Firebase Auth (v7.1)

- Sign-in with email/password. No client-side sign-up — accounts
  created exclusively by the Cloudflare Worker (`qwv-worker`).
- Guest mode — full app works locally without signing in.
  A gentle banner nudges sign-in but never blocks.
- Password reset via email.
- `onAuthStateChanged` drives all UI state.
- Profile card transforms: guest banner ↔ signed-in card with
  email + sync status.
- Name is read-only when signed in (pulled from `users/{uid}.name`).
- **Files:** `js/core/firebase.js`, `js/core/auth.js`

### 1.2 Firestore Sync (v7.1–v7.9)

- All writes go through `js/services/progress.js`.
  Page files never touch `db` directly.
- **Synced data:** streak, surahs_read, achievements, reading goal,
  settings (reciter/sizes), notification prefs, reflections
  (formerly bookmarks), favourites, khatm_count, khatm_history,
  published_reflections_count.
- **On sign-in:** `loadFromFirestore()` merges remote + local
  (union, keeps richer data).
- **First sign-in:** migration from localStorage → Firestore
  automatically.
- **Cross-device:** khatm done on device A clears stale completions
  on device B.
- **Firebase project:** `quranworldview-home` (shared with all QWV apps)
- **SDK:** Firebase v8 compat — CDN script tags.
- **Collection:** `iqra_progress/{uid}` (top-level)
- **Subcollection:** `iqra_progress/{uid}/bookmarks/{surah}_{ayah}`

### 1.3 Reflections System (v7.9) ← NEW THIS SESSION

Previously called "Bookmarks." Completely redesigned.

**What it is:**
Every ayah can have a reflection — a titled note the student writes.
Reflections are private by default. The student can publish them,
which writes to `user_reflections` (the same collection the Dashboard
uses), entering the admin review pipeline.

**Why it matters:**
- `published_reflections_count` is a signal for the Alif gate.
  Admin checks: has this student published at least one real reflection?
- The title field teaches students to name their thoughts — a subtle
  precursor to the structured 5 Lenses framework in Miftah.
- Published reflections can be approved to the Library or Blog
  from the Dashboard admin panel — no new UI needed.

**Visibility states:**
- `private` — saved locally + Firestore subcollection. User only.
- `published` — additionally written to `user_reflections/{reflId}`
  with `status: 'pending'`. Admin sees it in the review queue.

**The reflection sheet (UI):**
- Title input (Cinzel, `maxlength=100`) — focused on open
- Textarea for the reflection body
- Save Reflection button

**The reflections page (UI):**
- ✨ nav icon, ✨ empty state
- Each card shows: surah ref, date, Private/Published badge,
  user title, Arabic ayah, reflection body
- Actions: Go to Ayah | Publish/Make Private | Remove
- Subtitle shows count: "3 reflections · 1 published"
- Cannot publish without a body note (guard with toast)

### 1.4 In-App Notification Cards (v7.9) ← NEW THIS SESSION

**Module:** `js/services/notif-cards.js`

**Why:** Push notifications via Periodic Background Sync are
unreliable and don't work on iOS or desktop. Cards show on every
app open — guaranteed, platform-agnostic, beautiful.

**Three card types (priority order):**

| Priority | Type | Trigger | Auto-skip if |
|---|---|---|---|
| 1 | Al-Mulk 🌙 | After Isha time, nightly | Surah 67 read today |
| 2 | Al-Kahf 🕌 | All day Friday | Surah 18 read today |
| 3 | Ayah of the Day ✦ | First open of the day | User dismissed |

**One card at a time.** Dismissed state stored per day in localStorage.

**Isha time:** fetched from `api.aladhan.com/v1/timings/{ts}` using
browser geolocation. Cached 24h. Falls back to 21:00 if unavailable.

**AotD ayah:** deterministic from date seed (same ayah all day).
Arabic + translation fetched from `api.alquran.cloud`, cached per day.

**When FCM arrives (Phase 5+):** push notifications layer on top.
Cards remain as in-app confirmation and iOS/desktop fallback.

### 1.5 Notifications — Push (v6.9–v7.0, unchanged)

- **Strategy:** Client-side scheduling with IndexedDB persistence.
- **SW restart recovery:** `_checkAndReschedule()` on every SW wake.
- **Periodic Background Sync:** registered on Android PWA.
- **3 types:** Ayah of the Day, Friday Al-Kahf, Nightly Al-Mulk.
- **iOS:** notifications fire on app open only (platform limitation).
- The toggle UI in Profile stays — will work fully when FCM arrives.

### 1.6 UX Features (v7.3–v7.9)

- **Sticky compact header:** collapses on scroll in reader.
- **Tile progress bars:** not started / in progress (gold) / completed (✓) / re-reading.
- **Resume from tile:** always resumes from last ayah.
- **Khatm ul Quran:** full-screen celebration, gold particles, du'a,
  repeatable with khatm count. Synced to Firestore.
- **Achievements:** fire immediately on completion.
- **Multilingual:** EN / UR / HI throughout, bolchaal register.
- **Themes:** dark (default) / light / system — logos swap accordingly.
- **Bottom navbar:** fixed-width buttons (64px), audio bar fills
  remaining space. Labels in Cinzel 10px, ellipsis on overflow.
  Labels hide on very small screens (≤360px).

---

## PART 2: FILE STRUCTURE

```
Iqra/                               (root = Iqra-v2 in repo)
├── sw.js                           ← iqra-v7.9.1, IDB notifications,
│                                     periodicsync, Firestore passthrough fix
├── index.html                      ← Firebase CDN, all modals & sheets
├── app.js                          ← Boot, routing, NotifCards.init()
├── manifest.json
├── css/
│   ├── design-system.css           ← Design tokens (copy from Dashboard)
│   └── components.css              ← All component styles (~3500 lines)
├── js/
│   ├── core/
│   │   ├── firebase.js             ← Firebase v8 init, COLLECTIONS constants
│   │   ├── auth.js                 ← Sign-in, sign-out, password reset
│   │   ├── i18n.js                 ← t() function, all EN/UR/HI strings
│   │   ├── theme.js                ← Light/dark/system toggle
│   │   └── settings.js             ← Settings helpers
│   ├── services/
│   │   ├── progress.js             ← ALL Firestore writes (single source)
│   │   ├── store.js                ← localStorage helpers
│   │   ├── notifications.js        ← Push notification scheduling
│   │   ├── notif-cards.js          ← In-app notification cards (NEW v7.9)
│   │   ├── quran-api.js            ← Quran Foundation API v4 calls
│   │   ├── offline.js              ← Offline storage display
│   │   └── webpush.js              ← Web Push / VAPID helpers
│   ├── pages/
│   │   ├── bookmarks.js            ← Reflections page (renamed v7.9)
│   │   ├── overview.js             ← Surah tile grid, progress bars
│   │   ├── profile.js              ← Profile card, streak, goals
│   │   ├── reader.js               ← Surah reader, audio, sticky header
│   │   ├── khatm.js                ← Khatm celebration module
│   │   ├── celebration.js          ← Achievement celebration
│   │   └── tour.js                 ← Guided first-run tour
│   └── data/
│       ├── surahs.js               ← All 114 surah metadata
│       ├── juz.js                  ← Juz boundary data
│       ├── reciters.js             ← Reciter list for everyayah.com
│       └── sajdah.js               ← Sajdah ayah list
└── icons/
    ├── logo-dark.png               ← NEW v7.9 — gold on dark
    ├── logo-light.png              ← NEW v7.9 — gold on cream
    ├── icon-192.png
    └── icon-512.png
```

---

## PART 3: FIREBASE CONFIG & SCHEMA

### 3.1 Firebase Config

```javascript
// js/core/firebase.js
const firebaseConfig = {
  apiKey:            "AIzaSyCqxgyulLw6nitLSjn89M1u0A7bxbWlt_U",
  authDomain:        "quranworldview-home.firebaseapp.com",
  projectId:         "quranworldview-home",
  storageBucket:     "quranworldview-home.appspot.com",
  messagingSenderId: "880026417985",
  appId:             "1:880026417985:web:7bd21b3ded6d6319c6bfc0",
};
```

### 3.2 COLLECTIONS constants

```javascript
const COLLECTIONS = {
  USERS:            'users',
  IQRA_PROGRESS:    'iqra_progress',
  USER_REFLECTIONS: 'user_reflections',
  CONFIG:           'config',
  NOTIFICATIONS:    'notifications',
};
```

### 3.3 `iqra_progress/{uid}` — Main progress document

```javascript
{
  current_streak:              number,
  longest_streak:              number,
  last_read_date:              'YYYY-MM-DD',
  surahs_read:                 number[],       // resets on each khatm
  achievements:                string[],
  favourites:                  number[],
  khatm_count:                 number,         // never resets
  khatm_history:               [{ count, completed_at }],
  reading_goal:                { type, count, start_date },
  settings:                    { reciter, arabic_size, translation_size },
  notifications:               { aotd, kahf, mulk: { enabled, time } },
  published_reflections_count: number,         // NEW v7.9
  updated_at:                  timestamp,
}
```

### 3.4 `iqra_progress/{uid}/bookmarks/{surah}_{ayah}` — Reflections subcollection

```javascript
{
  surah_number: number,
  ayah_number:  number,
  note:         string | null,
  title:        string | null,       // NEW v7.9
  visibility:   'private' | 'published',  // NEW v7.9
  created_at:   timestamp,
  updated_at:   timestamp,           // NEW v7.9
}
```

### 3.5 `user_reflections/{reflId}` — Published reflections

`reflId` format: `iqra_{uid}_{surahNum}_{ayahNum}`

```javascript
{
  // Identity
  uid:          string,
  author_name:  string,

  // Content — exact Dashboard schema
  title:        string,             // user-entered title
  body:         string,             // reflection text
  surah:        number,
  ayah:         number,
  surah_name:   { en, ur, hi },     // map from SURAHS data
  language:     'en' | 'ur' | 'hi',

  // Classification
  app_source:   'iqra',             // 'app_source' key — matches Dashboard
  stage:        1,                  // Iqra is always Stage 1
  published_as: 'named',
  theme_tags:   [],                 // empty — tagging not in Iqra yet

  // Workflow
  status:       'pending',          // admin reviews → 'approved' | 'rejected'
  updated_by:   string,             // uid
  submitted_at: timestamp,
}
```

### 3.6 Firestore Rules Required

These blocks must exist in `quranworldview-home` rules
(they are already live as of April 2026):

```javascript
match /iqra_progress/{uid} {
  allow read, write: if isOwner(uid) || isAdmin();
}
match /iqra_progress/{uid}/{document=**} {
  allow read, write: if isOwner(uid) || isAdmin();
}
match /user_reflections/{docId} {
  allow read:           if request.auth != null;
  allow create:         if request.auth != null
                        && request.auth.uid == request.resource.data.uid;
  allow update, delete: if isAdmin();
}
```

---

## PART 4: DASHBOARD INTEGRATION CHECKLIST

The following items need attention in the Dashboard chat.

### 4.1 Reflections badge fix ✅ RESOLVED

The Reflections admin panel was showing "DASHBOARD" for Iqra
reflections. Root cause: Dashboard was reading `source_app` but
Iqra writes `app_source`. Fixed in Dashboard chat on April 3, 2026.

Both sides now confirmed:
- Iqra writes: `app_source: 'iqra'`
- Dashboard reads: `app_source` ✅

### 4.2 Student profile card — add published_reflections_count

When viewing a student in the Students or Gate Approvals panel:

```
Reflections Published: {iqra_progress/{uid}.published_reflections_count}
```

This is one of the Alif gate criteria.

### 4.3 Alif gate criteria (suggested minimums — Yusuf decides)

| Signal | Firestore field | Suggested bar |
|---|---|---|
| Active reading | `iqra_progress/{uid}.current_streak` | > 0 |
| Breadth | `iqra_progress/{uid}.surahs_read.length` | Meaningful number |
| Depth | `iqra_progress/{uid}.published_reflections_count` | ≥ 1 |

### 4.4 Shared auth — sign-in once, works everywhere

`quranworldview-home` is the shared Firebase project. When Iqra
moves to `quranworldview.com/iqra/`, a user signed in on the
Dashboard will already be signed in on Iqra — same project,
same domain, same auth cookie. No extra work needed.

---

## PART 5: MIGRATION — MOVING TO UNIFIED PLATFORM

When Iqra moves from `milestonejourney.github.io/Iqra/` to
`quranworldview.com/iqra/`:

**What changes automatically (no code changes):**
- All relative paths (`./`) work at any subfolder depth ✅
- SW scope follows the file location ✅
- Firebase auth persists (same project) ✅

**What needs one-time attention:**
- VAPID keys for web push — if domain changes, push subscriptions
  need re-registration. Users will get the permission prompt once.
- Update the `start_url` in `manifest.json` if the path changes.
- GitHub Actions deploy workflow (`/.github/workflows/deploy.yml`)
  needs the new repo target.

**Repo structure for unified platform:**
```
quranworldview/
├── iqra/          ← copy Iqra-v7.9 contents here
├── alif/
├── dashboard/
└── ...
```

---

## PART 6: KNOWN LIMITATIONS & DEFERRED WORK

| Item | Status | Notes |
|---|---|---|
| FCM push notifications | ⏳ Phase 5+ | Needs Cloudflare Worker FCM endpoint. Will give exact-time push on iOS too. Cards remain as fallback. |
| iOS notifications (closed app) | ⚠️ Partial | Fire on app open only via cards. Full support needs FCM. |
| Juz reading mode | ❌ Not implemented | Juz tab is navigation-only. Real Juz session = separate feature. |
| theme_tags on reflections | ❌ Not in Iqra | Students can't tag in Iqra. Tags would be added by admin on approval, or in a future version. |
| Reflection edit after publish | ⚠️ Partial | Editing a published reflection updates localStorage but does NOT update `user_reflections` doc. Unpublish → edit → republish is the correct flow. |
| Anonymous reflections | ❌ Not implemented | `published_as` is always `'named'`. Anonymous option = future v8.0 feature. |

---

## PART 7: IDEAS FOR v8.0

These are ideas that came up naturally during development but were
deliberately deferred to keep v7.9 focused. Documented here so
the next session starts with intention.

### High value
- **Anonymous publishing option** — `published_as: 'anonymous'`.
  Some students won't publish if their name is attached. Giving
  them the choice might unlock more genuine reflections.
- **Reflection edit flow** — currently editing a published reflection
  requires unpublish → edit → republish. A single "Update" action
  that re-submits for review would be cleaner.
- **theme_tags in Iqra** — a simple set of topic chips (akhirah,
  tawakkul, gratitude, etc.) the student can tap before publishing.
  Makes the Library filterable by theme.
- **Juz reading mode** — treat a Juz as a reading session with its
  own progress tracking, separate from surah-by-surah completion.

### Medium value
- **Streak protection** — one free pass per month if the user misses
  a day. Common in learning apps, reduces frustration.
- **Reading time tracker** — how long does a session take? Feeds
  into a richer profile and the Alif gate assessment.
- **Recitation speed setting** — some users want slower recitation
  for learning. everyayah.com doesn't support speed, but a separate
  reciter selection for "slow/tajweed" mode is possible.

### Nice to have
- **Share a reflection** — generate a beautiful image card (surah
  name, Arabic ayah, user's reflection title) for Instagram/WhatsApp.
  Organic community growth.
- **Library integration in Iqra** — show approved QWV Library gems
  for the surah being read. "Others have reflected on this surah…"
- **Offline surah download progress** — visual indication of which
  surahs are cached. Currently just a count.

---

## PART 8: TESTING CHECKLIST BEFORE PRODUCTION DEPLOY

- [ ] Sign in with real credentials → name shows, sync status shows
- [ ] Guest mode → all features work, banner shows
- [ ] Set notification time 5 min away → close app → card shows on reopen (Android PWA)
- [ ] Open on Friday → Al-Kahf card shows
- [ ] Open after 9pm → Al-Mulk card shows
- [ ] Read Al-Kahf → reopen app → card does NOT show again
- [ ] Long-press ayah → reflection sheet opens, title field focused
- [ ] Save reflection with title → appears on Reflections page with title
- [ ] Publish reflection → check Firestore → `app_source: 'iqra'` present
- [ ] Check Dashboard admin → reflection appears in Pending queue
- [ ] Unpublish → Firestore `user_reflections` doc deleted
- [ ] Read partway through a surah → overview tile shows gold bar
- [ ] Complete surah → ✓ shows → re-read partway → bar shows again
- [ ] Complete all 114 → Khatm celebration → tiles reset
- [ ] Sign in on second device → data matches first device
- [ ] Reflections sync cross-device
- [ ] Favourites sync cross-device
- [ ] Light theme → logos swap correctly
- [ ] Navbar labels visible and not clipping on desktop
- [ ] Play button visible and not squished on small screen

---

## PART 9: WHAT THE NEXT CLAUDE SHOULD KNOW

1. **Do not add features without reading this doc first.**
2. **Firebase v8 compat. Always.** `db.collection().doc().get()` — not v10.
3. **All Firestore writes through `progress.js`.** No exceptions.
4. **All UI strings through `t()`.** No hardcoded strings.
5. **Bolchaal always.** Spoken register for UR/HI.
6. **The 100% free stack.** No paid services.
7. **`user_reflections` schema is now shared with Dashboard.**
   Any change to the schema must be reflected in both Iqra and Dashboard.
8. **SW version must be bumped on every sw.js change.**
   Current version: `iqra-v7.9.1`.
9. **The internal folder is named `Iqra-v2`** (GitHub repo name).
   Don't rename it — it's the live repo structure.
10. **Start every session by reading this doc and the QWV platform
    consolidation doc (v2.0) before writing any code.**

---

*وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ*
*And my success is only through Allah.*

**Qur'an World View · Stage 1: Iqra · v7.9 · April 3, 2026**
