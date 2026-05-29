# Mobile PWA Phase 1 - Part 2 (Styles, App Shell, Integration)

> **This is Part 2 of the Mobile PWA Phase 1 plan. Complete Part 1 first.**

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

---

## Task 15: Create Mobile App Styles

**Files:**
- Create: `public/mobile/mobile-styles.css`

- [ ] **Step 1: Create mobile-styles.css with CSS variables and base styles**

```css
/**
 * Mobile PWA Styles
 * Mobile-first responsive design
 */

:root {
  /* Colors (from existing styles.css) */
  --primary: #4F6FE8;
  --primary-hover: #3D5AD6;
  --surface: #FAF9F7;
  --surface-secondary: #F5F4F2;
  --text: #1A1A1A;
  --text-secondary: #666666;
  --border: #E5E5E5;
  --error: #DC2626;
  --success: #16A34A;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  /* Typography */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-size-sm: 14px;
  --font-size-base: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 24px;
  
  /* Z-index layers */
  --z-bottom-nav: 100;
  --z-bottom-sheet: 1000;
  --z-backdrop: 999;
  --z-toast: 2000;
  
  /* Dimensions */
  --bottom-nav-height: 64px;
  --top-bar-height: 56px;
}

/* Reset */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  color: var(--text);
  background: var(--surface);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow-x: hidden;
}

/* Mobile App Container */
.mobile-app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Top Bar */
.top-bar {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  height: var(--top-bar-height);
  background: rgba(250, 249, 247, 0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-md);
  z-index: 50;
}

.top-bar-logo {
  height: 32px;
  cursor: pointer;
}

.top-bar-search-btn {
  background: none;
  border: none;
  padding: var(--spacing-sm);
  cursor: pointer;
  color: var(--text);
}

/* Content Area */
.content-area {
  flex: 1;
  overflow-y: auto;
  padding-bottom: calc(var(--bottom-nav-height) + var(--spacing-md));
}

/* View Containers */
.view {
  display: none;
  padding: var(--spacing-md);
  min-height: calc(100vh - var(--top-bar-height) - var(--bottom-nav-height));
}

.view.active {
  display: block;
}

/* Bottom Navigation */
#bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--bottom-nav-height);
  background: var(--surface);
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: var(--z-bottom-nav);
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: none;
  border: none;
  padding: var(--spacing-sm);
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.2s;
  font-size: 12px;
}

.nav-item.active {
  color: var(--primary);
}

.nav-item svg {
  transition: transform 0.2s;
}

.nav-item:active svg {
  transform: scale(0.9);
}

.nav-item.nav-add {
  background: var(--primary);
  color: white;
  border-radius: 50%;
  width: 56px;
  height: 56px;
  margin-top: -20px;
  box-shadow: 0 4px 12px rgba(79, 111, 232, 0.3);
}

.nav-item.nav-add:active {
  transform: scale(0.95);
}

/* Bookmark Grid */
.bookmark-grid {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

/* Bookmark Card */
.bookmark-card {
  background: white;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: var(--spacing-md);
  display: flex;
  gap: var(--spacing-md);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.bookmark-card:active {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-thumbnail {
  flex-shrink: 0;
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface-secondary);
}

.card-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  min-width: 0;
}

.card-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  line-height: 1.4;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  background: var(--surface-secondary);
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.tag-more {
  background: var(--primary);
  color: white;
}

.card-meta {
  display: flex;
  gap: var(--spacing-sm);
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: auto;
}

/* Loading Spinner */
.loading-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--spacing-xl);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: var(--spacing-xl);
}

.empty-state h2 {
  font-size: var(--font-size-xl);
  margin-bottom: var(--spacing-sm);
}

.empty-state p {
  color: var(--text-secondary);
}

.empty-state .subtitle {
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-xs);
}

/* Error Message */
.error-message {
  background: #FEE2E2;
  color: var(--error);
  padding: var(--spacing-md);
  border-radius: 8px;
  margin: var(--spacing-md);
}

/* Bottom Sheet */
.bottom-sheet-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s, visibility 0.3s;
  z-index: var(--z-backdrop);
}

.bottom-sheet-backdrop.active {
  opacity: 1;
  visibility: visible;
}

.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-radius: 16px 16px 0 0;
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: var(--z-bottom-sheet);
  max-height: 90vh;
  overflow-y: auto;
}

.bottom-sheet.active {
  transform: translateY(0);
}

.bottom-sheet-handle {
  width: 40px;
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  margin: 12px auto;
}

.bottom-sheet-content {
  padding: 0 var(--spacing-lg) var(--spacing-lg);
}

.bottom-sheet-content h2 {
  margin-bottom: var(--spacing-lg);
}

/* Form Styles */
.form-group {
  margin-bottom: var(--spacing-md);
}

.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-sm);
}

.form-group input[type="url"],
.form-group input[type="text"],
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-family: inherit;
  font-size: var(--font-size-base);
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary);
}

.form-group input.error,
.form-group textarea.error {
  border-color: var(--error);
}

.form-error {
  display: none;
  color: var(--error);
  font-size: 12px;
  margin-top: 4px;
}

.form-group small {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.form-checkbox {
  display: flex;
  align-items: center;
}

.form-checkbox label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  margin: 0;
}

.form-checkbox input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.form-actions {
  display: flex;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
}

/* Buttons */
.btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: var(--font-size-base);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-family: inherit;
}

.btn-primary {
  background: var(--primary);
  color: white;
  flex: 1;
}

.btn-primary:hover {
  background: var(--primary-hover);
}

.btn-primary:active {
  transform: scale(0.98);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--surface-secondary);
  color: var(--text);
  flex: 1;
}

.btn-secondary:active {
  transform: scale(0.98);
}

.btn-sm {
  padding: 8px 16px;
  font-size: var(--font-size-sm);
}

.btn-icon {
  background: none;
  border: none;
  padding: var(--spacing-xs);
  font-size: 24px;
  cursor: pointer;
  color: var(--text-secondary);
}

.load-more {
  width: 100%;
  margin-top: var(--spacing-md);
}

/* Search View */
.search-container {
  padding: var(--spacing-md);
}

.search-input-wrapper {
  position: relative;
  margin-bottom: var(--spacing-lg);
}

.search-input {
  width: 100%;
  padding: 12px 12px 12px 44px;
  border: 1px solid var(--border);
  border-radius: 12px;
  font-size: var(--font-size-base);
  font-family: inherit;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  pointer-events: none;
}

.search-results {
  min-height: 200px;
}

/* Tags View */
.tags-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  justify-content: center;
}

.tag-item {
  background: white;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.tag-item:active {
  transform: scale(0.95);
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.tag-name {
  font-weight: 500;
}

.tag-count {
  font-size: 12px;
  opacity: 0.7;
}

/* Profile View */
.profile-header {
  text-align: center;
  padding: var(--spacing-xl) var(--spacing-md);
  border-bottom: 1px solid var(--border);
}

.profile-avatar {
  width: 80px;
  height: 80px;
  margin: 0 auto var(--spacing-md);
  border-radius: 50%;
  overflow: hidden;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary);
  color: white;
  font-size: 32px;
  font-weight: 600;
}

.profile-username {
  font-size: var(--font-size-xl);
  margin-bottom: var(--spacing-md);
}

.profile-stats {
  display: flex;
  justify-content: center;
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-lg);
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--primary);
}

.stat-label {
  display: block;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.profile-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: center;
}

.profile-actions .btn {
  flex: 0 1 auto;
  min-width: 120px;
}

.profile-bookmarks {
  padding: var(--spacing-lg) var(--spacing-md);
}

.profile-bookmarks h3 {
  margin-bottom: var(--spacing-md);
}

/* Install Banner */
.install-banner {
  position: fixed;
  bottom: calc(var(--bottom-nav-height) + var(--spacing-sm));
  left: var(--spacing-md);
  right: var(--spacing-md);
  background: white;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: var(--spacing-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 200;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.install-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
}

.install-content p {
  flex: 1;
  margin: 0;
  font-size: var(--font-size-sm);
}

.install-actions {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

/* Toast Notification */
.toast {
  position: fixed;
  top: calc(var(--top-bar-height) + var(--spacing-md));
  left: 50%;
  transform: translateX(-50%) translateY(-100px);
  background: rgba(26, 26, 26, 0.9);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: var(--font-size-sm);
  z-index: var(--z-toast);
  opacity: 0;
  transition: opacity 0.3s, transform 0.3s;
  max-width: calc(100% - var(--spacing-xl));
}

.toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* Responsive */
@media (min-width: 768px) {
  .mobile-app {
    max-width: 480px;
    margin: 0 auto;
    box-shadow: 0 0 0 1px var(--border);
  }
}
```

- [ ] **Step 2: Verify CSS has no syntax errors**

Open the file and visually inspect for any obvious errors.

- [ ] **Step 3: Commit**

```bash
git add public/mobile/mobile-styles.css
git commit -m "feat: add mobile PWA styles

- Mobile-first responsive design
- Bottom navigation styling
- Bottom sheet modal animations
- Bookmark card layouts
- Form styles
- Loading and empty states
- Toast notifications
- Install banner

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 16: Create Mobile App HTML Shell

**Files:**
- Create: `public/mobile/mobile-app.html`

- [ ] **Step 1: Create mobile-app.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="theme-color" content="#4F6FE8">
  <meta name="description" content="Social bookmarking, reimagined">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="only.link">
  
  <title>only.link - Mobile</title>
  
  <!-- PWA Manifest -->
  <link rel="manifest" href="/manifest.json">
  
  <!-- Icons -->
  <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png">
  <link rel="apple-touch-icon" href="/favicon-192.png">
  
  <!-- Styles -->
  <link rel="stylesheet" href="/mobile/mobile-styles.css">
</head>
<body>
  <div class="mobile-app">
    <!-- Top Bar -->
    <div class="top-bar">
      <img src="/logo.png" alt="only.link" class="top-bar-logo" id="logo-btn">
      <button class="top-bar-search-btn" id="search-btn" aria-label="Search">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
      </button>
    </div>
    
    <!-- Content Area -->
    <div class="content-area">
      <!-- Feed View -->
      <div id="feed-view" class="view"></div>
      
      <!-- Search View -->
      <div id="search-view" class="view"></div>
      
      <!-- Tags View -->
      <div id="tags-view" class="view"></div>
      
      <!-- Profile View -->
      <div id="profile-view" class="view"></div>
    </div>
    
    <!-- Bottom Navigation -->
    <nav id="bottom-nav"></nav>
  </div>
  
  <!-- Scripts (as ES modules) -->
  <script type="module" src="/mobile/mobile-app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify HTML is valid**

Open the file and check for any obvious errors.

- [ ] **Step 3: Commit**

```bash
git add public/mobile/mobile-app.html
git commit -m "feat: add mobile app HTML shell

- PWA meta tags
- Viewport configuration
- Top bar and content area structure
- View containers for 5 sections
- Bottom navigation placeholder
- ES module script loading

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 17: Create Mobile App Controller

**Files:**
- Create: `public/mobile/mobile-app.js`

- [ ] **Step 1: Create mobile-app.js**

```javascript
import { BottomNav } from './components/bottom-nav.js';
import { FeedView } from './components/feed-view.js';
import { SearchView } from './components/search-view.js';
import { AddBookmarkView } from './components/add-bookmark-view.js';
import { TagsView } from './components/tags-view.js';
import { ProfileView } from './components/profile-view.js';
import { InstallPrompt } from './components/install-prompt.js';
import { fetchWithError, showToast } from './components/utils.js';

/**
 * Main Mobile App Controller
 * Handles initialization, auth, routing, and view management
 */
class MobileApp {
  constructor() {
    this.currentView = null;
    this.user = null;
    this.bottomNav = null;
    this.views = {};
    this.installPrompt = null;
  }

  /**
   * Initialize mobile app
   */
  async init() {
    console.log('[MobileApp] Initializing...');
    
    // 1. Check authentication
    const authenticated = await this.checkAuth();
    if (!authenticated) {
      return;
    }
    
    // 2. Setup PWA features
    this.setupServiceWorker();
    this.setupShareTarget();
    this.setupInstallPrompt();
    
    // 3. Initialize views
    this.initializeViews();
    
    // 4. Setup top bar
    this.setupTopBar();
    
    // 5. Show default view
    this.showView('feed');
    
    console.log('[MobileApp] Initialized successfully');
  }

  /**
   * Check authentication
   */
  async checkAuth() {
    try {
      const data = await fetchWithError('/api/auth/me');
      
      if (!data || !data.user) {
        console.log('[MobileApp] Not authenticated, redirecting to login');
        window.location.href = '/';
        return false;
      }
      
      this.user = data.user;
      console.log('[MobileApp] Authenticated as', this.user.username);
      return true;
    } catch (err) {
      console.error('[MobileApp] Auth check failed:', err);
      window.location.href = '/';
      return false;
    }
  }

  /**
   * Setup service worker
   */
  setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          console.log('[SW] Registered:', reg.scope);
          
          // Check for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                showToast('New version available! Refresh to update.');
              }
            });
          });
        })
        .catch(err => console.error('[SW] Registration failed:', err));
    }
  }

  /**
   * Setup share target (handle shared URLs)
   */
  setupShareTarget() {
    const params = new URLSearchParams(window.location.search);
    
    if (params.has('url')) {
      const sharedData = {
        url: params.get('url'),
        title: params.get('title') || '',
        text: params.get('text') || ''
      };
      
      console.log('[ShareTarget] Received:', sharedData);
      
      // Track analytics
      if (window.gtag) {
        gtag('event', 'share_target_opened', {
          shared_url: sharedData.url
        });
      }
      
      // Wait for views to load, then open modal
      setTimeout(() => {
        if (this.views.add) {
          this.views.add.openWithData(sharedData);
        }
      }, 500);
    }
  }

  /**
   * Setup install prompt
   */
  setupInstallPrompt() {
    this.installPrompt = new InstallPrompt();
    this.installPrompt.init();
  }

  /**
   * Initialize all views
   */
  initializeViews() {
    // Create view instances
    this.views = {
      feed: new FeedView(),
      search: new SearchView(),
      add: new AddBookmarkView(),
      tags: new TagsView(),
      profile: new ProfileView()
    };
    
    // Initialize each view
    Object.values(this.views).forEach(view => {
      if (view.init) view.init();
    });
    
    // Create bottom navigation
    this.bottomNav = new BottomNav((tab) => {
      if (tab === 'add') {
        // Add button opens modal, doesn't change view
        this.views.add.open();
      } else {
        // Navigate to view
        this.showView(tab);
      }
    });
    
    this.bottomNav.init();
  }

  /**
   * Setup top bar interactions
   */
  setupTopBar() {
    // Logo button - go to feed
    const logoBtn = document.getElementById('logo-btn');
    if (logoBtn) {
      logoBtn.addEventListener('click', () => {
        this.showView('feed');
      });
    }
    
    // Search button - go to search
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        this.showView('search');
      });
    }
  }

  /**
   * Show a view
   */
  async showView(viewName) {
    // Hide current view
    if (this.currentView && this.views[this.currentView]) {
      this.views[this.currentView].hide();
    }
    
    // Show new view
    this.currentView = viewName;
    const view = this.views[viewName];
    
    if (view) {
      await view.show();
      
      // Update bottom nav
      if (this.bottomNav) {
        this.bottomNav.setActive(viewName);
      }
      
      // Track analytics
      if (window.gtag) {
        gtag('event', 'screen_view', {
          screen_name: viewName
        });
      }
    }
  }
}

// Initialize app on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.app = new MobileApp();
    window.app.init();
  });
} else {
  window.app = new MobileApp();
  window.app.init();
}
```

- [ ] **Step 2: Verify syntax**

Run: `node -c public/mobile/mobile-app.js`
Expected: No output (syntax is valid)

- [ ] **Step 3: Commit**

```bash
git add public/mobile/mobile-app.js
git commit -m "feat: add mobile app controller

- App initialization and lifecycle
- Authentication check
- Service worker registration
- Share target handling
- View management and routing
- Install prompt integration
- Top bar interaction handling

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 18: Add Mobile Routes to Server

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Add mobile app routes in PWA ROUTES section**

Add this code after the Service Worker route in server.js:

```javascript
// Serve mobile app
app.get('/mobile/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/mobile/mobile-app.html'));
});

// Share target handler
app.get('/share-target', (req, res) => {
  // Just serve the app, JavaScript will handle params
  res.sendFile(path.join(__dirname, 'public/mobile/mobile-app.html'));
});
```

- [ ] **Step 2: Test mobile app route**

Start server: `npm start`
In another terminal: `curl -I http://localhost:3000/mobile/app`

Expected: 
```
HTTP/1.1 200 OK
Content-Type: text/html
```

- [ ] **Step 3: Test share target route**

Run: `curl -I "http://localhost:3000/share-target?url=https://example.com"`

Expected: Same 200 OK response

- [ ] **Step 4: Stop server**

Press Ctrl+C

- [ ] **Step 5: Commit**

```bash
git add server.js
git commit -m "feat: add mobile app and share target routes

- /mobile/app serves mobile app HTML
- /share-target handles shared URLs
- Both routes serve same HTML (JS handles params)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 19: Add Device Detection Redirect (Optional for MVP)

**Files:**
- Modify: `public/app.html` (or create redirect logic in server.js)

**Note:** For MVP, we can skip automatic redirect and let users manually navigate to `/mobile/app`. This avoids accidentally redirecting desktop users and allows easier testing.

- [ ] **Step 1: Document manual access**

Create a note that mobile users should visit:
- https://onlylinks.id/mobile/app

For Phase 2, implement automatic device detection.

- [ ] **Step 2: Skip for now**

No code changes needed for MVP.

---

## Task 20: End-to-End Manual Testing

**Files:**
- None (testing only)

- [ ] **Step 1: Start local server**

Run: `npm start`

- [ ] **Step 2: Test on desktop browser first**

Open: `http://localhost:3000/mobile/app`

Check:
- Page loads without errors
- Bottom navigation appears
- Service worker registers (check DevTools → Application → Service Workers)
- Can navigate between tabs

- [ ] **Step 3: Test on mobile device (same network)**

Find your local IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`

On mobile browser, visit: `http://YOUR_IP:3000/mobile/app`

Check:
- Layout looks correct
- Bottom nav is touch-friendly
- Can view bookmarks
- Can search
- Can add bookmark
- Can view tags
- Can view profile

- [ ] **Step 4: Test PWA installation (mobile only)**

On mobile browser:
1. Open browser menu
2. Look for "Add to Home Screen" or "Install"
3. Install the app
4. Open from home screen
5. Check that it opens in standalone mode (no browser chrome)

- [ ] **Step 5: Test service worker caching**

1. Load app while online
2. Turn off WiFi/mobile data
3. Refresh app
4. Check that static assets load from cache
5. Check that API calls fail gracefully with toast messages

- [ ] **Step 6: Document any bugs**

Create a list of any issues found during testing.

- [ ] **Step 7: Create final commit**

```bash
git add -A
git commit -m "test: complete Phase 1 MVP manual testing

Tested on:
- Desktop browser (Chrome)
- Mobile browser (iOS Safari / Android Chrome)
- PWA installed mode
- Offline functionality

Phase 1 MVP acceptance criteria verified.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Phase 1 Acceptance Criteria Checklist

Verify all these before declaring Phase 1 complete:

- [ ] App installs on iOS 16+ and Android 12+
- [ ] All 5 bottom nav sections navigate correctly
- [ ] Can create, read, edit, delete bookmarks
- [ ] Login/logout works (reuses desktop auth)
- [ ] Search returns results
- [ ] Share Target receives URLs from external apps (test after deployment)
- [ ] Layout responsive (portrait mode, 320px-428px width)
- [ ] Works on Chrome, Safari, Firefox mobile
- [ ] Lighthouse PWA score: 100 (test after deployment)

---

## Next Steps After Phase 1

1. Deploy to production (VPS)
2. Test Share Target on deployed version
3. Run Lighthouse audit
4. Collect user feedback for 1 week
5. Begin Phase 2 planning based on real usage data

---

**End of Phase 1 Implementation Plan**
