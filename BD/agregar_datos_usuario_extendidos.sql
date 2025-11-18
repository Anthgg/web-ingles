-- Script para agregar datos extendidos de usuarios
-- Autor: Sistema GoEnglish
-- Fecha: 2025-11-07
-- Descripción: Agrega tablas para información detallada de estudiantes, docentes y administradores

USE instenglish_auth;

-- ========================================
-- TABLA: Datos Extendidos de Estudiantes
-- ========================================
CREATE TABLE IF NOT EXISTS estudiante_datos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL UNIQUE,
    matricula VARCHAR(20) UNIQUE NOT NULL COMMENT 'Número de matrícula del estudiante',
    grado VARCHAR(50) DEFAULT NULL COMMENT 'Grado académico (1ro, 2do, etc.)',
    seccion VARCHAR(10) DEFAULT NULL COMMENT 'Sección (A, B, C, etc.)',
    promedio_general DECIMAL(4,2) DEFAULT 0.00 COMMENT 'Promedio general de calificaciones',
    porcentaje_asistencia DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Porcentaje de asistencia',
    fecha_ingreso DATE DEFAULT NULL COMMENT 'Fecha de ingreso al centro educativo',
    tutor_nombre VARCHAR(150) DEFAULT NULL COMMENT 'Nombre del tutor o apoderado',
    tutor_telefono VARCHAR(30) DEFAULT NULL COMMENT 'Teléfono del tutor',
    tutor_email VARCHAR(100) DEFAULT NULL COMMENT 'Email del tutor',
    estado_academico ENUM('Regular', 'Irregular', 'Retirado', 'Egresado') DEFAULT 'Regular',
    observaciones TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_estudiante_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_matricula (matricula),
    INDEX idx_grado_seccion (grado, seccion),
    INDEX idx_estado_academico (estado_academico)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Datos académicos extendidos de estudiantes';

-- ========================================
-- TABLA: Cursos Matriculados por Estudiante
-- ========================================
CREATE TABLE IF NOT EXISTS estudiante_cursos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estudiante_id INT NOT NULL COMMENT 'ID del estudiante',
    curso_nombre VARCHAR(150) NOT NULL COMMENT 'Nombre del curso',
    curso_codigo VARCHAR(20) DEFAULT NULL COMMENT 'Código del curso',
    creditos INT DEFAULT 0 COMMENT 'Créditos del curso',
    nota_parcial DECIMAL(4,2) DEFAULT NULL COMMENT 'Nota del primer parcial',
    nota_final DECIMAL(4,2) DEFAULT NULL COMMENT 'Nota final del curso',
    estado_curso ENUM('En curso', 'Aprobado', 'Reprobado', 'Retirado') DEFAULT 'En curso',
    ciclo_academico VARCHAR(20) DEFAULT NULL COMMENT 'Ciclo o período académico',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_estudiante_curso_usuario FOREIGN KEY (estudiante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_estudiante_cursos (estudiante_id),
    INDEX idx_estado_curso (estado_curso)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Cursos matriculados por estudiantes';

-- ========================================
-- TABLA: Datos Extendidos de Docentes
-- ========================================
CREATE TABLE IF NOT EXISTS docente_datos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL UNIQUE,
    especialidad VARCHAR(150) DEFAULT NULL COMMENT 'Especialidad o area de ensenanza',
    nivel_academico ENUM('Licenciado', 'Magister', 'Doctor', 'Bachiller') DEFAULT 'Licenciado',
    anios_experiencia INT DEFAULT 0 COMMENT 'Anios de experiencia docente',
    colegiatura VARCHAR(50) DEFAULT NULL COMMENT 'Numero de colegiatura profesional',
    tipo_contrato ENUM('Nombrado', 'Contratado', 'Tiempo Completo', 'Tiempo Parcial') DEFAULT 'Contratado',
    horario_entrada TIME DEFAULT NULL COMMENT 'Hora de entrada',
    horario_salida TIME DEFAULT NULL COMMENT 'Hora de salida',
    dias_laborales VARCHAR(100) DEFAULT 'Lunes,Martes,Miercoles,Jueves,Viernes' COMMENT 'Dias de la semana que labora',
    fecha_ingreso DATE DEFAULT NULL COMMENT 'Fecha de ingreso como docente',
    oficina VARCHAR(50) DEFAULT NULL COMMENT 'Numero de oficina o cubiculo',
    extension VARCHAR(20) DEFAULT NULL COMMENT 'Extension telefonica',
    biografia TEXT DEFAULT NULL COMMENT 'Biografia o perfil profesional',
    estado_laboral ENUM('Activo', 'Licencia', 'Inactivo', 'Retirado') DEFAULT 'Activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_docente_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_especialidad (especialidad),
    INDEX idx_estado_laboral (estado_laboral)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Datos profesionales extendidos de docentes';

-- ========================================
-- TABLA: Cursos Asignados a Docentes
-- ========================================
CREATE TABLE IF NOT EXISTS docente_cursos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    docente_id INT NOT NULL COMMENT 'ID del docente',
    curso_nombre VARCHAR(150) NOT NULL COMMENT 'Nombre del curso asignado',
    curso_codigo VARCHAR(20) DEFAULT NULL COMMENT 'Código del curso',
    grado VARCHAR(50) DEFAULT NULL COMMENT 'Grado al que enseña',
    seccion VARCHAR(10) DEFAULT NULL COMMENT 'Sección que enseña',
    horario VARCHAR(100) DEFAULT NULL COMMENT 'Horario de clases (ej: Lun-Mie 8:00-10:00)',
    aula VARCHAR(20) DEFAULT NULL COMMENT 'Número de aula',
    ciclo_academico VARCHAR(20) DEFAULT NULL COMMENT 'Ciclo o período académico',
    total_estudiantes INT DEFAULT 0 COMMENT 'Cantidad de estudiantes en el curso',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_docente_curso_usuario FOREIGN KEY (docente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_docente_cursos (docente_id),
    INDEX idx_grado_seccion_curso (grado, seccion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Cursos asignados a docentes';

-- ========================================
-- TABLA: Datos Extendidos de Administradores
-- ========================================
CREATE TABLE IF NOT EXISTS admin_datos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL UNIQUE,
    cargo VARCHAR(100) DEFAULT 'Administrador' COMMENT 'Cargo o posición administrativa',
    departamento VARCHAR(100) DEFAULT NULL COMMENT 'Departamento al que pertenece',
    nivel_acceso ENUM('Total', 'Alto', 'Medio', 'Básico') DEFAULT 'Medio',
    permisos_especiales TEXT DEFAULT NULL COMMENT 'JSON con permisos especiales',
    fecha_nombramiento DATE DEFAULT NULL COMMENT 'Fecha de nombramiento como admin',
    ultimo_acceso DATETIME DEFAULT NULL COMMENT 'Última vez que accedió al sistema',
    ip_ultimo_acceso VARCHAR(50) DEFAULT NULL COMMENT 'IP del último acceso',
    intentos_fallidos INT DEFAULT 0 COMMENT 'Intentos de login fallidos',
    cuenta_bloqueada BOOLEAN DEFAULT FALSE COMMENT 'Si la cuenta está bloqueada',
    estado_admin ENUM('Activo', 'Inactivo', 'Suspendido') DEFAULT 'Activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_admin_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_nivel_acceso (nivel_acceso),
    INDEX idx_estado_admin (estado_admin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Datos administrativos extendidos';

-- ========================================
-- TABLA: Módulos Habilitados para Administradores
-- ========================================
CREATE TABLE IF NOT EXISTS admin_modulos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL COMMENT 'ID del administrador',
    modulo_nombre VARCHAR(100) NOT NULL COMMENT 'Nombre del módulo',
    modulo_codigo VARCHAR(50) NOT NULL COMMENT 'Código del módulo',
    puede_leer BOOLEAN DEFAULT TRUE,
    puede_crear BOOLEAN DEFAULT FALSE,
    puede_editar BOOLEAN DEFAULT FALSE,
    puede_eliminar BOOLEAN DEFAULT FALSE,
    descripcion TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_admin_modulo_usuario FOREIGN KEY (admin_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE KEY uk_admin_modulo (admin_id, modulo_codigo),
    INDEX idx_admin_modulos (admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Módulos y permisos de administradores';

-- ========================================
-- INSERTAR DATOS DE EJEMPLO
-- ========================================

-- Datos de ejemplo para estudiantes existentes
INSERT INTO estudiante_datos (usuario_id, matricula, grado, seccion, promedio_general, porcentaje_asistencia, fecha_ingreso, estado_academico)
SELECT id, CONCAT('MAT-', LPAD(id, 5, '0')), '5to Secundaria', 'A', 15.50, 92.50, '2024-03-01', 'Regular'
FROM usuarios WHERE rol = 'estudiante' AND id = 7
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

INSERT INTO estudiante_datos (usuario_id, matricula, grado, seccion, promedio_general, porcentaje_asistencia, fecha_ingreso, estado_academico)
SELECT id, CONCAT('MAT-', LPAD(id, 5, '0')), '4to Secundaria', 'B', 14.80, 88.30, '2024-03-01', 'Regular'
FROM usuarios WHERE rol = 'estudiante' AND id = 11
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

INSERT INTO estudiante_datos (usuario_id, matricula, grado, seccion, promedio_general, porcentaje_asistencia, fecha_ingreso, estado_academico)
SELECT id, CONCAT('MAT-', LPAD(id, 5, '0')), '3ro Secundaria', 'A', 16.20, 95.00, '2024-03-01', 'Regular'
FROM usuarios WHERE rol = 'estudiante' AND id = 16
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Cursos para estudiantes
INSERT INTO estudiante_cursos (estudiante_id, curso_nombre, curso_codigo, creditos, nota_parcial, nota_final, estado_curso, ciclo_academico)
SELECT 7, 'Ingles Avanzado I', 'ING-501', 4, 16.5, NULL, 'En curso', '2025-I'
FROM usuarios WHERE id = 7 LIMIT 1
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

INSERT INTO estudiante_cursos (estudiante_id, curso_nombre, curso_codigo, creditos, nota_parcial, nota_final, estado_curso, ciclo_academico)
SELECT 7, 'Matematicas V', 'MAT-505', 5, 15.0, NULL, 'En curso', '2025-I'
FROM usuarios WHERE id = 7 LIMIT 1
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

INSERT INTO estudiante_cursos (estudiante_id, curso_nombre, curso_codigo, creditos, nota_parcial, nota_final, estado_curso, ciclo_academico)
SELECT 11, 'Ingles Intermedio II', 'ING-402', 4, 14.2, NULL, 'En curso', '2025-I'
FROM usuarios WHERE id = 11 LIMIT 1
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Datos de ejemplo para docentes existentes
INSERT INTO docente_datos (usuario_id, especialidad, nivel_academico, anios_experiencia, tipo_contrato, horario_entrada, horario_salida, fecha_ingreso, estado_laboral)
SELECT id, 'Lenguas Extranjeras - Ingles', 'Magister', 8, 'Nombrado', '08:00:00', '16:00:00', '2020-03-01', 'Activo'
FROM usuarios WHERE rol IN ('profesor', 'docente') AND id = 12
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

INSERT INTO docente_datos (usuario_id, especialidad, nivel_academico, anios_experiencia, tipo_contrato, horario_entrada, horario_salida, fecha_ingreso, estado_laboral)
SELECT id, 'Educacion Secundaria', 'Licenciado', 5, 'Contratado', '08:00:00', '14:00:00', '2022-03-01', 'Activo'
FROM usuarios WHERE rol IN ('profesor', 'docente') AND id = 13
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

INSERT INTO docente_datos (usuario_id, especialidad, nivel_academico, anios_experiencia, tipo_contrato, horario_entrada, horario_salida, fecha_ingreso, estado_laboral)
SELECT id, 'Matematicas', 'Doctor', 12, 'Nombrado', '07:30:00', '15:30:00', '2018-03-01', 'Activo'
FROM usuarios WHERE rol IN ('profesor', 'docente') AND id = 14
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Cursos para docentes
INSERT INTO docente_cursos (docente_id, curso_nombre, curso_codigo, grado, seccion, horario, aula, ciclo_academico, total_estudiantes)
SELECT 12, 'Ingles Avanzado I', 'ING-501', '5to Secundaria', 'A', 'Lun-Mie-Vie 10:00-12:00', 'A-201', '2025-I', 28
FROM usuarios WHERE id = 12 LIMIT 1
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

INSERT INTO docente_cursos (docente_id, curso_nombre, curso_codigo, grado, seccion, horario, aula, ciclo_academico, total_estudiantes)
SELECT 12, 'Ingles Intermedio II', 'ING-402', '4to Secundaria', 'B', 'Mar-Jue 14:00-16:00', 'A-203', '2025-I', 25
FROM usuarios WHERE id = 12 LIMIT 1
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Datos de ejemplo para administradores
INSERT INTO admin_datos (usuario_id, cargo, departamento, nivel_acceso, fecha_nombramiento, estado_admin)
SELECT id, 'Director Administrativo', 'Dirección General', 'Total', '2020-01-01', 'Activo'
FROM usuarios WHERE rol IN ('admin', 'administrativo') AND id = 1
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

INSERT INTO admin_datos (usuario_id, cargo, departamento, nivel_acceso, fecha_nombramiento, estado_admin)
SELECT id, 'Administrador de Sistema', 'Tecnología e Información', 'Total', '2024-01-15', 'Activo'
FROM usuarios WHERE rol IN ('admin', 'administrativo') AND id = 10
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Módulos para administradores
INSERT INTO admin_modulos (admin_id, modulo_nombre, modulo_codigo, puede_leer, puede_crear, puede_editar, puede_eliminar, descripcion)
VALUES 
(1, 'Gestion de Usuarios', 'USUARIOS', TRUE, TRUE, TRUE, TRUE, 'Control total sobre usuarios del sistema'),
(1, 'Gestion de Cursos', 'CURSOS', TRUE, TRUE, TRUE, TRUE, 'Administracion de cursos y asignaturas'),
(1, 'Control de Asistencias', 'ASISTENCIAS', TRUE, TRUE, TRUE, FALSE, 'Registro y seguimiento de asistencias'),
(1, 'Gestion de Calificaciones', 'CALIFICACIONES', TRUE, TRUE, TRUE, FALSE, 'Administracion de notas y evaluaciones'),
(1, 'Reportes del Sistema', 'REPORTES', TRUE, TRUE, FALSE, FALSE, 'Generacion de reportes estadisticos'),
(1, 'Configuracion General', 'CONFIGURACION', TRUE, TRUE, TRUE, TRUE, 'Configuracion del sistema')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

INSERT INTO admin_modulos (admin_id, modulo_nombre, modulo_codigo, puede_leer, puede_crear, puede_editar, puede_eliminar, descripcion)
VALUES 
(10, 'Gestion de Usuarios', 'USUARIOS', TRUE, TRUE, TRUE, FALSE, 'Gestion de usuarios sin eliminacion'),
(10, 'Gestion de Cursos', 'CURSOS', TRUE, TRUE, TRUE, FALSE, 'Administracion de cursos'),
(10, 'Reportes del Sistema', 'REPORTES', TRUE, FALSE, FALSE, FALSE, 'Solo lectura de reportes')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- ========================================
-- PROCEDIMIENTO: Obtener datos completos de usuario
-- ========================================
DELIMITER $$

DROP PROCEDURE IF EXISTS obtener_datos_completos_usuario$$
CREATE PROCEDURE obtener_datos_completos_usuario(IN p_usuario_id INT)
BEGIN
    DECLARE v_rol VARCHAR(50);
    
    -- Obtener rol del usuario
    SELECT rol INTO v_rol FROM usuarios WHERE id = p_usuario_id;
    
    -- Datos básicos del usuario
    SELECT 
        u.id,
        u.nombre,
        u.email,
        u.rol,
        u.activo,
        u.codigo_estudiante,
        u.codigo_docente,
        u.codigo_admin,
        udp.dni,
        udp.edad,
        udp.telefono,
        udp.direccion
    FROM usuarios u
    LEFT JOIN usuario_datos_personales udp ON u.id = udp.usuario_id
    WHERE u.id = p_usuario_id;
    
    -- Datos según el rol
    IF v_rol = 'estudiante' THEN
        -- Datos de estudiante
        SELECT * FROM estudiante_datos WHERE usuario_id = p_usuario_id;
        
        -- Cursos del estudiante
        SELECT * FROM estudiante_cursos WHERE estudiante_id = p_usuario_id ORDER BY ciclo_academico DESC, curso_nombre;
        
    ELSEIF v_rol IN ('profesor', 'docente') THEN
        -- Datos de docente
        SELECT * FROM docente_datos WHERE usuario_id = p_usuario_id;
        
        -- Cursos del docente
        SELECT * FROM docente_cursos WHERE docente_id = p_usuario_id ORDER BY ciclo_academico DESC, curso_nombre;
        
    ELSEIF v_rol IN ('admin', 'administrativo') THEN
        -- Datos de administrador
        SELECT * FROM admin_datos WHERE usuario_id = p_usuario_id;
        
        -- Módulos del administrador
        SELECT * FROM admin_modulos WHERE admin_id = p_usuario_id ORDER BY modulo_nombre;
    END IF;
END$$

DELIMITER ;

-- ========================================
-- VERIFICACIÓN Y RESUMEN
-- ========================================
SELECT 'Tablas creadas exitosamente' AS Estado;

SELECT 
    'estudiante_datos' AS Tabla,
    COUNT(*) AS Registros
FROM estudiante_datos
UNION ALL
SELECT 
    'docente_datos' AS Tabla,
    COUNT(*) AS Registros
FROM docente_datos
UNION ALL
SELECT 
    'admin_datos' AS Tabla,
    COUNT(*) AS Registros
FROM admin_datos
UNION ALL
SELECT 
    'estudiante_cursos' AS Tabla,
    COUNT(*) AS Registros
FROM estudiante_cursos
UNION ALL
SELECT 
    'docente_cursos' AS Tabla,
    COUNT(*) AS Registros
FROM docente_cursos
UNION ALL
SELECT 
    'admin_modulos' AS Tabla,
    COUNT(*) AS Registros
FROM admin_modulos;

SELECT 'Script ejecutado correctamente. Sistema de datos extendidos instalado.' AS Resultado;
