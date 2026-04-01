// ============================================================
// READER — Iqra V2
// New in V2:
//   - Reading mode (Arabic only, full width, centered)
//   - ۝ ayah end markers (always shown, like a Mushaf)
//   - ۩ Sajdah markers on the 15 sajdah ayahs
//   - Juz dividers shown inline as you scroll
//   - Bookmark icon on each ayah (long-press or icon tap)
//   - Reciter-aware audio URLs
// ============================================================

const Reader = {
  state: {
    surahNum:    1,
    ayahs:       [],
    currentAyah: 1,
    isPlaying:   false,
    playMode:    'idle',
    audio:       null,
    playQueue:   [],
    loading:     false,
    error:       null,
  },

  async init() {
    this.state.audio = new Audio();
    this._bindAudioEvents();
    const lastSurah = loadLastSurah();
    await this.loadSurah(lastSurah);
  },

  async loadSurah(num, startAyah) {
    if (num < 1 || num > 114) return;
    // Save current position before switching to a new surah
    if (this.state.surahNum && this.state.currentAyah) {
      saveLastSurah(this.state.surahNum);
      saveLastAyah(this.state.surahNum, this.state.currentAyah);
    }
    this._stopAudio();
    this.state.surahNum = num;
    this.state.loading  = true;
    this.state.error    = null;
    this.state.ayahs    = [];
    this._showLoading();
    this._renderSurahHeader(num);
    this._updateNavArrows(num);
    this._updateNavBtn(num);
    saveLastSurah(num);

    try {
      const ayahs = await fetchSurah(num);
      this.state.ayahs   = ayahs;
      this.state.loading = false;
      // If caller passed startAyah=1 (e.g. from Overview tile tap) BUT the surah
      // is already marked complete, honour the explicit scroll-to-start but do NOT
      // overwrite the saved lastAyah so the completion record is preserved.
      const savedAyah = loadLastAyah(num);
      const surahComplete = isSurahCompleted(num); // timestamp-based, never cleared
      let target;
      if (startAyah && startAyah === 1 && surahComplete) {
        // User tapped a completed surah from Overview — start at top visually
        // but keep savedAyah intact in memory so _savePosition doesn't regress it
        target = 1;
        this.state.currentAyah = 1;
        // Re-stamp the full completion so localStorage stays correct
        saveLastAyah(num, getSurahMeta(num).ayahs);
      } else {
        target = startAyah || savedAyah;
        this.state.currentAyah = Math.min(target, ayahs.length);
      }
      this.renderAyahs();
      this._scrollToAyah(target, 'instant');
      prefetchSurah(num - 1);
      prefetchSurah(num + 1);
    } catch (err) {
      this.state.loading = false;
      this.state.error   = err.message;
      this._showError(err.message);
    }
  },

  // ── Render ────────────────────────────────────────────────
  renderAyahs() {
    const container = document.getElementById('ayah-container');
    if (!container) return;
    const surahMeta = getSurahMeta(this.state.surahNum);
    container.innerHTML = '';

    if (surahMeta.bismillah) {
      const bism = document.createElement('div');
      bism.className = 'bismillah-ornament';
      bism.setAttribute('lang', 'ar');
      bism.setAttribute('dir', 'rtl');
      bism.textContent = '﷽';
      container.appendChild(bism);
    }

    this.state.ayahs.forEach((ayah, idx) => {
      // Juz divider before this ayah?
      const juzDivider = this._getJuzDivider(this.state.surahNum, ayah.num);
      if (juzDivider) container.appendChild(juzDivider);

      container.appendChild(this._buildAyahEl(ayah));
    });

    this._highlightAyah(this.state.currentAyah);
  },

  _getJuzDivider(surahNum, ayahNum) {
    // Show a Juz divider when a new Juz starts at this ayah
    // (except Juz 1 which is always the beginning)
    const juzEntry = JUZ.find(j => j.num > 1 && j.surah === surahNum && j.ayah === ayahNum);
    if (!juzEntry) return null;

    const div = document.createElement('div');
    div.className = 'juz-divider';
    const label = currentLang === 'ur' ? 'پارہ ' + juzEntry.num :
                  currentLang === 'hi' ? 'पारा ' + juzEntry.num :
                  'Juz ' + juzEntry.num;
    div.innerHTML = `
      <span class="juz-divider-line"></span>
      <span class="juz-divider-label">
        <span class="juz-divider-arabic" lang="ar" dir="rtl">${juzEntry.nameAr}</span>
        <span class="juz-divider-text">${label}</span>
      </span>
      <span class="juz-divider-line"></span>`;
    return div;
  },

  _buildAyahEl(ayah) {
    const div = document.createElement('div');
    div.className = 'ayah-block';
    div.id = 'ayah-' + ayah.num;
    div.dataset.num = ayah.num;

    const isSajdahAyah = isSajdah(this.state.surahNum, ayah.num);
    const bmActive = isBookmarked(this.state.surahNum, ayah.num);

    // ── Ayah number medallion ─────────────────────────────
    const numWrap = document.createElement('div');
    numWrap.className = 'ayah-num-wrap';

    const numEl = document.createElement('div');
    numEl.className = 'ayah-number';
    numEl.textContent = ayah.num;
    numEl.title = 'Play ayah ' + ayah.num;
    numEl.addEventListener('click', () => this._playSingleAyah(ayah.num));
    numWrap.appendChild(numEl);

    // Sajdah badge
    if (isSajdahAyah) {
      const badge = document.createElement('div');
      badge.className = 'sajdah-badge';
      badge.title = t('sajdah');
      badge.textContent = '۩';
      numWrap.appendChild(badge);
    }

    // Bookmark icon
    const bmIcon = document.createElement('button');
    bmIcon.className = 'ayah-bookmark-btn' + (bmActive ? ' active' : '');
    bmIcon.innerHTML = bmActive ? '🔖' : '🕮';
    bmIcon.title = bmActive ? 'Bookmarked — click to update' : 'Bookmark this ayah';
    bmIcon.setAttribute('aria-label', 'Bookmark ayah ' + ayah.num);
    bmIcon.addEventListener('click', e => {
      e.stopPropagation();
      Bookmarks.openSheet(this.state.surahNum, ayah.num, ayah.arabic);
    });
    numWrap.appendChild(bmIcon);

    div.appendChild(numWrap);

    // ── Text content ──────────────────────────────────────
    const textDiv = document.createElement('div');
    textDiv.className = 'ayah-text';

    // Arabic text — use indopak text + font when script=indopak,
    // uthmani text + KFGQPC font otherwise.
    const script = document.documentElement.getAttribute('data-script') || 'indopak';
    let arabicText = (script === 'indopak' && ayah.arabic_indopak)
      ? ayah.arabic_indopak
      : ayah.arabic;

    // Strip end-of-ayah and waqf markers from indopak_nastaleeq API text.
    // The API uses U+06DF (۟) as end marker, sometimes followed by
    // U+0615 (ؕ waqf lazim), U+065A (ٚ), and other pause signs U+06D6-U+06DC.
    // We render our own styled ⊙ marker so strip all of these.
    arabicText = arabicText
      .replace(/[\u06DF\u06D6-\u06DC\u065A\u06E9]+$/g, '') // strip end markers
      .replace(/\u06DD[\u0660-\u0669\u06F0-\u06F9]*/g, '')  // strip U+06DD ayah marker
      .replace(/[\uF500-\uF5FF]/g, '')  // strip ALL PUA glyphs — white circles, ornaments
      .trim();

    const arabicEl = document.createElement('div');
    arabicEl.className = 'ayah-arabic';
    arabicEl.setAttribute('lang', 'ar');
    arabicEl.setAttribute('dir', 'rtl');

    const markerSpan = document.createElement('span');
    markerSpan.className = 'ayah-end-marker';
    markerSpan.setAttribute('aria-hidden', 'true');
    markerSpan.textContent = this._toArabicNumerals(ayah.num);

    // Marker inline at the START of the text (RTL: visually on the right)
    arabicEl.appendChild(document.createTextNode(arabicText));
    arabicEl.appendChild(markerSpan);
    textDiv.appendChild(arabicEl);

    // Translation (hidden in reading mode via CSS)
    const transEl = document.createElement('div');
    transEl.className = 'ayah-translation translation';
    transEl.textContent = getAyahTranslation(ayah);
    textDiv.appendChild(transEl);

    div.appendChild(textDiv);

    // Long-press to bookmark (touch)
    let _pressTimer = null;
    div.addEventListener('touchstart', () => {
      _pressTimer = setTimeout(() => {
        const _bScript = document.documentElement.getAttribute('data-script') || 'indopak';
      const _bText = (_bScript === 'indopak' && ayah.arabic_indopak) ? ayah.arabic_indopak : ayah.arabic;
      Bookmarks.openSheet(this.state.surahNum, ayah.num, _bText);
      }, 600);
    }, { passive: true });
    div.addEventListener('touchend',   () => clearTimeout(_pressTimer), { passive: true });
    div.addEventListener('touchmove',  () => clearTimeout(_pressTimer), { passive: true });

    return div;
  },

  // Convert Western numerals to Arabic-Indic (U+0660–U+0669) for ۝ marker
  // These digits render INSIDE the U+06DD ornament in KFGQPC font
  _toArabicNumerals(n) {
    return String(n).replace(/[0-9]/g, d => String.fromCharCode(0x0660 + parseInt(d)));
  },

  _refreshTranslations() {
    this.state.ayahs.forEach(ayah => {
      const block = document.getElementById('ayah-' + ayah.num);
      if (!block) return;
      const el = block.querySelector('.ayah-translation');
      if (el) el.textContent = getAyahTranslation(ayah);
    });
  },

  _refreshBookmarkIcons() {
    this.state.ayahs.forEach(ayah => {
      const block = document.getElementById('ayah-' + ayah.num);
      if (!block) return;
      const btn = block.querySelector('.ayah-bookmark-btn');
      if (!btn) return;
      const bm = isBookmarked(this.state.surahNum, ayah.num);
      btn.classList.toggle('active', bm);
      btn.innerHTML = bm ? '🔖' : '🕮';
      btn.title = bm ? 'Bookmarked — click to update' : 'Bookmark this ayah';
    });
  },

  _renderSurahHeader(num) {
    const meta    = getSurahMeta(num);
    const langIdx = currentLang === 'ur' ? 1 : currentLang === 'hi' ? 2 : 0;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('surah-name-arabic', meta.arabic);
    set('surah-name',        meta.name[langIdx] || meta.name[0]);
    set('surah-meaning',     meta.meaning[langIdx] || meta.meaning[0]);
    set('surah-meta',
      (currentLang === 'ur' ? (meta.revelation === 'Makkan' ? 'مکی' : 'مدنی') :
       currentLang === 'hi' ? (meta.revelation === 'Makkan' ? 'मक्की' : 'मदनी') :
       meta.revelation) + '  ·  ' + meta.ayahs + ' ' + t('ayahs'));
    set('surah-counter', num + ' / 114');
    document.title = 'Iqra · ' + meta.name[0];
  },

  _updateNavBtn(num) {
    const meta = getSurahMeta(num);
    const arabicEl = document.getElementById('nav-surah-arabic');
    const nameEl   = document.getElementById('nav-surah-name');
    if (arabicEl) arabicEl.textContent = meta.arabic;
    if (nameEl)   nameEl.textContent   = meta.name[0];
  },

  _updateNavArrows(num) {
    const p = document.getElementById('prev-surah-btn');
    const n = document.getElementById('next-surah-btn');
    if (p) p.disabled = num <= 1;
    if (n) n.disabled = num >= 114;
  },

  // ── Audio ────────────────────────────────────────────────
  _playSingleAyah(ayahNum) {
    this._stopAudio();
    this.state.playMode    = 'single';
    this.state.currentAyah = ayahNum;
    this._highlightAyah(ayahNum);
    this._scrollToAyah(ayahNum, 'smooth');
    saveLastAyah(this.state.surahNum, ayahNum);
    this._playUrl(getAudioUrl(this.state.surahNum, ayahNum));
  },

  toggleSurahPlay() {
    if (this.state.isPlaying) {
      this._pauseAudio();
    } else if (this.state.playMode === 'surah' && this.state.playQueue.length > 0) {
      this._resumeAudio();
    } else {
      this._startSurahPlay(this.state.currentAyah || 1);
    }
  },

  _startSurahPlay(fromAyah) {
    const total = this.state.ayahs.length;
    const queue = [];
    for (let i = fromAyah; i <= total; i++) queue.push(i);
    this.state.playMode  = 'surah';
    this.state.playQueue = queue;
    this._playNextInQueue();
  },

  _playNextInQueue() {
    if (this.state.playQueue.length === 0) {
      this._stopAudio(); // End of surah — stop cleanly
      return;
    }
    const ayahNum = this.state.playQueue.shift();
    this.state.currentAyah = ayahNum;
    this._highlightAyah(ayahNum);
    this._scrollToAyah(ayahNum, 'smooth');
    saveLastAyah(this.state.surahNum, ayahNum);
    this._playUrl(getAudioUrl(this.state.surahNum, ayahNum));
  },

  _bindAudioEvents() {
    const audio = this.state.audio;
    audio.addEventListener('ended',  () => {
      if (this.state.playMode === 'surah') this._playNextInQueue();
      else this._stopAudio();
    });
    audio.addEventListener('error',  () => {
      // Only show error if we were actually trying to play something
      if (!this.state.isPlaying && this.state.playMode === 'idle') return;
      this._stopAudio();
      showToast('⚠ Audio unavailable — check your connection');
    });
    audio.addEventListener('play',   () => { this.state.isPlaying = true;  this._updatePlayBtn(true);  });
    audio.addEventListener('pause',  () => { this.state.isPlaying = false; this._updatePlayBtn(false); });
  },

  _playUrl(url) {
    const audio = this.state.audio;
    audio.src = url;
    audio.play().catch(() => this._stopAudio());
  },

  _pauseAudio()  { this.state.audio.pause(); },
  _resumeAudio() { this.state.audio.play().catch(() => {}); },

  _stopAudio() {
    const audio = this.state.audio;
    if (!audio) return;
    if (!audio.paused) audio.pause();
    // removeAttribute + load() is the correct way to reset Audio —
    // setting src='' triggers an "Invalid URI" console warning and error event.
    audio.removeAttribute('src');
    audio.load(); // resets internal state, fires no error, no console noise
    this.state.isPlaying  = false;
    this.state.playMode   = 'idle';
    this.state.playQueue  = [];
    this._updatePlayBtn(false);
    this._clearHighlight();
  },

  _updatePlayBtn(playing) {
    const btn      = document.getElementById('play-btn');
    const waveform = document.getElementById('play-waveform');
    const label    = document.getElementById('play-label');
    if (!btn) return;
    btn.classList.toggle('active', playing);
    if (waveform) waveform.style.display = playing ? 'flex' : 'none';
    if (label)    label.textContent = t(playing ? 'pause' : 'play_surah');
  },

  _highlightAyah(num) {
    this._clearHighlight();
    const el = document.getElementById('ayah-' + num);
    if (el) el.classList.add('playing');
  },

  _clearHighlight() {
    document.querySelectorAll('.ayah-block.playing').forEach(el => el.classList.remove('playing'));
  },

  _scrollToAyah(num, behavior) {
    const el = document.getElementById('ayah-' + num);
    if (el) el.scrollIntoView({ behavior: behavior || 'smooth', block: 'center' });
  },

  _showLoading() {
    const c = document.getElementById('ayah-container');
    if (c) c.innerHTML = `
      <div class="reader-loading">
        <div class="loading-spinner"></div>
        <div class="loading-text">${t('loading')}</div>
      </div>`;
  },

  _showError(msg) {
    const c = document.getElementById('ayah-container');
    if (c) c.innerHTML = `
      <div class="reader-error">
        <div class="error-icon">⚠</div>
        <div class="error-text">${msg || t('error_load')}</div>
        <button class="retry-btn" onclick="Reader.loadSurah(Reader.state.surahNum)">${t('retry')}</button>
      </div>`;
  },
};

// ── Surah Selector Modal ───────────────────────────────────
function openSurahSelector() {
  const modal = document.getElementById('surah-modal');
  if (!modal) return;
  modal.classList.add('open');
  renderSurahList('');
  const searchEl = document.getElementById('surah-search');
  if (searchEl) { searchEl.value = ''; searchEl.focus(); }
  const ayahEl = document.getElementById('ayah-goto-input');
  if (ayahEl) ayahEl.value = '';
}

function closeSurahSelector() {
  document.getElementById('surah-modal')?.classList.remove('open');
}

function renderSurahList(query) {
  const list = document.getElementById('surah-list');
  if (!list) return;
  const q       = (query || '').toLowerCase().trim();
  const langIdx = currentLang === 'ur' ? 1 : currentLang === 'hi' ? 2 : 0;
  const filtered = q
    ? SURAHS.filter(s =>
        s.name[0].toLowerCase().includes(q) ||
        s.name[1].includes(q) ||
        s.name[2].toLowerCase().includes(q) ||
        s.arabic.includes(q) ||
        String(s.num).includes(q) ||
        s.meaning[0].toLowerCase().includes(q))
    : SURAHS;

  list.innerHTML = filtered.map(s => `
    <div class="surah-item ${s.num === Reader.state.surahNum ? 'active' : ''}"
         onclick="selectSurah(${s.num})">
      <div class="surah-item-num">${s.num}</div>
      <div class="surah-item-info">
        <div class="surah-item-name">${s.name[langIdx] || s.name[0]}</div>
        <div class="surah-item-meta">${s.revelation === 'Makkan' ? t('makkan') : t('madinan')} · ${s.ayahs} ${t('ayahs')}</div>
      </div>
      <div class="surah-item-arabic" lang="ar" dir="rtl">${s.arabic}</div>
    </div>`).join('');
}

function selectSurah(num) {
  closeSurahSelector();
  showPage('reader');
  Reader.loadSurah(num, 1);
}

function gotoAyah() {
  const input = document.getElementById('ayah-goto-input');
  if (!input) return;
  const num  = parseInt(input.value);
  const meta = getSurahMeta(Reader.state.surahNum);
  if (!num || num < 1 || num > meta.ayahs) {
    input.classList.add('input-error');
    setTimeout(() => input.classList.remove('input-error'), 600);
    return;
  }
  closeSurahSelector();
  showPage('reader');
  Reader.state.currentAyah = num;
  saveLastAyah(Reader.state.surahNum, num);
  Reader._highlightAyah(num);
  Reader._scrollToAyah(num, 'smooth');
}

function prevSurah() { if (Reader.state.surahNum > 1)   Reader.loadSurah(Reader.state.surahNum - 1); }
function nextSurah() { if (Reader.state.surahNum < 114) Reader.loadSurah(Reader.state.surahNum + 1); }
