"use client"
import React, { useState, useMemo } from 'react';
import { Download, FileText, ChevronDown, CheckCircle2, Search, Loader2, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const DailyExecutiveReport = ({ areaId, availableAssets = [], color = '#2563eb' }: any) => {
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const filteredList = useMemo(() => {
    return availableAssets
      .filter((a: string) => a?.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort();
  }, [availableAssets, searchTerm]);

  const fetchData = async () => {
    if (selectedAssets.length === 0) throw new Error("Selecciona activos");
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/telemetry/daily-report?assets=${selectedAssets.join(',')}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Servidor respondió con status ${res.status}`);
    return res.json();
  };

  const handleFetchData = async () => {
    setStatus('loading');
    try {
      const data = await fetchData();
      generatePDF(data);
      setStatus('idle');
    } catch (err: any) {
      console.error("Error en reporte:", err);
      setStatus('error');
    }
  };

  const handleDownloadCSV = async () => {
    setStatus('loading');
    try {
      const data = await fetchData();
      generateCSV(data);
      setStatus('idle');
    } catch (err: any) {
      console.error("Error en CSV:", err);
      setStatus('error');
    }
  };

  const generateCSV = (data: any[]) => {
    const dynamicKeys = new Set<string>();
    data.forEach(item => {
      if (item.metadata) Object.keys(item.metadata).forEach(k => dynamicKeys.add(k));
    });
    const columnKeys = Array.from(dynamicKeys).sort();
    const header = ['Timestamp', 'Asset', 'Main Value', ...columnKeys];

    const rows = data.map(r => {
      const dynamicCells = columnKeys.map(key => {
        const val = r.metadata?.[key];
        const finalVal = (val && typeof val === 'object') ? (val.value ?? val.raw ?? JSON.stringify(val)) : val;
        return finalVal ?? '';
      });
      return [new Date(r.timestamp).toLocaleString(), r.assetId, r.value, ...dynamicCells];
    });

    const csvContent = [header, ...rows]
      .map(row => row.map((cell: any) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_${areaId}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generatePDF = (data: any[]) => {
    const doc = new jsPDF('l', 'mm', 'a4'); // 'l' para formato horizontal (Landscape)
    
    // --- PROCESAMIENTO DINÁMICO DE COLUMNAS ---
    // 1. Identificar todas las sub-llaves posibles dentro de metadata
    const dynamicKeys = new Set<string>();
    data.forEach(item => {
      if (item.metadata) {
        Object.keys(item.metadata).forEach(k => dynamicKeys.add(k));
      }
    });
    const columnKeys = Array.from(dynamicKeys).sort();

    // 2. Definir encabezados: Fijos + Dinámicos
    const head = [['Timestamp', 'Asset', 'Main Value', ...columnKeys]];

    // 3. Mapear el cuerpo de la tabla
    const body = data.map(r => {
      const timestamp = new Date(r.timestamp).toLocaleString();
      const asset = r.assetId;
      const mainVal = r.value;

      // Para cada columna dinámica, buscamos si el asset tiene esa llave
      const dynamicCells = columnKeys.map(key => {
        const val = r.metadata?.[key];
        
        // Si el valor es objeto, intentamos sacar .value o .raw
        const finalVal = (val && typeof val === 'object') ? (val.value ?? val.raw ?? JSON.stringify(val)) : val;

        // Formateo de Booleanos (Palomita Unicode, no emoji)
        if (typeof finalVal === 'boolean') {
          return finalVal ? '\u2713' : '-'; // \u2713 es el Checkmark
        }
        return finalVal ?? '-';
      });

      return [timestamp, asset, mainVal, ...dynamicCells];
    });

    // --- DISEÑO DEL PDF ---
    doc.setFillColor(color);
    doc.rect(0, 0, 297, 30, 'F'); // Ancho de A4 horizontal es 297mm
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text(`REPORTE EJECUTIVO - ÁREA: ${areaId.toUpperCase()}`, 15, 18);
    doc.setFontSize(10);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 15, 25);
    
    autoTable(doc, {
      startY: 35,
      head: head,
      body: body,
      headStyles: { fillColor: color, fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 10, right: 10 }
    });

    doc.save(`Reporte_Detallado_${areaId}_${Date.now()}.pdf`);
  };

  return (
    <div style={{ width: '100%', background: '#fff', padding: '15px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', alignItems: 'center' }}>
        <FileText color={color} size={18} />
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>REPORTE DINÁMICO POR METADATA</span>
      </div>

      <div style={{ position: 'relative', marginBottom: '10px' }}>
        <div onClick={() => setIsOpen(!isOpen)} style={selectBox}>
          <span>{selectedAssets.length || '0'} activos seleccionados</span>
          <ChevronDown size={16} />
        </div>

        {isOpen && (
          <div style={dropdownMenu}>
            <div style={searchContainer}>
              <Search size={14} color="#94a3b8" />
              <input 
                placeholder="Buscar activos..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={listContainer}>
              {filteredList.map((asset: string) => (
                <div key={asset} onClick={() => {
                  setSelectedAssets(prev => prev.includes(asset) ? prev.filter(x => x !== asset) : [...prev, asset])
                }} style={itemStyle}>
                  <div style={{ ...checkbox, backgroundColor: selectedAssets.includes(asset) ? color : 'transparent' }}>
                    {selectedAssets.includes(asset) && <CheckCircle2 size={12} color="white" />}
                  </div>
                  <span style={{ fontSize: '12px' }}>{asset}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleFetchData}
          disabled={status === 'loading'}
          style={{ ...btnStyle, flex: 1, backgroundColor: color }}
        >
          {status === 'loading' ? <Loader2 className="animate-spin" size={16} /> : 'PDF'}
        </button>
        <button
          onClick={handleDownloadCSV}
          disabled={status === 'loading'}
          style={{ ...btnStyle, flex: 1, backgroundColor: '#10b981' }}
        >
          {status === 'loading' ? <Loader2 className="animate-spin" size={16} /> : 'CSV'}
        </button>
      </div>

      {status === 'error' && (
        <div style={{ marginTop: '10px', color: '#ef4444', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <AlertCircle size={12} /> Error en la conexión con el servidor
        </div>
      )}
    </div>
  );
};

// --- ESTILOS (Mantenidos de tu original) ---
const selectBox = { padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: '12px', background: '#f8fafc' };
const dropdownMenu = { position: 'absolute' as any, top: '45px', width: '100%', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', zIndex: 10, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' };
const searchContainer = { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderBottom: '1px solid #f1f5f9' };
const inputStyle = { border: 'none', outline: 'none', fontSize: '12px', width: '100%' };
const listContainer = { maxHeight: '200px', overflowY: 'auto' as any };
const itemStyle = { padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderBottom: '1px solid #f8fafc' };
const checkbox = { width: '16px', height: '16px', borderRadius: '4px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const btnStyle = { width: '100%', padding: '12px', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold' as any, cursor: 'pointer', display: 'flex', justifyContent: 'center', transition: 'opacity 0.2s' };