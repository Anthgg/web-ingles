-- ========================================
-- CONFIGURAR FECHAS PARA LOS CURSOS
-- ========================================

USE instenglish_classes;

-- Establecer fechas para los cursos existentes
-- Todos los cursos del cuatrimestre octubre-diciembre 2025

UPDATE cursos SET fecha_inicio = '2025-10-01', fecha_fin = '2025-12-31' WHERE id = 1;
UPDATE cursos SET fecha_inicio = '2025-10-01', fecha_fin = '2025-12-31' WHERE id = 17;

SELECT '========================================' AS '';
SELECT '✓ Fechas configuradas para los cursos' AS '';
SELECT '========================================' AS '';

-- Verificar las fechas establecidas
SELECT 
  c.id,
  c.nombre,
  c.fecha_inicio,
  c.fecha_fin,
  DATEDIFF(c.fecha_fin, c.fecha_inicio) AS dias_duracion
FROM cursos c
WHERE c.id IN (1, 17)
ORDER BY c.id;
