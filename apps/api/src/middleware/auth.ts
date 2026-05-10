import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'cambiar-en-produccion';

export const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 8 * 60 * 60 * 1000,
};

export const authMiddleware = (req: Request, res: Response, next: any) => {
  const token = req.cookies?.kenzly_token;
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    (req as any).user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

export const adminAuthMiddleware = (req: Request, res: Response, next: any) => {
  const token = req.cookies?.kenzly_admin_token;
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
};
