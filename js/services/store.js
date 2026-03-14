// ============================================================
// STORE — Iqra Qur'an Reader
// All localStorage persistence. No Firebase.
// ============================================================

const STORE_PREFIX = 'iqra_v1_';

function _get(key)        { try { return localStorage.getItem(STORE_PREFIX + key); } catch(e) { return null; } }
function _set(key, value) { try { localStorage.setItem(STORE_PREFIX + key, value); } catch(e) {} }

function loadTheme()           { return _get('theme')        || 'dark'; }
function saveTheme(t)          { _set('theme', t); }

function loadArabicSize()      { return _get('arabic_size')  || 'md'; }
function saveArabicSize(s)     { _set('arabic_size', s); }

function loadTransSize()       { return _get('trans_size')   || 'md'; }
function saveTransSize(s)      { _set('trans_size', s); }

function loadLang()            { return _get('lang')         || 'en'; }
function saveLang(l)           { _set('lang', l); }

function loadLastSurah()       { return parseInt(_get('last_surah')) || 1; }
function saveLastSurah(n)      { _set('last_surah', n); }

function loadLastAyah(surahNum) {
  return parseInt(_get('last_ayah_' + (surahNum || 1))) || 1;
}
function saveLastAyah(surahNum, ayahNum) {
  _set('last_ayah_' + surahNum, ayahNum);
}

function loadLastPage()        { return _get('last_page') || 'overview'; }
function saveLastPage(p)       { _set('last_page', p); }
