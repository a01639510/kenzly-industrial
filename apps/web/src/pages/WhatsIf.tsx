import { useState } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { COMPANY_CONFIG } from '@/config/company'
import { TrendingUp, TrendingDown, Minus, RotateCcw } from 'lucide-react'

// Baseline PPH per machine (from mockSensors params)
const BASE_PPH: Record<string, number> = {
  M01: 420, M02: 380, M03: 290, M04: 450, M05: 510, M06: 400,
}
const BASE_OEE          = 82    // %
const PRICE_PER_UNIT    = 480   // MXN
const SHIFTS_PER_DAY    = 3
const HOURS_PER_SHIFT   = 8
const COST_PER_KWH      = 2.45

// Flow topology for bottleneck calculation
const FLOW_CHAINS = [
  ['M01', 'M04', 'M03'],
  ['M02', 'M06', 'M03'],
  ['M05', 'M03'],
]

function calcSystemThroughput(pph: Record<string, number>) {
  // Each chain is limited by its slowest machine; system is limited by the shared sink (M03)
  return Math.min(...FLOW_CHAINS.map(chain => Math.min(...chain.map(id => pph[id] ?? 0))))
}

function calcOEE(throughput: number, efficiency: number): number {
  const baseline = calcSystemThroughput(BASE_PPH)
  return Math.min(99, Math.round(BASE_OEE * (throughput / baseline) * (efficiency / 100)))
}

function DeltaBadge({ current, base, unit = '' }: { current: number; base: number; unit?: string }) {
  const delta = current - base
  const pct   = Math.round((delta / base) * 1000) / 10
  if (Math.abs(delta) < 1) return <Badge variant="info">Sin cambio</Badge>
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 800,
      color: delta > 0 ? 'var(--success)' : 'var(--danger)' }}>
      {delta > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {delta > 0 ? '+' : ''}{Math.round(delta).toLocaleString()}{unit}
      <span style={{ fontSize: 9, opacity: 0.7 }}>({pct > 0 ? '+' : ''}{pct}%)</span>
    </span>
  )
}

function Slider({ label, value, min, max, step = 1, unit, color, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit: string; color: string; onChange: (v: number) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 900, color }}>{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: '100%', accentColor: color, height: 5, cursor: 'pointer',
          background: `linear-gradient(90deg, ${color} ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.12) 0)`,
          borderRadius: 100, outline: 'none', border: 'none',
          WebkitAppearance: 'none',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 700 }}>{min}{unit}</span>
        <span style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 700 }}>{max}{unit}</span>
      </div>
    </div>
  )
}

export default function WhatsIf() {
  // Machine efficiency multipliers (%)
  const [machineEff, setMachineEff] = useState<Record<string, number>>(
    Object.fromEntries(COMPANY_CONFIG.machines.map(m => [m.id, 100]))
  )
  // Global params
  const [activeShifts,   setActiveShifts]   = useState(SHIFTS_PER_DAY)
  const [globalEff,      setGlobalEff]      = useState(100)   // global efficiency %
  const [pricePerUnit,   setPricePerUnit]   = useState(PRICE_PER_UNIT)
  const [energyReduction, setEnergyReduction] = useState(0)    // % reduction

  // Projected PPH per machine
  const projPph: Record<string, number> = Object.fromEntries(
    COMPANY_CONFIG.machines.map(m => [
      m.id,
      Math.round(BASE_PPH[m.id] * (machineEff[m.id] / 100) * (globalEff / 100)),
    ])
  )

  // Throughput & production
  const baseThroughput  = calcSystemThroughput(BASE_PPH)
  const projThroughput  = calcSystemThroughput(projPph)
  const baseDaily       = baseThroughput  * HOURS_PER_SHIFT * SHIFTS_PER_DAY
  const projDaily       = projThroughput  * HOURS_PER_SHIFT * activeShifts
  const baseWeekly      = baseDaily  * 5
  const projWeekly      = projDaily  * 5
  const baseRevDaily    = baseDaily  * PRICE_PER_UNIT
  const projRevDaily    = projDaily  * pricePerUnit
  const projOEE         = calcOEE(projThroughput, globalEff)

  // Bottleneck detection
  const projBottleneck = COMPANY_CONFIG.machines.reduce((min, m) =>
    projPph[m.id] < projPph[min.id] ? m : min, COMPANY_CONFIG.machines[0])
  const baseBottleneck = COMPANY_CONFIG.machines.reduce((min, m) =>
    BASE_PPH[m.id] < BASE_PPH[min.id] ? m : min, COMPANY_CONFIG.machines[0])

  // Energy impact
  const baseEnergyDaily = 285  // kWh (baseline)
  const projEnergyDaily = Math.round(baseEnergyDaily * (globalEff / 100) * (activeShifts / SHIFTS_PER_DAY) * (1 - energyReduction / 100))
  const energyCostDaily = projEnergyDaily * COST_PER_KWH * HOURS_PER_SHIFT

  const reset = () => {
    setMachineEff(Object.fromEntries(COMPANY_CONFIG.machines.map(m => [m.id, 100])))
    setActiveShifts(SHIFTS_PER_DAY)
    setGlobalEff(100)
    setPricePerUnit(PRICE_PER_UNIT)
    setEnergyReduction(0)
  }

  return (
    <PageWrapper title="Simulador de Escenarios">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>
          Ajusta los parámetros para modelar el impacto en producción, ingresos y eficiencia antes de tomar decisiones operativas.
        </p>
        <button onClick={reset} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 700,
          background: 'var(--bg-surface)', border: '1px solid var(--border-glass)',
          color: 'var(--text-secondary)', fontFamily: 'inherit', transition: 'all 0.15s',
        }}>
          <RotateCcw size={11} /> Resetear
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16, alignItems: 'start' }}>

        {/* ── Left: Controls ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Global params */}
          <GlassCard>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 16 }}>
              Parámetros Globales
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Slider label="Eficiencia global de planta" value={globalEff} min={50} max={130} unit="%" color="var(--primary)" onChange={setGlobalEff} />
              <Slider label="Turnos activos por día" value={activeShifts} min={1} max={3} unit="" color="var(--accent)" onChange={setActiveShifts} />
              <Slider label="Precio por unidad (MXN)" value={pricePerUnit} min={100} max={1500} step={50} unit="" color="var(--warning)" onChange={setPricePerUnit} />
              <Slider label="Reducción consumo energético" value={energyReduction} min={0} max={40} unit="%" color="var(--success)" onChange={setEnergyReduction} />
            </div>
          </GlassCard>

          {/* Per-machine efficiency */}
          <GlassCard>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 16 }}>
              Velocidad por Equipo
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {COMPANY_CONFIG.machines.map(m => (
                <div key={m.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14 }}>{m.icon}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {m.name.split(' ').slice(0, 2).join(' ')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
                        {Math.round(BASE_PPH[m.id] * (machineEff[m.id] / 100))} pph
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 900,
                        color: machineEff[m.id] > 100 ? 'var(--success)' : machineEff[m.id] < 100 ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {machineEff[m.id]}%
                      </span>
                    </div>
                  </div>
                  <input type="range" min={60} max={140} step={5} value={machineEff[m.id]}
                    onChange={e => setMachineEff(prev => ({ ...prev, [m.id]: Number(e.target.value) }))}
                    style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer', height: 4 }}
                  />
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* ── Right: Projected results ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Headline KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              { label: 'Producción Diaria', base: baseDaily, proj: projDaily, unit: ' pzs', color: 'var(--primary)' },
              { label: 'Ingresos Diarios',  base: baseRevDaily,  proj: projRevDaily,  unit: '', prefix: '$', color: 'var(--success)' },
              { label: 'OEE Proyectado',    base: BASE_OEE,      proj: projOEE,       unit: '%', color: 'var(--accent)' },
            ].map(({ label, base, proj, unit, prefix = '', color }) => (
              <GlassCard key={label} padding="sm"
                glow={proj > base ? 'success' : proj < base ? 'danger' : undefined}
                style={{ borderColor: proj > base ? 'rgba(34,197,94,0.25)' : proj < base ? 'rgba(239,68,68,0.25)' : undefined }}
              >
                <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 900, color, marginBottom: 4 }}>
                  {prefix}{Math.round(proj).toLocaleString()}{unit}
                </div>
                <DeltaBadge current={proj} base={base} unit={unit} />
                <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.07)', fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>
                  Actual: {prefix}{Math.round(base).toLocaleString()}{unit}
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Weekly + Revenue */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <GlassCard padding="sm">
              <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 10 }}>
                Producción Semanal (5 días)
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 900, color: 'var(--primary)', marginBottom: 4 }}>
                {Math.round(projWeekly).toLocaleString()} pzs
              </div>
              <DeltaBadge current={projWeekly} base={baseWeekly} unit=" pzs" />
            </GlassCard>
            <GlassCard padding="sm">
              <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 10 }}>
                Ingreso Mensual Proyectado
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 900, color: 'var(--success)', marginBottom: 4 }}>
                ${(projRevDaily * 22 / 1000).toFixed(0)}k MXN
              </div>
              <DeltaBadge current={projRevDaily * 22} base={baseRevDaily * 22} />
            </GlassCard>
          </div>

          {/* Bottleneck change */}
          <GlassCard>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 14 }}>
              Análisis de Cuello de Botella
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>
              <div style={{ padding: '12px', borderRadius: 10, background: 'var(--danger-dim)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <div style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>ACTUAL</div>
                <div style={{ fontSize: 16 }}>{baseBottleneck.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--danger)', marginTop: 4 }}>{baseBottleneck.name.split(' ').slice(0, 2).join(' ')}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 900, color: 'var(--text-primary)', marginTop: 3 }}>
                  {BASE_PPH[baseBottleneck.id]} pph
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                {projBottleneck.id === baseBottleneck.id
                  ? <><Minus size={18} color="var(--text-muted)" /><span style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 700 }}>sin cambio</span></>
                  : <><TrendingUp size={18} color="var(--success)" /><span style={{ fontSize: 8, color: 'var(--success)', fontWeight: 700 }}>mejorado</span></>
                }
              </div>

              <div style={{ padding: '12px', borderRadius: 10,
                background: projBottleneck.id !== baseBottleneck.id ? 'var(--success-dim)' : 'var(--warning-dim)',
                border: `1px solid ${projBottleneck.id !== baseBottleneck.id ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}` }}>
                <div style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>PROYECTADO</div>
                <div style={{ fontSize: 16 }}>{projBottleneck.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: projBottleneck.id !== baseBottleneck.id ? 'var(--success)' : 'var(--warning)', marginTop: 4 }}>
                  {projBottleneck.name.split(' ').slice(0, 2).join(' ')}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 900, color: 'var(--text-primary)', marginTop: 3 }}>
                  {projPph[projBottleneck.id]} pph
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Throughput bar per machine */}
          <GlassCard>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 14 }}>
              Throughput por Equipo — Base vs. Proyectado
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {COMPANY_CONFIG.machines.map(m => {
                const base = BASE_PPH[m.id]
                const proj = projPph[m.id]
                const maxPph = Math.max(...Object.values(BASE_PPH)) * 1.4
                return (
                  <div key={m.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13 }}>{m.icon}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>{m.name.split(' ').slice(0, 2).join(' ')}</span>
                        {m.id === projBottleneck.id && <Badge variant="warning">Cuello</Badge>}
                      </div>
                      <DeltaBadge current={proj} base={base} unit=" pph" />
                    </div>
                    {/* Base bar */}
                    <div style={{ height: 5, borderRadius: 100, background: 'rgba(255,255,255,0.08)', marginBottom: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 100, background: 'rgba(255,255,255,0.20)', width: `${(base / maxPph) * 100}%`, transition: 'width 0.5s ease' }} />
                    </div>
                    {/* Proj bar */}
                    <div style={{ height: 5, borderRadius: 100, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 100,
                        background: proj > base ? 'var(--success)' : proj < base ? 'var(--danger)' : 'var(--primary)',
                        width: `${(proj / maxPph) * 100}%`, transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                )
              })}
              <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: 'var(--text-muted)', fontWeight: 700 }}>
                  <div style={{ width: 14, height: 3, background: 'rgba(255,255,255,0.20)', borderRadius: 100 }} /> Actual
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: 'var(--text-muted)', fontWeight: 700 }}>
                  <div style={{ width: 14, height: 3, background: 'var(--primary)', borderRadius: 100 }} /> Proyectado
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Energy impact */}
          <GlassCard>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>
              Impacto Energético
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[
                { label: 'kWh/día proy.',   value: `${projEnergyDaily}`, color: 'var(--accent)' },
                { label: 'Costo energía/d', value: `$${(energyCostDaily / 1000).toFixed(1)}k`, color: 'var(--warning)' },
                { label: 'Ahorro vs. base', value: `${Math.round(((baseEnergyDaily - projEnergyDaily) / baseEnergyDaily) * 100)}%`, color: 'var(--success)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ padding: '9px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 900, color }}>{value}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </PageWrapper>
  )
}
