/**
 * Shared Header Component Controller
 * Loads header HTML and initializes session-based UI
 */

let headerState = {
  currentUser: null,
  isInitialized: false
};

// Load header HTML and initialize
async function initHeader() {
  if (headerState.isInitialized) return;

  // Load header HTML
  const placeholder = document.getElementById('header-placeholder');
  if (!placeholder) {
    console.error('Header placeholder not found');
    return;
  }

  try {
    const response = await fetch('/components/header.html');
    if (!response.ok) throw new Error('Failed to load header');
    const html = await response.text();
    placeholder.innerHTML = html;

    // Check session and update UI
    await checkHeaderSession();

    // Setup event listeners
    setupHeaderListeners();

    headerState.isInitialized = true;
  } catch (err) {
    console.error('Error loading header:', err);
  }
}

// Check current user session — delegates to session.js singleton
async function checkHeaderSession() {
  const { user } = await window.getSession();
  headerState.currentUser = user;
  updateHeaderUI();
}

// Update header UI based on login state
function updateHeaderUI() {
  const authNav = document.getElementById('auth-nav');
  const guestNav = document.getElementById('guest-nav');
  const profileAvatarInitial = document.getElementById('profile-avatar-initial');
  const profileAvatarBtn = document.getElementById('profile-avatar-btn');

  const logoLink = document.getElementById('logo-home');
  const headerSearch = document.getElementById('header-search');

  if (headerState.currentUser) {
    // Logged in: app-style header
    if (authNav) authNav.style.display = 'flex';
    if (guestNav) guestNav.style.display = 'none';
    if (headerSearch) headerSearch.style.display = 'flex';
    if (logoLink) logoLink.href = '/app';

    const profileHeaderLink = document.getElementById('profile-menu-header-link');
    if (profileHeaderLink) {
      profileHeaderLink.href = `/user/${headerState.currentUser.username}`;
    }
    // Set avatar initial or image
    if (profileAvatarInitial && profileAvatarBtn) {
      if (headerState.currentUser.avatar) {
        profileAvatarInitial.style.display = 'none';
        let img = profileAvatarBtn.querySelector('img');
        if (!img) {
          img = document.createElement('img');
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'cover';
          img.style.borderRadius = '50%';
          profileAvatarBtn.appendChild(img);
        }
        img.src = headerState.currentUser.avatar;
      } else {
        const img = profileAvatarBtn.querySelector('img');
        if (img) img.remove();
        profileAvatarInitial.style.display = 'flex';
        profileAvatarInitial.textContent = headerState.currentUser.username.charAt(0).toUpperCase();
      }
    }
    initNotifications(headerState.currentUser);
  } else {
    // Logged out: landing-style header
    if (authNav) authNav.style.display = 'none';
    if (guestNav) guestNav.style.display = 'flex';
    if (headerSearch) headerSearch.style.display = 'none';
    if (logoLink) logoLink.href = '/';
  }
}

// Setup all header event listeners
function setupHeaderListeners() {
  // User search dropdown
  setupUserSearch();

  // Profile dropdown toggle
  const profileAvatarBtn = document.getElementById('profile-avatar-btn');
  const profileMenu = document.getElementById('profile-menu');

  if (profileAvatarBtn && profileMenu) {
    profileAvatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      profileMenu.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!profileMenu.contains(e.target) && e.target !== profileAvatarBtn) {
        profileMenu.classList.remove('active');
      }
    });
  }

  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        if (window.clearSession) window.clearSession();
        window.location.href = '/';
      } catch (err) {
        console.error('Logout error:', err);
      }
    });
  }

  // Login button
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      // Trigger auth modal if available
      const authModal = document.getElementById('auth-modal');
      if (authModal) {
        authModal.classList.add('active');
        // Set login mode if switchAuthTab exists
        if (typeof switchAuthTab === 'function') {
          switchAuthTab('login');
        }
      } else {
        window.location.href = '/';
      }
    });
  }

  // Signup button
  const signupBtn = document.getElementById('signup-btn');
  if (signupBtn) {
    signupBtn.addEventListener('click', () => {
      // Trigger auth modal if available
      const authModal = document.getElementById('auth-modal');
      if (authModal) {
        authModal.classList.add('active');
        // Set register mode if switchAuthTab exists
        if (typeof switchAuthTab === 'function') {
          switchAuthTab('register');
        }
      } else {
        window.location.href = '/';
      }
    });
  }

  // New bookmark button
  const newBookmarkBtn = document.getElementById('new-bookmark-btn');
  if (newBookmarkBtn) {
    newBookmarkBtn.addEventListener('click', () => {
      // Trigger bookmark modal if available
      const bookmarkModal = document.getElementById('bookmark-modal');
      if (bookmarkModal) {
        bookmarkModal.classList.add('active');
        // Reset form if available
        const form = document.getElementById('bookmark-form');
        if (form) form.reset();

        // Clear editing state
        delete bookmarkModal.dataset.editingId;
        delete bookmarkModal.dataset.ogImage;
      }
    });
  }
}

// User search dropdown
function setupUserSearch() {
  const input = document.getElementById('search-input');
  const dropdown = document.getElementById('search-users-dropdown');
  if (!input || !dropdown) return;

  let debounceTimer = null;
  let lastQuery = '';

  const hide = () => { dropdown.hidden = true; dropdown.innerHTML = ''; };

  input.addEventListener('input', () => {
    const q = input.value.trim();
    if (q === lastQuery) return;
    lastQuery = q;
    clearTimeout(debounceTimer);

    if (q.length < 2) { hide(); return; }

    debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users?q=${encodeURIComponent(q)}`, { credentials: 'include' });
        if (!res.ok) return;
        const { users } = await res.json();
        if (!users || users.length === 0) { hide(); return; }

        // Build dropdown via DOM to prevent XSS
        dropdown.innerHTML = '';
        const section = document.createElement('div');
        section.className = 'search-users-section';
        const label = document.createElement('div');
        label.className = 'search-users-label';
        label.textContent = 'People';
        section.appendChild(label);

        users.forEach(u => {
          const initials = u.username[0].toUpperCase();
          const row = document.createElement('div');
          row.className = 'search-user-row';

          const avatarEl = document.createElement('div');
          avatarEl.className = 'search-user-avatar';
          if (u.avatar) {
            const img = document.createElement('img');
            img.src = u.avatar;           // safe: assigned as property, not innerHTML
            img.alt = initials;
            img.addEventListener('error', () => { avatarEl.textContent = initials; });
            avatarEl.appendChild(img);
          } else {
            avatarEl.textContent = initials;
          }

          const info = document.createElement('div');
          info.className = 'search-user-info';
          const name = document.createElement('span');
          name.className = 'search-user-name';
          name.textContent = '@' + u.username;
          const count = document.createElement('span');
          count.className = 'search-user-count';
          count.textContent = (u.bookmark_count || 0) + ' bookmarks';
          info.appendChild(name);
          info.appendChild(count);

          row.appendChild(avatarEl);
          row.appendChild(info);
          row.addEventListener('click', () => {
            window.location.href = '/user/' + encodeURIComponent(u.username);
            hide();
          });
          section.appendChild(row);
        });

        dropdown.appendChild(section);
        dropdown.hidden = false;
      } catch {}
    }, 280);
  });

  // Hide on blur (with delay to allow click)
  input.addEventListener('blur', () => setTimeout(hide, 180));

  // Hide when pressing Enter (let app.js handle bookmark search)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Enter') hide();
  });

  // Hide when clicking outside
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) hide();
  });
}

// ===== NOTIFICATIONS =====
let _notifOpen = false;
let _notifInitialized = false;
let _notifUnreadCount = 0;

async function loadNotifications() {
  try {
    const res = await fetch('/api/notifications', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    updateNotifBadge(data.unreadCount);
    renderNotifList(data.notifications);
  } catch {}
}

function updateNotifBadge(count) {
  _notifUnreadCount = count;
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

function _escapeHtmlNotif(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function _timeAgoNotif(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function renderNotifList(notifications) {
  const list = document.getElementById('notif-list');
  if (!list) return;

  if (!notifications || notifications.length === 0) {
    list.innerHTML = '<p class="notif-empty">No notifications yet.</p>';
    return;
  }

  list.innerHTML = '';
  notifications.forEach(n => {
    const item = document.createElement('div');
    item.className = 'notif-item' + (n.read ? '' : ' unread');
    item.dataset.id = n.id;

    const initials = (n.actor_username || '?')[0].toUpperCase();

    // Build avatar safely via DOM
    const avatarEl = document.createElement('div');
    avatarEl.className = 'notif-avatar';
    if (n.actor_avatar) {
      const img = document.createElement('img');
      img.src = n.actor_avatar;
      img.alt = '';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      img.addEventListener('error', () => { avatarEl.textContent = initials; });
      avatarEl.appendChild(img);
    } else {
      avatarEl.textContent = initials;
    }

    // Build text container
    const textContainer = document.createElement('div');
    textContainer.style.cssText = 'flex:1;min-width:0;';

    const textEl = document.createElement('div');
    textEl.className = 'notif-text';
    if (n.type === 'follow') {
      textEl.innerHTML = `<strong>${_escapeHtmlNotif(n.actor_username)}</strong> started following you`;
    } else {
      textEl.innerHTML = `<strong>${_escapeHtmlNotif(n.actor_username)}</strong> saved your link <em>${_escapeHtmlNotif(n.bookmark_title || '')}</em>`;
    }

    const timeEl = document.createElement('div');
    timeEl.className = 'notif-time';
    timeEl.textContent = _timeAgoNotif(n.created_at);

    textContainer.appendChild(textEl);
    textContainer.appendChild(timeEl);
    item.appendChild(avatarEl);
    item.appendChild(textContainer);
    item.addEventListener('click', () => _handleNotifClick(n, item));
    list.appendChild(item);
  });
}

async function _handleNotifClick(n, itemEl) {
  try {
    await fetch('/api/notifications/read', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [n.id] })
    });
    // Only update optimistically on success
    if (!n.read) {
      _notifUnreadCount = Math.max(0, _notifUnreadCount - 1);
      updateNotifBadge(_notifUnreadCount);
      n.read = 1;
      itemEl.classList.remove('unread');
    }
  } catch (_) {
    // Silent fail — still navigate
  }
  _closeNotifDropdown();
  if (n.type === 'follow') {
    window.location.href = `/user/${encodeURIComponent(n.actor_username)}`;
  } else if (n.bookmark_url) {
    window.open(n.bookmark_url, '_blank');
  }
}

function _closeNotifDropdown() {
  const dropdown = document.getElementById('notif-dropdown');
  if (dropdown) dropdown.hidden = true;
  _notifOpen = false;
}

function initNotifications(user) {
  if (!user || _notifInitialized) return;
  _notifInitialized = true;

  const wrapper = document.getElementById('notif-bell-wrapper');
  const btn = document.getElementById('notif-bell-btn');
  const dropdown = document.getElementById('notif-dropdown');
  const markAllBtn = document.getElementById('notif-mark-all-btn');

  if (!wrapper || !btn || !dropdown) return;
  wrapper.style.display = 'block';

  // Load on init
  loadNotifications();

  // Toggle dropdown
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    _notifOpen = !_notifOpen;
    dropdown.hidden = !_notifOpen;
  });

  // Mark all read
  markAllBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    await fetch('/api/notifications/read', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [] })
    });
    updateNotifBadge(0);
    document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (wrapper && !wrapper.contains(e.target)) _closeNotifDropdown();
  });
}

// Initialize header immediately (synchronously load HTML)
async function loadHeaderSync() {
  await initHeader();
  // Set flag BEFORE dispatching — any code that checks __headerReady after this
  // point will see it as true, even if the 'headerReady' event already fired.
  window.__headerReady = true;
  window.dispatchEvent(new CustomEvent('headerReady'));
}

// Initialize header on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadHeaderSync);
} else {
  loadHeaderSync();
}
