// ============================================================
// LOCALSTORAGE + SESSION
// ============================================================

const Storage = {
  save(data) {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
  },
  load() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },
  clear() { localStorage.removeItem(CONFIG.STORAGE_KEY); },

  saveSession(user) { sessionStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(user)); },
  loadSession() {
    try {
      const raw = sessionStorage.getItem(CONFIG.SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },
  clearSession() { sessionStorage.removeItem(CONFIG.SESSION_KEY); },
};