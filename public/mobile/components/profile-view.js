import { BaseView } from './base-view.js';
import { escapeHtml, timeAgo, fetchWithError } from './utils.js';

/**
 * Profile View
 * Display current user's profile and bookmarks
 */
export class ProfileView extends BaseView {
  constructor() {
    super('profile-view');
    this.user = null;
    this.bookmarks = [];
  }

  /**
   * Load profile data
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

      // Get user's bookmarks
      const bookmarksData = await fetchWithError(`/api/bookmarks?user=${this.user.username}`);
      if (bookmarksData) {
        this.bookmarks = bookmarksData.items || [];
      }

      this.render();
    } catch (err) {
      console.error('Failed to load profile:', err);
      this.showError('Failed to load profile');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Render profile view
   */
  render() {
    this.clear();

    if (!this.user) return;

    // Profile header
    const header = document.createElement('div');
    header.className = 'profile-header';
    header.innerHTML = `
      <div class="profile-avatar">
        ${this.user.avatar_url 
          ? `<img src="${escapeHtml(this.user.avatar_url)}" alt="${escapeHtml(this.user.username)}">` 
          : `<div class="avatar-placeholder">${escapeHtml(this.user.username[0].toUpperCase())}</div>`
        }
      </div>
      <h2 class="profile-username">@${escapeHtml(this.user.username)}</h2>
      <div class="profile-stats">
        <div class="stat">
          <span class="stat-value">${this.bookmarks.length}</span>
          <span class="stat-label">Bookmarks</span>
        </div>
      </div>
      <div class="profile-actions">
        <button class="btn btn-secondary" id="settings-btn">Settings</button>
        <button class="btn btn-secondary" id="logout-btn">Logout</button>
      </div>
    `;

    this.container.appendChild(header);

    // Bookmarks section
    if (this.bookmarks.length > 0) {
      const bookmarksSection = document.createElement('div');
      bookmarksSection.className = 'profile-bookmarks';

      const title = document.createElement('h3');
      title.textContent = 'Your Bookmarks';
      bookmarksSection.appendChild(title);

      const grid = document.createElement('div');
      grid.className = 'bookmark-grid';

      this.bookmarks.forEach(bookmark => {
        const card = this.createBookmarkCard(bookmark);
        grid.appendChild(card);
      });

      bookmarksSection.appendChild(grid);
      this.container.appendChild(bookmarksSection);
    }

    // Attach settings handler
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        if (window.mobileApp) {
          window.mobileApp.showView('settings');
        }
      });
    }

    // Attach logout handler
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }
  }

  /**
   * Create bookmark card
   */
  createBookmarkCard(bookmark) {
    const card = document.createElement('div');
    card.className = 'bookmark-card';
    card.dataset.id = bookmark.id;

    const tagsHtml = this.renderTags(bookmark.tags);

    card.innerHTML = `
      <div class="card-thumbnail">
        <img src="${bookmark.og_image || '/placeholder.png'}" 
             alt="${escapeHtml(bookmark.title)}"
             onerror="this.src='/placeholder.png'"
             loading="lazy">
      </div>
      <div class="card-content">
        <h3 class="card-title">${escapeHtml(bookmark.title)}</h3>
        ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}
        <div class="card-meta">
          <span class="date">${timeAgo(bookmark.created_at)}</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      window.open(bookmark.url, '_blank');
    });

    return card;
  }

  /**
   * Render tags HTML
   */
  renderTags(tagsString) {
    if (!tagsString) return '';

    const tags = tagsString.split(',').map(t => t.trim()).filter(t => t);
    const visibleTags = tags.slice(0, 3);
    const remainingCount = tags.length - 3;

    let html = visibleTags
      .map(tag => `<span class="tag">${escapeHtml(tag)}</span>`)
      .join('');

    if (remainingCount > 0) {
      html += `<span class="tag tag-more">+${remainingCount}</span>`;
    }

    return html;
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
    }
  }
}
