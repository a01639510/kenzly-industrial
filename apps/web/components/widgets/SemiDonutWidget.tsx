"use client"
import React from 'react';
import { Roboto_Mono } from 'next/font/google';

const robotoMono = Roboto_Mono({ subsets: ['latin'], display: 'swap' });

export default function SemiDonutWidget({ data, color = "#10b981" }: any) {
  const subKey = data.props?.subKey;
  const rawTelemetry = data.latestData;
  const displayValue = (() => {
    if (subKey && rawTelemetry?.metadata?.[subKey] !== undefined) {
      const s = rawTelemetry.metadata[subKey];
      return Number(s?.value ?? s?.raw ?? s) || 0;
    }
    return Number(rawTelemetry?.value) || 0;
  })();
  const timestamp = rawTelemetry?.timestamp; 
  const label = data.props?.label || "KPI";
  const unit = data.props?.unit || "";
  const maxValue = Number(data.props?.maxValue) || 100;

  // Lógica de Recencia
  const getRecency = () => {
    if (!timestamp) return null;
    const diff = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 60000);
    if (diff < 1) return 'AHORA';
    if (diff >= 60) return `${Math.floor(diff / 60)}H`;
    return `${diff} MIN`;
  };

  const recencyText = getRecency();
  const percentage = Math.min((displayValue / maxValue) * 100, 100);

  return (
    <div style={containerStyle}>
      {/* HEADER */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={labelStyle}>{label.toUpperCase()}</span>
          {recencyText && (
            <span style={timeStyle}>
              <span style={pulseDot(color)} /> {recencyText}
            </span>
          )}
        </div>
        <div style={statusPill(percentage)}>
          {Math.round(percentage)}%
        </div>
      </div>

      {/* ÁREA DEL GRÁFICO - Ajustada para centrado total */}
      <div style={chartAreaStyle}>
        <div style={arcBackgroundStyle}>
          {/* Arco de progreso */}
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            background: `conic-gradient(from 0.75turn at 50% 100%, ${color} 0%, ${color} ${percentage / 2}%, rgba(0,0,0,0.05) 0deg)`,
            transition: 'all 1.5s cubic-bezier(0.22, 1, 0.36, 1)',
          }} />
          
          {/* Centro (Hueco) */}
          <div style={innerHoleStyle}>
            <div style={valueContainer}>
              <div style={valueStyle}>
                {displayValue.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              </div>
              <div style={unitStyle}>{unit.toUpperCase()}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* FOOTER */}
      <div style={footerStyle}>
        <span style={limitLabel}>0</span>
        <div style={trendLine(color, percentage)} />
        <span style={limitLabel}>{maxValue}</span>
      </div>
    </div>
  );
}

/** --- ESTILOS CORREGIDOS PARA MEJOR ACOMODO --- */

const containerStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.5)',
  backdropFilter: 'blur(10px)',
  borderRadius: '28px',
  padding: '20px',
  border: '1px solid rgba(255, 255, 255, 0.7)',
  display: 'flex',
  flexDirection: 'column' as const,
  justifyContent: 'space-between',
  height: '100%', // Para que llene el slot del grid
  minHeight: '220px',
  boxSizing: 'border-box' as const
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '10px'
};

const labelStyle = { fontSize: '10px', fontWeight: '900', color: '#94a3b8', letterSpacing: '1px' };

const timeStyle = { 
  fontSize: '8px', fontWeight: '700', color: '#cbd5e1', 
  display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' 
};

const pulseDot = (c: string) => ({
  width: '4px', height: '4px', borderRadius: '50%', backgroundColor: c,
  boxShadow: `0 0 6px ${c}`
});

const statusPill = (pct: number) => ({
  fontSize: '9px', fontWeight: '900', padding: '2px 8px', borderRadius: '8px',
  backgroundColor: pct > 90 ? '#fee2e2' : 'rgba(0,0,0,0.03)',
  color: pct > 90 ? '#ef4444' : '#64748b'
});

const chartAreaStyle = {
  flex: 1,
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  paddingBottom: '10px',
  position: 'relative' as const
};

const arcBackgroundStyle = {
  width: '100%',
  maxWidth: '180px',
  aspectRatio: '2 / 1', // Mantiene la forma de semicírculo perfecta
  backgroundColor: 'rgba(0,0,0,0.03)',
  borderTopLeftRadius: '500px',
  borderTopRightRadius: '500px',
  position: 'relative' as const,
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center'
};

const innerHoleStyle = {
  width: '75%',
  height: '75%',
  backgroundColor: 'white',
  borderTopLeftRadius: '500px',
  borderTopRightRadius: '500px',
  zIndex: 2,
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  paddingBottom: '10px'
};

const valueContainer = { textAlign: 'center' as const };

const valueStyle = { 
  fontSize: '1.8rem', 
  fontWeight: '800', 
  color: '#1e293b', 
  lineHeight: 1,
  fontFamily: robotoMono.style.fontFamily,
  letterSpacing: '-1px'
};

const unitStyle = { fontSize: '8px', color: '#cbd5e1', fontWeight: '900', marginTop: '2px' };

const footerStyle = { 
  display: 'flex', 
  alignItems: 'center', 
  gap: '10px', 
  marginTop: '10px' 
};

const limitLabel = { fontSize: '9px', fontWeight: '800', color: '#cbd5e1' };

const trendLine = (c: string, pct: number) => ({
  flex: 1,
  height: '2px',
  backgroundColor: 'rgba(0,0,0,0.03)',
  position: 'relative' as const,
  borderRadius: '2px'
});