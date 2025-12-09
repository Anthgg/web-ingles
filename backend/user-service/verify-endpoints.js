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
        console.log('=== VERIFICANDO CRITERIOS EXACTOS DE LOS ENDPOINTS ===\n');

        // Criterio EXACTO del endpoint /usuarios/completos
        const completos = await db.query(`
            SELECT 
                id, nombre, nombres, apellido_paterno, apellido_materno, 
                documento_identidad, email, rol
            FROM usuarios u
            WHERE 
                u.nombres IS NOT NULL AND u.nombres != '' AND
                u.apellido_paterno IS NOT NULL AND u.apellido_paterno != '' AND
                u.apellido_materno IS NOT NULL AND u.apellido_materno != '' AND
                u.documento_identidad IS NOT NULL AND u.documento_identidad != ''
            ORDER BY u.rol, u.id
        `);

        console.log(`✅ Usuarios COMPLETOS (según endpoint): ${completos.length}`);
        if (completos.length > 0) {
            console.log('\nPrimeros 3 usuarios completos:');
            completos.slice(0, 3).forEach(u => {
                console.log(`  ID: ${u.id}, Nombre: ${u.nombre}`);
                console.log(`    Nombres: "${u.nombres}", Apellidos: "${u.apellido_paterno}" "${u.apellido_materno}"`);
                console.log(`    Documento: "${u.documento_identidad}"`);
            });
        }

        // Criterio EXACTO del endpoint /usuarios/incompletos
        const incompletos = await db.query(`
            SELECT 
                id, nombre, nombres, apellido_paterno, apellido_materno, 
                documento_identidad, email, rol
            FROM usuarios u
            WHERE 
                u.nombres IS NULL OR u.nombres = '' OR
                u.apellido_paterno IS NULL OR u.apellido_paterno = '' OR
                u.apellido_materno IS NULL OR u.apellido_materno = '' OR
                u.documento_identidad IS NULL OR u.documento_identidad = ''
            ORDER BY u.rol, u.id
        `);

        console.log(`\n❌ Usuarios INCOMPLETOS (según endpoint): ${incompletos.length}`);
        if (incompletos.length > 0) {
            console.log('\nPrimeros 3 usuarios incompletos:');
            incompletos.slice(0, 3).forEach(u => {
                console.log(`  ID: ${u.id}, Nombre: ${u.nombre}`);
                console.log(`    Nombres: "${u.nombres || 'VACÍO'}", Apellidos: "${u.apellido_paterno || 'VACÍO'}" "${u.apellido_materno || 'VACÍO'}"`);
                console.log(`    Documento: "${u.documento_identidad || 'VACÍO'}"`);
            });
        }

        // Total de usuarios
        const [total] = await db.query('SELECT COUNT(*) as total FROM usuarios');
        console.log(`\n📊 Total de usuarios en DB: ${total.total}`);
        console.log(`   Completos: ${completos.length}`);
        console.log(`   Incompletos: ${incompletos.length}`);
        console.log(`   Suma: ${completos.length + incompletos.length} (debe ser igual al total)`);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await db.close();
    }
}

run();
