"use client"
import React, { useEffect, useState, useCallback } from 'react';
import OrderFormModal from '../../../components/OrderFormModal';
import { useTenant } from '../../../contexts/TenantContext';
import { api } from '../../../lib/api';

interface Order {
  id: string; order_number: string; product_name: string;
  target_quantity: number; actual_quantity: number;
  asset_id: string | null; area_id: string | null;
  status: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA' | 'CANCELADA';
  priority: 'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE';
  notes: string | null; started_at: string | null;
  completed_at: string | null; due_at: string | null; created_at: string;
}

const PC: Record<string, string> = { BAJA: '#94a3b8', NORMAL: '#3b82f6', ALTA: '#f59e0b', URGENTE: '#ef4444' };

const SM: Record<string, { label: string; bg: string; color: string }> = {
  PENDIENTE:  { label: 'PENDIENTE',  bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24' },
  EN_PROCESO: { label: 'EN PROCESO', bg: 'rgba(96,165,250,0.15)',  color: '#60a5fa' },
  COMPLETADA: { label: 'COMPLETADA', bg: 'rgba(52,211,153,0.15)',  color: '#34d399' },
  CANCELADA:  { label: 'CANCELADA',  bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.40)' },
};

type ViewMode = 'lista' | 'kanban' | 'semana' | 'metricas';

export default function OrdenesPage() {
  const { primaryColor, allAssets, manifest } = useTenant();
  const [orders,      setOrders]     = useState<Order[]>([]);
  const [summary,     setSummary]    = useState<any>(null);
  const [compliance,  setCompliance] = useState<any>(null);
  const [loading,     setLoading]    = useState(true);
  const [view,        setView]       = useState<ViewMode>('lista');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [modalOpen,   setModalOpen]  = useState(false);
  const [progressInput, setProgressInput] = useState<{ id: string; value: string } | null>(null);
  const [weekOffset,  setWeekOffset] = useState(0);

  const allAreas = Object.entries(manifest?.areas ?? {}).map(([id, area]: any) => ({ id, name: area.name }));

  const load = useCallback(async () => {
    try {
      const [o, s, c] = await Promise.all([
        api.orders.list({ limit: '200' }),
        api.orders.summary(),
        api.orders.compliance(),
      ]);
      setOrders(o); setSummary(s); setCompliance(c);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string) => {
    await api.orders.update(id, { status }); load();
  };
  const updateProgress = async (id: string, qty: number) => {
    await api.orders.update(id, { actualQuantity: qty });
    setProgressInput(null); load();
  };
  const cancelOrder = async (id: string) => {
    if (!confirm('¿Cancelar esta orden?')) return;
    await api.orders.delete(id); load();
  };

  const fmtDate = (iso: string | null) => !iso ? '—'
    : new Date(iso).toLocaleString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const isOverdue = (o: Order) =>
    !!o.due_at && new Date(o.due_at) < new Date() && !['COMPLETADA', 'CANCELADA'].includes(o.status);
  const statusCount = (key: string) => summary?.byStatus?.[key]?.count || 0;

  // Weekly helpers
  const getWeekDays = () => {
    const today  = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday); d.setDate(monday.getDate() + i); return d;
    });
  };
  const ordersForDay = (day: Date) =>
    orders.filter(o => o.due_at && new Date(o.due_at).toDateString() === day.toDateString());
  const unscheduled  = orders.filter(o => !o.due_at && !['COMPLETADA', 'CANCELADA'].includes(o.status));

  // ── Order card ───────────────────────────────────────────────────────────────
  const renderCard = (order: Order, compact = false) => {
    const pct    = order.target_quantity > 0 ? Math.min(Math.round((order.actual_quantity / order.target_quantity) * 100), 100) : 0;
    const isPending = order.status === 'PENDIENTE';
    const isActive  = order.status === 'EN_PROCESO';
    const isDone    = ['COMPLETADA', 'CANCELADA'].includes(order.status);
    const overdue   = isOverdue(order);
    const sm        = SM[order.status] || SM.CANCELADA;

    return (
      <div key={order.id} style={{
        background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderRadius: compact ? 10 : 12,
        padding: compact ? '12px 14px' : '16px 18px',
        border: isActive ? `1px solid ${primaryColor}50` : overdue ? '1px solid rgba(239,68,68,0.40)' : '1px solid rgba(255,255,255,0.10)',
        boxShadow: isActive ? `0 4px 20px ${primaryColor}25` : '0 4px 24px rgba(0,0,0,0.30)',
        opacity: isDone ? 0.65 : 1, marginBottom: 10,
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {order.product_name}
          </span>
          <span style={pill(`${PC[order.priority]}18`, PC[order.priority])}>{order.priority}</span>
          {overdue && <span style={pill('#fee2e2', '#ef4444')}>VENCIDA</span>}
        </div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.40)', fontWeight: 700, marginBottom: 8, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span>{order.order_number}</span>
          {order.asset_id && <span>⚙ {order.asset_id}</span>}
          {order.due_at && <span>📅 {fmtDate(order.due_at)}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.10)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#10b981' : primaryColor, borderRadius: 4 }} />
          </div>
          <span style={{ fontSize: 9, fontWeight: 800, color: '#f1f5f9', whiteSpace: 'nowrap' }}>{pct}%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
          <span style={pill(sm.bg, sm.color)}>{sm.label}</span>
          <div style={{ display: 'flex', gap: 5 }}>
            {progressInput?.id === order.id ? (
              <>
                <input autoFocus type="number" min="0" value={progressInput.value}
                  onChange={e => setProgressInput({ id: order.id, value: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && updateProgress(order.id, Number(progressInput.value))}
                  style={{ width: 72, padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', fontSize: 11, fontWeight: 700, outline: 'none', background: 'rgba(255,255,255,0.08)', color: '#f1f5f9' }}
                />
                <button onClick={() => updateProgress(order.id, Number(progressInput.value))} style={ab(primaryColor)}>✓</button>
                <button onClick={() => setProgressInput(null)} style={ab('#94a3b8')}>✕</button>
              </>
            ) : (
              <>
                {isPending && <button onClick={() => updateStatus(order.id, 'EN_PROCESO')} style={ab(primaryColor)}>INICIAR</button>}
                {isActive  && <button onClick={() => setProgressInput({ id: order.id, value: String(order.actual_quantity) })} style={ab('#64748b')}>+ AVANCE</button>}
                {isActive  && <button onClick={() => updateStatus(order.id, 'COMPLETADA')} style={ab('#10b981')}>COMPLETAR</button>}
                {!isDone   && <button onClick={() => cancelOrder(order.id)} style={ab('#ef4444')}>✕</button>}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Views ────────────────────────────────────────────────────────────────────
  const renderLista = () => {
    const filtered = statusFilter ? orders.filter(o => o.status === statusFilter) : orders;
    return (
      <>
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 10, padding: 3, width: 'fit-content', border: '1px solid rgba(255,255,255,0.10)' }}>
          {[{ key: null, label: 'TODAS' }, { key: 'EN_PROCESO', label: 'EN PROCESO' }, { key: 'PENDIENTE', label: 'PENDIENTE' }, { key: 'COMPLETADA', label: 'COMPLETADA' }, { key: 'CANCELADA', label: 'CANCELADA' }].map(tab => (
            <button key={String(tab.key)} onClick={() => setStatusFilter(tab.key)}
              style={{ padding: '6px 14px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 10, fontWeight: 800, letterSpacing: 0.5, fontFamily: 'inherit',
                background: statusFilter === tab.key ? 'rgba(255,255,255,0.14)' : 'transparent',
                color: statusFilter === tab.key ? primaryColor : 'rgba(255,255,255,0.45)',
                boxShadow: statusFilter === tab.key ? '0 1px 4px rgba(0,0,0,0.25)' : 'none',
              }}>
              {tab.label}
              {tab.key && statusCount(tab.key) > 0 && (
                <span style={{ marginLeft: 6, background: statusFilter === tab.key ? primaryColor : 'rgba(255,255,255,0.10)', color: statusFilter === tab.key ? 'white' : 'rgba(255,255,255,0.45)', borderRadius: 100, padding: '1px 6px', fontSize: 9 }}>
                  {statusCount(tab.key)}
                </span>
              )}
            </button>
          ))}
        </div>
        {filtered.length === 0
          ? <EmptyCard text={`No hay órdenes${statusFilter ? ` con estado ${statusFilter}` : ''}`} />
          : filtered.map(o => renderCard(o))}
      </>
    );
  };

  const renderKanban = () => {
    const cols = [
      { status: 'PENDIENTE',  label: 'PENDIENTE',  color: '#f59e0b' },
      { status: 'EN_PROCESO', label: 'EN PROCESO', color: '#3b82f6' },
      { status: 'COMPLETADA', label: 'COMPLETADA', color: '#10b981' },
    ];
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'start' }}>
        {cols.map(col => {
          const colOrders = orders.filter(o => o.status === col.status);
          return (
            <div key={col.status} style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 12, padding: '12px 10px', border: '1px solid rgba(255,255,255,0.10)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: `2px solid ${col.color}30` }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, boxShadow: `0 0 5px ${col.color}` }} />
                <span style={{ fontSize: 10, fontWeight: 800, color: '#f1f5f9', letterSpacing: 0.8 }}>{col.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 900, color: col.color, background: `${col.color}18`, padding: '2px 8px', borderRadius: 8 }}>
                  {colOrders.length}
                </span>
              </div>
              {colOrders.length === 0
                ? <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.30)', fontWeight: 700 }}>Sin órdenes</div>
                : colOrders.map(o => renderCard(o, true))}
            </div>
          );
        })}
      </div>
    );
  };

  const renderSemana = () => {
    const days      = getWeekDays();
    const today     = new Date().toDateString();
    const dayNames  = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
    const weekLabel = `${days[0].toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString('es-MX', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => setWeekOffset(p => p - 1)} style={navBtn}>‹ Anterior</button>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', letterSpacing: 0.3 }}>{weekLabel}</span>
          <button onClick={() => setWeekOffset(p => p + 1)} style={navBtn}>Siguiente ›</button>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} style={{ ...navBtn, background: `${primaryColor}12`, color: primaryColor, borderColor: `${primaryColor}40` }}>
              HOY
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, alignItems: 'start' }}>
          {days.map((day, i) => {
            const isToday   = day.toDateString() === today;
            const dayOrders = ordersForDay(day);
            return (
              <div key={i} style={{ background: isToday ? `${primaryColor}18` : 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 10, padding: '10px 8px', border: isToday ? `1px solid ${primaryColor}50` : '1px solid rgba(255,255,255,0.10)' }}>
                <div style={{ textAlign: 'center', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: 8, fontWeight: 800, color: isToday ? primaryColor : 'rgba(255,255,255,0.35)', letterSpacing: 1 }}>{dayNames[i]}</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: isToday ? primaryColor : '#f1f5f9', lineHeight: 1.2 }}>{day.getDate()}</div>
                </div>
                {dayOrders.length === 0 ? (
                  <div style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 16, height: 1, background: 'rgba(255,255,255,0.10)' }} />
                  </div>
                ) : dayOrders.map(o => (
                  <div key={o.id} style={{ marginBottom: 5, padding: '5px 7px', borderRadius: 7, background: `${PC[o.priority]}15`, borderLeft: `2px solid ${PC[o.priority]}` }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.product_name}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        {unscheduled.length > 0 && (
          <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 10, padding: '14px 18px', border: '1px solid rgba(255,255,255,0.10)' }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, marginBottom: 10 }}>SIN FECHA ({unscheduled.length})</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {unscheduled.map(o => (
                <div key={o.id} style={{ padding: '5px 10px', borderRadius: 8, background: `${PC[o.priority]}15`, border: `1px solid ${PC[o.priority]}30`, fontSize: 10, fontWeight: 700, color: '#f1f5f9' }}>
                  {o.product_name} <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.40)' }}>· {o.order_number}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  const renderMetricas = () => {
    if (!compliance) return <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', padding: 40, fontWeight: 700 }}>Cargando métricas...</div>;
    const total    = Number(compliance.total);
    const onTime   = Number(compliance.on_time);
    const late     = Number(compliance.late);
    const overdue  = Number(compliance.overdue);
    const denom    = onTime + late;
    const otdPct   = denom > 0 ? Math.round((onTime / denom) * 100) : null;
    const cycleHrs = Number(compliance.avg_cycle_hours);
    const otdColor = otdPct == null ? '#94a3b8' : otdPct >= 90 ? '#10b981' : otdPct >= 70 ? '#f59e0b' : '#ef4444';

    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'ÓRDENES 30 DÍAS', value: String(total), color: '#f1f5f9', sub: `${Number(compliance.completed)} completadas` },
            { label: 'CUMPLIMIENTO OTD', value: otdPct != null ? `${otdPct}%` : '—', color: otdColor, sub: `${onTime} a tiempo · ${late} tarde` },
            { label: 'VENCIDAS ACTIVAS', value: String(overdue), color: overdue > 0 ? '#ef4444' : '#10b981', sub: 'Sin completar y expiradas' },
            { label: 'CICLO PROMEDIO', value: `${cycleHrs}h`, color: '#3b82f6', sub: 'Inicio → Completada' },
          ].map(kpi => (
            <div key={kpi.label} style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.10)', padding: '16px 18px', boxShadow: '0 4px 24px rgba(0,0,0,0.30)' }}>
              <div style={{ fontSize: 8, fontWeight: 800, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, marginBottom: 8 }}>{kpi.label}</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: kpi.color, lineHeight: 1, marginBottom: 4 }}>{kpi.value}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.40)', fontWeight: 600 }}>{kpi.sub}</div>
            </div>
          ))}
        </div>
        {otdPct != null && (
          <div style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.10)', padding: '18px 20px', marginBottom: 14, boxShadow: '0 4px 24px rgba(0,0,0,0.30)' }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, marginBottom: 10 }}>DESGLOSE 30 DÍAS</div>
            <div style={{ display: 'flex', height: 22, borderRadius: 8, overflow: 'hidden', gap: 2 }}>
              {onTime > 0  && <div style={{ flex: onTime, background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#fff' }}>{onTime}</div>}
              {late > 0    && <div style={{ flex: late,   background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#fff' }}>{late}</div>}
              {overdue > 0 && <div style={{ flex: overdue, background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#fff' }}>{overdue}</div>}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              {[{ c: '#10b981', l: `A tiempo (${onTime})` }, { c: '#ef4444', l: `Con retraso (${late})` }, { c: '#f59e0b', l: `Vencidas activas (${overdue})` }].map(({ c, l }) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />{l}
                </div>
              ))}
            </div>
          </div>
        )}
        {compliance.trend?.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.10)', padding: '18px 20px', boxShadow: '0 4px 24px rgba(0,0,0,0.30)' }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, marginBottom: 12 }}>CUMPLIMIENTO SEMANAL</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 80 }}>
              {compliance.trend.map((w: any) => {
                const pct = Number(w.completed) > 0 ? Math.round((Number(w.on_time) / Number(w.completed)) * 100) : 0;
                const cl  = pct >= 90 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#ef4444';
                return (
                  <div key={w.week_start} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: cl }}>{pct}%</span>
                    <div style={{ width: '100%', background: 'rgba(255,255,255,0.08)', borderRadius: 5, height: 48, overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
                      <div style={{ width: '100%', height: `${pct}%`, background: cl, borderRadius: 5 }} />
                    </div>
                    <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.35)' }}>
                      {new Date(w.week_start).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24 }}>
      {/* View tabs + action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 10, padding: 3, gap: 2, border: '1px solid rgba(255,255,255,0.10)' }}>
          {(['lista', 'kanban', 'semana', 'metricas'] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: '6px 14px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 10, fontWeight: 800, letterSpacing: 0.5, fontFamily: 'inherit', transition: 'all 0.15s',
                background: view === v ? 'rgba(255,255,255,0.14)' : 'transparent',
                color: view === v ? primaryColor : 'rgba(255,255,255,0.45)',
                boxShadow: view === v ? '0 1px 4px rgba(0,0,0,0.25)' : 'none',
              }}>
              {v.toUpperCase()}
            </button>
          ))}
        </div>
        <button
          onClick={() => setModalOpen(true)}
          style={{ padding: '9px 18px', background: primaryColor, color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 10, fontWeight: 900, letterSpacing: 0.5, fontFamily: 'inherit' }}
        >
          + NUEVA ORDEN
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
          {[
            { key: 'EN_PROCESO', label: 'EN PROCESO',      color: '#3b82f6' },
            { key: 'PENDIENTE',  label: 'PENDIENTE',       color: '#f59e0b' },
            { key: 'COMPLETADA', label: 'COMPLETADAS HOY', color: '#10b981' },
          ].map(({ key, label, color }) => {
            const d = summary.byStatus?.[key];
            return (
              <div key={key} style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.10)', padding: '14px 18px', boxShadow: '0 4px 24px rgba(0,0,0,0.30)' }}>
                <div style={{ fontSize: 8, fontWeight: 800, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 32, fontWeight: 900, color, lineHeight: 1 }}>{d?.count || 0}</div>
                {d && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.40)', marginTop: 4 }}>{Number(d.total_actual).toLocaleString()} / {Number(d.total_target).toLocaleString()} pzs</div>}
              </div>
            );
          })}
          {compliance?.on_time != null && (
            <div style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.10)', padding: '14px 18px', boxShadow: '0 4px 24px rgba(0,0,0,0.30)' }}>
              <div style={{ fontSize: 8, fontWeight: 800, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, marginBottom: 6 }}>OTD 30 DÍAS</div>
              {(() => {
                const n = Number(compliance.on_time); const d = n + Number(compliance.late);
                const pct = d > 0 ? Math.round(n / d * 100) : null;
                return <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1, color: pct == null ? '#94a3b8' : pct >= 90 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#ef4444' }}>{pct != null ? `${pct}%` : '—'}</div>;
              })()}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => <div key={i} className="widget-skeleton" style={{ height: 90, borderRadius: 12 }} />)}
        </div>
      ) : (
        <>
          {view === 'lista'    && renderLista()}
          {view === 'kanban'   && renderKanban()}
          {view === 'semana'   && renderSemana()}
          {view === 'metricas' && renderMetricas()}
        </>
      )}

      <OrderFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={load}
        assets={allAssets}
        areas={allAreas}
        primaryColor={primaryColor}
      />
    </div>
  );
}

// ── Shared mini styles ────────────────────────────────────────────────────────
const pill = (bg: string, color: string): React.CSSProperties => ({
  fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 6, background: bg, color, flexShrink: 0,
});
const ab = (color: string): React.CSSProperties => ({
  padding: '4px 9px', border: `1px solid ${color}30`, borderRadius: 6, cursor: 'pointer',
  fontSize: 9, fontWeight: 800, color, background: `${color}10`, letterSpacing: 0.5, whiteSpace: 'nowrap', fontFamily: 'inherit',
});
const navBtn: React.CSSProperties = {
  padding: '6px 14px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9,
  cursor: 'pointer', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', background: 'rgba(255,255,255,0.07)', fontFamily: 'inherit',
};
function EmptyCard({ text }: { text: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.10)', padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 700 }}>
      {text}
    </div>
  );
}
