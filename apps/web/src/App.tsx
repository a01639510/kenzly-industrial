import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Sidebar }   from '@/components/layout/Sidebar'
import { KioskBar }  from '@/components/layout/KioskBar'
import { useKioskStore } from '@/store/useKioskStore'
import { useAuthStore }  from '@/store/useAuthStore'
import Dashboard   from '@/pages/Dashboard'
import Maintenance from '@/pages/Maintenance'
import Reports     from '@/pages/Reports'
import Alerts      from '@/pages/Alerts'
import Workforce   from '@/pages/Workforce'
import Energy      from '@/pages/Energy'
import WhatsIf     from '@/pages/WhatsIf'
import Login       from '@/pages/Login'

function AppLayout() {
  const kioskActive = useKioskStore(s => s.active)
  const { user, loading } = useAuthStore()

  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)"
        strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {!kioskActive && <Sidebar />}
      <div style={{
        flex: 1, overflow: 'hidden', minWidth: 0, display: 'flex', flexDirection: 'column',
        paddingTop: kioskActive ? 52 : 0,
      }}>
        {kioskActive && <KioskBar />}
        <AnimatePresence mode="wait">
          <Outlet />
        </AnimatePresence>
      </div>
    </div>
  )
}

function LoginRoute() {
  const { user, loading } = useAuthStore()

  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return <Login />
}

const router = createBrowserRouter([
  { path: '/login', element: <LoginRoute /> },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true,          element: <Dashboard /> },
      { path: 'maintenance',  element: <Maintenance /> },
      { path: 'reports',      element: <Reports /> },
      { path: 'alerts',       element: <Alerts /> },
      { path: 'workforce',    element: <Workforce /> },
      { path: 'energy',       element: <Energy /> },
      { path: 'whatif',       element: <WhatsIf /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
