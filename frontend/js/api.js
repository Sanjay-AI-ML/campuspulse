/* CampusPulse API client — PS-4 edition with AI endpoints.
   Session = public user object in localStorage. x-user-id header = demo auth. */

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

async function request(path, { method = 'GET', body, query, formData } = {}) {
  const url = new URL(path, window.location.origin);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== '' && v != null) url.searchParams.set(k, v);
    });
  }

  const headers = { 'x-user-id': userId() };
  let fetchBody;

  if (formData) {
    // multipart — don't set Content-Type, browser sets it with boundary
    fetchBody = formData;
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    fetchBody = JSON.stringify(body);
  }

  const res = await fetch(url.toString(), { method, headers, body: fetchBody });

  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
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
  logout() { Session.clear(); },
  me() { return Session.get(); },

  // --- issues ---
  listIssues(filters = {}) {
    return request('/api/issues', { query: filters }).then((d) => d.issues);
  },
  createIssue(payload, photoFile = null) {
    if (photoFile) {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => { if (v != null) fd.append(k, v); });
      fd.append('photo', photoFile);
      return request('/api/issues', { method: 'POST', formData: fd }).then((d) => d);
    }
    return request('/api/issues', { method: 'POST', body: payload }).then((d) => d);
  },
  updateStatus(issueId, status) {
    return request(`/api/issues/${issueId}/status`, { method: 'PATCH', body: { status } })
      .then((d) => d);
  },
  vote(issueId) {
    return request(`/api/issues/${issueId}/vote`, { method: 'PATCH' }).then((d) => d.issue);
  },

  // --- stats & analytics ---
  stats() { return request('/api/stats'); },
  analytics() { return request('/api/analytics'); },
  meta() { return request('/api/meta'); },

  // --- export ---
  exportCsvUrl(filters = {}) {
    const url = new URL('/api/export/csv', window.location.origin);
    Object.entries(filters).forEach(([k, v]) => { if (v) url.searchParams.set(k, v); });
    return url.toString();
  },

  // --- AI endpoints ---
  ai: {
    suggestCategory(title, description) {
      return request('/api/ai/suggest-category', { method: 'POST', body: { title, description } });
    },
    prioritize(title, description, category) {
      return request('/api/ai/prioritize', { method: 'POST', body: { title, description, category } });
    },
    summarize(issue_id) {
      return request('/api/ai/summarize', { method: 'POST', body: { issue_id } });
    },
    assistant(question) {
      return request('/api/ai/assistant', { method: 'POST', body: { question } });
    },
    duplicates(title, description, category) {
      return request('/api/ai/duplicates', { method: 'POST', body: { title, description, category } });
    },
  },
};

window.Api = Api;
