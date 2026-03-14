// ============================================================
// READER — Iqra Qur'an Reader
//
// Audio rules:
//   1. Switching surah always stops audio — no bleed-over.
//   2. Surah ends → stop. No auto-advance to next surah.
//   3. toggleSurahPlay always starts/resumes FULL SURAH mode
//      from currentAyah — never single-ayah mode.
//   4. Tapping an ayah number plays that single ayah only.
// ============================================================

const Reader = {
  state: {
    surahNum:    1,
    ayahs:       [],
    currentAyah: 1,
    isPlaying:   false,
    playMode:    'idle',  // 'idle' | 'surah' | 'single'
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

  // ── Load surah ────────────────────────────────────────────
  async loadSurah(num, startAyah) {
    if (num < 1 || num > 114) return;

    // FIX 1: Always stop audio when switching surah
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
      const target = startAyah || loadLastAyah(num);
      this.state.currentAyah = Math.min(target, ayahs.length);
      this.renderAyahs();
      this._scrollToAyah(this.state.currentAyah, 'instant');
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

    this.state.ayahs.forEach(ayah => container.appendChild(this._buildAyahEl(ayah)));
    this._highlightAyah(this.state.currentAyah);
  },

  _buildAyahEl(ayah) {
    const div = document.createElement('div');
    div.className = 'ayah-block';
    div.id = 'ayah-' + ayah.num;
    div.dataset.num = ayah.num;

    const numEl = document.createElement('div');
    numEl.className = 'ayah-number';
    numEl.textContent = ayah.num;
    numEl.title = 'Play ayah ' + ayah.num;
    numEl.addEventListener('click', () => this._playSingleAyah(ayah.num));
    div.appendChild(numEl);

    const textDiv = document.createElement('div');
    textDiv.className = 'ayah-text';

    const arabicEl = document.createElement('div');
    arabicEl.className = 'ayah-arabic';
    arabicEl.setAttribute('lang', 'ar');
    arabicEl.setAttribute('dir', 'rtl');
    arabicEl.textContent = ayah.arabic;
    textDiv.appendChild(arabicEl);

    const transEl = document.createElement('div');
    transEl.className = 'ayah-translation translation';
    transEl.textContent = getAyahTranslation(ayah);
    textDiv.appendChild(transEl);

    div.appendChild(textDiv);
    return div;
  },

  _refreshTranslations() {
    this.state.ayahs.forEach(ayah => {
      const block = document.getElementById('ayah-' + ayah.num);
      if (!block) return;
      const el = block.querySelector('.ayah-translation');
      if (el) el.textContent = getAyahTranslation(ayah);
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

  // ── Audio: single ayah ────────────────────────────────────
  // Tapping the ayah number medallion → play that one ayah only.
  _playSingleAyah(ayahNum) {
    this._stopAudio();
    this.state.playMode    = 'single';
    this.state.currentAyah = ayahNum;
    this._highlightAyah(ayahNum);
    this._scrollToAyah(ayahNum, 'smooth');
    saveLastAyah(this.state.surahNum, ayahNum);
    this._playUrl(getAudioUrl(this.state.surahNum, ayahNum));
  },

  // ── Audio: full surah ─────────────────────────────────────
  // FIX 3: toggleSurahPlay always operates in surah mode.
  // - If playing → pause
  // - If paused mid-surah → resume
  // - If idle → start full surah from currentAyah
  toggleSurahPlay() {
    if (this.state.isPlaying) {
      this._pauseAudio();
    } else if (this.state.playMode === 'surah' && this.state.playQueue.length > 0) {
      // Resume surah from where we paused
      this._resumeAudio();
    } else {
      // Always start full surah — even if last action was single-ayah
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
      // FIX 2: Surah ends → stop. No auto-advance to next surah.
      this._stopAudio();
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
    audio.addEventListener('ended', () => {
      if (this.state.playMode === 'surah') this._playNextInQueue();
      else this._stopAudio();
    });
    audio.addEventListener('error',  () => this._stopAudio());
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
    if (audio && !audio.paused) audio.pause();
    if (audio) audio.src = '';
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
