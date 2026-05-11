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

  let dynamicColor = color;
  let statusBg = 'rgba(0,0,0,0.06)';
  let statusTextColor = 'rgba(15,23,42,0.50)';

  if (percentage >= 90) {
    dynamicColor = '#ef4444';
    statusBg = 'rgba(239,68,68,0.14)';
    statusTextColor = '#b91c1c';
  } else if (percentage >= 70) {
    dynamicColor = '#f59e0b';
    statusBg = 'rgba(245,158,11,0.14)';
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
            boxShadow: `0 0 8px ${connectionColors[connectionStatus]}88`
          }} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '20px' }}>
        <span style={{
          ...valueStyle,
          color: percentage >= 90 ? '#ef4444' : '#0f172a',
        }}>
          {displayValue.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </span>
        <span style={unitStyle}>{unit.toUpperCase()}</span>
      </div>

      <div style={trackStyle}>
        <div style={{
          ...progressStyle,
          width: `${percentage}%`,
          backgroundColor: dynamicColor,
          boxShadow: `0 0 12px ${dynamicColor}44`
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
         <span style={minMaxStyle}>0%</span>
         <span style={minMaxStyle}>LIMITE: {maxValue}</span>
      </div>

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

const cardStyle = {
  position: 'relative' as const,
};

const labelStyle = {
  fontSize: '10px',
  fontWeight: '800',
  color: 'rgba(15,23,42,0.55)',
  margin: 0,
  letterSpacing: '1.2px',
  textTransform: 'uppercase' as const
};

const assetIdStyle = {
  fontSize: '9px',
  fontWeight: '600',
  color: 'rgba(15,23,42,0.38)'
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
  color: 'rgba(15,23,42,0.42)',
  fontWeight: '700',
  fontFamily: robotoMono.style.fontFamily
};

const trackStyle = {
  width: '100%',
  height: '5px',
  backgroundColor: 'rgba(0,0,0,0.10)',
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
  color: 'rgba(15,23,42,0.35)',
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
  borderTop: '1px solid rgba(0,0,0,0.08)',
  fontSize: '9px',
  fontWeight: '700',
  color: 'rgba(15,23,42,0.35)',
  textTransform: 'uppercase' as const
};
