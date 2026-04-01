// ============================================================
// SETTINGS — Miftah
// Settings panel open/close only.
// The buttons inside the panel call setTheme(), setLang(),
// setTextSize(), signOut() directly — all defined elsewhere.
//
// Depends on: nothing (pure DOM manipulation)
// ============================================================

function toggleSettings() {
  const panel    = document.getElementById('settings-panel');
  const backdrop = document.getElementById('settings-backdrop');
  const isOpen   = panel.classList.contains('open');
  if (isOpen) {
    closeSettings();
  } else {
    panel.classList.add('open');
    backdrop.classList.add('open');
    // Refresh profile stats every time settings opens
    if (typeof Profile !== 'undefined') Profile.updateSettingsUI();
  }
}

function closeSettings() {
  document.getElementById('settings-panel').classList.remove('open');
  document.getElementById('settings-backdrop').classList.remove('open');
}

// Updates the email shown in the settings panel.
// Called by app.js after auth state changes.
function setSettingsEmail(email) {
  const el = document.getElementById('settings-user-email');
  if (el) el.textContent = email || '';
}
