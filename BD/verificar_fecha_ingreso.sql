-- Verificar que fecha_ingreso se guarda correctamente
USE instenglish_auth;

SELECT 
  u.id,
  u.nombre,
  u.email,
  u.rol,
  DATE_FORMAT(u.created_at, '%Y-%m-%d %H:%i:%s') AS fecha_creacion_cuenta,
  DATE_FORMAT(d.fecha_ingreso, '%Y-%m-%d %H:%i:%s') AS fecha_ingreso_guardada,
  CASE 
    WHEN d.fecha_ingreso IS NULL THEN '❌ No guardado'
    WHEN DATE(d.fecha_ingreso) = DATE(u.created_at) THEN '✅ Correcto'
    ELSE '⚠️ Diferente'
  END AS estado
FROM usuarios u
LEFT JOIN docente_datos d ON u.id = d.docente_id
WHERE u.rol IN ('docente', 'profesor')
ORDER BY u.created_at DESC
LIMIT 10;
