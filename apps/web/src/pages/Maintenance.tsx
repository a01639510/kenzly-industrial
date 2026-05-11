import { useState } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { GlassButton } from '@/components/ui/GlassButton'
import { AreaChartWidget } from '@/components/charts/AreaChartWidget'
import { COMPANY_CONFIG } from '@/config/company'
import { ALL_HISTORIES } from '@/data/mockSensors'
import { usePrediction } from '@/hooks/usePrediction'
import { AlertTriangle, CheckCircle, Clock, Wrench, TrendingUp, Download } from 'lucide-react'

const MAINTENANCE_LOG = [
  { date: '2026-04-10', type: 'Preventivo', tech: 'Ing. García', hours: 4,  cost: 3800, notes: 'Cambio de rodamientos y lubricación' },
  { date: '2026-03-05', type: 'Correctivo', tech: 'Ing. López',  hours: 8,  cost: 9200, notes: 'Reemplazo de bomba hidráulica' },
  { date: '2026-02-12', type: 'Preventivo', tech: 'Ing. García', hours: 3,  cost: 2400, notes: 'Alineación y calibración de sensores' },
  { date: '2026-01-20', type: 'Correctivo', tech: 'Ing. Martínez',hours:12, cost:14500, notes: 'Falla en sistema de control eléctrico' },
  { date: '2025-12-15', type: 'Preventivo', tech: 'Ing. García', hours: 4,  cost: 3200, notes: 'Cambio de filtros y revisión general' },
]

function PredictionPanel({ machineId }: { machineId: string }) {
  const p = usePrediction(machineId)

  const alertVariant = p.alert === 'critical' ? 'critical' : p.alert === 'warning' ? 'warning' : 'ok'
  const alertLabel   = p.alert === 'critical' ? 'CRÍTICO' : p.alert === 'warning' ? 'ADVERTENCIA' : 'NORMAL'
  const AlertIcon    = p.alert === 'critical' ? AlertTriangle : p.alert === 'warning' ? TrendingUp : CheckCircle

  return (
    <GlassCard glow={p.alert === 'critical' ? 'danger' : p.alert === 'warning' ? 'warning' : 'success'}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          Predicción de Falla (ML)
        </div>
        <Badge variant={alertVariant}>{alertLabel}</Badge>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
          background: p.alert === 'critical' ? 'var(--danger-dim)' : p.alert === 'warning' ? 'var(--warning-dim)' : 'var(--success-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `2px solid ${p.alert === 'critical' ? 'var(--danger)' : p.alert === 'warning' ? 'var(--warning)' : 'var(--success)'}44`,
        }}>
          <AlertIcon size={28} color={p.alert === 'critical' ? 'var(--danger)' : p.alert === 'warning' ? 'var(--warning)' : 'var(--success)'} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>
            VIDA ÚTIL RESTANTE
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
            {p.rul === Infinity ? '—' : p.rul}
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginLeft: 6 }}>
              {p.rul === Infinity ? 'Sin tendencia de falla' : 'días'}
            </span>
          </div>
        </div>
      </div>

      <div style={{
        padding: '12px 14px', borderRadius: 10,
        background: p.alert === 'critical' ? 'var(--danger-dim)' : p.alert === 'warning' ? 'var(--warning-dim)' : 'var(--success-dim)',
        border: `1px solid ${p.alert === 'critical' ? 'rgba(239,68,68,0.25)' : p.alert === 'warning' ? 'rgba(245,158,11,0.25)' : 'rgba(34,197,94,0.25)'}`,
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 600, lineHeight: 1.5 }}>
          {p.recommendation}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {[
          { label: 'Vibración actual', value: `${p.currentVib} mm/s`, warn: p.currentVib >= 4.5 },
          { label: 'Tendencia',       value: `+${(p.trendSlope * 30).toFixed(2)} mm/s/mes`, warn: p.trendSlope > 0.05 },
          { label: 'MTBF',           value: p.mtbf === Infinity ? '∞' : `${p.mtbf}h`, warn: false },
          { label: 'Vib. 30d (est.)', value: `${p.projectedVib30d} mm/s`, warn: p.projectedVib30d >= 4.5 },
          { label: 'R² modelo',      value: p.r2,   warn: p.r2 < 0.5 },
          { label: 'Confianza',      value: `${p.confidence}%`, warn: false },
        ].map(({ label, value, warn }) => (
          <div key={label} style={{ padding: '10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 800, color: warn ? 'var(--warning)' : 'var(--text-primary)' }}>{value}</div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

export default function Maintenance() {
  const [machineId, setMachineId] = useState<string>(COMPANY_CONFIG.machines[0].id)
  const hist    = ALL_HISTORIES[machineId]?.readings ?? []
  const last60  = hist.slice(-60)

  const chartData = last60.map(r => ({
    date:        r.date,
    vibración:   r.vibration,
    temperatura: r.temperature,
  }))

  const handleExport = () => {
    const content = [
      `ORDEN DE TRABAJO — ${COMPANY_CONFIG.name}`,
      `Fecha: ${new Date().toLocaleDateString('es-MX')}`,
      `Equipo: ${COMPANY_CONFIG.machines.find(m => m.id === machineId)?.name}`,
      ``,
      `HISTORIAL DE MANTENIMIENTO:`,
      ...MAINTENANCE_LOG.map(l => `${l.date} | ${l.type} | ${l.tech} | ${l.hours}h | $${l.cost.toLocaleString()}`),
    ].join('\n')

    const blob = new Blob([content], { type: 'text/plain' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `orden-trabajo-${machineId}-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
  }

  return (
    <PageWrapper title="Mantenimiento Predictivo">
      {/* Machine selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          Equipo:
        </span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {COMPANY_CONFIG.machines.map(m => (
            <button
              key={m.id}
              onClick={() => setMachineId(m.id)}
              style={{
                padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 700,
                background: machineId === m.id ? 'var(--primary-dim)' : 'var(--bg-surface)',
                border: `1px solid ${machineId === m.id ? 'rgba(14,165,233,0.40)' : 'var(--border-glass)'}`,
                color: machineId === m.id ? 'var(--primary)' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}
            >
              {m.name}
            </button>
          ))}
        </div>
        <GlassButton
          icon={<Download size={13} />} size="sm" variant="ghost"
          onClick={handleExport} style={{ marginLeft: 'auto' }}
        >
          Generar OT
        </GlassButton>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 16 }}>
        {/* Timeline chart */}
        <GlassCard>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>
              Vibración & Temperatura — 60 días
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
              {COMPANY_CONFIG.machines.find(m => m.id === machineId)?.name}
            </div>
          </div>
          <AreaChartWidget
            data={chartData} xKey="date" height={240}
            areas={[
              { key: 'vibración',   color: 'var(--primary)', label: 'Vibración (mm/s)' },
              { key: 'temperatura', color: 'var(--warning)',  label: 'Temperatura (°C)' },
            ]}
          />
          {/* Fault markers */}
          <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {last60.map((r, i) => r.isFault ? (
              <Badge key={i} variant="critical" dot>Falla {r.date}</Badge>
            ) : null).filter(Boolean)}
          </div>
        </GlassCard>

        <PredictionPanel machineId={machineId} />
      </div>

      {/* Maintenance log */}
      <GlassCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Historial de Mantenimiento
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Badge variant="critical">Correctivo</Badge>
            <Badge variant="ok">Preventivo</Badge>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Fecha', 'Tipo', 'Técnico', 'Duración', 'Costo', 'Notas'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '8px 12px', fontSize: 9, fontWeight: 800,
                    color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MAINTENANCE_LOG.map((row, i) => (
                <tr key={i} style={{ transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>{row.date}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <Badge variant={row.type === 'Correctivo' ? 'critical' : 'ok'}>{row.type}</Badge>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 }}>{row.tech}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                    <Clock size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />{row.hours}h
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)', fontWeight: 700 }}>
                    ${row.cost.toLocaleString()}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--text-secondary)' }}>{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </PageWrapper>
  )
}
