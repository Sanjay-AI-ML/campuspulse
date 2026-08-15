/* CampusPulse — dashboards */
const { createElement: h, useState, useEffect, useMemo, useRef } = React;
const { StatusBadge, PriorityBadge, VoteBadge, Field, TextInput, TextArea, Select,
  EmptyState, timeAgo, DuplicateWarningModal, AISummaryPanel, CompletionReportModal } = window.components;

const CATEGORIES = [
  'Electrical / Fan', 'Projector / AV', 'Wi-Fi / Network',
  'Plumbing', 'Furniture', 'Cleanliness', 'Safety / Security', 'Other',
];

/* ── Category icon shorthand ── */
function CatIcon({ category, style }) {
  return h(Icon.CategoryIcon, { category, style });
}

/* ──────────────────────────── REPORT FORM ──────────────────────────── */
function ReportForm({ onCreated, user }) {
  const [form, setForm] = useState({ title: '', description: '', category: CATEGORIES[0], location: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [aiCategory, setAiCategory] = useState(null);
  const [aiCatLoading, setAiCatLoading] = useState(false);
  const [aiPriority, setAiPriority] = useState(null);
  const [aiPrioLoading, setAiPrioLoading] = useState(false);
  const [similar, setSimilar] = useState([]);
  const [showDupeModal, setShowDupeModal] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(null);
  const aiTimeout = useRef(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // AI category suggestion debounced
  useEffect(() => {
    if (form.title.length < 8) { setAiCategory(null); return; }
    clearTimeout(aiTimeout.current);
    aiTimeout.current = setTimeout(async () => {
      setAiCatLoading(true);
      try {
        const r = await Api.ai.suggestCategory(form.title, form.description);
        if (r.category && r.category !== form.category) setAiCategory(r.category);
        else setAiCategory(null);
      } catch { setAiCategory(null); }
      finally { setAiCatLoading(false); }
    }, 900);
    return () => clearTimeout(aiTimeout.current);
  }, [form.title, form.description]);

  async function runAiPriority() {
    if (!form.title) return;
    setAiPrioLoading(true);
    try { const r = await Api.ai.prioritize(form.title, form.description, form.category); setAiPriority(r); }
    catch { }
    finally { setAiPrioLoading(false); }
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
    if (!form.title.trim()) e.title = 'Add a short title';
    if (!form.description.trim()) e.description = 'Describe the issue';
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function doSubmit(payload, photo) {
    setLoading(true);
    try {
      const result = await Api.createIssue(payload, photo || null);
      setForm({ title: '', description: '', category: CATEGORIES[0], location: '' });
      setPhotoFile(null); setPhotoPreview(null);
      setAiPriority(null); setAiCategory(null); setSimilar([]);
      onCreated(result.issue);
    } catch (err) { setErrors({ form: err.message }); }
    finally { setLoading(false); }
  }

  async function submit(e) {
    e.preventDefault();
    if (!validate()) return;
    const payload = { title: form.title, description: form.description, category: form.category, location: form.location, ai_priority: aiPriority?.priority || null, ai_priority_reason: aiPriority?.reason || '' };
    try {
      const { similar: dupes } = await Api.ai.duplicates(form.title, form.description, form.category);
      if (dupes?.length) { setSimilar(dupes); setPendingSubmit({ payload, photo: photoFile }); setShowDupeModal(true); return; }
    } catch { }
    doSubmit(payload, photoFile);
  }

  const willBeHigh = form.category === 'Safety / Security' || form.category === 'Electrical / Fan';

  return h('div', { className: 'card', style: { padding: 20 } },
    // Header
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 } },
      h('div', { className: 'icon-box', style: { background: 'rgba(61,220,151,0.1)', border: '1px solid rgba(61,220,151,0.2)', color: '#3ddc97' } },
        h(Icon.Plus, { style: { width: 15, height: 15 } })),
      h('div', null,
        h('p', { style: { fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.9)' } }, 'Report an issue'),
        h('p', { style: { fontSize: 11.5, color: 'rgba(255,255,255,0.3)', marginTop: 1 } }, 'AI-assisted categorisation & priority'))),

    h('form', { onSubmit: submit, style: { display: 'flex', flexDirection: 'column', gap: 14 } },
      // Title
      h(Field, { label: 'Title', error: errors.title },
        h(TextInput, { value: form.title, onChange: (e) => set('title', e.target.value),
          placeholder: 'e.g. Fan not working in CSE Lab 301', error: errors.title })),

      // Category + AI suggestion
      h(Field, { label: 'Category' },
        h(Select, { value: form.category, onChange: (e) => set('category', e.target.value) },
          CATEGORIES.map((c) => h('option', { key: c, value: c }, c))),
        // AI suggestion chip
        aiCatLoading && h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 11.5, color: 'rgba(139,124,248,0.7)' } },
          h('span', { className: 'cp-spinner', style: { width: 11, height: 11 } }), 'AI analyzing…'),
        aiCategory && aiCategory !== form.category && h('div', { style: { marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'rgba(139,124,248,0.08)', border: '1px solid rgba(139,124,248,0.2)', borderRadius: 8 } },
          h(Icon.Robot, { style: { width: 13, height: 13, color: '#a99ef9', flexShrink: 0 } }),
          h('span', { style: { fontSize: 12, color: 'rgba(255,255,255,0.55)', flex: 1 } }, 'AI suggests: ', h('b', { style: { color: '#a99ef9' } }, aiCategory)),
          h('button', { type: 'button', onClick: () => { set('category', aiCategory); setAiCategory(null); },
            style: { fontSize: 11, fontWeight: 600, color: '#a99ef9', background: 'rgba(139,124,248,0.15)', border: 'none', borderRadius: 5, padding: '2px 8px', cursor: 'pointer' } },
            'Accept'))),

      // Description
      h(Field, { label: 'Description', error: errors.description },
        h(TextArea, { value: form.description, onChange: (e) => set('description', e.target.value),
          placeholder: 'What happened? When? How many people affected?', error: errors.description })),

      // Location
      h(Field, { label: 'Location', hint: 'optional' },
        h(TextInput, { value: form.location, onChange: (e) => set('location', e.target.value),
          placeholder: 'e.g. CSE Block, Room 301' })),

      // Photo
      h(Field, { label: 'Photo', hint: 'optional' },
        photoPreview
          ? h('div', { style: { position: 'relative' } },
              h('img', { src: photoPreview, alt: 'Preview', className: 'photo-preview' }),
              h('button', { type: 'button', onClick: () => { setPhotoFile(null); setPhotoPreview(null); },
                style: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', background: 'rgba(13,15,18,0.85)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)' } },
                h(Icon.X, { style: { width: 13, height: 13 } })))
          : h('label', { className: 'photo-zone' },
              h(Icon.Camera, { style: { width: 22, height: 22, color: 'rgba(255,255,255,0.2)' } }),
              h('span', { style: { fontSize: 12, color: 'rgba(255,255,255,0.3)' } }, 'Click to attach a photo'),
              h('span', { style: { fontSize: 11, color: 'rgba(255,255,255,0.18)' } }, 'JPG, PNG, GIF'),
              h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, onChange: handlePhoto }))),

      // AI priority row
      h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 10 } },
        h('button', { type: 'button', className: 'btn btn-ai btn-sm', disabled: !form.title || aiPrioLoading, onClick: runAiPriority, style: { flexShrink: 0 } },
          aiPrioLoading ? h('span', { className: 'cp-spinner', style: { width: 12, height: 12 } }) : h(Icon.Zap, { style: { width: 12, height: 12 } }),
          aiPrioLoading ? 'Checking…' : 'AI Priority'),
        aiPriority && h('div', { style: { flex: 1, padding: '6px 10px', background: 'rgba(139,124,248,0.06)', border: '1px solid rgba(139,124,248,0.15)', borderRadius: 7 } },
          h('span', { style: { fontSize: 12, fontWeight: 600, color: aiPriority.priority === 'High' ? '#f06a6a' : aiPriority.priority === 'Low' ? '#94a3b8' : '#38bdf8' } },
            aiPriority.priority, ' Priority '),
          h('span', { style: { fontSize: 11.5, color: 'rgba(255,255,255,0.4)' } }, aiPriority.reason))),

      // Priority notice
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: willBeHigh ? 'rgba(240,106,106,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${willBeHigh ? 'rgba(240,106,106,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 8 } },
        h(Icon.Alert, { style: { width: 13, height: 13, color: willBeHigh ? '#f06a6a' : 'rgba(255,255,255,0.25)', flexShrink: 0 } }),
        h('span', { style: { fontSize: 12, color: willBeHigh ? '#f06a6a' : 'rgba(255,255,255,0.35)' } },
          willBeHigh ? h('span', null, 'Will be flagged ', h('b', null, 'High priority'), ' — pinned to top of queue.') : 'Standard priority.')),

      errors.form && h('p', { style: { fontSize: 12, color: '#f06a6a' } }, errors.form),

      // Submit
      h('button', { type: 'submit', disabled: loading, className: 'btn btn-primary btn-md', style: { alignSelf: 'flex-end' } },
        loading && h('span', { className: 'cp-spinner', style: { width: 13, height: 13 } }),
        loading ? 'Submitting…' : 'Submit report')),

    showDupeModal && h(DuplicateWarningModal, {
      similar, onCancel: () => { setShowDupeModal(false); setPendingSubmit(null); },
      onContinue: () => { setShowDupeModal(false); if (pendingSubmit) doSubmit(pendingSubmit.payload, pendingSubmit.photo); },
    }));
}

/* ──────────────────────────── ISSUE CARD (Student) ──────────────────────────── */
function IssueCard({ issue, user, onVote }) {
  const [voteLoading, setVoteLoading] = useState(false);
  const high = issue.priority === 'High';
  const voteCount = (issue.votes || []).length;
  const voted = user ? (issue.votes || []).includes(user.id) : false;
  const isOwn = user ? issue.userId === user.id : true;

  async function handleVote() {
    if (!onVote) return;
    setVoteLoading(true);
    try { await onVote(issue.id); } finally { setVoteLoading(false); }
  }

  return h('div', {
    className: 'anim-slide-up',
    style: {
      background: 'rgba(255,255,255,0.03)', borderRadius: 10,
      border: high ? '1px solid rgba(240,106,106,0.25)' : '1px solid rgba(255,255,255,0.07)',
      borderLeft: high ? '3px solid #f06a6a' : undefined,
      padding: 14, display: 'flex', gap: 12,
    },
  },
    // Icon
    h('div', { className: 'icon-box', style: { background: high ? 'rgba(240,106,106,0.1)' : 'rgba(255,255,255,0.04)', color: high ? '#f06a6a' : 'rgba(255,255,255,0.35)', alignSelf: 'flex-start', marginTop: 1 } },
      h(CatIcon, { category: issue.category, style: { width: 14, height: 14 } })),

    // Body
    h('div', { style: { flex: 1, minWidth: 0 } },
      h('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 5 } },
        h('p', { style: { fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.9)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 } }, issue.title),
        h('div', { style: { display: 'flex', gap: 5, flexShrink: 0, alignItems: 'center' } },
          high && h(PriorityBadge, { priority: 'High' }),
          h(StatusBadge, { status: issue.status }))),

      h('p', { className: 'truncate-2', style: { fontSize: 12.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, marginBottom: 10 } }, issue.description),

      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' } },
          h('span', { style: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'rgba(255,255,255,0.3)' } },
            h(Icon.Pin, { style: { width: 11, height: 11 } }), issue.location || 'No location'),
          h('span', { style: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'rgba(255,255,255,0.3)' } },
            h(Icon.Clock, { style: { width: 11, height: 11 } }), timeAgo(issue.createdAt)),
          h('span', { style: { fontSize: 11, color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 5 } }, issue.category),
          issue.photo && h('a', { href: `/uploads/${issue.photo}`, target: '_blank', rel: 'noopener',
            style: { display: 'flex', alignItems: 'center', gap: 3, fontSize: 11.5, color: '#38bdf8', textDecoration: 'none' } },
            h(Icon.Image, { style: { width: 11, height: 11 } }), 'Photo')),
        h(VoteBadge, { count: voteCount, voted, loading: voteLoading, disabled: isOwn || !onVote, onVote: handleVote }))),

    // AI priority reason
    issue.ai_priority_reason && h('p', { style: { marginTop: 6, fontSize: 11, color: 'rgba(139,124,248,0.6)', display: 'flex', alignItems: 'center', gap: 4, gridColumn: '1/-1' } },
      h(Icon.Robot, { style: { width: 10, height: 10 } }), issue.ai_priority_reason));
}

/* ──────────────────────────── STUDENT DASHBOARD ──────────────────────────── */
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
    onToast({ message: 'Issue submitted successfully!' });
  };

  return h('div', { style: { maxWidth: 1280, margin: '0 auto', padding: '28px 20px' } },
    // Page header
    h('div', { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 } },
      h('div', null,
        h('h1', { style: { fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: 'rgba(255,255,255,0.95)', marginBottom: 4 } }, `Hi ${user.name.split(' ')[0]} 👋`),
        h('p', { style: { fontSize: 13, color: 'rgba(255,255,255,0.35)' } }, 'Report campus issues and track them to resolution.')),
      h('button', { onClick: load, disabled: refreshing, className: 'btn btn-ghost btn-sm' },
        h(Icon.Clock, { style: { width: 13, height: 13, animation: refreshing ? 'spin 0.65s linear infinite' : 'none' } }), 'Refresh')),

    // Layout
    h('div', { className: 'sidebar-layout' },
      // Left — form
      h('div', null, h(ReportForm, { onCreated: created, user })),

      // Right — list
      h('div', null,
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 } },
          h('h2', { style: { fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.75)' } }, 'Your reports'),
          issues && h('span', { style: { fontSize: 12, color: 'rgba(255,255,255,0.3)' } }, `${issues.length} issue${issues.length !== 1 ? 's' : ''}`)),

        issues === null
          ? h('div', { className: 'card', style: { padding: 40, display: 'flex', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' } },
              h('span', { className: 'cp-spinner', style: { width: 20, height: 20 } }))
          : issues.length === 0
            ? h(EmptyState, { icon: Icon.Inbox, title: 'No issues yet', subtitle: 'Use the form to report your first campus issue.' })
            : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                issues.map((i) => h(IssueCard, { key: i.id, issue: i, user, onVote: handleVote }))))));
}

/* ──────────────────────────── STAT CARDS ──────────────────────────── */
function StatGrid({ stats }) {
  const cards = [
    { label: 'Total',       value: stats?.total,           color: 'rgba(255,255,255,0.75)', icon: Icon.Inbox     },
    { label: 'Reported',    value: stats?.['Reported'],    color: '#f06a6a',                icon: Icon.Alert     },
    { label: 'In Progress', value: stats?.['In Progress'], color: '#f5b544',                icon: Icon.Clock     },
    { label: 'Resolved',    value: stats?.['Resolved'],    color: '#3ddc97',                icon: Icon.Check     },
  ];
  return h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 } },
    cards.map(({ label, value, color, icon: Ic }) =>
      h('div', { key: label, className: 'card', style: { padding: '14px 16px' } },
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 } },
          h('span', { style: { fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', textTransform: 'uppercase' } }, label),
          h(Ic, { style: { width: 14, height: 14, color: 'rgba(255,255,255,0.2)' } })),
        h('span', { style: { fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em', color: stats ? color : 'rgba(255,255,255,0.1)' } },
          stats ? (value ?? 0) : h('span', { style: { display: 'inline-block', width: 40, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.06)', animation: 'spin 1s linear infinite' } })))));
}

/* ──────────────────────────── STATUS SELECT (inline dropdown) ──────────────────────────── */
function StatusSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { STATUS_META } = window.components;

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const cur = STATUS_META[value] || STATUS_META['Reported'];

  return h('div', { ref, style: { position: 'relative', display: 'inline-block' } },
    h('button', { type: 'button', onClick: () => setOpen((o) => !o),
      style: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' } },
      h('span', { style: { width: 6, height: 6, borderRadius: '50%', background: cur.dot, flexShrink: 0 } }),
      value,
      h(Icon.ChevronDown, { style: { width: 12, height: 12, color: 'rgba(255,255,255,0.3)' } })),

    open && h('div', { className: 'status-menu' },
      ['Reported', 'In Progress', 'Resolved'].map((s) => {
        const m = STATUS_META[s];
        return h('button', { key: s, type: 'button',
          className: `status-menu-item${s === value ? ' active' : ''}`,
          onClick: () => { setOpen(false); onChange(s); } },
          h('span', { style: { width: 6, height: 6, borderRadius: '50%', background: m.dot, flexShrink: 0 } }),
          s,
          s === value && h(Icon.Check, { style: { width: 12, height: 12, marginLeft: 'auto', color: '#3ddc97' } }));
      })));
}

/* ──────────────────────────── ADMIN TABLE ──────────────────────────── */
function IssueTable({ issues, onStatus, user }) {
  if (!issues.length) return h(EmptyState, { icon: Icon.Inbox, title: 'No issues match', subtitle: 'Try clearing some filters.' });

  return h('div', { className: 'card', style: { overflow: 'hidden' } },
    // ── Desktop table ──
    h('div', { style: { overflowX: 'auto', display: 'none' }, className: 'md-table' },
      h('table', { className: 'data-table' },
        h('thead', null,
          h('tr', null,
            h('th', { style: { minWidth: 220 } }, 'Issue'),
            h('th', { style: { minWidth: 140 } }, 'Category'),
            h('th', { style: { minWidth: 130 } }, 'Location'),
            h('th', { style: { minWidth: 90 } },  'Priority'),
            h('th', { style: { minWidth: 80 } },  'Votes'),
            h('th', { style: { minWidth: 110 } }, 'Status'),
            h('th', { style: { minWidth: 90 } },  'Reported'),
            h('th', { style: { minWidth: 130 } }, 'Update'),
            h('th', { style: { minWidth: 110 } }, 'AI'))),
        h('tbody', null,
          issues.map((i) => h('tr', { key: i.id, className: i.priority === 'High' ? 'row-high' : '' },
            // Issue
            h('td', null,
              h('p', { style: { fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 2, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, i.title),
              h('p', { style: { fontSize: 11.5, color: 'rgba(255,255,255,0.3)' } }, i.reportedBy),
              i.photo && h('a', { href: `/uploads/${i.photo}`, target: '_blank', style: { fontSize: 11, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2, textDecoration: 'none' } },
                h(Icon.Image, { style: { width: 10, height: 10 } }), 'photo')),
            // Category
            h('td', null,
              h('span', { style: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'rgba(255,255,255,0.6)' } },
                h('div', { className: 'icon-box', style: { width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.05)' } },
                  h(CatIcon, { category: i.category, style: { width: 12, height: 12 } })),
                h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 } }, i.category))),
            // Location
            h('td', null,
              h('span', { style: { fontSize: 12.5, color: 'rgba(255,255,255,0.4)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' } }, i.location || '—')),
            // Priority
            h('td', null, h(PriorityBadge, { priority: i.priority })),
            // Votes
            h('td', null,
              h('span', { style: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: (i.votes || []).length > 0 ? '#3ddc97' : 'rgba(255,255,255,0.3)' } },
                h(Icon.ArrowUp, { style: { width: 12, height: 12 } }), (i.votes || []).length)),
            // Status
            h('td', null, h(StatusBadge, { status: i.status })),
            // Reported
            h('td', null,
              h('span', { style: { fontSize: 12, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' } }, timeAgo(i.createdAt))),
            // Update
            h('td', null, h(StatusSelect, { value: i.status, onChange: (s) => onStatus(i.id, s) })),
            // AI
            h('td', null, h(AISummaryPanel, { issueId: i.id, issueTitle: i.title }))))))));
}

// Inject desktop table visibility via a style tag
const _tableStyle = document.createElement('style');
_tableStyle.textContent = '@media (min-width: 768px) { .md-table { display: block !important; } }';
document.head.appendChild(_tableStyle);

/* ──────────────────────────── MOBILE ISSUE ROWS ──────────────────────────── */
function MobileIssueRow({ issue, onStatus, user }) {
  const high = issue.priority === 'High';
  return h('div', { style: { padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' } },
    h('div', { style: { display: 'flex', gap: 10 } },
      h('div', { className: 'icon-box', style: { background: high ? 'rgba(240,106,106,0.1)' : 'rgba(255,255,255,0.04)', color: high ? '#f06a6a' : 'rgba(255,255,255,0.3)', alignSelf: 'flex-start', flexShrink: 0 } },
        h(CatIcon, { category: issue.category, style: { width: 14, height: 14 } })),
      h('div', { style: { flex: 1, minWidth: 0 } },
        h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 } },
          h('p', { style: { flex: 1, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, issue.title),
          high && h(PriorityBadge, { priority: 'High' })),
        h('p', { className: 'truncate-2', style: { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 8, lineHeight: 1.5 } }, issue.description),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
          h(StatusBadge, { status: issue.status }),
          h('span', { style: { fontSize: 11.5, color: 'rgba(255,255,255,0.3)' } }, timeAgo(issue.createdAt)),
          h('span', { style: { display: 'flex', alignItems: 'center', gap: 3, fontSize: 11.5, color: (issue.votes || []).length > 0 ? '#3ddc97' : 'rgba(255,255,255,0.25)' } },
            h(Icon.ArrowUp, { style: { width: 11, height: 11 } }), (issue.votes || []).length)),
        h('div', { style: { marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' } },
          h(StatusSelect, { value: issue.status, onChange: (s) => onStatus(issue.id, s) }),
          h(AISummaryPanel, { issueId: issue.id, issueTitle: issue.title })))));
}

/* ──────────────────────────── FILTER BAR ──────────────────────────── */
function FilterBar({ filters, setFilters }) {
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  return h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 } },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.3)', marginRight: 4 } },
      h(Icon.Filter, { style: { width: 13, height: 13 } }),
      h('span', { style: { fontSize: 12, fontWeight: 500 } }, 'Filter')),

    h('select', { value: filters.category, onChange: (e) => set('category', e.target.value), className: 'filter-select' },
      h('option', { value: '' }, 'All Categories'),
      CATEGORIES.map((c) => h('option', { key: c, value: c }, c))),

    h('select', { value: filters.status, onChange: (e) => set('status', e.target.value), className: 'filter-select' },
      h('option', { value: '' }, 'All Statuses'),
      ['Reported', 'In Progress', 'Resolved'].map((s) => h('option', { key: s, value: s }, s))),

    h('select', { value: filters.priority, onChange: (e) => set('priority', e.target.value), className: 'filter-select' },
      h('option', { value: '' }, 'All Priorities'),
      ['High', 'Medium'].map((p) => h('option', { key: p, value: p }, p))),

    // Search
    h('div', { style: { position: 'relative', marginLeft: 'auto' } },
      h(Icon.Search, { style: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' } }),
      h('input', { value: filters.q, onChange: (e) => set('q', e.target.value),
        placeholder: 'Search…', className: 'filter-select', style: { paddingLeft: 30, minWidth: 180 } })));
}

/* ──────────────────────────── ADMIN DASHBOARD ──────────────────────────── */
function AdminDashboard({ user, onToast }) {
  const [stats, setStats] = useState(null);
  const [issues, setIssues] = useState(null);
  const [filters, setFilters] = useState({ category: '', status: '', priority: '', q: '' });
  const [refreshing, setRefreshing] = useState(false);
  const [completionReport, setCompletionReport] = useState(null); // { report, issueTitle }

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
      if (q && !(`${i.title} ${i.description} ${i.location} ${i.reportedBy} ${i.category}`).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [issues, filters]);

  async function updateStatus(id, status) {
    const prev = issues;
    const issueBeingResolved = issues?.find((i) => i.id === id);
    setIssues((arr) => (arr || []).map((i) => i.id === id ? { ...i, status } : i));
    try {
      const { issue, resolution_message, completion_report } = await Api.updateStatus(id, status);
      // Show completion report modal for resolved issues
      if (status === 'Resolved' && completion_report) {
        setCompletionReport({ report: completion_report, issueTitle: issue.title });
      } else if (resolution_message) {
        onToast({ type: 'ai', message: resolution_message });
      } else {
        onToast({ message: `Status updated to "${status}"` });
      }
      setIssues((arr) => (arr || []).map((i) => i.id === issue.id ? issue : i));
    } catch (e) { setIssues(prev); onToast({ type: 'error', message: e.message }); }
  }

  // Build the CSV download URL from current filters
  function downloadCsv() {
    const url = Api.exportCsvUrl({ category: filters.category, status: filters.status, priority: filters.priority });
    // Use a hidden link with x-user-id header workaround — since we need auth,
    // we add it as a query param (backend reads it as fallback)
    const link = document.createElement('a');
    link.href = url + `&_uid=${Api.me()?.id || ''}`;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onToast({ message: 'CSV export started — check your downloads.' });
  }

  return h('div', { style: { maxWidth: 1280, margin: '0 auto', padding: '28px 20px' } },
    // Completion Report Modal
    completionReport && h(CompletionReportModal, {
      report: completionReport.report,
      issueTitle: completionReport.issueTitle,
      onClose: () => setCompletionReport(null),
    }),

    // Header
    h('div', { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 } },
      h('div', null,
        h('h1', { style: { fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: 'rgba(255,255,255,0.95)', marginBottom: 4 } }, 'Issue Console'),
        h('p', { style: { fontSize: 13, color: 'rgba(255,255,255,0.35)' } }, `Welcome, ${user.name}. High priority + most-voted surface first.`)),
      h('div', { style: { display: 'flex', gap: 8 } },
        h('button', { onClick: downloadCsv, className: 'btn btn-ghost btn-sm' },
          h(Icon.Download, { style: { width: 13, height: 13 } }), 'Export CSV'),
        h('button', { onClick: load, disabled: refreshing, className: 'btn btn-ghost btn-sm' },
          h(Icon.Clock, { style: { width: 13, height: 13, animation: refreshing ? 'spin 0.65s linear infinite' : 'none' } }), 'Refresh'))),

    // Stats
    h('div', { style: { marginBottom: 20 } }, h(StatGrid, { stats })),

    // Filters
    h('div', { style: { marginBottom: 16 } }, h(FilterBar, { filters, setFilters })),

    // Count row
    issues && h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, fontSize: 12, color: 'rgba(255,255,255,0.3)' } },
      h('span', null, `Showing ${filtered.length} of ${issues.length} issues`),
      h('span', { style: { display: 'flex', alignItems: 'center', gap: 5 } },
        h('span', { style: { width: 8, height: 8, borderRadius: 2, background: '#f06a6a', display: 'inline-block' } }),
        'High priority'),
      h('span', { style: { display: 'flex', alignItems: 'center', gap: 5 } },
        h(Icon.ArrowUp, { style: { width: 11, height: 11, color: '#3ddc97' } }),
        'Sorted by votes')),

    // Table / cards
    issues === null
      ? h('div', { className: 'card', style: { padding: 60, display: 'flex', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' } },
          h('span', { className: 'cp-spinner', style: { width: 24, height: 24 } }))
      : h('div', null,
          // Desktop table
          h(IssueTable, { issues: filtered, onStatus: updateStatus, user }),
          // Mobile cards (below md)
          h('div', { className: 'card', style: { overflow: 'hidden' } },
            filtered.length === 0
              ? h(EmptyState, { icon: Icon.Inbox, title: 'No issues match', subtitle: 'Adjust filters.' })
              : filtered.map((i) => h(MobileIssueRow, { key: i.id, issue: i, onStatus: updateStatus, user })))));
}

// Hide mobile card view on desktop
const _mobileStyle = document.createElement('style');
_mobileStyle.textContent = `
  .md-table { display: none; }
  @media (min-width: 768px) { .md-table { display: block !important; } }
  @media (min-width: 768px) { .mobile-cards { display: none !important; } }
`;
document.head.appendChild(_mobileStyle);

/* ──────────────────────────── ANALYTICS ──────────────────────────── */
function AnalyticsDashboard({ onToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Api.analytics()
      .then(setData)
      .catch((e) => onToast({ type: 'error', message: e.message }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return h('div', { style: { maxWidth: 1280, margin: '0 auto', padding: '28px 20px', display: 'flex', justifyContent: 'center', paddingTop: 80 } },
    h('span', { className: 'cp-spinner', style: { width: 28, height: 28, color: '#3ddc97' } }));

  if (!data || !Object.keys(data).length)
    return h('div', { style: { maxWidth: 1280, margin: '0 auto', padding: '28px 20px' } },
      h(EmptyState, { icon: Icon.BarChart, title: 'No data yet', subtitle: 'Analytics appear once issues are submitted.' }));

  const maxTotal = Math.max(...Object.values(data).map((d) => d.total), 1);
  const totalVotes = Object.values(data).reduce((s, d) => s + (d.votes || 0), 0);
  const totalIssues = Object.values(data).reduce((s, d) => s + d.total, 0);
  const totalResolved = Object.values(data).reduce((s, d) => s + (d.Resolved || 0), 0);
  const resolutionRate = totalIssues ? Math.round(totalResolved / totalIssues * 100) : 0;

  const barColors = { Reported: '#f06a6a', 'In Progress': '#f5b544', Resolved: '#3ddc97' };

  return h('div', { style: { maxWidth: 1280, margin: '0 auto', padding: '28px 20px' } },
    h('div', { style: { marginBottom: 24 } },
      h('h1', { style: { fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: 'rgba(255,255,255,0.95)', marginBottom: 4 } }, 'Analytics'),
      h('p', { style: { fontSize: 13, color: 'rgba(255,255,255,0.35)' } }, 'Category breakdown — status distribution and upvote trends.')),

    // Summary cards
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 } },
      [
        { label: 'Categories',   value: Object.keys(data).length,  color: 'rgba(255,255,255,0.8)', icon: Icon.BarChart    },
        { label: 'Total Issues', value: totalIssues,                color: 'rgba(255,255,255,0.8)', icon: Icon.Inbox       },
        { label: 'Total Votes',  value: totalVotes,                 color: '#3ddc97',               icon: Icon.ArrowUp     },
        { label: 'Resolved',     value: `${resolutionRate}%`,       color: '#3ddc97',               icon: Icon.Check       },
      ].map(({ label, value, color, icon: Ic }) =>
        h('div', { key: label, className: 'card', style: { padding: '14px 16px' } },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 } },
            h('span', { style: { fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', textTransform: 'uppercase' } }, label),
            h(Ic, { style: { width: 14, height: 14, color: 'rgba(255,255,255,0.2)' } })),
          h('span', { style: { fontSize: 26, fontWeight: 700, letterSpacing: '-0.04em', color } }, value)))),

    // Chart
    h('div', { className: 'card', style: { padding: 24 } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 } },
        h(Icon.BarChart, { style: { width: 16, height: 16, color: '#3ddc97' } }),
        h('h2', { style: { fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.8)' } }, 'Issues by Category'),
        // Legend
        h('div', { style: { marginLeft: 'auto', display: 'flex', gap: 14 } },
          ['Reported', 'In Progress', 'Resolved'].map((s) =>
            h('span', { key: s, style: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'rgba(255,255,255,0.35)' } },
              h('span', { style: { width: 8, height: 8, borderRadius: 2, background: barColors[s], display: 'inline-block' } }), s)))),

      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 18 } },
        Object.entries(data).map(([cat, counts]) =>
          h('div', { key: cat },
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                h('div', { className: 'icon-box', style: { width: 26, height: 26, borderRadius: 7, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' } },
                  h(CatIcon, { category: cat, style: { width: 13, height: 13 } })),
                h('span', { style: { fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.75)' } }, cat)),
              h('div', { style: { display: 'flex', gap: 14, fontSize: 12, color: 'rgba(255,255,255,0.3)' } },
                h('span', null, counts.total, ' issues'),
                h('span', { style: { display: 'flex', alignItems: 'center', gap: 4, color: counts.votes ? '#3ddc97' : 'rgba(255,255,255,0.2)' } },
                  h(Icon.ArrowUp, { style: { width: 11, height: 11 } }), counts.votes || 0))),

            // Stacked bar
            h('div', { style: { height: 10, borderRadius: 9999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', display: 'flex' } },
              ['Reported', 'In Progress', 'Resolved'].map((s) => {
                const w = ((counts[s] || 0) / maxTotal) * 100;
                return w > 0 ? h('div', { key: s, className: 'analytics-bar', title: `${s}: ${counts[s] || 0}`,
                  style: { width: `${w}%`, background: barColors[s] } }) : null;
              })),

            h('div', { style: { display: 'flex', gap: 14, marginTop: 5, fontSize: 11.5, color: 'rgba(255,255,255,0.28)' } },
              ['Reported', 'In Progress', 'Resolved'].map((s) =>
                h('span', { key: s }, `${s}: ${counts[s] || 0}`))))))));
}

/* ──────────────────────────── AI ASSISTANT ──────────────────────────── */
function AdminAssistant({ onToast }) {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    text: "Hi! I'm your AI Campus Assistant 🤖\n\nAsk me anything about the issue database:\n• \"Which category has the most unresolved issues?\"\n• \"What are the highest voted issues?\"\n• \"How many issues are In Progress?\"\n• \"Show a summary of all Safety issues\"",
  }]);
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
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  return h('div', { style: { maxWidth: 860, margin: '0 auto', padding: '28px 20px' } },
    // Header
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 } },
      h('div', { style: { width: 40, height: 40, borderRadius: 11, background: 'rgba(139,124,248,0.12)', border: '1px solid rgba(139,124,248,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a99ef9' } },
        h(Icon.Robot, { style: { width: 20, height: 20 } })),
      h('div', null,
        h('h1', { style: { fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', color: 'rgba(255,255,255,0.9)' } }, 'AI Assistant'),
        h('p', { style: { fontSize: 12.5, color: 'rgba(255,255,255,0.35)', marginTop: 2 } }, 'Natural language queries over the live issue database — powered by Groq / Llama 3.3 70B'))),

    // Chat window
    h('div', { className: 'card', style: { height: 440, display: 'flex', flexDirection: 'column', marginBottom: 12, overflow: 'hidden' } },
      h('div', { style: { flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 } },
        messages.map((m, i) =>
          h('div', { key: i, style: { display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' } },
            h('div', null,
              m.role === 'assistant' && h('div', { style: { display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 } },
                h('div', { style: { width: 20, height: 20, borderRadius: 6, background: 'rgba(139,124,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a99ef9' } },
                  h(Icon.Robot, { style: { width: 11, height: 11 } })),
                h('span', { style: { fontSize: 11, fontWeight: 600, color: 'rgba(139,124,248,0.7)', letterSpacing: '0.05em', textTransform: 'uppercase' } }, 'AI')),
              h('div', { className: m.role === 'user' ? 'bubble-user' : 'bubble-ai' }, m.text)))),

        loading && h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          h('div', { style: { width: 20, height: 20, borderRadius: 6, background: 'rgba(139,124,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a99ef9' } },
            h(Icon.Robot, { style: { width: 11, height: 11 } })),
          h('div', { className: 'bubble-ai', style: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px' } },
            h('span', { className: 'cp-spinner', style: { width: 13, height: 13 } }),
            h('span', { style: { fontSize: 13, color: 'rgba(255,255,255,0.4)' } }, 'Thinking…'))),

        h('div', { ref: bottomRef }))),

    // Suggestions
    h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 } },
      suggestions.map((s) =>
        h('button', { key: s, onClick: () => send(s),
          style: { fontSize: 12, padding: '5px 12px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' },
          onMouseEnter: (e) => { e.currentTarget.style.borderColor = 'rgba(139,124,248,0.35)'; e.currentTarget.style.color = '#a99ef9'; e.currentTarget.style.background = 'rgba(139,124,248,0.08)'; },
          onMouseLeave: (e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; },
        }, s))),

    // Input
    h('div', { style: { display: 'flex', gap: 8 } },
      h('div', { style: { flex: 1, position: 'relative' } },
        h('input', { value: input, onChange: (e) => setInput(e.target.value),
          onKeyDown: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } },
          placeholder: 'Ask about issues, trends, priorities…',
          className: 'input-base', style: { paddingRight: 14 } })),
      h('button', { onClick: () => send(), disabled: !input.trim() || loading, className: 'btn btn-ai btn-md' },
        loading ? h('span', { className: 'cp-spinner', style: { width: 14, height: 14 } }) : h(Icon.Send, { style: { width: 15, height: 15 } }))));
}

window.STATUS_LIST = ['Reported', 'In Progress', 'Resolved'];
window.dash = { ReportForm, StudentDashboard, StatGrid, IssueTable, AdminDashboard, AnalyticsDashboard, AdminAssistant };
