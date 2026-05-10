"use client"
import React from 'react';
import { Roboto_Mono } from 'next/font/google';

const robotoMono = Roboto_Mono({ subsets: ['latin'], display: 'swap' });

interface GaugeWidgetProps {
  data: {
    id: string;
    type: string;
    latestData?: {
        value: number;
        timestamp?: string;
        metadata?: any;
    };
    props: {
      label?: string;
      assetId: string;
      key: string;
      unit?: string;
      maxValue?: number;
      subKey?: string;
    };
  };
  color: string;
}

export default function GaugeWidget({ data, color }: GaugeWidgetProps) {
  const { 
    assetId, 
    key, 
    label, 
    maxValue = 100, 
    unit = '' 
  } = data.props;

  const subKey = data.props.subKey;
  const rawTelemetry = data.latestData;
  const displayValue = (() => {
    if (subKey && rawTelemetry?.metadata?.[subKey] !== undefined) {
      const s = rawTelemetry.metadata[subKey];
      return Number(s?.value ?? s?.raw ?? s) || 0;
    }
    return Number(rawTelemetry?.value) || 0;
  })();
  const timestamp = rawTelemetry?.timestamp;
  const percentage = Math.min((displayValue / maxValue) * 100, 100);
  
  // Lógica de colores Modern Soft
  let dynamicColor = color;
  let statusBg = 'rgba(0, 0, 0, 0.03)';
  let statusTextColor = '#64748b';

  if (percentage >= 90) {
    dynamicColor = '#ef4444';
    statusBg = '#fee2e2';
    statusTextColor = '#991b1b';
  } else if (percentage >= 70) {
    dynamicColor = '#f59e0b';
    statusBg = '#fef3c7';
    statusTextColor = '#92400e';
  }

  const connectionColors = {
    green: '#10b981', 
    yellow: '#f59e0b', 
    red: '#ef4444'    
  };
  const connectionStatus = !assetId || !key ? 'red' : (data.latestData ? 'green' : 'yellow');

  return (
    <div style={cardStyle}>
      {/* HEADER: Etiquetas pequeñas y Status Dot */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
        <div>
          <h3 style={labelStyle}>{label || 'MÉTRICA'}</h3>
          <span style={assetIdStyle}>{assetId}</span>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {percentage >= 70 && (
            <div style={{ ...pillStyle, backgroundColor: statusBg, color: statusTextColor }}>
              {percentage >= 90 ? 'CRÍTICO' : 'ALERTA'}
            </div>
          )}
          <div style={{ 
            width: '8px', height: '8px', borderRadius: '50%', 
            backgroundColor: connectionColors[connectionStatus],
            boxShadow: `0 0 10px ${connectionColors[connectionStatus]}66`
          }} />
        </div>
      </div>

      {/* VALOR PRINCIPAL: Grande y contundente como en la imagen */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '20px' }}>
        <span style={{ 
          ...valueStyle, 
          color: percentage >= 90 ? '#ef4444' : '#1e293b',
        }}>
          {displayValue.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </span>
        <span style={unitStyle}>{unit.toUpperCase()}</span>
      </div>

      {/* BARRA DE PROGRESO: Minimalista y redondeada */}
      <div style={trackStyle}>
        <div style={{ 
          ...progressStyle, 
          width: `${percentage}%`, 
          backgroundColor: dynamicColor,
          boxShadow: `0 0 15px ${dynamicColor}44`
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
         <span style={minMaxStyle}>0%</span>
         <span style={minMaxStyle}>LIMITE: {maxValue}</span>
      </div>
      
      {/* FOOTER: Datos técnicos con transparencia */}
      <div style={footerStyle}>
         <span style={{ letterSpacing: '0.5px' }}>
            {data.props.subKey || key || 'SENSOR'}
         </span>
         
         {timestamp && (
            <span>{new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
         )}
      </div>
    </div>
  );
}

/** * ESTILOS SOFT UI / MODERN GAUGE 
 */
const cardStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.5)',
  backdropFilter: 'blur(10px)',
  borderRadius: '32px',
  padding: '24px',
  border: '1px solid rgba(255, 255, 255, 0.6)',
  position: 'relative' as const,
  transition: 'transform 0.2s ease',
};

const labelStyle = {
  fontSize: '11px',
  fontWeight: '800',
  color: '#94a3b8',
  margin: 0,
  letterSpacing: '1px',
  textTransform: 'uppercase' as const
};

const assetIdStyle = {
  fontSize: '10px',
  fontWeight: '600',
  color: '#cbd5e1'
};

const valueStyle = {
  fontSize: '3.2rem',
  fontWeight: '800',
  fontFamily: robotoMono.style.fontFamily,
  letterSpacing: '-2px',
  lineHeight: 1,
  transition: 'color 0.3s ease'
};

const unitStyle = {
  fontSize: '14px',
  color: '#94a3b8',
  fontWeight: '700',
  fontFamily: robotoMono.style.fontFamily
};

const trackStyle = {
  width: '100%',
  height: '6px',
  backgroundColor: 'rgba(0,0,0,0.04)',
  borderRadius: '100px',
  overflow: 'hidden'
};

const progressStyle = {
  height: '100%',
  borderRadius: '100px',
  transition: 'width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)' 
};

const minMaxStyle = {
  fontSize: '9px',
  fontWeight: '700',
  color: '#cbd5e1',
  letterSpacing: '0.5px'
};

const pillStyle = {
  fontSize: '9px',
  fontWeight: '800',
  padding: '4px 10px',
  borderRadius: '100px',
  letterSpacing: '0.5px'
};

const footerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: '20px',
  paddingTop: '15px',
  borderTop: '1px solid rgba(0,0,0,0.03)',
  fontSize: '9px',
  fontWeight: '700',
  color: '#cbd5e1',
  textTransform: 'uppercase' as const
};