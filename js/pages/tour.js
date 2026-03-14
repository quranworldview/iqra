// ============================================================
// TOUR — Iqra Qur'an Reader
// 7-step slideshow modal. Auto-shows on first visit (skippable).
// Accessible anytime via ⓘ button in settings panel.
//
// Storage: 'iqra_v1_tour_seen' in localStorage via store.js
// ============================================================

const TOUR_STEPS = [
  {
    icon: '📖',
    titleEn: 'Welcome to Iqra',
    titleUr: 'اِقرَا میں خوش آمدید',
    titleHi: 'इक़रा में ख़ुश आमदीद',
    bodyEn:  'Iqra is your personal Qur\'an reader — beautiful Arabic text, translation in three languages, and recitation by Mishary Rashid Al-Afasy. This quick tour will show you everything.',
    bodyUr:  'اِقرَا آپ کا ذاتی قرآن ریڈر ہے — خوبصورت عربی متن، تین زبانوں میں ترجمہ، اور مشاری راشد العفاسی کی تلاوت۔ یہ مختصر گائیڈ آپ کو سب کچھ دکھائے گی۔',
    bodyHi:  'इक़रा आपका निजी क़ुरआन रीडर है — ख़ूबसूरत अरबी टेक्स्ट, तीन भाषाओं में तर्जुमा, और मिशारी राशिद अल-अफ़सी की तिलावत। यह छोटी गाइड आपको सब कुछ दिखाएगी।',
  },
  {
    icon: '🕌',
    titleEn: 'The Overview',
    titleUr: 'جائزہ صفحہ',
    titleHi: 'ओवरव्यू पेज',
    bodyEn:  'The Overview shows all 114 Surahs of the Qur\'an as tiles. Each tile shows the Surah name in Arabic and English, whether it is Makkan or Madinan, and the number of ayahs. Tap any tile to open that Surah.',
    bodyUr:  'جائزہ صفحہ قرآن کی تمام ۱۱۴ سورتیں دکھاتا ہے۔ ہر ٹائل پر سورت کا نام عربی اور اردو میں، مکی یا مدنی ہونا، اور آیات کی تعداد ہوتی ہے۔ کوئی بھی ٹائل دبائیں تو وہ سورت کھل جائے گی۔',
    bodyHi:  'ओवरव्यू पेज क़ुरआन की सभी ११४ सूरहें दिखाता है। हर टाइल पर सूरह का नाम अरबी और हिंदी में, मक्की या मदनी होना, और आयात की तादाद होती है। किसी भी टाइल पर टैप करें तो वह सूरह खुल जाएगी।',
  },
  {
    icon: '📂',
    titleEn: 'Opening a Surah',
    titleUr: 'سورۃ کھولنا',
    titleHi: 'सूरह खोलना',
    bodyEn:  'Tap the Surah name in the top bar at any time to open the Surah selector. You can search by name or number. You can also jump to a specific Ayah number using the "Go to Ayah" box at the top of the selector.',
    bodyUr:  'اوپر کی پٹی میں سورت کے نام پر کسی بھی وقت دبائیں تو سورت منتخب کرنے کی اسکرین کھل جائے گی۔ نام یا نمبر سے تلاش کریں۔ اوپر "آیت پر جائیں" باکس میں آیت نمبر لکھ کر سیدھے اس آیت پر جا سکتے ہیں۔',
    bodyHi:  'ऊपर की पट्टी में सूरह के नाम पर कभी भी टैप करें तो सूरह सलेक्टर खुल जाएगा। नाम या नंबर से खोजें। ऊपर "आयत पर जाएं" बॉक्स में आयत नंबर लिखकर सीधे उस आयत पर जा सकते हैं।',
  },
  {
    icon: '▶',
    titleEn: 'Playing Recitation',
    titleUr: 'تلاوت سننا',
    titleHi: 'तिलावत सुनना',
    bodyEn:  'Press the Play button at the bottom to hear the full Surah recited from beginning to end. The current ayah is highlighted in gold and the screen scrolls to keep it in view. Press Pause to stop at any time.',
    bodyUr:  'نیچے پلے بٹن دبائیں تو پوری سورت شروع سے آخر تک سنائی دے گی۔ جو آیت چل رہی ہے وہ سونے کے رنگ میں نمایاں ہوگی اور اسکرین خود بخود اس کی طرف جائے گی۔ روکنے کے لیے پاز بٹن دبائیں۔',
    bodyHi:  'नीचे Play बटन दबाएं तो पूरी सूरह शुरू से आख़िर तक सुनाई देगी। जो आयत चल रही है वह सुनहरे रंग में नुमायाँ होगी और स्क्रीन ख़ुद-ब-ख़ुद उसकी तरफ़ जाएगी। रोकने के लिए Pause बटन दबाएं।',
  },
  {
    icon: '☝',
    titleEn: 'Playing One Ayah',
    titleUr: 'ایک آیت سننا',
    titleHi: 'एक आयत सुनना',
    bodyEn:  'To hear just one Ayah, tap the circular number on the left side of any Ayah. It will play that Ayah only and then stop. This is perfect for repetition and memorisation.',
    bodyUr:  'صرف ایک آیت سننے کے لیے، اس آیت کے بائیں جانب گول نمبر پر دبائیں۔ صرف وہی آیت چلے گی اور رک جائے گی۔ یہ دہرانے اور حفظ کرنے کے لیے بہت مفید ہے۔',
    bodyHi:  'सिर्फ़ एक आयत सुनने के लिए, उस आयत के बाईं तरफ़ गोल नंबर पर टैप करें। सिर्फ़ वही आयत चलेगी और रुक जाएगी। यह दोहराने और हिफ़्ज़ के लिए बहुत मुफ़ीद है।',
  },
  {
    icon: 'Aa',
    titleEn: 'Text Size',
    titleUr: 'متن کا حجم',
    titleHi: 'टेक्स्ट साइज़',
    bodyEn:  'Open Settings (the gear icon ⚙ in the top right) to change text size. Arabic text and translation text have separate size controls — from XS to 2XL. Choose the size that is most comfortable for your eyes.',
    bodyUr:  'ترتیبات کھولیں (اوپر دائیں طرف ⚙ آئیکن) تاکہ متن کا حجم بدل سکیں۔ عربی متن اور ترجمے کا حجم الگ الگ کنٹرول ہوتا ہے — XS سے 2XL تک۔ وہ حجم چنیں جو آنکھوں کو آرام دہ ہو۔',
    bodyHi:  'सेटिंग्ज़ खोलें (ऊपर दाईं तरफ़ ⚙ आइकन) ताकि टेक्स्ट साइज़ बदल सकें। अरबी टेक्स्ट और तर्जुमे का साइज़ अलग-अलग कंट्रोल होता है — XS से 2XL तक। वह साइज़ चुनें जो आँखों को आरामदेह हो।',
  },
  {
    icon: '🌐',
    titleEn: 'Language',
    titleUr: 'زبان',
    titleHi: 'भाषा',
    bodyEn:  'Open Settings to switch the translation language between English, Urdu, and Hindi. The Arabic text always remains in Uthmanic script. Your language choice is saved automatically for next time.',
    bodyUr:  'ترتیبات کھولیں تاکہ ترجمے کی زبان انگریزی، اردو یا ہندی میں بدل سکیں۔ عربی متن ہمیشہ عثمانی رسم الخط میں رہتا ہے۔ آپ کی زبان کا انتخاب اگلی بار کے لیے خودبخود محفوظ ہو جاتا ہے۔',
    bodyHi:  'सेटिंग्ज़ खोलें ताकि तर्जुमे की भाषा अंग्रेज़ी, उर्दू या हिंदी में बदल सकें। अरबी टेक्स्ट हमेशा उस्मानी रस्म-उल-ख़त में रहता है। आपकी भाषा का चुनाव अगली बार के लिए ख़ुद-ब-ख़ुद महफ़ूज़ हो जाता है।',
  },
];

const Tour = {
  currentStep: 0,

  shouldAutoShow() {
    return !_get('tour_seen');
  },

  markSeen() {
    _set('tour_seen', '1');
  },

  open() {
    this.currentStep = 0;
    this._render();
    document.getElementById('tour-modal')?.classList.add('open');
    // Close settings if open
    closeSettings();
  },

  close() {
    document.getElementById('tour-modal')?.classList.remove('open');
    this.markSeen();
  },

  next() {
    if (this.currentStep < TOUR_STEPS.length - 1) {
      this.currentStep++;
      this._render();
    } else {
      this.close();
    }
  },

  prev() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this._render();
    }
  },

  goTo(idx) {
    this.currentStep = idx;
    this._render();
  },

  _render() {
    const step     = TOUR_STEPS[this.currentStep];
    const total    = TOUR_STEPS.length;
    const isLast   = this.currentStep === total - 1;
    const langIdx  = currentLang === 'ur' ? 1 : currentLang === 'hi' ? 2 : 0;

    const title = [step.titleEn, step.titleUr, step.titleHi][langIdx];
    const body  = [step.bodyEn,  step.bodyUr,  step.bodyHi][langIdx];

    // Icon
    const iconEl = document.getElementById('tour-icon');
    if (iconEl) iconEl.textContent = step.icon;

    // Title
    const titleEl = document.getElementById('tour-title');
    if (titleEl) {
      titleEl.textContent  = title;
      titleEl.style.direction   = currentLang === 'ur' ? 'rtl' : 'ltr';
      titleEl.style.fontFamily  = currentLang === 'ur' ? "'Noto Nastaliq Urdu', serif" :
                                   currentLang === 'hi' ? "'Noto Sans Devanagari', sans-serif" : '';
    }

    // Body
    const bodyEl = document.getElementById('tour-body');
    if (bodyEl) {
      bodyEl.textContent   = body;
      bodyEl.style.direction  = currentLang === 'ur' ? 'rtl' : 'ltr';
      bodyEl.style.textAlign  = currentLang === 'ur' ? 'right' : 'left';
      bodyEl.style.fontFamily = currentLang === 'ur' ? "'Noto Nastaliq Urdu', serif" :
                                 currentLang === 'hi' ? "'Noto Sans Devanagari', sans-serif" : '';
      bodyEl.style.lineHeight = currentLang === 'ur' ? '2.4' : '1.85';
    }

    // Progress dots
    const dotsEl = document.getElementById('tour-dots');
    if (dotsEl) {
      dotsEl.innerHTML = TOUR_STEPS.map((_, i) =>
        `<button class="tour-dot ${i === this.currentStep ? 'active' : ''}"
                 onclick="Tour.goTo(${i})" aria-label="Step ${i + 1}"></button>`
      ).join('');
    }

    // Step counter
    const counterEl = document.getElementById('tour-counter');
    if (counterEl) counterEl.textContent = (this.currentStep + 1) + ' / ' + total;

    // Buttons
    const prevBtn = document.getElementById('tour-prev-btn');
    const nextBtn = document.getElementById('tour-next-btn');
    if (prevBtn) prevBtn.style.visibility = this.currentStep === 0 ? 'hidden' : 'visible';
    if (nextBtn) nextBtn.textContent = isLast
      ? (currentLang === 'ur' ? 'شروع کریں ✦' : currentLang === 'hi' ? 'शुरू करें ✦' : 'Get Started ✦')
      : (currentLang === 'ur' ? 'اگلا ←' : currentLang === 'hi' ? 'अगला →' : 'Next →');

    // Animate card
    const card = document.getElementById('tour-card');
    if (card) {
      card.style.animation = 'none';
      card.offsetHeight; // reflow
      card.style.animation = 'tourSlide 0.3s cubic-bezier(0.22, 1, 0.36, 1) both';
    }
  },
};
