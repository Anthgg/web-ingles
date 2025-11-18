-- Agregar columna 'archived' a la tabla chat_participants para permitir archivar chats
-- Este script es idempotente (puede ejecutarse múltiples veces sin error)

USE instenglish_chat;

-- Verificar si la columna ya existe antes de agregarla
SET @dbname = DATABASE();
SET @tablename = 'chat_participants';
SET @columnname = 'archived';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE 
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT ''Column archived already exists'' AS message;',
  'ALTER TABLE chat_participants ADD COLUMN archived TINYINT(1) DEFAULT 0 COMMENT ''1 si el usuario archivó este chat'';'
));

PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Verificar el resultado
SELECT 
    COLUMN_NAME,
    COLUMN_TYPE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'instenglish_chat'
  AND TABLE_NAME = 'chat_participants'
  AND COLUMN_NAME = 'archived';

SELECT '✅ Columna archived agregada/verificada correctamente' AS resultado;
