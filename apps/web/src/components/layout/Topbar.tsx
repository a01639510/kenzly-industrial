import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { COMPANY_CONFIG } from '@/config/company'
import { useAlertStore } from '@/store/useAlertStore'

interface TopbarProps { title: string }

export function Topbar({ title }: TopbarProps) {
  const [now, setNow] = useState(new Date())
  const navigate   = useNavigate()
  const alertCount = useAlertStore(s => s.alerts.filter(a => !a.acknowledged).length)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header style={{
      height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', flexShrink: 0,
      background: 'rgba(8,12,28,0.70)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
    }}>
      <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
        {title}
      </h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Date */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
            {format(now, "EEEE, d MMM yyyy", { locale: es })}
          </div>
          <div style={{
            fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)', letterSpacing: '1px',
          }}>
            {format(now, 'HH:mm:ss')}
          </div>
        </div>

        {/* Notifications */}
        <button
          onClick={() => navigate('/alerts')}
          style={{
            position: 'relative', width: 36, height: 36, borderRadius: 10,
            background: 'var(--bg-surface)', border: '1px solid var(--border-glass)',
            color: alertCount > 0 ? 'var(--warning)' : 'var(--text-secondary)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-surface-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface)' }}
        >
          <Bell size={16} />
          {alertCount > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              width: 16, height: 16, borderRadius: '50%', fontSize: 9, fontWeight: 800,
              background: 'var(--danger)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--bg-base)',
            }}>
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
