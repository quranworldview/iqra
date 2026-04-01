// ============================================================
// NOTIFICATIONS — Iqra Qur'an Reader
//
// Three notification types:
//   1. Ayah of the Day  — daily at user-set time (default 8:00 AM)
//   2. Friday Al-Kahf   — every Friday at user-set time (default 8:00 AM)
//   3. Nightly Al-Mulk  — every night at user-set time (default 9:30 PM)
//
// Strategy: Pure Web Notifications API + SW scheduling.
// No server, no Firebase, no cost. Works reliably on Android
// PWA where the SW is kept alive by the OS.
//
// Flow:
//   App opens → Notifications.init()
//     → checks permission
//     → schedules next occurrence of each enabled notification
//     → SW receives 'SCHEDULE_NOTIFICATION' message
//     → SW uses setTimeout to fire at exact time
//     → user taps notification → app opens at correct ayah
// ============================================================

const Notifications = {

  // ── State ─────────────────────────────────────────────────
  get supported() {
    return 'Notification' in window && 'serviceWorker' in navigator;
  },

  get permission() {
    return this.supported ? Notification.permission : 'unsupported';
  },

  get isGranted() {
    return this.permission === 'granted';
  },

  // ── Init — called on every app open ───────────────────────
  async init() {
    if (!this.supported) return;

    // Track app opens for permission prompt timing
    const opens = parseInt(_get('app_opens') || '0') + 1;
    _set('app_opens', opens);

    // Show permission prompt if not yet decided and user hasn't dismissed it
    const declined = _get('notif_declined') === '1';
    if (this.permission === 'default' && opens >= 2 && !declined) {
      setTimeout(() => this.showPermissionPrompt(), 1500);
    }

    // If already granted, reschedule and refresh periodic sync registration
    if (this.isGranted) {
      await this.scheduleAll();
      await this._registerPeriodicSync();
    }

    // Update UI to reflect current state
    this.updateSettingsUI();
  },

  // ── Permission prompt ─────────────────────────────────────
  showPermissionPrompt() {
    const modal = document.getElementById('notif-permission-modal');
    if (modal) modal.classList.add('open');
  },

  hidePermissionPrompt() {
    const modal = document.getElementById('notif-permission-modal');
    if (modal) modal.classList.remove('open');
  },

  async requestPermission() {
    this.hidePermissionPrompt();
    if (!this.supported) return;

    const result = await Notification.requestPermission();
    if (result === 'granted') {
      // Enable all notifications by default on first grant
      saveNotifEnabled('aotd',   true);
      saveNotifEnabled('kahf',   true);
      saveNotifEnabled('mulk',   true);
      await this.scheduleAll();
      await this._registerPeriodicSync();
      Progress.saveNotifPrefs(); // fire-and-forget
      showToast(t('notif_enabled'));
    }
    this.updateSettingsUI();
  },

  declinePermission() {
    this.hidePermissionPrompt();
    // Dedicated flag — don't show prompt again this session/ever until permission granted
    _set('notif_declined', '1');
  },

  // ── Schedule all active notifications ─────────────────────
  async scheduleAll() {
    if (!this.isGranted) return;
    const sw = await this._getSW();
    if (!sw) return;

    if (loadNotifEnabled('aotd')) await this._scheduleAotd(sw);
    if (loadNotifEnabled('kahf')) await this._scheduleKahf(sw);
    if (loadNotifEnabled('mulk')) await this._scheduleMulk(sw);
  },

  // ── Cancel a specific notification ────────────────────────
  async cancel(type) {
    const sw = await this._getSW();
    if (!sw) return;
    sw.postMessage({ type: 'CANCEL_NOTIFICATION', notifType: type });
  },

  // ── Ayah of the Day ───────────────────────────────────────
  async _scheduleAotd(sw) {
    const time  = loadNotifTime('aotd') || '08:00';
    const next  = this._nextOccurrence(time, 'daily');
    const ayah  = this._pickRandomAyah();
    const lang  = loadLang();

    // Pass surah + ayah to SW — it will fetch the text at fire time
    // and build a rich notification with Arabic + translation.
    // Falls back gracefully to surah name + number if offline.
    sw.postMessage({
      type:        'SCHEDULE_NOTIFICATION',
      notifType:   'aotd',
      fireAt:      next,          // absolute epoch ms — survives SW restarts
      fetchAyah:   true,          // ← tells SW to fetch text at fire time
      surahNum:    ayah.surahNum,
      ayahNum:     ayah.ayahNum,
      lang:        lang,
      surahName:   ayah.surahName,
      surahNameUr: ayah.surahNameUr,
      surahNameHi: ayah.surahNameHi,
      data:        { surah: ayah.surahNum, ayah: ayah.ayahNum, url: './?notif=aotd' },
      icon:        './icons/icon-192.png',
      badge:       './icons/favicon-32.png',
    });
  },

  // ── Friday Al-Kahf ────────────────────────────────────────
  async _scheduleKahf(sw) {
    const time  = loadNotifTime('kahf') || '08:00';
    const next  = this._nextOccurrence(time, 'friday');
    const lang  = loadLang();
    const titles = {
      en: "It's Jumu'ah 🕌",
      ur: 'جمعۃ المبارک 🕌',
      hi: 'जुमुआ मुबारक 🕌',
    };
    const bodies = {
      en: 'Time for Surah Al-Kahf — tap to begin',
      ur: 'سورۃ الکہف پڑھنے کا وقت — شروع کریں',
      hi: 'सूरह अल-कहफ़ पढ़ने का वक़्त — शुरू करें',
    };

    sw.postMessage({
      type:      'SCHEDULE_NOTIFICATION',
      notifType: 'kahf',
      fireAt:    next,            // absolute epoch ms — survives SW restarts
      title:     titles[lang] || titles.en,
      body:      bodies[lang] || bodies.en,
      data:      { surah: 18, ayah: 1, url: './?notif=kahf' },
      icon:      './icons/icon-192.png',
      badge:     './icons/favicon-32.png',
    });
  },

  // ── Nightly Al-Mulk ───────────────────────────────────────
  async _scheduleMulk(sw) {
    const time  = loadNotifTime('mulk') || '21:30';
    const next  = this._nextOccurrence(time, 'daily');
    const lang  = loadLang();
    const titles = {
      en: 'Before You Sleep 🌙',
      ur: 'سونے سے پہلے 🌙',
      hi: 'सोने से पहले 🌙',
    };
    const bodies = {
      en: 'Recite Surah Al-Mulk — the protector of the grave',
      ur: 'سورۃ الملک پڑھیں — قبر کی حفاظت کرنے والی',
      hi: 'सूरह अल-मुल्क पढ़ें — क़ब्र की हिफ़ाज़त करने वाली',
    };

    sw.postMessage({
      type:      'SCHEDULE_NOTIFICATION',
      notifType: 'mulk',
      fireAt:    next,            // absolute epoch ms — survives SW restarts
      title:     titles[lang] || titles.en,
      body:      bodies[lang] || bodies.en,
      data:      { surah: 67, ayah: 1, url: './?notif=mulk' },
      icon:      './icons/icon-192.png',
      badge:     './icons/favicon-32.png',
    });
  },

  // ── Pick a random ayah ────────────────────────────────────
  _pickRandomAyah() {
    // Total ayahs = 6236. Pick a random surah weighted by ayah count.
    const surah    = SURAHS[Math.floor(Math.random() * SURAHS.length)];
    const ayahNum  = Math.floor(Math.random() * surah.ayahs) + 1;
    return {
      surahNum:   surah.num,
      ayahNum:    ayahNum,
      surahName:  surah.name[0],
      surahNameUr:surah.name[1],
      surahNameHi:surah.name[2],
    };
  },

  // ── Calculate next occurrence ─────────────────────────────
  // type: 'daily' | 'friday'
  // timeStr: 'HH:MM' in 24h format
  _nextOccurrence(timeStr, type) {
    const [hours, mins] = timeStr.split(':').map(Number);
    const now  = new Date();
    const next = new Date();
    next.setHours(hours, mins, 0, 0);

    // If the time today has already passed, move to tomorrow
    if (next <= now) next.setDate(next.getDate() + 1);

    if (type === 'friday') {
      // Advance to next Friday (day 5)
      while (next.getDay() !== 5) next.setDate(next.getDate() + 1);
    }

    return next.getTime();
  },

  // ── Register Periodic Background Sync ───────────────────────
  // Wakes the SW every ~1-4h on Chrome Android (PWA installed).
  // Re-registering on every app open is intentional and idempotent —
  // the browser resets the interval, keeping the schedule fresh.
  // Silently no-ops on iOS and desktop (API not supported there).
  async _registerPeriodicSync() {
    try {
      if (!('periodicSync' in navigator.serviceWorker)) return;
      const reg = await navigator.serviceWorker.ready;
      if (!reg.periodicSync) return;

      // Check permission — required on some Chrome versions
      const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
      if (status.state !== 'granted') return;

      await reg.periodicSync.register('iqra-notif-check', {
        minInterval: 60 * 60 * 1000, // 1 hour minimum — browser decides actual interval
      });
    } catch(e) {
      // Non-fatal — app works without it, notifications fire on next app open instead
    }
  },

  // ── Get active SW ─────────────────────────────────────────
  async _getSW() {
    try {
      const reg = await navigator.serviceWorker.ready;
      return reg.active;
    } catch(e) {
      return null;
    }
  },

  // ── Update settings UI ────────────────────────────────────
  updateSettingsUI() {
    const status = document.getElementById('notif-status');
    if (status) {
      if (!this.supported) {
        status.textContent = t('notif_not_supported');
        status.className   = 'notif-status notif-unsupported';
      } else if (this.permission === 'denied') {
        status.textContent = t('notif_blocked');
        status.className   = 'notif-status notif-blocked';
      } else if (this.isGranted) {
        status.textContent = t('notif_active');
        status.className   = 'notif-status notif-active';
      } else {
        status.textContent = t('notif_off');
        status.className   = 'notif-status notif-off';
      }
    }

    // Subscribe button — reflects OS-level permission state, persists across reopens
    const btn = document.getElementById('notif-subscribe-btn');
    if (btn) {
      if (this.isGranted) {
        btn.textContent = '✓ Notifications Enabled';
        btn.disabled    = true;
        btn.classList.add('subscribed');
      } else if (this.permission === 'denied') {
        btn.textContent = 'Blocked — Enable in Browser Settings';
        btn.disabled    = true;
        btn.classList.add('subscribed');
      } else {
        btn.textContent = 'Enable Notifications';
        btn.disabled    = false;
        btn.classList.remove('subscribed');
      }
    }

    // Toggle switches
    ['aotd', 'kahf', 'mulk'].forEach(type => {
      const tog = document.getElementById('notif-toggle-' + type);
      if (tog) {
        tog.checked  = this.isGranted && loadNotifEnabled(type);
        tog.disabled = !this.isGranted;
      }
      const timeInput = document.getElementById('notif-time-' + type);
      if (timeInput) {
        timeInput.value    = loadNotifTime(type) || (type === 'mulk' ? '21:30' : '08:00');
        timeInput.disabled = !this.isGranted || !loadNotifEnabled(type);
      }
    });
  },

  // ── Toggle a notification type on/off ─────────────────────
  async toggleNotif(type, on) {
    saveNotifEnabled(type, on);
    Progress.saveNotifPrefs(); // fire-and-forget
    if (on) {
      const sw = await this._getSW();
      if (sw) {
        if (type === 'aotd') await this._scheduleAotd(sw);
        if (type === 'kahf') await this._scheduleKahf(sw);
        if (type === 'mulk') await this._scheduleMulk(sw);
      }
    } else {
      await this.cancel(type);
    }
    this.updateSettingsUI();
  },

  // ── Update time for a notification type ───────────────────
  async updateTime(type, timeStr) {
    saveNotifTime(type, timeStr);
    Progress.saveNotifPrefs(); // fire-and-forget
    if (this.isGranted && loadNotifEnabled(type)) {
      const sw = await this._getSW();
      if (sw) {
        if (type === 'aotd') await this._scheduleAotd(sw);
        if (type === 'kahf') await this._scheduleKahf(sw);
        if (type === 'mulk') await this._scheduleMulk(sw);
      }
    }
  },

  // ── Send a test notification immediately ─────────────────
  async testNotification() {
    if (!this.isGranted) {
      await this.requestPermission();
      return;
    }
    const sw = await this._getSW();
    if (!sw) { showToast('SW not ready — try again'); return; }
    sw.postMessage({
      type:      'SCHEDULE_NOTIFICATION',
      notifType: 'test',
      fireAt:    Date.now() + 3000, // 3 seconds from now
      title:     'Iqra ✓',
      body:      'Notifications are working!',
      data:      { surah: 1, ayah: 1 },
      icon:      './icons/icon-192.png',
      badge:     './icons/favicon-32.png',
    });
    showToast('Test notification in 3 seconds…');
  },

  // ── Handle notification click (from URL param) ────────────
  handleNotifClick() {
    const params = new URLSearchParams(window.location.search);
    const notif  = params.get('notif');
    const surah  = parseInt(params.get('surah'));
    const ayah   = parseInt(params.get('ayah'));

    if (!notif) return;

    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);

    if (surah && ayah) {
      // Navigate to the correct ayah
      setTimeout(() => {
        showPage('reader');
        Reader.loadSurah(surah, ayah);
      }, 500);
    }
  },
};
