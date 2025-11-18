-- =====================================================
-- SCRIPT SIMPLIFICADO: Crear solo las tablas nuevas
-- Este script crea solo las tablas que aún no existen
-- =====================================================

USE instenglish_auth;

-- =====================================================
-- TABLAS DE ESTUDIANTES
-- =====================================================

CREATE TABLE IF NOT EXISTS estudiante_historial_academico (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estudiante_id INT NOT NULL,
    periodo_academico VARCHAR(50) NOT NULL COMMENT 'Ej: 2024-I, 2024-II',
    nivel_grado VARCHAR(100) NULL COMMENT 'Nivel o grado cursado',
    promedio DECIMAL(5,2) NULL COMMENT 'Promedio del periodo',
    creditos_aprobados INT DEFAULT 0 COMMENT 'Creditos aprobados',
    creditos_reprobados INT DEFAULT 0 COMMENT 'Creditos reprobados',
    asistencia_porcentaje DECIMAL(5,2) NULL COMMENT 'Porcentaje de asistencia',
    observaciones TEXT NULL COMMENT 'Observaciones del periodo',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (estudiante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_estudiante (estudiante_id),
    INDEX idx_periodo (periodo_academico)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Historial academico por periodos de estudiantes';

CREATE TABLE IF NOT EXISTS estudiante_certificaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estudiante_id INT NOT NULL,
    nombre_certificacion VARCHAR(255) NOT NULL COMMENT 'Nombre de la certificacion',
    institucion_emisora VARCHAR(255) NULL COMMENT 'Quien emite',
    fecha_obtencion DATE NULL COMMENT 'Fecha de obtencion',
    fecha_vencimiento DATE NULL COMMENT 'Fecha de vencimiento (si aplica)',
    nivel VARCHAR(100) NULL COMMENT 'Nivel de la certificacion',
    codigo_verificacion VARCHAR(100) NULL COMMENT 'Codigo de verificacion',
    archivo_certificado VARCHAR(500) NULL COMMENT 'URL del certificado',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (estudiante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_estudiante (estudiante_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Certificaciones y logros de estudiantes';

-- =====================================================
-- TABLAS DE DOCENTES
-- =====================================================

CREATE TABLE IF NOT EXISTS docente_formacion_academica (
    id INT AUTO_INCREMENT PRIMARY KEY,
    docente_id INT NOT NULL,
    grado_academico ENUM('bachiller', 'licenciado', 'magister', 'doctor', 'otro') NOT NULL COMMENT 'Grado obtenido',
    titulo VARCHAR(255) NOT NULL COMMENT 'Titulo obtenido',
    institucion VARCHAR(255) NOT NULL COMMENT 'Institucion educativa',
    pais VARCHAR(100) NULL COMMENT 'Pais',
    fecha_inicio DATE NULL COMMENT 'Fecha de inicio',
    fecha_fin DATE NULL COMMENT 'Fecha de finalizacion',
    en_curso BOOLEAN DEFAULT FALSE COMMENT 'Si aun esta estudiando',
    archivo_certificado VARCHAR(500) NULL COMMENT 'URL del certificado',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (docente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_docente (docente_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Formacion academica de docentes';

CREATE TABLE IF NOT EXISTS docente_experiencia_laboral (
    id INT AUTO_INCREMENT PRIMARY KEY,
    docente_id INT NOT NULL,
    institucion VARCHAR(255) NOT NULL COMMENT 'Nombre de la institucion',
    cargo VARCHAR(255) NOT NULL COMMENT 'Cargo desempenado',
    area VARCHAR(100) NULL COMMENT 'Area o departamento',
    descripcion_funciones TEXT NULL COMMENT 'Descripcion de funciones',
    fecha_inicio DATE NOT NULL COMMENT 'Fecha de inicio',
    fecha_fin DATE NULL COMMENT 'Fecha de fin (NULL si es actual)',
    actualmente_trabaja BOOLEAN DEFAULT FALSE COMMENT 'Trabajo actual',
    motivo_salida VARCHAR(255) NULL COMMENT 'Motivo de salida',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (docente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_docente (docente_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Experiencia laboral de docentes';

CREATE TABLE IF NOT EXISTS docente_capacitaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    docente_id INT NOT NULL,
    nombre_capacitacion VARCHAR(255) NOT NULL COMMENT 'Nombre del curso',
    institucion_organizadora VARCHAR(255) NULL COMMENT 'Quien organiza',
    tipo ENUM('curso', 'taller', 'seminario', 'diplomado', 'otro') NOT NULL COMMENT 'Tipo de capacitacion',
    duracion_horas INT NULL COMMENT 'Duracion en horas',
    fecha_inicio DATE NULL COMMENT 'Fecha de inicio',
    fecha_fin DATE NULL COMMENT 'Fecha de finalizacion',
    certificado_obtenido BOOLEAN DEFAULT FALSE COMMENT 'Si obtuvo certificado',
    archivo_certificado VARCHAR(500) NULL COMMENT 'URL del certificado',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (docente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_docente (docente_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Capacitaciones y actualizaciones docentes';

CREATE TABLE IF NOT EXISTS docente_evaluaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    docente_id INT NOT NULL,
    periodo_evaluacion VARCHAR(50) NOT NULL COMMENT 'Periodo evaluado',
    tipo_evaluacion ENUM('desempeno', 'estudiantes', 'pares', 'directiva') NOT NULL COMMENT 'Tipo de evaluacion',
    puntaje_obtenido DECIMAL(5,2) NULL COMMENT 'Puntaje obtenido',
    puntaje_maximo DECIMAL(5,2) NULL COMMENT 'Puntaje maximo',
    calificacion VARCHAR(50) NULL COMMENT 'Calificacion (excelente, bueno, etc)',
    fortalezas TEXT NULL COMMENT 'Fortalezas identificadas',
    areas_mejora TEXT NULL COMMENT 'Areas de mejora',
    comentarios TEXT NULL COMMENT 'Comentarios generales',
    evaluador_id INT NULL COMMENT 'ID del evaluador',
    fecha_evaluacion DATE NULL COMMENT 'Fecha de evaluacion',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (docente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (evaluador_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_docente (docente_id),
    INDEX idx_periodo (periodo_evaluacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Evaluaciones de desempeno docente';

-- =====================================================
-- TABLAS DE ADMINISTRADORES
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_responsabilidades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    nombre_responsabilidad VARCHAR(255) NOT NULL COMMENT 'Nombre de la responsabilidad',
    descripcion TEXT NULL COMMENT 'Descripcion detallada',
    fecha_asignacion DATE NOT NULL COMMENT 'Fecha de asignacion',
    fecha_fin DATE NULL COMMENT 'Fecha de finalizacion (NULL si vigente)',
    activa BOOLEAN DEFAULT TRUE COMMENT 'Si esta activa',
    prioridad ENUM('baja', 'media', 'alta', 'critica') DEFAULT 'media' COMMENT 'Nivel de prioridad',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_admin (admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Responsabilidades especificas de administradores';

-- =====================================================
-- TABLAS GENERALES (TODOS LOS USUARIOS)
-- =====================================================

CREATE TABLE IF NOT EXISTS usuarios_documentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    tipo_documento ENUM('dni', 'certificado_estudios', 'certificado_trabajo', 'carta_recomendacion', 'contrato', 'cv', 'otro') NOT NULL COMMENT 'Tipo de documento',
    nombre_documento VARCHAR(255) NOT NULL COMMENT 'Nombre del documento',
    descripcion TEXT NULL COMMENT 'Descripcion del documento',
    archivo_url VARCHAR(500) NOT NULL COMMENT 'URL del archivo',
    tamano_bytes BIGINT NULL COMMENT 'Tamano del archivo en bytes',
    formato VARCHAR(20) NULL COMMENT 'Formato del archivo (pdf, jpg, etc)',
    es_publico BOOLEAN DEFAULT FALSE COMMENT 'Si es visible publicamente',
    verificado BOOLEAN DEFAULT FALSE COMMENT 'Si fue verificado',
    fecha_verificacion TIMESTAMP NULL COMMENT 'Fecha de verificacion',
    verificado_por INT NULL COMMENT 'ID de quien verifico',
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de carga',
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (verificado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_usuario (usuario_id),
    INDEX idx_tipo (tipo_documento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Documentos adjuntos de usuarios';

CREATE TABLE IF NOT EXISTS usuarios_notificaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    tipo ENUM('info', 'aviso', 'alerta', 'urgente') DEFAULT 'info' COMMENT 'Tipo de notificacion',
    titulo VARCHAR(255) NOT NULL COMMENT 'Titulo de la notificacion',
    mensaje TEXT NOT NULL COMMENT 'Contenido',
    enlace VARCHAR(500) NULL COMMENT 'URL relacionada',
    leida BOOLEAN DEFAULT FALSE COMMENT 'Si fue leida',
    fecha_lectura TIMESTAMP NULL COMMENT 'Cuando se leyo',
    importante BOOLEAN DEFAULT FALSE COMMENT 'Si es importante',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creacion',
    fecha_expiracion TIMESTAMP NULL COMMENT 'Fecha de expiracion',
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario (usuario_id),
    INDEX idx_leida (leida),
    INDEX idx_fecha (fecha_creacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Notificaciones del sistema para usuarios';

CREATE TABLE IF NOT EXISTS usuarios_preferencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL UNIQUE,
    tema ENUM('claro', 'oscuro', 'auto') DEFAULT 'auto' COMMENT 'Tema de la interfaz',
    idioma VARCHAR(10) DEFAULT 'es' COMMENT 'Idioma preferido',
    zona_horaria VARCHAR(50) DEFAULT 'America/Lima' COMMENT 'Zona horaria',
    notificaciones_email BOOLEAN DEFAULT TRUE COMMENT 'Recibir emails',
    notificaciones_push BOOLEAN DEFAULT TRUE COMMENT 'Notificaciones push',
    notificaciones_sms BOOLEAN DEFAULT FALSE COMMENT 'Notificaciones SMS',
    privacidad_perfil ENUM('publico', 'privado', 'solo_institucion') DEFAULT 'solo_institucion' COMMENT 'Privacidad del perfil',
    mostrar_email BOOLEAN DEFAULT FALSE COMMENT 'Mostrar email publicamente',
    mostrar_telefono BOOLEAN DEFAULT FALSE COMMENT 'Mostrar telefono',
    configuracion_adicional JSON NULL COMMENT 'Configuraciones extra en JSON',
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Preferencias y configuracion de usuarios';

-- =====================================================
-- DATOS DE EJEMPLO
-- =====================================================

-- Historial académico de estudiantes
INSERT IGNORE INTO estudiante_historial_academico (estudiante_id, periodo_academico, nivel_grado, promedio, creditos_aprobados, asistencia_porcentaje) VALUES
(4, '2024-I', 'Básico 1', 16.5, 18, 95.0),
(4, '2024-II', 'Básico 2', 17.0, 18, 92.5),
(5, '2024-I', 'Intermedio 1', 15.8, 18, 88.0),
(10, '2024-I', 'Avanzado 1', 18.2, 18, 98.0);

-- Certificaciones de estudiantes
INSERT IGNORE INTO estudiante_certificaciones (estudiante_id, nombre_certificacion, institucion_emisora, fecha_obtencion, nivel) VALUES
(4, 'Cambridge English: First (FCE)', 'Cambridge Assessment', '2024-06-15', 'B2'),
(10, 'TOEFL iBT', 'ETS', '2024-08-20', '105 puntos');

-- Formación académica de docentes
INSERT IGNORE INTO docente_formacion_academica (docente_id, grado_academico, titulo, institucion, pais, fecha_inicio, fecha_fin) VALUES
(6, 'licenciado', 'Licenciado en Educación - Inglés', 'Universidad Nacional Mayor de San Marcos', 'Perú', '2015-03-01', '2019-12-20'),
(6, 'magister', 'Maestría en Enseñanza del Idioma Inglés', 'Universidad Peruana Cayetano Heredia', 'Perú', '2020-03-01', '2022-12-15'),
(8, 'licenciado', 'Licenciado en Lingüística', 'Pontificia Universidad Católica del Perú', 'Perú', '2012-03-01', '2016-12-20');

-- Experiencia laboral docente
INSERT IGNORE INTO docente_experiencia_laboral (docente_id, institucion, cargo, area, fecha_inicio, fecha_fin, actualmente_trabaja) VALUES
(6, 'British Council Perú', 'Docente de Inglés', 'Enseñanza', '2020-01-15', '2023-12-31', FALSE),
(6, 'Instituto GoEnglish', 'Docente Senior', 'Enseñanza', '2024-01-01', NULL, TRUE),
(8, 'Wall Street English', 'Instructor de Inglés', 'Enseñanza', '2017-06-01', '2023-08-31', FALSE);

-- Capacitaciones docentes
INSERT IGNORE INTO docente_capacitaciones (docente_id, nombre_capacitacion, institucion_organizadora, tipo, duracion_horas, fecha_inicio, fecha_fin, certificado_obtenido) VALUES
(6, 'Teaching English Online', 'Cambridge Assessment', 'curso', 40, '2023-03-01', '2023-04-30', TRUE),
(6, 'CELTA (Certificate in English Language Teaching to Adults)', 'Cambridge University', 'diplomado', 120, '2019-07-01', '2019-09-30', TRUE),
(8, 'Metodologías Activas en la Enseñanza del Inglés', 'British Council', 'taller', 24, '2023-06-15', '2023-06-30', TRUE);

-- Preferencias de usuarios de ejemplo
INSERT IGNORE INTO usuarios_preferencias (usuario_id, tema, idioma, notificaciones_email, privacidad_perfil) VALUES
(4, 'auto', 'es', TRUE, 'solo_institucion'),
(6, 'claro', 'es', TRUE, 'solo_institucion'),
(8, 'oscuro', 'en', TRUE, 'privado'),
(11, 'claro', 'es', TRUE, 'publico');

SELECT '✅ Script ejecutado correctamente. Tablas creadas e datos de ejemplo insertados.' AS Resultado;
