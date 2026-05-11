/**
 * simulator.ts
 * Emula sensores industriales para M01–M06.
 *
 * Uso:
 *   tsx src/simulator.ts               → siembra 30 días + loop en vivo cada 30s
 *   tsx src/simulator.ts --seed-only   → solo siembra histórico y sale
 */

import pool from './db.js';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './middleware/auth.js';

const API_URL    = process.env.API_URL    || 'http://localhost:3001';
const TENANT_ID  = '550e8400-e29b-41d4-a716-446655440000';
const SEED_ONLY  = process.argv.includes('--seed-only');
const INTERVAL_S = Number(process.env.SIM_INTERVAL_S ?? 30);

// ── Machine params (mirrors company.ts) ──────────────────────────────────────
const MACHINES = [
  { id: 'M01', name: 'Prensa Hidráulica 1', vib: 2.2, temp: 58, pph: 420, kw: 38 },
  { id: 'M02', name: 'CNC Mazak 450',        vib: 1.8, temp: 52, pph: 380, kw: 28 },
  { id: 'M03', name: 'Soldadora Robótica',   vib: 3.1, temp: 65, pph: 290, kw: 52 },
  { id: 'M04', name: 'Torno CNC T200',       vib: 2.5, temp: 60, pph: 450, kw: 35 },
  { id: 'M05', name: 'Cortadora Láser',      vib: 1.5, temp: 45, pph: 510, kw: 22 },
  { id: 'M06', name: 'Centro de Maquinado',  vib: 2.0, temp: 55, pph: 400, kw: 44 },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────
const rng = () => Math.random();
const jitter = (base: number, pct = 0.05) =>
  parseFloat((base * (1 + (rng() - 0.5) * 2 * pct)).toFixed(3));

function gaussian(mean: number, std: number) {
  const u = rng(), v = rng();
  return mean + std * Math.sqrt(-2 * Math.log(u + 1e-10)) * Math.cos(2 * Math.PI * v);
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

// ── Sensor reading for a single machine at a given time ───────────────────────
function readingFor(
  m: typeof MACHINES[number],
  daysAgo: number,
  wearFraction: number   // 0 = new, 1 = end of simulated year
) {
  const hour      = new Date(Date.now() - daysAgo * 86_400_000).getHours();
  const isNight   = hour < 6 || hour >= 22;
  const activity  = isNight ? 0.55 : 1.0;
  const wear      = wearFraction * 1.2;

  // Occasional fault probability: ~0.8 % of readings
  const isFault = rng() < 0.008;

  let vibration: number, temperature: number, uptime: number;

  if (isFault) {
    vibration   = clamp(gaussian(m.vib * 4, 1.5),   m.vib * 2, m.vib * 8);
    temperature = clamp(gaussian(m.temp * 1.4, 5),  m.temp, m.temp * 2);
    uptime      = 0;
  } else {
    vibration   = clamp(gaussian(m.vib + wear * 0.6,  0.3) * activity, 0.3, m.vib * 3);
    temperature = clamp(gaussian(m.temp + wear * 1.2, 1.5) * (0.9 + activity * 0.1), 20, m.temp * 1.5);
    uptime      = clamp(gaussian(94, 2) * activity, 0, 100);
  }

  const production = isFault ? 0 : Math.round(
    clamp(gaussian(m.pph * (uptime / 100), m.pph * 0.05), 0, m.pph * 1.15)
  );
  const energy = isFault ? 0 : Math.max(0, jitter(m.kw * (uptime / 100), 0.08));

  return {
    vibration:   parseFloat(vibration.toFixed(2)),
    temperature: parseFloat(temperature.toFixed(1)),
    production,
    energy:      parseFloat(energy.toFixed(2)),
    uptime:      parseFloat(clamp(uptime, 0, 100).toFixed(1)),
    is_fault:    isFault ? 1 : 0,
  };
}

// ── Get or mint a supervisor JWT (no DB call needed — we already have the secret)
function mintToken() {
  return jwt.sign(
    { tenantId: TENANT_ID, slug: 'demo-industrial', name: 'Simulador', role: 'SUPERVISOR' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// ── Push one reading to the API ───────────────────────────────────────────────
async function pushReading(
  token: string,
  assetId: string,
  sensors: ReturnType<typeof readingFor>,
  timestamp: Date
) {
  const body = {
    asset_id:  assetId,
    key:       'sensors',
    value:     sensors.production,
    metadata: {
      vibration:   { value: sensors.vibration },
      temperature: { value: sensors.temperature },
      production:  { value: sensors.production },
      energy:      { value: sensors.energy },
      uptime:      { value: sensors.uptime },
      is_fault:    { value: sensors.is_fault },
    },
    timestamp: timestamp.toISOString(),
  };

  const res = await fetch(`${API_URL}/telemetry`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`POST /telemetry ${res.status}: ${txt}`);
  }
}

// ── Seed 30 days of hourly history ────────────────────────────────────────────
async function seedHistory(token: string) {
  // Check if we already seeded (avoid duplicates on restart)
  const existing = await pool.query(
    `SELECT COUNT(*) FROM telemetry WHERE asset_id = 'M01' AND key = 'sensors'`
  );
  if (Number(existing.rows[0].count) > 200) {
    console.log('  ↳ Historial ya existe — saltando seed.');
    return;
  }

  const DAYS       = 30;
  const INTERVAL_H = 1;   // 1 lectura por hora
  const total      = MACHINES.length * DAYS * (24 / INTERVAL_H);
  let inserted     = 0;

  console.log(`  Sembrando ${total} lecturas históricas (${DAYS} días × 1h × ${MACHINES.length} máquinas)…`);

  for (const m of MACHINES) {
    const rows: any[] = [];
    for (let d = DAYS; d >= 1; d--) {
      for (let h = 0; h < 24; h += INTERVAL_H) {
        const ts      = new Date(Date.now() - d * 86_400_000 + h * 3_600_000);
        const wear    = 1 - d / DAYS;
        const sensors = readingFor(m, d, wear);
        rows.push([
          m.id,
          'sensors',
          sensors.production,
          JSON.stringify({
            vibration:   { value: sensors.vibration },
            temperature: { value: sensors.temperature },
            production:  { value: sensors.production },
            energy:      { value: sensors.energy },
            uptime:      { value: sensors.uptime },
            is_fault:    { value: sensors.is_fault },
          }),
          ts,
        ]);
      }
    }

    // Batch insert in groups of 200
    const BATCH = 200;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch  = rows.slice(i, i + BATCH);
      const values = batch.map((_, j) => {
        const b = j * 5;
        return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5})`;
      }).join(',');
      const params = batch.flatMap(r => r);
      await pool.query(
        `INSERT INTO telemetry (asset_id, key, value, metadata, timestamp) VALUES ${values}
         ON CONFLICT DO NOTHING`,
        params
      );
      inserted += batch.length;
    }
    process.stdout.write(`  ✓ ${m.id} (${rows.length} lecturas)\n`);
  }

  console.log(`  ✅ ${inserted} lecturas históricas insertadas.\n`);
}

// ── Also register M01–M06 as assets ──────────────────────────────────────────
async function ensureAssets() {
  for (const m of MACHINES) {
    await pool.query(
      `INSERT INTO assets (id, name) VALUES ($1,$2) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [m.id, m.name]
    );
  }
  console.log('  ✓ Assets M01–M06 registrados.');
}

// ── Live loop ─────────────────────────────────────────────────────────────────
async function liveLoop(token: string) {
  console.log(`\n[LIVE] Emitiendo lecturas cada ${INTERVAL_S}s. Ctrl+C para detener.\n`);
  let tick = 0;

  const emit = async () => {
    tick++;
    const now    = new Date();
    const errors: string[] = [];

    await Promise.all(MACHINES.map(async m => {
      try {
        const sensors = readingFor(m, 0, 0.5);
        await pushReading(token, m.id, sensors, now);
        if (sensors.is_fault) {
          process.stdout.write(`  ⚠  ${m.id} FAULT — vib=${sensors.vibration} temp=${sensors.temperature}\n`);
        }
      } catch (e: any) {
        errors.push(`${m.id}: ${e.message}`);
      }
    }));

    const ts = now.toTimeString().slice(0, 8);
    if (errors.length) {
      console.error(`  [${ts}] tick ${tick} — errores: ${errors.join(' | ')}`);
    } else {
      process.stdout.write(`  [${ts}] tick ${tick} — ${MACHINES.length} máquinas OK\n`);
    }
  };

  await emit();
  setInterval(emit, INTERVAL_S * 1_000);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Kenzly — Simulador de Sensores');
  console.log(`  API: ${API_URL}   Tenant: demo-industrial`);
  console.log('═══════════════════════════════════════════════\n');

  const token = mintToken();
  console.log('[1/2] Token de servicio generado.\n[2/2] Verificando assets y sembrando historial…\n');

  await ensureAssets();
  await seedHistory(token);

  if (SEED_ONLY) {
    console.log('\n✅ Seed completado. Saliendo (--seed-only).');
    await pool.end();
    process.exit(0);
  }

  await pool.end();   // pool no se necesita en el loop — todo va por HTTP
  await liveLoop(token);
}

main().catch(e => {
  console.error('\n❌ ERROR:', e.message, '\n', e.stack);
  process.exit(1);
});
