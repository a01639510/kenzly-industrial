import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface DataPoint { [key: string]: string | number }

interface AreaChartWidgetProps {
  data:      DataPoint[]
  xKey:      string
  areas:     { key: string; color: string; label: string }[]
  height?:   number
}

export function AreaChartWidget({ data, xKey, areas, height = 200 }: AreaChartWidgetProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          {areas.map(a => (
            <linearGradient key={a.key} id={`grad-${a.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={a.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={a.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis
          dataKey={xKey} axisLine={false} tickLine={false}
          tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 600 }}
          interval="preserveStartEnd"
        />
        <YAxis
          axisLine={false} tickLine={false}
          tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
        />
        <Tooltip
          contentStyle={{
            background: 'rgba(10,15,30,0.95)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 10, backdropFilter: 'blur(16px)', color: 'rgba(255,255,255,0.9)',
            fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
          labelStyle={{ color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}
          itemStyle={{ color: 'rgba(255,255,255,0.9)' }}
          cursor={{ stroke: 'rgba(255,255,255,0.10)', strokeWidth: 1 }}
        />
        {areas.map(a => (
          <Area
            key={a.key} type="monotone" dataKey={a.key} name={a.label}
            stroke={a.color} strokeWidth={2}
            fill={`url(#grad-${a.key})`}
            dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: a.color }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
