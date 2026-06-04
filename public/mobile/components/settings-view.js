import { BaseView } from './base-view.js';
import { fetchWithError, showToast } from './utils.js';

export class SettingsView extends BaseView {
  constructor() {
    super('settings-view');
    this.user = null;
    this.prefs = { default_public: 1, searchable: 1, theme: 'system' };
  }

  async load() {
    this.showLoading();
    try {
      const [userData, prefsData] = await Promise.all([
        fetchWithError('/api/auth/me'),
        fetchWithError('/api/settings/preferences')
      ]);

      if (!userData?.user) { window.location.href = '/'; return; }
      this.user = userData.user;
      if (prefsData?.preferences) this.prefs = prefsData.preferences;
      window.onlylinksTheme?.syncFromServer(this.prefs.theme || 'system');

      this.render();
    } catch (err) {
      console.error('Failed to load settings:', err);
      this.showError('Failed to load settings');
    } finally {
      this.hideLoading();
    }
  }

  render() {
    this.clear();
    if (!this.user) return;

    const container = document.createElement('div');
    container.className = 'settings-container';
    container.innerHTML = `
      <div class="settings-header">
        <h1>Settings</h1>
      </div>

      <!-- Account -->
      <div class="settings-section">
        <h2 class="section-title">Account</h2>
        <div class="settings-item">
          <div class="item-info">
            <div class="item-label">Username</div>
            <div class="item-value">@${this.user.username}</div>
          </div>
        </div>
        <div class="settings-item">
          <div class="item-info">
            <div class="item-label">Email</div>
            <div class="item-value">${this.user.email || 'Not set'}</div>
          </div>
        </div>
        <div class="settings-item settings-item-action" id="change-password-btn">
          <div class="item-info">
            <div class="item-label">Change password</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      </div>

      <!-- Appearance -->
      <div class="settings-section">
        <h2 class="section-title">Appearance</h2>
        <div class="settings-item">
          <div class="item-info">
            <div class="item-label">Theme</div>
            <div class="item-value">Choose how onlylinks looks</div>
          </div>
        </div>
        <div class="theme-selector-mobile" id="theme-selector-mobile">
          <button class="theme-btn-mobile ${(this.prefs.theme||'system')==='light'?'active':''}" data-theme="light">☀️ Light</button>
          <button class="theme-btn-mobile ${(this.prefs.theme||'system')==='system'?'active':''}" data-theme="system">⚙️ System</button>
          <button class="theme-btn-mobile ${(this.prefs.theme||'system')==='dark'?'active':''}" data-theme="dark">🌙 Dark</button>
        </div>
      </div>

      <!-- Privacy -->
      <div class="settings-section">
        <h2 class="section-title">Privacy</h2>

        <div class="settings-item">
          <div class="item-info">
            <div class="item-label">Public bookmarks by default</div>
            <div class="item-description">New bookmarks will be visible to everyone unless changed</div>
          </div>
          <label class="mobile-toggle">
            <input type="checkbox" id="pref-default-public" ${this.prefs.default_public !== 0 ? 'checked' : ''}>
            <span class="mobile-toggle-slider"></span>
          </label>
        </div>

        <div class="settings-item">
          <div class="item-info">
            <div class="item-label">Appear in user search</div>
            <div class="item-description">Allow others to find your profile by username</div>
          </div>
          <label class="mobile-toggle">
            <input type="checkbox" id="pref-searchable" ${this.prefs.searchable !== 0 ? 'checked' : ''}>
            <span class="mobile-toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- Danger -->
      <div class="settings-section">
        <h2 class="section-title">Danger zone</h2>
        <button class="btn btn-danger" id="delete-account-btn">Delete account</button>
      </div>

      <div class="settings-footer">
        <button class="btn btn-secondary" id="logout-btn">Sign out</button>
      </div>
    `;

    this.container.appendChild(container);

    // Theme selector
    this.container.querySelectorAll('.theme-btn-mobile').forEach(btn => {
      btn.addEventListener('click', async () => {
        const pref = btn.dataset.theme;
        window.onlylinksTheme?.set(pref);
        this.container.querySelectorAll('.theme-btn-mobile').forEach(b =>
          b.classList.toggle('active', b.dataset.theme === pref)
        );
        this.prefs.theme = pref;
        await fetchWithError('/api/settings/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ theme: pref })
        });
        showToast('Theme updated', 'success');
      });
    });

    this.attachEventListeners();
  }

  attachEventListeners() {
    // Privacy toggles — save on change
    const prefDefaultPublic = document.getElementById('pref-default-public');
    const prefSearchable = document.getElementById('pref-searchable');

    const savePrefs = async () => {
      const result = await fetchWithError('/api/settings/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_public: prefDefaultPublic?.checked ?? true,
          searchable: prefSearchable?.checked ?? true
        })
      });
      if (result) showToast('Saved', 'success');
    };

    prefDefaultPublic?.addEventListener('change', savePrefs);
    prefSearchable?.addEventListener('change', savePrefs);

    // Change password
    document.getElementById('change-password-btn')?.addEventListener('click', () => {
      this.handleChangePassword();
    });

    // Delete account
    document.getElementById('delete-account-btn')?.addEventListener('click', () => {
      this.handleDeleteAccount();
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      this.handleLogout();
    });
  }

  handleChangePassword() {
    const current = prompt('Current password:');
    if (!current) return;
    const next = prompt('New password (min 8 characters):');
    if (!next || next.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }
    const confirm = prompt('Confirm new password:');
    if (next !== confirm) { showToast('Passwords do not match', 'error'); return; }
    this.changePassword(current, next);
  }

  async changePassword(currentPassword, newPassword) {
    const result = await fetchWithError('/api/settings/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
    });
    if (result) showToast('Password changed', 'success');
  }

  handleDeleteAccount() {
    if (!confirm('Delete your account? This cannot be undone. All bookmarks will be permanently deleted.')) return;
    const password = prompt('Enter your password to confirm:');
    if (!password) return;
    this.deleteAccount(password);
  }

  async deleteAccount(password) {
    const result = await fetchWithError('/api/settings/account', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (result) {
      showToast('Account deleted');
      setTimeout(() => { window.location.href = '/'; }, 1500);
    }
  }

  async handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      window.location.href = '/';
    } catch {
      showToast('Logout failed', 'error');
    }
  }
}
