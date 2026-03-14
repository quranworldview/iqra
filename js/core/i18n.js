// ============================================================
// I18N — Iqra Qur'an Reader
// ============================================================

const STRINGS = {
  app_name:        ['Iqra',                    'اِقرَا',              'इक़रा'],
  app_tagline:     ['Read. Listen. Reflect.',  'پڑھیں۔ سنیں۔ سوچیں۔','पढ़ें। सुनें। सोचें।'],
  settings:        ['Settings',               'ترتیبات',             'सेटिंग्ज़'],
  theme:           ['Theme',                  'تھیم',                'थीम'],
  theme_dark:      ['Dark',                   'تاریک',               'अँधेरा'],
  theme_light:     ['Light',                  'روشن',                'रोशन'],
  arabic_size:     ['Arabic Size',            'عربی حجم',            'अरबी साइज़'],
  trans_size:      ['Translation Size',       'ترجمہ حجم',           'तर्जुमा साइज़'],
  language:        ['Language',              'زبان',                'भाषा'],
  lang_en:         ['English',               'English',             'English'],
  lang_ur:         ['اردو',                   'اردو',                'اردو'],
  lang_hi:         ['हिंदी',                   'हिंदी',               'हिंदी'],
  overview:        ['Overview',              'جائزہ',               'जायज़ा'],
  reader:          ['Reader',               'قاری',                'पाठक'],
  select_surah:    ['Select Surah',         'سورۃ منتخب کریں',     'सूरह चुनें'],
  search_placeholder: ['Search by name or number…', 'نام یا نمبر سے تلاش کریں…', 'नाम या नंबर से खोजें…'],
  goto_ayah:       ['Go to Ayah',           'آیت پر جائیں',        'आयत पर जाएं'],
  goto_placeholder:['Ayah number…',         'آیت نمبر…',           'आयत नंबर…'],
  ayahs:           ['ayahs',               'آیات',                'आयात'],
  makkan:          ['Makkan',              'مکی',                 'मक्की'],
  madinan:         ['Madinan',             'مدنی',                'मदनी'],
  play_surah:      ['Play Surah',          'سورۃ سنیں',           'सूरह सुनें'],
  pause:           ['Pause',              'رکیں',                'रुकें'],
  loading:         ['Loading…',           'لوڈ ہو رہا ہے…',      'लोड हो रहा है…'],
  error_load:      ['Could not load surah. Please check your connection.', 'سورۃ لوڈ نہیں ہوئی۔ انٹرنیٹ چیک کریں۔', 'सूरह लोड नहीं हुई। इंटरनेट चेक करें।'],
  retry:           ['Retry',              'دوبارہ کوشش کریں',    'दोबारा कोशिश करें'],
};

let currentLang = 'en';

function t(key) {
  const s = STRINGS[key];
  if (!s) return key;
  if (currentLang === 'ur') return s[1];
  if (currentLang === 'hi') return s[2];
  return s[0];
}

function getAyahTranslation(ayah) {
  if (currentLang === 'ur') return ayah.translation_ur || ayah.translation_en;
  if (currentLang === 'hi') return ayah.translation_hi || ayah.translation_en;
  return ayah.translation_en;
}

function updateI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
}

function setLang(lang) {
  currentLang = lang;
  document.documentElement.setAttribute('data-lang', lang);
  updateI18n();
  saveLang(lang);
  document.querySelectorAll('[data-lang-btn]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang-btn') === lang);
  });
  if (typeof Reader !== 'undefined' && Reader.state.ayahs.length) {
    Reader._refreshTranslations();
    Reader._renderSurahHeader(Reader.state.surahNum);
  }
  if (typeof Overview !== 'undefined') {
    Overview.render();
  }
}

function initI18n() {
  currentLang = loadLang();
  document.documentElement.setAttribute('data-lang', currentLang);
  updateI18n();
  document.querySelectorAll('[data-lang-btn]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang-btn') === currentLang);
  });
}
