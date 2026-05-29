# Mobile PWA Phase 1 - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working mobile PWA with installable app, 5-tab navigation, and Share Target functionality

**Architecture:** Progressive Web App using vanilla JavaScript, Service Worker for caching, Web App Manifest for installation, bottom navigation pattern with view-based routing

**Tech Stack:** HTML/CSS/JavaScript (vanilla), PWA APIs (Service Worker, Manifest, Share Target), existing Express backend (no changes)

---

## File Structure

This plan creates the following files:

```
public/
├── manifest.json                        # PWA manifest
├── sw.js                                # Service Worker
├── favicon-192.png                      # PWA icon 192x192
├── favicon-512.png                      # PWA icon 512x512
├── mobile/
│   ├── mobile-app.html                  # Mobile app shell
│   ├── mobile-app.js                    # Main app controller
│   ├── mobile-styles.css                # Mobile-first styles
│   └── components/
│       ├── utils.js                     # Shared utilities (escapeHtml, timeAgo, etc)
│       ├── bottom-nav.js                # Bottom navigation component
│       ├── base-view.js                 # Base class for all views
│       ├── feed-view.js                 # Feed view implementation
│       ├── search-view.js               # Search view implementation
│       ├── add-bookmark-view.js         # Add bookmark bottom sheet
│       ├── tags-view.js                 # Tags view implementation
│       ├── profile-view.js              # Profile view implementation
│       └── install-prompt.js            # Install prompt banner
```

Modifies:
- `server.js` - Add mobile routes
- `public/app.html` - Add mobile device detection redirect

---

## Task 1: Create PWA Icons

**Files:**
- Create: `public/favicon-192.png`
- Create: `public/favicon-512.png`

- [ ] **Step 1: Check if icons already exist**

Run: `ls -la public/favicon-*.png`

If they exist, skip to Task 2. If not, continue.

- [ ] **Step 2: Create 192x192 icon from existing logo**

```bash
# If ImageMagick is installed
convert public/logo.png -resize 192x192 public/favicon-192.png

# Or manually create icons and place in public/
```

- [ ] **Step 3: Create 512x512 icon**

```bash
# If ImageMagick is installed
convert public/logo.png -resize 512x512 public/favicon-512.png

# Or manually create icon and place in public/
```

- [ ] **Step 4: Verify icons exist**

Run: `ls -la public/favicon-*.png`
Expected: Both files present

- [ ] **Step 5: Commit**

```bash
git add public/favicon-192.png public/favicon-512.png
git commit -m "feat: add PWA icons for mobile app

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: Create Web App Manifest

**Files:**
- Create: `public/manifest.json`

- [ ] **Step 1: Create manifest.json**

```json
{
  "name": "only.link",
  "short_name": "only.link",
  "description": "Social bookmarking, reimagined",
  "start_url": "/mobile/app?source=pwa",
  "display": "standalone",
  "background_color": "#FAF9F7",
  "theme_color": "#4F6FE8",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/favicon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/favicon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "share_target": {
    "action": "/share-target",
    "method": "GET",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url"
    }
  }
}
```

- [ ] **Step 2: Verify JSON is valid**

Run: `node -e "console.log(JSON.parse(require('fs').readFileSync('public/manifest.json', 'utf8')))"`
Expected: JSON parses without error

- [ ] **Step 3: Commit**

```bash
git add public/manifest.json
git commit -m "feat: add PWA manifest with share target support

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: Add Manifest Route to Server

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Find where static files are served**

Run: `grep -n "express.static" server.js`

Note the line number where static middleware is configured.

- [ ] **Step 2: Add manifest route before app.listen**

Find the section near the end of server.js (before `app.listen()`) and add:

```javascript
// ==========================================
// PWA ROUTES
// ==========================================

// Serve manifest with correct MIME type
app.get('/manifest.json', (req, res) => {
  res.type('application/manifest+json');
  res.sendFile(path.join(__dirname, 'public/manifest.json'));
});
```

- [ ] **Step 3: Test manifest route**

Start server: `npm start`
In another terminal: `curl -I http://localhost:3000/manifest.json`

Expected: 
```
HTTP/1.1 200 OK
Content-Type: application/manifest+json
```

- [ ] **Step 4: Stop server**

Press Ctrl+C

- [ ] **Step 5: Commit**

```bash
git add server.js
git commit -m "feat: add manifest.json route with correct MIME type

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: Create Basic Service Worker

**Files:**
- Create: `public/sw.js`

- [ ] **Step 1: Create service worker file**

```javascript
// Service Worker for only.link PWA
// Implements cache-first for static assets, network-first for API calls

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `onlylinks-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/mobile/mobile-app.html',
  '/mobile/mobile-styles.css',
  '/mobile/mobile-app.js',
  '/mobile/components/utils.js',
  '/mobile/components/bottom-nav.js',
  '/mobile/components/base-view.js',
  '/mobile/components/feed-view.js',
  '/mobile/components/search-view.js',
  '/mobile/components/add-bookmark-view.js',
  '/mobile/components/tags-view.js',
  '/mobile/components/profile-view.js',
  '/mobile/components/install-prompt.js',
  '/logo.png',
  '/favicon-192.png',
  '/favicon-512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Install complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Install failed:', error);
      })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - cache strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls: network first, no cache fallback (fail fast)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .catch((error) => {
          console.error('[SW] API fetch failed:', error);
          return new Response(
            JSON.stringify({ error: 'Network request failed' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // Static assets: cache first, fallback to network
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            // Cache successful responses
            if (networkResponse.ok && request.method === 'GET') {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });
            }
            return networkResponse;
          });
      })
      .catch((error) => {
        console.error('[SW] Fetch failed:', error);
        // Return offline fallback for HTML pages
        if (request.headers.get('accept').includes('text/html')) {
          return new Response(
            '<html><body><h1>You are offline</h1><p>Please check your internet connection.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        }
        throw error;
      })
  );
});
```

- [ ] **Step 2: Verify syntax**

Run: `node -c public/sw.js`
Expected: No output (syntax is valid)

- [ ] **Step 3: Commit**

```bash
git add public/sw.js
git commit -m "feat: add service worker with cache strategies

- Cache-first for static assets
- Network-first for API calls
- Offline fallback for HTML pages

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: Add Service Worker Route to Server

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Add service worker route after manifest route**

Add this code in the PWA ROUTES section after the manifest route:

```javascript
// Serve Service Worker with correct headers
app.get('/sw.js', (req, res) => {
  res.set('Service-Worker-Allowed', '/');
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, 'public/sw.js'));
});
```

- [ ] **Step 2: Test service worker route**

Start server: `npm start`
In another terminal: `curl -I http://localhost:3000/sw.js`

Expected: 
```
HTTP/1.1 200 OK
Content-Type: application/javascript
Cache-Control: no-cache, no-store, must-revalidate
Service-Worker-Allowed: /
```

- [ ] **Step 3: Stop server**

Press Ctrl+C

- [ ] **Step 4: Commit**

```bash
git add server.js
git commit -m "feat: add service worker route with correct headers

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: Create Utility Functions

**Files:**
- Create: `public/mobile/components/utils.js`

- [ ] **Step 1: Create mobile directory structure**

```bash
mkdir -p public/mobile/components
```

- [ ] **Step 2: Create utils.js**

```javascript
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
 * @param {number} duration - Duration in milliseconds (default 3000)
 */
export function showToast(message, duration = 3000) {
  // Remove existing toasts
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });
  
  // Remove after duration
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
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
    const response = await fetch(url, options);
    
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
```

- [ ] **Step 3: Verify syntax**

Run: `node -c public/mobile/components/utils.js`
Expected: No output (syntax is valid)

- [ ] **Step 4: Commit**

```bash
git add public/mobile/components/utils.js
git commit -m "feat: add utility functions for mobile app

- escapeHtml: XSS prevention
- timeAgo: relative time formatting
- showToast: notification system
- debounce: rate limiting
- fetchWithError: standardized API calls

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: Create Base View Class

**Files:**
- Create: `public/mobile/components/base-view.js`

- [ ] **Step 1: Create base-view.js**

```javascript
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
```

- [ ] **Step 2: Verify syntax**

Run: `node -c public/mobile/components/base-view.js`
Expected: No output (syntax is valid)

- [ ] **Step 3: Commit**

```bash
git add public/mobile/components/base-view.js
git commit -m "feat: add base view class for mobile app

- Lifecycle management (show/hide/load)
- Loading and error states
- Reusable foundation for all views

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: Create Bottom Navigation Component

**Files:**
- Create: `public/mobile/components/bottom-nav.js`

- [ ] **Step 1: Create bottom-nav.js**

```javascript
/**
 * Bottom Navigation Component
 * Manages navigation between 5 main sections
 */
export class BottomNav {
  constructor(onNavigate) {
    this.onNavigate = onNavigate;
    this.currentTab = 'feed';
    this.container = null;
  }

  /**
   * Initialize bottom navigation
   */
  init() {
    this.container = document.getElementById('bottom-nav');
    if (!this.container) {
      console.error('Bottom nav container not found');
      return;
    }

    this.render();
    this.attachEventListeners();
  }

  /**
   * Render bottom navigation HTML
   */
  render() {
    this.container.innerHTML = `
      <button class="nav-item active" data-tab="feed" aria-label="Feed">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span>Feed</span>
      </button>
      
      <button class="nav-item" data-tab="search" aria-label="Search">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <span>Search</span>
      </button>
      
      <button class="nav-item nav-add" data-tab="add" aria-label="Add bookmark">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
      
      <button class="nav-item" data-tab="tags" aria-label="Tags">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
          <line x1="7" y1="7" x2="7.01" y2="7"/>
        </svg>
        <span>Tags</span>
      </button>
      
      <button class="nav-item" data-tab="profile" aria-label="Profile">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span>Profile</span>
      </button>
    `;
  }

  /**
   * Attach event listeners to nav items
   */
  attachEventListeners() {
    const buttons = this.container.querySelectorAll('.nav-item');
    
    buttons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = button.dataset.tab;
        this.setActive(tab);
        this.onNavigate(tab);
      });
    });
  }

  /**
   * Set active tab
   */
  setActive(tab) {
    this.currentTab = tab;
    
    const buttons = this.container.querySelectorAll('.nav-item');
    buttons.forEach(button => {
      if (button.dataset.tab === tab) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }

  /**
   * Get current active tab
   */
  getActive() {
    return this.currentTab;
  }
}
```

- [ ] **Step 2: Verify syntax**

Run: `node -c public/mobile/components/bottom-nav.js`
Expected: No output (syntax is valid)

- [ ] **Step 3: Commit**

```bash
git add public/mobile/components/bottom-nav.js
git commit -m "feat: add bottom navigation component

- 5-tab navigation (Feed, Search, Add, Tags, Profile)
- Active state management
- SVG icons
- Event handling

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9: Create Feed View

**Files:**
- Create: `public/mobile/components/feed-view.js`

- [ ] **Step 1: Create feed-view.js**

```javascript
import { BaseView } from './base-view.js';
import { escapeHtml, timeAgo, fetchWithError } from './utils.js';

/**
 * Feed View
 * Displays bookmark feed with pagination
 */
export class FeedView extends BaseView {
  constructor() {
    super('feed-view');
    this.page = 1;
    this.limit = 20;
    this.hasMore = true;
    this.bookmarks = [];
    this.loading = false;
  }

  /**
   * Load bookmarks from API
   */
  async load() {
    this.showLoading();
    
    try {
      const data = await fetchWithError(`/api/bookmarks?page=${this.page}&limit=${this.limit}`);
      
      if (data) {
        this.bookmarks = data.bookmarks || [];
        this.hasMore = data.hasMore || false;
        this.render();
      }
    } catch (err) {
      console.error('Failed to load feed:', err);
      this.showError('Failed to load bookmarks');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Render bookmark feed
   */
  render() {
    this.clear();
    
    // Empty state
    if (this.bookmarks.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state">
          <h2>No bookmarks yet</h2>
          <p>Tap the + button to save your first bookmark</p>
        </div>
      `;
      return;
    }
    
    // Create grid
    const grid = document.createElement('div');
    grid.className = 'bookmark-grid';
    
    this.bookmarks.forEach(bookmark => {
      const card = this.createBookmarkCard(bookmark);
      grid.appendChild(card);
    });
    
    this.container.appendChild(grid);
    
    // Add load more button if there are more bookmarks
    if (this.hasMore) {
      this.addLoadMoreButton();
    }
  }

  /**
   * Create bookmark card element
   */
  createBookmarkCard(bookmark) {
    const card = document.createElement('div');
    card.className = 'bookmark-card';
    card.dataset.id = bookmark.id;
    
    // Render tags (max 3)
    const tagsHtml = this.renderTags(bookmark.tags);
    
    card.innerHTML = `
      <div class="card-thumbnail">
        <img src="${bookmark.og_image || '/placeholder.png'}" 
             alt="${escapeHtml(bookmark.title)}"
             onerror="this.src='/placeholder.png'"
             loading="lazy">
      </div>
      <div class="card-content">
        <h3 class="card-title">${escapeHtml(bookmark.title)}</h3>
        ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}
        <div class="card-meta">
          <span class="username">@${escapeHtml(bookmark.username)}</span>
          <span class="date">${timeAgo(bookmark.created_at)}</span>
        </div>
      </div>
    `;
    
    // Click to open bookmark
    card.addEventListener('click', () => {
      window.open(bookmark.url, '_blank');
    });
    
    return card;
  }

  /**
   * Render tags HTML (max 3 visible)
   */
  renderTags(tagsString) {
    if (!tagsString) return '';
    
    const tags = tagsString.split(',').map(t => t.trim()).filter(t => t);
    const visibleTags = tags.slice(0, 3);
    const remainingCount = tags.length - 3;
    
    let html = visibleTags
      .map(tag => `<span class="tag">${escapeHtml(tag)}</span>`)
      .join('');
    
    if (remainingCount > 0) {
      html += `<span class="tag tag-more">+${remainingCount}</span>`;
    }
    
    return html;
  }

  /**
   * Add "Load More" button
   */
  addLoadMoreButton() {
    if (this.loading) return;
    
    const btn = document.createElement('button');
    btn.className = 'btn btn-secondary load-more';
    btn.textContent = 'Load More';
    
    btn.addEventListener('click', async () => {
      if (this.loading) return;
      
      this.loading = true;
      btn.textContent = 'Loading...';
      btn.disabled = true;
      
      this.page++;
      
      try {
        const data = await fetchWithError(`/api/bookmarks?page=${this.page}&limit=${this.limit}`);
        
        if (data && data.bookmarks) {
          this.bookmarks.push(...data.bookmarks);
          this.hasMore = data.hasMore || false;
          this.render();
        }
      } catch (err) {
        console.error('Failed to load more:', err);
        this.page--;
      } finally {
        this.loading = false;
      }
    });
    
    this.container.appendChild(btn);
  }

  /**
   * Refresh feed (reset to page 1)
   */
  async refresh() {
    this.page = 1;
    this.bookmarks = [];
    this.hasMore = true;
    await this.load();
  }
}
```

- [ ] **Step 2: Verify syntax**

Run: `node -c public/mobile/components/feed-view.js`
Expected: No output (syntax is valid)

- [ ] **Step 3: Commit**

```bash
git add public/mobile/components/feed-view.js
git commit -m "feat: add feed view component

- Bookmark grid with cards
- Pagination with load more
- Empty state handling
- Tags display (max 3 visible)
- Click to open bookmark

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 10: Create Search View

**Files:**
- Create: `public/mobile/components/search-view.js`

- [ ] **Step 1: Create search-view.js**

```javascript
import { BaseView } from './base-view.js';
import { escapeHtml, timeAgo, debounce, fetchWithError } from './utils.js';

/**
 * Search View
 * Search bookmarks with debouncing
 */
export class SearchView extends BaseView {
  constructor() {
    super('search-view');
    this.query = '';
    this.results = [];
    this.debouncedSearch = debounce(this.performSearch.bind(this), 300);
  }

  /**
   * Load search view (render search input)
   */
  async load() {
    this.render();
  }

  /**
   * Render search interface
   */
  render() {
    this.clear();
    
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    
    searchContainer.innerHTML = `
      <div class="search-input-wrapper">
        <input 
          type="search" 
          id="search-input" 
          class="search-input" 
          placeholder="Search bookmarks..."
          autocomplete="off">
        <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
      </div>
      <div id="search-results" class="search-results"></div>
    `;
    
    this.container.appendChild(searchContainer);
    
    // Attach event listener
    const input = document.getElementById('search-input');
    input.addEventListener('input', (e) => {
      this.query = e.target.value.trim();
      if (this.query.length > 0) {
        this.debouncedSearch();
      } else {
        this.clearResults();
      }
    });
    
    // Auto-focus on show
    setTimeout(() => input.focus(), 100);
  }

  /**
   * Perform search API call
   */
  async performSearch() {
    if (!this.query) {
      this.clearResults();
      return;
    }
    
    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) return;
    
    // Show loading
    resultsContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    
    try {
      const data = await fetchWithError(`/api/bookmarks?q=${encodeURIComponent(this.query)}`);
      
      if (data && data.bookmarks) {
        this.results = data.bookmarks;
        this.renderResults();
      }
    } catch (err) {
      console.error('Search failed:', err);
      resultsContainer.innerHTML = '<div class="error-message">Search failed</div>';
    }
  }

  /**
   * Render search results
   */
  renderResults() {
    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) return;
    
    resultsContainer.innerHTML = '';
    
    // No results
    if (this.results.length === 0) {
      resultsContainer.innerHTML = `
        <div class="empty-state">
          <p>No bookmarks found for "${escapeHtml(this.query)}"</p>
          <p class="subtitle">Try different keywords</p>
        </div>
      `;
      return;
    }
    
    // Render results grid
    const grid = document.createElement('div');
    grid.className = 'bookmark-grid';
    
    this.results.forEach(bookmark => {
      const card = this.createBookmarkCard(bookmark);
      grid.appendChild(card);
    });
    
    resultsContainer.appendChild(grid);
  }

  /**
   * Create bookmark card (same as feed view)
   */
  createBookmarkCard(bookmark) {
    const card = document.createElement('div');
    card.className = 'bookmark-card';
    card.dataset.id = bookmark.id;
    
    const tagsHtml = this.renderTags(bookmark.tags);
    
    card.innerHTML = `
      <div class="card-thumbnail">
        <img src="${bookmark.og_image || '/placeholder.png'}" 
             alt="${escapeHtml(bookmark.title)}"
             onerror="this.src='/placeholder.png'"
             loading="lazy">
      </div>
      <div class="card-content">
        <h3 class="card-title">${escapeHtml(bookmark.title)}</h3>
        ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}
        <div class="card-meta">
          <span class="username">@${escapeHtml(bookmark.username)}</span>
          <span class="date">${timeAgo(bookmark.created_at)}</span>
        </div>
      </div>
    `;
    
    card.addEventListener('click', () => {
      window.open(bookmark.url, '_blank');
    });
    
    return card;
  }

  /**
   * Render tags HTML
   */
  renderTags(tagsString) {
    if (!tagsString) return '';
    
    const tags = tagsString.split(',').map(t => t.trim()).filter(t => t);
    const visibleTags = tags.slice(0, 3);
    const remainingCount = tags.length - 3;
    
    let html = visibleTags
      .map(tag => `<span class="tag">${escapeHtml(tag)}</span>`)
      .join('');
    
    if (remainingCount > 0) {
      html += `<span class="tag tag-more">+${remainingCount}</span>`;
    }
    
    return html;
  }

  /**
   * Clear search results
   */
  clearResults() {
    const resultsContainer = document.getElementById('search-results');
    if (resultsContainer) {
      resultsContainer.innerHTML = '';
    }
    this.results = [];
  }
}
```

- [ ] **Step 2: Verify syntax**

Run: `node -c public/mobile/components/search-view.js`
Expected: No output (syntax is valid)

- [ ] **Step 3: Commit**

```bash
git add public/mobile/components/search-view.js
git commit -m "feat: add search view component

- Search input with auto-focus
- Debounced search (300ms)
- Results in card format
- Empty state handling
- Reuses bookmark card pattern

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 11: Create Add Bookmark View (Bottom Sheet)

**Files:**
- Create: `public/mobile/components/add-bookmark-view.js`

- [ ] **Step 1: Create add-bookmark-view.js**

```javascript
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
```

- [ ] **Step 2: Verify syntax**

Run: `node -c public/mobile/components/add-bookmark-view.js`
Expected: No output (syntax is valid)

- [ ] **Step 3: Commit**

```bash
git add public/mobile/components/add-bookmark-view.js
git commit -m "feat: add bookmark bottom sheet component

- Bottom sheet modal with backdrop
- Form validation (URL, title, tags)
- Support for Share Target pre-fill
- Keyboard-aware positioning
- Success feedback and navigation

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 12: Create Tags View

**Files:**
- Create: `public/mobile/components/tags-view.js`

- [ ] **Step 1: Create tags-view.js**

```javascript
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
```

- [ ] **Step 2: Verify syntax**

Run: `node -c public/mobile/components/tags-view.js`
Expected: No output (syntax is valid)

- [ ] **Step 3: Commit**

```bash
git add public/mobile/components/tags-view.js
git commit -m "feat: add tags view component

- Tags cloud with size based on frequency
- Click to search by tag
- Empty state handling
- Integration with search view

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 13: Create Profile View

**Files:**
- Create: `public/mobile/components/profile-view.js`

- [ ] **Step 1: Create profile-view.js**

```javascript
import { BaseView } from './base-view.js';
import { escapeHtml, timeAgo, fetchWithError } from './utils.js';

/**
 * Profile View
 * Display current user's profile and bookmarks
 */
export class ProfileView extends BaseView {
  constructor() {
    super('profile-view');
    this.user = null;
    this.bookmarks = [];
  }

  /**
   * Load profile data
   */
  async load() {
    this.showLoading();
    
    try {
      // Get current user
      const userData = await fetchWithError('/api/auth/me');
      if (!userData || !userData.user) {
        window.location.href = '/';
        return;
      }
      
      this.user = userData.user;
      
      // Get user's bookmarks
      const bookmarksData = await fetchWithError(`/api/bookmarks?user=${this.user.username}`);
      if (bookmarksData) {
        this.bookmarks = bookmarksData.bookmarks || [];
      }
      
      this.render();
    } catch (err) {
      console.error('Failed to load profile:', err);
      this.showError('Failed to load profile');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Render profile view
   */
  render() {
    this.clear();
    
    if (!this.user) return;
    
    // Profile header
    const header = document.createElement('div');
    header.className = 'profile-header';
    header.innerHTML = `
      <div class="profile-avatar">
        ${this.user.avatar_url 
          ? `<img src="${escapeHtml(this.user.avatar_url)}" alt="${escapeHtml(this.user.username)}">` 
          : `<div class="avatar-placeholder">${escapeHtml(this.user.username[0].toUpperCase())}</div>`
        }
      </div>
      <h2 class="profile-username">@${escapeHtml(this.user.username)}</h2>
      <div class="profile-stats">
        <div class="stat">
          <span class="stat-value">${this.bookmarks.length}</span>
          <span class="stat-label">Bookmarks</span>
        </div>
      </div>
      <div class="profile-actions">
        <a href="/settings" class="btn btn-secondary">Settings</a>
        <button class="btn btn-secondary" id="logout-btn">Logout</button>
      </div>
    `;
    
    this.container.appendChild(header);
    
    // Bookmarks section
    if (this.bookmarks.length > 0) {
      const bookmarksSection = document.createElement('div');
      bookmarksSection.className = 'profile-bookmarks';
      
      const title = document.createElement('h3');
      title.textContent = 'Your Bookmarks';
      bookmarksSection.appendChild(title);
      
      const grid = document.createElement('div');
      grid.className = 'bookmark-grid';
      
      this.bookmarks.forEach(bookmark => {
        const card = this.createBookmarkCard(bookmark);
        grid.appendChild(card);
      });
      
      bookmarksSection.appendChild(grid);
      this.container.appendChild(bookmarksSection);
    }
    
    // Attach logout handler
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }
  }

  /**
   * Create bookmark card
   */
  createBookmarkCard(bookmark) {
    const card = document.createElement('div');
    card.className = 'bookmark-card';
    card.dataset.id = bookmark.id;
    
    const tagsHtml = this.renderTags(bookmark.tags);
    
    card.innerHTML = `
      <div class="card-thumbnail">
        <img src="${bookmark.og_image || '/placeholder.png'}" 
             alt="${escapeHtml(bookmark.title)}"
             onerror="this.src='/placeholder.png'"
             loading="lazy">
      </div>
      <div class="card-content">
        <h3 class="card-title">${escapeHtml(bookmark.title)}</h3>
        ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}
        <div class="card-meta">
          <span class="date">${timeAgo(bookmark.created_at)}</span>
        </div>
      </div>
    `;
    
    card.addEventListener('click', () => {
      window.open(bookmark.url, '_blank');
    });
    
    return card;
  }

  /**
   * Render tags HTML
   */
  renderTags(tagsString) {
    if (!tagsString) return '';
    
    const tags = tagsString.split(',').map(t => t.trim()).filter(t => t);
    const visibleTags = tags.slice(0, 3);
    const remainingCount = tags.length - 3;
    
    let html = visibleTags
      .map(tag => `<span class="tag">${escapeHtml(tag)}</span>`)
      .join('');
    
    if (remainingCount > 0) {
      html += `<span class="tag tag-more">+${remainingCount}</span>`;
    }
    
    return html;
  }

  /**
   * Handle logout
   */
  async handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }
}
```

- [ ] **Step 2: Verify syntax**

Run: `node -c public/mobile/components/profile-view.js`
Expected: No output (syntax is valid)

- [ ] **Step 3: Commit**

```bash
git add public/mobile/components/profile-view.js
git commit -m "feat: add profile view component

- User profile header with avatar
- Bookmarks count stat
- User's bookmarks grid
- Settings and logout actions
- Avatar placeholder for users without avatar

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 14: Create Install Prompt Component

**Files:**
- Create: `public/mobile/components/install-prompt.js`

- [ ] **Step 1: Create install-prompt.js**

```javascript
/**
 * Install Prompt Component
 * Manages PWA installation prompt
 */
export class InstallPrompt {
  constructor() {
    this.deferredPrompt = null;
    this.banner = null;
    this.dismissCount = 0;
  }

  /**
   * Initialize install prompt
   */
  init() {
    // Load dismiss count from localStorage
    const stored = localStorage.getItem('pwa_install_dismissed');
    this.dismissCount = stored ? parseInt(stored, 10) : 0;
    
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      
      // Check if should show prompt
      if (this.shouldShowPrompt()) {
        this.show();
      }
    });
    
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('[Install] App already installed');
    }
  }

  /**
   * Should show install prompt?
   */
  shouldShowPrompt() {
    // Don't show if dismissed 3+ times
    if (this.dismissCount >= 3) {
      return false;
    }
    
    // Don't show if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return false;
    }
    
    return true;
  }

  /**
   * Show install banner
   */
  show() {
    if (this.banner) return;
    
    this.banner = document.createElement('div');
    this.banner.className = 'install-banner';
    this.banner.innerHTML = `
      <div class="install-content">
        <p>Install only.link for faster access</p>
        <div class="install-actions">
          <button class="btn btn-primary btn-sm" id="install-btn">Install</button>
          <button class="btn-icon" id="dismiss-btn" aria-label="Dismiss">×</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.banner);
    
    // Attach event listeners
    document.getElementById('install-btn').addEventListener('click', () => {
      this.handleInstall();
    });
    
    document.getElementById('dismiss-btn').addEventListener('click', () => {
      this.dismiss();
    });
    
    // Track analytics
    if (window.gtag) {
      gtag('event', 'pwa_install_prompt_shown');
    }
  }

  /**
   * Handle install button click
   */
  async handleInstall() {
    if (!this.deferredPrompt) return;
    
    // Show native install prompt
    this.deferredPrompt.prompt();
    
    // Wait for user choice
    const { outcome } = await this.deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('[Install] User accepted');
      
      // Track analytics
      if (window.gtag) {
        gtag('event', 'pwa_install_accepted');
      }
    } else {
      console.log('[Install] User dismissed');
      
      // Track analytics
      if (window.gtag) {
        gtag('event', 'pwa_install_dismissed');
      }
    }
    
    // Clear prompt
    this.deferredPrompt = null;
    this.hide();
  }

  /**
   * Dismiss banner
   */
  dismiss() {
    this.dismissCount++;
    localStorage.setItem('pwa_install_dismissed', this.dismissCount.toString());
    this.hide();
    
    // Track analytics
    if (window.gtag) {
      gtag('event', 'pwa_install_banner_dismissed', {
        dismiss_count: this.dismissCount
      });
    }
  }

  /**
   * Hide banner
   */
  hide() {
    if (this.banner) {
      this.banner.remove();
      this.banner = null;
    }
  }
}
```

- [ ] **Step 2: Verify syntax**

Run: `node -c public/mobile/components/install-prompt.js`
Expected: No output (syntax is valid)

- [ ] **Step 3: Commit**

```bash
git add public/mobile/components/install-prompt.js
git commit -m "feat: add install prompt component

- beforeinstallprompt event handling
- Dismiss tracking (max 3 times)
- Analytics tracking for install funnel
- Native install prompt trigger

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Continuation

**This plan continues in Part 2:** `docs/superpowers/plans/2026-05-29-mobile-pwa-phase1-part2.md`

Part 2 includes:
- Task 15: Create Mobile App Styles (CSS)
- Task 16: Create Mobile App HTML Shell
- Task 17: Create Mobile App Controller (JS)
- Task 18: Add Mobile Routes to Server
- Task 19: Add Device Detection Redirect (Optional)
- Task 20: End-to-End Manual Testing
- Phase 1 Acceptance Criteria Checklist

**Complete Part 1 (Tasks 1-14) first, then proceed to Part 2.**
