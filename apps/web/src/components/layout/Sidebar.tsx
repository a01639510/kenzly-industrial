import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Wrench, FileText, Bell, ChevronRight, ChevronLeft, LogOut, User,
} from 'lucide-react'
import { COMPANY_CONFIG } from '@/config/company'
import { useAlertStore } from '@/store/useAlertStore'

const NAV = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/maintenance', icon: Wrench,           label: 'Mantenimiento' },
  { to: '/reports',     icon: FileText,         label: 'Reportes'     },
  { to: '/alerts',      icon: Bell,             label: 'Alertas'      },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(true)
  const location  = useLocation()
  const active    = useAlertStore(s => s.alerts.filter(a => !a.acknowledged).length)

  return (
    <motion.aside
      animate={{ width: collapsed ? 60 : 220 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      style={{
        height: '100vh', flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: 'rgba(8,12,28,0.92)', backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden',
        position: 'sticky', top: 0,
      }}
    >
      {/* Logo */}
      <div style={{
        height: 56, display: 'flex', alignItems: 'center',
        padding: '0 14px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        gap: 10, flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 900, color: '#fff',
        }}>
          {COMPANY_CONFIG.shortName[0]}
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }} style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                {COMPANY_CONFIG.shortName}
              </div>
              <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '2px' }}>
                INDUSTRIAL
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            marginLeft: 'auto', width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: 'transparent', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-surface-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 6px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV.map(({ to, icon: Icon, label }) => {
          const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
          const isAlerts = to === '/alerts'
          return (
            <NavLink key={to} to={to} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 10,
                background: isActive ? 'rgba(14,165,233,0.15)' : 'transparent',
                border: `1px solid ${isActive ? 'rgba(14,165,233,0.25)' : 'transparent'}`,
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                transition: 'all 0.15s', cursor: 'pointer', position: 'relative',
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--bg-surface-hover)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
              >
                <span style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  <Icon size={17} />
                  {isAlerts && active > 0 && (
                    <span style={{
                      position: 'absolute', top: -6, right: -6,
                      width: 14, height: 14, borderRadius: '50%', fontSize: 8, fontWeight: 800,
                      background: 'var(--danger)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {active > 9 ? '9+' : active}
                    </span>
                  )}
                </span>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', letterSpacing: '0.2px' }}
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </NavLink>
          )
        })}
      </nav>

      {/* User */}
      <div style={{ padding: '10px 6px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 10px', borderRadius: 10,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: 'var(--primary-dim)', border: '1px solid var(--primary)44',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--primary)',
          }}>
            <User size={14} />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }} style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Operador
                </div>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px' }}>
                  SUPERVISOR
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {!collapsed && (
            <button style={{
              background: 'transparent', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', flexShrink: 0, padding: 4, borderRadius: 6, display: 'flex',
            }}>
              <LogOut size={13} />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  )
}
