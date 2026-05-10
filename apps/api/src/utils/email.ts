import nodemailer from 'nodemailer';
import pool from '../db.js';

export const mailer = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

export async function sendAlertEmail(
  to: string, label: string, value: number, threshold: number, unit = ''
) {
  if (!mailer) return;
  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: `⚠ ALERTA: ${label} superó el umbral`,
      text: `El sensor "${label}" registró ${value} ${unit}, superando el umbral configurado de ${threshold} ${unit}.\n\nFecha: ${new Date().toLocaleString()}`,
    });
  } catch (err: any) {
    console.warn('Error enviando email de alerta:', err.message);
  }
}

export async function checkAndSendAlerts(
  tenantId: string, assetId: string, key: string, value: number
) {
  const tenantResult = await pool.query(
    'SELECT manifest, notification_email FROM tenants WHERE id = $1',
    [tenantId]
  );
  if (!tenantResult.rows.length) return;
  const { manifest, notification_email } = tenantResult.rows[0];
  if (!notification_email || !manifest?.areas) return;

  for (const area of Object.values(manifest.areas) as any[]) {
    for (const view of ['operator', 'analyst']) {
      for (const w of area[view]?.widgets || []) {
        if (!w.props?.alertThreshold) continue;
        if (w.props.assetId?.toLowerCase() !== assetId.toLowerCase()) continue;
        if (w.props.key?.toLowerCase() !== key.toLowerCase()) continue;
        if (value <= Number(w.props.alertThreshold)) continue;

        const cooldown = await pool.query(
          `SELECT last_sent_at FROM alert_cooldowns WHERE tenant_id = $1 AND widget_id = $2`,
          [tenantId, w.id]
        );
        if (
          cooldown.rows.length &&
          Date.now() - new Date(cooldown.rows[0].last_sent_at).getTime() < 30 * 60 * 1000
        ) continue;

        await sendAlertEmail(
          notification_email, w.props.label || assetId,
          value, Number(w.props.alertThreshold), w.props.unit
        );

        await pool.query(
          `INSERT INTO alert_cooldowns (tenant_id, widget_id, last_sent_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (tenant_id, widget_id) DO UPDATE SET last_sent_at = NOW()`,
          [tenantId, w.id]
        );
      }
    }
  }
}
