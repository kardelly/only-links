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

      // Fetch bookmarks - user's if authenticated, public feed otherwise
      const url = this.user
        ? `/api/bookmarks?user=${this.user.username}&page=${this.page}&limit=${this.limit}`
        : `/api/bookmarks?page=${this.page}&limit=${this.limit}`;

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

    // Empty state
    if (this.bookmarks.length === 0) {
      console.log('[FeedView] Showing empty state');
      this.container.innerHTML = `
        <div class="empty-state">
          <h2>No bookmarks yet</h2>
          <p>Tap the + button to save your first bookmark</p>
        </div>
      `;
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
      // Sanity check — must start with https://
      if (!ogImage.startsWith('https://')) ogImage = '';
    }

    // Render tags (max 3)
    const tagsHtml = this.renderTags(bookmark.tags);

    card.innerHTML = `
      <div class="card-thumbnail">
        ${ogImage
          ? `<img src="${escapeHtml(ogImage)}"
                  alt=""
                  onerror="this.parentElement.innerHTML='<div style=\'width:100%;height:100%;background:#E5E5E5;display:flex;align-items:center;justify-content:center;font-size:28px\'>🔗</div>'"
                  loading="lazy">`
          : `<div style="width:100%;height:100%;background:#E5E5E5;display:flex;align-items:center;justify-content:center;font-size:28px">🔗</div>`
        }
      </div>
      <div class="card-content">
        <h3 class="card-title">${escapeHtml(bookmark.title)}</h3>
        ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}
        <div class="card-meta">
          <span class="username">@${escapeHtml(bookmark.username)}</span>
          <span class="date">${timeAgo(bookmark.created_at)}</span>
          <button class="card-share-btn" aria-label="Compartilhar link">Share</button>
        </div>
      </div>
    `;

    // Share button — stops propagation so card click doesn't also fire
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
        const url = this.user
          ? `/api/bookmarks?user=${this.user.username}&page=${this.page}&limit=${this.limit}`
          : `/api/bookmarks?page=${this.page}&limit=${this.limit}`;

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
