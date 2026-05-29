/**
 * InstallPrompt Component
 * Manages the PWA install prompt banner
 */
class InstallPrompt {
  constructor() {
    this.deferredPrompt = null;
    this.dismissCount = 0;
    this.maxDismissals = 3;
    this.storageKey = 'pwa-install-dismissed';

    this.init();
  }

  init() {
    // Load dismiss count from localStorage
    const dismissed = localStorage.getItem(this.storageKey);
    if (dismissed) {
      this.dismissCount = parseInt(dismissed, 10);
    }

    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;

      // Show banner if user hasn't dismissed too many times
      if (this.dismissCount < this.maxDismissals) {
        this.showBanner();
      }
    });

    // Check if already installed
    window.addEventListener('appinstalled', () => {
      this.hideBanner();
      this.trackEvent('installed');
    });
  }

  showBanner() {
    const banner = document.getElementById('install-banner');
    if (banner) {
      banner.classList.remove('hidden');
      this.trackEvent('banner_shown');
    }
  }

  hideBanner() {
    const banner = document.getElementById('install-banner');
    if (banner) {
      banner.classList.add('hidden');
    }
  }

  async install() {
    if (!this.deferredPrompt) {
      return;
    }

    // Show the install prompt
    this.deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await this.deferredPrompt.userChoice;

    this.trackEvent('install_prompt_response', { outcome });

    if (outcome === 'accepted') {
      this.hideBanner();
    }

    // Clear the deferred prompt
    this.deferredPrompt = null;
  }

  dismiss() {
    this.dismissCount++;
    localStorage.setItem(this.storageKey, this.dismissCount.toString());
    this.hideBanner();
    this.trackEvent('banner_dismissed', { count: this.dismissCount });
  }

  trackEvent(eventName, params = {}) {
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, {
        event_category: 'pwa_install',
        ...params
      });
    }
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.installPrompt = new InstallPrompt();
  });
} else {
  window.installPrompt = new InstallPrompt();
}
