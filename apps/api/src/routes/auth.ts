import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { JWT_SECRET, cookieOpts } from '../middleware/auth.js';

const router = Router();

const USER_ROLES = ['OPERADOR', 'SUPERVISOR', 'ANALISTA', 'GERENTE'];

router.post('/login', async (req: Request, res: Response) => {
  const { slug, code } = req.body;
  if (!slug || !code) return res.status(400).json({ error: 'slug y code son requeridos' });
  try {
    const result = await pool.query(
      'SELECT id, slug, name, access_code FROM tenants WHERE LOWER(slug) = LOWER($1)',
      [String(slug).trim()]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: 'Credenciales inválidas' });
    const tenant = result.rows[0];
    if (!tenant.access_code) return res.status(401).json({ error: 'Acceso no configurado para este tenant' });
    const valid = await bcrypt.compare(String(code), tenant.access_code);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });
    const token = jwt.sign(
      { tenantId: tenant.id, slug: tenant.slug, name: tenant.name, role: 'OPERADOR' },
      JWT_SECRET, { expiresIn: '8h' }
    );
    res.cookie('kenzly_token', token, cookieOpts);
    res.json({ success: true, slug: tenant.slug });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/admin-login', async (req: Request, res: Response) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return res.status(503).json({ error: 'Admin no configurado' });
  if (!password || password !== adminPassword) return res.status(401).json({ error: 'Contraseña incorrecta' });
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
  res.cookie('kenzly_admin_token', token, cookieOpts);
  res.json({ success: true });
});

router.post('/logout', (_req: Request, res: Response) => {
  const clearOpts = { ...cookieOpts, maxAge: 0 };
  res.clearCookie('kenzly_token', clearOpts);
  res.clearCookie('kenzly_admin_token', clearOpts);
  res.json({ success: true });
});

router.get('/verify', (req: Request, res: Response) => {
  const token = req.cookies?.kenzly_token || req.cookies?.kenzly_admin_token;
  if (!token) return res.status(401).json({ valid: false });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch {
    res.status(401).json({ valid: false });
  }
});

router.post('/user-login', async (req: Request, res: Response) => {
  const { slug, username, password } = req.body;
  if (!slug || !username || !password) return res.status(400).json({ error: 'slug, username y password son requeridos' });
  try {
    const tenantRes = await pool.query(
      'SELECT id, slug, name FROM tenants WHERE LOWER(slug) = LOWER($1)',
      [String(slug).trim()]
    );
    if (!tenantRes.rows.length) return res.status(401).json({ error: 'Credenciales inválidas' });
    const tenant = tenantRes.rows[0];
    const userRes = await pool.query(
      'SELECT id, username, display_name, password_hash, role FROM tenant_users WHERE tenant_id = $1 AND LOWER(username) = LOWER($2) AND is_active = true',
      [tenant.id, String(username).trim()]
    );
    if (!userRes.rows.length) return res.status(401).json({ error: 'Credenciales inválidas' });
    const user = userRes.rows[0];
    const valid = await bcrypt.compare(String(password), user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });
    const token = jwt.sign(
      { tenantId: tenant.id, slug: tenant.slug, name: tenant.name, userId: user.id, username: user.username, displayName: user.display_name, role: user.role },
      JWT_SECRET, { expiresIn: '8h' }
    );
    res.cookie('kenzly_token', token, cookieOpts);
    res.json({ success: true, slug: tenant.slug, role: user.role });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
