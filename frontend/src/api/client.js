// API Client – Fetch wrapper with JWT token refresh
const BASE = '/api';

function getTokens() {
  return {
    access: localStorage.getItem('tm_access'),
    refresh: localStorage.getItem('tm_refresh'),
  };
}

function setTokens(access, refresh) {
  if (access) localStorage.setItem('tm_access', access);
  if (refresh) localStorage.setItem('tm_refresh', refresh);
}

function clearTokens() {
  localStorage.removeItem('tm_access');
  localStorage.removeItem('tm_refresh');
  localStorage.removeItem('tm_user');
}

let isRefreshing = false;
let refreshQueue = [];

async function refreshAccessToken() {
  const { refresh } = getTokens();
  if (!refresh) throw new Error('No refresh token');

  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refresh }),
  });

  if (!res.ok) {
    clearTokens();
    window.location.hash = '#/login';
    throw new Error('Session expired');
  }

  const data = await res.json();
  setTokens(data.accessToken, null);
  return data.accessToken;
}

async function request(path, options = {}) {
  const { access } = getTokens();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (access) headers['Authorization'] = `Bearer ${access}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  // Handle 401 – try refresh
  if (res.status === 401 && !options._retry) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      }).then(newToken => {
        headers['Authorization'] = `Bearer ${newToken}`;
        return fetch(`${BASE}${path}`, { ...options, headers, _retry: true });
      });
    }

    isRefreshing = true;
    try {
      const newToken = await refreshAccessToken();
      refreshQueue.forEach(p => p.resolve(newToken));
      refreshQueue = [];
      headers['Authorization'] = `Bearer ${newToken}`;
      return request(path, { ...options, headers, _retry: true });
    } catch (err) {
      refreshQueue.forEach(p => p.reject(err));
      refreshQueue = [];
      throw err;
    } finally {
      isRefreshing = false;
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    const error = new Error(err.message || 'Request failed');
    error.status = res.status;
    error.data = err;
    throw error;
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get:    (path, opts)  => request(path, { method: 'GET', ...opts }),
  post:   (path, body, opts) => request(path, { method: 'POST',   body: JSON.stringify(body), ...opts }),
  patch:  (path, body, opts) => request(path, { method: 'PATCH',  body: JSON.stringify(body), ...opts }),
  delete: (path, opts)  => request(path, { method: 'DELETE', ...opts }),
  setTokens,
  clearTokens,
  getTokens,
};
