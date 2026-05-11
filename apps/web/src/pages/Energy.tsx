import { useState } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { AreaChartWidget } from '@/components/charts/AreaChartWidget'
import { BarChartWidget } from '@/components/charts/BarChartWidget'
import { DonutChart } from '@/components/charts/DonutChart'
import { COMPANY_CONFIG } from '@/config/company'
import { ALL_HISTORIES } from '@/data/mockSensors'
import { Zap, Leaf, DollarSign, TrendingDown, AlertTriangle } from 'lucide-react'

const COST_PER_KWH = 2.45   // MXN
const CO2_PER_KWH  = 0.432  // kg CO2/kWh (CFE promedio México)

const AREA_COLORS: Record<string, string> = {
  'Línea A':  '#1A6DFF',
  'Línea B':  '#8FAAC8',
  'Línea C':  '#F59E0B',
  'Ensamble': '#22C55E',
}

function buildData(days: number) {
  return COMPANY_CONFIG.machines.map(m => {
    const readings = ALL_HISTORIES[m.id].readings.slice(-days)
    const totalKwh  = readings.reduce((s, r) => s + r.energy, 0)
    const avgDaily  = totalKwh / days
    const cost      = totalKwh * COST_PER_KWH
    const co2       = totalKwh * CO2_PER_KWH
    return { machine: m, totalKwh: Math.round(totalKwh), avgDaily: Math.round(avgDaily * 10) / 10, cost: Math.round(cost), co2: Math.round(co2), area: m.area }
  })
}

function buildTrend(days: number) {
  const first = ALL_HISTORIES[COMPANY_CONFIG.machines[0].id].readings
  const startIdx = first.length - days
  return Array.from({ length: days }, (_, i) => {
    const idx = startIdx + i
    const total = COMPANY_CONFIG.machines.reduce((sum, m) => {
      return sum + (ALL_HISTORIES[m.id].readings[idx]?.energy ?? 0)
    }, 0)
    return {
      date: ALL_HISTORIES[COMPANY_CONFIG.machines[0].id].readings[idx]?.date ?? '',
      kwh:  Math.round(total * 10) / 10,
    }
  })
}

function buildHourly() {
  return Array.from({ length: 24 }, (_, h) => {
    // Simulate load curve: higher during day shifts, lower at night
    const base = h >= 6 && h < 22 ? 185 : 95
    const variation = ((h * 7 + 13) % 40) - 20
    return { hora: `${String(h).padStart(2, '0')}h`, kwh: Math.max(40, base + variation) }
  })
}

// Detect peak demand hour
function peakHour(hourly: { hora: string; kwh: number }[]) {
  return hourly.reduce((max, h) => h.kwh > max.kwh ? h : max, hourly[0])
}

export default function Energy() {
  const [period, setPeriod] = useState<7 | 30 | 90>(30)
  const machines  = buildData(period)
  const trend     = buildTrend(period)
  const hourly    = buildHourly()
  const peak      = peakHour(hourly)

  const totalKwh  = machines.reduce((s, m) => s + m.totalKwh, 0)
  const totalCost = machines.reduce((s, m) => s + m.cost, 0)
  const totalCo2  = machines.reduce((s, m) => s + m.co2, 0)
  const avgPerUnit = Math.round(totalKwh / (period * COMPANY_CONFIG.kpis.pphTarget * 8 * COMPANY_CONFIG.machines.length / 1000) * 100) / 100

  // Donut: consumption by area
  const byArea = Object.entries(
    machines.reduce((acc, m) => { acc[m.area] = (acc[m.area] ?? 0) + m.totalKwh; return acc }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value, color: AREA_COLORS[name] ?? 'var(--accent)' }))

  // Bar chart data
  const barData = machines.map(m => ({
    equipo: m.machine.name.split(' ').slice(0, 2).join(' '),
    kwh:    m.totalKwh,
  }))

  return (
    <PageWrapper title="Monitor de Energía">
      {/* Period selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {([7, 30, 90] as const).map(d => (
          <button key={d} onClick={() => setPeriod(d)} style={{
            padding: '5px 14px', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 700,
            background: period === d ? 'var(--accent-dim)' : 'var(--bg-surface)',
            border: `1px solid ${period === d ? 'rgba(143,170,200,0.40)' : 'var(--border-glass)'}`,
            color: period === d ? 'var(--accent)' : 'var(--text-secondary)',
            transition: 'all 0.15s', fontFamily: 'inherit',
          }}>
            {d === 7 ? 'Semana' : d === 30 ? '30 días' : '90 días'}
          </button>
        ))}
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: `Total kWh (${period}d)`, value: totalKwh.toLocaleString(), unit: 'kWh', icon: <Zap size={14} />, color: 'var(--accent)' },
          { label: 'Costo estimado', value: `$${(totalCost / 1000).toFixed(1)}k`, unit: 'MXN', icon: <DollarSign size={14} />, color: 'var(--warning)' },
          { label: 'Huella CO₂',    value: `${(totalCo2 / 1000).toFixed(1)}t`, unit: 'toneladas', icon: <Leaf size={14} />, color: 'var(--success)' },
          { label: 'kWh / 1k pzs', value: avgPerUnit.toFixed(2), unit: 'eficiencia', icon: <TrendingDown size={14} />, color: 'var(--primary)' },
        ].map(({ label, value, unit, icon, color }) => (
          <GlassCard key={label} padding="sm">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>{label}</div>
              <div style={{ color, opacity: 0.85 }}>{icon}</div>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, marginTop: 4 }}>{unit}</div>
          </GlassCard>
        ))}
      </div>

      {/* Trend + Donut */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, marginBottom: 16 }}>
        <GlassCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Consumo Total — Tendencia {period} días
              </div>
              <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                {(totalKwh / period).toFixed(0)} kWh/día promedio
              </div>
            </div>
            <Badge variant="info">kWh/día</Badge>
          </div>
          <AreaChartWidget data={trend} xKey="date" height={200}
            areas={[{ key: 'kwh', color: 'var(--accent)', label: 'kWh total planta' }]}
          />
        </GlassCard>

        <GlassCard style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Distribución por Área
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <DonutChart data={byArea} size={148} label="kWh" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {byArea.map(a => (
              <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, flex: 1 }}>{a.name}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {a.value.toLocaleString()} kWh
                </span>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700 }}>
                  {Math.round((a.value / totalKwh) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Machine breakdown + Hourly profile */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <GlassCard>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 14 }}>
            Consumo por Equipo ({period}d)
          </div>
          <BarChartWidget data={barData} xKey="equipo" valueKey="kwh" color="var(--accent)" height={170} />
        </GlassCard>

        <GlassCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Perfil de Carga — 24h
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={11} color="var(--warning)" />
              <span style={{ fontSize: 9, color: 'var(--warning)', fontWeight: 700 }}>
                Pico: {peak.hora} ({peak.kwh} kWh)
              </span>
            </div>
          </div>
          <BarChartWidget data={hourly} xKey="hora" valueKey="kwh" color="var(--primary)"
            reference={230} referenceLabel="DEMANDA PICO" height={170} />
        </GlassCard>
      </div>

      {/* Machine detail table */}
      <GlassCard>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 14 }}>
          Detalle por Equipo
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Equipo', 'Área', `kWh (${period}d)`, 'Costo MXN', 'CO₂ (kg)', 'Prom. Diario', '% del Total'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {machines.sort((a, b) => b.totalKwh - a.totalKwh).map(m => (
                <tr key={m.machine.id}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  style={{ transition: 'background 0.15s' }}
                >
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{m.machine.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {m.machine.name.split(' ').slice(0, 3).join(' ')}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: AREA_COLORS[m.area] ?? 'var(--accent)', display: 'inline-block', marginRight: 6 }} />
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{m.area}</span>
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 800, color: 'var(--accent)' }}>{m.totalKwh.toLocaleString()}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--warning)', fontWeight: 700 }}>${m.cost.toLocaleString()}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--success)', fontWeight: 700 }}>{m.co2.toLocaleString()}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{m.avgDaily} kWh/d</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 4, borderRadius: 100, background: 'rgba(255,255,255,0.08)', maxWidth: 60 }}>
                        <div style={{ height: '100%', borderRadius: 100, background: AREA_COLORS[m.area] ?? 'var(--accent)', width: `${Math.round((m.totalKwh / totalKwh) * 100)}%` }} />
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 800, color: 'var(--text-muted)' }}>
                        {Math.round((m.totalKwh / totalKwh) * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </PageWrapper>
  )
}
