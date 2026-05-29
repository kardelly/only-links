import { BaseView } from './base-view.js';

export class ProfileView extends BaseView {
  constructor() {
    super();
    this.user = null;
    this.bookmarks = [];
  }

  async load() {
    await this.fetchUser();
    await this.fetchBookmarks();
  }

  async fetchUser() {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        this.user = await response.json();
      } else {
        throw new Error('Failed to fetch user');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      this.showError('Failed to load profile');
    }
  }

  async fetchBookmarks() {
    if (!this.user) return;

    try {
      const response = await fetch(`/api/bookmarks?user=${this.user.id}`);
      if (response.ok) {
        this.bookmarks = await response.json();
      } else {
        throw new Error('Failed to fetch bookmarks');
      }
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      this.showError('Failed to load bookmarks');
    }
  }

  async handleLogout() {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        window.location.href = '/mobile/login';
      } else {
        throw new Error('Logout failed');
      }
    } catch (error) {
      console.error('Error logging out:', error);
      this.showError('Failed to logout');
    }
  }

  render() {
    if (!this.user) {
      return '<div class="loading">Loading profile...</div>';
    }

    const avatarUrl = this.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.user.username || 'User')}&size=128&background=random`;

    return `
      <div class="profile-view">
        <div class="profile-header">
          <div class="profile-avatar">
            <img src="${avatarUrl}" alt="${this.user.username || 'User'}" />
          </div>
          <h2 class="profile-username">${this.user.username || 'Anonymous'}</h2>
          ${this.user.email ? `<p class="profile-email">${this.user.email}</p>` : ''}
        </div>

        <div class="profile-stats">
          <div class="stat-item">
            <span class="stat-value">${this.bookmarks.length}</span>
            <span class="stat-label">Bookmarks</span>
          </div>
        </div>

        <div class="profile-actions">
          <a href="/mobile/settings" class="btn btn-secondary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6m8.66-15l-3 5.19M7.34 16.81l-3 5.19m15.32 0l-3-5.19M7.34 7.19l-3-5.19"></path>
            </svg>
            Settings
          </a>
          <button class="btn btn-danger" id="logout-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Logout
          </button>
        </div>

        <div class="profile-bookmarks">
          <h3>My Bookmarks</h3>
          ${this.renderBookmarksGrid()}
        </div>
      </div>
    `;
  }

  renderBookmarksGrid() {
    if (this.bookmarks.length === 0) {
      return '<div class="empty-state">No bookmarks yet</div>';
    }

    return `
      <div class="bookmarks-grid">
        ${this.bookmarks.map(bookmark => `
          <a href="${bookmark.url}" class="bookmark-card" target="_blank" rel="noopener noreferrer">
            <div class="bookmark-favicon">
              ${bookmark.favicon ? `<img src="${bookmark.favicon}" alt="" />` : '🔖'}
            </div>
            <div class="bookmark-info">
              <h4 class="bookmark-title">${bookmark.title || 'Untitled'}</h4>
              ${bookmark.description ? `<p class="bookmark-description">${bookmark.description}</p>` : ''}
              <span class="bookmark-domain">${new URL(bookmark.url).hostname}</span>
            </div>
          </a>
        `).join('')}
      </div>
    `;
  }

  attachEventListeners() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }
  }

  showError(message) {
    // Simple error display - could be enhanced with a toast/notification system
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #f44336; color: white; padding: 12px 24px; border-radius: 4px; z-index: 1000;';
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
  }
}
