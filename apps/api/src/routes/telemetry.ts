import { Router, Request, Response } from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { getTenantAssetIds } from '../utils/assets.js';
import { checkAndSendAlerts } from '../utils/email.js';

const router = Router();
router.use(authMiddleware);

router.get('/latest/:assetId/:key', async (req: Request, res: Response) => {
  const assetId = String(req.params.assetId).trim();
  const key = String(req.params.key).trim();
  const { tenantId } = (req as any).user;
  try {
    const allowed = await getTenantAssetIds(tenantId);
    if (!allowed.has(assetId.toLowerCase())) {
      return res.status(403).json({ error: 'Asset no pertenece a este tenant' });
    }
    const result = await pool.query(
      `SELECT value, timestamp, metadata FROM telemetry
       WHERE asset_id = $1 AND key = $2
       ORDER BY timestamp DESC LIMIT 1`,
      [assetId, key]
    );
    res.json(result.rows[0] || { value: 0, metadata: {} });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/history/:assetId/:key', async (req: Request, res: Response) => {
  const assetId = String(req.params.assetId).trim();
  const key = String(req.params.key).trim();
  const subKey = req.query.subKey ? String(req.query.subKey).trim() : null;
  const rawHours = Number(req.query.hours);
  const hours = (!isNaN(rawHours) && rawHours > 0 && rawHours <= 720) ? rawHours : 48;
  const { tenantId } = (req as any).user;
  try {
    const allowed = await getTenantAssetIds(tenantId);
    if (!allowed.has(assetId.toLowerCase())) {
      return res.status(403).json({ error: 'Asset no pertenece a este tenant' });
    }
    const result = subKey
      ? await pool.query(
          `SELECT timestamp,
            COALESCE(
              (metadata->$2->>'value')::numeric,
              (metadata->$2->>'raw')::numeric,
              (metadata->>$2)::numeric,
              value
            ) AS value
           FROM telemetry
           WHERE LOWER(trim(asset_id)) = LOWER($1)
             AND LOWER(key) = LOWER($3)
             AND timestamp >= NOW() - ($4 || ' hours')::interval
           ORDER BY timestamp ASC`,
          [assetId, subKey, key, hours]
        )
      : await pool.query(
          `SELECT timestamp, metadata,
            COALESCE(
              (metadata->$2->>'value')::numeric,
              (metadata->$2->>'raw')::numeric,
              (metadata->>$2)::numeric,
              value
            ) AS value
           FROM telemetry
           WHERE LOWER(trim(asset_id)) = LOWER($1)
             AND (LOWER(key) = LOWER($2) OR metadata ? $2)
             AND timestamp >= NOW() - ($3 || ' hours')::interval
           ORDER BY timestamp ASC`,
          [assetId, key, hours]
        );
    res.json(result.rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/daily-report', async (req: Request, res: Response) => {
  const { assets } = req.query;
  if (!assets) return res.status(400).json({ error: 'Se requieren assets para generar el reporte' });
  const { tenantId } = (req as any).user;
  const assetList = (assets as string).split(',').map(a => a.trim()).filter(Boolean);
  try {
    const allowed = await getTenantAssetIds(tenantId);
    const forbidden = assetList.find(a => !allowed.has(a.toLowerCase()));
    if (forbidden) return res.status(403).json({ error: `Asset '${forbidden}' no pertenece a este tenant` });
    const result = await pool.query(
      `SELECT asset_id as "assetId", key, value, metadata, timestamp
       FROM telemetry
       WHERE asset_id = ANY($1) AND timestamp >= CURRENT_DATE
       ORDER BY timestamp DESC`,
      [assetList]
    );
    res.json(result.rows.map((row: any) => ({
      ...row, value: row.metadata?.value?.value || row.value,
    })));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/kanban/balance', async (req: Request, res: Response) => {
  const { sourceAsset, sourceKey, targetAsset, targetKey } = req.query;
  const sA = String(sourceAsset || '').trim();
  const sK = String(sourceKey || 'value').trim();
  const tA = String(targetAsset || '').trim();
  const tK = String(targetKey || 'value').trim();
  const { tenantId } = (req as any).user;
  try {
    const allowed = await getTenantAssetIds(tenantId);
    if (!allowed.has(sA.toLowerCase()) || !allowed.has(tA.toLowerCase())) {
      return res.status(403).json({ error: 'Asset no pertenece a este tenant' });
    }
    const result = await pool.query(
      `WITH source_data AS (
        SELECT SUM(CASE WHEN key = $2 THEN COALESCE(value, 0)
          ELSE COALESCE((metadata->$2->>'value')::numeric,(metadata->$2->>'raw')::numeric,(metadata->>$2)::numeric,0) END) as total
        FROM telemetry WHERE LOWER(trim(asset_id)) = LOWER($1) AND timestamp >= NOW() - INTERVAL '48 hours'
      ),
      target_data AS (
        SELECT SUM(CASE WHEN key = $4 THEN COALESCE(value, 0)
          ELSE COALESCE((metadata->$4->>'value')::numeric,(metadata->$4->>'raw')::numeric,(metadata->>$4)::numeric,0) END) as total
        FROM telemetry WHERE LOWER(trim(asset_id)) = LOWER($3) AND timestamp >= NOW() - INTERVAL '48 hours'
      )
      SELECT COALESCE(source_data.total,0) as produced, COALESCE(target_data.total,0) as consumed
      FROM source_data, target_data`,
      [sA, sK, tA, tK]
    );
    const produced = parseFloat(result.rows[0].produced) || 0;
    const consumed = parseFloat(result.rows[0].consumed) || 0;
    res.json({ produced, consumed, balance: produced - consumed });
  } catch (err: any) { res.status(500).json({ error: 'Database Error', details: err.message }); }
});

router.post('/', async (req: Request, res: Response) => {
  const { asset_id, key, value, metadata } = req.body;
  if (!asset_id || !key) return res.status(400).json({ error: 'asset_id y key son obligatorios' });
  if (typeof asset_id !== 'string' || typeof key !== 'string') return res.status(400).json({ error: 'asset_id y key deben ser strings' });
  if (asset_id.length > 100 || key.length > 100) return res.status(400).json({ error: 'asset_id y key no pueden superar 100 caracteres' });
  if (value !== undefined && value !== null && typeof value !== 'number') return res.status(400).json({ error: 'value debe ser numérico' });
  const { tenantId } = (req as any).user;
  const numericValue = (value !== undefined && value !== null) ? Number(value) : 0;
  if (!isFinite(numericValue)) return res.status(400).json({ error: 'value debe ser un número finito' });
  try {
    const allowed = await getTenantAssetIds(tenantId);
    if (!allowed.has(asset_id.trim().toLowerCase())) {
      return res.status(403).json({ error: 'Asset no pertenece a este tenant' });
    }
    const result = await pool.query(
      `INSERT INTO telemetry (asset_id, key, value, metadata, timestamp) VALUES ($1,$2,$3,$4,NOW()) RETURNING *`,
      [
        asset_id.trim(), key.trim(), numericValue,
        metadata && typeof metadata === 'object' ? JSON.stringify(metadata) : JSON.stringify({}),
      ]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
    checkAndSendAlerts(tenantId, asset_id.trim(), key.trim(), numericValue).catch(() => {});
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
