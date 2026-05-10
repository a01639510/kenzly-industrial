import { Router, Request, Response } from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

const SCRAP_CATEGORIES = ['DIMENSIONAL', 'COSMÉTICO', 'FUNCIONAL', 'MATERIAL', 'PROCESO', 'OTRO'];

router.get('/', async (req: Request, res: Response) => {
  const { tenantId } = (req as any).user;
  const limit  = Math.min(Number(req.query.limit) || 100, 500);
  const offset = Number(req.query.offset) || 0;
  const from   = req.query.from ? String(req.query.from) : null;
  const to     = req.query.to   ? String(req.query.to)   : null;
  try {
    const r = await pool.query(
      `SELECT s.*, o.order_number, o.product_name
       FROM scrap_records s
       LEFT JOIN production_orders o ON o.id = s.order_id
       WHERE s.tenant_id=$1
         AND ($2::timestamptz IS NULL OR s.created_at >= $2::timestamptz)
         AND ($3::timestamptz IS NULL OR s.created_at <= $3::timestamptz)
       ORDER BY s.created_at DESC LIMIT $4 OFFSET $5`,
      [tenantId, from, to, limit, offset]
    );
    res.json(r.rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req: Request, res: Response) => {
  const { tenantId } = (req as any).user;
  const { assetId, areaId, orderId, quantity, reasonCategory, reasonDescription, inspector } = req.body;
  if (!quantity || Number(quantity) <= 0) return res.status(400).json({ error: 'quantity debe ser mayor a 0' });
  if (reasonCategory && !SCRAP_CATEGORIES.includes(reasonCategory)) return res.status(400).json({ error: 'reasonCategory inválida' });
  try {
    const r = await pool.query(
      `INSERT INTO scrap_records (tenant_id, asset_id, area_id, order_id, quantity, reason_category, reason_description, inspector)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        tenantId, assetId||null, areaId||null, orderId||null, Number(quantity),
        reasonCategory||null,
        reasonDescription ? String(reasonDescription).trim().substring(0, 500) : null,
        inspector ? String(inspector).trim().substring(0, 100) : null,
      ]
    );
    if (orderId) {
      await pool.query(
        `UPDATE production_orders SET updated_at=NOW() WHERE id=$1 AND tenant_id=$2`,
        [orderId, tenantId]
      );
    }
    res.status(201).json(r.rows[0]);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/summary', async (req: Request, res: Response) => {
  const { tenantId } = (req as any).user;
  try {
    const [todayRes, weekRes, byCatRes] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(quantity),0) AS total, COUNT(*) AS records FROM scrap_records
         WHERE tenant_id=$1 AND created_at >= CURRENT_DATE`,
        [tenantId]
      ),
      pool.query(
        `SELECT COALESCE(SUM(quantity),0) AS total, COUNT(*) AS records FROM scrap_records
         WHERE tenant_id=$1 AND created_at >= NOW()-INTERVAL '7 days'`,
        [tenantId]
      ),
      pool.query(
        `SELECT reason_category, COALESCE(SUM(quantity),0) AS total FROM scrap_records
         WHERE tenant_id=$1 AND created_at >= NOW()-INTERVAL '7 days'
         GROUP BY reason_category ORDER BY total DESC`,
        [tenantId]
      ),
    ]);
    res.json({ today: todayRes.rows[0], week: weekRes.rows[0], byCategory: byCatRes.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
