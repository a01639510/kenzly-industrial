"use client"
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

interface HistoryEntry {
  timestamp: string;
  value: number;
}

export default function ProductionPerHourWidget({ data, history = [], color, goalPPH = 100 }: any) {
  const subKey = data?.props?.subKey;
  const rawTelemetry = data?.latestData;
  const currentValue = (() => {
    if (subKey && rawTelemetry?.metadata?.[subKey] !== undefined) {
      const s = rawTelemetry.metadata[subKey];
      return Number(s?.value ?? s?.raw ?? s) || 0;
    }
    return Number(rawTelemetry?.value) || 0;
  })();
  const label = data?.props?.label || "Producción por Hora";

  // 2. Procesar datos para la gráfica
  // Si el backend envía 'timestamp', lo formateamos para que solo muestre la hora
  const chartData = history.map((entry: HistoryEntry) => ({
    time: new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    pph: Number(entry.value)
  }));

  // Si no hay historial, mostramos un estado de carga o mensaje
  if (chartData.length === 0) {
    return (
      <div style={{ padding: '10px', textAlign: 'center' }}>
        <h3 style={labelStyle}>{label.toUpperCase()}</h3>
        <div style={valueStyle}>{currentValue} <span style={unitStyle}>pzs</span></div>
        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>Esperando datos históricos...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '220px', display: 'flex', flexDirection: 'column' }}>
      {/* Header del Widget */}
      <div style={{ marginBottom: '15px' }}>
        <h3 style={labelStyle}>{label.toUpperCase()}</h3>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <span style={valueStyle}>{currentValue}</span>
          <span style={unitStyle}>PPH ACTUAL</span>
          <div style={goalBadgeStyle}>
            META: {goalPPH}
          </div>
        </div>
      </div>

      {/* Gráfica */}
      <div style={{ flex: 1, width: '100%', marginTop: '10px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)', fontWeight: 'bold' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.10)', backgroundColor: 'rgba(15,30,22,0.95)', color: '#f1f5f9', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
            />
            {/* Línea de Meta */}
            <ReferenceLine y={goalPPH} stroke="#ef4444" strokeDasharray="3 3" />
            
            <Bar dataKey="pph" radius={[4, 4, 0, 0]} barSize={20}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.pph >= goalPPH ? (color || '#3b82f6') : '#94a3b8'} 
                  fillOpacity={entry.pph >= goalPPH ? 1 : 0.4}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Estilos rápidos
const labelStyle: React.CSSProperties = { fontSize: '10px', fontWeight: '900', color: 'rgba(255,255,255,0.38)', letterSpacing: '1px', margin: 0 };
const valueStyle: React.CSSProperties = { fontSize: '32px', fontWeight: '900', color: '#f1f5f9', lineHeight: '1' };
const unitStyle: React.CSSProperties = { fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.38)' };
const goalBadgeStyle: React.CSSProperties = { fontSize: '9px', fontWeight: '900', color: '#fca5a5', backgroundColor: 'rgba(239,68,68,0.15)', padding: '2px 8px', borderRadius: '4px', marginLeft: 'auto' };