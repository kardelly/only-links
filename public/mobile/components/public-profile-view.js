import { BaseView } from './base-view.js';
import { escapeHtml, timeAgo, fetchWithError, showToast } from './utils.js';

/**
 * Public Profile View
 * Shows any user's public profile and bookmarks.
 * Activated via window.mobileApp.showPublicProfile(username).
 */
export class PublicProfileView extends BaseView {
  constructor() {
    super('public-profile-view');
    this.username = null;
    this.profile = null;
    this.bookmarks = [];
    this.currentUser = null;
    this.page = 1;
    this.hasMore = false;
    this.loading = false;
  }

  async loadForUser(username) {
    this.username = username;
    this.profile = null;
    this.bookmarks = [];
    this.page = 1;
    this.hasMore = false;
    this.show();
    this.showLoading();

    // Get current user from app state if available
    this.currentUser = window.mobileApp?.user || null;

    try {
      const [profileData, bookmarksData] = await Promise.all([
        fetchWithError(`/api/users/${encodeURIComponent(username)}`),
        fetchWithError(`/api/bookmarks?user=${encodeURIComponent(username)}&page=1&limit=20`)
      ]);

      if (!profileData?.user) { this.showError('User not found'); return; }
      this.profile = profileData.user;
      this.bookmarks = bookmarksData?.items || [];
      const pagination = bookmarksData?.pagination;
      this.hasMore = pagination ? pagination.page < pagination.totalPages : false;
      this.render();
    } catch (err) {
      this.showError('Failed to load profile');
    } finally {
      this.hideLoading();
    }
  }

  render() {
    this.clear();
    if (!this.profile) return;

    const p = this.profile;
    const initials = p.username[0].toUpperCase();

    const wrapper = document.createElement('div');
    wrapper.className = 'pub-profile-wrapper';

    // Back button
    const back = document.createElement('button');
    back.className = 'pub-profile-back';
    back.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 12H5M12 5l-7 7 7 7"/>
      </svg>
      Back
    `;
    back.addEventListener('click', () => {
      if (window.mobileApp) window.mobileApp.goBack();
    });

    // Header
    const header = document.createElement('div');
    header.className = 'profile-header';
    header.innerHTML = `
      <div class="profile-avatar">
        ${p.avatar
          ? `<img src="${escapeHtml(p.avatar)}" alt="${escapeHtml(p.username)}" onerror="this.parentElement.innerHTML='<div class=\\'avatar-placeholder\\'>${initials}</div>'">`
          : `<div class="avatar-placeholder">${initials}</div>`
        }
      </div>
      <h2 class="profile-username">@${escapeHtml(p.username)}</h2>
      <div class="profile-stats">
        <div class="stat stat-clickable" id="pub-followers-stat">
          <span class="stat-value">${p.followersCount || 0}</span>
          <span class="stat-label">Followers</span>
        </div>
        <div class="stat stat-clickable" id="pub-following-stat">
          <span class="stat-value">${p.followingCount || 0}</span>
          <span class="stat-label">Following</span>
        </div>
      </div>
      ${this.currentUser && this.currentUser.username !== p.username ? `
        <div class="profile-actions">
          <button class="btn ${p.isFollowing ? 'btn-secondary' : 'btn-primary'}" id="pub-follow-btn">
            ${p.isFollowing ? 'Following' : 'Follow'}
          </button>
        </div>
      ` : ''}
    `;

    wrapper.appendChild(back);
    wrapper.appendChild(header);

    // Bookmarks
    if (this.bookmarks.length > 0) {
      const section = document.createElement('div');
      section.className = 'profile-bookmarks';
      const title = document.createElement('h3');
      title.textContent = 'Bookmarks';
      section.appendChild(title);

      const grid = document.createElement('div');
      grid.id = 'pub-bookmark-grid';
      grid.className = 'bookmark-grid';
      this.bookmarks.forEach(b => grid.appendChild(this.createBookmarkCard(b)));
      section.appendChild(grid);

      if (this.hasMore) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'btn btn-secondary load-more';
        loadMoreBtn.id = 'pub-load-more';
        loadMoreBtn.textContent = 'Load More';
        loadMoreBtn.addEventListener('click', () => this.loadMore(loadMoreBtn));
        section.appendChild(loadMoreBtn);
      }

      wrapper.appendChild(section);
    } else {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<p>No public bookmarks yet.</p>';
      wrapper.appendChild(empty);
    }

    this.container.appendChild(wrapper);

    // Follow button
    const followBtn = wrapper.querySelector('#pub-follow-btn');
    if (followBtn) {
      followBtn.addEventListener('click', () => this.toggleFollow(followBtn));
    }

    // Followers / following modals
    wrapper.querySelector('#pub-followers-stat')?.addEventListener('click', () => {
      this.openFollowModal('followers');
    });
    wrapper.querySelector('#pub-following-stat')?.addEventListener('click', () => {
      this.openFollowModal('following');
    });
  }

  async toggleFollow(btn) {
    const isFollowing = btn.textContent.trim() === 'Following';
    const method = isFollowing ? 'DELETE' : 'POST';
    const result = await fetchWithError(`/api/users/${encodeURIComponent(this.username)}/follow`, { method });
    if (result) {
      if (isFollowing) {
        btn.textContent = 'Follow';
        btn.className = 'btn btn-primary';
        showToast('Unfollowed');
      } else {
        btn.textContent = 'Following';
        btn.className = 'btn btn-secondary';
        showToast('Following!', 'success');
      }
    }
  }

  async openFollowModal(type) {
    document.querySelector('.follow-sheet-backdrop')?.remove();

    const title = type === 'followers' ? 'Followers' : 'Following';
    const endpoint = `/api/users/${encodeURIComponent(this.username)}/${type}`;

    const backdrop = document.createElement('div');
    backdrop.className = 'edit-sheet-backdrop follow-sheet-backdrop';
    backdrop.innerHTML = `
      <div class="edit-sheet">
        <div class="edit-sheet-handle"></div>
        <h3 class="edit-sheet-title">${title}</h3>
        <div class="follow-list" id="pub-follow-list">
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

    const listEl = backdrop.querySelector('#pub-follow-list');
    const data = await fetchWithError(endpoint);
    listEl.innerHTML = '';

    if (!data) {
      listEl.innerHTML = `<p class="search-empty">Failed to load ${title.toLowerCase()}.</p>`;
      return;
    }

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
        backdrop.classList.remove('open');
        setTimeout(() => backdrop.remove(), 250);
        if (window.mobileApp) window.mobileApp.showPublicProfile(user.username);
      });
      listEl.appendChild(row);
    });
  }

  async loadMore(btn) {
    if (this.loading) return;
    this.loading = true;
    btn.disabled = true;
    btn.textContent = 'Loading…';

    this.page++;
    try {
      const data = await fetchWithError(
        `/api/bookmarks?user=${encodeURIComponent(this.username)}&page=${this.page}&limit=20`
      );
      if (!data?.items) {
        // fetchWithError returned null (401, 429, network error) — restore button
        this.page--;
        btn.disabled = false;
        btn.textContent = 'Load More';
        return;
      }
      this.bookmarks.push(...data.items);
      const grid = document.getElementById('pub-bookmark-grid');
      if (grid) {
        data.items.forEach(b => grid.appendChild(this.createBookmarkCard(b)));
      }
      const pagination = data.pagination;
      this.hasMore = pagination ? pagination.page < pagination.totalPages : false;
      if (!this.hasMore) btn.remove();
      else { btn.disabled = false; btn.textContent = 'Load More'; }
    } catch {
      this.page--;
      btn.disabled = false;
      btn.textContent = 'Load More';
    } finally {
      this.loading = false;
    }
  }

  _canSave(bookmark) {
    const user = window.mobileApp?.user;
    if (!user) return false;
    const ownerId = bookmark.user_id ?? bookmark.userId;
    return ownerId !== user.id;
  }

  createBookmarkCard(bookmark) {
    const card = document.createElement('div');
    card.className = 'bookmark-card';

    let ogImage = bookmark.og_image || '';
    if (ogImage) {
      if (ogImage.startsWith('//')) ogImage = 'https:' + ogImage;
      else if (ogImage.startsWith('/')) {
        try { const b = new URL(bookmark.url); ogImage = `${b.protocol}//${b.host}${ogImage}`; } catch { ogImage = ''; }
      }
      ogImage = ogImage.replace(/^http:\/\//, 'https://');
    }

    const description = bookmark.description || bookmark.og_description || '';
    let domain = '';
    try { domain = new URL(bookmark.url).hostname.replace(/^www\./, ''); } catch {}

    const tags = Array.isArray(bookmark.tags) ? bookmark.tags : (bookmark.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    const visibleTags = tags.slice(0, 3);
    const rest = tags.length - 3;
    const tagsHtml = [
      ...visibleTags.map(t => `<span class="tag">${escapeHtml(t)}</span>`),
      ...(rest > 0 ? [`<span class="tag tag-more">+${rest}</span>`] : [])
    ].join('');

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
        ${this._canSave(bookmark) ? `
          <button class="card-save-btn" aria-label="Save to my collection">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            Save
          </button>
        ` : ''}
      </div>
    `;

    card.addEventListener('click', () => window.open(bookmark.url, '_blank'));

    const saveBtn = card.querySelector('.card-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (saveBtn.classList.contains('save-done') || saveBtn.disabled) return;

        const tags = Array.isArray(bookmark.tags)
          ? bookmark.tags.join(', ')
          : (bookmark.tags || '');

        // Open the add-bookmark sheet pre-filled so user can review/edit before saving
        const addView = window.mobileApp?.views?.add;
        if (addView) {
          addView.openWithData({
            url: bookmark.url,
            title: bookmark.title,
            description: bookmark.description || bookmark.og_description || '',
            tags
          });
          saveBtn.classList.add('save-done');
          saveBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Saved`;
        } else {
          showToast('Could not open save form', 'error');
        }
      });
    }

    return card;
  }
}
