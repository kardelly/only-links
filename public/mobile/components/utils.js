/**
 * Shared utility functions for mobile app
 */

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
export function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format timestamp as relative time (e.g., "2h ago")
 * @param {string|number} timestamp - ISO timestamp or milliseconds
 * @returns {string} Relative time string
 */
export function timeAgo(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type: 'default' | 'success' | 'error'
 * @param {number} duration - Duration in milliseconds (default 3000)
 */
export function showToast(message, type = 'default', duration = 3000) {
  // Remove existing toasts
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  // Add icon based on type
  if (type === 'success') {
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
        <polyline points="3,9 7,13 15,5"></polyline>
      </svg>
      <span>${escapeHtml(message)}</span>
    `;
  } else if (type === 'error') {
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
        <circle cx="9" cy="9" r="7"></circle>
        <line x1="9" y1="5" x2="9" y2="9"></line>
        <line x1="9" y1="12" x2="9.01" y2="12"></line>
      </svg>
      <span>${escapeHtml(message)}</span>
    `;
  } else {
    toast.textContent = message;
  }

  document.body.appendChild(toast);

  // Trigger animation with slight delay for smooth entrance
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
  });

  // Remove after duration
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Tag Input with chips + autocomplete
 * Usage:
 *   const ti = new TagInput(containerEl);
 *   ti.setTags(['js', 'react']);   // pre-fill
 *   ti.getTags();                  // → ['js', 'react']
 *   ti.destroy();                  // cleanup
 */
export class TagInput {
  constructor(container) {
    this.container = container;
    this.tags = [];
    this.suggestions = [];
    this.suggestionsVisible = false;
    this._onDocClick = this._onDocClick.bind(this);
    this._render();
  }

  _render() {
    this.container.innerHTML = '';
    this.container.className = 'tag-input-wrapper';

    // chips row + text input
    this.field = document.createElement('div');
    this.field.className = 'tag-input-field';

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.className = 'tag-input-text';
    this.input.placeholder = 'Add tags…';
    this.input.autocomplete = 'off';
    this.input.autocorrect = 'off';
    this.input.autocapitalize = 'none';
    this.input.spellcheck = false;

    this.field.appendChild(this.input);
    this.container.appendChild(this.field);

    // dropdown
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'tag-input-dropdown';
    this.dropdown.hidden = true;
    this.container.appendChild(this.dropdown);

    this._bindEvents();
  }

  _bindEvents() {
    const debouncedFetch = debounce((q) => this._fetchSuggestions(q), 200);

    this.input.addEventListener('input', () => {
      const val = this.input.value;
      // comma or space → confirm
      if (val.endsWith(',') || val.endsWith(' ')) {
        const tag = val.slice(0, -1).trim();
        if (tag) this._addTag(tag);
        return;
      }
      const q = val.trim();
      if (q.length >= 1) debouncedFetch(q);
      else this._hideDropdown();
    });

    this.input.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ',') && !e.isComposing) {
        e.preventDefault();
        const tag = this.input.value.replace(/,$/, '').trim();
        if (tag) this._addTag(tag);
      } else if (e.key === 'Backspace' && this.input.value === '' && this.tags.length) {
        this._removeTag(this.tags[this.tags.length - 1]);
      }
    });

    this.input.addEventListener('blur', () => {
      // small delay so tap on dropdown registers first
      setTimeout(() => this._hideDropdown(), 150);
    });

    document.addEventListener('click', this._onDocClick);
  }

  _onDocClick(e) {
    if (!this.container.contains(e.target)) this._hideDropdown();
  }

  async _fetchSuggestions(q) {
    try {
      const res = await fetch(`/api/tags?q=${encodeURIComponent(q)}&limit=8`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const all = (data.tags || []).map(t => t.name || t).filter(t => !this.tags.includes(t));
      this._showDropdown(all);
    } catch { /* silent */ }
  }

  _showDropdown(items) {
    if (!items.length) { this._hideDropdown(); return; }
    this.dropdown.innerHTML = '';
    items.forEach(tag => {
      const item = document.createElement('div');
      item.className = 'tag-input-suggestion';
      item.textContent = tag;
      item.addEventListener('mousedown', (e) => { e.preventDefault(); this._addTag(tag); });
      item.addEventListener('touchend', (e) => { e.preventDefault(); this._addTag(tag); });
      this.dropdown.appendChild(item);
    });
    this.dropdown.hidden = false;
  }

  _hideDropdown() {
    this.dropdown.hidden = true;
    this.dropdown.innerHTML = '';
  }

  _addTag(tag) {
    tag = tag.trim().toLowerCase().replace(/[^a-z0-9-_.]/g, '').slice(0, 50);
    if (!tag || this.tags.includes(tag) || this.tags.length >= 20) return;
    this.tags.push(tag);
    this.input.value = '';
    this._hideDropdown();
    this._renderChips();
    this.input.focus();
  }

  _removeTag(tag) {
    this.tags = this.tags.filter(t => t !== tag);
    this._renderChips();
    this.input.focus();
  }

  _renderChips() {
    // remove existing chips
    this.field.querySelectorAll('.tag-chip').forEach(c => c.remove());
    // insert chips before input
    [...this.tags].reverse().forEach(tag => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.innerHTML = `${escapeHtml(tag)}<button type="button" aria-label="Remove ${escapeHtml(tag)}" class="tag-chip-remove">×</button>`;
      chip.querySelector('button').addEventListener('click', () => this._removeTag(tag));
      this.field.insertBefore(chip, this.input);
    });
    // update placeholder
    this.input.placeholder = this.tags.length ? '' : 'Add tags…';
  }

  /** Pre-fill tags (array or comma string) */
  setTags(value) {
    const arr = Array.isArray(value)
      ? value
      : String(value || '').split(',').map(t => t.trim()).filter(Boolean);
    this.tags = [];
    arr.forEach(t => this._addTag(t));
  }

  /** Returns current tags as array */
  getTags() { return [...this.tags]; }

  /** Returns current tags as comma-separated string */
  getValue() { return this.tags.join(', '); }

  destroy() {
    document.removeEventListener('click', this._onDocClick);
  }
}

/**
 * Fetch with error handling
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Response data or null on error
 */
export async function fetchWithError(url, options = {}) {
  try {
    const response = await fetch(url, { credentials: 'include', ...options });

    if (!response.ok) {
      if (response.status === 401) {
        // Session expired
        showToast('Session expired. Please log in again.');
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
        return null;
      } else if (response.status === 429) {
        showToast('Too many requests. Please wait a moment.');
        return null;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    }

    return await response.json();
  } catch (err) {
    if (err.name === 'TypeError') {
      // Network error
      showToast('Connection failed. Check your internet.');
    } else {
      console.error('Fetch error:', err);
      showToast('Something went wrong. Please try again.');
    }
    return null;
  }
}
