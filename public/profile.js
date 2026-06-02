/**
 * Profile Page Controller
 */

// Extract username from URL path: /user/:username
const pathParts = window.location.pathname.split('/');
const username = pathParts[2]; // /user/:username

if (!username) {
  window.location.href = '/';
}

// State
const profileState = {
  username: username,
  user: null,
  currentUser: null, // Logged in user
  bookmarks: [],
  popularTags: [],
  currentPage: 1,
  limit: 20,
  pagination: {
    total: 0,
    totalPages: 0
  },
  activeTag: null,
  searchQuery: '',
  isLoadingMore: false,
  hasMore: true
};

// Check current user session — delegates to session.js singleton
async function checkSession() {
  const { user } = await window.getSession();
  profileState.currentUser = user || null;
}

// Load profile data
async function loadProfile() {
  try {
    const response = await fetch(`/api/users/${username}`, { credentials: 'include' });

    if (!response.ok) {
      if (response.status === 404) {
        document.getElementById('profile-username').textContent = 'User not found';
        return;
      }
      throw new Error('Failed to load profile');
    }

    const data = await response.json();
    profileState.user = data.user;

    // Update UI
    updateProfileHeader();

    // Load bookmarks
    await loadBookmarks();

    // Initialize sidebar tags
    await window.sidebarTags.init({
      onTagClick: async (tagName, activeTags) => {
        profileState.activeTag = activeTags.length > 0 ? activeTags[0] : null;
        await loadBookmarks();
      }
    });
  } catch (err) {
    console.error('Load Profile Error:', err);
    document.getElementById('profile-username').textContent = 'Error loading profile';
  }
}

// Update profile header
function updateProfileHeader() {
  const user = profileState.user;

  // Update title
  document.title = `@${user.username} — delicious`;
  document.getElementById('page-title').textContent = `@${user.username} — only.link`;
  document.getElementById('page-description').setAttribute('content', `Public bookmarks from @${user.username}`);

  // Update username
  document.getElementById('profile-username').textContent = `@${user.username}`;

  // Update avatar
  const userProfileAvatar = document.getElementById('user-profile-avatar');
  const userProfileAvatarInitial = document.getElementById('user-profile-avatar-initial');

  if (user.avatar) {
    userProfileAvatarInitial.style.display = 'none';
    let img = userProfileAvatar.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      userProfileAvatar.appendChild(img);
    }
    img.src = user.avatar;
  } else {
    const img = userProfileAvatar.querySelector('img');
    if (img) img.remove();
    userProfileAvatarInitial.style.display = '';
    userProfileAvatarInitial.textContent = user.username.charAt(0).toUpperCase();
  }

  // Update stats
  document.getElementById('stats-bookmarks').textContent = user.stats.bookmarks;
  document.getElementById('stats-tags').textContent = user.stats.tags;
  document.getElementById('stats-followers').textContent = user.followersCount || 0;
  document.getElementById('stats-following').textContent = user.followingCount || 0;

  // Format joined date
  const joinedDate = new Date(user.created_at);
  document.getElementById('stats-joined').textContent = joinedDate.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  });

  // Show follow button if viewing someone else's profile while logged in
  const followBtn = document.getElementById('follow-btn');
  if (followBtn && profileState.currentUser && profileState.currentUser.username !== user.username) {
    followBtn.style.display = 'inline-flex';

    if (user.isFollowing) {
      followBtn.textContent = 'Unfollow';
      followBtn.classList.remove('btn-primary');
      followBtn.classList.add('btn-secondary');
    } else {
      followBtn.textContent = 'Follow';
      followBtn.classList.remove('btn-secondary');
      followBtn.classList.add('btn-primary');
    }
  } else if (followBtn) {
    followBtn.style.display = 'none';
  }
}

// Load bookmarks
async function loadBookmarks() {
  try {
    const params = new URLSearchParams({
      page: profileState.currentPage,
      limit: profileState.limit,
      user: profileState.username
    });

    if (profileState.searchQuery) {
      params.append('q', profileState.searchQuery);
    }
    if (profileState.activeTag) {
      params.append('tag', profileState.activeTag);
    }

    // We're viewing someone else's profile, so we need to filter by user
    const response = await fetch(`/api/bookmarks?${params.toString()}`, { credentials: 'include' });

    if (!response.ok) {
      throw new Error('Failed to load bookmarks');
    }

    const data = await response.json();
    profileState.bookmarks = data.items;
    profileState.pagination = data.pagination;

    renderBookmarks();
    renderPagination();
  } catch (err) {
    console.error('Load Bookmarks Error:', err);
  }
}

// Render bookmarks (reuse function from app.js)
function renderBookmarks() {
  const container = document.getElementById('bookmark-list');
  if (!container) return;

  container.innerHTML = '';

  if (profileState.bookmarks.length === 0) {
    const isOwnProfile = profileState.currentUser && profileState.currentUser.username === profileState.username;
    const hasFilters = profileState.searchQuery || profileState.activeTag;

    let title, description;

    if (hasFilters) {
      title = 'Nothing matches';
      description = 'No bookmarks match your current filters. Try a different search or tag.';
    } else if (isOwnProfile) {
      title = 'Your collection is empty';
      description = 'Links you save will appear here. Public bookmarks are visible to everyone, private ones only to you.';
    } else {
      title = 'No public links yet';
      description = `@${profileState.username} hasn't shared any bookmarks publicly.`;
    }

    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
        <h3 class="empty-state-title">${title}</h3>
        <p class="empty-state-description">${description}</p>
      </div>
    `;
    return;
  }

  profileState.bookmarks.forEach(item => {
    let host = 'link';
    try {
      host = new URL(item.url).hostname.replace('www.', '');
    } catch (e) {}

    const isOwner = profileState.currentUser && profileState.currentUser.username === profileState.username;

    // Fix relative/protocol-relative og_image URLs
    let ogImage = item.og_image;
    if (ogImage) {
      if (ogImage.startsWith('//')) ogImage = 'https:' + ogImage;
      else if (ogImage.startsWith('/')) {
        try { const b = new URL(item.url); ogImage = `${b.protocol}//${b.host}${ogImage}`; } catch(e) {}
      }
      ogImage = ogImage.replace(/^http:\/\//, 'https://');
    }

    const article = document.createElement('article');
    article.className = 'bookmark-item';

    const tagsHtml = item.tags.map(tag => `
      <span class="tag" data-tag="${escapeHTML(tag)}">${escapeHTML(tag)}</span>
    `).join('');

    article.innerHTML = `
      ${ogImage ? `
        <div class="bookmark-thumbnail">
          <img src="${escapeHTML(ogImage)}" alt="${escapeHTML(item.title)}" loading="lazy" onerror="this.parentElement.style.display='none'">
        </div>
      ` : ''}

      <div class="bookmark-content">
        <div class="bookmark-header">
          <a href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer" class="bookmark-url">
            ${escapeHTML(item.title)}
          </a>
          <span class="bookmark-domain">${escapeHTML(host)}</span>
        </div>

        ${item.description ? `
          <p class="bookmark-description">${escapeHTML(item.description)}</p>
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

        ${isOwner ? `
          <div class="bookmark-actions">
            <button class="btn btn-ghost btn-sm edit-bookmark-btn" data-id="${item.id}" title="Edit">Edit</button>
            <button class="btn btn-ghost btn-sm delete-bookmark-btn" data-id="${item.id}" title="Delete">Delete</button>
          </div>
        ` : ''}
      </div>
    `;

    container.appendChild(article);
  });

  // Attach tag click listeners
  container.querySelectorAll('.tag').forEach(tag => {
    tag.onclick = () => filterByTag(tag.getAttribute('data-tag'));
  });

  // Attach edit/delete listeners
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
}


// Render pagination
function renderPagination() {
  const container = document.getElementById('pagination');
  const infoSpan = document.getElementById('pagination-info');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  if (!container || !infoSpan || !prevBtn || !nextBtn) return;

  const { totalPages, page } = profileState.pagination;

  if (totalPages <= 1) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';
  infoSpan.textContent = `Page ${page} of ${totalPages}`;
  prevBtn.disabled = (page === 1);
  nextBtn.disabled = (page === totalPages);
}

// Edit bookmark modal (profile version — uses profileState)
async function openEditBookmarkModal(bookmarkId) {
  const bookmark = profileState.bookmarks.find(b => b.id === bookmarkId);
  if (!bookmark) return;

  const modal = document.getElementById('bookmark-modal');
  if (!modal) return;

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

  const saveBtn = document.getElementById('bookmark-submit');
  if (saveBtn) { saveBtn.classList.remove('saving', 'done'); saveBtn.disabled = false; }

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

  const titleEl = document.getElementById('bookmark-modal-title');
  if (titleEl) titleEl.textContent = 'Edit bookmark';

  modal.classList.add('active');
}

// Delete bookmark (profile version — reloads after delete)
async function performDeleteBookmark(id) {
  const modal = document.getElementById('delete-confirmation-modal');
  if (!modal) return;

  const confirmed = await new Promise(resolve => {
    modal.classList.add('active');

    const confirmBtn = document.getElementById('delete-confirm-btn');
    const cancelBtns = modal.querySelectorAll('.delete-cancel');

    const cleanup = () => {
      modal.classList.remove('active');
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtns.forEach(b => b.removeEventListener('click', onCancel));
    };

    const onConfirm = () => { cleanup(); resolve(true); };
    const onCancel  = () => { cleanup(); resolve(false); };

    confirmBtn.addEventListener('click', onConfirm);
    cancelBtns.forEach(b => b.addEventListener('click', onCancel));
  });

  if (!confirmed) return;

  try {
    const res = await fetch(`/api/bookmarks/${id}`, { method: 'DELETE', credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete bookmark');
    profileState.bookmarks = profileState.bookmarks.filter(b => b.id !== id);
    renderBookmarks();
  } catch (err) {
    alert(err.message);
  }
}

// Filter by tag
async function filterByTag(tagName) {
  profileState.activeTag = tagName;
  profileState.currentPage = 1;
  window.sidebarTags.setActiveTags([tagName]);
  await loadBookmarks();
}

// Clear filters
async function clearFilters() {
  profileState.activeTag = null;
  profileState.searchQuery = '';
  profileState.currentPage = 1;
  await loadBookmarks();
  renderPopularTags();
}

// Helper functions
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

// Setup pagination buttons
async function initProfile() {
  // Wait for header to be ready — use flag to avoid missing an already-fired event
  if (!window.__headerReady) {
    await new Promise(resolve => {
      if (window.__headerReady) { resolve(); return; }
      window.addEventListener('headerReady', resolve, { once: true });
    });
  }

  // Check session for header
  await checkSession();

  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  if (prevBtn) {
    prevBtn.addEventListener('click', async () => {
      if (profileState.currentPage > 1) {
        profileState.currentPage--;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        await loadBookmarks();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', async () => {
      if (profileState.currentPage < profileState.pagination.totalPages) {
        profileState.currentPage++;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        await loadBookmarks();
      }
    });
  }

  // Profile dropdown and logout handled by header.js

  // Followers link
  const followersLink = document.getElementById('followers-link');
  if (followersLink) {
    followersLink.addEventListener('click', async (e) => {
      e.preventDefault();
      await showUsersModal('followers');
    });
  }

  // Following link
  const followingLink = document.getElementById('following-link');
  if (followingLink) {
    followingLink.addEventListener('click', async (e) => {
      e.preventDefault();
      await showUsersModal('following');
    });
  }

  // Users modal close
  const usersModalClose = document.getElementById('users-modal-close');
  if (usersModalClose) {
    usersModalClose.addEventListener('click', () => {
      const modal = document.getElementById('users-modal');
      if (modal) modal.classList.remove('active');
    });
  }

  // Follow button
  const followBtn = document.getElementById('follow-btn');
  if (followBtn) {
    followBtn.addEventListener('click', async () => {
      if (!profileState.currentUser) {
        alert('Please sign in to follow users');
        return;
      }

      const isFollowing = profileState.user.isFollowing;
      const method = isFollowing ? 'DELETE' : 'POST';

      try {
        followBtn.disabled = true;
        const response = await fetch(`/api/users/${profileState.user.username}/follow`, {
          method: method
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update follow status');
        }

        // Reload profile to get updated counts and status
        await loadProfile();
      } catch (err) {
        console.error('Follow error:', err);
        alert(err.message);
        followBtn.disabled = false;
      }
    });
  }

  // Bookmark form submit (edit only — profile owners can edit their bookmarks)
  // bookmark-modals.js injects the HTML async, so we use event delegation
  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('#bookmark-form');
    if (!form) return;
    e.preventDefault();

    const modal = document.getElementById('bookmark-modal');
    const bookmarkId = modal?.dataset.editingId;
    if (!bookmarkId) return; // profile only supports editing, not creating

    const url = document.getElementById('bookmark-url')?.value;
    const title = document.getElementById('bookmark-title')?.value;
    const description = document.getElementById('bookmark-description')?.value || '';
    const tags = document.getElementById('bookmark-tags')?.value || '';
    const isPublic = document.getElementById('bookmark-is-public')?.checked ?? true;
    const og_image = modal?.dataset.ogImage || null;

    const submitBtn = document.getElementById('bookmark-submit');
    if (submitBtn) { submitBtn.classList.add('saving'); submitBtn.disabled = true; }

    try {
      const res = await fetch(`/api/bookmarks/${bookmarkId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url, title, description,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          is_public: isPublic, og_image })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      if (submitBtn) { submitBtn.classList.remove('saving'); submitBtn.classList.add('done'); }
      await new Promise(r => setTimeout(r, 480));

      modal.classList.add('exit');
      setTimeout(() => {
        modal.classList.remove('active', 'exit');
        delete modal.dataset.editingId;
        delete modal.dataset.ogImage;
        if (submitBtn) submitBtn.classList.remove('done');
        form.reset();
        const thumb = document.getElementById('bm-og-thumb');
        if (thumb) thumb.classList.remove('visible');
      }, 200);

      await loadBookmarks();
    } catch (err) {
      if (submitBtn) { submitBtn.classList.remove('saving'); submitBtn.disabled = false; }
      alert(err.message);
    }
  });

  // Load profile on page load
  loadProfile();
}

// Show followers or following modal
async function showUsersModal(type) {
  const modal = document.getElementById('users-modal');
  const title = document.getElementById('users-modal-title');
  const list = document.getElementById('users-list');

  if (!modal || !title || !list) return;

  title.textContent = type === 'followers' ? 'Followers' : 'Following';
  list.innerHTML = '<p style="text-align: center; color: var(--muted);">Loading...</p>';

  modal.classList.add('active');

  try {
    const response = await fetch(`/api/users/${profileState.username}/${type}`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to load users');

    const data = await response.json();
    const users = data[type] || [];

    if (users.length === 0) {
      list.innerHTML = `<p style="text-align: center; color: var(--muted);">No ${type} yet</p>`;
      return;
    }

    list.innerHTML = '';

    users.forEach(user => {
      const userItem = document.createElement('a');
      userItem.href = `/user/${user.username}`;
      userItem.className = 'user-list-item';
      userItem.style.cssText = 'display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3); background: var(--bg); border: 1px solid var(--border); border-radius: 10px; text-decoration: none; color: var(--fg); transition: all var(--duration-fast) var(--transition);';

      userItem.addEventListener('mouseenter', () => {
        userItem.style.borderColor = 'var(--accent)';
        userItem.style.background = 'var(--accent-subtle)';
      });
      userItem.addEventListener('mouseleave', () => {
        userItem.style.borderColor = 'var(--border)';
        userItem.style.background = 'var(--bg)';
      });

      const avatarDiv = document.createElement('div');
      avatarDiv.style.cssText = 'width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l * 0.9) c calc(h + 20)) 100%); display: flex; align-items: center; justify-content: center; font-weight: 700; color: white; flex-shrink: 0; overflow: hidden;';

      if (user.avatar) {
        const img = document.createElement('img');
        img.src = user.avatar;
        img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
        avatarDiv.appendChild(img);
      } else {
        avatarDiv.textContent = user.username.charAt(0).toUpperCase();
      }

      const usernameSpan = document.createElement('span');
      usernameSpan.style.cssText = 'font-weight: 600;';
      usernameSpan.textContent = `@${user.username}`;

      userItem.appendChild(avatarDiv);
      userItem.appendChild(usernameSpan);
      list.appendChild(userItem);
    });
  } catch (err) {
    console.error('Load users error:', err);
    list.innerHTML = '<p style="text-align: center; color: var(--muted);">Failed to load users</p>';
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProfile);
} else {
  initProfile();
}
