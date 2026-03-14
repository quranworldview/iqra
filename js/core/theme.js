// ============================================================
// THEME — Iqra
// Dark/light toggle + independent Arabic and translation sizes.
// ============================================================

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  saveTheme(theme);
  document.querySelectorAll('[data-theme-btn]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-theme-btn') === theme);
  });
  const isDark = theme === 'dark';
  document.querySelectorAll('.theme-logo').forEach(img => {
    img.src = isDark ? 'icons/logo-iqra.png' : 'icons/logo-iqra.png';
  });
}

function setArabicSize(size) {
  document.documentElement.setAttribute('data-arabic-size', size);
  saveArabicSize(size);
  document.querySelectorAll('[data-arabic-size-btn]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-arabic-size-btn') === size);
  });
}

function setTransSize(size) {
  document.documentElement.setAttribute('data-trans-size', size);
  saveTransSize(size);
  document.querySelectorAll('[data-trans-size-btn]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-trans-size-btn') === size);
  });
}

function initTheme() {
  setTheme(loadTheme());
  setArabicSize(loadArabicSize());
  setTransSize(loadTransSize());
}
