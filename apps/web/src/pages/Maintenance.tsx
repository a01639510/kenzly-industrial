import { useState, useEffect, useCallback } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { GlassButton } from '@/components/ui/GlassButton'
import { AreaChartWidget } from '@/components/charts/AreaChartWidget'
import { COMPANY_CONFIG } from '@/config/company'
import { useSensorHistory } from '@/data/sensorCache'
import { usePrediction } from '@/hooks/usePrediction'
import { apiFetch } from '@/lib/apiClient'
import {
  AlertTriangle, CheckCircle, Clock, Wrench, TrendingUp,
  Download, Plus, X, Activity, ShieldAlert, Thermometer,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────
interface MaintenancePlan {
  id: number
  asset_id: string
  name: string
  description: string | null
  frequency_days: number
  estimated_duration_min: number
  responsible: string | null
  last_done_at: string | null
  next_due_at: string | null
  notes: string | null
  status: 'VENCIDO' | 'PROXIMO' | 'AL_DIA' | 'PENDIENTE'
  created_at: string
}

interface MaintenanceRecord {
  id: number
  plan_id: number | null
  asset_id: string
  done_at: string
  done_by: string | null
  duration_min: number | null
  notes: string | null
  plan_name: string | null
}

interface MaintenanceSummary {
  overdue: number
  upcoming: number
  doneMonth: number
  total: number
}

// ── API hooks ──────────────────────────────────────────────────
function useSummary() {
  const [data, setData] = useState<MaintenanceSummary>({ overdue: 0, upcoming: 0, doneMonth: 0, total: 0 })
  const [apiOnline, setApiOnline] = useState<boolean | null>(null)
  const load = useCallback(async () => {
    try {
      setData(await apiFetch<MaintenanceSummary>('/maintenance/summary'))
      setApiOnline(true)
    } catch { setApiOnline(false) }
  }, [])
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t) }, [load])
  return { data, apiOnline, reload: load }
}

function useAllPlans() {
  const [plans, setPlans] = useState<MaintenancePlan[]>([])
  const [loading, setLoading] = useState(false)
  const load = useCallback(async () => {
    setLoading(true)
    try { setPlans(await apiFetch<MaintenancePlan[]>('/maintenance/plans')) }
    catch {} finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  return { plans, loading, reload: load }
}

function useHistory() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const load = useCallback(async () => {
    try { setRecords(await apiFetch<MaintenanceRecord[]>('/maintenance/history?limit=40')) } catch {}
  }, [])
  useEffect(() => { load() }, [load])
  return { records, reload: load }
}

// ── Helpers ────────────────────────────────────────────────────
function statusVariant(s: MaintenancePlan['status']): 'critical' | 'warning' | 'ok' | 'info' {
  return s === 'VENCIDO' ? 'critical' : s === 'PROXIMO' ? 'warning' : s === 'AL_DIA' ? 'ok' : 'info'
}
function statusLabel(s: MaintenancePlan['status']) {
  return s === 'VENCIDO' ? 'VENCIDO' : s === 'PROXIMO' ? 'PRÓXIMO' : s === 'AL_DIA' ? 'AL DÍA' : 'PENDIENTE'
}
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })
}
function riskColor(score: number) {
  return score >= 70 ? 'var(--danger)' : score >= 40 ? 'var(--warning)' : 'var(--success)'
}

// ── Create Plan Modal ──────────────────────────────────────────
interface CreatePlanModalProps {
  assetId: string
  onClose: () => void
  onSaved: () => void
}
function CreatePlanModal({ assetId, onClose, onSaved }: CreatePlanModalProps) {
  const [form, setForm] = useState({
    name: '', description: '', frequencyDays: '30',
    estimatedDurationMin: '60', responsible: '', notes: '', startingDate: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.frequencyDays) { setError('Nombre y frecuencia son requeridos'); return }
    setSaving(true); setError('')
    try {
      await apiFetch('/maintenance/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId,
          name: form.name.trim(),
          description: form.description.trim() || null,
          frequencyDays: Number(form.frequencyDays),
          estimatedDurationMin: Number(form.estimatedDurationMin) || 60,
          responsible: form.responsible.trim() || null,
          notes: form.notes.trim() || null,
          startingDate: form.startingDate || null,
        }),
      })
      onSaved()
    } catch (e: any) {
      setError(e.message || 'Error al crear el plan')
    } finally { setSaving(false) }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
    color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 9, fontWeight: 800, color: 'var(--text-muted)',
    letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4, display: 'block',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16, padding: 28, width: '100%', maxWidth: 520,
        backdropFilter: 'blur(24px)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Nuevo Plan de Mantenimiento</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={labelStyle}>Nombre del plan *</label>
            <input style={inputStyle} value={form.name} onChange={set('name')} placeholder="Ej. Cambio de rodamientos" />
          </div>
          <div>
            <label style={labelStyle}>Descripción</label>
            <input style={inputStyle} value={form.description} onChange={set('description')} placeholder="Detalle del procedimiento" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Frecuencia (días) *</label>
              <input style={inputStyle} type="number" min="1" value={form.frequencyDays} onChange={set('frequencyDays')} />
            </div>
            <div>
              <label style={labelStyle}>Duración estimada (min)</label>
              <input style={inputStyle} type="number" min="1" value={form.estimatedDurationMin} onChange={set('estimatedDurationMin')} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Responsable</label>
              <input style={inputStyle} value={form.responsible} onChange={set('responsible')} placeholder="Ing. García" />
            </div>
            <div>
              <label style={labelStyle}>Fecha de inicio</label>
              <input style={{ ...inputStyle, colorScheme: 'dark' }} type="date" value={form.startingDate} onChange={set('startingDate')} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Notas</label>
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
              value={form.notes} onChange={set('notes') as any} placeholder="Observaciones adicionales" />
          </div>

          {error && <div style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <GlassButton size="sm" variant="ghost" onClick={onClose}>Cancelar</GlassButton>
            <GlassButton size="sm" variant="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Guardando…' : 'Crear Plan'}
            </GlassButton>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Complete Plan Modal ────────────────────────────────────────
interface CompletePlanModalProps {
  plan: MaintenancePlan
  onClose: () => void
  onSaved: () => void
}
function CompletePlanModal({ plan, onClose, onSaved }: CompletePlanModalProps) {
  const [form, setForm] = useState({ doneBy: '', durationMin: String(plan.estimated_duration_min ?? 60), notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    setSaving(true); setError('')
    try {
      await apiFetch(`/maintenance/plans/${plan.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doneBy: form.doneBy.trim() || null,
          durationMin: Number(form.durationMin) || null,
          notes: form.notes.trim() || null,
        }),
      })
      onSaved()
    } catch (e: any) {
      setError(e.message || 'Error al completar el plan')
    } finally { setSaving(false) }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
    color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16, padding: 28, width: '100%', maxWidth: 440,
        backdropFilter: 'blur(24px)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Completar Mantenimiento</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>{plan.name}</div>

        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>
              Realizado por
            </label>
            <input style={inputStyle} value={form.doneBy} onChange={set('doneBy')} placeholder="Nombre del técnico" />
          </div>
          <div>
            <label style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>
              Duración real (min)
            </label>
            <input style={inputStyle} type="number" min="1" value={form.durationMin} onChange={set('durationMin')} />
          </div>
          <div>
            <label style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>
              Notas del técnico
            </label>
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
              value={form.notes} onChange={set('notes') as any} placeholder="Observaciones, piezas reemplazadas, etc." />
          </div>

          {error && <div style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <GlassButton size="sm" variant="ghost" onClick={onClose}>Cancelar</GlassButton>
            <GlassButton size="sm" variant="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Guardando…' : 'Marcar Completado'}
            </GlassButton>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Prediction Panel ───────────────────────────────────────────
interface PredictionPanelProps { machineId: string }

function PredictionPanel({ machineId }: PredictionPanelProps) {
  const p = usePrediction(machineId)

  const alertVariant = p.alert === 'critical' ? 'critical' : p.alert === 'warning' ? 'warning' : 'ok'
  const alertLabel   = p.alert === 'critical' ? 'CRÍTICO' : p.alert === 'warning' ? 'ADVERTENCIA' : 'NORMAL'
  const AlertIcon    = p.alert === 'critical' ? AlertTriangle : p.alert === 'warning' ? TrendingUp : CheckCircle
  const rc = riskColor(p.combinedRisk)

  const metrics = [
    { label: 'Vibración actual',  value: `${p.currentVib} mm/s`,           warn: p.currentVib >= 4.5 },
    { label: 'Tendencia',         value: `${p.trendSlope >= 0 ? '+' : ''}${(p.trendSlope * 30).toFixed(2)} mm/s/mes`, warn: p.trendSlope > 0.05 },
    { label: 'MTBF',              value: p.mtbf === Infinity ? '∞' : `${p.mtbf}h`, warn: false },
    { label: 'Vib 30d (est.)',    value: `${p.projectedVib30d} mm/s`,       warn: p.projectedVib30d >= 4.5 },
    { label: 'R² modelo',         value: String(p.r2),                      warn: p.r2 < 0.5 },
    { label: 'Confianza',         value: `${p.confidence}%`,                warn: false },
    { label: 'Temperatura',       value: `${p.currentTemp}°C`,              warn: p.currentTemp >= 75 },
    { label: 'Anomalía vib (Z)',  value: `Z = ${p.anomalyVib}`,             warn: p.anomalyVib > 2 },
    { label: 'Fallas / 30d',      value: String(p.faultDensity),            warn: p.faultDensity > 2 },
  ]

  return (
    <GlassCard glow={p.alert === 'critical' ? 'danger' : p.alert === 'warning' ? 'warning' : 'success'}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          Análisis de Riesgo — ML
        </div>
        <Badge variant={alertVariant}>{alertLabel}</Badge>
      </div>

      {/* Combined risk gauge */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
            Riesgo combinado
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 800, color: rc }}>
            {p.combinedRisk}<span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 2 }}>/100</span>
          </span>
        </div>
        <div style={{ height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 4,
            width: `${p.combinedRisk}%`,
            background: `linear-gradient(90deg, ${rc}99, ${rc})`,
            boxShadow: `0 0 10px ${rc}55`,
            transition: 'width 0.7s ease',
          }} />
        </div>
      </div>

      {/* Dual RUL display */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
          background: p.alert === 'critical' ? 'var(--danger-dim)' : p.alert === 'warning' ? 'var(--warning-dim)' : 'var(--success-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `2px solid ${p.alert === 'critical' ? 'rgba(239,68,68,0.4)' : p.alert === 'warning' ? 'rgba(245,158,11,0.4)' : 'rgba(34,197,94,0.4)'}`,
        }}>
          <AlertIcon size={24} color={p.alert === 'critical' ? 'var(--danger)' : p.alert === 'warning' ? 'var(--warning)' : 'var(--success)'} />
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <div>
            <div style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 2 }}>
              RUL Vibración
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
              {p.rul === Infinity ? '—' : p.rul}
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginLeft: 4 }}>
                {p.rul === Infinity ? 'sin tendencia' : 'd'}
              </span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 2 }}>
              RUL Temperatura
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
              {p.tempRul === Infinity ? '—' : p.tempRul}
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginLeft: 4 }}>
                {p.tempRul === Infinity ? 'sin tendencia' : 'd'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 9-metric grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
        {metrics.map(({ label, value, warn }) => (
          <div key={label} style={{ padding: '9px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 4 }}>
              {label}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 800, color: warn ? 'var(--warning)' : 'var(--text-primary)' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Recommendation */}
      <div style={{
        padding: '10px 12px', borderRadius: 8,
        background: p.alert === 'critical' ? 'var(--danger-dim)' : p.alert === 'warning' ? 'var(--warning-dim)' : 'var(--success-dim)',
        border: `1px solid ${p.alert === 'critical' ? 'rgba(239,68,68,0.25)' : p.alert === 'warning' ? 'rgba(245,158,11,0.25)' : 'rgba(34,197,94,0.25)'}`,
      }}>
        <div style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 600, lineHeight: 1.5 }}>
          {p.recommendation}
        </div>
      </div>
    </GlassCard>
  )
}

// ── Main page ──────────────────────────────────────────────────
export default function Maintenance() {
  const [machineId, setMachineId] = useState<string>(COMPANY_CONFIG.machines[0].id)
  const [showCreate, setShowCreate]   = useState(false)
  const [completing, setCompleting]   = useState<MaintenancePlan | null>(null)

  const hist   = useSensorHistory(machineId)
  const last60 = hist.slice(-60)

  const { data: summary, apiOnline, reload: reloadSummary } = useSummary()
  const { plans: allPlans, reload: reloadPlans }  = useAllPlans()
  const { records, reload: reloadHistory }        = useHistory()

  const machinePlans   = allPlans.filter(p => p.asset_id === machineId)
  const machineHistory = records.filter(r => r.asset_id === machineId)

  const chartData = last60.map(r => ({ date: r.date, vibración: r.vibration, temperatura: r.temperature }))

  const p = usePrediction(machineId)

  const handleExport = () => {
    const machine = COMPANY_CONFIG.machines.find(m => m.id === machineId)!
    const lines = [
      `ORDEN DE TRABAJO — ${COMPANY_CONFIG.name}`,
      `Fecha: ${new Date().toLocaleString('es-MX')}`,
      `Equipo: ${machine.name} (${machineId})`,
      '',
      `ANÁLISIS ML (IA):`,
      `  Riesgo combinado:  ${p.combinedRisk}/100`,
      `  RUL Vibración:     ${p.rul === Infinity ? 'Sin tendencia de falla' : p.rul + ' días'}`,
      `  RUL Temperatura:   ${p.tempRul === Infinity ? 'Sin tendencia de falla' : p.tempRul + ' días'}`,
      `  Vibración actual:  ${p.currentVib} mm/s  (Anomalía Z=${p.anomalyVib})`,
      `  Temperatura actual: ${p.currentTemp}°C   (Anomalía Z=${p.anomalyTemp})`,
      `  Fallas / 30d:      ${p.faultDensity}`,
      `  MTBF:              ${p.mtbf === Infinity ? '∞' : p.mtbf + 'h'}`,
      `  Recomendación:     ${p.recommendation}`,
      '',
      `PLANES DE MANTENIMIENTO (${machinePlans.length}):`,
      ...machinePlans.map(pl =>
        `  [${pl.status}] ${pl.name} | Frecuencia: ${pl.frequency_days}d | Próx: ${fmtDate(pl.next_due_at)} | Resp: ${pl.responsible ?? '—'}`
      ),
      '',
      `HISTORIAL RECIENTE (${machineHistory.slice(0, 10).length} registros):`,
      ...machineHistory.slice(0, 10).map(r =>
        `  ${fmtDate(r.done_at)} | ${r.plan_name ?? 'Sin plan'} | ${r.done_by ?? '—'} | ${r.duration_min ?? '?'} min`
      ),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `orden-trabajo-${machineId}-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
  }

  const onPlanSaved = () => {
    setShowCreate(false)
    reloadPlans(); reloadSummary()
  }
  const onPlanCompleted = () => {
    setCompleting(null)
    reloadPlans(); reloadHistory(); reloadSummary()
  }

  return (
    <PageWrapper title="Mantenimiento Predictivo">
      {/* API offline banner */}
      {apiOnline === false && (
        <div style={{
          marginBottom: 16, padding: '10px 16px', borderRadius: 10,
          background: 'var(--warning-dim)', border: '1px solid rgba(245,158,11,0.3)',
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#FCD34D', fontWeight: 600,
        }}>
          <AlertTriangle size={15} />
          API no disponible — datos de mantenimiento sin conexión. Verifica que <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>VITE_API_URL</code> apunte a tu API en Railway.
        </div>
      )}

      {/* Machine selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Equipo:</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
          {COMPANY_CONFIG.machines.map(m => (
            <button key={m.id} onClick={() => setMachineId(m.id)} style={{
              padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 700,
              background: machineId === m.id ? 'var(--primary-dim)' : 'var(--bg-surface)',
              border: `1px solid ${machineId === m.id ? 'rgba(14,165,233,0.40)' : 'var(--border-glass)'}`,
              color: machineId === m.id ? 'var(--primary)' : 'var(--text-secondary)', transition: 'all 0.15s',
            }}>{m.name}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <GlassButton icon={<Plus size={13} />} size="sm" variant="primary" onClick={() => setShowCreate(true)}>
            Nuevo Plan
          </GlassButton>
          <GlassButton icon={<Download size={13} />} size="sm" variant="ghost" onClick={handleExport}>
            Generar OT
          </GlassButton>
        </div>
      </div>

      {/* Summary KPI tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Planes vencidos', value: summary.overdue,   color: summary.overdue   > 0 ? 'var(--danger)'  : 'var(--text-primary)', icon: <AlertTriangle size={18} /> },
          { label: 'Próximos 7 días', value: summary.upcoming,  color: summary.upcoming  > 0 ? 'var(--warning)' : 'var(--text-primary)', icon: <Clock        size={18} /> },
          { label: 'Completados/mes', value: summary.doneMonth, color: 'var(--success)',  icon: <CheckCircle   size={18} /> },
          { label: 'Total planes',    value: summary.total,     color: 'var(--primary)',  icon: <Wrench        size={18} /> },
        ].map(({ label, value, color, icon }) => (
          <GlassCard key={label} style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>{label}</div>
              <span style={{ color, opacity: 0.7 }}>{icon}</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
          </GlassCard>
        ))}
      </div>

      {/* Chart + ML Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 16 }}>
        <GlassCard>
          <div style={{ marginBottom: 14 }}>
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
          <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {last60.map((r, i) => r.isFault ? (
              <Badge key={i} variant="critical" dot>Falla {r.date}</Badge>
            ) : null).filter(Boolean)}
          </div>
        </GlassCard>

        <PredictionPanel machineId={machineId} />
      </div>

      {/* Plans for selected machine */}
      <GlassCard style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Planes — {COMPANY_CONFIG.machines.find(m => m.id === machineId)?.name}
            </div>
            {machinePlans.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginTop: 2 }}>
                {machinePlans.filter(p => p.status === 'VENCIDO').length} vencidos · {machinePlans.filter(p => p.status === 'PROXIMO').length} próximos
              </div>
            )}
          </div>
          <GlassButton icon={<Plus size={12} />} size="sm" variant="ghost" onClick={() => setShowCreate(true)}>
            Nuevo plan
          </GlassButton>
        </div>

        {machinePlans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>
            No hay planes de mantenimiento para este equipo.
            <br />
            <button onClick={() => setShowCreate(true)} style={{
              marginTop: 10, background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--primary)', fontSize: 12, fontWeight: 700,
            }}>
              Crear el primero →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {machinePlans.map(plan => (
              <div key={plan.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${plan.status === 'VENCIDO' ? 'rgba(239,68,68,0.25)' : plan.status === 'PROXIMO' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.07)'}`,
              }}>
                <Badge variant={statusVariant(plan.status)}>{statusLabel(plan.status)}</Badge>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{plan.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
                    Cada {plan.frequency_days}d · {plan.estimated_duration_min}min · {plan.responsible ?? 'Sin responsable'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Próximo</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700 }}>{fmtDate(plan.next_due_at)}</div>
                </div>
                <GlassButton size="sm" variant="ghost" icon={<CheckCircle size={12} />} onClick={() => setCompleting(plan)}>
                  Completar
                </GlassButton>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Maintenance history */}
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
        {records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>
            No hay registros de mantenimiento aún.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Fecha', 'Equipo', 'Plan', 'Técnico', 'Duración', 'Notas'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '8px 12px', fontSize: 9, fontWeight: 800,
                      color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase',
                      borderBottom: '1px solid rgba(255,255,255,0.07)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map(row => (
                  <tr key={row.id}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    style={{ transition: 'background 0.15s' }}
                  >
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>{fmtDate(row.done_at)}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>{row.asset_id}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 }}>{row.plan_name ?? '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{row.done_by ?? '—'}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {row.duration_min ? (
                        <span><Clock size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />{row.duration_min}min</span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--text-secondary)', maxWidth: 200 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                        {row.notes ?? '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Modals */}
      {showCreate && (
        <CreatePlanModal assetId={machineId} onClose={() => setShowCreate(false)} onSaved={onPlanSaved} />
      )}
      {completing && (
        <CompletePlanModal plan={completing} onClose={() => setCompleting(null)} onSaved={onPlanCompleted} />
      )}
    </PageWrapper>
  )
}
