/* CampusPulse — shared presentational components (login, badges, cards,
   form controls, empty state, toast). Dashboard-specific components live in
   dashboard.js. */

const { createElement: h, useState, useEffect, useRef } = React;

/* ------------------------------------------------------------------ utils */

const STATUS_STYLE = {
  Reported:    { wrap: 'bg-danger-soft text-danger ring-1 ring-danger/30', dot: 'bg-danger' },
  'In Progress': { wrap: 'bg-amber-soft text-amber ring-1 ring-amber/30', dot: 'bg-amber' },
  Resolved:    { wrap: 'bg-mint-soft text-mint ring-1 ring-mint/30',      dot: 'bg-mint'  },
};
const PRIORITY_STYLE = {
  High:   'bg-danger-soft text-danger ring-1 ring-danger/30',
  Medium: 'bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/30',
};

function timeAgo(iso) {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const s = Math.round(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);     if (m < 60) return `${m}m ago`;
  const hr = Math.round(m / 60);    if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);    if (d < 30) return `${d}d ago`;
  const mo = Math.round(d / 30);    if (mo < 12) return `${mo}mo ago`;
  return `${Math.round(mo / 12)}y ago`;
}

function trackMeta(track) {
  return track === 'Exam'
    ? { label: 'Exam', Icon: Icon.ExamTrack, cls: 'text-amber' }
    : { label: 'Campus', Icon: Icon.CampusTrack, cls: 'text-mint' };
}

/* ----------------------------------------------------------------- badges */

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE['Reported'];
  return (
    h('span', { className: `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.wrap}` },
      h('span', { className: `h-1.5 w-1.5 rounded-full ${s.dot}` }),
      status,
    )
  );
}

function PriorityBadge({ priority }) {
  const cls = PRIORITY_STYLE[priority] || PRIORITY_STYLE['Medium'];
  return (
    h('span', { className: `inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cls}` },
      priority === 'High' && h(Icon.Alert, { className: 'w-3 h-3' }),
      priority,
    )
  );
}

function TrackTag({ track }) {
  const { label, Icon: TIcon, cls } = trackMeta(track);
  return (
    h('span', { className: `inline-flex items-center gap-1.5 text-xs font-medium ${cls}` },
      h(TIcon, { className: 'w-3.5 h-3.5' }), label,
    )
  );
}

/* ----------------------------------------------------------- form controls */

function Field({ label, htmlFor, hint, error, children }) {
  return (
    h('div', null,
      h('label', { htmlFor, className: 'mb-1.5 flex items-center justify-between text-sm font-medium text-slate-300' },
        h('span', null, label),
        hint && h('span', { className: 'text-xs font-normal text-slate-500' }, hint),
      ),
      children,
      error && h('p', { className: 'mt-1.5 text-xs text-danger' }, error),
    )
  );
}

const inputCls = 'w-full rounded-xl bg-navy-950/60 border border-navy-700 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition focus:border-mint focus:ring-2 focus:ring-mint/30 focus:outline-none';

function TextInput(props) {
  return h('input', { ...props, className: `${inputCls} ${props.className || ''}` });
}
function TextArea(props) {
  return h('textarea', { ...props, className: `${inputCls} resize-y min-h-[90px] ${props.className || ''}` });
}
function Select({ children, ...props }) {
  return h('select', { ...props, className: `${inputCls} appearance-none bg-no-repeat pr-9 ${props.className || ''}`,
    style: { backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundPosition: 'right 0.75rem center' } },
    children);
}

function Button({ variant = 'primary', size = 'md', loading = false, disabled, children, className = '', ...rest }) {
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-5 py-3 text-sm' };
  const variants = {
    primary: 'bg-mint text-navy-950 font-semibold hover:bg-mint-dark shadow-glow disabled:opacity-60',
    ghost:   'bg-navy-800/60 text-slate-200 border border-navy-700 hover:bg-navy-700/60 hover:border-navy-600',
    subtle:  'bg-transparent text-slate-300 hover:bg-navy-800/60',
    danger:  'bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25',
  };
  return (
    h('button', {
      ...rest, disabled: disabled || loading,
      className: `inline-flex items-center justify-center gap-2 rounded-xl transition active:scale-[.98] disabled:cursor-not-allowed ${sizes[size]} ${variants[variant]} ${className}`,
    },
      loading && h('span', { className: 'cp-spinner', 'aria-hidden': 'true' }),
      children,
    )
  );
}

/* ----------------------------------------------------------- empty + toast */

function EmptyState({ icon: IconCmp = Icon.Inbox, title, subtitle, action }) {
  return (
    h('div', { className: 'flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy-700 bg-navy-900/30 px-6 py-14 text-center' },
      h('div', { className: 'mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-800 text-slate-500' },
        h(IconCmp, { className: 'w-7 h-7' }),
      ),
      h('h3', { className: 'text-base font-semibold text-slate-200' }, title),
      subtitle && h('p', { className: 'mt-1 max-w-sm text-sm text-slate-500' }, subtitle),
      action && h('div', { className: 'mt-5' }, action),
    )
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  const tone = toast.type === 'error' ? 'border-danger/40 text-danger' : 'border-mint/40 text-mint';
  return (
    h('div', { className: 'fixed bottom-5 left-1/2 z-50 -translate-x-1/2 px-4' },
      h('div', { className: `animate-row-in flex items-center gap-2.5 rounded-xl border bg-navy-850 px-4 py-3 text-sm font-medium shadow-card ${tone}` },
        toast.type === 'error' ? h(Icon.Alert, { className: 'w-4 h-4' }) : h(Icon.Check, { className: 'w-4 h-4' }),
        h('span', { className: 'text-slate-100' }, toast.message),
      ),
    )
  );
}

/* ----------------------------------------------------------- top app bar */

function TopBar({ user, onLogout, tab, setTab, refresh, refreshing }) {
  return (
    h('header', { className: 'sticky top-0 z-30 border-b border-navy-800/80 bg-navy-950/80 backdrop-blur-xl' },
      h('div', { className: 'mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6' },
        h('a', { href: '/', className: 'flex items-center gap-2.5 focus-ring rounded-lg' },
          h('span', { className: 'flex h-9 w-9 items-center justify-center rounded-xl bg-mint text-navy-950 shadow-glow' },
            h(Icon.Logo, { className: 'w-5 h-5' })),
          h('span', { className: 'text-lg font-bold tracking-tight text-white' },
            'Campus', h('span', { className: 'text-mint' }, 'Pulse')),
        ),

        // tabs (only relevant for admin — student has single view handled elsewhere)
        tab && h('nav', { className: 'ml-4 hidden items-center gap-1 sm:flex' },
          h('button', {
            onClick: () => setTab('board'), 'data-tab': 'board',
            className: `rounded-lg px-3 py-1.5 text-sm font-medium transition focus-ring ${tab === 'board' ? 'bg-navy-800 text-white' : 'text-slate-400 hover:text-slate-200'}`,
          }, h('span', { className: 'inline-flex items-center gap-1.5' }, h(Icon.Dashboard, { className: 'w-4 h-4' }), 'Issue Board')),
          h('button', {
            onClick: () => setTab('stats'), 'data-tab': 'stats',
            className: `rounded-lg px-3 py-1.5 text-sm font-medium transition focus-ring ${tab === 'stats' ? 'bg-navy-800 text-white' : 'text-slate-400 hover:text-slate-200'}`,
          }, h('span', { className: 'inline-flex items-center gap-1.5' }, h(Icon.Sparkle, { className: 'w-4 h-4' }), 'Stats')),
        ),

        h('div', { className: 'ml-auto flex items-center gap-2 sm:gap-3' },
          refresh && h('button', {
            onClick: refresh, title: 'Refresh', disabled: refreshing,
            className: 'rounded-lg border border-navy-700 bg-navy-800/60 p-2 text-slate-300 transition hover:bg-navy-700 focus-ring disabled:opacity-50',
          }, h(Icon.Clock, { className: `w-4 h-4 ${refreshing ? 'animate-spin' : ''}` })),

          h('div', { className: 'hidden items-center gap-2.5 rounded-xl border border-navy-800 bg-navy-850 px-3 py-1.5 sm:flex' },
            h('span', { className: 'flex h-7 w-7 items-center justify-center rounded-full bg-mint-soft text-mint font-semibold text-xs' },
              user.name.split(' ').map((p) => p[0]).slice(0, 2).join('')),
            h('div', { className: 'leading-tight' },
              h('div', { className: 'text-sm font-semibold text-slate-100' }, user.name),
              h('div', { className: 'text-[11px] text-slate-500' }, user.role),
            ),
          ),
          h('button', {
            onClick: onLogout, title: 'Log out',
            className: 'inline-flex items-center gap-2 rounded-xl border border-navy-700 bg-navy-800/60 px-3 py-2 text-sm text-slate-300 transition hover:bg-navy-700 hover:text-white focus-ring',
          }, h(Icon.Logout, { className: 'w-4 h-4' }), h('span', { className: 'hidden sm:inline' }, 'Logout')),
        ),
      ),
    )
  );
}

/* --------------------------------------------------------------- login */

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
      Api.Session.set(user);
      onLoggedIn(user);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally { setLoading(false); }
  }

  function fill(role) {
    if (role === 'student') { setUsername('student'); setPassword('student123'); }
    else { setUsername('admin'); setPassword('admin123'); }
    setError('');
  }

  return (
    h('div', { className: 'flex min-h-screen items-center justify-center p-4' },
      h('div', { className: 'w-full max-w-md' },
        // brand
        h('div', { className: 'mb-8 flex flex-col items-center text-center' },
          h('div', { className: 'mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-mint text-navy-950 shadow-glow' },
            h(Icon.Logo, { className: 'w-7 h-7' })),
          h('h1', { className: 'text-2xl font-bold tracking-tight text-white' },
            'Campus', h('span', { className: 'text-mint' }, 'Pulse')),
          h('p', { className: 'mt-2 text-sm text-slate-400' },
            'Smart Campus & Exam Issue Reporting and Resolution Tracker'),
        ),

        h('div', { className: 'card p-6 sm:p-7' },
          h('form', { onSubmit: submit, className: 'space-y-4' },
            h(Field, { label: 'Username', htmlFor: 'username' },
              h('div', { className: 'relative' },
                h(Icon.User, { className: 'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500' }),
                h(TextInput, { id: 'username', value: username, onChange: (e) => setUsername(e.target.value),
                  autoComplete: 'username', className: 'pl-9', placeholder: 'student' }),
              )),

            h(Field, { label: 'Password', htmlFor: 'password' },
              h('div', { className: 'relative' },
                h(Icon.Lock, { className: 'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500' }),
                h(TextInput, { id: 'password', type: 'password', value: password,
                  onChange: (e) => setPassword(e.target.value), autoComplete: 'current-password',
                  className: 'pl-9', placeholder: '••••••••' }),
              )),

            error && h('div', { className: 'flex items-center gap-2 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger' },
              h(Icon.Alert, { className: 'w-4 h-4' }), error),

            h(Button, { type: 'submit', loading, className: 'w-full', size: 'lg' },
              loading ? 'Signing in…' : 'Sign in'),
          ),

          h('div', { className: 'mt-6 border-t border-navy-700 pt-5' },
            h('p', { className: 'mb-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500' }, 'Demo accounts'),
            h('div', { className: 'grid grid-cols-2 gap-2' },
              h('button', { onClick: () => fill('student'), type: 'button',
                className: 'rounded-xl border border-navy-700 bg-navy-850 px-3 py-2.5 text-left transition hover:border-mint/40 hover:bg-navy-800 focus-ring' },
                h('div', { className: 'text-sm font-semibold text-slate-100' }, 'Student'),
                h('div', { className: 'text-[11px] text-slate-500' }, 'student / student123')),
              h('button', { onClick: () => fill('admin'), type: 'button',
                className: 'rounded-xl border border-navy-700 bg-navy-850 px-3 py-2.5 text-left transition hover:border-mint/40 hover:bg-navy-800 focus-ring' },
                h('div', { className: 'text-sm font-semibold text-slate-100' }, 'Admin'),
                h('div', { className: 'text-[11px] text-slate-500' }, 'admin / admin123')),
            ),
          ),
        ),
        h('p', { className: 'mt-6 text-center text-xs text-slate-600' },
          'Hackathon prototype · No real authentication · Local demo only'),
      ),
    )
  );
}

// Expose for other modules.
window.components = { STATUS_STYLE, PRIORITY_STYLE, timeAgo, trackMeta,
  StatusBadge, PriorityBadge, TrackTag, Field, TextInput, TextArea, Select,
  Button, EmptyState, Toast, TopBar, Login };
