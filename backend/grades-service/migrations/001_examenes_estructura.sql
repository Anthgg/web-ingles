-- =====================================================
-- MIGRACIÓN: Sistema de Exámenes por Nivel Educativo
-- Fecha: 2025-12-07
-- Base de datos: instenglish_grades
-- =====================================================

-- =====================================================
-- 1. MODIFICAR TABLA examenes
-- Agregar columnas para tipo de examen y estado
-- =====================================================

-- Agregar columna nivel_educativo
ALTER TABLE examenes 
ADD COLUMN IF NOT EXISTS nivel_educativo ENUM('Primaria', 'Secundaria', 'Inicial', 'Basico', 'Intermedio', 'Avanzado') 
DEFAULT NULL AFTER curso_nombre;

-- Agregar columna tipo_examen (BIMESTRAL para Primaria, TRIMESTRAL para Secundaria)
ALTER TABLE examenes 
ADD COLUMN IF NOT EXISTS tipo_examen ENUM('BIMESTRAL_1', 'BIMESTRAL_2', 'BIMESTRAL_3', 'BIMESTRAL_4', 'TRIMESTRAL_1', 'TRIMESTRAL_2', 'TRIMESTRAL_3', 'PARCIAL', 'FINAL', 'RECUPERACION', 'OTRO') 
DEFAULT 'OTRO' AFTER nivel_educativo;

-- Agregar columna estado_examen
ALTER TABLE examenes 
ADD COLUMN IF NOT EXISTS estado_examen ENUM('BORRADOR', 'ABIERTO', 'EN_EVALUACION', 'CERRADO', 'ANULADO') 
DEFAULT 'BORRADOR' AFTER tipo_examen;

-- Agregar columna para el periodo académico (año-periodo)
ALTER TABLE examenes 
ADD COLUMN IF NOT EXISTS periodo_academico VARCHAR(20) DEFAULT NULL AFTER estado_examen;

-- Agregar columna para fecha de cierre
ALTER TABLE examenes 
ADD COLUMN IF NOT EXISTS fecha_cierre DATETIME DEFAULT NULL AFTER fecha;

-- Agregar columna para porcentaje de peso del examen
ALTER TABLE examenes 
ADD COLUMN IF NOT EXISTS peso_porcentaje DECIMAL(5,2) DEFAULT 100.00 AFTER periodo_academico;

-- Agregar columna para observaciones generales
ALTER TABLE examenes 
ADD COLUMN IF NOT EXISTS observaciones TEXT DEFAULT NULL AFTER peso_porcentaje;

-- Agregar columna para usuario que cerró el examen
ALTER TABLE examenes 
ADD COLUMN IF NOT EXISTS cerrado_por INT DEFAULT NULL AFTER observaciones;

-- Agregar columna para fecha de cierre
ALTER TABLE examenes 
ADD COLUMN IF NOT EXISTS cerrado_at DATETIME DEFAULT NULL AFTER cerrado_por;

-- =====================================================
-- 2. MODIFICAR TABLA examen_calificaciones
-- Agregar campos adicionales para tracking
-- =====================================================

-- Agregar columna para observaciones por estudiante
ALTER TABLE examen_calificaciones 
ADD COLUMN IF NOT EXISTS observaciones TEXT DEFAULT NULL AFTER estado;

-- Agregar columna para indicar si es nota de recuperación
ALTER TABLE examen_calificaciones 
ADD COLUMN IF NOT EXISTS es_recuperacion TINYINT(1) DEFAULT 0 AFTER observaciones;

-- Agregar columna para nota anterior (si aplica recuperación)
ALTER TABLE examen_calificaciones 
ADD COLUMN IF NOT EXISTS nota_anterior DECIMAL(4,2) DEFAULT NULL AFTER es_recuperacion;

-- Agregar columna para el usuario que registró la nota
ALTER TABLE examen_calificaciones 
ADD COLUMN IF NOT EXISTS registrado_por INT DEFAULT NULL AFTER nota_anterior;

-- =====================================================
-- 3. CREAR TABLA configuracion_examenes_nivel
-- Define las reglas de tipos de examen por nivel
-- =====================================================

CREATE TABLE IF NOT EXISTS configuracion_examenes_nivel (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nivel_educativo ENUM('Primaria', 'Secundaria', 'Inicial', 'Basico', 'Intermedio', 'Avanzado') NOT NULL,
  tipos_permitidos JSON NOT NULL COMMENT 'Array de tipos de examen permitidos para este nivel',
  cantidad_periodos INT NOT NULL DEFAULT 4 COMMENT 'Cantidad de periodos (bimestres o trimestres)',
  descripcion VARCHAR(255) DEFAULT NULL,
  activo TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_nivel (nivel_educativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar configuraciones por defecto
INSERT IGNORE INTO configuracion_examenes_nivel (nivel_educativo, tipos_permitidos, cantidad_periodos, descripcion) VALUES
('Primaria', '["BIMESTRAL_1", "BIMESTRAL_2", "BIMESTRAL_3", "BIMESTRAL_4", "PARCIAL", "FINAL", "RECUPERACION", "OTRO"]', 4, 'Nivel Primaria: 4 bimestres'),
('Secundaria', '["TRIMESTRAL_1", "TRIMESTRAL_2", "TRIMESTRAL_3", "PARCIAL", "FINAL", "RECUPERACION", "OTRO"]', 3, 'Nivel Secundaria: 3 trimestres'),
('Inicial', '["BIMESTRAL_1", "BIMESTRAL_2", "BIMESTRAL_3", "BIMESTRAL_4", "OTRO"]', 4, 'Nivel Inicial: 4 bimestres'),
('Basico', '["BIMESTRAL_1", "BIMESTRAL_2", "BIMESTRAL_3", "BIMESTRAL_4", "PARCIAL", "FINAL", "RECUPERACION", "OTRO"]', 4, 'Nivel Básico: 4 bimestres'),
('Intermedio', '["TRIMESTRAL_1", "TRIMESTRAL_2", "TRIMESTRAL_3", "PARCIAL", "FINAL", "RECUPERACION", "OTRO"]', 3, 'Nivel Intermedio: 3 trimestres'),
('Avanzado', '["TRIMESTRAL_1", "TRIMESTRAL_2", "TRIMESTRAL_3", "PARCIAL", "FINAL", "RECUPERACION", "OTRO"]', 3, 'Nivel Avanzado: 3 trimestres');

-- =====================================================
-- 4. CREAR TABLA historial_examenes
-- Para auditoría de cambios en exámenes
-- =====================================================

CREATE TABLE IF NOT EXISTS historial_examenes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  examen_id INT NOT NULL,
  accion ENUM('CREADO', 'EDITADO', 'ABIERTO', 'CERRADO', 'ANULADO', 'NOTA_REGISTRADA', 'NOTA_EDITADA') NOT NULL,
  usuario_id INT NOT NULL,
  usuario_nombre VARCHAR(255) DEFAULT NULL,
  datos_anteriores JSON DEFAULT NULL,
  datos_nuevos JSON DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_examen_id (examen_id),
  INDEX idx_usuario_id (usuario_id),
  INDEX idx_accion (accion),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 5. CREAR TABLA periodos_academicos
-- Para gestionar los periodos académicos
-- =====================================================

CREATE TABLE IF NOT EXISTS periodos_academicos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE COMMENT 'Ej: 2025-B1, 2025-T2',
  anio INT NOT NULL,
  tipo ENUM('BIMESTRE', 'TRIMESTRE') NOT NULL,
  numero INT NOT NULL COMMENT '1, 2, 3, 4',
  nombre VARCHAR(100) NOT NULL COMMENT 'Ej: Primer Bimestre 2025',
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  activo TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_anio (anio),
  INDEX idx_tipo (tipo),
  INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar periodos académicos 2025
INSERT IGNORE INTO periodos_academicos (codigo, anio, tipo, numero, nombre, fecha_inicio, fecha_fin) VALUES
-- Bimestres 2025
('2025-B1', 2025, 'BIMESTRE', 1, 'Primer Bimestre 2025', '2025-03-01', '2025-05-15'),
('2025-B2', 2025, 'BIMESTRE', 2, 'Segundo Bimestre 2025', '2025-05-16', '2025-07-31'),
('2025-B3', 2025, 'BIMESTRE', 3, 'Tercer Bimestre 2025', '2025-08-15', '2025-10-31'),
('2025-B4', 2025, 'BIMESTRE', 4, 'Cuarto Bimestre 2025', '2025-11-01', '2025-12-20'),
-- Trimestres 2025
('2025-T1', 2025, 'TRIMESTRE', 1, 'Primer Trimestre 2025', '2025-03-01', '2025-06-15'),
('2025-T2', 2025, 'TRIMESTRE', 2, 'Segundo Trimestre 2025', '2025-06-16', '2025-09-30'),
('2025-T3', 2025, 'TRIMESTRE', 3, 'Tercer Trimestre 2025', '2025-10-01', '2025-12-20');

-- =====================================================
-- 6. ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- =====================================================

-- Índice para búsqueda por tipo de examen
CREATE INDEX IF NOT EXISTS idx_examenes_tipo ON examenes(tipo_examen);

-- Índice para búsqueda por estado
CREATE INDEX IF NOT EXISTS idx_examenes_estado ON examenes(estado_examen);

-- Índice para búsqueda por nivel educativo
CREATE INDEX IF NOT EXISTS idx_examenes_nivel ON examenes(nivel_educativo);

-- Índice para búsqueda por periodo
CREATE INDEX IF NOT EXISTS idx_examenes_periodo ON examenes(periodo_academico);

-- Índice compuesto para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_examenes_asig_estado ON examenes(asignacion_id, estado_examen);

-- =====================================================
-- 7. VISTA PARA RESUMEN DE EXÁMENES
-- =====================================================

CREATE OR REPLACE VIEW v_examenes_resumen AS
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
  e.cerrado_at,
  COUNT(DISTINCT ec.estudiante_id) AS total_calificados,
  AVG(ec.nota) AS promedio,
  MIN(ec.nota) AS nota_minima,
  MAX(ec.nota) AS nota_maxima,
  SUM(CASE WHEN ec.nota >= 11 THEN 1 ELSE 0 END) AS aprobados,
  SUM(CASE WHEN ec.nota < 11 AND ec.nota IS NOT NULL THEN 1 ELSE 0 END) AS reprobados
FROM examenes e
LEFT JOIN examen_calificaciones ec ON ec.examen_id = e.id
GROUP BY e.id;

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================
