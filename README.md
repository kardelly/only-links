# onlylinks.id

Save, tag, and discover links with people who share your curiosity.

A free social bookmarking tool for curators, researchers, and the endlessly curious — a modern reimagining of del.icio.us.

🔖 **Live:** https://onlylinks.id

---

## What is onlylinks?

Your bookmarks say a lot about who you are. Instead of saving links just for yourself, onlylinks lets you publish what you're exploring and follow people with curation you admire.

**In one sentence:** it's the place where curious people save what's worth keeping and discover what other curious people are reading.

---

## Features

- Save and organize links with tags (not folders)
- Public/private bookmark visibility per bookmark
- Automatic Open Graph image fetching
- Follow other curators and discover their collections
- User profiles with custom avatars
- Full-text search across your collection
- Browser bookmarklet for one-click saving
- Chrome extension support
- PWA — installable on mobile, fully offline-capable
- Mobile-first design with dedicated PWA shell
- Tag autocomplete with chip UI on mobile
- Dynamic SVG placeholders for bookmarks without images
- Password reset via email

---

## Tech Stack

### Backend
- **Node.js** + Express (ESM)
- **SQLite** via `better-sqlite3`
- **JWT** authentication with httpOnly cookies
- **Bcrypt** password hashing
- **Helmet** security headers + strict CSP
- **Rate limiting** — tiered per endpoint
- **Nodemailer** for transactional email
- **Multer** + magic-bytes verification for avatar uploads

### Frontend
- Vanilla JavaScript — no framework, no build step
- Component-based architecture with shared singleton session
- OKLCH color system with CSS custom properties
- Mobile PWA: component-based view shell (`/mobile/`)
- Self-hosted Inter variable font (ad-blocker safe)
- Service worker: network-first for app files, cache-first for static assets

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
# Edit .env — at minimum set JWT_SECRET

npm start
# Open http://localhost:3000
```

Generate a strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Project Structure

```
.
├── server.js                  # Express server + all API routes
├── database.js                # SQLite schema + query helpers
├── email.js                   # Email sender
├── scripts/
│   └── backfill-images.mjs    # One-time OG image backfill
├── public/
│   ├── index.html             # Landing page
│   ├── app.html / app.js      # Desktop app
│   ├── profile.html / .js     # User profiles
│   ├── settings.html / .js    # Account settings
│   ├── sw.js                  # Service worker (PWA)
│   ├── manifest.json          # PWA manifest
│   ├── mobile/                # Mobile PWA shell
│   │   ├── mobile-app.html
│   │   ├── mobile-app.js
│   │   ├── mobile-styles.css
│   │   └── components/        # View components (feed, search, profile…)
│   └── components/            # Shared desktop components
│       ├── session.js         # Auth singleton
│       ├── header.js / .html
│       ├── auth-modal.js
│       └── *.css              # Shared design tokens
└── CLAUDE.md                  # Project memory for AI-assisted development
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

# Email (any SMTP provider)
SMTP_HOST=
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=
SMTP_PASS=
EMAIL_FROM_ADDRESS=noreply@onlylinks.id
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
| `GET` | `/api/metadata?url=` | Fetch Open Graph metadata |
| `GET` | `/api/placeholder/:domain` | Dynamic SVG placeholder image |

### Tags
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tags` | Popular tags (supports `?q=` for autocomplete) |
| `GET` | `/api/tags/mine` | Current user's tags |

### Users & Social
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users?q=` | Search users |
| `GET` | `/api/users/:username` | User profile |
| `POST` | `/api/users/:username/follow` | Follow |
| `DELETE` | `/api/users/:username/follow` | Unfollow |
| `GET` | `/api/users/:username/followers` | Followers list |
| `GET` | `/api/users/:username/following` | Following list |

### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/PUT` | `/api/settings/preferences` | Privacy preferences |
| `PUT` | `/api/settings/username` | Change username |
| `PUT` | `/api/settings/email` | Change email |
| `PUT` | `/api/settings/password` | Change password |
| `POST` | `/api/settings/avatar` | Upload avatar |
| `DELETE` | `/api/settings/avatar` | Remove avatar |
| `DELETE` | `/api/settings/bookmarks` | Delete all bookmarks (requires password) |
| `DELETE` | `/api/settings/account` | Delete account (requires password) |

---

## Database Schema

| Table | Key columns |
|-------|-------------|
| `users` | username, email, password_hash, avatar, password_version |
| `bookmarks` | user_id, url, title, description, og_image, is_public |
| `tags` | name |
| `bookmark_tags` | bookmark_id, tag_id |
| `follows` | follower_id, following_id |
| `user_preferences` | user_id, default_public, searchable |
| `password_reset_tokens` | user_id, token, expires_at |

All foreign keys use `ON DELETE CASCADE`.

---

## Security

- JWT tokens in httpOnly, Secure, SameSite=Strict cookies
- JWT invalidation on password change via `password_version`
- Bcrypt password hashing (10 rounds)
- Tiered rate limiting: strict on auth endpoints, moderate on search
- Strict Content Security Policy via Helmet
- Magic-bytes verification for avatar uploads (JPEG, PNG, WebP only)
- SSRF protection on `/api/metadata` (private IP blocklist)
- Parameterized queries throughout
- Password confirmation required for destructive account actions
- CORS restricted to `ALLOWED_ORIGINS`

---

## Scripts

```bash
# Backfill Open Graph images for existing bookmarks
node scripts/backfill-images.mjs
```

---

## Design Principles

1. **Speed is a feature** — every interaction feels instant
2. **Tags over folders** — multidimensional, non-destructive organization
3. **Public by default** — discovery through shared knowledge
4. **Content first** — UI recedes when not needed
5. **Desktop ↔ Mobile parity** — every feature works on both surfaces

---

## Contributing

Issues and pull requests are welcome.

For questions or feedback, reach out at **kardelly@gmail.com**

---

## License

MIT — see [LICENSE](./LICENSE)

---

## Acknowledgments

Inspired by the original **del.icio.us** (2003–2017). Design sensibility influenced by **Pinboard**, **Are.na**, and **Tagpacker**.

---

**Made by [Anderson Cardelli Façanha](https://github.com/kardelly)**
