-- Kenzly Industrial — Migraciones completas para Supabase
-- Ejecutar ANTES del seed_supabase.sql

-- Tabla base de tenants
CREATE TABLE IF NOT EXISTS tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  manifest      JSONB NOT NULL DEFAULT '{}',
  primary_color TEXT,
  logo_url      TEXT,
  access_code   TEXT,
  notification_email TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de assets
CREATE TABLE IF NOT EXISTS assets (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Asset'
);

-- Tabla de telemetría
CREATE TABLE IF NOT EXISTS telemetry (
  id        BIGSERIAL PRIMARY KEY,
  asset_id  TEXT NOT NULL,
  key       TEXT NOT NULL,
  value     NUMERIC,
  metadata  JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS telemetry_asset_key_ts ON telemetry (asset_id, key, timestamp DESC);

-- Turnos
CREATE TABLE IF NOT EXISTS shifts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  start_hour SMALLINT NOT NULL CHECK (start_hour >= 0 AND start_hour < 24),
  end_hour   SMALLINT NOT NULL CHECK (end_hour >= 0 AND end_hour < 24),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE SET NULL,
  performed_by TEXT NOT NULL,
  action       TEXT NOT NULL,
  detail       JSONB,
  ip           TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Alert cooldowns
CREATE TABLE IF NOT EXISTS alert_cooldowns (
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  widget_id    TEXT NOT NULL,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, widget_id)
);

-- Causas de paro
CREATE TABLE IF NOT EXISTS downtime_causes (
  id         SERIAL PRIMARY KEY,
  tenant_id  UUID REFERENCES tenants(id) ON DELETE CASCADE,
  code       VARCHAR(20) NOT NULL,
  label      VARCHAR(100) NOT NULL,
  category   VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usuarios por tenant
CREATE TABLE IF NOT EXISTS tenant_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  username      VARCHAR(100) NOT NULL,
  display_name  VARCHAR(200),
  password_hash TEXT NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'OPERADOR',
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, username)
);

-- Órdenes de producción
CREATE TABLE IF NOT EXISTS production_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_number    VARCHAR(50) NOT NULL,
  product_name    VARCHAR(200) NOT NULL,
  target_quantity INTEGER NOT NULL DEFAULT 0,
  actual_quantity INTEGER NOT NULL DEFAULT 0,
  asset_id        VARCHAR(100),
  area_id         VARCHAR(100),
  status          VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  priority        VARCHAR(10) NOT NULL DEFAULT 'NORMAL',
  notes           TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  due_at          TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Scrap / Calidad
CREATE TABLE IF NOT EXISTS scrap_records (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  asset_id           VARCHAR(100),
  area_id            VARCHAR(100),
  order_id           UUID REFERENCES production_orders(id) ON DELETE SET NULL,
  quantity           INTEGER NOT NULL DEFAULT 0,
  reason_category    VARCHAR(50),
  reason_description TEXT,
  inspector          VARCHAR(100),
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Eventos de paro
CREATE TABLE IF NOT EXISTS downtime_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  asset_id         VARCHAR(100),
  area_id          VARCHAR(100),
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at         TIMESTAMPTZ,
  duration_minutes INTEGER,
  cause_id         INTEGER REFERENCES downtime_causes(id),
  cause_description TEXT,
  responsible      VARCHAR(100),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Planes de mantenimiento
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

-- Registros de mantenimiento
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
