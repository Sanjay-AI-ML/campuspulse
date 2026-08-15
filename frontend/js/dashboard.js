/* CampusPulse — dashboard views — PS-4 FixIt edition.
   Components: ReportForm (with photo + AI category/priority),
   StudentDashboard, IssueCard (with vote button),
   StatCard/StatGrid, FilterBar, IssueTable, AdminDashboard,
   AnalyticsDashboard, AdminAssistant. */

const { createElement: h, useState, useEffect, useMemo, useRef, useCallback } = React;
const { StatusBadge, PriorityBadge, VoteBadge, Field, TextInput, TextArea, Select,
  Button, EmptyState, timeAgo, DuplicateWarningModal, AISummaryPanel } = window.components;

/* --------------------------------------------------------------- category icon helper */
function CategoryIcon({ category, className }) {
  return h(Icon.CategoryIcon, { category, className });
}

/* --------------------------------------------------------------- ReportForm */

const CATEGORIES = [
  'Electrical / Fan', 'Projector / AV', 'Wi-Fi / Network',
  'Plumbing', 'Furniture', 'Cleanliness', 'Safety / Security', 'Other',
];

function ReportForm({ onCreated, user }) {
  const [form, setForm] = useState({ title: '', description: '', category: CATEGORIES[0], location: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // AI state
  const [aiCategory, setAiCategory] = useState(null);
  const [aiCategoryLoading, setAiCategoryLoading] = useState(false);
  const [aiPriority, setAiPriority] = useState(null);
  const [aiPriorityLoading, setAiPriorityLoading] = useState(false);

  // Duplicate detection
  const [similar, setSimilar] = useState([]);
  const [showDupeModal, setShowDupeModal] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // AI: auto-suggest category when title+description filled
  const aiCategoryTimeout = useRef(null);
  useEffect(() => {
    if (!form.title || form.title.length < 8) return;
    clearTimeout(aiCategoryTimeout.current);
    aiCategoryTimeout.current = setTimeout(async () => {
      setAiCategoryLoading(true);
      try {
        const result = await Api.ai.suggestCategory(form.title, form.description);
        if (result.category && result.category !== form.category) {
          setAiCategory(result.category);
        }
      } catch (_) {}
      finally { setAiCategoryLoading(false); }
    }, 800);
    return () => clearTimeout(aiCategoryTimeout.current);
  }, [form.title, form.description]);

  // AI: prioritize issue
  async function runAiPriority() {
    if (!form.title) return;
    setAiPriorityLoading(true);
    try {
      const result = await Api.ai.prioritize(form.title, form.description, form.category);
      setAiPriority(result);
    } catch (_) {}
    finally { setAiPriorityLoading(false); }
  }

  function acceptAiCategory() {
    set('category', aiCategory);
    setAiCategory(null);
  }

  function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = 'Please add a short title';
    if (!form.description.trim()) e.description = 'Describe the issue';
    if (!form.category) e.category = 'Pick a category';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function doSubmit(payload, photo) {
    setLoading(true);
    try {
      const result = await Api.createIssue(payload, photo || null);
      setForm({ title: '', description: '', category: CATEGORIES[0], location: '' });
      setPhotoFile(null); setPhotoPreview(null);
      setAiPriority(null); setAiCategory(null);
      setSimilar([]);
      onCreated(result.issue);
    } catch (err) {
      setErrors({ form: err.message });
    } finally { setLoading(false); }
  }

  async function submit(ev) {
    ev.preventDefault();
    if (!validate()) return;

    const payload = {
      title: form.title,
      description: form.description,
      category: form.category,
      location: form.location,
      ai_priority: aiPriority?.priority || null,
      ai_priority_reason: aiPriority?.reason || '',
    };

    // Check duplicates before submitting
    try {
      const { similar: dupes } = await Api.ai.duplicates(form.title, form.description, form.category);
      if (dupes && dupes.length > 0) {
        setSimilar(dupes);
        setPendingSubmit({ payload, photo: photoFile });
        setShowDupeModal(true);
        return;
      }
    } catch (_) {}

    doSubmit(payload, photoFile);
  }

  const willBeHigh = form.category === 'Safety / Security' || form.category === 'Electrical / Fan';

  return h('form', { onSubmit: submit, className: 'card p-5 sm:p-6' },
    // header
    h('div', { className: 'mb-5 flex items-center gap-2' },
      h('span', { className: 'flex h-8 w-8 items-center justify-center rounded-lg bg-mint-soft text-mint' },
        h(Icon.Plus, { className: 'w-4 h-4' })),
      h('div', null,
        h('h2', { className: 'text-base font-semibold text-white' }, 'Report a new issue'),
        h('p', { className: 'text-xs text-slate-500' }, 'AI-assisted categorization & priority'))),

    h('div', { className: 'space-y-4' },
      // title
      h(Field, { label: 'Title', htmlFor: 'title', error: errors.title },
        h(TextInput, { id: 'title', value: form.title, onChange: (e) => set('title', e.target.value),
          placeholder: 'e.g. "Fan not working in CSE Lab 301"' })),

      // category with AI suggestion
      h(Field, { label: 'Category', htmlFor: 'category', error: errors.category },
        h('div', { className: 'space-y-1.5' },
          h(Select, { id: 'category', value: form.category, onChange: (e) => set('category', e.target.value) },
            CATEGORIES.map((c) => h('option', { key: c, value: c }, c))),
          aiCategoryLoading && h('div', { className: 'flex items-center gap-1.5 text-xs text-violet-400' },
            h('span', { className: 'cp-spinner' }), 'AI analyzing…'),
          aiCategory && aiCategory !== form.category && h('div', { className: 'flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs' },
            h(Icon.Robot, { className: 'w-3.5 h-3.5 text-violet-400' }),
            h('span', { className: 'text-violet-300' }, 'AI suggests: ', h('b', null, aiCategory)),
            h('button', { type: 'button', onClick: acceptAiCategory, className: 'ml-auto rounded-md bg-violet-500/20 px-2 py-0.5 text-violet-300 hover:bg-violet-500/30 font-medium' }, 'Accept')))),

      // description
      h(Field, { label: 'Description', htmlFor: 'description', error: errors.description },
        h(TextArea, { id: 'description', value: form.description, onChange: (e) => set('description', e.target.value),
          placeholder: 'What happened? When did it start? How many people are affected?' })),

      // location
      h(Field, { label: 'Location', htmlFor: 'location', hint: 'optional' },
        h(TextInput, { id: 'location', value: form.location, onChange: (e) => set('location', e.target.value),
          placeholder: 'e.g. CSE Block, Room 301' })),

      // photo upload
      h(Field, { label: 'Photo', hint: 'optional' },
        h('div', { className: 'space-y-2' },
          photoPreview
            ? h('div', { className: 'relative' },
                h('img', { src: photoPreview, alt: 'Preview', className: 'photo-preview' }),
                h('button', { type: 'button', onClick: () => { setPhotoFile(null); setPhotoPreview(null); },
                  className: 'absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-navy-900/80 text-slate-300 hover:text-danger' },
                  h(Icon.X, { className: 'w-3.5 h-3.5' })))
            : h('label', { className: 'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-navy-700 py-6 text-slate-500 transition hover:border-navy-600 hover:text-slate-400' },
                h(Icon.Camera, { className: 'w-6 h-6' }),
                h('span', { className: 'text-xs' }, 'Click to attach a photo'),
                h('input', { type: 'file', accept: 'image/*', className: 'hidden', onChange: handlePhoto })))),

      // AI priority
      h('div', { className: 'flex items-start gap-2' },
        h(Button, { type: 'button', variant: 'ai', size: 'sm', loading: aiPriorityLoading,
          onClick: runAiPriority, disabled: !form.title },
          h(Icon.Zap, { className: 'w-3.5 h-3.5' }), 'AI Priority Check'),
        aiPriority && h('div', { className: 'flex-1 rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2 text-xs' },
          h('span', { className: `font-semibold ${aiPriority.priority === 'High' ? 'text-danger' : aiPriority.priority === 'Low' ? 'text-slate-400' : 'text-sky-400'}` },
            aiPriority.priority, ' Priority'),
          h('span', { className: 'text-slate-400 ml-2' }, aiPriority.reason))),

      // high-priority warning banner
      h('div', { className: `flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs ${willBeHigh ? 'border-danger/30 bg-danger-soft text-danger' : 'border-navy-700 bg-navy-950/40 text-slate-400'}` },
        h(Icon.Alert, { className: 'w-4 h-4' }),
        willBeHigh
          ? h('span', null, 'This will be flagged ', h('b', null, 'High priority'), ' and pinned to the top.')
          : h('span', null, 'Standard priority — adjust with AI Priority Check above.')),

      errors.form && h('p', { className: 'text-sm text-danger' }, errors.form),

      h('div', { className: 'flex justify-end gap-2 pt-1' },
        h(Button, { type: 'submit', loading }, loading ? 'Submitting…' : 'Submit report'))),

    // Duplicate warning modal
    showDupeModal && h(DuplicateWarningModal, {
      similar,
      onCancel: () => { setShowDupeModal(false); setPendingSubmit(null); },
      onContinue: () => {
        setShowDupeModal(false);
        if (pendingSubmit) doSubmit(pendingSubmit.payload, pendingSubmit.photo);
      },
    }));
}

/* --------------------------------------------------------------- IssueCard */

function IssueCard({ issue, user, onVote, admin }) {
  const [voteLoading, setVoteLoading] = useState(false);
  const high = issue.priority === 'High';
  const voteCount = (issue.votes || []).length;
  const voted = user ? (issue.votes || []).includes(user.id) : false;
  const isOwn = user ? issue.userId === user.id : true;

  async function handleVote() {
    if (!onVote) return;
    setVoteLoading(true);
    try { await onVote(issue.id); }
    finally { setVoteLoading(false); }
  }

  return h('div', { 'data-issue-id': issue.id,
    className: `animate-row-in rounded-xl border bg-navy-900/40 p-4 transition hover:bg-navy-850 ${high ? 'border-l-4 border-l-danger border-y-navy-700 border-r-navy-700' : 'border-navy-700/70'}` },
    h('div', { className: 'flex items-start gap-3' },
      h('span', { className: `mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${high ? 'bg-danger-soft text-danger' : 'bg-navy-800 text-slate-300'}` },
        h(CategoryIcon, { category: issue.category, className: 'w-4 h-4' })),
      h('div', { className: 'min-w-0 flex-1' },
        h('div', { className: 'flex flex-wrap items-center gap-x-2 gap-y-1' },
          h('h3', { className: 'truncate text-sm font-semibold text-slate-100' }, issue.title),
          high && h(PriorityBadge, { priority: issue.priority })),
        h('p', { className: 'mt-1 line-clamp-2 text-xs text-slate-400' }, issue.description),
        h('div', { className: 'mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-slate-500' },
          h('span', { className: 'inline-flex items-center gap-1' }, h(Icon.Pin, { className: 'w-3 h-3' }), issue.location || 'No location'),
          h('span', { className: 'inline-flex items-center gap-1' }, h(Icon.Clock, { className: 'w-3 h-3' }), timeAgo(issue.createdAt)),
          h('span', { className: 'rounded-md bg-navy-800 px-1.5 py-0.5 text-slate-400' }, issue.category),
          issue.photo && h('span', { className: 'inline-flex items-center gap-1 text-sky-400' }, h(Icon.Image, { className: 'w-3 h-3' }), 'Photo')),
        // AI priority reason
        issue.ai_priority_reason && h('div', { className: 'mt-2 flex items-start gap-1.5 text-[11px] text-violet-400' },
          h(Icon.Robot, { className: 'w-3 h-3 mt-0.5 shrink-0' }),
          h('span', null, issue.ai_priority_reason)),
        // Admin AI summary
        admin && h(AISummaryPanel, { issueId: issue.id })),

      h('div', { className: 'flex shrink-0 flex-col items-end gap-2' },
        h(StatusBadge, { status: issue.status }),
        h(VoteBadge, { count: voteCount, voted, loading: voteLoading, disabled: isOwn || !onVote, onVote: handleVote }),
        issue.photo && h('a', { href: `/uploads/${issue.photo}`, target: '_blank', rel: 'noopener',
          className: 'flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 transition' },
          h(Icon.Image, { className: 'w-3 h-3' }), 'View photo'))));
}

/* --------------------------------------------------------------- StudentDashboard */

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

  async function handleVote(issueId) {
    try {
      const updated = await Api.vote(issueId);
      setIssues((prev) => prev ? prev.map((i) => i.id === updated.id ? updated : i) : prev);
    } catch (e) { onToast({ type: 'error', message: e.message }); }
  }

  const created = (issue) => {
    setIssues((prev) => prev ? [issue, ...prev] : [issue]);
    onToast({ message: 'Report submitted successfully!' });
  };

  return h('div', { className: 'mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8' },
    h('div', { className: 'mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between' },
      h('div', null,
        h('h1', { className: 'text-xl font-bold text-white sm:text-2xl' }, `Hi ${user.name.split(' ')[0]} 👋`),
        h('p', { className: 'mt-1 text-sm text-slate-400' }, 'Report campus issues and track them to resolution.')),
      h('button', { onClick: load, disabled: refreshing,
        className: 'inline-flex items-center gap-2 self-start rounded-xl border border-navy-700 bg-navy-800/60 px-3 py-2 text-sm text-slate-300 transition hover:bg-navy-700 focus-ring disabled:opacity-50' },
        h(Icon.Clock, { className: `w-4 h-4 ${refreshing ? 'animate-spin' : ''}` }), 'Refresh')),

    h('div', { className: 'grid gap-6 lg:grid-cols-5' },
      h('div', { className: 'lg:col-span-2' }, h(ReportForm, { onCreated: created, user })),
      h('div', { className: 'lg:col-span-3' },
        h('div', { className: 'mb-3 flex items-center justify-between' },
          h('h2', { className: 'text-base font-semibold text-white' }, 'Your reports'),
          issues && h('span', { className: 'text-xs text-slate-500' }, `${issues.length} ${issues.length === 1 ? 'issue' : 'issues'}`)),
        issues === null
          ? h('div', { className: 'card p-8 text-center text-sm text-slate-500' }, h('span', { className: 'cp-spinner text-mint' }), ' Loading…')
          : issues.length === 0
            ? h(EmptyState, { icon: Icon.Inbox, title: 'No issues reported yet', subtitle: 'Use the form to report your first campus issue.' })
            : h('div', { className: 'space-y-3' },
                issues.map((i) => h(IssueCard, { key: i.id, issue: i, user, onVote: handleVote }))))));
}

/* --------------------------------------------------------------- stat cards */

function StatCard({ label, value, tone = 'default', icon: IconCmp }) {
  const tones = { default: 'text-slate-200', reported: 'text-danger', progress: 'text-amber', resolved: 'text-mint' };
  return h('div', { className: 'card p-4 sm:p-5' },
    h('div', { className: 'flex items-center justify-between' },
      h('span', { className: 'text-xs font-medium uppercase tracking-wider text-slate-500' }, label),
      IconCmp && h(IconCmp, { className: 'w-4 h-4 text-slate-500' })),
    h('div', { className: `mt-2 text-2xl font-bold sm:text-3xl ${tones[tone]}` }, value ?? '—'));
}

function StatGrid({ stats }) {
  if (!stats) return h('div', { className: 'grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4' },
    [0,1,2,3].map((i) => h('div', { key: i, className: 'card h-[88px] animate-pulse bg-navy-900/50' })));
  return h('div', { className: 'grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4' },
    h(StatCard, { label: 'Total', value: stats.total, icon: Icon.Inbox }),
    h(StatCard, { label: 'Reported', value: stats.Reported, tone: 'reported', icon: Icon.Alert }),
    h(StatCard, { label: 'In Progress', value: stats['In Progress'], tone: 'progress', icon: Icon.Clock }),
    h(StatCard, { label: 'Resolved', value: stats.Resolved, tone: 'resolved', icon: Icon.Check }));
}

/* --------------------------------------------------------------- FilterBar */

function FilterBar({ filters, setFilters, counts }) {
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const Sel = (value, key, opts, label) => h('div', { className: 'relative' },
    h(Select, { value, onChange: (e) => set(key, e.target.value), className: 'py-2 text-xs', 'aria-label': label },
      h('option', { value: '' }, `${label} (${counts?.total ?? ''})`),
      opts.map(([v, l]) => h('option', { key: v, value: v }, l))));

  return h('div', { className: 'card flex flex-wrap items-center gap-2 p-3' },
    h('span', { className: 'mr-1 hidden items-center gap-1.5 text-xs font-medium text-slate-400 sm:flex' },
      h(Icon.Filter, { className: 'w-4 h-4' }), 'Filters'),
    Sel(filters.category, 'category',
      ['Electrical / Fan','Projector / AV','Wi-Fi / Network','Plumbing','Furniture','Cleanliness','Safety / Security','Other'].map((c) => [c, c]),
      'Category'),
    Sel(filters.status, 'status', window.STATUS_LIST.map((s) => [s, s]), 'Status'),
    Sel(filters.priority, 'priority', [['High','High'],['Medium','Medium'],['Low','Low']], 'Priority'),
    h('div', { className: 'relative ml-auto w-full sm:w-56' },
      h(Icon.Search, { className: 'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500' }),
      h(TextInput, { value: filters.q, onChange: (e) => set('q', e.target.value),
        placeholder: 'Search title, location…', className: 'py-2 pl-9 text-xs' })));
}

/* --------------------------------------------------------------- StatusSelect */

function StatusSelect({ value, onChange, compact }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const opts = window.STATUS_LIST;
  const { STATUS_STYLE } = window.components;
  const cur = STATUS_STYLE[value] || STATUS_STYLE['Reported'];
  return h('div', { ref, className: 'relative' },
    h('button', { type: 'button', onClick: () => setOpen((o) => !o),
      className: `inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition focus-ring ${cur.wrap} ${compact ? '' : 'min-w-[120px] justify-between'}` },
      h('span', { className: `h-1.5 w-1.5 rounded-full ${cur.dot}` }), value,
      h('span', { className: 'ml-1 opacity-70' }, '▾')),
    open && h('div', { className: 'absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-navy-700 bg-navy-850 shadow-card' },
      opts.map((s) => {
        const st = STATUS_STYLE[s];
        return h('button', { key: s, type: 'button', onClick: () => { setOpen(false); onChange(s); },
          className: `flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-navy-800 ${s === value ? 'text-white' : 'text-slate-300'}` },
          h('span', { className: `h-1.5 w-1.5 rounded-full ${st.dot}` }), s,
          s === value && h(Icon.Check, { className: 'ml-auto w-3.5 h-3.5 text-mint' }));
      })));
}

/* --------------------------------------------------------------- IssueTable */

function IssueTable({ issues, onStatus, user }) {
  if (issues.length === 0) return h(EmptyState, { icon: Icon.Inbox, title: 'No issues match these filters', subtitle: 'Try clearing a filter or adjusting your search.' });
  return h('div', { className: 'card overflow-hidden' },
    // desktop table
    h('div', { className: 'hidden overflow-x-auto md:block' },
      h('table', { className: 'w-full text-left text-sm' },
        h('thead', null,
          h('tr', { className: 'border-b border-navy-800 text-[11px] uppercase tracking-wider text-slate-500' },
            ['Issue', 'Category', 'Location', 'Priority', 'Votes', 'Status', 'Reported', 'AI', 'Update'].map((c) =>
              h('th', { key: c, className: 'px-4 py-3 font-medium' }, c)))),
        h('tbody', null,
          issues.map((i) => {
            const high = i.priority === 'High';
            return h('tr', { key: i.id, className: `border-b border-navy-800/60 transition hover:bg-navy-850 ${high ? 'border-l-4 border-l-danger' : ''}` },
              h('td', { className: 'max-w-[220px] px-4 py-3' },
                h('div', { className: 'truncate font-medium text-slate-100' }, i.title),
                h('div', { className: 'truncate text-xs text-slate-500' }, i.reportedBy),
                i.photo && h('span', { className: 'text-[10px] text-sky-400 flex items-center gap-0.5 mt-0.5' }, h(Icon.Image, { className: 'w-2.5 h-2.5' }), 'photo')),
              h('td', { className: 'px-4 py-3' },
                h('span', { className: 'inline-flex items-center gap-1.5 text-xs text-slate-300' },
                  h(CategoryIcon, { category: i.category, className: 'w-3.5 h-3.5' }), i.category)),
              h('td', { className: 'max-w-[140px] px-4 py-3' },
                h('span', { className: 'block truncate text-xs text-slate-400' }, i.location || '—')),
              h('td', { className: 'px-4 py-3' }, h(PriorityBadge, { priority: i.priority })),
              h('td', { className: 'px-4 py-3' },
                h('span', { className: 'inline-flex items-center gap-1 text-xs text-slate-300' },
                  h(Icon.ArrowUp, { className: 'w-3 h-3 text-mint' }), (i.votes || []).length)),
              h('td', { className: 'px-4 py-3' }, h(StatusBadge, { status: i.status })),
              h('td', { className: 'whitespace-nowrap px-4 py-3 text-xs text-slate-500' }, timeAgo(i.createdAt)),
              h('td', { className: 'px-4 py-3' }, h(AISummaryPanel, { issueId: i.id })),
              h('td', { className: 'px-4 py-3' }, h(StatusSelect, { value: i.status, onChange: (s) => onStatus(i.id, s) })));
          })))),
    // mobile cards
    h('div', { className: 'divide-y divide-navy-800/60 md:hidden' },
      issues.map((i) => h('div', { key: i.id, className: 'p-4' },
        h(IssueCard, { issue: i, user, admin: true }),
        h('div', { className: 'mt-2' }, h(StatusSelect, { value: i.status, onChange: (s) => onStatus(i.id, s), compact: true }))))));
}

/* --------------------------------------------------------------- AdminDashboard */

function AdminDashboard({ user, onToast }) {
  const [stats, setStats] = useState(null);
  const [issues, setIssues] = useState(null);
  const [filters, setFilters] = useState({ category: '', status: '', priority: '', q: '' });
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
      if (filters.category && i.category !== filters.category) return false;
      if (filters.status && i.status !== filters.status) return false;
      if (filters.priority && i.priority !== filters.priority) return false;
      if (q && !((`${i.title} ${i.description} ${i.location} ${i.reportedBy} ${i.category}`).toLowerCase().includes(q))) return false;
      return true;
    });
  }, [issues, filters]);

  async function updateStatus(id, status) {
    const prev = issues;
    setIssues((arr) => (arr || []).map((i) => (i.id === id ? { ...i, status } : i)));
    try {
      const { issue, resolution_message } = await Api.updateStatus(id, status);
      if (resolution_message) onToast({ type: 'ai', message: `AI: ${resolution_message}` });
      else onToast({ message: `Status → "${status}"` });
      setIssues((arr) => (arr || []).map((i) => (i.id === issue.id ? issue : i)));
    } catch (e) {
      setIssues(prev);
      onToast({ type: 'error', message: e.message });
    }
  }

  return h('div', { className: 'mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8' },
    h('div', { className: 'mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between' },
      h('div', null,
        h('h1', { className: 'text-xl font-bold text-white sm:text-2xl' }, 'Issue Resolution Console'),
        h('p', { className: 'mt-1 text-sm text-slate-400' }, `Welcome back, ${user.name}. High-priority + most-voted issues surface first.`)),
      h('button', { onClick: load, disabled: refreshing,
        className: 'inline-flex items-center gap-2 self-start rounded-xl border border-navy-700 bg-navy-800/60 px-3 py-2 text-sm text-slate-300 transition hover:bg-navy-700 focus-ring disabled:opacity-50' },
        h(Icon.Clock, { className: `w-4 h-4 ${refreshing ? 'animate-spin' : ''}` }), 'Refresh')),

    h('div', { className: 'mb-5' }, h(StatGrid, { stats })),
    h('div', { className: 'mb-4' }, h(FilterBar, { filters, setFilters, counts: stats })),

    issues === null
      ? h('div', { className: 'card p-10 text-center text-sm text-slate-500' }, h('span', { className: 'cp-spinner text-mint' }), ' Loading issues…')
      : h('div', null,
          h('div', { className: 'mb-3 flex items-center justify-between text-xs text-slate-500' },
            h('span', null, `Showing ${filtered.length} of ${issues.length} issues`),
            h('span', { className: 'hidden items-center gap-1.5 sm:flex' },
              h('span', { className: 'h-2 w-2 rounded-sm bg-danger' }), '= High priority  ',
              h(Icon.ArrowUp, { className: 'w-3 h-3 text-mint ml-2' }), '= sorted by votes')),
          h(IssueTable, { issues: filtered, onStatus: updateStatus, user })));
}

/* --------------------------------------------------------------- AnalyticsDashboard */

function AnalyticsDashboard({ onToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Api.analytics()
      .then(setData)
      .catch((e) => onToast({ type: 'error', message: e.message }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return h('div', { className: 'mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8' },
    h('div', { className: 'card p-10 text-center text-slate-500' }, h('span', { className: 'cp-spinner text-mint' })));

  if (!data || Object.keys(data).length === 0) return h('div', { className: 'mx-auto max-w-7xl px-4 py-6' },
    h(EmptyState, { icon: Icon.BarChart, title: 'No data yet', subtitle: 'Issue analytics will appear here once reports are submitted.' }));

  const maxTotal = Math.max(...Object.values(data).map((d) => d.total), 1);
  const maxVotes = Math.max(...Object.values(data).map((d) => d.votes || 0), 1);

  return h('div', { className: 'mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8' },
    h('div', { className: 'mb-6' },
      h('h1', { className: 'text-xl font-bold text-white sm:text-2xl' }, 'Category Analytics'),
      h('p', { className: 'mt-1 text-sm text-slate-400' }, 'Issue breakdown by category, status, and community votes.')),

    // summary cards
    h('div', { className: 'mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4' },
      h('div', { className: 'card p-4' },
        h('div', { className: 'text-xs uppercase tracking-wider text-slate-500 mb-1' }, 'Categories'),
        h('div', { className: 'text-2xl font-bold text-white' }, Object.keys(data).length)),
      h('div', { className: 'card p-4' },
        h('div', { className: 'text-xs uppercase tracking-wider text-slate-500 mb-1' }, 'Most Reported'),
        h('div', { className: 'text-sm font-bold text-white truncate' }, Object.keys(data)[0] || '—')),
      h('div', { className: 'card p-4' },
        h('div', { className: 'text-xs uppercase tracking-wider text-slate-500 mb-1' }, 'Total Votes'),
        h('div', { className: 'text-2xl font-bold text-mint' }, Object.values(data).reduce((s, d) => s + (d.votes || 0), 0))),
      h('div', { className: 'card p-4' },
        h('div', { className: 'text-xs uppercase tracking-wider text-slate-500 mb-1' }, 'Resolution Rate'),
        h('div', { className: 'text-2xl font-bold text-mint' }, (() => {
          const total = Object.values(data).reduce((s, d) => s + d.total, 0);
          const resolved = Object.values(data).reduce((s, d) => s + (d.Resolved || 0), 0);
          return total ? `${Math.round(resolved / total * 100)}%` : '0%';
        })()))),

    // bar chart
    h('div', { className: 'card p-5 sm:p-6' },
      h('h2', { className: 'mb-5 text-sm font-semibold text-white flex items-center gap-2' },
        h(Icon.BarChart, { className: 'w-4 h-4 text-mint' }), 'Issues by Category'),
      h('div', { className: 'space-y-5' },
        Object.entries(data).map(([cat, counts]) =>
          h('div', { key: cat },
            h('div', { className: 'mb-1.5 flex items-center justify-between' },
              h('div', { className: 'flex items-center gap-2 text-sm' },
                h(CategoryIcon, { category: cat, className: 'w-4 h-4 text-slate-400' }),
                h('span', { className: 'font-medium text-slate-200' }, cat)),
              h('div', { className: 'flex items-center gap-3 text-xs text-slate-500' },
                h('span', null, `${counts.total} issues`),
                h('span', { className: 'flex items-center gap-1 text-mint' },
                  h(Icon.ArrowUp, { className: 'w-3 h-3' }), counts.votes || 0, ' votes'))),
            // stacked bar
            h('div', { className: 'flex h-5 w-full overflow-hidden rounded-full bg-navy-800' },
              ['Reported', 'In Progress', 'Resolved'].map((s, si) => {
                const pct = ((counts[s] || 0) / maxTotal) * 100;
                const colors = ['bg-danger', 'bg-amber', 'bg-mint'];
                return pct > 0
                  ? h('div', { key: s, title: `${s}: ${counts[s] || 0}`,
                      style: { width: `${pct}%` },
                      className: `${colors[si]} analytics-bar transition-all` })
                  : null;
              })),
            h('div', { className: 'mt-1 flex gap-4 text-[11px] text-slate-500' },
              ['Reported', 'In Progress', 'Resolved'].map((s) =>
                h('span', { key: s }, `${s}: ${counts[s] || 0}`)))))),

      // legend
      h('div', { className: 'mt-6 flex gap-4 text-xs text-slate-500 border-t border-navy-800 pt-4' },
        [['bg-danger', 'Reported'], ['bg-amber', 'In Progress'], ['bg-mint', 'Resolved']].map(([c, l]) =>
          h('span', { key: l, className: 'flex items-center gap-1.5' },
            h('span', { className: `h-2.5 w-2.5 rounded-sm ${c}` }), l)))));
}

/* --------------------------------------------------------------- AdminAssistant */

function AdminAssistant({ onToast }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi! I\'m your AI Campus Assistant 🤖\n\nAsk me anything about the issue database:\n• "Which category has the most unresolved issues?"\n• "Show me all Wi-Fi issues"\n• "What are the highest voted issues?"\n• "How many issues were reported this week?"' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const suggestions = [
    'Which category has the most issues?',
    'What are the top voted issues?',
    'How many issues are unresolved?',
    'Show me all high priority issues',
  ];

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(q) {
    const question = (q || input).trim();
    if (!question) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setLoading(true);
    try {
      const { answer } = await Api.ai.assistant(question);
      setMessages((m) => [...m, { role: 'assistant', text: answer }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', text: `Error: ${e.message}` }]);
    } finally { setLoading(false); }
  }

  return h('div', { className: 'mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8' },
    h('div', { className: 'mb-6 flex items-center gap-3' },
      h('span', { className: 'flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300' },
        h(Icon.Robot, { className: 'w-5 h-5' })),
      h('div', null,
        h('h1', { className: 'text-xl font-bold text-white' }, 'AI Campus Assistant'),
        h('p', { className: 'text-sm text-slate-400' }, 'Ask anything about the campus issue database in plain English.'))),

    // chat window
    h('div', { className: 'card mb-4 flex h-[420px] flex-col overflow-hidden' },
      h('div', { className: 'flex-1 overflow-y-auto p-4 space-y-4' },
        messages.map((m, i) => h('div', { key: i,
          className: `flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}` },
          h('div', { className: `max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
            ${m.role === 'user'
              ? 'bg-mint text-navy-950 font-medium rounded-br-sm'
              : 'bg-navy-800 text-slate-200 rounded-bl-sm border border-navy-700'}` },
            m.role === 'assistant' && h('div', { className: 'flex items-center gap-1.5 mb-1.5 text-xs text-violet-400 font-semibold' },
              h(Icon.Robot, { className: 'w-3 h-3' }), 'AI Assistant'),
            m.text))),
        loading && h('div', { className: 'flex justify-start' },
          h('div', { className: 'rounded-2xl rounded-bl-sm border border-navy-700 bg-navy-800 px-4 py-3' },
            h('span', { className: 'flex items-center gap-2 text-xs text-violet-400' },
              h('span', { className: 'cp-spinner' }), 'Thinking…'))),
        h('div', { ref: bottomRef }))),

    // suggestions
    h('div', { className: 'mb-3 flex flex-wrap gap-2' },
      suggestions.map((s) => h('button', { key: s, onClick: () => send(s),
        className: 'rounded-full border border-navy-700 bg-navy-800/60 px-3 py-1.5 text-xs text-slate-300 transition hover:border-violet-500/40 hover:text-violet-300 hover:bg-violet-500/10' },
        s))),

    // input
    h('div', { className: 'flex gap-2' },
      h('div', { className: 'relative flex-1' },
        h(TextInput, { value: input, onChange: (e) => setInput(e.target.value),
          onKeyDown: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } },
          placeholder: 'Ask about issues, trends, priorities…', className: 'pr-4' })),
      h(Button, { onClick: () => send(), disabled: !input.trim() || loading, loading, size: 'md', variant: 'ai' },
        h(Icon.Send, { className: 'w-4 h-4' }))));
}

// Expose
window.STATUS_LIST = ['Reported', 'In Progress', 'Resolved'];
window.dash = {
  ReportForm, StudentDashboard, StatGrid, IssueTable,
  AdminDashboard, AnalyticsDashboard, AdminAssistant,
};
