import { motion } from 'framer-motion'
import { GlassCard } from './GlassCard'

interface KPITileProps {
  label:       string
  value:       string | number
  unit?:       string
  delta?:      number   // % change vs target
  icon?:       React.ReactNode
  color?:      string
  target?:     number
  loading?:    boolean
}

export function KPITile({ label, value, unit, delta, icon, color = 'var(--primary)', target, loading }: KPITileProps) {
  const deltaOk = delta === undefined || delta >= 0

  return (
    <GlassCard className="flex flex-col gap-3 h-full" padding="md">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          {label}
        </span>
        {icon && (
          <span style={{
            width: 32, height: 32, borderRadius: 10,
            backgroundColor: `${color}18`,
            border: `1px solid ${color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color, fontSize: 15,
          }}>
            {icon}
          </span>
        )}
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 40, width: '70%', borderRadius: 8 }} />
      ) : (
        <motion.div
          key={String(value)}
          initial={{ opacity: 0.6, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}
        >
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 700,
            color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-1px',
          }}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
          {unit && (
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {unit}
            </span>
          )}
        </motion.div>
      )}

      {(delta !== undefined || target !== undefined) && !loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
          {delta !== undefined && (
            <span style={{
              fontSize: '10px', fontWeight: 700,
              color: deltaOk ? 'var(--success)' : 'var(--danger)',
            }}>
              {deltaOk ? '▲' : '▼'} {Math.abs(delta)}%
            </span>
          )}
          {target !== undefined && (
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
              META: {target}
            </span>
          )}
        </div>
      )}
    </GlassCard>
  )
}
