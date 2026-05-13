/**
 * seed-demo.ts
 * Limpia tablas huérfanas, conecta el manifest y siembra datos industriales realistas
 * para el tenant demo-industrial.
 */
import pool from './db.js';
import bcrypt from 'bcryptjs';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
const TENANT_SLUG = 'demo-industrial';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
const rnd = (min: number, max: number, decimals = 0) => {
  const val = Math.random() * (max - min) + min;
  return decimals ? parseFloat(val.toFixed(decimals)) : Math.round(val);
};
const jitter = (base: number, pct = 0.05) => base * (1 + (Math.random() - 0.5) * 2 * pct);
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000);
const daysAgo  = (d: number) => new Date(Date.now() - d * 86_400_000);

// ──────────────────────────────────────────────
// 1. Limpieza de tablas y tenants huérfanos
// ──────────────────────────────────────────────
async function cleanup() {
  console.log('\n[1/7] Limpiando tablas huérfanas y tenants de prueba…');

  // Tablas vacías que nunca se usan en el API actual
  for (const t of ['products', 'transactions']) {
    await pool.query(`DROP TABLE IF EXISTS ${t} CASCADE`).catch(e => console.warn(`  ⚠ drop ${t}:`, e.message));
  }

  // Eliminar tenants huérfanos (sin access_code = nunca activos)
  const orphans = await pool.query(
    `DELETE FROM tenants WHERE slug IN ('bimbo-mx','bimbo-mexico','flex') RETURNING slug`
  );
  if (orphans.rows.length) console.log(`  🗑  Tenants eliminados: ${orphans.rows.map((r: any) => r.slug).join(', ')}`);

  // Limpiar datos viejos del demo para re-sembrar limpio
  await pool.query(`DELETE FROM telemetry          WHERE asset_id IN ('injector-1','OVEN-B2','METROLOGY_01','DEFECT_AI_01','CHILLER-UNIT-01','HOPPER-LOAD-01','MCH-001')`);
  await pool.query(`DELETE FROM production_orders   WHERE tenant_id = $1`, [TENANT_ID]);
  await pool.query(`DELETE FROM scrap_records        WHERE tenant_id = $1`, [TENANT_ID]);
  await pool.query(`DELETE FROM downtime_events      WHERE tenant_id = $1`, [TENANT_ID]);
  await pool.query(`DELETE FROM maintenance_records  WHERE tenant_id = $1`, [TENANT_ID]);
  await pool.query(`DELETE FROM maintenance_plans    WHERE tenant_id = $1`, [TENANT_ID]);
  await pool.query(`DELETE FROM shifts               WHERE tenant_id = $1`, [TENANT_ID]);
  await pool.query(`DELETE FROM tenant_users         WHERE tenant_id = $1`, [TENANT_ID]);
  console.log('  ✓ Datos demo anteriores eliminados');
}

// ──────────────────────────────────────────────
// 2. Actualizar assets con nombres industriales
// ──────────────────────────────────────────────
async function seedAssets() {
  console.log('\n[2/7] Actualizando assets…');
  const items = [
    { id: 'injector-1',       name: 'Inyectora Haitian MA900/II'   },
    { id: 'OVEN-B2',          name: 'Secador Drymax HopperLoader 200' },
    { id: 'METROLOGY_01',     name: 'CMM Mitutoyo CRYSTA-Apex'     },
    { id: 'DEFECT_AI_01',     name: 'ViSmart 3D Visión Artificial'  },
    { id: 'CHILLER-UNIT-01',  name: 'Chiller Frigel Microgel 7.5T' },
    { id: 'HOPPER-LOAD-01',   name: 'Tolva Gravimétrica 500L'       },
    { id: 'MCH-001',          name: 'Prensa Hidráulica Troquelado'  },
  ];
  for (const a of items) {
    await pool.query(
      `INSERT INTO assets (id, name) VALUES ($1,$2) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [a.id, a.name]
    );
  }
  // Remove stale auto-created assets
  await pool.query(`DELETE FROM assets WHERE name = 'Asset Autocreado'`);
  console.log(`  ✓ ${items.length} assets actualizados`);
}

// ──────────────────────────────────────────────
// 3. Actualizar manifest del tenant
// ──────────────────────────────────────────────
async function seedManifest() {
  console.log('\n[3/7] Actualizando manifest…');

  const manifest = {
    branding: { primaryColor: '#0f62fe', companyName: 'PlásticosMex Industrial S.A. de C.V.' },
    areas: {
      a1: {
        name: 'Línea de Inyección 1',
        operator: {
          widgets: [
            { id: 'w-a1-op-1', type: 'ADVANCED_INPUT', props: { assetId: 'injector-1', key: 'ADVANCED_REPORT', label: 'Inyectora MA900', unit: 'pzs' } },
            { id: 'w-a1-op-2', type: 'ADVANCED_INPUT', props: { assetId: 'OVEN-B2',    key: 'ADVANCED_REPORT', label: 'Secador Material', unit: 'pzs' } },
            { id: 'w-a1-op-3', type: 'KANBAN',         props: { sourceAsset: 'injector-1', sourceKey: 'ADVANCED_REPORT', targetAsset: 'OVEN-B2', targetKey: 'ADVANCED_REPORT', label: 'Balance Producción' } },
          ]
        },
        analyst: {
          widgets: [
            { id: 'w-a1-an-1', type: 'SEMI_DONUT',           props: { assetId: 'injector-1', key: 'ADVANCED_REPORT', subKey: 'presion_cierre', label: 'Presión de Inyección', unit: 'bar',  min: 0, max: 280 } },
            { id: 'w-a1-an-2', type: 'GAUGE',                 props: { assetId: 'injector-1', key: 'ADVANCED_REPORT', subKey: 'temp_barril',    label: 'Temp. Barril/Husillo', unit: '°C', min: 150, max: 280, alertThreshold: 260 } },
            { id: 'w-a1-an-3', type: 'GAUGE',                 props: { assetId: 'OVEN-B2',    key: 'ADVANCED_REPORT', subKey: 'flujo_gas',      label: 'Flujo Aire Secado',   unit: 'm³/h', min: 0, max: 40 } },
            { id: 'w-a1-an-4', type: 'PRODUCTION_PER_HOUR',   props: { assetId: 'injector-1', key: 'ADVANCED_REPORT', subKey: 'value',          label: 'Piezas/Hora' } },
            { id: 'w-a1-an-5', type: 'DAILY_EXECUTIVE_REPORT', props: { label: 'Reporte Ejecutivo' } },
          ]
        }
      },
      a2: {
        name: 'Control de Calidad',
        operator: {
          widgets: [
            { id: 'w-a2-op-1', type: 'ADVANCED_INPUT', props: { assetId: 'METROLOGY_01', key: 'INSPECCION', label: 'Metrología CMM',   unit: 'mm' } },
            { id: 'w-a2-op-2', type: 'ADVANCED_INPUT', props: { assetId: 'DEFECT_AI_01', key: 'DEFECTOS',   label: 'Defectos Visión', unit: 'pzs' } },
          ]
        },
        analyst: {
          widgets: [
            { id: 'w-a2-an-1', type: 'GAUGE', props: { assetId: 'METROLOGY_01', key: 'INSPECCION', subKey: 'espesor_real', label: 'Espesor de Pared', unit: 'mm', min: 2.5, max: 3.5, alertThreshold: 3.3 } },
            { id: 'w-a2-an-2', type: 'GAUGE', props: { assetId: 'DEFECT_AI_01', key: 'DEFECTOS',   subKey: 'tasa_defectos', label: 'Tasa de Rechazo', unit: '%', min: 0, max: 10, alertThreshold: 5 } },
          ]
        }
      },
      a3: {
        name: 'Preparación y Secado de Material',
        operator: {
          widgets: [
            { id: 'w-a3-op-1', type: 'ADVANCED_INPUT', props: { assetId: 'CHILLER-UNIT-01', key: 'OUTPUT', subKey: 'value', label: 'Temp. Agua Molde', unit: '°C' } },
            { id: 'w-a3-op-2', type: 'ADVANCED_INPUT', props: { assetId: 'HOPPER-LOAD-01',  key: 'OUTPUT',              label: 'Nivel Tolva', unit: '%' } },
            { id: 'w-a3-op-3', type: 'KANBAN',         props: { sourceAsset: 'HOPPER-LOAD-01', sourceKey: 'OUTPUT', targetAsset: 'CHILLER-UNIT-01', targetKey: 'OUTPUT', label: 'Balance Material' } },
          ]
        },
        analyst: {
          widgets: [
            { id: 'w-a3-an-1', type: 'GAUGE', props: { assetId: 'CHILLER-UNIT-01', key: 'OUTPUT', subKey: 'value', label: 'Temp. Chiller Molde', unit: '°C', min: 5, max: 20, alertThreshold: 16 } },
            { id: 'w-a3-an-2', type: 'PRODUCTION_PER_HOUR', props: { assetId: 'HOPPER-LOAD-01', key: 'OUTPUT', label: 'Consumo Tolva/Hora' } },
          ]
        }
      }
    }
  };

  await pool.query(`UPDATE tenants SET name = $1, manifest = $2, primary_color = $3 WHERE id = $4`, [
    'PlásticosMex Industrial S.A. de C.V.', JSON.stringify(manifest), '#0f62fe', TENANT_ID
  ]);

  // Remove old area key that was auto-generated
  console.log('  ✓ Manifest actualizado (3 áreas, widgets con keys correctas)');
}

// ──────────────────────────────────────────────
// 4. Shifts + Users
// ──────────────────────────────────────────────
async function seedUsers() {
  console.log('\n[4/7] Creando turnos y usuarios…');

  await pool.query(
    `INSERT INTO shifts (tenant_id, name, start_hour, end_hour) VALUES
      ($1,'Turno Matutino',6,14),
      ($1,'Turno Vespertino',14,22),
      ($1,'Turno Nocturno',22,6)`,
    [TENANT_ID]
  );
  console.log('  ✓ 3 turnos creados');

  const users = [
    { username: 'operador1', displayName: 'Carlos Martínez', password: 'demo1234', role: 'OPERADOR' },
    { username: 'operador2', displayName: 'Ana García',      password: 'demo1234', role: 'OPERADOR' },
    { username: 'supervisor',displayName: 'Roberto Sánchez', password: 'demo1234', role: 'SUPERVISOR' },
    { username: 'analista',  displayName: 'Lucía Hernández', password: 'demo1234', role: 'ANALISTA' },
    { username: 'gerente',   displayName: 'Eduardo Torres',  password: 'demo1234', role: 'GERENTE' },
  ];
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await pool.query(
      `INSERT INTO tenant_users (tenant_id, username, display_name, password_hash, role) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (tenant_id, username) DO NOTHING`,
      [TENANT_ID, u.username, u.displayName, hash, u.role]
    );
  }
  console.log(`  ✓ ${users.length} usuarios creados (pass: demo1234)`);
}

// ──────────────────────────────────────────────
// 5. Telemetría (7 días de historia cada 30 min)
// ──────────────────────────────────────────────
async function seedTelemetry() {
  console.log('\n[5/7] Generando telemetría (7 días × 30 min)…');
  const rows: any[] = [];
  const intervalMs = 30 * 60_000;
  const start = daysAgo(7).getTime();
  const end   = Date.now();

  for (let t = start; t <= end; t += intervalMs) {
    const ts = new Date(t);
    const hour = ts.getHours();
    const isNight = hour < 6 || hour >= 22;
    const slowdown = isNight ? 0.6 : 1;

    // injector-1 | ADVANCED_REPORT
    const presionCierre = Math.round(jitter(200, 0.08) * slowdown + (isNight ? 0 : rnd(0, 10)));
    const tempBarril    = parseFloat((jitter(220, 0.04)).toFixed(1));
    const piezas        = Math.round(jitter(45, 0.15) * slowdown);
    rows.push({ asset_id: 'injector-1', key: 'ADVANCED_REPORT', value: piezas, ts,
      meta: { presion_cierre: { value: presionCierre }, temp_barril: { value: tempBarril }, value: { value: piezas } } });

    // OVEN-B2 | ADVANCED_REPORT
    const flujoGas  = parseFloat((jitter(20, 0.10) * slowdown).toFixed(2));
    const piezasOven = Math.round(jitter(40, 0.18) * slowdown);
    rows.push({ asset_id: 'OVEN-B2', key: 'ADVANCED_REPORT', value: piezasOven, ts,
      meta: { flujo_gas: { value: flujoGas }, value: { value: piezasOven } } });

    // METROLOGY_01 | INSPECCION  (cada hora)
    if (t % (60 * 60_000) < intervalMs) {
      const espesor     = parseFloat((3.0 + (Math.random() - 0.5) * 0.3).toFixed(3));
      const tasaDef     = parseFloat((Math.random() * 4).toFixed(2));
      rows.push({ asset_id: 'METROLOGY_01', key: 'INSPECCION', value: espesor, ts,
        meta: { espesor_real: { value: espesor }, tasa_defectos: { value: tasaDef } } });
    }

    // DEFECT_AI_01 | DEFECTOS  (cada hora)
    if (t % (60 * 60_000) < intervalMs) {
      const defectos    = Math.round(Math.random() * 3);
      const tasaDef2    = parseFloat((defectos / 100 * rnd(5, 15)).toFixed(2));
      rows.push({ asset_id: 'DEFECT_AI_01', key: 'DEFECTOS', value: defectos, ts,
        meta: { defectos_count: { value: defectos }, tasa_defectos: { value: tasaDef2 } } });
    }

    // CHILLER-UNIT-01 | OUTPUT
    const tempChiller = parseFloat((jitter(10, 0.12)).toFixed(1));
    rows.push({ asset_id: 'CHILLER-UNIT-01', key: 'OUTPUT', value: tempChiller, ts,
      meta: { value: { value: tempChiller } } });

    // HOPPER-LOAD-01 | OUTPUT (nivel tolva oscila 20-80%)
    const nivelTolva = Math.round(40 + 30 * Math.sin(t / (4 * 3600_000)) + rnd(-5, 5));
    rows.push({ asset_id: 'HOPPER-LOAD-01', key: 'OUTPUT', value: nivelTolva, ts,
      meta: { value: { value: nivelTolva } } });
  }

  // Batch insert
  let inserted = 0;
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const vals  = batch.map((_: any, j: number) => {
      const base = j * 5;
      return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5})`;
    }).join(',');
    const params = batch.flatMap((r: any) => [r.asset_id, r.key, r.value, JSON.stringify(r.meta), r.ts]);
    await pool.query(
      `INSERT INTO telemetry (asset_id, key, value, metadata, timestamp) VALUES ${vals}`,
      params
    );
    inserted += batch.length;
  }
  console.log(`  ✓ ${inserted} lecturas de telemetría insertadas`);
}

// ──────────────────────────────────────────────
// 6. Órdenes de producción
// ──────────────────────────────────────────────
async function seedOrders() {
  console.log('\n[6/7] Creando órdenes de producción…');
  const products = [
    'Tapa PE 32mm', 'Cuerpo Inyectado PP-14', 'Conector ABS 40mm', 'Palanca Acetal Negro',
    'Bracket Nylon PA6', 'Carcasa ABS K9', 'Empaque TPE Soft B', 'Guía POM Deslizante #7',
    'Clip Plástico PP Natural', 'Cubierta ABS Cromada'
  ];
  const areas   = ['a1', 'a2', 'a3'];
  const assets  = ['injector-1', 'OVEN-B2', 'CHILLER-UNIT-01'];
  const orders: any[] = [];

  // Completadas (días 7–2)
  for (let i = 0; i < 12; i++) {
    const target  = rnd(200, 800);
    const actual  = Math.round(target * rnd(85, 100) / 100);
    const created = daysAgo(rnd(2, 7));
    const started = new Date(created.getTime() + rnd(1, 4) * 3600_000);
    const completed = new Date(started.getTime() + rnd(4, 16) * 3600_000);
    orders.push({
      order_number: `OP-2026-${String(i + 1).padStart(4, '0')}`,
      product_name: products[i % products.length],
      target_quantity: target, actual_quantity: actual,
      asset_id: assets[i % assets.length], area_id: areas[i % areas.length],
      status: 'COMPLETADA', priority: ['NORMAL','ALTA','NORMAL','URGENTE'][i % 4],
      notes: null, started_at: started, completed_at: completed,
      due_at: new Date(started.getTime() + 20 * 3600_000),
      created_at: created
    });
  }

  // En proceso (hoy)
  for (let i = 0; i < 4; i++) {
    const target  = rnd(300, 600);
    const actual  = Math.round(target * rnd(20, 65) / 100);
    const started = hoursAgo(rnd(2, 10));
    orders.push({
      order_number: `OP-2026-${String(i + 13).padStart(4, '0')}`,
      product_name: products[(i + 3) % products.length],
      target_quantity: target, actual_quantity: actual,
      asset_id: assets[i % assets.length], area_id: areas[i % areas.length],
      status: 'EN_PROCESO', priority: ['ALTA','NORMAL','URGENTE','ALTA'][i],
      notes: null, started_at: started, completed_at: null,
      due_at: new Date(Date.now() + rnd(4, 12) * 3600_000),
      created_at: new Date(started.getTime() - 30 * 60_000)
    });
  }

  // Pendientes
  for (let i = 0; i < 5; i++) {
    const created = hoursAgo(rnd(1, 6));
    orders.push({
      order_number: `OP-2026-${String(i + 17).padStart(4, '0')}`,
      product_name: products[(i + 5) % products.length],
      target_quantity: rnd(150, 500), actual_quantity: 0,
      asset_id: assets[i % assets.length], area_id: areas[i % areas.length],
      status: 'PENDIENTE', priority: ['NORMAL','ALTA','NORMAL','BAJA','URGENTE'][i],
      notes: null, started_at: null, completed_at: null,
      due_at: new Date(Date.now() + rnd(8, 48) * 3600_000),
      created_at: created
    });
  }

  for (const o of orders) {
    await pool.query(`
      INSERT INTO production_orders
        (tenant_id, order_number, product_name, target_quantity, actual_quantity,
         asset_id, area_id, status, priority, notes, started_at, completed_at, due_at, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14)`,
      [TENANT_ID, o.order_number, o.product_name, o.target_quantity, o.actual_quantity,
       o.asset_id, o.area_id, o.status, o.priority, o.notes,
       o.started_at, o.completed_at, o.due_at, o.created_at]
    );
  }
  console.log(`  ✓ ${orders.length} órdenes creadas (12 completadas, 4 en proceso, 5 pendientes)`);

  // Return IDs of completed orders for scrap linkage
  const res = await pool.query(`SELECT id FROM production_orders WHERE tenant_id=$1 AND status='COMPLETADA' LIMIT 6`, [TENANT_ID]);
  return res.rows.map((r: any) => r.id);
}

// ──────────────────────────────────────────────
// Scrap, Downtime, Maintenance dentro de seedOrders cb
// ──────────────────────────────────────────────
async function seedScrap(orderIds: string[]) {
  console.log('     + Scrap records…');

  // Defectos típicos de inyección de plástico por categoría
  const defects: Record<string, string[]> = {
    DIMENSIONAL: [
      'Fuera de tolerancia ±0.05 mm en diámetro exterior',
      'Espesor de pared irregular (2.8 mm, spec 3.0 mm)',
      'Deformación por enfriamiento — warping detectado en planitud',
      'Longitud fuera de spec — pieza corta 1.2 mm',
    ],
    COSMÉTICO: [
      'Líneas de flujo visibles en cara A — inaceptable para cliente',
      'Marcas de quemado (diesel effect) en zona de unión de flujos',
      'Rebaba excesiva en línea de partición del molde',
      'Hundimientos (sink marks) en zona gruesa de pared',
      'Plateado por humedad en pellet — burbujas superficiales',
      'Rayaduras por eyector — zona de expulsión dañada',
    ],
    FUNCIONAL: [
      'Short shot — pieza incompleta, falta llenado en nervio lateral',
      'Jetting visible — chorro de material no fundido',
      'Atrapamiento de aire — vacíos internos detectados por rayos X',
      'Clip roto al primer ensamble — material frágil por degradación',
    ],
    MATERIAL: [
      'Contaminación con material reciclado fuera de especificación',
      'Degradación térmica por purga tardía — material quemado',
      'Humedad en pellet PP — burbujas y porosidad en corte',
      'Mezcla incorrecta de masterbatch de color — tono fuera de muestra',
    ],
    PROCESO: [
      'Variación de peso de pieza > 2% — inestabilidad de proceso',
      'Tiempo de ciclo excedido — enfriamiento insuficiente al eyectar',
      'Presión de inyección inestable — fluctuación de 30 bar en ciclo',
      'Temperatura de barril fuera de setpoint ±15°C — termopar fallando',
      'Rechupes por presión de sostenimiento insuficiente',
    ],
    OTRO: [
      'Daño en transporte interno — pieza golpeada en caja',
      'Etiquetado incorrecto — número de parte erróneo en caja',
    ],
  };

  const inspectors = ['Ana García','Carlos M.','Lucía H.','Roberto S.'];
  const assets     = ['injector-1','OVEN-B2','METROLOGY_01'];
  const areas      = ['a1','a2','a3'];
  const scrapRows: any[] = [];

  // 42 registros repartidos en los últimos 7 días
  const seedEntries = [
    // Hoy
    { cat: 'COSMÉTICO',   qty: 12, dDay: 0, ai: 0, ii: 0 },
    { cat: 'DIMENSIONAL', qty:  5, dDay: 0, ai: 1, ii: 1 },
    { cat: 'FUNCIONAL',   qty:  3, dDay: 0, ai: 0, ii: 2 },
    { cat: 'PROCESO',     qty:  8, dDay: 0, ai: 2, ii: 3 },
    // Ayer
    { cat: 'COSMÉTICO',   qty: 15, dDay: 1, ai: 0, ii: 1 },
    { cat: 'DIMENSIONAL', qty:  7, dDay: 1, ai: 1, ii: 0 },
    { cat: 'MATERIAL',    qty:  4, dDay: 1, ai: 2, ii: 2 },
    { cat: 'FUNCIONAL',   qty:  2, dDay: 1, ai: 0, ii: 3 },
    { cat: 'PROCESO',     qty: 10, dDay: 1, ai: 1, ii: 1 },
    // Hace 2 días
    { cat: 'COSMÉTICO',   qty:  9, dDay: 2, ai: 2, ii: 0 },
    { cat: 'DIMENSIONAL', qty:  6, dDay: 2, ai: 0, ii: 2 },
    { cat: 'OTRO',        qty:  3, dDay: 2, ai: 1, ii: 3 },
    { cat: 'FUNCIONAL',   qty:  5, dDay: 2, ai: 2, ii: 1 },
    // Hace 3 días
    { cat: 'MATERIAL',    qty: 11, dDay: 3, ai: 0, ii: 0 },
    { cat: 'COSMÉTICO',   qty: 14, dDay: 3, ai: 1, ii: 2 },
    { cat: 'PROCESO',     qty:  6, dDay: 3, ai: 2, ii: 1 },
    { cat: 'DIMENSIONAL', qty:  4, dDay: 3, ai: 0, ii: 3 },
    // Hace 4 días
    { cat: 'FUNCIONAL',   qty:  8, dDay: 4, ai: 1, ii: 0 },
    { cat: 'COSMÉTICO',   qty: 17, dDay: 4, ai: 2, ii: 2 },
    { cat: 'MATERIAL',    qty:  3, dDay: 4, ai: 0, ii: 1 },
    { cat: 'PROCESO',     qty:  9, dDay: 4, ai: 1, ii: 3 },
    // Hace 5 días
    { cat: 'DIMENSIONAL', qty:  5, dDay: 5, ai: 2, ii: 0 },
    { cat: 'COSMÉTICO',   qty: 11, dDay: 5, ai: 0, ii: 2 },
    { cat: 'OTRO',        qty:  2, dDay: 5, ai: 1, ii: 1 },
    { cat: 'FUNCIONAL',   qty:  4, dDay: 5, ai: 2, ii: 3 },
    // Hace 6 días
    { cat: 'MATERIAL',    qty:  7, dDay: 6, ai: 0, ii: 0 },
    { cat: 'COSMÉTICO',   qty: 13, dDay: 6, ai: 1, ii: 2 },
    { cat: 'PROCESO',     qty:  5, dDay: 6, ai: 2, ii: 1 },
    { cat: 'DIMENSIONAL', qty:  3, dDay: 6, ai: 0, ii: 3 },
    // Hace 7 días
    { cat: 'COSMÉTICO',   qty: 16, dDay: 7, ai: 1, ii: 0 },
    { cat: 'FUNCIONAL',   qty:  6, dDay: 7, ai: 2, ii: 2 },
    { cat: 'DIMENSIONAL', qty:  8, dDay: 7, ai: 0, ii: 1 },
    { cat: 'PROCESO',     qty:  7, dDay: 7, ai: 1, ii: 3 },
    { cat: 'MATERIAL',    qty:  4, dDay: 7, ai: 2, ii: 0 },
  ];

  for (let i = 0; i < seedEntries.length; i++) {
    const e = seedEntries[i];
    const cat = e.cat as keyof typeof defects;
    const descList = defects[cat];
    const descIdx  = i % descList.length;
    scrapRows.push({
      asset_id: assets[e.ai],
      area_id:  areas[e.ai],
      order_id: orderIds[i % orderIds.length] || null,
      quantity: e.qty,
      reason_category:    cat,
      reason_description: descList[descIdx],
      inspector: inspectors[e.ii],
      created_at: daysAgo(e.dDay),
    });
  }

  for (const s of scrapRows) {
    await pool.query(`
      INSERT INTO scrap_records (tenant_id, asset_id, area_id, order_id, quantity, reason_category, reason_description, inspector, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [TENANT_ID, s.asset_id, s.area_id, s.order_id, s.quantity, s.reason_category, s.reason_description, s.inspector, s.created_at]
    );
  }
  console.log(`     ✓ ${scrapRows.length} registros de scrap (inyección plástico)`);
}

async function seedDowntime() {
  console.log('     + Downtime events…');
  const causesRes = await pool.query(`SELECT id, label, category FROM downtime_causes WHERE tenant_id IS NULL LIMIT 14`);
  const causes = causesRes.rows;
  const responsibles = ['Carlos Martínez','Roberto Sánchez','Ana García','Técnico Ext.'];

  const events = [
    { hoursBack: 168, duration: 45, causeIdx: 0 },  // hace 7 días, mecánico
    { hoursBack: 144, duration: 20, causeIdx: 3 },  // eléctrico
    { hoursBack: 120, duration: 90, causeIdx: 0 },  // mecánico largo
    { hoursBack: 96,  duration: 15, causeIdx: 6 },  // operativo
    { hoursBack: 72,  duration: 30, causeIdx: 3 },  // eléctrico
    { hoursBack: 60,  duration: 60, causeIdx: 9 },  // calidad
    { hoursBack: 48,  duration: 25, causeIdx: 0 },  // mecánico
    { hoursBack: 36,  duration: 10, causeIdx: 6 },  // operativo corto
    { hoursBack: 24,  duration: 40, causeIdx: 11 }, // material
    { hoursBack: 12,  duration: 20, causeIdx: 3 },  // eléctrico
    { hoursBack: 6,   duration: 15, causeIdx: 6 },  // operativo
    { hoursBack: 3,   duration: 35, causeIdx: 0 },  // mecánico reciente
  ];

  for (const e of events) {
    const startedAt   = hoursAgo(e.hoursBack);
    const endedAt     = new Date(startedAt.getTime() + e.duration * 60_000);
    const cause       = causes[e.causeIdx % causes.length];
    const responsible = responsibles[e.causeIdx % responsibles.length];
    await pool.query(`
      INSERT INTO downtime_events (tenant_id, asset_id, area_id, started_at, ended_at, duration_minutes, cause_id, cause_description, responsible)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [TENANT_ID, 'injector-1', 'a1', startedAt, endedAt, e.duration, cause.id, `${cause.label} — detectado en inspección rutinaria`, responsible]
    );
  }
  console.log(`     ✓ ${events.length} eventos de paro (histórico 7 días)`);
}

async function seedMaintenance() {
  console.log('     + Planes de mantenimiento…');
  const plans = [
    { asset_id: 'injector-1',      name: 'Lubricación de carro y guías',        freq: 7,  dur: 60,  responsible: 'Carlos Martínez', daysAgoNext: -2 },
    { asset_id: 'injector-1',      name: 'Cambio de aceite hidráulico',          freq: 90, dur: 240, responsible: 'Técnico Externo',  daysAgoNext: 5 },
    { asset_id: 'OVEN-B2',         name: 'Limpieza de quemadores y toberas',     freq: 30, dur: 120, responsible: 'Roberto Sánchez',  daysAgoNext: 3 },
    { asset_id: 'OVEN-B2',         name: 'Calibración de termocuplas',           freq: 60, dur: 90,  responsible: 'Lucía Hernández',  daysAgoNext: 10 },
    { asset_id: 'CHILLER-UNIT-01', name: 'Limpieza de condensador',              freq: 30, dur: 180, responsible: 'Carlos Martínez',  daysAgoNext: 1 },
    { asset_id: 'MCH-001',         name: 'Inspección de sellos y cilindros',     freq: 14, dur: 90,  responsible: 'Roberto Sánchez',  daysAgoNext: -5 },
    { asset_id: 'MCH-001',         name: 'Cambio de filtros hidráulicos',        freq: 60, dur: 60,  responsible: 'Técnico Externo',  daysAgoNext: 20 },
    { asset_id: 'METROLOGY_01',    name: 'Calibración de palpadores y sondas',   freq: 30, dur: 120, responsible: 'Lucía Hernández',  daysAgoNext: 0 },
  ];

  for (const p of plans) {
    const lastDoneAt = daysAgo(p.freq - p.daysAgoNext);
    const nextDueAt  = new Date(lastDoneAt.getTime() + p.freq * 86_400_000);
    const res = await pool.query(`
      INSERT INTO maintenance_plans (tenant_id, asset_id, name, frequency_days, estimated_duration_min, responsible, last_done_at, next_due_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [TENANT_ID, p.asset_id, p.name, p.freq, p.dur, p.responsible, lastDoneAt, nextDueAt]
    );
    const planId = res.rows[0].id;

    // 1–2 registros históricos por plan
    const recCount = rnd(1, 3);
    for (let i = recCount; i >= 1; i--) {
      const doneAt = daysAgo(p.freq * i);
      await pool.query(`
        INSERT INTO maintenance_records (plan_id, tenant_id, asset_id, done_at, done_by, duration_min, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [planId, TENANT_ID, p.asset_id, doneAt, p.responsible, Math.round(p.dur * rnd(80, 110) / 100),
         ['Sin novedades','Desgaste leve en sello #2','Ajuste de presión requerido','Completado sin incidencias'][rnd(0, 3)]]
      );
    }
  }
  console.log(`     ✓ ${plans.length} planes de mantenimiento con registros históricos`);
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Kenzly Industrial — Seed Demo');
  console.log(`  Tenant: ${TENANT_SLUG} (${TENANT_ID})`);
  console.log('═══════════════════════════════════════════════');

  await cleanup();
  await seedAssets();
  await seedManifest();
  await seedUsers();
  await seedTelemetry();
  const orderIds = await seedOrders();
  await seedScrap(orderIds);
  await seedDowntime();
  await seedMaintenance();

  console.log('\n═══════════════════════════════════════════════');
  console.log('  ✅  Seed completado.');
  console.log('  Login: slug=demo-industrial, usuario=operador1, pass=demo1234');
  console.log('═══════════════════════════════════════════════\n');

  await pool.end();
}

main().catch(e => { console.error('\n❌ ERROR:', e.message, '\n', e.stack); process.exit(1); });
