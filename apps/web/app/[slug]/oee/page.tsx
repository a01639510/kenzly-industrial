"use client"
import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useTenant } from '../../../contexts/TenantContext';
import { api } from '../../../lib/api';

interface OEESummary {
  availability: number; performance: number; quality: number; oee: number;
  details: {
    planned_minutes: number; downtime_minutes: number;
    actual_quantity: number; target_quantity: number; scrap_quantity: number;
  };
}
interface HistoryPoint { date: string; availability: number; performance: number; quality: number; oee: number; }

const oeeColor = (v: number) => v >= 85 ? '#10b981' : v >= 65 ? '#f59e0b' : '#ef4444';

export default function OEEPage() {
  const { primaryColor } = useTenant();
  const [summary, setSummary] = useState<OEESummary | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, h] = await Promise.all([api.oee.summary(), api.oee.history(14)]);
        setSummary(s); setHistory(h);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const fmtDate = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });

  return (
    <div style={{ padding: 24 }}>
      {loading ? (
        <div style={{ display: 'flex', gap: 16 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="widget-skeleton" style={{ flex: 1, height: 140, borderRadius: 12 }} />
          ))}
        </div>
      ) : !summary ? (
        <EmptyState text="Sin datos para calcular OEE hoy" />
      ) : (
        <>
          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
            {/* OEE principal */}
            <div style={{ ...card, border: `1px solid ${oeeColor(summary.oee)}28` }}>
              <Label>OEE HOY</Label>
              <div style={{ fontSize: 48, fontWeight: 900, color: oeeColor(summary.oee), lineHeight: 1, marginBottom: 6 }}>
                {summary.oee}%
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>
                {summary.oee >= 85 ? '✓ Clase mundial' : summary.oee >= 65 ? '~ Promedio industria' : '⚠ Requiere atención'}
              </div>
              <ProgressBar value={summary.oee} color={oeeColor(summary.oee)} />
            </div>

            {/* 3 componentes */}
            {[
              { label: 'DISPONIBILIDAD', value: summary.availability, desc: `${summary.details.downtime_minutes} min paros` },
              { label: 'RENDIMIENTO',    value: summary.performance,  desc: `${summary.details.actual_quantity} / ${summary.details.target_quantity} pzs` },
              { label: 'CALIDAD',        value: summary.quality,      desc: `${summary.details.scrap_quantity} pzs scrap` },
            ].map(comp => (
              <div key={comp.label} style={card}>
                <Label>{comp.label}</Label>
                <div style={{ fontSize: 40, fontWeight: 900, color: oeeColor(comp.value), lineHeight: 1, marginBottom: 6 }}>
                  {comp.value}%
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.40)', fontWeight: 600 }}>{comp.desc}</div>
                <ProgressBar value={comp.value} color={oeeColor(comp.value)} />
              </div>
            ))}
          </div>

          {/* Trend chart */}
          {history.length > 0 && (
            <div style={{ ...card, marginBottom: 16 }}>
              <Label>TENDENCIA — ÚLTIMOS 14 DÍAS</Label>
              <div style={{ marginTop: 16 }}>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart
                    data={history.map(h => ({ ...h, date: fmtDate(h.date) }))}
                    margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.07)" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.35)', fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.35)' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v: any) => `${v}%`}
                      contentStyle={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(13,17,23,0.92)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', fontSize: 11, color: '#f1f5f9' }}
                    />
                    <ReferenceLine y={85} stroke="#10b981" strokeDasharray="4 4"
                      label={{ value: 'Clase mundial', fill: '#10b981', fontSize: 9 }} />
                    <Line type="monotone" dataKey="oee" stroke={primaryColor} strokeWidth={2.5} dot={{ r: 3 }} name="OEE" />
                    <Line type="monotone" dataKey="availability" stroke="#3b82f6" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="Disponibilidad" />
                    <Line type="monotone" dataKey="performance" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="Rendimiento" />
                    <Line type="monotone" dataKey="quality" stroke="#10b981" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="Calidad" />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 20, marginTop: 12, justifyContent: 'center' }}>
                  {[{ c: primaryColor, l: 'OEE' }, { c: '#3b82f6', l: 'Disponibilidad' }, { c: '#f59e0b', l: 'Rendimiento' }, { c: '#10b981', l: 'Calidad' }].map(({ c, l }) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>
                      <div style={{ width: 12, height: 2, background: c, borderRadius: 2 }} />{l}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Details grid */}
          <div style={card}>
            <Label>DETALLE HOY</Label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 12 }}>
              {[
                { label: 'Tiempo planificado', value: `${summary.details.planned_minutes} min` },
                { label: 'Tiempo de paros',    value: `${summary.details.downtime_minutes} min`, alert: summary.details.downtime_minutes > 60 },
                { label: 'Producción real',    value: `${summary.details.actual_quantity.toLocaleString()} pzs` },
                { label: 'Meta de producción', value: `${summary.details.target_quantity.toLocaleString()} pzs` },
                { label: 'Scrap',              value: `${summary.details.scrap_quantity} pzs`, alert: summary.details.scrap_quantity > 0 },
              ].map(item => (
                <div key={item.label} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: (item as any).alert ? '#ef4444' : '#f1f5f9' }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.38)', letterSpacing: 1.5, marginBottom: 8 }}>{children}</div>;
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ marginTop: 12, height: 5, background: 'rgba(255,255,255,0.10)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 4 }} />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ ...card, padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 700 }}>
      {text}
    </div>
  );
}

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  borderRadius: 12, border: '1px solid rgba(255,255,255,0.10)',
  padding: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.30)',
};
