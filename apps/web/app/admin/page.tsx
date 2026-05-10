"use client"
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from './api';
import { WidgetLibrary } from '../../components/widgets';

export default function AdminPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<'operator' | 'analyst'>('operator');
  const [assetSuggestions, setAssetSuggestions] = useState<string[]>([]);
  const [showBrandingConfig, setShowBrandingConfig] = useState(false);
  const [newAccessCode, setNewAccessCode] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [shifts, setShifts] = useState<any[]>([]);
  const [newShift, setNewShift] = useState({ name: '', start_hour: 6, end_hour: 14 });
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [tenantUsers, setTenantUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ username: '', displayName: '', password: '', role: 'OPERADOR' });
  
  const [manifest, setManifest] = useState<any>({ 
    branding: { primaryColor: '#38bdf8', logo: '', appName: 'KENZLY ADMIN' }, 
    areas: {} 
  });

  // --- 1. AGREGAMOS EL REPORTE A LA LISTA DE DISPONIBLES ---
  const AVAILABLE_WIDGETS = [
    { type: 'GAUGE', label: 'Medidor Circular' },
    { type: 'SEMI_DONUT', label: 'Semi Dona' },
    { type: 'PRODUCTION', label: 'Contador Prod.' },
    { type: 'DAILY_EXECUTIVE_REPORT', label: 'Reporte Ejecutivo' }, // <--- NUEVO
    { type: 'KANBAN', label: 'Tarjeta Pull/Kanban' },
    { type: 'ADVANCED_INPUT', label: 'Formulario Pro' },
    { type: 'INPUT', label: 'Input Simple' }
  ];

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    adminApi.getTenants().then(setTenants).catch(console.error);
    adminApi.getAssetSuggestions().then(setAssetSuggestions).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedTenant) return;
    fetch(`${BASE_URL}/tenants/${selectedTenant.slug}/shifts`, { credentials: 'include' })
      .then(r => r.json()).then(setShifts).catch(console.error);
    fetch(`${BASE_URL}/admin/tenants/${selectedTenant.id}/users`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : []).then(setTenantUsers).catch(console.error);
    setNotificationEmail(selectedTenant.notification_email || '');
  }, [selectedTenant]);

  useEffect(() => {
    if (selectedTenant) {
      const dbManifest = selectedTenant.manifest || { branding: {}, areas: {} };
      const physicalAreas = selectedTenant.areas || []; 
      const updatedAreas = { ...dbManifest.areas };

      physicalAreas.forEach((area: any) => {
        if (!updatedAreas[area.id]) {
          updatedAreas[area.id] = {
            name: area.name,
            operator: { widgets: [] },
            analyst: { widgets: [] }
          };
        } else {
          updatedAreas[area.id].name = area.name;
        }
      });

      setManifest({
        branding: { 
          primaryColor: dbManifest.branding?.primaryColor || '#38bdf8', 
          logo: dbManifest.branding?.logo || '',
          appName: dbManifest.branding?.appName || 'KENZLY ADMIN'
        },
        areas: updatedAreas
      });
      setShowBrandingConfig(false);
    }
  }, [selectedTenant]);

  const saveAll = async () => {
    if (!selectedTenant) return;
    try {
      const discoveredAssets = new Set<string>();
      Object.values(manifest.areas || {}).forEach((area: any) => {
        ['operator', 'analyst'].forEach((role) => {
          area[role]?.widgets?.forEach((w: any) => {
            if (w.props.assetId) discoveredAssets.add(w.props.assetId.trim());
            if (w.props.sourceAsset) discoveredAssets.add(w.props.sourceAsset.trim());
            if (w.props.targetAsset) discoveredAssets.add(w.props.targetAsset.trim());
          });
        });
      });

      await adminApi.syncAssets(Array.from(discoveredAssets));
      await adminApi.saveConfig(selectedTenant.id, manifest);
      alert("✅ Configuración guardada.");
    } catch (err) { alert("❌ Error al guardar."); }
  };

  const updateWidget = (id: string, key: string, val: any) => {
    if (!selectedAreaId) return;
    const up = JSON.parse(JSON.stringify(manifest));
    const widgets = up.areas[selectedAreaId][activeRole].widgets;
    const idx = widgets.findIndex((w: any) => w.id === id);
    if (idx !== -1) {
      widgets[idx].props[key] = val;
      setManifest(up);
    }
  };

  // --- 2. LÓGICA DE INSERCIÓN DEL REPORTE ---
  const addWidget = (type: string) => {
    if (!selectedAreaId) return;
    const up = JSON.parse(JSON.stringify(manifest));
    const newW = { 
      id: `w-${Date.now()}`, 
      type, 
      props: type === 'DAILY_EXECUTIVE_REPORT' 
        ? { areaId: manifest.areas[selectedAreaId].name, label: 'Módulo de Reportes' }
        : { 
          label: `Nueva ${type}`, 
          assetId: '', 
          key: 'OUTPUT', 
          subKey: '', 
          maxValue: 100,
          sourceAsset: '',
          targetAsset: '',
          sourceKey: 'value', 
          targetKey: 'value', 
          limitWIP: 50,
          unit: '',
          fields: type === 'ADVANCED_INPUT' ? [] : undefined 
        } 
    };
    up.areas[selectedAreaId][activeRole].widgets.push(newW);
    setManifest(up);
  };

  const addFieldToWidget = (widgetId: string) => {
    const up = JSON.parse(JSON.stringify(manifest));
    const widgets = up.areas[selectedAreaId!][activeRole].widgets;
    const idx = widgets.findIndex((w: any) => w.id === widgetId);
    if (idx !== -1) {
      if (!widgets[idx].props.fields) widgets[idx].props.fields = [];
      widgets[idx].props.fields.push({ key: '', label: '', type: 'number', unit: '' });
      setManifest(up);
    }
  };

  const updateFieldInWidget = (wId: string, fIdx: number, key: string, val: any) => {
    const up = JSON.parse(JSON.stringify(manifest));
    const widgets = up.areas[selectedAreaId!][activeRole].widgets;
    const wIdx = widgets.findIndex((w: any) => w.id === wId);
    if (wIdx !== -1) {
      widgets[wIdx].props.fields[fIdx][key] = val;
      setManifest(up);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setManifest({
          ...manifest,
          branding: { ...manifest.branding, logo: reader.result as string }
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', height: '100vh', background: '#f1f5f9' }} className="kenzly-admin-layout">
      <aside style={{ background: '#0f172a', color: 'white', padding: '25px', overflowY: 'auto' }} className="kenzly-admin-sidebar">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
          <h2 style={{ color: '#38bdf8', fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>{manifest.branding?.appName || 'KENZLY ADMIN'}</h2>
          <button onClick={async () => { await adminApi.logout(); router.push('/login/admin'); }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>SALIR</button>
        </div>
        
        <label style={labelStyle}>EMPRESA</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select style={inputStyle} value={selectedTenant?.id || ''} onChange={e => setSelectedTenant(tenants.find(t => t.id === e.target.value))}>
            <option value="">Seleccionar...</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {selectedTenant && (
            <button 
              onClick={() => { setShowBrandingConfig(!showBrandingConfig); setSelectedAreaId(null); }}
              style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '0 10px', cursor: 'pointer' }}
              title="Configuración de Marca"
            >
              ⚙️
            </button>
          )}
        </div>

        {selectedTenant && (
          <button onClick={saveAll} style={{ ...btnSaveStyle, background: manifest.branding?.primaryColor }}>💾 GUARDAR CAMBIOS</button>
        )}

        {selectedTenant && (
          <div style={{ marginTop: '15px' }}>
            <label style={labelStyle}>CÓDIGO DE ACCESO</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="password"
                placeholder="Nuevo código..."
                value={newAccessCode}
                onChange={e => setNewAccessCode(e.target.value)}
                style={{ ...inputStyle, flex: 1, fontSize: '12px' }}
              />
              <button
                onClick={async () => {
                  if (newAccessCode.length < 4) return alert('Mínimo 4 caracteres');
                  try {
                    await adminApi.setAccessCode(selectedTenant.id, newAccessCode);
                    setNewAccessCode('');
                    alert('✅ Código actualizado');
                  } catch { alert('❌ Error'); }
                }}
                style={{ background: '#334155', border: 'none', borderRadius: '8px', padding: '0 12px', cursor: 'pointer', color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
              >SET</button>
            </div>
          </div>
        )}

        <div style={{ marginTop: '20px' }}>
          <label style={labelStyle}>ÁREAS FÍSICAS</label>
          {selectedTenant && Object.keys(manifest.areas || {}).map(id => (
            <button key={id} onClick={() => { setSelectedAreaId(id); setShowBrandingConfig(false); }} style={{ ...areaBtnStyle, background: selectedAreaId === id ? manifest.branding?.primaryColor : '#1e293b' }}>
              {manifest.areas[id].name}
            </button>
          ))}
        </div>
      </aside>

      <main style={{ padding: '40px', overflowY: 'auto' }}>
        {showBrandingConfig && selectedTenant ? (
          /* ... PANEL DE BRANDING SE MANTIENE IGUAL ... */
          <div style={{ maxWidth: '800px' }}>
             <h2 style={{ marginBottom: '20px' }}>Configuración de Marca: {selectedTenant.name}</h2>
             <div style={adminWidgetCard}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                   <div>
                      <label style={miniLabel}>COLOR PRIMARIO (BRANDING)</label>
                      <input type="color" value={manifest.branding.primaryColor} onChange={e => setManifest({...manifest, branding: {...manifest.branding, primaryColor: e.target.value}})} style={{ width: '100%', height: '40px', border: 'none', cursor: 'pointer' }} />
                      <label style={{...miniLabel, marginTop: '15px'}}>NOMBRE APP</label>
                      <input style={miniInput} value={manifest.branding.appName} onChange={e => setManifest({...manifest, branding: {...manifest.branding, appName: e.target.value}})} />
                   </div>
                   <div>
                      <label style={miniLabel}>LOGO</label>
                      <input type="file" onChange={handleLogoUpload} style={{ display: 'block', marginTop: '10px' }} />
                      {manifest.branding.logo && <img src={manifest.branding.logo} style={{ maxHeight: '80px', marginTop: '10px' }} />}
                   </div>
                </div>
             </div>

             {/* PANEL DE TURNOS */}
             <div style={{ ...adminWidgetCard, marginTop: '20px' }}>
               <h3 style={{ fontSize: '13px', fontWeight: '800', marginBottom: '15px' }}>Turnos de Trabajo</h3>
               {shifts.map((s: any) => (
                 <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                   <span style={{ fontSize: '12px', fontWeight: '600' }}>{s.name}</span>
                   <span style={{ fontSize: '11px', color: '#64748b' }}>{s.start_hour}:00 – {s.end_hour}:00</span>
                   <button onClick={async () => {
                     if (!window.confirm(`¿Eliminar el turno "${s.name}"?`)) return;
                     await fetch(`${BASE_URL}/admin/shifts/${s.id}`, { method: 'DELETE', credentials: 'include' });
                     setShifts(prev => prev.filter(x => x.id !== s.id));
                   }} style={{ color: '#f87171', border: 'none', background: 'none', cursor: 'pointer', fontSize: '11px' }}>Borrar</button>
                 </div>
               ))}
               <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', marginTop: '15px', alignItems: 'end' }}>
                 <div>
                   <label style={miniLabel}>NOMBRE</label>
                   <input style={miniInput} placeholder="Matutino" value={newShift.name} onChange={e => setNewShift(p => ({ ...p, name: e.target.value }))} />
                 </div>
                 <div>
                   <label style={miniLabel}>INICIO</label>
                   <input type="number" min="0" max="23" style={miniInput} value={newShift.start_hour} onChange={e => setNewShift(p => ({ ...p, start_hour: Number(e.target.value) }))} />
                 </div>
                 <div>
                   <label style={miniLabel}>FIN</label>
                   <input type="number" min="0" max="23" style={miniInput} value={newShift.end_hour} onChange={e => setNewShift(p => ({ ...p, end_hour: Number(e.target.value) }))} />
                 </div>
                 <button onClick={async () => {
                   if (!newShift.name) return;
                   const r = await fetch(`${BASE_URL}/admin/tenants/${selectedTenant.id}/shifts`, {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     credentials: 'include',
                     body: JSON.stringify(newShift)
                   });
                   const s = await r.json();
                   setShifts(prev => [...prev, s]);
                   setNewShift({ name: '', start_hour: 6, end_hour: 14 });
                 }} style={{ padding: '8px 14px', background: '#38bdf8', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>+ Agregar</button>
               </div>
             </div>

             {/* PANEL EMAIL DE ALERTAS */}
             <div style={{ ...adminWidgetCard, marginTop: '20px' }}>
               <h3 style={{ fontSize: '13px', fontWeight: '800', marginBottom: '15px' }}>Email de Alertas</h3>
               <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px' }}>Se notificará a este correo cuando un sensor supere su umbral configurado (máx. 1 email cada 30 min por sensor).</p>
               <div style={{ display: 'flex', gap: '8px' }}>
                 <input
                   style={{ ...miniInput, flex: 1 }}
                   type="email"
                   placeholder="alertas@empresa.com"
                   value={notificationEmail}
                   onChange={e => setNotificationEmail(e.target.value)}
                 />
                 <button onClick={async () => {
                   const r = await fetch(`${BASE_URL}/admin/tenants/${selectedTenant.id}/notification-email`, {
                     method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                     credentials: 'include', body: JSON.stringify({ email: notificationEmail })
                   });
                   if (r.ok) alert('Email guardado');
                 }} style={{ padding: '8px 14px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', whiteSpace: 'nowrap' }}>
                   Guardar
                 </button>
               </div>
             </div>

             {/* PANEL USUARIOS */}
             <div style={{ ...adminWidgetCard, marginTop: '20px' }}>
               <h3 style={{ fontSize: '13px', fontWeight: '800', marginBottom: '15px' }}>Usuarios con Roles</h3>
               <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                 {tenantUsers.length === 0 && <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>Sin usuarios creados aún.</p>}
                 {tenantUsers.map((u: any) => (
                   <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px' }}>
                     <div>
                       <span style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b' }}>{u.display_name || u.username}</span>
                       <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '8px' }}>@{u.username}</span>
                     </div>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                       <span style={{ fontSize: '9px', fontWeight: '900', padding: '2px 8px', borderRadius: '6px',
                         background: u.role==='GERENTE'?'#ede9fe':u.role==='SUPERVISOR'?'#dbeafe':u.role==='ANALISTA'?'#d1fae5':'#f1f5f9',
                         color: u.role==='GERENTE'?'#6d28d9':u.role==='SUPERVISOR'?'#1d4ed8':u.role==='ANALISTA'?'#065f46':'#475569'
                       }}>{u.role}</span>
                       <button onClick={async () => {
                         if (!window.confirm(`¿Eliminar usuario "${u.username}"?`)) return;
                         await fetch(`${BASE_URL}/admin/tenants/${selectedTenant.id}/users/${u.id}`, { method: 'DELETE', credentials: 'include' });
                         setTenantUsers(prev => prev.filter(x => x.id !== u.id));
                       }} style={{ color: '#f87171', border: 'none', background: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}>Borrar</button>
                     </div>
                   </div>
                 ))}
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                 <div>
                   <label style={miniLabel}>USUARIO</label>
                   <input style={miniInput} placeholder="juan.perez" value={newUser.username} onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))} />
                 </div>
                 <div>
                   <label style={miniLabel}>NOMBRE</label>
                   <input style={miniInput} placeholder="Juan Pérez" value={newUser.displayName} onChange={e => setNewUser(p => ({ ...p, displayName: e.target.value }))} />
                 </div>
                 <div>
                   <label style={miniLabel}>CONTRASEÑA</label>
                   <input style={miniInput} type="password" placeholder="min. 6 caracteres" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
                 </div>
                 <div>
                   <label style={miniLabel}>ROL</label>
                   <select style={miniInput} value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}>
                     <option value="OPERADOR">OPERADOR</option>
                     <option value="ANALISTA">ANALISTA</option>
                     <option value="SUPERVISOR">SUPERVISOR</option>
                     <option value="GERENTE">GERENTE</option>
                   </select>
                 </div>
               </div>
               <button onClick={async () => {
                 if (!newUser.username || !newUser.password) return alert('Usuario y contraseña son requeridos');
                 const r = await fetch(`${BASE_URL}/admin/tenants/${selectedTenant.id}/users`, {
                   method: 'POST', headers: { 'Content-Type': 'application/json' },
                   credentials: 'include', body: JSON.stringify(newUser)
                 });
                 if (!r.ok) { const e = await r.json(); return alert(e.error); }
                 const u = await r.json();
                 setTenantUsers(prev => [...prev, u]);
                 setNewUser({ username: '', displayName: '', password: '', role: 'OPERADOR' });
               }} style={{ marginTop: '10px', padding: '8px 16px', background: '#38bdf8', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                 + Agregar Usuario
               </button>
             </div>

             {/* AUDIT LOG */}
             <div style={{ ...adminWidgetCard, marginTop: '20px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                 <h3 style={{ fontSize: '13px', fontWeight: '800', margin: 0 }}>Historial de Cambios</h3>
                 <button onClick={async () => {
                   if (!showAuditLog) {
                     const r = await fetch(`${BASE_URL}/admin/audit-logs?tenantId=${selectedTenant.id}`, { credentials: 'include' });
                     setAuditLogs(await r.json());
                   }
                   setShowAuditLog(p => !p);
                 }} style={{ fontSize: '11px', background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', color: '#64748b' }}>
                   {showAuditLog ? 'Ocultar' : 'Ver historial'}
                 </button>
               </div>
               {showAuditLog && (
                 <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                   {auditLogs.length === 0 ? (
                     <p style={{ fontSize: '11px', color: '#94a3b8' }}>Sin registros aún.</p>
                   ) : auditLogs.map((log: any) => (
                     <div key={log.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9', display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                       <div>
                         <span style={{ fontSize: '11px', fontWeight: '700', color: '#334155' }}>{log.action}</span>
                         {log.detail && Object.keys(log.detail).length > 0 && (
                           <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '8px' }}>{JSON.stringify(log.detail)}</span>
                         )}
                       </div>
                       <span style={{ fontSize: '10px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                         {new Date(log.created_at).toLocaleString()}
                       </span>
                     </div>
                   ))}
                 </div>
               )}
             </div>
          </div>
        ) : selectedAreaId ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2>{manifest.areas[selectedAreaId].name}</h2>
              <div style={{ background: '#cbd5e1', padding: '4px', borderRadius: '8px' }}>
                <button onClick={() => setActiveRole('operator')} style={{ ...roleBtnStyle, background: activeRole === 'operator' ? 'white' : 'transparent' }}>OPERADOR</button>
                <button onClick={() => setActiveRole('analyst')} style={{ ...roleBtnStyle, background: activeRole === 'analyst' ? 'white' : 'transparent' }}>ANALISTA</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
              {AVAILABLE_WIDGETS.map(w => (
                <button key={w.type} onClick={() => addWidget(w.type)} style={addWidgetBtn}>+ {w.label}</button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px' }}>
              {manifest.areas[selectedAreaId][activeRole]?.widgets?.map((w: any) => {
                // Obtenemos el componente real para la vista previa
                const WidgetComp = WidgetLibrary[w.type];

                return (
                  <div key={w.id} style={adminWidgetCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={badgeStyle}>{w.type}</span>
                      <button onClick={() => {
                        if (!window.confirm(`¿Eliminar este widget (${w.type})?`)) return;
                        const up = JSON.parse(JSON.stringify(manifest));
                        up.areas[selectedAreaId][activeRole].widgets = up.areas[selectedAreaId][activeRole].widgets.filter((x: any) => x.id !== w.id);
                        setManifest(up);
                      }} style={{ color: '#f87171', border: 'none', background: 'none', cursor: 'pointer' }}>Borrar</button>
                    </div>

                    {/* --- 3. CONFIGURACIÓN ESPECÍFICA SEGÚN EL TIPO --- */}
                    <div style={{ marginTop: '10px' }}>
                      <label style={miniLabel}>ETIQUETA / TÍTULO</label>
                      <input style={miniInput} value={w.props.label || ''} onChange={e => updateWidget(w.id, 'label', e.target.value)} />
                    </div>

                    {w.type === 'DAILY_EXECUTIVE_REPORT' ? (
                      <div style={{ marginTop: '10px', padding: '10px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <label style={miniLabel}>NOMBRE DEL ÁREA PARA EL REPORTE</label>
                        <input style={miniInput} value={w.props.areaId || ''} onChange={e => updateWidget(w.id, 'areaId', e.target.value)} />
                        <p style={{ fontSize: '10px', color: '#166534', marginTop: '5px' }}>* Este módulo detectará automáticamente todos los assets de este dashboard.</p>
                      </div>
                    ) : w.type === 'KANBAN' ? (
                      /* ... LÓGICA KANBAN EXISTENTE ... */
                      <div style={{ marginTop: '10px' }}>
                         <label style={miniLabel}>ORIGEN</label>
                         <input style={miniInput} list="assets" value={w.props.sourceAsset} onChange={e => updateWidget(w.id, 'sourceAsset', e.target.value)} />
                         <label style={miniLabel}>DESTINO</label>
                         <input style={miniInput} list="assets" value={w.props.targetAsset} onChange={e => updateWidget(w.id, 'targetAsset', e.target.value)} />
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                        <div>
                          <label style={miniLabel}>ASSET ID</label>
                          <input style={miniInput} list="assets" value={w.props.assetId || ''} onChange={e => updateWidget(w.id, 'assetId', e.target.value)} />
                        </div>
                        <div>
                          <label style={miniLabel}>KEY (EVENTO)</label>
                          <input style={miniInput} value={w.props.key || ''} onChange={e => updateWidget(w.id, 'key', e.target.value)} />
                        </div>
                        {(w.type === 'GAUGE' || w.type === 'SEMI_DONUT') && (
                          <div style={{ gridColumn: '1/-1' }}>
                            <label style={{ ...miniLabel, color: '#ef4444' }}>UMBRAL DE ALERTA (deja vacío para desactivar)</label>
                            <input
                              type="number"
                              style={{ ...miniInput, borderColor: '#fecaca' }}
                              placeholder="ej. 85"
                              value={w.props.alertThreshold ?? ''}
                              onChange={e => updateWidget(w.id, 'alertThreshold', e.target.value === '' ? undefined : Number(e.target.value))}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* VISTA PREVIA DEL WIDGET */}
                    <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px', pointerEvents: 'none' }}>
                       {WidgetComp && (
                         <WidgetComp 
                           data={w} 
                           color={manifest.branding?.primaryColor} 
                           areaId={w.props.areaId} 
                           availableAssets={assetSuggestions} // Mock de assets para la preview
                         />
                       )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : <p>Selecciona una empresa y luego un área.</p>}
      </main>
      <datalist id="assets">{assetSuggestions.map(s => <option key={s} value={s} />)}</datalist>
    </div>
  );
}

// ESTILOS SE MANTIENEN IGUAL...
const labelStyle = { fontSize: '11px', fontWeight: 'bold' as any, color: '#94a3b8', display: 'block', marginBottom: '5px', marginTop: '15px' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', background: '#1e293b', color: 'white', border: 'none' };
const btnSaveStyle = { width: '100%', padding: '12px', color: 'white', borderRadius: '8px', fontWeight: 'bold' as any, border: 'none', cursor: 'pointer', marginTop: '15px' };
const areaBtnStyle = { width: '100%', padding: '10px', borderRadius: '8px', color: 'white', textAlign: 'left' as any, cursor: 'pointer', marginBottom: '5px', border: 'none' };
const roleBtnStyle = { border: 'none', padding: '6px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' as any };
const addWidgetBtn = { padding: '8px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer', fontSize: '12px', background: 'white' };
const adminWidgetCard = { background: 'white', padding: '20px', borderRadius: '15px', border: '1px solid #e2e8f0', marginBottom: '20px' };
const miniInput = { width: '100%', padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' };
const miniLabel = { fontSize: '10px', fontWeight: 'bold' as any, color: '#64748b' };
const badgeStyle = { background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' as any };
const addFieldBtn = { fontSize: '10px', padding: '2px 8px', borderRadius: '4px', border: 'none', background: '#38bdf8', color: 'white', cursor: 'pointer' };
const microInput = { flex: 1, padding: '5px', fontSize: '10px', borderRadius: '4px', border: '1px solid #eee' };