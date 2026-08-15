/* CampusPulse — root app */
const { createElement: h, useState, useCallback } = React;
const { TopBar, Login, Toast } = window.components;
const { StudentDashboard, AdminDashboard, AnalyticsDashboard, AdminAssistant } = window.dash;

function App() {
  const [user, setUser] = useState(() => Api.me());
  const [tab, setTab] = useState('board');
  const [toast, setToast] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const notify = useCallback((t) => {
    setToast(t);
    setTimeout(() => setToast(null), 4500);
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  function logout() {
    Api.logout();
    setUser(null);
    setTab('board');
  }

  if (!user) return h(React.Fragment, null,
    h(Login, { onLoggedIn: setUser }),
    h(Toast, { toast }));

  function renderView() {
    if (user.role !== 'Admin') return h(StudentDashboard, { key: refreshKey, user, onToast: notify });
    if (tab === 'analytics') return h(AnalyticsDashboard, { user, onToast: notify });
    if (tab === 'assistant') return h(AdminAssistant, { user, onToast: notify });
    return h(AdminDashboard, { key: refreshKey, user, onToast: notify });
  }

  return h('div', { style: { minHeight: '100vh', display: 'flex', flexDirection: 'column' } },
    h(TopBar, { user, onLogout: logout, tab: user.role === 'Admin' ? tab : null, setTab: user.role === 'Admin' ? setTab : null, refresh, refreshing }),
    h('main', { style: { flex: 1 } }, renderView()),
    h('footer', { style: { textAlign: 'center', padding: '20px', fontSize: 11.5, color: 'rgba(255,255,255,0.18)', borderTop: '1px solid rgba(255,255,255,0.05)' } },
      'CampusPulse · PS-4 FixIt · Team 9'),
    h(Toast, { toast }));
}

ReactDOM.createRoot(document.getElementById('root')).render(h(App));
