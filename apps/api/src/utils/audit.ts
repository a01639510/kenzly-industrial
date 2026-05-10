import pool from '../db.js';

export async function auditLog(opts: {
  performedBy: string;
  action: string;
  detail?: any;
  tenantId?: string | string[];
  ip?: string | string[];
}) {
  const tid = Array.isArray(opts.tenantId) ? opts.tenantId[0] : (opts.tenantId || null);
  const ip  = Array.isArray(opts.ip)       ? opts.ip[0]       : (opts.ip       || null);
  pool.query(
    `INSERT INTO audit_logs (tenant_id, performed_by, action, detail, ip) VALUES ($1, $2, $3, $4, $5)`,
    [tid, opts.performedBy, opts.action, JSON.stringify(opts.detail || {}), ip]
  ).catch(() => {});
}
