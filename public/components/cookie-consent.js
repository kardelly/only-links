/**
 * Cookie Consent Banner
 * Compatible with Google Consent Mode v2
 */

class CookieConsent {
  constructor() {
    this.consentKey = 'cookie_consent';
    this.consentVersion = '1.0';
    this.banner = null;
  }

  /**
   * Initialize consent banner
   */
  init() {
    // Check if consent already given
    const consent = this.getConsent();

    if (consent) {
      // Apply stored consent
      this.updateGoogleConsent(consent);
      return;
    }

    // Set default consent (denied until user accepts)
    this.setDefaultConsent();

    // Show banner
    this.showBanner();
  }

  /**
   * Set default consent state (before user choice)
   */
  setDefaultConsent() {
    if (typeof gtag === 'function') {
      gtag('consent', 'default', {
        'ad_storage': 'denied',
        'ad_user_data': 'denied',
        'ad_personalization': 'denied',
        'analytics_storage': 'denied'
      });
    }
  }

  /**
   * Update Google consent based on user choice
   */
  updateGoogleConsent(consent) {
    if (typeof gtag === 'function') {
      gtag('consent', 'update', {
        'ad_storage': consent.analytics ? 'granted' : 'denied',
        'ad_user_data': consent.analytics ? 'granted' : 'denied',
        'ad_personalization': consent.analytics ? 'granted' : 'denied',
        'analytics_storage': consent.analytics ? 'granted' : 'denied'
      });
    }
  }

  /**
   * Get stored consent
   */
  getConsent() {
    try {
      const stored = localStorage.getItem(this.consentKey);
      if (!stored) return null;

      const consent = JSON.parse(stored);

      // Check version
      if (consent.version !== this.consentVersion) {
        return null;
      }

      return consent;
    } catch (err) {
      return null;
    }
  }

  /**
   * Save consent
   */
  saveConsent(analytics = false) {
    const consent = {
      version: this.consentVersion,
      analytics: analytics,
      timestamp: new Date().toISOString()
    };

    try {
      localStorage.setItem(this.consentKey, JSON.stringify(consent));
    } catch (err) {
      console.error('Failed to save consent:', err);
    }

    return consent;
  }

  /**
   * Show consent banner
   */
  showBanner() {
    // Create banner HTML
    this.banner = document.createElement('div');
    this.banner.className = 'cookie-consent-banner';
    this.banner.innerHTML = `
      <div class="cookie-consent-content">
        <div class="cookie-consent-text">
          <h3>We value your privacy</h3>
          <p>We use cookies to enhance your browsing experience and analyze our traffic. By clicking "Accept", you consent to our use of cookies.</p>
          <a href="/privacy" class="cookie-consent-link">Learn more about our privacy policy</a>
        </div>
        <div class="cookie-consent-actions">
          <button class="btn-consent btn-consent-reject" id="cookie-reject">
            Reject
          </button>
          <button class="btn-consent btn-consent-accept" id="cookie-accept">
            Accept
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.banner);

    // Add event listeners
    document.getElementById('cookie-accept').addEventListener('click', () => {
      this.accept();
    });

    document.getElementById('cookie-reject').addEventListener('click', () => {
      this.reject();
    });

    // Animate in
    setTimeout(() => {
      this.banner.classList.add('show');
    }, 100);
  }

  /**
   * Hide banner
   */
  hideBanner() {
    if (!this.banner) return;

    this.banner.classList.remove('show');

    setTimeout(() => {
      if (this.banner && this.banner.parentNode) {
        this.banner.parentNode.removeChild(this.banner);
      }
      this.banner = null;
    }, 300);
  }

  /**
   * Accept cookies
   */
  accept() {
    const consent = this.saveConsent(true);
    this.updateGoogleConsent(consent);
    this.hideBanner();

    // Track consent given
    if (typeof gtag === 'function') {
      gtag('event', 'consent_given', {
        'event_category': 'consent',
        'event_label': 'accepted'
      });
    }
  }

  /**
   * Reject cookies
   */
  reject() {
    const consent = this.saveConsent(false);
    this.updateGoogleConsent(consent);
    this.hideBanner();

    // Track consent denied
    if (typeof gtag === 'function') {
      gtag('event', 'consent_given', {
        'event_category': 'consent',
        'event_label': 'rejected'
      });
    }
  }

  /**
   * Reset consent (for testing)
   */
  reset() {
    localStorage.removeItem(this.consentKey);
    window.location.reload();
  }
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.cookieConsent = new CookieConsent();
    window.cookieConsent.init();
  });
} else {
  window.cookieConsent = new CookieConsent();
  window.cookieConsent.init();
}
