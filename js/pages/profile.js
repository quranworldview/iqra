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
    const today    = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD' — matches Firestore format
    const lastDate = streak.lastDate;

    if (lastDate === today) return; // already counted today

    // Yesterday in YYYY-MM-DD — subtract one full day, take date portion
    const yesterdayDate = new Date(Date.now() - 86400000);
    const yesterday     = yesterdayDate.toISOString().slice(0, 10);

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

  // ── Al-Mulk nightly streak ────────────────────────────────
  // Call when surah 67 is completed. Only counts if after Isha.
  // Uses notif-cards Isha check logic (same 21:00 fallback).
  async recordMulkRead() {
    const today = new Date().toISOString().slice(0, 10);
    const streak = loadMulkStreak();

    // Already counted tonight
    if (streak.lastDate === today) return;

    // Only count after Isha (21:00 fallback if geolocation unavailable)
    const ishaMs = await this._getIshaMs();
    if (Date.now() < ishaMs) return;

    // Was last count yesterday? Continue streak. Otherwise reset to 1.
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const newCurrent = streak.lastDate === yesterday ? streak.current + 1 : 1;
    const newLongest = Math.max(newCurrent, streak.longest || 0);

    const updated = { current: newCurrent, longest: newLongest, lastDate: today };
    Progress.saveMulkStreak(updated);
  },

  // ── Al-Kahf weekly streak ─────────────────────────────────
  // Call when surah 18 is completed. Only counts on Friday.
  recordKahfRead() {
    if (new Date().getDay() !== 5) return; // not Friday
    const today = new Date().toISOString().slice(0, 10);
    const streak = loadKahfStreak();

    // Already counted this Friday
    if (streak.lastFriday === today) return;

    // Was last Friday exactly 7 days ago? Continue streak. Otherwise reset to 1.
    const lastFridayMs = streak.lastFriday ? new Date(streak.lastFriday).getTime() : 0;
    const daysSince    = Math.round((Date.now() - lastFridayMs) / 86400000);
    const newCurrent   = (daysSince >= 6 && daysSince <= 8) ? streak.current + 1 : 1;
    const newLongest   = Math.max(newCurrent, streak.longest || 0);

    const updated = { current: newCurrent, longest: newLongest, lastFriday: today };
    Progress.saveKahfStreak(updated);
  },

  // ── Get Isha time in ms (reuses aladhan cache from notif-cards) ──
  async _getIshaMs() {
    try {
      const today    = new Date().toISOString().slice(0, 10);
      const cacheKey = 'notif_isha_' + today;
      const cached   = _get(cacheKey);
      if (cached) return parseInt(cached);
      // Fall back to 21:00 local if no cache
      const d = new Date();
      d.setHours(21, 0, 0, 0);
      return d.getTime();
    } catch(e) {
      const d = new Date();
      d.setHours(21, 0, 0, 0);
      return d.getTime();
    }
  },

  // ── Mulk streak milestone achievements ───────────────────
  _checkMulkStreakAchievements(newlyEarned) {
    const { current } = loadMulkStreak();
    const milestones = [
      { id: 'mulk_7',  threshold: 7,  icon: '🌙', labelKey: 'ach_mulk_7'  },
      { id: 'mulk_30', threshold: 30, icon: '🌟', labelKey: 'ach_mulk_30' },
    ];
    milestones.forEach(m => {
      if (current >= m.threshold && awardAchievement(m.id)) {
        newlyEarned.push({ id: m.id, icon: m.icon, label: t(m.labelKey) });
      }
    });
    if (newlyEarned.length > 0) {
      Progress.saveAchievements(loadAchievements());
      setTimeout(() => Celebration.show(newlyEarned), 600);
    }
  },

  // ── Kahf streak milestone achievements ────────────────────
  _checkKahfStreakAchievements(newlyEarned) {
    const { current } = loadKahfStreak();
    const milestones = [
      { id: 'kahf_4',  threshold: 4,  icon: '🕌', labelKey: 'ach_kahf_4'  },
      { id: 'kahf_12', threshold: 12, icon: '✦',  labelKey: 'ach_kahf_12' },
    ];
    milestones.forEach(m => {
      if (current >= m.threshold && awardAchievement(m.id)) {
        newlyEarned.push({ id: m.id, icon: m.icon, label: t(m.labelKey) });
      }
    });
  },

  // ── Goal progress ─────────────────────────────────────────
  getGoalProgress() {
    const goal = loadUserGoal();
    if (!goal) return null;
    if (goal.goalType === 'habit') return null; // habit goal uses streak display, not this

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

    // 🌙 Al-Mulk completed — one-time badge + trigger nightly streak
    if (isSurahCompleted(67)) {
      if (awardAchievement('mulk_complete')) {
        newlyEarned.push({ id: 'mulk_complete', icon: '🌙', label: t('ach_mulk') });
      }
      // Record toward nightly streak (async, fire-and-forget)
      this.recordMulkRead().then(() => {
        this._checkMulkStreakAchievements(newlyEarned);
        this.updateSettingsUI();
      });
    }

    // 🕌 Al-Kahf completed — one-time badge + trigger Friday streak
    if (isSurahCompleted(18)) {
      if (awardAchievement('kahf_complete')) {
        newlyEarned.push({ id: 'kahf_complete', icon: '🕌', label: t('ach_kahf') });
      }
      this.recordKahfRead();
      this._checkKahfStreakAchievements(newlyEarned);
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

    // Mulk & Kahf streaks
    const mulkStreak = loadMulkStreak();
    const kahfStreak = loadKahfStreak();
    const mulkCurEl  = document.getElementById('profile-mulk-current');
    const mulkBestEl = document.getElementById('profile-mulk-longest');
    const kahfCurEl  = document.getElementById('profile-kahf-current');
    const kahfBestEl = document.getElementById('profile-kahf-longest');
    if (mulkCurEl)  mulkCurEl.textContent  = mulkStreak.current;
    if (mulkBestEl) mulkBestEl.textContent = mulkStreak.longest;
    if (kahfCurEl)  kahfCurEl.textContent  = kahfStreak.current;
    if (kahfBestEl) kahfBestEl.textContent = kahfStreak.longest;

    // Progress bar — surah milestone goal
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

    // Goal inputs — restore correct tab and progress
    const goalType = goal?.goalType || (goal?.daysPerWeek > 0 ? 'habit' : 'surahs');
    this.switchGoalTab(goalType);

    if (goalType === 'habit') {
      // Habit goal — show days/week value and streak-as-progress
      const daysEl = document.getElementById('profile-days-per-week');
      if (daysEl && goal?.daysPerWeek) daysEl.value = goal.daysPerWeek;

      // Progress: days read this week vs target
      const habitTrack = document.getElementById('habit-goal-track');
      const habitBar   = document.getElementById('profile-habit-bar');
      const habitLabel = document.getElementById('profile-habit-label');
      if (goal?.daysPerWeek > 0) {
        // Count unique reading days this week
        const weekStart = this._periodStart('week');
        const streak    = loadStreak();
        // Simple proxy: current streak days, capped at daysPerWeek
        const daysThisWeek = Math.min(this.getStreak(), goal.daysPerWeek);
        const pct = Math.min(100, Math.round((daysThisWeek / goal.daysPerWeek) * 100));
        if (habitTrack) habitTrack.style.display = 'block';
        if (habitBar)   habitBar.style.width = pct + '%';
        if (habitLabel) habitLabel.textContent = daysThisWeek + ' / ' + goal.daysPerWeek + ' ' + t('days');
      } else {
        if (habitTrack) habitTrack.style.display = 'none';
        if (habitLabel) habitLabel.textContent = t('no_goal_set');
      }
    } else {
      // Surah milestone goal
      const goalCount  = document.getElementById('profile-goal-count');
      const goalPeriod = document.getElementById('profile-goal-period');
      if (goalCount  && goal) goalCount.value  = goal.count;
      if (goalPeriod && goal) goalPeriod.value = goal.period;

      const barEl   = document.getElementById('profile-goal-bar');
      const labelEl = document.getElementById('profile-goal-label');
      const badgeEl = document.getElementById('profile-goal-badge');
      if (progress && barEl) {
        barEl.style.width = progress.pct + '%';
        if (labelEl) {
          labelEl.textContent = progress.completed + ' / ' + progress.target
            + ' ' + t('surahs_goal') + ' · ' + t('period_' + progress.goal.period);
        }
        if (badgeEl) badgeEl.style.display = progress.reached ? 'inline-block' : 'none';
      } else if (barEl) {
        barEl.style.width = '0%';
        if (labelEl) labelEl.textContent = t('no_goal_set');
        if (badgeEl) badgeEl.style.display = 'none';
      }
    }

    // Sunnah goals
    const sunnahGoals = loadSunnahGoals();
    const mulkTargetEl = document.getElementById('profile-mulk-target');
    const kahfTargetEl = document.getElementById('profile-kahf-target');
    if (mulkTargetEl && sunnahGoals.mulkTarget) mulkTargetEl.value = sunnahGoals.mulkTarget;
    if (kahfTargetEl && sunnahGoals.kahfTarget) kahfTargetEl.value = sunnahGoals.kahfTarget;

    // Sunnah goal progress labels
    const mulkGoalLabelEl = document.getElementById('profile-mulk-goal-label');
    const kahfGoalLabelEl = document.getElementById('profile-kahf-goal-label');
    if (mulkGoalLabelEl && sunnahGoals.mulkTarget > 0) {
      const pct = Math.min(100, Math.round((mulkStreak.current / sunnahGoals.mulkTarget) * 100));
      mulkGoalLabelEl.textContent = mulkStreak.current + ' / ' + sunnahGoals.mulkTarget + ' ' + t('nights');
      const mulkBarEl = document.getElementById('profile-mulk-goal-bar');
      if (mulkBarEl) mulkBarEl.style.width = pct + '%';
    }
    if (kahfGoalLabelEl && sunnahGoals.kahfTarget > 0) {
      const pct = Math.min(100, Math.round((kahfStreak.current / sunnahGoals.kahfTarget) * 100));
      kahfGoalLabelEl.textContent = kahfStreak.current + ' / ' + sunnahGoals.kahfTarget + ' ' + t('fridays');
      const kahfBarEl = document.getElementById('profile-kahf-goal-bar');
      if (kahfBarEl) kahfBarEl.style.width = pct + '%';
    }
  },

  _allAchievementDefs() {
    return [
      { id: 'streak_7',      icon: '🔥', label: t('ach_streak_7')       },
      { id: 'kahf_complete', icon: '🕌', label: t('ach_kahf')           },
      { id: 'kahf_4',        icon: '🕌', label: t('ach_kahf_4')         },
      { id: 'kahf_12',       icon: '✦',  label: t('ach_kahf_12')        },
      { id: 'mulk_complete', icon: '🌙', label: t('ach_mulk')           },
      { id: 'mulk_7',        icon: '🌙', label: t('ach_mulk_7')         },
      { id: 'mulk_30',       icon: '🌟', label: t('ach_mulk_30')        },
      { id: 'surahs_10',     icon: '✨', label: t('ach_surahs_10')      },
      { id: 'goal_met',      icon: '🏅', label: t('ach_goal_met')       },
      { id: 'quran_complete',icon: '📖', label: t('ach_quran_complete') },
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

  // ── Switch goal tab (settings panel) ────────────────────
  switchGoalTab(type) {
    document.getElementById('goal-tab-habit')?.classList.toggle('active',  type === 'habit');
    document.getElementById('goal-tab-surahs')?.classList.toggle('active', type === 'surahs');
    document.getElementById('goal-panel-habit')?.style.setProperty('display',  type === 'habit'  ? 'block' : 'none');
    document.getElementById('goal-panel-surahs')?.style.setProperty('display', type === 'surahs' ? 'block' : 'none');
  },

  // ── Switch goal tab (setup modal) ────────────────────────
  switchSetupGoalTab(type) {
    document.getElementById('setup-goal-tab-habit')?.classList.toggle('active',  type === 'habit');
    document.getElementById('setup-goal-tab-surahs')?.classList.toggle('active', type === 'surahs');
    document.getElementById('setup-goal-panel-habit')?.style.setProperty('display',  type === 'habit'  ? 'block' : 'none');
    document.getElementById('setup-goal-panel-surahs')?.style.setProperty('display', type === 'surahs' ? 'block' : 'none');
  },

  saveGoal() {
    // Determine which tab is active
    const isHabit = document.getElementById('goal-tab-habit')?.classList.contains('active');
    const daysEl   = document.getElementById('profile-days-per-week');
    const countEl  = document.getElementById('profile-goal-count');
    const periodEl = document.getElementById('profile-goal-period');

    let goal;
    if (isHabit) {
      const daysPerWeek = Math.min(7, Math.max(1, parseInt(daysEl?.value) || 5));
      goal = { goalType: 'habit', daysPerWeek, type: 'surahs', count: 0, period: 'week' };
    } else {
      const count = parseInt(countEl?.value);
      if (!count || count < 1) return;
      goal = { goalType: 'surahs', daysPerWeek: 0, type: 'surahs', count, period: periodEl?.value || 'week' };
    }
    Progress.saveGoal(goal);
    this.updateSettingsUI();
    showToast(t('goal_saved'));
  },

  saveSunnahGoalsUI() {
    const mulkEl = document.getElementById('profile-mulk-target');
    const kahfEl = document.getElementById('profile-kahf-target');
    const mulkTarget = mulkEl ? Math.min(365, Math.max(0, parseInt(mulkEl.value) || 0)) : 0;
    const kahfTarget = kahfEl ? Math.min(52,  Math.max(0, parseInt(kahfEl.value) || 0)) : 0;
    Progress.saveSunnahGoals({ mulkTarget, kahfTarget }); // writes localStorage + Firestore
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
    const nameEl  = document.getElementById('setup-name-input');
    const name    = nameEl?.value.trim() || '';
    const isHabit = document.getElementById('setup-goal-tab-habit')?.classList.contains('active');

    let goal;
    if (isHabit) {
      const daysEl  = document.getElementById('setup-days-per-week');
      const daysPerWeek = Math.min(7, Math.max(1, parseInt(daysEl?.value) || 5));
      goal = { goalType: 'habit', daysPerWeek, type: 'surahs', count: 0, period: 'week' };
    } else {
      const countEl  = document.getElementById('setup-goal-count');
      const periodEl = document.getElementById('setup-goal-period');
      const count    = parseInt(countEl?.value) || 5;
      const period   = periodEl?.value || 'week';
      goal = { goalType: 'surahs', daysPerWeek: 0, type: 'surahs', count, period };
    }

    if (name) Progress.saveName(name);
    Progress.saveGoal(goal);
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
