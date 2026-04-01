// ============================================================
// BOOKMARKS — Iqra V2
// Displays saved bookmarks. Each has: surah, ayah, arabic
// preview, optional note, timestamp. Tap to navigate.
// ============================================================

const Bookmarks = {

  render() {
    const list = document.getElementById('bookmarks-list');
    if (!list) return;
    const bm      = loadBookmarks();
    const langIdx = currentLang === 'ur' ? 1 : currentLang === 'hi' ? 2 : 0;

    if (bm.length === 0) {
      list.innerHTML = `
        <div class="bookmarks-empty">
          <div class="bookmarks-empty-icon">🔖</div>
          <div class="bookmarks-empty-title">${t('no_bookmarks')}</div>
          <div class="bookmarks-empty-body">${t('no_bookmarks_body')}</div>
        </div>`;
      return;
    }

    list.innerHTML = bm.map(b => {
      const meta    = getSurahMeta(b.surahNum);
      const name    = meta.name[langIdx] || meta.name[0];
      const date    = new Date(b.savedAt).toLocaleDateString(
        currentLang === 'ur' ? 'ur-PK' : currentLang === 'hi' ? 'hi-IN' : 'en-GB',
        { day: 'numeric', month: 'short', year: 'numeric' }
      );
      return `
        <div class="bookmark-card" data-id="${b.id}">
          <div class="bookmark-card-header">
            <div class="bookmark-ref">
              <span class="bookmark-surah">${name}</span>
              <span class="bookmark-sep">·</span>
              <span class="bookmark-ayah">${t('ayah_label')} ${b.ayahNum}</span>
            </div>
            <div class="bookmark-date">${date}</div>
          </div>
          <div class="bookmark-arabic" lang="ar" dir="rtl">${b.arabic || ''}</div>
          ${b.note ? `<div class="bookmark-note">${b.note}</div>` : ''}
          <div class="bookmark-actions">
            <button class="bookmark-goto-btn" onclick="Bookmarks.goTo(${b.surahNum}, ${b.ayahNum})">
              ${t('go_to_ayah')}
            </button>
            <button class="bookmark-delete-btn" onclick="Bookmarks.remove(${b.id})">
              ${t('remove')}
            </button>
          </div>
        </div>`;
    }).join('');
  },

  goTo(surahNum, ayahNum) {
    showPage('reader');
    // If same surah, just scroll. If different, load then scroll.
    if (Reader.state.surahNum === surahNum && Reader.state.ayahs.length) {
      Reader.state.currentAyah = ayahNum;
      Reader._highlightAyah(ayahNum);
      Reader._scrollToAyah(ayahNum, 'smooth');
    } else {
      Reader.loadSurah(surahNum, ayahNum);
    }
  },

  remove(id) {
    removeBookmark(id);
    this.render();
    // Refresh bookmark icons in reader if visible
    if (Reader.state.ayahs.length) Reader._refreshBookmarkIcons();
  },

  // Opens the "add bookmark" sheet for a given ayah
  openSheet(surahNum, ayahNum, arabic) {
    const sheet = document.getElementById('bookmark-sheet');
    if (!sheet) return;
    sheet.dataset.surah  = surahNum;
    sheet.dataset.ayah   = ayahNum;
    sheet.dataset.arabic = arabic;

    const noteEl = document.getElementById('bookmark-note-input');
    // Pre-fill if already bookmarked
    const existing = loadBookmarks().find(b => b.surahNum === surahNum && b.ayahNum === ayahNum);
    if (noteEl) noteEl.value = existing?.note || '';

    const titleEl = document.getElementById('bookmark-sheet-title');
    if (titleEl) {
      const meta = getSurahMeta(surahNum);
      const langIdx = currentLang === 'ur' ? 1 : currentLang === 'hi' ? 2 : 0;
      titleEl.textContent = (meta.name[langIdx] || meta.name[0]) + ' · ' + t('ayah_label') + ' ' + ayahNum;
    }

    sheet.classList.add('open');
    document.getElementById('bookmark-sheet-backdrop')?.classList.add('open');
  },

  closeSheet() {
    document.getElementById('bookmark-sheet')?.classList.remove('open');
    document.getElementById('bookmark-sheet-backdrop')?.classList.remove('open');
  },

  saveFromSheet() {
    const sheet  = document.getElementById('bookmark-sheet');
    if (!sheet) return;
    const surah  = parseInt(sheet.dataset.surah);
    const ayah   = parseInt(sheet.dataset.ayah);
    const arabic = sheet.dataset.arabic;
    const note   = document.getElementById('bookmark-note-input')?.value || '';
    addBookmark(surah, ayah, arabic, note);
    this.closeSheet();
    Reader._refreshBookmarkIcons();
    // Show a brief toast
    showToast(t('bookmark_saved'));
  },
};
