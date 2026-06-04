/**
 * Theme engine — load early in <head> to prevent flash.
 * Applies data-theme to <html> from localStorage, syncs with server after load.
 */
(function () {
  const STORAGE_KEY = 'onlylinks-theme';

  function getEffectiveTheme(pref) {
    if (pref === 'dark') return 'dark';
    if (pref === 'light') return 'light';
    // 'system' or anything else: follow OS
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(pref) {
    const effective = getEffectiveTheme(pref);
    document.documentElement.setAttribute('data-theme', effective);
    document.documentElement.setAttribute('data-theme-pref', pref || 'system');
  }

  // Apply immediately from cache (prevents flash)
  const cached = localStorage.getItem(STORAGE_KEY) || 'system';
  applyTheme(cached);

  // Listen for OS-level changes (only relevant when pref is 'system')
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const pref = localStorage.getItem(STORAGE_KEY) || 'system';
    if (pref === 'system') applyTheme('system');
  });

  // Public API
  window.onlylinksTheme = {
    set(pref) {
      localStorage.setItem(STORAGE_KEY, pref);
      applyTheme(pref);
    },
    get() {
      return localStorage.getItem(STORAGE_KEY) || 'system';
    },
    syncFromServer(pref) {
      if (!pref) return;
      localStorage.setItem(STORAGE_KEY, pref);
      applyTheme(pref);
    }
  };
})();
