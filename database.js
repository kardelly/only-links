import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Database Promise resolves to the opened and initialized database
export const dbPromise = open({
  filename: './database.sqlite',
  driver: sqlite3.Database
}).then(async (db) => {
  // MUST enable foreign keys in SQLite explicitly
  await db.run('PRAGMA foreign_keys = ON;');
  
  // Create schema
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      is_public INTEGER DEFAULT 1,
      og_image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookmark_tags (
      bookmark_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (bookmark_id, tag_id),
      FOREIGN KEY(bookmark_id) REFERENCES bookmarks(id) ON DELETE CASCADE,
      FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id INTEGER PRIMARY KEY,
      default_public INTEGER DEFAULT 1,
      searchable INTEGER DEFAULT 1,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS follows (
      follower_id INTEGER NOT NULL,
      following_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (follower_id, following_id),
      FOREIGN KEY(follower_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(following_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
    CREATE INDEX IF NOT EXISTS idx_bookmark_tags_tag_id ON bookmark_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
    CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
    CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
    CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);
  `);
  
  // Migration: Add is_public and og_image columns if they don't exist
  try {
    await db.run('ALTER TABLE bookmarks ADD COLUMN is_public INTEGER DEFAULT 1');
    console.log('Added is_public column to bookmarks');
  } catch (e) {
    // Column already exists, ignore
  }

  try {
    await db.run('ALTER TABLE bookmarks ADD COLUMN og_image TEXT');
    console.log('Added og_image column to bookmarks');
  } catch (e) {
    // Column already exists, ignore
  }

  // Migration: Add email column to users
  try {
    await db.run('ALTER TABLE users ADD COLUMN email TEXT');
    console.log('Added email column to users');
  } catch (e) {
    console.log('Email column migration skipped (already exists or error):', e.message);
  }

  // Create unique index on email separately
  try {
    await db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    console.log('Created unique index on email');
  } catch (e) {
    console.log('Email index creation skipped:', e.message);
  }

  // Migration: Add avatar column to users
  try {
    await db.run('ALTER TABLE users ADD COLUMN avatar TEXT');
    console.log('Added avatar column to users');
  } catch (e) {
    console.log('Avatar column migration skipped (already exists or error):', e.message);
  }

  console.log('SQLite Database and Schema initialized with foreign keys enabled.');
  return db;
});

// Helper: Get user by username
export async function getUserByUsername(username) {
  const db = await dbPromise;
  return db.get('SELECT * FROM users WHERE username = ?', [username.toLowerCase().trim()]);
}

// Helper: Get user by ID
export async function getUserById(id) {
  const db = await dbPromise;
  return db.get('SELECT id, username, email, avatar, created_at FROM users WHERE id = ?', [id]);
}

// Helper: Get user profile with statistics
export async function getUserProfile(username) {
  const db = await dbPromise;

  // Get user data
  const user = await db.get('SELECT id, username, email, avatar, created_at FROM users WHERE username = ?', [username.toLowerCase().trim()]);
  if (!user) return null;

  // Get statistics
  const stats = await db.get(`
    SELECT
      COUNT(DISTINCT b.id) as total_bookmarks,
      COUNT(DISTINCT bt.tag_id) as total_tags
    FROM bookmarks b
    LEFT JOIN bookmark_tags bt ON b.id = bt.bookmark_id
    WHERE b.user_id = ? AND b.is_public = 1
  `, [user.id]);

  return {
    ...user,
    stats: {
      bookmarks: stats.total_bookmarks || 0,
      tags: stats.total_tags || 0
    }
  };
}

// Helper: Create a new user
export async function createUser(username, email, passwordHash) {
  const db = await dbPromise;
  const result = await db.run(
    'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
    [username.toLowerCase().trim(), email.toLowerCase().trim(), passwordHash]
  );
  return result.lastID;
}

// Helper: Get user by email
export async function getUserByEmail(email) {
  const db = await dbPromise;
  return db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
}

// Helper: Link tags to a bookmark
async function associateTagsWithBookmark(db, bookmarkId, tagsString) {
  if (!tagsString) return;
  
  // Normalize and split tags by comma
  const tags = tagsString
    .split(',')
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 0);
    
  for (const tagName of tags) {
    // 1. Insert tag if it doesn't exist
    await db.run('INSERT OR IGNORE INTO tags (name) VALUES (?)', [tagName]);
    const tag = await db.get('SELECT id FROM tags WHERE name = ?', [tagName]);
    
    // 2. Link tag to bookmark
    await db.run(
      'INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)',
      [bookmarkId, tag.id]
    );
  }
}

// Helper: Create a new bookmark
export async function createBookmark(userId, { url, title, description, tags, is_public = 1, og_image = null }) {
  const db = await dbPromise;

  // We perform this in a transaction to ensure integrity
  const result = await db.run(
    'INSERT INTO bookmarks (user_id, url, title, description, is_public, og_image) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, url.trim(), title.trim(), description ? description.trim() : '', is_public, og_image]
  );

  const bookmarkId = result.lastID;
  await associateTagsWithBookmark(db, bookmarkId, tags);

  return bookmarkId;
}

// Helper: Update an existing bookmark (verifying ownership)
export async function updateBookmark(bookmarkId, userId, { url, title, description, tags, is_public, og_image }) {
  const db = await dbPromise;

  // 1. Verify ownership
  const bookmark = await db.get('SELECT id FROM bookmarks WHERE id = ? AND user_id = ?', [bookmarkId, userId]);
  if (!bookmark) {
    throw new Error('Bookmark not found or unauthorized');
  }

  // 2. Update bookmark details (only update fields that are provided)
  let updateFields = [];
  let updateValues = [];

  updateFields.push('url = ?', 'title = ?', 'description = ?');
  updateValues.push(url.trim(), title.trim(), description ? description.trim() : '');

  if (is_public !== undefined) {
    updateFields.push('is_public = ?');
    updateValues.push(is_public ? 1 : 0);
  }

  if (og_image !== undefined) {
    updateFields.push('og_image = ?');
    updateValues.push(og_image);
  }

  updateValues.push(bookmarkId);

  await db.run(
    `UPDATE bookmarks SET ${updateFields.join(', ')} WHERE id = ?`,
    updateValues
  );

  // 3. Clear existing tag associations
  await db.run('DELETE FROM bookmark_tags WHERE bookmark_id = ?', [bookmarkId]);
  
  // 4. Associate new tags
  await associateTagsWithBookmark(db, bookmarkId, tags);
  
  return true;
}

// Helper: Delete a bookmark (verifying ownership)
export async function deleteBookmark(bookmarkId, userId) {
  const db = await dbPromise;
  
  // Verify ownership
  const bookmark = await db.get('SELECT id FROM bookmarks WHERE id = ? AND user_id = ?', [bookmarkId, userId]);
  if (!bookmark) {
    throw new Error('Bookmark not found or unauthorized');
  }
  
  // Delete bookmark (cascades to bookmark_tags relations automatically)
  await db.run('DELETE FROM bookmarks WHERE id = ?', [bookmarkId]);
  
  // Clean up unused tags (optional garbage collection)
  await db.run(`
    DELETE FROM tags 
    WHERE id NOT IN (SELECT DISTINCT tag_id FROM bookmark_tags)
  `);
  
  return true;
}

// Helper: Get bookmarks with advanced filtering (search, tag, user) and pagination
export async function getBookmarks({ userId, search, tag, page = 1, limit = 10, currentUserId = null, feedType = 'all' }) {
  const db = await dbPromise;
  const offset = (page - 1) * limit;

  const whereClauses = [];
  const params = [];

  console.log('[getBookmarks] feedType:', feedType, 'currentUserId:', currentUserId, 'userId:', userId);

  // Feed type logic (feedType takes precedence over userId)
  if (feedType === 'mine' && currentUserId) {
    // My bookmarks: all my bookmarks (public + private)
    whereClauses.push('b.user_id = ?');
    params.push(currentUserId);
    console.log('[getBookmarks] Mine feed - filtering by currentUserId:', currentUserId);
  } else if (feedType === 'network' && currentUserId) {
    // Network: bookmarks from users I follow (public only)
    whereClauses.push(`b.user_id IN (
      SELECT following_id FROM follows WHERE follower_id = ?
    )`);
    whereClauses.push('b.is_public = 1');
    params.push(currentUserId);
  } else if (feedType === 'all' || !feedType) {
    // All bookmarks: global public feed (unless viewing a specific user profile)
    if (userId) {
      // Viewing someone's profile
      whereClauses.push('b.user_id = ?');
      params.push(userId);

      // Show private bookmarks only if viewing your own profile
      if (!currentUserId || currentUserId !== userId) {
        whereClauses.push('b.is_public = 1');
      }
    } else {
      // Global feed: only public
      whereClauses.push('b.is_public = 1');
    }
  }
  
  if (tag) {
    // Support multiple tags separated by comma
    const tags = tag.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);

    if (tags.length === 1) {
      // Single tag - simple query
      whereClauses.push(`
        b.id IN (
          SELECT bt2.bookmark_id
          FROM bookmark_tags bt2
          JOIN tags t2 ON bt2.tag_id = t2.id
          WHERE t2.name = ?
        )
      `);
      params.push(tags[0]);
    } else if (tags.length > 1) {
      // Multiple tags - find bookmarks that have ALL specified tags
      const placeholders = tags.map(() => '?').join(',');
      whereClauses.push(`
        b.id IN (
          SELECT bt2.bookmark_id
          FROM bookmark_tags bt2
          JOIN tags t2 ON bt2.tag_id = t2.id
          WHERE t2.name IN (${placeholders})
          GROUP BY bt2.bookmark_id
          HAVING COUNT(DISTINCT t2.id) = ?
        )
      `);
      params.push(...tags, tags.length);
    }
  }
  
  if (search) {
    const searchPattern = `%${search.trim().toLowerCase()}%`;
    whereClauses.push('(LOWER(b.title) LIKE ? OR LOWER(b.description) LIKE ? OR LOWER(b.url) LIKE ?)');
    params.push(searchPattern, searchPattern, searchPattern);
  }
  
  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  
  // 1. Get total count for pagination calculations
  const countQuery = `
    SELECT COUNT(DISTINCT b.id) as total 
    FROM bookmarks b
    ${whereSql}
  `;
  const countResult = await db.get(countQuery, params);
  const total = countResult ? countResult.total : 0;
  
  // 2. Fetch paginated records using GROUP_CONCAT for high-performance tag loading
  const recordsQuery = `
    SELECT
      b.id, b.url, b.title, b.description, b.created_at, b.user_id,
      b.is_public, b.og_image,
      u.username,
      GROUP_CONCAT(t.name) as tags_list
    FROM bookmarks b
    JOIN users u ON b.user_id = u.id
    LEFT JOIN bookmark_tags bt ON b.id = bt.bookmark_id
    LEFT JOIN tags t ON bt.tag_id = t.id
    ${whereSql}
    GROUP BY b.id
    ORDER BY b.id DESC
    LIMIT ? OFFSET ?
  `;
  
  const queryParams = [...params, limit, offset];
  const rows = await db.all(recordsQuery, queryParams);
  
  // Parse tags list back into arrays
  const items = rows.map(row => ({
    id: row.id,
    url: row.url,
    title: row.title,
    description: row.description,
    created_at: row.created_at,
    user_id: row.user_id,
    username: row.username,
    is_public: row.is_public,
    og_image: row.og_image,
    tags: row.tags_list ? row.tags_list.split(',') : []
  }));
  
  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}

// Helper: Get list of popular tags with bookmark counts
export async function getPopularTags(limit = 30, offset = 0) {
  const db = await dbPromise;
  return db.all(`
    SELECT t.name, COUNT(bt.bookmark_id) as count
    FROM tags t
    JOIN bookmark_tags bt ON t.id = bt.tag_id
    GROUP BY t.id
    ORDER BY count DESC, t.name ASC
    LIMIT ? OFFSET ?
  `, [limit, offset]);
}

export async function countAllTags() {
  const db = await dbPromise;
  const row = await db.get(`
    SELECT COUNT(DISTINCT t.id) as total
    FROM tags t
    JOIN bookmark_tags bt ON t.id = bt.tag_id
  `);
  return row?.total || 0;
}

export async function getUserTags(userId, limit = 100) {
  const db = await dbPromise;
  return db.all(`
    SELECT t.name, COUNT(bt.bookmark_id) as count
    FROM tags t
    JOIN bookmark_tags bt ON t.id = bt.tag_id
    JOIN bookmarks b ON bt.bookmark_id = b.id
    WHERE b.user_id = ?
    GROUP BY t.id
    ORDER BY count DESC, t.name ASC
    LIMIT ?
  `, [userId, limit]);
}

// Helper: Get user preferences
export async function getUserPreferences(userId) {
  const db = await dbPromise;

  // Migration: add searchable column if missing
  try {
    await db.run('ALTER TABLE user_preferences ADD COLUMN searchable INTEGER DEFAULT 1');
  } catch {}

  let prefs = await db.get('SELECT * FROM user_preferences WHERE user_id = ?', [userId]);

  // Create default preferences if they don't exist
  if (!prefs) {
    await db.run('INSERT INTO user_preferences (user_id, default_public, searchable) VALUES (?, 1, 1)', [userId]);
    prefs = { user_id: userId, default_public: 1, searchable: 1 };
  }

  // Ensure searchable has a value (for existing rows before migration)
  if (prefs.searchable === undefined || prefs.searchable === null) {
    prefs.searchable = 1;
  }

  return prefs;
}

// Helper: Update user preferences
export async function updateUserPreferences(userId, preferences) {
  const db = await dbPromise;

  // Ensure preferences exist first
  await db.run('INSERT OR IGNORE INTO user_preferences (user_id) VALUES (?)', [userId]);

  // Update preferences
  const updates = [];
  const values = [];

  if (preferences.default_public !== undefined) {
    updates.push('default_public = ?');
    values.push(preferences.default_public ? 1 : 0);
  }

  if (preferences.searchable !== undefined) {
    updates.push('searchable = ?');
    values.push(preferences.searchable ? 1 : 0);
  }

  if (updates.length === 0) return;

  values.push(userId);
  await db.run(
    `UPDATE user_preferences SET ${updates.join(', ')} WHERE user_id = ?`,
    values
  );
}

// Helper: Update user password
export async function updateUserPassword(userId, newPasswordHash) {
  const db = await dbPromise;
  await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, userId]);
}

// Helper: Update user email
export async function updateUserEmail(userId, newEmail) {
  const db = await dbPromise;
  await db.run('UPDATE users SET email = ? WHERE id = ?', [newEmail, userId]);
}

// Helper: Update username
export async function updateUsername(userId, newUsername) {
  const db = await dbPromise;
  await db.run('UPDATE users SET username = ? WHERE id = ?', [newUsername, userId]);
}

// Helper: Update user avatar
export async function updateUserAvatar(userId, avatarPath) {
  const db = await dbPromise;
  await db.run('UPDATE users SET avatar = ? WHERE id = ?', [avatarPath, userId]);
}

// Helper: Delete all user bookmarks
export async function deleteAllUserBookmarks(userId) {
  const db = await dbPromise;
  // Delete all bookmarks for user (cascades to bookmark_tags)
  await db.run('DELETE FROM bookmarks WHERE user_id = ?', [userId]);

  // Clean up orphaned tags
  await db.run(`
    DELETE FROM tags
    WHERE id NOT IN (SELECT DISTINCT tag_id FROM bookmark_tags)
  `);
}

// Helper: Delete user account
export async function deleteUser(userId) {
  const db = await dbPromise;
  // Foreign keys cascade will delete bookmarks, bookmark_tags, and preferences
  await db.run('DELETE FROM users WHERE id = ?', [userId]);

  // Clean up orphaned tags
  await db.run(`
    DELETE FROM tags
    WHERE id NOT IN (SELECT DISTINCT tag_id FROM bookmark_tags)
  `);
}

// Helper: Follow a user
export async function followUser(followerId, followingId) {
  const db = await dbPromise;
  await db.run(
    'INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)',
    [followerId, followingId]
  );
}

// Helper: Unfollow a user
export async function unfollowUser(followerId, followingId) {
  const db = await dbPromise;
  await db.run(
    'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
    [followerId, followingId]
  );
}

// Helper: Check if user is following another user
export async function isFollowing(followerId, followingId) {
  const db = await dbPromise;
  const result = await db.get(
    'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?',
    [followerId, followingId]
  );
  return !!result;
}

// Helper: Get following count
export async function getFollowingCount(userId) {
  const db = await dbPromise;
  const result = await db.get(
    'SELECT COUNT(*) as count FROM follows WHERE follower_id = ?',
    [userId]
  );
  return result.count;
}

// Helper: Get followers count
export async function getFollowersCount(userId) {
  const db = await dbPromise;
  const result = await db.get(
    'SELECT COUNT(*) as count FROM follows WHERE following_id = ?',
    [userId]
  );
  return result.count;
}

// ==========================================
// PASSWORD RESET FUNCTIONS
// ==========================================

// Create password reset token
export async function createPasswordResetToken(userId, token, expiresInMinutes = 60) {
  const db = await dbPromise;
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();

  // Delete any existing tokens for this user
  await db.run('DELETE FROM password_reset_tokens WHERE user_id = ?', [userId]);

  // Create new token
  await db.run(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
    [userId, token, expiresAt]
  );
}

// Get user ID by reset token
export async function getUserByResetToken(token) {
  const db = await dbPromise;
  const result = await db.get(
    'SELECT user_id FROM password_reset_tokens WHERE token = ? AND expires_at > datetime("now")',
    [token]
  );
  return result ? result.user_id : null;
}

// Delete reset token
export async function deletePasswordResetToken(token) {
  const db = await dbPromise;
  await db.run('DELETE FROM password_reset_tokens WHERE token = ?', [token]);
}

// Clean up expired tokens (can be run periodically)
export async function cleanupExpiredResetTokens() {
  const db = await dbPromise;
  await db.run('DELETE FROM password_reset_tokens WHERE expires_at < datetime("now")');
}

// Search users by username prefix (respects searchable opt-out)
export async function searchUsers(query, limit = 10) {
  const db = await dbPromise;
  const pattern = `%${query.toLowerCase()}%`;
  return db.all(
    `SELECT u.id, u.username, u.avatar,
            COUNT(b.id) as bookmark_count
     FROM users u
     LEFT JOIN bookmarks b ON b.user_id = u.id AND b.is_public = 1
     LEFT JOIN user_preferences p ON p.user_id = u.id
     WHERE LOWER(u.username) LIKE ?
       AND (p.searchable IS NULL OR p.searchable = 1)
     GROUP BY u.id
     ORDER BY bookmark_count DESC
     LIMIT ?`,
    [pattern, limit]
  );
}
