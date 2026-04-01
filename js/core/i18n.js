// ============================================================
// I18N — Iqra V2
// ============================================================

const STRINGS = {
  // App
  app_name:          ['Iqra',                        'اِقرَا',                    'इक़रा'],
  app_tagline:       ['Read. Listen. Reflect.',      'پڑھیں۔ سنیں۔ سوچیں۔',     'पढ़ें। सुनें। सोचें।'],

  // Settings
  settings:          ['Settings',                    'ترتیبات',                   'सेटिंग्ज़'],
  theme:             ['Theme',                        'تھیم',                      'थीम'],
  theme_dark:        ['Dark',                        'تاریک',                     'अँधेरा'],
  theme_light:       ['Light',                       'روشن',                      'रोशन'],
  arabic_size:       ['Arabic Size',                 'عربی حجم',                  'अरबी साइज़'],
  trans_size:        ['Translation Size',            'ترجمہ حجم',                 'तर्जुमा साइज़'],
  language:          ['Language',                    'زبان',                      'भाषा'],
  lang_en:           ['English',                     'English',                   'English'],
  lang_ur:           ['اردو',                         'اردو',                      'اردو'],
  lang_hi:           ['हिंदी',                         'हिंदी',                     'हिंदी'],
  script:            ['Script',    'رسم الخط',  'लिपि'],
  script_indopak:    ['Indo-Pak',  'ہندوپاک',   'इंडो-पाक'],
  script_uthmani:    ['Uthmani',   'عثمانی',    'उस्मानी'],
  reciter:           ['Reciter',                     'قاری',                      'क़ारी'],
  reading_mode:      ['Reading Mode',                'پڑھنے کا موڈ',               'पढ़ने का मोड'],
  reading_mode_on:   ['On',                          'آن',                        'चालू'],
  reading_mode_off:  ['Off',                         'آف',                        'बंद'],
  offline_cache:     ['Offline Cache',               'آف لائن کیش',               'ऑफ़लाइन कैश'],
  download_all:      ['Download All Surahs',         'تمام سورتیں ڈاؤنلوڈ کریں', 'सभी सूरहें डाउनलोड करें'],
  surahs_cached:     ['surahs saved',                'سورتیں محفوظ',              'सूरहें सेव'],
  all_cached:        ['All 114 surahs saved ✓',      'تمام ۱۱۴ سورتیں محفوظ ✓', 'सभी ११४ सूरहें सेव ✓'],
  download_complete: ['Download complete!',          'ڈاؤنلوڈ مکمل!',             'डाउनलोड पूरा!'],
  download_failed:   ['Download failed. Try again.', 'ڈاؤنلوڈ ناکام۔ دوبارہ کوشش کریں۔','डाउनलोड नाकाम। दोबारा कोशिश करें।'],

  // Navigation
  overview:          ['Overview',                    'جائزہ',                     'जायज़ा'],
  reader:            ['Reader',                      'قرآن',                      'क़ुरआन'],
  bookmarks:         ['Bookmarks',                   'بک مارکس',                  'बुकमार्क्स'],

  // Overview
  surah_view:        ['Surahs',                      'سورتیں',                    'सूरहें'],
  juz_view:          ['Juz',                         'پارے',                      'पारे'],
  favourites:        ['Favourites',                  'پسندیدہ',                   'पसंदीदा'],
  no_favourites:     ['No favourites yet',           'ابھی کوئی پسندیدہ نہیں',   'अभी कोई पसंदीदा नहीं'],
  no_fav_body:       ['Tap the ♡ on any Surah to add it here.', 'کسی بھی سورت کا ♡ دبائیں۔', 'किसी भी सूरह का ♡ दबाएं।'],

  // Surah selector
  select_surah:      ['Select Surah',                'سورۃ منتخب کریں',           'सूरह चुनें'],
  search_placeholder:['Search by name or number…',  'نام یا نمبر سے تلاش کریں…', 'नाम या नंबर से खोजें…'],
  goto_ayah:         ['Go to Ayah',                  'آیت پر جائیں',              'आयत पर जाएं'],
  goto_placeholder:  ['Ayah number…',               'آیت نمبر…',                 'आयत नंबर…'],
  ayahs:             ['ayahs',                       'آیات',                      'आयात'],
  makkan:            ['Makkan',                      'مکی',                       'मक्की'],
  madinan:           ['Madinan',                     'مدنی',                      'मदनी'],

  // Reader
  play_surah:        ['Play Surah',                  'سورۃ سنیں',                 'सूरह सुनें'],
  pause:             ['Pause',                       'رکیں',                      'रुकें'],
  ayah_label:        ['Ayah',                        'آیت',                       'आयत'],
  sajdah:            ['Sajdah',                      'سجدہ',                      'सज्दा'],
  juz_label:         ['Juz',                         'پارہ',                      'पारा'],

  // Bookmarks
  no_bookmarks:      ['No bookmarks yet',            'ابھی کوئی بک مارک نہیں',   'अभी कोई बुकमार्क नहीं'],
  no_bookmarks_body: ['Long-press any Ayah to bookmark it.', 'کسی بھی آیت کو لمبا دبائیں۔', 'किसी भी आयत को देर तक दबाएं।'],
  bookmark_saved:    ['Bookmark saved',              'بک مارک محفوظ',             'बुकमार्क सेव'],
  bookmark_note:     ['Add a note… (optional)',      'نوٹ لکھیں… (اختیاری)',       'नोट लिखें… (वैकल्पिक)'],
  save_bookmark:     ['Save Bookmark',               'بک مارک محفوظ کریں',        'बुकमार्क सेव करें'],
  go_to_ayah:        ['Go to Ayah',                  'آیت پر جائیں',              'आयत पर जाएं'],
  remove:            ['Remove',                      'ہٹائیں',                    'हटाएं'],


  // Profile
  profile:           ['Profile',                    'پروفائل',                   'प्रोफ़ाइल'],
  greeting:          ['Assalamu Alaikum',            'السلام علیکم',              'अस्सलामु अलैकुम'],
  greeting_generic:  ['Assalamu Alaikum',            'السلام علیکم',              'अस्सलामु अलैकुम'],
  your_name:         ['Your Name',                   'آپ کا نام',                 'आपका नाम'],
  reading_goal:      ['Reading Goal',                'مطالعہ ہدف',                'पढ़ने का लक्ष्य'],
  surahs_goal:       ['surahs',                      'سورتیں',                    'सूरहें'],
  surahs_read:       ['Read',                        'پڑھی',                      'पढ़ीं'],
  no_goal_set:       ['No goal set',                 'کوئی ہدف نہیں',             'कोई लक्ष्य नहीं'],
  per_day:           ['per day',                     'روزانہ',                    'प्रति दिन'],
  per_week:          ['per week',                    'ہفتہ وار',                  'प्रति सप्ताह'],
  per_month:         ['per month',                   'ماہانہ',                    'प्रति माह'],
  period_day:        ['per day',                     'روزانہ',                    'प्रति दिन'],
  period_week:       ['per week',                    'ہفتہ وار',                  'प्रति सप्ताह'],
  period_month:      ['per month',                   'ماہانہ',                    'प्रति माह'],
  streak:            ['Streak',                      'سلسلہ',                     'स्ट्रीक'],
  streak_longest:    ['Best Streak',                 'بہترین سلسلہ',              'सर्वश्रेष्ठ स्ट्रीक'],
  days:              ['days',                        'دن',                        'दिन'],
  profile_saved:     ['Profile saved ✓',             'پروفائل محفوظ ✓',           'प्रोफ़ाइल सेव ✓'],
  goal_saved:        ['Goal saved ✓',                'ہدف محفوظ ✓',               'लक्ष्य सेव ✓'],
  save:              ['Save',                        'محفوظ کریں',                'सेव करें'],

  // Achievements
  achievements:      ['Achievements',               'اعزازات',                   'उपलब्धियां'],
  ach_streak_7:      ['7-Day Streak',               '۷ روزہ سلسلہ',              '७-दिन स्ट्रीक'],
  ach_kahf:          ['Al-Kahf Complete',            'الکہف مکمل',                'अल-कहफ़ पूरा'],
  ach_mulk:          ['Al-Mulk Complete',            'الملک مکمل',                'अल-मुल्क पूरा'],
  ach_surahs_10:     ['10 Surahs Read',              '۱۰ سورتیں پڑھیں',           '१० सूरहें पढ़ीं'],
  ach_goal_met:      ['Monthly Goal! 🏅',            'ماہانہ ہدف! 🏅',            'मासिक लक्ष्य! 🏅'],

  // Celebration modal
  celeb_unlocked:       ['Achievement Unlocked',         'کامیابی حاصل کی',           'उपलब्धि अनलॉक'],
  celeb_goal_label:     ['Goal Reached',                 'ہدف حاصل کر لیا',           'लक्ष्य प्राप्त'],
  celeb_btn:            ['Alhamdulillah ✓',              'الحمد للہ ✓',               'अलहम्दुलिल्लाह ✓'],
  celeb_sub_streak_7:   ['7 days of consistent reading — may Allah keep you steadfast.',
                         '۷ دن کی مسلسل تلاوت — اللہ آپ کو ثابت قدم رکھے۔',
                         '७ दिन की निरंतर तिलावत — अल्लाह आपको स्थिर रखे।'],
  celeb_sub_kahf:       ['You completed Surah Al-Kahf — a light between the two Fridays.',
                         'آپ نے سورۃ الکہف مکمل کی — دو جمعوں کے درمیان نور۔',
                         'आपने सूरह अल-कहफ़ पूरी की — दो जुमों के बीच की रोशनी।'],
  celeb_sub_mulk:       ['You completed Surah Al-Mulk — the protector in the grave.',
                         'آپ نے سورۃ الملک مکمل کی — قبر کی حفاظت کرنے والی۔',
                         'आपने सूरह अल-मुल्क पूरी की — क़ब्र की हिफ़ाज़त करने वाली।'],
  celeb_sub_surahs_10:  ['10 surahs completed. You are building a beautiful relationship with the Qur\'an.',
                         '۱۰ سورتیں مکمل۔ آپ قرآن سے خوبصورت تعلق بنا رہے ہیں۔',
                         '१० सूरतें पूरी। आप क़ुरआन से खूबसूरत रिश्ता बना रहे हैं।'],
  celeb_sub_goal_met:   ['You hit your reading goal this period. Keep going — every ayah counts.',
                         'آپ نے اس مدت میں اپنا ہدف پورا کیا۔ جاری رکھیں — ہر آیت اہم ہے۔',
                         'आपने इस अवधि में अपना लक्ष्य पूरा किया। जारी रखें — हर आयत मायने रखती है।'],

  // Setup modal
  setup_title:       ['Welcome to Iqra',             'اِقرَا میں خوش آمدید',      'इक़रा में आपका स्वागत'],
  setup_sub:         ['Let\'s personalise your experience', 'آپ کا تجربہ ذاتی بنائیں', 'अपना अनुभव व्यक्तिगत बनाएं'],
  setup_name_hint:   ['e.g. Fatima',                 'مثلاً فاطمہ',               'जैसे फ़ातिमा'],
  setup_goal_label:  ['I want to read',              'میں پڑھنا چاہتا/چاہتی ہوں', 'मैं पढ़ना चाहता/चाहती हूं'],
  setup_btn:         ['Get Started',                 'شروع کریں',                 'शुरू करें'],
  setup_skip:        ['Skip for now',                'ابھی چھوڑیں',               'अभी छोड़ें'],

  // Notifications
  notifications:       ['Notifications',              'اطلاعات',                   'नोटिफ़िकेशन'],
  notif_active:        ['Active ✓',                   'فعال ✓',                    'सक्रिय ✓'],
  notif_off:           ['Off — tap to enable',        'بند — فعال کرنے کے لیے دبائیں','बंद — चालू करने के लिए टैप करें'],
  notif_blocked:       ['Blocked in browser settings','براؤزر میں بند ہے',          'ब्राउज़र में बंद है'],
  notif_not_supported: ['Not supported on this device','اس ڈیوائس پر دستیاب نہیں',  'इस डिवाइस पर उपलब्ध नहीं'],
  notif_enabled:       ['Notifications enabled ✓',    'اطلاعات فعال ✓',            'नोटिफ़िकेशन चालू ✓'],

  // Permission prompt
  notif_prompt_title:  ['Stay Connected to the Qur\u2019an', 'قرآن سے جڑے رہیں',  'क़ुरआन से जुड़े रहें'],
  notif_prompt_sub:    ['Daily reminders to read, reflect and recite', 'پڑھنے، سوچنے اور تلاوت کے لیے روزانہ یاد دہانی', 'पढ़ने, सोचने और तिलावत के लिए रोज़ाना याद दहानी'],
  notif_prompt_aotd:   ['🌅 Ayah of the Day — a random ayah every morning', '🌅 آج کی آیت — ہر صبح ایک آیت', '🌅 आज की आयत — हर सुबह एक आयत'],
  notif_prompt_kahf:   ["🕌 Friday Reminder — Surah Al-Kahf on Jumu'ah", "🕌 جمعہ یاد دہانی — جمعے کو سورۃ الکہف", '🕌 जुमुआ याद दहानी — जुमे को सूरह अल-कहफ़'],
  notif_prompt_mulk:   ['🌙 Nightly Reminder — Surah Al-Mulk before sleep', '🌙 رات کی یاد دہانی — سونے سے پہلے سورۃ الملک', '🌙 रात की याद दहानी — सोने से पहले सूरह अल-मुल्क'],
  notif_enable_btn:    ['Enable Notifications',       'اطلاعات فعال کریں',         'नोटिफ़िकेशन चालू करें'],
  notif_later_btn:     ['Maybe Later',               'بعد میں',                   'बाद में'],

  // Notification settings labels
  notif_aotd_label:    ['Ayah of the Day',            'آج کی آیت',                 'आज की आयत'],
  notif_kahf_label:    ["Friday Al-Kahf",             'جمعہ — الکہف',              'जुमुआ — अल-कहफ़'],
  notif_mulk_label:    ['Nightly Al-Mulk',            'رات — الملک',               'रात — अल-मुल्क'],
  notif_time_label:    ['Time',                       'وقت',                       'समय'],

  // Status
  loading:           ['Loading…',                    'لوڈ ہو رہا ہے…',            'लोड हो रहा है…'],
  error_load:        ['Could not load surah. Check your connection.', 'سورۃ لوڈ نہیں ہوئی۔ انٹرنیٹ چیک کریں۔', 'सूरह लोड नहीं हुई। इंटरनेट चेक करें।'],
  retry:             ['Retry',                       'دوبارہ کوشش کریں',          'दोबारा कोशिश करें'],

  // ── Auth strings ──────────────────────────────────────────
  guest_banner:      ['Sign in to sync your progress & enable notifications',
                      'پیشرفت sync کرنے کے لیے سائن ان کریں',
                      'प्रगति sync करने के लिए साइन इन करें'],
  guest_sign_in:     ['Sign In',         'سائن ان',      'साइन इन करें'],
  sign_out:          ['Sign Out',        'سائن آؤٹ',     'साइन आउट'],
  signed_in_as:      ['Signed in as',    'سائن ان بحیثیت', 'इस रूप में साइन इन'],
  synced:            ['Progress synced ✓', 'sync ہو گیا ✓', 'sync हो गया ✓'],
  signin_success:    ['Welcome back 🌿', 'خوش آمدید 🌿',  'वापसी मुबारक 🌿'],
  signout_success:   ['Signed out',      'سائن آؤٹ',     'साइन आउट हो गए'],
  auth_signin_title: ['Sign In to Iqra', 'اِقرَا میں سائن ان', 'इक़रा में साइन इन'],
  auth_signin_btn:   ['Sign In',         'سائن ان',      'साइन इन करें'],
  auth_signing_in:   ['Signing in…',     'سائن ان ہو رہا ہے…', 'साइन इन हो रहा है…'],
  auth_forgot:       ['Forgot password?', 'پاسورڈ بھول گئے؟', 'पासवर्ड भूल गए?'],
  auth_reset_title:  ['Reset Password',  'پاسورڈ ری سیٹ', 'पासवर्ड रीसेट'],
  auth_reset_btn:    ['Send Reset Link', 'ری سیٹ لنک بھیجیں', 'रीसेट लिंक भेजें'],
  auth_sending:      ['Sending…',        'بھیج رہے ہیں…', 'भेज रहे हैं…'],
  auth_reset_sent:   ['Check your email for the reset link',
                      'ری سیٹ لنک کے لیے ای میل چیک کریں',
                      'रीसेट लिंक के लिए ईमेल चेक करें'],
  auth_back_signin:  ['Back to Sign In', 'سائن ان پر واپس', 'साइन इन पर वापस'],
  auth_fill_all:     ['Please enter email and password',
                      'ای میل اور پاسورڈ درج کریں',
                      'ईमेल और पासवर्ड दर्ज करें'],
  auth_fill_email:   ['Please enter your email', 'ای میل درج کریں', 'ईमेल दर्ज करें'],
  auth_err_no_user:  ['No account found with this email',
                      'اس ای میل سے کوئی اکاؤنٹ نہیں ملا',
                      'इस ईमेल से कोई अकाउंट नहीं मिला'],
  auth_err_wrong_pw: ['Incorrect password', 'غلط پاسورڈ', 'गलत पासवर्ड'],
  auth_err_bad_email:['Invalid email address', 'غلط ای میل', 'गलत ईमेल'],
  auth_err_too_many: ['Too many attempts — try again later',
                      'بہت زیادہ کوششیں — بعد میں کوشش کریں',
                      'बहुत प्रयास — बाद में कोशिश करें'],
  auth_err_network:  ['Network error — check your connection',
                      'نیٹ ورک خرابی — کنکشن چیک کریں',
                      'नेटवर्क एरर — कनेक्शन चेक करें'],
  // ── Khatm + tile progress ─────────────────────────────────
  ach_quran_complete: ['Khatm ul Quran 📖', 'ختم القرآن 📖', 'ख़तम القرآن 📖'],

  auth_err_generic:  ['Something went wrong — please try again',
                      'کچھ غلط ہو گیا — دوبارہ کوشش کریں',
                      'कुछ गलत हुआ — दोबारा कोशिश करें'],
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
  if (typeof Overview !== 'undefined') Overview.render();
  if (typeof Bookmarks !== 'undefined') Bookmarks.render();
}

function initI18n() {
  currentLang = loadLang();
  document.documentElement.setAttribute('data-lang', currentLang);
  updateI18n();
  document.querySelectorAll('[data-lang-btn]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang-btn') === currentLang);
  });
}
