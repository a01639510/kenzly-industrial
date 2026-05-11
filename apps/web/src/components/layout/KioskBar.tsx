import { useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useKioskStore } from '@/store/useKioskStore'
import { COMPANY_CONFIG } from '@/config/company'
import { X, Monitor } from 'lucide-react'

const KIOSK_ROTATION = [
  { path: '/',          label: 'Dashboard Ejecutivo',  duration: 15 },
  { path: '/energy',    label: 'Monitor de Energía',   duration: 12 },
  { path: '/workforce', label: 'Operadores',           duration: 12 },
  { path: '/alerts',    label: 'Alertas Activas',      duration: 10 },
]

function Clock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '1px' }}>
      {time.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  )
}

export function KioskBar() {
  const exit      = useKioskStore(s => s.exit)
  const navigate  = useNavigate()
  const location  = useLocation()
  const [progress, setProgress] = useState(0)
  const indexRef  = useRef(0)
  const tickRef   = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentSlide = KIOSK_ROTATION.find(r => r.path === location.pathname) ?? KIOSK_ROTATION[0]
  const totalDuration = currentSlide.duration

  // Progress animation + navigation cycle
  useEffect(() => {
    setProgress(0)
    const idx = KIOSK_ROTATION.findIndex(r => r.path === location.pathname)
    indexRef.current = idx >= 0 ? idx : 0

    const startTime = Date.now()
    tickRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      const pct     = Math.min(100, (elapsed / totalDuration) * 100)
      setProgress(pct)

      if (elapsed >= totalDuration) {
        const next = (indexRef.current + 1) % KIOSK_ROTATION.length
        indexRef.current = next
        navigate(KIOSK_ROTATION[next].path)
      }
    }, 100)

    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  }, [location.pathname])

  // ESC to exit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') exit() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [exit])

  const nextSlide = KIOSK_ROTATION[(KIOSK_ROTATION.findIndex(r => r.path === location.pathname) + 1) % KIOSK_ROTATION.length]

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      height: 52,
      background: 'rgba(10,14,30,0.96)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.10)',
      display: 'flex', alignItems: 'center', padding: '0 20px', gap: 20,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 900, color: '#fff',
        }}>
          {COMPANY_CONFIG.shortName[0]}
        </div>
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.3px' }}>
          {COMPANY_CONFIG.name}
        </span>
      </div>

      {/* Current view */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Monitor size={13} color="var(--primary)" />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>{currentSlide.label}</span>
      </div>

      {/* Slide dots */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {KIOSK_ROTATION.map((r, i) => (
          <button key={r.path} onClick={() => navigate(r.path)} style={{
            width: i === indexRef.current ? 20 : 7, height: 7,
            borderRadius: 100, border: 'none', cursor: 'pointer',
            background: r.path === location.pathname ? 'var(--primary)' : 'rgba(255,255,255,0.20)',
            transition: 'all 0.3s',
          }} />
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ flex: 1, height: 3, borderRadius: 100, background: 'rgba(255,255,255,0.10)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 100,
          background: 'linear-gradient(90deg, var(--primary), var(--accent))',
          width: `${progress}%`,
          transition: 'width 0.1s linear',
        }} />
      </div>

      {/* Next label */}
      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
        → {nextSlide.label}
      </span>

      {/* Clock */}
      <Clock />

      {/* Exit */}
      <button onClick={exit} style={{
        background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.30)',
        borderRadius: 8, color: 'var(--danger)', cursor: 'pointer',
        width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'all 0.15s',
      }}>
        <X size={13} />
      </button>
    </div>
  )
}
