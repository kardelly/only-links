import { BaseView } from './base-view.js';
import { escapeHtml, timeAgo, fetchWithError, showToast } from './utils.js';

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
    this.followersCount = 0;
    this.followingCount = 0;
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

      // Get user's bookmarks + follower counts in parallel
      const [bookmarksData, profileData] = await Promise.all([
        fetchWithError(`/api/bookmarks?user=${this.user.username}&page=1&limit=20`),
        fetchWithError(`/api/users/${encodeURIComponent(this.user.username)}`)
      ]);
      if (bookmarksData) {
        this.bookmarks = bookmarksData.items || [];
        this.totalBookmarks = bookmarksData.pagination?.total || 0;
      }
      if (profileData?.user) {
        this.followersCount = profileData.user.followersCount || 0;
        this.followingCount = profileData.user.followingCount || 0;
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
        <div class="stat stat-clickable" id="followers-stat">
          <span class="stat-value">${this.followersCount}</span>
          <span class="stat-label">Followers</span>
        </div>
        <div class="stat stat-clickable" id="following-stat">
          <span class="stat-value">${this.followingCount}</span>
          <span class="stat-label">Following</span>
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

    // Followers / Following modals
    this.container.querySelector('#followers-stat')?.addEventListener('click', () => {
      this.openFollowModal('followers');
    });
    this.container.querySelector('#following-stat')?.addEventListener('click', () => {
      this.openFollowModal('following');
    });

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
    const description = bookmark.description || bookmark.og_description || '';

    // Normalize og_image
    let ogImage = bookmark.og_image || '';
    if (ogImage) {
      if (ogImage.startsWith('//')) ogImage = 'https:' + ogImage;
      else if (ogImage.startsWith('/')) {
        try { const base = new URL(bookmark.url); ogImage = `${base.protocol}//${base.host}${ogImage}`; } catch { ogImage = ''; }
      }
      ogImage = ogImage.replace(/^http:\/\//, 'https://');
      if (!ogImage.startsWith('https://')) ogImage = '';
    }

    let domain = '';
    try { domain = new URL(bookmark.url).hostname.replace(/^www\./, ''); } catch {}

    const placeholderSrc = `/api/placeholder/${encodeURIComponent(domain || 'link')}`;

    card.innerHTML = `
      <div class="card-body">
        <div class="card-thumb">
          ${ogImage
            ? `<img src="${escapeHtml(ogImage)}" alt="" onerror="this.onerror=null;this.src='${placeholderSrc}'" loading="lazy">`
            : `<img src="${placeholderSrc}" alt="" loading="lazy">`
          }
        </div>
        <div class="card-content">
          <h3 class="card-title">${escapeHtml(bookmark.title)}</h3>
          ${description ? `<p class="card-description">${escapeHtml(description)}</p>` : ''}
          ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}
        </div>
      </div>
      <div class="card-footer">
        <span class="card-domain">${escapeHtml(domain)}</span>
        <span class="card-date">${timeAgo(bookmark.created_at)}</span>
        <div class="card-owner-actions">
          <button class="card-action-btn" data-action="edit">Edit</button>
          <button class="card-action-btn card-action-delete" data-action="delete">Delete</button>
        </div>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-owner-actions')) return;
      window.open(bookmark.url, '_blank');
    });

    card.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
      e.stopPropagation();
      this.openEditSheet(bookmark, card);
    });

    card.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
      e.stopPropagation();
      this.confirmDelete(bookmark, card);
    });

    return card;
  }

  /**
   * Open edit bottom sheet
   */
  openEditSheet(bookmark, card) {
    // Remove any existing sheet
    document.querySelector('.edit-sheet-backdrop')?.remove();

    const tags = Array.isArray(bookmark.tags)
      ? bookmark.tags.join(', ')
      : (bookmark.tags || '');

    const backdrop = document.createElement('div');
    backdrop.className = 'edit-sheet-backdrop';
    backdrop.innerHTML = `
      <div class="edit-sheet">
        <div class="edit-sheet-handle"></div>
        <h3 class="edit-sheet-title">Edit bookmark</h3>
        <div class="edit-sheet-fields">
          <label class="edit-field-label">URL</label>
          <input class="edit-field-input" id="es-url" type="text" inputmode="url" autocorrect="off" autocapitalize="none" value="${escapeHtml(bookmark.url)}">
          <label class="edit-field-label">Title</label>
          <input class="edit-field-input" id="es-title" type="text" value="${escapeHtml(bookmark.title)}">
          <label class="edit-field-label">Description</label>
          <textarea class="edit-field-input edit-field-textarea" id="es-desc">${escapeHtml(bookmark.description || '')}</textarea>
          <label class="edit-field-label">Tags <span class="edit-field-hint">(comma separated)</span></label>
          <input class="edit-field-input" id="es-tags" type="text" value="${escapeHtml(tags)}">
          <label class="edit-field-checkbox-row">
            <input type="checkbox" id="es-public" ${bookmark.is_public ? 'checked' : ''}>
            Public
          </label>
        </div>
        <div class="edit-sheet-actions">
          <button class="btn btn-secondary" id="es-cancel">Cancel</button>
          <button class="btn btn-primary" id="es-save">Save</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('open'));

    const close = () => {
      backdrop.classList.remove('open');
      setTimeout(() => backdrop.remove(), 250);
    };

    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
    backdrop.querySelector('#es-cancel').addEventListener('click', close);
    backdrop.querySelector('#es-save').addEventListener('click', async () => {
      const url = backdrop.querySelector('#es-url').value.trim();
      const title = backdrop.querySelector('#es-title').value.trim();
      const description = backdrop.querySelector('#es-desc').value.trim();
      const tagsVal = backdrop.querySelector('#es-tags').value.trim();
      const is_public = backdrop.querySelector('#es-public').checked;

      if (!url || !title) { showToast('URL and title are required', 'error'); return; }

      const btn = backdrop.querySelector('#es-save');
      btn.disabled = true; btn.textContent = 'Saving…';

      const result = await fetchWithError(`/api/bookmarks/${bookmark.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, title, description, tags: tagsVal, is_public })
      });

      if (result) {
        showToast('Saved', 'success');
        // Update local data and re-render card
        Object.assign(bookmark, { url, title, description, tags: tagsVal.split(',').map(t => t.trim()).filter(Boolean), is_public });
        const newCard = this.createBookmarkCard(bookmark);
        card.replaceWith(newCard);
        close();
      } else {
        btn.disabled = false; btn.textContent = 'Save';
      }
    });
  }

  /**
   * Confirm and delete bookmark
   */
  async confirmDelete(bookmark, card) {
    if (!confirm(`Delete "${bookmark.title}"?`)) return;

    const result = await fetchWithError(`/api/bookmarks/${bookmark.id}`, { method: 'DELETE' });
    if (result) {
      card.remove();
      this.totalBookmarks = Math.max(0, this.totalBookmarks - 1);
      // Update counter in header
      const statValue = this.container.querySelector('.stat-value');
      if (statValue) statValue.textContent = this.totalBookmarks;
      showToast('Deleted', 'success');
    }
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
   * Open followers / following bottom sheet
   */
  async openFollowModal(type) {
    document.querySelector('.follow-sheet-backdrop')?.remove();

    const title = type === 'followers' ? 'Followers' : 'Following';
    const endpoint = `/api/users/${encodeURIComponent(this.user.username)}/${type}`;

    const backdrop = document.createElement('div');
    backdrop.className = 'edit-sheet-backdrop follow-sheet-backdrop';
    backdrop.innerHTML = `
      <div class="edit-sheet">
        <div class="edit-sheet-handle"></div>
        <h3 class="edit-sheet-title">${title}</h3>
        <div class="follow-list" id="follow-list">
          <div class="loading-spinner"><div class="spinner"></div></div>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('open'));

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove('open');
        setTimeout(() => backdrop.remove(), 250);
      }
    });

    const listEl = backdrop.querySelector('#follow-list');
    const data = await fetchWithError(endpoint);
    listEl.innerHTML = '';

    const users = type === 'followers' ? data?.followers : data?.following;
    if (!users || users.length === 0) {
      listEl.innerHTML = `<p class="search-empty">No ${title.toLowerCase()} yet.</p>`;
      return;
    }

    users.forEach(user => {
      const row = document.createElement('div');
      row.className = 'people-row';
      const initials = user.username[0].toUpperCase();
      row.innerHTML = `
        <div class="people-avatar">
          ${user.avatar
            ? `<img src="${escapeHtml(user.avatar)}" alt="${escapeHtml(user.username)}" onerror="this.parentElement.innerHTML='${initials}'">`
            : initials
          }
        </div>
        <div class="people-info">
          <span class="people-username">@${escapeHtml(user.username)}</span>
        </div>
      `;
      row.addEventListener('click', () => {
        if (window.mobileApp) window.mobileApp.showPublicProfile(user.username);
      });
      listEl.appendChild(row);
    });
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
