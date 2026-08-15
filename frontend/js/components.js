/* CampusPulse — shared components */
const { createElement: h, useState, useEffect, useRef } = React;

/* ── Constants ── */
const STATUS_META = {
  'Reported':    { dot: '#f06a6a', cls: 'badge-reported' },
  'In Progress': { dot: '#f5b544', cls: 'badge-progress' },
  'Resolved':    { dot: '#3ddc97', cls: 'badge-resolved' },
};
const PRIORITY_META = {
  High:   { cls: 'badge-high' },
  Medium: { cls: 'badge-medium' },
  Low:    { cls: 'badge-low' },
};

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.round(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);  if (m < 60)  return `${m}m ago`;
  const hr = Math.round(m / 60); if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24); if (d < 30)  return `${d}d ago`;
  const mo = Math.round(d / 30); if (mo < 12) return `${mo}mo ago`;
  return `${Math.round(mo / 12)}y ago`;
}

/* ── Badges ── */
function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META['Reported'];
  return h('span', { className: `badge ${m.cls}` },
    h('span', { style: { width: 6, height: 6, borderRadius: '50%', background: m.dot, flexShrink: 0 } }),
    status);
}

function PriorityBadge({ priority }) {
  const m = PRIORITY_META[priority] || PRIORITY_META['Medium'];
  return h('span', { className: `badge ${m.cls}` },
    priority === 'High' && h(Icon.Alert, { style: { width: 10, height: 10 } }),
    priority);
}

/* ── Vote button ── */
function VoteBadge({ count, voted, onVote, disabled, loading }) {
  return h('button', {
    onClick: onVote,
    disabled: disabled || loading,
    title: disabled ? "Can't vote on your own issue" : voted ? 'Remove upvote' : 'Upvote this issue',
    className: `vote-btn${voted ? ' voted' : ''}`,
    style: disabled || loading ? { opacity: 0.35, cursor: 'not-allowed' } : {},
  },
    loading
      ? h('span', { className: 'cp-spinner', style: { width: 12, height: 12 } })
      : h(Icon.ArrowUp, { style: { width: 12, height: 12, flexShrink: 0 } }),
    h('span', null, count));
}

/* ── Form primitives ── */
function Field({ label, hint, error, children }) {
  return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
      h('label', { style: { fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.01em' } }, label),
      hint && h('span', { style: { fontSize: 11, color: 'rgba(255,255,255,0.3)' } }, hint)),
    children,
    error && h('p', { style: { fontSize: 11.5, color: '#f06a6a', marginTop: 2 } }, error));
}

function TextInput({ error, className, ...props }) {
  return h('input', { ...props, className: `input-base${error ? ' border-danger' : ''} ${className || ''}` });
}
function TextArea({ error, className, ...props }) {
  return h('textarea', { ...props, className: `input-base textarea${error ? ' border-danger' : ''} ${className || ''}` });
}
function Select({ children, className, ...props }) {
  return h('select', { ...props, className: `input-base select-input ${className || ''}` }, children);
}

/* ── EmptyState ── */
function EmptyState({ icon: IconComp = Icon.Inbox, title, subtitle, action }) {
  return h('div', { className: 'empty-state' },
    h('div', { style: { width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.25)' } },
      h(IconComp, { style: { width: 22, height: 22 } })),
    h('div', null,
      h('p', { style: { fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.75)', marginBottom: 4 } }, title),
      subtitle && h('p', { style: { fontSize: 12.5, color: 'rgba(255,255,255,0.3)', maxWidth: 320 } }, subtitle)),
    action && h('div', null, action));
}

/* ── Toast ── */
function Toast({ toast }) {
  if (!toast) return null;
  const colors = {
    error: { icon: Icon.Alert,  color: '#f06a6a', border: 'rgba(240,106,106,0.3)' },
    ai:    { icon: Icon.Robot,  color: '#a99ef9', border: 'rgba(139,124,248,0.3)' },
    _:     { icon: Icon.Check,  color: '#3ddc97', border: 'rgba(61,220,151,0.3)'  },
  };
  const c = colors[toast.type] || colors['_'];
  return h('div', { className: 'toast anim-slide-up' },
    h('div', { className: 'toast-inner', style: { borderColor: c.border, color: c.color } },
      h(c.icon, { style: { width: 15, height: 15, flexShrink: 0 } }),
      h('span', { style: { color: 'rgba(255,255,255,0.9)' } }, toast.message)));
}

/* ── Duplicate Warning Modal ── */
function DuplicateWarningModal({ similar, onContinue, onCancel }) {
  return h('div', {
    style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
    className: 'anim-fade-in',
  },
    h('div', { className: 'card anim-scale-in', style: { width: '100%', maxWidth: 480, padding: 24 } },
      // header
      h('div', { style: { display: 'flex', gap: 12, marginBottom: 20 } },
        h('div', { style: { width: 36, height: 36, borderRadius: 10, background: 'rgba(245,181,68,0.12)', border: '1px solid rgba(245,181,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f5b544', flexShrink: 0 } },
          h(Icon.Alert, { style: { width: 18, height: 18 } })),
        h('div', null,
          h('p', { style: { fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: 3 } }, 'Similar issues already reported'),
          h('p', { style: { fontSize: 12.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 } }, 'AI found these open issues matching yours. Upvote them instead to boost priority.'))),

      // issue list
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20, maxHeight: 240, overflowY: 'auto' } },
        similar.map((i) => h('div', { key: i.id, style: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 9, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' } },
          h('div', { className: 'icon-box', style: { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', marginTop: 1 } },
            h(Icon.CategoryIcon, { category: i.category, style: { width: 14, height: 14 } })),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('p', { style: { fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.85)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, i.title),
            h('div', { style: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' } },
              h('span', { style: { fontSize: 11.5, color: 'rgba(255,255,255,0.35)' } }, i.category),
              h(StatusBadge, { status: i.status }),
              h('span', { style: { display: 'flex', alignItems: 'center', gap: 3, fontSize: 11.5, color: '#3ddc97' } },
                h(Icon.ArrowUp, { style: { width: 11, height: 11 } }), (i.votes || []).length, ' votes')))))),

      // actions
      h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' } },
        h('button', { onClick: onCancel, className: 'btn btn-ghost btn-sm' }, 'Cancel'),
        h('button', { onClick: onContinue, className: 'btn btn-ghost btn-sm', style: { color: 'rgba(255,255,255,0.5)' } }, 'Submit anyway'))));
}

/* ── AI Summary Panel (admin) ── */
function AISummaryPanel({ issueId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function load() {
    if (data) { setOpen((o) => !o); return; }
    setLoading(true);
    try {
      const r = await Api.ai.summarize(issueId);
      setData(r); setOpen(true);
    } catch { setData({ summary: 'Could not load.', action: '', estimated_effort: '' }); setOpen(true); }
    finally { setLoading(false); }
  }

  return h('div', null,
    h('button', { onClick: load, className: 'btn btn-ai btn-sm', style: { gap: 5 } },
      loading ? h('span', { className: 'cp-spinner', style: { width: 12, height: 12 } }) : h(Icon.Robot, { style: { width: 12, height: 12 } }),
      loading ? 'Analyzing…' : 'AI Summary'),

    open && data && h('div', { className: 'anim-slide-up', style: { marginTop: 8, padding: 12, background: 'rgba(139,124,248,0.07)', border: '1px solid rgba(139,124,248,0.18)', borderRadius: 9 } },
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 } },
        h('span', { style: { fontSize: 11, fontWeight: 600, color: '#a99ef9', display: 'flex', alignItems: 'center', gap: 4, letterSpacing: '0.05em', textTransform: 'uppercase' } },
          h(Icon.Robot, { style: { width: 11, height: 11 } }), 'AI Analysis'),
        h('button', { onClick: () => setOpen(false), style: { background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0 } },
          h(Icon.X, { style: { width: 13, height: 13 } }))),
      h('p', { style: { fontSize: 12.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: data.action ? 8 : 0 } }, data.summary),
      data.action && h('div', { style: { display: 'flex', gap: 7, padding: '7px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 7, alignItems: 'flex-start' } },
        h(Icon.Wrench, { style: { width: 12, height: 12, color: '#f5b544', marginTop: 2, flexShrink: 0 } }),
        h('p', { style: { fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 } },
          h('b', { style: { color: '#f5b544' } }, 'Action: '), data.action)),
      data.estimated_effort && h('p', { style: { marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 4 } },
        h(Icon.Clock, { style: { width: 11, height: 11 } }), data.estimated_effort)));
}

/* ── TopBar ── */
function TopBar({ user, onLogout, tab, setTab, refresh, refreshing }) {
  const adminTabs = [
    { id: 'board',     label: 'Board',     Icon: Icon.Dashboard },
    { id: 'analytics', label: 'Analytics', Icon: Icon.BarChart  },
    { id: 'assistant', label: 'AI',        Icon: Icon.Robot     },
  ];

  return h('header', { style: { position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(13,15,18,0.85)', backdropFilter: 'blur(16px)' } },
    h('div', { style: { maxWidth: 1280, margin: '0 auto', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', gap: 8 } },

      // Logo
      h('a', { href: '/', style: { display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', flexShrink: 0 } },
        h('div', { style: { width: 30, height: 30, borderRadius: 8, background: '#3ddc97', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 1px rgba(61,220,151,0.3), 0 2px 8px rgba(61,220,151,0.2)' } },
          h(Icon.Logo, { style: { width: 17, height: 17, color: '#0d1117' } })),
        h('span', { style: { fontSize: 15, fontWeight: 700, letterSpacing: '-0.03em', color: 'rgba(255,255,255,0.95)' } },
          'Campus', h('span', { style: { color: '#3ddc97' } }, 'Pulse'))),

      // AI chip
      h('span', { className: 'ai-chip', style: { marginLeft: 4 } },
        h(Icon.Zap, { style: { width: 9, height: 9 } }), 'AI'),

      // Admin tabs
      tab && h('nav', { style: { display: 'flex', alignItems: 'center', gap: 2, marginLeft: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 9, padding: 3 } },
        adminTabs.map(({ id, label, Icon: TIcon }) =>
          h('button', {
            key: id, onClick: () => setTab(id),
            className: 'focus-ring',
            style: {
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 11px', borderRadius: 7, fontSize: 12.5, fontWeight: 500,
              cursor: 'pointer', border: 'none', transition: 'all 0.15s',
              background: tab === id ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: tab === id ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
            },
          },
            h(TIcon, { style: { width: 13, height: 13 } }), label))),

      // Spacer
      h('div', { style: { flex: 1 } }),

      // Refresh
      refresh && h('button', {
        onClick: refresh, disabled: refreshing, title: 'Refresh',
        className: 'btn btn-ghost btn-sm focus-ring',
        style: { padding: '6px 10px' },
      }, h(Icon.Clock, { style: { width: 14, height: 14, animation: refreshing ? 'spin 0.65s linear infinite' : 'none' } })),

      // User pill
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px 5px 6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9 } },
        h('div', { style: { width: 26, height: 26, borderRadius: 7, background: 'rgba(61,220,151,0.15)', border: '1px solid rgba(61,220,151,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#3ddc97', flexShrink: 0 } },
          user.name.split(' ').map((p) => p[0]).slice(0, 2).join('')),
        h('div', { style: { display: 'flex', flexDirection: 'column', lineHeight: 1.2 } },
          h('span', { style: { fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,0.85)' } }, user.name.split(' ')[0]),
          h('span', { style: { fontSize: 10.5, color: 'rgba(255,255,255,0.3)' } }, user.role))),

      // Logout
      h('button', { onClick: onLogout, className: 'btn btn-ghost btn-sm focus-ring', title: 'Logout', style: { padding: '6px 10px' } },
        h(Icon.Logout, { style: { width: 14, height: 14 } }),
        h('span', { style: { display: 'none' } }, 'Logout'))));  // hidden on mobile for space
}

/* ── Login ── */
function Login({ onLoggedIn }) {
  const [username, setUsername] = useState('student');
  const [password, setPassword] = useState('student123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { user } = await Api.login(username.trim(), password);
      Api.Session.set(user); onLoggedIn(user);
    } catch (err) { setError(err.message || 'Login failed'); }
    finally { setLoading(false); }
  }

  function fill(role) {
    if (role === 'student') { setUsername('student'); setPassword('student123'); }
    else { setUsername('admin'); setPassword('admin123'); }
    setError('');
  }

  return h('div', { style: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 } },
    h('div', { style: { width: '100%', maxWidth: 380 } },

      // Brand
      h('div', { style: { textAlign: 'center', marginBottom: 32 } },
        h('div', { style: { width: 52, height: 52, borderRadius: 14, background: '#3ddc97', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '0 0 0 1px rgba(61,220,151,0.35), 0 8px 24px rgba(61,220,151,0.2)' } },
          h(Icon.Logo, { style: { width: 28, height: 28, color: '#0d1117' } })),
        h('h1', { style: { fontSize: 24, fontWeight: 700, letterSpacing: '-0.04em', color: 'rgba(255,255,255,0.95)', marginBottom: 6 } },
          'Campus', h('span', { style: { color: '#3ddc97' } }, 'Pulse')),
        h('p', { style: { fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 10 } }, 'PS-4 FixIt — Campus Issue Tracker'),
        h('div', { style: { display: 'inline-flex', alignItems: 'center', gap: 4 } },
          h('span', { className: 'ai-chip' },
            h(Icon.Zap, { style: { width: 9, height: 9 } }), 'AI-Powered'),
          h('span', { className: 'ai-chip' },
            h(Icon.Robot, { style: { width: 9, height: 9 } }), 'Groq LLM'))),

      // Card
      h('div', { className: 'card', style: { padding: 24 } },
        h('form', { onSubmit: submit, style: { display: 'flex', flexDirection: 'column', gap: 16 } },
          h(Field, { label: 'Username' },
            h('div', { style: { position: 'relative' } },
              h(Icon.User, { style: { position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'rgba(255,255,255,0.2)', pointerEvents: 'none' } }),
              h(TextInput, { value: username, onChange: (e) => setUsername(e.target.value), autoComplete: 'username', placeholder: 'student', style: { paddingLeft: 34 } }))),

          h(Field, { label: 'Password' },
            h('div', { style: { position: 'relative' } },
              h(Icon.Lock, { style: { position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'rgba(255,255,255,0.2)', pointerEvents: 'none' } }),
              h(TextInput, { type: 'password', value: password, onChange: (e) => setPassword(e.target.value), autoComplete: 'current-password', placeholder: '••••••••', style: { paddingLeft: 34 } }))),

          error && h('div', { style: { display: 'flex', alignItems: 'center', gap: 7, padding: '9px 12px', background: 'rgba(240,106,106,0.1)', border: '1px solid rgba(240,106,106,0.2)', borderRadius: 8, fontSize: 13, color: '#f06a6a' } },
            h(Icon.Alert, { style: { width: 14, height: 14, flexShrink: 0 } }), error),

          h('button', { type: 'submit', disabled: loading, className: 'btn btn-primary btn-lg', style: { marginTop: 2 } },
            loading && h('span', { className: 'cp-spinner', style: { width: 14, height: 14 } }),
            loading ? 'Signing in…' : 'Sign in')),

        // Demo accounts
        h('div', { style: { marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' } },
          h('p', { style: { fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.07em', textTransform: 'uppercase', textAlign: 'center', marginBottom: 10 } }, 'Demo accounts'),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
            ['student', 'admin'].map((role) =>
              h('button', { key: role, type: 'button', onClick: () => fill(role),
                style: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '9px 12px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s' },
                onMouseEnter: (e) => { e.currentTarget.style.borderColor = 'rgba(61,220,151,0.25)'; e.currentTarget.style.background = 'rgba(61,220,151,0.04)'; },
                onMouseLeave: (e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; },
              },
                h('p', { style: { fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 2, textTransform: 'capitalize' } }, role),
                h('p', { style: { fontSize: 11.5, color: 'rgba(255,255,255,0.28)' } }, `${role} / ${role}123`)))))),

      h('p', { style: { textAlign: 'center', fontSize: 11.5, color: 'rgba(255,255,255,0.2)', marginTop: 20 } }, 'Team 9 · PS-4 FixIt · Hackathon prototype')));
}

window.components = {
  STATUS_META, PRIORITY_META, timeAgo,
  StatusBadge, PriorityBadge, VoteBadge,
  Field, TextInput, TextArea, Select,
  EmptyState, Toast, TopBar, Login,
  DuplicateWarningModal, AISummaryPanel,
};
