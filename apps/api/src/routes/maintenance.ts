import { Router, Request, Response } from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/plans', async (req: Request, res: Response) => {
  const { tenantId } = (req as any).user;
  const statusFilter = req.query.status ? String(req.query.status) : null;
  try {
    const r = await pool.query(
      `SELECT *,
        CASE
          WHEN next_due_at IS NULL THEN 'PENDIENTE'
          WHEN next_due_at < NOW() THEN 'VENCIDO'
          WHEN next_due_at < NOW() + INTERVAL '7 days' THEN 'PROXIMO'
          ELSE 'AL_DIA'
        END AS status
       FROM maintenance_plans
       WHERE tenant_id = $1
         AND ($2::text IS NULL OR
              CASE
                WHEN next_due_at IS NULL THEN 'PENDIENTE'
                WHEN next_due_at < NOW() THEN 'VENCIDO'
                WHEN next_due_at < NOW() + INTERVAL '7 days' THEN 'PROXIMO'
                ELSE 'AL_DIA'
              END = $2)
       ORDER BY next_due_at ASC NULLS LAST, created_at DESC`,
      [tenantId, statusFilter]
    );
    res.json(r.rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/plans', async (req: Request, res: Response) => {
  const { tenantId } = (req as any).user;
  const { assetId, name, description, frequencyDays, estimatedDurationMin, responsible, notes, startingDate } = req.body;
  if (!assetId || !name || !frequencyDays) return res.status(400).json({ error: 'assetId, name y frequencyDays son requeridos' });
  try {
    const nextDueAt = startingDate
      ? new Date(startingDate)
      : new Date(Date.now() + Number(frequencyDays) * 86400000);
    const r = await pool.query(
      `INSERT INTO maintenance_plans (tenant_id, asset_id, name, description, frequency_days, estimated_duration_min, responsible, notes, next_due_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        tenantId, String(assetId).trim(),
        String(name).trim().substring(0, 200),
        description ? String(description).trim().substring(0, 1000) : null,
        Number(frequencyDays),
        estimatedDurationMin ? Number(estimatedDurationMin) : 60,
        responsible ? String(responsible).trim().substring(0, 100) : null,
        notes ? String(notes).trim().substring(0, 500) : null,
        nextDueAt,
      ]
    );
    res.status(201).json(r.rows[0]);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch('/plans/:id', async (req: Request, res: Response) => {
  const { tenantId } = (req as any).user;
  const planId = Number(req.params.id);
  const { name, description, frequencyDays, estimatedDurationMin, responsible, notes } = req.body;
  try {
    const r = await pool.query(
      `UPDATE maintenance_plans SET
         name                   = COALESCE($1, name),
         description            = COALESCE($2, description),
         frequency_days         = COALESCE($3, frequency_days),
         estimated_duration_min = COALESCE($4, estimated_duration_min),
         responsible            = COALESCE($5, responsible),
         notes                  = COALESCE($6, notes)
       WHERE id = $7 AND tenant_id = $8 RETURNING *`,
      [
        name ? String(name).trim().substring(0, 200) : null,
        description !== undefined ? String(description).trim().substring(0, 1000) : null,
        frequencyDays ? Number(frequencyDays) : null,
        estimatedDurationMin ? Number(estimatedDurationMin) : null,
        responsible !== undefined ? String(responsible).trim().substring(0, 100) : null,
        notes !== undefined ? String(notes).trim().substring(0, 500) : null,
        planId, tenantId,
      ]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Plan no encontrado' });
    res.json(r.rows[0]);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/plans/:id', async (req: Request, res: Response) => {
  const { tenantId } = (req as any).user;
  const planId = Number(req.params.id);
  try {
    const r = await pool.query(
      'DELETE FROM maintenance_plans WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [planId, tenantId]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Plan no encontrado' });
    res.json({ deleted: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/plans/:id/complete', async (req: Request, res: Response) => {
  const { tenantId } = (req as any).user;
  const planId = Number(req.params.id);
  const { doneBy, durationMin, notes } = req.body;
  try {
    const planRes = await pool.query(
      'SELECT * FROM maintenance_plans WHERE id = $1 AND tenant_id = $2',
      [planId, tenantId]
    );
    if (!planRes.rows.length) return res.status(404).json({ error: 'Plan no encontrado' });
    const plan = planRes.rows[0];
    const nextDueAt = new Date(Date.now() + plan.frequency_days * 86400000);
    const [record] = await Promise.all([
      pool.query(
        `INSERT INTO maintenance_records (plan_id, tenant_id, asset_id, done_by, duration_min, notes)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [
          planId, tenantId, plan.asset_id,
          doneBy ? String(doneBy).trim().substring(0, 100) : null,
          durationMin ? Number(durationMin) : null,
          notes ? String(notes).trim().substring(0, 500) : null,
        ]
      ),
      pool.query(
        `UPDATE maintenance_plans SET last_done_at = NOW(), next_due_at = $1 WHERE id = $2`,
        [nextDueAt, planId]
      ),
    ]);
    res.json({ record: record.rows[0], nextDueAt });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/history', async (req: Request, res: Response) => {
  const { tenantId } = (req as any).user;
  const limit  = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;
  try {
    const r = await pool.query(
      `SELECT r.*, p.name AS plan_name, p.asset_id
       FROM maintenance_records r
       LEFT JOIN maintenance_plans p ON p.id = r.plan_id
       WHERE r.tenant_id = $1
       ORDER BY r.done_at DESC
       LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset]
    );
    res.json(r.rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/upcoming', async (req: Request, res: Response) => {
  const { tenantId } = (req as any).user;
  const days = Math.min(Number(req.query.days) || 7, 30);
  try {
    const r = await pool.query(
      `SELECT *,
        CASE
          WHEN next_due_at < NOW() THEN 'VENCIDO'
          WHEN next_due_at < NOW() + INTERVAL '7 days' THEN 'PROXIMO'
          ELSE 'AL_DIA'
        END AS status
       FROM maintenance_plans
       WHERE tenant_id = $1
         AND next_due_at <= NOW() + ($2 || ' days')::INTERVAL
       ORDER BY next_due_at ASC`,
      [tenantId, days]
    );
    res.json(r.rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/summary', async (req: Request, res: Response) => {
  const { tenantId } = (req as any).user;
  try {
    const [overdue, upcoming, doneMonth, total] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS count FROM maintenance_plans WHERE tenant_id = $1 AND next_due_at < NOW()`, [tenantId]),
      pool.query(
        `SELECT COUNT(*) AS count FROM maintenance_plans
         WHERE tenant_id = $1 AND next_due_at >= NOW() AND next_due_at < NOW() + INTERVAL '7 days'`,
        [tenantId]
      ),
      pool.query(
        `SELECT COUNT(*) AS count FROM maintenance_records
         WHERE tenant_id = $1 AND done_at >= date_trunc('month', NOW())`,
        [tenantId]
      ),
      pool.query(`SELECT COUNT(*) AS count FROM maintenance_plans WHERE tenant_id = $1`, [tenantId]),
    ]);
    res.json({
      overdue:   Number(overdue.rows[0].count),
      upcoming:  Number(upcoming.rows[0].count),
      doneMonth: Number(doneMonth.rows[0].count),
      total:     Number(total.rows[0].count),
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
