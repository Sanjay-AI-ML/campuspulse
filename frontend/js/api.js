/* CampusPulse API client.
   A tiny fetch wrapper. The "session" is the public user object kept in
   localStorage (no real auth per the project brief). Every request echoes
   the user id back via the x-user-id header so the demo backend knows which
   data to return. */

const SESSION_KEY = 'campuspulse.session';

const Session = {
  get() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
    catch { return null; }
  },
  set(user) { localStorage.setItem(SESSION_KEY, JSON.stringify(user)); },
  clear() { localStorage.removeItem(SESSION_KEY); },
};

function userId() {
  const u = Session.get();
  return u ? u.id : '';
}

async function request(path, { method = 'GET', body, query } = {}) {
  const url = new URL(path, window.location.origin);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== '' && v != null) url.searchParams.set(k, v);
    });
  }
  const res = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId(), // demo only — NOT security
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try { data = await res.json(); } catch { /* non-JSON (e.g. 204) */ }
  if (!res.ok) {
    const msg = (data && data.error) || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

const Api = {
  Session,

  login(username, password) {
    return request('/api/login', { method: 'POST', body: { username, password } });
  },
  logout() {
    Session.clear();
  },
  me() { return Session.get(); },

  // issues
  listIssues(filters = {}) {
    return request('/api/issues', { query: filters }).then((d) => d.issues);
  },
  createIssue(payload) {
    return request('/api/issues', { method: 'POST', body: payload }).then((d) => d.issue);
  },
  updateStatus(issueId, status) {
    return request(`/api/issues/${issueId}/status`, { method: 'PATCH', body: { status } })
      .then((d) => d.issue);
  },

  stats() { return request('/api/stats'); },
  meta()  { return request('/api/meta'); },
};

window.Api = Api;
