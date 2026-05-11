"use client"
import React, { useEffect, useState } from 'react';
import { useTenant } from '../../../contexts/TenantContext';
import { api } from '../../../lib/api';

interface DowntimeEvent {
  id: string; asset_id: string | null; area_id: string | null;
  started_at: string; ended_at: string; duration_minutes: number;
  cause_label: string | null; cause_category: string | null;
  cause_description: string | null; responsible: string | null;
}

interface Summary {
  today: { count: string; total_minutes: string };
  week:  { count: string; total_minutes: string };
  byCategory: { category: string; count: string; total_minutes: string }[];
}

const CAT_COLORS: Record<string, string> = {
  'MECÁNICO':  '#3b82f6', 'ELÉCTRICO': '#f59e0b',
  'OPERATIVO': '#10b981', 'CALIDAD':   '#8b5cf6',
  'MATERIAL':  '#f97316', 'OTRO':      '#94a3b8',
};

export default function ParosPage() {
  const { primaryColor, openDowntimeModal } = useTenant();
  const [events,  setEvents]  = useState<DowntimeEvent[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [e, s] = await Promise.all([
          api.downtime.history({ limit: '100' }),
          api.downtime.summary(),
        ]);
        setEvents(e); setSummary(s);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const fmtDur = (min: number) =>
    !min ? '< 1 min' : min < 60 ? `${min} min` : `${Math.floor(min / 60)}h ${min % 60}m`;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ padding: 24 }}>
      {loading ? (
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          {[1, 2, 3].map(i => <div key={i} className="widget-skeleton" style={{ flex: 1, height: 100, borderRadius: 12 }} />)}
        </div>
      ) : (
        <>
          {/* Summary row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
            {summary && (
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', flex: 1 }}>
                <KpiCard label="PAROS HOY"    value={summary.today.count} sub={`${fmtDur(Number(summary.today.total_minutes))} perdido`} color={primaryColor} />
                <KpiCard label="PAROS SEMANA" value={summary.week.count}  sub={`${fmtDur(Number(summary.week.total_minutes))} perdido`}  color={primaryColor} />
                {summary.byCategory.slice(0, 2).map(bc => (
                  <KpiCard
                    key={bc.category}
                    label={bc.category || 'SIN CATEGORÍA'}
                    value={bc.count}
                    sub={`${fmtDur(Number(bc.total_minutes))} esta semana`}
                    color={CAT_COLORS[bc.category] || '#94a3b8'}
                  />
                ))}
              </div>
            )}
            <button
              style={{ padding: '9px 18px', background: primaryColor, color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 10, fontWeight: 900, letterSpacing: 0.5, flexShrink: 0 }}
              onClick={openDowntimeModal}
            >
              + REGISTRAR PARO
            </button>
          </div>

          {/* Events table */}
          <div style={tableCard}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.55)', letterSpacing: 1 }}>
                HISTORIAL DE PAROS ({events.length})
              </span>
            </div>
            {events.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 700 }}>
                Sin paros registrados
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr>
                      {['INICIO', 'ACTIVO', 'ÁREA', 'CATEGORÍA', 'CAUSA', 'DURACIÓN', 'RESPONSABLE'].map(h => (
                        <th key={h} style={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {events.map(ev => (
                      <tr key={ev.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <td style={td}>{fmtDate(ev.started_at)}</td>
                        <td style={td}>{ev.asset_id || '—'}</td>
                        <td style={td}>{ev.area_id || '—'}</td>
                        <td style={td}>
                          {ev.cause_category ? (
                            <span style={catBadge(CAT_COLORS[ev.cause_category] || '#94a3b8')}>
                              {ev.cause_category}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ ...td, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ev.cause_label || ev.cause_description || '—'}
                        </td>
                        <td style={{ ...td, fontWeight: 800, color: Number(ev.duration_minutes) > 30 ? '#ef4444' : '#f1f5f9' }}>
                          {fmtDur(ev.duration_minutes)}
                        </td>
                        <td style={td}>{ev.responsible || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.10)', padding: '16px 20px', minWidth: 160, boxShadow: '0 4px 24px rgba(0,0,0,0.30)' }}>
      <div style={{ fontSize: 8, fontWeight: 800, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 36, fontWeight: 900, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.40)' }}>{sub}</div>
    </div>
  );
}

const catBadge = (color: string): React.CSSProperties => ({
  fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 6,
  background: `${color}20`, color,
});
const tableCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  borderRadius: 12, border: '1px solid rgba(255,255,255,0.10)',
  overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.30)',
};
const th: React.CSSProperties = {
  padding: '9px 16px', textAlign: 'left', fontSize: 9, fontWeight: 800,
  color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, background: 'rgba(255,255,255,0.04)',
  borderBottom: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap',
};
const td: React.CSSProperties = {
  padding: '12px 16px', color: 'rgba(255,255,255,0.68)', fontWeight: 600, whiteSpace: 'nowrap',
};
