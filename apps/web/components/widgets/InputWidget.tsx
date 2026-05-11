"use client"
import React, { useState } from 'react';
import { Roboto_Mono } from 'next/font/google';

const robotoMono = Roboto_Mono({ subsets: ['latin'], display: 'swap' });

// --- LÓGICA DE ESTANDARIZACIÓN ---
const standardize = (value: number, fromUnit: string) => {
  const unit = fromUnit?.toLowerCase() || '';
  if (unit === 'ton' || unit === 'toneladas') return { value: value * 1000, unit: 'kg' };
  if (unit === 'lb' || unit === 'libras') return { value: value * 0.4535, unit: 'kg' };
  if (unit === 'f' || unit === 'fahrenheit') return { value: (value - 32) * (5/9), unit: 'celsius' };
  return { value, unit: fromUnit };
};

export default function InputWidget({ data, color = '#3b82f6' }: any) {
  const [inputValue, setInputValue] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!inputValue) {
      setStatusMessage({ text: 'Por favor, ingrese un valor.', type: 'error' });
      return;
    }
    
    setIsSubmitting(true);
    setStatusMessage({ text: 'Estandarizando y Enviando...', type: 'info' });

    // 1. ESTANDARIZACIÓN
    const { value: standardValue, unit: standardUnit } = standardize(
      parseFloat(inputValue), 
      data.props.unit
    );

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          asset_id: data.props.assetId,
          key: data.props.key,
          value: standardValue,
          unit: standardUnit,
          metadata: {
            raw_input: inputValue,
            raw_unit: data.props.unit,
            label: data.props.label,
            converted: standardValue !== parseFloat(inputValue),
            timestamp_client: new Date().toISOString()
          }
        }),
      });

      if (response.ok) {
        setStatusMessage({ 
          text: `✅ ¡Registrado! (${inputValue} ${data.props.unit} → ${standardValue.toFixed(1)} ${standardUnit})`, 
          type: 'success' 
        });
        setInputValue('');
      } else {
        throw new Error("Error en el servidor");
      }
    } catch (error: any) {
      setStatusMessage({ text: `❌ Error: ${error.message}`, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      {/* HEADER DINÁMICO */}
      <div style={{ borderBottom: `2px solid ${color}22`, paddingBottom: '8px' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: '900', color: color, margin: 0, letterSpacing: '1px' }}>
          {data.props.label?.toUpperCase() || 'ENTRADA DE DATO'}
        </p>
      </div>
      
      <div style={{ textAlign: 'left' }}>
        <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: '700', color: 'rgba(15,23,42,0.50)', marginBottom: '8px', textTransform: 'uppercase' }}>
          {(data.props?.key || 'valor').replace(/_/g, ' ')} actual en <strong>{data.props.unit}</strong>
        </label>

        <div style={{ position: 'relative' }}>
          <input
            type="number"
            step="0.1"
            placeholder="0.00"
            value={inputValue}
            onChange={(e) => {
                setInputValue(e.target.value);
                setStatusMessage(null);
            }}
            style={{
                width: '100%',
                padding: '12px 15px',
                fontSize: '1.8rem',
                border: '1px solid rgba(0,0,0,0.12)',
                borderRadius: '12px',
                fontFamily: robotoMono.style.fontFamily,
                outlineColor: color,
                backgroundColor: 'rgba(255,255,255,0.55)',
                color: '#0f172a',
                boxSizing: 'border-box'
            }}
          />
          <span style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(15,23,42,0.35)', fontWeight: '800', fontSize: '0.8rem' }}>
              {data.props.unit?.toUpperCase()}
          </span>
        </div>
      </div>

      <button 
        onClick={handleSubmit}
        disabled={isSubmitting}
        style={{ 
          width: '100%', 
          padding: '14px', 
          backgroundColor: isSubmitting ? '#cbd5e1' : color, 
          color: 'white', 
          border: 'none', 
          borderRadius: '12px', 
          fontWeight: '800', 
          fontSize: '0.9rem',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          boxShadow: isSubmitting ? 'none' : `0 4px 12px ${color}44`
        }}
      >
        {isSubmitting ? 'PROCESANDO...' : 'CONFIRMAR LECTURA'}
      </button>
      
      {statusMessage && (
        <div style={{
          marginTop: '5px',
          padding: '12px',
          borderRadius: '10px',
          fontSize: '0.75rem',
          fontWeight: '600',
          backgroundColor: statusMessage.type === 'success' ? 'rgba(16,185,129,0.12)' : statusMessage.type === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.12)',
          color: statusMessage.type === 'success' ? '#6ee7b7' : statusMessage.type === 'error' ? '#fca5a5' : '#93c5fd',
          border: `1px solid ${statusMessage.type === 'success' ? 'rgba(16,185,129,0.25)' : statusMessage.type === 'error' ? 'rgba(239,68,68,0.25)' : 'rgba(59,130,246,0.25)'}`
        }}>
          {statusMessage.text}
        </div>
      )}
    </div>
  );
}