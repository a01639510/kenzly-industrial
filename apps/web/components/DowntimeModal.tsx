"use client"
import React, { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Cause {
  id: number;
  code: string;
  label: string;
  category: string;
}

interface ActiveEvent {
  id: string;
  asset_id: string | null;
  area_id: string | null;
  started_at: string;
  cause_label: string | null;
  cause_category: string | null;
  cause_description: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  assets: string[];
  areaId?: string;
  primaryColor: string;
  activeEvent: ActiveEvent | null;
  onEventChange: () => void;
}

const CATEGORIES = ['MECÁNICO', 'ELÉCTRICO', 'OPERATIVO', 'CALIDAD', 'MATERIAL', 'OTRO'];

export default function DowntimeModal({ open, onClose, assets, areaId, primaryColor, activeEvent, onEventChange }: Props) {
  const [causes, setCauses] = useState<Cause[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCauseId, setSelectedCauseId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [responsible, setResponsible] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(assets[0] || '');
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!open) return;
    fetch(`${API}/downtime/causes`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(setCauses)
      .catch(() => {});
  }, [open]);

  // Reloj elapsed para el paro activo
  useEffect(() => {
    if (!activeEvent) return;
    const tick = () => {
      const diff = Math.floor((Date.now() - new Date(activeEvent.started_at).getTime()) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeEvent]);

  if (!open) return null;

  const filteredCauses = causes.filter(c => !selectedCategory || c.category === selectedCategory);

  const handleStart = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/downtime/start`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: selectedAsset || null,
          areaId: areaId || null,
          causeId: selectedCauseId,
          causeDescription: description || null,
          responsible: responsible || null,
        })
      });
      if (!r.ok) {
        const e = await r.json();
        alert(e.error || 'Error al registrar paro');
        return;
      }
      onEventChange();
      setSelectedCategory('');
      setSelectedCauseId(null);
      setDescription('');
      setResponsible('');
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async () => {
    if (!activeEvent) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/downtime/${activeEvent.id}/end`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          causeId: selectedCauseId || null,
          causeDescription: description || null,
          responsible: responsible || null,
        })
      });
      if (!r.ok) {
        const e = await r.json();
        alert(e.error || 'Error al cerrar paro');
        return;
      }
      onEventChange();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="kenzly-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="kenzly-modal-panel">
        {/* Header */}
        <div className="kenzly-modal-header">
          <div>
            <h2 className="kenzly-modal-title">
              {activeEvent ? '⚠ PARO ACTIVO' : 'REGISTRAR PARO'}
            </h2>
            {activeEvent && (
              <p className="kenzly-modal-subtitle">
                Iniciado hace <strong style={{ color: '#ef4444' }}>{elapsed}</strong>
                {activeEvent.asset_id && ` · ${activeEvent.asset_id}`}
                {activeEvent.cause_label && ` · ${activeEvent.cause_label}`}
              </p>
            )}
          </div>
          <button className="kenzly-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="kenzly-modal-body">
          {/* Activo selector (solo al iniciar) */}
          {!activeEvent && assets.length > 0 && (
            <div className="kenzly-modal-field">
              <label className="kenzly-modal-label">ACTIVO / MÁQUINA</label>
              <select
                className="kenzly-modal-select"
                value={selectedAsset}
                onChange={e => setSelectedAsset(e.target.value)}
              >
                <option value="">Sin especificar</option>
                {assets.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          )}

          {/* Categoría */}
          <div className="kenzly-modal-field">
            <label className="kenzly-modal-label">CATEGORÍA DE CAUSA</label>
            <div className="kenzly-modal-pills">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  className={`kenzly-modal-pill${selectedCategory === cat ? ' active' : ''}`}
                  style={selectedCategory === cat ? { background: primaryColor, borderColor: primaryColor, color: 'white' } : {}}
                  onClick={() => { setSelectedCategory(selectedCategory === cat ? '' : cat); setSelectedCauseId(null); }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Causa específica */}
          {filteredCauses.length > 0 && (
            <div className="kenzly-modal-field">
              <label className="kenzly-modal-label">CAUSA ESPECÍFICA</label>
              <div className="kenzly-modal-pills">
                {filteredCauses.map(c => (
                  <button
                    key={c.id}
                    className={`kenzly-modal-pill${selectedCauseId === c.id ? ' active' : ''}`}
                    style={selectedCauseId === c.id ? { background: primaryColor, borderColor: primaryColor, color: 'white' } : {}}
                    onClick={() => setSelectedCauseId(selectedCauseId === c.id ? null : c.id)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Descripción */}
          <div className="kenzly-modal-field">
            <label className="kenzly-modal-label">DESCRIPCIÓN (opcional)</label>
            <textarea
              className="kenzly-modal-textarea"
              placeholder="Detalle adicional del paro..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Responsable */}
          <div className="kenzly-modal-field">
            <label className="kenzly-modal-label">RESPONSABLE (opcional)</label>
            <input
              className="kenzly-modal-input"
              placeholder="Nombre del operador o técnico"
              value={responsible}
              onChange={e => setResponsible(e.target.value)}
            />
          </div>
        </div>

        {/* Acciones */}
        <div className="kenzly-modal-footer">
          <button className="kenzly-modal-btn-secondary" onClick={onClose}>
            CANCELAR
          </button>
          {activeEvent ? (
            <button
              className="kenzly-modal-btn-danger"
              onClick={handleEnd}
              disabled={loading}
            >
              {loading ? 'CERRANDO...' : 'CERRAR PARO'}
            </button>
          ) : (
            <button
              className="kenzly-modal-btn-primary"
              style={{ background: primaryColor }}
              onClick={handleStart}
              disabled={loading}
            >
              {loading ? 'REGISTRANDO...' : 'INICIAR PARO'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
