// ============================================================
// QURAN API — Qur'an Reader
//
// Arabic text:  Quran.com API v4 — does NOT prepend Bismillah
//               to Ayah 1. Bismillah is handled as a UI ornament
//               by reader.js using the hasBismillah flag in surahs.js.
//               This exactly mirrors how Miftah handles it.
//
// Translations: AlQuran.cloud — named edition identifiers,
//               zero positional-index ambiguity.
//               ur.jalandhry  = Urdu  (Nastaliq)
//               hi.hindi      = Hindi (Devanagari)
//               en.sahih      = English (Saheeh International)
//
// Audio:        everyayah.com — Mishary Rashid Al-Afasy (128kbps)
//
// All Arabic text passes through _sanitiseArabic() — prevents
// dotted-circle artifacts from Uthmanic combining marks.
// ============================================================

const _cache = {};

// ── Arabic sanitiser (from Miftah's DataService) ──────────
function _sanitiseArabic(text) {
  if (!text) return '';
  return text.replace(/[\u06DF\u06E0\u06E2\u06ED]/g, '');
}

// ── Fetch Arabic from Quran.com ───────────────────────────
// Uses text_uthmani field — clean Uthmanic script, no Bismillah prefix.
async function _fetchArabic(surahNum) {
  const url = 'https://api.quran.com/api/v4/verses/by_chapter/' + surahNum +
    '?language=en&words=false&fields=text_uthmani&per_page=300&page=1';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Quran.com Arabic fetch error: ' + res.status);
  const data = await res.json();
  // Map: verseNumber → sanitised Arabic text
  const map = {};
  (data.verses || []).forEach(v => {
    map[v.verse_number] = _sanitiseArabic(v.text_uthmani || '');
  });
  return map;
}

// ── Fetch one translation from AlQuran.cloud ──────────────
async function _fetchTranslation(surahNum, edition) {
  const url = 'https://api.alquran.cloud/v1/surah/' + surahNum + '/' + edition;
  const res = await fetch(url);
  if (!res.ok) throw new Error('AlQuran.cloud error (' + edition + '): ' + res.status);
  const data = await res.json();
  // Map: numberInSurah → translation text
  const map = {};
  (data.data?.ayahs || []).forEach(a => { map[a.numberInSurah] = a.text || ''; });
  return map;
}

// ── Primary fetch ─────────────────────────────────────────
// Arabic from Quran.com + all 3 translations from AlQuran.cloud
// All run in parallel. All mapped by ayah number — no index ordering.
async function _fetchPrimary(surahNum) {
  const [arabicMap, enMap, urMap, hiMap] = await Promise.all([
    _fetchArabic(surahNum),
    _fetchTranslation(surahNum, 'en.sahih'),
    _fetchTranslation(surahNum, 'ur.jalandhry'),
    _fetchTranslation(surahNum, 'hi.hindi'),
  ]);

  // Use Arabic map keys as the canonical ayah list
  return Object.keys(arabicMap).map(num => {
    const n = parseInt(num);
    return {
      num:            n,
      arabic:         arabicMap[n],
      translation_en: enMap[n]  || '',
      translation_ur: urMap[n]  || '',
      translation_hi: hiMap[n]  || '',
    };
  }).sort((a, b) => a.num - b.num);
}

// ── Fallback: AlQuran.cloud for Arabic too ────────────────
// Only used if Quran.com AND AlQuran.cloud translations both fail.
// AlQuran.cloud DOES prepend Bismillah to Ayah 1 for most surahs,
// so we strip it here using the hasBismillah flag from surahs.js.
async function _fetchFallback(surahNum) {
  const [arMap, enMap, urMap, hiMap] = await Promise.all([
    _fetchTranslation(surahNum, 'quran-uthmani'),
    _fetchTranslation(surahNum, 'en.sahih'),
    _fetchTranslation(surahNum, 'ur.jalandhry'),
    _fetchTranslation(surahNum, 'hi.hindi'),
  ]);

  const meta = getSurahMeta(surahNum);

  return Object.keys(arMap).map(num => {
    const n = parseInt(num);
    let arabic = _sanitiseArabic(arMap[n] || '');

    // Strip prepended Bismillah from Ayah 1 if AlQuran.cloud added it.
    // Al-Fatiha (hasBismillah:false) keeps it — it IS Ayah 1.
    // At-Tawbah (hasBismillah:false) has none — nothing to strip.
    if (n === 1 && meta.bismillah) {
      // AlQuran.cloud prepends "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ " to Ayah 1
      // Remove it by splitting on the first space after the Bismillah cluster
      const BISM_PATTERN = /^بِسْمِ\s+ٱللَّهِ\s+ٱلرَّحْمَٰنِ\s+ٱلرَّحِيمِ\s*/;
      arabic = arabic.replace(BISM_PATTERN, '').trim();
    }

    return {
      num:            n,
      arabic:         arabic,
      translation_en: enMap[n]  || '',
      translation_ur: urMap[n]  || '',
      translation_hi: hiMap[n]  || '',
    };
  }).sort((a, b) => a.num - b.num);
}

// ── Public API ────────────────────────────────────────────

async function fetchSurah(surahNum) {
  if (_cache[surahNum]) return _cache[surahNum];

  let ayahs;
  try {
    ayahs = await _fetchPrimary(surahNum);
  } catch (err) {
    console.warn('Primary fetch failed, trying fallback:', err.message);
    try {
      ayahs = await _fetchFallback(surahNum);
    } catch (fallbackErr) {
      console.error('Both fetch strategies failed:', fallbackErr.message);
      throw new Error('Could not load surah ' + surahNum + '. Please check your connection.');
    }
  }

  _cache[surahNum] = ayahs;
  return ayahs;
}

function getAudioUrl(surahNum, ayahNum) {
  const s = String(surahNum).padStart(3, '0');
  const a = String(ayahNum).padStart(3, '0');
  return 'https://everyayah.com/data/Alafasy_128kbps/' + s + a + '.mp3';
}

function prefetchSurah(surahNum) {
  if (surahNum >= 1 && surahNum <= 114 && !_cache[surahNum]) {
    fetchSurah(surahNum).catch(() => {});
  }
}
