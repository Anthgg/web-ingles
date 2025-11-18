-- ==================================================
-- Script corregido con PROCEDURE para agregar columnas si no existen
-- ==================================================

USE instenglish_auth;

-- Eliminar procedimiento si existe
DROP PROCEDURE IF EXISTS add_column_if_not_exists;

-- Crear procedimiento
DELIMITER $$
CREATE PROCEDURE add_column_if_not_exists(
    IN p_table_name VARCHAR(64),
    IN p_column_name VARCHAR(64),
    IN p_column_definition TEXT
)
BEGIN
    DECLARE col_exists INT;
    
    SELECT COUNT(*) INTO col_exists
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'instenglish_auth'
    AND TABLE_NAME = p_table_name
    AND COLUMN_NAME = p_column_name;
    
    IF col_exists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE `', p_table_name, '` ADD COLUMN `', p_column_name, '` ', p_column_definition);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$
DELIMITER ;

-- Aplicar campos a usuarios
CALL add_column_if_not_exists('usuarios', 'fecha_nacimiento', 'DATE NULL COMMENT "Fecha de nacimiento"');
CALL add_column_if_not_exists('usuarios', 'genero', 'ENUM("masculino", "femenino", "otro", "prefiero_no_decir") NULL');
CALL add_column_if_not_exists('usuarios', 'nacionalidad', 'VARCHAR(100) NULL');
CALL add_column_if_not_exists('usuarios', 'estado_civil', 'ENUM("soltero", "casado", "divorciado", "viudo", "otro") NULL');
CALL add_column_if_not_exists('usuarios', 'foto_perfil', 'VARCHAR(500) NULL');
CALL add_column_if_not_exists('usuarios', 'documento_identidad', 'VARCHAR(50) NULL');
CALL add_column_if_not_exists('usuarios', 'tipo_documento', 'ENUM("DNI", "CE", "pasaporte", "otro") DEFAULT "DNI"');
CALL add_column_if_not_exists('usuarios', 'fecha_creacion_cuenta', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
CALL add_column_if_not_exists('usuarios', 'ultima_actualizacion', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

-- Aplicar campos a estudiante_datos
CALL add_column_if_not_exists('estudiante_datos', 'tutor_asignado_id', 'INT NULL');
CALL add_column_if_not_exists('estudiante_datos', 'fecha_ingreso', 'DATE NULL');
CALL add_column_if_not_exists('estudiante_datos', 'turno', 'ENUM("manana", "tarde", "noche") NULL');
CALL add_column_if_not_exists('estudiante_datos', 'modalidad', 'ENUM("presencial", "virtual", "hibrido") DEFAULT "presencial"');
CALL add_column_if_not_exists('estudiante_datos', 'condicion_academica', 'ENUM("regular", "irregular", "retirado", "egresado") DEFAULT "regular"');
CALL add_column_if_not_exists('estudiante_datos', 'becado', 'BOOLEAN DEFAULT FALSE');
CALL add_column_if_not_exists('estudiante_datos', 'tipo_beca', 'VARCHAR(100) NULL');
CALL add_column_if_not_exists('estudiante_datos', 'porcentaje_beca', 'DECIMAL(5,2) NULL');
CALL add_column_if_not_exists('estudiante_datos', 'observaciones', 'TEXT NULL');

-- Aplicar campos a docente_datos
CALL add_column_if_not_exists('docente_datos', 'fecha_ingreso', 'DATE NULL');
CALL add_column_if_not_exists('docente_datos', 'carga_horaria_semanal', 'INT NULL');
CALL add_column_if_not_exists('docente_datos', 'titulo_profesional', 'VARCHAR(255) NULL');
CALL add_column_if_not_exists('docente_datos', 'universidad_egreso', 'VARCHAR(255) NULL');
CALL add_column_if_not_exists('docente_datos', 'numero_colegiatura', 'VARCHAR(50) NULL');
CALL add_column_if_not_exists('docente_datos', 'areas_investigacion', 'TEXT NULL');
CALL add_column_if_not_exists('docente_datos', 'publicaciones', 'TEXT NULL');
CALL add_column_if_not_exists('docente_datos', 'idiomas_domina', 'VARCHAR(255) NULL');
CALL add_column_if_not_exists('docente_datos', 'nivel_ingles', 'VARCHAR(50) NULL');
CALL add_column_if_not_exists('docente_datos', 'disponibilidad_horaria', 'TEXT NULL');
CALL add_column_if_not_exists('docente_datos', 'observaciones', 'TEXT NULL');

-- Aplicar campos a admin_datos
CALL add_column_if_not_exists('admin_datos', 'area_responsabilidad', 'VARCHAR(255) NULL');
CALL add_column_if_not_exists('admin_datos', 'supervisor_id', 'INT NULL');
CALL add_column_if_not_exists('admin_datos', 'extension_telefonica', 'VARCHAR(20) NULL');
CALL add_column_if_not_exists('admin_datos', 'horario_atencion', 'VARCHAR(255) NULL');
CALL add_column_if_not_exists('admin_datos', 'ubicacion_oficina', 'VARCHAR(255) NULL');

SELECT 'Campos adicionales agregados correctamente' AS Resultado;
