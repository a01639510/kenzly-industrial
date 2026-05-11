import { useState } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { BarChartWidget } from '@/components/charts/BarChartWidget'
import { WORKFORCE_CONFIG, OPERATOR_STATS, type Operator } from '@/config/workforce'
import { COMPANY_CONFIG } from '@/config/company'
import { TrendingUp, Shield, Package, Award } from 'lucide-react'

const SHIFTS = ['T1', 'T2', 'T3'] as const
const SKILL_ORDER = { Junior: 1, Mid: 2, Senior: 3, Expert: 4 }
const SKILL_COLOR: Record<string, string> = {
  Junior: 'var(--text-muted)',
  Mid:    'var(--accent)',
  Senior: 'var(--primary)',
  Expert: 'var(--warning)',
}

function skillBadgeVariant(level: Operator['skillLevel']): 'info' | 'ok' | 'warning' | 'critical' {
  if (level === 'Expert')  return 'warning'
  if (level === 'Senior')  return 'info'
  if (level === 'Mid')     return 'ok'
  return 'critical'
}

// ── Leaderboard ───────────────────────────────────────────────────────
function Leaderboard({ ops }: { ops: Operator[] }) {
  const sorted = [...ops].sort((a, b) =>
    (OPERATOR_STATS[b.id]?.efficiency ?? 0) - (OPERATOR_STATS[a.id]?.efficiency ?? 0)
  )

  return (
    <GlassCard>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          Ranking de Eficiencia
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Award size={13} color="var(--warning)" />
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>Kaizen Leaderboard</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map((op, rank) => {
          const stats = OPERATOR_STATS[op.id]!
          const isTop = rank === 0
          return (
            <div key={op.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', borderRadius: 12,
              background: isTop ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isTop ? 'rgba(245,158,11,0.28)' : 'rgba(255,255,255,0.09)'}`,
            }}>
              {/* Rank badge */}
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: rank < 3
                  ? ['rgba(245,158,11,0.25)', 'rgba(143,170,200,0.20)', 'rgba(26,109,255,0.18)'][rank]
                  : 'rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 900,
                color: rank < 3 ? ['var(--warning)', 'var(--accent)', 'var(--primary)'][rank] : 'var(--text-muted)',
              }}>
                {rank + 1}
              </div>

              {/* Avatar */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, var(--primary), var(--accent))`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, color: '#fff',
              }}>
                {op.initials}
              </div>

              {/* Name + level */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {op.name}
                </div>
                <div style={{ fontSize: 9, color: SKILL_COLOR[op.skillLevel], fontWeight: 700, letterSpacing: '0.5px' }}>
                  {op.skillLevel.toUpperCase()} · Turno {op.shift.replace('T', '')}
                </div>
              </div>

              {/* Efficiency bar */}
              <div style={{ width: 90 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 700 }}>EFIC.</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 800, color: 'var(--primary)' }}>{stats.efficiency}%</span>
                </div>
                <div style={{ height: 4, borderRadius: 100, background: 'rgba(255,255,255,0.08)' }}>
                  <div style={{ height: '100%', borderRadius: 100, width: `${stats.efficiency}%`, background: isTop ? 'var(--warning)' : 'var(--primary)', transition: 'width 0.8s ease' }} />
                </div>
              </div>

              {/* Stats chips */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 800, color: 'var(--text-primary)' }}>{stats.unitsPerHour}</div>
                  <div style={{ fontSize: 7, color: 'var(--text-muted)', fontWeight: 700 }}>pzs/h</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 800, color: stats.rejectionRate > 3 ? 'var(--warning)' : 'var(--success)' }}>
                    {stats.rejectionRate}%
                  </div>
                  <div style={{ fontSize: 7, color: 'var(--text-muted)', fontWeight: 700 }}>rechazo</div>
                </div>
              </div>

              <Badge variant={skillBadgeVariant(op.skillLevel)}>{op.skillLevel}</Badge>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}

// ── Skills Matrix ─────────────────────────────────────────────────────
function SkillsMatrix({ ops }: { ops: Operator[] }) {
  return (
    <GlassCard>
      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 16 }}>
        Matriz de Habilidades — Certificaciones por Equipo
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.07)', minWidth: 130 }}>
                Operador
              </th>
              {COMPANY_CONFIG.machines.map(m => (
                <th key={m.id} style={{ textAlign: 'center', padding: '6px 8px', fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.07)', minWidth: 72 }}>
                  <div style={{ fontSize: 14, marginBottom: 2 }}>{m.icon}</div>
                  <div>{m.id}</div>
                </th>
              ))}
              <th style={{ textAlign: 'center', padding: '6px 8px', fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.07)', minWidth: 60 }}>
                CERTS
              </th>
            </tr>
          </thead>
          <tbody>
            {ops.map(op => (
              <tr key={op.id}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                style={{ transition: 'background 0.15s' }}
              >
                <td style={{ padding: '9px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 800, color: '#fff', flexShrink: 0,
                    }}>
                      {op.initials}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>{op.name}</div>
                      <div style={{ fontSize: 8, color: SKILL_COLOR[op.skillLevel], fontWeight: 700 }}>T{op.shift.replace('T', '')}</div>
                    </div>
                  </div>
                </td>
                {COMPANY_CONFIG.machines.map(m => {
                  const certified = op.stations.includes(m.id)
                  return (
                    <td key={m.id} style={{ textAlign: 'center', padding: '9px 8px' }}>
                      {certified ? (
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%', margin: '0 auto',
                          background: 'var(--success-dim)', border: '1px solid rgba(34,197,94,0.35)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11,
                        }}>✓</div>
                      ) : (
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%', margin: '0 auto',
                          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                        }} />
                      )}
                    </td>
                  )
                })}
                <td style={{ textAlign: 'center', padding: '9px 8px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 800, color: 'var(--primary)' }}>
                    {op.stations.length}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  )
}

// ── KPI Summary Row ───────────────────────────────────────────────────
function WorkforceKPIs({ ops }: { ops: Operator[] }) {
  const stats    = ops.map(op => OPERATOR_STATS[op.id]!)
  const avgUnits = Math.round(stats.reduce((s, st) => s + st.unitsPerHour, 0) / stats.length)
  const avgRej   = (stats.reduce((s, st) => s + st.rejectionRate, 0) / stats.length).toFixed(1)
  const avgSafe  = Math.round(stats.reduce((s, st) => s + st.safetyScore, 0) / stats.length)
  const avgEff   = Math.round(stats.reduce((s, st) => s + st.efficiency, 0) / stats.length)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
      {[
        { label: 'Prom. Unidades/h', value: avgUnits, unit: 'pzs/h', icon: <Package size={14} />, color: 'var(--primary)' },
        { label: 'Tasa de Rechazo',  value: `${avgRej}%`, unit: 'promedio', icon: <TrendingUp size={14} />, color: 'var(--warning)' },
        { label: 'Score Seguridad',  value: `${avgSafe}%`, unit: 'cumplimiento', icon: <Shield size={14} />, color: 'var(--success)' },
        { label: 'Eficiencia Media', value: `${avgEff}%`, unit: 'vs. estándar', icon: <Award size={14} />, color: 'var(--accent)' },
      ].map(({ label, value, unit, icon, color }) => (
        <GlassCard key={label} padding="sm">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>{label}</div>
            <div style={{ color, opacity: 0.8 }}>{icon}</div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, marginTop: 4 }}>{unit}</div>
        </GlassCard>
      ))}
    </div>
  )
}

// ── Production chart by shift ─────────────────────────────────────────
function ShiftChart({ ops }: { ops: Operator[] }) {
  const shiftData = SHIFTS.map(shift => {
    const shiftOps = ops.filter(op => op.shift === shift)
    const avgEff   = shiftOps.length
      ? Math.round(shiftOps.reduce((s, op) => s + (OPERATOR_STATS[op.id]?.efficiency ?? 0), 0) / shiftOps.length)
      : 0
    return { turno: `Turno ${shift.replace('T', '')}`, eficiencia: avgEff, operadores: shiftOps.length }
  })

  return (
    <GlassCard>
      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 14 }}>
        Eficiencia por Turno
      </div>
      <BarChartWidget data={shiftData} xKey="turno" valueKey="eficiencia" color="var(--primary)" reference={85} referenceLabel="META 85%" height={140} />
    </GlassCard>
  )
}

// ── Main page ─────────────────────────────────────────────────────────
export default function Workforce() {
  const [activeShift, setActiveShift] = useState<'Todos' | 'T1' | 'T2' | 'T3'>('Todos')
  const [sortBy, setSortBy] = useState<'efficiency' | 'units' | 'skill'>('efficiency')

  const filtered = activeShift === 'Todos'
    ? WORKFORCE_CONFIG
    : WORKFORCE_CONFIG.filter(op => op.shift === activeShift)

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'efficiency') return (OPERATOR_STATS[b.id]?.efficiency ?? 0) - (OPERATOR_STATS[a.id]?.efficiency ?? 0)
    if (sortBy === 'units')      return (OPERATOR_STATS[b.id]?.unitsPerHour ?? 0) - (OPERATOR_STATS[a.id]?.unitsPerHour ?? 0)
    return SKILL_ORDER[b.skillLevel] - SKILL_ORDER[a.skillLevel]
  })

  return (
    <PageWrapper title="Performance por Operador">
      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Turno:</span>
          {(['Todos', 'T1', 'T2', 'T3'] as const).map(s => (
            <button key={s} onClick={() => setActiveShift(s)} style={{
              padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700,
              background: activeShift === s ? 'var(--primary-dim)' : 'var(--bg-surface)',
              border: `1px solid ${activeShift === s ? 'rgba(26,109,255,0.40)' : 'var(--border-glass)'}`,
              color: activeShift === s ? 'var(--primary)' : 'var(--text-secondary)',
              transition: 'all 0.15s', fontFamily: 'inherit',
            }}>
              {s === 'Todos' ? 'Todos' : `Turno ${s.replace('T', '')}`}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 'auto' }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Ordenar:</span>
          {([['efficiency', 'Eficiencia'], ['units', 'Unidades/h'], ['skill', 'Nivel']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setSortBy(key)} style={{
              padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700,
              background: sortBy === key ? 'var(--accent-dim)' : 'var(--bg-surface)',
              border: `1px solid ${sortBy === key ? 'rgba(143,170,200,0.35)' : 'var(--border-glass)'}`,
              color: sortBy === key ? 'var(--accent)' : 'var(--text-secondary)',
              transition: 'all 0.15s', fontFamily: 'inherit',
            }}>
              {label}
            </button>
          ))}
        </div>
        <Badge variant="info">{filtered.length} operadores</Badge>
      </div>

      {/* KPI row */}
      <div style={{ marginBottom: 20 }}>
        <WorkforceKPIs ops={filtered} />
      </div>

      {/* Leaderboard + Shift chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, marginBottom: 16 }}>
        <Leaderboard ops={sorted} />
        <ShiftChart ops={WORKFORCE_CONFIG} />
      </div>

      {/* Skills matrix */}
      <SkillsMatrix ops={sorted} />
    </PageWrapper>
  )
}
