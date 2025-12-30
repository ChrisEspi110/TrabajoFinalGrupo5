const { Pool } = require('pg');
const path = require('path');

// Cargar dotenv con ruta explícita (el .env está en la carpeta backend, un nivel arriba de config/)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Validar y limpiar variables de entorno
const dbConfig = {
  host: (process.env.DB_HOST || 'localhost').trim(),
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: (process.env.DB_NAME || 'biblioteca_db').trim(),
  user: (process.env.DB_USER || 'postgres').trim(),
  password: String(process.env.DB_PASSWORD || '').trim(),
};

// Validar que la contraseña no esté vacía
if (!dbConfig.password) {
  console.error('❌ ERROR: DB_PASSWORD no está configurada en el archivo .env');
  console.error('Por favor, crea un archivo .env en la carpeta backend con:');
  console.error('DB_PASSWORD=tu_contraseña_aqui');
  process.exit(1);
}

// Log de configuración (sin mostrar la contraseña completa)
console.log('📋 Configuración de base de datos:');
console.log(`   Host: ${dbConfig.host}`);
console.log(`   Puerto: ${dbConfig.port}`);
console.log(`   Base de datos: ${dbConfig.database}`);
console.log(`   Usuario: ${dbConfig.user}`);
console.log(`   Contraseña: ${dbConfig.password ? '***' + dbConfig.password.slice(-2) : 'NO CONFIGURADA'}`);

const pool = new Pool(dbConfig);

// Verificar conexión
pool.on('connect', () => {
  console.log('✅ Conectado a PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en la base de datos:', err);
});

// Función para verificar la conexión
async function testConnection() {
  try {
    console.log('🔍 Intentando conectar a PostgreSQL...');
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Conexión a PostgreSQL verificada:', result.rows[0].now);
    
    // Verificar que las tablas existan
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('books', 'loans')
    `);
    
    if (tablesCheck.rows.length === 2) {
      console.log('✅ Tablas verificadas: books, loans');
    } else {
      console.warn('⚠️ Advertencia: No se encontraron todas las tablas. Ejecuta database/schema.sql');
      console.warn(`   Tablas encontradas: ${tablesCheck.rows.map(r => r.table_name).join(', ')}`);
    }
    
    // Contar libros
    const booksCount = await pool.query('SELECT COUNT(*) FROM books');
    console.log(`📚 Libros en la base de datos: ${booksCount.rows[0].count}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error al verificar conexión:', error.message);
    console.error('   Tipo de error:', error.code);
    if (error.code === '28P01') {
      console.error('   💡 Solución: Verifica el usuario y contraseña en el archivo .env');
    } else if (error.code === '3D000') {
      console.error('   💡 Solución: La base de datos no existe. Ejecuta: CREATE DATABASE biblioteca_db;');
    } else if (error.message.includes('password must be a string')) {
      console.error('   💡 Solución: El archivo .env no se está leyendo correctamente.');
      console.error('   💡 Asegúrate de que el archivo .env esté en la carpeta backend/');
      console.error('   💡 Verifica que DB_PASSWORD esté configurada correctamente');
    }
    return false;
  }
}

module.exports = { pool, testConnection };

