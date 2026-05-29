/**
 * BaseView - Base class for all views
 */
export class BaseView {
  constructor(container) {
    this.container = container;
    this.isVisible = false;
  }

  /**
   * Initialize the view
   */
  async init() {
    // Override in subclasses
  }

  /**
   * Show the view
   */
  show() {
    if (this.container) {
      this.container.classList.remove('hidden');
      this.isVisible = true;
    }
  }

  /**
   * Hide the view
   */
  hide() {
    if (this.container) {
      this.container.classList.add('hidden');
      this.isVisible = false;
    }
  }

  /**
   * Load data for the view
   */
  async load() {
    // Override in subclasses
  }

  /**
   * Show loading state
   */
  showLoading() {
    if (this.container) {
      const loader = document.createElement('div');
      loader.className = 'loader';
      loader.innerHTML = '<div class="spinner"></div>';
      this.container.appendChild(loader);
    }
  }

  /**
   * Hide loading state
   */
  hideLoading() {
    if (this.container) {
      const loader = this.container.querySelector('.loader');
      if (loader) {
        loader.remove();
      }
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    if (this.container) {
      const error = document.createElement('div');
      error.className = 'error-message';
      error.textContent = message;
      this.container.appendChild(error);

      setTimeout(() => error.remove(), 5000);
    }
  }

  /**
   * Clear the view content
   */
  clear() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
