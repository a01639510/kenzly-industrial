import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Sidebar }   from '@/components/layout/Sidebar'
import { KioskBar }  from '@/components/layout/KioskBar'
import { useKioskStore } from '@/store/useKioskStore'
import Dashboard   from '@/pages/Dashboard'
import Maintenance from '@/pages/Maintenance'
import Reports     from '@/pages/Reports'
import Alerts      from '@/pages/Alerts'
import Workforce   from '@/pages/Workforce'
import Energy      from '@/pages/Energy'
import WhatsIf     from '@/pages/WhatsIf'

function AppLayout() {
  const kioskActive = useKioskStore(s => s.active)

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

const router = createBrowserRouter([
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
