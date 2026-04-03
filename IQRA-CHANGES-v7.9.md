# IQRA CHANGES — v7.9
**For: QWV Dashboard Chat**
**Date: April 2026**

---

بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ

---

## WHAT CHANGED

Bookmarks have been redesigned as **Reflections** — a note-taking and publishing feature
that feeds directly into the `user_reflections` collection the Dashboard already manages.

This is not a cosmetic rename. It is an architectural addition that connects Iqra to the
admin review pipeline and the QWV Library for the first time.

---

## 1. THE FEATURE

Every reflection has a `visibility` field: `private` (default) or `published`.

- **Private** — saved locally and synced to Firestore, visible only to the user
- **Published** — additionally written to `user_reflections/{reflId}` with `status: 'pending'`

When a student publishes a reflection:
1. It appears in the Dashboard admin review queue (same queue used for Dashboard reflections)
2. Admin can approve → Library, post → Blog, or both
3. `published_reflections_count` on `iqra_progress/{uid}` increments

This count becomes one of the signals for the **Alif access gate** — admin can check
how many reflections a student has published before approving Stage 2.

---

## 2. FIRESTORE CHANGES

### `user_reflections/{reflId}` — new documents written by Iqra

`reflId` format: `iqra_{uid}_{surahNum}_{ayahNum}`
(e.g. `iqra_abc123_2_255` for Al-Baqarah:255)

```javascript
{
  uid:          string,           // Firebase Auth UID
  author_name:  string,           // from loadUserName() / users/{uid}.name
  text:         string,           // the reflection note
  surah:        number,
  ayah:         number,
  source_app:   'iqra',           // NEW — Dashboard should filter by this
  status:       'pending',        // admin reviews before Library
  submitted_at: timestamp,
}
```

**Security rules:** already covered. `user_reflections` allows
`create` if `request.auth.uid == request.resource.data.uid`. ✅

### `iqra_progress/{uid}` — new field

```javascript
published_reflections_count: number   // increments on publish, decrements on unpublish/delete
```

Add this to the Dashboard's display of a student's Iqra progress card.

### `iqra_progress/{uid}/bookmarks/{surah}_{ayah}` — updated schema

```javascript
{
  surah_number: number,
  ayah_number:  number,
  note:         string | null,
  visibility:   'private' | 'published',   // NEW
  created_at:   timestamp,
  updated_at:   timestamp,                 // NEW — set on publish/unpublish
}
```

---

## 3. WHAT THE DASHBOARD NEEDS TO DO

### A. Admin review queue — filter by source_app

The existing review queue should show a source badge so admin knows where
a reflection came from. Add a filter or badge for `source_app: 'iqra'`.

No structural change needed — Iqra writes to the same collection, same `status: 'pending'`
flow. Just surface the source.

### B. Student profile card — show published_reflections_count

When viewing a student's profile in the admin panel, add:

```
Iqra Reflections Published: {published_reflections_count}
```

This is one of the Alif gate criteria alongside streak and surahs completed.

### C. Alif gate check — suggested minimum criteria

When admin reviews a student for Alif access, the suggested checklist:

| Signal | Field | Suggested Minimum |
|---|---|---|
| Active reading | `iqra_progress/{uid}.current_streak` | > 0 (reading recently) |
| Breadth | `iqra_progress/{uid}.surahs_read.length` | Meaningful number |
| Depth | `iqra_progress/{uid}.published_reflections_count` | ≥ 1 published reflection |

The exact thresholds are Yusuf's call — the data is now available.

---

## 4. FILES CHANGED IN IQRA (v7.9)

| File | Change |
|---|---|
| `js/services/store.js` | `visibility` field on creation, `setReflectionVisibility()`, `countPublishedReflections()` |
| `js/services/progress.js` | `saveBookmark` persists visibility; `deleteBookmark` unpublishes first if needed; `publishReflection()` and `unpublishReflection()` added |
| `js/pages/bookmarks.js` | Full rewrite — publish/private toggle, badge display, subtitle counts, ✨ empty state |
| `js/core/i18n.js` | Nav label → Reflections (EN/UR/HI); 10 new strings in bolchaal register |
| `index.html` | Nav icon → ✨, sheet renamed to Reflection Sheet |
| `css/components.css` | Badge styles, published card border, toggle button styles |
| `sw.js` | Bumped to `iqra-v7.9` |

---

## 5. WHAT HAS NOT CHANGED

- Firestore collection names are unchanged (`bookmarks` subcollection stays `bookmarks` internally)
- localStorage key stays `bookmarks` — no migration needed for existing users
- The `user_reflections` security rules already cover Iqra writes — no rule changes needed
- Firebase project, SDK version, auth flow — all unchanged

---

## 6. EXISTING USERS — MIGRATION NOTE

Existing bookmarks in localStorage will load fine — they simply won't have a `visibility`
field. `store.js` treats any entry without `visibility` as `private` by default
(the toggle reads `b.visibility === 'published'`, so undefined → false → private). ✅

No data migration script needed.

---

*وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ*

**Qur'an World View · Iqra v7.9**
