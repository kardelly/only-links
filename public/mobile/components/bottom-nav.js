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
      console.error('[BottomNav] Container not found');
      return;
    }
    console.log('[BottomNav] Container found:', this.container);

    this.render();
    console.log('[BottomNav] Rendered');
    this.attachEventListeners();
    console.log('[BottomNav] Event listeners attached');
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

      <button class="nav-item" data-tab="notifications" aria-label="Notifications" style="position:relative;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <span class="notif-nav-badge"></span>
        <span>Alerts</span>
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
    console.log('[BottomNav] Found', buttons.length, 'nav items');

    buttons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = button.dataset.tab;
        console.log('[BottomNav] Clicked tab:', tab);
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
