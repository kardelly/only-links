# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, **do not open a public issue**.

Please email **kardelly@gmail.com** with:
- A description of the vulnerability
- Steps to reproduce
- Potential impact

You'll receive a response within 48 hours. Responsible disclosure is appreciated.

---

## Implemented Security Measures

### Authentication
- JWT tokens in httpOnly, Secure, SameSite=Strict cookies (no JS access)
- `password_version` field on users — incremented on every password change, invalidating all previously issued tokens
- Bcrypt password hashing (10 rounds)
- 7-day token lifetime

### Rate Limiting
- **Auth endpoints** (`/login`, `/register`, `/reset-password`): 5–10 req / 15 min per IP
- **Search & metadata** (`/api/users`, `/api/metadata`, `/api/auth/check-username`): 60 req / min per IP
- Failed requests count toward the limit; successful ones do not

### Input Validation
- Username: 3–30 chars, alphanumeric + `_` `-` only
- Password: minimum 8 characters
- URL: max 2048 chars, valid format required
- Title: max 500 chars — Description: max 2000 chars
- Pagination capped at 100 items per request

### File Uploads
- Avatar uploads validated by magic bytes (JPEG, PNG, WebP only — extension alone is not trusted)
- Size limit enforced by Multer

### SSRF Protection
- `/api/metadata` blocks requests to private/loopback IP ranges before fetching external URLs

### XSS Protection
- All user content rendered via `textContent` or `escapeHtml()` — no raw innerHTML with user data
- Strict Content Security Policy via Helmet

### Destructive Actions
- Deleting all bookmarks or deleting account requires password confirmation in the request body, verified server-side with bcrypt

### Transport & Headers
- HSTS enabled in production (1 year, includeSubDomains)
- X-Frame-Options, X-Content-Type-Options, Referrer-Policy via Helmet
- CORS restricted to `ALLOWED_ORIGINS`
- Body size capped at 1 MB

### Database
- All queries use parameterized statements — no SQL injection surface
- Foreign keys with `ON DELETE CASCADE`

---

## Deployment Checklist

1. Generate a strong JWT secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. Set environment variables (never commit `.env`):
   ```bash
   NODE_ENV=production
   JWT_SECRET=<generated above>
   ALLOWED_ORIGINS=https://onlylinks.id
   ```

3. Run behind HTTPS — use Nginx + Let's Encrypt or equivalent.

4. Restrict database file permissions:
   ```bash
   chmod 600 database.db
   ```

5. Keep dependencies up to date:
   ```bash
   npm audit
   npm audit fix
   ```

---

## Incident Response

**If you suspect a breach:**

1. Rotate `JWT_SECRET` immediately — this invalidates all active sessions.
2. Check for anomalous registrations or bookmarks in the database.
3. Review server logs via `pm2 logs only-links`.
4. Backup before any changes:
   ```bash
   cp database.db database-backup-$(date +%Y%m%d-%H%M%S).db
   ```

---

## References

- [OWASP Top Ten](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Helmet.js](https://helmetjs.github.io/)

---

**Last updated:** 2026-06-03
