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
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (diff < minute) return 'just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < week) return `${Math.floor(diff / day)}d ago`;
  if (diff < month) return `${Math.floor(diff / week)}w ago`;
  if (diff < year) return `${Math.floor(diff / month)}mo ago`;
  return `${Math.floor(diff / year)}y ago`;
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
