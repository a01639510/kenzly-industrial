import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'

interface BarChartWidgetProps {
  data:       { [key: string]: string | number }[]
  xKey:       string
  valueKey:   string
  color?:     string
  reference?: number
  referenceLabel?: string
  height?:    number
  barSize?:   number
}

export function BarChartWidget({
  data, xKey, valueKey, color = 'var(--primary)', reference, referenceLabel, height = 180, barSize = 16,
}: BarChartWidgetProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis
          dataKey={xKey} axisLine={false} tickLine={false}
          tick={{ fontSize: 9, fill: 'var(--text-muted)', fontWeight: 600 }}
          interval="preserveStartEnd"
        />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          contentStyle={{
            background: 'rgba(10,15,30,0.95)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 10, backdropFilter: 'blur(16px)', color: 'rgba(255,255,255,0.9)',
            fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        />
        {reference && (
          <ReferenceLine
            y={reference} stroke="var(--danger)" strokeDasharray="4 4"
            label={{ value: referenceLabel ?? `META: ${reference}`, fill: 'var(--danger)', fontSize: 9, position: 'insideTopRight' }}
          />
        )}
        <Bar dataKey={valueKey} radius={[4, 4, 0, 0]} barSize={barSize}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={color}
              fillOpacity={reference && Number(entry[valueKey]) < reference ? 0.4 : 1}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
