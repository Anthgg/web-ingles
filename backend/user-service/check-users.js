const { createConfig } = require('../config');
const { db } = require('@campus/base-middleware');

const config = createConfig({
  serviceName: 'user-service',
  serviceRoot: __dirname,
  defaults: {
    DB_NAME: 'instenglish_auth',
    PORT: 3002,
  },
});

db.configure(config.dbPoolConfig());

async function run() {
  try {
    console.log('=== VERIFICANDO USUARIOS ===\n');

    // 1. Total de usuarios
    const total = await db.query('SELECT COUNT(*) as total FROM usuarios');
    console.log('Total de usuarios:', total[0].total);

    // 2. Usuarios incompletos (según criterio del endpoint)
    const incompletos = await db.query(`
            SELECT COUNT(*) as total FROM usuarios u
            WHERE 
                u.nombres IS NULL OR u.nombres = '' OR
                u.apellido_paterno IS NULL OR u.apellido_paterno = '' OR
                u.apellido_materno IS NULL OR u.apellido_materno = '' OR
                u.documento_identidad IS NULL OR u.documento_identidad = ''
        `);
    console.log('Usuarios incompletos:', incompletos[0].total);

    // 3. Usuarios completos (según criterio del endpoint)
    const completos = await db.query(`
            SELECT COUNT(*) as total FROM usuarios u
            WHERE 
                u.nombres IS NOT NULL AND u.nombres != '' AND
                u.apellido_paterno IS NOT NULL AND u.apellido_paterno != '' AND
                u.apellido_materno IS NOT NULL AND u.apellido_materno != '' AND
                u.documento_identidad IS NOT NULL AND u.documento_identidad != ''
        `);
    console.log('Usuarios completos:', completos[0].total);

    // 4. Muestra de usuarios incompletos
    console.log('\n=== MUESTRA DE USUARIOS INCOMPLETOS ===');
    const muestraIncompletos = await db.query(`
            SELECT 
                id, nombre, nombres, apellido_paterno, apellido_materno, 
                documento_identidad, email, rol
            FROM usuarios u
            WHERE 
                u.nombres IS NULL OR u.nombres = '' OR
                u.apellido_paterno IS NULL OR u.apellido_paterno = '' OR
                u.apellido_materno IS NULL OR u.apellido_materno = '' OR
                u.documento_identidad IS NULL OR u.documento_identidad = ''
            LIMIT 5
        `);
    console.table(muestraIncompletos);

    // 5. Muestra de usuarios completos
    console.log('\n=== MUESTRA DE USUARIOS COMPLETOS ===');
    const muestraCompletos = await db.query(`
            SELECT 
                id, nombre, nombres, apellido_paterno, apellido_materno, 
                documento_identidad, email, rol
            FROM usuarios u
            WHERE 
                u.nombres IS NOT NULL AND u.nombres != '' AND
                u.apellido_paterno IS NOT NULL AND u.apellido_paterno != '' AND
                u.apellido_materno IS NOT NULL AND u.apellido_materno != '' AND
                u.documento_identidad IS NOT NULL AND u.documento_identidad != ''
            LIMIT 5
        `);
    console.table(muestraCompletos);

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Detalles:', error);
  } finally {
    await db.close();
  }
}

run();
