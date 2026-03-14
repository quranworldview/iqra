// ============================================================
// OVERVIEW — Iqra Qur'an Reader
// Full-page grid of all 114 surahs. Miftah-style tile layout.
// Each tile shows: surah number, Arabic name, English name,
// ayah count, and revelation type.
// Tapping a tile navigates to reader at Ayah 1.
// ============================================================

const Overview = {

  render() {
    const grid = document.getElementById('overview-grid');
    if (!grid) return;

    const langIdx = currentLang === 'ur' ? 1 : currentLang === 'hi' ? 2 : 0;
    const currentSurah = typeof Reader !== 'undefined' ? Reader.state.surahNum : 1;

    grid.innerHTML = SURAHS.map(s => {
      const isCurrent = s.num === currentSurah;
      const revLabel  = s.revelation === 'Makkan' ? t('makkan') : t('madinan');
      return `
        <div class="surah-tile ${isCurrent ? 'current' : ''}"
             onclick="Overview.openSurah(${s.num})"
             title="${s.name[0]}">
          <div class="surah-tile-num">${s.num}</div>
          <div class="surah-tile-arabic" lang="ar" dir="rtl">${s.arabic}</div>
          <div class="surah-tile-name">${s.name[langIdx] || s.name[0]}</div>
          <div class="surah-tile-meta">${revLabel} · ${s.ayahs}</div>
        </div>`;
    }).join('');
  },

  openSurah(num) {
    showPage('reader');
    Reader.loadSurah(num, 1);
  },

};
