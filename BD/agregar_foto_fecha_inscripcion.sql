-- =====================================================
-- AGREGAR CAMPOS DE FOTO Y FECHA DE INSCRIPCIÓN
-- =====================================================

USE instenglish_auth;

-- Agregar campo para almacenar imagen de foto de perfil
-- Usamos MEDIUMBLOB para permitir imágenes de hasta 16MB
ALTER TABLE usuarios 
ADD COLUMN foto_perfil_imagen MEDIUMBLOB NULL COMMENT 'Imagen de foto de perfil almacenada directamente';

-- Agregar campo para tipo MIME de la imagen
ALTER TABLE usuarios
ADD COLUMN foto_perfil_tipo VARCHAR(50) NULL COMMENT 'Tipo MIME de la imagen (image/jpeg, image/png, etc)';

-- Agregar campo para fecha de inscripción/inicio
ALTER TABLE usuarios
ADD COLUMN fecha_inscripcion DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha en que el usuario se inscribió/registró';

-- Si ya existe foto_perfil como VARCHAR (URL), la mantenemos para compatibilidad
-- Los usuarios pueden tener URL o imagen directa

-- Actualizar usuarios existentes sin fecha de inscripción
-- Les asignamos su fecha de creación como fecha de inscripción
UPDATE usuarios 
SET fecha_inscripcion = fecha_creacion_cuenta 
WHERE fecha_inscripcion IS NULL AND fecha_creacion_cuenta IS NOT NULL;

-- Si no tienen fecha_creacion_cuenta, usar la fecha actual
UPDATE usuarios 
SET fecha_inscripcion = NOW() 
WHERE fecha_inscripcion IS NULL;

-- =====================================================
-- ÍNDICES PARA OPTIMIZAR CONSULTAS
-- =====================================================

-- Índice para búsquedas por fecha de inscripción
CREATE INDEX idx_usuarios_fecha_inscripcion ON usuarios(fecha_inscripcion);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Mostrar la estructura actualizada de la tabla
DESCRIBE usuarios;

-- Contar usuarios con y sin foto
SELECT 
    COUNT(*) as total_usuarios,
    SUM(CASE WHEN foto_perfil_imagen IS NOT NULL THEN 1 ELSE 0 END) as con_foto_imagen,
    SUM(CASE WHEN foto_perfil IS NOT NULL THEN 1 ELSE 0 END) as con_foto_url,
    SUM(CASE WHEN fecha_inscripcion IS NOT NULL THEN 1 ELSE 0 END) as con_fecha_inscripcion
FROM usuarios;

SELECT 'Script ejecutado exitosamente' as resultado;
