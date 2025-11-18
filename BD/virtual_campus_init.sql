-- Roles base
INSERT INTO roles (id, name, description)
VALUES
  (gen_random_uuid(), 'ADMIN', 'Administrador del campus'),
  (gen_random_uuid(), 'TEACHER', 'Docente'),
  (gen_random_uuid(), 'STUDENT', 'Estudiante'),
  (gen_random_uuid(), 'GUARDIAN', 'Tutor / Apoderado');

-- Usuario administrador por defecto
WITH admin_role AS (
  SELECT id FROM roles WHERE name = 'ADMIN' LIMIT 1
)
INSERT INTO users (id, email, password_hash, first_name, last_name, is_active)
VALUES (gen_random_uuid(), 'admin@virtualcampus.local', '$2a$10$4u0p1Bd43u9oOHYfpSCMZO1B6hUrtQ4HJng24EaUTATu.D0B6m17G', 'Admin', 'Campus', true);

WITH u AS (
  SELECT id FROM users WHERE email = 'admin@virtualcampus.local'
), r AS (
  SELECT id FROM roles WHERE name = 'ADMIN'
)
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM u, r;

-- Escala de calificaciones por defecto
INSERT INTO grade_scales (id, name, description, ranges)
VALUES (
  gen_random_uuid(),
  'Escala Estándar',
  'Escala de 0 a 20',
  '[{"min":0,"max":10,"label":"En Progreso"},{"min":11,"max":15,"label":"Aprobado"},{"min":16,"max":20,"label":"Sobresaliente"}]'
);
