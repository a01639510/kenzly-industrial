import { Activity, Zap, Package, AlertTriangle, Thermometer } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { GlassCard } from '@/components/ui/GlassCard'
import { KPITile } from '@/components/ui/KPITile'
import { Gauge } from '@/components/ui/Gauge'
import { Badge, StatusDot } from '@/components/ui/Badge'
import { AreaChartWidget } from '@/components/charts/AreaChartWidget'
import { BarChartWidget } from '@/components/charts/BarChartWidget'
import { useLiveKPIs, useMachineStatuses, useHourlyProduction } from '@/hooks/useMockData'
import { COMPANY_CONFIG } from '@/config/company'
import { useAlertStore } from '@/store/useAlertStore'

export default function Dashboard() {
  const kpis     = useLiveKPIs()
  const machines = useMachineStatuses()
  const hourly   = useHourlyProduction()
  const alerts   = useAlertStore(s => s.alerts.filter(a => !a.acknowledged))

  const oeeData = [
    { label: 'Disponibilidad', value: kpis.uptime,  color: 'var(--primary)' },
    { label: 'Rendimiento',    value: Math.round(kpis.oee / 0.88), color: 'var(--accent)' },
    { label: 'Calidad',        value: Math.round(kpis.oee / 0.81), color: 'var(--success)' },
  ]

  // Build 30-day area chart data
  const thirtyDays = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 29 + i)
    const base = COMPANY_CONFIG.kpis.pphTarget * 8 * COMPANY_CONFIG.machines.length
    return {
      day:  `${d.getDate()}/${d.getMonth() + 1}`,
      real: Math.round(base * (0.78 + Math.random() * 0.18)),
      meta: Math.round(base * 0.92),
    }
  })

  return (
    <PageWrapper title="Dashboard Ejecutivo">
      {/* ── KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
        <KPITile
          label="OEE" value={Math.round(kpis.oee)} unit="%"
          icon={<Activity size={15} />} color="var(--primary)"
          target={COMPANY_CONFIG.kpis.oeeTarget}
          delta={Math.round(kpis.oee - COMPANY_CONFIG.kpis.oeeTarget)}
        />
        <KPITile
          label="Uptime" value={Math.round(kpis.uptime)} unit="%"
          icon={<Zap size={15} />} color="var(--accent)"
          target={COMPANY_CONFIG.kpis.uptimeTarget}
          delta={Math.round(kpis.uptime - COMPANY_CONFIG.kpis.uptimeTarget)}
        />
        <KPITile
          label="Producción Turno" value={kpis.production} unit="pzs"
          icon={<Package size={15} />} color="var(--success)"
        />
        <KPITile
          label="Alertas Activas" value={alerts.length} unit=""
          icon={<AlertTriangle size={15} />}
          color={alerts.length > 2 ? 'var(--danger)' : 'var(--warning)'}
        />
      </div>

      {/* ── Main row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 20 }}>
        {/* Production 30d */}
        <GlassCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Producción 30 días
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                {(thirtyDays.reduce((s, d) => s + d.real, 0) / 1000).toFixed(1)}k piezas
              </div>
            </div>
            <Badge variant="ok" dot>EN TURNO</Badge>
          </div>
          <AreaChartWidget
            data={thirtyDays} xKey="day" height={220}
            areas={[
              { key: 'real', color: 'var(--primary)',  label: 'Producción real' },
              { key: 'meta', color: 'var(--text-muted)', label: 'Objetivo' },
            ]}
          />
        </GlassCard>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Energy + Temp */}
          <GlassCard>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 14 }}>
              Planta
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
              <Gauge value={kpis.energy / 3.4} size={100} color="var(--accent)" label="Energía" unit="kWh" />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <Thermometer size={22} color="var(--warning)" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {kpis.temperature}°
                </span>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700 }}>AMBIENTE (°C)</span>
              </div>
            </div>
          </GlassCard>

          {/* OEE breakdown */}
          <GlassCard style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 14 }}>
              Componentes OEE
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {oeeData.map(({ label, value, color }) => (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color }}>{Math.round(value)}%</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 100, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 100, background: color,
                      width: `${Math.min(100, value)}%`, transition: 'width 1.2s ease',
                      boxShadow: `0 0 10px ${color}66`,
                    }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>OEE TOTAL</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800, color: kpis.oee >= COMPANY_CONFIG.kpis.oeeTarget ? 'var(--success)' : 'var(--warning)' }}>
                {Math.round(kpis.oee)}%
              </span>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* ── Equipment Grid ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>
          Estado de Equipos
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12 }}>
          {machines.map(({ machine, status, vibration, temperature }) => (
            <GlassCard key={machine.id} padding="sm" hoverable
              glow={status === 'fault' ? 'danger' : status === 'warning' ? 'warning' : undefined}
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18 }}>{machine.icon}</span>
                <StatusDot status={status} />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                  {machine.name}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>
                  {machine.area}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 700 }}>VIB</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: vibration >= 7 ? 'var(--danger)' : vibration >= 4.5 ? 'var(--warning)' : 'var(--text-primary)' }}>
                    {vibration} <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>mm/s</span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 700 }}>TEMP</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: temperature >= 90 ? 'var(--danger)' : temperature >= 75 ? 'var(--warning)' : 'var(--text-primary)' }}>
                    {temperature}° <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>C</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* Hourly production */}
        <GlassCard>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 14 }}>
            Producción por Hora — Hoy
          </div>
          <BarChartWidget
            data={hourly} xKey="hour" valueKey="units"
            color="var(--primary)"
            reference={COMPANY_CONFIG.kpis.pphTarget}
            referenceLabel={`META ${COMPANY_CONFIG.kpis.pphTarget}`}
            height={160}
          />
        </GlassCard>

        {/* Last alerts */}
        <GlassCard>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 14 }}>
            Últimas Alertas
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {alerts.slice(0, 4).map(a => (
              <div key={a.id} style={{
                padding: '8px 10px', borderRadius: 10,
                background: a.severity === 'critical' ? 'var(--danger-dim)' : a.severity === 'high' ? 'rgba(239,68,68,0.08)' : 'var(--bg-surface)',
                border: `1px solid ${a.severity === 'critical' ? 'rgba(239,68,68,0.30)' : a.severity === 'high' ? 'rgba(239,68,68,0.15)' : 'var(--border-glass)'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <Badge variant={a.severity === 'critical' ? 'critical' : a.severity === 'high' ? 'high' : a.severity === 'medium' ? 'medium' : 'low'}>
                    {a.severity.toUpperCase()}
                  </Badge>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {Math.floor((Date.now() - a.timestamp.getTime()) / 60000)}m
                  </span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4, fontWeight: 600, lineHeight: 1.4 }}>
                  {a.description.slice(0, 55)}…
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </PageWrapper>
  )
}
