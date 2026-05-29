/**
 * Base View Class
 * All views (Feed, Search, Tags, Profile) extend this
 */
export class BaseView {
  constructor(viewId) {
    this.viewId = viewId;
    this.container = null;
    this.isLoaded = false;
  }

  /**
   * Initialize view (called once)
   */
  init() {
    this.container = document.getElementById(this.viewId);
    if (!this.container) {
      console.error(`View container #${this.viewId} not found`);
    }
  }

  /**
   * Show view and load data if first time
   */
  async show() {
    if (!this.container) return;

    this.container.style.display = 'block';

    if (!this.isLoaded) {
      await this.load();
      this.isLoaded = true;
    }
  }

  /**
   * Hide view
   */
  hide() {
    if (!this.container) return;
    this.container.style.display = 'none';
  }

  /**
   * Load view data (override in subclasses)
   */
  async load() {
    throw new Error('load() must be implemented in subclass');
  }

  /**
   * Show loading spinner
   */
  showLoading() {
    if (!this.container) return;

    const loader = document.createElement('div');
    loader.className = 'loading-spinner';
    loader.innerHTML = '<div class="spinner"></div>';
    this.container.appendChild(loader);
  }

  /**
   * Hide loading spinner
   */
  hideLoading() {
    if (!this.container) return;

    const loader = this.container.querySelector('.loading-spinner');
    if (loader) loader.remove();
  }

  /**
   * Show error message
   */
  showError(message) {
    if (!this.container) return;

    const error = document.createElement('div');
    error.className = 'error-message';
    error.textContent = message;
    this.container.appendChild(error);

    setTimeout(() => error.remove(), 5000);
  }

  /**
   * Clear view content
   */
  clear() {
    if (!this.container) return;
    this.container.innerHTML = '';
  }
}
