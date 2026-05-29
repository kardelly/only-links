# onlylinks.id

Social bookmarking with editorial sensibility. A modern reimagining of del.icio.us.

🔖 **Live:** https://onlylinks.id

---

## Features

- ✅ Save and organize links with tags (not folders)
- ✅ Search across your entire collection
- ✅ Follow other curators and see their bookmarks
- ✅ Public/private bookmark visibility
- ✅ Fast, keyboard-driven interface
- ✅ Automatic Open Graph image fetching
- ✅ User profiles with avatars
- ✅ Responsive design (desktop + mobile)

---

## Tech Stack

### Backend
- **Node.js** + Express
- **SQLite** database
- **JWT** authentication with httpOnly cookies
- **Bcrypt** password hashing
- **Helmet** security headers + CSP
- **Rate limiting** on auth endpoints

### Frontend
- Vanilla JavaScript (ES6+)
- Component-based architecture
- OKLCH color system
- CSS animations with reduced-motion support
- No frontend framework dependencies

---

## Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn

### Development

```bash
# Clone repository
git clone https://github.com/kardelly/only-links.git
cd only-links

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env and add JWT_SECRET (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# Start development server
npm start

# Open browser
open http://localhost:3000
```

### Production Deploy

See **[DEPLOY.md](./DEPLOY.md)** for complete VPS deployment guide.

Quick deploy checklist: **[START-HERE.md](./START-HERE.md)**

---

## Project Structure

```
.
├── server.js              # Express server + API routes
├── database.js            # SQLite database + queries
├── public/
│   ├── index.html         # Landing page
│   ├── app.html           # Main application
│   ├── profile.html       # User profiles
│   ├── settings.html      # Account settings
│   ├── app.js             # Main app logic
│   ├── profile.js         # Profile page logic
│   ├── settings.js        # Settings page logic
│   └── components/        # Reusable UI components
│       ├── header.js
│       ├── header.html
│       ├── sidebar-tags.js
│       ├── bookmark-renderer.js
│       └── *.css
├── PRODUCT.md             # Product vision + principles
├── DESIGN.md              # Design system tokens
├── SECURITY.md            # Security hardening guide
├── PRIVACY.md             # Privacy policy
├── DEPLOY.md              # Deployment guide
└── package.json
```

---

## Design Principles

1. **Speed is a feature** – Every interaction feels instant
2. **Tags > folders** – Multidimensional organization
3. **Public by default** – Discovery through shared knowledge
4. **Keyboard > mouse** – Every action has a shortcut
5. **Content first** – UI recedes when not needed

Full philosophy: **[PRODUCT.md](./PRODUCT.md)**

---

## Security

- ✅ JWT tokens with 7-day expiration
- ✅ Bcrypt password hashing (10 rounds)
- ✅ Rate limiting (5 attempts/15min on auth)
- ✅ Content Security Policy (CSP)
- ✅ HTTPS-only cookies in production
- ✅ Input validation on all endpoints
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection

See **[SECURITY.md](./SECURITY.md)** for hardening guide.

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Bookmarks
- `GET /api/bookmarks` - List bookmarks (with filters)
- `POST /api/bookmarks` - Create bookmark
- `PUT /api/bookmarks/:id` - Update bookmark
- `DELETE /api/bookmarks/:id` - Delete bookmark
- `GET /api/metadata?url=` - Fetch Open Graph metadata

### Tags
- `GET /api/tags` - Get popular tags

### Social
- `GET /api/users/:username` - Get user profile
- `POST /api/users/:username/follow` - Follow user
- `DELETE /api/users/:username/follow` - Unfollow user
- `GET /api/users/:username/followers` - Get followers
- `GET /api/users/:username/following` - Get following

### Settings
- `GET /api/settings/preferences` - Get preferences
- `PUT /api/settings/preferences` - Update preferences
- `PUT /api/settings/username` - Change username
- `PUT /api/settings/email` - Change email
- `PUT /api/settings/password` - Change password
- `POST /api/settings/avatar` - Upload avatar
- `DELETE /api/settings/avatar` - Remove avatar
- `DELETE /api/settings/account` - Delete account

---

## Database Schema

### Tables
- **users** - User accounts (username, email, password_hash, avatar)
- **bookmarks** - Saved links (url, title, description, og_image, is_public)
- **tags** - Tag definitions (name)
- **bookmark_tags** - Many-to-many (bookmark_id, tag_id)
- **follows** - Social graph (follower_id, following_id)
- **user_preferences** - Settings (default_public)

All foreign keys have `ON DELETE CASCADE` for data integrity.

---

## Keyboard Shortcuts

- `N` - New bookmark (when not typing)
- `Esc` - Close modal
- More coming soon...

---

## Environment Variables

```bash
# Required
NODE_ENV=production
JWT_SECRET=your-64-char-secret-here

# Optional (with defaults)
PORT=3000
ALLOWED_ORIGINS=https://onlylinks.id
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=5
```

Generate strong JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Contributing

This is a personal project, but feel free to:
- Report bugs via Issues
- Suggest features via Discussions
- Fork and experiment

---

## License

MIT License - See [LICENSE](./LICENSE)

---

## Acknowledgments

- Inspired by the original **del.icio.us** (2003-2017)
- Design philosophy influenced by **Pinboard**, **Linear**, and **Are.na**
- Built with the **impeccable** design system

---

## Contact

- **Website:** https://onlylinks.id
- **Email:** privacy@onlylinks.id
- **GitHub:** [@kardelly](https://github.com/kardelly)

---

**Made with 🔖 by Anderson Cardelli Façanha**
