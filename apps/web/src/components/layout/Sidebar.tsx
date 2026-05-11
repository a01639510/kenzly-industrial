import { useState, useRef, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Wrench, FileText, Bell, ChevronRight, ChevronLeft,
  LogOut, User, Users, Zap, Sliders, Monitor, ClipboardList,
} from 'lucide-react'
import { COMPANY_CONFIG } from '@/config/company'
import { useAlertStore } from '@/store/useAlertStore'
import { useKioskStore } from '@/store/useKioskStore'
import { useAuthStore }  from '@/store/useAuthStore'

const NAV = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/maintenance', icon: Wrench,           label: 'Mantenimiento' },
  { to: '/orders',      icon: ClipboardList,    label: 'Producción'   },
  { to: '/workforce',   icon: Users,            label: 'Operadores'   },
  { to: '/energy',      icon: Zap,              label: 'Energía'      },
  { to: '/whatif',      icon: Sliders,          label: 'Simulador'    },
  { to: '/reports',     icon: FileText,         label: 'Reportes'     },
  { to: '/alerts',      icon: Bell,             label: 'Alertas'      },
]

export function Sidebar() {
  const [collapsed,    setCollapsed]    = useState(true)
  const [userPopover,  setUserPopover]  = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  const location  = useLocation()
  const active    = useAlertStore(s => s.alerts.filter(a => !a.acknowledged).length)
  const kiosk     = useKioskStore(s => s.enter)
  const { user, signOut } = useAuthStore()

  const displayName = user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email?.split('@')[0]?.replace(/[._]/g, ' ')
    || 'Usuario'

  const displayEmail = user?.email ?? ''

  useEffect(() => {
    if (!userPopover) return
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setUserPopover(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [userPopover])

  return (
    <motion.aside
      animate={{ width: collapsed ? 60 : 224 }}
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
                background: isActive ? 'rgba(26,109,255,0.15)' : 'transparent',
                border: `1px solid ${isActive ? 'rgba(26,109,255,0.25)' : 'transparent'}`,
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

      {/* Bottom: Kiosk + User */}
      <div style={{ padding: '10px 6px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>

        {/* Kiosk button */}
        <button
          onClick={kiosk}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
            background: 'rgba(26,109,255,0.10)', border: '1px solid rgba(26,109,255,0.22)',
            color: 'var(--primary)', transition: 'all 0.15s', width: '100%',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,109,255,0.20)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(26,109,255,0.10)' }}
          title="Modo Quiosco"
        >
          <Monitor size={16} style={{ flexShrink: 0 }} />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}
              >
                Modo Quiosco
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* User avatar button + popover */}
        <div ref={popoverRef} style={{ position: 'relative' }}>

          {/* Popover */}
          <AnimatePresence>
            {userPopover && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: 'absolute', bottom: 'calc(100% + 8px)', left: 6,
                  width: 210,
                  background: 'rgba(10,14,30,0.97)',
                  backdropFilter: 'blur(28px)',
                  WebkitBackdropFilter: 'blur(28px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 14,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
                  overflow: 'hidden',
                  zIndex: 100,
                }}
              >
                {/* User info */}
                <div style={{ padding: '16px 16px 12px' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', marginBottom: 10,
                    background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 900, color: '#fff',
                  }}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div style={{
                    fontSize: 13, fontWeight: 800, color: 'var(--text-primary)',
                    letterSpacing: '-0.2px', textTransform: 'capitalize',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {displayName}
                  </div>
                  <div style={{
                    fontSize: 11, color: 'var(--text-muted)', marginTop: 2,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {displayEmail}
                  </div>
                  <div style={{
                    display: 'inline-block', marginTop: 8,
                    padding: '2px 8px', borderRadius: 6,
                    background: 'var(--primary-dim)', border: '1px solid rgba(26,109,255,0.25)',
                    fontSize: 9, fontWeight: 800, color: 'var(--primary)', letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                  }}>
                    Supervisor
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '0 12px' }} />

                {/* Logout */}
                <div style={{ padding: '8px' }}>
                  <button
                    onClick={() => { setUserPopover(false); signOut() }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 10px', borderRadius: 9, cursor: 'pointer',
                      background: 'transparent', border: 'none',
                      color: 'var(--danger)', fontSize: 12, fontWeight: 700,
                      fontFamily: 'inherit', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.10)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <LogOut size={14} />
                    Cerrar sesión
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Avatar row */}
          <button
            onClick={() => setUserPopover(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
              background: userPopover ? 'var(--bg-surface-active)' : 'transparent',
              border: `1px solid ${userPopover ? 'rgba(255,255,255,0.14)' : 'transparent'}`,
              color: 'var(--text-secondary)', transition: 'all 0.15s', width: '100%',
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}
            onMouseEnter={e => { if (!userPopover) e.currentTarget.style.background = 'var(--bg-surface-hover)' }}
            onMouseLeave={e => { if (!userPopover) e.currentTarget.style.background = 'transparent' }}
            title="Cuenta"
          >
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: 'var(--primary-dim)', border: '1px solid rgba(26,109,255,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--primary)', fontSize: 11, fontWeight: 900,
            }}>
              {user ? displayName.charAt(0).toUpperCase() : <User size={13} />}
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }} style={{ flex: 1, overflow: 'hidden', minWidth: 0, textAlign: 'left' }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'capitalize' }}>
                    {displayName}
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px' }}>
                    SUPERVISOR
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </button>

        </div>
      </div>
    </motion.aside>
  )
}
