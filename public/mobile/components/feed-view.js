import { BaseView } from './base-view.js';
import { escapeHtml, timeAgo, fetchWithError } from './utils.js';

/**
 * Feed View
 * Displays bookmark feed with pagination
 */
export class FeedView extends BaseView {
  constructor(user = null) {
    super('feed-view');
    console.log('[FeedView] constructor called with user:', user);
    this.page = 1;
    this.limit = 20;
    this.hasMore = true;
    this.bookmarks = [];
    this.loading = false;
    this.user = user;
    this.feedType = 'mine'; // 'mine' | 'network' | 'all'
  }

  /**
   * Load bookmarks from API
   */
  async load() {
    console.log('[FeedView] load() called');
    console.log('[FeedView] this.user:', this.user);

    this.showLoading();

    try {
      // If no user set, try to get from window.mobileApp
      if (!this.user && window.mobileApp && window.mobileApp.user) {
        console.log('[FeedView] Getting user from window.mobileApp');
        this.user = window.mobileApp.user;
      }

      // Build URL based on feedType (same logic as desktop app.js)
      let url;
      if (!this.user) {
        url = `/api/bookmarks?page=${this.page}&limit=${this.limit}`;
      } else if (this.feedType === 'mine') {
        url = `/api/bookmarks?user=${this.user.username}&page=${this.page}&limit=${this.limit}`;
      } else if (this.feedType === 'network') {
        url = `/api/bookmarks?feedType=network&page=${this.page}&limit=${this.limit}`;
      } else {
        url = `/api/bookmarks?page=${this.page}&limit=${this.limit}`;
      }

      console.log('[FeedView] Fetching from URL:', url);

      const data = await fetchWithError(url);

      console.log('[FeedView] Received data:', {
        hasData: !!data,
        itemsLength: data?.items?.length,
        pagination: data?.pagination,
        firstItem: data?.items?.[0]?.title
      });

      if (data && data.items) {
        this.bookmarks = data.items;
        this.hasMore = data.pagination && data.pagination.page < data.pagination.totalPages;
        console.log('[FeedView] Setting bookmarks:', this.bookmarks.length, 'items');
        this.render();
      } else {
        console.error('[FeedView] No data.items in response');
        this.showError('No bookmarks found');
      }
    } catch (err) {
      console.error('[FeedView] Failed to load feed:', err);
      this.showError('Failed to load bookmarks: ' + err.message);
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Render bookmark feed
   */
  render() {
    console.log('[FeedView] render() called, bookmarks.length:', this.bookmarks.length);
    console.log('[FeedView] First bookmark:', this.bookmarks[0]);

    this.clear();

    // Feed type tabs (only shown when logged in)
    if (this.user) {
      const tabs = document.createElement('div');
      tabs.className = 'feed-tabs-mobile';
      tabs.innerHTML = `
        <button class="feed-tab-mobile ${this.feedType === 'mine' ? 'active' : ''}" data-feed="mine">My links</button>
        <button class="feed-tab-mobile ${this.feedType === 'network' ? 'active' : ''}" data-feed="network">Network</button>
        <button class="feed-tab-mobile ${this.feedType === 'all' ? 'active' : ''}" data-feed="all">Discover</button>
      `;
      tabs.querySelectorAll('.feed-tab-mobile').forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.dataset.feed === this.feedType) return;
          this.feedType = btn.dataset.feed;
          this.refresh();
        });
      });
      this.container.appendChild(tabs);
    }

    // Empty state
    if (this.bookmarks.length === 0) {
      console.log('[FeedView] Showing empty state');
      const emptyMsg = this.feedType === 'network'
        ? 'Follow people to see their bookmarks here.'
        : this.feedType === 'mine'
          ? 'Tap the + button to save your first bookmark.'
          : 'No public bookmarks yet.';
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `<h2>No bookmarks yet</h2><p>${emptyMsg}</p>`;
      this.container.appendChild(empty);
      return;
    }

    console.log('[FeedView] Rendering', this.bookmarks.length, 'bookmarks');

    // Create grid
    const grid = document.createElement('div');
    grid.className = 'bookmark-grid';
    
    this.bookmarks.forEach(bookmark => {
      const card = this.createBookmarkCard(bookmark);
      grid.appendChild(card);
    });
    
    this.container.appendChild(grid);
    
    // Add load more button if there are more bookmarks
    if (this.hasMore) {
      this.addLoadMoreButton();
    }
  }

  /**
   * Create bookmark card element
   */
  createBookmarkCard(bookmark) {
    const card = document.createElement('div');
    card.className = 'bookmark-card';
    card.dataset.id = bookmark.id;

    // Normalize og_image URL (same logic as app.js)
    let ogImage = bookmark.og_image || '';
    if (ogImage) {
      if (ogImage.startsWith('//')) {
        ogImage = 'https:' + ogImage;
      } else if (ogImage.startsWith('/')) {
        try {
          const base = new URL(bookmark.url);
          ogImage = `${base.protocol}//${base.host}${ogImage}`;
        } catch (e) { ogImage = ''; }
      }
      ogImage = ogImage.replace(/^http:\/\//, 'https://');
    }

    // Render tags (max 3)
    const tagsHtml = this.renderTags(bookmark.tags);

    const description = bookmark.description || bookmark.og_description || '';

    let domain = '';
    try { domain = new URL(bookmark.url).hostname.replace(/^www\./, ''); } catch {}
    const placeholderSrc = `/api/placeholder/${encodeURIComponent(domain || 'link')}`;

    card.innerHTML = `
      <div class="card-body">
        <div class="card-thumb">
          ${ogImage
            ? `<img src="${escapeHtml(ogImage)}"
                    alt=""
                    onerror="this.onerror=null;this.src='${placeholderSrc}'"
                    loading="lazy">`
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
        <div class="card-meta">
          ${bookmark.username ? `<a href="/mobile/app#public-profile/${encodeURIComponent(bookmark.username)}" class="card-user-link">@${escapeHtml(bookmark.username)}</a>` : ''}
          <span class="card-domain">${escapeHtml(domain)}</span>
          <span class="card-date">${timeAgo(bookmark.created_at)}</span>
        </div>
        <div class="card-actions">
          ${this._canSave(bookmark) ? `
            <button class="card-save-btn" aria-label="Save to my collection">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              Save
            </button>
          ` : ''}
          <button class="card-share-btn" aria-label="Compartilhar link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Share
          </button>
        </div>
      </div>
    `;

    // Share button
    card.querySelector('.card-share-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      const btn = e.currentTarget;
      const url = bookmark.url;
      if (navigator.share) {
        try { await navigator.share({ url }); } catch {}
        return;
      }
      try {
        await navigator.clipboard.writeText(url);
        btn.textContent = 'Copied!';
        btn.classList.add('share-done');
        setTimeout(() => { btn.textContent = 'Share'; btn.classList.remove('share-done'); }, 1500);
      } catch {
        btn.textContent = 'Error';
        btn.classList.add('share-error');
        setTimeout(() => { btn.textContent = 'Share'; btn.classList.remove('share-error'); }, 1000);
      }
    });

    // Save button
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
          // Mark as saved after sheet is dismissed successfully (sheet handles actual POST)
          saveBtn.classList.add('save-done');
          saveBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Saved`;
        } else {
          showToast('Could not open save form', 'error');
        }
      });
    }

    // Click card to open bookmark (not on share btn)
    card.addEventListener('click', () => {
      window.open(bookmark.url, '_blank');
    });

    return card;
  }

  /**
   * Render tags HTML (max 3 visible)
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

  _canSave(bookmark) {
    const user = window.mobileApp?.user;
    if (!user) return false;
    // Don't show Save on own bookmarks
    const ownerId = bookmark.user_id ?? bookmark.userId;
    return ownerId !== user.id;
  }

  /**
   * Add "Load More" button
   */
  addLoadMoreButton() {
    if (this.loading) return;
    
    const btn = document.createElement('button');
    btn.className = 'btn btn-secondary load-more';
    btn.textContent = 'Load More';
    
    btn.addEventListener('click', async () => {
      if (this.loading) return;
      
      this.loading = true;
      btn.textContent = 'Loading...';
      btn.disabled = true;
      
      this.page++;

      try {
        let url;
        if (!this.user) {
          url = `/api/bookmarks?page=${this.page}&limit=${this.limit}`;
        } else if (this.feedType === 'mine') {
          url = `/api/bookmarks?user=${this.user.username}&page=${this.page}&limit=${this.limit}`;
        } else if (this.feedType === 'network') {
          url = `/api/bookmarks?feedType=network&page=${this.page}&limit=${this.limit}`;
        } else {
          url = `/api/bookmarks?page=${this.page}&limit=${this.limit}`;
        }

        const data = await fetchWithError(url);

        if (data && data.items) {
          this.bookmarks.push(...data.items);
          this.hasMore = data.pagination && data.pagination.page < data.pagination.totalPages;
          this.render();
        }
      } catch (err) {
        console.error('Failed to load more:', err);
        this.page--;
      } finally {
        this.loading = false;
      }
    });
    
    this.container.appendChild(btn);
  }

  /**
   * Refresh feed (reset to page 1)
   */
  async refresh() {
    this.page = 1;
    this.bookmarks = [];
    this.hasMore = true;
    await this.load();
  }
}
