import { Router, Request, Response } from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/:slug/shifts', authMiddleware, async (req: Request, res: Response) => {
  const slug = String(req.params.slug).trim();
  const { slug: tokenSlug } = (req as any).user;
  if (slug.toLowerCase() !== tokenSlug.toLowerCase()) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  try {
    const result = await pool.query(
      `SELECT s.id, s.name, s.start_hour, s.end_hour
       FROM shifts s JOIN tenants t ON t.id = s.tenant_id
       WHERE LOWER(t.slug) = LOWER($1)
       ORDER BY s.start_hour ASC`,
      [slug]
    );
    res.json(result.rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/:slug/current-shift', authMiddleware, async (req: Request, res: Response) => {
  const slug = String(req.params.slug).trim();
  const { slug: tokenSlug } = (req as any).user;
  if (slug.toLowerCase() !== tokenSlug.toLowerCase()) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  try {
    const hourNow = new Date().getHours();
    const result = await pool.query(
      `SELECT s.id, s.name, s.start_hour, s.end_hour
       FROM shifts s JOIN tenants t ON t.id = s.tenant_id
       WHERE LOWER(t.slug) = LOWER($1)
         AND (
           (s.start_hour < s.end_hour AND $2 >= s.start_hour AND $2 < s.end_hour)
           OR
           (s.start_hour >= s.end_hour AND ($2 >= s.start_hour OR $2 < s.end_hour))
         )
       LIMIT 1`,
      [slug, hourNow]
    );
    res.json(result.rows[0] || null);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
