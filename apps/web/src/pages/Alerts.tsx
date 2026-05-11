import { useState } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { GlassButton } from '@/components/ui/GlassButton'
import { DonutChart } from '@/components/charts/DonutChart'
import { useAlertStore, type Severity } from '@/store/useAlertStore'
import { COMPANY_CONFIG } from '@/config/company'
import { CheckCheck, Filter } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low']

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'CRÍTICA', high: 'ALTA', medium: 'MEDIA', low: 'BAJA',
}

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: 'var(--danger)', high: '#f97316', medium: 'var(--warning)', low: 'var(--accent)',
}

export default function Alerts() {
  const { alerts, acknowledge } = useAlertStore()
  const [filterSeverity, setFilterSeverity] = useState<Severity | 'all'>('all')
  const [filterMachine,  setFilterMachine]  = useState<string>('all')
  const [showAcknowledged, setShowAcknowledged] = useState(false)

  const filtered = alerts
    .filter(a => filterSeverity === 'all' || a.severity === filterSeverity)
    .filter(a => filterMachine  === 'all' || a.machineId === filterMachine)
    .filter(a => showAcknowledged ? a.acknowledged : !a.acknowledged)
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))

  const donutData = SEVERITY_ORDER.map(s => ({
    name:  SEVERITY_LABELS[s],
    value: alerts.filter(a => a.severity === s).length,
    color: SEVERITY_COLORS[s],
  })).filter(d => d.value > 0)

  const active = alerts.filter(a => !a.acknowledged)

  return (
    <PageWrapper title="Centro de Alertas">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, marginBottom: 20 }}>
        {/* Stats bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {SEVERITY_ORDER.map(s => {
            const count = alerts.filter(a => a.severity === s).length
            return (
              <GlassCard key={s} padding="sm"
                glow={s === 'critical' && count > 0 ? 'danger' : undefined}
                style={{ cursor: 'pointer', borderColor: filterSeverity === s ? `${SEVERITY_COLORS[s]}44` : undefined }}
                onClick={() => setFilterSeverity(filterSeverity === s ? 'all' : s)}
              >
                <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>
                  {SEVERITY_LABELS[s]}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 800, color: SEVERITY_COLORS[s] }}>
                  {count}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, marginTop: 4 }}>
                  {alerts.filter(a => a.severity === s && a.acknowledged).length} reconocidas
                </div>
              </GlassCard>
            )
          })}
        </div>

        {/* Donut */}
        <GlassCard style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <DonutChart data={donutData} size={160} inner={50} label="alertas" />
        </GlassCard>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <Filter size={13} color="var(--text-muted)" />
        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px' }}>EQUIPO:</span>
        <select
          value={filterMachine}
          onChange={e => setFilterMachine(e.target.value)}
          style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-glass)',
            borderRadius: 8, color: 'var(--text-primary)', fontSize: 11,
            padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <option value="all">Todos los equipos</option>
          {COMPANY_CONFIG.machines.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        <button
          onClick={() => setShowAcknowledged(s => !s)}
          style={{
            padding: '5px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 700,
            background: showAcknowledged ? 'var(--success-dim)' : 'var(--bg-surface)',
            border: `1px solid ${showAcknowledged ? 'rgba(34,197,94,0.35)' : 'var(--border-glass)'}`,
            color: showAcknowledged ? 'var(--success)' : 'var(--text-secondary)',
            transition: 'all 0.15s', fontFamily: 'inherit',
          }}
        >
          {showAcknowledged ? 'Reconocidas' : 'Activas'}
        </button>

        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Alert feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 && (
          <GlassCard style={{ textAlign: 'center', padding: '40px 20px' }}>
            <CheckCheck size={32} color="var(--success)" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>
              {showAcknowledged ? 'No hay alertas reconocidas' : 'Sin alertas activas'}
            </div>
          </GlassCard>
        )}
        {filtered.map(alert => (
          <GlassCard
            key={alert.id}
            glow={alert.severity === 'critical' ? 'danger' : alert.severity === 'high' ? 'danger' : undefined}
            style={{
              borderColor: alert.severity === 'critical' ? 'rgba(239,68,68,0.30)' :
                           alert.severity === 'high'     ? 'rgba(249,115,22,0.25)' : undefined,
              opacity: alert.acknowledged ? 0.6 : 1,
            }}
          >
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              {/* Severity indicator */}
              <div style={{
                width: 4, alignSelf: 'stretch', borderRadius: 4, flexShrink: 0,
                backgroundColor: SEVERITY_COLORS[alert.severity],
              }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Badge variant={alert.severity}>{SEVERITY_LABELS[alert.severity]}</Badge>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700 }}>
                      {alert.machineName}
                    </span>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {formatDistanceToNow(alert.timestamp, { addSuffix: true, locale: es })}
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.5 }}>
                  {alert.description}
                </p>

                {alert.acknowledged && (
                  <div style={{ marginTop: 8, fontSize: 10, color: 'var(--success)', fontWeight: 700 }}>
                    ✓ Reconocida por {alert.acknowledgedBy} —{' '}
                    {alert.acknowledgedAt && formatDistanceToNow(alert.acknowledgedAt, { addSuffix: true, locale: es })}
                  </div>
                )}
              </div>

              {!alert.acknowledged && (
                <GlassButton
                  size="sm" variant="ghost"
                  icon={<CheckCheck size={12} />}
                  onClick={() => acknowledge(alert.id, 'Operador')}
                  style={{ flexShrink: 0 }}
                >
                  Reconocer
                </GlassButton>
              )}
            </div>
          </GlassCard>
        ))}
      </div>
    </PageWrapper>
  )
}
