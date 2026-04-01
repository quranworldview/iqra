// ============================================================
// AUTH — Iqra Qur'an Reader
//
// Manages Firebase Auth state for Iqra.
// Sign-in only — account creation is handled by the
// Cloudflare Worker. No createUser() calls here, ever.
//
// Auth states:
//   signed-in  → Firebase user, progress synced to Firestore
//   guest      → No Firebase user, localStorage only
//
// The profile card in Settings shows different UI per state.
// ============================================================

const Auth = {

  // ── State ──────────────────────────────────────────────────
  currentUser: null,   // Firebase user object or null

  get isSignedIn() {
    return this.currentUser !== null;
  },

  // ── Init — call once on app boot ──────────────────────────
  init() {
    auth.onAuthStateChanged(user => {
      this.currentUser = user;

      if (user) {
        // Signed in — load Firestore data, migrate localStorage if needed
        // updateSettingsUI() is called AFTER load completes so name is populated
        Progress.loadFromFirestore(user.uid).then(() => {
          Profile.updateSettingsUI(); // re-render now that name/data is loaded
          Notifications.scheduleAll();
          Notifications._registerPeriodicSync();
        });
      } else {
        // Guest — update UI only
        Profile.updateSettingsUI();
      }
    });
  },

  // ── Sign In ────────────────────────────────────────────────
  async signIn(email, password) {
    try {
      await auth.signInWithEmailAndPassword(email, password);
      // onAuthStateChanged fires automatically after this
      this.closeModal();
      showToast(t('signin_success'));
      return { success: true };
    } catch(e) {
      return { success: false, error: this._friendlyError(e.code) };
    }
  },

  // ── Sign Out ───────────────────────────────────────────────
  async signOut() {
    try {
      await auth.signOut();
      showToast(t('signout_success'));
      // onAuthStateChanged fires — UI updates automatically
    } catch(e) {
      console.warn('Sign out error:', e);
    }
  },

  // ── Password Reset ─────────────────────────────────────────
  async sendPasswordReset(email) {
    try {
      await auth.sendPasswordResetEmail(email);
      return { success: true };
    } catch(e) {
      return { success: false, error: this._friendlyError(e.code) };
    }
  },

  // ── Modal open/close ───────────────────────────────────────
  openModal(view) {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    modal.classList.add('open');
    this.showView(view || 'signin');
  },

  closeModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('open');
    // Clear any error messages
    ['auth-signin-error', 'auth-reset-error', 'auth-reset-success'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '';
    });
  },

  showView(view) {
    ['auth-view-signin', 'auth-view-reset'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    const target = document.getElementById('auth-view-' + view);
    if (target) target.style.display = 'flex';
  },

  // ── Handle sign-in form submit ─────────────────────────────
  async handleSignIn() {
    const email    = document.getElementById('auth-email')?.value.trim();
    const password = document.getElementById('auth-password')?.value;
    const errorEl  = document.getElementById('auth-signin-error');
    const btn      = document.getElementById('auth-signin-btn');

    if (!email || !password) {
      if (errorEl) errorEl.textContent = t('auth_fill_all');
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = t('auth_signing_in'); }
    if (errorEl) errorEl.textContent = '';

    const result = await this.signIn(email, password);

    if (!result.success) {
      if (errorEl) errorEl.textContent = result.error;
      if (btn) { btn.disabled = false; btn.textContent = t('auth_signin_btn'); }
    }
    // On success: modal closes via this.closeModal() in signIn()
  },

  // ── Handle password reset form submit ─────────────────────
  async handleReset() {
    const email    = document.getElementById('auth-reset-email')?.value.trim();
    const errorEl  = document.getElementById('auth-reset-error');
    const successEl= document.getElementById('auth-reset-success');
    const btn      = document.getElementById('auth-reset-btn');

    if (!email) {
      if (errorEl) errorEl.textContent = t('auth_fill_email');
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = t('auth_sending'); }
    if (errorEl) errorEl.textContent = '';
    if (successEl) successEl.textContent = '';

    const result = await this.sendPasswordReset(email);

    if (result.success) {
      if (successEl) successEl.textContent = t('auth_reset_sent');
      if (btn) { btn.disabled = false; btn.textContent = t('auth_reset_btn'); }
    } else {
      if (errorEl) errorEl.textContent = result.error;
      if (btn) { btn.disabled = false; btn.textContent = t('auth_reset_btn'); }
    }
  },

  // ── Friendly error messages ────────────────────────────────
  _friendlyError(code) {
    const map = {
      'auth/user-not-found':       t('auth_err_no_user'),
      'auth/wrong-password':       t('auth_err_wrong_pw'),
      'auth/invalid-email':        t('auth_err_bad_email'),
      'auth/too-many-requests':    t('auth_err_too_many'),
      'auth/network-request-failed': t('auth_err_network'),
      'auth/invalid-credential':   t('auth_err_wrong_pw'),
    };
    return map[code] || t('auth_err_generic');
  },
};
