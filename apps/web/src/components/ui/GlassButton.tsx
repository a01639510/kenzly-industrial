import { type ButtonHTMLAttributes } from 'react'

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?:    'sm' | 'md' | 'lg'
  icon?:    React.ReactNode
}

const variantStyles = {
  primary: {
    background: 'linear-gradient(135deg, var(--primary), var(--accent))',
    border: 'none', color: '#fff',
    boxShadow: '0 4px 16px rgba(14,165,233,0.35)',
  },
  ghost: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-glass)',
    color: 'var(--text-primary)',
  },
  danger: {
    background: 'var(--danger-dim)',
    border: '1px solid rgba(239,68,68,0.4)',
    color: '#FCA5A5',
  },
}

const sizeStyles = {
  sm: { fontSize: '11px', padding: '6px 14px', gap: '6px' },
  md: { fontSize: '12px', padding: '9px 18px', gap: '8px' },
  lg: { fontSize: '13px', padding: '12px 24px', gap: '10px' },
}

export function GlassButton({ variant = 'ghost', size = 'md', icon, children, style, ...props }: GlassButtonProps) {
  return (
    <button
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 10, fontWeight: 700, cursor: 'pointer',
        transition: 'all 0.18s ease', letterSpacing: '0.3px',
        fontFamily: 'inherit', backdropFilter: 'blur(8px)',
        ...sizeStyles[size], ...variantStyles[variant], ...style,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget
        el.style.opacity = '0.85'
        el.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        el.style.opacity = '1'
        el.style.transform = 'translateY(0)'
      }}
      {...props}
    >
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </button>
  )
}
