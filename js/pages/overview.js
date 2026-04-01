// ============================================================
// OVERVIEW — Iqra V2
// Surah grid + Juz grid toggle.
// Favourites section at top.
// Heart icon on each tile.
// ============================================================

const Overview = {

  render() {
    const mode = loadViewMode();
    this._renderToggle(mode);
    this._renderFavourites();
    if (mode === 'juz') this._renderJuzGrid();
    else {
      this._renderSurahGrid();
      // After render, scroll the current surah tile into view
      requestAnimationFrame(() => {
        const tile = document.querySelector('#overview-grid .surah-tile.current');
        if (tile) tile.scrollIntoView({ behavior: 'instant', block: 'center' });
      });
    }
  },

  _renderToggle(mode) {
    document.querySelectorAll('[data-view-btn]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-view-btn') === mode);
    });
  },

  _renderFavourites() {
    const section  = document.getElementById('favourites-section');
    const grid     = document.getElementById('favourites-grid');
    const empty    = document.getElementById('favourites-empty');
    if (!section || !grid) return;

    const favNums  = loadFavourites();
    const langIdx  = currentLang === 'ur' ? 1 : currentLang === 'hi' ? 2 : 0;
    const currentSurah = typeof Reader !== 'undefined' ? Reader.state.surahNum : 0;

    if (favNums.length === 0) {
      grid.innerHTML  = '';
      if (empty) empty.style.display = 'block';
      return;
    }

    if (empty) empty.style.display = 'none';
    const favSurahs = favNums.map(n => getSurahMeta(n)).filter(Boolean);

    grid.innerHTML = favSurahs.map(s => this._tileHTML(s, langIdx, currentSurah)).join('');
  },

  _renderSurahGrid() {
    const grid = document.getElementById('overview-grid');
    if (!grid) return;
    const langIdx      = currentLang === 'ur' ? 1 : currentLang === 'hi' ? 2 : 0;
    const currentSurah = typeof Reader !== 'undefined' ? Reader.state.surahNum : 0;
    grid.innerHTML = SURAHS.map(s => this._tileHTML(s, langIdx, currentSurah)).join('');
  },

  _renderJuzGrid() {
    const grid = document.getElementById('overview-grid');
    if (!grid) return;
    const langIdx = currentLang === 'ur' ? 1 : currentLang === 'hi' ? 2 : 0;

    grid.innerHTML = JUZ.map(j => {
      const nameLabel = currentLang === 'ur' ? ('پارہ ' + j.num) :
                        currentLang === 'hi' ? ('पारा ' + j.num) :
                        ('Juz ' + j.num);
      const startMeta = getSurahMeta(j.surah);
      const startName = startMeta.name[langIdx] || startMeta.name[0];
      return `
        <div class="surah-tile juz-tile" onclick="Overview.openJuz(${j.num})">
          <div class="surah-tile-num">${j.num}</div>
          <div class="surah-tile-arabic" lang="ar" dir="rtl">${j.nameAr}</div>
          <div class="surah-tile-name">${nameLabel}</div>
          <div class="surah-tile-meta">${startName}</div>
        </div>`;
    }).join('');
  },

  _tileHTML(s, langIdx, currentSurah) {
    const isCurrent   = s.num === currentSurah;
    const isFav       = isFavourite(s.num);
    const isCached    = isSurahCached(s.num);
    const revLabel    = s.revelation === 'Makkan' ? t('makkan') : t('madinan');
    const isCompleted = isSurahCompleted(s.num);
    const lastAyah    = loadLastAyah(s.num) || 0;
    const pct         = isCompleted ? 100 : (lastAyah > 1 ? Math.round((lastAyah / s.ayahs) * 100) : 0);
    const inProgress  = !isCompleted && pct > 0;

    const progressHTML = isCompleted
      ? `<div class="tile-complete-mark">&#x2713;</div>`
      : inProgress
        ? `<div class="tile-progress-bar"><div class="tile-progress-fill" style="width:${pct}%"></div></div>`
        : '';

    return `
      <div class="surah-tile ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''}" onclick="Overview.openSurah(${s.num})">
        <div class="surah-tile-top">
          <div class="surah-tile-num">${s.num}</div>
          <button class="tile-heart ${isFav ? 'active' : ''}"
                  onclick="event.stopPropagation(); Overview.toggleFav(${s.num})"
                  aria-label="Favourite">♡</button>
        </div>
        <div class="surah-tile-arabic" lang="ar" dir="rtl">${s.arabic}</div>
        <div class="surah-tile-name">${s.name[langIdx] || s.name[0]}</div>
        <div class="surah-tile-meta">${revLabel} · ${s.ayahs}${isCached ? ' ·<span class="cached-dot" title="Saved offline"></span>' : ''}</div>
        ${progressHTML}
      </div>`;
  },

  openSurah(num) {
    showPage('reader');
    // Always resume from saved position — completed or not.
    // After a khatm reset, loadLastAyah returns the last ayah
    // of the previous read, which is fine — user can scroll up.
    // The tile ✓ is visual-only; it doesn't change where you resume.
    Reader.loadSurah(num, loadLastAyah(num) || 1);
  },

  openJuz(juzNum) {
    const j = JUZ[juzNum - 1];
    showPage('reader');
    Reader.loadSurah(j.surah, j.ayah);
  },

  toggleFav(surahNum) {
    toggleFavourite(surahNum);
    this.render(); // Re-render to update heart + favourites section
  },

  setViewMode(mode) {
    saveViewMode(mode);
    this.render();
  },
};

// Helper: show/hide the "All Surahs" label based on view mode
Overview._updateSectionLabels = function(mode) {
  const allLabel = document.querySelector('.all-surahs-label');
  const favSection = document.getElementById('favourites-section');
  if (allLabel)   allLabel.style.display  = mode === 'juz' ? 'none' : '';
  if (favSection) favSection.style.display = mode === 'juz' ? 'none' : '';
};

// Patch render to call label update
const _origRender = Overview.render.bind(Overview);
Overview.render = function() {
  const mode = loadViewMode();
  this._updateSectionLabels(mode);
  _origRender();
};
