# Dark/Light Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dark/light/system theme support across desktop and mobile, persisted in user_preferences, applied instantly without flash.

**Architecture:** A `theme` column (`'system'|'light'|'dark'`) in `user_preferences`. A shared `theme.js` script applies `data-theme` to `<html>` before render using `localStorage` as a fast cache. On load, `/api/settings/preferences` syncs the value. Settings UI (desktop + mobile) shows a 3-state selector (System / Light / Dark). CSS variables under `[data-theme="dark"]` override the defaults.

**Tech Stack:** Vanilla JS, CSS custom properties (OKLCH), SQLite via existing `getUserPreferences`/`updateUserPreferences` helpers.

---

## Files touched

| File | Change |
|------|--------|
| `database.js` | Migration: add `theme` column; read/write in get/update prefs |
| `server.js` | `/api/settings/preferences` GET/PUT already handles prefs — just pass through `theme` |
| `public/theme.js` | NEW — shared script: reads localStorage, applies data-theme, exports `setTheme()` |
| `public/index.html` | Load `theme.js` early in `<head>`, add dark CSS vars |
| `public/app.html` | Load `theme.js` early in `<head>` |
| `public/profile.html` | Load `theme.js` early in `<head>` |
| `public/settings.html` | Load `theme.js`, add Appearance section with 3-state selector |
| `public/settings.js` | Load + save theme pref, wire selector |
| `public/components/shared-styles.css` | Dark mode CSS vars for app pages |
| `public/mobile/mobile-app.html` | Load `theme.js` early in `<head>` |
| `public/mobile/mobile-styles.css` | Dark mode CSS vars for mobile |
| `public/mobile/components/settings-view.js` | Add Appearance section with 3-state selector |

---

## Task 1: Database — add `theme` column

**Files:**
- Modify: `database.js` (getUserPreferences ~line 471, updateUserPreferences ~line 496)

- [ ] **Step 1: Add migration in `getUserPreferences`**

In `getUserPreferences`, after the existing `searchable` migration block, add:

```js
// Migration: add theme column if missing
try {
  await db.run("ALTER TABLE user_preferences ADD COLUMN theme TEXT DEFAULT 'system'");
} catch {}
```

- [ ] **Step 2: Return `theme` with defaults**

In the same function, after the `searchable` null-check, add:

```js
if (!prefs.theme) prefs.theme = 'system';
```

- [ ] **Step 3: Handle `theme` in `updateUserPreferences`**

Inside `updateUserPreferences`, after the `searchable` block, add:

```js
if (preferences.theme !== undefined) {
  const validThemes = ['system', 'light', 'dark'];
  if (validThemes.includes(preferences.theme)) {
    updates.push('theme = ?');
    values.push(preferences.theme);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add database.js
git commit -m "feat: add theme column to user_preferences (system|light|dark)"
```

---

## Task 2: Create `public/theme.js` — shared theme engine

**Files:**
- Create: `public/theme.js`

- [ ] **Step 1: Write the file**

```js
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
    /**
     * Set theme preference ('system'|'light'|'dark').
     * Saves to localStorage, applies immediately, does NOT call API.
     */
    set(pref) {
      localStorage.setItem(STORAGE_KEY, pref);
      applyTheme(pref);
    },
    /** Returns current preference ('system'|'light'|'dark') */
    get() {
      return localStorage.getItem(STORAGE_KEY) || 'system';
    },
    /** Sync from server value after preferences load */
    syncFromServer(pref) {
      if (!pref) return;
      localStorage.setItem(STORAGE_KEY, pref);
      applyTheme(pref);
    }
  };
})();
```

- [ ] **Step 2: Commit**

```bash
git add public/theme.js
git commit -m "feat: add theme.js — flash-free theme engine with localStorage cache"
```

---

## Task 3: Desktop dark mode CSS vars

**Files:**
- Modify: `public/components/shared-styles.css`

- [ ] **Step 1: Check what variables exist**

```bash
grep -n "^  --bg\|^  --fg\|^  --muted\|^  --border\|^  --surface\|^  --accent" public/components/shared-styles.css | head -20
```

- [ ] **Step 2: Add dark vars at end of `shared-styles.css`**

Append to end of file:

```css
/* ===== DARK MODE — desktop app pages ===== */
[data-theme="dark"] {
  --bg:      oklch(14% 0.01 250);
  --surface: oklch(18% 0.012 250);
  --fg:      oklch(92% 0.006 250);
  --muted:   oklch(58% 0.008 250);
  --border:  oklch(26% 0.012 250);
  --accent:  oklch(62% 0.18 250);
  --accent-hover: oklch(67% 0.18 250);
  color-scheme: dark;
}
```

- [ ] **Step 3: Commit**

```bash
git add public/components/shared-styles.css
git commit -m "feat: dark mode CSS vars for desktop app pages"
```

---

## Task 4: Landing page (`index.html`) dark mode

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Load `theme.js` as first script in `<head>`**

In `public/index.html`, find the line:
```html
  <!-- session.js: fetch /api/auth/me once, publish to window.__session + getSession() -->
  <script src="/components/session.js"></script>
```

Insert **before** it:
```html
  <!-- Theme engine: apply before render to prevent flash -->
  <script src="/theme.js"></script>
```

- [ ] **Step 2: Add dark CSS vars inside the `<style>` block**

The landing page has its own `<style>` tag with `:root` vars (`--bg`, `--fg`, `--muted`, `--border`, `--surface`, `--accent`). Find the closing of that `:root` block and add after it:

```css
[data-theme="dark"] {
  --bg:      oklch(14% 0.01 250);
  --surface: oklch(18% 0.012 250);
  --fg:      oklch(92% 0.006 250);
  --muted:   oklch(58% 0.008 250);
  --border:  oklch(26% 0.012 250);
  --accent:  oklch(62% 0.18 250);
  --accent-hover: oklch(67% 0.18 250);
  color-scheme: dark;
}
```

- [ ] **Step 3: Fix hero section — it has hardcoded dark blue bg**

The hero (`oklch(22% 0.14 255)`) looks good in both modes — leave as-is. The nav and body sections use `var(--bg)` so they'll adapt automatically.

- [ ] **Step 4: Commit**

```bash
git add public/index.html
git commit -m "feat: dark mode support on landing page"
```

---

## Task 5: App pages (`app.html`, `profile.html`, `settings.html`)

**Files:**
- Modify: `public/app.html`, `public/profile.html`, `public/settings.html`

- [ ] **Step 1: Add `theme.js` to `app.html`**

Find the `<head>` section. Insert as **first** `<script>` tag (before any other scripts):

```html
<script src="/theme.js"></script>
```

- [ ] **Step 2: Add `theme.js` to `profile.html`**

Same — insert as first script in `<head>`:

```html
<script src="/theme.js"></script>
```

- [ ] **Step 3: Add `theme.js` to `settings.html`**

Same:

```html
<script src="/theme.js"></script>
```

- [ ] **Step 4: Commit**

```bash
git add public/app.html public/profile.html public/settings.html
git commit -m "feat: load theme.js on all desktop app pages"
```

---

## Task 6: Settings page — Appearance section (desktop)

**Files:**
- Modify: `public/settings.html`, `public/settings.js`

- [ ] **Step 1: Add Appearance section to `settings.html`**

Find the Privacy section (around line 1002). Insert a new section **before** it:

```html
<section class="settings-section">
  <div class="section-header">
    <h2 class="section-title">Appearance</h2>
    <p class="section-description">Choose how onlylinks looks to you</p>
  </div>
  <div class="settings-item">
    <div class="toggle-container">
      <div class="toggle-label">
        <span class="toggle-title">Theme</span>
        <span class="toggle-description">Light, dark, or follow your system setting</span>
      </div>
      <div class="theme-selector" id="theme-selector">
        <button class="theme-btn" data-theme="light">Light</button>
        <button class="theme-btn" data-theme="system">System</button>
        <button class="theme-btn" data-theme="dark">Dark</button>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Add CSS for `.theme-selector` in `settings.html` `<style>` block**

Find the existing `<style>` block in `settings.html` and append:

```css
.theme-selector {
  display: flex;
  gap: 4px;
  background: var(--surface-secondary, #f5f4f2);
  border-radius: 8px;
  padding: 3px;
}

.theme-btn {
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary, #666);
  cursor: pointer;
  transition: background 150ms, color 150ms;
}

.theme-btn.active {
  background: white;
  color: var(--text, #1a1a1a);
  box-shadow: 0 1px 3px rgba(0,0,0,0.12);
}

[data-theme="dark"] .theme-btn.active {
  background: oklch(28% 0.012 250);
  color: oklch(92% 0.006 250);
}

[data-theme="dark"] .theme-selector {
  background: oklch(22% 0.012 250);
}
```

- [ ] **Step 3: Wire up in `settings.js` — load preference**

In `loadPreferences()` (around line 70), after setting the toggles for `default_public` and `searchable`, add:

```js
// Apply saved theme
if (data.preferences.theme) {
  window.onlylinksTheme?.syncFromServer(data.preferences.theme);
  updateThemeSelector(data.preferences.theme);
}
```

- [ ] **Step 4: Add `updateThemeSelector` helper to `settings.js`**

Add this function near the top of `settings.js` (after imports/DOMContentLoaded):

```js
function updateThemeSelector(pref) {
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === pref);
  });
}
```

- [ ] **Step 5: Wire click handlers in `settings.js`**

In the DOMContentLoaded block (where other event listeners are attached), add:

```js
document.querySelectorAll('.theme-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const pref = btn.dataset.theme;
    window.onlylinksTheme?.set(pref);
    updateThemeSelector(pref);
    try {
      await fetch('/api/settings/preferences', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: pref })
      });
    } catch (err) {
      console.error('Failed to save theme:', err);
    }
  });
});
```

- [ ] **Step 6: Commit**

```bash
git add public/settings.html public/settings.js
git commit -m "feat: appearance/theme selector in desktop settings"
```

---

## Task 7: Mobile dark mode CSS vars

**Files:**
- Modify: `public/mobile/mobile-styles.css`

- [ ] **Step 1: Append dark vars**

Add at the end of `public/mobile/mobile-styles.css`:

```css
/* ===== DARK MODE — mobile PWA ===== */
[data-theme="dark"] {
  --primary: #6B8AFF;
  --primary-hover: #5A78FF;
  --surface: oklch(14% 0.01 250);
  --surface-secondary: oklch(18% 0.012 250);
  --text: oklch(92% 0.006 250);
  --text-secondary: oklch(60% 0.008 250);
  --border: oklch(26% 0.012 250);
  --error: #F87171;
  --success: #4ADE80;
  color-scheme: dark;
}

[data-theme="dark"] .top-bar {
  background: rgba(20, 22, 35, 0.85);
}

[data-theme="dark"] .edit-sheet,
[data-theme="dark"] .bottom-sheet {
  background: oklch(18% 0.012 250);
}

[data-theme="dark"] .tag-input-field {
  background: oklch(18% 0.012 250);
  border-color: oklch(26% 0.012 250);
}

[data-theme="dark"] .tag-input-dropdown {
  background: oklch(18% 0.012 250);
  border-color: oklch(26% 0.012 250);
}

[data-theme="dark"] .tag-input-suggestion:hover,
[data-theme="dark"] .tag-input-suggestion:active {
  background: oklch(22% 0.012 250);
}

[data-theme="dark"] #bottom-nav {
  background: oklch(16% 0.01 250);
  border-top-color: oklch(24% 0.012 250);
}
```

- [ ] **Step 2: Commit**

```bash
git add public/mobile/mobile-styles.css
git commit -m "feat: dark mode CSS vars for mobile PWA"
```

---

## Task 8: Mobile app — load `theme.js`

**Files:**
- Modify: `public/mobile/mobile-app.html`

- [ ] **Step 1: Add `theme.js` as first script in `<head>`**

In `public/mobile/mobile-app.html`, find the `<head>` section. Insert before any other `<script>` or `<link>`:

```html
<!-- Theme engine: apply before render to prevent flash -->
<script src="/theme.js"></script>
```

- [ ] **Step 2: Commit**

```bash
git add public/mobile/mobile-app.html
git commit -m "feat: load theme.js on mobile PWA to prevent flash"
```

---

## Task 9: Mobile settings — Appearance section

**Files:**
- Modify: `public/mobile/components/settings-view.js`

- [ ] **Step 1: Add `theme` to prefs default in constructor**

Find the constructor:
```js
this.prefs = { default_public: 1, searchable: 1 };
```
Change to:
```js
this.prefs = { default_public: 1, searchable: 1, theme: 'system' };
```

- [ ] **Step 2: Sync theme on load**

In the `load()` method, after `if (prefsData?.preferences) this.prefs = prefsData.preferences;`, add:

```js
window.onlylinksTheme?.syncFromServer(this.prefs.theme || 'system');
```

- [ ] **Step 3: Add Appearance section to `render()`**

In the `render()` method, find where the Privacy section HTML is rendered. Insert a new section **before** it:

```js
<!-- Appearance -->
<div class="settings-section">
  <h2 class="section-title">Appearance</h2>
  <div class="settings-item">
    <div class="item-info">
      <div class="item-label">Theme</div>
      <div class="item-value">Choose how onlylinks looks</div>
    </div>
  </div>
  <div class="theme-selector-mobile" id="theme-selector-mobile">
    <button class="theme-btn-mobile ${(this.prefs.theme||'system')==='light'?'active':''}" data-theme="light">☀️ Light</button>
    <button class="theme-btn-mobile ${(this.prefs.theme||'system')==='system'?'active':''}" data-theme="system">⚙️ System</button>
    <button class="theme-btn-mobile ${(this.prefs.theme||'system')==='dark'?'active':''}" data-theme="dark">🌙 Dark</button>
  </div>
</div>
```

Note: this HTML goes inside a template literal in `container.innerHTML`. Use the JS expression syntax `${ }` for the active class.

- [ ] **Step 4: Wire click handlers after `this.container.appendChild(container)`**

After the container is appended, add:

```js
// Theme selector
this.container.querySelectorAll('.theme-btn-mobile').forEach(btn => {
  btn.addEventListener('click', async () => {
    const pref = btn.dataset.theme;
    window.onlylinksTheme?.set(pref);
    this.container.querySelectorAll('.theme-btn-mobile').forEach(b =>
      b.classList.toggle('active', b.dataset.theme === pref)
    );
    this.prefs.theme = pref;
    await fetchWithError('/api/settings/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: pref })
    });
    showToast('Theme updated', 'success');
  });
});
```

- [ ] **Step 5: Add CSS for mobile theme selector at end of `mobile-styles.css`**

```css
/* Theme selector — mobile settings */
.theme-selector-mobile {
  display: flex;
  gap: 6px;
  padding: 0 16px 16px;
}

.theme-btn-mobile {
  flex: 1;
  padding: 10px 4px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 150ms, color 150ms, border-color 150ms;
  text-align: center;
}

.theme-btn-mobile.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}
```

- [ ] **Step 6: Commit**

```bash
git add public/mobile/components/settings-view.js public/mobile/mobile-styles.css
git commit -m "feat: appearance/theme selector in mobile settings"
```

---

## Task 10: Sync theme on login (all pages)

When a user logs in on a new device, `localStorage` may have the wrong theme. The pages that call `/api/auth/me` or `/api/settings/preferences` on load should sync. Desktop app pages use `session.js` + per-page JS — settings already syncs. Profile and app pages need a one-liner.

**Files:**
- Modify: `public/app.js`, `public/profile.js`

- [ ] **Step 1: Sync in `app.js` after preferences load**

In `app.js`, find where `/api/settings/preferences` is fetched (or where user session is confirmed). Add after the preferences are loaded:

```js
if (data?.preferences?.theme) {
  window.onlylinksTheme?.syncFromServer(data.preferences.theme);
}
```

- [ ] **Step 2: Sync in `profile.js` after session check**

In `profile.js`, find the initial auth/session check. After the user object is confirmed, fetch preferences and sync:

```js
fetch('/api/settings/preferences', { credentials: 'include' })
  .then(r => r.json())
  .then(data => {
    if (data?.preferences?.theme) {
      window.onlylinksTheme?.syncFromServer(data.preferences.theme);
    }
  })
  .catch(() => {});
```

- [ ] **Step 3: Push everything**

```bash
git add public/app.js public/profile.js
git commit -m "feat: sync theme from server on app and profile pages"
git push origin main
```

---

## Task 11: Deploy and verify

- [ ] **Step 1: Deploy to VPS**

```bash
cd /var/www/onlylinks && git pull origin main && pm2 restart only-links
```

- [ ] **Step 2: Verify dark mode applies without flash**

Open `https://onlylinks.id` in a browser with OS set to dark mode. The page should render dark immediately without a light flash.

- [ ] **Step 3: Verify settings selector**

Go to Settings → Appearance. Click Dark, Light, System. Verify the page changes instantly. Reload — verify preference is remembered.

- [ ] **Step 4: Verify mobile**

Open `https://onlylinks.id/mobile/app?clear=1`. Go to Profile → Settings. Change theme. Verify it applies across all views.

- [ ] **Step 5: Verify cross-device sync**

Log in on a second browser/device. Go to settings, change theme. Open a different page — verify it syncs on next load.
