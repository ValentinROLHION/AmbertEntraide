// ===== CLIENT API =====
const API = '/api';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(API + path, { ...options, headers });
  const data = await res.json().catch(() => ({ error: 'Erreur serveur' }));
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

const api = {
  // ── Auth ─────────────────────────────────────────────────────────────────
  login:          (email, password) => apiFetch('/auth/login',         { method: 'POST', body: JSON.stringify({ email, password }) }),
  register:       (data)            => apiFetch('/auth/register',      { method: 'POST', body: JSON.stringify(data) }),
  loginWithGoogle:(credential)      => apiFetch('/auth/google',        { method: 'POST', body: JSON.stringify({ credential }) }),

  // ── Annonces ─────────────────────────────────────────────────────────────
  getAnnonces: (params = {}) => {
    const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v != null && v !== '')));
    return apiFetch('/annonces?' + q);
  },
  getAnnonce: (id) => apiFetch(`/annonces/${id}`),

  createAnnonce: (formData) => {
    const token = localStorage.getItem('token');
    return fetch(API + '/annonces', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    }).then(async r => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Erreur');
      return d;
    });
  },

  // ── Actualités ───────────────────────────────────────────────────────────
  getActualites: (params = {}) => {
    const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v != null && v !== '')));
    return apiFetch('/actualites?' + q);
  },

  // ── Stats publiques ──────────────────────────────────────────────────────
  getStats: () => apiFetch('/stats'),

  // ── Profil ────────────────────────────────────────────────────────────────
  profile: {
    get:           ()   => apiFetch('/profile'),
    getAnnonces:   ()   => apiFetch('/profile/annonces'),
    deleteAnnonce:  (id)         => apiFetch(`/profile/annonces/${id}`, { method: 'DELETE' }),
    updateAnnonce: (id, formData) => {
      const token = localStorage.getItem('token');
      return fetch(API + `/profile/annonces/${id}`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Erreur'); return d; });
    },
    updateAvatar:  (fd) => {
      const token = localStorage.getItem('token');
      return fetch(API + '/profile/avatar', {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd
      }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; });
    },
  },

  // ── Messages ──────────────────────────────────────────────────────────────
  messages: {
    getConversations:  ()              => apiFetch('/messages/conversations'),
    getConversation:   (id)            => apiFetch(`/messages/conversations/${id}`),
    createConversation:(annonce_id)    => apiFetch('/messages/conversations', { method: 'POST', body: JSON.stringify({ annonce_id }) }),
    sendMessage:       (id, content)   => apiFetch(`/messages/conversations/${id}`, { method: 'POST', body: JSON.stringify({ content }) }),
    getUnread:         ()              => apiFetch('/messages/unread'),
  },

  // ── Admin ─────────────────────────────────────────────────────────────────
  admin: {
    getStats:         ()           => apiFetch('/admin/stats'),
    getUsers:         ()           => apiFetch('/admin/users'),
    updateUser:       (id, data)   => apiFetch(`/admin/users/${id}`,    { method: 'PUT',    body: JSON.stringify(data) }),
    getAnnonces:      (status)     => apiFetch('/admin/annonces' + (status ? `?status=${status}` : '')),
    updateAnnonce:    (id, data)   => apiFetch(`/admin/annonces/${id}`, { method: 'PUT',    body: JSON.stringify(data) }),
    deleteAnnonce:    (id)         => apiFetch(`/admin/annonces/${id}`, { method: 'DELETE' }),
    createActualite:  (formData)   => {
      const token = localStorage.getItem('token');
      return fetch(API + '/actualites', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Erreur'); return d; });
    },
    updateActualite:  (id, formData) => {
      const token = localStorage.getItem('token');
      return fetch(API + `/actualites/${id}`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Erreur'); return d; });
    },
    deleteActualite:  (id)         => apiFetch(`/actualites/${id}`,     { method: 'DELETE' }),
    sendMessageToUser:(id, content) => apiFetch(`/admin/users/${id}/message`, { method: 'POST', body: JSON.stringify({ content }) }),
  }
};
