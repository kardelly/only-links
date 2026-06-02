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

// Tag pill input — shared instance, re-initialized when modal opens
let _tagPillState = { tags: [] };

function setupTagsAutocomplete() {
  const textInput  = document.getElementById('bookmark-tag-input');
  const hidden     = document.getElementById('bookmark-tags');
  const pillsEl    = document.getElementById('bm-tag-pills');
  const dropdown   = document.getElementById('bm-tags-dropdown');
  const field      = document.getElementById('bm-tag-field');
  if (!textInput || !hidden || !pillsEl || !dropdown || !field) return;

  let activeIndex = -1;

  // Click on container focuses the text input
  field.addEventListener('click', (e) => {
    if (!e.target.closest('.bm-tag-pill')) textInput.focus();
  });

  function syncHidden() {
    hidden.value = _tagPillState.tags.join(', ');
  }

  function renderPills() {
    pillsEl.innerHTML = _tagPillState.tags.map(tag => `
      <span class="bm-tag-pill">
        ${tag}
        <button type="button" class="bm-tag-pill-remove" data-tag="${tag}" aria-label="Remove ${tag}">×</button>
      </span>
    `).join('');
    pillsEl.querySelectorAll('.bm-tag-pill-remove').forEach(btn => {
      btn.addEventListener('click', () => removeTag(btn.dataset.tag));
    });
    // Update placeholder visibility
    textInput.placeholder = _tagPillState.tags.length ? '' : 'add a tag...';
  }

  function addTag(tag) {
    tag = tag.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    if (!tag || _tagPillState.tags.includes(tag)) return;
    _tagPillState.tags.push(tag);
    renderPills();
    syncHidden();
    textInput.value = '';
    closeDropdown();
    _userTagsCache = null;
  }

  function removeTag(tag) {
    _tagPillState.tags = _tagPillState.tags.filter(t => t !== tag);
    renderPills();
    syncHidden();
    textInput.focus();
  }

  function closeDropdown() {
    dropdown.classList.remove('open');
    dropdown.innerHTML = '';
    activeIndex = -1;
  }

  function renderDropdown(tags) {
    activeIndex = -1;
    if (!tags.length) { closeDropdown(); return; }
    dropdown.innerHTML = tags.map(t =>
      `<li role="option" aria-selected="false" data-tag="${t.name}">
        <span>${t.name}</span>
        <span class="bm-tag-count">${t.count}</span>
      </li>`
    ).join('');
    dropdown.classList.add('open');
    dropdown.querySelectorAll('li').forEach(li => {
      li.addEventListener('mousedown', (e) => { e.preventDefault(); addTag(li.dataset.tag); });
    });
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

  textInput.addEventListener('input', async () => {
    const token = textInput.value.trim().toLowerCase();
    if (!token) { closeDropdown(); return; }
    const allTags = await loadUserTags();
    const matches = allTags
      .filter(t => t.name.toLowerCase().startsWith(token) && !_tagPillState.tags.includes(t.name.toLowerCase()))
      .slice(0, 8);
    renderDropdown(matches);
  });

  textInput.addEventListener('keydown', (e) => {
    const items = dropdown.querySelectorAll('li');
    if (dropdown.classList.contains('open')) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(activeIndex + 1, items.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(Math.max(activeIndex - 1, 0)); return; }
      if ((e.key === 'Enter' || e.key === 'Tab') && activeIndex >= 0) {
        e.preventDefault(); addTag(items[activeIndex].dataset.tag); return;
      }
      if (e.key === 'Escape') { closeDropdown(); return; }
    }
    // Confirm current input as tag on Enter, comma, Tab
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      const val = textInput.value.replace(/,$/, '').trim();
      if (val) { e.preventDefault(); addTag(val); }
    }
    // Backspace on empty input removes last pill
    if (e.key === 'Backspace' && !textInput.value && _tagPillState.tags.length) {
      removeTag(_tagPillState.tags[_tagPillState.tags.length - 1]);
    }
  });

  textInput.addEventListener('blur', () => {
    setTimeout(() => {
      // Confirm any remaining typed text as tag
      const val = textInput.value.trim();
      if (val) addTag(val);
      closeDropdown();
    }, 150);
  });
}

// Expose for external code that needs to seed/read tags (edit mode)
function setModalTags(tags) {
  _tagPillState.tags = [...tags];
  const pillsEl = document.getElementById('bm-tag-pills');
  const hidden  = document.getElementById('bookmark-tags');
  if (pillsEl) {
    // re-render by re-running setup render logic inline
    pillsEl.innerHTML = _tagPillState.tags.map(tag => `
      <span class="bm-tag-pill">
        ${tag}
        <button type="button" class="bm-tag-pill-remove" data-tag="${tag}" aria-label="Remove ${tag}">×</button>
      </span>
    `).join('');
    pillsEl.querySelectorAll('.bm-tag-pill-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        _tagPillState.tags = _tagPillState.tags.filter(t => t !== btn.dataset.tag);
        setModalTags(_tagPillState.tags);
        if (hidden) hidden.value = _tagPillState.tags.join(', ');
      });
    });
    const textInput = document.getElementById('bookmark-tag-input');
    if (textInput) textInput.placeholder = _tagPillState.tags.length ? '' : 'add a tag...';
  }
  if (hidden) hidden.value = _tagPillState.tags.join(', ');
}

function resetModalTags() {
  _tagPillState.tags = [];
  setModalTags([]);
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBookmarkModals);
} else {
  initBookmarkModals();
}
