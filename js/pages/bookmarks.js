// ============================================================
// REFLECTIONS — Iqra V2
// Displays saved reflections. Each has: surah, ayah, arabic
// preview, note, timestamp, visibility (private | published).
// Tap to navigate. Publish to share with admin → Library.
// ============================================================

const Bookmarks = {

  render() {
    const list = document.getElementById('bookmarks-list');
    if (!list) return;
    const bm      = loadBookmarks();
    const langIdx = currentLang === 'ur' ? 1 : currentLang === 'hi' ? 2 : 0;

    // Update subtitle with counts
    const subtitle = document.getElementById('bookmarks-subtitle');
    if (subtitle) {
      const published = bm.filter(b => b.visibility === 'published').length;
      if (bm.length === 0) {
        subtitle.textContent = '';
      } else if (published > 0) {
        subtitle.textContent = t('reflections_count')
          .replace('{total}', bm.length)
          .replace('{published}', published);
      } else {
        subtitle.textContent = t('reflections_count_none_published')
          .replace('{total}', bm.length);
      }
    }

    if (bm.length === 0) {
      list.innerHTML = `
        <div class="bookmarks-empty">
          <div class="bookmarks-empty-icon">✨</div>
          <div class="bookmarks-empty-title">${t('no_bookmarks')}</div>
          <div class="bookmarks-empty-body">${t('no_bookmarks_body')}</div>
        </div>`;
      return;
    }

    list.innerHTML = bm.map(b => {
      const meta       = getSurahMeta(b.surahNum);
      const name       = meta.name[langIdx] || meta.name[0];
      const isPublished = b.visibility === 'published';
      const date       = new Date(b.savedAt).toLocaleDateString(
        currentLang === 'ur' ? 'ur-PK' : currentLang === 'hi' ? 'hi-IN' : 'en-GB',
        { day: 'numeric', month: 'short', year: 'numeric' }
      );
      return `
        <div class="bookmark-card ${isPublished ? 'is-published' : ''}" data-id="${b.id}">
          <div class="bookmark-card-header">
            <div class="bookmark-ref">
              <span class="bookmark-surah">${name}</span>
              <span class="bookmark-sep">·</span>
              <span class="bookmark-ayah">${t('ayah_label')} ${b.ayahNum}</span>
            </div>
            <div class="bookmark-meta-right">
              ${isPublished
                ? `<span class="reflection-badge published">${t('published')}</span>`
                : `<span class="reflection-badge private">${t('private')}</span>`
              }
              <span class="bookmark-date">${date}</span>
            </div>
          </div>
          <div class="bookmark-arabic" lang="ar" dir="rtl">${b.arabic || ''}</div>
          ${b.note ? `<div class="bookmark-note">${b.note}</div>` : ''}
          ${b.title ? `<div class="bookmark-card-user-title">${b.title}</div>` : ''}
          <div class="bookmark-actions">
            <button class="bookmark-goto-btn" onclick="Bookmarks.goTo(${b.surahNum}, ${b.ayahNum})">
              ${t('go_to_ayah')}
            </button>
            <button class="reflection-toggle-btn ${isPublished ? 'unpublish' : 'publish'}"
                    onclick="Bookmarks.toggleVisibility(${b.id})">
              ${isPublished ? t('make_private') : t('publish_reflection')}
            </button>
            <button class="bookmark-delete-btn" onclick="Bookmarks.remove(${b.id})">
              ${t('remove')}
            </button>
          </div>
          ${isPublished ? `<div class="reflection-publish-note">${t('publish_info')}</div>` : ''}
        </div>`;
    }).join('');
  },

  goTo(surahNum, ayahNum) {
    showPage('reader');
    if (Reader.state.surahNum === surahNum && Reader.state.ayahs.length) {
      Reader.state.currentAyah = ayahNum;
      Reader._highlightAyah(ayahNum);
      Reader._scrollToAyah(ayahNum, 'smooth');
    } else {
      Reader.loadSurah(surahNum, ayahNum);
    }
  },

  async toggleVisibility(id) {
    const bm = loadBookmarks().find(b => b.id === id);
    if (!bm) return;
    const isPublished = bm.visibility === 'published';

    if (!bm.note || bm.note.trim() === '') {
      showToast(t('reflection_needs_note'));
      return;
    }

    if (isPublished) {
      await Progress.unpublishReflection(bm);
      showToast(t('made_private'));
    } else {
      const userName = loadUserName();
      await Progress.publishReflection(bm, userName);
      showToast(t('reflection_published'));
    }
    this.render();
  },

  remove(id) {
    const bm = loadBookmarks().find(b => b.id === id);
    Progress.deleteBookmark(id, bm?.surahNum, bm?.ayahNum);
    this.render();
    if (Reader.state.ayahs.length) Reader._refreshBookmarkIcons();
  },

  openSheet(surahNum, ayahNum, arabic) {
    const sheet = document.getElementById('bookmark-sheet');
    if (!sheet) return;
    sheet.dataset.surah  = surahNum;
    sheet.dataset.ayah   = ayahNum;
    sheet.dataset.arabic = arabic;

    const existing = loadBookmarks().find(b => b.surahNum === surahNum && b.ayahNum === ayahNum);

    const titleEl = document.getElementById('bookmark-title-input');
    if (titleEl) titleEl.value = existing?.title || '';

    const noteEl = document.getElementById('bookmark-note-input');
    if (noteEl) noteEl.value = existing?.note || '';

    const headerEl = document.getElementById('bookmark-sheet-title');
    if (headerEl) {
      const meta    = getSurahMeta(surahNum);
      const langIdx = currentLang === 'ur' ? 1 : currentLang === 'hi' ? 2 : 0;
      headerEl.textContent = (meta.name[langIdx] || meta.name[0]) + ' · ' + t('ayah_label') + ' ' + ayahNum;
    }

    sheet.classList.add('open');
    document.getElementById('bookmark-sheet-backdrop')?.classList.add('open');

    // Focus title first — nudge the student to name their thought
    setTimeout(() => titleEl?.focus(), 350);
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
    const title  = document.getElementById('bookmark-title-input')?.value.trim() || '';
    const note   = document.getElementById('bookmark-note-input')?.value || '';
    const bm     = addBookmark(surah, ayah, arabic, note, title);
    Progress.saveBookmark(bm);
    this.closeSheet();
    Reader._refreshBookmarkIcons();
    showToast(t('bookmark_saved'));
  },
};
