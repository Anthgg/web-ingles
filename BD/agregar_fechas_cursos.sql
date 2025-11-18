-- ========================================
-- AGREGAR FECHAS DE INICIO Y FIN A CURSOS
-- ========================================
-- Este script agrega las columnas fecha_inicio y fecha_fin a la tabla cursos
-- si no existen, para poder calcular las fechas de clase

USE instenglish_classes;

-- Verificar y agregar columna fecha_inicio
SET @dbname = DATABASE();
SET @tablename = 'cursos';
SET @columnname = 'fecha_inicio';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT ''La columna fecha_inicio ya existe'' AS mensaje;',
  'ALTER TABLE cursos ADD COLUMN fecha_inicio DATE NULL COMMENT ''Fecha de inicio del curso'';'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Verificar y agregar columna fecha_fin
SET @columnname = 'fecha_fin';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT ''La columna fecha_fin ya existe'' AS mensaje;',
  'ALTER TABLE cursos ADD COLUMN fecha_fin DATE NULL COMMENT ''Fecha de finalización del curso'';'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SELECT '========================================' AS '';
SELECT '✓ Columnas de fechas agregadas a cursos' AS '';
SELECT '========================================' AS '';

-- Mostrar cursos con sus fechas
SELECT 
  c.id,
  c.nombre,
  c.fecha_inicio,
  c.fecha_fin,
  DATEDIFF(c.fecha_fin, c.fecha_inicio) AS dias_duracion
FROM cursos c
ORDER BY c.id;
