# Security Hardening Guide

This document outlines the security improvements implemented in delicious-modern and best practices for deployment.

## ✅ Implemented Security Measures

### 1. Environment Variables & Secrets Management
- **JWT_SECRET validation**: Server refuses to start without a valid secret (min 32 characters)
- **No hardcoded secrets**: All sensitive values come from environment variables
- **.env.example provided**: Template for required configuration
- **.gitignore configured**: Prevents accidental commit of secrets

### 2. Rate Limiting
- **Auth endpoint protection**: 5 attempts per IP per 15 minutes on `/api/auth/login` and `/api/auth/register`
- **Skip successful requests**: Only failed attempts count toward the limit
- **Configurable**: Adjust via `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS`

### 3. Secure Cookies
- **Auto-detection**: `secure` flag automatically enabled in `NODE_ENV=production`
- **httpOnly**: Cookies not accessible via JavaScript (XSS protection)
- **sameSite=strict**: CSRF protection

### 4. Helmet.js Security Headers
- **Content Security Policy (CSP)**: Restricts resource loading origins
- **HSTS**: Forces HTTPS in production (31536000s / 1 year)
- **X-Frame-Options**: Clickjacking protection
- **X-Content-Type-Options**: MIME-sniffing prevention

### 5. CORS Configuration
- **Whitelist-based**: Only allowed origins can access the API
- **Environment-aware**: Configure via `ALLOWED_ORIGINS` env var
- **Credentials support**: Allows cookies in cross-origin requests

### 6. Input Validation & Sanitization
- **Username validation**: 3-30 chars, alphanumeric + underscores/hyphens only
- **Password strength**: Minimum 8 characters (increased from 6)
- **URL validation**: Max 2048 chars, proper format checking
- **Length limits**: Title (500), description (2000), tags (500)
- **Pagination caps**: Max 100 items per page to prevent DoS

### 7. Existing Good Practices (Maintained)
- **Bcrypt password hashing**: Salt rounds = 10
- **JWT with expiration**: 7-day token lifetime
- **Prepared statements**: All SQL queries use parameterized queries (no SQL injection risk)
- **HTML entity decoding**: Proper handling of scraped metadata

---

## 🚀 Deployment Checklist

### Before Going to Production

1. **Generate a Strong JWT Secret**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
   Update `.env` with the generated value.

2. **Set NODE_ENV**
   ```bash
   export NODE_ENV=production
   ```
   This automatically:
   - Enables `secure` cookies (requires HTTPS)
   - Tightens error messages
   - Activates HSTS headers

3. **Configure CORS Origins**
   ```bash
   # .env
   ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   ```

4. **Set Up HTTPS/TLS**
   - Use a reverse proxy (Nginx, Caddy) with Let's Encrypt
   - Or deploy behind a service with automatic SSL (Vercel, Netlify, Railway)

5. **Database Permissions**
   ```bash
   chmod 600 delicious.db
   ```
   Ensure only the application user can read/write the database.

6. **Review CSP Policy**
   If you add external resources (CDNs, analytics), update the CSP in `server.js`:
   ```javascript
   contentSecurityPolicy: {
     directives: {
       scriptSrc: ["'self'", "https://trusted-cdn.com"],
       // ... other directives
     }
   }
   ```

7. **Enable Process Manager**
   Use PM2 or systemd to keep the server running:
   ```bash
   npm install -g pm2
   pm2 start server.js --name delicious-modern
   pm2 save
   pm2 startup
   ```

8. **Monitor Logs**
   Watch for suspicious patterns:
   ```bash
   pm2 logs delicious-modern
   ```

---

## 🔒 Additional Recommendations

### Short-Term Improvements

1. **Add Request Logging**
   ```bash
   npm install morgan
   ```
   ```javascript
   import morgan from 'morgan';
   app.use(morgan('combined'));
   ```

2. **Implement Account Lockout**
   After 10 failed login attempts, lock the account for 1 hour.

3. **Add Email Verification**
   Require email confirmation before activating accounts.

4. **Two-Factor Authentication (2FA)**
   Use TOTP (Time-based One-Time Password) via libraries like `speakeasy`.

### Long-Term Improvements

1. **Database Encryption at Rest**
   Use SQLCipher for encrypted SQLite databases.

2. **Session Management**
   - Implement session revocation (store active tokens in Redis)
   - Add "logout all devices" functionality
   - Shorter token lifetimes (1 hour) with refresh tokens

3. **Security Scanning**
   ```bash
   npm audit
   npm audit fix
   ```
   Run regularly and update dependencies.

4. **Penetration Testing**
   Hire a security professional or use tools like:
   - OWASP ZAP (automated scanner)
   - Burp Suite (manual testing)

5. **Web Application Firewall (WAF)**
   Deploy behind Cloudflare or AWS WAF for DDoS protection.

---

## 🛡️ Security Incident Response

If you suspect a breach:

1. **Rotate JWT_SECRET immediately**
   - This invalidates all existing tokens
   - All users will need to log in again

2. **Check Database for Anomalies**
   ```sql
   -- Recent user registrations
   SELECT * FROM users ORDER BY created_at DESC LIMIT 100;
   
   -- Bookmarks with suspicious URLs
   SELECT * FROM bookmarks WHERE url LIKE '%<script%' OR url LIKE '%javascript:%';
   ```

3. **Review Server Logs**
   Look for:
   - Repeated 401/403 errors (brute-force attempts)
   - Unusual request patterns
   - Large payloads (DoS attempts)

4. **Backup and Restore**
   ```bash
   # Backup
   cp delicious.db delicious-backup-$(date +%Y%m%d-%H%M%S).db
   
   # Restore
   cp delicious-backup-TIMESTAMP.db delicious.db
   ```

---

## 📚 References

- [OWASP Top Ten](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Helmet.js Documentation](https://helmetjs.github.io/)

---

## 🐛 Reporting Security Issues

If you discover a security vulnerability, please email security@yourdomain.com instead of opening a public issue. We will respond within 48 hours.

---

**Last Updated**: 2026-05-28
**Version**: 1.1.0 (Security Hardened)
