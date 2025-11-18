-- =====================================================
-- MEJORAS PARA SISTEMA DE ASISTENCIAS
-- =====================================================
-- Este script agrega funcionalidad para:
-- 1. Registrar asistencias por día de clase
-- 2. Control de modificación (7 días para docente, ilimitado para admin)
-- 3. Campos adicionales para auditoría
-- =====================================================

USE instenglish_attendance;

-- Agregar columnas si no existen (con manejo de errores)
-- Observaciones
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'instenglish_attendance' 
AND TABLE_NAME = 'asistencias' 
AND COLUMN_NAME = 'observaciones';

SET @query = IF(@col_exists = 0, 
    'ALTER TABLE asistencias ADD COLUMN observaciones TEXT COMMENT "Observaciones adicionales del docente"',
    'SELECT "La columna observaciones ya existe" as mensaje');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Modificado por
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'instenglish_attendance' 
AND TABLE_NAME = 'asistencias' 
AND COLUMN_NAME = 'modificado_por';

SET @query = IF(@col_exists = 0, 
    'ALTER TABLE asistencias ADD COLUMN modificado_por INT COMMENT "ID del usuario que modificó por última vez"',
    'SELECT "La columna modificado_por ya existe" as mensaje');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Fecha modificación
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'instenglish_attendance' 
AND TABLE_NAME = 'asistencias' 
AND COLUMN_NAME = 'fecha_modificacion';

SET @query = IF(@col_exists = 0, 
    'ALTER TABLE asistencias ADD COLUMN fecha_modificacion DATETIME COMMENT "Fecha de última modificación"',
    'SELECT "La columna fecha_modificacion ya existe" as mensaje');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Bloqueado
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'instenglish_attendance' 
AND TABLE_NAME = 'asistencias' 
AND COLUMN_NAME = 'bloqueado';

SET @query = IF(@col_exists = 0, 
    'ALTER TABLE asistencias ADD COLUMN bloqueado BOOLEAN DEFAULT FALSE COMMENT "Indica si está bloqueado para edición del docente"',
    'SELECT "La columna bloqueado ya existe" as mensaje');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Índices para mejorar rendimiento (con manejo de errores)
SET @index_exists = 0;
SELECT COUNT(1) INTO @index_exists FROM information_schema.statistics 
WHERE table_schema = 'instenglish_attendance' AND table_name = 'asistencias' AND index_name = 'idx_asistencias_fecha';
SET @query = IF(@index_exists = 0, 
    'CREATE INDEX idx_asistencias_fecha ON asistencias(fecha)',
    'SELECT "Índice idx_asistencias_fecha ya existe" as mensaje');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = 0;
SELECT COUNT(1) INTO @index_exists FROM information_schema.statistics 
WHERE table_schema = 'instenglish_attendance' AND table_name = 'asistencias' AND index_name = 'idx_asistencias_estudiante_fecha';
SET @query = IF(@index_exists = 0, 
    'CREATE INDEX idx_asistencias_estudiante_fecha ON asistencias(estudiante_id, fecha)',
    'SELECT "Índice idx_asistencias_estudiante_fecha ya existe" as mensaje');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = 0;
SELECT COUNT(1) INTO @index_exists FROM information_schema.statistics 
WHERE table_schema = 'instenglish_attendance' AND table_name = 'asistencias' AND index_name = 'idx_asistencias_asignacion_fecha';
SET @query = IF(@index_exists = 0, 
    'CREATE INDEX idx_asistencias_asignacion_fecha ON asistencias(asignacion_id, fecha)',
    'SELECT "Índice idx_asistencias_asignacion_fecha ya existe" as mensaje');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = 0;
SELECT COUNT(1) INTO @index_exists FROM information_schema.statistics 
WHERE table_schema = 'instenglish_attendance' AND table_name = 'asistencias' AND index_name = 'idx_asistencias_materia';
SET @query = IF(@index_exists = 0, 
    'CREATE INDEX idx_asistencias_materia ON asistencias(materia_id)',
    'SELECT "Índice idx_asistencias_materia ya existe" as mensaje');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Vista para estadísticas de asistencia por curso y fecha
DROP VIEW IF EXISTS v_estadisticas_asistencia;
CREATE VIEW v_estadisticas_asistencia AS
SELECT 
    a.asignacion_id,
    a.materia_id,
    DATE(a.fecha) as fecha,
    COUNT(*) as total_estudiantes,
    SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) as presentes,
    SUM(CASE WHEN a.estado = 'ausente' THEN 1 ELSE 0 END) as ausentes,
    SUM(CASE WHEN a.estado = 'tardanza' THEN 1 ELSE 0 END) as tardanzas,
    SUM(CASE WHEN a.estado = 'justificado' THEN 1 ELSE 0 END) as justificados,
    ROUND((SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as porcentaje_asistencia
FROM asistencias a
GROUP BY a.asignacion_id, a.materia_id, DATE(a.fecha);

-- Vista para resumen de asistencia por estudiante
DROP VIEW IF EXISTS v_resumen_asistencia_estudiante;
CREATE VIEW v_resumen_asistencia_estudiante AS
SELECT 
    a.estudiante_id,
    a.materia_id,
    a.asignacion_id,
    COUNT(*) as total_clases,
    SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) as clases_presentes,
    SUM(CASE WHEN a.estado = 'ausente' THEN 1 ELSE 0 END) as clases_ausentes,
    SUM(CASE WHEN a.estado = 'tardanza' THEN 1 ELSE 0 END) as tardanzas,
    SUM(CASE WHEN a.estado = 'justificado' THEN 1 ELSE 0 END) as justificados,
    ROUND((SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as porcentaje_asistencia
FROM asistencias a
GROUP BY a.estudiante_id, a.materia_id, a.asignacion_id;

-- Procedimiento almacenado para bloquear asistencias antiguas (ejecutar diariamente)
DROP PROCEDURE IF EXISTS sp_bloquear_asistencias_antiguas;
DELIMITER //
CREATE PROCEDURE sp_bloquear_asistencias_antiguas()
BEGIN
    -- Bloquear asistencias con más de 7 días para edición del docente
    UPDATE asistencias 
    SET bloqueado = TRUE 
    WHERE DATEDIFF(NOW(), fecha) > 7 
    AND bloqueado = FALSE;
    
    SELECT CONCAT('Se bloquearon ', ROW_COUNT(), ' registros de asistencia.') as mensaje;
END //
DELIMITER ;

-- Procedimiento para verificar si un docente puede modificar una asistencia
DROP FUNCTION IF EXISTS fn_puede_modificar_asistencia;
DELIMITER //
CREATE FUNCTION fn_puede_modificar_asistencia(
    p_asistencia_id INT,
    p_usuario_rol VARCHAR(50)
) RETURNS BOOLEAN
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_dias_antiguedad INT;
    DECLARE v_bloqueado BOOLEAN;
    
    -- Obtener días de antigüedad y estado de bloqueo
    SELECT 
        DATEDIFF(NOW(), fecha),
        bloqueado
    INTO v_dias_antiguedad, v_bloqueado
    FROM asistencias 
    WHERE id = p_asistencia_id;
    
    -- Admin siempre puede modificar
    IF p_usuario_rol = 'administrativo' THEN
        RETURN TRUE;
    END IF;
    
    -- Docente solo puede modificar si tiene menos de 7 días y no está bloqueado
    IF p_usuario_rol = 'profesor' THEN
        IF v_dias_antiguedad <= 7 AND v_bloqueado = FALSE THEN
            RETURN TRUE;
        ELSE
            RETURN FALSE;
        END IF;
    END IF;
    
    RETURN FALSE;
END //
DELIMITER ;

-- Trigger para actualizar fecha_modificacion automáticamente
DROP TRIGGER IF EXISTS tr_asistencias_before_update;
DELIMITER //
CREATE TRIGGER tr_asistencias_before_update
BEFORE UPDATE ON asistencias
FOR EACH ROW
BEGIN
    SET NEW.fecha_modificacion = NOW();
END //
DELIMITER ;

SELECT '✅ Script de mejoras de asistencias ejecutado correctamente' as Resultado;
