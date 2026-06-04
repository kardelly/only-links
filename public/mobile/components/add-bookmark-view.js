import { isValidUrl, showToast, fetchWithError, escapeHtml, TagInput } from './utils.js';

/**
 * Add Bookmark View (Bottom Sheet)
 * Form for creating new bookmarks
 */
export class AddBookmarkView {
  constructor() {
    this.sheet = null;
    this.backdrop = null;
    this.sharedData = null;
    this.tagInput = null;
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
              type="text"
              id="bookmark-url"
              name="url"
              placeholder="https://example.com"
              inputmode="url"
              autocorrect="off"
              autocapitalize="none"
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
            <label>Tags</label>
            <div id="bookmark-tags-container"></div>
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

    // Initialize tag input
    const tagContainer = document.getElementById('bookmark-tags-container');
    this.tagInput = new TagInput(tagContainer);
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const form = document.getElementById('add-bookmark-form');
    const cancelBtn = document.getElementById('cancel-btn');
    const urlInput = document.getElementById('bookmark-url');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    cancelBtn.addEventListener('click', () => this.close());

    // Fetch metadata when URL field loses focus
    urlInput.addEventListener('blur', () => this.fetchMetadata());
    // Also trigger on paste
    urlInput.addEventListener('paste', () => {
      setTimeout(() => this.fetchMetadata(), 100);
    });

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
   * Fetch og metadata for the current URL and fill title/description
   */
  async fetchMetadata() {
    const urlInput = document.getElementById('bookmark-url');
    const titleInput = document.getElementById('bookmark-title');
    const descInput = document.getElementById('bookmark-description');

    let url = urlInput.value.trim();
    if (!url) return;

    // Normalise protocol
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
      urlInput.value = url;
    }

    // Only fetch if title is still empty (don't overwrite user edits)
    if (titleInput.value.trim()) return;

    // Show subtle loading state on title field
    titleInput.placeholder = 'Fetching…';

    try {
      const res = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('metadata failed');
      const data = await res.json();

      if (data.title && !titleInput.value.trim()) {
        titleInput.value = data.title;
      }
      if (data.description && !descInput.value.trim()) {
        descInput.value = data.description;
      }
    } catch (_) {
      // silent fail — user can fill manually
    } finally {
      titleInput.placeholder = 'Bookmark title';
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

    // Reset tag input
    if (this.tagInput) this.tagInput.setTags([]);

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
    if (formData.tags && formData.tags.length) {
      if (formData.tags.some(tag => tag.length > 50)) {
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

    // Normalize URL — add https:// if no protocol given
    let rawUrl = form.url.value.trim();
    if (rawUrl && !/^https?:\/\//i.test(rawUrl)) {
      rawUrl = 'https://' + rawUrl;
      form.url.value = rawUrl;
    }

    // Get form data
    const formData = {
      url: rawUrl,
      title: form.title.value.trim(),
      description: form.description.value.trim(),
      tags: this.tagInput ? this.tagInput.getValue() : '',
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
        // Success animation: button transforms to checkmark
        saveBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4,10 8,14 16,6"></polyline>
          </svg>
        `;
        saveBtn.style.background = 'oklch(54% 0.15 145)';
        saveBtn.style.transform = 'scale(1.05)';

        // Haptic feedback (mobile only)
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }

        // Wait for animation, then close with delight
        setTimeout(() => {
          showToast('Saved', 'success');

          // Close with smooth transition
          this.sheet.style.transition = 'transform 400ms cubic-bezier(0.16, 1, 0.3, 1), opacity 400ms cubic-bezier(0.16, 1, 0.3, 1)';
          this.backdrop.style.transition = 'opacity 400ms cubic-bezier(0.16, 1, 0.3, 1)';
          this.close();

          // Add pulse animation to the + button
          const addButton = document.querySelector('.nav-item.nav-add');
          if (addButton) {
            addButton.classList.add('success-pulse');
            setTimeout(() => {
              addButton.classList.remove('success-pulse');
            }, 800);
          }

          // Refresh feed
          if (window.mobileApp && window.mobileApp.views && window.mobileApp.views.feed) {
            window.mobileApp.views.feed.refresh();
          }

          // Navigate to feed after close animation
          setTimeout(() => {
            if (window.mobileApp && window.mobileApp.showView) {
              window.mobileApp.showView('feed');
            }
          }, 200);
        }, 600);
      }
    } catch (err) {
      console.error('Failed to save bookmark:', err);

      // Reset button on error
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
      saveBtn.style.transform = '';
    }
  }
}
