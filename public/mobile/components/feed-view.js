import { BaseView } from './base-view.js';
import { timeAgo, escapeHTML } from './utils.js';

/**
 * FeedView - Main feed view showing bookmark grid
 */
export class FeedView extends BaseView {
  constructor(container) {
    super(container);
    this.bookmarks = [];
    this.currentPage = 1;
    this.hasMore = true;
    this.isLoading = false;
    this.feedType = 'all';
    this.activeTags = [];
    this.searchQuery = '';
  }

  /**
   * Initialize the view
   */
  async init() {
    this.render();
    this.setupEventListeners();
    await this.load();
  }

  /**
   * Render the view structure
   */
  render() {
    this.container.innerHTML = `
      <div class="feed-container">
        <div class="feed-header">
          <h2 class="feed-title">Bookmarks</h2>
          <div class="feed-filters">
            <select id="feed-type-select" class="feed-select">
              <option value="all">All</option>
              <option value="mine">My Bookmarks</option>
              <option value="network">Network</option>
            </select>
          </div>
        </div>
        <div id="bookmark-grid" class="bookmark-grid"></div>
        <div id="load-more-container" class="load-more-container hidden">
          <button id="load-more-btn" class="btn btn-primary">Load More</button>
        </div>
      </div>
    `;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const feedTypeSelect = document.getElementById('feed-type-select');
    if (feedTypeSelect) {
      feedTypeSelect.addEventListener('change', async (e) => {
        this.feedType = e.target.value;
        this.currentPage = 1;
        this.bookmarks = [];
        await this.load();
      });
    }

    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', async () => {
        await this.loadMore();
      });
    }
  }

  /**
   * Load bookmarks from API
   */
  async load() {
    if (this.isLoading) return;

    this.isLoading = true;
    this.showLoading();

    try {
      const params = new URLSearchParams({
        page: this.currentPage,
        limit: 20,
        feedType: this.feedType
      });

      if (this.searchQuery) {
        params.append('q', this.searchQuery);
      }

      if (this.activeTags.length > 0) {
        params.append('tags', this.activeTags.join(','));
      }

      const response = await fetch(`/api/bookmarks?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch bookmarks');
      }

      const data = await response.json();

      if (this.currentPage === 1) {
        this.bookmarks = data.bookmarks || [];
      } else {
        this.bookmarks.push(...(data.bookmarks || []));
      }

      this.hasMore = this.currentPage < (data.pagination?.totalPages || 1);

      this.renderBookmarks();
      this.updateLoadMoreButton();
    } catch (error) {
      console.error('Error loading bookmarks:', error);
      this.showError('Failed to load bookmarks. Please try again.');
    } finally {
      this.isLoading = false;
      this.hideLoading();
    }
  }

  /**
   * Load more bookmarks
   */
  async loadMore() {
    if (!this.hasMore || this.isLoading) return;

    this.currentPage++;
    await this.load();
  }

  /**
   * Render bookmarks in grid
   */
  renderBookmarks() {
    const grid = document.getElementById('bookmark-grid');
    if (!grid) return;

    if (this.bookmarks.length === 0) {
      this.renderEmptyState(grid);
      return;
    }

    // Clear on first page only
    if (this.currentPage === 1) {
      grid.innerHTML = '';
    }

    this.bookmarks.slice((this.currentPage - 1) * 20, this.currentPage * 20).forEach(bookmark => {
      const card = this.createBookmarkCard(bookmark);
      grid.appendChild(card);
    });
  }

  /**
   * Create a bookmark card element
   */
  createBookmarkCard(bookmark) {
    const card = document.createElement('article');
    card.className = 'bookmark-card';
    card.dataset.id = bookmark.id;

    // Generate clean hostname
    let host = 'link';
    try {
      host = new URL(bookmark.url).hostname.replace('www.', '');
    } catch(e) {}

    // Handle thumbnail
    let thumbnailUrl = bookmark.og_image;
    if (thumbnailUrl && thumbnailUrl.startsWith('/')) {
      try {
        const baseUrl = new URL(bookmark.url);
        thumbnailUrl = `${baseUrl.protocol}//${baseUrl.host}${thumbnailUrl}`;
      } catch (e) {
        console.error('Failed to convert relative URL:', e);
      }
    }

    // Render tags
    const tagsHtml = (bookmark.tags || []).map(tag =>
      `<span class="tag" data-tag="${escapeHTML(tag)}">${escapeHTML(tag)}</span>`
    ).join('');

    card.innerHTML = `
      ${thumbnailUrl ? `
        <div class="bookmark-thumbnail">
          <img src="${escapeHTML(thumbnailUrl)}"
               alt="${escapeHTML(bookmark.title)}"
               loading="lazy"
               onerror="this.parentElement.style.display='none'">
        </div>
      ` : ''}

      <div class="bookmark-content">
        <h3 class="bookmark-title">${escapeHTML(bookmark.title)}</h3>

        ${bookmark.description ? `
          <p class="bookmark-description">${escapeHTML(bookmark.description)}</p>
        ` : ''}

        ${bookmark.tags && bookmark.tags.length > 0 ? `
          <div class="bookmark-tags">
            ${tagsHtml}
          </div>
        ` : ''}

        <div class="bookmark-meta">
          <span class="bookmark-author">@${escapeHTML(bookmark.username)}</span>
          <span>•</span>
          <span class="bookmark-domain">${escapeHTML(host)}</span>
          <span>•</span>
          <span class="bookmark-time">${timeAgo(bookmark.created_at)}</span>
        </div>
      </div>
    `;

    // Open bookmark in new tab when clicked
    card.addEventListener('click', (e) => {
      // Don't open if clicking on a tag
      if (e.target.classList.contains('tag')) {
        this.handleTagClick(e.target.dataset.tag);
        return;
      }
      window.open(bookmark.url, '_blank', 'noopener,noreferrer');
    });

    return card;
  }

  /**
   * Handle tag click
   */
  handleTagClick(tag) {
    if (!this.activeTags.includes(tag)) {
      this.activeTags = [tag];
      this.currentPage = 1;
      this.bookmarks = [];
      this.load();
    }
  }

  /**
   * Render empty state
   */
  renderEmptyState(container) {
    const hasFilters = this.searchQuery || this.activeTags.length > 0;
    const isMyBookmarks = this.feedType === 'mine';
    const isNetwork = this.feedType === 'network';

    let title, description;

    if (hasFilters) {
      title = 'Nothing here';
      description = 'No bookmarks match your current filters.';
    } else if (isMyBookmarks) {
      title = 'Your canvas awaits';
      description = 'This is where your curated links will live.';
    } else if (isNetwork) {
      title = 'Follow curators';
      description = 'Your network feed shows bookmarks from people you follow.';
    } else {
      title = 'The archive is empty';
      description = 'Be the first to contribute.';
    }

    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
        <h3 class="empty-state-title">${title}</h3>
        <p class="empty-state-description">${description}</p>
      </div>
    `;
  }

  /**
   * Update load more button visibility
   */
  updateLoadMoreButton() {
    const container = document.getElementById('load-more-container');
    if (!container) return;

    if (this.hasMore && this.bookmarks.length > 0) {
      container.classList.remove('hidden');
    } else {
      container.classList.add('hidden');
    }
  }

  /**
   * Set search query and reload
   */
  async setSearchQuery(query) {
    this.searchQuery = query;
    this.currentPage = 1;
    this.bookmarks = [];
    await this.load();
  }

  /**
   * Set active tags and reload
   */
  async setActiveTags(tags) {
    this.activeTags = tags;
    this.currentPage = 1;
    this.bookmarks = [];
    await this.load();
  }

  /**
   * Refresh feed
   */
  async refresh() {
    this.currentPage = 1;
    this.bookmarks = [];
    await this.load();
  }
}
