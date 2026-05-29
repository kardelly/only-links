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
        // Prevent redirect loop by setting flag before redirecting
        sessionStorage.setItem('mobile_redirect_attempted', 'skip');
        window.location.href = '/';
        return false;
      }

      this.user = data.user;
      console.log('[MobileApp] Authenticated as', this.user.username);
      return true;
    } catch (err) {
      console.error('[MobileApp] Auth check failed:', err);
      // Prevent redirect loop by setting flag before redirecting
      sessionStorage.setItem('mobile_redirect_attempted', 'skip');
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
