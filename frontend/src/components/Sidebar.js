import { authStore } from '../store/auth.js';
import { router } from '../router/index.js';
import { authApi } from '../api/auth.js';
import { api } from '../api/client.js';
import { toast } from './Toast.js';

const NAV_ITEMS = [
  { path: '/dashboard', icon: 'D', label: 'Dashboard' },
  { path: '/tasks', icon: 'T', label: 'Tasks' },
  { path: '/categories', icon: 'C', label: 'Danh muc' },
  { path: '/habits', icon: 'H', label: 'Habits' },
  { path: '/focus', icon: 'F', label: 'Focus Timer' },
  { path: '/calendar', icon: 'L', label: 'Calendar' },
  { path: '/notifications', icon: 'N', label: 'Notifications' },
];

const BOTTOM_ITEMS = [
  { path: '/settings', icon: 'S', label: 'Settings' },
];

function getInitials(name) {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Chao buoi sang';
  if (h < 18) return 'Chao buoi chieu';
  return 'Chao buoi toi';
}

export function renderSidebar() {
  const user = authStore.getUser();
  const currentRoute = window.location.hash.replace('#', '') || '/dashboard';
  const visibleNavItems = user?.role === 'admin'
    ? [...NAV_ITEMS, { path: '/admin', icon: 'A', label: 'Admin' }]
    : NAV_ITEMS;

  const sidebarEl = document.createElement('aside');
  sidebarEl.className = 'sidebar';
  sidebarEl.id = 'sidebar';

  const navHTML = visibleNavItems.map(item => `
    <a class="nav-item ${currentRoute === item.path ? 'active' : ''}"
       href="#${item.path}" data-path="${item.path}">
      <span class="nav-icon">${item.icon}</span>
      <span class="nav-label">${item.label}</span>
    </a>
  `).join('');

  const bottomHTML = BOTTOM_ITEMS.map(item => `
    <a class="nav-item ${currentRoute === item.path ? 'active' : ''}"
       href="#${item.path}" data-path="${item.path}">
      <span class="nav-icon">${item.icon}</span>
      <span class="nav-label">${item.label}</span>
    </a>
  `).join('');

  sidebarEl.innerHTML = `
    <div class="sidebar-logo">
      <div class="sidebar-logo-icon">T</div>
      <span class="sidebar-logo-text">TimeManager</span>
    </div>

    <nav class="sidebar-nav">
      <div class="nav-section-label">Menu</div>
      ${navHTML}
      <div style="flex:1"></div>
      <div class="nav-section-label" style="margin-top:auto">Account</div>
      ${bottomHTML}
      <button class="nav-item" id="logout-btn" style="background:none;border:none;width:100%;text-align:left;cursor:pointer;">
        <span class="nav-icon">Q</span>
        <span class="nav-label">Dang xuat</span>
      </button>
    </nav>

    <div class="sidebar-footer">
      <div class="user-card">
        <div class="user-avatar">${getInitials(user?.full_name)}</div>
        <div class="user-info">
          <div class="user-name">${user?.full_name || 'Nguoi dung'}</div>
          <div class="user-role">${getGreeting()}</div>
        </div>
      </div>
    </div>
  `;

  sidebarEl.querySelector('#logout-btn').addEventListener('click', async () => {
    try {
      const { refresh } = api.getTokens();
      if (refresh) await authApi.logout({ refreshToken: refresh });
    } catch {}
    authStore.logout();
    toast.info('Da dang xuat');
    router.navigate('/login');
  });

  window.addEventListener('hashchange', () => {
    const route = window.location.hash.replace('#', '');
    sidebarEl.querySelectorAll('.nav-item').forEach(item => {
      const path = item.dataset.path;
      if (path) {
        item.classList.toggle('active', path === route);
      }
    });
  });

  return sidebarEl;
}
