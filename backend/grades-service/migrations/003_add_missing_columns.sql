-- =====================================================
-- MIGRACIÓN: Agregar columnas faltantes a examenes
-- Compatible con MySQL 8.0
-- =====================================================

-- Procedimiento para agregar columnas de forma segura
DELIMITER //

DROP PROCEDURE IF EXISTS agregar_columna_si_no_existe //
CREATE PROCEDURE agregar_columna_si_no_existe(
  IN tabla VARCHAR(64),
  IN columna VARCHAR(64),
  IN definicion VARCHAR(500)
)
BEGIN
  DECLARE columna_existe INT DEFAULT 0;
  
  SELECT COUNT(*) INTO columna_existe
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = tabla
    AND COLUMN_NAME = columna;
  
  IF columna_existe = 0 THEN
    SET @sql = CONCAT('ALTER TABLE `', tabla, '` ADD COLUMN `', columna, '` ', definicion);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //

DELIMITER ;

-- =====================================================
-- Agregar columnas faltantes a la tabla examenes
-- =====================================================
CALL agregar_columna_si_no_existe('examenes', 'fecha_cierre', 'DATETIME DEFAULT NULL AFTER fecha');
CALL agregar_columna_si_no_existe('examenes', 'nivel_educativo', 'VARCHAR(50) DEFAULT NULL AFTER fecha_cierre');
CALL agregar_columna_si_no_existe('examenes', 'tipo_examen', "VARCHAR(50) DEFAULT 'OTRO' AFTER nivel_educativo");
CALL agregar_columna_si_no_existe('examenes', 'estado_examen', "VARCHAR(20) DEFAULT 'BORRADOR' AFTER tipo_examen");
CALL agregar_columna_si_no_existe('examenes', 'periodo_academico', 'VARCHAR(20) DEFAULT NULL AFTER estado_examen');
CALL agregar_columna_si_no_existe('examenes', 'peso_porcentaje', 'DECIMAL(5,2) DEFAULT 100.00 AFTER periodo_academico');
CALL agregar_columna_si_no_existe('examenes', 'observaciones', 'TEXT DEFAULT NULL AFTER peso_porcentaje');
CALL agregar_columna_si_no_existe('examenes', 'cerrado_por', 'INT DEFAULT NULL AFTER observaciones');
CALL agregar_columna_si_no_existe('examenes', 'cerrado_at', 'DATETIME DEFAULT NULL AFTER cerrado_por');

-- =====================================================
-- Crear índices si no existen
-- =====================================================
DROP PROCEDURE IF EXISTS agregar_indice_si_no_existe;
DELIMITER //
CREATE PROCEDURE agregar_indice_si_no_existe(
  IN tabla VARCHAR(64),
  IN nombre_indice VARCHAR(64),
  IN columnas VARCHAR(200)
)
BEGIN
  DECLARE indice_existe INT DEFAULT 0;
  
  SELECT COUNT(*) INTO indice_existe
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = tabla
    AND INDEX_NAME = nombre_indice;
  
  IF indice_existe = 0 THEN
    SET @sql = CONCAT('ALTER TABLE `', tabla, '` ADD INDEX `', nombre_indice, '` (', columnas, ')');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

CALL agregar_indice_si_no_existe('examenes', 'idx_examenes_tipo', 'tipo_examen');
CALL agregar_indice_si_no_existe('examenes', 'idx_examenes_estado', 'estado_examen');
CALL agregar_indice_si_no_existe('examenes', 'idx_examenes_nivel', 'nivel_educativo');
CALL agregar_indice_si_no_existe('examenes', 'idx_examenes_periodo', 'periodo_academico');

-- =====================================================
-- Crear tabla examen_calificaciones si no existe
-- =====================================================
CREATE TABLE IF NOT EXISTS examen_calificaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  examen_id INT NOT NULL,
  estudiante_id INT NOT NULL,
  nota DECIMAL(4,2) DEFAULT NULL,
  estado VARCHAR(20) DEFAULT NULL,
  observaciones TEXT DEFAULT NULL,
  es_recuperacion TINYINT(1) DEFAULT 0,
  nota_anterior DECIMAL(4,2) DEFAULT NULL,
  registrado_por INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_examen_id (examen_id),
  INDEX idx_estudiante_id (estudiante_id),
  UNIQUE KEY uk_examen_estudiante (examen_id, estudiante_id),
  FOREIGN KEY (examen_id) REFERENCES examenes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Crear tabla periodos_academicos si no existe
-- (La tabla ya existe con esquema INT AUTO_INCREMENT + codigo VARCHAR)
-- =====================================================
-- Ya no creamos la tabla porque existe con estructura diferente

-- =====================================================
-- Insertar periodos académicos 2025 (usando el esquema existente)
-- =====================================================
INSERT INTO periodos_academicos (codigo, anio, tipo, numero, nombre, fecha_inicio, fecha_fin) VALUES
-- Bimestres 2025
('2025-B1', 2025, 'BIMESTRE', 1, 'Primer Bimestre 2025', '2025-03-01', '2025-05-15'),
('2025-B2', 2025, 'BIMESTRE', 2, 'Segundo Bimestre 2025', '2025-05-16', '2025-08-14'),
('2025-B3', 2025, 'BIMESTRE', 3, 'Tercer Bimestre 2025', '2025-08-15', '2025-10-31'),
('2025-B4', 2025, 'BIMESTRE', 4, 'Cuarto Bimestre 2025', '2025-11-01', '2025-12-20'),
-- Trimestres 2025
('2025-T1', 2025, 'TRIMESTRE', 1, 'Primer Trimestre 2025', '2025-03-01', '2025-06-15'),
('2025-T2', 2025, 'TRIMESTRE', 2, 'Segundo Trimestre 2025', '2025-06-16', '2025-09-30'),
('2025-T3', 2025, 'TRIMESTRE', 3, 'Tercer Trimestre 2025', '2025-10-01', '2025-12-20')
ON DUPLICATE KEY UPDATE 
  nombre = VALUES(nombre),
  fecha_inicio = VALUES(fecha_inicio),
  fecha_fin = VALUES(fecha_fin);

-- =====================================================
-- Vista resumen de exámenes
-- =====================================================
DROP VIEW IF EXISTS v_examenes_resumen;
CREATE VIEW v_examenes_resumen AS
SELECT 
  e.id,
  e.nombre,
  e.descripcion,
  e.fecha,
  e.fecha_cierre,
  e.nivel_educativo,
  e.tipo_examen,
  e.estado_examen,
  e.periodo_academico,
  e.peso_porcentaje,
  e.asignacion_id,
  e.profesor_id,
  e.curso_nombre,
  e.created_at,
  e.updated_at,
  COUNT(DISTINCT c.id) AS total_calificaciones,
  COUNT(DISTINCT CASE WHEN c.nota IS NOT NULL THEN c.id END) AS calificaciones_registradas,
  AVG(c.nota) AS promedio_notas,
  MIN(c.nota) AS nota_minima,
  MAX(c.nota) AS nota_maxima
FROM examenes e
LEFT JOIN examen_calificaciones c ON e.id = c.examen_id
GROUP BY e.id;

-- =====================================================
-- Limpiar procedimientos temporales
-- =====================================================
DROP PROCEDURE IF EXISTS agregar_columna_si_no_existe;
DROP PROCEDURE IF EXISTS agregar_indice_si_no_existe;

SELECT 'Migración completada exitosamente' AS resultado;
