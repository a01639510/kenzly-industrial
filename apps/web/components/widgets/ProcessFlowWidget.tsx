"use client"
import React from 'react';
import { Roboto_Mono } from 'next/font/google';

const robotoMono = Roboto_Mono({ subsets: ['latin'], display: 'swap' });

export default function ProcessFlowWidget({ data, color = '#38bdf8', allTelemetry }: any) {
  const { label, stations = [] } = data.props;

  const getStationStatus = (assetId: string) => {
    // Intentamos leer el estado. Si no hay telemetría, asumimos 0 (inactivo)
    const status = allTelemetry?.[`${assetId}-STATUS`] || allTelemetry?.[`${assetId}-value`] || 0;
    return Number(status) > 0;
  };

  return (
    <div style={containerStyle}>
      {/* HEADER CON INDICADOR GLOBAL */}
      <div style={headerStyle}>
        <div>
          <h3 style={labelStyle}>{label || 'LÍNEA DE PRODUCCIÓN'}</h3>
          <span style={subLabelStyle}>{stations.length} ESTACIONES CONFIGURADAS</span>
        </div>
        <div style={liveBadge}>
          <div style={pulseDot} />
          REAL-TIME
        </div>
      </div>

      <div style={flowWrapper}>
        {stations.map((station: any, idx: number) => {
          const isActive = getStationStatus(station.assetId);
          const isLast = idx === stations.length - 1;
          
          return (
            <React.Fragment key={station.id || idx}>
              {/* NODO DE LA ESTACIÓN */}
              <div style={nodeWrapper}>
                <div style={nodeIconContainer(isActive, color)}>
                  {/* Círculo de Pulso (Efecto de onda si está activo) */}
                  {isActive && <div style={pingAnimation(color)} />}
                  
                  <div style={nodeInner(isActive, color)}>
                     <span style={{ fontSize: '14px', fontWeight: '900' }}>
                        {station.name ? station.name.substring(0, 2).toUpperCase() : '??'}
                     </span>
                  </div>
                </div>
                
                <div style={nodeTextContent}>
                  <div style={nodeName(isActive)}>{station.name}</div>
                  <div style={nodeAssetId}>{station.assetId}</div>
                  <div style={statusText(isActive, color)}>{isActive ? 'RUNNING' : 'IDLE'}</div>
                </div>
              </div>

              {/* CONECTOR DE FLUJO INTELIGENTE */}
              {!isLast && (
                <div style={connectorTrack}>
                  <div style={connectorLine}>
                    {isActive && (
                      <div className="flow-energy" style={energyAnimation(color)} />
                    )}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes flowEnergy {
          0% { left: -20%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { left: 120%; opacity: 0; }
        }
        @keyframes custom-ping {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/** --- ESTILOS COMPLETO SOFT UI --- */

const containerStyle = {
  background: 'rgba(255, 255, 255, 0.4)',
  backdropFilter: 'blur(12px)',
  borderRadius: '32px',
  padding: '24px 32px',
  border: '1px solid rgba(255, 255, 255, 0.6)',
  boxShadow: '0 10px 30px -10px rgba(0,0,0,0.03)',
  width: '100%',
  boxSizing: 'border-box' as const
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '35px'
};

const labelStyle = {
  margin: 0,
  fontSize: '11px',
  fontWeight: '900',
  color: '#94a3b8',
  letterSpacing: '1.5px'
};

const subLabelStyle = {
  fontSize: '9px',
  fontWeight: '700',
  color: '#cbd5e1'
};

const liveBadge = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '4px 10px',
  borderRadius: '100px',
  backgroundColor: 'white',
  fontSize: '9px',
  fontWeight: '800',
  color: '#64748b',
  boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
};

const pulseDot = {
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  backgroundColor: '#10b981'
};

const flowWrapper = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 0'
};

const nodeWrapper = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  zIndex: 10
};

const nodeIconContainer = (active: boolean, color: string) => ({
  position: 'relative' as const,
  width: '56px',
  height: '56px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '12px'
});

const nodeInner = (active: boolean, color: string) => ({
  width: '100%',
  height: '100%',
  borderRadius: '20px',
  backgroundColor: active ? color : 'white',
  color: active ? 'white' : '#cbd5e1',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2,
  boxShadow: active ? `0 10px 20px ${color}44` : '0 4px 10px rgba(0,0,0,0.03)',
  border: active ? `2px solid white` : '2px solid #f1f5f9',
  transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
});

const pingAnimation = (color: string) => ({
  position: 'absolute' as const,
  width: '100%',
  height: '100%',
  borderRadius: '20px',
  backgroundColor: color,
  opacity: 0.4,
  animation: 'custom-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
  zIndex: 1
});

const nodeTextContent = { textAlign: 'center' as const };

const nodeName = (active: boolean) => ({
  fontSize: '11px',
  fontWeight: '800',
  color: active ? '#1e293b' : '#94a3b8',
  whiteSpace: 'nowrap' as any
});

const nodeAssetId = {
  fontSize: '8px',
  color: '#cbd5e1',
  fontWeight: '600'
};

const statusText = (active: boolean, color: string) => ({
  fontSize: '7px',
  fontWeight: '900',
  marginTop: '4px',
  color: active ? color : '#cbd5e1',
  letterSpacing: '0.5px'
});

const connectorTrack = {
  flex: 1,
  padding: '0 10px',
  marginTop: '-35px' // Alinea con el centro de los iconos
};

const connectorLine = {
  width: '100%',
  height: '4px',
  backgroundColor: '#f1f5f9',
  borderRadius: '10px',
  position: 'relative' as const,
  overflow: 'hidden'
};

const energyAnimation = (color: string) => ({
  position: 'absolute' as const,
  top: 0,
  height: '100%',
  width: '50px',
  background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
  animation: 'flowEnergy 1.5s infinite linear'
});