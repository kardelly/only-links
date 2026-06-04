import { BaseView } from './base-view.js';
import { escapeHtml, fetchWithError, showToast } from './utils.js';

export class NotificationsView extends BaseView {
  constructor() {
    super('notifications-view');
    this.notifications = [];
  }

  async load() {
    this.showLoading();
    const data = await fetchWithError('/api/notifications');
    this.hideLoading();
    if (data) {
      this.notifications = data.notifications || [];
      this.updateBadge(data.unreadCount ?? 0);
      this.render();
    }
  }

  render() {
    this.clear();

    const header = document.createElement('div');
    header.style.cssText = 'padding: 16px 16px 8px; display: flex; align-items: center; justify-content: space-between;';
    header.innerHTML = `
      <h2 style="font-size: 20px; font-weight: 700;">Notifications</h2>
      <button id="notif-mark-all-mobile" style="font-size:13px;background:none;border:none;color:var(--primary);cursor:pointer;font-weight:500;font-family:inherit;">Mark all read</button>
    `;
    this.container.appendChild(header);

    if (this.notifications.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<p style="color:var(--text-secondary)">No notifications yet.</p>';
      this.container.appendChild(empty);
    } else {
      const list = document.createElement('div');
      list.id = 'mobile-notif-list';

      this.notifications.forEach(n => {
        const item = document.createElement('div');
        item.className = 'notif-item-mobile' + (n.read ? '' : ' unread');
        item.dataset.id = n.id;

        const initials = (n.actor_username || '?')[0].toUpperCase();

        // Build avatar safely (DOM, not innerHTML)
        const avatarEl = document.createElement('div');
        avatarEl.style.cssText = 'width:40px;height:40px;border-radius:50%;background:var(--primary);color:white;font-size:15px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;';
        if (n.actor_avatar) {
          const img = document.createElement('img');
          img.src = n.actor_avatar;
          img.alt = '';
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
          img.addEventListener('error', () => { avatarEl.textContent = initials; });
          avatarEl.appendChild(img);
        } else {
          avatarEl.textContent = initials;
        }

        // Build text
        const textContainer = document.createElement('div');
        textContainer.style.cssText = 'flex:1;min-width:0;';

        const diff = Date.now() - new Date(n.created_at).getTime();
        const m = Math.floor(diff / 60000);
        const timeStr = m < 1 ? 'just now' : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m/60)}h ago` : `${Math.floor(m/1440)}d ago`;

        const textEl = document.createElement('div');
        textEl.style.cssText = 'font-size:14px;color:var(--text);line-height:1.4;';
        if (n.type === 'follow') {
          textEl.innerHTML = `<strong>${escapeHtml(n.actor_username)}</strong> started following you`;
        } else {
          textEl.innerHTML = `<strong>${escapeHtml(n.actor_username)}</strong> saved your link <em>${escapeHtml(n.bookmark_title || '')}</em>`;
        }

        const timeEl = document.createElement('div');
        timeEl.style.cssText = 'font-size:12px;color:var(--text-secondary);margin-top:2px;';
        timeEl.textContent = timeStr;

        textContainer.appendChild(textEl);
        textContainer.appendChild(timeEl);

        item.style.cssText = 'display:flex;gap:12px;align-items:flex-start;';
        item.appendChild(avatarEl);
        item.appendChild(textContainer);
        item.addEventListener('click', () => this.handleClick(n, item));
        list.appendChild(item);
      });

      this.container.appendChild(list);
    }

    // Mark all read button
    this.container.querySelector('#notif-mark-all-mobile')?.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/notifications/read', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [] })
        });
        if (!res.ok) throw new Error('failed');
        this.container.querySelectorAll('.notif-item-mobile.unread').forEach(el => el.classList.remove('unread'));
        this.notifications.forEach(n => { n.read = 1; });
        this.updateBadge(0);
        showToast('All marked as read', 'success');
      } catch (_) {
        showToast('Failed to mark as read', 'error');
      }
    });
  }

  async handleClick(n, itemEl) {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [n.id] })
      });
      if (!n.read) {
        itemEl.classList.remove('unread');
        n.read = 1;
        const unread = this.notifications.filter(x => !x.read).length;
        this.updateBadge(unread);
      }
    } catch (_) {
      // silent fail — still navigate
    }

    if (n.type === 'follow') {
      if (window.mobileApp) window.mobileApp.showPublicProfile(n.actor_username);
    } else if (n.bookmark_url) {
      window.open(n.bookmark_url, '_blank');
    }
  }

  updateBadge(count) {
    const badge = document.querySelector('.notif-nav-badge');
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  async refresh() {
    const data = await fetchWithError('/api/notifications');
    if (data) {
      this.notifications = data.notifications || [];
      this.updateBadge(data.unreadCount);
      this.render();
    }
  }
}
