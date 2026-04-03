// ============================================================
// STORE — Iqra Qur'an Reader V2
// All localStorage persistence. No Firebase.
// ============================================================

const STORE_PREFIX = 'iqra_v1_';

function _get(key)        { try { return localStorage.getItem(STORE_PREFIX + key); } catch(e) { return null; } }
function _set(key, value) { try { localStorage.setItem(STORE_PREFIX + key, value); } catch(e) {} }
function _del(key)        { try { localStorage.removeItem(STORE_PREFIX + key); } catch(e) {} }

// ── Theme ─────────────────────────────────────────────────
function loadTheme()           { return _get('theme')        || 'dark'; }
function saveTheme(t)          { _set('theme', t); }

// ── Text sizes ────────────────────────────────────────────
function loadArabicSize()      { return _get('arabic_size')  || 'md'; }
function saveArabicSize(s)     { _set('arabic_size', s); }
function loadTransSize()       { return _get('trans_size')   || 'md'; }
function saveTransSize(s)      { _set('trans_size', s); }

// ── Language ──────────────────────────────────────────────
function loadLang()            { return _get('lang')         || 'en'; }
function saveLang(l)           { _set('lang', l); }

// ── Last position ─────────────────────────────────────────
function loadLastSurah()       { return parseInt(_get('last_surah')) || 1; }
function saveLastSurah(n)      { _set('last_surah', n); }
function loadLastAyah(surahNum){ return parseInt(_get('last_ayah_' + (surahNum || 1))) || 1; }
function saveLastAyah(surahNum, ayahNum) { _set('last_ayah_' + surahNum, ayahNum); }
function loadLastPage()        { return _get('last_page') || 'overview'; }
function saveLastPage(p)       { _set('last_page', p); }

// ── Reciter ───────────────────────────────────────────────
function loadReciter()         { return _get('reciter') || 'afasy'; }
function saveReciter(id)       { _set('reciter', id); }

// ── Reading mode ──────────────────────────────────────────
function loadReadingMode()     { return _get('reading_mode') === '1'; }

// ── Script (IndoPak / Uthmani) ────────────────────────────
function loadScript()       { return _get('script') || 'indopak'; }  // IndoPak default
function saveScript(s)      { _set('script', s); }
function saveReadingMode(on)   { _set('reading_mode', on ? '1' : '0'); }

// ── Overview view mode: 'surah' | 'juz' ──────────────────
function loadViewMode()        { return _get('view_mode') || 'surah'; }
function saveViewMode(m)       { _set('view_mode', m); }

// ── Favourite surahs ──────────────────────────────────────
function loadFavourites() {
  try { return JSON.parse(_get('favourites') || '[]'); } catch(e) { return []; }
}
function saveFavourites(arr)   { _set('favourites', JSON.stringify(arr)); }

function isFavourite(surahNum) { return loadFavourites().includes(surahNum); }

function toggleFavourite(surahNum) {
  const favs = loadFavourites();
  const idx  = favs.indexOf(surahNum);
  if (idx === -1) favs.push(surahNum);
  else            favs.splice(idx, 1);
  saveFavourites(favs);
  return idx === -1; // true = now favourite
}

// ── Reflections (formerly Bookmarks) ──────────────────────
// Each reflection: { id, surahNum, ayahNum, arabic, note, savedAt, visibility }
// visibility: 'private' (default) | 'published'
function loadBookmarks() {
  try { return JSON.parse(_get('bookmarks') || '[]'); } catch(e) { return []; }
}
function saveBookmarks(arr)    { _set('bookmarks', JSON.stringify(arr)); }

function addBookmark(surahNum, ayahNum, arabic, note, title) {
  const bm = loadBookmarks();
  const exists = bm.find(b => b.surahNum === surahNum && b.ayahNum === ayahNum);
  if (exists) {
    exists.note    = note || exists.note;
    exists.title   = title || exists.title || '';
    exists.savedAt = Date.now();
    saveBookmarks(bm);
    return exists;
  }
  const entry = {
    id: Date.now(), surahNum, ayahNum, arabic,
    note: note || '', title: title || '', savedAt: Date.now(),
    visibility: 'private',
  };
  bm.unshift(entry);
  saveBookmarks(bm);
  return entry;
}

function removeBookmark(id) {
  saveBookmarks(loadBookmarks().filter(b => b.id !== id));
}

function isBookmarked(surahNum, ayahNum) {
  return loadBookmarks().some(b => b.surahNum === surahNum && b.ayahNum === ayahNum);
}

// Set visibility on a reflection (locally)
function setReflectionVisibility(id, visibility) {
  const bm = loadBookmarks();
  const entry = bm.find(b => b.id === id);
  if (entry) {
    entry.visibility = visibility;
    saveBookmarks(bm);
  }
  return entry;
}

// Count how many reflections are currently published (for Firestore sync)
function countPublishedReflections() {
  return loadBookmarks().filter(b => b.visibility === 'published').length;
}

// ── Offline cached surahs ─────────────────────────────────
function loadCachedSurahs() {
  try { return JSON.parse(_get('cached_surahs') || '[]'); } catch(e) { return []; }
}
function markSurahCached(num) {
  const cached = loadCachedSurahs();
  if (!cached.includes(num)) { cached.push(num); _set('cached_surahs', JSON.stringify(cached)); }
}
function isSurahCached(num)  { return loadCachedSurahs().includes(num); }

// ── Tour seen ─────────────────────────────────────────────
// (used by tour.js directly via _get/_set)

// ── Notifications ─────────────────────────────────────────
// notifType: 'aotd' | 'kahf' | 'mulk'

function loadNotifEnabled(type)     { return _get('notif_on_' + type) !== '0'; } // default ON once permission granted
function saveNotifEnabled(type, on) { _set('notif_on_' + type, on ? '1' : '0'); }

function loadNotifTime(type)        { return _get('notif_time_' + type) || null; }
function saveNotifTime(type, time)  { _set('notif_time_' + type, time); }

// ── User Profile ──────────────────────────────────────────
function loadUserName()          { return _get('user_name') || ''; }
function saveUserName(n)         { _set('user_name', n); }

// Goal: { type: 'surahs'|'juz', count: number, period: 'day'|'week'|'month' }
function loadUserGoal() {
  try { return JSON.parse(_get('user_goal') || 'null'); } catch(e) { return null; }
}
function saveUserGoal(goal)      { _set('user_goal', JSON.stringify(goal)); }

// ── Streak ────────────────────────────────────────────────
function loadStreak() {
  try { return JSON.parse(_get('streak') || '{"count":0,"longest":0,"lastDate":null}'); }
  catch(e) { return { count: 0, longest: 0, lastDate: null }; }
}
function saveStreak(s)           { _set('streak', JSON.stringify(s)); }

// ── Surah completion timestamps ───────────────────────────
// Records the FIRST time a surah was fully read (epoch ms).
// SEPARATE from lastAyah — navigation never clears this.
function getSurahCompletedAt(surahNum) {
  const v = _get('completed_at_' + surahNum);
  return v ? parseInt(v) : null;
}
function markSurahCompleted(surahNum) {
  if (!getSurahCompletedAt(surahNum)) {
    _set('completed_at_' + surahNum, String(Date.now()));
  }
}
function isSurahCompleted(surahNum) {
  return getSurahCompletedAt(surahNum) !== null;
}

// ── Khatm ul Quran ────────────────────────────────────────
// khatm_count: total khatms completed — never resets
// Surah completed_at_N keys are cleared on each khatm

function loadKhatmCount()      { return parseInt(_get('khatm_count') || '0'); }
function saveKhatmCount(n)     { _set('khatm_count', String(n)); }

// Clear all 114 completed_at_N AND last_ayah_N keys — full clean slate for next khatm
function resetKhatmSurahs() {
  for (let i = 1; i <= 114; i++) {
    _del('completed_at_' + i);
    _del('last_ayah_'    + i);  // also clear position so tiles start fresh
  }
}

// Award a khatm — stamps quran_complete_N (repeatable) AND
// a permanent quran_complete badge (for the achievements panel display).
// Returns the new khatm count.
function awardKhatm() {
  const count  = loadKhatmCount() + 1;
  saveKhatmCount(count);
  // Stamp this specific khatm
  const arr = loadAchievements();
  arr.push({ id: 'quran_complete_' + count, earnedAt: Date.now() });
  // Stamp / keep the permanent badge
  if (!arr.some(a => a.id === 'quran_complete')) {
    arr.push({ id: 'quran_complete', earnedAt: Date.now() });
  }
  saveAchievements(arr);
  return count;
}

// ── Achievements ──────────────────────────────────────────
// Array of { id, earnedAt }
function loadAchievements() {
  try { return JSON.parse(_get('achievements') || '[]'); } catch(e) { return []; }
}
function saveAchievements(arr)   { _set('achievements', JSON.stringify(arr)); }

function hasAchievement(id)      { return loadAchievements().some(a => a.id === id); }

function awardAchievement(id) {
  if (hasAchievement(id)) return false;
  const arr = loadAchievements();
  arr.push({ id, earnedAt: Date.now() });
  saveAchievements(arr);
  return true; // newly awarded
}

// awardGoalPeriod: awards a REPEATABLE goal achievement.
// Stores under a period-specific key (so it can fire again next period)
// AND stamps the generic 'goal_met' id so the badge lights up permanently.
// Returns true only the first time within this period.
function awardGoalPeriod(periodKey) {
  const fullId = 'goal_met_' + periodKey;
  if (hasAchievement(fullId)) return false; // already awarded this period
  const arr = loadAchievements();
  arr.push({ id: fullId, earnedAt: Date.now() });
  // Also stamp generic badge if not already there
  if (!arr.some(a => a.id === 'goal_met')) {
    arr.push({ id: 'goal_met', earnedAt: Date.now() });
  }
  saveAchievements(arr);
  return true;
}

// periodKey: a stable string identifying the current goal period
// e.g. 'day_2026-03-29', 'week_2026-W13', 'month_2026-03'
function getGoalPeriodKey(period) {
  const now = new Date();
  if (period === 'day') {
    return 'day_' + now.toISOString().slice(0, 10); // YYYY-MM-DD
  }
  if (period === 'week') {
    // ISO week: find Monday of this week
    const d = new Date(now);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
    return 'week_' + d.toISOString().slice(0, 10);
  }
  // month
  return 'month_' + now.toISOString().slice(0, 7); // YYYY-MM
}

// ── Surah completion ──────────────────────────────────────
// isSurahComplete: real-time check — has the user reached the last ayah?
// Used to TRIGGER completion. Don't use for goal counting.
function isSurahComplete(surahNum) {
  const meta = getSurahMeta(surahNum);
  if (!meta) return false;
  return loadLastAyah(surahNum) >= meta.ayahs;
}

// getCompletedSurahs / getCompletedSurahCount:
// Based on PERSISTENT completion timestamps — never cleared by navigation.
function getCompletedSurahs() {
  return SURAHS.filter(s => isSurahCompleted(s.num)).map(s => s.num);
}

function getCompletedSurahCount() {
  return SURAHS.filter(s => isSurahCompleted(s.num)).length;
}

// getSurahsCompletedInPeriod: for goal progress — counts completions
// whose FIRST-COMPLETION timestamp falls within [periodStart, now].
function getSurahsCompletedInPeriod(periodStart) {
  const since = periodStart.getTime();
  const now   = Date.now();
  return SURAHS.filter(s => {
    const at = getSurahCompletedAt(s.num);
    return at !== null && at >= since && at <= now;
  }).length;
}
