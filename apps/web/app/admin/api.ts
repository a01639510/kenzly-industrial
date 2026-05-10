const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const adminApi = {
  // --- CLIENTES (TENANTS) ---
  
  /** Obtiene la lista simplificada de clientes para el dropdown */
  getTenants: () =>
    fetch(`${BASE_URL}/admin/tenants`, { credentials: 'include' }).then(r => r.json()),

  /** * 🔥 CLAVE PARA LA DEMO: Obtiene el tenant con sus Áreas Físicas vinculadas.
   * Esto permite que el frontend sincronice la tabla 'areas' con el 'manifest'.
   */
  getTenantFull: (id: string) => 
    fetch(`${BASE_URL}/admin/tenants/${id}`).then(r => {
        if (!r.ok) throw new Error('Error al obtener detalle del tenant');
        return r.json();
    }),

  // --- ÁREAS ---

  /** Obtiene las áreas de la tabla relacional 'areas' */
  getAreas: (tenantId: string) => 
    fetch(`${BASE_URL}/admin/tenants/${tenantId}/areas`).then(r => r.json()),
  
  createArea: (tenantId: string, name: string) => 
    fetch(`${BASE_URL}/admin/areas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId, name })
    }).then(r => r.json()),

  deleteArea: (id: string) => 
    fetch(`${BASE_URL}/admin/areas/${id}`, { method: 'DELETE' }),

  // --- ASSETS (MÁQUINAS/ACTIVOS) ---
  
  createAsset: (id: string, areaId: string, name: string) =>
    fetch(`${BASE_URL}/admin/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, area_id: areaId, name })
    }).then(r => r.json()),

  getAssetSuggestions: () =>
    fetch(`${BASE_URL}/admin/assets/suggestions`, { credentials: 'include' }).then(r => r.json()),

  /** Asegura que los IDs usados en el config existan en la tabla assets */
  syncAssets: (assets: string[]) =>
    fetch(`${BASE_URL}/admin/assets/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ assets })
    }).then(r => r.json()),

  // --- ANÁLISIS DINÁMICO DE TELEMETRÍA ---
  
  /** Lee las keys dentro del JSONB 'metadata' de la tabla telemetry */
  getMetadataKeys: (assetId: string) => 
    fetch(`${BASE_URL}/admin/assets/${assetId}/metadata-keys`).then(r => r.json()),

  /** Datos para gráficas de tendencia */
  getChartData: (assetId: string, key: string) => 
    fetch(`${BASE_URL}/telemetry/chart/${assetId}/${key}`).then(r => r.json()),

  /** Obtiene el valor más reciente para Gauges o Indicadores */
  getLatestValue: async (assetId: string, key: string) => {
    const cleanKey = encodeURIComponent(key.trim());
    const response = await fetch(`${BASE_URL}/telemetry/latest/${assetId}/${cleanKey}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`❌ Error Telemetría:`, { assetId, key, errorData });
      throw new Error(errorData.error || `Error ${response.status}`);
    }
    return response.json();
  },

  // --- CONFIGURACIÓN MAESTRA (SINCRONIZACIÓN) ---

  /** * Guarda el Manifest completo (Branding + Áreas + Widgets).
   * Aquí es donde el color y el logo se persisten en SQL.
   */
  saveConfig: (tenantId: string, manifest: any) =>
    fetch(`${BASE_URL}/admin/tenants/${tenantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ manifest })
    }).then(async (r) => {
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || 'Error al sincronizar');
      }
      return r.json();
    }),

  // --- AUTH ---

  setAccessCode: (tenantId: string, code: string) =>
    fetch(`${BASE_URL}/admin/tenants/${tenantId}/access-code`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code })
    }).then(async r => {
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      return r.json();
    }),

  logout: () =>
    fetch(`${BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' }),
};