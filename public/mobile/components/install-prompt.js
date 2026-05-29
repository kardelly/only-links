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
