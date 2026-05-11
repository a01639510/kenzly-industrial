import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, ChevronRight, ClipboardList, CheckCircle2, Clock, Ban } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { Badge } from '@/components/ui/Badge'
import { COMPANY_CONFIG } from '@/config/company'
import { apiFetch } from '@/lib/apiClient'

// ── Types ─────────────────────────────────────────────────────────────────────
type Status   = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA' | 'CANCELADA'
type Priority = 'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE'

interface Order {
  id:              string
  order_number:    string
  product_name:    string
  target_quantity: number
  actual_quantity: number
  asset_id:        string
  area_id:         string
  status:          Status
  priority:        Priority
  notes:           string | null
  started_at:      string | null
  completed_at:    string | null
  due_at:          string
  created_at:      string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<Status, string> = {
  PENDIENTE:  'var(--text-muted)',
  EN_PROCESO: 'var(--warning)',
  COMPLETADA: 'var(--success)',
  CANCELADA:  'var(--danger)',
}
const PRIORITY_COLOR: Record<Priority, string> = {
  BAJA:    'var(--text-muted)',
  NORMAL:  'var(--accent)',
  ALTA:    'var(--warning)',
  URGENTE: 'var(--danger)',
}
const STATUS_LABEL: Record<Status, string> = {
  PENDIENTE:  'Pendiente',
  EN_PROCESO: 'En proceso',
  COMPLETADA: 'Completada',
  CANCELADA:  'Cancelada',
}

function machineName(assetId: string) {
  return COMPANY_CONFIG.machines.find(m => m.id === assetId)?.name ?? assetId
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function progress(o: Order) {
  if (!o.target_quantity) return 0
  return Math.min(100, Math.round((o.actual_quantity / o.target_quantity) * 100))
}

// ── Form defaults ─────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  order_number:    '',
  product_name:    '',
  target_quantity: 100,
  asset_id:        COMPANY_CONFIG.machines[0].id,
  priority:        'NORMAL' as Priority,
  due_at:          new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 16),
  notes:           '',
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <GlassCard padding="sm">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ color, opacity: 0.85 }}>{icon}</div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: 'var(--font-mono)' }}>{value}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
        </div>
      </div>
    </GlassCard>
  )
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.4s' }} />
    </div>
  )
}

// ── Create/Edit form ──────────────────────────────────────────────────────────
function OrderForm({
  initial, onSave, onClose, loading,
}: {
  initial: typeof EMPTY_FORM
  onSave:  (data: typeof EMPTY_FORM) => void
  onClose: () => void
  loading: boolean
}) {
  const [form, setForm] = useState(initial)
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', fontSize: 13,
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block',
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
        onClick={e => e.stopPropagation()}
        style={{ background: 'rgba(12,16,32,0.98)', backdropFilter: 'blur(28px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Nueva Orden de Producción</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>No. Orden</label>
              <input style={inputStyle} value={form.order_number} onChange={e => set('order_number', e.target.value)} placeholder="OP-2026-0001" />
            </div>
            <div>
              <label style={labelStyle}>Prioridad</label>
              <select style={inputStyle} value={form.priority} onChange={e => set('priority', e.target.value)}>
                {(['BAJA','NORMAL','ALTA','URGENTE'] as Priority[]).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Producto</label>
            <input style={inputStyle} value={form.product_name} onChange={e => set('product_name', e.target.value)} placeholder="Nombre del producto" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Cantidad objetivo</label>
              <input style={inputStyle} type="number" min={1} value={form.target_quantity} onChange={e => set('target_quantity', Number(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>Máquina</label>
              <select style={inputStyle} value={form.asset_id} onChange={e => set('asset_id', e.target.value)}>
                {COMPANY_CONFIG.machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Fecha límite</label>
            <input style={inputStyle} type="datetime-local" value={form.due_at} onChange={e => set('due_at', e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Notas</label>
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Instrucciones especiales…" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <GlassButton variant="ghost" size="sm" onClick={onClose} style={{ flex: 1 }}>Cancelar</GlassButton>
          <GlassButton size="sm" onClick={() => onSave(form)} disabled={loading} style={{ flex: 2 }}>
            {loading ? 'Guardando…' : 'Crear Orden'}
          </GlassButton>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
const FILTERS: { label: string; value: Status | 'ALL' }[] = [
  { label: 'Todas',      value: 'ALL'       },
  { label: 'Pendientes', value: 'PENDIENTE' },
  { label: 'En proceso', value: 'EN_PROCESO'},
  { label: 'Completadas',value: 'COMPLETADA'},
  { label: 'Canceladas', value: 'CANCELADA' },
]

export default function Orders() {
  const [orders,     setOrders]    = useState<Order[]>([])
  const [filter,     setFilter]    = useState<Status | 'ALL'>('ALL')
  const [showForm,   setShowForm]  = useState(false)
  const [saving,     setSaving]    = useState(false)
  const [loadingId,  setLoadingId] = useState<string | null>(null)
  const [error,      setError]     = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    try {
      const data = await apiFetch<Order[]>('/orders')
      setOrders(data)
    } catch (e: any) {
      setError('No se pudo conectar a la API de órdenes.')
    }
  }, [])

  useEffect(() => { loadOrders() }, [loadOrders])

  const visible = filter === 'ALL' ? orders : orders.filter(o => o.status === filter)

  const stats = {
    total:     orders.length,
    active:    orders.filter(o => o.status === 'EN_PROCESO').length,
    done:      orders.filter(o => o.status === 'COMPLETADA').length,
    pending:   orders.filter(o => o.status === 'PENDIENTE').length,
  }

  async function handleCreate(form: typeof EMPTY_FORM) {
    setSaving(true)
    try {
      const machine = COMPANY_CONFIG.machines.find(m => m.id === form.asset_id)
      await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({
          order_number:    form.order_number || `OP-${Date.now()}`,
          product_name:    form.product_name,
          target_quantity: form.target_quantity,
          asset_id:        form.asset_id,
          area_id:         machine?.area ?? 'general',
          priority:        form.priority,
          due_at:          new Date(form.due_at).toISOString(),
          notes:           form.notes || null,
        }),
      })
      setShowForm(false)
      await loadOrders()
    } catch (e: any) {
      setError('Error al crear la orden.')
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(id: string, status: Status, extra: Record<string, any> = {}) {
    setLoadingId(id)
    try {
      await apiFetch(`/orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, ...extra }),
      })
      await loadOrders()
    } catch {
      setError('Error al actualizar la orden.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <PageWrapper title="Órdenes de Producción">
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard icon={<ClipboardList size={18} />} label="Total"       value={stats.total}   color="var(--text-primary)" />
        <StatCard icon={<Clock size={18} />}         label="En proceso"  value={stats.active}  color="var(--warning)" />
        <StatCard icon={<CheckCircle2 size={18} />}  label="Completadas" value={stats.done}    color="var(--success)" />
        <StatCard icon={<Ban size={18} />}           label="Pendientes"  value={stats.pending} color="var(--text-muted)" />
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: filter === f.value ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                color: filter === f.value ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
            >{f.label}</button>
          ))}
        </div>
        <GlassButton size="sm" onClick={() => setShowForm(true)} style={{ gap: 6, display: 'flex', alignItems: 'center' }}>
          <Plus size={14} /> Nueva Orden
        </GlassButton>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: 'var(--danger)', display: 'flex', justifyContent: 'space-between' }}>
          {error}
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><X size={14} /></button>
        </div>
      )}

      {/* Orders list */}
      <div style={{ display: 'grid', gap: 10 }}>
        <AnimatePresence initial={false}>
          {visible.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <GlassCard padding="md">
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  Sin órdenes para este filtro
                </div>
              </GlassCard>
            </motion.div>
          )}

          {visible.map(order => {
            const pct      = progress(order)
            const isActive = order.status === 'EN_PROCESO'
            const isPending= order.status === 'PENDIENTE'
            const busy     = loadingId === order.id

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                layout
              >
                <GlassCard padding="sm">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    {/* Status stripe */}
                    <div style={{ width: 3, borderRadius: 3, alignSelf: 'stretch', background: STATUS_COLOR[order.status], flexShrink: 0 }} />

                    {/* Main content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                        <div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>
                            {order.order_number}
                          </span>
                          <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{order.product_name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            {machineName(order.asset_id)} · Vence {fmtDate(order.due_at)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px',
                            background: `${PRIORITY_COLOR[order.priority]}22`,
                            color: PRIORITY_COLOR[order.priority],
                          }}>{order.priority}</span>
                          <span style={{
                            padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px',
                            background: `${STATUS_COLOR[order.status]}22`,
                            color: STATUS_COLOR[order.status],
                          }}>{STATUS_LABEL[order.status]}</span>
                        </div>
                      </div>

                      {/* Progress */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Progreso</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          {order.actual_quantity} / {order.target_quantity} pzs
                          <span style={{ color: STATUS_COLOR[order.status], marginLeft: 6 }}>{pct}%</span>
                        </span>
                      </div>
                      <ProgressBar pct={pct} color={STATUS_COLOR[order.status]} />

                      {/* Actions */}
                      {(isPending || isActive) && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                          {isPending && (
                            <GlassButton size="sm" onClick={() => updateStatus(order.id, 'EN_PROCESO', { started_at: new Date().toISOString() })} disabled={busy}
                              style={{ fontSize: 11, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <ChevronRight size={12} /> {busy ? '…' : 'Iniciar'}
                            </GlassButton>
                          )}
                          {isActive && (
                            <>
                              <GlassButton size="sm" onClick={() => updateStatus(order.id, 'COMPLETADA', { completed_at: new Date().toISOString(), actual_quantity: order.target_quantity })} disabled={busy}
                                style={{ fontSize: 11, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--success)' }}>
                                <CheckCircle2 size={12} /> {busy ? '…' : 'Completar'}
                              </GlassButton>
                              <GlassButton variant="ghost" size="sm" onClick={() => updateStatus(order.id, 'CANCELADA')} disabled={busy}
                                style={{ fontSize: 11, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--danger)' }}>
                                <Ban size={12} /> Cancelar
                              </GlassButton>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Create form modal */}
      <AnimatePresence>
        {showForm && (
          <OrderForm
            initial={EMPTY_FORM}
            onSave={handleCreate}
            onClose={() => setShowForm(false)}
            loading={saving}
          />
        )}
      </AnimatePresence>
    </PageWrapper>
  )
}
