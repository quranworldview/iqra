// ============================================================
// PROGRESS — Iqra Qur'an Reader
//
// ALL Firestore reads and writes go through here.
// Page files and profile.js never call db directly.
//
// Strategy:
//   - localStorage is always written first (instant, offline)
//   - Firestore write follows if user is signed in (async,
//     errors are swallowed — local state is source of truth)
//   - On sign-in: load from Firestore, merge with localStorage
//     keeping the richer data (higher streak, more surahs, etc.)
// ============================================================

const Progress = {

  get uid() {
    return Auth.currentUser?.uid || null;
  },

  // ── Save streak ───────────────────────────────────────────
  async saveStreak(streakObj) {
    saveStreak(streakObj); // localStorage always
    if (!this.uid) return;
    await db.collection(COLLECTIONS.IQRA_PROGRESS).doc(this.uid)
      .set({
        current_streak: streakObj.count   || 0,
        longest_streak: streakObj.longest || 0,
        last_read_date: new Date().toISOString().slice(0, 10),
        updated_at:     firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true })
      .catch(e => console.warn('[Iqra progress] streak write failed:', e));
  },

  // ── Save surah completed ──────────────────────────────────
  async saveSurahCompleted(surahNum) {
    markSurahCompleted(surahNum); // localStorage always
    if (!this.uid) return;
    const completed = getCompletedSurahs();
    await db.collection(COLLECTIONS.IQRA_PROGRESS).doc(this.uid)
      .set({
        surahs_read: completed,
        updated_at:  firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true })
      .catch(e => console.warn('[Iqra progress] surah write failed:', e));
  },

  // ── Save achievements ─────────────────────────────────────
  async saveAchievements(achievementsArr) {
    saveAchievements(achievementsArr); // localStorage always
    if (!this.uid) return;
    const ids = achievementsArr.map(a => a.id);
    await db.collection(COLLECTIONS.IQRA_PROGRESS).doc(this.uid)
      .set({
        achievements: ids,
        updated_at:   firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true })
      .catch(e => console.warn('[Iqra progress] achievements write failed:', e));
  },

  // ── Save reading goal ─────────────────────────────────────
  async saveGoal(goal) {
    saveUserGoal(goal); // localStorage always
    if (!this.uid) return;
    await db.collection(COLLECTIONS.IQRA_PROGRESS).doc(this.uid)
      .set({
        reading_goal: {
          type:       goal.type,
          count:      goal.count,
          start_date: new Date().toISOString().slice(0, 10),
        },
        updated_at: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true })
      .catch(e => console.warn('[Iqra progress] goal write failed:', e));
  },

  // ── Save settings ─────────────────────────────────────────
  async saveSettings() {
    if (!this.uid) return;
    await db.collection(COLLECTIONS.IQRA_PROGRESS).doc(this.uid)
      .set({
        settings: {
          reciter:          loadReciter(),
          arabic_size:      loadArabicSize(),
          translation_size: loadTransSize(),
        },
        updated_at: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true })
      .catch(e => console.warn('[Iqra progress] settings write failed:', e));
  },

  // ── Save notification preferences ─────────────────────────
  async saveNotifPrefs() {
    if (!this.uid) return;
    await db.collection(COLLECTIONS.IQRA_PROGRESS).doc(this.uid)
      .set({
        notifications: {
          aotd: { enabled: loadNotifEnabled('aotd'), time: loadNotifTime('aotd') || '08:00' },
          kahf: { enabled: loadNotifEnabled('kahf'), time: loadNotifTime('kahf') || '08:00' },
          mulk: { enabled: loadNotifEnabled('mulk'), time: loadNotifTime('mulk') || '21:30' },
        },
        updated_at: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true })
      .catch(e => console.warn('[Iqra progress] notif prefs write failed:', e));
  },

  // ── Record Khatm ul Quran ─────────────────────────────────
  // Called from profile.js when all 114 surahs are completed.
  // 1. Increments khatm_count in localStorage + Firestore
  // 2. Clears all surahs_read (fresh start for next khatm)
  // 3. Appends entry to khatm_history in Firestore
  // Returns the new khatm count.
  async recordKhatm() {
    const count = awardKhatm();          // localStorage: count + achievement stamp
    resetKhatmSurahs();                  // localStorage: clear 114 completed_at keys

    if (!this.uid) return count;

    const now = firebase.firestore.FieldValue.serverTimestamp();
    await db.collection(COLLECTIONS.IQRA_PROGRESS).doc(this.uid)
      .set({
        khatm_count:  count,
        surahs_read:  [],               // reset for next khatm
        achievements: loadAchievements().map(a => a.id),
        khatm_history: firebase.firestore.FieldValue.arrayUnion({
          count:        count,
          completed_at: new Date().toISOString(),
        }),
        updated_at: now,
      }, { merge: true })
      .catch(e => console.warn('[Iqra progress] khatm write failed:', e));

    return count;
  },

  // ── Save favourites ──────────────────────────────────────────
  async saveFavourites() {
    if (!this.uid) return;
    await db.collection(COLLECTIONS.IQRA_PROGRESS).doc(this.uid)
      .set({
        favourites: loadFavourites(),
        updated_at: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true })
      .catch(e => console.warn('[Iqra progress] favourites write failed:', e));
  },

  // ── Save bookmark ─────────────────────────────────────────
  async saveBookmark(bookmark) {
    // bookmark: { id, surahNum, ayahNum, arabic, note, savedAt }
    addBookmark(bookmark.surahNum, bookmark.ayahNum, bookmark.arabic, bookmark.note);
    if (!this.uid) return;
    const bmId = bookmark.surahNum + '_' + bookmark.ayahNum;
    await db.collection(COLLECTIONS.IQRA_PROGRESS).doc(this.uid)
      .collection('bookmarks').doc(bmId)
      .set({
        surah_number: bookmark.surahNum,
        ayah_number:  bookmark.ayahNum,
        note:         bookmark.note || null,
        created_at:   firebase.firestore.FieldValue.serverTimestamp(),
      })
      .catch(e => console.warn('[Iqra progress] bookmark write failed:', e));
  },

  // ── Delete bookmark ───────────────────────────────────────
  async deleteBookmark(id, surahNum, ayahNum) {
    removeBookmark(id); // localStorage always
    if (!this.uid) return;
    const bmId = surahNum + '_' + ayahNum;
    await db.collection(COLLECTIONS.IQRA_PROGRESS).doc(this.uid)
      .collection('bookmarks').doc(bmId)
      .delete()
      .catch(e => console.warn('[Iqra progress] bookmark delete failed:', e));
  },

  // ── Save name ─────────────────────────────────────────────
  async saveName(name) {
    saveUserName(name); // localStorage always
    if (!this.uid) return;
    // Name lives on users/{uid} as per schema
    await db.collection(COLLECTIONS.USERS).doc(this.uid)
      .update({ name, last_active: firebase.firestore.FieldValue.serverTimestamp() })
      .catch(e => console.warn('[Iqra progress] name write failed:', e));
  },

  // ── Load from Firestore on sign-in ────────────────────────
  // Merges Firestore data with localStorage, keeping richer values.
  async loadFromFirestore(uid) {
    try {
      const snap = await db.collection(COLLECTIONS.IQRA_PROGRESS).doc(uid).get();

      if (snap.exists) {
        const d = snap.data();

        // Streak — keep whichever is longer
        const localStreak  = loadStreak();
        const remoteStreak = {
          count:    d.current_streak || 0,
          longest:  d.longest_streak || 0,
          lastDate: d.last_read_date  || null,
        };
        if (remoteStreak.longest > localStreak.longest ||
            remoteStreak.count   > localStreak.count) {
          saveStreak(remoteStreak);
        }

        // Khatm count — if Firestore is ahead, it means a khatm happened
        // on another device → clear local completed_at keys to match
        const localKhatmCount  = loadKhatmCount();
        const remoteKhatmCount = d.khatm_count || 0;
        if (remoteKhatmCount > localKhatmCount) {
          resetKhatmSurahs();                        // clear stale local completion stamps
          saveKhatmCount(remoteKhatmCount);
        }

        // Surahs read — union of both sets (within current khatm only)
        if (d.surahs_read?.length) {
          d.surahs_read.forEach(n => markSurahCompleted(n));
        }

        // Achievements — union
        if (d.achievements?.length) {
          const existing = loadAchievements().map(a => a.id);
          d.achievements.forEach(id => {
            if (!existing.includes(id)) awardAchievement(id);
          });
        }

        // Favourites — union of both sets
        if (d.favourites?.length) {
          const localFavs = loadFavourites();
          const merged = [...new Set([...localFavs, ...d.favourites])];
          saveFavourites(merged);
        }

        // Settings — only apply if not locally set
        if (d.settings) {
          if (!_get('reciter'))   saveReciter(d.settings.reciter || 'afasy');
          if (!_get('arabic_size')) saveArabicSize(d.settings.arabic_size || 'md');
          if (!_get('trans_size'))  saveTransSize(d.settings.translation_size || 'md');
        }

        // Reading goal
        if (d.reading_goal && !loadUserGoal()) {
          saveUserGoal({
            type:   d.reading_goal.type  || 'surahs',
            count:  d.reading_goal.count || 5,
            period: 'week',
          });
        }

        // Notification prefs
        if (d.notifications) {
          ['aotd', 'kahf', 'mulk'].forEach(type => {
            if (d.notifications[type]) {
              saveNotifEnabled(type, d.notifications[type].enabled !== false);
              if (d.notifications[type].time) saveNotifTime(type, d.notifications[type].time);
            }
          });
        }
      } else {
        // No Firestore doc yet — migrate localStorage to Firestore
        await this._migrateLocalToFirestore(uid);
      }

      // Load name from users/{uid}
      const userSnap = await db.collection(COLLECTIONS.USERS).doc(uid).get();
      if (userSnap.exists && userSnap.data().name) {
        saveUserName(userSnap.data().name);
      }

    } catch(e) {
      console.warn('[Iqra progress] loadFromFirestore failed, using localStorage:', e);
    }
  },

  // ── Migrate localStorage → Firestore (first sign-in) ─────
  async _migrateLocalToFirestore(uid) {
    try {
      const streak = loadStreak();
      const completed = getCompletedSurahs();
      const achievements = loadAchievements().map(a => a.id);
      const goal = loadUserGoal();

      await db.collection(COLLECTIONS.IQRA_PROGRESS).doc(uid).set({
        current_streak: streak.count    || 0,
        longest_streak: streak.longest  || 0,
        last_read_date: streak.lastDate || new Date().toISOString().slice(0, 10),
        surahs_read:    completed,
        khatm_count:    loadKhatmCount(),
        khatm_history:  [],
        achievements:   achievements,
        favourites:     loadFavourites(),
        reading_goal: goal ? {
          type:       goal.type,
          count:      goal.count,
          start_date: new Date().toISOString().slice(0, 10),
        } : null,
        settings: {
          reciter:          loadReciter(),
          arabic_size:      loadArabicSize(),
          translation_size: loadTransSize(),
        },
        notifications: {
          aotd: { enabled: loadNotifEnabled('aotd'), time: loadNotifTime('aotd') || '08:00' },
          kahf: { enabled: loadNotifEnabled('kahf'), time: loadNotifTime('kahf') || '08:00' },
          mulk: { enabled: loadNotifEnabled('mulk'), time: loadNotifTime('mulk') || '21:30' },
        },
        updated_at: firebase.firestore.FieldValue.serverTimestamp(),
      });
      console.log('[Iqra] localStorage migrated to Firestore');
    } catch(e) {
      console.warn('[Iqra progress] migration failed:', e);
    }
  },
};
