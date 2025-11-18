-- ========================================
-- ACTUALIZACIÓN: Agregar descripción y foto a grupos
-- Base de datos: instenglish_chat
-- Fecha: 2025-11-14
-- ========================================

USE instenglish_chat;

-- Procedimiento para agregar columnas si no existen
DROP PROCEDURE IF EXISTS add_column_if_not_exists_groups;

DELIMITER $$
CREATE PROCEDURE add_column_if_not_exists_groups(
  IN tbl VARCHAR(64),
  IN col VARCHAR(64),
  IN definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tbl
      AND COLUMN_NAME = col
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    SELECT CONCAT('✓ Columna `', col, '` agregada a la tabla `', tbl, '`') AS resultado;
  ELSE
    SELECT CONCAT('✓ Columna `', col, '` ya existe en la tabla `', tbl, '`') AS resultado;
  END IF;
END$$
DELIMITER ;

-- Agregar columna de descripción del grupo
CALL add_column_if_not_exists_groups(
  'chat_rooms',
  'description',
  'TEXT NULL COMMENT "Descripción del grupo"'
);

-- Agregar columna de foto del grupo
CALL add_column_if_not_exists_groups(
  'chat_rooms',
  'group_photo',
  'VARCHAR(512) NULL COMMENT "URL de la foto del grupo"'
);

-- Agregar columna de fecha de creación si no existe
CALL add_column_if_not_exists_groups(
  'chat_rooms',
  'created_at',
  'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT "Fecha de creación"'
);

-- Agregar columna de última actualización si no existe
CALL add_column_if_not_exists_groups(
  'chat_rooms',
  'updated_at',
  'DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT "Fecha de última actualización"'
);

-- Limpiar procedimiento temporal
DROP PROCEDURE IF EXISTS add_column_if_not_exists_groups;

-- Verificar que las columnas se agregaron correctamente
SELECT 
  COLUMN_NAME AS columna,
  COLUMN_TYPE AS tipo,
  IS_NULLABLE AS permite_null,
  COLUMN_DEFAULT AS valor_por_defecto,
  COLUMN_COMMENT AS comentario
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'chat_rooms'
  AND COLUMN_NAME IN ('name', 'type', 'description', 'group_photo', 'created_at', 'updated_at')
ORDER BY ORDINAL_POSITION;

SELECT '✓ Script ejecutado correctamente. Columnas agregadas a chat_rooms.' AS resultado;
