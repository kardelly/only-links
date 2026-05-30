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
    this.totalBookmarks = 0;
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

      // Get user's bookmarks (first page)
      const bookmarksData = await fetchWithError(`/api/bookmarks?user=${this.user.username}&page=1&limit=20`);
      if (bookmarksData) {
        this.bookmarks = bookmarksData.items || [];
        this.totalBookmarks = bookmarksData.pagination?.total || 0;
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
        ${(this.user.avatar || this.user.avatar_url)
          ? `<img src="${escapeHtml(this.user.avatar || this.user.avatar_url)}" alt="${escapeHtml(this.user.username)}">`
          : `<div class="avatar-placeholder">${escapeHtml(this.user.username[0].toUpperCase())}</div>`
        }
      </div>
      <h2 class="profile-username">@${escapeHtml(this.user.username)}</h2>
      <div class="profile-stats">
        <div class="stat">
          <span class="stat-value">${this.totalBookmarks}</span>
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
        ${bookmark.og_image
          ? `<img src="${bookmark.og_image}"
                  alt="${escapeHtml(bookmark.title)}"
                  onerror="this.style.display='none';this.parentElement.style.background='#E5E5E5'"
                  loading="lazy">`
          : `<div style="width:100%;height:100%;background:#E5E5E5;display:flex;align-items:center;justify-content:center;font-size:32px;color:#999">🔗</div>`
        }
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
  renderTags(tagsInput) {
    if (!tagsInput) return '';

    // Handle both array (from API) and string (legacy)
    let tags;
    if (Array.isArray(tagsInput)) {
      tags = tagsInput;
    } else if (typeof tagsInput === 'string') {
      tags = tagsInput.split(',').map(t => t.trim()).filter(t => t);
    } else {
      return '';
    }

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
