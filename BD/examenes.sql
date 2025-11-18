-- Tablas para la gestion de examenes y sus calificaciones
USE instenglish_grades;

CREATE TABLE IF NOT EXISTS examenes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  asignacion_id INT NOT NULL,
  profesor_id INT NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  descripcion TEXT NULL,
  fecha DATE NOT NULL,
  curso_nombre VARCHAR(150) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_profesor_nombre_fecha (profesor_id, nombre, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS examen_calificaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  examen_id INT NOT NULL,
  estudiante_id INT NOT NULL,
  nota DECIMAL(5,2) NOT NULL,
  estado ENUM('aprobado','reprobado') NOT NULL DEFAULT 'reprobado',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_examen_calificaciones_examen FOREIGN KEY (examen_id)
    REFERENCES examenes(id) ON DELETE CASCADE,
  CONSTRAINT uq_examen_estudiante UNIQUE (examen_id, estudiante_id),
  INDEX idx_examen_calificaciones_estudiante (estudiante_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
