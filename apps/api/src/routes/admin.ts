import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { adminAuthMiddleware } from '../middleware/auth.js';
import { auditLog } from '../utils/audit.js';

const router = Router();
router.use(adminAuthMiddleware);

const USER_ROLES = ['OPERADOR', 'SUPERVISOR', 'ANALISTA', 'GERENTE'];

router.get('/tenants', async (_req, res) => {
  try {
    const r = await pool.query('SELECT * FROM tenants ORDER BY name ASC');
    res.json(r.rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch('/tenants/:id/basic-info', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, slug } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'name y slug son obligatorios' });
  if (typeof name !== 'string' || typeof slug !== 'string') return res.status(400).json({ error: 'Tipos inválidos' });
  if (name.length > 200 || slug.length > 100) return res.status(400).json({ error: 'Valores demasiado largos' });
  try {
    await pool.query('UPDATE tenants SET name = $1, slug = $2 WHERE id = $3', [name.trim(), slug.trim().toLowerCase(), id]);
    auditLog({ performedBy: 'admin', action: 'update_tenant_info', detail: { tenantId: id, name, slug }, tenantId: id, ip: String(req.ip ?? "") });
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch('/tenants/:id/notification-email', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { email } = req.body;
  if (email && (typeof email !== 'string' || !email.includes('@'))) {
    return res.status(400).json({ error: 'Email inválido' });
  }
  try {
    await pool.query('UPDATE tenants SET notification_email = $1 WHERE id = $2', [email?.trim() || null, id]);
    auditLog({ performedBy: 'admin', action: 'update_notification_email', detail: { tenantId: id, email }, tenantId: id, ip: String(req.ip ?? "") });
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch('/tenants/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { manifest } = req.body;
  if (!manifest || typeof manifest !== 'object') return res.status(400).json({ error: 'Se requiere un manifest válido' });
  try {
    const check = await pool.query('SELECT id FROM tenants WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Tenant no encontrado' });
    await pool.query('UPDATE tenants SET manifest = $1 WHERE id = $2', [JSON.stringify(manifest), id]);
    auditLog({ performedBy: 'admin', action: 'update_manifest', detail: { tenantId: id }, tenantId: id, ip: String(req.ip ?? "") });
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/tenants/:id/areas', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { areaName } = req.body;
  try {
    const result = await pool.query('SELECT manifest FROM tenants WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tenant no encontrado' });
    const manifest = result.rows[0].manifest || { areas: {} };
    const areaId = `area-${Date.now()}`;
    if (!manifest.areas) manifest.areas = {};
    manifest.areas[areaId] = { name: areaName, operator: { widgets: [] }, analyst: { widgets: [] } };
    await pool.query('UPDATE tenants SET manifest = $1 WHERE id = $2', [JSON.stringify(manifest), id]);
    res.json({ success: true, areaId, manifest });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch('/tenants/:id/access-code', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { code } = req.body;
  if (!code || typeof code !== 'string' || code.length < 4) {
    return res.status(400).json({ error: 'El código debe tener al menos 4 caracteres' });
  }
  try {
    const hash = await bcrypt.hash(code, 10);
    await pool.query('UPDATE tenants SET access_code = $1 WHERE id = $2', [hash, id]);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/tenants/:id/shifts', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, start_hour, end_hour } = req.body;
  if (!name || start_hour === undefined || end_hour === undefined) {
    return res.status(400).json({ error: 'name, start_hour y end_hour son requeridos' });
  }
  if (typeof start_hour !== 'number' || typeof end_hour !== 'number') {
    return res.status(400).json({ error: 'start_hour y end_hour deben ser números' });
  }
  try {
    const r = await pool.query(
      'INSERT INTO shifts (tenant_id, name, start_hour, end_hour) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, String(name).trim().slice(0, 50), Math.floor(start_hour), Math.floor(end_hour)]
    );
    auditLog({ performedBy: 'admin', action: 'create_shift', detail: { tenantId: id, name, start_hour, end_hour }, tenantId: id, ip: String(req.ip ?? "") });
    res.status(201).json(r.rows[0]);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/shifts/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM shifts WHERE id = $1', [id]);
    auditLog({ performedBy: 'admin', action: 'delete_shift', detail: { shiftId: id }, ip: String(req.ip ?? "") });
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/audit-logs', async (req: Request, res: Response) => {
  const tenantId = req.query.tenantId as string | undefined;
  try {
    const r = await pool.query(
      `SELECT al.*, t.name as tenant_name FROM audit_logs al
       LEFT JOIN tenants t ON t.id = al.tenant_id
       ${tenantId ? 'WHERE al.tenant_id = $1' : ''}
       ORDER BY al.created_at DESC LIMIT 100`,
      tenantId ? [tenantId] : []
    );
    res.json(r.rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/assets/suggestions', async (_req, res) => {
  try {
    const r = await pool.query(`SELECT id FROM assets UNION SELECT DISTINCT asset_id as id FROM telemetry`);
    res.json(r.rows.map((row: any) => row.id));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/assets/sync', async (req: Request, res: Response) => {
  const { assets } = req.body;
  if (!assets || !Array.isArray(assets)) return res.status(400).json({ error: 'Se requiere un array de assets' });
  if (assets.length > 500) return res.status(400).json({ error: 'Máximo 500 assets por sync' });
  const sanitized = assets
    .filter((a: any) => typeof a === 'string' && a.trim().length > 0)
    .map((a: string) => a.trim().slice(0, 100));
  if (sanitized.length === 0) return res.json({ success: true, count: 0 });
  try {
    await pool.query(
      `INSERT INTO assets (id, name) SELECT unnest($1::text[]), 'Asset Autocreado' ON CONFLICT (id) DO NOTHING;`,
      [sanitized]
    );
    res.json({ success: true, count: sanitized.length });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/tenants/:id/users', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const r = await pool.query(
      'SELECT id, username, display_name, role, is_active, created_at FROM tenant_users WHERE tenant_id = $1 ORDER BY role, username',
      [id]
    );
    res.json(r.rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/tenants/:id/users', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { username, displayName, password, role } = req.body;
  if (!username || !password || !role) return res.status(400).json({ error: 'username, password y role son requeridos' });
  if (!USER_ROLES.includes(role)) return res.status(400).json({ error: 'role inválido' });
  if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  try {
    const hash = await bcrypt.hash(String(password), 10);
    const r = await pool.query(
      'INSERT INTO tenant_users (tenant_id, username, display_name, password_hash, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, username, display_name, role',
      [id, String(username).trim().toLowerCase(), displayName ? String(displayName).trim() : null, hash, role]
    );
    auditLog({ performedBy: 'admin', action: 'user_created', detail: { tenantId: id, username, role }, tenantId: id });
    res.status(201).json(r.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'El usuario ya existe para este tenant' });
    res.status(500).json({ error: err.message });
  }
});

router.delete('/tenants/:id/users/:uid', async (req: Request, res: Response) => {
  const { id, uid } = req.params;
  try {
    await pool.query('DELETE FROM tenant_users WHERE id = $1 AND tenant_id = $2', [uid, id]);
    auditLog({ performedBy: 'admin', action: 'user_deleted', detail: { tenantId: id, userId: uid }, tenantId: id });
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
