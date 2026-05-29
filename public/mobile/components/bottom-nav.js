/**
 * Bottom Navigation Component
 * Manages navigation between 5 main sections
 */
export class BottomNav {
  constructor(onNavigate) {
    this.onNavigate = onNavigate;
    this.currentTab = 'feed';
    this.container = null;
  }

  /**
   * Initialize bottom navigation
   */
  init() {
    this.container = document.getElementById('bottom-nav');
    if (!this.container) {
      console.error('Bottom nav container not found');
      return;
    }

    this.render();
    this.attachEventListeners();
  }

  /**
   * Render bottom navigation HTML
   */
  render() {
    this.container.innerHTML = `
      <button class="nav-item active" data-tab="feed" aria-label="Feed">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span>Feed</span>
      </button>

      <button class="nav-item" data-tab="search" aria-label="Search">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <span>Search</span>
      </button>

      <button class="nav-item nav-add" data-tab="add" aria-label="Add bookmark">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      <button class="nav-item" data-tab="tags" aria-label="Tags">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
          <line x1="7" y1="7" x2="7.01" y2="7"/>
        </svg>
        <span>Tags</span>
      </button>

      <button class="nav-item" data-tab="profile" aria-label="Profile">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span>Profile</span>
      </button>
    `;
  }

  /**
   * Attach event listeners to nav items
   */
  attachEventListeners() {
    const buttons = this.container.querySelectorAll('.nav-item');

    buttons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = button.dataset.tab;
        this.setActive(tab);
        this.onNavigate(tab);
      });
    });
  }

  /**
   * Set active tab
   */
  setActive(tab) {
    this.currentTab = tab;

    const buttons = this.container.querySelectorAll('.nav-item');
    buttons.forEach(button => {
      if (button.dataset.tab === tab) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }

  /**
   * Get current active tab
   */
  getActive() {
    return this.currentTab;
  }
}
