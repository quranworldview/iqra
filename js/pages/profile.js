// ============================================================
// PROFILE — Iqra
// User name, reading goal, streak, monthly badge.
// Lives inside the Settings panel — no extra nav tab.
// ============================================================

const Profile = {

  _khatmInProgress: false, // lock — prevents double-firing during async recordKhatm

  // ── Init — called on every app open ───────────────────────
  init() {
    // NOTE: streak is only incremented via recordReadingSession(),
    // called from app.js when the user actually reads. Not on app open.
    this.checkAchievements();
    this.updateSettingsUI();

    // Show setup prompt on first open if no name set
    if (!loadUserName()) {
      setTimeout(() => this.showSetup(), 1200);
    }
  },

  // ── Streak ────────────────────────────────────────────────
  // Called only when the user actually reads (scrolls ayahs or plays audio).
  // Opening the app alone does NOT increment the streak.
  recordReadingSession() {
    const streak   = loadStreak();
    const today    = new Date().toDateString();
    const lastDate = streak.lastDate;

    if (lastDate === today) return; // already counted today

    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const newCount  = lastDate === yesterday ? streak.count + 1 : 1;
    const longest   = Math.max(newCount, streak.longest || 0);

    const newStreak = { count: newCount, longest, lastDate: today };
    Progress.saveStreak(newStreak); // writes localStorage + Firestore
  },

  getStreak() {
    return loadStreak().count || 0;
  },

  getLongestStreak() {
    return loadStreak().longest || 0;
  },

  // ── Goal progress ─────────────────────────────────────────
  getGoalProgress() {
    const goal = loadUserGoal();
    if (!goal) return null;

    const now        = new Date();
    let completed    = 0;

    if (goal.type === 'surahs') {
      // Count surahs whose FIRST completion timestamp falls within the current period.
      // Uses markSurahCompleted() timestamps — never overwritten by navigation.
      const periodStart = this._periodStart(goal.period);
      completed = getSurahsCompletedInPeriod(periodStart);
    }

    const target  = goal.count;
    const pct     = Math.min(100, Math.round((completed / target) * 100));
    const reached = completed >= target;

    return { completed, target, pct, reached, goal };
  },

  _periodStart(period) {
    const now = new Date();
    if (period === 'day')   return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (period === 'week')  {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      return d;
    }
    if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
    return new Date(0);
  },

  // ── Achievements ──────────────────────────────────────────
  checkAchievements() {
    const newlyEarned = [];

    // 🔥 First week streak
    if (this.getStreak() >= 7 && awardAchievement('streak_7')) {
      newlyEarned.push({ id: 'streak_7', icon: '🔥', label: t('ach_streak_7') });
    }

    // 📖 Al-Kahf completed
    if (isSurahCompleted(18) && awardAchievement('kahf_complete')) {
      newlyEarned.push({ id: 'kahf_complete', icon: '🕌', label: t('ach_kahf') });
    }

    // 🌙 Al-Mulk completed
    if (isSurahCompleted(67) && awardAchievement('mulk_complete')) {
      newlyEarned.push({ id: 'mulk_complete', icon: '🌙', label: t('ach_mulk') });
    }

    // ✨ First 10 surahs
    if (getCompletedSurahCount() >= 10 && awardAchievement('surahs_10')) {
      newlyEarned.push({ id: 'surahs_10', icon: '✨', label: t('ach_surahs_10') });
    }

    // 📖 Khatm ul Quran — all 114 surahs completed (repeatable)
    // Lock prevents double-firing since recordKhatm is async
    if (getCompletedSurahCount() >= 114 && !this._khatmInProgress) {
      this._khatmInProgress = true;
      (async () => {
        const khatmNum = await Progress.recordKhatm(); // resets surahs, writes Firestore
        Profile.updateSettingsUI();                    // refresh 0/114 counter immediately
        Overview.render();                             // refresh tiles — all clean again
        setTimeout(() => Khatm.show(khatmNum), 600);  // full-screen celebration
        Profile._khatmInProgress = false;              // release lock
      })();
    }

    // 🏅 Goal met — repeatable per period (daily/weekly/monthly)
    // awardGoalPeriod fires once per period window, permanently stamps badge
    const progress = this.getGoalProgress();
    if (progress?.reached) {
      const periodKey = getGoalPeriodKey(progress.goal.period);
      if (awardGoalPeriod(periodKey)) {
        newlyEarned.push({ id: 'goal_met', icon: '🏅', label: t('ach_goal_met') });
        // Refresh UI immediately so badge lights up without waiting for next render
        setTimeout(() => this.updateSettingsUI(), 50);
      }
    }

    // Sync achievements to Firestore if any newly earned
    if (newlyEarned.length > 0) {
      Progress.saveAchievements(loadAchievements()); // fire-and-forget
      setTimeout(() => Celebration.show(newlyEarned), 600);
    }
  },

  // ── Settings UI ───────────────────────────────────────────
  updateSettingsUI() {
    // Auth state card — transforms based on signed-in vs guest
    this._updateAuthCard();

    const name    = loadUserName();
    const streak  = this.getStreak();
    const goal    = loadUserGoal();
    const progress= this.getGoalProgress();
    const done    = getCompletedSurahCount();

    // Greeting
    const greetEl = document.getElementById('profile-greeting');
    if (greetEl) {
      greetEl.textContent = name
        ? t('greeting') + ', ' + name
        : t('greeting_generic');
    }

    // Streak
    const streakEl = document.getElementById('profile-streak');
    if (streakEl) streakEl.textContent = streak;
    const longestEl = document.getElementById('profile-streak-longest');
    if (longestEl) longestEl.textContent = this.getLongestStreak();

    // Progress bar
    const barEl    = document.getElementById('profile-goal-bar');
    const labelEl  = document.getElementById('profile-goal-label');
    const badgeEl  = document.getElementById('profile-goal-badge');

    if (progress && barEl) {
      barEl.style.width = progress.pct + '%';
      if (labelEl) {
        const periodLabel = t('period_' + progress.goal.period);
        labelEl.textContent = progress.completed + ' / ' + progress.target
          + ' ' + t('surahs_goal') + ' · ' + periodLabel;
      }
      if (badgeEl) {
        badgeEl.style.display = progress.reached ? 'inline-block' : 'none';
      }
    } else if (barEl) {
      barEl.style.width = '0%';
      if (labelEl) labelEl.textContent = t('no_goal_set');
      if (badgeEl) badgeEl.style.display = 'none';
    }

    // Surahs completed count
    const doneEl = document.getElementById('profile-surahs-done');
    if (doneEl) doneEl.textContent = done + ' / 114';

    // Achievements
    const achEl = document.getElementById('profile-achievements');
    if (achEl) {
      const all = this._allAchievementDefs();
      const earned = loadAchievements();
      achEl.innerHTML = all.map(a => {
        // goal_met badge lights up if ANY period variant has been awarded
        const isEarned = a.id === 'goal_met'
          ? earned.some(e => e.id === 'goal_met' || e.id.startsWith('goal_met_'))
          : earned.some(e => e.id === a.id);
        return `<div class="ach-badge ${isEarned ? 'earned' : 'locked'}" title="${a.label}">
          <span class="ach-icon">${a.icon}</span>
          <span class="ach-label">${a.label}</span>
        </div>`;
      }).join('');
    }

    // Name input
    // Update name input (both settings and setup modal)
    ['profile-name-input', 'setup-name-input'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el !== document.activeElement) el.value = name || '';
    });

    // Goal inputs
    const goalCount = document.getElementById('profile-goal-count');
    const goalPeriod = document.getElementById('profile-goal-period');
    if (goalCount && goal)  goalCount.value  = goal.count;
    if (goalPeriod && goal) goalPeriod.value = goal.period;
  },

  _allAchievementDefs() {
    return [
      { id: 'streak_7',    icon: '🔥', label: t('ach_streak_7')  },
      { id: 'kahf_complete', icon: '🕌', label: t('ach_kahf')    },
      { id: 'mulk_complete', icon: '🌙', label: t('ach_mulk')    },
      { id: 'surahs_10',   icon: '✨', label: t('ach_surahs_10') },
      { id: 'goal_met',    icon: '🏅', label: t('ach_goal_met')  },
      { id: 'quran_complete', icon: '📖', label: t('ach_quran_complete') },
    ];
  },

  // ── Save profile from settings ────────────────────────────
  saveName() {
    const input = document.getElementById('profile-name-input');
    if (!input) return;
    const name = input.value.trim();
    if (name) {
      Progress.saveName(name); // writes localStorage + Firestore
      this.updateSettingsUI();
      showToast(t('profile_saved'));
    }
  },

  saveGoal() {
    const countEl  = document.getElementById('profile-goal-count');
    const periodEl = document.getElementById('profile-goal-period');
    if (!countEl || !periodEl) return;
    const count = parseInt(countEl.value);
    if (!count || count < 1) return;
    const goal = { type: 'surahs', count, period: periodEl.value };
    Progress.saveGoal(goal); // writes localStorage + Firestore
    this.updateSettingsUI();
    showToast(t('goal_saved'));
  },

  // ── First-time setup prompt ───────────────────────────────
  showSetup() {
    const modal = document.getElementById('profile-setup-modal');
    if (modal) modal.classList.add('open');
  },

  closeSetup() {
    document.getElementById('profile-setup-modal')?.classList.remove('open');
  },

  saveSetup() {
    const nameEl   = document.getElementById('setup-name-input');
    const countEl  = document.getElementById('setup-goal-count');
    const periodEl = document.getElementById('setup-goal-period');
    const name  = nameEl?.value.trim() || '';
    const count = parseInt(countEl?.value) || 5;
    const period = periodEl?.value || 'week';
    if (name) Progress.saveName(name);
    Progress.saveGoal({ type: 'surahs', count, period });
    this.closeSetup();
    this.updateSettingsUI();
    showToast((name ? t('greeting') + ', ' + name + '! ' : '') + t('goal_saved'));
  },

  // ── Auth state card ────────────────────────────────────────
  // Swaps the profile card top section based on auth state.
  _updateAuthCard() {
    const guestBanner  = document.getElementById('profile-guest-banner');
    const signedInCard = document.getElementById('profile-signedin-card');
    const nameEdit     = document.getElementById('profile-name-edit');
    const nameDisplay  = document.getElementById('profile-name-display');
    const nameText     = document.getElementById('profile-name-text');

    if (Auth.isSignedIn) {
      // Signed-in: hide guest banner, show sync card, show read-only name
      if (guestBanner)  guestBanner.style.display  = 'none';
      if (signedInCard) {
        signedInCard.style.display = 'flex';
        const emailEl = document.getElementById('profile-signedin-email');
        if (emailEl) emailEl.textContent = Auth.currentUser.email;
      }
      if (nameEdit)    nameEdit.style.display    = 'none';
      if (nameDisplay) nameDisplay.style.display = 'block';
      if (nameText) {
        const name = loadUserName();
        nameText.textContent = name || Auth.currentUser.email.split('@')[0];
      }
    } else {
      // Guest: show banner, hide sync card, show editable input
      if (guestBanner)  guestBanner.style.display  = 'flex';
      if (signedInCard) signedInCard.style.display = 'none';
      if (nameEdit)    nameEdit.style.display    = 'flex';
      if (nameDisplay) nameDisplay.style.display = 'none';
    }
  },
};
