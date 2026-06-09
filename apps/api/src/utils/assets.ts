import pool from '../db.js';

export async function getTenantAssetIds(tenantId: string): Promise<Set<string>> {
  const [tenantResult, plansResult, downtimeResult, ordersResult] = await Promise.all([
    pool.query('SELECT manifest FROM tenants WHERE id = $1', [tenantId]),
    pool.query('SELECT DISTINCT asset_id FROM maintenance_plans WHERE tenant_id = $1', [tenantId]),
    pool.query('SELECT DISTINCT asset_id FROM downtime_events WHERE tenant_id = $1', [tenantId]),
    pool.query('SELECT DISTINCT asset_id FROM production_orders WHERE tenant_id = $1', [tenantId]),
  ]);

  const ids = new Set<string>();

  // From manifest widgets
  for (const area of Object.values(tenantResult.rows[0]?.manifest?.areas || {}) as any[]) {
    for (const view of ['operator', 'analyst']) {
      for (const w of area[view]?.widgets || []) {
        if (w.props?.assetId) ids.add(String(w.props.assetId).toLowerCase());
      }
    }
  }

  // From tenant-scoped tables (catches assets without manifest widgets)
  for (const row of [...plansResult.rows, ...downtimeResult.rows, ...ordersResult.rows]) {
    if (row.asset_id) ids.add(String(row.asset_id).toLowerCase());
  }

  return ids;
}
