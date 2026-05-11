// apps/web/components/widgets/ProductionWidget.tsx
import React from 'react';
import { Roboto_Mono } from 'next/font/google';

const robotoMono = Roboto_Mono({ subsets: ['latin'], display: 'swap' });

interface ProductionWidgetProps {
  data: {
    id: string;
    title: string;
    type: 'PRODUCTION_STATS'; // Aseguramos el tipo
    props: {
      value: number; // Valor actual
      unit?: string;
      suffix?: string;
      target?: number; // Para mostrar un objetivo, si aplica
    };
  };
  color: string;
  latestTelemetry?: { // Para futuros datos reales
    value: number;
    unit: string;
    timestamp: string;
  } | null;
}

export default function ProductionWidget({ data, color, latestTelemetry }: ProductionWidgetProps) {
  const displayValue = latestTelemetry ? latestTelemetry.value : data.props.value;
  const displayUnit = latestTelemetry ? latestTelemetry.unit : (data.props.unit || data.props.suffix);
  const progress = data.props.target ? (displayValue / data.props.target) * 100 : 0;

  return (
    <div
      key={data.id}
      style={{
        borderLeft: `3px solid ${color}`,
        paddingLeft: '16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
        <h3 style={{ color: 'rgba(255,255,255,0.40)', fontSize: '0.78rem', fontWeight: '800', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
          {data.title}
        </h3>
        <div className="status-pulse" style={{ 
          width: '10px', 
          height: '10px', 
          borderRadius: '50%', 
          backgroundColor: '#40c057', 
          boxShadow: '0 0 10px #40c057' 
        }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
        <span style={{
          fontSize: '3rem',
          fontWeight: '800',
          color: '#f1f5f9',
          fontFamily: robotoMono.style.fontFamily
        }}>
          {displayValue.toLocaleString()}
        </span>
        <span style={{
          fontSize: '1rem',
          color: 'rgba(255,255,255,0.40)',
          fontFamily: robotoMono.style.fontFamily
        }}>
          {displayUnit}
        </span>
      </div>

      {data.props.target && (
        <div style={{ marginTop: '1.2rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.40)' }}>
          <span>Objetivo: {data.props.target.toLocaleString()} {displayUnit}</span>
          <div style={{ width: '100%', height: '5px', backgroundColor: 'rgba(255,255,255,0.10)', marginTop: '6px', borderRadius: '100px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, progress)}%`, height: '100%', backgroundColor: color, transition: 'width 1s ease-in-out', borderRadius: '100px' }} />
          </div>
        </div>
      )}

      {latestTelemetry && (
        <p style={{
          fontSize: '0.65rem',
          color: 'rgba(255,255,255,0.28)',
          marginTop: '10px',
          marginRight: 0,
          textAlign: 'right',
          fontFamily: robotoMono.style.fontFamily
        }}>
          ACTUALIZACIÓN: {new Date(latestTelemetry.timestamp).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}