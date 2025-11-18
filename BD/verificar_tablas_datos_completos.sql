-- =====================================================
-- VERIFICAR Y CREAR TABLAS BASICAS PARA DATOS COMPLETOS
-- =====================================================

USE instenglish_auth;

-- Verificar tablas existentes
SHOW TABLES;

-- Crear tabla estudiante_datos si no existe
CREATE TABLE IF NOT EXISTS estudiante_datos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL UNIQUE,
    matricula VARCHAR(50) NULL COMMENT 'Numero de matricula',
    grado VARCHAR(100) NULL COMMENT 'Grado o nivel',
    seccion VARCHAR(50) NULL COMMENT 'Seccion',
    turno ENUM('manana', 'tarde', 'noche') NULL COMMENT 'Turno de estudio',
    modalidad ENUM('presencial', 'virtual', 'hibrido') DEFAULT 'presencial' COMMENT 'Modalidad de estudio',
    condicion_academica ENUM('regular', 'irregular', 'retirado', 'egresado') DEFAULT 'regular' COMMENT 'Condicion del estudiante',
    becado BOOLEAN DEFAULT FALSE COMMENT 'Si tiene beca',
    tipo_beca VARCHAR(100) NULL COMMENT 'Tipo de beca si aplica',
    porcentaje_beca DECIMAL(5,2) NULL COMMENT 'Porcentaje de beca',
    tutor_nombre VARCHAR(255) NULL COMMENT 'Nombre del tutor',
    tutor_telefono VARCHAR(50) NULL COMMENT 'Telefono del tutor',
    tutor_email VARCHAR(255) NULL COMMENT 'Email del tutor',
    observaciones TEXT NULL COMMENT 'Observaciones generales',
    fecha_ingreso DATE NULL COMMENT 'Fecha de ingreso',
    tutor_asignado_id INT NULL COMMENT 'ID del docente tutor',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (tutor_asignado_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Datos extendidos de estudiantes';

-- Crear tabla docente_datos si no existe
CREATE TABLE IF NOT EXISTS docente_datos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL UNIQUE,
    especialidad VARCHAR(255) NULL COMMENT 'Especialidad del docente',
    nivel_academico VARCHAR(255) NULL COMMENT 'Nivel academico',
    titulo_profesional VARCHAR(255) NULL COMMENT 'Titulo profesional',
    universidad_egreso VARCHAR(255) NULL COMMENT 'Universidad de egreso',
    numero_colegiatura VARCHAR(50) NULL COMMENT 'Numero de colegiatura',
    carga_horaria_semanal INT NULL COMMENT 'Horas semanales de trabajo',
    fecha_ingreso DATE NULL COMMENT 'Fecha de ingreso a la institucion',
    areas_investigacion TEXT NULL COMMENT 'Areas de investigacion',
    publicaciones TEXT NULL COMMENT 'Publicaciones academicas',
    idiomas_domina VARCHAR(255) NULL COMMENT 'Idiomas que domina',
    nivel_ingles VARCHAR(50) NULL COMMENT 'Nivel de ingles',
    disponibilidad_horaria TEXT NULL COMMENT 'Horarios disponibles',
    observaciones TEXT NULL COMMENT 'Observaciones generales',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Datos extendidos de docentes';

-- Crear tabla admin_datos si no existe
CREATE TABLE IF NOT EXISTS admin_datos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL UNIQUE,
    cargo VARCHAR(255) NULL COMMENT 'Cargo del administrador',
    nivel_acceso ENUM('bajo', 'medio', 'alto', 'completo') DEFAULT 'bajo' COMMENT 'Nivel de acceso',
    area_responsabilidad VARCHAR(255) NULL COMMENT 'Area de responsabilidad',
    extension_telefonica VARCHAR(50) NULL COMMENT 'Extension telefonica',
    horario_atencion VARCHAR(255) NULL COMMENT 'Horario de atencion',
    ubicacion_oficina VARCHAR(255) NULL COMMENT 'Ubicacion de oficina',
    supervisor_id INT NULL COMMENT 'ID del supervisor',
    observaciones TEXT NULL COMMENT 'Observaciones generales',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (supervisor_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Datos extendidos de administradores';

-- Crear tabla estudiante_cursos si no existe
CREATE TABLE IF NOT EXISTS estudiante_cursos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estudiante_id INT NOT NULL,
    curso_nombre VARCHAR(255) NOT NULL COMMENT 'Nombre del curso',
    curso_codigo VARCHAR(50) NULL COMMENT 'Codigo del curso',
    ciclo_academico VARCHAR(50) NULL COMMENT 'Ciclo academico',
    nivel VARCHAR(100) NULL COMMENT 'Nivel del curso',
    nota_final DECIMAL(5,2) NULL COMMENT 'Nota final',
    estado ENUM('cursando', 'aprobado', 'reprobado', 'retirado') DEFAULT 'cursando' COMMENT 'Estado del curso',
    fecha_inicio DATE NULL COMMENT 'Fecha de inicio',
    fecha_fin DATE NULL COMMENT 'Fecha de finalizacion',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (estudiante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_estudiante (estudiante_id),
    INDEX idx_ciclo (ciclo_academico)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Cursos de estudiantes';

-- Crear tabla docente_cursos si no existe
CREATE TABLE IF NOT EXISTS docente_cursos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    docente_id INT NOT NULL,
    curso_nombre VARCHAR(255) NOT NULL COMMENT 'Nombre del curso',
    curso_codigo VARCHAR(50) NULL COMMENT 'Codigo del curso',
    ciclo_academico VARCHAR(50) NULL COMMENT 'Ciclo academico',
    nivel VARCHAR(100) NULL COMMENT 'Nivel del curso',
    numero_estudiantes INT DEFAULT 0 COMMENT 'Numero de estudiantes',
    horario VARCHAR(255) NULL COMMENT 'Horario del curso',
    fecha_inicio DATE NULL COMMENT 'Fecha de inicio',
    fecha_fin DATE NULL COMMENT 'Fecha de finalizacion',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (docente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_docente (docente_id),
    INDEX idx_ciclo (ciclo_academico)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Cursos dictados por docentes';

-- Crear tabla admin_modulos si no existe
CREATE TABLE IF NOT EXISTS admin_modulos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    modulo_nombre VARCHAR(255) NOT NULL COMMENT 'Nombre del modulo',
    modulo_codigo VARCHAR(50) NULL COMMENT 'Codigo del modulo',
    permisos TEXT NULL COMMENT 'Permisos del modulo (JSON)',
    activo BOOLEAN DEFAULT TRUE COMMENT 'Si el modulo esta activo',
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_admin (admin_id),
    INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Modulos asignados a administradores';

-- Verificar que las tablas se crearon
SELECT 'Tablas creadas exitosamente' AS mensaje;
SHOW TABLES LIKE '%_datos';
SHOW TABLES LIKE '%_cursos';
SHOW TABLES LIKE '%_modulos';
