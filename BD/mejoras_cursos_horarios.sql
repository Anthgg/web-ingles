-- ========================================
-- MEJORAS PARA CURSOS CON HORARIOS/DÍAS
-- ========================================
-- Este script agrega:
-- 1. Tabla de horarios por curso (días de la semana)
-- 2. Relación entre asistencias y horarios
-- 3. Vista de estadísticas de asistencia por estudiante y curso
-- 4. Función para validar si una fecha corresponde al horario del curso

USE instenglish_classes;

-- ========================================
-- 1. TABLA DE HORARIOS POR CURSO
-- ========================================
-- Almacena los días de la semana en que se dicta cada curso

CREATE TABLE IF NOT EXISTS horarios_curso (
  id INT PRIMARY KEY AUTO_INCREMENT,
  curso_id INT NOT NULL COMMENT 'ID del curso',
  curso_nombre VARCHAR(100) NOT NULL COMMENT 'Nombre del curso para referencia',
  dia_semana TINYINT NOT NULL COMMENT '1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado, 7=Domingo',
  hora_inicio TIME COMMENT 'Hora de inicio de la clase',
  hora_fin TIME COMMENT 'Hora de fin de la clase',
  activo BOOLEAN DEFAULT TRUE COMMENT 'Si el horario está activo',
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_curso_id (curso_id),
  INDEX idx_dia_semana (dia_semana),
  INDEX idx_activo (activo),
  UNIQUE KEY unique_curso_dia (curso_id, dia_semana)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Días y horarios en que se dicta cada curso';

-- ========================================
-- 2. AGREGAR CURSO_ID A ASISTENCIAS
-- ========================================
-- Necesitamos relacionar cada asistencia con un curso específico

SET @dbname = 'instenglish_attendance';
SET @tablename = 'asistencias';
SET @columnname = 'curso_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE 
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT ''La columna curso_id ya existe'' AS resultado;',
  'ALTER TABLE instenglish_attendance.asistencias ADD COLUMN curso_id INT AFTER asignacion_id, ADD INDEX idx_curso_id (curso_id);'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ========================================
-- 3. AGREGAR CURSO_NOMBRE A ASISTENCIAS
-- ========================================
-- Para facilitar consultas sin JOIN

SET @columnname2 = 'curso_nombre';
SET @preparedStatement2 = (SELECT IF(
  (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE 
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname2
  ) > 0,
  'SELECT ''La columna curso_nombre ya existe'' AS resultado;',
  'ALTER TABLE instenglish_attendance.asistencias ADD COLUMN curso_nombre VARCHAR(100) AFTER curso_id, ADD INDEX idx_curso_nombre (curso_nombre);'
));
PREPARE alterIfNotExists2 FROM @preparedStatement2;
EXECUTE alterIfNotExists2;
DEALLOCATE PREPARE alterIfNotExists2;

-- ========================================
-- 3b. AGREGAR ESTUDIANTE_NOMBRE A ASISTENCIAS
-- ========================================
-- Para facilitar consultas sin JOIN con tabla de usuarios

SET @columnname3 = 'estudiante_nombre';
SET @preparedStatement3 = (SELECT IF(
  (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE 
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname3
  ) > 0,
  'SELECT ''La columna estudiante_nombre ya existe'' AS resultado;',
  'ALTER TABLE instenglish_attendance.asistencias ADD COLUMN estudiante_nombre VARCHAR(200) AFTER estudiante_id, ADD INDEX idx_estudiante_nombre (estudiante_nombre);'
));
PREPARE alterIfNotExists3 FROM @preparedStatement3;
EXECUTE alterIfNotExists3;
DEALLOCATE PREPARE alterIfNotExists3;

-- ========================================
-- 4. VISTA DE ESTADÍSTICAS POR ESTUDIANTE Y CURSO
-- ========================================
-- Muestra total de clases, presentes, ausentes, tardanzas y porcentaje por estudiante en cada curso

USE instenglish_attendance;

DROP VIEW IF EXISTS v_estadisticas_estudiante_curso;

CREATE VIEW v_estadisticas_estudiante_curso AS
SELECT 
  a.estudiante_id,
  a.estudiante_nombre,
  a.curso_id,
  a.curso_nombre,
  COUNT(*) AS total_registros,
  SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) AS total_presentes,
  SUM(CASE WHEN a.estado = 'ausente' THEN 1 ELSE 0 END) AS total_ausentes,
  SUM(CASE WHEN a.estado = 'tardanza' THEN 1 ELSE 0 END) AS total_tardanzas,
  ROUND(
    (SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) * 100.0) / COUNT(*),
    2
  ) AS porcentaje_asistencia,
  MIN(a.fecha) AS primera_clase,
  MAX(a.fecha) AS ultima_clase
FROM asistencias a
WHERE a.curso_id IS NOT NULL
GROUP BY a.estudiante_id, a.estudiante_nombre, a.curso_id, a.curso_nombre;

-- ========================================
-- 5. VISTA DE ESTADÍSTICAS POR CURSO Y FECHA
-- ========================================
-- Muestra el resumen de asistencia para cada curso en cada fecha

DROP VIEW IF EXISTS v_estadisticas_curso_fecha;

CREATE VIEW v_estadisticas_curso_fecha AS
SELECT 
  a.curso_id,
  a.curso_nombre,
  a.fecha,
  COUNT(*) AS total_estudiantes,
  SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) AS presentes,
  SUM(CASE WHEN a.estado = 'ausente' THEN 1 ELSE 0 END) AS ausentes,
  SUM(CASE WHEN a.estado = 'tardanza' THEN 1 ELSE 0 END) AS tardanzas,
  ROUND(
    (SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) * 100.0) / COUNT(*),
    2
  ) AS porcentaje_asistencia
FROM asistencias a
WHERE a.curso_id IS NOT NULL
GROUP BY a.curso_id, a.curso_nombre, a.fecha;

-- ========================================
-- 6. FUNCIÓN PARA VALIDAR DÍA DEL CURSO
-- ========================================
-- Verifica si una fecha específica corresponde a un día de clase del curso

USE instenglish_classes;

DROP FUNCTION IF EXISTS fn_es_dia_valido_curso;

DELIMITER $$
CREATE FUNCTION fn_es_dia_valido_curso(
  p_curso_id INT,
  p_fecha DATE
) RETURNS BOOLEAN
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_dia_semana TINYINT;
  DECLARE v_count INT;
  
  -- Obtener el día de la semana de la fecha (1=Lunes, 7=Domingo)
  -- En MySQL, DAYOFWEEK retorna 1=Domingo, 2=Lunes, etc.
  -- Necesitamos convertir a 1=Lunes
  SET v_dia_semana = CASE DAYOFWEEK(p_fecha)
    WHEN 1 THEN 7  -- Domingo
    WHEN 2 THEN 1  -- Lunes
    WHEN 3 THEN 2  -- Martes
    WHEN 4 THEN 3  -- Miércoles
    WHEN 5 THEN 4  -- Jueves
    WHEN 6 THEN 5  -- Viernes
    WHEN 7 THEN 6  -- Sábado
  END;
  
  -- Verificar si existe un horario activo para ese curso en ese día
  SELECT COUNT(*) INTO v_count
  FROM horarios_curso
  WHERE curso_id = p_curso_id
    AND dia_semana = v_dia_semana
    AND activo = TRUE;
  
  RETURN v_count > 0;
END$$
DELIMITER ;

-- ========================================
-- 7. STORED PROCEDURE PARA OBTENER HORARIOS DE UN CURSO
-- ========================================

USE instenglish_classes;

DROP PROCEDURE IF EXISTS sp_obtener_horarios_curso;

DELIMITER $$
CREATE PROCEDURE sp_obtener_horarios_curso(
  IN p_curso_id INT
)
BEGIN
  SELECT 
    id,
    curso_id,
    curso_nombre,
    dia_semana,
    CASE dia_semana
      WHEN 1 THEN 'Lunes'
      WHEN 2 THEN 'Martes'
      WHEN 3 THEN 'Miércoles'
      WHEN 4 THEN 'Jueves'
      WHEN 5 THEN 'Viernes'
      WHEN 6 THEN 'Sábado'
      WHEN 7 THEN 'Domingo'
    END AS nombre_dia,
    hora_inicio,
    hora_fin,
    activo,
    fecha_creacion,
    fecha_modificacion
  FROM horarios_curso
  WHERE curso_id = p_curso_id
  ORDER BY dia_semana;
END$$
DELIMITER ;

-- ========================================
-- 8. STORED PROCEDURE PARA AGREGAR HORARIO A CURSO
-- ========================================

DROP PROCEDURE IF EXISTS sp_agregar_horario_curso;

DELIMITER $$
CREATE PROCEDURE sp_agregar_horario_curso(
  IN p_curso_id INT,
  IN p_curso_nombre VARCHAR(100),
  IN p_dia_semana TINYINT,
  IN p_hora_inicio TIME,
  IN p_hora_fin TIME
)
BEGIN
  -- Validar día de semana (1-7)
  IF p_dia_semana < 1 OR p_dia_semana > 7 THEN
    SIGNAL SQLSTATE '45000' 
    SET MESSAGE_TEXT = 'El día de semana debe estar entre 1 (Lunes) y 7 (Domingo)';
  END IF;
  
  -- Insertar o actualizar el horario
  INSERT INTO horarios_curso (curso_id, curso_nombre, dia_semana, hora_inicio, hora_fin, activo)
  VALUES (p_curso_id, p_curso_nombre, p_dia_semana, p_hora_inicio, p_hora_fin, TRUE)
  ON DUPLICATE KEY UPDATE
    hora_inicio = p_hora_inicio,
    hora_fin = p_hora_fin,
    activo = TRUE,
    fecha_modificacion = CURRENT_TIMESTAMP;
    
  SELECT 'Horario agregado/actualizado correctamente' AS mensaje;
END$$
DELIMITER ;

-- ========================================
-- 9. DATOS DE EJEMPLO (OPCIONAL - COMENTADO)
-- ========================================
-- Descomenta estas líneas para agregar horarios de ejemplo

/*
-- Ejemplo: Inglés Básico I - Lunes, Miércoles, Viernes 8:00-10:00
INSERT INTO horarios_curso (curso_id, curso_nombre, dia_semana, hora_inicio, hora_fin, activo) 
VALUES 
  (1, 'Inglés Básico I', 1, '08:00:00', '10:00:00', TRUE),
  (1, 'Inglés Básico I', 3, '08:00:00', '10:00:00', TRUE),
  (1, 'Inglés Básico I', 5, '08:00:00', '10:00:00', TRUE);

-- Ejemplo: Inglés Intermedio - Martes y Jueves 14:00-16:00
INSERT INTO horarios_curso (curso_id, curso_nombre, dia_semana, hora_inicio, hora_fin, activo) 
VALUES 
  (2, 'Inglés Intermedio', 2, '14:00:00', '16:00:00', TRUE),
  (2, 'Inglés Intermedio', 4, '14:00:00', '16:00:00', TRUE);
*/

-- ========================================
-- VERIFICACIÓN
-- ========================================

SELECT '✅ Script de mejoras de cursos y horarios ejecutado correctamente' AS resultado;

SELECT 'Tablas creadas:' AS info;
SHOW TABLES LIKE 'horarios_curso';

SELECT 'Vistas creadas en instenglish_attendance:' AS info;
USE instenglish_attendance;
SHOW FULL TABLES WHERE Table_type = 'VIEW';

SELECT 'Funciones y procedimientos creados en instenglish_classes:' AS info;
USE instenglish_classes;
SHOW FUNCTION STATUS WHERE Db = 'instenglish_classes';
SHOW PROCEDURE STATUS WHERE Db = 'instenglish_classes';
