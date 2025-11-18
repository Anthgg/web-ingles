USE instenglish_chat;

-- Agregar columna archived si no existe
ALTER TABLE chat_participants ADD COLUMN archived TINYINT(1) DEFAULT 0 COMMENT '1 si el usuario archivó este chat';

-- Eliminar mensajes de sistema
DELETE FROM messages WHERE sender_id IS NULL;

SELECT '✅ Scripts ejecutados correctamente' AS resultado;
