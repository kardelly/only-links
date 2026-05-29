import { BaseView } from './base-view.js';
import { escapeHtml, timeAgo, debounce, fetchWithError } from './utils.js';

/**
 * Search View
 * Search bookmarks with debouncing
 */
export class SearchView extends BaseView {
  constructor() {
    super('search-view');
    this.query = '';
    this.results = [];
    this.debouncedSearch = debounce(this.performSearch.bind(this), 300);
  }

  /**
   * Load search view (render search input)
   */
  async load() {
    this.render();
  }

  /**
   * Render search interface
   */
  render() {
    this.clear();

    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';

    searchContainer.innerHTML = `
      <div class="search-input-wrapper">
        <input 
          type="search" 
          id="search-input" 
          class="search-input" 
          placeholder="Search bookmarks..."
          autocomplete="off">
        <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
      </div>
      <div id="search-results" class="search-results"></div>
    `;

    this.container.appendChild(searchContainer);

    // Attach event listener
    const input = document.getElementById('search-input');
    input.addEventListener('input', (e) => {
      this.query = e.target.value.trim();
      if (this.query.length > 0) {
        this.debouncedSearch();
      } else {
        this.clearResults();
      }
    });

    // Auto-focus on show
    setTimeout(() => input.focus(), 100);
  }

  /**
   * Perform search API call
   */
  async performSearch() {
    if (!this.query) {
      this.clearResults();
      return;
    }

    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) return;

    // Show loading
    resultsContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

    try {
      const data = await fetchWithError(`/api/bookmarks?q=${encodeURIComponent(this.query)}`);

      if (data && data.items) {
        this.results = data.items;
        this.renderResults();
      }
    } catch (err) {
      console.error('Search failed:', err);
      resultsContainer.innerHTML = '<div class="error-message">Search failed</div>';
    }
  }

  /**
   * Render search results
   */
  renderResults() {
    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = '';

    // No results
    if (this.results.length === 0) {
      resultsContainer.innerHTML = `
        <div class="empty-state">
          <p>No bookmarks found for "${escapeHtml(this.query)}"</p>
          <p class="subtitle">Try different keywords</p>
        </div>
      `;
      return;
    }

    // Render results grid
    const grid = document.createElement('div');
    grid.className = 'bookmark-grid';

    this.results.forEach(bookmark => {
      const card = this.createBookmarkCard(bookmark);
      grid.appendChild(card);
    });

    resultsContainer.appendChild(grid);
  }

  /**
   * Create bookmark card (same as feed view)
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
          <span class="username">@${escapeHtml(bookmark.username)}</span>
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
   * Clear search results
   */
  clearResults() {
    const resultsContainer = document.getElementById('search-results');
    if (resultsContainer) {
      resultsContainer.innerHTML = '';
    }
    this.results = [];
  }
}
