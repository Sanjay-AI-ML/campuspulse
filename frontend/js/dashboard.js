/* CampusPulse — dashboard views.
   - ReportForm   : student issue submission (track selector swaps categories)
   - StudentDashboard : own issues list + form
   - StatCard / StatGrid
   - IssueTable   : admin filterable table with inline status update
   - AdminDashboard
   Shared presentational bits (badges, inputs) come from components.js. */

const { createElement: h, useState, useEffect, useMemo, useRef } = React;
const { StatusBadge, PriorityBadge, TrackTag, Field, TextInput, TextArea, Select,
  Button, EmptyState, timeAgo } = window.components;

/* --------------------------------------------------------------- report form */

const TRACKS = [
  { id: 'Campus', label: 'Campus Issue', desc: 'Electrical, plumbing, Wi-Fi…', Icon: Icon.CampusTrack },
  { id: 'Exam',   label: 'Exam Issue',   desc: 'Hall ticket, seating, results…', Icon: Icon.ExamTrack },
];

function ReportForm({ onCreated }) {
  const [meta, setMeta] = useState({ campusCategories: [], examCategories: [] });
  const [track, setTrack] = useState('Campus');
  const [form, setForm] = useState({ title: '', description: '', category: '', location: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Api.meta().then(setMeta).catch(() => {});
  }, []);
  useEffect(() => {
    // reset category whenever track changes, then default to first option
    const cats = track === 'Campus' ? meta.campusCategories : meta.examCategories;
    setForm((f) => ({ ...f, category: cats[0] || '' }));
  }, [track, meta]);

  const categories = track === 'Campus' ? meta.campusCategories : meta.examCategories;
  const locLabel = track === 'Exam' ? 'Exam hall / subject' : 'Location';
  const locPlaceholder = track === 'Exam' ? 'e.g. Exam Hall 3 — Engg Maths' : 'e.g. ECE Block, Room 204';
  const willBeHigh = track === 'Exam' || form.category === 'Safety/Security';

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = 'Please add a short title';
    if (!form.description.trim()) e.description = 'Describe the issue';
    if (!form.category) e.category = 'Pick a category';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const issue = await Api.createIssue({
        title: form.title, description: form.description,
        track, category: form.category, location: form.location,
      });
      setForm({ title: '', description: '', location: '', category: categories[0] || '' });
      onCreated(issue);
    } catch (err) {
      setErrors({ form: err.message });
    } finally { setLoading(false); }
  }

  return (
    h('form', { onSubmit: submit, className: 'card p-5 sm:p-6' },
      h('div', { className: 'mb-5 flex items-center gap-2' },
        h('span', { className: 'flex h-8 w-8 items-center justify-center rounded-lg bg-mint-soft text-mint' },
          h(Icon.Plus, { className: 'w-4 h-4' })),
        h('div', null,
          h('h2', { className: 'text-base font-semibold text-white' }, 'Report a new issue'),
          h('p', { className: 'text-xs text-slate-500' }, 'Fill the details — it only takes a minute'),
        )),

      // track selector
      h('div', { className: 'mb-4 grid grid-cols-2 gap-3' },
        TRACKS.map((t) => {
          const active = track === t.id;
          return h('button', {
            key: t.id, type: 'button', onClick: () => setTrack(t.id),
            className: `group flex items-start gap-3 rounded-xl border p-3 text-left transition focus-ring ${active ? 'border-mint bg-mint-soft/40 shadow-glow' : 'border-navy-700 bg-navy-950/40 hover:border-navy-600'}`,
          },
            h('span', { className: `mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg ${active ? 'bg-mint text-navy-950' : 'bg-navy-800 text-slate-400 group-hover:text-slate-200'}` },
              h(t.Icon, { className: 'w-4 h-4' })),
            h('span', { className: 'min-w-0' },
              h('span', { className: 'block text-sm font-semibold text-slate-100' }, t.label),
              h('span', { className: 'block text-[11px] text-slate-500' }, t.desc)),
          );
        })),

      h('div', { className: 'space-y-4' },
        h(Field, { label: 'Title', htmlFor: 'title', error: errors.title },
          h(TextInput, { id: 'title', value: form.title, onChange: (e) => set('title', e.target.value),
            placeholder: 'Short summary, e.g. "Flickering tube light in ECE Lab"' })),

        h('div', { className: 'grid gap-4 sm:grid-cols-2' },
          h(Field, { label: 'Category', htmlFor: 'category', error: errors.category },
            h(Select, { id: 'category', value: form.category, onChange: (e) => set('category', e.target.value) },
              categories.map((c) => h('option', { key: c, value: c }, c)))),

          h(Field, { label: locLabel, htmlFor: 'location', hint: 'optional' },
            h(TextInput, { id: 'location', value: form.location, onChange: (e) => set('location', e.target.value),
              placeholder: locPlaceholder })),
        ),

        h(Field, { label: 'Description', htmlFor: 'description', error: errors.description },
          h(TextArea, { id: 'description', value: form.description, onChange: (e) => set('description', e.target.value),
            placeholder: 'Add details: what happened, when, who is affected…' })),

        // priority heads-up
        h('div', { className: `flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs ${willBeHigh ? 'border-danger/30 bg-danger-soft text-danger' : 'border-navy-700 bg-navy-950/40 text-slate-400'}` },
          h(Icon.Alert, { className: 'w-4 h-4' }),
          willBeHigh
            ? h('span', null, 'This will be flagged ', h('b', null, 'High priority'), ' and shown at the top of the queue.')
            : h('span', null, 'Standard priority.')),

        errors.form && h('p', { className: 'text-sm text-danger' }, errors.form),

        h('div', { className: 'flex justify-end gap-2 pt-1' },
          h(Button, { type: 'submit', loading }, loading ? 'Submitting…' : 'Submit report'),
        ),
      ),
    )
  );
}

/* ----------------------------------------------------------- issue row/card */

function IssueCard({ issue, children }) {
  const high = issue.priority === 'High';
  return (
    h('div', { 'data-issue-id': issue.id,
      className: `animate-row-in rounded-xl border bg-navy-900/40 p-4 transition hover:bg-navy-850 ${high ? 'border-l-4 border-l-danger border-y-navy-700 border-r-navy-700' : 'border-navy-700/70'}` },
      h('div', { className: 'flex items-start gap-3' },
        h('span', { className: `mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${high ? 'bg-danger-soft text-danger' : 'bg-navy-800 text-slate-300'}` },
          h(CategoryIcon, { category: issue.category, className: 'w-4 h-4' })),
        h('div', { className: 'min-w-0 flex-1' },
          h('div', { className: 'flex flex-wrap items-center gap-x-2 gap-y-1' },
            h('h3', { className: 'truncate text-sm font-semibold text-slate-100' }, issue.title),
            h(TrackTag, { track: issue.track }),
            high && h(PriorityBadge, { priority: issue.priority }),
          ),
          h('p', { className: 'mt-1 line-clamp-2 text-xs text-slate-400' }, issue.description),
          h('div', { className: 'mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-slate-500' },
            h('span', { className: 'inline-flex items-center gap-1' }, h(Icon.Pin, { className: 'w-3 h-3' }),
              issue.location || (issue.track === 'Exam' ? 'No hall specified' : 'No location')),
            h('span', { className: 'inline-flex items-center gap-1' }, h(Icon.Clock, { className: 'w-3 h-3' }),
              timeAgo(issue.createdAt)),
            h('span', { className: 'rounded-md bg-navy-800 px-1.5 py-0.5 text-slate-400' }, issue.category),
          ),
        ),
        h('div', { className: 'flex shrink-0 flex-col items-end gap-2' },
          h(StatusBadge, { status: issue.status }),
          children,
        ),
      ),
    )
  );
}

/* ------------------------------------------------------- student dashboard */

function StudentDashboard({ user, onToast }) {
  const [issues, setIssues] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try { setIssues(await Api.listIssues()); }
    catch (e) { onToast({ type: 'error', message: e.message }); }
    finally { setRefreshing(false); }
  };
  useEffect(() => { load(); }, []);

  const created = (issue) => {
    setIssues((prev) => prev ? [issue, ...prev] : [issue]);
    onToast({ message: 'Report submitted — admins have been notified.' });
  };

  return (
    h('div', { className: 'mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8' },
      // hero
      h('div', { className: 'mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between' },
        h('div', null,
          h('h1', { className: 'text-xl font-bold text-white sm:text-2xl' }, `Hi ${user.name.split(' ')[0]} 👋`),
          h('p', { className: 'mt-1 text-sm text-slate-400' }, 'Report a campus or exam issue and track it to resolution.'),
        ),
        h('button', { onClick: load, disabled: refreshing,
          className: 'inline-flex items-center gap-2 self-start rounded-xl border border-navy-700 bg-navy-800/60 px-3 py-2 text-sm text-slate-300 transition hover:bg-navy-700 focus-ring disabled:opacity-50' },
          h(Icon.Clock, { className: `w-4 h-4 ${refreshing ? 'animate-spin' : ''}` }), 'Refresh'),
      ),

      h('div', { className: 'grid gap-6 lg:grid-cols-5' },
        h('div', { className: 'lg:col-span-2' },
          h(ReportForm, { onCreated: created })),

        h('div', { className: 'lg:col-span-3' },
          h('div', { className: 'mb-3 flex items-center justify-between' },
            h('h2', { className: 'text-base font-semibold text-white' }, 'Your reports'),
            issues && h('span', { className: 'text-xs text-slate-500' }, `${issues.length} ${issues.length === 1 ? 'issue' : 'issues'}`),
          ),
          issues === null
            ? h('div', { className: 'card p-8 text-center text-sm text-slate-500' }, h('span', { className: 'cp-spinner text-mint' }), ' Loading your reports…')
            : issues.length === 0
              ? h(EmptyState, { icon: Icon.Inbox, title: 'No issues reported yet',
                  subtitle: 'Use the form to report your first campus or exam issue — it will appear here instantly.',
                  action: h(Button, { variant: 'ghost', size: 'sm' }, h(Icon.Plus, { className: 'w-4 h-4' }), 'Fill the form') })
              : h('div', { className: 'space-y-3' }, issues.map((i) => h(IssueCard, { key: i.id, issue: i }))),
        ),
      ),
    )
  );
}

/* --------------------------------------------------------------- admin stats */

function StatCard({ label, value, tone = 'default', icon: IconCmp }) {
  const tones = {
    default: 'text-slate-200',
    reported: 'text-danger',
    progress: 'text-amber',
    resolved: 'text-mint',
  };
  return (
    h('div', { className: 'card p-4 sm:p-5' },
      h('div', { className: 'flex items-center justify-between' },
        h('span', { className: 'text-xs font-medium uppercase tracking-wider text-slate-500' }, label),
        IconCmp && h(IconCmp, { className: 'w-4 h-4 text-slate-500' })),
      h('div', { className: `mt-2 text-2xl font-bold sm:text-3xl ${tones[tone]}` }, value),
    )
  );
}

function StatGrid({ stats }) {
  if (!stats) {
    return h('div', { className: 'grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4' },
      [0,1,2,3].map((i) => h('div', { key: i, className: 'card h-[88px] animate-pulse bg-navy-900/50' })));
  }
  return h('div', { className: 'grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4' },
    h(StatCard, { label: 'Total', value: stats.total, icon: Icon.Inbox }),
    h(StatCard, { label: 'Reported', value: stats.Reported, tone: 'reported', icon: Icon.Alert }),
    h(StatCard, { label: 'In Progress', value: stats['In Progress'], tone: 'progress', icon: Icon.Clock }),
    h(StatCard, { label: 'Resolved', value: stats.Resolved, tone: 'resolved', icon: Icon.Check }),
  );
}

/* ----------------------------------------------------------- filter bar */

function FilterBar({ filters, setFilters, counts }) {
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const Select_ = (value, key, opts, label) => (
    h('div', { className: 'relative' },
      h(Select, { value, onChange: (e) => set(key, e.target.value), className: 'py-2 text-xs', 'aria-label': label },
        h('option', { value: '' }, `${label} (${counts?.total ?? ''})`),
        opts.map(([v, l]) => h('option', { key: v, value: v }, l))))
  );

  return (
    h('div', { className: 'card flex flex-wrap items-center gap-2 p-3' },
      h('span', { className: 'mr-1 hidden items-center gap-1.5 text-xs font-medium text-slate-400 sm:flex' },
        h(Icon.Filter, { className: 'w-4 h-4' }), 'Filters'),
      Select_(filters.track, 'track', [['Campus', 'Campus'], ['Exam', 'Exam']], 'Track'),
      Select_(filters.status, 'status', window.STATUS_LIST.map((s) => [s, s]), 'Status'),
      Select_(filters.priority, 'priority', [['High', 'High'], ['Medium', 'Medium']], 'Priority'),
      h('div', { className: 'relative ml-auto w-full sm:w-56' },
        h(Icon.Search, { className: 'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500' }),
        h(TextInput, { value: filters.q, onChange: (e) => set('q', e.target.value),
          placeholder: 'Search title, location…', className: 'py-2 pl-9 text-xs' })),
    )
  );
}

/* ----------------------------------------------------------- admin table */

function IssueTable({ issues, onStatus }) {
  if (issues.length === 0) {
    return h(EmptyState, { icon: Icon.Inbox, title: 'No issues match these filters',
      subtitle: 'Try clearing a filter or adjusting your search.' });
  }
  return (
    h('div', { className: 'card overflow-hidden' },
      // desktop table
      h('div', { className: 'hidden overflow-x-auto md:block' },
        h('table', { className: 'w-full text-left text-sm' },
          h('thead', null,
            h('tr', { className: 'border-b border-navy-800 text-[11px] uppercase tracking-wider text-slate-500' },
              ['Issue', 'Track', 'Category', 'Location', 'Priority', 'Status', 'Reported', 'Update'].map((c) =>
                h('th', { key: c, className: 'px-4 py-3 font-medium' }, c)))),
          h('tbody', null,
            issues.map((i) => {
              const high = i.priority === 'High';
              return h('tr', { key: i.id,
                className: `border-b border-navy-800/60 transition hover:bg-navy-850 ${high ? 'border-l-4 border-l-danger' : ''}` },
                h('td', { className: 'max-w-[260px] px-4 py-3' },
                  h('div', { className: 'truncate font-medium text-slate-100' }, i.title),
                  h('div', { className: 'truncate text-xs text-slate-500' }, i.reportedBy)),
                h('td', { className: 'px-4 py-3' }, h(TrackTag, { track: i.track })),
                h('td', { className: 'px-4 py-3' },
                  h('span', { className: 'inline-flex items-center gap-1.5 text-xs text-slate-300' },
                    h(CategoryIcon, { category: i.category, className: 'w-3.5 h-3.5' }), i.category)),
                h('td', { className: 'max-w-[160px] px-4 py-3' },
                  h('span', { className: 'block truncate text-xs text-slate-400' }, i.location || '—')),
                h('td', { className: 'px-4 py-3' }, h(PriorityBadge, { priority: i.priority })),
                h('td', { className: 'px-4 py-3' }, h(StatusBadge, { status: i.status })),
                h('td', { className: 'whitespace-nowrap px-4 py-3 text-xs text-slate-500' }, timeAgo(i.createdAt)),
                h('td', { className: 'px-4 py-3' },
                  h(StatusSelect, { value: i.status, onChange: (s) => onStatus(i.id, s) })),
              );
            })))),
      // mobile cards
      h('div', { className: 'divide-y divide-navy-800/60 md:hidden' },
        issues.map((i) => h('div', { key: i.id, className: 'p-4' },
          h(IssueCard, { issue: i },
            h(StatusSelect, { value: i.status, onChange: (s) => onStatus(i.id, s), compact: true }))))),
    )
  );
}

function StatusSelect({ value, onChange, compact }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const opts = window.STATUS_LIST;
  const cur = window.STATUS_STYLE[value] || window.STATUS_STYLE['Reported'];
  return (
    h('div', { ref, className: 'relative' },
      h('button', { type: 'button', onClick: () => setOpen((o) => !o),
        className: `inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition focus-ring ${cur.wrap} ${compact ? '' : 'min-w-[120px] justify-between'}` },
        h('span', { className: `h-1.5 w-1.5 rounded-full ${cur.dot}` }), value,
        h('span', { className: 'ml-1 opacity-70' }, '▾')),
      open && h('div', { className: 'absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-navy-700 bg-navy-850 shadow-card' },
        opts.map((s) => {
          const st = window.STATUS_STYLE[s];
          return h('button', { key: s, type: 'button',
            onClick: () => { setOpen(false); onChange(s); },
            className: `flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-navy-800 ${s === value ? 'text-white' : 'text-slate-300'}` },
            h('span', { className: `h-1.5 w-1.5 rounded-full ${st.dot}` }), s,
            s === value && h(Icon.Check, { className: 'ml-auto w-3.5 h-3.5 text-mint' }));
        })),
    )
  );
}

/* ----------------------------------------------------------- admin dashboard */

function AdminDashboard({ user, onToast }) {
  const [stats, setStats] = useState(null);
  const [issues, setIssues] = useState(null);
  const [filters, setFilters] = useState({ track: '', status: '', priority: '', q: '' });
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      const [s, list] = await Promise.all([Api.stats(), Api.listIssues()]);
      setStats(s); setIssues(list);
    } catch (e) { onToast({ type: 'error', message: e.message }); }
    finally { setRefreshing(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!issues) return [];
    const q = filters.q.trim().toLowerCase();
    return issues.filter((i) => {
      if (filters.track && i.track !== filters.track) return false;
      if (filters.status && i.status !== filters.status) return false;
      if (filters.priority && i.priority !== filters.priority) return false;
      if (q && !(`${i.title} ${i.description} ${i.location} ${i.reportedBy} ${i.category}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [issues, filters]);

  async function updateStatus(id, status) {
    // optimistic: update locally first
    const prev = issues;
    setIssues((arr) => (arr || []).map((i) => (i.id === id ? { ...i, status } : i)));
    setStats((s) => s ? { ...s, [prev.find((i) => i.id === id).status]: (s[prev.find((i) => i.id === id).status] || 1) - 1, [status]: (s[status] || 0) + 1, total: s.total } : s);
    try {
      await Api.updateStatus(id, status);
      onToast({ message: `Status updated to "${status}".` });
    } catch (e) {
      setIssues(prev); // rollback
      await load();
      onToast({ type: 'error', message: e.message });
    }
  }

  return (
    h('div', { className: 'mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8' },
      h('div', { className: 'mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between' },
        h('div', null,
          h('h1', { className: 'text-xl font-bold text-white sm:text-2xl' }, 'Issue Resolution Console'),
          h('p', { className: 'mt-1 text-sm text-slate-400' }, `Welcome back, ${user.name}. High-priority items surface at the top.`)),
        h('button', { onClick: load, disabled: refreshing,
          className: 'inline-flex items-center gap-2 self-start rounded-xl border border-navy-700 bg-navy-800/60 px-3 py-2 text-sm text-slate-300 transition hover:bg-navy-700 focus-ring disabled:opacity-50' },
          h(Icon.Clock, { className: `w-4 h-4 ${refreshing ? 'animate-spin' : ''}` }), 'Refresh'),
      ),

      h('div', { className: 'mb-5' }, h(StatGrid, { stats })),

      h('div', { className: 'mb-4' },
        h(FilterBar, { filters, setFilters, counts: stats })),

      issues === null
        ? h('div', { className: 'card p-10 text-center text-sm text-slate-500' }, h('span', { className: 'cp-spinner text-mint' }), ' Loading issues…')
        : h('div', null,
            h('div', { className: 'mb-3 flex items-center justify-between text-xs text-slate-500' },
              h('span', null, `Showing ${filtered.length} of ${issues.length} issues`),
              h('span', { className: 'hidden items-center gap-1.5 sm:flex' },
                h('span', { className: 'h-2 w-2 rounded-sm bg-danger' }), '= High priority')),
            h(IssueTable, { issues: filtered, onStatus: updateStatus })),
    )
  );
}

// expose
window.STATUS_LIST = ['Reported', 'In Progress', 'Resolved'];
window.dash = { ReportForm, StudentDashboard, StatGrid, IssueTable, AdminDashboard };
