// ============================================================
// WEB PUSH — Iqra
// Handles VAPID-based Web Push subscriptions.
// Subscriptions stored in GitHub Gist (free, no database).
// Push notifications sent by GitHub Actions cron jobs.
//
// Migration path: swap GIST_URL for Cloudflare KV endpoint
// when moving to Cloudflare — everything else stays the same.
// ============================================================

const VAPID_PUBLIC_KEY = 'BNA7kGzNnCci1txuyo9T9prv7XB2dl0BHrkl3jmNeu19oTGKJTDJDbQzAL_QvuiiTCvswqLWbN6c62kbkyvW-dA';

// GitHub Gist API endpoint for storing subscriptions
// GIST_ID is set after creating the gist (see setup instructions)
// ⚠ Replace these with your own values before deploying.
// GIST_ID and GIST_TOKEN must be strings (quoted).
const GIST_ID    = '';   // e.g. 'b05774eb07ac9471c6d388af8473b2d6'
const GIST_TOKEN = '';   // GitHub personal access token (gist scope only)
const GIST_API   = GIST_ID ? 'https://api.github.com/gists/' + GIST_ID : null;

const WebPush = {

  get supported() {
    return 'PushManager' in window && 'serviceWorker' in navigator;
  },

  // ── Subscribe ─────────────────────────────────────────────
  async subscribe() {
    if (!this.supported) {
      showToast('Push notifications not supported on this device');
      return false;
    }

    try {
      // Request notification permission first
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        showToast('Notification permission denied');
        return false;
      }

      const reg = await navigator.serviceWorker.ready;

      // Check if already subscribed
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        // Subscribe with VAPID public key
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this._urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      // Save subscription to Gist
      await this._saveSubscription(sub);
      saveNotifEnabled('aotd', true);
      saveNotifEnabled('kahf', true);
      saveNotifEnabled('mulk', true);
      this.updateUI();
      showToast(t('notif_enabled'));
      return true;

    } catch(e) {
      console.error('WebPush subscribe error:', e);
      showToast('Could not enable notifications: ' + e.message);
      return false;
    }
  },

  // ── Unsubscribe ───────────────────────────────────────────
  async unsubscribe() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await this._removeSubscription(sub);
        await sub.unsubscribe();
      }
      saveNotifEnabled('aotd', false);
      saveNotifEnabled('kahf', false);
      saveNotifEnabled('mulk', false);
      this.updateUI();
      showToast('Notifications disabled');
    } catch(e) {
      console.error('WebPush unsubscribe error:', e);
    }
  },

  // ── Check if subscribed ───────────────────────────────────
  async isSubscribed() {
    if (!this.supported) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      return !!sub;
    } catch(e) { return false; }
  },

  // ── Update settings UI ────────────────────────────────────
  async updateUI() {
    const subscribed = await this.isSubscribed();
    const status = document.getElementById('notif-status');
    const btn    = document.getElementById('notif-subscribe-btn');

    if (status) {
      status.textContent = subscribed ? t('notif_active') : t('notif_off');
      status.className   = 'notif-status ' + (subscribed ? 'notif-active' : 'notif-off');
    }
    if (btn) {
      btn.textContent = subscribed ? 'Unsubscribe' : 'Enable Notifications';
      btn.onclick = subscribed ? () => this.unsubscribe() : () => this.subscribe();
    }

    // Toggle switches reflect subscription state
    ['aotd', 'kahf', 'mulk'].forEach(type => {
      const tog = document.getElementById('notif-toggle-' + type);
      if (tog) {
        tog.checked  = subscribed && loadNotifEnabled(type);
        tog.disabled = !subscribed;
      }
      const timeInput = document.getElementById('notif-time-' + type);
      if (timeInput) {
        timeInput.disabled = !subscribed || !loadNotifEnabled(type);
      }
    });
  },

  // ── Save subscription to Gist ─────────────────────────────
  async _saveSubscription(sub) {
    if (GIST_ID === 'REPLACE_WITH_YOUR_GIST_ID') return; // not configured yet

    const subKey = 'sub_' + Date.now();
    const subData = {
      endpoint:    sub.endpoint,
      keys:        {
        p256dh: this._toUrlSafeBase64(sub.getKey('p256dh')),
        auth:   this._toUrlSafeBase64(sub.getKey('auth')),
      },
      lang:        loadLang(),
      timezone:    Intl.DateTimeFormat().resolvedOptions().timeZone,
      subscribedAt:new Date().toISOString(),
    };

    try {
      // Read existing gist content
      const res  = await fetch(GIST_API, {
        headers: { Authorization: 'token ' + GIST_TOKEN }
      });
      const gist = await res.json();
      const existing = JSON.parse(
        gist.files['subscriptions.json']?.content || '[]'
      );

      // Remove old subscription for same endpoint if exists
      const filtered = existing.filter(s => s.endpoint !== sub.endpoint);
      filtered.push(subData);

      // Write back
      await fetch(GIST_API, {
        method: 'PATCH',
        headers: {
          Authorization: 'token ' + GIST_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: {
            'subscriptions.json': { content: JSON.stringify(filtered, null, 2) }
          }
        })
      });
    } catch(e) {
      console.warn('Could not save subscription to Gist:', e);
    }
  },

  async _removeSubscription(sub) {
    if (GIST_ID === 'REPLACE_WITH_YOUR_GIST_ID') return;
    try {
      const res  = await fetch(GIST_API, {
        headers: { Authorization: 'token ' + GIST_TOKEN }
      });
      const gist = await res.json();
      const existing = JSON.parse(
        gist.files['subscriptions.json']?.content || '[]'
      );
      const filtered = existing.filter(s => s.endpoint !== sub.endpoint);
      await fetch(GIST_API, {
        method: 'PATCH',
        headers: {
          Authorization: 'token ' + GIST_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: {
            'subscriptions.json': { content: JSON.stringify(filtered, null, 2) }
          }
        })
      });
    } catch(e) {
      console.warn('Could not remove subscription from Gist:', e);
    }
  },

  // ── Utility: convert VAPID key ────────────────────────────
  // Convert ArrayBuffer to URL-safe base64 (what pywebpush expects)
  _toUrlSafeBase64(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    let str = '';
    bytes.forEach(b => str += String.fromCharCode(b));
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  },

  _urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw     = atob(base64);
    return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
  },
};
