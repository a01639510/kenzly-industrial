import { Router, Request, Response } from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { auditLog } from '../utils/audit.js';

const router = Router();
router.use(authMiddleware);

const ORDER_STATUSES   = ['PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA'];
const ORDER_PRIORITIES = ['BAJA', 'NORMAL', 'ALTA', 'URGENTE'];

router.get('/', async (req: Request, res: Response) => {
  const { tenantId } = (req as any).user;
  const status  = req.query.status  ? String(req.query.status)  : null;
  const areaId  = req.query.areaId  ? String(req.query.areaId)  : null;
  const assetId = req.query.assetId ? String(req.query.assetId) : null;
  const limit   = Math.min(Number(req.query.limit) || 100, 500);
  try {
    const r = await pool.query(
      `SELECT * FROM production_orders
       WHERE tenant_id = $1
         AND ($2::text IS NULL OR status = $2)
         AND ($3::text IS NULL OR area_id = $3)
         AND ($4::text IS NULL OR LOWER(asset_id) = LOWER($4))
       ORDER BY
         CASE status WHEN 'EN_PROCESO' THEN 1 WHEN 'PENDIENTE' THEN 2 WHEN 'COMPLETADA' THEN 3 ELSE 4 END,
         CASE priority WHEN 'URGENTE' THEN 1 WHEN 'ALTA' THEN 2 WHEN 'NORMAL' THEN 3 ELSE 4 END,
         created_at DESC
       LIMIT $5`,
      [tenantId, status, areaId, assetId, limit]
    );
    res.json(r.rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/summary', async (req: Request, res: Response) => {
  const { tenantId } = (req as any).user;
  try {
    const r = await pool.query(
      `SELECT status, COUNT(*) AS count,
         COALESCE(SUM(target_quantity),0) AS total_target,
         COALESCE(SUM(actual_quantity),0) AS total_actual
       FROM production_orders
       WHERE tenant_id = $1
         AND (status != 'COMPLETADA' OR completed_at >= CURRENT_DATE)
       GROUP BY status`,
      [tenantId]
    );
    const byStatus = Object.fromEntries(r.rows.map((row: any) => [row.status, row]));
    const inProcess = byStatus['EN_PROCESO'];
    const completionRate = inProcess && Number(inProcess.total_target) > 0
      ? Math.round((Number(inProcess.total_actual) / Number(inProcess.total_target)) * 100)
      : null;
    res.json({ byStatus, completionRate });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req: Request, res: Response) => {
  const { tenantId } = (req as any).user;
  const { orderNumber, productName, targetQuantity, assetId, areaId, priority, notes, dueAt } = req.body;
  if (!orderNumber || !productName || !targetQuantity) {
    return res.status(400).json({ error: 'orderNumber, productName y targetQuantity son obligatorios' });
  }
  if (!ORDER_PRIORITIES.includes(priority)) return res.status(400).json({ error: 'priority inválida' });
  try {
    const r = await pool.query(
      `INSERT INTO production_orders
         (tenant_id, order_number, product_name, target_quantity, asset_id, area_id, priority, notes, due_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        tenantId,
        String(orderNumber).trim().substring(0, 50),
        String(productName).trim().substring(0, 200),
        Math.abs(Number(targetQuantity)),
        assetId ? String(assetId).trim().substring(0, 100) : null,
        areaId  ? String(areaId).trim().substring(0, 100)  : null,
        priority || 'NORMAL',
        notes ? String(notes).trim().substring(0, 1000) : null,
        dueAt ? new Date(dueAt) : null,
      ]
    );
    auditLog({ performedBy: 'operator', action: 'order_created', detail: { orderId: r.rows[0].id, orderNumber, productName }, tenantId });
    res.status(201).json(r.rows[0]);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id', async (req: Request, res: Response) => {
  const { tenantId } = (req as any).user;
  const orderId = String(req.params.id).trim();
  const { status, actualQuantity, notes, priority } = req.body;
  if (status && !ORDER_STATUSES.includes(status)) return res.status(400).json({ error: 'status inválido' });
  if (priority && !ORDER_PRIORITIES.includes(priority)) return res.status(400).json({ error: 'priority inválida' });
  try {
    const existing = await pool.query(
      `SELECT id, status FROM production_orders WHERE id = $1 AND tenant_id = $2`,
      [orderId, tenantId]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Orden no encontrada' });
    const r = await pool.query(
      `UPDATE production_orders SET
         status          = COALESCE($1, status),
         actual_quantity = COALESCE($2, actual_quantity),
         notes           = COALESCE($3, notes),
         priority        = COALESCE($4, priority),
         started_at      = CASE WHEN $1 = 'EN_PROCESO' AND started_at IS NULL THEN NOW() ELSE started_at END,
         completed_at    = CASE WHEN $1 = 'COMPLETADA' THEN NOW() ELSE completed_at END,
         updated_at      = NOW()
       WHERE id = $5 AND tenant_id = $6 RETURNING *`,
      [status || null, actualQuantity != null ? Number(actualQuantity) : null, notes || null, priority || null, orderId, tenantId]
    );
    auditLog({ performedBy: 'operator', action: 'order_updated', detail: { orderId, status, actualQuantity }, tenantId });
    res.json(r.rows[0]);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/compliance', async (req: Request, res: Response) => {
  const { tenantId } = (req as any).user;
  try {
    const r = await pool.query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'COMPLETADA') AS completed,
         COUNT(*) FILTER (WHERE status = 'COMPLETADA' AND due_at IS NOT NULL AND completed_at <= due_at) AS on_time,
         COUNT(*) FILTER (WHERE status = 'COMPLETADA' AND due_at IS NOT NULL AND completed_at >  due_at) AS late,
         COUNT(*) FILTER (WHERE status NOT IN ('COMPLETADA','CANCELADA') AND due_at < NOW()) AS overdue,
         COALESCE(
           AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/3600)
           FILTER (WHERE status='COMPLETADA' AND started_at IS NOT NULL), 0
         )::numeric(10,1) AS avg_cycle_hours
       FROM production_orders
       WHERE tenant_id=$1 AND created_at >= NOW()-INTERVAL '30 days'`,
      [tenantId]
    );
    const trend = await pool.query(
      `SELECT DATE_TRUNC('week', created_at) AS week_start,
         COUNT(*) FILTER (WHERE status='COMPLETADA') AS completed,
         COUNT(*) FILTER (WHERE status='COMPLETADA' AND due_at IS NOT NULL AND completed_at<=due_at) AS on_time
       FROM production_orders
       WHERE tenant_id=$1 AND created_at >= NOW()-INTERVAL '28 days'
       GROUP BY week_start ORDER BY week_start`,
      [tenantId]
    );
    res.json({ ...r.rows[0], trend: trend.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req: Request, res: Response) => {
  const { tenantId } = (req as any).user;
  const orderId = String(req.params.id).trim();
  try {
    const r = await pool.query(
      `UPDATE production_orders SET status = 'CANCELADA', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND status NOT IN ('COMPLETADA','CANCELADA')
       RETURNING id`,
      [orderId, tenantId]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Orden no encontrada o ya finalizada' });
    auditLog({ performedBy: 'operator', action: 'order_cancelled', detail: { orderId }, tenantId });
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
