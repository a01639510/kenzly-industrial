import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, Zap, Package, AlertTriangle, Thermometer, X, TrendingDown, QrCode } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { GlassCard } from '@/components/ui/GlassCard'
import { KPITile } from '@/components/ui/KPITile'
import { Gauge } from '@/components/ui/Gauge'
import { Badge, StatusDot } from '@/components/ui/Badge'
import { AreaChartWidget } from '@/components/charts/AreaChartWidget'
import { BarChartWidget } from '@/components/charts/BarChartWidget'
import { useLiveKPIs, useMachineStatuses } from '@/hooks/useMockData'
import { usePrediction } from '@/hooks/usePrediction'
import { COMPANY_CONFIG } from '@/config/company'
import { ALL_HISTORIES } from '@/data/mockSensors'
import { useAlertStore } from '@/store/useAlertStore'

// ── Machine PPH baseline (from mock params) ───────────────────────────
const MACHINE_PPH: Record<string, number> = {
  M01: 420, M02: 380, M03: 290, M04: 450, M05: 510, M06: 400,
}

// ── Flow topology ─────────────────────────────────────────────────────
const CONNECTIONS = [
  { from: 'M01', to: 'M04' },
  { from: 'M04', to: 'M03' },
  { from: 'M05', to: 'M03' },
  { from: 'M02', to: 'M06' },
  { from: 'M06', to: 'M03' },
]

// Node layout: left, top, each node is NODE_W × NODE_H px
const NODE_W = 144, NODE_H = 88
const FLOW_POS: Record<string, { left: number; top: number }> = {
  M01: { left: 24,  top: 18  },
  M04: { left: 218, top: 18  },
  M05: { left: 24,  top: 148 },
  M03: { left: 448, top: 148 },
  M02: { left: 24,  top: 278 },
  M06: { left: 218, top: 278 },
}
const SVG_W = 636, SVG_H = 370

// Center / edge helpers
const cy = (id: string) => FLOW_POS[id].top  + NODE_H / 2
const rx = (id: string) => FLOW_POS[id].left + NODE_W   // right edge
const lx = (id: string) => FLOW_POS[id].left            // left edge

function connectionPath(from: string, to: string): string {
  const x1 = rx(from), y1 = cy(from), x2 = lx(to), y2 = cy(to)
  const dx = (x2 - x1) * 0.55
  return `M ${x1},${y1} C ${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`
}

function bottleneck(fromId: string, toId: string) {
  const ratio = MACHINE_PPH[toId] / MACHINE_PPH[fromId]
  if (ratio >= 0.90) return { color: '#1A6DFF', width: 2, label: 'flujo normal' }
  if (ratio >= 0.72) return { color: '#F59E0B', width: 3, label: 'acumulación' }
  return { color: '#EF4444', width: 5, label: 'cuello de botella' }
}

// ── Slide-over Panel ──────────────────────────────────────────────────
function MachinePanel({ machineId, onClose }: { machineId: string; onClose: () => void }) {
  const machine  = COMPANY_CONFIG.machines.find(m => m.id === machineId)!
  const pred     = usePrediction(machineId)
  const hist     = ALL_HISTORIES[machineId]?.readings.slice(-14) ?? []
  const chartData = hist.map(r => ({ date: r.date, vibración: r.vibration, temperatura: r.temperature }))
  const last     = hist[hist.length - 1]

  const statusColor = pred.alert === 'critical' ? 'var(--danger)' : pred.alert === 'warning' ? 'var(--warning)' : 'var(--success)'

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 99 }}
      />
      {/* Panel */}
      <motion.div
        initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        style={{
          position: 'fixed', right: 0, top: 0, height: '100vh', width: 400,
          background: 'rgba(15,20,40,0.97)', backdropFilter: 'blur(24px)',
          borderLeft: '1px solid rgba(255,255,255,0.12)',
          zIndex: 100, overflow: 'hidden auto', padding: '24px 20px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>{machine.icon}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{machine.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px' }}>
                  {machine.area} · {machineId}
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Badge variant={pred.alert === 'critical' ? 'critical' : pred.alert === 'warning' ? 'warning' : 'ok'}>
              {pred.alert === 'critical' ? 'CRÍTICO' : pred.alert === 'warning' ? 'ADVERTENCIA' : 'NORMAL'}
            </Badge>
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer',
              width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Live metrics row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {[
            { label: 'Vibración', value: `${pred.currentVib}`, unit: 'mm/s', warn: pred.currentVib >= 4.5 },
            { label: 'Temperatura', value: `${last?.temperature ?? '—'}`, unit: '°C', warn: (last?.temperature ?? 0) >= 75 },
            { label: 'Uptime', value: `${last?.uptime ?? '—'}`, unit: '%', warn: false },
          ].map(({ label, value, unit, warn }) => (
            <div key={label} style={{ padding: '10px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
              <div style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 800, color: warn ? 'var(--warning)' : 'var(--text-primary)' }}>
                {value}<span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', marginLeft: 2 }}>{unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Mini chart */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>Vibración & Temperatura — 14 días</div>
          <AreaChartWidget data={chartData} xKey="date" height={130}
            areas={[
              { key: 'vibración',   color: 'var(--primary)', label: 'Vibración' },
              { key: 'temperatura', color: 'var(--warning)',  label: 'Temperatura' },
            ]}
          />
        </div>

        {/* ML Prediction */}
        <div style={{
          padding: '14px', borderRadius: 12,
          background: pred.alert === 'critical' ? 'var(--danger-dim)' : pred.alert === 'warning' ? 'var(--warning-dim)' : 'var(--success-dim)',
          border: `1px solid ${pred.alert === 'critical' ? 'rgba(239,68,68,0.25)' : pred.alert === 'warning' ? 'rgba(245,158,11,0.25)' : 'rgba(34,197,94,0.25)'}`,
        }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>Predicción ML</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 900, color: statusColor }}>
              {pred.rul === Infinity ? '∞' : pred.rul}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
              {pred.rul === Infinity ? 'sin tendencia de falla' : 'días de vida útil restante'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 600, lineHeight: 1.5 }}>{pred.recommendation}</div>
        </div>

        {/* Detail stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
          {[
            { label: 'MTBF', value: pred.mtbf === Infinity ? '∞' : `${pred.mtbf}h` },
            { label: 'Confianza', value: `${pred.confidence}%` },
            { label: 'Tendencia', value: `+${(pred.trendSlope * 30).toFixed(2)} mm/s/mes` },
            { label: 'Proy. 30d', value: `${pred.projectedVib30d} mm/s` },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: '9px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* QR Code */}
        <div style={{ padding: '14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <QrCode size={11} color="var(--text-muted)" />
            <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Acceso Móvil</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ padding: 6, background: '#fff', borderRadius: 8, flexShrink: 0 }}>
              <QRCodeSVG value={`${window.location.origin}/?machine=${machineId}`} size={80} level="M" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, lineHeight: 1.5, marginBottom: 6 }}>
                Escanea para abrir el dashboard de esta máquina en tu móvil.
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                {`?machine=${machineId}`}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}

// ── Bottleneck summary card ───────────────────────────────────────────
function BottleneckCard() {
  const bottleneckId = 'M03'  // always M03 in this topology (290 pph vs 450+ upstream)
  const machine = COMPANY_CONFIG.machines.find(m => m.id === bottleneckId)!
  const upstreamAvg = Math.round((MACHINE_PPH['M04'] + MACHINE_PPH['M05'] + MACHINE_PPH['M06']) / 3)
  const lostUnitsPerHour = upstreamAvg - MACHINE_PPH[bottleneckId]
  const revenuePerUnit   = 480  // MXN
  const lostPerHour      = lostUnitsPerHour * revenuePerUnit

  return (
    <GlassCard glow="danger" style={{ borderColor: 'rgba(239,68,68,0.25)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          Cuello de Botella Detectado
        </div>
        <Badge variant="critical">ML ACTIVO</Badge>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <span style={{ fontSize: 28 }}>{machine.icon}</span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--danger)' }}>{machine.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
            {machine.area} · {MACHINE_PPH[bottleneckId]} pzs/h vs {upstreamAvg} pzs/h upstream
          </div>
        </div>
        <TrendingDown size={20} color="var(--danger)" style={{ marginLeft: 'auto', flexShrink: 0 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {[
          { label: 'Unidades perdidas/h', value: `${lostUnitsPerHour}`, color: 'var(--danger)' },
          { label: 'Impacto financiero/h', value: `$${(lostPerHour / 1000).toFixed(1)}k`, color: 'var(--warning)' },
          { label: 'Eficiencia de flujo', value: `${Math.round((MACHINE_PPH[bottleneckId] / upstreamAvg) * 100)}%`, color: 'var(--accent)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ padding: '9px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 900, color }}>{value}</div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

// ── Production Flow canvas ────────────────────────────────────────────
function ProductionFlow({ onSelectMachine }: { onSelectMachine: (id: string) => void }) {
  const machines = useMachineStatuses()
  const statusMap = Object.fromEntries(machines.map(m => [m.machine.id, m]))

  return (
    <GlassCard padding="none" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          Flujo de Producción — Líneas A · B · C → Ensamble
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          {[{ color: '#1A6DFF', label: 'Flujo normal' }, { color: '#F59E0B', label: 'Acumulación' }, { color: '#EF4444', label: 'Cuello' }].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: 'var(--text-muted)', fontWeight: 700 }}>
              <div style={{ width: 20, height: 2, background: color, borderRadius: 1 }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      <div style={{ overflowX: 'auto', padding: '0 12px 16px' }}>
        <div style={{ position: 'relative', width: SVG_W, height: SVG_H, minWidth: SVG_W }}>

          {/* SVG connections */}
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          >
            <defs>
              {CONNECTIONS.map(({ from, to }) => {
                const bt = bottleneck(from, to)
                return (
                  <marker key={`arrow-${from}-${to}`} id={`arrow-${from}-${to}`}
                    markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L8,3 z" fill={bt.color} opacity="0.8" />
                  </marker>
                )
              })}
            </defs>

            {CONNECTIONS.map(({ from, to }) => {
              const bt = bottleneck(from, to)
              const d  = connectionPath(from, to)
              // Approximate path length for dasharray
              const dashLen = 12, gapLen = 18
              return (
                <g key={`${from}-${to}`}>
                  {/* Background track */}
                  <path d={d} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={bt.width + 2} />
                  {/* Animated flow */}
                  <path
                    d={d} fill="none"
                    stroke={bt.color} strokeWidth={bt.width}
                    strokeDasharray={`${dashLen} ${gapLen}`}
                    className="flow-line"
                    markerEnd={`url(#arrow-${from}-${to})`}
                    opacity={0.85}
                  />
                </g>
              )
            })}
          </svg>

          {/* Machine nodes */}
          {COMPANY_CONFIG.machines.map(machine => {
            const pos  = FLOW_POS[machine.id]
            const stat = statusMap[machine.id]
            if (!pos) return null
            const borderColor = stat?.status === 'fault' ? 'rgba(239,68,68,0.55)'
              : stat?.status === 'warning' ? 'rgba(245,158,11,0.45)'
              : 'rgba(255,255,255,0.14)'

            return (
              <motion.div
                key={machine.id}
                whileHover={{ scale: 1.04, zIndex: 10 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelectMachine(machine.id)}
                style={{
                  position: 'absolute',
                  left: pos.left, top: pos.top,
                  width: NODE_W, height: NODE_H,
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.05)',
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${borderColor}`,
                  borderRadius: 14,
                  padding: '10px 12px',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  boxShadow: stat?.status === 'fault' ? '0 0 18px rgba(239,68,68,0.25)'
                    : stat?.status === 'warning' ? '0 0 18px rgba(245,158,11,0.20)'
                    : '0 4px 18px rgba(0,0,0,0.30)',
                  transition: 'border-color 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{machine.icon}</span>
                  <StatusDot status={stat?.status ?? 'operating'} />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                    {machine.name}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 }}>
                    <span style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>
                      {machine.area}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--accent)' }}>
                      {MACHINE_PPH[machine.id]} pph
                    </span>
                  </div>
                  {stat && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 5 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: stat.vibration >= 4.5 ? 'var(--warning)' : 'var(--text-muted)', fontWeight: 700 }}>
                        {stat.vibration}mm/s
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: stat.temperature >= 75 ? 'var(--warning)' : 'var(--text-muted)', fontWeight: 700 }}>
                        {stat.temperature}°C
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </GlassCard>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────
export default function Dashboard() {
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const kpis    = useLiveKPIs()
  const alerts  = useAlertStore(s => s.alerts.filter(a => !a.acknowledged))

  // Auto-open slide-over if ?machine= is in URL (e.g. from QR scan)
  useEffect(() => {
    const machineParam = searchParams.get('machine')
    if (machineParam && COMPANY_CONFIG.machines.find(m => m.id === machineParam)) {
      setSelectedMachine(machineParam)
      setSearchParams({}, { replace: true })  // clean URL after opening
    }
  }, [])

  const oeeData = [
    { label: 'Disponibilidad', value: kpis.uptime,  color: 'var(--primary)' },
    { label: 'Rendimiento',    value: Math.round(kpis.oee / 0.88), color: 'var(--accent)' },
    { label: 'Calidad',        value: Math.round(kpis.oee / 0.81), color: 'var(--success)' },
  ]

  const thirtyDays = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 29 + i)
    const base = COMPANY_CONFIG.kpis.pphTarget * 8 * COMPANY_CONFIG.machines.length
    return {
      day:  `${d.getDate()}/${d.getMonth() + 1}`,
      real: Math.round(base * (0.78 + (i * 7 % 100) / 550)),
      meta: Math.round(base * 0.92),
    }
  })

  const hourly = Array.from({ length: 24 }, (_, h) => ({
    hour:  `${String(h).padStart(2, '0')}:00`,
    units: Math.round(COMPANY_CONFIG.kpis.pphTarget * (0.75 + (h * 11 % 100) / 400)),
  }))

  return (
    <PageWrapper title="Dashboard Ejecutivo">
      {/* ── KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
        <KPITile label="OEE" value={Math.round(kpis.oee)} unit="%" icon={<Activity size={15} />} color="var(--primary)"
          target={COMPANY_CONFIG.kpis.oeeTarget} delta={Math.round(kpis.oee - COMPANY_CONFIG.kpis.oeeTarget)} />
        <KPITile label="Uptime" value={Math.round(kpis.uptime)} unit="%" icon={<Zap size={15} />} color="var(--accent)"
          target={COMPANY_CONFIG.kpis.uptimeTarget} delta={Math.round(kpis.uptime - COMPANY_CONFIG.kpis.uptimeTarget)} />
        <KPITile label="Producción Turno" value={kpis.production} unit="pzs" icon={<Package size={15} />} color="var(--success)" />
        <KPITile label="Alertas Activas" value={alerts.length} unit="" icon={<AlertTriangle size={15} />}
          color={alerts.length > 2 ? 'var(--danger)' : 'var(--warning)'} />
      </div>

      {/* ── Main row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, marginBottom: 20 }}>
        <GlassCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Producción 30 días</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                {(thirtyDays.reduce((s, d) => s + d.real, 0) / 1000).toFixed(1)}k piezas
              </div>
            </div>
            <Badge variant="ok" dot>EN TURNO</Badge>
          </div>
          <AreaChartWidget data={thirtyDays} xKey="day" height={200}
            areas={[
              { key: 'real', color: 'var(--primary)', label: 'Producción real' },
              { key: 'meta', color: 'var(--text-muted)', label: 'Objetivo' },
            ]}
          />
        </GlassCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <GlassCard>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 14 }}>Planta</div>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
              <Gauge value={kpis.energy / 3.4} size={90} color="var(--accent)" label="Energía" unit="kWh" />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <Thermometer size={20} color="var(--warning)" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{kpis.temperature}°</span>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700 }}>AMBIENTE (°C)</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 14 }}>Componentes OEE</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {oeeData.map(({ label, value, color }) => (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color }}>{Math.round(value)}%</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 100, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 100, background: color, width: `${Math.min(100, value)}%`, transition: 'width 1.2s ease', boxShadow: `0 0 10px ${color}66` }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>OEE TOTAL</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 800, color: kpis.oee >= COMPANY_CONFIG.kpis.oeeTarget ? 'var(--success)' : 'var(--warning)' }}>
                {Math.round(kpis.oee)}%
              </span>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* ── Production Flow ── */}
      <div style={{ marginBottom: 20 }}>
        <ProductionFlow onSelectMachine={setSelectedMachine} />
      </div>

      {/* ── Bottleneck + Hourly + Alerts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 260px', gap: 16 }}>
        <BottleneckCard />

        <GlassCard>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 14 }}>
            Producción por Hora — Hoy
          </div>
          <BarChartWidget data={hourly} xKey="hour" valueKey="units" color="var(--primary)"
            reference={COMPANY_CONFIG.kpis.pphTarget} referenceLabel={`META ${COMPANY_CONFIG.kpis.pphTarget}`} height={150} />
        </GlassCard>

        <GlassCard>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 14 }}>
            Últimas Alertas
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {alerts.slice(0, 4).map(a => (
              <div key={a.id} style={{
                padding: '8px 10px', borderRadius: 9,
                background: a.severity === 'critical' ? 'var(--danger-dim)' : 'var(--bg-surface)',
                border: `1px solid ${a.severity === 'critical' ? 'rgba(239,68,68,0.28)' : 'var(--border-glass)'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                  <Badge variant={a.severity === 'critical' ? 'critical' : a.severity === 'high' ? 'high' : a.severity === 'medium' ? 'medium' : 'low'}>
                    {a.severity.toUpperCase()}
                  </Badge>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                    {Math.floor((Date.now() - a.timestamp.getTime()) / 60000)}m
                  </span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4, fontWeight: 600, lineHeight: 1.4 }}>
                  {a.description.slice(0, 52)}…
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* ── Machine slide-over ── */}
      <AnimatePresence>
        {selectedMachine && (
          <MachinePanel machineId={selectedMachine} onClose={() => setSelectedMachine(null)} />
        )}
      </AnimatePresence>
    </PageWrapper>
  )
}
