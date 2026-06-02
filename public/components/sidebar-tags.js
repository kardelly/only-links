/**
 * Shared Sidebar Tags Component
 * Manages tag loading, rendering, and filtering
 */

let tagsState = {
  popularTags: [],
  activeTags: [],
  showAllTags: false,
  isInitialized: false,
  onTagClick: null // Callback function when tag is clicked
};

// Load sidebar tags component
async function initSidebarTags(options = {}) {
  if (tagsState.isInitialized) return;

  const placeholder = document.getElementById('sidebar-tags-placeholder');
  if (!placeholder) {
    console.error('Sidebar tags placeholder not found');
    return;
  }

  try {
    const response = await fetch('/components/sidebar-tags.html');
    if (!response.ok) throw new Error('Failed to load sidebar tags');
    const html = await response.text();
    placeholder.innerHTML = html;

    if (options.onTagClick && typeof options.onTagClick === 'function') {
      tagsState.onTagClick = options.onTagClick;
    }

    await fetchPopularTags();
    tagsState.isInitialized = true;
  } catch {
    // non-critical — sidebar degrades silently
  }
}

// Fetch popular tags from API
async function fetchPopularTags() {
  try {
    const response = await fetch('/api/tags?limit=25');
    if (!response.ok) throw new Error('Failed to fetch tags');
    const data = await response.json();
    tagsState.popularTags = data.tags;
    renderPopularTags();
  } catch {
    // non-critical
  }
}

// Render popular tags in sidebar
function renderPopularTags() {
  const container = document.getElementById('popular-tags');
  if (!container) return;

  container.innerHTML = '';

  if (tagsState.popularTags.length === 0) {
    container.innerHTML = `<p style="font-size: var(--text-sm); color: var(--muted);">No tags yet</p>`;
    return;
  }

  // Initialize showAllTags if undefined
  if (tagsState.showAllTags === undefined) {
    tagsState.showAllTags = false;
  }

  // Show first 10, or all if expanded
  const visibleCount = tagsState.showAllTags ? tagsState.popularTags.length : 10;
  const tagsToShow = tagsState.popularTags.slice(0, visibleCount);

  tagsToShow.forEach(tag => {
    const isSelected = tagsState.activeTags.includes(tag.name);
    const button = document.createElement('button');
    button.className = 'tag-item' + (isSelected ? ' selected' : '');
    button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    button.setAttribute('aria-label', `Filter by #${tag.name}, ${tag.count} bookmarks`);

    button.innerHTML = `
      <span class="tag-item-name">#${escapeTagHTML(tag.name)}</span>
      <span class="tag-item-count" aria-hidden="true">${tag.count}</span>
    `;

    button.onclick = () => handleTagClick(tag.name);
    container.appendChild(button);
  });

  // Add "Show more" button if there are more tags
  if (tagsState.popularTags.length > 10) {
    const showMoreBtn = document.createElement('button');
    showMoreBtn.className = 'show-more-tags-btn';
    showMoreBtn.innerHTML = tagsState.showAllTags
      ? `Show less <span style="font-size: 10px;">▲</span>`
      : `+${tagsState.popularTags.length - 10} more <span style="font-size: 10px;">▼</span>`;

    showMoreBtn.onclick = () => {
      tagsState.showAllTags = !tagsState.showAllTags;
      renderPopularTags();
    };

    container.appendChild(showMoreBtn);
  }
}

// Handle tag click
function handleTagClick(tagName) {
  // Toggle tag in activeTags array
  const index = tagsState.activeTags.indexOf(tagName);
  if (index > -1) {
    tagsState.activeTags.splice(index, 1);
  } else {
    tagsState.activeTags.push(tagName);
  }

  // Re-render to update selected state
  renderPopularTags();

  // Call external callback if provided
  if (tagsState.onTagClick) {
    tagsState.onTagClick(tagName, tagsState.activeTags);
  }
}

// Set active tags externally (e.g., from search input)
function setActiveTags(tags) {
  tagsState.activeTags = Array.isArray(tags) ? tags : [];
  renderPopularTags();
}

// Get current active tags
function getActiveTags() {
  return [...tagsState.activeTags];
}

// Refresh tags from API
async function refreshSidebarTags() {
  await fetchPopularTags();
}

// HTML escape helper
function escapeTagHTML(str) {
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

// Export functions for external use
window.sidebarTags = {
  init: initSidebarTags,
  setActiveTags,
  getActiveTags,
  refresh: refreshSidebarTags,
  render: renderPopularTags
};
