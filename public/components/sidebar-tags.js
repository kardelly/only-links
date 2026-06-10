/**
 * Shared Sidebar Tags Component
 * Sidebar shows top 12. "Ver todas" opens a modal with incremental loading.
 */

const SIDEBAR_LIMIT = 12;
const MODAL_PAGE_SIZE = 25;

let tagsState = {
  popularTags: [],       // top SIDEBAR_LIMIT loaded on init
  total: 0,              // total tag count from API
  activeTags: [],
  isInitialized: false,
  onTagClick: null,
  userId: null,          // if set, load user's tags instead of popular tags
  username: null,        // for public profile context
  // modal state
  modalOpen: false,
  modalTags: [],         // accumulates as user loads more
  modalOffset: 0,
  modalHasMore: false,
  modalLoading: false,
};

// ─── Init ────────────────────────────────────────────────────────────────────

async function initSidebarTags(options = {}) {
  if (tagsState.isInitialized) return;

  const placeholder = document.getElementById('sidebar-tags-placeholder');
  if (!placeholder) return;

  try {
    const response = await fetch('/components/sidebar-tags.html');
    if (!response.ok) throw new Error('Failed to load sidebar tags');
    placeholder.innerHTML = await response.text();

    if (options.onTagClick) tagsState.onTagClick = options.onTagClick;

    await fetchSidebarTags();
    tagsState.isInitialized = true;
  } catch {
    // non-critical
  }
}

// ─── Sidebar fetch (top 12 + total) ─────────────────────────────────────────

async function fetchSidebarTags() {
  try {
    let url;

    // If username is set, fetch that user's public tags (for public profile pages)
    if (tagsState.username) {
      url = `/api/users/${encodeURIComponent(tagsState.username)}/tags?limit=${SIDEBAR_LIMIT}`;
    } else if (tagsState.userId) {
      // Authenticated user viewing their own tags
      url = `/api/tags/mine?limit=${SIDEBAR_LIMIT}`;
    } else {
      // Otherwise fetch popular tags (for discover/all feeds)
      url = `/api/tags/popular?limit=${SIDEBAR_LIMIT}`;
    }

    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error();
    const data = await res.json();
    tagsState.popularTags = data.tags || [];
    tagsState.total = data.total || 0;
    renderPopularTags();
  } catch {
    // non-critical
  }
}

// ─── Sidebar render ──────────────────────────────────────────────────────────

function renderPopularTags() {
  const container = document.getElementById('popular-tags');
  if (!container) return;
  container.innerHTML = '';

  if (tagsState.popularTags.length === 0) {
    container.innerHTML = `<p style="font-size:var(--text-sm);color:var(--muted)">No tags yet</p>`;
    return;
  }

  tagsState.popularTags.forEach(tag => {
    container.appendChild(makeTagButton(tag, false));
  });

  // "Ver todas X tags" button
  if (tagsState.total > SIDEBAR_LIMIT) {
    const btn = document.createElement('button');
    btn.className = 'show-more-tags-btn';
    btn.textContent = `Ver todas ${tagsState.total} tags`;
    btn.onclick = openTagsModal;
    container.appendChild(btn);
  }
}

function makeTagButton(tag, forModal) {
  const isSelected = tagsState.activeTags.includes(tag.name);
  const btn = document.createElement('button');
  btn.className = 'tag-item' + (isSelected ? ' selected' : '');
  btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
  btn.setAttribute('aria-label', `Filter by #${escapeTagHTML(tag.name)}, ${tag.count} bookmarks`);
  btn.innerHTML = `
    <span class="tag-item-name">#${escapeTagHTML(tag.name)}</span>
    <span class="tag-item-count" aria-hidden="true">${tag.count}</span>
  `;
  btn.onclick = () => {
    handleTagClick(tag.name);
    if (forModal) {
      // update selected state inside modal too
      btn.classList.toggle('selected', tagsState.activeTags.includes(tag.name));
      btn.setAttribute('aria-pressed', tagsState.activeTags.includes(tag.name) ? 'true' : 'false');
    }
  };
  return btn;
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function openTagsModal() {
  if (document.getElementById('tags-all-modal')) return;

  tagsState.modalTags = [];
  tagsState.modalOffset = 0;
  tagsState.modalHasMore = true;
  tagsState.modalOpen = true;

  // Backdrop
  const backdrop = document.createElement('div');
  backdrop.id = 'tags-all-backdrop';
  backdrop.style.cssText = `
    position:fixed;inset:0;background:oklch(18% 0.012 60 / 0.45);
    backdrop-filter:blur(4px);z-index:900;
    animation:tag-modal-fade-in 180ms ease;
  `;
  backdrop.onclick = closeTagsModal;

  // Modal
  const modal = document.createElement('div');
  modal.id = 'tags-all-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-label', 'All tags');
  modal.style.cssText = `
    position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
    width:min(480px,92vw);max-height:72vh;
    background:var(--surface);border:1px solid var(--border);
    border-radius:16px;box-shadow:0 24px 64px oklch(18% 0.012 60 / 0.18);
    display:flex;flex-direction:column;z-index:901;
    animation:tag-modal-slide-in 220ms cubic-bezier(0.16,1,0.3,1);
  `;
  modal.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 20px 0;">
      <h2 style="font-size:var(--text-base);font-weight:650;letter-spacing:-0.01em;color:var(--fg)">Todas as tags</h2>
      <button id="tags-modal-close" aria-label="Fechar" style="
        width:28px;height:28px;border-radius:50%;border:none;
        background:var(--border);color:var(--muted);cursor:pointer;
        display:flex;align-items:center;justify-content:center;
        transition:background 150ms,color 150ms,transform 150ms;font-size:16px;
      ">×</button>
    </div>
    <div id="tags-modal-list" style="
      flex:1;overflow-y:auto;padding:14px 20px 8px;
      display:flex;flex-wrap:wrap;gap:6px;align-content:flex-start;
    "></div>
    <div id="tags-modal-footer" style="padding:12px 20px 16px;border-top:1px solid var(--border);">
      <button id="tags-modal-load-more" style="
        width:100%;height:34px;border-radius:8px;border:1px solid var(--border);
        background:transparent;font-size:13px;font-weight:510;color:var(--muted);
        font-family:var(--font-sans);cursor:pointer;
        transition:background 150ms,color 150ms;
      ">Carregar mais</button>
    </div>
  `;

  // Inject keyframe animations once
  if (!document.getElementById('tag-modal-keyframes')) {
    const style = document.createElement('style');
    style.id = 'tag-modal-keyframes';
    style.textContent = `
      @keyframes tag-modal-fade-in { from { opacity:0 } to { opacity:1 } }
      @keyframes tag-modal-slide-in { from { opacity:0;transform:translate(-50%,-48%) } to { opacity:1;transform:translate(-50%,-50%) } }
      #tags-modal-close:hover { background:oklch(88% 0.008 60)!important;color:var(--fg)!important;transform:rotate(90deg); }
      #tags-modal-load-more:hover { background:var(--bg)!important;color:var(--fg)!important; }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(backdrop);
  document.body.appendChild(modal);

  modal.querySelector('#tags-modal-close').onclick = closeTagsModal;
  modal.querySelector('#tags-modal-load-more').onclick = loadMoreModalTags;

  // Keyboard close
  const onKey = (e) => { if (e.key === 'Escape') closeTagsModal(); };
  modal._onKey = onKey;
  document.addEventListener('keydown', onKey);

  loadMoreModalTags();
}

function closeTagsModal() {
  const modal = document.getElementById('tags-all-modal');
  const backdrop = document.getElementById('tags-all-backdrop');
  if (modal?._onKey) document.removeEventListener('keydown', modal._onKey);
  modal?.remove();
  backdrop?.remove();
  tagsState.modalOpen = false;
}

async function loadMoreModalTags() {
  if (tagsState.modalLoading || !tagsState.modalHasMore) return;
  tagsState.modalLoading = true;

  const loadMoreBtn = document.getElementById('tags-modal-load-more');
  if (loadMoreBtn) { loadMoreBtn.disabled = true; loadMoreBtn.textContent = 'Carregando…'; }

  try {
    let url;

    // If username is set, fetch that user's public tags (for public profile pages)
    if (tagsState.username) {
      url = `/api/users/${encodeURIComponent(tagsState.username)}/tags?limit=1000`;
    } else if (tagsState.userId) {
      // Authenticated user viewing their own tags
      url = `/api/tags/mine?limit=1000`;
    } else {
      // Load all popular tags for modal
      url = `/api/tags/popular?limit=1000`;
    }

    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error();
    const data = await res.json();

    const newTags = data.tags || [];
    tagsState.modalTags.push(...newTags);
    // These endpoints return all tags at once, no pagination
    tagsState.modalHasMore = false;

    const list = document.getElementById('tags-modal-list');
    if (list) {
      newTags.forEach(tag => list.appendChild(makeTagButton(tag, true)));
    }

    const footer = document.getElementById('tags-modal-footer');
    if (footer) {
      if (tagsState.modalHasMore) {
        footer.style.display = '';
        if (loadMoreBtn) { loadMoreBtn.disabled = false; loadMoreBtn.textContent = 'Carregar mais'; }
      } else {
        footer.style.display = 'none';
      }
    }
  } catch {
    if (loadMoreBtn) { loadMoreBtn.disabled = false; loadMoreBtn.textContent = 'Tentar novamente'; }
  } finally {
    tagsState.modalLoading = false;
  }
}

// ─── Tag click ───────────────────────────────────────────────────────────────

function handleTagClick(tagName) {
  const idx = tagsState.activeTags.indexOf(tagName);
  if (idx > -1) tagsState.activeTags.splice(idx, 1);
  else tagsState.activeTags.push(tagName);

  renderPopularTags();

  if (tagsState.onTagClick) tagsState.onTagClick(tagName, tagsState.activeTags);
}

// ─── Public API ──────────────────────────────────────────────────────────────

function setActiveTags(tags) {
  tagsState.activeTags = Array.isArray(tags) ? tags : [];
  renderPopularTags();
}

function getActiveTags() {
  return [...tagsState.activeTags];
}

async function refreshSidebarTags() {
  await fetchSidebarTags();
}

function setUserId(userId, username = null) {
  tagsState.userId = userId;
  tagsState.username = username;
  // Refresh sidebar when userId changes
  fetchSidebarTags();
}

function clearUserId() {
  tagsState.userId = null;
  tagsState.username = null;
  // Refresh sidebar to go back to popular tags
  fetchSidebarTags();
}

function escapeTagHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

window.sidebarTags = {
  init: initSidebarTags,
  setActiveTags,
  getActiveTags,
  refresh: refreshSidebarTags,
  render: renderPopularTags,
  setUserId,
  clearUserId,
};
