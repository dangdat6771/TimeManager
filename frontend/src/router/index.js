import { authStore } from '../store/auth.js';

// Pages (lazy imports)
const ROUTES = {
  '/login':     () => import('../pages/Auth/Auth.js').then(m => m.renderLogin()),
  '/register':  () => import('../pages/Auth/Auth.js').then(m => m.renderRegister()),
  '/dashboard': () => import('../pages/Dashboard/Dashboard.js').then(m => m.renderDashboard()),
  '/tasks':     () => import('../pages/Tasks/Tasks.js').then(m => m.renderTasks()),
  '/categories':() => import('../pages/Categories/Categories.js').then(m => m.renderCategories()),
  '/habits':    () => import('../pages/Habits/Habits.js').then(m => m.renderHabits()),
  '/focus':     () => import('../pages/Focus/Focus.js').then(m => m.renderFocus()),
  '/calendar':  () => import('../pages/Calendar/Calendar.js').then(m => m.renderCalendar()),
  '/notifications': () => import('../pages/Notifications/Notifications.js').then(m => m.renderNotifications()),
  '/admin':     () => import('../pages/Admin/Admin.js').then(m => m.renderAdmin()),
  '/settings':  () => import('../pages/Settings/Settings.js').then(m => m.renderSettings()),
};

const PUBLIC_ROUTES = ['/login', '/register'];

let currentPage = null;

export const router = {
  init() {
    window.addEventListener('hashchange', () => this.navigate());
    this.navigate();
  },

  getCurrentRoute() {
    const hash = window.location.hash.replace('#', '') || '/dashboard';
    return hash;
  },

  navigate(path) {
    if (path) {
      window.location.hash = '#' + path;
      return;
    }

    const route = this.getCurrentRoute();
    const isPublic = PUBLIC_ROUTES.includes(route);

    if (!authStore.isLoggedIn() && !isPublic) {
      window.location.hash = '#/login';
      return;
    }
    if (authStore.isLoggedIn() && isPublic) {
      window.location.hash = '#/dashboard';
      return;
    }

    this._render(route);
  },

  async _render(route) {
    const handler = ROUTES[route];
    if (!handler) {
      this._render('/dashboard');
      return;
    }

    if (currentPage && currentPage !== route) {
      // Cleanup previous page if needed
    }
    currentPage = route;

    try {
      const app = document.getElementById('app');
      // Show loading briefly
      app.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100vh;">
          <div class="spinner spinner-lg"></div>
        </div>
      `;
      await handler();
    } catch (err) {
      console.error('Route error:', err);
    }
  },
};
