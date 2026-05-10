import { Router, Request, Response } from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/:slug', authMiddleware, async (req: Request, res: Response) => {
  const slug = String(req.params.slug);
  const { slug: tokenSlug } = (req as any).user;
  if (slug.toLowerCase() !== tokenSlug.toLowerCase()) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  try {
    const result = await pool.query(
      `SELECT id, name, slug, manifest, primary_color as "primaryColor", logo_url as logo
       FROM tenants WHERE LOWER(slug) = LOWER($1)`,
      [slug]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json(result.rows[0]);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
