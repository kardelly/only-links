import { BaseComponent } from './base-component.js';
import { API_BASE_URL } from '../utils/constants.js';
import { showToast } from '../utils/ui-helpers.js';

export class AddBookmarkView extends BaseComponent {
  constructor() {
    super();
    this.isOpen = false;
  }

  getTemplate() {
    return `
      <div class="add-bookmark-view" data-open="false">
        <div class="backdrop"></div>
        <div class="bottom-sheet">
          <div class="sheet-header">
            <h2>Add Bookmark</h2>
            <button class="close-btn" aria-label="Close">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <form class="bookmark-form">
            <div class="form-group">
              <label for="url">URL *</label>
              <input type="url" id="url" name="url" required placeholder="https://example.com" autocomplete="url">
              <span class="error-message"></span>
            </div>
            <div class="form-group">
              <label for="title">Title</label>
              <input type="text" id="title" name="title" placeholder="Bookmark title" autocomplete="off">
            </div>
            <div class="form-group">
              <label for="description">Description</label>
              <textarea id="description" name="description" rows="3" placeholder="Add a description..."></textarea>
            </div>
            <div class="form-group">
              <label for="tags">Tags</label>
              <input type="text" id="tags" name="tags" placeholder="Separate tags with commas" autocomplete="off">
              <small>Separate multiple tags with commas</small>
            </div>
            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" id="public" name="public" checked>
                <span>Public bookmark</span>
              </label>
              <small>Public bookmarks can be seen by others</small>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-secondary cancel-btn">Cancel</button>
              <button type="submit" class="btn btn-primary submit-btn">
                <span class="btn-text">Save Bookmark</span>
                <span class="btn-spinner" style="display: none;">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2" opacity="0.3"/>
                    <path d="M10 2a8 8 0 0 1 8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  getStyles() {
    return `
      <style>
        .add-bookmark-view {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .add-bookmark-view[data-open="true"] {
          pointer-events: auto;
          opacity: 1;
        }

        .backdrop {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .add-bookmark-view[data-open="true"] .backdrop {
          opacity: 1;
        }

        .bottom-sheet {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--bg-primary, #fff);
          border-radius: 16px 16px 0 0;
          box-shadow: 0 -2px 16px rgba(0, 0, 0, 0.1);
          transform: translateY(100%);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          max-height: 90vh;
          display: flex;
          flex-direction: column;
        }

        .add-bookmark-view[data-open="true"] .bottom-sheet {
          transform: translateY(0);
        }

        .sheet-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px;
          border-bottom: 1px solid var(--border-color, #e5e7eb);
          flex-shrink: 0;
        }

        .sheet-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary, #111827);
        }

        .close-btn {
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          color: var(--text-secondary, #6b7280);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease;
        }

        .close-btn:hover,
        .close-btn:focus {
          background: var(--bg-secondary, #f3f4f6);
        }

        .bookmark-form {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary, #111827);
        }

        .form-group input[type="url"],
        .form-group input[type="text"],
        .form-group textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 8px;
          font-size: 16px;
          color: var(--text-primary, #111827);
          background: var(--bg-primary, #fff);
          transition: border-color 0.2s ease;
          box-sizing: border-box;
        }

        .form-group input[type="url"]:focus,
        .form-group input[type="text"]:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: var(--primary-color, #3b82f6);
        }

        .form-group input.error {
          border-color: var(--error-color, #ef4444);
        }

        .form-group textarea {
          resize: vertical;
          min-height: 80px;
          font-family: inherit;
        }

        .form-group small {
          display: block;
          margin-top: 4px;
          font-size: 12px;
          color: var(--text-secondary, #6b7280);
        }

        .error-message {
          display: none;
          margin-top: 4px;
          font-size: 12px;
          color: var(--error-color, #ef4444);
        }

        .error-message:not(:empty) {
          display: block;
        }

        .checkbox-group {
          margin-bottom: 24px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-weight: normal;
          margin-bottom: 4px;
        }

        .checkbox-label input[type="checkbox"] {
          width: 20px;
          height: 20px;
          cursor: pointer;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          padding-top: 8px;
        }

        .btn {
          flex: 1;
          padding: 14px 20px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-secondary {
          background: var(--bg-secondary, #f3f4f6);
          color: var(--text-primary, #111827);
        }

        .btn-secondary:hover:not(:disabled),
        .btn-secondary:focus:not(:disabled) {
          background: var(--bg-tertiary, #e5e7eb);
        }

        .btn-primary {
          background: var(--primary-color, #3b82f6);
          color: white;
        }

        .btn-primary:hover:not(:disabled),
        .btn-primary:focus:not(:disabled) {
          background: var(--primary-color-dark, #2563eb);
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-spinner svg {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Keyboard handling */
        @media (max-height: 600px) {
          .bottom-sheet {
            max-height: 100vh;
            border-radius: 0;
          }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .bottom-sheet {
            --bg-primary: #1f2937;
            --bg-secondary: #374151;
            --bg-tertiary: #4b5563;
            --text-primary: #f9fafb;
            --text-secondary: #d1d5db;
            --border-color: #4b5563;
          }
        }
      </style>
    `;
  }

  afterRender() {
    this.cacheElements();
    this.attachEventListeners();
  }

  cacheElements() {
    this.container = this.querySelector('.add-bookmark-view');
    this.backdrop = this.querySelector('.backdrop');
    this.sheet = this.querySelector('.bottom-sheet');
    this.closeBtn = this.querySelector('.close-btn');
    this.cancelBtn = this.querySelector('.cancel-btn');
    this.form = this.querySelector('.bookmark-form');
    this.submitBtn = this.querySelector('.submit-btn');
    this.urlInput = this.querySelector('#url');
    this.titleInput = this.querySelector('#title');
    this.descriptionInput = this.querySelector('#description');
    this.tagsInput = this.querySelector('#tags');
    this.publicCheckbox = this.querySelector('#public');
  }

  attachEventListeners() {
    this.backdrop.addEventListener('click', () => this.close());
    this.closeBtn.addEventListener('click', () => this.close());
    this.cancelBtn.addEventListener('click', () => this.close());
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    this.urlInput.addEventListener('input', () => this.clearError('url'));

    // Handle keyboard on mobile
    if ('visualViewport' in window) {
      window.visualViewport.addEventListener('resize', () => this.handleViewportResize());
    }
  }

  handleViewportResize() {
    if (!this.isOpen) return;

    const viewportHeight = window.visualViewport.height;
    const windowHeight = window.innerHeight;
    const keyboardHeight = windowHeight - viewportHeight;

    if (keyboardHeight > 100) {
      // Keyboard is open
      this.sheet.style.maxHeight = `${viewportHeight - 20}px`;
    } else {
      // Keyboard is closed
      this.sheet.style.maxHeight = '90vh';
    }
  }

  open() {
    this.isOpen = true;
    this.container.setAttribute('data-open', 'true');
    document.body.style.overflow = 'hidden';

    // Focus first input after animation
    setTimeout(() => {
      this.urlInput.focus();
    }, 300);
  }

  close() {
    this.isOpen = false;
    this.container.setAttribute('data-open', 'false');
    document.body.style.overflow = '';
    this.resetForm();
  }

  openWithData(data) {
    // Pre-fill form with shared data (Share Target API)
    if (data.url) {
      this.urlInput.value = data.url;
    }
    if (data.title) {
      this.titleInput.value = data.title;
    }
    if (data.text) {
      this.descriptionInput.value = data.text;
    }
    this.open();
  }

  clearError(fieldName) {
    const input = this.querySelector(`#${fieldName}`);
    const errorMessage = input.parentElement.querySelector('.error-message');
    input.classList.remove('error');
    errorMessage.textContent = '';
  }

  showError(fieldName, message) {
    const input = this.querySelector(`#${fieldName}`);
    const errorMessage = input.parentElement.querySelector('.error-message');
    input.classList.add('error');
    errorMessage.textContent = message;
  }

  validateForm() {
    let isValid = true;

    // Validate URL
    const url = this.urlInput.value.trim();
    if (!url) {
      this.showError('url', 'URL is required');
      isValid = false;
    } else {
      try {
        new URL(url);
      } catch (e) {
        this.showError('url', 'Please enter a valid URL');
        isValid = false;
      }
    }

    return isValid;
  }

  async handleSubmit(e) {
    e.preventDefault();

    if (!this.validateForm()) {
      return;
    }

    const formData = {
      url: this.urlInput.value.trim(),
      title: this.titleInput.value.trim(),
      description: this.descriptionInput.value.trim(),
      tags: this.tagsInput.value
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0),
      public: this.publicCheckbox.checked
    };

    this.setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save bookmark');
      }

      const bookmark = await response.json();

      showToast('Bookmark saved successfully!', 'success');
      this.close();

      // Refresh the feed
      this.dispatchEvent(new CustomEvent('bookmark-added', {
        detail: { bookmark },
        bubbles: true
      }));

    } catch (error) {
      console.error('Error saving bookmark:', error);
      showToast(error.message || 'Failed to save bookmark', 'error');
    } finally {
      this.setSubmitting(false);
    }
  }

  setSubmitting(isSubmitting) {
    this.submitBtn.disabled = isSubmitting;
    this.cancelBtn.disabled = isSubmitting;

    const btnText = this.submitBtn.querySelector('.btn-text');
    const btnSpinner = this.submitBtn.querySelector('.btn-spinner');

    if (isSubmitting) {
      btnText.style.display = 'none';
      btnSpinner.style.display = 'block';
    } else {
      btnText.style.display = 'block';
      btnSpinner.style.display = 'none';
    }
  }

  resetForm() {
    this.form.reset();
    this.clearError('url');
    this.setSubmitting(false);
  }
}

customElements.define('add-bookmark-view', AddBookmarkView);
