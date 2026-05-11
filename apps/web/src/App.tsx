import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Sidebar } from '@/components/layout/Sidebar'
import Dashboard   from '@/pages/Dashboard'
import Maintenance from '@/pages/Maintenance'
import Reports     from '@/pages/Reports'
import Alerts      from '@/pages/Alerts'

function AppLayout() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, overflow: 'hidden', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
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
      { index: true,           element: <Dashboard /> },
      { path: 'maintenance',   element: <Maintenance /> },
      { path: 'reports',       element: <Reports /> },
      { path: 'alerts',        element: <Alerts /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
