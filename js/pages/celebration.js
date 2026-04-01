// ============================================================
// CELEBRATION — Iqra
// Triggered when an achievement is unlocked or a goal is met.
// Shows a modal with particle burst, icon, title, and flavour text.
// Queue-based: multiple unlocks show one after another.
// ============================================================

const Celebration = {

  _queue: [],
  _open: false,

  // ── Achievement definitions ────────────────────────────────
  // Each entry maps an achievement id to display data.
  _defs: {
    streak_7: {
      icon:  '🔥',
      title: () => t('ach_streak_7'),
      sub:   () => t('celeb_sub_streak_7'),
    },
    kahf_complete: {
      icon:  '🕌',
      title: () => t('ach_kahf'),
      sub:   () => t('celeb_sub_kahf'),
    },
    mulk_complete: {
      icon:  '🌙',
      title: () => t('ach_mulk'),
      sub:   () => t('celeb_sub_mulk'),
    },
    surahs_10: {
      icon:  '✨',
      title: () => t('ach_surahs_10'),
      sub:   () => t('celeb_sub_surahs_10'),
    },
    goal_met: {
      icon:  '🏅',
      title: () => t('ach_goal_met'),
      sub:   () => t('celeb_sub_goal_met'),
      label: () => t('celeb_goal_label'), // override top label for goals
    },
  },

  // ── Public: queue and show ─────────────────────────────────
  // achievements: array of { id } objects (from checkAchievements)
  show(achievements) {
    achievements.forEach(a => {
      const def = this._defs[a.id] || this._defs[a.id.replace(/_\d+$/, '')]; // strip month suffix from goal_met_N
      if (def) this._queue.push({ ...a, def });
    });
    if (!this._open) this._next();
  },

  _next() {
    if (this._queue.length === 0) { this._open = false; return; }
    this._open = true;
    const item = this._queue.shift();
    this._render(item);
    this._burst();
    document.getElementById('celebration-modal')?.classList.add('open');
  },

  _render(item) {
    const def = item.def;
    const iconEl  = document.getElementById('celeb-icon');
    const titleEl = document.getElementById('celeb-title');
    const subEl   = document.getElementById('celeb-sub');
    const labelEl = document.querySelector('.celebration-label');

    if (iconEl)  iconEl.textContent  = def.icon;
    if (titleEl) titleEl.textContent = def.title();
    if (subEl)   subEl.textContent   = def.sub ? def.sub() : '';
    if (labelEl) labelEl.textContent = def.label ? def.label() : t('celeb_unlocked');
  },

  // ── Close — show next in queue if any ─────────────────────
  close() {
    document.getElementById('celebration-modal')?.classList.remove('open');
    // Small delay so close animation finishes before next opens
    setTimeout(() => this._next(), 380);
  },

  // ── Particle burst ─────────────────────────────────────────
  _burst() {
    const container = document.getElementById('celebration-particles');
    if (!container) return;
    container.innerHTML = '';

    const colors = ['#D4AF37', '#f5d97a', '#fff8e1', '#c8a800', '#ffe082'];
    const count  = 28;

    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'celeb-particle';
      el.style.cssText = [
        `left: ${10 + Math.random() * 80}%`,
        `top:  ${-8 + Math.random() * 30}%`,
        `background: ${colors[Math.floor(Math.random() * colors.length)]}`,
        `width:  ${4 + Math.random() * 6}px`,
        `height: ${4 + Math.random() * 6}px`,
        `animation-delay: ${Math.random() * 0.5}s`,
        `animation-duration: ${1.2 + Math.random() * 0.8}s`,
        `border-radius: ${Math.random() > 0.5 ? '50%' : '2px'}`,
      ].join(';');
      container.appendChild(el);
    }
  },
};
