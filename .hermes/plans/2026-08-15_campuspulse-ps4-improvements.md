# CampusPulse PS-4 Improvement Plan

**Deadline:** 16-08-2026 7:00 PM — Team 9

**Goal:** Upgrade CampusPulse from its current hackathon prototype to fully satisfy PS-4 (FixIt) requirements, plus all bonus features.

---

## Gap Analysis — What Exists vs What PS-4 Requires

### Already done (keep/polish):
- Two-role system: Student & Admin
- Category, location, description on issues
- Status workflow: Reported → In Progress → Resolved
- Admin stats cards
- Admin filter table

### Missing — Core requirements:
1. **Photo upload** on issue submission (students attach a photo)
2. **Upvote system** — students upvote existing issues (can't upvote own)
3. **Priority ranking by upvotes** — sort by vote count, not just High/Medium

### Missing — Bonus features:
4. **Duplicate detection** — warn student when a similar open issue already exists
5. **Category-wise analytics dashboard** — bar/count breakdown per category for admin

### Also improve (quality of life):
- Drop the "Exam track" entirely — PS-4 is campus issues only (broken fans, projectors, Wi-Fi)
- Rename tracks if kept, but simplify to match FixIt scope
- Tighten the categories to match PS-4: Electrical/Fan, Projector/AV, Wi-Fi/Network, Plumbing, Furniture, Cleanliness, Safety, Other

---

## Architecture Decisions

- **Photo storage:** save uploaded files to `backend/data/uploads/` directory. Serve them via a static route `/uploads/<filename>`. Store filename in issue JSON.
- **Upvotes:** add `votes: []` (list of user IDs) to each issue in db.json. PATCH `/api/issues/<id>/vote` toggles. Students cannot vote on own issues.
- **Duplicate detection:** on POST /api/issues, backend checks open issues in same category for keyword overlap (simple word-set intersection). Returns `similar: [...]` in the 201 response. Frontend shows a warning modal with similar issues before the student confirms submission.
- **Analytics:** new GET `/api/analytics` endpoint returns per-category counts broken down by status. Admin dashboard gets a new "Analytics" tab with a pure-CSS bar chart (no chart library needed).
- **Priority ranking:** keep the existing High/Medium concept but add a secondary sort key: vote count (descending). High-priority issues still float first, then sorted by votes within each priority tier.

---

## Files to Change

| File | What changes |
|------|-------------|
| `backend/store.py` | Add votes field, upvote logic, analytics aggregation, duplicate detection, photo filename storage |
| `backend/app.py` | Add POST /api/issues/<id>/vote, GET /api/analytics, POST /api/issues/<id>/photo (or embed in create), serve /uploads/ static |
| `backend/seed.py` | Add votes arrays to seed issues, update categories to PS-4 scope |
| `frontend/js/api.js` | Add Api.vote(), Api.analytics() |
| `frontend/js/components.js` | Add VoteBadge, DuplicateWarningModal, PhotoPreview |
| `frontend/js/dashboard.js` | Add photo input to ReportForm, upvote button on IssueCard, AnalyticsDashboard component, update AdminDashboard with Analytics tab |
| `frontend/js/app.js` | Add analytics tab to admin nav |
| `frontend/css/app.css` | Bar chart styles, vote button styles, photo thumbnail styles |

---

## Task Breakdown

---

### Task 1: Update categories & seed data to PS-4 scope

**Objective:** Align categories with "FixIt" (campus physical issues), update seed data with votes arrays.

**Files:**
- Modify: `backend/store.py`
- Modify: `backend/seed.py`

**Changes in store.py:**
```python
CAMPUS_CATEGORIES = [
    "Electrical / Fan",
    "Projector / AV",
    "Wi-Fi / Network",
    "Plumbing",
    "Furniture",
    "Cleanliness",
    "Safety / Security",
    "Other",
]
# Remove EXAM_CATEGORIES entirely
# Remove Exam track logic from compute_priority:
def compute_priority(track: str, category: str) -> str:
    if category in ("Safety / Security", "Electrical / Fan"):
        return "High"
    return "Medium"
```

**Changes in seed.py:**
- Add `"votes": []` to every seed issue
- Add `"photo": null` to every seed issue
- Update categories to match new list
- Remove Exam-track seed issues, replace with relevant campus ones
- Keep 10-12 realistic issues

**Verify:** `python backend/seed.py` runs without error, db.json has correct structure.

---

### Task 2: Backend — upvote endpoint

**Objective:** Students can toggle-upvote any issue that isn't their own.

**Files:**
- Modify: `backend/store.py` — add `toggle_vote(issue_id, user_id)`
- Modify: `backend/app.py` — add `PATCH /api/issues/<id>/vote`

**store.py addition:**
```python
def toggle_vote(issue_id: str, user_id: str) -> dict | None:
    with _LOCK:
        data = _read()
        for issue in data["issues"]:
            if issue["id"] == issue_id:
                if issue.get("userId") == user_id:
                    return None  # can't vote own issue
                votes = issue.setdefault("votes", [])
                if user_id in votes:
                    votes.remove(user_id)
                else:
                    votes.append(user_id)
                issue["updatedAt"] = datetime.now(timezone.utc).isoformat()
                _write(data)
                return issue
    return None
```

**app.py addition:**
```python
@app.patch("/api/issues/<issue_id>/vote")
def patch_vote(issue_id: str):
    user = _current_user()
    if not user:
        return _error("Unauthorized", 401)
    updated = toggle_vote(issue_id, user["id"])
    if updated is None:
        return _error("Cannot vote on your own issue or issue not found", 400)
    return jsonify({"issue": updated})
```

**Update list_issues sort** in store.py to secondary-sort by vote count:
```python
def list_issues() -> list[dict]:
    return sorted(
        _read()["issues"],
        key=lambda i: (
            i["priority"] != "High",
            -len(i.get("votes", [])),
            -_ts(i["createdAt"]),
        ),
    )
```

---

### Task 3: Backend — duplicate detection

**Objective:** On issue creation, detect similar open issues in the same category.

**Files:**
- Modify: `backend/store.py` — add `find_similar(track, category, title, description)`
- Modify: `backend/app.py` — include `similar` in POST /api/issues response

**store.py addition:**
```python
def find_similar(category: str, title: str, description: str, limit: int = 3) -> list[dict]:
    """Return open issues in same category with keyword overlap."""
    words = set((title + " " + description).lower().split()) - {
        "the", "a", "an", "is", "in", "at", "of", "and", "or", "to", "i", "my", "not", "it"
    }
    if len(words) < 2:
        return []
    results = []
    for issue in _read()["issues"]:
        if issue.get("status") == "Resolved":
            continue
        if issue.get("category") != category:
            continue
        candidate = (issue.get("title", "") + " " + issue.get("description", "")).lower().split()
        overlap = words & set(candidate)
        if len(overlap) >= 2:
            results.append((len(overlap), issue))
    results.sort(key=lambda x: -x[0])
    return [r[1] for r in results[:limit]]
```

**app.py — update post_issue to include similar:**
```python
similar = find_similar(category, title, description)
issue = create_issue(...)
return jsonify({"issue": issue, "similar": similar}), 201
```

---

### Task 4: Backend — photo upload

**Objective:** Students can attach one photo when submitting an issue.

**Files:**
- Modify: `backend/app.py` — handle multipart form on POST /api/issues, serve /uploads/
- Modify: `backend/store.py` — accept `photo` field in create_issue

**app.py changes:**
```python
import os
from werkzeug.utils import secure_filename

UPLOAD_DIR = Path(__file__).resolve().parent / "data" / "uploads"
ALLOWED_EXT = {"jpg", "jpeg", "png", "gif", "webp"}

def _allowed(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXT

@app.post("/api/issues")
def post_issue():
    user = _current_user()
    if not user:
        return _error("Unauthorized", 401)

    # Support both JSON and multipart/form-data
    if request.content_type and "multipart" in request.content_type:
        form = request.form
        title = (form.get("title") or "").strip()
        description = (form.get("description") or "").strip()
        category = form.get("category")
        location = (form.get("location") or "").strip()
        photo_filename = None
        file = request.files.get("photo")
        if file and file.filename and _allowed(file.filename):
            UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
            ext = file.filename.rsplit(".", 1)[1].lower()
            photo_filename = f"{uuid.uuid4().hex}.{ext}"
            file.save(UPLOAD_DIR / photo_filename)
    else:
        body = request.get_json(silent=True) or {}
        title = (body.get("title") or "").strip()
        description = (body.get("description") or "").strip()
        category = body.get("category")
        location = (body.get("location") or "").strip()
        photo_filename = None

    # validation ...
    similar = find_similar(category, title, description)
    issue = create_issue(
        {"title": title, "description": description, "category": category,
         "location": location, "photo": photo_filename},
        user,
    )
    return jsonify({"issue": issue, "similar": similar}), 201

# Serve uploaded photos
@app.get("/uploads/<path:filename>")
def serve_upload(filename: str):
    return send_from_directory(UPLOAD_DIR, filename)
```

**store.py — include photo in create_issue:**
```python
issue = {
    ...
    "photo": payload.get("photo"),  # filename or None
    "votes": [],
    ...
}
```

---

### Task 5: Backend — analytics endpoint

**Objective:** Category-wise breakdown of issues by status for the admin analytics tab.

**Files:**
- Modify: `backend/store.py` — add `analytics()`
- Modify: `backend/app.py` — add GET /api/analytics

**store.py:**
```python
def analytics() -> dict:
    issues = _read()["issues"]
    cats = {}
    for i in issues:
        cat = i.get("category", "Other")
        if cat not in cats:
            cats[cat] = {"Reported": 0, "In Progress": 0, "Resolved": 0, "total": 0}
        cats[cat][i["status"]] = cats[cat].get(i["status"], 0) + 1
        cats[cat]["total"] += 1
    # sort by total descending
    return dict(sorted(cats.items(), key=lambda x: -x[1]["total"]))
```

**app.py:**
```python
@app.get("/api/analytics")
def get_analytics():
    user = _current_user()
    if not user or user["role"] != "Admin":
        return _error("Admin access required", 403)
    return jsonify(analytics())
```

---

### Task 6: Frontend — api.js additions

**Objective:** Expose vote and analytics calls.

**Files:**
- Modify: `frontend/js/api.js`

**Additions to Api object:**
```js
vote(issueId) {
    return request(`/api/issues/${issueId}/vote`, { method: 'PATCH' }).then(d => d.issue);
},
analytics() {
    return request('/api/analytics');
},
```

---

### Task 7: Frontend — VoteBadge + upvote button on IssueCard

**Objective:** Show vote count on every issue; students can click to upvote/unvote.

**Files:**
- Modify: `frontend/js/components.js` — add VoteBadge component
- Modify: `frontend/js/dashboard.js` — add vote button to IssueCard, pass user + onVote props

**VoteBadge in components.js:**
```jsx
function VoteBadge({ count, voted, onVote, disabled }) {
  return (
    h('button', {
      onClick: onVote, disabled,
      title: voted ? 'Remove upvote' : 'Upvote this issue',
      className: `inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition
        ${voted ? 'bg-mint-soft text-mint ring-1 ring-mint/40' : 'bg-navy-800 text-slate-400 hover:text-mint hover:bg-mint-soft'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`,
    },
      h(Icon.ArrowUp, { className: 'w-3.5 h-3.5' }),
      h('span', null, count),
    )
  );
}
```

**IssueCard update in dashboard.js** — pass `user` and `onVote` props, render VoteBadge:
```jsx
const voteCount = (issue.votes || []).length;
const voted = user ? (issue.votes || []).includes(user.id) : false;
const isOwn = user ? issue.userId === user.id : true;
// render VoteBadge with disabled=isOwn
```

---

### Task 8: Frontend — photo upload in ReportForm + DuplicateWarningModal

**Objective:** Add photo input to the form; show a warning modal when similar issues are detected.

**Files:**
- Modify: `frontend/js/components.js` — add DuplicateWarningModal
- Modify: `frontend/js/dashboard.js` — add photo file input, handle similar response

**DuplicateWarningModal:**
```jsx
function DuplicateWarningModal({ similar, onContinue, onCancel }) {
  return (
    h('div', { className: 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4' },
      h('div', { className: 'card w-full max-w-lg p-6' },
        h('div', { className: 'mb-4 flex items-center gap-2 text-amber' },
          h(Icon.Alert, { className: 'w-5 h-5' }),
          h('h3', { className: 'text-base font-semibold text-white' }, 'Similar issues already reported'),
        ),
        h('p', { className: 'mb-4 text-sm text-slate-400' },
          'These open issues look similar to yours. You can upvote them instead of filing a duplicate.'),
        h('div', { className: 'mb-5 space-y-2' },
          similar.map(i => h('div', { key: i.id, className: 'rounded-xl border border-navy-700 bg-navy-950/60 p-3' },
            h('div', { className: 'text-sm font-semibold text-slate-100' }, i.title),
            h('div', { className: 'text-xs text-slate-500 mt-0.5' }, i.category, ' · ', (i.votes||[]).length, ' votes'),
          ))),
        h('div', { className: 'flex gap-2 justify-end' },
          h(Button, { variant: 'ghost', onClick: onCancel }, 'Cancel'),
          h(Button, { onClick: onContinue }, 'Submit anyway'),
        ),
      ),
    )
  );
}
```

**ReportForm changes:**
- Add `photo` state (File object)
- Render `<input type="file" accept="image/*">` with a preview thumbnail
- On submit, if `similar.length > 0` in response, show modal
- Use FormData (multipart) when photo is attached, JSON otherwise

---

### Task 9: Frontend — Analytics dashboard (Admin)

**Objective:** Admin gets a category-wise bar chart tab showing issue counts.

**Files:**
- Modify: `frontend/js/dashboard.js` — add AnalyticsDashboard component
- Modify: `frontend/js/app.js` — add 'analytics' tab to admin nav

**AnalyticsDashboard component:**
```jsx
function AnalyticsDashboard({ onToast }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    Api.analytics().then(setData).catch(e => onToast({ type: 'error', message: e.message }));
  }, []);

  if (!data) return h('div', { className: 'card p-10 text-center text-slate-500' }, h('span', { className: 'cp-spinner text-mint' }));

  const max = Math.max(...Object.values(data).map(d => d.total), 1);

  return (
    h('div', { className: 'mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8' },
      h('h1', { className: 'mb-6 text-xl font-bold text-white' }, 'Category Analytics'),
      h('div', { className: 'card p-5 sm:p-6 space-y-4' },
        Object.entries(data).map(([cat, counts]) =>
          h('div', { key: cat },
            h('div', { className: 'mb-1 flex items-center justify-between text-sm' },
              h('span', { className: 'font-medium text-slate-200' }, cat),
              h('span', { className: 'text-xs text-slate-500' }, `${counts.total} total`),
            ),
            // stacked bar: Reported (red) | In Progress (amber) | Resolved (mint)
            h('div', { className: 'flex h-5 w-full overflow-hidden rounded-full bg-navy-800' },
              ['Reported','In Progress','Resolved'].map((s, si) => {
                const pct = (counts[s] || 0) / max * 100;
                const colors = ['bg-danger', 'bg-amber', 'bg-mint'];
                return pct > 0 ? h('div', { key: s, title: `${s}: ${counts[s]}`,
                  style: { width: `${pct}%` }, className: `${colors[si]} transition-all` }) : null;
              })
            ),
            h('div', { className: 'mt-1 flex gap-3 text-[11px] text-slate-500' },
              ['Reported','In Progress','Resolved'].map(s =>
                h('span', { key: s }, `${s}: ${counts[s]||0}`)
              )
            ),
          )
        )
      ),
      // legend
      h('div', { className: 'mt-4 flex gap-4 text-xs text-slate-500' },
        [['bg-danger','Reported'],['bg-amber','In Progress'],['bg-mint','Resolved']].map(([c,l]) =>
          h('span', { key: l, className: 'flex items-center gap-1.5' },
            h('span', { className: `h-2.5 w-2.5 rounded-sm ${c}` }), l)
        )
      ),
    )
  );
}
```

**app.js — add analytics tab:**
```jsx
// In TopBar nav for Admin, add third tab:
h('button', { onClick: () => setTab('analytics'), ...
  className: `... ${tab === 'analytics' ? 'bg-navy-800 text-white' : '...'}` },
  h('span', { className: 'inline-flex items-center gap-1.5' },
    h(Icon.BarChart, { className: 'w-4 h-4' }), 'Analytics')),

// In App render:
tab === 'analytics'
  ? h(AnalyticsDashboard, { user, onToast: notify })
  : tab === 'stats' ? ...
```

---

### Task 10: icons.js — add missing icons

**Objective:** Add ArrowUp (upvote), BarChart (analytics tab) icons.

**Files:**
- Modify: `frontend/js/icons.js`

```jsx
// ArrowUp — for upvote button
ArrowUp: (props) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24',
  fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...props },
  h('path', { d:'M12 19V5M5 12l7-7 7 7' })),

// BarChart — for analytics tab
BarChart: (props) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24',
  fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...props },
  h('rect', { x:'3', y:'12', width:'4', height:'9' }),
  h('rect', { x:'10', y:'7', width:'4', height:'14' }),
  h('rect', { x:'17', y:'3', width:'4', height:'18' })),

// Image — for photo upload area
Image: (props) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24',
  fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...props },
  h('rect', { x:'3', y:'3', width:'18', height:'18', rx:'2' }),
  h('circle', { cx:'8.5', cy:'8.5', r:'1.5' }),
  h('path', { d:'m21 15-5-5L5 21' })),
```

---

### Task 11: CSS polish

**Objective:** Add styles for vote button active state, photo thumbnail, bar chart transitions, duplicate modal backdrop.

**Files:**
- Modify: `frontend/css/app.css`

Key additions:
```css
/* photo thumbnail in form */
.photo-preview { width: 100%; max-height: 160px; object-fit: cover; border-radius: 12px; border: 1px solid theme(colors.navy.700); }

/* vote button pulse on click */
.vote-btn-active { animation: mint-pulse 0.3s ease; }

/* analytics bar transition */
.analytics-bar { transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
```

---

### Task 12: Final wiring + run test

**Objective:** Make sure everything runs end-to-end.

**Steps:**
1. Reset the DB: `cd D:/campuspulse/backend && python seed.py`
2. Start server: `python D:/campuspulse/backend/app.py`
3. Open http://localhost:5001
4. Log in as Student → submit an issue with a photo → verify photo shows on the card
5. Log in as Admin → upvote an issue → verify count updates
6. Submit a duplicate issue → verify warning modal appears
7. Go to Admin → Analytics tab → verify category bar chart loads
8. Verify issue list sorts High priority first, then by vote count within priority

---

## Summary of All New/Changed Files

| File | Change type |
|------|------------|
| backend/store.py | Toggle vote, find_similar, analytics(), photo in create_issue, updated sort |
| backend/app.py | /vote, /analytics, /uploads, multipart form support |
| backend/seed.py | Updated categories, votes/photo fields in seed data |
| frontend/js/api.js | Api.vote(), Api.analytics() |
| frontend/js/icons.js | ArrowUp, BarChart, Image icons |
| frontend/js/components.js | VoteBadge, DuplicateWarningModal |
| frontend/js/dashboard.js | Photo input in ReportForm, vote button on IssueCard, AnalyticsDashboard |
| frontend/js/app.js | Analytics tab in admin nav |
| frontend/css/app.css | Photo preview, vote animation, bar chart styles |
