import { isValidUrl, showToast, fetchWithError, escapeHtml } from './utils.js';

/**
 * Add Bookmark View (Bottom Sheet)
 * Form for creating new bookmarks
 */
export class AddBookmarkView {
  constructor() {
    this.sheet = null;
    this.backdrop = null;
    this.sharedData = null;
  }

  /**
   * Initialize bottom sheet
   */
  init() {
    this.createElements();
    this.attachEventListeners();
  }

  /**
   * Create bottom sheet elements
   */
  createElements() {
    // Create backdrop
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'bottom-sheet-backdrop';
    this.backdrop.addEventListener('click', () => this.close());
    document.body.appendChild(this.backdrop);

    // Create sheet
    this.sheet = document.createElement('div');
    this.sheet.className = 'bottom-sheet';
    this.sheet.innerHTML = `
      <div class="bottom-sheet-handle"></div>
      <div class="bottom-sheet-content">
        <h2>Add Bookmark</h2>

        <form id="add-bookmark-form">
          <div class="form-group">
            <label for="bookmark-url">URL *</label>
            <input 
              type="url" 
              id="bookmark-url" 
              name="url" 
              placeholder="https://example.com"
              required>
            <span class="form-error"></span>
          </div>

          <div class="form-group">
            <label for="bookmark-title">Title</label>
            <input 
              type="text" 
              id="bookmark-title" 
              name="title" 
              placeholder="Bookmark title">
            <span class="form-error"></span>
          </div>

          <div class="form-group">
            <label for="bookmark-description">Description</label>
            <textarea 
              id="bookmark-description" 
              name="description" 
              placeholder="Optional description"
              rows="3"></textarea>
          </div>

          <div class="form-group">
            <label for="bookmark-tags">Tags</label>
            <input 
              type="text" 
              id="bookmark-tags" 
              name="tags" 
              placeholder="javascript, tutorial, react">
            <small>Separate tags with commas</small>
          </div>

          <div class="form-group form-checkbox">
            <label>
              <input type="checkbox" id="bookmark-public" name="is_public" checked>
              <span>Public bookmark</span>
            </label>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
            <button type="submit" class="btn btn-primary" id="save-btn">Save</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(this.sheet);
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const form = document.getElementById('add-bookmark-form');
    const cancelBtn = document.getElementById('cancel-btn');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    cancelBtn.addEventListener('click', () => this.close());

    // Keyboard handling for visual viewport
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        if (this.sheet.classList.contains('active')) {
          this.sheet.style.maxHeight = `${window.visualViewport.height - 20}px`;
        }
      });
    }
  }

  /**
   * Open bottom sheet
   */
  open() {
    this.sharedData = null;
    this.clearForm();
    this.backdrop.classList.add('active');
    this.sheet.classList.add('active');

    // Focus URL input
    setTimeout(() => {
      document.getElementById('bookmark-url').focus();
    }, 300);
  }

  /**
   * Open with pre-filled data (for Share Target)
   */
  openWithData(data) {
    this.sharedData = data;
    this.clearForm();

    if (data.url) {
      document.getElementById('bookmark-url').value = data.url;
    }
    if (data.title) {
      document.getElementById('bookmark-title').value = data.title;
    }
    if (data.text) {
      document.getElementById('bookmark-description').value = data.text;
    }

    this.backdrop.classList.add('active');
    this.sheet.classList.add('active');

    // Focus tags input (URL already filled)
    setTimeout(() => {
      document.getElementById('bookmark-tags').focus();
    }, 300);
  }

  /**
   * Close bottom sheet
   */
  close() {
    this.backdrop.classList.remove('active');
    this.sheet.classList.remove('active');
    this.sharedData = null;
  }

  /**
   * Clear form
   */
  clearForm() {
    const form = document.getElementById('add-bookmark-form');
    form.reset();

    // Clear errors
    const errors = form.querySelectorAll('.form-error');
    errors.forEach(error => {
      error.textContent = '';
      error.style.display = 'none';
    });

    // Remove error classes
    const inputs = form.querySelectorAll('input, textarea');
    inputs.forEach(input => input.classList.remove('error'));
  }

  /**
   * Validate form
   */
  validateForm(formData) {
    const errors = [];

    // URL required and valid
    if (!formData.url || formData.url.trim() === '') {
      errors.push({ field: 'url', message: 'URL is required' });
    } else if (!isValidUrl(formData.url)) {
      errors.push({ field: 'url', message: 'Invalid URL format' });
    }

    // Title length
    if (formData.title && formData.title.length > 500) {
      errors.push({ field: 'title', message: 'Title too long (max 500 characters)' });
    }

    // Tags length
    if (formData.tags) {
      const tags = formData.tags.split(',').map(t => t.trim());
      if (tags.some(tag => tag.length > 50)) {
        errors.push({ field: 'tags', message: 'Individual tags must be under 50 characters' });
      }
    }

    return errors;
  }

  /**
   * Show form errors
   */
  showFormErrors(errors) {
    errors.forEach(({ field, message }) => {
      const input = document.querySelector(`[name="${field}"]`);
      if (!input) return;

      input.classList.add('error');
      const errorEl = input.parentElement.querySelector('.form-error');
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
      }
    });
  }

  /**
   * Handle form submission
   */
  async handleSubmit() {
    const form = document.getElementById('add-bookmark-form');
    const saveBtn = document.getElementById('save-btn');

    // Get form data
    const formData = {
      url: form.url.value.trim(),
      title: form.title.value.trim(),
      description: form.description.value.trim(),
      tags: form.tags.value.trim(),
      is_public: form.is_public.checked
    };

    // Validate
    const errors = this.validateForm(formData);
    if (errors.length > 0) {
      this.showFormErrors(errors);
      return;
    }

    // Disable submit button
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const data = await fetchWithError('/api/bookmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (data) {
        showToast('Bookmark saved ✓');
        this.close();

        // Refresh feed if it exists
        if (window.app && window.app.views && window.app.views.feed) {
          window.app.views.feed.refresh();
        }

        // Navigate to feed
        if (window.app && window.app.showView) {
          setTimeout(() => window.app.showView('feed'), 500);
        }
      }
    } catch (err) {
      console.error('Failed to save bookmark:', err);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
    }
  }
}
