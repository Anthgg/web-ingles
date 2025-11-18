-- Eliminar mensajes de sistema antiguos del chat
-- Estos mensajes ahora se muestran como notificaciones flotantes (toasts)
-- en lugar de aparecer en el historial del chat

USE instenglish_chat;

-- Ver cuántos mensajes de sistema hay
SELECT 
    COUNT(*) as total_mensajes_sistema,
    COUNT(DISTINCT room_id) as salas_afectadas
FROM messages
WHERE sender_id IS NULL;

-- Eliminar mensajes de sistema (donde sender_id es NULL)
DELETE FROM messages
WHERE sender_id IS NULL;

-- Verificar resultado
SELECT 
    COUNT(*) as mensajes_restantes
FROM messages;

SELECT '✅ Mensajes de sistema eliminados correctamente' AS resultado;
SELECT 'ℹ️ Los eventos de grupo ahora se mostrarán como notificaciones flotantes' AS info;
