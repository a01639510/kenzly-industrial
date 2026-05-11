"use client"
import React, { useEffect, useState, useCallback } from 'react';
import { Roboto_Mono } from 'next/font/google';

const robotoMono = Roboto_Mono({ subsets: ['latin'], display: 'swap' });

interface KanbanProps {
  data: {
    props: {
      label: string;
      sourceAsset: string;
      targetAsset: string;
      sourceKey?: string;
      targetKey?: string;
      limitWIP: number;
      unit?: string;
    }
  };
  color?: string;
}

export default function KanbanCardWidget({ data, color = '#2563eb' }: KanbanProps) {
  const { label, sourceAsset, targetAsset, sourceKey, targetKey, limitWIP, unit } = data.props;
  const [balanceData, setBalanceData] = useState({ produced: 0, consumed: 0, balance: 0 });
  const [loading, setLoading] = useState(true);

  const fetchBalance = useCallback(async () => {
    if (!sourceAsset || !targetAsset) return;
    
    try {
      const params = new URLSearchParams({
        sourceAsset: sourceAsset.trim(),
        targetAsset: targetAsset.trim(),
        sourceKey: (sourceKey || 'value').trim(),
        targetKey: (targetKey || 'value').trim()
      });

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/telemetry/kanban/balance?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error("API Error");
      
      const json = await res.json();
      
      // Aseguramos que los valores sean numéricos
      setBalanceData({
        produced: Number(json.produced) || 0,
        consumed: Number(json.consumed) || 0,
        balance: Number(json.balance) || 0
      });
      setLoading(false);
    } catch (e) {
      console.error("❌ Kanban Sync Error:", e);
      setLoading(false);
    }
  }, [sourceAsset, targetAsset, sourceKey, targetKey]);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 5000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  const isOverLimit = balanceData.balance > (limitWIP || 0);
  const percentage = Math.max(0, Math.min((balanceData.balance / (limitWIP || 1)) * 100, 100));
  const statusColor = isOverLimit ? '#ef4444' : color;

  return (
    <div style={stripContainer(isOverLimit)}>
      
      {/* SECCIÓN ENTRADA (A) */}
      <div style={nodeSection}>
        <span style={nodeLabel}>ENTRADA (A)</span>
        <div style={nodeValue('#10b981')}>
          {loading ? '...' : `+${balanceData.produced.toLocaleString()}`}
        </div>
        <span style={assetName} title={sourceAsset}>{sourceAsset}</span>
      </div>

      <div style={divider} />

      {/* SECCIÓN CENTRAL (WIP) */}
      <div style={centerFlow}>
        <div style={topRow}>
          <h3 style={titleStyle}>{label.toUpperCase()}</h3>
          <span style={pillStyle(isOverLimit, statusColor)}>
            {isOverLimit ? '⚠️ EXCESO' : '✅ FLUJO'}
          </span>
        </div>

        <div style={mainDisplay}>
          <div style={progressTrack}>
            <div style={progressBar(percentage, statusColor)} />
          </div>
          <div style={valueGroup}>
            <span style={{ ...bigValue, color: statusColor }}>
              {loading ? '---' : balanceData.balance.toLocaleString()}
              <span style={unitStyle}>{unit || 'pzs'}</span>
            </span>
            <span style={wipTag}>WIP ACTUAL</span>
          </div>
        </div>
        
        <div style={limitFooter}>
          <span>MIN: 0</span>
          <span>LÍMITE: {limitWIP}</span>
        </div>
      </div>

      <div style={divider} />

      {/* SECCIÓN SALIDA (B) */}
      <div style={nodeSection}>
        <span style={nodeLabel}>SALIDA (B)</span>
        <div style={nodeValue('#64748b')}>
          {loading ? '...' : `-${balanceData.consumed.toLocaleString()}`}
        </div>
        <span style={assetName} title={targetAsset}>{targetAsset}</span>
      </div>

    </div>
  );
}

// --- ESTILOS DARK GLASS ---
const stripContainer = (isOver: boolean) => ({
  display: 'flex', alignItems: 'center',
  border: `1px solid ${isOver ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.08)'}`,
  borderRadius: '14px', padding: '16px 20px',
  gap: '20px', width: '100%', boxSizing: 'border-box' as const,
  background: isOver ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.04)',
});
const nodeSection = { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', minWidth: '100px' };
const nodeLabel = { fontSize: '9px', fontWeight: '900', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.8px' };
const nodeValue = (c: string) => ({ fontSize: '20px', fontWeight: '800', color: c, fontFamily: robotoMono.style.fontFamily });
const assetName = { fontSize: '9px', color: 'rgba(255,255,255,0.30)', fontWeight: '600', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' };
const divider = { width: '1px', height: '40px', backgroundColor: 'rgba(255,255,255,0.08)' };
const centerFlow = { flex: 1, display: 'flex', flexDirection: 'column' as const, gap: '6px' };
const topRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const titleStyle = { margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.70)', fontWeight: '900' };
const pillStyle = (isOver: boolean, color: string) => ({
  fontSize: '9px', fontWeight: '900' as any, padding: '2px 8px', borderRadius: '100px',
  backgroundColor: isOver ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.08)', color: color
});
const mainDisplay = { display: 'flex', alignItems: 'center', gap: '20px' };
const progressTrack = { flex: 1, height: '6px', backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: '10px', overflow: 'hidden' };
const progressBar = (w: number, c: string) => ({
  width: `${w}%`, height: '100%', backgroundColor: c, transition: 'width 1s ease-in-out', borderRadius: '10px'
});
const valueGroup = { display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', minWidth: '90px' };
const bigValue = { fontSize: '26px', fontWeight: '800', fontFamily: robotoMono.style.fontFamily, lineHeight: 1 };
const unitStyle = { fontSize: '12px', marginLeft: '4px', color: 'rgba(255,255,255,0.40)' };
const wipTag = { fontSize: '8px', fontWeight: '900', color: 'rgba(255,255,255,0.35)' };
const limitFooter = { display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.30)' };