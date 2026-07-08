/* CampusPulse — root app: session handling + view routing. */

const { createElement: h, useState, useEffect, useCallback } = React;
const { TopBar, Login, Toast } = window.components;
const { StudentDashboard, AdminDashboard, StatGrid } = window.dash;

function App() {
  const [user, setUser] = useState(() => Api.me());
  const [tab, setTab] = useState('board'); // admin tab: 'board' | 'stats'
  const [toast, setToast] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // bump to trigger TopBar refresh
  const [refreshing, setRefreshing] = useState(false);

  // tiny toast helper with auto-dismiss
  const notify = useCallback((t) => {
    setToast(t);
    setTimeout(() => setToast(null), 3200);
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  function logout() {
    Api.logout();
    setUser(null);
    setTab('board');
  }

  if (!user) {
    return h(React.Fragment, null,
      h(Login, { onLoggedIn: setUser }),
      h(Toast, { toast }));
  }

  return (
    h('div', { className: 'min-h-screen' },
      h(TopBar, {
        user, onLogout: logout,
        tab: user.role === 'Admin' ? tab : null,
        setTab: user.role === 'Admin' ? setTab : null,
        refresh, refreshing,
      }),

      user.role === 'Admin' && tab === 'stats'
        ? h(AdminStatsView, { user, onToast: notify })
        : user.role === 'Admin'
          ? h(AdminDashboard, { key: refreshKey, user, onToast: notify })
          : h(StudentDashboard, { key: refreshKey, user, onToast: notify }),

      h('footer', { className: 'mx-auto max-w-7xl px-4 pb-10 pt-8 text-center text-xs text-slate-600 sm:px-6' },
        'CampusPulse · Smart Campus & Exam Issue Tracker · Hackathon prototype'),
      h(Toast, { toast }),
    )
  );
}

// The admin "Stats" tab reuses the dashboard grid but on its own page so the
// tab nav feels meaningful. Keeps the prototype simple without a router.
function AdminStatsView({ user, onToast }) {
  const [stats, setStats] = useState(null);
  useEffect(() => { Api.stats().then(setStats).catch((e) => onToast({ type: 'error', message: e.message })); }, []);
  return (
    h('div', { className: 'mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8' },
      h('h1', { className: 'mb-5 text-xl font-bold text-white sm:text-2xl' }, 'Live stats summary'),
      h(StatGrid, { stats }))
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(h(App));
