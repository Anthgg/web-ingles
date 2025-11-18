# Mejoras de Cursos y Horarios - Guía de Implementación

## 📋 Resumen de Cambios

Este script agrega funcionalidad para:

1. **Tabla `horarios_curso`**: Almacena los días de la semana en que se dicta cada curso
2. **Columnas en `asistencias`**: Agrega `curso_id` y `curso_nombre` para relacionar asistencias con cursos
3. **Vistas de estadísticas**:
   - `v_estadisticas_estudiante_curso`: Total presentes/ausentes por estudiante en cada curso
   - `v_estadisticas_curso_fecha`: Resumen de asistencia por curso y fecha
4. **Función de validación**: `fn_es_dia_valido_curso()` - Verifica si una fecha corresponde al horario del curso
5. **Stored Procedures**: 
   - `sp_obtener_horarios_curso()` - Obtiene los horarios de un curso
   - `sp_agregar_horario_curso()` - Agrega/actualiza horarios de un curso

## 🗄️ Estructura de BD

### Tabla: `horarios_curso`
```sql
CREATE TABLE horarios_curso (
  id INT PRIMARY KEY AUTO_INCREMENT,
  curso_id INT NOT NULL,
  curso_nombre VARCHAR(100) NOT NULL,
  dia_semana TINYINT NOT NULL,  -- 1=Lunes, 2=Martes, ..., 7=Domingo
  hora_inicio TIME,
  hora_fin TIME,
  activo BOOLEAN DEFAULT TRUE,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Modificaciones a `asistencias`:
- Agrega `curso_id INT` con índice
- Agrega `curso_nombre VARCHAR(100)` con índice

## 🚀 Instalación

### Opción 1: Desde MySQL Workbench
1. Abre MySQL Workbench
2. Conéctate a tu servidor MySQL
3. Abre el archivo `mejoras_cursos_horarios.sql`
4. Ejecuta el script completo (⚡ Execute button)

### Opción 2: Desde línea de comandos
```bash
# Windows (desde la carpeta BD)
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < mejoras_cursos_horarios.sql

# Linux/Mac
mysql -u root -p < mejoras_cursos_horarios.sql
```

## 📝 Uso

### 1. Agregar horarios a un curso

```sql
-- Ejemplo: Inglés Básico I se dicta Lunes, Miércoles y Viernes de 8:00 a 10:00
CALL sp_agregar_horario_curso(1, 'Inglés Básico I', 1, '08:00:00', '10:00:00'); -- Lunes
CALL sp_agregar_horario_curso(1, 'Inglés Básico I', 3, '08:00:00', '10:00:00'); -- Miércoles
CALL sp_agregar_horario_curso(1, 'Inglés Básico I', 5, '08:00:00', '10:00:00'); -- Viernes

-- Ejemplo: Inglés Intermedio se dicta Martes y Jueves de 14:00 a 16:00
CALL sp_agregar_horario_curso(2, 'Inglés Intermedio', 2, '14:00:00', '16:00:00'); -- Martes
CALL sp_agregar_horario_curso(2, 'Inglés Intermedio', 4, '14:00:00', '16:00:00'); -- Jueves
```

**Días de la semana:**
- 1 = Lunes
- 2 = Martes
- 3 = Miércoles
- 4 = Jueves
- 5 = Viernes
- 6 = Sábado
- 7 = Domingo

### 2. Consultar horarios de un curso

```sql
CALL sp_obtener_horarios_curso(1);
```

Retorna:
```
+----+----------+----------------+------------+-------------+-------------+--------+
| id | curso_id | curso_nombre   | dia_semana | nombre_dia  | hora_inicio | hora_fin | activo |
+----+----------+----------------+------------+-------------+-------------+--------+
| 1  | 1        | Inglés Básico I| 1          | Lunes       | 08:00:00    | 10:00:00 | 1      |
| 2  | 1        | Inglés Básico I| 3          | Miércoles   | 08:00:00    | 10:00:00 | 1      |
| 3  | 1        | Inglés Básico I| 5          | Viernes     | 08:00:00    | 10:00:00 | 1      |
+----+----------+----------------+------------+-------------+-------------+--------+
```

### 3. Validar si una fecha es válida para un curso

```sql
-- Verificar si el 27 de octubre de 2025 (Lunes) es día de clase para curso_id=1
SELECT fn_es_dia_valido_curso(1, '2025-10-27') AS es_valido;
-- Retorna 1 (TRUE) si es Lunes, Miércoles o Viernes

SELECT fn_es_dia_valido_curso(1, '2025-10-28') AS es_valido;
-- Retorna 0 (FALSE) si es Martes (no es día de clase para este curso)
```

### 4. Ver estadísticas de asistencia por estudiante y curso

```sql
SELECT * FROM v_estadisticas_estudiante_curso
WHERE estudiante_id = 123;
```

Retorna:
```
+--------------+------------------+----------+---------------+-----------------+----------------+---------------+------------------+---------------------+---------------+
| estudiante_id| estudiante_nombre| curso_id | curso_nombre  | total_registros | total_presentes| total_ausentes| total_tardanzas  | porcentaje_asistencia| primera_clase| ultima_clase |
+--------------+------------------+----------+---------------+-----------------+----------------+---------------+------------------+---------------------+---------------+
| 123          | Juan Pérez       | 1        | Inglés Básico | 20              | 18             | 1             | 1                | 90.00               | 2025-09-01   | 2025-10-27   |
+--------------+------------------+----------+---------------+-----------------+----------------+---------------+------------------+---------------------+---------------+
```

### 5. Ver estadísticas por curso y fecha

```sql
SELECT * FROM v_estadisticas_curso_fecha
WHERE curso_id = 1
ORDER BY fecha DESC
LIMIT 10;
```

## 🔄 Flujo de Trabajo Recomendado

### Backend (Node.js)

1. **Al registrar asistencia**, validar primero si la fecha corresponde al horario:
```javascript
// Endpoint POST /asistencias
const validarFechaCurso = await pool.query(
  'SELECT fn_es_dia_valido_curso(?, ?) AS es_valido',
  [curso_id, fecha]
);

if (!validarFechaCurso[0][0].es_valido) {
  return res.status(400).json({ 
    error: 'Esta fecha no corresponde a un día de clase de este curso' 
  });
}
```

2. **Obtener estadísticas por estudiante**:
```javascript
// Endpoint GET /asistencias/estadisticas/estudiante/:id
const stats = await pool.query(
  'SELECT * FROM v_estadisticas_estudiante_curso WHERE estudiante_id = ?',
  [id]
);
```

### Frontend (React)

1. **Obtener horarios del curso** antes de mostrar el modal de asistencia
2. **Deshabilitar fechas inválidas** en el date picker
3. **Mostrar estadísticas por curso** en lugar de estadísticas globales
4. **Agrupar estudiantes por curso** y mostrar sus estadísticas individuales

## 🎯 Próximos Pasos

1. ✅ Ejecutar el script SQL
2. ⏳ Agregar horarios a los cursos existentes (usar `sp_agregar_horario_curso`)
3. ⏳ Actualizar el backend para usar las nuevas columnas y vistas
4. ⏳ Actualizar el frontend para mostrar estadísticas por curso
5. ⏳ Implementar validación de fechas según horarios

## ⚠️ Notas Importantes

- Los horarios son **opcionales** - si un curso no tiene horarios definidos, se puede registrar asistencia cualquier día
- La función `fn_es_dia_valido_curso()` retorna `FALSE` si el curso no tiene horarios configurados
- Las asistencias existentes **no se modifican** - solo se agregan las nuevas columnas
- Se recomienda actualizar las asistencias existentes para agregar `curso_id` y `curso_nombre` manualmente

## 🐛 Solución de Problemas

### Error: "La columna curso_id ya existe"
✅ No es un error - significa que la columna ya fue agregada anteriormente.

### Error: "Access denied for user 'root'@'localhost'"
Verifica que tu contraseña de MySQL sea correcta o ejecuta desde MySQL Workbench.

### Las vistas no muestran datos
Verifica que las asistencias tengan `curso_id` y `curso_nombre` poblados:
```sql
SELECT COUNT(*) FROM instenglish_attendance.asistencias WHERE curso_id IS NULL;
```

Si hay registros con `curso_id = NULL`, necesitas actualizarlos manualmente.
