import { motion, type HTMLMotionProps } from 'framer-motion'

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode
  className?: string
  glow?: 'primary' | 'accent' | 'success' | 'warning' | 'danger'
  padding?: 'sm' | 'md' | 'lg' | 'none'
  hoverable?: boolean
}

const glowMap = {
  primary: 'box-shadow: 0 0 20px rgba(14,165,233,0.20);',
  accent:  'box-shadow: 0 0 20px rgba(20,184,166,0.20);',
  success: 'box-shadow: 0 0 20px rgba(34,197,94,0.20);',
  warning: 'box-shadow: 0 0 20px rgba(245,158,11,0.20);',
  danger:  'box-shadow: 0 0 20px rgba(239,68,68,0.20);',
}

const paddingMap = { sm: 'p-4', md: 'p-5', lg: 'p-6', none: 'p-0' }

export function GlassCard({
  children, className, glow, padding = 'md', hoverable = false, style, ...props
}: GlassCardProps) {
  const glowStyle = glow ? {
    boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 20px ${
      glow === 'primary' ? 'rgba(14,165,233,0.15)' :
      glow === 'accent'  ? 'rgba(20,184,166,0.15)' :
      glow === 'success' ? 'rgba(34,197,94,0.15)'  :
      glow === 'warning' ? 'rgba(245,158,11,0.15)' :
                           'rgba(239,68,68,0.15)'
    }`
  } : {}

  return (
    <motion.div
      className={['glass-card', paddingMap[padding], hoverable && 'cursor-pointer', className].filter(Boolean).join(' ')}
      style={{ ...glowStyle, ...style }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

