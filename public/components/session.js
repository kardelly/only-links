/**
 * Session module — single source of truth for auth state.
 *
 * Fetches /api/auth/me once per page load and publishes the result to:
 *   - window.__session  { user: object|null }
 *   - CustomEvent 'sessionReady' on window
 *
 * All other scripts call getSession() instead of fetching /api/auth/me directly.
 * Returns a Promise that resolves immediately if the session is already loaded.
 */

(function () {
  let _promise = null;

  async function _fetch() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await res.json();
      return data.user || null;
    } catch {
      return null;
    }
  }

  function _publish(user) {
    window.__session = { user };
    window.dispatchEvent(new CustomEvent('sessionReady', { detail: { user } }));
  }

  // Start the fetch immediately when this script loads
  _promise = _fetch().then(user => {
    _publish(user);
    return user;
  });

  /**
   * Returns a Promise<{ user }>.
   * Resolves instantly if session is already loaded, otherwise waits.
   */
  window.getSession = function () {
    return _promise.then(user => ({ user }));
  };

  /**
   * Synchronous read — only safe to call after sessionReady has fired.
   */
  window.getSessionSync = function () {
    return window.__session || { user: null };
  };

  /**
   * Clears the session cache and forces a fresh fetch on next getSession() call.
   * Call before navigating away on logout so the destination page sees no user.
   */
  window.clearSession = function () {
    window.__session = { user: null };
    _promise = Promise.resolve(null);
  };
})();
