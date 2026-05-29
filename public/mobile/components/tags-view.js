import { BaseView } from './base-view.js';
import { escapeHTML } from './utils.js';

/**
 * TagsView - Display tag cloud with search functionality
 */
export class TagsView extends BaseView {
  constructor(container) {
    super(container);
    this.tags = [];
  }

  /**
   * Initialize the view
   */
  async init() {
    this.render();
    await this.load();
  }

  /**
   * Render the view structure
   */
  render() {
    this.container.innerHTML = `
      <div class="tags-container">
        <div class="tags-header">
          <h2 class="tags-title">Tags</h2>
          <p class="tags-subtitle">Explore topics and themes</p>
        </div>
        <div id="tag-cloud" class="tag-cloud"></div>
      </div>
    `;
  }

  /**
   * Load tags from API
   */
  async load() {
    this.showLoading();

    try {
      const response = await fetch('/api/tags');

      if (!response.ok) {
        throw new Error('Failed to fetch tags');
      }

      const data = await response.json();
      this.tags = data.tags || [];

      this.renderTags();
    } catch (error) {
      console.error('Error loading tags:', error);
      this.showError('Failed to load tags. Please try again.');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Render tags as a cloud
   */
  renderTags() {
    const cloud = document.getElementById('tag-cloud');
    if (!cloud) return;

    if (this.tags.length === 0) {
      this.renderEmptyState(cloud);
      return;
    }

    // Calculate size classes based on frequency
    const frequencies = this.tags.map(t => t.count);
    const maxFreq = Math.max(...frequencies);
    const minFreq = Math.min(...frequencies);
    const range = maxFreq - minFreq || 1;

    cloud.innerHTML = '';

    this.tags.forEach(tag => {
      const button = document.createElement('button');
      button.className = 'tag-cloud-item';

      // Calculate size class (1-5)
      const normalized = (tag.count - minFreq) / range;
      const sizeClass = Math.ceil(normalized * 4) + 1; // 1-5
      button.dataset.size = sizeClass;

      button.textContent = tag.name;
      button.title = `${tag.count} bookmark${tag.count !== 1 ? 's' : ''}`;

      button.addEventListener('click', () => {
        this.handleTagClick(tag.name);
      });

      cloud.appendChild(button);
    });
  }

  /**
   * Handle tag click - navigate to search view
   */
  handleTagClick(tagName) {
    // Dispatch custom event that the app can listen to
    const event = new CustomEvent('navigate-to-search', {
      detail: { tag: tagName }
    });
    window.dispatchEvent(event);
  }

  /**
   * Render empty state
   */
  renderEmptyState(container) {
    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
          <line x1="7" y1="7" x2="7.01" y2="7"></line>
        </svg>
        <h3 class="empty-state-title">No tags yet</h3>
        <p class="empty-state-description">Tags will appear as bookmarks are added.</p>
      </div>
    `;
  }

  /**
   * Refresh tags
   */
  async refresh() {
    await this.load();
  }
}
