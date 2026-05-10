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
        background: 'white', 
        padding: '1.8rem', 
        borderRadius: '4px', 
        borderLeft: `6px solid ${color}`, 
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)' 
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ color: '#495057', fontSize: '0.85rem', fontWeight: '700', margin: 0, textTransform: 'uppercase' }}>
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
          fontSize: '3.2rem', 
          fontWeight: '700', 
          color: '#212529', 
          fontFamily: robotoMono.style.fontFamily 
        }}>
          {displayValue.toLocaleString()}
        </span>
        <span style={{ 
          fontSize: '1.2rem', 
          color: '#adb5bd', 
          fontFamily: robotoMono.style.fontFamily 
        }}>
          {displayUnit}
        </span>
      </div>

      {data.props.target && (
        <div style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: '#666' }}>
          <span>Objetivo: {data.props.target.toLocaleString()} {displayUnit}</span>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#e9ecef', marginTop: '5px', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, progress)}%`, height: '100%', backgroundColor: color, transition: 'width 1s ease-in-out' }} />
          </div>
        </div>
      )}

      {latestTelemetry && (
        <p style={{ 
          fontSize: '0.7rem', 
          color: '#adb5bd', 
          marginTop: '10px', 
          marginRight: 0,
          textAlign: 'right',
          fontFamily: robotoMono.style.fontFamily 
        }}>
          ÚLTIMA ACTUALIZACIÓN: {new Date(latestTelemetry.timestamp).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}