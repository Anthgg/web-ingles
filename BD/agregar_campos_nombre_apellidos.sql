-- =====================================================
-- Agregar campos de nombres y apellidos separados
-- =====================================================

USE instenglish_auth;

-- Procedimiento para agregar columnas si no existen
DROP PROCEDURE IF EXISTS add_column_if_not_exists_v2;

DELIMITER $$
CREATE PROCEDURE add_column_if_not_exists_v2(
    IN table_name VARCHAR(128),
    IN column_name VARCHAR(128),
    IN column_definition VARCHAR(255)
)
BEGIN
    DECLARE column_exists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO column_exists
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'instenglish_auth'
    AND TABLE_NAME = table_name
    AND COLUMN_NAME = column_name;
    
    IF column_exists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE ', table_name, ' ADD COLUMN ', column_name, ' ', column_definition);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        SELECT CONCAT('✓ Columna ', column_name, ' agregada a ', table_name) AS Resultado;
    ELSE
        SELECT CONCAT('⚠ Columna ', column_name, ' ya existe en ', table_name) AS Resultado;
    END IF;
END$$
DELIMITER ;

-- Agregar campos a tabla usuarios
CALL add_column_if_not_exists_v2('usuarios', 'nombres', 'VARCHAR(100) NULL COMMENT "Nombres del usuario"');
CALL add_column_if_not_exists_v2('usuarios', 'apellido_paterno', 'VARCHAR(100) NULL COMMENT "Apellido paterno"');
CALL add_column_if_not_exists_v2('usuarios', 'apellido_materno', 'VARCHAR(100) NULL COMMENT "Apellido materno"');
CALL add_column_if_not_exists_v2('usuarios', 'direccion', 'VARCHAR(255) NULL COMMENT "Dirección completa"');
CALL add_column_if_not_exists_v2('usuarios', 'distrito', 'VARCHAR(100) NULL COMMENT "Distrito"');
CALL add_column_if_not_exists_v2('usuarios', 'provincia', 'VARCHAR(100) NULL COMMENT "Provincia"');
CALL add_column_if_not_exists_v2('usuarios', 'departamento', 'VARCHAR(100) NULL COMMENT "Departamento"');
CALL add_column_if_not_exists_v2('usuarios', 'dni_verificado', 'BOOLEAN DEFAULT FALSE COMMENT "Si el DNI fue verificado con API"');
CALL add_column_if_not_exists_v2('usuarios', 'fecha_verificacion_dni', 'TIMESTAMP NULL COMMENT "Fecha de verificación del DNI"');

-- Limpiar procedimiento
DROP PROCEDURE IF EXISTS add_column_if_not_exists_v2;

SELECT '✅ Script ejecutado. Campos de nombres y apellidos agregados.' AS Resultado;
