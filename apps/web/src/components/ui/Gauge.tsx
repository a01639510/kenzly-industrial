interface GaugeProps {
  value:    number   // 0–100
  size?:    number
  color?:   string
  label?:   string
  unit?:    string
}

export function Gauge({ value, size = 120, color = 'var(--primary)', label, unit = '%' }: GaugeProps) {
  const r      = (size - 16) / 2
  const circ   = 2 * Math.PI * r
  const pct    = Math.min(100, Math.max(0, value))
  // 270° arc (starts at 135° = bottom-left, sweeps clockwise)
  const arcLen = (pct / 100) * (circ * 0.75)
  const gap    = circ - arcLen

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} style={{ overflow: 'visible' }}>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={8}
          strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
          strokeDashoffset={circ * 0.375}
          strokeLinecap="round"
        />
        {/* Progress */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray={`${arcLen} ${circ - arcLen}`}
          strokeDashoffset={circ * 0.375}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}88)`, transition: 'stroke-dasharray 1s ease' }}
        />
        {/* Value */}
        <text x={size / 2} y={size / 2 + 6} textAnchor="middle"
          style={{ fontFamily: 'var(--font-mono)', fontSize: size * 0.2, fontWeight: 700, fill: 'var(--text-primary)' }}
        >
          {Math.round(pct)}
        </text>
        <text x={size / 2} y={size / 2 + 6 + size * 0.12} textAnchor="middle"
          style={{ fontSize: size * 0.1, fontWeight: 600, fill: 'var(--text-secondary)' }}
        >
          {unit}
        </text>
      </svg>
      {label && (
        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
          {label}
        </span>
      )}
    </div>
  )
}
