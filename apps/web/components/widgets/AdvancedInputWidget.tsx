"use client"
import React, { useState, useEffect, useRef } from 'react';
import { Roboto_Mono } from 'next/font/google';

const robotoMono = Roboto_Mono({ subsets: ['latin'], display: 'swap' });

/** * LÓGICA DE ESTANDARIZACIÓN 
 */
const standardize = (value: any, fromUnit: string) => {
  if (typeof value !== 'number') return { value, unit: fromUnit };
  const unit = fromUnit?.toLowerCase() || '';
  if (unit === 'ton' || unit === 'toneladas') return { value: value * 1000, unit: 'kg' };
  if (unit === 'lb' || unit === 'libras') return { value: value * 0.4535, unit: 'kg' };
  if (unit === 'f' || unit === 'fahrenheit') return { value: (value - 32) * (5/9), unit: 'celsius' };
  if (unit === 'psi') return { value: value * 0.0689, unit: 'bar' };
  return { value, unit: fromUnit };
};

export default function AdvancedInputWidget({ data, color = '#3b82f6' }: any) {
  const [fields, setFields] = useState<any[]>([]);
  const [status, setStatus] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = useRef(false);

  useEffect(() => {
    if (data.props?.fields && !isEditing.current) {
      setFields(data.props.fields.map((f: any) => ({
        ...f,
        currentValue: f.currentValue !== undefined ? f.currentValue : (f.type === 'boolean' ? 0 : '')
      })));
    }
  }, [data.props.fields]);

  const handleUpdate = (index: number, val: any) => {
    isEditing.current = true;
    const newFields = [...fields];
    newFields[index].currentValue = val;
    setFields(newFields);
    setStatus(null);
  };

  const sendData = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSubmitting(true);
    setStatus({ text: 'Procesando...', type: 'info' });

    try {
      const metadata: Record<string, any> = {};
      fields.forEach(f => {
        let rawVal = f.currentValue;
        if (f.type === 'number') {
          rawVal = parseFloat(f.currentValue);
          if (isNaN(rawVal)) rawVal = 0;
        }
        const { value: stdVal, unit: stdUnit } = standardize(rawVal, f.unit);
        metadata[f.key] = { value: stdVal, unit: stdUnit || f.unit || '', raw: rawVal, label: f.label };
      });

      const payload = {
        asset_id: data.props.assetId || 'UNKNOWN_ASSET',
        key: data.props.key || 'ADVANCED_REPORT',
        value: 1,
        metadata: metadata
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setStatus({ text: `✅ Enviado con éxito`, type: 'success' });
        isEditing.current = false;
        setFields(prev => prev.map(f => ({ ...f, currentValue: f.type === 'boolean' ? f.currentValue : '' })));
        setTimeout(() => setStatus(null), 3000);
      } else {
        throw new Error("Error de comunicación");
      }
    } catch (err: any) {
      setStatus({ text: `❌ Error: ${err.message}`, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={containerStyle} onClick={(e) => e.stopPropagation()}>
      {/* HEADER MINIMALISTA */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={labelHeaderStyle}>{data.props?.label?.toUpperCase() || 'REPORTE'}</h3>
          <span style={subIdStyle}>ID: {data.props?.assetId}</span>
        </div>
        <div style={{ ...statusDotStyle, backgroundColor: color, boxShadow: `0 0 12px ${color}88` }} />
      </div>

      {/* CUERPO DE INPUTS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {fields.map((field, i) => (
          <div key={field.key || i} style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', padding: '0 4px' }}>
              <span style={fieldNameStyle}>{field.label}</span>
              {field.unit && <span style={fieldUnitStyle}>{field.unit.toUpperCase()}</span>}
            </div>

            {field.type === 'boolean' ? (
              <div style={booleanGroupStyle}>
                <button 
                  type="button" 
                  onClick={() => handleUpdate(i, 1)} 
                  style={pillButtonStyle(field.currentValue === 1, color)}
                > OK </button>
                <button 
                  type="button" 
                  onClick={() => handleUpdate(i, 0)} 
                  style={pillButtonStyle(field.currentValue === 0, '#ef4444')}
                > FALLA </button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <input 
                  type={field.type === 'number' ? 'number' : 'text'}
                  placeholder="..."
                  value={field.currentValue}
                  style={softInputStyle(field.type === 'number')}
                  onFocus={() => { isEditing.current = true; }}
                  onChange={(e) => handleUpdate(i, e.target.value)}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* BOTÓN DE ACCIÓN */}
      <button 
        type="button"
        onClick={sendData} 
        disabled={isSubmitting} 
        style={glassSubmitStyle(isSubmitting, color)}
      >
        {isSubmitting ? 'REGISTRANDO...' : 'REGISTRAR REPORTE'}
      </button>

      {/* STATUS TOAST */}
      {status && <div style={statusToastStyle(status.type)}>{status.text}</div>}
    </div>
  );
}

/** * ESTILOS SOFT UI / MODERN DESIGN 
 */
const containerStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.5)',
  backdropFilter: 'blur(12px)',
  borderRadius: '32px',
  padding: '28px',
  border: '1px solid rgba(255, 255, 255, 0.6)',
  boxShadow: '0 10px 40px -10px rgba(0,0,0,0.05)',
  position: 'relative' as const,
};

const labelHeaderStyle = { fontSize: '13px', fontWeight: '800', color: '#1e293b', margin: 0, letterSpacing: '0.5px' };
const subIdStyle = { fontSize: '10px', color: '#94a3b8', fontWeight: '600' };
const statusDotStyle = { width: '8px', height: '8px', borderRadius: '50%', marginTop: '4px' };
const fieldNameStyle = { fontSize: '11px', fontWeight: '700', color: '#64748b' };
const fieldUnitStyle = { fontSize: '9px', fontWeight: '800', color: '#94a3b8', letterSpacing: '0.5px' };

const softInputStyle = (isNumber: boolean) => ({
  width: '100%',
  padding: '14px 18px',
  borderRadius: '16px',
  border: '1px solid rgba(0,0,0,0.03)',
  backgroundColor: 'rgba(241, 245, 249, 0.6)', 
  fontSize: isNumber ? '16px' : '14px',
  fontWeight: '600',
  color: '#1e293b',
  fontFamily: isNumber ? robotoMono.style.fontFamily : 'inherit',
  outline: 'none',
  boxSizing: 'border-box' as const,
  transition: 'all 0.2s ease',
});

const booleanGroupStyle = { display: 'flex', gap: '8px', backgroundColor: 'rgba(0,0,0,0.04)', padding: '5px', borderRadius: '18px' };

const pillButtonStyle = (active: boolean, activeColor: string) => ({
  flex: 1, padding: '10px', border: 'none', borderRadius: '14px', fontSize: '10px', fontWeight: '800' as any,
  cursor: 'pointer', backgroundColor: active ? '#ffffff' : 'transparent',
  color: active ? activeColor : '#94a3b8',
  boxShadow: active ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
});

const glassSubmitStyle = (disabled: boolean, color: string) => ({
  width: '100%', marginTop: '28px', padding: '18px', borderRadius: '20px', border: 'none',
  backgroundColor: disabled ? '#e2e8f0' : color, color: 'white', fontWeight: '800' as any,
  fontSize: '12px', cursor: 'pointer', boxShadow: disabled ? 'none' : `0 12px 24px ${color}44`,
  transition: 'transform 0.1s active', letterSpacing: '1px'
});

const statusToastStyle = (type: string) => ({
  marginTop: '15px', padding: '10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' as any,
  backgroundColor: type === 'success' ? '#ecfdf5' : type === 'error' ? '#fef2f2' : '#f0f9ff',
  color: type === 'success' ? '#059669' : type === 'error' ? '#dc2626' : '#0284c7',
  textAlign: 'center' as any, border: '1px solid rgba(0,0,0,0.02)'
});