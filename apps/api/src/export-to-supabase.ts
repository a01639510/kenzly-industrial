/**
 * export-to-supabase.ts
 * Exporta los datos del tenant demo-industrial a un archivo SQL
 * para importar en Supabase después de correr las migraciones.
 *
 * Uso: npx tsx src/export-to-supabase.ts > seed_supabase.sql
 */
import pool from './db.js';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';

function esc(v: any): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (v instanceof Date) return `'${v.toISOString()}'`;
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return `'${s.replace(/'/g, "''")}'`;
}

function insertRow(table: string, row: Record<string, any>): string {
  const cols = Object.keys(row).join(', ');
  const vals = Object.values(row).map(esc).join(', ');
  return `INSERT INTO ${table} (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING;`;
}

async function run() {
  const lines: string[] = [
    '-- Kenzly Industrial — Supabase Seed',
    `-- Generado: ${new Date().toISOString()}`,
    '-- Ejecutar DESPUÉS de desplegar la API (que corre las migraciones automáticamente)',
    '',
    'BEGIN;',
    '',
  ];

  // Tenant
  const t = await pool.query(`SELECT * FROM tenants WHERE id = $1`, [TENANT_ID]);
  lines.push('-- TENANT');
  t.rows.forEach(r => lines.push(insertRow('tenants', r)));
  lines.push('');

  // Assets
  const a = await pool.query(`SELECT * FROM assets`);
  lines.push('-- ASSETS');
  a.rows.forEach(r => lines.push(insertRow('assets', r)));
  lines.push('');

  // Shifts
  const sh = await pool.query(`SELECT * FROM shifts WHERE tenant_id = $1`, [TENANT_ID]);
  lines.push('-- SHIFTS');
  sh.rows.forEach(r => lines.push(insertRow('shifts', r)));
  lines.push('');

  // Tenant users (passwords ya hasheadas, se mantienen)
  const u = await pool.query(`SELECT * FROM tenant_users WHERE tenant_id = $1`, [TENANT_ID]);
  lines.push('-- TENANT_USERS');
  u.rows.forEach(r => lines.push(insertRow('tenant_users', r)));
  lines.push('');

  // Downtime causes (globales sin tenant)
  const dc = await pool.query(`SELECT * FROM downtime_causes WHERE tenant_id IS NULL`);
  lines.push('-- DOWNTIME_CAUSES (globales)');
  dc.rows.forEach(r => lines.push(insertRow('downtime_causes', r)));
  lines.push('');

  // Production orders
  const po = await pool.query(`SELECT * FROM production_orders WHERE tenant_id = $1`, [TENANT_ID]);
  lines.push('-- PRODUCTION_ORDERS');
  po.rows.forEach(r => lines.push(insertRow('production_orders', r)));
  lines.push('');

  // Scrap records
  const sr = await pool.query(`SELECT * FROM scrap_records WHERE tenant_id = $1`, [TENANT_ID]);
  lines.push('-- SCRAP_RECORDS');
  sr.rows.forEach(r => lines.push(insertRow('scrap_records', r)));
  lines.push('');

  // Downtime events
  const de = await pool.query(`SELECT * FROM downtime_events WHERE tenant_id = $1`, [TENANT_ID]);
  lines.push('-- DOWNTIME_EVENTS');
  de.rows.forEach(r => lines.push(insertRow('downtime_events', r)));
  lines.push('');

  // Maintenance plans + records
  const mp = await pool.query(`SELECT * FROM maintenance_plans WHERE tenant_id = $1`, [TENANT_ID]);
  lines.push('-- MAINTENANCE_PLANS');
  mp.rows.forEach(r => lines.push(insertRow('maintenance_plans', r)));
  lines.push('');

  const mr = await pool.query(`SELECT * FROM maintenance_records WHERE tenant_id = $1`, [TENANT_ID]);
  lines.push('-- MAINTENANCE_RECORDS');
  mr.rows.forEach(r => lines.push(insertRow('maintenance_records', r)));
  lines.push('');

  // Telemetry (todos los registros del demo — ~1700 filas)
  const tel = await pool.query(
    `SELECT * FROM telemetry ORDER BY timestamp ASC`
  );
  lines.push(`-- TELEMETRY (${tel.rows.length} filas)`);
  tel.rows.forEach(r => lines.push(insertRow('telemetry', r)));
  lines.push('');

  lines.push('COMMIT;');
  lines.push('');
  lines.push(`-- Filas exportadas:`);
  lines.push(`--   tenants: ${t.rows.length}`);
  lines.push(`--   assets: ${a.rows.length}`);
  lines.push(`--   shifts: ${sh.rows.length}`);
  lines.push(`--   tenant_users: ${u.rows.length}`);
  lines.push(`--   production_orders: ${po.rows.length}`);
  lines.push(`--   scrap_records: ${sr.rows.length}`);
  lines.push(`--   downtime_events: ${de.rows.length}`);
  lines.push(`--   maintenance_plans: ${mp.rows.length}`);
  lines.push(`--   telemetry: ${tel.rows.length}`);

  console.log(lines.join('\n'));
  await pool.end();
}

run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
