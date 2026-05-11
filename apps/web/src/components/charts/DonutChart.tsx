import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface DonutSegment { name: string; value: number; color: string }

interface DonutChartProps {
  data:    DonutSegment[]
  size?:   number
  inner?:  number
  label?:  string
}

export function DonutChart({ data, size = 180, inner = 55, label }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data} cx="50%" cy="50%"
            innerRadius={inner} outerRadius={size / 2 - 4}
            paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} stroke="transparent"
                style={{ filter: `drop-shadow(0 0 6px ${entry.color}66)` }}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'rgba(10,15,30,0.95)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 10, backdropFilter: 'blur(16px)', color: 'rgba(255,255,255,0.9)',
              fontSize: 12,
            }}
            formatter={(v: number, name: string) => [`${v} (${Math.round(v / total * 100)}%)`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
      {label && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
            {total}
          </span>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            {label}
          </span>
        </div>
      )}
    </div>
  )
}
