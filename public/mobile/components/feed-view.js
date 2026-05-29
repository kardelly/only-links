import { BaseView } from './base-view.js';
import { escapeHtml, timeAgo, fetchWithError } from './utils.js';

/**
 * Feed View
 * Displays bookmark feed with pagination
 */
export class FeedView extends BaseView {
  constructor() {
    super('feed-view');
    this.page = 1;
    this.limit = 20;
    this.hasMore = true;
    this.bookmarks = [];
    this.loading = false;
  }

  /**
   * Load bookmarks from API
   */
  async load() {
    this.showLoading();

    try {
      const data = await fetchWithError(`/api/bookmarks?page=${this.page}&limit=${this.limit}`);

      if (data) {
        // API returns { items: [], pagination: {} }
        this.bookmarks = data.items || [];
        this.hasMore = data.pagination && data.pagination.page < data.pagination.totalPages;
        this.render();
      }
    } catch (err) {
      console.error('Failed to load feed:', err);
      this.showError('Failed to load bookmarks');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Render bookmark feed
   */
  render() {
    this.clear();
    
    // Empty state
    if (this.bookmarks.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state">
          <h2>No bookmarks yet</h2>
          <p>Tap the + button to save your first bookmark</p>
        </div>
      `;
      return;
    }
    
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
    
    // Render tags (max 3)
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
          <span class="username">@${escapeHtml(bookmark.username)}</span>
          <span class="date">${timeAgo(bookmark.created_at)}</span>
        </div>
      </div>
    `;
    
    // Click to open bookmark
    card.addEventListener('click', () => {
      window.open(bookmark.url, '_blank');
    });
    
    return card;
  }

  /**
   * Render tags HTML (max 3 visible)
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
        const data = await fetchWithError(`/api/bookmarks?page=${this.page}&limit=${this.limit}`);

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
