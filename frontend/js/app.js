/* CampusPulse — root app: session handling + view routing — PS-4 edition. */

const { createElement: h, useState, useEffect, useCallback } = React;
const { TopBar, Login, Toast } = window.components;
const { StudentDashboard, AdminDashboard, StatGrid, AnalyticsDashboard, AdminAssistant } = window.dash;

function App() {
  const [user, setUser] = useState(() => Api.me());
  const [tab, setTab] = useState('board');
  const [toast, setToast] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const notify = useCallback((t) => {
    setToast(t);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setRefreshing(false), 600);
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

  function renderAdminView() {
    if (tab === 'analytics') return h(AnalyticsDashboard, { user, onToast: notify });
    if (tab === 'assistant') return h(AdminAssistant, { user, onToast: notify });
    if (tab === 'stats')    return h(AdminStatsView, { user, onToast: notify });
    return h(AdminDashboard, { key: refreshKey, user, onToast: notify });
  }

  return h('div', { className: 'min-h-screen' },
    h(TopBar, {
      user, onLogout: logout,
      tab: user.role === 'Admin' ? tab : null,
      setTab: user.role === 'Admin' ? setTab : null,
      refresh, refreshing,
    }),

    user.role === 'Admin'
      ? renderAdminView()
      : h(StudentDashboard, { key: refreshKey, user, onToast: notify }),

    h('footer', { className: 'mx-auto max-w-7xl px-4 pb-10 pt-8 text-center text-xs text-slate-600 sm:px-6' },
      'CampusPulse · PS-4 FixIt · Team 9 · AI-Powered Campus Issue Tracker'),

    h(Toast, { toast }));
}

function AdminStatsView({ user, onToast }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    Api.stats().then(setStats).catch((e) => onToast({ type: 'error', message: e.message }));
  }, []);
  return h('div', { className: 'mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8' },
    h('h1', { className: 'mb-5 text-xl font-bold text-white sm:text-2xl' }, 'Live stats summary'),
    h(StatGrid, { stats }));
}

ReactDOM.createRoot(document.getElementById('root')).render(h(App));
