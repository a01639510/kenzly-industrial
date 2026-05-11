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
  let statusBg = 'rgba(255,255,255,0.08)';
  let statusTextColor = 'rgba(255,255,255,0.45)';

  if (percentage >= 90) {
    dynamicColor = '#ef4444';
    statusBg = 'rgba(239,68,68,0.18)';
    statusTextColor = '#fca5a5';
  } else if (percentage >= 70) {
    dynamicColor = '#f59e0b';
    statusBg = 'rgba(245,158,11,0.18)';
    statusTextColor = '#fcd34d';
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
          color: percentage >= 90 ? '#ef4444' : '#f1f5f9',
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

/** ESTILOS DARK GLASS */
const cardStyle = {
  position: 'relative' as const,
};

const labelStyle = {
  fontSize: '10px',
  fontWeight: '800',
  color: 'rgba(255,255,255,0.38)',
  margin: 0,
  letterSpacing: '1.2px',
  textTransform: 'uppercase' as const
};

const assetIdStyle = {
  fontSize: '9px',
  fontWeight: '600',
  color: 'rgba(255,255,255,0.28)'
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
  fontSize: '13px',
  color: 'rgba(255,255,255,0.40)',
  fontWeight: '700',
  fontFamily: robotoMono.style.fontFamily
};

const trackStyle = {
  width: '100%',
  height: '5px',
  backgroundColor: 'rgba(255,255,255,0.10)',
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
  color: 'rgba(255,255,255,0.28)',
  letterSpacing: '0.5px'
};

const pillStyle = {
  fontSize: '9px',
  fontWeight: '800',
  padding: '3px 9px',
  borderRadius: '100px',
  letterSpacing: '0.5px'
};

const footerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: '16px',
  paddingTop: '12px',
  borderTop: '1px solid rgba(255,255,255,0.07)',
  fontSize: '9px',
  fontWeight: '700',
  color: 'rgba(255,255,255,0.28)',
  textTransform: 'uppercase' as const
};