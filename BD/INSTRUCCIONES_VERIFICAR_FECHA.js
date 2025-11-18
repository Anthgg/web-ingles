// Script para verificar fecha_ingreso usando el user-service API
const http = require('http');

// Token de prueba - en producción deberías autenticarte primero
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbCI6ImFkbWluaXN0cmFkb3IiLCJpYXQiOjE3MzExMjAwMDB9.test';

console.log('🔍 Consultando usuarios docentes...\n');
console.log('📝 Nota: Debes iniciar sesión primero y usar tu token real\n');
console.log('Alternativa: Usa el frontend en http://localhost:3000');
console.log('Ve a "Usuarios Incompletos" y completa datos de un docente\n');
console.log('='.repeat(60));
console.log('\n✅ Frontend corriendo en: http://localhost:3000');
console.log('✅ Backend corriendo en: http://localhost:3002');
console.log('\n📋 Para verificar la base de datos directamente:');
console.log('   1. Abre MySQL Workbench o phpMyAdmin');
console.log('   2. Conecta a: localhost (usuario: root, sin contraseña)');
console.log('   3. Ejecuta esta consulta:');
console.log('\n' + '-'.repeat(60));
console.log(`
SELECT 
  u.id,
  u.nombre,
  u.email,
  DATE_FORMAT(u.created_at, '%Y-%m-%d') AS fecha_creacion,
  DATE_FORMAT(d.fecha_ingreso, '%Y-%m-%d') AS fecha_ingreso,
  CASE 
    WHEN d.fecha_ingreso IS NULL THEN 'No guardado'
    WHEN DATE(d.fecha_ingreso) = DATE(u.created_at) THEN 'Correcto'
    ELSE 'Diferente'
  END AS estado
FROM usuarios u
LEFT JOIN docente_datos d ON u.id = d.docente_id
WHERE u.rol IN ('docente', 'profesor')
ORDER BY u.created_at DESC
LIMIT 10;
`);
console.log('-'.repeat(60));
console.log('\n🎯 Pasos para probar la funcionalidad:');
console.log('   1. Ve a http://localhost:3000');
console.log('   2. Inicia sesión como admin');
console.log('   3. Haz clic en "Usuarios Incompletos"');
console.log('   4. Selecciona un docente');
console.log('   5. Completa el formulario');
console.log('   6. Verifica que "Fecha de Ingreso" sea automática');
console.log('   7. Guarda los datos');
console.log('   8. Ejecuta la consulta SQL arriba para verificar\n');
