-- ========================================
-- CONFIGURAR FECHAS PARA TODOS LOS CURSOS
-- ========================================

USE instenglish_classes;

-- Actualizar TODOS los cursos existentes para que tengan fechas
-- Periodo: Octubre 2025 - Diciembre 2025 (cuatrimestre actual)

UPDATE cursos 
SET fecha_inicio = '2025-10-01', 
    fecha_fin = '2025-12-31' 
WHERE fecha_inicio IS NULL OR fecha_fin IS NULL;

-- Verificar las fechas establecidas
SELECT 
  id,
  nombre,
  fecha_inicio,
  fecha_fin,
  DATEDIFF(fecha_fin, fecha_inicio) AS dias_duracion
FROM cursos
ORDER BY id;

SELECT CONCAT('✓ Fechas configuradas para ', COUNT(*), ' cursos') AS resultado
FROM cursos 
WHERE fecha_inicio IS NOT NULL AND fecha_fin IS NOT NULL;
