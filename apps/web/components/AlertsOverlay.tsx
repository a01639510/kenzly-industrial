"use client"
import React from 'react';

interface Alert {
  widgetId: string;
  label: string;
  value: number;
  threshold: number;
  unit?: string;
}

export function useAlerts(manifest: any, telemetry: Record<string, any>, view: string) {
  const alerts: Alert[] = [];

  if (!manifest?.areas) return alerts;

  for (const areaId in manifest.areas) {
    const widgets = manifest.areas[areaId][view]?.widgets || [];
    for (const w of widgets) {
      if ((w.type !== 'GAUGE' && w.type !== 'SEMI_DONUT') || !w.props.alertThreshold) continue;
      const widgetKey = `${w.props.assetId}-${w.props.key}`;
      const tData = telemetry[widgetKey];
      if (!tData) continue;
      const value = Number(tData.value) || 0;
      const threshold = Number(w.props.alertThreshold);
      if (value > threshold) {
        alerts.push({ widgetId: w.id, label: w.props.label || w.props.assetId, value, threshold, unit: w.props.unit });
      }
    }
  }

  return alerts;
}

export default function AlertsOverlay({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <span style={{ fontSize: '11px', fontWeight: '900', letterSpacing: '1px' }}>
          ALERTAS ACTIVAS ({alerts.length})
        </span>
      </div>
      {alerts.map(a => (
        <div key={a.widgetId} style={alertRowStyle}>
          <div style={dotStyle} />
          <div>
            <span style={labelStyle}>{a.label.toUpperCase()}</span>
            <span style={valueStyle}>
              {a.value.toLocaleString()} {a.unit} &gt; umbral {a.threshold.toLocaleString()} {a.unit}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  position: 'fixed', bottom: '24px', right: '24px', zIndex: 999,
  backgroundColor: '#7f1d1d', borderRadius: '16px', padding: '16px 20px',
  boxShadow: '0 20px 40px rgba(239,68,68,0.3)', border: '1px solid #ef4444',
  minWidth: '280px', maxWidth: '360px',
};
const headerStyle: React.CSSProperties = {
  color: '#fca5a5', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px'
};
const alertRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: '10px', paddingBottom: '8px',
  borderBottom: '1px solid rgba(239,68,68,0.2)', marginBottom: '8px'
};
const dotStyle: React.CSSProperties = {
  width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444',
  marginTop: '4px', flexShrink: 0, boxShadow: '0 0 8px #ef4444'
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '10px', fontWeight: '800', color: '#fca5a5', letterSpacing: '0.5px'
};
const valueStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', color: '#fecaca', marginTop: '2px'
};
