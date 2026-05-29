# Privacy Policy

**Last Updated:** May 2026

We believe the internet should be about curating knowledge, not tracking people. Because our philosophy is "only links," we collect the minimum data required to run this service.

What we collect, how we use it, and your control over it.

---

## 1. Information We Collect

We only collect data strictly necessary to provide a functional social bookmarking experience.

### Account Information
When you register, we collect:
- Username (3-30 characters, public)
- Email address (for account recovery and security notifications)
- Password (securely hashed with bcrypt, never stored in plain text)

### User-Generated Content
We store the bookmarks you create:
- URLs you save
- Titles and descriptions you write
- Tags you assign
- Public/private visibility preference
- Open Graph images (automatically fetched from links)
- Timestamps (when bookmarks were created)

### Social Graph
If you choose to follow other users:
- List of users you follow
- List of users who follow you
- Timestamps of follow relationships

### Technical Log Data
Our servers automatically log:
- IP addresses (for abuse prevention)
- Browser type and version
- Request timestamps
- HTTP status codes

This data is used solely to maintain security, prevent abuse, and ensure server stability.

---

## 2. How We Use Your Information

We use your data to make onlylinks.id work:

- **Authentication**: Log you in and maintain your session (7-day JWT tokens)
- **Content Display**: Show your bookmarks in feeds and search results
- **Social Features**: Display your public bookmarks to other users and show your followers/following lists
- **Security**: Detect and prevent abuse, rate-limit suspicious activity
- **Communication**: Send critical account notifications (password resets, security alerts)

**We do not:**
- Sell, rent, or monetize your personal data
- Track you across the web
- Use your data for advertising
- Share your browsing habits with third parties
- Analyze your bookmarks for profiling or targeting

---

## 3. Cookies and Local Storage

We don't use third-party tracking cookies or advertising pixels.

### What We Use
- **Session cookies**: Keep you logged in (httpOnly, secure in production, sameSite=strict)
- **Local storage**: Store UI preferences (theme, sidebar state)

These are essential first-party mechanisms only. No analytics, no trackers.

---

## 4. Data Sharing

We do not share your data with third parties, except:

### Infrastructure Providers
We use trusted hosting to run our servers. These providers have access to our database solely for hosting:
- Database hosting (SQLite on server infrastructure)
- File storage (avatar uploads)
- Server hosting

These providers are bound by their own privacy policies and security standards.

### Legal Compliance
We will only disclose information if required by:
- Valid legal process (subpoena, court order)
- Law enforcement with proper jurisdiction
- Protection of our rights or others' safety

We will notify you of such requests unless legally prohibited.

---

## 5. Your Rights

You control your data. At any time, you can:

### Access and Modification
- View all bookmarks you've saved
- Edit titles, descriptions, tags, and visibility settings
- Update your username, email, or password
- Upload or remove your profile avatar

### Deletion
**Delete individual bookmarks**: Permanent removal from our database.

**Delete your account**: All your data is permanently deleted:
- Profile information (username, email, password hash)
- All saved bookmarks and tags
- Social graph (followers/following relationships)
- Uploaded avatar images
- Session tokens (immediate logout across all devices)

Deletion is immediate and irreversible. We do not keep backups of deleted user data.

---

## 6. Data Retention

### Active Accounts
We retain your data as long as your account is active.

### Deleted Accounts
Upon account deletion, all data is immediately purged from our active database. We do not maintain "soft deletes" or recovery periods.

### Technical Logs
Server logs are retained for 30 days for security monitoring, then automatically deleted.

---

## 7. Security

We take data protection seriously:

- **Password hashing**: Bcrypt with 10 salt rounds
- **HTTPS encryption**: All traffic encrypted in transit
- **Secure cookies**: httpOnly, secure (in production), sameSite=strict
- **Rate limiting**: 5 failed login attempts per IP per 15 minutes
- **Input validation**: All user input sanitized against XSS and SQL injection
- **Security headers**: Helmet.js with CSP, HSTS, X-Frame-Options
- **Foreign key constraints**: Database-level data integrity

No method of internet transmission is 100% secure. We continuously monitor and improve our security posture.

---

## 8. Children's Privacy

onlylinks.id is not intended for users under 13 years of age. We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, contact us immediately at privacy@onlylinks.id.

---

## 9. International Users

onlylinks.id is operated from [your jurisdiction]. If you access our service from outside this region, your data will be transferred to and processed in [your jurisdiction]. By using onlylinks.id, you consent to this transfer.

---

## 10. Changes to This Policy

We may update this Privacy Policy to reflect service changes or legal requirements. 

When we make changes:
- **Minor updates**: Posted here with updated date
- **Material changes**: Notification via email and prominent website notice at least 30 days before taking effect

Your continued use after changes indicates acceptance. If you disagree, delete your account before the effective date.

---

## 11. Data Portability

You can export your data at any time:
- **Bookmarks**: JSON export of all your links, tags, and metadata
- **Profile**: Copy of your account information

Contact us at privacy@onlylinks.id to request an export.

---

## 12. Contact

Questions about how we handle your data?

**Email:** privacy@onlylinks.id  
**Response time:** Within 48 hours for privacy inquiries

For security vulnerabilities, email security@onlylinks.id (see SECURITY.md for responsible disclosure guidelines).

---

**Effective Date:** May 29, 2026  
**Version:** 1.0
