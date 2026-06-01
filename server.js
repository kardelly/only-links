import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';

import {
  dbPromise,
  getUserByUsername,
  getUserByEmail,
  createUser,
  getUserById,
  getUserProfile,
  createBookmark,
  updateBookmark,
  deleteBookmark,
  getBookmarks,
  getPopularTags,
  getUserPreferences,
  updateUserPreferences,
  updateUserPassword,
  updateUserEmail,
  updateUsername,
  updateUserAvatar,
  deleteUser,
  deleteAllUserBookmarks,
  followUser,
  unfollowUser,
  isFollowing,
  getFollowingCount,
  getFollowersCount,
  createPasswordResetToken,
  getUserByResetToken,
  deletePasswordResetToken,
  cleanupExpiredResetTokens
} from './database.js';

// ==========================================
// ENVIRONMENT VALIDATION
// ==========================================
function validateEnvironment() {
  const required = ['JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('\n❌ CRITICAL: Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nCreate a .env file based on .env.example and set all required variables.\n');
    process.exit(1);
  }

  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET.length < 32) {
    console.error('\n❌ CRITICAL: JWT_SECRET must be at least 32 characters long.');
    console.error('Generate a strong secret with:');
    console.error('   node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"\n');
    process.exit(1);
  }
}

validateEnvironment();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// SECURITY MIDDLEWARES
// ==========================================

// Trust proxy - needed when behind nginx/reverse proxy
app.set('trust proxy', 1);

// Helmet - Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.tailwindcss.com",
        "https://www.googletagmanager.com",
        "https://www.google-analytics.com"
      ],
      connectSrc: [
        "'self'",
        "https://www.google-analytics.com",
        "https://analytics.google.com",
        "https://stats.g.doubleclick.net",
        "https://www.google.com"
      ]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Rate Limiting for Auth Endpoints
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5,
  message: { error: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for successful requests to avoid punishing legitimate users
  skipSuccessfulRequests: true
});

// Standard Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ==========================================
// PWA ROUTES (Must be BEFORE static middleware)
// ==========================================

// Serve manifest with correct MIME type
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.sendFile(path.join(__dirname, 'public/manifest.json'));
});

// Serve Service Worker with correct headers
app.get('/sw.js', (req, res) => {
  res.set('Service-Worker-Allowed', '/');
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, 'public/sw.js'));
});

// Serve mobile app
app.get('/mobile/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/mobile/mobile-app.html'));
});

// Share target handler
app.get('/share-target', (req, res) => {
  // Just serve the app, JavaScript will handle params
  res.sendFile(path.join(__dirname, 'public/mobile/mobile-app.html'));
});

// Serve Static Frontend Assets
app.use(express.static(path.join(__dirname, 'public')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'public', 'uploads', 'avatars');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Configuration for Avatar Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${req.user.id}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  }
});

// ==========================================
// INPUT VALIDATION UTILITIES
// ==========================================

/**
 * Validates and sanitizes username input
 */
function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }

  const cleaned = username.trim();

  if (cleaned.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters long' };
  }

  if (cleaned.length > 30) {
    return { valid: false, error: 'Username must be at most 30 characters long' };
  }

  // Only allow alphanumeric, underscores, and hyphens
  if (!/^[a-zA-Z0-9_-]+$/.test(cleaned)) {
    return { valid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }

  return { valid: true, value: cleaned.toLowerCase() };
}

/**
 * Validates password strength
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password must be at most 128 characters long' };
  }

  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one letter' };
  }

  // Must contain at least one number
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }

  // Must contain at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character (!@#$%^&*...)' };
  }

  return { valid: true, value: password };
}

/**
 * Validates email format
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const cleaned = email.trim().toLowerCase();

  if (cleaned.length < 3) {
    return { valid: false, error: 'Email is too short' };
  }

  if (cleaned.length > 254) {
    return { valid: false, error: 'Email is too long' };
  }

  // Basic email regex validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleaned)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true, value: cleaned };
}

/**
 * Validates and sanitizes URL input
 */
function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  let cleaned = url.trim();

  if (cleaned.length > 2048) {
    return { valid: false, error: 'URL is too long (max 2048 characters)' };
  }

  // Add https:// if no protocol specified
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = 'https://' + cleaned;
  }

  // Validate URL format
  try {
    new URL(cleaned);
    return { valid: true, value: cleaned };
  } catch (e) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validates and sanitizes text input (title, description)
 */
function validateText(text, fieldName, minLength = 0, maxLength = 1000) {
  if (!text || typeof text !== 'string') {
    if (minLength === 0) {
      return { valid: true, value: '' };
    }
    return { valid: false, error: `${fieldName} is required` };
  }

  const cleaned = text.trim();

  if (cleaned.length < minLength) {
    return { valid: false, error: `${fieldName} must be at least ${minLength} characters long` };
  }

  if (cleaned.length > maxLength) {
    return { valid: false, error: `${fieldName} must be at most ${maxLength} characters long` };
  }

  return { valid: true, value: cleaned };
}

// ==========================================
// AUTHENTICATION MIDDLEWARE
// ==========================================

function authenticate(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Session expired or not logged in' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.clearCookie('token');
    return res.status(401).json({ error: 'Unauthorized: Invalid session token' });
  }
}

// Optional Authentication Middleware for public endpoints
function optionalAuthenticate(req, res, next) {
  const token = req.cookies.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // Ignore token errors, let user proceed as guest
    }
  }
  next();
}

// Cookie configuration helper
function getCookieConfig() {
  return {
    httpOnly: true,
    secure: IS_PRODUCTION, // Automatic based on NODE_ENV
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };
}

// ==========================================
// 1. AUTHENTICATION API ENDPOINTS
// ==========================================

// GET /api/auth/me - Get current logged in user details
app.get('/api/auth/me', optionalAuthenticate, async (req, res) => {
  if (!req.user) {
    return res.json({ user: null });
  }
  try {
    const user = await getUserById(req.user.id);
    if (!user) {
      res.clearCookie('token');
      return res.json({ user: null });
    }
    res.json({ user });
  } catch (err) {
    console.error('Get User Error:', err);
    res.status(500).json({ error: 'Internal server error while fetching user details' });
  }
});

// POST /api/auth/register - Register a new user
app.post('/api/auth/register', authLimiter, async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  // Validate username
  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    return res.status(400).json({ error: usernameValidation.error });
  }

  // Validate email
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return res.status(400).json({ error: emailValidation.error });
  }

  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({ error: passwordValidation.error });
  }

  // Validate password confirmation
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  try {
    // Check if username already exists
    const existingUsername = await getUserByUsername(usernameValidation.value);
    if (existingUsername) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    // Check if email already exists
    const existingEmail = await getUserByEmail(emailValidation.value);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(passwordValidation.value, salt);

    const userId = await createUser(usernameValidation.value, emailValidation.value, passwordHash);

    // Auto-login after registration
    const token = jwt.sign(
      { id: userId, username: usernameValidation.value },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, getCookieConfig());

    res.status(201).json({
      message: 'Registration successful',
      user: { id: userId, username: usernameValidation.value }
    });
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ error: 'Failed to register user due to database error' });
  }
});

// POST /api/auth/login - Login user (accepts username or email)
app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Please enter username/email and password' });
  }

  try {
    const identifier = username.toLowerCase().trim();
    let user = null;

    // Try to find user by username first
    user = await getUserByUsername(identifier);

    // If not found, try by email
    if (!user) {
      user = await getUserByEmail(identifier);
    }

    // If still not found, return error
    if (!user) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    // Create session token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, getCookieConfig());

    res.json({
      message: 'Logged in successfully',
      user: { id: user.id, username: user.username }
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'Failed to login due to server error' });
  }
});

// POST /api/auth/logout - Logout user
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/check-username - Check username availability
app.get('/api/auth/check-username', async (req, res) => {
  const { username } = req.query;

  // Validate username format
  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    return res.json({ available: false, error: usernameValidation.error });
  }

  try {
    const existing = await getUserByUsername(usernameValidation.value);
    if (existing) {
      return res.json({ available: false, error: 'Username is already taken' });
    }

    res.json({ available: true });
  } catch (err) {
    console.error('Check Username Error:', err);
    res.status(500).json({ available: false, error: 'Error checking username' });
  }
});

// POST /api/auth/request-password-reset - Request password reset
app.post('/api/auth/request-password-reset', authLimiter, async (req, res) => {
  const { usernameOrEmail } = req.body;

  if (!usernameOrEmail) {
    return res.status(400).json({ error: 'Please enter your username or email' });
  }

  try {
    const identifier = usernameOrEmail.toLowerCase().trim();
    let user = await getUserByUsername(identifier);

    if (!user) {
      user = await getUserByEmail(identifier);
    }

    // Always return success to prevent user enumeration
    if (!user) {
      return res.json({
        message: 'If an account exists with that username/email, a password reset link has been generated.',
        resetToken: null
      });
    }

    // Generate reset token
    const crypto = await import('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Store token in database (expires in 1 hour)
    await createPasswordResetToken(user.id, resetToken, 60);

    // In a real app, this would be emailed. For now, return it in response (development only)
    res.json({
      message: 'Password reset token generated successfully',
      resetToken: resetToken,
      username: user.username
    });
  } catch (err) {
    console.error('Request Password Reset Error:', err);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// POST /api/auth/reset-password - Reset password with token
app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  // Validate password
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    return res.status(400).json({ error: passwordValidation.error });
  }

  try {
    // Verify token and get user ID
    const userId = await getUserByResetToken(token);

    if (!userId) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await updateUserPassword(userId, hashedPassword);

    // Delete used token
    await deletePasswordResetToken(token);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset Password Error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ==========================================
// 2. BOOKMARKS API ENDPOINTS
// ==========================================

// GET /api/bookmarks - Get bookmarks with advanced search/filtering and pagination
app.get('/api/bookmarks', optionalAuthenticate, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10)); // Cap at 100
  const search = req.query.q || null;
  const tag = req.query.tag || null;
  const tags = req.query.tags || null; // Multiple tags support
  const feedType = req.query.feedType || 'all'; // 'all', 'mine', 'network'
  const filterByUsername = req.query.user || null;

  console.log('[/api/bookmarks] req.user:', req.user, 'feedType:', feedType, 'cookies:', req.cookies);

  let userIdFilter = null;

  // Filter by specific username (for profile pages)
  if (filterByUsername) {
    const targetUser = await getUserByUsername(filterByUsername);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    userIdFilter = targetUser.id;
  }

  try {
    const data = await getBookmarks({
      userId: userIdFilter,
      search,
      tag: tags || tag, // Use tags if provided, fallback to tag for backward compatibility
      page,
      limit,
      currentUserId: req.user ? req.user.id : null,
      feedType: feedType
    });
    res.json(data);
  } catch (err) {
    console.error('Fetch Bookmarks Error:', err);
    res.status(500).json({ error: 'Failed to retrieve bookmarks' });
  }
});

// POST /api/bookmarks/fetch-images - Fetch images for bookmarks without og_image (background task)
app.post('/api/bookmarks/fetch-images', authenticate, async (req, res) => {
  try {
    // Get all user's bookmarks without og_image
    const db = await dbPromise;
    const bookmarks = await db.all(
      'SELECT id, url FROM bookmarks WHERE user_id = ? AND (og_image IS NULL OR og_image = "")',
      [req.user.id]
    );

    // Return immediately - processing will happen in background
    res.json({
      message: 'Image fetching started in background',
      count: bookmarks.length
    });

    // Process in background (don't await)
    (async () => {
      let updated = 0;
      for (const bookmark of bookmarks) {
        try {
          const metadata = await fetchUrlMetadata(bookmark.url);
          if (metadata.og_image) {
            await db.run(
              'UPDATE bookmarks SET og_image = ? WHERE id = ?',
              [metadata.og_image, bookmark.id]
            );
            updated++;
          }
        } catch (err) {
          console.log(`Failed to fetch image for bookmark ${bookmark.id}:`, err.message);
        }
        // Small delay to avoid hammering servers
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      console.log(`Background image fetch complete: ${updated}/${bookmarks.length} updated`);
    })();

  } catch (err) {
    console.error('Fetch images error:', err);
    res.status(500).json({ error: 'Failed to start image fetching' });
  }
});

// POST /api/bookmarks - Create a new bookmark
app.post('/api/bookmarks', authenticate, async (req, res) => {
  const { url, title, description, tags, is_public, og_image } = req.body;

  // Validate URL
  const urlValidation = validateUrl(url);
  if (!urlValidation.valid) {
    return res.status(400).json({ error: urlValidation.error });
  }

  // Validate title
  const titleValidation = validateText(title, 'Title', 1, 500);
  if (!titleValidation.valid) {
    return res.status(400).json({ error: titleValidation.error });
  }

  // Validate description (optional)
  const descValidation = validateText(description, 'Description', 0, 2000);
  if (!descValidation.valid) {
    return res.status(400).json({ error: descValidation.error });
  }

  // Validate tags (optional)
  const tagsValidation = validateText(tags, 'Tags', 0, 500);
  if (!tagsValidation.valid) {
    return res.status(400).json({ error: tagsValidation.error });
  }

  try {
    const bookmarkId = await createBookmark(req.user.id, {
      url: urlValidation.value,
      title: titleValidation.value,
      description: descValidation.value,
      tags: tagsValidation.value,
      is_public: is_public !== undefined ? (is_public ? 1 : 0) : 1,
      og_image: og_image || null
    });

    res.status(201).json({
      message: 'Bookmark created successfully',
      bookmarkId
    });
  } catch (err) {
    console.error('Create Bookmark Error:', err);
    res.status(500).json({ error: 'Failed to create bookmark due to database error' });
  }
});

// PUT /api/bookmarks/:id - Update an existing bookmark
app.put('/api/bookmarks/:id', authenticate, async (req, res) => {
  const bookmarkId = parseInt(req.params.id);
  const { url, title, description, tags, is_public, og_image } = req.body;

  if (isNaN(bookmarkId) || bookmarkId < 1) {
    return res.status(400).json({ error: 'Invalid bookmark ID' });
  }

  // Validate URL
  const urlValidation = validateUrl(url);
  if (!urlValidation.valid) {
    return res.status(400).json({ error: urlValidation.error });
  }

  // Validate title
  const titleValidation = validateText(title, 'Title', 1, 500);
  if (!titleValidation.valid) {
    return res.status(400).json({ error: titleValidation.error });
  }

  // Validate description (optional)
  const descValidation = validateText(description, 'Description', 0, 2000);
  if (!descValidation.valid) {
    return res.status(400).json({ error: descValidation.error });
  }

  // Validate tags (optional)
  const tagsValidation = validateText(tags, 'Tags', 0, 500);
  if (!tagsValidation.valid) {
    return res.status(400).json({ error: tagsValidation.error });
  }

  try {
    await updateBookmark(bookmarkId, req.user.id, {
      url: urlValidation.value,
      title: titleValidation.value,
      description: descValidation.value,
      tags: tagsValidation.value,
      is_public: is_public !== undefined ? (is_public ? 1 : 0) : undefined,
      og_image: og_image !== undefined ? og_image : undefined
    });
    res.json({ message: 'Bookmark updated successfully' });
  } catch (err) {
    console.error('Update Bookmark Error:', err);
    if (err.message === 'Bookmark not found or unauthorized') {
      return res.status(403).json({ error: 'Access denied: bookmark not found or unauthorized' });
    }
    res.status(500).json({ error: 'Failed to update bookmark' });
  }
});

// DELETE /api/bookmarks/:id - Delete a bookmark
app.delete('/api/bookmarks/:id', authenticate, async (req, res) => {
  const bookmarkId = parseInt(req.params.id);

  if (isNaN(bookmarkId) || bookmarkId < 1) {
    return res.status(400).json({ error: 'Invalid bookmark ID' });
  }

  try {
    await deleteBookmark(bookmarkId, req.user.id);
    res.json({ message: 'Bookmark deleted successfully' });
  } catch (err) {
    console.error('Delete Bookmark Error:', err);
    if (err.message === 'Bookmark not found or unauthorized') {
      return res.status(403).json({ error: 'Access denied: bookmark not found or unauthorized' });
    }
    res.status(500).json({ error: 'Failed to delete bookmark' });
  }
});

// ==========================================
// 3. TAGS API ENDPOINTS
// ==========================================

// GET /api/tags - Get all popular tags with counts
app.get('/api/tags', async (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
  try {
    const tags = await getPopularTags(limit);
    res.json({ tags });
  } catch (err) {
    console.error('Fetch Tags Error:', err);
    res.status(500).json({ error: 'Failed to load popular tags' });
  }
});

// ==========================================
// 4. USER PROFILE API ENDPOINTS
// ==========================================

// GET /api/users/:username - Get public user profile
app.get('/api/users/:username', optionalAuthenticate, async (req, res) => {
  const username = req.params.username;

  try {
    const profile = await getUserProfile(username);

    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if current user is following this profile
    let isFollowingUser = false;
    if (req.user && req.user.id !== profile.id) {
      isFollowingUser = await isFollowing(req.user.id, profile.id);
    }

    // Get following/followers count
    const followingCount = await getFollowingCount(profile.id);
    const followersCount = await getFollowersCount(profile.id);

    res.json({
      user: {
        ...profile,
        isFollowing: isFollowingUser,
        followingCount,
        followersCount
      }
    });
  } catch (err) {
    console.error('Get User Profile Error:', err);
    res.status(500).json({ error: 'Failed to load user profile' });
  }
});

// POST /api/users/:username/follow - Follow a user
app.post('/api/users/:username/follow', authenticate, async (req, res) => {
  const username = req.params.username;

  try {
    const targetUser = await getUserByUsername(username);

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    await followUser(req.user.id, targetUser.id);

    res.json({ message: 'Followed successfully' });
  } catch (err) {
    console.error('Follow User Error:', err);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// DELETE /api/users/:username/follow - Unfollow a user
app.delete('/api/users/:username/follow', authenticate, async (req, res) => {
  const username = req.params.username;

  try {
    const targetUser = await getUserByUsername(username);

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await unfollowUser(req.user.id, targetUser.id);

    res.json({ message: 'Unfollowed successfully' });
  } catch (err) {
    console.error('Unfollow User Error:', err);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

// GET /api/users/:username/followers - Get list of followers
app.get('/api/users/:username/followers', async (req, res) => {
  const username = req.params.username;

  try {
    const user = await getUserByUsername(username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const db = await dbPromise;
    const followers = await db.all(`
      SELECT u.id, u.username, u.avatar, u.created_at
      FROM users u
      INNER JOIN follows f ON f.follower_id = u.id
      WHERE f.following_id = ?
      ORDER BY f.created_at DESC
    `, [user.id]);

    res.json({ followers });
  } catch (err) {
    console.error('Get Followers Error:', err);
    res.status(500).json({ error: 'Failed to load followers' });
  }
});

// GET /api/users/:username/following - Get list of users this user is following
app.get('/api/users/:username/following', async (req, res) => {
  const username = req.params.username;

  try {
    const user = await getUserByUsername(username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const db = await dbPromise;
    const following = await db.all(`
      SELECT u.id, u.username, u.avatar, u.created_at
      FROM users u
      INNER JOIN follows f ON f.following_id = u.id
      WHERE f.follower_id = ?
      ORDER BY f.created_at DESC
    `, [user.id]);

    res.json({ following });
  } catch (err) {
    console.error('Get Following Error:', err);
    res.status(500).json({ error: 'Failed to load following' });
  }
});

// Helper: Decode standard HTML entities from crawled metadata
function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// GET /api/metadata - Crawler to extract metadata from a submitted URL
app.get('/api/metadata', authenticate, async (req, res) => {
  const targetUrl = req.query.url;

  const urlValidation = validateUrl(targetUrl);
  if (!urlValidation.valid) {
    return res.status(400).json({ error: urlValidation.error });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout limit

    const response = await fetch(urlValidation.value, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();

    // 1. Scrape Title
    let title = '';
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }
    if (!title) {
      const ogTitleMatch = html.match(/<meta[^>]+(?:property|name)=["']og:title["'][^>]+content=["']([^"']*)["']/i) ||
                            html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']og:title["']/i);
      if (ogTitleMatch && ogTitleMatch[1]) {
        title = ogTitleMatch[1].trim();
      }
    }

    // 2. Scrape Description
    let description = '';
    const descMatch = html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']*)["']/i) ||
                      html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["'](?:description|og:description)["']/i);
    if (descMatch && descMatch[1]) {
      description = descMatch[1].trim();
    }

    // 3. Scrape Keywords
    let tags = '';
    const keywordsMatch = html.match(/<meta[^>]+(?:name|property)=["'](?:keywords|og:tags)["'][^>]+content=["']([^"']*)["']/i) ||
                          html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["'](?:keywords|og:tags)["']/i);
    if (keywordsMatch && keywordsMatch[1]) {
      tags = keywordsMatch[1].trim();
    }

    // 4. Scrape og:image
    let og_image = '';
    const ogImageMatch = html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']*)["']/i) ||
                         html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']og:image["']/i);
    if (ogImageMatch && ogImageMatch[1]) {
      og_image = ogImageMatch[1].trim();

      // Convert relative URLs to absolute
      if (og_image.startsWith('/')) {
        const baseUrl = new URL(urlValidation.value);
        og_image = `${baseUrl.protocol}//${baseUrl.host}${og_image}`;
      } else if (og_image.startsWith('//')) {
        const baseUrl = new URL(urlValidation.value);
        og_image = `${baseUrl.protocol}${og_image}`;
      }
    }

    res.json({
      title: decodeHtmlEntities(title),
      description: decodeHtmlEntities(description),
      tags: decodeHtmlEntities(tags),
      og_image: og_image
    });

  } catch (err) {
    console.error(`Metadata fetch error:`, err.message);
    res.status(500).json({ error: 'Failed to retrieve site metadata' });
  }
});

// ==========================================
// 5. SETTINGS API ENDPOINTS
// ==========================================

// GET /api/settings/preferences - Get user preferences
app.get('/api/settings/preferences', authenticate, async (req, res) => {
  try {
    const preferences = await getUserPreferences(req.user.id);
    res.json({ preferences });
  } catch (err) {
    console.error('Get Preferences Error:', err);
    res.status(500).json({ error: 'Failed to load preferences' });
  }
});

// PUT /api/settings/preferences - Update user preferences
app.put('/api/settings/preferences', authenticate, async (req, res) => {
  const { default_public } = req.body;

  try {
    await updateUserPreferences(req.user.id, { default_public });
    res.json({ message: 'Preferences updated successfully' });
  } catch (err) {
    console.error('Update Preferences Error:', err);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// PUT /api/settings/username - Update username
app.put('/api/settings/username', authenticate, async (req, res) => {
  const { username } = req.body;

  console.log('Username update request from user:', req.user.id, 'new username:', username);

  // Validate username
  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    console.log('Username validation failed:', usernameValidation.error);
    return res.status(400).json({ error: usernameValidation.error });
  }

  try {
    // Check if username is already taken by another user
    const existingUsername = await getUserByUsername(usernameValidation.value);
    if (existingUsername && existingUsername.id !== req.user.id) {
      console.log('Username already exists for user:', existingUsername.id);
      return res.status(400).json({ error: 'Username is already taken' });
    }

    await updateUsername(req.user.id, usernameValidation.value);
    console.log('Username updated successfully for user:', req.user.id);

    // Clear session cookie to force re-login with new username
    res.clearCookie('token');

    res.json({ message: 'Username updated successfully' });
  } catch (err) {
    console.error('Update Username Error:', err);
    res.status(500).json({ error: 'Failed to update username' });
  }
});

// PUT /api/settings/email - Update user email
app.put('/api/settings/email', authenticate, async (req, res) => {
  const { email } = req.body;

  console.log('Email update request from user:', req.user.id, 'new email:', email);

  // Validate email
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    console.log('Email validation failed:', emailValidation.error);
    return res.status(400).json({ error: emailValidation.error });
  }

  try {
    // Check if email is already taken by another user
    const existingEmail = await getUserByEmail(emailValidation.value);
    if (existingEmail && existingEmail.id !== req.user.id) {
      console.log('Email already exists for user:', existingEmail.id);
      return res.status(400).json({ error: 'Email is already registered' });
    }

    await updateUserEmail(req.user.id, emailValidation.value);
    console.log('Email updated successfully for user:', req.user.id);
    res.json({ message: 'Email updated successfully' });
  } catch (err) {
    console.error('Update Email Error:', err);
    res.status(500).json({ error: 'Failed to update email' });
  }
});

// PUT /api/settings/password - Change user password
app.put('/api/settings/password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  // Validate new password
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    return res.status(400).json({ error: passwordValidation.error });
  }

  try {
    // Verify current password
    const user = await getUserByUsername(req.user.username);
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(passwordValidation.value, salt);

    // Update password
    await updateUserPassword(req.user.id, newPasswordHash);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Update Password Error:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// POST /api/settings/avatar - Upload avatar
app.post('/api/settings/avatar', authenticate, (req, res) => {
  upload.single('avatar')(req, res, async (err) => {
    // Handle multer errors
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size must be less than 2MB' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const avatarPath = `/uploads/avatars/${req.file.filename}`;

      // Get user's old avatar to delete it
      const user = await getUserById(req.user.id);
      const oldAvatar = user.avatar;

      // Update database with new avatar path
      await updateUserAvatar(req.user.id, avatarPath);

      // Delete old avatar file if it exists
      if (oldAvatar && oldAvatar.startsWith('/uploads/avatars/')) {
        const oldAvatarPath = path.join(__dirname, 'public', oldAvatar);
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      }

      res.json({
        message: 'Avatar updated successfully',
        avatarPath
      });
    } catch (err) {
      console.error('Avatar Upload Error:', err);

      // Delete uploaded file on error
      if (req.file) {
        const filePath = path.join(__dirname, 'public', 'uploads', 'avatars', req.file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      res.status(500).json({ error: err.message || 'Failed to upload avatar' });
    }
  });
});

// DELETE /api/settings/avatar - Remove avatar
app.delete('/api/settings/avatar', authenticate, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    const oldAvatar = user.avatar;

    // Update database to remove avatar
    await updateUserAvatar(req.user.id, null);

    // Delete avatar file if it exists
    if (oldAvatar && oldAvatar.startsWith('/uploads/avatars/')) {
      const oldAvatarPath = path.join(__dirname, 'public', oldAvatar);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    res.json({ message: 'Avatar removed successfully' });
  } catch (err) {
    console.error('Avatar Remove Error:', err);
    res.status(500).json({ error: 'Failed to remove avatar' });
  }
});

// DELETE /api/settings/bookmarks - Delete all user bookmarks
app.delete('/api/settings/bookmarks', authenticate, async (req, res) => {
  try {
    await deleteAllUserBookmarks(req.user.id);
    res.json({ message: 'All bookmarks deleted successfully' });
  } catch (err) {
    console.error('Delete All Bookmarks Error:', err);
    res.status(500).json({ error: 'Failed to delete bookmarks' });
  }
});

// DELETE /api/settings/account - Delete user account
app.delete('/api/settings/account', authenticate, async (req, res) => {
  try {
    // Get user's avatar to delete it
    const user = await getUserById(req.user.id);
    const avatarPath = user.avatar;

    // Delete user account (cascades to bookmarks, preferences, etc.)
    await deleteUser(req.user.id);

    // Delete avatar file if it exists
    if (avatarPath && avatarPath.startsWith('/uploads/avatars/')) {
      const fullAvatarPath = path.join(__dirname, 'public', avatarPath);
      if (fs.existsSync(fullAvatarPath)) {
        fs.unlinkSync(fullAvatarPath);
      }
    }

    // Clear session cookie
    res.clearCookie('token');

    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete Account Error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// ==========================================
// FRONTEND ROUTES (Must be AFTER all API routes)
// ==========================================

// Serve the app (authenticated area)
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

// Serve user profile page
app.get('/user/:username', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// Serve settings page
app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});

// Serve static HTML pages
app.get('/bookmarklet', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'bookmarklet.html'));
});

app.get('/extension', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'extension.html'));
});

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

// Serve bookmarklet save popup
app.get('/api/bookmarklet', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'save-popup.html'));
});

// Fallback: serve index.html (landing page) for other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`\n🚀 only.link Server`);
  console.log(`   Environment: ${NODE_ENV}`);
  console.log(`   URL: http://localhost:${PORT}`);
  console.log(`   Secure cookies: ${IS_PRODUCTION ? 'enabled' : 'disabled (dev mode)'}`);
  console.log(`   CORS origins: ${allowedOrigins.join(', ')}\n`);
});
