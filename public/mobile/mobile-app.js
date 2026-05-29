// Mobile App Controller
class MobileApp {
  constructor() {
    this.currentView = 'home';
    this.views = {};
    this.deferredPrompt = null;
    this.isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true;
  }

  async init() {
    // Check authentication
    if (!this.checkAuth()) {
      window.location.href = '/login?redirect=/mobile';
      return;
    }

    // Register service worker
    await this.registerServiceWorker();

    // Handle share target
    this.handleShareTarget();

    // Setup install prompt
    this.setupInstallPrompt();

    // Initialize views
    this.initializeViews();

    // Initialize bottom navigation
    this.initializeNavigation();

    // Setup top bar interactions
    this.setupTopBar();

    // Show initial view
    const initialView = this.getInitialView();
    this.showView(initialView);

    // Track initial screen view
    this.trackScreenView(initialView);
  }

  checkAuth() {
    // Check if user is authenticated
    const token = localStorage.getItem('authToken') ||
                 sessionStorage.getItem('authToken') ||
                 this.getCookie('authToken');
    return !!token;
  }

  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/mobile/sw.js', {
          scope: '/mobile/'
        });
        console.log('Service Worker registered:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.showUpdateNotification();
            }
          });
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  handleShareTarget() {
    // Check if app was launched via share target
    const params = new URLSearchParams(window.location.search);
    const sharedTitle = params.get('title');
    const sharedText = params.get('text');
    const sharedUrl = params.get('url');

    if (sharedUrl || sharedText || sharedTitle) {
      // Navigate to add view with shared content
      setTimeout(() => {
        this.showView('add');
        if (this.views.add && this.views.add.prefill) {
          this.views.add.prefill({
            url: sharedUrl,
            title: sharedTitle,
            notes: sharedText
          });
        }
      }, 100);

      // Clean up URL
      window.history.replaceState({}, document.title, '/mobile');
    }
  }

  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA installed');
      this.deferredPrompt = null;
      this.hideInstallButton();
      this.trackEvent('pwa_installed');
    });
  }

  showInstallButton() {
    const installBtn = document.querySelector('[data-action="install"]');
    if (installBtn && !this.isStandalone) {
      installBtn.style.display = 'block';
      installBtn.addEventListener('click', () => this.promptInstall());
    }
  }

  hideInstallButton() {
    const installBtn = document.querySelector('[data-action="install"]');
    if (installBtn) {
      installBtn.style.display = 'none';
    }
  }

  async promptInstall() {
    if (!this.deferredPrompt) return;

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;

    this.trackEvent('pwa_install_prompt', { outcome });

    if (outcome === 'accepted') {
      console.log('User accepted install');
    }

    this.deferredPrompt = null;
  }

  initializeViews() {
    // Initialize Home View
    const homeView = document.getElementById('home-view');
    if (homeView && typeof HomeView !== 'undefined') {
      this.views.home = new HomeView(homeView);
    }

    // Initialize Collections View
    const collectionsView = document.getElementById('collections-view');
    if (collectionsView && typeof CollectionsView !== 'undefined') {
      this.views.collections = new CollectionsView(collectionsView);
    }

    // Initialize Add View
    const addView = document.getElementById('add-view');
    if (addView && typeof AddView !== 'undefined') {
      this.views.add = new AddView(addView);
    }

    // Initialize Search View
    const searchView = document.getElementById('search-view');
    if (searchView && typeof SearchView !== 'undefined') {
      this.views.search = new SearchView(searchView);
    }

    // Initialize Profile View
    const profileView = document.getElementById('profile-view');
    if (profileView && typeof ProfileView !== 'undefined') {
      this.views.profile = new ProfileView(profileView);
    }
  }

  initializeNavigation() {
    const navButtons = document.querySelectorAll('[data-view]');
    navButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const view = button.dataset.view;
        this.showView(view);
        this.trackEvent('navigation_tap', { view });
      });
    });
  }

  setupTopBar() {
    // Back button
    const backButton = document.querySelector('[data-action="back"]');
    if (backButton) {
      backButton.addEventListener('click', () => {
        this.handleBack();
      });
    }

    // Search button
    const searchButton = document.querySelector('[data-action="search"]');
    if (searchButton) {
      searchButton.addEventListener('click', () => {
        this.showView('search');
      });
    }

    // Menu button
    const menuButton = document.querySelector('[data-action="menu"]');
    if (menuButton) {
      menuButton.addEventListener('click', () => {
        this.showMenu();
      });
    }
  }

  getInitialView() {
    // Check URL hash
    const hash = window.location.hash.slice(1);
    if (hash && this.views[hash]) {
      return hash;
    }
    return 'home';
  }

  showView(viewName) {
    // Hide all views
    Object.keys(this.views).forEach(name => {
      const view = this.views[name];
      if (view && view.container) {
        view.container.style.display = 'none';
        view.container.classList.remove('active');
      }
    });

    // Show requested view
    const view = this.views[viewName];
    if (view && view.container) {
      view.container.style.display = 'block';
      view.container.classList.add('active');

      // Call view's onShow method if it exists
      if (typeof view.onShow === 'function') {
        view.onShow();
      }

      // Update navigation state
      this.updateNavigation(viewName);

      // Update current view
      this.currentView = viewName;

      // Update URL hash
      window.location.hash = viewName;

      // Track screen view
      this.trackScreenView(viewName);
    }
  }

  updateNavigation(viewName) {
    const navButtons = document.querySelectorAll('[data-view]');
    navButtons.forEach(button => {
      if (button.dataset.view === viewName) {
        button.classList.add('active');
        button.setAttribute('aria-current', 'page');
      } else {
        button.classList.remove('active');
        button.removeAttribute('aria-current');
      }
    });
  }

  handleBack() {
    if (this.currentView !== 'home') {
      this.showView('home');
    } else if (window.history.length > 1) {
      window.history.back();
    }
  }

  showMenu() {
    // Show menu overlay or drawer
    const menu = document.querySelector('.mobile-menu');
    if (menu) {
      menu.classList.add('open');
      this.trackEvent('menu_opened');
    }
  }

  showUpdateNotification() {
    // Show notification that app has been updated
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
      <div class="update-content">
        <span>New version available</span>
        <button class="update-btn">Reload</button>
      </div>
    `;
    document.body.appendChild(notification);

    notification.querySelector('.update-btn').addEventListener('click', () => {
      window.location.reload();
    });

    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
  }

  trackScreenView(viewName) {
    this.trackEvent('screen_view', {
      screen_name: viewName,
      app_name: 'Delicious Orphans Mobile'
    });
  }

  trackEvent(eventName, params = {}) {
    // Analytics tracking
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, params);
    }

    // Custom analytics
    if (typeof analytics !== 'undefined' && typeof analytics.track === 'function') {
      analytics.track(eventName, params);
    }

    // Console log in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('Event:', eventName, params);
    }
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.mobileApp = new MobileApp();
    window.mobileApp.init();
  });
} else {
  window.mobileApp = new MobileApp();
  window.mobileApp.init();
}
