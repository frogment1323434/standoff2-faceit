// ============================================================
// API-КЛИЕНТ (запросы к серверу)
// ============================================================

const API = {
  baseURL: '/api',
  token: null,

  setToken(token) {
    this.token = token;
    if (token) localStorage.setItem('so2_token', token);
    else localStorage.removeItem('so2_token');
  },

  loadToken() {
    this.token = localStorage.getItem('so2_token');
    return this.token;
  },

  async request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = 'Bearer ' + this.token;

    const res = await fetch(this.baseURL + path, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
    return data;
  },

  // Auth
  register(nickname, password) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ nickname, password }),
    });
  },

  login(nickname, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ nickname, password }),
    });
  },

  logout() {
    return this.request('/auth/logout', { method: 'POST' }).catch(() => {});
  },

  // Profile
  getMe() {
    return this.request('/profile/me');
  },

  updateNickname(nickname) {
    return this.request('/profile/me', {
      method: 'PUT',
      body: JSON.stringify({ nickname }),
    });
  },

  // Leaderboard
  getLeaderboard(limit = 50) {
    return this.request('/leaderboard?limit=' + limit);
  },

  // Matches
  reportMatch(opponentId, result) {
    return this.request('/matches/report', {
      method: 'POST',
      body: JSON.stringify({ opponentId, result }),
    });
  },

  getMatchHistory() {
    return this.request('/matches/history');
  },
};