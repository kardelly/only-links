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
