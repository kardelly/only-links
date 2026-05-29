# only.link Mobile PWA - Design Specification

**Date:** 2026-05-29  
**Author:** Claude + Anderson  
**Status:** Approved  
**Type:** Progressive Web App (PWA)

---

## Executive Summary

Transform only.link into a mobile-first Progressive Web App that users can install on their home screen and use to save bookmarks from any app via the native share sheet. The solution is delivered in two phases: MVP (2 weeks) for core functionality, then Polish (2 weeks) for refinements based on real usage data.

**Key Decisions:**
- PWA instead of native app (faster, single codebase, no app store friction)
- Bottom navigation pattern (5 primary sections)
- Phased approach (ship fast, iterate with feedback)
- Zero backend changes (reuse existing APIs)
- Desktop version remains untouched (mobile runs parallel)

---

## Table of Contents

1. [Architecture](#1-architecture)
2. [PWA Core](#2-pwa-core)
3. [Navigation Structure](#3-navigation-structure)
4. [User Flows](#4-user-flows)
5. [Components](#5-components)
6. [Phase 1 - MVP (2 weeks)](#6-phase-1---mvp)
7. [Phase 2 - Polish (2 weeks)](#7-phase-2---polish)
8. [Error Handling](#8-error-handling)
9. [Testing Strategy](#9-testing-strategy)
10. [Deployment](#10-deployment)
11. [Code Organization](#11-code-organization)
12. [Success Metrics](#12-success-metrics)

---

## 1. Architecture

### 1.1 Technology Stack

**Frontend:**
- HTML/CSS/JavaScript (vanilla, no frameworks)
- PWA APIs: Service Worker, Web App Manifest, Share Target API
- Same build approach as current site (no bundler)

**Backend:**
- No changes required
- Reuse all existing Express + SQLite APIs
- Same JWT cookie-based authentication

**Infrastructure:**
- Same VPS deployment (Nginx + PM2)
- HTTPS already configured (required for PWA)
- CDN optional for Phase 2

### 1.2 File Structure

```
public/
├── manifest.json              # PWA manifest (icons, theme, share target)
├── sw.js                      # Service Worker (caching strategy)
├── mobile/
│   ├── mobile-app.html       # Mobile app shell
│   ├── mobile-app.js         # Main app logic
│   ├── mobile-styles.css     # Mobile-first styles
│   └── components/
│       ├── bottom-nav.html
│       ├── bottom-nav.js
│       ├── feed-view.js
│       ├── search-view.js
│       ├── add-bookmark.js
│       ├── tags-view.js
│       ├── profile-view.js
│       ├── share-target.js
│       └── install-prompt.js
```

### 1.3 Separation Strategy

**Desktop vs Mobile:**
- Desktop: continues at `/app` (existing code untouched)
- Mobile: new entry point at `/mobile/app`
- Device detection redirects mobile browsers to `/mobile/app`
- Both versions share:
  - Backend APIs
  - Authentication system
  - CSS variables (colors, spacing)
  - Database

**Why Parallel Approach:**
- Zero risk of breaking existing desktop experience
- Can iterate mobile independently
- Easy rollback (just remove redirect)
- Progressive enhancement (desktop users unaffected)

---

## 2. PWA Core

### 2.1 Web App Manifest

**File:** `public/manifest.json`

```json
{
  "name": "only.link",
  "short_name": "only.link",
  "description": "Social bookmarking, reimagined",
  "start_url": "/app?source=pwa",
  "display": "standalone",
  "background_color": "#FAF9F7",
  "theme_color": "#4F6FE8",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/favicon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/favicon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "share_target": {
    "action": "/share-target",
    "method": "GET",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url"
    }
  }
}
```

**Key Properties:**
- `display: standalone` - hides browser chrome, looks like native app
- `theme_color` - colors status bar on Android
- `share_target` - registers app to receive shared URLs

### 2.2 Service Worker Strategy

**File:** `public/sw.js`

**Cache Strategy:**

| Resource Type | Strategy | Reason |
|--------------|----------|--------|
| Static assets (CSS, JS, images) | Cache First | Rarely change, prioritize speed |
| API calls (`/api/*`) | Network First | Always want fresh data |
| HTML pages | Network First, fallback to cache | Balance freshness with offline |

**Cache Versioning:**
```javascript
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `onlylinks-${CACHE_VERSION}`;

// On install: cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
        '/mobile/mobile-app.html',
        '/mobile/mobile-styles.css',
        '/mobile/mobile-app.js',
        '/logo.png',
        '/favicon-192.png'
      ]);
    })
  );
});

// On activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    })
  );
});
```

**Offline Fallback:**
- API calls fail → show toast "You're offline"
- Assets not cached → generic offline page
- Phase 2: queue actions for later sync

### 2.3 Share Target Implementation

**Flow:**
1. User shares URL from Safari/Twitter/etc
2. OS shows share sheet with only.link icon
3. User taps only.link
4. App opens at `/share-target?url=...&title=...&text=...`
5. JavaScript detects params, pre-fills add bookmark form
6. User adjusts tags/description, taps Save

**Code (in mobile-app.js):**
```javascript
function handleShareTarget() {
  const params = new URLSearchParams(window.location.search);
  
  if (params.has('url')) {
    const sharedData = {
      url: params.get('url'),
      title: params.get('title') || '',
      text: params.get('text') || ''
    };
    
    // Open add bookmark modal with pre-filled data
    openAddBookmarkModal(sharedData);
    
    // Track analytics
    trackEvent('share_target_used', { source: document.referrer });
  }
}
```

**Limitations:**
- iOS < 16.4: Share Target not supported → show fallback instructions
- Must be installed: Share Target only works after PWA installation

---

## 3. Navigation Structure

### 3.1 Bottom Navigation (5 Sections)

```
┌─────────────────────────────────┐
│      Top Bar (logo + search)    │
├─────────────────────────────────┤
│                                 │
│         Content Area            │
│     (scrollable, varies)        │
│                                 │
├─────────────────────────────────┤
│  🏠   🔍   ➕   🏷️   👤        │
│ Feed Search Add Tags Profile    │
└─────────────────────────────────┘
```

**Tab 1: Feed (🏠)**
- Default landing screen
- Shows bookmarks: own + followed users (if any)
- Sort: newest first
- Infinite scroll (Phase 1: pagination)
- Pull-to-refresh (Phase 2)

**Tab 2: Search (🔍)**
- Search input (auto-focus on tab switch)
- Quick filters: All / My Bookmarks / Users / Tags
- Results in same card format as Feed
- Debounced search (300ms)
- Uses existing `/api/bookmarks?q=...` endpoint

**Tab 3: Add (➕)**
- Central action button
- Opens bottom sheet (not navigation)
- Form fields:
  - URL (required, validated)
  - Title (optional, auto-filled from metadata)
  - Description (optional)
  - Tags (autocomplete from existing)
  - Public/Private toggle
- Save button (prominent, bottom of sheet)

**Tab 4: Tags (🏷️)**
- Popular tags cloud (size = frequency)
- Tap tag → filter bookmarks by that tag
- Toggle view: Cloud / Alphabetical list
- Shows tag count next to each

**Tab 5: Profile (👤)**
- Current user's profile
- Avatar + username + stats (bookmarks, following, followers)
- List of user's bookmarks
- Settings button (links to existing /settings page)
- Logout button

### 3.2 Top Bar

**Contents:**
- Logo (left) - tap → go to Feed
- Search icon (right) - tap → go to Search tab

**Behavior:**
- Fixed at top (sticky)
- Minimal height (56px) to maximize content space
- Translucent background with backdrop blur (iOS Safari style)

---

## 4. User Flows

### 4.1 First-Time Install

```
1. User visits onlylinks.id on mobile browser
2. Device detection redirects to /mobile/app
3. Banner appears: "Install only.link as an app?" [Install] [Maybe Later]
4. User taps "Install" → native PWA install prompt
5. App installs → icon appears on home screen
6. User taps icon → app opens in standalone mode
7. If not logged in → landing page with Sign Up / Login
8. After auth → Feed (empty state if new user)
9. Welcome banner: "Share URLs from any app to save them here!"
```

### 4.2 Add Bookmark (Internal)

```
1. User in Feed, taps ➕ button in bottom nav
2. Bottom sheet slides up with form
3. User pastes/types URL in input field
4. On blur/submit: fetch metadata (loading spinner)
5. Title and thumbnail auto-populate
6. User adds tags (autocomplete shows existing tags)
7. Toggle Public/Private if desired
8. Tap "Save" → POST /api/bookmarks
9. Bottom sheet closes with slide-down animation
10. New bookmark appears at top of Feed
11. Toast confirmation: "Bookmark saved ✓"
```

### 4.3 Add Bookmark (Share Target)

```
1. User reading article in Safari
2. Tap Safari share button
3. Scroll to "only.link" in share sheet
4. Tap only.link
5. App opens to /share-target?url=...&title=...
6. Add bookmark form already pre-filled
7. User only needs to add tags (optional)
8. Tap "Save" → bookmark created
9. Toast: "Saved! View in Feed?" [View] [Done]
10. If [View] → navigate to Feed, scroll to new bookmark
```

### 4.4 Search & Browse

```
1. User taps Search (🔍) in bottom nav
2. Input auto-focuses, keyboard appears
3. Types "javascript"
4. 300ms debounce → GET /api/bookmarks?q=javascript
5. Results appear in cards (same as Feed)
6. Tap a card → bookmark detail view
7. Detail view shows:
   - Full URL (clickable)
   - Complete description
   - All tags
   - Actions: [Open URL] [Edit] [Share] [Delete]
```

### 4.5 Browse by Tag

```
1. User taps Tags (🏷️) in bottom nav
2. See cloud of popular tags (visual hierarchy by size)
3. Tap "design" tag
4. Filtered view shows all bookmarks tagged "design"
5. Can combine with search or add more tag filters
6. Clear filters button at top
```

---

## 5. Components

### 5.1 Bookmark Card (Mobile)

**Design:**
- Height: ~100px (compact)
- Layout: Horizontal (thumbnail left, content right)
- Thumbnail: 80x80px, rounded corners
- Content:
  - Title (max 2 lines, ellipsis)
  - Tags (max 3 visible, +N more)
  - Meta: username + time ago

**Interactions:**
- Tap → open detail view
- Long-press (500ms) → action sheet [Edit | Delete | Share | Copy URL]
- Swipe-to-delete (Phase 2)

**Code Structure:**
```javascript
createBookmarkCard(bookmark) {
  const card = document.createElement('div');
  card.className = 'bookmark-card';
  card.dataset.id = bookmark.id;
  
  card.innerHTML = `
    <div class="card-thumbnail">
      <img src="${bookmark.og_image || '/placeholder.png'}" 
           alt="${bookmark.title}"
           loading="lazy">
    </div>
    <div class="card-content">
      <h3 class="card-title">${escapeHtml(bookmark.title)}</h3>
      <div class="card-tags">
        ${this.renderTags(bookmark.tags, 3)}
      </div>
      <div class="card-meta">
        <span class="username">@${bookmark.username}</span>
        <span class="date">${timeAgo(bookmark.created_at)}</span>
      </div>
    </div>
  `;
  
  card.addEventListener('click', () => this.openDetail(bookmark));
  card.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    this.showActionSheet(bookmark);
  });
  
  return card;
}
```

### 5.2 Bottom Sheet (Add/Edit Modal)

**Design:**
- Slides up from bottom (not centered modal)
- Backdrop: semi-transparent overlay
- Height: dynamic (based on content + keyboard)
- Rounded top corners (16px)
- Handle bar at top (visual affordance for drag-to-dismiss in Phase 2)

**Animation:**
```css
.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--surface);
  border-radius: 16px 16px 0 0;
  transform: translateY(100%);
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 1000;
}

.bottom-sheet.active {
  transform: translateY(0);
}
```

**Keyboard Handling:**
```javascript
// Adjust sheet height when keyboard opens
window.visualViewport.addEventListener('resize', () => {
  const sheet = document.querySelector('.bottom-sheet.active');
  if (sheet) {
    sheet.style.maxHeight = `${window.visualViewport.height - 20}px`;
  }
});
```

### 5.3 Install Prompt

**When to Show:**
- User visits 2+ times without installing
- User successfully creates first bookmark
- Never show if already installed or dismissed 3+ times

**Design:**
- Small banner at bottom (above bottom nav)
- Text: "Install only.link for faster access"
- Buttons: [Install] [×]
- Non-intrusive, easily dismissable

**Code:**
```javascript
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  // Check if should show based on user history
  if (shouldShowInstallPrompt()) {
    showInstallBanner();
  }
});

function handleInstallClick() {
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(result => {
    if (result.outcome === 'accepted') {
      trackEvent('pwa_installed');
    }
    deferredPrompt = null;
  });
}
```

---

## 6. Phase 1 - MVP (2 weeks)

### Week 1: Foundation

**Days 1-2: PWA Setup**
- Create `manifest.json` with icons, theme, share target
- Implement basic Service Worker (cache static assets)
- Add `<link rel="manifest">` to HTML
- Test installation on iOS Safari + Android Chrome
- **Deliverable:** App installs on home screen with correct icon

**Days 3-4: Bottom Navigation**
- Create `bottom-nav.html` template
- Implement `BottomNav` class (state, rendering, events)
- Style bottom nav (mobile-first CSS)
- Handle active state toggling
- **Deliverable:** Navigation works between 5 sections

**Day 5: Mobile Shell**
- Create `mobile-app.html` (main container)
- Top bar (logo + search icon)
- Content area (scrollable)
- Integrate bottom nav
- Device detection redirect
- **Deliverable:** Complete mobile app structure

### Week 2: Functional Screens

**Days 6-7: Feed + Profile**
- Feed: fetch `/api/bookmarks`, render cards
- Implement bookmark card component
- Profile: show current user data
- Reuse existing auth system (JWT cookies)
- **Deliverable:** 2 main screens working

**Days 8-9: Add + Search + Tags**
- Add bookmark form (bottom sheet)
- POST to `/api/bookmarks`
- Search: input + results rendering
- Tags: simple list view
- **Deliverable:** All 5 sections functional

**Day 10: Share Target**
- Implement `/share-target` route handler
- Detect URL params, pre-fill form
- Test sharing from Safari, Twitter, Instagram
- Analytics tracking for share target usage
- **Deliverable:** Receive links from other apps

### Phase 1 Acceptance Criteria

- [ ] App installs on iOS 16+ and Android 12+
- [ ] All 5 bottom nav sections navigate correctly
- [ ] Can create, read, edit, delete bookmarks
- [ ] Login/logout works (reuses desktop auth)
- [ ] Search returns results
- [ ] Share Target receives URLs from external apps
- [ ] Layout responsive (portrait mode, 320px-428px width)
- [ ] Works on Chrome, Safari, Firefox mobile
- [ ] Lighthouse PWA score: 100

### Phase 1 Exclusions

- No gestures (swipe-to-delete, pull-to-refresh)
- No page transition animations
- No skeleton loading screens
- No offline mode (just error message)
- No infinite scroll (simple pagination)
- No haptic feedback

---

## 7. Phase 2 - Polish (2 weeks)

### Prerequisites

**Metrics Collection (Week 3):**
- Google Analytics events:
  - `pwa_installed`
  - `share_target_used`
  - `bookmark_created_mobile`
  - Screen views (which tabs used most)
  - Session duration
- Performance metrics via Lighthouse CI
- User feedback: in-app feedback form or email

### Week 3: Gestures + Animations

**Days 11-12: Mobile Gestures**
- Swipe-to-delete on bookmark cards
  - Detect swipe direction and distance
  - Show delete confirmation button on swipe
  - Animate card removal
- Pull-to-refresh in Feed
  - Detect pull gesture (overscroll at top)
  - Show loading indicator
  - Refresh bookmark list
- Long-press action sheet
  - 500ms delay
  - Haptic feedback (vibrate API)
  - Options: Edit / Delete / Share / Copy URL

**Days 13-14: Smooth Transitions**
- Page transition animations
  - Slide in/out between tabs
  - Fade backdrop on modals
  - Use CSS `view-transitions` API if supported
- Bottom sheet animations
  - Slide-up entrance (cubic-bezier easing)
  - Drag-to-dismiss gesture
  - Keyboard-aware positioning
- Skeleton screens
  - Loading placeholders for bookmark cards
  - Shimmer effect while fetching data

**Day 15: Micro-interactions**
- Button active states (scale down on press)
- Ripple effect on cards (touch feedback)
- Success animations (checkmark, bounce)
- Error shake animation on validation fail
- Toast notifications (slide-in from top)

### Week 4: Performance + Advanced Features

**Days 16-17: Performance Optimization**
- Lazy loading images
  - Use IntersectionObserver
  - Load images as they enter viewport
  - Placeholder → blur-up effect
- Infinite scroll
  - Replace pagination with scroll-triggered load
  - Load next page when 200px from bottom
  - Loading indicator at bottom
- Search debouncing (already in Phase 1, verify performance)
- Virtual scrolling (if needed for large lists)
- Service Worker optimization
  - Fine-tune cache strategy based on metrics
  - Prefetch likely next pages

**Days 18-19: Advanced Features**
- App shortcuts
  - Long-press app icon → quick actions
  - Actions: New Bookmark, Search, Profile
  - Configured in manifest.json `shortcuts` array
- Dark mode (if requested in feedback)
  - Respect system preference (`prefers-color-scheme`)
  - Toggle in settings
  - Persist preference in localStorage
- Share API (native share)
  - Share bookmark URLs from app
  - Uses `navigator.share()` if available
- Badge notifications
  - Show unread count on app icon (if applicable)
  - Use Badging API

**Day 20: Final Testing + Bug Fixes**
- Test on multiple devices (iPhone, Android mid-range, Android budget)
- Fix bugs discovered in Phase 1 feedback
- UX refinements based on user feedback
- Performance audit (Lighthouse)
- Documentation (README, troubleshooting)

### Phase 2 Acceptance Criteria

- [ ] Swipe gestures feel natural (no lag, proper thresholds)
- [ ] Animations run at 60fps on mid-range devices
- [ ] Pull-to-refresh triggers correctly (no false positives)
- [ ] Infinite scroll loads smoothly
- [ ] Lighthouse Performance score > 90
- [ ] Core Web Vitals: FCP < 2s, LCP < 2.5s, CLS < 0.1
- [ ] Dark mode works (if implemented)
- [ ] App shortcuts appear on long-press
- [ ] Zero critical bugs from Phase 1

---

## 8. Error Handling

### 8.1 Network Errors

**Offline Detection:**
```javascript
window.addEventListener('online', () => {
  hideOfflineBanner();
  retryFailedRequests();
});

window.addEventListener('offline', () => {
  showOfflineBanner('You\'re offline. Some features may not work.');
});
```

**API Error Handling:**
```javascript
async function fetchBookmarks() {
  try {
    const response = await fetch('/api/bookmarks');
    
    if (!response.ok) {
      if (response.status === 401) {
        // Session expired
        clearSession();
        redirectToLogin('Your session expired. Please log in again.');
      } else if (response.status === 429) {
        // Rate limited
        showToast('Too many requests. Please wait a moment.');
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
      return null;
    }
    
    return await response.json();
  } catch (err) {
    if (err.name === 'TypeError') {
      // Network error (offline, DNS fail, etc)
      showToast('Connection failed. Check your internet.');
    } else {
      // Other errors
      console.error('Fetch error:', err);
      showToast('Something went wrong. Please try again.');
    }
    return null;
  }
}
```

### 8.2 Form Validation

**URL Validation:**
```javascript
function validateBookmarkForm(data) {
  const errors = [];
  
  // URL required
  if (!data.url || data.url.trim() === '') {
    errors.push({ field: 'url', message: 'URL is required' });
  } else {
    // URL format check
    try {
      new URL(data.url);
    } catch {
      errors.push({ field: 'url', message: 'Invalid URL format' });
    }
  }
  
  // Title optional but if provided, check length
  if (data.title && data.title.length > 500) {
    errors.push({ field: 'title', message: 'Title too long (max 500 characters)' });
  }
  
  // Tags optional but if provided, check format
  if (data.tags) {
    const tagArray = data.tags.split(',').map(t => t.trim());
    if (tagArray.some(tag => tag.length > 50)) {
      errors.push({ field: 'tags', message: 'Individual tags must be under 50 characters' });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

**Display Errors:**
```javascript
function showFormErrors(errors) {
  errors.forEach(({ field, message }) => {
    const input = document.querySelector(`[name="${field}"]`);
    const errorEl = input.nextElementSibling;
    
    input.classList.add('error');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  });
}
```

### 8.3 Edge Cases

**Empty States:**
- No bookmarks: "You haven't saved any bookmarks yet. Tap + to get started."
- Search no results: "No bookmarks found for 'keyword'. Try different terms."
- Tags empty: "No tags yet. Tags will appear as you add bookmarks."
- Network feed empty: "Follow users to see their bookmarks here."

**Image Loading Failures:**
```javascript
function handleImageError(img) {
  img.onerror = null; // Prevent infinite loop
  img.src = '/placeholder.png';
  img.alt = 'Preview unavailable';
}

// In card creation:
<img src="${bookmark.og_image}" 
     onerror="handleImageError(this)"
     loading="lazy">
```

**Share Target Edge Cases:**
- No URL in share data: redirect to Add form (empty)
- Invalid URL format: show error, ask user to correct
- URL too long (>2048 chars): truncate + warning
- Coming from unsupported app: may receive null/undefined values

**Session Edge Cases:**
- JWT expires mid-session: redirect to login with return URL
- User logs out in desktop, still logged in mobile: next API call will 401
- Concurrent sessions (desktop + mobile): both work independently

**Storage Quota:**
- Service Worker cache full: clear oldest cached items automatically
- localStorage full: graceful degradation (don't cache preferences)

---

## 9. Testing Strategy

### 9.1 Manual Testing (Phase 1)

**Required Devices:**
- **iPhone** (iOS 16+, Safari)
- **Android** (Android 12+, Chrome)
- Test on both WiFi and 4G

**Installation Checklist:**
- [ ] PWA installs without error
- [ ] Icon appears correctly on home screen (not generic)
- [ ] Splash screen shows when opening
- [ ] Status bar theme color applies (Android)
- [ ] App opens in standalone mode (no browser chrome)

**Functionality Checklist:**
- [ ] Login works, session persists
- [ ] Logout clears session
- [ ] Create bookmark from + button
- [ ] Edit bookmark
- [ ] Delete bookmark
- [ ] Search finds bookmarks
- [ ] Tags filter works
- [ ] Profile shows correct data
- [ ] Share Target receives URL from Safari
- [ ] Share Target receives URL from Twitter
- [ ] Images load (or placeholder shows)
- [ ] Forms validate correctly
- [ ] Bottom nav highlights active tab

### 9.2 Performance Testing

**Lighthouse Audit (CLI):**
```bash
# Run on deployed mobile site
npx lighthouse https://onlylinks.id/mobile/app \
  --preset=perf \
  --only-categories=performance,pwa,accessibility,best-practices \
  --output=html \
  --output-path=./lighthouse-report.html

# Target scores:
# Performance: > 80 (Phase 1), > 90 (Phase 2)
# PWA: 100
# Accessibility: > 90
# Best Practices: > 95
```

**Core Web Vitals Targets:**
| Metric | Phase 1 Target | Phase 2 Target |
|--------|---------------|----------------|
| FCP (First Contentful Paint) | < 2.5s | < 2s |
| LCP (Largest Contentful Paint) | < 3.5s | < 2.5s |
| TTI (Time to Interactive) | < 4s | < 3.5s |
| CLS (Cumulative Layout Shift) | < 0.15 | < 0.1 |
| FID (First Input Delay) | < 200ms | < 100ms |

**Network Throttling Tests:**
- **Fast 3G:** App should load and be interactive in < 5s
- **Slow 3G:** App should show skeleton/loading state, not blank screen
- **Offline:** Shows offline banner, doesn't crash

### 9.3 Compatibility Testing

**Browsers:**
| Browser | iOS | Android | Priority |
|---------|-----|---------|----------|
| Safari | ✓ Primary | N/A | Critical |
| Chrome | ✓ | ✓ Primary | Critical |
| Firefox | ✓ | ✓ | Important |
| Edge | - | ✓ | Nice-to-have |

**iOS Limitations:**
- Share Target requires iOS 16.4+ (released March 2023)
- If < 16.4: detect and show alternative instructions
- Service Worker restrictions: limited cache size, cleared after 7 days of no use

**Screen Sizes:**
- 320px width (iPhone SE 1st gen) - minimum
- 375px width (iPhone 12/13/14) - common
- 414px width (iPhone Plus/Max) - common
- 393px width (Pixel, Galaxy S) - common
- Test in portrait mode (primary), landscape (should work but not optimized)

### 9.4 User Acceptance Testing

**Test Group:** 5 users (mixed iOS/Android, tech-savvy and non-technical)

**Tasks:**
1. Install the app from browser
2. Sign up or log in
3. Add a bookmark using the + button
4. Share a link from Safari/Twitter and save it via only.link
5. Search for a previously saved bookmark
6. Edit a bookmark
7. Delete a bookmark

**Success Criteria:**
- 80%+ task completion rate
- No critical UX blockers discovered
- Average task time < 2 minutes
- Satisfaction rating > 4/5

**Feedback Collection:**
- In-app feedback form: "How can we improve?"
- Email follow-up after 1 week of use
- Analytics: track where users drop off

---

## 10. Deployment

### 10.1 Server Configuration

**Nginx Configuration:**

Add to existing `/etc/nginx/sites-available/onlylinks.id`:

```nginx
server {
    listen 443 ssl http2;
    server_name onlylinks.id;

    # SSL already configured
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Service Worker must be served with correct headers
    location ~* (sw\.js|manifest\.json)$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Service-Worker-Allowed "/";
        root /var/www/onlylinks/public;
    }

    # Mobile app routes
    location /mobile/ {
        try_files $uri $uri/ /mobile/mobile-app.html;
    }

    # Share target endpoint
    location /share-target {
        try_files $uri /mobile/mobile-app.html?share=true;
    }

    # Existing proxy to Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Node.js Routes (server.js):**

Add these routes:

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

// Serve manifest with correct MIME type
app.get('/manifest.json', (req, res) => {
  res.type('application/manifest+json');
  res.sendFile(path.join(__dirname, 'public/manifest.json'));
});

// Serve Service Worker with correct headers
app.get('/sw.js', (req, res) => {
  res.set('Service-Worker-Allowed', '/');
  res.set('Cache-Control', 'no-cache');
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, 'public/sw.js'));
});
```

### 10.2 Deployment Process

**Phase 1 Deployment:**

```bash
# 1. SSH into VPS
ssh root@2.25.147.170

# 2. Navigate to project
cd /var/www/onlylinks

# 3. Backup current version
cp -r public public.backup.$(date +%Y%m%d)

# 4. Pull new code
git pull origin main

# 5. Restart Node.js
pm2 restart only-links

# 6. Reload Nginx (if config changed)
sudo nginx -t && sudo nginx -s reload

# 7. Verify
curl -I https://onlylinks.id/manifest.json
# Should return 200 with Content-Type: application/manifest+json

# 8. Test on mobile device
# Open https://onlylinks.id on phone
# Check for install prompt
# Verify functionality
```

**Rollback Procedure:**

```bash
# If deployment fails
cd /var/www/onlylinks
rm -rf public
mv public.backup.YYYYMMDD public
pm2 restart only-links

# Verify rollback worked
curl -I https://onlylinks.id
```

### 10.3 Monitoring

**PM2 Monitoring:**
```bash
# View logs
pm2 logs only-links --lines 100

# Monitor CPU/memory
pm2 monit

# Status check
pm2 status
```

**Nginx Logs:**
```bash
# Access logs (track PWA install events)
tail -f /var/log/nginx/access.log | grep manifest.json

# Error logs
tail -f /var/log/nginx/error.log
```

**Analytics Tracking:**

Key events to track:
- `pwa_install_prompt_shown`
- `pwa_install_accepted`
- `pwa_install_dismissed`
- `share_target_opened`
- `bookmark_created_mobile`
- `bookmark_created_share_target`
- Screen views for each tab

**Health Checks:**
- Automated ping to `/api/health` every 5 minutes
- Alert if down > 5 minutes
- Monitor service worker registration errors (client-side error tracking)

---

## 11. Code Organization

### 11.1 Entry Point (mobile-app.js)

```javascript
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
  }

  async init() {
    // 1. Check authentication
    await this.checkAuth();
    
    // 2. Setup PWA features
    this.setupServiceWorker();
    this.setupShareTarget();
    this.setupInstallPrompt();
    
    // 3. Initialize views
    this.initializeViews();
    
    // 4. Render UI
    this.render();
    
    // 5. Show default view
    this.showView('feed');
  }

  async checkAuth() {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      this.user = data.user;
      
      if (!this.user) {
        this.redirectToLogin();
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      this.redirectToLogin();
    }
  }

  setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          console.log('Service Worker registered:', reg.scope);
          
          // Check for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.showUpdatePrompt();
              }
            });
          });
        })
        .catch(err => console.error('SW registration failed:', err));
    }
  }

  setupShareTarget() {
    const params = new URLSearchParams(window.location.search);
    
    if (params.has('url')) {
      const sharedData = {
        url: params.get('url'),
        title: params.get('title') || '',
        text: params.get('text') || ''
      };
      
      // Track analytics
      if (window.gtag) {
        gtag('event', 'share_target_opened', {
          shared_url: sharedData.url
        });
      }
      
      // Wait for view to load, then open modal
      setTimeout(() => {
        this.views.add.openWithData(sharedData);
      }, 100);
    }
  }

  initializeViews() {
    this.views = {
      feed: new FeedView(),
      search: new SearchView(),
      add: new AddBookmarkView(),
      tags: new TagsView(),
      profile: new ProfileView()
    };
    
    this.bottomNav = new BottomNav((tab) => {
      if (tab === 'add') {
        this.views.add.open();
      } else {
        this.showView(tab);
      }
    });
  }

  showView(viewName) {
    // Hide current view
    if (this.currentView) {
      this.views[this.currentView].hide();
    }
    
    // Show new view
    this.currentView = viewName;
    this.views[viewName].show();
    
    // Update bottom nav
    this.bottomNav.setActive(viewName);
  }
}

// Initialize on DOM ready
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

### 11.2 View Base Class

```javascript
/**
 * Base View Class
 * All views (Feed, Search, Tags, Profile) extend this
 */
class BaseView {
  constructor(viewId) {
    this.viewId = viewId;
    this.container = document.getElementById(viewId);
    this.isLoaded = false;
  }

  show() {
    this.container.style.display = 'block';
    if (!this.isLoaded) {
      this.load();
      this.isLoaded = true;
    }
  }

  hide() {
    this.container.style.display = 'none';
  }

  async load() {
    // Override in subclasses
    throw new Error('load() must be implemented');
  }

  showLoading() {
    const loader = document.createElement('div');
    loader.className = 'loading-spinner';
    loader.innerHTML = '<div class="spinner"></div>';
    this.container.appendChild(loader);
  }

  hideLoading() {
    const loader = this.container.querySelector('.loading-spinner');
    if (loader) loader.remove();
  }

  showError(message) {
    const error = document.createElement('div');
    error.className = 'error-message';
    error.textContent = message;
    this.container.appendChild(error);
    
    setTimeout(() => error.remove(), 5000);
  }
}
```

### 11.3 Feed View Example

```javascript
/**
 * Feed View
 * Displays bookmarks feed with infinite scroll (Phase 2)
 */
class FeedView extends BaseView {
  constructor() {
    super('feed-view');
    this.page = 1;
    this.hasMore = true;
    this.bookmarks = [];
  }

  async load() {
    this.showLoading();
    
    try {
      const data = await this.fetchBookmarks();
      this.bookmarks = data.bookmarks;
      this.hasMore = data.hasMore;
      
      this.render();
    } catch (err) {
      this.showError('Failed to load bookmarks');
    } finally {
      this.hideLoading();
    }
  }

  async fetchBookmarks() {
    const response = await fetch(`/api/bookmarks?page=${this.page}&limit=20`);
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.json();
  }

  render() {
    const grid = document.createElement('div');
    grid.className = 'bookmark-grid';
    
    this.bookmarks.forEach(bookmark => {
      const card = this.createBookmarkCard(bookmark);
      grid.appendChild(card);
    });
    
    this.container.innerHTML = '';
    this.container.appendChild(grid);
    
    // Add pagination (Phase 1) or infinite scroll observer (Phase 2)
    if (this.hasMore) {
      this.addLoadMoreButton();
    }
  }

  createBookmarkCard(bookmark) {
    const card = document.createElement('div');
    card.className = 'bookmark-card';
    card.dataset.id = bookmark.id;
    
    card.innerHTML = `
      <div class="card-thumbnail">
        <img src="${bookmark.og_image || '/placeholder.png'}" 
             alt="${escapeHtml(bookmark.title)}"
             onerror="this.src='/placeholder.png'"
             loading="lazy">
      </div>
      <div class="card-content">
        <h3 class="card-title">${escapeHtml(bookmark.title)}</h3>
        <div class="card-tags">
          ${this.renderTags(bookmark.tags)}
        </div>
        <div class="card-meta">
          <span class="username">@${bookmark.username}</span>
          <span class="date">${timeAgo(bookmark.created_at)}</span>
        </div>
      </div>
    `;
    
    card.addEventListener('click', () => {
      this.openBookmarkDetail(bookmark);
    });
    
    return card;
  }

  renderTags(tagsString) {
    if (!tagsString) return '';
    
    const tags = tagsString.split(',').map(t => t.trim()).slice(0, 3);
    return tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
  }

  addLoadMoreButton() {
    const btn = document.createElement('button');
    btn.className = 'btn btn-secondary load-more';
    btn.textContent = 'Load More';
    btn.addEventListener('click', async () => {
      this.page++;
      await this.load();
    });
    this.container.appendChild(btn);
  }

  openBookmarkDetail(bookmark) {
    // Open detail modal/view
    const modal = new BookmarkDetailModal(bookmark);
    modal.open();
  }
}
```

### 11.4 Utility Functions

```javascript
// utils.js

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format timestamp as relative time
 */
function timeAgo(timestamp) {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;
  
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;
  
  if (diff < minute) return 'just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < week) return `${Math.floor(diff / day)}d ago`;
  if (diff < month) return `${Math.floor(diff / week)}w ago`;
  if (diff < year) return `${Math.floor(diff / month)}mo ago`;
  return `${Math.floor(diff / year)}y ago`;
}

/**
 * Show toast notification
 */
function showToast(message, duration = 3000) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Remove after duration
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Debounce function calls
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
```

---

## 12. Success Metrics

### 12.1 Phase 1 Targets (Week 2 end)

**Installation:**
- 100+ PWA installs in first week
- Install rate: 20% of mobile visitors
- 0 installation errors reported

**Functionality:**
- All 5 tabs navigable
- Create bookmark success rate: > 95%
- Share Target usage: > 50% of new bookmarks come via share
- Zero critical bugs

**Performance:**
- Lighthouse PWA score: 100
- Lighthouse Performance: > 80
- FCP < 2.5s on 4G
- No crashes reported

**Engagement:**
- Average session: > 2 minutes
- Bookmarks created per user: > 3
- Return rate (day 2): > 30%

### 12.2 Phase 2 Targets (Week 5 end)

**Performance:**
- Lighthouse Performance: > 90
- FCP < 2s
- LCP < 2.5s
- TTI < 3.5s
- CLS < 0.1

**Engagement:**
- 7-day retention: > 40%
- Average session: > 5 minutes
- Daily active users: > 50% of installers
- Bookmarks per user: > 10

**Quality:**
- User satisfaction: 4+/5
- Zero critical bugs
- All gestures feel responsive
- Works on 95% of tested devices

**Feature Adoption:**
- Pull-to-refresh: used by > 30% of users
- Swipe-to-delete: used by > 20% of users
- App shortcuts: used by > 10% of users

### 12.3 Long-Term Goals (3 months)

- 500+ active mobile users
- 50% of all bookmarks created via mobile
- 80% of mobile bookmarks via Share Target
- Feature parity with desktop (if needed)
- Consider push notifications (if requested)
- Consider offline mode (if slow connections common)

### 12.4 Analytics Events to Track

```javascript
// Installation funnel
gtag('event', 'pwa_install_prompt_shown');
gtag('event', 'pwa_install_accepted');
gtag('event', 'pwa_install_dismissed');

// Usage
gtag('event', 'screen_view', { screen_name: 'feed' });
gtag('event', 'screen_view', { screen_name: 'search' });
gtag('event', 'screen_view', { screen_name: 'tags' });
gtag('event', 'screen_view', { screen_name: 'profile' });

// Actions
gtag('event', 'bookmark_created', { source: 'manual' });
gtag('event', 'bookmark_created', { source: 'share_target' });
gtag('event', 'bookmark_edited');
gtag('event', 'bookmark_deleted');
gtag('event', 'search_performed', { query_length: query.length });

// Share Target
gtag('event', 'share_target_opened', { referrer: document.referrer });
gtag('event', 'share_target_saved');
gtag('event', 'share_target_cancelled');

// Errors
gtag('event', 'error', { 
  error_type: 'api_error',
  error_message: err.message 
});
```

---

## Appendix A: API Endpoints Used

All existing endpoints, no changes needed:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/me` | GET | Check current user session |
| `/api/auth/login` | POST | User login |
| `/api/auth/logout` | POST | User logout |
| `/api/auth/register` | POST | New user signup |
| `/api/bookmarks` | GET | List bookmarks (with pagination, search, filters) |
| `/api/bookmarks` | POST | Create new bookmark |
| `/api/bookmarks/:id` | PUT | Edit bookmark |
| `/api/bookmarks/:id` | DELETE | Delete bookmark |
| `/api/tags` | GET | Get popular tags |
| `/api/users/:username` | GET | Get user profile |
| `/api/metadata` | GET | Fetch URL metadata (og:image, title, etc) |

---

## Appendix B: Browser Compatibility Matrix

| Feature | Chrome Android | Safari iOS 16.4+ | Safari iOS < 16.4 | Firefox Mobile |
|---------|---------------|-----------------|-------------------|----------------|
| Service Worker | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| Web App Manifest | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| Add to Home Screen | ✅ | ✅ | ✅ | ✅ |
| Standalone Mode | ✅ | ✅ | ✅ | ⚠️ Limited |
| Share Target API | ✅ | ✅ | ❌ No | ⚠️ Limited |
| Push Notifications | ✅ | ⚠️ iOS 16.4+ | ❌ No | ✅ |
| Background Sync | ✅ | ❌ No | ❌ No | ⚠️ Limited |
| Badging API | ✅ | ❌ No | ❌ No | ❌ No |

**Fallbacks:**
- Share Target (iOS < 16.4): Show instructions to copy URL manually
- Push Notifications (iOS): Skip for now, revisit if demand
- Background Sync: Phase 2 feature, can skip if not supported

---

## Appendix C: Lighthouse PWA Checklist

To achieve PWA score of 100, must pass all:

- [x] Registers a service worker
- [x] Responds with 200 when offline
- [x] Contains a web app manifest
- [x] Uses HTTPS
- [x] Redirects HTTP traffic to HTTPS
- [x] Configured for a custom splash screen
- [x] Sets a theme color
- [x] Content sized correctly for viewport
- [x] Has a `<meta name="viewport">` tag
- [x] Provides Apple touch icon
- [x] Maskable icon provided

---

## Appendix D: File Checklist

**To Create:**

```
public/
├── manifest.json              ✅ Phase 1 Day 1
├── sw.js                      ✅ Phase 1 Day 1
├── mobile/
│   ├── mobile-app.html       ✅ Phase 1 Day 5
│   ├── mobile-app.js         ✅ Phase 1 Day 5
│   ├── mobile-styles.css     ✅ Phase 1 Day 4
│   └── components/
│       ├── bottom-nav.js     ✅ Phase 1 Day 3
│       ├── feed-view.js      ✅ Phase 1 Day 6
│       ├── search-view.js    ✅ Phase 1 Day 8
│       ├── add-bookmark.js   ✅ Phase 1 Day 8
│       ├── tags-view.js      ✅ Phase 1 Day 9
│       ├── profile-view.js   ✅ Phase 1 Day 7
│       ├── share-target.js   ✅ Phase 1 Day 10
│       ├── install-prompt.js ✅ Phase 1 Day 2
│       └── utils.js          ✅ Phase 1 Day 5
```

**To Modify:**

```
server.js                      ✅ Add mobile routes (Phase 1 Day 1)
/etc/nginx/sites-available/... ✅ Add SW headers (Phase 1 Day 1)
public/app.html                ✅ Add mobile redirect (Phase 1 Day 5)
```

---

**End of Specification**

---

**Next Steps:**

1. Review this spec document
2. Approve or request changes
3. Create implementation plan with `/skills/writing-plans`
4. Begin Phase 1 development
