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
  _applyThemeLogo(theme);
}

// ── Resolve effective theme (system → dark or light) ─────────
function _resolveTheme(theme) {
  if (theme !== 'system') return theme;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

// ── Swap logos to match resolved theme ───────────────────────
function _applyThemeLogo(theme) {
  const resolved = _resolveTheme(theme);
  const logoSrc  = resolved === 'light' ? 'icons/logo-light.png' : 'icons/logo-dark.png';
  document.querySelectorAll('.theme-logo').forEach(img => { img.src = logoSrc; });
}

// ── Listen for OS theme changes (relevant only in system mode) ─
const _systemThemeWatcher = window.matchMedia('(prefers-color-scheme: light)');
_systemThemeWatcher.addEventListener('change', () => {
  if (loadTheme() === 'system') _applyThemeLogo('system');
});

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
