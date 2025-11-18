-- Script para agregar campo de teléfono a usuarios
-- Fecha: 2025-10-30
-- Propósito: Permitir envío de OTP por SMS

USE instenglish_auth;

-- Agregar columna telefono si no existe
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS telefono VARCHAR(20) DEFAULT NULL COMMENT 'Número de teléfono en formato internacional (+1234567890)';

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_telefono ON usuarios(telefono);

-- Actualizar algunos usuarios de ejemplo (opcional)
-- UPDATE usuarios SET telefono = '+15551234567' WHERE id = 1;

SELECT 'Campo telefono agregado correctamente' AS status;
