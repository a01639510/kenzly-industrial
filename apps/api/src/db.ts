import pkg from 'pg';
const { Pool } = pkg;

try { (process as any).loadEnvFile('.env'); } catch {}

const connectionString = process.env.DATABASE_URL;

const pool = connectionString
  ? new Pool({ connectionString })
  : new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'postgres',
      password: process.env.DB_PASSWORD,
      port: Number(process.env.DB_PORT) || 5432,
    });

if (!connectionString && !process.env.DB_PASSWORD) {
  console.warn('⚠️  ADVERTENCIA: DB_PASSWORD no configurada. Verifica tu .env');
}

pool.query('SELECT current_database(), now()', (err, res) => {
  if (err) {
    console.error('❌ ERROR DE CONEXIÓN A POSTGRES:', err.message);
  } else {
    console.log(`✅ API Conectada a la DB: "${res.rows[0].current_database}"`);
  }
});

export default pool;