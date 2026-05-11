interface BadgeProps {
  variant: 'critical' | 'warning' | 'ok' | 'info' | 'high' | 'medium' | 'low'
  children: React.ReactNode
  dot?: boolean
  className?: string
}

const variantMap = {
  critical: { bg: 'var(--danger-dim)',  border: 'var(--danger)',  text: '#FCA5A5' },
  high:     { bg: 'var(--danger-dim)',  border: 'var(--danger)',  text: '#FCA5A5' },
  warning:  { bg: 'var(--warning-dim)', border: 'var(--warning)', text: '#FCD34D' },
  medium:   { bg: 'var(--warning-dim)', border: 'var(--warning)', text: '#FCD34D' },
  ok:       { bg: 'var(--success-dim)', border: 'var(--success)', text: '#86EFAC' },
  low:      { bg: 'var(--accent-dim)',  border: 'var(--accent)',  text: '#5EEAD4' },
  info:     { bg: 'var(--primary-dim)', border: 'var(--primary)', text: '#7DD3FC' },
}

export function Badge({ variant, children, dot = false, className }: BadgeProps) {
  const v = variantMap[variant]
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding: '3px 10px', borderRadius: '100px',
        fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px',
        backgroundColor: v.bg,
        border: `1px solid ${v.border}44`,
        color: v.text,
        whiteSpace: 'nowrap',
      }}
    >
      {dot && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          backgroundColor: v.border, flexShrink: 0,
          boxShadow: `0 0 6px ${v.border}`,
        }} />
      )}
      {children}
    </span>
  )
}

export function StatusDot({ status }: { status: 'operating' | 'warning' | 'fault' }) {
  const color =
    status === 'operating' ? 'var(--success)' :
    status === 'warning'   ? 'var(--warning)' : 'var(--danger)'

  return (
    <span style={{ position: 'relative', display: 'inline-block', width: 10, height: 10 }}>
      <span style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        backgroundColor: color, boxShadow: `0 0 8px ${color}`,
      }} className="status-pulse" />
    </span>
  )
}
