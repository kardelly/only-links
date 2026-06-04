import { BaseView } from './base-view.js';
import { escapeHtml, timeAgo, debounce, fetchWithError } from './utils.js';

export class SearchView extends BaseView {
  constructor() {
    super('search-view');
    this.query = '';
    this.activeTab = 'bookmarks'; // 'bookmarks' | 'people' | 'tags'
    this.debouncedSearch = debounce(this.performSearch.bind(this), 300);
  }

  async load() {
    this.render();
  }

  render() {
    this.clear();

    this.container.innerHTML = `
      <div class="search-container">
        <div class="search-input-wrapper">
          <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="search"
            id="search-input"
            class="search-input"
            placeholder="Search…"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="none">
        </div>
        <div class="search-tabs">
          <button class="search-tab active" data-tab="bookmarks">Bookmarks</button>
          <button class="search-tab" data-tab="people">People</button>
          <button class="search-tab" data-tab="tags">Tags</button>
        </div>
        <div id="search-results" class="search-results"></div>
      </div>
    `;

    const input = this.container.querySelector('#search-input');
    input.addEventListener('input', (e) => {
      this.query = e.target.value.trim();
      this.query.length > 1 ? this.debouncedSearch() : this.clearResults();
    });

    this.container.querySelectorAll('.search-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.search-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTab = btn.dataset.tab;
        if (this.activeTab === 'tags') {
          this.showTagsCloud();
        } else {
          this.query ? this.performSearch() : this.clearResults();
        }
      });
    });

    setTimeout(() => input.focus(), 100);
  }

  async performSearch() {
    if (!this.query) { this.clearResults(); return; }

    const resultsEl = this.container.querySelector('#search-results');
    if (!resultsEl) return;
    resultsEl.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

    if (this.activeTab === 'people') {
      await this.searchPeople(resultsEl);
    } else if (this.activeTab === 'tags') {
      await this.showTagsCloud();
    } else {
      await this.searchBookmarks(resultsEl);
    }
  }

  async showTagsCloud() {
    const resultsEl = this.container.querySelector('#search-results');
    if (!resultsEl) return;
    resultsEl.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

    const data = await fetchWithError('/api/tags?limit=100');
    resultsEl.innerHTML = '';

    if (!data?.tags?.length) {
      resultsEl.innerHTML = '<div class="search-empty">No tags yet.</div>';
      return;
    }

    const cloud = document.createElement('div');
    cloud.className = 'tags-cloud';

    data.tags.forEach(tag => {
      const name = tag.name || tag;
      const count = tag.count || tag.bookmark_count || 0;
      const item = document.createElement('div');
      item.className = 'tag-item';
      item.innerHTML = `<span class="tag-name">${escapeHtml(name)}</span>${count ? `<span class="tag-count">${count}</span>` : ''}`;
      item.addEventListener('click', () => {
        // Navigate to search with this tag pre-filled
        const input = this.container.querySelector('#search-input');
        if (input) {
          input.value = name;
          this.query = name;
          // Switch to bookmarks tab
          this.container.querySelectorAll('.search-tab').forEach(b => b.classList.remove('active'));
          const bookmarksTab = this.container.querySelector('[data-tab="bookmarks"]');
          if (bookmarksTab) bookmarksTab.classList.add('active');
          this.activeTab = 'bookmarks';
          this.performSearch();
        }
      });
      cloud.appendChild(item);
    });

    resultsEl.appendChild(cloud);
  }

  async searchBookmarks(resultsEl) {
    const data = await fetchWithError(`/api/bookmarks?q=${encodeURIComponent(this.query)}&limit=50`);
    resultsEl.innerHTML = '';

    if (!data || !data.items || data.items.length === 0) {
      resultsEl.innerHTML = `
        <div class="search-active-filter">
          <span class="search-filter-chip">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            ${escapeHtml(this.query)}
          </span>
        </div>
        <div class="search-empty">No bookmarks found for <strong>${escapeHtml(this.query)}</strong></div>`;
      return;
    }

    const total = data.pagination?.total || data.items.length;

    // Active filter chip + result count
    const header = document.createElement('div');
    header.className = 'search-active-filter';
    header.innerHTML = `
      <span class="search-filter-chip">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        ${escapeHtml(this.query)}
      </span>
      <span class="search-result-count">${total} result${total !== 1 ? 's' : ''}</span>
    `;
    resultsEl.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'bookmark-grid';
    data.items.forEach(b => grid.appendChild(this.createBookmarkCard(b)));
    resultsEl.appendChild(grid);
  }

  async searchPeople(resultsEl) {
    const data = await fetchWithError(`/api/users?q=${encodeURIComponent(this.query)}`);
    resultsEl.innerHTML = '';

    if (!data || !data.users || data.users.length === 0) {
      resultsEl.innerHTML = `<div class="search-empty">No users found for <strong>${escapeHtml(this.query)}</strong></div>`;
      return;
    }

    const list = document.createElement('div');
    list.className = 'people-list';

    data.users.forEach(user => {
      const row = document.createElement('div');
      row.className = 'people-row';
      const initials = user.username[0].toUpperCase();
      row.innerHTML = `
        <div class="people-avatar">
          ${user.avatar
            ? `<img src="${escapeHtml(user.avatar)}" alt="${escapeHtml(user.username)}" onerror="this.parentElement.innerHTML='${initials}'">`
            : initials
          }
        </div>
        <div class="people-info">
          <span class="people-username">@${escapeHtml(user.username)}</span>
          <span class="people-count">${user.bookmark_count || 0} bookmarks</span>
        </div>
      `;
      row.addEventListener('click', () => {
        if (window.mobileApp) window.mobileApp.showPublicProfile(user.username);
      });
      list.appendChild(row);
    });

    resultsEl.appendChild(list);
  }

  createBookmarkCard(bookmark) {
    const card = document.createElement('div');
    card.className = 'bookmark-card';
    card.dataset.id = bookmark.id;

    const description = bookmark.description || bookmark.og_description || '';
    const tagsHtml = this.renderTags(bookmark.tags);

    let ogImage = bookmark.og_image || '';
    if (ogImage) {
      if (ogImage.startsWith('//')) ogImage = 'https:' + ogImage;
      else if (ogImage.startsWith('/')) {
        try { const base = new URL(bookmark.url); ogImage = `${base.protocol}//${base.host}${ogImage}`; } catch { ogImage = ''; }
      }
      ogImage = ogImage.replace(/^http:\/\//, 'https://');
    }

    let domain = '';
    try { domain = new URL(bookmark.url).hostname.replace(/^www\./, ''); } catch {}

    const placeholderSrc = `/api/placeholder/${encodeURIComponent(domain || 'link')}`;

    card.innerHTML = `
      <div class="card-body">
        <div class="card-thumb">
          ${ogImage
            ? `<img src="${escapeHtml(ogImage)}" alt="" onerror="this.onerror=null;this.src='${placeholderSrc}'" loading="lazy">`
            : `<img src="${placeholderSrc}" alt="" loading="lazy">`
          }
        </div>
        <div class="card-content">
          <h3 class="card-title">${escapeHtml(bookmark.title)}</h3>
          ${description ? `<p class="card-description">${escapeHtml(description)}</p>` : ''}
          ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}
        </div>
      </div>
      <div class="card-footer">
        <span class="card-domain">${escapeHtml(domain)}</span>
        <span class="card-date">${timeAgo(bookmark.created_at)}</span>
      </div>
    `;

    card.addEventListener('click', () => window.open(bookmark.url, '_blank'));
    return card;
  }

  renderTags(tagsInput) {
    if (!tagsInput) return '';
    const tags = Array.isArray(tagsInput)
      ? tagsInput
      : tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const visible = tags.slice(0, 3);
    const rest = tags.length - 3;
    let html = visible.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
    if (rest > 0) html += `<span class="tag tag-more">+${rest}</span>`;
    return html;
  }

  clearResults() {
    const el = this.container.querySelector('#search-results');
    if (el) el.innerHTML = '';
  }
}
