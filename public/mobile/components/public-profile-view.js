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
  }

  async loadForUser(username) {
    this.username = username;
    this.profile = null;
    this.bookmarks = [];
    this.show();
    this.showLoading();

    try {
      const [profileData, bookmarksData] = await Promise.all([
        fetchWithError(`/api/users/${encodeURIComponent(username)}`),
        fetchWithError(`/api/bookmarks?user=${encodeURIComponent(username)}&page=1&limit=20`)
      ]);

      if (!profileData?.user) { this.showError('User not found'); return; }
      this.profile = profileData.user;
      this.bookmarks = bookmarksData?.items || [];
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
        <div class="stat">
          <span class="stat-value">${p.followersCount || 0}</span>
          <span class="stat-label">Followers</span>
        </div>
        <div class="stat">
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
      grid.className = 'bookmark-grid';
      this.bookmarks.forEach(b => grid.appendChild(this.createBookmarkCard(b)));
      section.appendChild(grid);
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
      if (!ogImage.startsWith('https://')) ogImage = '';
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
            ? `<img src="${escapeHtml(ogImage)}" alt="" onerror="this.src='${placeholderSrc}'" loading="lazy">`
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
      </div>
    `;

    card.addEventListener('click', () => window.open(bookmark.url, '_blank'));
    return card;
  }
}
