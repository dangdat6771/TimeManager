// Auth State Management
const STORAGE_KEY = 'tm_user';

export const authStore = {
  _user: null,

  init() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) this._user = JSON.parse(saved);
    } catch { this._user = null; }
  },

  getUser() { return this._user; },

  setUser(user) {
    this._user = user;
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  },

  isLoggedIn() {
    return !!this._user && !!localStorage.getItem('tm_access');
  },

  logout() {
    this._user = null;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('tm_access');
    localStorage.removeItem('tm_refresh');
  },
};
