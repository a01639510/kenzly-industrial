"use client"
import React, { useEffect, useState, useCallback } from 'react';
import { useTenant } from '../../../contexts/TenantContext';
import { api } from '../../../lib/api';

interface ScrapRecord {
  id: string; asset_id: string | null; area_id: string | null; quantity: number;
  reason_category: string | null; reason_description: string | null;
  inspector: string | null; created_at: string;
  order_number: string | null; product_name: string | null;
}

const CAT_COLOR: Record<string, string> = {
  DIMENSIONAL: '#3b82f6', 'COSMÉTICO': '#8b5cf6', FUNCIONAL: '#f59e0b',
  MATERIAL: '#f97316', PROCESO: '#ef4444', OTRO: '#94a3b8',
};

export default function CalidadPage() {
  const { primaryColor, openScrapModal } = useTenant();
  const [records, setRecords] = useState<ScrapRecord[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([api.scrap.list(100), api.scrap.summary()]);
      setRecords(r); setSummary(s);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

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
          {/* Summary + action */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
            {summary && (
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', flex: 1 }}>
                {[
                  { label: 'SCRAP HOY',    value: summary.today.total, sub: `${summary.today.records} registros`, color: '#ef4444' },
                  { label: 'SCRAP SEMANA', value: summary.week.total,  sub: `${summary.week.records} registros`,  color: '#f97316' },
                ].map(c => (
                  <div key={c.label} style={kpiCard}>
                    <Label>{c.label}</Label>
                    <div style={{ fontSize: 36, fontWeight: 900, color: c.color, lineHeight: 1 }}>
                      {Number(c.value).toLocaleString()}
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.40)', marginLeft: 4 }}>pzs</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.40)', marginTop: 4 }}>{c.sub}</div>
                  </div>
                ))}
                {summary.byCategory.slice(0, 3).map((bc: any) => (
                  <div key={bc.reason_category} style={kpiCard}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_COLOR[bc.reason_category] || '#94a3b8' }} />
                      <Label>{bc.reason_category || 'SIN CAT.'}</Label>
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: CAT_COLOR[bc.reason_category] || 'rgba(255,255,255,0.50)', lineHeight: 1 }}>
                      {Number(bc.total).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.40)', marginTop: 4 }}>pzs esta semana</div>
                  </div>
                ))}
              </div>
            )}
            <button style={{ ...actionBtn, background: primaryColor, color: '#fff', border: 'none' }} onClick={openScrapModal}>
              + REGISTRAR SCRAP
            </button>
          </div>

          {/* Records table */}
          <div style={tableCard}>
            <div style={tableHeader}>
              <span style={tableTitle}>HISTORIAL ({records.length})</span>
            </div>
            {records.length === 0 ? (
              <EmptyTable text="Sin registros de scrap" />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr>
                      {['FECHA', 'ACTIVO', 'PRODUCTO', 'CANT.', 'TIPO', 'DESCRIPCIÓN', 'INSPECTOR'].map(h => (
                        <th key={h} style={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <td style={td}>{fmtDate(r.created_at)}</td>
                        <td style={td}>{r.asset_id || '—'}</td>
                        <td style={{ ...td, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.product_name || '—'}</td>
                        <td style={{ ...td, fontWeight: 800, color: '#ef4444' }}>{r.quantity.toLocaleString()}</td>
                        <td style={td}>
                          {r.reason_category ? (
                            <span style={catBadge(CAT_COLOR[r.reason_category] || '#94a3b8')}>
                              {r.reason_category}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ ...td, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.reason_description || '—'}
                        </td>
                        <td style={td}>{r.inspector || '—'}</td>
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

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 8, fontWeight: 800, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, marginBottom: 4 }}>{children}</div>;
}
function EmptyTable({ text }: { text: string }) {
  return <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 700 }}>{text}</div>;
}

const catBadge = (color: string): React.CSSProperties => ({
  fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 6,
  background: `${color}20`, color,
});

const kpiCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  borderRadius: 12, border: '1px solid rgba(255,255,255,0.10)',
  padding: '16px 20px', minWidth: 160, boxShadow: '0 4px 24px rgba(0,0,0,0.30)',
};
const tableCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  borderRadius: 12, border: '1px solid rgba(255,255,255,0.10)',
  overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.30)',
};
const tableHeader: React.CSSProperties = {
  padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
};
const tableTitle: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.55)', letterSpacing: 1,
};
const th: React.CSSProperties = {
  padding: '9px 16px', textAlign: 'left', fontSize: 9, fontWeight: 800,
  color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, background: 'rgba(255,255,255,0.04)',
  borderBottom: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap',
};
const td: React.CSSProperties = {
  padding: '11px 16px', color: 'rgba(255,255,255,0.68)', fontWeight: 600, whiteSpace: 'nowrap',
};
const actionBtn: React.CSSProperties = {
  padding: '9px 18px', borderRadius: 9, cursor: 'pointer',
  fontSize: 10, fontWeight: 900, letterSpacing: 0.5, flexShrink: 0,
};
