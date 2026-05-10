import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

import { runMigrations } from './db/migrations.js';
import authRouter        from './routes/auth.js';
import adminRouter       from './routes/admin.js';
import tenantRouter      from './routes/tenant.js';
import shiftsRouter      from './routes/shifts.js';
import telemetryRouter   from './routes/telemetry.js';
import oeeRouter         from './routes/oee.js';
import scrapRouter       from './routes/scrap.js';
import ordersRouter      from './routes/orders.js';
import downtimeRouter    from './routes/downtime.js';
import maintenanceRouter from './routes/maintenance.js';

const app  = express();
const port = Number(process.env.PORT) || 3001;

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use(rateLimit({ windowMs: 60_000, max: 300, standardHeaders: true, legacyHeaders: false, message: { error: 'Demasiadas solicitudes, intenta más tarde.' } }));
app.use('/telemetry', rateLimit({ windowMs: 60_000, max: 120, message: { error: 'Límite de telemetría alcanzado.' } }));
app.use('/admin',     rateLimit({ windowMs: 60_000, max: 60,  message: { error: 'Límite de admin alcanzado.' } }));

runMigrations().catch(err => console.error('Error en migraciones:', err));

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.use('/auth',        authRouter);
app.use('/admin',       adminRouter);
app.use('/tenant',      tenantRouter);
app.use('/tenants',     shiftsRouter);
app.use('/telemetry',   telemetryRouter);
app.use('/oee',         oeeRouter);
app.use('/scrap',       scrapRouter);
app.use('/orders',      ordersRouter);
app.use('/downtime',    downtimeRouter);
app.use('/maintenance', maintenanceRouter);

app.listen(port, () => {
  console.log(`🚀 API activa en puerto ${port}`);
});
