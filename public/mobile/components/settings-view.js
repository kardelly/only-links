import { BaseView } from './base-view.js';
import { fetchWithError, showToast } from './utils.js';

/**
 * Settings View
 * User account and app settings
 */
export class SettingsView extends BaseView {
  constructor() {
    super('settings-view');
    this.user = null;
  }

  /**
   * Load settings data
   */
  async load() {
    this.showLoading();

    try {
      // Get current user
      const userData = await fetchWithError('/api/auth/me');
      if (!userData || !userData.user) {
        window.location.href = '/';
        return;
      }

      this.user = userData.user;
      this.render();
    } catch (err) {
      console.error('Failed to load settings:', err);
      this.showError('Failed to load settings');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Render settings view
   */
  render() {
    this.clear();

    if (!this.user) return;

    const container = document.createElement('div');
    container.className = 'settings-container';
    container.innerHTML = `
      <div class="settings-header">
        <h1>Settings</h1>
      </div>

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
      </div>

      <div class="settings-section">
        <h2 class="section-title">Privacy</h2>
        <div class="settings-item">
          <div class="item-info">
            <div class="item-label">Default bookmark visibility</div>
            <div class="item-description">Choose whether new bookmarks are public or private</div>
          </div>
          <select id="default-visibility" class="setting-select">
            <option value="public" ${this.user.default_public ? 'selected' : ''}>Public</option>
            <option value="private" ${!this.user.default_public ? 'selected' : ''}>Private</option>
          </select>
        </div>
      </div>

      <div class="settings-section">
        <h2 class="section-title">Danger Zone</h2>
        <button class="btn btn-secondary" id="change-password-btn">
          Change Password
        </button>
        <button class="btn btn-danger" id="delete-account-btn">
          Delete Account
        </button>
      </div>

      <div class="settings-footer">
        <button class="btn btn-secondary" id="logout-btn">Logout</button>
      </div>
    `;

    this.container.appendChild(container);
    this.attachEventListeners();
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Default visibility change
    const visibilitySelect = document.getElementById('default-visibility');
    if (visibilitySelect) {
      visibilitySelect.addEventListener('change', (e) => {
        this.updateDefaultVisibility(e.target.value === 'public');
      });
    }

    // Change password
    const changePasswordBtn = document.getElementById('change-password-btn');
    if (changePasswordBtn) {
      changePasswordBtn.addEventListener('click', () => {
        this.handleChangePassword();
      });
    }

    // Delete account
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    if (deleteAccountBtn) {
      deleteAccountBtn.addEventListener('click', () => {
        this.handleDeleteAccount();
      });
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.handleLogout();
      });
    }
  }

  /**
   * Update default visibility
   */
  async updateDefaultVisibility(isPublic) {
    try {
      await fetchWithError('/api/users/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ default_public: isPublic })
      });

      showToast('Default visibility updated');
      this.user.default_public = isPublic;
    } catch (err) {
      console.error('Failed to update visibility:', err);
      showToast('Failed to update setting');
    }
  }

  /**
   * Handle change password
   */
  handleChangePassword() {
    const currentPassword = prompt('Current password:');
    if (!currentPassword) return;

    const newPassword = prompt('New password (min 8 characters):');
    if (!newPassword || newPassword.length < 8) {
      showToast('Password must be at least 8 characters');
      return;
    }

    const confirmPassword = prompt('Confirm new password:');
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match');
      return;
    }

    this.changePassword(currentPassword, newPassword);
  }

  /**
   * Change password API call
   */
  async changePassword(currentPassword, newPassword) {
    try {
      await fetchWithError('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
      });

      showToast('Password changed successfully');
    } catch (err) {
      console.error('Failed to change password:', err);
      showToast('Failed to change password');
    }
  }

  /**
   * Handle delete account
   */
  handleDeleteAccount() {
    const confirmed = confirm(
      'Are you sure you want to delete your account? This action cannot be undone.\n\n' +
      'All your bookmarks will be permanently deleted.'
    );

    if (!confirmed) return;

    const password = prompt('Enter your password to confirm:');
    if (!password) return;

    this.deleteAccount(password);
  }

  /**
   * Delete account API call
   */
  async deleteAccount(password) {
    try {
      await fetchWithError('/api/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      showToast('Account deleted');
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (err) {
      console.error('Failed to delete account:', err);
      showToast('Failed to delete account');
    }
  }

  /**
   * Handle logout
   */
  async handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    } catch (err) {
      console.error('Logout failed:', err);
      showToast('Logout failed');
    }
  }
}
