// ============================================================
// NOTIF CARDS — Iqra Qur'an Reader
//
// In-app notification cards shown on every app open.
// Works on ALL platforms (Android, iOS, Desktop) — no push
// permissions needed. Push notifications (when FCM arrives)
// layer on top of this as an enhancement.
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
// Prayer times: api.aladhan.com (free, no key needed)
//   Cached in localStorage for 24h to avoid repeat calls.
// ============================================================

const NotifCards = {

  // ── Public: call on every app open ───────────────────────
  async init() {
    const card = await this._decideCard();
    if (!card) return;
    this._show(card);
  },

  // ── Decide which card to show ─────────────────────────────
  async _decideCard() {
    const today    = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const dayOfWeek = new Date().getDay(); // 0=Sun, 5=Fri

    // ── Priority 1: Al-Mulk (after Isha, every night) ────────
    if (await this._isAfterIsha() && !this._isDismissed('mulk', today)) {
      // Skip if Surah 67 already read today
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
      const now = new Date();
      return now.getHours() >= 21;
    }
  },

  // ── Fetch Isha time (cached 24h) ──────────────────────────
  async _getIshaTime() {
    const today     = new Date().toISOString().slice(0, 10);
    const cacheKey  = 'notif_isha_' + today;
    const cached    = _get(cacheKey);
    if (cached) return parseInt(cached);

    // Get coords — stored from previous fetch or from browser
    const coords = await this._getCoords();
    if (!coords) return null;

    const { lat, lng } = coords;
    const url = `https://api.aladhan.com/v1/timingsByCity?latitude=${lat}&longitude=${lng}&method=2`;
    const res  = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const ishaStr = json?.data?.timings?.Isha; // e.g. "21:14"
    if (!ishaStr) return null;

    // Convert to today's epoch ms
    const [h, m]   = ishaStr.split(':').map(Number);
    const ishaDate = new Date();
    ishaDate.setHours(h, m, 0, 0);
    const ishaMs = ishaDate.getTime();

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
        { timeout: 5000, maximumAge: 86400000 } // 24h cache
      );
    });
  },

  // ── Check if a surah was read today ──────────────────────
  // Uses completed_at_{surahNum} in localStorage — set by store.js
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

  // ── Build card content per type ───────────────────────────
  _buildContent(type) {
    const lang = loadLang ? loadLang() : (currentLang || 'en');

    const content = {
      mulk: {
        icon:     '🌙',
        arabic:   'سُورَةُ الْمُلْكِ',
        en: { title: 'Before You Sleep',        body: 'The Prophet ﷺ would recite Surah Al-Mulk every night before sleeping. It intercedes for its reciter in the grave.',  surah: 67, label: 'Read Al-Mulk' },
        ur: { title: 'سونے سے پہلے',             body: 'نبی ﷺ ہر رات سونے سے پہلے سورۃ الملک پڑھتے تھے۔ یہ قبر میں سفارش کرتی ہے۔',                                       surah: 67, label: 'الملک پڑھیں' },
        hi: { title: 'सोने से पहले',              body: 'नबी ﷺ हर रात सोने से पहले सूरह अल-मुल्क पढ़ते थे। यह क़ब्र में शफ़ाअत करती है।',                                  surah: 67, label: 'अल-मुल्क पढ़ें' },
      },
      kahf: {
        icon:     '🕌',
        arabic:   'سُورَةُ الْكَهْفِ',
        en: { title: "It's Jumu'ah",             body: 'Whoever reads Surah Al-Kahf on Friday, a light will shine for him between the two Fridays. — Hadith (Al-Hakim)',       surah: 18, label: 'Read Al-Kahf' },
        ur: { title: 'جمعۃ المبارک',              body: 'جو شخص جمعہ کے دن سورۃ الکہف پڑھے، اسے دو جمعوں کے درمیان نور ملتا ہے۔ — حدیث (الحاکم)',                          surah: 18, label: 'الکہف پڑھیں' },
        hi: { title: 'जुमुआ मुबारक',               body: 'जो शुक्रवार को सूरह अल-कहफ़ पढ़े, उसे दो जुमुओं के बीच नूर मिलता है। — हदीस (अल-हाकिम)',                         surah: 18, label: 'अल-कहफ़ पढ़ें' },
      },
      aotd: {
        icon:     '✦',
        arabic:   'آيَةُ الْيَوْمِ',
        en: { title: 'Ayah of the Day',          body: 'Begin your reading with today\'s Ayah. Let it settle before you move on.',                                              surah: null, label: 'Go to Ayah' },
        ur: { title: 'آج کی آیت',                 body: 'آج کی آیت سے اپنی تلاوت شروع کریں۔ پہلے اسے دل میں اتاریں۔',                                                       surah: null, label: 'آیت پر جائیں' },
        hi: { title: 'आज की आयत',                 body: 'आज की आयत से अपनी तिलावत शुरू करें। पहले इसे दिल में उतारें।',                                                       surah: null, label: 'आयत पर जाएं' },
      },
    };

    const c    = content[type];
    const loc  = c[lang] || c.en;
    return { icon: c.icon, arabic: c.arabic, ...loc };
  },

  // ── Render and show the card ──────────────────────────────
  _show(card) {
    const { type, today } = card;
    const c = this._buildContent(type);

    const overlay = document.getElementById('notif-card-overlay');
    const icon    = document.getElementById('notif-card-icon');
    const arabic  = document.getElementById('notif-card-arabic');
    const title   = document.getElementById('notif-card-title');
    const body    = document.getElementById('notif-card-body');
    const goBtn   = document.getElementById('notif-card-go-btn');
    const closeBtn = document.getElementById('notif-card-close-btn');

    if (!overlay) return;

    icon.textContent   = c.icon;
    arabic.textContent = c.arabic;
    title.textContent  = c.title;
    body.textContent   = c.body;
    goBtn.textContent  = c.label;

    // Go button — navigate to surah or AotD
    goBtn.onclick = () => {
      this._dismiss(type, today);
      overlay.classList.remove('open');
      if (c.surah) {
        showPage('reader');
        Reader.loadSurah(c.surah, 1);
      } else {
        // AotD — navigate to a random meaningful ayah
        showPage('reader');
        const picked = Notifications._pickRandomAyah?.() || { surahNum: 36, ayahNum: 1 };
        Reader.loadSurah(picked.surahNum, picked.ayahNum);
      }
    };

    // Close / dismiss
    closeBtn.onclick = () => {
      this._dismiss(type, today);
      overlay.classList.remove('open');
    };

    // Show with slight delay so app renders first
    setTimeout(() => overlay.classList.add('open'), 600);
  },
};
