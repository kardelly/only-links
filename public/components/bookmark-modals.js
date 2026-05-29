/**
 * Shared Bookmark Modals Component Controller
 * Handles bookmark creation/editing and deletion
 */

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

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBookmarkModals);
} else {
  initBookmarkModals();
}
