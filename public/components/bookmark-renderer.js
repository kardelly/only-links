/**
 * Shared Bookmark Renderer Component
 * Renders bookmark items with consistent structure
 */

window.bookmarkRenderer = {
  // Render a list of bookmarks into a container
  render: function(bookmarks, containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    // Empty state
    if (bookmarks.length === 0) {
      const emptyConfig = options.emptyState || {};
      container.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          <h3 class="empty-state-title">${emptyConfig.title || 'No bookmarks found'}</h3>
          <p class="empty-state-description">
            ${emptyConfig.description || 'Start saving links to build your collection.'}
          </p>
          ${emptyConfig.action || ''}
        </div>
      `;
      return;
    }

    // Render each bookmark
    bookmarks.forEach(item => {
      const article = this.renderBookmarkItem(item, options);
      container.appendChild(article);
    });
  },

  // Render single bookmark item
  renderBookmarkItem: function(item, options = {}) {
    const currentUserId = options.currentUserId;
    const onTagClick = options.onTagClick;
    const onEdit = options.onEdit;
    const onDelete = options.onDelete;

    // Generate clean hostname
    let host = 'link';
    try {
      host = new URL(item.url).hostname.replace('www.', '');
    } catch(e) {}

    const isOwner = currentUserId && currentUserId === item.user_id;

    const article = document.createElement('article');
    article.className = 'bookmark-item';

    // Convert relative og_image URLs to absolute
    let ogImage = item.og_image;
    if (ogImage && ogImage.startsWith('/')) {
      try {
        const baseUrl = new URL(item.url);
        ogImage = `${baseUrl.protocol}//${baseUrl.host}${ogImage}`;
      } catch (e) {
        console.error('Failed to convert relative URL:', e);
      }
    }

    // Render tags
    const tagsHtml = item.tags.map(tag => `
      <span class="tag" data-tag="${this.escapeHTML(tag)}">${this.escapeHTML(tag)}</span>
    `).join('');

    article.innerHTML = `
      ${ogImage ? `
        <div class="bookmark-thumbnail">
          <img src="${this.escapeHTML(ogImage)}" alt="${this.escapeHTML(item.title)}" loading="lazy" class="bookmark-img">
        </div>
      ` : ''}

      <div class="bookmark-content">
        <div class="bookmark-header">
          <a href="${this.escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer" class="bookmark-url">
            ${this.escapeHTML(item.title)}
          </a>
          <span class="bookmark-domain">${this.escapeHTML(host)}</span>
        </div>

        ${item.description ? `
          <p class="bookmark-description">${this.escapeHTML(item.description)}</p>
        ` : ''}

        ${item.tags.length > 0 ? `
          <div class="bookmark-tags">
            ${tagsHtml}
          </div>
        ` : ''}

        <div class="bookmark-meta">
          <a href="/user/${this.escapeHTML(item.username)}" class="username-link">@${this.escapeHTML(item.username)}</a>
          <span>•</span>
          <span>${this.timeAgo(item.created_at)}</span>
        </div>

        ${isOwner ? `
          <div class="bookmark-actions">
            <button class="btn btn-ghost btn-sm edit-bookmark-btn" data-id="${item.id}" title="Edit">
              Edit
            </button>
            <button class="btn btn-ghost btn-sm delete-bookmark-btn" data-id="${item.id}" title="Delete">
              Delete
            </button>
          </div>
        ` : ''}
      </div>
    `;

    // Handle image load errors
    const img = article.querySelector('.bookmark-img');
    if (img) {
      img.addEventListener('error', function() {
        this.parentElement.style.display = 'none';
      });
    }

    // Attach tag click listeners
    if (onTagClick) {
      article.querySelectorAll('.tag').forEach(tag => {
        tag.addEventListener('click', () => {
          onTagClick(tag.getAttribute('data-tag'));
        });
      });
    }

    // Attach edit/delete listeners
    if (isOwner) {
      if (onEdit) {
        const editBtn = article.querySelector('.edit-bookmark-btn');
        if (editBtn) {
          editBtn.addEventListener('click', () => onEdit(item.id));
        }
      }

      if (onDelete) {
        const deleteBtn = article.querySelector('.delete-bookmark-btn');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', () => onDelete(item.id));
        }
      }
    }

    return article;
  },

  // HTML escape helper
  escapeHTML: function(str) {
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
  },

  // Time ago helper
  timeAgo: function(dateString) {
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
};
