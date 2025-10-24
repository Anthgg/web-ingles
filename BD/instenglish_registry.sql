-- -----------------------------------------------------
-- Schema instenglish_registry
-- -----------------------------------------------------
CREATE DATABASE IF NOT EXISTS `instenglish_registry` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `instenglish_registry`;

-- -----------------------------------------------------
-- Table `ministerio_instituciones`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `ministerio_instituciones` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `codigo_modular` VARCHAR(32) NOT NULL,
  `nombre` VARCHAR(150) NOT NULL,
  `tipo_gestion` VARCHAR(80) NOT NULL,
  `nivel_educativo` VARCHAR(80) NOT NULL,
  `turno` VARCHAR(50) NOT NULL,
  `direccion` VARCHAR(180) NOT NULL,
  `ugel` VARCHAR(120) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_institucion_codigo` (`codigo_modular`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `ministerio_personal`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `ministerio_personal` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `institucion_id` INT UNSIGNED NOT NULL,
  `codigo_personal` VARCHAR(32) NOT NULL,
  `nombre` VARCHAR(150) NOT NULL,
  `dni` VARCHAR(15) NOT NULL,
  `cargo` VARCHAR(120) NOT NULL,
  `especialidad` VARCHAR(150) NULL,
  `condicion_laboral` VARCHAR(120) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_personal_codigo` (`codigo_personal`),
  KEY `idx_personal_institucion` (`institucion_id`),
  CONSTRAINT `fk_personal_institucion`
    FOREIGN KEY (`institucion_id`)
    REFERENCES `ministerio_instituciones` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `ministerio_estudiantes`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `ministerio_estudiantes` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `institucion_id` INT UNSIGNED NOT NULL,
  `codigo_estudiante` VARCHAR(32) NOT NULL,
  `nombre_completo` VARCHAR(180) NOT NULL,
  `dni` VARCHAR(15) NOT NULL,
  `sexo` VARCHAR(20) NOT NULL,
  `fecha_nacimiento` DATE NULL,
  `grado` VARCHAR(50) NOT NULL,
  `seccion` VARCHAR(50) NOT NULL,
  `anio_academico` VARCHAR(20) NOT NULL,
  `situacion_matricula` VARCHAR(120) NOT NULL,
  `lengua_materna` VARCHAR(100) NOT NULL,
  `tipo_discapacidad` VARCHAR(150) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_estudiante_codigo` (`codigo_estudiante`),
  UNIQUE KEY `uk_estudiante_dni_institucion` (`dni`, `institucion_id`),
  KEY `idx_estudiante_institucion` (`institucion_id`),
  CONSTRAINT `fk_estudiante_institucion`
    FOREIGN KEY (`institucion_id`)
    REFERENCES `ministerio_instituciones` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `ministerio_estudiante_academico`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `ministerio_estudiante_academico` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `estudiante_id` INT UNSIGNED NOT NULL,
  `notas` JSON NULL,
  `asistencia_porcentaje` DECIMAL(5,2) NULL,
  `promocion_estado` VARCHAR(100) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_academico_estudiante` (`estudiante_id`),
  CONSTRAINT `fk_academico_estudiante`
    FOREIGN KEY (`estudiante_id`)
    REFERENCES `ministerio_estudiantes` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `student_internal_forms`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `student_internal_forms` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `codigo_interno` VARCHAR(32) NOT NULL,
  `dni` VARCHAR(15) NOT NULL,
  `nombres` VARCHAR(120) NOT NULL,
  `apellidos` VARCHAR(120) NOT NULL,
  `telefono` VARCHAR(30) NOT NULL,
  `correo` VARCHAR(150) NULL,
  `direccion` VARCHAR(180) NOT NULL,
  `familiar_nombre` VARCHAR(150) NOT NULL,
  `familiar_relacion` VARCHAR(80) NOT NULL,
  `familiar_ocupacion` VARCHAR(120) NULL,
  `familiar_telefono` VARCHAR(30) NOT NULL,
  `familiar_correo` VARCHAR(150) NULL,
  `tipo_sangre` VARCHAR(10) NOT NULL,
  `alergias` VARCHAR(200) NULL,
  `enfermedades_cronicas` VARCHAR(200) NULL,
  `seguro_medico` VARCHAR(150) NULL,
  `persona_autorizada` VARCHAR(150) NOT NULL,
  `telefono_emergencia` VARCHAR(30) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_internal_user` (`user_id`),
  UNIQUE KEY `uk_internal_codigo` (`codigo_interno`),
  UNIQUE KEY `uk_internal_dni` (`dni`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
