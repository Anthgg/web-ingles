-- =====================================================
-- SISTEMA COMPLETO DE DATOS DE USUARIOS
-- Incluye: Datos personales, academicos, laborales y del sistema
-- =====================================================

USE instenglish_auth;

-- =====================================================
-- 1. DATOS PERSONALES COMUNES (todos los usuarios)
-- =====================================================

-- Agregar campos a la tabla usuarios existente (ignorar si ya existen)
ALTER TABLE usuarios 
ADD COLUMN fecha_nacimiento DATE NULL COMMENT 'Fecha de nacimiento del usuario';

ALTER TABLE usuarios
ADD COLUMN genero ENUM('masculino', 'femenino', 'otro', 'prefiero_no_decir') NULL COMMENT 'Genero del usuario';

ALTER TABLE usuarios
ADD COLUMN nacionalidad VARCHAR(100) NULL COMMENT 'Nacionalidad';

ALTER TABLE usuarios
ADD COLUMN estado_civil ENUM('soltero', 'casado', 'divorciado', 'viudo', 'otro') NULL COMMENT 'Estado civil';

ALTER TABLE usuarios
ADD COLUMN foto_perfil VARCHAR(500) NULL COMMENT 'URL de la foto de perfil';

ALTER TABLE usuarios
ADD COLUMN documento_identidad VARCHAR(50) NULL COMMENT 'Numero de documento de identidad';

ALTER TABLE usuarios
ADD COLUMN tipo_documento ENUM('DNI', 'CE', 'pasaporte', 'otro') DEFAULT 'DNI' COMMENT 'Tipo de documento';

ALTER TABLE usuarios
ADD COLUMN fecha_creacion_cuenta TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creacion de la cuenta';

ALTER TABLE usuarios
ADD COLUMN ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Ultima actualizacion de datos';

-- =====================================================
-- 2. DATOS DEL SISTEMA Y SEGURIDAD
-- =====================================================

CREATE TABLE IF NOT EXISTS usuarios_sesiones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    token VARCHAR(500) NOT NULL COMMENT 'Token de sesion',
    dispositivo VARCHAR(255) NULL COMMENT 'Informacion del dispositivo',
    navegador VARCHAR(100) NULL COMMENT 'Navegador utilizado',
    sistema_operativo VARCHAR(100) NULL COMMENT 'Sistema operativo',
    direccion_ip VARCHAR(45) NULL COMMENT 'Direccion IP',
    ubicacion VARCHAR(255) NULL COMMENT 'Ubicacion geografica aproximada',
    fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Inicio de sesion',
    fecha_expiracion TIMESTAMP NULL COMMENT 'Expiracion del token',
    activa BOOLEAN DEFAULT TRUE COMMENT 'Sesion activa',
    fecha_cierre TIMESTAMP NULL COMMENT 'Cierre de sesion',
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario (usuario_id),
    INDEX idx_token (token),
    INDEX idx_activa (activa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Registro de sesiones activas y historial';

CREATE TABLE IF NOT EXISTS usuarios_actividad (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    accion VARCHAR(100) NOT NULL COMMENT 'Tipo de accion realizada',
    modulo VARCHAR(100) NULL COMMENT 'Modulo del sistema',
    descripcion TEXT NULL COMMENT 'Descripcion detallada',
    datos_adicionales JSON NULL COMMENT 'Datos extra en formato JSON',
    direccion_ip VARCHAR(45) NULL COMMENT 'IP desde donde se realizo',
    fecha_accion TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Momento de la accion',
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario (usuario_id),
    INDEX idx_fecha (fecha_accion),
    INDEX idx_accion (accion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Registro de actividad y auditoria del sistema';

CREATE TABLE IF NOT EXISTS usuarios_intentos_acceso (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL COMMENT 'Email del intento',
    exitoso BOOLEAN DEFAULT FALSE COMMENT 'Si el intento fue exitoso',
    razon_fallo VARCHAR(255) NULL COMMENT 'Motivo del fallo',
    direccion_ip VARCHAR(45) NULL COMMENT 'IP del intento',
    fecha_intento TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha del intento',
    INDEX idx_email (email),
    INDEX idx_fecha (fecha_intento),
    INDEX idx_exitoso (exitoso)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Registro de intentos de acceso para seguridad';

-- =====================================================
-- 3. CONTACTOS DE EMERGENCIA Y REFERENCIAS
-- =====================================================

CREATE TABLE IF NOT EXISTS usuarios_contactos_emergencia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL COMMENT 'Nombre del contacto',
    parentesco VARCHAR(100) NOT NULL COMMENT 'Relacion con el usuario',
    telefono_principal VARCHAR(20) NOT NULL COMMENT 'Telefono principal',
    telefono_secundario VARCHAR(20) NULL COMMENT 'Telefono alternativo',
    email VARCHAR(255) NULL COMMENT 'Email del contacto',
    direccion TEXT NULL COMMENT 'Direccion del contacto',
    es_principal BOOLEAN DEFAULT FALSE COMMENT 'Contacto principal',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Contactos de emergencia de usuarios';

-- =====================================================
-- 4. DATOS ACADEMICOS EXTENDIDOS (ESTUDIANTES)
-- =====================================================

-- Actualizar tabla estudiante_datos
ALTER TABLE estudiante_datos
ADD COLUMN tutor_asignado_id INT NULL COMMENT 'ID del docente tutor';

ALTER TABLE estudiante_datos
ADD COLUMN fecha_ingreso DATE NULL COMMENT 'Fecha de ingreso al instituto';

ALTER TABLE estudiante_datos
ADD COLUMN turno ENUM('manana', 'tarde', 'noche') NULL COMMENT 'Turno de estudio';

ALTER TABLE estudiante_datos
ADD COLUMN modalidad ENUM('presencial', 'virtual', 'hibrido') DEFAULT 'presencial' COMMENT 'Modalidad de estudio';

ALTER TABLE estudiante_datos
ADD COLUMN condicion_academica ENUM('regular', 'irregular', 'retirado', 'egresado') DEFAULT 'regular' COMMENT 'Condicion del estudiante';

ALTER TABLE estudiante_datos
ADD COLUMN becado BOOLEAN DEFAULT FALSE COMMENT 'Si tiene beca';

ALTER TABLE estudiante_datos
ADD COLUMN tipo_beca VARCHAR(100) NULL COMMENT 'Tipo de beca si aplica';

ALTER TABLE estudiante_datos
ADD COLUMN porcentaje_beca DECIMAL(5,2) NULL COMMENT 'Porcentaje de beca';

ALTER TABLE estudiante_datos
ADD COLUMN observaciones TEXT NULL COMMENT 'Observaciones generales';

ALTER TABLE estudiante_datos
ADD FOREIGN KEY (tutor_asignado_id) REFERENCES usuarios(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS estudiante_historial_academico (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estudiante_id INT NOT NULL,
    periodo_academico VARCHAR(50) NOT NULL COMMENT 'Ejemplo: 2024-I, 2024-II',
    nivel_grado VARCHAR(50) NOT NULL COMMENT 'Nivel o grado cursado',
    promedio_periodo DECIMAL(4,2) NULL COMMENT 'Promedio del periodo',
    creditos_aprobados INT DEFAULT 0 COMMENT 'Creditos aprobados',
    creditos_reprobados INT DEFAULT 0 COMMENT 'Creditos reprobados',
    porcentaje_asistencia DECIMAL(5,2) NULL COMMENT 'Asistencia del periodo',
    observaciones TEXT NULL COMMENT 'Observaciones del periodo',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (estudiante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_estudiante (estudiante_id),
    INDEX idx_periodo (periodo_academico)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Historial academico por periodos';

CREATE TABLE IF NOT EXISTS estudiante_certificaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estudiante_id INT NOT NULL,
    nombre_certificacion VARCHAR(255) NOT NULL COMMENT 'Nombre del certificado',
    institucion_emisora VARCHAR(255) NULL COMMENT 'Quien emite',
    fecha_obtencion DATE NULL COMMENT 'Fecha de obtencion',
    fecha_vencimiento DATE NULL COMMENT 'Vigencia si aplica',
    nivel VARCHAR(100) NULL COMMENT 'Nivel del certificado',
    codigo_verificacion VARCHAR(100) NULL COMMENT 'Codigo de verificacion',
    archivo_url VARCHAR(500) NULL COMMENT 'URL del archivo',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (estudiante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_estudiante (estudiante_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Certificaciones y logros de estudiantes';

-- =====================================================
-- 5. DATOS LABORALES EXTENDIDOS (DOCENTES)
-- =====================================================

-- Actualizar tabla docente_datos
ALTER TABLE docente_datos
ADD COLUMN fecha_ingreso DATE NULL COMMENT 'Fecha de ingreso a la institucion';

ALTER TABLE docente_datos
ADD COLUMN carga_horaria_semanal INT NULL COMMENT 'Horas semanales de trabajo';

ALTER TABLE docente_datos
ADD COLUMN titulo_profesional VARCHAR(255) NULL COMMENT 'Titulo profesional';

ALTER TABLE docente_datos
ADD COLUMN universidad_egreso VARCHAR(255) NULL COMMENT 'Universidad de egreso';

ALTER TABLE docente_datos
ADD COLUMN numero_colegiatura VARCHAR(50) NULL COMMENT 'Numero de colegiatura';

ALTER TABLE docente_datos
ADD COLUMN areas_investigacion TEXT NULL COMMENT 'Areas de investigacion';

ALTER TABLE docente_datos
ADD COLUMN publicaciones TEXT NULL COMMENT 'Publicaciones academicas';

ALTER TABLE docente_datos
ADD COLUMN idiomas_domina VARCHAR(255) NULL COMMENT 'Idiomas que domina';

ALTER TABLE docente_datos
ADD COLUMN nivel_ingles VARCHAR(50) NULL COMMENT 'Nivel de ingles';

ALTER TABLE docente_datos
ADD COLUMN disponibilidad_horaria TEXT NULL COMMENT 'Horarios disponibles';

ALTER TABLE docente_datos
ADD COLUMN observaciones TEXT NULL COMMENT 'Observaciones generales';

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
-- 6. DATOS ADMINISTRATIVOS EXTENDIDOS
-- =====================================================

-- Actualizar tabla admin_datos
ALTER TABLE admin_datos
ADD COLUMN area_responsabilidad VARCHAR(255) NULL COMMENT 'Area de responsabilidad';

ALTER TABLE admin_datos
ADD COLUMN supervisor_id INT NULL COMMENT 'ID del supervisor';

ALTER TABLE admin_datos
ADD COLUMN extension_telefonica VARCHAR(20) NULL COMMENT 'Extension telefonica';

ALTER TABLE admin_datos
ADD COLUMN horario_atencion VARCHAR(255) NULL COMMENT 'Horario de atencion';

ALTER TABLE admin_datos
ADD COLUMN ubicacion_oficina VARCHAR(255) NULL COMMENT 'Ubicacion de oficina';

ALTER TABLE admin_datos
ADD FOREIGN KEY (supervisor_id) REFERENCES usuarios(id) ON DELETE SET NULL;

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
-- 7. DOCUMENTOS Y ARCHIVOS
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

-- =====================================================
-- 8. NOTIFICACIONES Y COMUNICACIONES
-- =====================================================

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

-- =====================================================
-- 9. PREFERENCIAS Y CONFIGURACION
-- =====================================================

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
-- 10. VISTAS PARA CONSULTAS RAPIDAS
-- =====================================================

-- Vista completa de estudiantes
CREATE OR REPLACE VIEW vista_estudiantes_completa AS
SELECT 
    u.id,
    u.nombre,
    u.email,
    u.telefono,
    u.direccion,
    u.fecha_nacimiento,
    u.genero,
    u.documento_identidad,
    u.tipo_documento,
    u.activo,
    u.fecha_creacion,
    u.codigo_estudiante,
    ed.matricula,
    ed.grado,
    ed.seccion,
    ed.promedio_general,
    ed.porcentaje_asistencia,
    ed.estado_academico,
    ed.tutor_asignado_id,
    ed.turno,
    ed.modalidad,
    ed.condicion_academica,
    ed.becado,
    ed.tipo_beca,
    ed.porcentaje_beca,
    tutor.nombre AS tutor_nombre
FROM usuarios u
LEFT JOIN estudiante_datos ed ON u.id = ed.estudiante_id
LEFT JOIN usuarios tutor ON ed.tutor_asignado_id = tutor.id
WHERE u.rol = 'estudiante';

-- Vista completa de docentes
CREATE OR REPLACE VIEW vista_docentes_completa AS
SELECT 
    u.id,
    u.nombre,
    u.email,
    u.telefono,
    u.direccion,
    u.fecha_nacimiento,
    u.genero,
    u.documento_identidad,
    u.activo,
    u.fecha_creacion,
    u.codigo_docente,
    dd.especialidad,
    dd.nivel_academico,
    dd.anios_experiencia,
    dd.tipo_contrato,
    dd.estado_laboral,
    dd.horario_entrada,
    dd.horario_salida,
    dd.fecha_ingreso,
    dd.carga_horaria_semanal,
    dd.titulo_profesional,
    dd.universidad_egreso,
    dd.numero_colegiatura,
    dd.nivel_ingles
FROM usuarios u
LEFT JOIN docente_datos dd ON u.id = dd.docente_id
WHERE u.rol IN ('docente', 'profesor');

-- Vista completa de administradores
CREATE OR REPLACE VIEW vista_administradores_completa AS
SELECT 
    u.id,
    u.nombre,
    u.email,
    u.telefono,
    u.direccion,
    u.activo,
    u.fecha_creacion,
    u.codigo_admin,
    ad.cargo,
    ad.departamento,
    ad.nivel_acceso,
    ad.fecha_nombramiento,
    ad.estado_admin,
    ad.area_responsabilidad,
    ad.supervisor_id,
    ad.extension_telefonica,
    ad.horario_atencion,
    supervisor.nombre AS supervisor_nombre
FROM usuarios u
LEFT JOIN admin_datos ad ON u.id = ad.admin_id
LEFT JOIN usuarios supervisor ON ad.supervisor_id = supervisor.id
WHERE u.rol IN ('admin', 'administrativo');

-- =====================================================
-- DATOS DE EJEMPLO ADICIONALES
-- =====================================================

-- Insertar datos de ejemplo para estudiantes
INSERT INTO estudiante_datos (estudiante_id, matricula, grado, seccion, promedio_general, porcentaje_asistencia, estado_academico, turno, modalidad, condicion_academica, becado, tipo_beca, porcentaje_beca)
VALUES 
(1, 'EST2024001', 'Basico', 'A', 16.5, 95.0, 'Activo', 'manana', 'presencial', 'regular', TRUE, 'Merito academico', 50.00)
ON DUPLICATE KEY UPDATE
turno = 'manana', modalidad = 'presencial', condicion_academica = 'regular', becado = TRUE, tipo_beca = 'Merito academico', porcentaje_beca = 50.00;

-- Insertar historial academico de ejemplo
INSERT INTO estudiante_historial_academico (estudiante_id, periodo_academico, nivel_grado, promedio_periodo, creditos_aprobados, creditos_reprobados, porcentaje_asistencia, observaciones)
VALUES 
(1, '2024-I', 'Basico', 16.5, 18, 0, 95.0, 'Excelente desempeno academico'),
(1, '2024-II', 'Basico', 17.0, 20, 0, 96.5, 'Mejora continua en todas las areas');

-- Insertar datos de ejemplo para docentes
INSERT INTO docente_datos (docente_id, especialidad, nivel_academico, anios_experiencia, tipo_contrato, estado_laboral, horario_entrada, horario_salida, fecha_ingreso, carga_horaria_semanal, titulo_profesional, universidad_egreso, nivel_ingles)
VALUES 
(4, 'Ensenanza de Ingles', 'Magister', 8, 'Tiempo completo', 'Activo', '08:00', '17:00', '2020-03-01', 40, 'Licenciado en Educacion', 'Universidad Nacional Mayor de San Marcos', 'C2 - Proficient')
ON DUPLICATE KEY UPDATE
fecha_ingreso = '2020-03-01', carga_horaria_semanal = 40, titulo_profesional = 'Licenciado en Educacion', universidad_egreso = 'Universidad Nacional Mayor de San Marcos', nivel_ingles = 'C2 - Proficient';

-- Insertar formacion academica de ejemplo
INSERT INTO docente_formacion_academica (docente_id, grado_academico, titulo, institucion, pais, fecha_inicio, fecha_fin, archivo_certificado)
VALUES 
(4, 'licenciado', 'Licenciatura en Educacion - Ingles', 'Universidad Nacional Mayor de San Marcos', 'Peru', '2010-03-01', '2015-12-15', NULL),
(4, 'magister', 'Maestria en Didactica del Ingles', 'Pontificia Universidad Catolica del Peru', 'Peru', '2016-03-01', '2018-12-20', NULL);

-- Insertar experiencia laboral de ejemplo
INSERT INTO docente_experiencia_laboral (docente_id, institucion, cargo, area, descripcion_funciones, fecha_inicio, fecha_fin, actualmente_trabaja)
VALUES 
(4, 'Instituto de Idiomas ICPNA', 'Docente de Ingles', 'Departamento Academico', 'Ensenanza de ingles niveles basico a avanzado', '2015-03-01', '2020-02-28', FALSE),
(4, 'Instituto GoEnglish', 'Docente Senior', 'Departamento Academico', 'Ensenanza de ingles y coordinacion de programas', '2020-03-01', NULL, TRUE);

-- Insertar capacitaciones de ejemplo
INSERT INTO docente_capacitaciones (docente_id, nombre_capacitacion, institucion_organizadora, tipo, duracion_horas, fecha_inicio, fecha_fin, certificado_obtenido)
VALUES 
(4, 'Metodologias Activas en la Ensenanza de Idiomas', 'British Council', 'curso', 120, '2023-01-15', '2023-03-30', TRUE),
(4, 'Evaluacion por Competencias', 'Cambridge Assessment', 'taller', 40, '2023-06-10', '2023-06-14', TRUE);

-- Insertar contactos de emergencia
INSERT INTO usuarios_contactos_emergencia (usuario_id, nombre_completo, parentesco, telefono_principal, telefono_secundario, email, es_principal)
VALUES 
(1, 'Maria Rodriguez', 'Madre', '987654321', '012345678', 'maria.rodriguez@email.com', TRUE),
(4, 'Carlos Gomez', 'Hermano', '998877665', NULL, 'carlos.gomez@email.com', TRUE);

-- Insertar preferencias de usuario
INSERT INTO usuarios_preferencias (usuario_id, tema, idioma, notificaciones_email, notificaciones_push, privacidad_perfil)
VALUES 
(1, 'claro', 'es', TRUE, TRUE, 'solo_institucion'),
(4, 'oscuro', 'es', TRUE, FALSE, 'solo_institucion'),
(11, 'auto', 'es', TRUE, TRUE, 'privado')
ON DUPLICATE KEY UPDATE tema = VALUES(tema);

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

SELECT 'Script ejecutado correctamente. Nuevas tablas y campos creados.' AS Resultado;
