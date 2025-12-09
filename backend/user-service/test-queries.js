// Script para probar las consultas de usuarios
const { createConfig } = require('../config');
const { db, createLogger } = require('@campus/base-middleware');

const config = createConfig({
    serviceName: 'user-service',
    serviceRoot: __dirname,
    defaults: {
        DB_NAME: 'instenglish_auth',
        PORT: 3002,
    },
});

db.configure(config.dbPoolConfig());
const logger = createLogger({ name: 'test-queries' });

async function testQueries() {
    try {
        console.log('\n=== PROBANDO CONSULTAS DE USUARIOS ===\n');

        // 1. Contar todos los usuarios
        const [totalCount] = await db.query('SELECT COUNT(*) as total FROM usuarios');
        console.log(`📊 Total de usuarios en la base de datos: ${totalCount.total}\n`);

        // 2. Ver algunos usuarios de ejemplo
        const sampleUsers = await db.query(`
      SELECT 
        id, 
        nombre, 
        email, 
        rol,
        nombres,
        apellido_paterno,
        apellido_materno,
        documento_identidad,
        fecha_nacimiento,
        genero
      FROM usuarios 
      LIMIT 5
    `);

        console.log('👥 Muestra de usuarios:');
        sampleUsers.forEach(u => {
            console.log(`  - ID: ${u.id}, Nombre: ${u.nombre}, Email: ${u.email}`);
            console.log(`    Nombres: ${u.nombres || 'NULL'}, Apellidos: ${u.apellido_paterno || 'NULL'} ${u.apellido_materno || 'NULL'}`);
            console.log(`    Documento: ${u.documento_identidad || 'NULL'}, Fecha Nac: ${u.fecha_nacimiento || 'NULL'}, Género: ${u.genero || 'NULL'}`);
        });

        // 3. Contar usuarios incompletos
        const [incompletosCount] = await db.query(`
      SELECT COUNT(*) as total FROM usuarios u
      WHERE 
        u.nombres IS NULL OR u.nombres = '' OR
        u.apellido_paterno IS NULL OR u.apellido_paterno = '' OR
        u.apellido_materno IS NULL OR u.apellido_materno = '' OR
        u.documento_identidad IS NULL OR u.documento_identidad = ''
    `);
        console.log(`\n❌ Usuarios con datos incompletos: ${incompletosCount.total}`);

        // 4. Contar usuarios completos
        const [completosCount] = await db.query(`
      SELECT COUNT(*) as total FROM usuarios u
      WHERE 
        u.nombres IS NOT NULL AND u.nombres != '' AND
        u.apellido_paterno IS NOT NULL AND u.apellido_paterno != '' AND
        u.apellido_materno IS NOT NULL AND u.apellido_materno != '' AND
        u.documento_identidad IS NOT NULL AND u.documento_identidad != '' AND
        u.fecha_nacimiento IS NOT NULL AND
        u.genero IS NOT NULL AND u.genero != ''
    `);
        console.log(`✅ Usuarios con datos completos: ${completosCount.total}`);

        // 5. Ver qué campos faltan en usuarios incompletos
        console.log('\n🔍 Análisis de campos faltantes:');
        const [faltantes] = await db.query(`
      SELECT 
        SUM(CASE WHEN nombres IS NULL OR nombres = '' THEN 1 ELSE 0 END) as sin_nombres,
        SUM(CASE WHEN apellido_paterno IS NULL OR apellido_paterno = '' THEN 1 ELSE 0 END) as sin_apellido_p,
        SUM(CASE WHEN apellido_materno IS NULL OR apellido_materno = '' THEN 1 ELSE 0 END) as sin_apellido_m,
        SUM(CASE WHEN documento_identidad IS NULL OR documento_identidad = '' THEN 1 ELSE 0 END) as sin_documento,
        SUM(CASE WHEN fecha_nacimiento IS NULL THEN 1 ELSE 0 END) as sin_fecha_nac,
        SUM(CASE WHEN genero IS NULL OR genero = '' THEN 1 ELSE 0 END) as sin_genero
      FROM usuarios
    `);

        console.log(`  - Sin nombres: ${faltantes.sin_nombres}`);
        console.log(`  - Sin apellido paterno: ${faltantes.sin_apellido_p}`);
        console.log(`  - Sin apellido materno: ${faltantes.sin_apellido_m}`);
        console.log(`  - Sin documento: ${faltantes.sin_documento}`);
        console.log(`  - Sin fecha nacimiento: ${faltantes.sin_fecha_nac}`);
        console.log(`  - Sin género: ${faltantes.sin_genero}`);

        console.log('\n=== FIN DE PRUEBAS ===\n');

    } catch (error) {
        console.error('❌ Error en las pruebas:', error);
    } finally {
        await db.close();
        process.exit(0);
    }
}

testQueries();
