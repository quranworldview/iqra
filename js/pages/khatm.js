// ============================================================
// KHATM — Iqra Qur'an Reader
//
// Full-screen Khatm ul Quran celebration.
// Shown once when all 114 surahs are completed.
//
// Dua at Khatm: reported from the practice of the Salaf
// (Ibn Abbas and companions) at the completion of the Quran.
// ============================================================

const Khatm = {

  show() {
    const modal = document.getElementById('khatm-modal');
    if (!modal) return;
    modal.classList.add('open');
    this._burst();
  },

  close() {
    const modal = document.getElementById('khatm-modal');
    if (modal) modal.classList.remove('open');
  },

  // ── Gold particle burst — more generous than achievement burst
  _burst() {
    const container = document.getElementById('khatm-particles');
    if (!container) return;
    container.innerHTML = '';

    const colors = ['#D4AF37', '#f5d97a', '#fff8e1', '#c8a800', '#ffe082', '#ffffff'];
    const count  = 60;

    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'khatm-particle';
      el.style.cssText = [
        `left: ${Math.random() * 100}%`,
        `top:  ${-5 + Math.random() * 40}%`,
        `background: ${colors[Math.floor(Math.random() * colors.length)]}`,
        `width:  ${3 + Math.random() * 7}px`,
        `height: ${3 + Math.random() * 7}px`,
        `animation-delay: ${Math.random() * 0.8}s`,
        `animation-duration: ${1.5 + Math.random() * 1.2}s`,
        `border-radius: ${Math.random() > 0.4 ? '50%' : '2px'}`,
      ].join(';');
      container.appendChild(el);
    }
  },
};
