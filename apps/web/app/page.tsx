"use client"
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation'; // Importante para detectar /flex
import InputWidget from '../components/widgets/InputWidget';
import GaugeWidget from '../components/widgets/GaugeWidget';
import AdvancedInputWidget from '../components/widgets/AdvancedInputWidget';
import SemiDonutWidget from '../components/widgets/SemiDonutWidget';
import { DailyExecutiveReport } from '../components/widgets/DailyExecutiveReport';
export default function DashboardPage() {
  const params = useParams(); // Captura "flex", "bimbo", etc.
  const [data, setData] = useState<any>(null);
  const [view, setView] = useState<'operator' | 'analyst'>('operator');

  const fetchData = async () => {
    if (!params.slug) return;
    try {
      // Usamos el slug de la URL en lugar de uno fijo
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/tenant/${params.slug}`);
      if (!res.ok) throw new Error("Tenant no encontrado");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Error en polling:", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [params.slug]); // Se reinicia si cambias de URL

  if (!data) return (
    <div style={{ padding: '40px', color: '#64748b', fontFamily: 'sans-serif', textAlign: 'center' }}>
      🚀 Sincronizando con Backly Server para <b>{params.slug}</b>...
    </div>
  );

  // --- ESTILOS ---
  const styles = {
    container: { minHeight: '100vh', backgroundColor: '#f8fafc', padding: '20px', fontFamily: 'system-ui, sans-serif' },
    header: { 
      maxWidth: '1100px', margin: '0 auto 30px', backgroundColor: '#ffffff', 
      padding: '24px', borderRadius: '30px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9' 
    },
    brand: { margin: 0, fontSize: '1.5rem', fontWeight: '900', letterSpacing: '-1px', textTransform: 'uppercase' as const, fontStyle: 'italic' },
    tabContainer: { display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '16px' },
    tab: (active: boolean, color: string) => ({
      padding: '8px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer',
      fontSize: '0.75rem', fontWeight: '800', transition: 'all 0.3s',
      backgroundColor: active ? '#ffffff' : 'transparent',
      color: active ? color : '#94a3b8',
      boxShadow: active ? '0 4px 6px -1px rgb(0 0 0 / 0.1)' : 'none'
    }),
    statusBadge: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f8fafc', padding: '8px 16px', borderRadius: '12px', border: '1px solid #f1f5f9' },
    widgetCard: {
      maxWidth: '1100px', margin: '0 auto 20px', backgroundColor: '#ffffff', padding: '32px',
      borderRadius: '40px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
      border: '1px solid #f1f5f9', position: 'relative' as const, overflow: 'hidden' as const
    },
    sideBar: (color: string) => ({ position: 'absolute' as const, top: 0, left: 0, width: '8px', height: '100%', backgroundColor: color })
  };

  return (
    <div style={styles.container}>
      
      {/* 🏗️ HEADER DINÁMICO */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.brand}>BACKLY <span style={{ color: '#2563eb' }}>SERVER</span></h1>
          <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', fontWeight: 'bold', letterSpacing: '2px' }}>
            PLANTA: {data.name?.toUpperCase() || params.slug?.toString().toUpperCase()}
          </p>
        </div>

        <div style={styles.tabContainer}>
          <button onClick={() => setView('operator')} style={styles.tab(view === 'operator', '#2563eb')}>👷 OPERADOR</button>
          <button onClick={() => setView('analyst')} style={styles.tab(view === 'analyst', '#10b981')}>📊 ANALISTA</button>
        </div>

        <div style={styles.statusBadge}>
          <div style={{ width: '8px', height: '8px', backgroundColor: '#22c55e', borderRadius: '50%' }}></div>
          <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#64748b', fontFamily: 'monospace' }}>LIVE - {params.slug}</span>
        </div>
      </header>

      {/* 🚀 RENDER DE WIDGETS */}
      <main style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {data.manifest?.dashboard?.widgets
          .filter((w: any) => (view === 'operator' ? w.type === 'OPERATOR_INPUT' : w.type === 'GAUGE_CHART'))
          .map((w: any) => (
            <div key={w.id} style={styles.widgetCard}>
              <div style={styles.sideBar(view === 'operator' ? '#2563eb' : '#10b981')}></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: '900', color: '#cbd5e1', letterSpacing: '3px' }}>
                    {w.props?.assetName || 'MÓDULO DE TELEMETRÍA'}
                </span>
                <span style={{ fontSize: '0.65rem', color: '#cbd5e1', fontFamily: 'monospace' }}>ASSET_ID: {w.props?.assetId?.slice(0,8)}...</span>
              </div>

              {w.type === 'OPERATOR_INPUT' ? (
                <InputWidget data={w} color="#2563eb" />
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                   <GaugeWidget data={w} color="#10b981" />
                </div>
              )}
            </div>
          ))}

        {data.manifest?.dashboard?.widgets?.length === 0 && (
            <div style={{ textAlign: 'center', padding: '100px', color: '#94a3b8' }}>
                <p>No hay widgets configurados para esta vista.</p>
                <p style={{ fontSize: '0.8rem' }}>Ve al panel de Admin y asigna widgets a {data.name}</p>
            </div>
        )}
      </main>
    </div>
  );
}