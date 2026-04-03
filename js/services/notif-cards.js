// ============================================================
// NOTIF CARDS — Iqra Qur'an Reader
//
// In-app notification cards shown on every app open.
// Works on ALL platforms (Android, iOS, Desktop) — no push
// permissions needed. Push notifications (when FCM arrives)
// layer on top as an enhancement.
//
// Three card types (one shown at a time, priority order):
//   1. Al-Mulk  — after Isha time, nightly
//   2. Al-Kahf  — all day Friday
//   3. Ayah of the Day — first open of the day
//
// Auto-dismiss logic:
//   Al-Mulk  — if Surah 67 already read today, skip
//   Al-Kahf  — if Surah 18 already read today, skip
//   AotD     — dismissed by user tap, stays gone for the day
//
// Prayer times: api.aladhan.com/v1/timings (free, no key)
//   Cached in localStorage for 24h.
// ============================================================

const NotifCards = {

  // ── Public: call on every app open ───────────────────────
  async init() {
    const card = await this._decideCard();
    if (!card) return;
    await this._show(card);
  },

  // ── Decide which card to show ─────────────────────────────
  async _decideCard() {
    const today     = new Date().toISOString().slice(0, 10);
    const dayOfWeek = new Date().getDay(); // 0=Sun, 5=Fri

    // ── Priority 1: Al-Mulk (after Isha, every night) ────────
    if (await this._isAfterIsha() && !this._isDismissed('mulk', today)) {
      if (!this._surahReadToday(67, today)) {
        return { type: 'mulk', today };
      }
    }

    // ── Priority 2: Al-Kahf (all day Friday) ─────────────────
    if (dayOfWeek === 5 && !this._isDismissed('kahf', today)) {
      if (!this._surahReadToday(18, today)) {
        return { type: 'kahf', today };
      }
    }

    // ── Priority 3: Ayah of the Day (first open only) ────────
    if (!this._isDismissed('aotd', today)) {
      return { type: 'aotd', today };
    }

    return null;
  },

  // ── Check if current time is after Isha ──────────────────
  async _isAfterIsha() {
    try {
      const ishaMs = await this._getIshaTime();
      if (!ishaMs) return false;
      return Date.now() >= ishaMs;
    } catch(e) {
      // Fallback: treat 21:00 as Isha if API fails
      return new Date().getHours() >= 21;
    }
  },

  // ── Fetch Isha time (cached 24h) ──────────────────────────
  async _getIshaTime() {
    const today    = new Date().toISOString().slice(0, 10);
    const cacheKey = 'notif_isha_' + today;
    const cached   = _get(cacheKey);
    if (cached) return parseInt(cached);

    const coords = await this._getCoords();
    if (!coords) return null;

    const { lat, lng } = coords;
    // Correct endpoint: /v1/timings/{unix_timestamp}?latitude=&longitude=&method=
    const ts  = Math.floor(Date.now() / 1000);
    const url = `https://api.aladhan.com/v1/timings/${ts}?latitude=${lat}&longitude=${lng}&method=2`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const json    = await res.json();
    const ishaStr = json?.data?.timings?.Isha; // e.g. "21:14"
    if (!ishaStr) return null;

    const [h, m]   = ishaStr.split(':').map(Number);
    const ishaDate = new Date();
    ishaDate.setHours(h, m, 0, 0);
    const ishaMs   = ishaDate.getTime();
    _set(cacheKey, ishaMs.toString());
    return ishaMs;
  },

  // ── Get geolocation coords (cached) ──────────────────────
  async _getCoords() {
    const cached = _get('notif_coords');
    if (cached) {
      try { return JSON.parse(cached); } catch(e) {}
    }
    if (!navigator.geolocation) return null;
    return new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          _set('notif_coords', JSON.stringify(coords));
          resolve(coords);
        },
        () => resolve(null),
        { timeout: 5000, maximumAge: 86400000 }
      );
    });
  },

  // ── Check if a surah was read today ──────────────────────
  _surahReadToday(surahNum, today) {
    const completedAt = _get('completed_at_' + surahNum);
    if (!completedAt) return false;
    return completedAt.slice(0, 10) === today;
  },

  // ── Dismissed state ───────────────────────────────────────
  _isDismissed(type, today) {
    return _get('notif_card_dismissed_' + type) === today;
  },

  _dismiss(type, today) {
    _set('notif_card_dismissed_' + type, today);
  },

  // ── Pick today's ayah (deterministic — same all day) ──────
  // Uses date as a seed so every open shows the same ayah.
  _pickTodayAyah() {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const seed  = parseInt(today) % 6236;
    const surahs = typeof SURAHS !== 'undefined' ? SURAHS : [];
    if (!surahs.length) return { surahNum: 36, ayahNum: 1 };
    let cumulative = 0;
    for (const s of surahs) {
      cumulative += s.ayahs;
      if (seed < cumulative) {
        const offset = seed - (cumulative - s.ayahs);
        return { surahNum: s.num, ayahNum: Math.max(1, offset + 1) };
      }
    }
    return { surahNum: 36, ayahNum: 1 };
  },

  // ── Fetch single ayah: Arabic + translation ───────────────
  async _fetchAyah(surahNum, ayahNum) {
    const lang       = typeof currentLang !== 'undefined' ? currentLang : 'en';
    const editionMap = { en: 'en.sahih', ur: 'ur.jalandhry', hi: 'hi.hindi' };
    const edition    = editionMap[lang] || 'en.sahih';
    const cacheKey   = 'notif_aotd_' + surahNum + '_' + ayahNum + '_' + lang;

    const cached = _get(cacheKey);
    if (cached) {
      try { return JSON.parse(cached); } catch(e) {}
    }

    try {
      const [arRes, trRes] = await Promise.all([
        fetch(`https://api.alquran.cloud/v1/ayah/${surahNum}:${ayahNum}/quran-uthmani`),
        fetch(`https://api.alquran.cloud/v1/ayah/${surahNum}:${ayahNum}/${edition}`),
      ]);
      if (!arRes.ok || !trRes.ok) return null;

      const [arJson, trJson] = await Promise.all([arRes.json(), trRes.json()]);
      const result = {
        arabic:      arJson?.data?.text || '',
        translation: trJson?.data?.text || '',
      };
      _set(cacheKey, JSON.stringify(result));
      return result;
    } catch(e) {
      return null;
    }
  },

  // ── Show the card ─────────────────────────────────────────
  async _show(card) {
    const { type, today } = card;
    const overlay = document.getElementById('notif-card-overlay');
    if (!overlay) return;

    if (type === 'aotd') {
      const picked = this._pickTodayAyah();
      this._renderLoading(overlay);
      setTimeout(() => overlay.classList.add('open'), 600);
      const ayah = await this._fetchAyah(picked.surahNum, picked.ayahNum);
      this._renderAotd(overlay, ayah, picked, today);
      return;
    }

    this._renderStatic(overlay, type, today);
    setTimeout(() => overlay.classList.add('open'), 600);
  },

  // ── Render: loading skeleton ──────────────────────────────
  _renderLoading(overlay) {
    document.getElementById('notif-card-icon').textContent      = '✦';
    document.getElementById('notif-card-arabic').textContent    = '…';
    document.getElementById('notif-card-title').textContent     = '';
    document.getElementById('notif-card-body').textContent      = '';
    document.getElementById('notif-card-go-btn').textContent    = '…';
    document.getElementById('notif-card-close-btn').textContent =
      typeof t === 'function' ? t('remove') : 'Dismiss';
  },

  // ── Render: Ayah of the Day ───────────────────────────────
  _renderAotd(overlay, ayah, picked, today) {
    const lang    = typeof currentLang !== 'undefined' ? currentLang : 'en';
    const surahs  = typeof SURAHS !== 'undefined' ? SURAHS : [];
    const meta    = surahs.find(s => s.num === picked.surahNum);
    const langIdx = lang === 'ur' ? 1 : lang === 'hi' ? 2 : 0;
    const surahName = meta ? (meta.name[langIdx] || meta.name[0]) : '';

    const titles = { en: 'Ayah of the Day', ur: 'آج کی آیت',    hi: 'आज की आयत'  };
    const labels = { en: 'Go to Ayah',      ur: 'آیت پر جائیں', hi: 'आयत पर जाएं' };
    const refs   = {
      en: `— ${surahName}, Ayah ${picked.ayahNum}`,
      ur: `— ${surahName}، آیت ${picked.ayahNum}`,
      hi: `— ${surahName}, आयत ${picked.ayahNum}`,
    };

    document.getElementById('notif-card-icon').textContent   = '✦';
    document.getElementById('notif-card-arabic').textContent =
      ayah?.arabic || '';
    document.getElementById('notif-card-title').textContent  =
      titles[lang] || titles.en;

    // Show translation then surah reference on new line
    const bodyEl = document.getElementById('notif-card-body');
    if (ayah?.translation) {
      bodyEl.innerHTML =
        `<span class="notif-card-translation">${ayah.translation}</span>` +
        `<span class="notif-card-ref">${refs[lang] || refs.en}</span>`;
    } else {
      bodyEl.textContent = refs[lang] || refs.en;
    }

    const goBtn    = document.getElementById('notif-card-go-btn');
    const closeBtn = document.getElementById('notif-card-close-btn');
    goBtn.textContent    = labels[lang] || labels.en;
    closeBtn.textContent = typeof t === 'function' ? t('remove') : 'Dismiss';

    goBtn.onclick = () => {
      this._dismiss('aotd', today);
      overlay.classList.remove('open');
      showPage('reader');
      Reader.loadSurah(picked.surahNum, picked.ayahNum);
    };
    closeBtn.onclick = () => {
      this._dismiss('aotd', today);
      overlay.classList.remove('open');
    };
  },

  // ── Render: static card (Mulk / Kahf) ────────────────────
  _renderStatic(overlay, type, today) {
    const lang = typeof currentLang !== 'undefined' ? currentLang : 'en';
    const data = {
      mulk: {
        icon:   '🌙',
        arabic: 'سُورَةُ الْمُلْكِ',
        surah:  67,
        en: { title: 'Before You Sleep',  label: 'Read Al-Mulk',    body: 'The Prophet ﷺ recited Surah Al-Mulk every night before sleeping. It intercedes for its reciter in the grave.' },
        ur: { title: 'سونے سے پہلے',       label: 'الملک پڑھیں',    body: 'نبی ﷺ ہر رات سونے سے پہلے سورۃ الملک پڑھتے تھے۔ یہ قبر میں سفارش کرتی ہے۔' },
        hi: { title: 'सोने से पहले',        label: 'अल-मुल्क पढ़ें', body: 'नबी ﷺ हर रात सोने से पहले सूरह अल-मुल्क पढ़ते थे। यह क़ब्र में शफ़ाअत करती है।' },
      },
      kahf: {
        icon:   '🕌',
        arabic: 'سُورَةُ الْكَهْفِ',
        surah:  18,
        en: { title: "It's Jumu'ah",       label: 'Read Al-Kahf',    body: "Whoever reads Surah Al-Kahf on Friday, a light will shine for him between the two Fridays. \u2014 Al-Hakim" },
        ur: { title: 'جمعۃ المبارک',        label: 'الکہف پڑھیں',    body: 'جو جمعہ کو سورۃ الکہف پڑھے، اسے دو جمعوں کے درمیان نور ملتا ہے۔ — الحاکم' },
        hi: { title: 'जुमुआ मुबारक',         label: 'अल-कहफ़ पढ़ें',  body: 'जो जुमुए को सूरह अल-कहफ़ पढ़े, उसे दो जुमुओं के बीच नूर मिलता है। — अल-हाकिम' },
      },
    };

    const d   = data[type];
    const loc = d[lang] || d.en;

    document.getElementById('notif-card-icon').textContent   = d.icon;
    document.getElementById('notif-card-arabic').textContent = d.arabic;
    document.getElementById('notif-card-title').textContent  = loc.title;
    document.getElementById('notif-card-body').textContent   = loc.body;

    const goBtn    = document.getElementById('notif-card-go-btn');
    const closeBtn = document.getElementById('notif-card-close-btn');
    goBtn.textContent    = loc.label;
    closeBtn.textContent = typeof t === 'function' ? t('remove') : 'Dismiss';

    goBtn.onclick = () => {
      this._dismiss(type, today);
      overlay.classList.remove('open');
      showPage('reader');
      Reader.loadSurah(d.surah, 1);
    };
    closeBtn.onclick = () => {
      this._dismiss(type, today);
      overlay.classList.remove('open');
    };
  },
};
