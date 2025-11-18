-- Arreglar el tipo de columna message_type para soportar todos los tipos de archivos
USE instenglish_chat;

-- Modificar la columna para aceptar VARCHAR en lugar de ENUM limitado
ALTER TABLE `messages` 
MODIFY COLUMN `message_type` VARCHAR(50) NOT NULL DEFAULT 'text';

-- Verificar el cambio
SHOW COLUMNS FROM messages LIKE 'message_type';

SELECT 'message_type ha sido actualizado correctamente!' AS resultado;
