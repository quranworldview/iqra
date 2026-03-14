// ============================================================
// APP.JS — Iqra Qur'an Reader
// ============================================================

function showPage(pageName) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + pageName);
  if (!target) return;
  target.classList.add('active');
  saveLastPage(pageName);

  document.querySelectorAll('.bottom-nav-btn').forEach(btn => {
    btn.classList.toggle('active-page', btn.getAttribute('data-page') === pageName);
  });

  if (pageName === 'overview') Overview.render();
}

document.addEventListener('DOMContentLoaded', async () => {

  // 1. Apply persisted preferences — no flash
  initTheme();
  initI18n();

  // 2. Show overview first
  showPage('overview');

  // 3. Init reader
  await Reader.init();

  // 4. Auto-show tour on first visit
  if (Tour.shouldAutoShow()) {
    setTimeout(() => Tour.open(), 800);
  }

  // 5. Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === ' ' || e.key === 'k') { e.preventDefault(); Reader.toggleSurahPlay(); }
    if (e.key === 'ArrowRight') nextSurah();
    if (e.key === 'ArrowLeft')  prevSurah();
    if (e.key === 'Escape') {
      closeSurahSelector();
      closeSettings();
      Tour.close();
    }
  });

  // 6. Close modals on backdrop click
  document.getElementById('surah-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('surah-modal')) closeSurahSelector();
  });

  // 7. Surah search
  document.getElementById('surah-search').addEventListener('input', e => {
    renderSurahList(e.target.value);
  });

  // 8. Ayah goto — enter key
  document.getElementById('ayah-goto-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') gotoAyah();
  });

  // 9. Tour swipe support (touch)
  let _tourTouchX = null;
  document.getElementById('tour-card')?.addEventListener('touchstart', e => {
    _tourTouchX = e.touches[0].clientX;
  }, { passive: true });
  document.getElementById('tour-card')?.addEventListener('touchend', e => {
    if (_tourTouchX === null) return;
    const diff = _tourTouchX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) Tour.next();
      else Tour.prev();
    }
    _tourTouchX = null;
  }, { passive: true });

});
