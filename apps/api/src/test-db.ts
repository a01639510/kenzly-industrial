import pool from './db.js';

async function probarConexion() {
  console.log("⏳ Intentando conectar a Kenzly Server...");
  try {
    // Consultamos el tenant que acabas de crear
    const res = await pool.query("SELECT * FROM tenants WHERE slug = 'bimbo-mx'");
    
    if (res.rows.length > 0) {
      console.log("✅ ¡CONEXIÓN EXITOSA!");
      console.log("-----------------------------------------");
      console.log(`Empresa: ${res.rows[0].name}`);
      console.log(`ID (UUID): ${res.rows[0].id}`);
      console.log(`Configuración (Manifest):`, res.rows[0].manifest);
      console.log("-----------------------------------------");
    } else {
      console.log("⚠️ Conectado, pero no se encontró a Bimbo. ¿Corriste el INSERT?");
    }
  } catch (err) {
    console.error("❌ ERROR DE CONEXIÓN:");
    console.error(err);
  } finally {
    // Cerramos la conexión para que el script termine
    await pool.end();
  }
}

probarConexion();