# onlylinks.id

Social bookmarking with editorial sensibility. A modern reimagining of del.icio.us.

🔖 **Live:** https://onlylinks.id

---

## Features

- Save and organize links with tags (not folders)
- Public/private bookmark visibility
- Automatic Open Graph image fetching
- Follow other curators and discover their collections
- User profiles with custom avatars
- Full-text search across your collection
- Browser bookmarklet for one-click saving
- Chrome extension support
- PWA — installable on mobile and desktop
- Responsive design (desktop + mobile)
- Password reset via email (Resend/SMTP)

---

## Tech Stack

### Backend
- **Node.js** + Express (ESM)
- **SQLite** database
- **JWT** authentication with httpOnly cookies
- **Bcrypt** password hashing
- **Helmet** security headers + strict CSP
- **Rate limiting** — tiered per endpoint (auth vs. strict)
- **Nodemailer** + Resend for transactional email
- **Multer** + magic-bytes verification for avatar uploads

### Frontend
- Vanilla JavaScript (no framework)
- Component-based architecture with shared singleton session (`session.js`)
- OKLCH color system with CSS custom properties
- CSS animations with `prefers-reduced-motion` support

---

## Quick Start

### Prerequisites

- Node.js 20+
- npm

### Development

```bash
git clone https://github.com/kardelly/only-links.git
cd only-links

npm install

cp .env.example .env
# Edit .env — at minimum set JWT_SECRET:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

npm start
# Open http://localhost:3000
```

### Production Deploy

See **[DEPLOY.md](./DEPLOY.md)** for the full VPS guide.

---

## Project Structure

```
.
├── server.js                  # Express server + all API routes
├── database.js                # SQLite schema + query helpers
├── email.js                   # Nodemailer email sender
├── scripts/
│   └── backfill-images.mjs    # One-time OG image backfill script
├── public/
│   ├── index.html             # Landing page
│   ├── app.html               # Main application
│   ├── profile.html           # User profiles
│   ├── settings.html          # Account settings
│   ├── bookmarklet.html       # Bookmarklet install page
│   ├── extension.html         # Chrome extension info
│   ├── reset-password.html    # Password reset
│   ├── privacy.html           # Privacy policy
│   ├── terms.html             # Terms of service
│   ├── save-popup.html        # Bookmarklet save popup
│   ├── sw.js                  # Service worker (PWA)
│   ├── manifest.json          # PWA manifest
│   ├── app.js                 # Main app logic
│   ├── profile.js             # Profile page logic
│   ├── settings.js            # Settings page logic
│   ├── mobile/                # PWA mobile app shell
│   └── components/
│       ├── session.js         # Auth singleton (one fetch per page load)
│       ├── header.js / .html
│       ├── footer.js / .html
│       ├── auth-modal.js / .html
│       ├── bookmark-modals.js / .html
│       ├── bookmark-renderer.js
│       ├── sidebar-tags.js / .html
│       └── *.css              # Shared design tokens + component styles
├── PRODUCT.md                 # Product vision + principles
├── DESIGN.md                  # Design system tokens
├── SECURITY.md                # Security hardening notes
└── package.json
```

---

## Environment Variables

```bash
# Required
NODE_ENV=production
JWT_SECRET=your-64-char-secret-here

# Server
PORT=3000
ALLOWED_ORIGINS=https://onlylinks.id

# Email (Resend or any SMTP)
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=resend
SMTP_PASS=your-resend-api-key
EMAIL_FROM_ADDRESS=noreply@onlylinks.id
```

Generate a strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/auth/me` | Current user |
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/logout` | Logout |
| `GET` | `/api/auth/check-username` | Username availability |
| `POST` | `/api/auth/request-password-reset` | Send reset email |
| `POST` | `/api/auth/reset-password` | Apply new password |

### Bookmarks
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/bookmarks` | List bookmarks (paginated, filterable) |
| `POST` | `/api/bookmarks` | Create bookmark |
| `PUT` | `/api/bookmarks/:id` | Update bookmark |
| `DELETE` | `/api/bookmarks/:id` | Delete bookmark |
| `POST` | `/api/bookmarks/fetch-images` | Backfill missing OG images |
| `GET` | `/api/metadata?url=` | Fetch Open Graph metadata |

### Tags
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tags` | Popular tags |

### Users & Social
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users/:username` | User profile |
| `POST` | `/api/users/:username/follow` | Follow |
| `DELETE` | `/api/users/:username/follow` | Unfollow |
| `GET` | `/api/users/:username/followers` | Followers list |
| `GET` | `/api/users/:username/following` | Following list |

### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/settings/preferences` | Get preferences |
| `PUT` | `/api/settings/preferences` | Update preferences |
| `PUT` | `/api/settings/username` | Change username |
| `PUT` | `/api/settings/email` | Change email |
| `PUT` | `/api/settings/password` | Change password |
| `POST` | `/api/settings/avatar` | Upload avatar |
| `DELETE` | `/api/settings/avatar` | Remove avatar |
| `DELETE` | `/api/settings/bookmarks` | Delete all bookmarks |
| `DELETE` | `/api/settings/account` | Delete account |

---

## Database Schema

| Table | Key columns |
|-------|-------------|
| `users` | username, email, password_hash, avatar, bio |
| `bookmarks` | user_id, url, title, description, og_image, is_public |
| `tags` | name |
| `bookmark_tags` | bookmark_id, tag_id |
| `follows` | follower_id, following_id |
| `user_preferences` | user_id, default_public |
| `password_reset_tokens` | user_id, token, expires_at |

All foreign keys use `ON DELETE CASCADE`.

---

## Security

- JWT tokens in httpOnly, Secure, SameSite=Strict cookies (7-day expiry)
- Bcrypt password hashing (10 rounds)
- Tiered rate limiting: 10 req/15min on login, 5 req/hour on register/reset
- Strict Content Security Policy via Helmet
- Magic-bytes verification for avatar uploads (JPEG, PNG, WebP only)
- Parameterized queries throughout (no SQL injection surface)
- Body size capped at 1mb
- CORS restricted to `ALLOWED_ORIGINS`

See **[SECURITY.md](./SECURITY.md)** for details.

---

## Scripts

```bash
# Backfill Open Graph images for existing bookmarks
node scripts/backfill-images.mjs

# Options
node scripts/backfill-images.mjs --dry-run     # count only, no writes
node scripts/backfill-images.mjs --user 1      # single user
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `N` | New bookmark |
| `Esc` | Close modal |

---

## Design Principles

1. **Speed is a feature** — every interaction feels instant
2. **Tags over folders** — multidimensional, non-destructive organization
3. **Public by default** — discovery through shared knowledge
4. **Content first** — UI recedes when not needed

Full philosophy: **[PRODUCT.md](./PRODUCT.md)**

---

## License

MIT — see [LICENSE](./LICENSE)

---

## Acknowledgments

Inspired by the original **del.icio.us** (2003–2017). Design sensibility influenced by **Pinboard**, **Linear**, and **Are.na**.

---

**Made by [Anderson Cardelli Façanha](https://github.com/kardelly)**
