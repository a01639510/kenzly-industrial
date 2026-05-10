"use client"
import React, { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  assets: string[];
  areas: { id: string; name: string }[];
  primaryColor: string;
}

const PRIORITIES = [
  { value: 'BAJA',    label: 'BAJA',    color: '#94a3b8' },
  { value: 'NORMAL',  label: 'NORMAL',  color: '#3b82f6' },
  { value: 'ALTA',    label: 'ALTA',    color: '#f59e0b' },
  { value: 'URGENTE', label: 'URGENTE', color: '#ef4444' },
];

export default function OrderFormModal({ open, onClose, onCreated, assets, areas, primaryColor }: Props) {
  const [orderNumber, setOrderNumber]     = useState('');
  const [productName, setProductName]     = useState('');
  const [targetQty, setTargetQty]         = useState('');
  const [selectedAsset, setSelectedAsset] = useState('');
  const [selectedArea, setSelectedArea]   = useState('');
  const [priority, setPriority]           = useState('NORMAL');
  const [dueAt, setDueAt]                 = useState('');
  const [notes, setNotes]                 = useState('');
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  // Auto-generar número de orden al abrir
  useEffect(() => {
    if (open) {
      const now = new Date();
      setOrderNumber(`OP-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`);
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!orderNumber.trim() || !productName.trim() || !targetQty) {
      setError('Número de orden, producto y cantidad son obligatorios.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`${API}/orders`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: orderNumber.trim(),
          productName: productName.trim(),
          targetQuantity: Number(targetQty),
          assetId:   selectedAsset || null,
          areaId:    selectedArea  || null,
          priority,
          notes:     notes || null,
          dueAt:     dueAt || null,
        })
      });
      if (!r.ok) {
        const e = await r.json();
        setError(e.error || 'Error al crear orden');
        return;
      }
      onCreated();
      onClose();
      // Reset
      setProductName(''); setTargetQty(''); setSelectedAsset('');
      setSelectedArea(''); setPriority('NORMAL'); setDueAt(''); setNotes('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="kenzly-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="kenzly-modal-panel" style={{ maxWidth: 560 }}>
        {/* Header */}
        <div className="kenzly-modal-header">
          <div>
            <h2 className="kenzly-modal-title">NUEVA ORDEN DE PRODUCCIÓN</h2>
            <p className="kenzly-modal-subtitle">Completa los datos para registrar la orden</p>
          </div>
          <button className="kenzly-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="kenzly-modal-body">
          {error && (
            <div style={{ background: '#fee2e2', color: '#ef4444', borderRadius: 10, padding: '10px 14px', fontSize: 11, fontWeight: 700 }}>
              {error}
            </div>
          )}

          {/* Número de orden + Producto (2 columnas) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="kenzly-modal-field">
              <label className="kenzly-modal-label">NÚMERO DE ORDEN</label>
              <input
                className="kenzly-modal-input"
                value={orderNumber}
                onChange={e => setOrderNumber(e.target.value)}
                placeholder="OP-20240115-001"
              />
            </div>
            <div className="kenzly-modal-field">
              <label className="kenzly-modal-label">CANTIDAD OBJETIVO</label>
              <input
                className="kenzly-modal-input"
                type="number"
                min="1"
                value={targetQty}
                onChange={e => setTargetQty(e.target.value)}
                placeholder="1000"
              />
            </div>
          </div>

          <div className="kenzly-modal-field">
            <label className="kenzly-modal-label">PRODUCTO / REFERENCIA</label>
            <input
              className="kenzly-modal-input"
              value={productName}
              onChange={e => setProductName(e.target.value)}
              placeholder="Ej. Tapa plástica modelo A45"
            />
          </div>

          {/* Activo + Área */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {assets.length > 0 && (
              <div className="kenzly-modal-field">
                <label className="kenzly-modal-label">MÁQUINA / ACTIVO</label>
                <select className="kenzly-modal-select" value={selectedAsset} onChange={e => setSelectedAsset(e.target.value)}>
                  <option value="">Sin asignar</option>
                  {assets.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            )}
            {areas.length > 0 && (
              <div className="kenzly-modal-field">
                <label className="kenzly-modal-label">ÁREA</label>
                <select className="kenzly-modal-select" value={selectedArea} onChange={e => setSelectedArea(e.target.value)}>
                  <option value="">Sin asignar</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Prioridad */}
          <div className="kenzly-modal-field">
            <label className="kenzly-modal-label">PRIORIDAD</label>
            <div className="kenzly-modal-pills">
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  className={`kenzly-modal-pill${priority === p.value ? ' active' : ''}`}
                  style={priority === p.value ? { background: p.color, borderColor: p.color, color: 'white' } : {}}
                  onClick={() => setPriority(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fecha requerida + notas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="kenzly-modal-field">
              <label className="kenzly-modal-label">FECHA REQUERIDA (opcional)</label>
              <input
                className="kenzly-modal-input"
                type="datetime-local"
                value={dueAt}
                onChange={e => setDueAt(e.target.value)}
              />
            </div>
            <div className="kenzly-modal-field">
              <label className="kenzly-modal-label">NOTAS (opcional)</label>
              <input
                className="kenzly-modal-input"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Especificaciones adicionales..."
              />
            </div>
          </div>
        </div>

        <div className="kenzly-modal-footer">
          <button className="kenzly-modal-btn-secondary" onClick={onClose}>CANCELAR</button>
          <button
            className="kenzly-modal-btn-primary"
            style={{ background: primaryColor }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'CREANDO...' : 'CREAR ORDEN'}
          </button>
        </div>
      </div>
    </div>
  );
}
