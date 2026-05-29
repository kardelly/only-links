import { BaseView } from './base-view.js';
import { escapeHtml, fetchWithError } from './utils.js';

/**
 * Tags View
 * Display popular tags
 */
export class TagsView extends BaseView {
  constructor() {
    super('tags-view');
    this.tags = [];
  }

  /**
   * Load tags from API
   */
  async load() {
    this.showLoading();

    try {
      const data = await fetchWithError('/api/tags');

      if (data && data.tags) {
        this.tags = data.tags;
        this.render();
      }
    } catch (err) {
      console.error('Failed to load tags:', err);
      this.showError('Failed to load tags');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Render tags cloud
   */
  render() {
    this.clear();

    // Empty state
    if (this.tags.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state">
          <h2>No tags yet</h2>
          <p>Tags will appear as you add bookmarks</p>
        </div>
      `;
      return;
    }

    // Create tags cloud
    const cloud = document.createElement('div');
    cloud.className = 'tags-cloud';

    this.tags.forEach(tag => {
      const tagEl = this.createTagElement(tag);
      cloud.appendChild(tagEl);
    });

    this.container.appendChild(cloud);
  }

  /**
   * Create tag element
   */
  createTagElement(tag) {
    const el = document.createElement('button');
    el.className = 'tag-item';
    el.dataset.tag = tag.tag;

    // Size based on count (simple scaling)
    const minSize = 14;
    const maxSize = 24;
    const minCount = 1;
    const maxCount = Math.max(...this.tags.map(t => t.count));

    let fontSize = minSize;
    if (maxCount > minCount) {
      fontSize = minSize + ((tag.count - minCount) / (maxCount - minCount)) * (maxSize - minSize);
    }

    el.style.fontSize = `${fontSize}px`;

    el.innerHTML = `
      <span class="tag-name">${escapeHtml(tag.tag)}</span>
      <span class="tag-count">${tag.count}</span>
    `;

    // Click to search by tag
    el.addEventListener('click', () => {
      this.searchByTag(tag.tag);
    });

    return el;
  }

  /**
   * Navigate to search with tag query
   */
  searchByTag(tag) {
    if (window.app && window.app.showView) {
      window.app.showView('search');

      // Pre-fill search input after view loads
      setTimeout(() => {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
          searchInput.value = tag;
          searchInput.dispatchEvent(new Event('input'));
        }
      }, 100);
    }
  }
}
