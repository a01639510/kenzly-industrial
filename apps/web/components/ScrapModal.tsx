"use client"
import React, { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Props {
  open: boolean;
  onClose: () => void;
  assets: string[];
  areaId?: string;
  primaryColor: string;
}

const CATEGORIES = ['DIMENSIONAL', 'COSMÉTICO', 'FUNCIONAL', 'MATERIAL', 'PROCESO', 'OTRO'];

export default function ScrapModal({ open, onClose, assets, areaId, primaryColor }: Props) {
  const [quantity, setQuantity]     = useState('');
  const [asset, setAsset]           = useState(assets[0] || '');
  const [category, setCategory]     = useState('');
  const [description, setDescription] = useState('');
  const [inspector, setInspector]   = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  if (!open) return null;

  const handleSubmit = async () => {
    if (!quantity || Number(quantity) <= 0) { setError('Ingresa la cantidad de piezas rechazadas.'); return; }
    setLoading(true); setError('');
    try {
      const r = await fetch(`${API}/scrap`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: asset || null, areaId: areaId || null,
          quantity: Number(quantity),
          reasonCategory: category || null,
          reasonDescription: description || null,
          inspector: inspector || null,
        })
      });
      if (!r.ok) { const e = await r.json(); setError(e.error || 'Error'); return; }
      setQuantity(''); setCategory(''); setDescription(''); setInspector('');
      onClose();
    } finally { setLoading(false); }
  };

  return (
    <div className="kenzly-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="kenzly-modal-panel" style={{ maxWidth: 460 }}>
        <div className="kenzly-modal-header">
          <div>
            <h2 className="kenzly-modal-title">REGISTRAR SCRAP</h2>
            <p className="kenzly-modal-subtitle">Piezas rechazadas o fuera de especificación</p>
          </div>
          <button className="kenzly-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="kenzly-modal-body">
          {error && <div style={{ background: '#fee2e2', color: '#ef4444', borderRadius: 10, padding: '10px 14px', fontSize: 11, fontWeight: 700 }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="kenzly-modal-field">
              <label className="kenzly-modal-label">CANTIDAD RECHAZADA</label>
              <input className="kenzly-modal-input" type="number" min="1" autoFocus value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" />
            </div>
            {assets.length > 0 && (
              <div className="kenzly-modal-field">
                <label className="kenzly-modal-label">MÁQUINA / ACTIVO</label>
                <select className="kenzly-modal-select" value={asset} onChange={e => setAsset(e.target.value)}>
                  <option value="">Sin especificar</option>
                  {assets.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="kenzly-modal-field">
            <label className="kenzly-modal-label">TIPO DE DEFECTO</label>
            <div className="kenzly-modal-pills">
              {CATEGORIES.map(cat => (
                <button key={cat} className={`kenzly-modal-pill${category === cat ? ' active' : ''}`}
                  style={category === cat ? { background: '#ef4444', borderColor: '#ef4444', color: 'white' } : {}}
                  onClick={() => setCategory(category === cat ? '' : cat)}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="kenzly-modal-field">
            <label className="kenzly-modal-label">DESCRIPCIÓN DEL DEFECTO (opcional)</label>
            <textarea className="kenzly-modal-textarea" rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe el defecto encontrado..." />
          </div>

          <div className="kenzly-modal-field">
            <label className="kenzly-modal-label">INSPECTOR (opcional)</label>
            <input className="kenzly-modal-input" value={inspector} onChange={e => setInspector(e.target.value)} placeholder="Nombre del inspector de calidad" />
          </div>
        </div>

        <div className="kenzly-modal-footer">
          <button className="kenzly-modal-btn-secondary" onClick={onClose}>CANCELAR</button>
          <button className="kenzly-modal-btn-danger" onClick={handleSubmit} disabled={loading}>
            {loading ? 'REGISTRANDO...' : 'REGISTRAR SCRAP'}
          </button>
        </div>
      </div>
    </div>
  );
}
