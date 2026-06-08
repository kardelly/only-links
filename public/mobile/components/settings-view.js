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
          <button class="theme-btn-mobile ${(this.prefs.theme||'system')==='light'?'active':''}" data-theme="light">Light</button>
          <button class="theme-btn-mobile ${(this.prefs.theme||'system')==='system'?'active':''}" data-theme="system">System</button>
          <button class="theme-btn-mobile ${(this.prefs.theme||'system')==='dark'?'active':''}" data-theme="dark">Dark</button>
        </div>
      </div>

      <!-- Connected Accounts -->
      ${this.user.google_id ? `
      <div class="settings-section">
        <h2 class="section-title">Connected accounts</h2>
        <div class="settings-item">
          <div class="item-info">
            <div class="item-label">Google account</div>
            <div class="item-description">✓ Connected</div>
          </div>
        </div>
        <button class="btn btn-danger" id="disconnect-google-btn">Disconnect Google</button>
      </div>
      ` : ''}

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

    // Add password change modal
    this.addPasswordChangeModal();

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

    // Disconnect Google
    document.getElementById('disconnect-google-btn')?.addEventListener('click', () => {
      this.handleDisconnectGoogle();
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
    const modal = document.getElementById('password-change-modal');
    if (modal) {
      modal.classList.add('open');
      document.getElementById('current-password-input')?.focus();
    }
  }

  handleDisconnectGoogle() {
    if (!confirm('Disconnect Google account? After disconnecting, you won\'t be able to sign in with Google.')) return;
    this.disconnectGoogle();
  }

  async changePassword(currentPassword, newPassword) {
    try {
      const response = await fetch('/api/settings/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update password');

      showToast('Password changed successfully', 'success');

      // Clear form and close modal
      const modal = document.getElementById('password-change-modal');
      if (modal) {
        const form = modal.querySelector('form');
        if (form) form.reset();
        modal.classList.remove('open');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async disconnectGoogle() {
    const result = await fetchWithError('/api/settings/google-disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (result) {
      showToast('Google account disconnected', 'success');
      setTimeout(() => this.load(), 1500);
    }
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

  addPasswordChangeModal() {
    const existingModal = document.getElementById('password-change-modal');
    if (existingModal) return;

    const modal = document.createElement('div');
    modal.id = 'password-change-modal';
    modal.className = 'edit-sheet-backdrop';
    modal.innerHTML = `
      <div class="edit-sheet">
        <div class="edit-sheet-header">
          <button class="edit-sheet-close" aria-label="Close">×</button>
          <h2 class="edit-sheet-title">Change password</h2>
        </div>
        <div class="edit-sheet-body">
          <form id="password-change-form">
            <div class="form-group-mobile">
              <label class="form-label-mobile">Current password</label>
              <input
                type="password"
                id="current-password-input"
                class="form-input-mobile"
                placeholder="••••••••"
                required
              >
            </div>
            <div class="form-group-mobile">
              <label class="form-label-mobile">New password</label>
              <input
                type="password"
                id="new-password-input"
                class="form-input-mobile"
                placeholder="••••••••"
                minlength="8"
                required
              >
              <p class="form-helper-mobile">Min. 8 characters</p>
            </div>
            <div class="form-group-mobile">
              <label class="form-label-mobile">Confirm new password</label>
              <input
                type="password"
                id="confirm-password-input"
                class="form-input-mobile"
                placeholder="••••••••"
                required
              >
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 16px;">Update password</button>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });

    // Close on close button
    modal.querySelector('.edit-sheet-close').addEventListener('click', () => {
      modal.classList.remove('open');
    });

    // Handle form submit
    modal.querySelector('#password-change-form').addEventListener('submit', (e) => {
      e.preventDefault();

      const currentPassword = document.getElementById('current-password-input').value;
      const newPassword = document.getElementById('new-password-input').value;
      const confirmPassword = document.getElementById('confirm-password-input').value;

      // Validate
      if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
      }

      if (newPassword.length < 8) {
        showToast('Password must be at least 8 characters', 'error');
        return;
      }

      this.changePassword(currentPassword, newPassword);
    });
  }
}
