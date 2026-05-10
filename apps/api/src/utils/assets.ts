import pool from '../db.js';

export async function getTenantAssetIds(tenantId: string): Promise<Set<string>> {
  const r = await pool.query('SELECT manifest FROM tenants WHERE id = $1', [tenantId]);
  if (!r.rows.length) return new Set();
  const ids = new Set<string>();
  for (const area of Object.values(r.rows[0].manifest?.areas || {}) as any[]) {
    for (const view of ['operator', 'analyst']) {
      for (const w of area[view]?.widgets || []) {
        if (w.props?.assetId) ids.add(String(w.props.assetId).toLowerCase());
      }
    }
  }
  return ids;
}
