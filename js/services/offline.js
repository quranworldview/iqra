// ============================================================
// OFFLINE — Iqra V2
// Manages "Download All" for offline use.
// Shows progress, updates tile indicators in overview.
// ============================================================

const Offline = {
  isDownloading: false,

  async downloadAll() {
    if (this.isDownloading) return;
    this.isDownloading = true;

    const btn      = document.getElementById('download-all-btn');
    const progress = document.getElementById('download-progress');
    const bar      = document.getElementById('download-bar-fill');
    const label    = document.getElementById('download-label');

    if (btn)      btn.disabled = true;
    if (progress) progress.style.display = 'block';

    try {
      await downloadAllSurahs((done, total) => {
        const pct = Math.round((done / total) * 100);
        if (bar)   bar.style.width = pct + '%';
        if (label) label.textContent = done + ' / ' + total + ' ' + t('surahs_cached');
        // Refresh overview tiles to show cached indicators
        if (done % 10 === 0 && typeof Overview !== 'undefined') Overview.render();
      });
      if (label) label.textContent = t('all_cached');
      if (typeof Overview !== 'undefined') Overview.render();
      showToast(t('download_complete'));
    } catch(e) {
      if (label) label.textContent = t('download_failed');
    }

    this.isDownloading = false;
    if (btn) btn.disabled = false;
  },

  getStorageEstimate() {
    const cached = loadCachedSurahs();
    // Rough estimate: ~15KB per surah text average
    const kb = cached.length * 15;
    if (kb < 1024) return kb + ' KB';
    return (kb / 1024).toFixed(1) + ' MB';
  },

  updateStorageDisplay() {
    const el = document.getElementById('storage-usage');
    if (el) {
      const cached = loadCachedSurahs().length;
      el.textContent = cached + ' / 114 ' + t('surahs_cached') + ' · ' + this.getStorageEstimate();
    }
  },
};
