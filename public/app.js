/**
 * delicious.modern — Frontend SPA Controller (ESM)
 */

// CENTRAL STATE MANAGEMENT
const state = {
  currentUser: null,
  feedType: 'all', // 'all', 'mine', or 'network'
  searchQuery: '',
  activeTags: [], // Changed from activeTag to support multiple tags
  currentPage: 1,
  limit: 20, // Increased for load more
  bookmarks: [],
  allBookmarks: [], // full page cache for instant client-side text search
  popularTags: [],
  pagination: {
    total: 0,
    totalPages: 0
  },
  authMode: 'login', // 'login' or 'register'
  isLoadingMore: false,
  hasMore: true,
  showAllTags: false
};

// ==========================================
// 1. INITIALIZE FRONTEND APPLICATION
// ==========================================
async function initApp() {
  // Wait for header to be ready.
  // window.__headerReady is set by header.js before it fires 'headerReady',
  // so we never miss the event if it already fired before this code runs.
  if (!window.__headerReady) {
    await new Promise(resolve => {
      if (window.__headerReady) { resolve(); return; }
      window.addEventListener('headerReady', resolve, { once: true });
    });
  }

  initTheme();
  setupEventListeners();

  // Setup modal backdrop dismiss (modals use .active class, not <dialog>)
  setupModalDismiss();

  // Initialize sidebar tags component
  await window.sidebarTags.init({
    onTagClick: async (tagName, activeTags) => {
      // Sync state with component
      state.activeTags = activeTags;
      renderActiveTagPills();
      await refreshFeed();
    }
  });

  // Inject bookmarklet href dynamically using current server origin
  const baseUrl = window.location.origin;
  const bookmarkletCode = `javascript:(function(){` +
    `var u=encodeURIComponent(location.href);` +
    `var t=encodeURIComponent(document.title);` +
    `var d=encodeURIComponent((document.querySelector('meta[name="description"]')||{}).content||'');` +
    `window.open('${baseUrl}/?url='+u+'&title='+t+'&desc='+d,'_blank','width=520,height=680,scrollbars=yes');` +
    `})();`;
  const bookmarkletEl = document.getElementById('bookmarklet-link');
  if (bookmarkletEl) bookmarkletEl.href = bookmarkletCode;

  // Check user session & load initial feed
  await checkSession();
  await refreshFeed();

  // Handle URL query parameters (for Bookmarklet triggers)
  handleUrlParameters();
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Easter egg for curious developers
console.log(
  '%conly.link',
  'font-size: 24px; font-weight: bold; color: oklch(56% 0.18 250);'
);
console.log(
  '%cBookmarking, reimagined. 🔖',
  'font-size: 14px; color: oklch(52% 0.008 60);'
);
console.log(
  '%cKeyboard shortcuts: N (new bookmark)',
  'font-size: 12px; color: oklch(52% 0.008 60); font-style: italic;'
);

// Theme System Initialization (light-only design, removed dark mode toggle)
function initTheme() {
  // Design is light-only per DESIGN.md: "Knowledge work happens during daytime"
  document.documentElement.classList.remove('dark');
}

// Check active session — delegates to session.js singleton (no extra fetch)
async function checkSession() {
  const { user } = await window.getSession();
  state.currentUser = user || null;

  if (state.currentUser) {
    state.feedType = 'mine';
  }

  updateFeedTabsVisibility();
}

// Refresh Feed and popular tags
async function refreshFeed() {
  state.currentPage = 1;
  state.hasMore = true;
  showSkeletonLoading();
  await Promise.all([
    fetchBookmarks(false),
    window.sidebarTags.refresh()
  ]);
}

// ==========================================
// 2. BACKEND API OPERATIONS
// ==========================================

// Fetch paginated & filtered bookmarks
async function fetchBookmarks(append = false) {
  try {
    if (state.isLoadingMore) return;
    if (append && !state.hasMore) return;

    state.isLoadingMore = true;

    const params = new URLSearchParams({
      page: state.currentPage,
      limit: state.limit
    });

    if (state.searchQuery) {
      params.append('q', state.searchQuery);
    }
    if (state.activeTags.length > 0) {
      // Send multiple tags as comma-separated
      params.append('tags', state.activeTags.join(','));
    }
    if (state.feedType && state.feedType !== 'all') {
      params.append('feedType', state.feedType);
    }

    const response = await fetch(`/api/bookmarks?${params.toString()}`, { credentials: 'include' });
    if (!response.ok) {
      throw new Error('Failed to load bookmarks');
    }

    const data = await response.json();

    if (append) {
      state.bookmarks = [...state.bookmarks, ...data.items];
      state.allBookmarks = [...state.allBookmarks, ...data.items];
    } else {
      state.bookmarks = data.items;
      state.allBookmarks = data.items;
    }

    state.pagination = data.pagination;
    state.hasMore = state.currentPage < data.pagination.totalPages;

    renderBookmarks();
    updateLoadMoreButton();

  } catch (err) {
    console.error('Fetch Bookmarks Error:', err);
    const container = document.getElementById('bookmark-list');
    container.innerHTML = `
      <div class="glass-panel p-8 rounded-2xl text-center border border-red-500/20 text-red-600 dark:text-red-400">
        <span class="material-icons-round text-4xl mb-2">error_outline</span>
        <p class="font-semibold">Unable to connect to server.</p>
        <button class="retry-btn mt-4 px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-xl text-xs font-bold transition-all">Retry</button>
      </div>
    `;

    // Attach retry button listener
    const retryBtn = container.querySelector('.retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => location.reload());
    }
  } finally {
    state.isLoadingMore = false;
  }
}


// Save bookmark (Create or Edit)
async function saveBookmark(payload) {
  console.log('saveBookmark called with payload:', payload);

  const modal = document.getElementById('bookmark-modal');
  const bookmarkId = modal?.dataset.editingId;
  const isEdit = !!bookmarkId;
  const url = isEdit ? `/api/bookmarks/${bookmarkId}` : '/api/bookmarks';
  const method = isEdit ? 'PUT' : 'POST';

  console.log(`Sending ${method} to ${url}`);

  try {
    const response = await fetch(url, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('Response:', response.status, data);

    if (!response.ok) {
      throw new Error(data.error || 'Failed to save bookmark');
    }

    // Animate save button to checkmark, then close
    const submitBtn = document.getElementById('bookmark-submit');
    if (submitBtn) {
      submitBtn.classList.remove('saving');
      submitBtn.classList.add('done');
    }

    await new Promise(r => setTimeout(r, 480));

    if (modal) {
      modal.classList.add('exit');
      setTimeout(() => {
        modal.classList.remove('active', 'exit');
        if (submitBtn) submitBtn.classList.remove('done');
        delete modal.dataset.editingId;
        delete modal.dataset.ogImage;
        // Reset OG thumbnail
        const thumb = document.getElementById('bm-og-thumb');
        if (thumb) thumb.classList.remove('visible');
        const img = document.getElementById('bm-og-img');
        if (img) img.src = '';
        // Reset URL indicators
        const spinner = document.getElementById('bm-url-spinner');
        const checkEl = document.getElementById('bm-url-check');
        if (spinner) spinner.classList.remove('active');
        if (checkEl) checkEl.classList.remove('active');
      }, 200);
    }

    const form = document.getElementById('bookmark-form');
    if (form) setTimeout(() => form.reset(), 200);

    const toastMessage = isEdit ? 'Link updated' : 'Link saved';
    showSuccessToast(toastMessage);

    await refreshFeed();
  } catch (err) {
    showBookmarkError(err.message);
  }
}

// Delete a bookmark
async function performDeleteBookmark(id) {
  const confirmed = await showDeleteConfirmationModal();
  if (!confirmed) return;

  try {
    const response = await fetch(`/api/bookmarks/${id}`, { method: 'DELETE', credentials: 'include' });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete bookmark');
    }

    await refreshFeed();
  } catch (err) {
    alert(err.message);
  }
}

// Show delete confirmation modal
function showDeleteConfirmationModal() {
  return new Promise((resolve) => {
    const modal = document.getElementById('delete-confirmation-modal');
    const confirmBtn = document.getElementById('delete-confirm-btn');
    const cancelBtn = document.getElementById('delete-cancel-btn');

    modal.classList.add('active');

    const handleConfirm = () => {
      cleanup();
      resolve(true);
    };

    const handleCancel = () => {
      cleanup();
      resolve(false);
    };

    const cleanup = () => {
      modal.classList.remove('active');
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
      modal.removeEventListener('click', handleBackdropClick);
    };

    const handleBackdropClick = (e) => {
      if (e.target === modal) {
        handleCancel();
      }
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    modal.addEventListener('click', handleBackdropClick);
  });
}

// Perform User Login or Register
async function authenticateUser(payload) {
  const isLogin = state.authMode === 'login';
  const url = isLogin ? '/api/auth/login' : '/api/auth/register';

  try {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Authentication failed');
    }

    // Auth Success - redirect to app
    window.location.href = '/app';
  } catch (err) {
    showAuthError(err.message);
  }
}

// Perform Logout
async function performLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    state.currentUser = null;
    state.feedType = 'all';
    state.currentPage = 1;

    // Redirect to landing page after logout
    window.location.href = '/';
  } catch (err) {
    console.error('Logout error:', err);
  }
}

// ==========================================
// 3. UI RENDERING AND DOM MANIPULATION
// ==========================================

// Display skeleton loading pulse cards
function showSkeletonLoading() {
  const container = document.getElementById('bookmark-list');
  if (!container) return;

  container.innerHTML = `
    <div class="skeleton-bookmark">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-url"></div>
      <div class="skeleton skeleton-description"></div>
      <div class="skeleton-tags">
        <div class="skeleton skeleton-tag"></div>
        <div class="skeleton skeleton-tag"></div>
        <div class="skeleton skeleton-tag"></div>
      </div>
    </div>
    <div class="skeleton-bookmark">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-url"></div>
      <div class="skeleton skeleton-description"></div>
      <div class="skeleton-tags">
        <div class="skeleton skeleton-tag"></div>
        <div class="skeleton skeleton-tag"></div>
      </div>
    </div>
    <div class="skeleton-bookmark">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-url"></div>
      <div class="skeleton skeleton-description"></div>
      <div class="skeleton-tags">
        <div class="skeleton skeleton-tag"></div>
        <div class="skeleton skeleton-tag"></div>
        <div class="skeleton skeleton-tag"></div>
      </div>
    </div>
  `;
}

async function shareBookmark(btn) {
  const url = btn.dataset.url;
  if (!url) return;

  if (navigator.share) {
    try { await navigator.share({ url }); } catch {}
    return;
  }

  try {
    await navigator.clipboard.writeText(url);
    btn.classList.add('share-done');
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.classList.remove('share-done'); btn.textContent = 'Share'; }, 1500);
  } catch {
    btn.classList.add('share-error');
    btn.textContent = 'Error';
    setTimeout(() => { btn.classList.remove('share-error'); btn.textContent = 'Share'; }, 1000);
  }
}

// Render bookmarks feed
function renderBookmarks() {
  const container = document.getElementById('bookmark-list');
  if (!container) return;

  container.innerHTML = '';
  
  if (state.bookmarks.length === 0) {
    // Determine empty state context
    const hasFilters = state.searchQuery || state.activeTags.length > 0;
    const isMyBookmarks = state.feedType === 'mine';
    const isNetwork = state.feedType === 'network';

    let title, description, hint;

    if (hasFilters) {
      title = 'Nothing here';
      description = 'No bookmarks match your current filters. Try a different search term or tag combination.';
      hint = null;
    } else if (isMyBookmarks) {
      title = 'Your canvas awaits';
      description = 'This is where your curated links will live. Every bookmark becomes searchable, shareable, and organized by tags.';
      hint = state.currentUser ? '<span class="empty-state-kbd">N</span> to add your first link' : null;
    } else if (isNetwork) {
      title = 'Follow curators to see their links';
      description = 'Your network feed shows bookmarks from people you follow. Find users to follow on their profile pages.';
      hint = null;
    } else {
      title = 'The archive is empty';
      description = 'Be the first to contribute. Every link you save becomes part of the public collection.';
      hint = null;
    }

    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
        <h3 class="empty-state-title">${title}</h3>
        <p class="empty-state-description">${description}</p>
        ${state.currentUser && !hasFilters ? `
          <button id="empty-state-add-btn" class="btn btn-primary">Add first link</button>
          ${hint ? `<p class="empty-state-hint">${hint}</p>` : ''}
        ` : !state.currentUser && !hasFilters ? `
          <button id="empty-state-login-btn" class="btn btn-secondary">Sign in to save links</button>
        ` : ''}
      </div>
    `;

    // Attach trigger actions inside empty states
    const addBtn = document.getElementById('empty-state-add-btn');
    if (addBtn) addBtn.onclick = () => openBookmarkModal();
    const loginBtn = document.getElementById('empty-state-login-btn');
    if (loginBtn) loginBtn.onclick = () => openAuthModal('login');

    return;
  }
  
  // Render bookmarks with design system classes
  state.bookmarks.forEach((item, index) => {
    // Debug: log og_image and convert relative URLs to absolute
    if (item.og_image) {
      console.log(`Bookmark "${item.title}" has og_image:`, item.og_image);

      // Convert relative URLs to absolute
      if (item.og_image.startsWith('//')) {
        item.og_image = `https:${item.og_image}`;
      } else if (item.og_image.startsWith('/')) {
        try {
          const baseUrl = new URL(item.url);
          item.og_image = `${baseUrl.protocol}//${baseUrl.host}${item.og_image}`;
        } catch (e) {}
      }
      item.og_image = item.og_image.replace(/^http:\/\//, 'https://');
    }

    // Generate clean hostname
    let host = 'link';
    try {
      host = new URL(item.url).hostname.replace('www.', '');
    } catch(e) {}

    const isOwner = state.currentUser && state.currentUser.id === item.user_id;

    const article = document.createElement('article');
    article.className = 'bookmark-item';
    article.style.setProperty('--i', index);

    // Add celebration class for first bookmark on "mine" feed
    if (state.feedType === 'mine' && state.bookmarks.length === 1 && index === 0) {
      article.classList.add('first-bookmark');
    }

    // Render tags
    const tagsHtml = item.tags.map(tag => `
      <span class="tag" data-tag="${escapeHTML(tag)}">${escapeHTML(tag)}</span>
    `).join('');

    const q = state.searchQuery;
    const hl = (str) => q ? highlightText(str, q) : escapeHTML(str);

    article.innerHTML = `
      ${item.og_image ? `
        <div class="bookmark-thumbnail">
          <img src="${escapeHTML(item.og_image)}" alt="${escapeHTML(item.title)}" loading="lazy" onerror="this.parentElement.style.display='none'">
        </div>
      ` : ''}

      <div class="bookmark-content">
        <div class="bookmark-header">
          <a href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer" class="bookmark-url">
            ${hl(item.title)}
          </a>
          <span class="bookmark-domain">${escapeHTML(host)}</span>
        </div>

        ${item.description ? `
          <p class="bookmark-description">${hl(item.description)}</p>
        ` : ''}

        ${item.tags.length > 0 ? `
          <div class="bookmark-tags">
            ${tagsHtml}
          </div>
        ` : ''}

        <div class="bookmark-meta">
          <a href="/user/${escapeHTML(item.username)}" class="bookmark-meta-link">@${escapeHTML(item.username)}</a>
          <span aria-hidden="true">·</span>
          <span>${timeAgo(item.created_at)}</span>
        </div>

        <div class="bookmark-actions">
          ${isOwner ? `
            <div class="bookmark-actions-owner">
              <button class="btn btn-ghost btn-sm edit-bookmark-btn" data-id="${item.id}" title="Edit">Edit</button>
              <button class="btn btn-ghost btn-sm delete-bookmark-btn" data-id="${item.id}" title="Delete">Delete</button>
            </div>
          ` : '<div></div>'}
          <button class="btn-share share-btn" data-url="${escapeHTML(item.url)}" aria-label="Compartilhar link">
            Share
          </button>
        </div>
      </div>
    `;

    container.appendChild(article);
  });
  
  // Attach event listeners dynamically to tags
  container.querySelectorAll('.tag').forEach(tag => {
    tag.onclick = () => {
      filterByTag(tag.getAttribute('data-tag'));
    };
  });
  
  // Attach edit and delete listeners
  container.querySelectorAll('.edit-bookmark-btn').forEach(btn => {
    btn.onclick = () => {
      const id = parseInt(btn.getAttribute('data-id'));
      openEditBookmarkModal(id);
    };
  });
  
  container.querySelectorAll('.delete-bookmark-btn').forEach(btn => {
    btn.onclick = () => {
      const id = parseInt(btn.getAttribute('data-id'));
      performDeleteBookmark(id);
    };
  });

  container.querySelectorAll('.share-btn').forEach(btn => {
    btn.onclick = () => shareBookmark(btn);
  });
}


// Update load more button visibility and state
function updateLoadMoreButton() {
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (!loadMoreBtn) return;

  if (state.hasMore) {
    loadMoreBtn.style.display = 'flex';
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = 'Load more';
  } else {
    loadMoreBtn.style.display = 'none';
  }
}

// Update feed tabs visibility based on session
function updateFeedTabsVisibility() {
  const networkBtn = document.getElementById('feed-network-btn');
  const mineBtn = document.getElementById('feed-mine-btn');

  if (state.currentUser) {
    // Show network and mine tabs
    if (networkBtn) networkBtn.style.display = 'block';
    if (mineBtn) mineBtn.style.display = 'block';
  } else {
    // Hide network and mine tabs
    if (networkBtn) networkBtn.style.display = 'none';
    if (mineBtn) mineBtn.style.display = 'none';

    // If active feed was "Mine" or "Network", force it back to "All"
    if (state.feedType === 'mine' || state.feedType === 'network') {
      state.feedType = 'all';
      toggleFeedButtons('all');
    }
  }
}

// ==========================================
// 4. ACTION TRIGGERS & LISTENERS
// ==========================================
function setupEventListeners() {
  
  // Theme Switching Event
  const themeToggle = document.getElementById('dark-mode-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      state.darkMode = !state.darkMode;
      document.documentElement.setAttribute('data-theme', state.darkMode ? 'dark' : 'light');
      localStorage.setItem('darkMode', state.darkMode);
      themeToggle.textContent = state.darkMode ? '🌙' : '☀️';
    });
  }
  
  // Search input handler — shared logic for desktop + mobile
  function handleSearchInput(query, mirrorId) {
    // Extract #tag tokens only when followed by space or comma (token is complete)
    const completedTags = [...query.matchAll(/#(\w+)(?=[\s,])/g)];
    if (completedTags.length > 0) {
      completedTags.forEach(m => {
        const name = m[1];
        if (!state.activeTags.includes(name)) state.activeTags.push(name);
      });
      query = query.replace(/#\w+[\s,]*/g, '').trim();
      const selfEl = document.getElementById(mirrorId === 'search-input-mobile' ? 'search-input' : 'search-input-mobile');
      if (selfEl) selfEl.value = query;
      const mirrorEl = document.getElementById(mirrorId);
      if (mirrorEl) mirrorEl.value = query;
      renderActiveTagPills();
      window.sidebarTags.setActiveTags(state.activeTags);
    }

    state.searchQuery = query;
    const mirror = document.getElementById(mirrorId);
    if (mirror) mirror.value = query;
  }

  // Desktop Search Input — debounced server fetch (searches full dataset, not just loaded page)
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      handleSearchInput(e.target.value.trim(), 'search-input-mobile');
      refreshFeed();
    }, 300));
  }

  // Mobile Search Input
  const mobileInput = document.getElementById('search-input-mobile');
  if (mobileInput) {
    mobileInput.addEventListener('input', debounce((e) => {
      handleSearchInput(e.target.value.trim(), 'search-input');
      refreshFeed();
    }, 300));
  }
  
  // Feed filters buttons
  const allBtn = document.getElementById('feed-all-btn');
  const networkBtn = document.getElementById('feed-network-btn');
  const mineBtn = document.getElementById('feed-mine-btn');

  if (allBtn) {
    allBtn.addEventListener('click', async () => {
      if (state.feedType === 'all') return;
      state.feedType = 'all';
      toggleFeedButtons('all');
      await refreshFeed();
    });
  }

  if (networkBtn) {
    networkBtn.addEventListener('click', async () => {
      if (state.feedType === 'network') return;
      state.feedType = 'network';
      toggleFeedButtons('network');
      await refreshFeed();
    });
  }

  if (mineBtn) {
    mineBtn.addEventListener('click', async () => {
      if (state.feedType === 'mine') return;
      state.feedType = 'mine';
      toggleFeedButtons('mine');
      await refreshFeed();
    });
  }


  // Auth Modal events (login/register buttons handled by header.js)
  const authCloseBtn = document.getElementById('auth-modal-close');
  const authForm = document.getElementById('auth-form');

  if (authCloseBtn) {
    authCloseBtn.addEventListener('click', () => {
      const authModal = document.getElementById('auth-modal');
      if (authModal) {
        authModal.classList.add('exit');
        setTimeout(() => {
          authModal.classList.remove('active', 'exit');
        }, 200);
      }
    });
  }

  // Handle Auth submission
  if (authForm) authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('auth-username').value;
    const password = document.getElementById('auth-password').value;

    await authenticateUser({ username, password });
  });

  // Bookmark Modal Triggers (new bookmark button handled by header.js)
  const bookmarkCloseBtn = document.getElementById('bookmark-modal-close');
  if (bookmarkCloseBtn) {
    bookmarkCloseBtn.addEventListener('click', () => {
      const bookmarkModal = document.getElementById('bookmark-modal');
      if (bookmarkModal) {
        bookmarkModal.classList.add('exit');
        setTimeout(() => {
          bookmarkModal.classList.remove('active', 'exit');
          delete bookmarkModal.dataset.editingId;
          delete bookmarkModal.dataset.ogImage;
        }, 200);
      }
    });
  }

  // Fetch metadata on URL blur — use delegation because the modal HTML is
  // injected asynchronously by bookmark-modals.js after this listener runs.
  document.addEventListener('blur', async (e) => {
    if (e.target.id !== 'bookmark-url') return;
    const url = e.target.value.trim();
    if (!url) return;
    const modal = document.getElementById('bookmark-modal');
    if (modal && modal.dataset.editingId) return;
    await fetchMetadata(url);
  }, true); // capture phase so blur (non-bubbling) reaches document

  // Bookmark Submit Event (corrected description ID)
  // Bookmark form submit — delegation because the form is injected async by bookmark-modals.js
  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('#bookmark-form');
    if (!form) return;
    e.preventDefault();

    const url = document.getElementById('bookmark-url')?.value;
    const title = document.getElementById('bookmark-title')?.value;
    const description = document.getElementById('bookmark-description')?.value;
    const tags = document.getElementById('bookmark-tags')?.value;
    const isPublic = document.getElementById('bookmark-is-public')?.checked ?? true;

    if (!url || !title) {
      showBookmarkError('URL and title are required');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.classList.add('saving');
      submitBtn.disabled = true;
    }

    try {
      const modal = document.getElementById('bookmark-modal');
      const og_image = modal?.dataset.ogImage || null;
      await saveBookmark({ url, title, description, tags, is_public: isPublic, og_image });
    } catch (err) {
      if (submitBtn) {
        submitBtn.classList.remove('saving');
        submitBtn.disabled = false;
      }
    }
  });

  // Load more button
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      state.currentPage++;
      loadMoreBtn.disabled = true;
      loadMoreBtn.textContent = 'Loading...';
      fetchBookmarks(true);
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // 'N' key to open new bookmark modal (when not typing in an input)
    if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const isTyping = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
      if (!isTyping && state.currentUser) {
        e.preventDefault();
        openBookmarkModal();
      }
    }
  });
}

// Helper: Toggle Feed tab button styles
function toggleFeedButtons(type) {
  const allBtn = document.getElementById('feed-all-btn');
  const networkBtn = document.getElementById('feed-network-btn');
  const mineBtn = document.getElementById('feed-mine-btn');

  // Reset all to inactive state
  [allBtn, networkBtn, mineBtn].forEach(btn => {
    if (btn) btn.classList.remove('active');
  });

  // Set active button
  if (type === 'all' && allBtn) {
    allBtn.classList.add('active');
  } else if (type === 'network' && networkBtn) {
    networkBtn.classList.add('active');
  } else if (type === 'mine' && mineBtn) {
    mineBtn.classList.add('active');
  }
}

// Helper: Open Authentication modal
function openAuthModal(mode = 'login') {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;

  hideAuthError();
  const form = document.getElementById('auth-form');
  if (form) form.reset();

  switchAuthTab(mode);
  modal.classList.add('active');
}

// Switch between Login and Register tabs inside Modal
function switchAuthTab(mode) {
  state.authMode = mode;
  hideAuthError();

  const modalTitle = document.getElementById('auth-modal-title');
  const submitBtn = document.getElementById('auth-submit');

  if (modalTitle) {
    modalTitle.textContent = mode === 'login' ? 'Sign in' : 'Create account';
  }

  if (submitBtn) {
    submitBtn.textContent = mode === 'login' ? 'Sign in' : 'Create account';
  }
}

// Helper: Open New Bookmark modal
function openBookmarkModal() {
  if (!state.currentUser) {
    openAuthModal('login');
    return;
  }

  const modal = document.getElementById('bookmark-modal');
  if (!modal) return;

  hideBookmarkError();
  const form = document.getElementById('bookmark-form');
  if (form) form.reset();
  if (typeof resetModalTags === 'function') resetModalTags();

  delete modal.dataset.editingId;
  delete modal.dataset.ogImage;

  // Reset delight elements
  const thumb = document.getElementById('bm-og-thumb');
  if (thumb) thumb.classList.remove('visible');
  const img = document.getElementById('bm-og-img');
  if (img) img.src = '';
  const spinner = document.getElementById('bm-url-spinner');
  if (spinner) spinner.classList.remove('active');
  const checkEl = document.getElementById('bm-url-check');
  if (checkEl) checkEl.classList.remove('active');
  const saveBtn = document.getElementById('bookmark-submit');
  if (saveBtn) { saveBtn.classList.remove('saving', 'done'); saveBtn.disabled = false; }

  // Update modal title
  const titleEl = document.getElementById('bookmark-modal-title');
  if (titleEl) titleEl.textContent = 'Add bookmark';

  modal.classList.add('active');
}

// Helper: Open Edit Bookmark modal with prefilled data
async function openEditBookmarkModal(bookmarkId) {
  const bookmark = state.bookmarks.find(b => b.id === bookmarkId);
  if (!bookmark) return;

  const modal = document.getElementById('bookmark-modal');
  if (!modal) return;

  hideBookmarkError();

  // Prefill forms (use correct IDs from redesigned HTML)
  const urlInput = document.getElementById('bookmark-url');
  const titleInput = document.getElementById('bookmark-title');
  const descInput = document.getElementById('bookmark-description');
  const tagsInput = document.getElementById('bookmark-tags');

  if (urlInput) urlInput.value = bookmark.url;
  if (titleInput) titleInput.value = bookmark.title;
  if (descInput) descInput.value = bookmark.description || '';
  if (typeof setModalTags === 'function') setModalTags(bookmark.tags);
  else if (tagsInput) tagsInput.value = bookmark.tags.join(', ');

  modal.dataset.editingId = bookmark.id;

  // Reset delight elements
  const saveBtn = document.getElementById('bookmark-submit');
  if (saveBtn) { saveBtn.classList.remove('saving', 'done'); saveBtn.disabled = false; }
  const spinner = document.getElementById('bm-url-spinner');
  if (spinner) spinner.classList.remove('active');
  const checkEl = document.getElementById('bm-url-check');
  if (checkEl) checkEl.classList.remove('active');

  // OG thumbnail
  const thumb = document.getElementById('bm-og-thumb');
  const ogImg = document.getElementById('bm-og-img');
  if (bookmark.og_image) {
    modal.dataset.ogImage = bookmark.og_image;
    if (thumb && ogImg) {
      ogImg.src = bookmark.og_image.replace(/^http:\/\//, 'https://');
      ogImg.onload = () => thumb.classList.add('visible');
      ogImg.onerror = () => thumb.classList.remove('visible');
    }
  } else {
    delete modal.dataset.ogImage;
    if (thumb) thumb.classList.remove('visible');
    if (ogImg) ogImg.src = '';
  }

  // Update modal title
  const titleEl = document.getElementById('bookmark-modal-title');
  if (titleEl) titleEl.textContent = 'Edit bookmark';

  modal.classList.add('active');
}

// Render active tag pills below feed controls
function renderActiveTagPills() {
  const filterContainer = document.getElementById('active-tags-filter');
  const pillsContainer = document.getElementById('active-tags-pills');

  if (!filterContainer || !pillsContainer) return;

  if (state.activeTags.length === 0) {
    filterContainer.style.display = 'none';
    return;
  }

  filterContainer.style.display = 'flex';
  pillsContainer.innerHTML = '';

  state.activeTags.forEach(tag => {
    const pill = document.createElement('div');
    pill.className = 'active-tag-pill';

    const tagName = document.createElement('span');
    tagName.textContent = `#${tag}`;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'active-tag-pill-remove';
    removeBtn.innerHTML = '×';
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      filterByTag(tag);
    };

    pill.appendChild(tagName);
    pill.appendChild(removeBtn);
    pillsContainer.appendChild(pill);
  });
}

// Filter feed by specific tag (called from bookmark items)
// Escape special regex chars in a query string
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Wrap matching text with <mark> — safe: escapes str first, then re-inserts tags
function highlightText(str, query) {
  if (!str || !query) return escapeHTML(str || '');
  const escaped = escapeHTML(str);
  const pattern = new RegExp(`(${escapeRegex(escapeHTML(query))})`, 'gi');
  return escaped.replace(pattern, '<mark>$1</mark>');
}

// Filter allBookmarks client-side by searchQuery — zero latency, no server round-trip
function applyClientFilter() {
  const q = state.searchQuery.toLowerCase();
  if (!q) {
    state.bookmarks = state.allBookmarks;
  } else {
    state.bookmarks = state.allBookmarks.filter(item => {
      return (
        item.title?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.url?.toLowerCase().includes(q) ||
        item.tags?.some(t => t.toLowerCase().includes(q))
      );
    });
  }
  renderBookmarks();
}

async function filterByTag(tagName) {
  // Toggle tag in activeTags array
  const index = state.activeTags.indexOf(tagName);
  if (index > -1) {
    state.activeTags.splice(index, 1);
  } else {
    state.activeTags.push(tagName);
  }

  // Sync with sidebar component
  window.sidebarTags.setActiveTags(state.activeTags);

  // Render active tag pills
  renderActiveTagPills();

  await refreshFeed();
}

// Clear all active filters and tags
async function clearFilters() {
  state.activeTags = [];
  state.searchQuery = '';

  const searchInput = document.getElementById('search-input');
  const mobileInput = document.getElementById('search-input-mobile');

  if (searchInput) searchInput.value = '';
  if (mobileInput) mobileInput.value = '';

  renderActiveTagPills();

  // If we have a cached set, restore instantly; otherwise fetch
  if (state.allBookmarks.length > 0) {
    state.bookmarks = state.allBookmarks;
    renderBookmarks();
  } else {
    await refreshFeed();
  }
}

// ==========================================
// 5. HELPER AND ERROR UTILITIES
// ==========================================

// Show success toast notification
function showSuccessToast(message, duration = 2500) {
  // Remove any existing toasts
  const existing = document.querySelector('.success-toast');
  if (existing) existing.remove();

  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'success-toast';
  toast.innerHTML = `
    <div class="success-toast-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path class="checkmark-path" d="M20 6L9 17l-5-5"></path>
      </svg>
    </div>
    <span>${escapeHTML(message)}</span>
  `;

  document.body.appendChild(toast);

  // Auto-dismiss with exit animation
  setTimeout(() => {
    toast.classList.add('exit');
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

// Setup modal backdrop dismiss (click outside to close)
function setupModalDismiss() {
  const modals = ['auth-modal', 'bookmark-modal'];

  modals.forEach(modalId => {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.addEventListener('click', (e) => {
      // Close if clicking the backdrop (not the modal-content)
      if (e.target === modal) {
        modal.classList.add('exit');
        setTimeout(() => {
          modal.classList.remove('active', 'exit');

          // Clean up bookmark modal data
          if (modalId === 'bookmark-modal') {
            delete modal.dataset.editingId;
            delete modal.dataset.ogImage;
          }
        }, 200);
      }
    });
  });
}

// HTML XSS escape helper
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Standard debounce helper for fast typing inputs
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Relative humanized dates helper
function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// Auth error triggers
function showAuthError(msg) {
  const alertBox = document.getElementById('auth-error-alert');
  const alertText = document.getElementById('auth-error-message');
  if (alertText) alertText.textContent = msg;
  if (alertBox) alertBox.classList.remove('hidden');

  // Fallback: use browser alert if elements don't exist
  if (!alertBox) alert(msg);
}

function hideAuthError() {
  const errorAlert = document.getElementById('auth-error-alert');
  if (errorAlert) errorAlert.classList.add('hidden');
}

// Bookmark error triggers
function showBookmarkError(msg) {
  const alertBox = document.getElementById('bookmark-error-alert');
  const alertText = document.getElementById('bookmark-error-message');
  if (alertText) alertText.textContent = msg;
  if (alertBox) alertBox.classList.remove('hidden');

  // Fallback: use browser alert if elements don't exist
  if (!alertBox) alert(msg);
}

function hideBookmarkError() {
  const errorAlert = document.getElementById('bookmark-error-alert');
  if (errorAlert) errorAlert.classList.add('hidden');
}

// Fetch site metadata dynamically and prefill forms
async function fetchMetadata(url) {
  const titleInput = document.getElementById('bookmark-title');
  const descInput = document.getElementById('bookmark-description');
  const tagsInput = document.getElementById('bookmark-tags');

  if (!titleInput || !descInput || !tagsInput) return;

  const spinner = document.getElementById('bm-url-spinner');
  const checkEl = document.getElementById('bm-url-check');

  if (spinner) spinner.classList.add('active');
  if (checkEl) checkEl.classList.remove('active');

  try {
    const response = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`, { credentials: 'include' });
    if (!response.ok) throw new Error();
    const data = await response.json();

    if (data.title && !titleInput.value.trim()) titleInput.value = data.title;
    if (data.description && !descInput.value.trim()) descInput.value = data.description;

    const modal = document.getElementById('bookmark-modal');
    if (data.og_image) {
      if (modal) modal.dataset.ogImage = data.og_image;
      const thumb = document.getElementById('bm-og-thumb');
      const img = document.getElementById('bm-og-img');
      if (thumb && img) {
        const httpsUrl = data.og_image.replace(/^http:\/\//, 'https://');
        img.src = httpsUrl;
        img.onload = () => thumb.classList.add('visible');
        img.onerror = () => { thumb.classList.remove('visible'); };
      }
    }

    if (spinner) spinner.classList.remove('active');
    if (checkEl) checkEl.classList.add('active');
  } catch (err) {
    if (spinner) spinner.classList.remove('active');
    console.warn('Could not load site metadata. Safe to ignore.', err);
  }
}

// Parse URL params on startup (to support Bookmarklets)
function handleUrlParameters() {
  const params = new URLSearchParams(window.location.search);
  const addUrl = params.get('url');
  if (!addUrl) return;
  
  const addTitle = params.get('title') || '';
  const addDesc = params.get('desc') || '';
  
  // Clear URL search params immediately to avoid re-triggering on manual refreshes
  window.history.replaceState({}, document.title, window.location.pathname);
  
  if (!state.currentUser) {
    // Save pending details and request login
    state.pendingBookmark = { url: addUrl, title: addTitle, description: addDesc };
    openAuthModal('login');
    showAuthError('Please sign in first to archive this link.');
  } else {
    openBookmarkModalPrefilled({ url: addUrl, title: addTitle, description: addDesc });
  }
}

// Open Add Bookmark modal with pre-filled inputs (used by bookmarklet/extension)
function openBookmarkModalPrefilled({ url, title, description }) {
  openBookmarkModal();
  if (url) document.getElementById('bookmark-url').value = url;
  if (title) document.getElementById('bookmark-title').value = title;
  if (description) document.getElementById('bookmark-description').value = description;
  if (url) fetchMetadata(url);
}
