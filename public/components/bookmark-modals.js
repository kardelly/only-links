/**
 * Shared Bookmark Modals Component Controller
 * Handles bookmark creation/editing and deletion
 */

// Debounce helper for tag input autocomplete
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

// Fetch user's tags by query using the new scoped endpoint
async function fetchUserTagsByQuery(query) {
  try {
    const params = new URLSearchParams({
      q: query,
      type: 'my'
    });
    const res = await fetch(`/api/tags?${params.toString()}`, { credentials: 'include' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.tags || [];
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
      // Reset fields on close so they don't bleed into the next open
      const form = document.getElementById('bookmark-form');
      if (form) form.reset();
      if (typeof resetModalTags === 'function') resetModalTags();
      const urlInput = document.getElementById('bookmark-url');
      const tagTextInput = document.getElementById('bookmark-tag-input');
      if (urlInput) urlInput.value = '';
      if (tagTextInput) tagTextInput.value = '';
      document.getElementById('bm-tag-suggestions')?.remove();
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

  // Debounced tag autocomplete to reduce API calls during rapid typing
  const debouncedFetch = debounce(async (query) => {
    const matchingTags = await fetchUserTagsByQuery(query);
    const filtered = matchingTags.filter(t => !_tagPillState.tags.includes(t.name.toLowerCase())).slice(0, 8);
    renderDropdown(filtered);
  }, 200);

  textInput.addEventListener('input', async () => {
    const query = textInput.value.trim().toLowerCase();
    if (!query) { closeDropdown(); return; }
    debouncedFetch(query);
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

  let blurTimeout = null;
  textInput.addEventListener('blur', () => {
    blurTimeout = setTimeout(() => {
      // Only confirm tag if modal is still open
      const modal = document.getElementById('bookmark-modal');
      if (!modal?.classList.contains('active')) { closeDropdown(); return; }
      const val = textInput.value.trim();
      if (val) addTag(val);
      closeDropdown();
    }, 150);
  });
}

// Called by tag suggestion chips in app.js
function addTagFromSuggestion(tag) {
  tag = tag.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
  if (!tag || _tagPillState.tags.includes(tag)) return;
  _tagPillState.tags.push(tag);
  const pillsEl = document.getElementById('bm-tag-pills');
  const hidden  = document.getElementById('bookmark-tags');
  const textInput = document.getElementById('bookmark-tag-input');
  if (pillsEl) {
    pillsEl.innerHTML = _tagPillState.tags.map(t => `
      <span class="bm-tag-pill">
        ${t}
        <button type="button" class="bm-tag-pill-remove" data-tag="${t}" aria-label="Remove ${t}">×</button>
      </span>
    `).join('');
    pillsEl.querySelectorAll('.bm-tag-pill-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        _tagPillState.tags = _tagPillState.tags.filter(x => x !== btn.dataset.tag);
        setModalTags(_tagPillState.tags);
      });
    });
    if (textInput) textInput.placeholder = _tagPillState.tags.length ? '' : 'add a tag...';
  }
  if (hidden) hidden.value = _tagPillState.tags.join(', ');
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
