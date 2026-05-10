import pool from '../db.js';

export async function runMigrations() {
  await pool.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS access_code TEXT;`)
    .catch(err => console.warn('Migración access_code:', err.message));

  await pool.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS notification_email TEXT;`)
    .catch(err => console.warn('Migración notification_email:', err.message));

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shifts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      start_hour SMALLINT NOT NULL CHECK (start_hour >= 0 AND start_hour < 24),
      end_hour SMALLINT NOT NULL CHECK (end_hour >= 0 AND end_hour < 24),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `).catch(err => console.warn('Migración shifts:', err.message));

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
      performed_by TEXT NOT NULL,
      action TEXT NOT NULL,
      detail JSONB,
      ip TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `).catch(err => console.warn('Migración audit_logs:', err.message));

  await pool.query(`
    CREATE TABLE IF NOT EXISTS alert_cooldowns (
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      widget_id TEXT NOT NULL,
      last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (tenant_id, widget_id)
    );
  `).catch(err => console.warn('Migración alert_cooldowns:', err.message));

  await pool.query(`
    CREATE TABLE IF NOT EXISTS downtime_causes (
      id SERIAL PRIMARY KEY,
      tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
      code VARCHAR(20) NOT NULL,
      label VARCHAR(100) NOT NULL,
      category VARCHAR(50) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `).then(() => pool.query(`
    INSERT INTO downtime_causes (code, label, category, tenant_id)
    SELECT code, label, category, NULL
    FROM (VALUES
      ('MEC-001','Falla mecánica','MECÁNICO'),
      ('MEC-002','Desgaste de herramienta','MECÁNICO'),
      ('MEC-003','Rotura de componente','MECÁNICO'),
      ('ELE-001','Falla eléctrica','ELÉCTRICO'),
      ('ELE-002','Falla de sensor','ELÉCTRICO'),
      ('ELE-003','Corte de energía','ELÉCTRICO'),
      ('OPE-001','Cambio de modelo','OPERATIVO'),
      ('OPE-002','Setup / Ajuste','OPERATIVO'),
      ('OPE-003','Falta de operador','OPERATIVO'),
      ('CAL-001','Ajuste de calidad','CALIDAD'),
      ('CAL-002','Retrabajo','CALIDAD'),
      ('MAT-001','Falta de material','MATERIAL'),
      ('MAT-002','Material defectuoso','MATERIAL'),
      ('OTR-001','Otro','OTRO')
    ) AS v(code, label, category)
    WHERE NOT EXISTS (SELECT 1 FROM downtime_causes WHERE tenant_id IS NULL LIMIT 1);
  `)).catch(err => console.warn('Migración downtime_causes:', err.message));

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tenant_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      username VARCHAR(100) NOT NULL,
      display_name VARCHAR(200),
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'OPERADOR',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, username)
    );
  `).catch(err => console.warn('Migración tenant_users:', err.message));

  await pool.query(`
    CREATE TABLE IF NOT EXISTS scrap_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      asset_id VARCHAR(100),
      area_id VARCHAR(100),
      order_id UUID REFERENCES production_orders(id) ON DELETE SET NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      reason_category VARCHAR(50),
      reason_description TEXT,
      inspector VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `).catch(err => console.warn('Migración scrap_records:', err.message));

  await pool.query(`
    CREATE TABLE IF NOT EXISTS production_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      order_number VARCHAR(50) NOT NULL,
      product_name VARCHAR(200) NOT NULL,
      target_quantity INTEGER NOT NULL DEFAULT 0,
      actual_quantity INTEGER NOT NULL DEFAULT 0,
      asset_id VARCHAR(100),
      area_id VARCHAR(100),
      status VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
      priority VARCHAR(10) NOT NULL DEFAULT 'NORMAL',
      notes TEXT,
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      due_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `).catch(err => console.warn('Migración production_orders:', err.message));

  await pool.query(`
    CREATE TABLE IF NOT EXISTS downtime_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      asset_id VARCHAR(100),
      area_id VARCHAR(100),
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ended_at TIMESTAMPTZ,
      duration_minutes INTEGER,
      cause_id INTEGER REFERENCES downtime_causes(id),
      cause_description TEXT,
      responsible VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `).catch(err => console.warn('Migración downtime_events:', err.message));

  await pool.query(`
    CREATE TABLE IF NOT EXISTS maintenance_plans (
      id                     SERIAL PRIMARY KEY,
      tenant_id              TEXT NOT NULL,
      asset_id               TEXT NOT NULL,
      name                   TEXT NOT NULL,
      description            TEXT,
      frequency_days         INTEGER NOT NULL DEFAULT 30,
      estimated_duration_min INTEGER DEFAULT 60,
      responsible            TEXT,
      last_done_at           TIMESTAMPTZ,
      next_due_at            TIMESTAMPTZ,
      notes                  TEXT,
      created_at             TIMESTAMPTZ DEFAULT NOW()
    );
  `).catch(console.error);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS maintenance_records (
      id           SERIAL PRIMARY KEY,
      plan_id      INTEGER REFERENCES maintenance_plans(id) ON DELETE SET NULL,
      tenant_id    TEXT NOT NULL,
      asset_id     TEXT NOT NULL,
      done_at      TIMESTAMPTZ DEFAULT NOW(),
      done_by      TEXT,
      duration_min INTEGER,
      notes        TEXT,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
  `).catch(console.error);
}
