import { Router, Request, Response } from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

const OEE_PLANNED_MINUTES = 480;

router.get('/summary', async (req: Request, res: Response) => {
  const { tenantId } = (req as any).user;
  try {
    const [dtRes, ordersRes, scrapRes] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(duration_minutes),0) AS downtime_minutes FROM downtime_events
         WHERE tenant_id=$1 AND ended_at IS NOT NULL AND started_at >= CURRENT_DATE`,
        [tenantId]
      ),
      pool.query(
        `SELECT COALESCE(SUM(actual_quantity),0) AS actual, COALESCE(SUM(target_quantity),0) AS target
         FROM production_orders
         WHERE tenant_id=$1 AND status IN ('EN_PROCESO','COMPLETADA') AND DATE(created_at)=CURRENT_DATE`,
        [tenantId]
      ),
      pool.query(
        `SELECT COALESCE(SUM(quantity),0) AS scrap FROM scrap_records WHERE tenant_id=$1 AND created_at >= CURRENT_DATE`,
        [tenantId]
      ),
    ]);
    const downtime = Number(dtRes.rows[0].downtime_minutes);
    const actual   = Number(ordersRes.rows[0].actual);
    const target   = Number(ordersRes.rows[0].target);
    const scrap    = Number(scrapRes.rows[0].scrap);
    const planned  = OEE_PLANNED_MINUTES;

    const availability = Math.max(0, Math.min(1, (planned - downtime) / planned));
    const performance  = target > 0 ? Math.min(1, actual / target) : 1;
    const quality      = actual > 0 ? Math.max(0, (actual - scrap) / actual) : 1;
    const oee          = availability * performance * quality;

    res.json({
      availability: Math.round(availability * 100),
      performance:  Math.round(performance  * 100),
      quality:      Math.round(quality      * 100),
      oee:          Math.round(oee          * 100),
      details: { planned_minutes: planned, downtime_minutes: downtime, actual_quantity: actual, target_quantity: target, scrap_quantity: scrap },
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/history', async (req: Request, res: Response) => {
  const { tenantId } = (req as any).user;
  const days = Math.min(Number(req.query.days) || 7, 30);
  try {
    const [dtHistory, ordHistory, scrapHistory] = await Promise.all([
      pool.query(
        `SELECT DATE(started_at) AS day, COALESCE(SUM(duration_minutes),0) AS downtime
         FROM downtime_events
         WHERE tenant_id=$1 AND ended_at IS NOT NULL AND started_at >= NOW()-($2 || ' days')::interval
         GROUP BY DATE(started_at)`,
        [tenantId, days]
      ),
      pool.query(
        `SELECT DATE(created_at) AS day, COALESCE(SUM(actual_quantity),0) AS actual, COALESCE(SUM(target_quantity),0) AS target
         FROM production_orders
         WHERE tenant_id=$1 AND status IN ('EN_PROCESO','COMPLETADA') AND created_at >= NOW()-($2 || ' days')::interval
         GROUP BY DATE(created_at)`,
        [tenantId, days]
      ),
      pool.query(
        `SELECT DATE(created_at) AS day, COALESCE(SUM(quantity),0) AS scrap
         FROM scrap_records
         WHERE tenant_id=$1 AND created_at >= NOW()-($2 || ' days')::interval
         GROUP BY DATE(created_at)`,
        [tenantId, days]
      ),
    ]);

    const dtMap    = Object.fromEntries(dtHistory.rows.map((r: any)    => [String(r.day).slice(0,10), Number(r.downtime)]));
    const ordMap   = Object.fromEntries(ordHistory.rows.map((r: any)   => [String(r.day).slice(0,10), { actual: Number(r.actual), target: Number(r.target) }]));
    const scrapMap = Object.fromEntries(scrapHistory.rows.map((r: any) => [String(r.day).slice(0,10), Number(r.scrap)]));

    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key      = d.toISOString().slice(0,10);
      const downtime = dtMap[key]    || 0;
      const actual   = ordMap[key]?.actual  || 0;
      const target   = ordMap[key]?.target  || 0;
      const scrap    = scrapMap[key] || 0;
      const avail    = Math.round(Math.max(0, Math.min(1, (OEE_PLANNED_MINUTES - downtime) / OEE_PLANNED_MINUTES)) * 100);
      const perf     = target > 0 ? Math.round(Math.min(1, actual / target) * 100) : 100;
      const qual     = actual > 0 ? Math.round(Math.max(0, (actual - scrap) / actual) * 100) : 100;
      result.push({ date: key, availability: avail, performance: perf, quality: qual, oee: Math.round((avail * perf * qual) / 10000) });
    }
    res.json(result);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
