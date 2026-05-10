import { Router, Request, Response } from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { auditLog } from '../utils/audit.js';

const router = Router();
router.use(authMiddleware);

router.get('/causes', async (req: Request, res: Response) => {
  const { tenantId } = (req as any).user;
  try {
    const r = await pool.query(
      `SELECT id, code, label, category FROM downtime_causes
       WHERE tenant_id IS NULL OR tenant_id = $1
       ORDER BY category ASC, label ASC`,
      [tenantId]
    );
    res.json(r.rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/active', async (req: Request, res: Response) => {
  const { tenantId } = (req as any).user;
  try {
    const r = await pool.query(
      `SELECT e.*, c.label AS cause_label, c.category AS cause_category
       FROM downtime_events e
       LEFT JOIN downtime_causes c ON c.id = e.cause_id
       WHERE e.tenant_id = $1 AND e.ended_at IS NULL
       ORDER BY e.started_at DESC LIMIT 1`,
      [tenantId]
    );
    res.json(r.rows[0] || null);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/start', async (req: Request, res: Response) => {
  const { tenantId } = (req as any).user;
  const { assetId, areaId, causeId, causeDescription, responsible } = req.body;
  try {
    const existing = await pool.query(
      `SELECT id FROM downtime_events WHERE tenant_id = $1 AND ended_at IS NULL LIMIT 1`,
      [tenantId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Ya hay un paro activo. Ciérralo antes de abrir uno nuevo.' });
    }
    const r = await pool.query(
      `INSERT INTO downtime_events (tenant_id, asset_id, area_id, cause_id, cause_description, responsible)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        tenantId,
        assetId ? String(assetId).trim().substring(0, 100) : null,
        areaId  ? String(areaId).trim().substring(0, 100)  : null,
        causeId ? Number(causeId) : null,
        causeDescription ? String(causeDescription).trim().substring(0, 500) : null,
        responsible ? String(responsible).trim().substring(0, 100) : null,
      ]
    );
    auditLog({ performedBy: 'operator', action: 'downtime_start', detail: { assetId, causeId }, tenantId });
    res.status(201).json(r.rows[0]);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/end', async (req: Request, res: Response) => {
  const { tenantId } = (req as any).user;
  const eventId = String(req.params.id).trim();
  const { causeId, causeDescription, responsible } = req.body;
  try {
    const existing = await pool.query(
      `SELECT id, started_at FROM downtime_events WHERE id = $1 AND tenant_id = $2 AND ended_at IS NULL`,
      [eventId, tenantId]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Evento no encontrado o ya cerrado' });
    const durationMinutes = Math.round((Date.now() - new Date(existing.rows[0].started_at).getTime()) / 60000);
    const r = await pool.query(
      `UPDATE downtime_events SET
         ended_at          = NOW(),
         duration_minutes  = $1,
         cause_id          = COALESCE($2, cause_id),
         cause_description = COALESCE($3, cause_description),
         responsible       = COALESCE($4, responsible)
       WHERE id = $5 AND tenant_id = $6 RETURNING *`,
      [
        durationMinutes,
        causeId ? Number(causeId) : null,
        causeDescription ? String(causeDescription).trim().substring(0, 500) : null,
        responsible ? String(responsible).trim().substring(0, 100) : null,
        eventId, tenantId,
      ]
    );
    auditLog({ performedBy: 'operator', action: 'downtime_end', detail: { eventId, durationMinutes }, tenantId });
    res.json(r.rows[0]);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/history', async (req: Request, res: Response) => {
  const { tenantId } = (req as any).user;
  const limit   = Math.min(Number(req.query.limit)  || 50, 200);
  const offset  = Number(req.query.offset) || 0;
  const from    = req.query.from    ? String(req.query.from)    : null;
  const to      = req.query.to      ? String(req.query.to)      : null;
  const areaId  = req.query.areaId  ? String(req.query.areaId)  : null;
  const assetId = req.query.assetId ? String(req.query.assetId) : null;
  try {
    const r = await pool.query(
      `SELECT e.id, e.asset_id, e.area_id, e.started_at, e.ended_at,
              e.duration_minutes, e.cause_description, e.responsible,
              c.label AS cause_label, c.category AS cause_category
       FROM downtime_events e
       LEFT JOIN downtime_causes c ON c.id = e.cause_id
       WHERE e.tenant_id = $1
         AND e.ended_at IS NOT NULL
         AND ($2::timestamptz IS NULL OR e.started_at >= $2::timestamptz)
         AND ($3::timestamptz IS NULL OR e.started_at <= $3::timestamptz)
         AND ($4::text IS NULL OR e.area_id = $4)
         AND ($5::text IS NULL OR LOWER(e.asset_id) = LOWER($5))
       ORDER BY e.started_at DESC
       LIMIT $6 OFFSET $7`,
      [tenantId, from, to, areaId, assetId, limit, offset]
    );
    res.json(r.rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/summary', async (req: Request, res: Response) => {
  const { tenantId } = (req as any).user;
  try {
    const [today, week, byCategory] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS count, COALESCE(SUM(duration_minutes),0) AS total_minutes
         FROM downtime_events
         WHERE tenant_id = $1 AND ended_at IS NOT NULL AND started_at >= CURRENT_DATE`,
        [tenantId]
      ),
      pool.query(
        `SELECT COUNT(*) AS count, COALESCE(SUM(duration_minutes),0) AS total_minutes
         FROM downtime_events
         WHERE tenant_id = $1 AND ended_at IS NOT NULL AND started_at >= NOW() - INTERVAL '7 days'`,
        [tenantId]
      ),
      pool.query(
        `SELECT c.category, COUNT(e.id) AS count, COALESCE(SUM(e.duration_minutes),0) AS total_minutes
         FROM downtime_events e
         LEFT JOIN downtime_causes c ON c.id = e.cause_id
         WHERE e.tenant_id = $1 AND e.ended_at IS NOT NULL AND e.started_at >= NOW() - INTERVAL '7 days'
         GROUP BY c.category ORDER BY total_minutes DESC`,
        [tenantId]
      ),
    ]);
    res.json({ today: today.rows[0], week: week.rows[0], byCategory: byCategory.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
