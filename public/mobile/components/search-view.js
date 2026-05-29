import { BaseView } from './base-view.js';
import { timeAgo, escapeHtml, debounce } from './utils.js';

/**
 * SearchView - Search view component with debounced search
 */
export class SearchView extends BaseView {
  constructor(container) {
    super(container);
    this.bookmarks = [];
    this.searchQuery = '';
    this.isLoading = false;

    // Create debounced search function
    this.debouncedSearch = debounce((query) => {
      this.performSearch(query);
    }, 300);
  }

  /**
   * Initialize the view
   */
  async init() {
    this.render();
    this.setupEventListeners();
  }

  /**
   * Render the view structure
   */
  render() {
    this.container.innerHTML = `
      <div class="search-container">
        <div class="search-header">
          <div class="search-input-wrapper">
            <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="search"
              id="search-input"
              class="search-input"
              placeholder="Search bookmarks..."
              autocomplete="off"
              autofocus
            >
            <button id="clear-search-btn" class="clear-search-btn hidden" aria-label="Clear search">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        <div id="search-results" class="search-results"></div>
      </div>
    `;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-search-btn');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        this.searchQuery = query;

        // Update clear button visibility
        if (clearBtn) {
          if (query) {
            clearBtn.classList.remove('hidden');
          } else {
            clearBtn.classList.add('hidden');
          }
        }

        // Trigger debounced search
        if (query) {
          this.debouncedSearch(query);
        } else {
          this.clearResults();
        }
      });

      // Focus the search input when view is shown
      searchInput.focus();
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          searchInput.focus();
        }
        this.searchQuery = '';
        this.clearResults();
        clearBtn.classList.add('hidden');
      });
    }
  }

  /**
   * Perform search query
   */
  async performSearch(query) {
    if (this.isLoading) return;

    this.isLoading = true;
    this.showSearchLoading();

    try {
      const params = new URLSearchParams({
        q: query,
        limit: 50
      });

      const response = await fetch(`/api/bookmarks?${params}`);

      if (!response.ok) {
        throw new Error('Failed to search bookmarks');
      }

      const data = await response.json();
      this.bookmarks = data.bookmarks || [];

      this.renderResults();
    } catch (error) {
      console.error('Error searching bookmarks:', error);
      this.showError('Failed to search bookmarks. Please try again.');
    } finally {
      this.isLoading = false;
      this.hideSearchLoading();
    }
  }

  /**
   * Render search results
   */
  renderResults() {
    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = '';

    if (this.bookmarks.length === 0) {
      this.renderEmptyState(resultsContainer);
      return;
    }

    // Render results count
    const countEl = document.createElement('div');
    countEl.className = 'search-count';
    countEl.textContent = `${this.bookmarks.length} result${this.bookmarks.length !== 1 ? 's' : ''}`;
    resultsContainer.appendChild(countEl);

    // Render bookmarks in card format
    const grid = document.createElement('div');
    grid.className = 'bookmark-grid';

    this.bookmarks.forEach(bookmark => {
      const card = this.createBookmarkCard(bookmark);
      grid.appendChild(card);
    });

    resultsContainer.appendChild(grid);
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
      `<span class="tag" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</span>`
    ).join('');

    card.innerHTML = `
      ${thumbnailUrl ? `
        <div class="bookmark-thumbnail">
          <img src="${escapeHtml(thumbnailUrl)}"
               alt="${escapeHtml(bookmark.title)}"
               loading="lazy"
               onerror="this.parentElement.style.display='none'">
        </div>
      ` : ''}

      <div class="bookmark-content">
        <h3 class="bookmark-title">${escapeHtml(bookmark.title)}</h3>

        ${bookmark.description ? `
          <p class="bookmark-description">${escapeHtml(bookmark.description)}</p>
        ` : ''}

        ${bookmark.tags && bookmark.tags.length > 0 ? `
          <div class="bookmark-tags">
            ${tagsHtml}
          </div>
        ` : ''}

        <div class="bookmark-meta">
          <span class="bookmark-author">@${escapeHtml(bookmark.username)}</span>
          <span>•</span>
          <span class="bookmark-domain">${escapeHtml(host)}</span>
          <span>•</span>
          <span class="bookmark-time">${timeAgo(bookmark.created_at)}</span>
        </div>
      </div>
    `;

    // Open bookmark in new tab when clicked
    card.addEventListener('click', (e) => {
      // Don't open if clicking on a tag
      if (e.target.classList.contains('tag')) {
        return;
      }
      window.open(bookmark.url, '_blank', 'noopener,noreferrer');
    });

    return card;
  }

  /**
   * Render empty state
   */
  renderEmptyState(container) {
    const hasQuery = this.searchQuery.length > 0;

    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <h3 class="empty-state-title">${hasQuery ? 'No results found' : 'Start searching'}</h3>
        <p class="empty-state-description">${hasQuery ? `No bookmarks match "${escapeHtml(this.searchQuery)}"` : 'Type to search your bookmarks'}</p>
      </div>
    `;
  }

  /**
   * Show loading state for search
   */
  showSearchLoading() {
    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = `
      <div class="search-loading">
        <div class="spinner"></div>
        <p>Searching...</p>
      </div>
    `;
  }

  /**
   * Hide loading state for search
   */
  hideSearchLoading() {
    const loader = document.querySelector('.search-loading');
    if (loader) {
      loader.remove();
    }
  }

  /**
   * Clear search results
   */
  clearResults() {
    this.bookmarks = [];
    this.renderEmptyState(document.getElementById('search-results'));
  }

  /**
   * Override show to focus search input
   */
  show() {
    super.show();

    // Focus the search input when view is shown
    setTimeout(() => {
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.focus();
      }
    }, 100);
  }

  /**
   * Load data (override base class)
   */
  async load() {
    // Search view loads data through search input
    // Nothing to load on init
  }
}
