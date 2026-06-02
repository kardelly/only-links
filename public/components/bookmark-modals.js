/**
 * Shared Bookmark Modals Component Controller
 * Handles bookmark creation/editing and deletion
 */

// Cache of user's tags loaded once per session
let _userTagsCache = null;

async function loadUserTags() {
  if (_userTagsCache) return _userTagsCache;
  try {
    const res = await fetch('/api/tags/mine', { credentials: 'include' });
    if (!res.ok) return [];
    const data = await res.json();
    _userTagsCache = data.tags || [];
    return _userTagsCache;
  } catch {
    return [];
  }
}

// Load bookmark modals HTML and initialize
async function initBookmarkModals() {
  const placeholder = document.getElementById('bookmark-modals-placeholder');
  if (!placeholder) return;

  try {
    const response = await fetch('/components/bookmark-modals.html');
    if (!response.ok) throw new Error('Failed to load bookmark modals');
    const html = await response.text();
    placeholder.innerHTML = html;

    setupBookmarkModalsListeners();
    setupTagsAutocomplete();
  } catch (err) {
    console.error('Error loading bookmark modals:', err);
  }
}

// Setup all bookmark modal event listeners
function setupBookmarkModalsListeners() {
  const bookmarkModal = document.getElementById('bookmark-modal');
  const deleteModal = document.getElementById('delete-confirmation-modal');

  // Close bookmark modal
  const closeBookmarkBtns = [
    document.getElementById('bookmark-modal-close'),
    ...document.querySelectorAll('.bookmark-cancel'),
    bookmarkModal?.querySelector('.modal-backdrop')
  ];

  closeBookmarkBtns.forEach(btn => {
    btn?.addEventListener('click', () => {
      bookmarkModal?.classList.remove('active');
    });
  });

  // Close delete modal
  const closeDeleteBtns = [
    ...document.querySelectorAll('.delete-cancel'),
    deleteModal?.querySelector('.modal-backdrop')
  ];

  closeDeleteBtns.forEach(btn => {
    btn?.addEventListener('click', () => {
      deleteModal?.classList.remove('active');
    });
  });
}

function setupTagsAutocomplete() {
  const input = document.getElementById('bookmark-tags');
  const dropdown = document.getElementById('bm-tags-dropdown');
  if (!input || !dropdown) return;

  let activeIndex = -1;

  function getTypingToken() {
    const val = input.value;
    const pos = input.selectionStart;
    const before = val.slice(0, pos);
    const parts = before.split(',');
    return parts[parts.length - 1].trim().toLowerCase();
  }

  function getAlreadyUsed() {
    return input.value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
  }

  function renderDropdown(tags) {
    activeIndex = -1;
    if (!tags.length) { closeDropdown(); return; }
    dropdown.innerHTML = tags.map((t, i) =>
      `<li role="option" aria-selected="false" data-tag="${t.name}">
        <span>${t.name}</span>
        <span class="bm-tag-count">${t.count}</span>
      </li>`
    ).join('');
    dropdown.classList.add('open');

    dropdown.querySelectorAll('li').forEach(li => {
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        pickTag(li.dataset.tag);
      });
    });
  }

  function closeDropdown() {
    dropdown.classList.remove('open');
    dropdown.innerHTML = '';
    activeIndex = -1;
  }

  function pickTag(tag) {
    const parts = input.value.split(',');
    parts[parts.length - 1] = ' ' + tag;
    // trim leading space only on first token
    const joined = parts.map((p, i) => i === 0 ? p.trimStart() : p).join(',');
    input.value = joined + ', ';
    input.focus();
    closeDropdown();
    // invalidate cache so next open reflects new tag if it's new
    _userTagsCache = null;
  }

  function setActive(index) {
    const items = dropdown.querySelectorAll('li');
    items.forEach(li => li.setAttribute('aria-selected', 'false'));
    if (index >= 0 && index < items.length) {
      items[index].setAttribute('aria-selected', 'true');
      items[index].scrollIntoView({ block: 'nearest' });
    }
    activeIndex = index;
  }

  input.addEventListener('input', async () => {
    const token = getTypingToken();
    if (!token) { closeDropdown(); return; }
    const allTags = await loadUserTags();
    const used = getAlreadyUsed();
    const matches = allTags.filter(t =>
      t.name.toLowerCase().startsWith(token) && !used.includes(t.name.toLowerCase())
    ).slice(0, 8);
    renderDropdown(matches);
  });

  input.addEventListener('keydown', (e) => {
    const items = dropdown.querySelectorAll('li');
    if (!dropdown.classList.contains('open')) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(Math.min(activeIndex + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (activeIndex >= 0 && items[activeIndex]) {
        e.preventDefault();
        pickTag(items[activeIndex].dataset.tag);
      }
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  });

  input.addEventListener('blur', () => {
    // Small delay so mousedown on dropdown fires first
    setTimeout(closeDropdown, 150);
  });
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBookmarkModals);
} else {
  initBookmarkModals();
}
