# onlylinks.id — Project Memory

## Stack
- Node.js + Express (ESM), SQLite, vanilla JS
- JWT via httpOnly cookies — **always use `credentials: 'include'`** on fetch calls
- No build step — all files served statically from `public/`

## Architecture
- **Desktop app**: `public/app.html` + `public/app.js`
- **Mobile PWA**: `public/mobile/mobile-app.html` + component-based views in `public/mobile/components/`
- **Shared header/footer**: `public/components/` (header.js, session.js, etc.)
- **Profile page**: `public/profile.html` + `public/profile.js`
- **Settings**: `public/settings.html` + `public/settings.js`

## Critical rules

### Desktop ↔ Mobile parity
**Any feature built for desktop must be reflected in mobile if it makes sense**, and vice versa. Both surfaces must stay in sync:
- Feed card layout changes → update both `app.js` and `mobile/components/feed-view.js`
- Settings fields → update both `settings.js` and `mobile/components/settings-view.js`
- Search features → update both header search and `mobile/components/search-view.js`
- Profile features → update both `profile.js` and `mobile/components/profile-view.js`

### Component reuse
**Always reuse existing components before creating new ones.** Check what already exists:
- Shared styles: `public/components/shared-styles.css`
- Header styles: `public/components/header-styles.css`
- Mobile utils: `public/mobile/components/utils.js` (fetchWithError, showToast, timeAgo, escapeHtml)
- Mobile bottom sheet pattern: already established in `profile-view.js` (`.edit-sheet-backdrop`)
- Mobile toggle: `.mobile-toggle` CSS class in `mobile-styles.css`

### API endpoints
- Preferences: `GET/PUT /api/settings/preferences` (not `/api/users/settings`)
- Password: `PUT /api/settings/password`
- Account delete: `DELETE /api/settings/account`
- User search: `GET /api/users?q=`
- Tags: `GET /api/tags?limit=&offset=` → returns `{ tags, total, hasMore }`

## Deploy
- VPS: `root@2.25.147.170`, process name `only-links` (pm2)
- **Normal deploy (preferred):** push to main, then on server: `cd /var/www/onlylinks && git pull origin main && pm2 restart only-links`
- `deploy-prepare.sh` and `vps-setup.sh` are gitignored (server-specific, not tracked)
- If git ownership error: `git config --global --add safe.directory /var/www/onlylinks`
- If `node_modules` changed: add `npm install --production` before `pm2 restart`

## Dates & formats
- Timestamps displayed as `12 JUN 2026` via `toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()`
- Language: American English throughout (not British)

## Fonts
- Inter self-hosted in `public/fonts/` (inter-latin.woff2 + inter-latin-ext.woff2, variable weight 300–700)
- Do NOT use Google Fonts — blocked by ad blockers

## Privacy preferences (user_preferences table)
- `default_public` (1/0): default visibility for new bookmarks
- `searchable` (1/0): opt-out of user search results
- Both exposed in Settings desktop + mobile
