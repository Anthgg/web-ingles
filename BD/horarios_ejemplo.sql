-- ========================================
-- HORARIOS DE EJEMPLO PARA CURSOS
-- ========================================
-- Este script configura horarios de ejemplo para los cursos existentes

USE instenglish_classes;

-- ========================================
-- Curso ID 1: "Clase de ingles Test"
-- Horario: Lunes, Miércoles, Viernes 8:00-10:00
-- ========================================

CALL sp_agregar_horario_curso(1, 'Clase de ingles Test', 1, '08:00:00', '10:00:00');
SELECT 'Horario agregado: Clase de ingles Test - Lunes 8:00-10:00' AS mensaje;

CALL sp_agregar_horario_curso(1, 'Clase de ingles Test', 3, '08:00:00', '10:00:00');
SELECT 'Horario agregado: Clase de ingles Test - Miércoles 8:00-10:00' AS mensaje;

CALL sp_agregar_horario_curso(1, 'Clase de ingles Test', 5, '08:00:00', '10:00:00');
SELECT 'Horario agregado: Clase de ingles Test - Viernes 8:00-10:00' AS mensaje;

-- ========================================
-- Curso ID 17: "ingles 2"
-- Horario: Martes, Jueves 14:00-16:00
-- ========================================

CALL sp_agregar_horario_curso(17, 'ingles 2', 2, '14:00:00', '16:00:00');
SELECT 'Horario agregado: ingles 2 - Martes 14:00-16:00' AS mensaje;

CALL sp_agregar_horario_curso(17, 'ingles 2', 4, '14:00:00', '16:00:00');
SELECT 'Horario agregado: ingles 2 - Jueves 14:00-16:00' AS mensaje;

-- ========================================
-- VERIFICAR HORARIOS CREADOS
-- ========================================

SELECT '========================================' AS '';
SELECT 'HORARIOS CONFIGURADOS:' AS '';
SELECT '========================================' AS '';

CALL sp_obtener_horarios_curso(1);
SELECT '' AS '';
CALL sp_obtener_horarios_curso(17);

SELECT '========================================' AS '';
SELECT '✓ Horarios de ejemplo creados exitosamente' AS '';
SELECT '========================================' AS '';
SELECT 'Ahora puedes:' AS '';
SELECT '1. Reiniciar el backend' AS '';
SELECT '2. Probar el registro de asistencias' AS '';
SELECT '3. Ver las estadísticas por curso' AS '';
