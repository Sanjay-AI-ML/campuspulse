/* CampusPulse — minimal stroke icon set (no emoji, no icon-font dependency).
   Each icon is a function component returning an inline SVG so it inherits
   `currentColor` and sizes via className. */

const { createElement: h } = React;

// Base wrapper keeps stroke style consistent across every icon.
function svg(paths, { className = 'w-5 h-5', ...rest } = {}) {
  return h('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
    className, ...rest,
  }, paths);
}
const P = (d, key) => h('path', { d, key });

const Icon = {
  Logo: (p) => svg([
    P('M3 12h3l2-6 4 12 2-6 2 3h5', 'a'),
  ], { className: 'w-6 h-6', ...p }),

  // ---- nav / UI ----
  Dashboard: (p) => svg([P('M4 13h6V4H4v9zm10 7h6v-9h-6v9zM4 20h6v-3H4v3zM14 4v3h6V4h-6z', 'a')], p),
  Plus:      (p) => svg([P('M12 5v14M5 12h14', 'a')], p),
  Logout:    (p) => svg([P('M15 12H4m11 0-3-3m3 3-3 3M9 4h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9', 'a')], p),
  Filter:    (p) => svg([P('M4 5h16M7 12h10M10 19h4', 'a')], p),
  Search:    (p) => svg([P('M21 21l-4.3-4.3M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z', 'a')], p),
  Clock:     (p) => svg([P('M12 8v4l3 2M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z', 'a')], p),
  Check:     (p) => svg([P('M20 6L9 17l-5-5', 'a')], p),
  Alert:     (p) => svg([P('M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z', 'a')], p),
  Pin:       (p) => svg([P('M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z', 'a')], p),
  Inbox:     (p) => svg([P('M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6l3.5-7z', 'a')], p),
  User:      (p) => svg([P('M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'a')], p),
  Lock:      (p) => svg([P('M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4', 'a')], p),
  Sparkle:   (p) => svg([P('M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z', 'a')], p),

  // ---- category icons ----
  Electrical: (p) => svg([P('M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5z', 'a')], p),       // bolt
  Plumbing:   (p) => svg([P('M12 2v6M9 8h6v4a3 3 0 0 1-3 3 3 3 0 0 1-3-3V8zM12 15v4M9 22h6M10 19h4', 'a')], p), // wrench-ish tap
  Furniture:  (p) => svg([P('M4 7v10M20 7v10M4 9h16M4 15h16M6 17v3M18 17v3', 'a')], p),      // chair/table
  IT:         (p) => svg([P('M5 13a8 8 0 0 1 16 0M8.5 16a4.5 4.5 0 0 1 7 0M2 9a14 14 0 0 1 20 0M12 20h.01', 'a')], p), // wifi
  Safety:     (p) => svg([P('M12 2 4 5v6c0 5 3.5 8 8 11 4.5-3 8-6 8-11V5l-8-3zM12 8v4M12 16h.01', 'a')], p), // shield
  Cleanliness:(p) => svg([P('M3 21h18M5 21V10l7-5 7 5v11M9 21v-5h6v5M9 11h.01M15 11h.01', 'a')], p), // spray / broom
  Hall:       (p) => svg([P('M4 4h16v12H4zM4 16l-2 4M20 16l2 4M9 9h6M9 12h6', 'a')], p),     // ticket / doc
  Seat:       (p) => svg([P('M6 4v16M18 4v16M6 8h12M6 14h12M4 10v2M20 10v2', 'a')], p),      // grid seat
  Timetable:  (p) => svg([P('M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM8 14h.01M12 14h.01M16 14h.01M8 18h.01', 'a')], p), // calendar
  Result:     (p) => svg([P('M9 11l3 3 6-6M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6M3 8h18', 'a')], p), // check in box
  Invigilation:(p)=> svg([P('M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM6 21v-1a6 6 0 0 1 12 0v1M3 3l18 18', 'a')], p), // person + slash
  Other:      (p) => svg([P('M12 8h.01M12 12v4M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z', 'a')], p), // info circle

  // track icons
  CampusTrack:(p) => svg([P('M3 21h18M5 21V8l7-4 7 4v13M9 21v-5h6v5M9 11h.01M15 11h.01', 'a')], p),
  ExamTrack:  (p) => svg([P('M14 3v5h5M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-5zM9 13h6M9 17h6', 'a')], p),
};

// Map a category name -> icon, used by tables/cards.
const CATEGORY_ICON = {
  Electrical: Icon.Electrical, Plumbing: Icon.Plumbing, Furniture: Icon.Furniture,
  'IT/Wi-Fi': Icon.IT, 'Safety/Security': Icon.Safety, Cleanliness: Icon.Cleanliness,
  'Hall Ticket Error': Icon.Hall, 'Seating Allocation Issue': Icon.Seat,
  'Timetable Clash': Icon.Timetable, 'Result Discrepancy': Icon.Result,
  'Invigilation Complaint': Icon.Invigilation, Other: Icon.Other,
};

function CategoryIcon({ category, className }) {
  const Cmp = CATEGORY_ICON[category] || Icon.Other;
  return h(Cmp, { className });
}

// Expose globally (no module bundler in this prototype).
window.Icon = Icon;
window.CATEGORY_ICON = CATEGORY_ICON;
window.CategoryIcon = CategoryIcon;
