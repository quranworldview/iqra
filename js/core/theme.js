// ============================================================
// THEME — Iqra V2
// Dark/light + text sizes + reading mode + reciter
// ============================================================

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  saveTheme(theme);
  document.querySelectorAll('[data-theme-btn]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-theme-btn') === theme);
  });
  // Swap logos to match theme
  const logoSrc = theme === 'light' ? 'icons/logo-light.png' : 'icons/logo-dark.png';
  document.querySelectorAll('.theme-logo').forEach(img => { img.src = logoSrc; });
}

function setArabicSize(size) {
  document.documentElement.setAttribute('data-arabic-size', size);
  saveArabicSize(size);
  if (typeof Progress !== 'undefined') Progress.saveSettings();
  document.querySelectorAll('[data-arabic-size-btn]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-arabic-size-btn') === size);
  });
}

function setTransSize(size) {
  document.documentElement.setAttribute('data-trans-size', size);
  saveTransSize(size);
  if (typeof Progress !== 'undefined') Progress.saveSettings();
  document.querySelectorAll('[data-trans-size-btn]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-trans-size-btn') === size);
  });
}

function setReadingMode(on) {
  document.documentElement.classList.toggle('reading-mode', on);
  saveReadingMode(on);
  const btn = document.getElementById('reading-mode-btn');
  if (btn) {
    btn.classList.toggle('active', on);
    const lbl = btn?.querySelector('.rm-label'); if (lbl) lbl.textContent = on ? (typeof t === 'function' ? t('reading_mode_on') : 'On') : (typeof t === 'function' ? t('reading_mode_off') : 'Off');
  }
}

function toggleReadingMode() {
  setReadingMode(!loadReadingMode());
}

function setReciter(id) {
  saveReciter(id);
  if (typeof Progress !== 'undefined') Progress.saveSettings();
  // Stop any playing audio — reciter changed
  if (typeof Reader !== 'undefined') Reader._stopAudio();
  document.querySelectorAll('[data-reciter-btn]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-reciter-btn') === id);
  });
}

function setScript(script) {
  document.documentElement.setAttribute('data-script', script);
  saveScript(script);
  document.querySelectorAll('[data-script-btn]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-script-btn') === script);
  });
  // Re-render if reader is loaded
  if (typeof Reader !== 'undefined' && Reader.state.ayahs.length) {
    Reader.renderAyahs();
    Reader._scrollToAyah(Reader.state.currentAyah, 'instant');
  }
}

function initTheme() {
  setTheme(loadTheme());
  setArabicSize(loadArabicSize());
  setTransSize(loadTransSize());
  setScript(loadScript());
  setReadingMode(loadReadingMode());
  // Mark active reciter button
  const rid = loadReciter();
  document.querySelectorAll('[data-reciter-btn]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-reciter-btn') === rid);
  });
}
