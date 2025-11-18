-- Script para agregar códigos modulares únicos a usuarios
-- Autor: Sistema GoEnglish
-- Fecha: 2025-11-07
-- Descripción: Agrega columnas para códigos modulares únicos por tipo de usuario

USE instenglish_auth;

-- Verificar y agregar columnas para códigos modulares
-- Agregar codigo_estudiante si no existe
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'instenglish_auth' 
  AND TABLE_NAME = 'usuarios' 
  AND COLUMN_NAME = 'codigo_estudiante';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE usuarios ADD COLUMN codigo_estudiante VARCHAR(20) UNIQUE DEFAULT NULL COMMENT "Código único para estudiantes (EST-XXXX)"',
    'SELECT "La columna codigo_estudiante ya existe" AS resultado');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar codigo_docente si no existe
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'instenglish_auth' 
  AND TABLE_NAME = 'usuarios' 
  AND COLUMN_NAME = 'codigo_docente';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE usuarios ADD COLUMN codigo_docente VARCHAR(20) UNIQUE DEFAULT NULL COMMENT "Código único para docentes (DOC-XXXX)"',
    'SELECT "La columna codigo_docente ya existe" AS resultado');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar codigo_admin si no existe
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'instenglish_auth' 
  AND TABLE_NAME = 'usuarios' 
  AND COLUMN_NAME = 'codigo_admin';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE usuarios ADD COLUMN codigo_admin VARCHAR(20) UNIQUE DEFAULT NULL COMMENT "Código único para administradores (ADM-XXXX)"',
    'SELECT "La columna codigo_admin ya existe" AS resultado');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Crear índices para mejorar búsquedas
SET @idx_exists = 0;
SELECT COUNT(*) INTO @idx_exists 
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = 'instenglish_auth' 
  AND TABLE_NAME = 'usuarios' 
  AND INDEX_NAME = 'idx_codigo_estudiante';

SET @sql = IF(@idx_exists = 0, 
    'CREATE INDEX idx_codigo_estudiante ON usuarios(codigo_estudiante)',
    'SELECT "El índice idx_codigo_estudiante ya existe" AS resultado');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = 0;
SELECT COUNT(*) INTO @idx_exists 
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = 'instenglish_auth' 
  AND TABLE_NAME = 'usuarios' 
  AND INDEX_NAME = 'idx_codigo_docente';

SET @sql = IF(@idx_exists = 0, 
    'CREATE INDEX idx_codigo_docente ON usuarios(codigo_docente)',
    'SELECT "El índice idx_codigo_docente ya existe" AS resultado');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = 0;
SELECT COUNT(*) INTO @idx_exists 
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = 'instenglish_auth' 
  AND TABLE_NAME = 'usuarios' 
  AND INDEX_NAME = 'idx_codigo_admin';

SET @sql = IF(@idx_exists = 0, 
    'CREATE INDEX idx_codigo_admin ON usuarios(codigo_admin)',
    'SELECT "El índice idx_codigo_admin ya existe" AS resultado');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Función auxiliar para generar códigos únicos
DELIMITER $$

DROP FUNCTION IF EXISTS generar_codigo_unico$$
CREATE FUNCTION generar_codigo_unico(prefijo VARCHAR(10), ultimo_numero INT)
RETURNS VARCHAR(20)
DETERMINISTIC
BEGIN
    DECLARE nuevo_codigo VARCHAR(20);
    DECLARE numero_formateado VARCHAR(10);
    
    -- Formatear número con ceros a la izquierda (4 dígitos)
    SET numero_formateado = LPAD(ultimo_numero + 1, 4, '0');
    SET nuevo_codigo = CONCAT(prefijo, '-', numero_formateado);
    
    RETURN nuevo_codigo;
END$$

DELIMITER ;

-- Procedimiento para asignar códigos a usuarios existentes
DELIMITER $$

DROP PROCEDURE IF EXISTS asignar_codigos_usuarios$$
CREATE PROCEDURE asignar_codigos_usuarios()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE user_id INT;
    DECLARE user_rol VARCHAR(50);
    DECLARE contador_estudiante INT DEFAULT 0;
    DECLARE contador_docente INT DEFAULT 0;
    DECLARE contador_admin INT DEFAULT 0;
    
    -- Cursor para recorrer usuarios
    DECLARE cur CURSOR FOR 
        SELECT id, rol FROM usuarios 
        WHERE (rol = 'estudiante' AND codigo_estudiante IS NULL)
           OR (rol IN ('profesor', 'docente') AND codigo_docente IS NULL)
           OR (rol IN ('admin', 'administrativo') AND codigo_admin IS NULL)
        ORDER BY id;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Obtener el último número usado para cada tipo
    SELECT COALESCE(MAX(CAST(SUBSTRING(codigo_estudiante, 5) AS UNSIGNED)), 0) 
    INTO contador_estudiante
    FROM usuarios 
    WHERE codigo_estudiante IS NOT NULL;
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(codigo_docente, 5) AS UNSIGNED)), 0)
    INTO contador_docente
    FROM usuarios 
    WHERE codigo_docente IS NOT NULL;
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(codigo_admin, 5) AS UNSIGNED)), 0)
    INTO contador_admin
    FROM usuarios 
    WHERE codigo_admin IS NOT NULL;
    
    OPEN cur;
    
    read_loop: LOOP
        FETCH cur INTO user_id, user_rol;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Asignar código según el rol
        CASE 
            WHEN user_rol = 'estudiante' THEN
                SET contador_estudiante = contador_estudiante + 1;
                UPDATE usuarios 
                SET codigo_estudiante = generar_codigo_unico('EST', contador_estudiante - 1)
                WHERE id = user_id;
                
            WHEN user_rol IN ('profesor', 'docente') THEN
                SET contador_docente = contador_docente + 1;
                UPDATE usuarios 
                SET codigo_docente = generar_codigo_unico('DOC', contador_docente - 1)
                WHERE id = user_id;
                
            WHEN user_rol IN ('admin', 'administrativo') THEN
                SET contador_admin = contador_admin + 1;
                UPDATE usuarios 
                SET codigo_admin = generar_codigo_unico('ADM', contador_admin - 1)
                WHERE id = user_id;
        END CASE;
    END LOOP;
    
    CLOSE cur;
    
    -- Mostrar resumen
    SELECT 
        'Códigos asignados correctamente' AS Resultado,
        contador_estudiante AS Estudiantes,
        contador_docente AS Docentes,
        contador_admin AS Administradores;
END$$

DELIMITER ;

-- Trigger para asignar código automáticamente al crear un usuario
DELIMITER $$

DROP TRIGGER IF EXISTS before_insert_usuario_codigo$$
CREATE TRIGGER before_insert_usuario_codigo
BEFORE INSERT ON usuarios
FOR EACH ROW
BEGIN
    DECLARE ultimo_num INT DEFAULT 0;
    
    -- Asignar código según el rol
    CASE 
        WHEN NEW.rol = 'estudiante' THEN
            SELECT COALESCE(MAX(CAST(SUBSTRING(codigo_estudiante, 5) AS UNSIGNED)), 0)
            INTO ultimo_num
            FROM usuarios 
            WHERE codigo_estudiante IS NOT NULL;
            SET NEW.codigo_estudiante = generar_codigo_unico('EST', ultimo_num);
            
        WHEN NEW.rol IN ('profesor', 'docente') THEN
            SELECT COALESCE(MAX(CAST(SUBSTRING(codigo_docente, 5) AS UNSIGNED)), 0)
            INTO ultimo_num
            FROM usuarios 
            WHERE codigo_docente IS NOT NULL;
            SET NEW.codigo_docente = generar_codigo_unico('DOC', ultimo_num);
            
        WHEN NEW.rol IN ('admin', 'administrativo') THEN
            SELECT COALESCE(MAX(CAST(SUBSTRING(codigo_admin, 5) AS UNSIGNED)), 0)
            INTO ultimo_num
            FROM usuarios 
            WHERE codigo_admin IS NOT NULL;
            SET NEW.codigo_admin = generar_codigo_unico('ADM', ultimo_num);
    END CASE;
END$$

DELIMITER ;

-- Ejecutar el procedimiento para asignar códigos a usuarios existentes
CALL asignar_codigos_usuarios();

-- Verificar los resultados
SELECT 
    id,
    nombre,
    rol,
    codigo_estudiante,
    codigo_docente,
    codigo_admin,
    email
FROM usuarios
ORDER BY rol, id;

-- Mensaje de finalización
SELECT '✓ Script ejecutado correctamente. Códigos modulares agregados a todos los usuarios.' AS Estado;
