import { BottomNav } from './components/bottom-nav.js';
import { FeedView } from './components/feed-view.js';
import { SearchView } from './components/search-view.js';
import { AddBookmarkView } from './components/add-bookmark-view.js';
import { TagsView } from './components/tags-view.js';
import { NotificationsView } from './components/notifications-view.js';
import { ProfileView } from './components/profile-view.js';
import { SettingsView } from './components/settings-view.js';
import { PublicProfileView } from './components/public-profile-view.js';
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

    // 2. Initialize views + bottom nav (needed even if not authenticated)
    this.initializeViews();

    // 3. Setup top bar
    this.setupTopBar();

    if (!authenticated) {
      // Check for OAuth errors
      const urlParams = new URLSearchParams(window.location.search);
      const authError = urlParams.get('auth_error');
      if (authError) {
        window.history.replaceState({}, '', window.location.pathname);
        const { showToast } = await import('./components/utils.js');
        showToast('Google sign-in failed. Please try again.', 'error');
      }

      // Dismiss splash screen even when not authenticated
      const splash = document.getElementById('app-splash');
      if (splash) {
        splash.style.opacity = '0';
        setTimeout(() => splash.remove(), 420);
      }
      return;
    }

    // 4. Setup PWA features
    // TEMP: Disable SW for debugging
    // this.setupServiceWorker();
    this.setupShareTarget();
    this.setupInstallPrompt();

    // 5. Show default view
    this.showView('feed');

    // 6. Dismiss splash screen
    const splash = document.getElementById('app-splash');
    if (splash) {
      splash.style.opacity = '0';
      setTimeout(() => splash.remove(), 420);
    }

    console.log('[MobileApp] Initialized successfully');

    // TEST: Log every click on the page
    document.addEventListener('click', (e) => {
      console.log('[DEBUG] Click detected on:', e.target, 'tagName:', e.target.tagName);
    }, true);

    // TEST: Check if bottom nav has pointer-events
    const nav = document.getElementById('bottom-nav');
    if (nav) {
      const computed = window.getComputedStyle(nav);
      console.log('[DEBUG] bottom-nav pointer-events:', computed.pointerEvents);
      console.log('[DEBUG] bottom-nav display:', computed.display);
      console.log('[DEBUG] bottom-nav z-index:', computed.zIndex);
    }
  }

  /**
   * Check authentication
   */
  async checkAuth() {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-cache'
      });

      if (!response.ok) {
        console.log('[MobileApp] Auth request failed:', response.status);
        return false;
      }

      const data = await response.json();

      if (!data || !data.user) {
        console.log('[MobileApp] Not authenticated - showing public feed');
        this.user = null;
        return true; // Continue with public feed
      }

      this.user = data.user;
      console.log('[MobileApp] Authenticated as', this.user.username);
      return true;
    } catch (err) {
      console.error('[MobileApp] Auth check failed:', err);
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
    console.log('[MobileApp] initializeViews() starting...');

    // Create view instances - pass user to views that need it
    this.views = {
      feed: new FeedView(this.user),
      search: new SearchView(),
      add: new AddBookmarkView(),
      tags: new TagsView(),
      notifications: new NotificationsView(),
      profile: new ProfileView(),
      settings: new SettingsView(),
      'public-profile': new PublicProfileView()
    };
    console.log('[MobileApp] Views created');

    // Initialize each view
    Object.values(this.views).forEach(view => {
      if (view.init) view.init();
    });
    console.log('[MobileApp] Views initialized');

    // Create bottom navigation
    console.log('[MobileApp] Creating BottomNav...');
    this.bottomNav = new BottomNav((tab) => {
      console.log('[MobileApp] onNavigate callback:', tab);
      if (tab === 'add') {
        // Add button opens modal, doesn't change view
        this.views.add.open();
      } else {
        // Navigate to view
        this.showView(tab);
      }
    });
    console.log('[MobileApp] BottomNav created, calling init()...');

    this.bottomNav.init();
    console.log('[MobileApp] BottomNav init() completed');

    // Load notification badge count on startup
    if (this.user) {
      fetch('/api/notifications', { credentials: 'include' })
        .then(r => r.json())
        .then(data => {
          if (data?.unreadCount > 0) {
            const view = this.views.notifications;
            if (view) view.updateBadge(data.unreadCount);
          }
        })
        .catch(() => {});
    }

    // Store app reference globally for views to use
    window.mobileApp = this;
  }

  /**
   * Setup top bar interactions
   */
  setupTopBar() {
    // Logo button - go to feed (only if authenticated)
    const logoBtn = document.getElementById('logo-btn');
    if (logoBtn && this.user) {
      logoBtn.addEventListener('click', () => {
        this.showView('feed');
      });
    }

    // Search button - go to search (only if authenticated)
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn && this.user) {
      searchBtn.addEventListener('click', () => {
        this.showView('search');
      });
    }

    // Login button - show if not authenticated
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      if (!this.user) {
        loginBtn.style.display = 'block';
        loginBtn.addEventListener('click', () => {
          const backdrop = document.getElementById('login-sheet-backdrop');
          if (backdrop) {
            requestAnimationFrame(() => backdrop.classList.add('open'));
            backdrop.addEventListener('click', (e) => {
              if (e.target === backdrop) {
                backdrop.classList.remove('open');
              }
            }, { once: true });
          }
        });
      }
    }
  }

  /**
   * Show a view
   */
  /**
   * Show a public user profile inside the PWA (no new tab)
   */
  async showPublicProfile(username) {
    this.previousView = this.currentView;
    const view = this.views['public-profile'];
    view.currentUser = this.user;

    if (this.currentView && this.views[this.currentView]) {
      this.views[this.currentView].hide();
    }
    this.currentView = 'public-profile';
    if (this.bottomNav) this.bottomNav.setActive(null);
    await view.loadForUser(username);
  }

  /**
   * Go back to previous view
   */
  goBack() {
    const prev = this.previousView || 'feed';
    this.previousView = null;
    this.showView(prev);
  }

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
