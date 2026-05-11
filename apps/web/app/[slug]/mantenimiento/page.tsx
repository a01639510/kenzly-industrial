"use client"
import React, { useEffect, useState, useCallback } from 'react';
import { useTenant } from '../../../contexts/TenantContext';
import { api } from '../../../lib/api';

type PlanStatus = 'AL_DIA' | 'PROXIMO' | 'VENCIDO' | 'PENDIENTE';

interface MaintenancePlan {
  id: number; asset_id: string; name: string; description: string | null;
  frequency_days: number; estimated_duration_min: number;
  responsible: string | null; last_done_at: string | null;
  next_due_at: string | null; notes: string | null; status: PlanStatus;
}

interface MaintenanceRecord {
  id: number; plan_id: number | null; plan_name: string | null;
  asset_id: string; done_at: string; done_by: string | null;
  duration_min: number | null; notes: string | null;
}

interface Summary { overdue: number; upcoming: number; doneMonth: number; total: number; }

const ST: Record<PlanStatus, { label: string; color: string; bg: string }> = {
  VENCIDO:   { label: 'VENCIDO',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  PROXIMO:   { label: 'PRÓXIMO',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  AL_DIA:    { label: 'AL DÍA',   color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  PENDIENTE: { label: 'PENDIENTE', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
};

const FREQ_OPTS = [
  { label: 'Diario', days: 1 }, { label: 'Semanal', days: 7 },
  { label: 'Quincenal', days: 15 }, { label: 'Mensual', days: 30 },
  { label: 'Trimestral', days: 90 }, { label: 'Semestral', days: 180 }, { label: 'Anual', days: 365 },
];

export default function MantenimientoPage() {
  const { primaryColor, allAssets } = useTenant();
  const [plans,   setPlans]   = useState<MaintenancePlan[]>([]);
  const [history, setHistory] = useState<MaintenanceRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [planModal,     setPlanModal]     = useState(false);
  const [editPlan,      setEditPlan]      = useState<MaintenancePlan | null>(null);
  const [completeModal, setCompleteModal] = useState<MaintenancePlan | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<MaintenancePlan | null>(null);

  // Form state
  const [form, setForm] = useState({ assetId: '', name: '', description: '', frequencyDays: 30, estimatedDurationMin: 60, responsible: '', notes: '', startingDate: '' });
  const [completeForm, setCompleteForm] = useState({ doneBy: '', durationMin: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, h, s] = await Promise.all([
        api.maintenance.plans(statusFilter !== 'ALL' ? statusFilter : undefined),
        api.maintenance.history(30),
        api.maintenance.summary(),
      ]);
      setPlans(p); setHistory(h); setSummary(s);
    } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openNew = () => {
    setEditPlan(null);
    setForm({ assetId: allAssets[0] || '', name: '', description: '', frequencyDays: 30, estimatedDurationMin: 60, responsible: '', notes: '', startingDate: '' });
    setPlanModal(true);
  };

  const openEdit = (plan: MaintenancePlan) => {
    setEditPlan(plan);
    setForm({ assetId: plan.asset_id, name: plan.name, description: plan.description || '', frequencyDays: plan.frequency_days, estimatedDurationMin: plan.estimated_duration_min, responsible: plan.responsible || '', notes: plan.notes || '', startingDate: '' });
    setPlanModal(true);
  };

  const savePlan = async () => {
    if (!form.assetId || !form.name) return;
    setSaving(true);
    try {
      if (editPlan) {
        await api.maintenance.update(editPlan.id, { name: form.name, description: form.description || null, frequencyDays: form.frequencyDays, estimatedDurationMin: form.estimatedDurationMin, responsible: form.responsible || null, notes: form.notes || null });
      } else {
        await api.maintenance.create({ assetId: form.assetId, name: form.name, description: form.description || null, frequencyDays: form.frequencyDays, estimatedDurationMin: form.estimatedDurationMin, responsible: form.responsible || null, notes: form.notes || null, startingDate: form.startingDate || null });
      }
      setPlanModal(false); fetchAll();
    } finally { setSaving(false); }
  };

  const completePlan = async () => {
    if (!completeModal) return;
    setSaving(true);
    try {
      await api.maintenance.complete(completeModal.id, { doneBy: completeForm.doneBy || null, durationMin: completeForm.durationMin ? Number(completeForm.durationMin) : null, notes: completeForm.notes || null });
      setCompleteModal(null); setCompleteForm({ doneBy: '', durationMin: '', notes: '' }); fetchAll();
    } finally { setSaving(false); }
  };

  const deletePlan = async (plan: MaintenancePlan) => {
    setSaving(true);
    try {
      await api.maintenance.delete(plan.id);
      setDeleteConfirm(null); fetchAll();
    } finally { setSaving(false); }
  };

  const fmtDate = (d: string | null) => !d ? '—' : new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  const daysUntil = (d: string | null) => d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000) : null;

  return (
    <div style={{ padding: 24 }}>
      {/* Summary */}
      {summary && (
        <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'VENCIDAS',        value: summary.overdue,   color: '#ef4444' },
            { label: 'PRÓXIMAS 7 DÍAS', value: summary.upcoming,  color: '#f59e0b' },
            { label: 'COMPLETADAS MES', value: summary.doneMonth, color: '#10b981' },
            { label: 'TOTAL TAREAS',    value: summary.total,     color: '#6366f1' },
          ].map(c => (
            <div key={c.label} style={{ background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.45)', padding: '14px 18px', flex: 1, minWidth: 130, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: c.color, lineHeight: 1 }}>{c.value}</div>
              <div style={{ fontSize: 8, fontWeight: 800, color: '#94a3b8', letterSpacing: 1.5, marginTop: 6 }}>{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters + action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['ALL', 'VENCIDO', 'PROXIMO', 'AL_DIA'].map(s => (
            <button key={s} style={filterBtn(statusFilter === s, primaryColor)} onClick={() => setStatusFilter(s)}>
              {s === 'ALL' ? 'TODAS' : s === 'AL_DIA' ? 'AL DÍA' : s === 'PROXIMO' ? 'PRÓXIMAS' : s}
            </button>
          ))}
        </div>
        <button style={{ padding: '9px 18px', background: primaryColor, color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 10, fontWeight: 900, letterSpacing: 0.5, fontFamily: 'inherit' }} onClick={openNew}>
          + NUEVA TAREA
        </button>
      </div>

      {/* Plans table */}
      <div style={tableCard}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Cargando...</div>
        ) : plans.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🔧</div>
            <p style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>SIN TAREAS DE MANTENIMIENTO</p>
            <button style={{ padding: '9px 18px', background: primaryColor, color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 10, fontWeight: 900 }} onClick={openNew}>+ AGREGAR</button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['ACTIVO', 'TAREA', 'FRECUENCIA', 'ÚLTIMO', 'PRÓXIMO', 'ESTADO', ''].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plans.map(plan => {
                const st   = ST[plan.status] ?? ST.PENDIENTE;
                const days = daysUntil(plan.next_due_at);
                return (
                  <tr key={plan.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={td}><span style={assetBadge}>{plan.asset_id}</span></td>
                    <td style={td}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 12 }}>{plan.name}</div>
                      {plan.responsible && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>👤 {plan.responsible}</div>}
                    </td>
                    <td style={td}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
                        {FREQ_OPTS.find(f => f.days === plan.frequency_days)?.label ?? `${plan.frequency_days}d`}
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>~{plan.estimated_duration_min} min</div>
                    </td>
                    <td style={{ ...td, fontSize: 11, color: '#475569' }}>{fmtDate(plan.last_done_at)}</td>
                    <td style={td}>
                      <div style={{ fontSize: 11, color: plan.status === 'VENCIDO' ? '#ef4444' : '#475569', fontWeight: plan.status === 'VENCIDO' ? 700 : 400 }}>{fmtDate(plan.next_due_at)}</div>
                      {days !== null && (
                        <div style={{ fontSize: 10, color: days < 0 ? '#ef4444' : days <= 7 ? '#f59e0b' : '#94a3b8' }}>
                          {days < 0 ? `hace ${Math.abs(days)}d` : days === 0 ? 'hoy' : `en ${days}d`}
                        </div>
                      )}
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: 9, fontWeight: 800, padding: '3px 10px', borderRadius: 20, color: st.color, background: st.bg }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                        <button style={actionBtn('#10b981')} onClick={() => { setCompleteForm({ doneBy: '', durationMin: String(plan.estimated_duration_min), notes: '' }); setCompleteModal(plan); }}>✓ COMPLETAR</button>
                        <button style={actionBtn('#6366f1')} onClick={() => openEdit(plan)}>EDITAR</button>
                        <button style={actionBtn('#ef4444')} onClick={() => setDeleteConfirm(plan)}>✕</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div style={{ ...tableCard, marginTop: 16 }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #f1f5f9', fontSize: 11, fontWeight: 800, color: '#475569', letterSpacing: 1 }}>
            HISTORIAL RECIENTE
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['FECHA', 'ACTIVO', 'TAREA', 'REALIZADO POR', 'DURACIÓN', 'NOTAS'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {history.map(rec => (
                <tr key={rec.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ ...td, fontSize: 11 }}>{fmtDate(rec.done_at)}</td>
                  <td style={td}><span style={assetBadge}>{rec.asset_id}</span></td>
                  <td style={{ ...td, fontWeight: 700, fontSize: 12, color: '#0f172a' }}>{rec.plan_name || '—'}</td>
                  <td style={{ ...td, fontSize: 11 }}>{rec.done_by || '—'}</td>
                  <td style={{ ...td, fontSize: 11 }}>{rec.duration_min ? `${rec.duration_min} min` : '—'}</td>
                  <td style={{ ...td, fontSize: 11, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Plan Modal */}
      {planModal && (
        <Modal onClose={() => setPlanModal(false)} title={editPlan ? 'EDITAR TAREA' : 'NUEVA TAREA'}>
          <FRow>
            <FGroup label="ACTIVO *">
              <select style={fi} value={form.assetId} onChange={e => setForm(f => ({ ...f, assetId: e.target.value }))}>
                {allAssets.map(a => <option key={a} value={a}>{a}</option>)}
                {!allAssets.length && <option value="">Sin activos configurados</option>}
              </select>
            </FGroup>
            <FGroup label="FRECUENCIA *">
              <select style={fi} value={form.frequencyDays} onChange={e => setForm(f => ({ ...f, frequencyDays: Number(e.target.value) }))}>
                {FREQ_OPTS.map(o => <option key={o.days} value={o.days}>{o.label}</option>)}
              </select>
            </FGroup>
          </FRow>
          <FGroup label="NOMBRE *">
            <input style={fi} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Cambio de aceite hidráulico" />
          </FGroup>
          <FGroup label="DESCRIPCIÓN">
            <textarea style={{ ...fi, height: 64, resize: 'vertical' as const }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Procedimiento, materiales..." />
          </FGroup>
          <FRow>
            <FGroup label="DURACIÓN ESTIMADA (min)">
              <input style={fi} type="number" min={5} value={form.estimatedDurationMin} onChange={e => setForm(f => ({ ...f, estimatedDurationMin: Number(e.target.value) }))} />
            </FGroup>
            <FGroup label="RESPONSABLE">
              <input style={fi} value={form.responsible} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))} placeholder="Nombre o cargo" />
            </FGroup>
          </FRow>
          {!editPlan && (
            <FGroup label="PRIMERA FECHA PROGRAMADA">
              <input style={fi} type="date" value={form.startingDate} onChange={e => setForm(f => ({ ...f, startingDate: e.target.value }))} />
            </FGroup>
          )}
          <div style={mFooter}>
            <button style={cancelBtn} onClick={() => setPlanModal(false)}>CANCELAR</button>
            <button style={confirmBtn(saving || !form.name || !form.assetId, primaryColor)} disabled={saving || !form.name || !form.assetId} onClick={savePlan}>
              {saving ? 'GUARDANDO...' : editPlan ? 'GUARDAR' : 'CREAR TAREA'}
            </button>
          </div>
        </Modal>
      )}

      {/* Complete Modal */}
      {completeModal && (
        <Modal onClose={() => setCompleteModal(null)} title="REGISTRAR MANTENIMIENTO">
          <div style={{ padding: '12px 14px', background: 'rgba(16,185,129,0.06)', borderRadius: 9, marginBottom: 14, border: '1px solid rgba(16,185,129,0.15)' }}>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>{completeModal.name}</div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>{completeModal.asset_id} · cada {completeModal.frequency_days} días</div>
          </div>
          <FGroup label="REALIZADO POR">
            <input style={fi} value={completeForm.doneBy} onChange={e => setCompleteForm(f => ({ ...f, doneBy: e.target.value }))} placeholder="Nombre del técnico" />
          </FGroup>
          <FGroup label="DURACIÓN REAL (min)">
            <input style={fi} type="number" min={1} value={completeForm.durationMin} onChange={e => setCompleteForm(f => ({ ...f, durationMin: e.target.value }))} />
          </FGroup>
          <FGroup label="OBSERVACIONES">
            <textarea style={{ ...fi, height: 64, resize: 'vertical' as const }} value={completeForm.notes} onChange={e => setCompleteForm(f => ({ ...f, notes: e.target.value }))} placeholder="Hallazgos, repuestos usados..." />
          </FGroup>
          <div style={{ fontSize: 10, color: '#64748b', padding: '8px 12px', background: '#f8fafc', borderRadius: 7, marginTop: 4 }}>
            La próxima fecha se programará en <strong>{completeModal.frequency_days} días</strong>.
          </div>
          <div style={mFooter}>
            <button style={cancelBtn} onClick={() => setCompleteModal(null)}>CANCELAR</button>
            <button style={confirmBtn(saving, primaryColor)} disabled={saving} onClick={completePlan}>
              {saving ? 'REGISTRANDO...' : '✓ REGISTRAR'}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <Modal onClose={() => setDeleteConfirm(null)} title="ELIMINAR TAREA">
          <p style={{ color: '#0f172a', fontSize: 13, margin: '0 0 8px' }}>¿Eliminar <strong>"{deleteConfirm.name}"</strong>?</p>
          <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>Esta acción no se puede deshacer.</p>
          <div style={mFooter}>
            <button style={cancelBtn} onClick={() => setDeleteConfirm(null)}>CANCELAR</button>
            <button style={{ ...confirmBtn(saving, '#ef4444'), background: saving ? '#fca5a5' : '#ef4444' }} disabled={saving} onClick={() => deletePlan(deleteConfirm)}>
              {saving ? 'ELIMINANDO...' : 'ELIMINAR'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Mini components ────────────────────────────────────────────────────────────
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'rgba(240,249,255,0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', letterSpacing: 0.5 }}>{title}</span>
          <button style={{ background: '#f1f5f9', border: 'none', borderRadius: 7, width: 28, height: 28, cursor: 'pointer', fontSize: 12, color: '#64748b' }} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
      </div>
    </div>
  );
}
function FGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}><label style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', letterSpacing: 1.5 }}>{label}</label>{children}</div>;
}
function FRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>;
}

const filterBtn = (active: boolean, primary: string): React.CSSProperties => ({
  padding: '6px 12px', border: active ? '1px solid transparent' : '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer',
  fontSize: 10, fontWeight: 800, letterSpacing: 0.5, background: active ? '#0f172a' : '#fff',
  color: active ? '#fff' : '#64748b', fontFamily: 'inherit',
});
const tableCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
  borderRadius: 12, border: '1px solid rgba(255,255,255,0.45)', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
};
const th: React.CSSProperties = {
  padding: '9px 14px', textAlign: 'left', fontSize: 9, fontWeight: 800, color: '#64748b',
  letterSpacing: 1.5, background: 'rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.3)', whiteSpace: 'nowrap',
};
const td: React.CSSProperties = { padding: '11px 14px', verticalAlign: 'middle' };
const assetBadge: React.CSSProperties = {
  display: 'inline-block', padding: '2px 8px', background: '#f1f5f9', borderRadius: 5, fontSize: 10, fontWeight: 700, color: '#475569',
};
const actionBtn = (color: string): React.CSSProperties => ({
  padding: '4px 9px', background: `${color}10`, border: `1px solid ${color}28`, borderRadius: 6,
  fontSize: 9, fontWeight: 800, color, cursor: 'pointer', letterSpacing: 0.3, fontFamily: 'inherit',
});
const fi: React.CSSProperties = {
  padding: '9px 11px', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 9,
  fontSize: 12, color: '#0f172a', outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
};
const mFooter: React.CSSProperties = {
  display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8,
};
const cancelBtn: React.CSSProperties = {
  padding: '9px 18px', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 9,
  fontSize: 11, fontWeight: 800, color: '#1e293b', cursor: 'pointer', fontFamily: 'inherit',
};
const confirmBtn = (disabled: boolean, color: string): React.CSSProperties => ({
  padding: '9px 18px', background: disabled ? '#bae6fd' : color, border: 'none', borderRadius: 9,
  fontSize: 11, fontWeight: 800, color: '#fff', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
});
