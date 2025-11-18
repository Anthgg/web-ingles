# Mejoras del Sistema de Asistencias

## 📋 Descripción General

Este documento describe las mejoras implementadas en el sistema de asistencias para el control educativo de GoEnglish.

## 🎯 Funcionalidades Nuevas

### 1. **Registro por Día Completo**
- El docente ahora registra la asistencia de TODOS los estudiantes de un curso en un solo formulario
- Selecciona una fecha y marca el estado de cada estudiante (Presente, Ausente, Tardanza, Justificado)
- Puede agregar observaciones individuales por estudiante

### 2. **Control de Modificación Temporal**
- **Docentes**: Pueden crear y modificar asistencias de los últimos 7 días
- **Administradores**: Pueden modificar asistencias sin restricción de tiempo
- Las asistencias con más de 7 días se bloquean automáticamente para edición del docente

### 3. **Estadísticas en Tiempo Real**
- Porcentaje de asistencia por curso
- Porcentaje de asistencia por estudiante
- Contadores de: Total clases, Presentes, Ausentes
- Indicadores visuales con colores:
  - 🟢 Verde: ≥85% asistencia
  - 🟡 Amarillo: 70-84% asistencia
  - 🔴 Rojo: <70% asistencia

### 4. **Interfaz Mejorada**
- Vista de curso con tarjetas desplegables
- Selector de fecha para registro rápido
- Botones de "Marcar todos" para agilizar el proceso
- Tabla responsive con todas las estadísticas

## 🗄️ Cambios en la Base de Datos

### Ejecutar el Script SQL

1. Abrir MySQL Workbench o terminal MySQL
2. Ejecutar el archivo `mejoras_asistencias.sql`:

```bash
mysql -u root -p < mejoras_asistencias.sql
```

O desde MySQL Workbench:
```sql
source c:/Users/anthg/OneDrive/Escritorio/goenglish/BD/mejoras_asistencias.sql
```

### Nuevos Campos Agregados

La tabla `asistencias` ahora incluye:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `observaciones` | TEXT | Observaciones adicionales del docente |
| `modificado_por` | INT | ID del usuario que modificó por última vez |
| `fecha_modificacion` | DATETIME | Fecha de última modificación |
| `bloqueado` | BOOLEAN | Indica si está bloqueado para edición del docente |

### Vistas Creadas

1. **`v_estadisticas_asistencia`**
   - Estadísticas por curso y fecha
   - Porcentajes de asistencia
   - Conteo por estados (presente, ausente, tardanza, justificado)

2. **`v_resumen_asistencia_estudiante`**
   - Resumen por estudiante y materia
   - Porcentaje individual de asistencia
   - Historial completo

### Procedimientos Almacenados

1. **`sp_bloquear_asistencias_antiguas()`**
   - Bloquea asistencias con más de 7 días
   - Debe ejecutarse diariamente (recomendado configurar en cron)

2. **`fn_puede_modificar_asistencia(asistencia_id, rol_usuario)`**
   - Función que valida permisos de modificación
   - Retorna TRUE/FALSE según rol y antigüedad

### Trigger

- **`tr_asistencias_before_update`**
  - Actualiza automáticamente `fecha_modificacion` en cada UPDATE
  - Registra auditoría de cambios

## 🚀 Configuración Automática (Opcional)

### Bloqueo Automático Diario

Para ejecutar el procedimiento de bloqueo automáticamente cada día:

**Linux/Mac (crontab):**
```bash
0 2 * * * mysql -u root -p<password> instenglish_attendance -e "CALL sp_bloquear_asistencias_antiguas();"
```

**Windows (Task Scheduler):**
```batch
mysql -u root -p<password> instenglish_attendance -e "CALL sp_bloquear_asistencias_antiguas();"
```

## 📊 Uso del Sistema

### Para Docentes

1. Ir al módulo "Asistencias"
2. Ver lista de cursos con estadísticas
3. Hacer clic en "Registrar Día" del curso deseado
4. Seleccionar fecha (máximo 7 días atrás)
5. Marcar estado de cada estudiante
6. Agregar observaciones opcionales
7. Guardar

### Para Administradores

- Mismas funciones que docentes
- Sin restricción de fecha
- Pueden modificar asistencias bloqueadas
- Acceso completo a todas las asistencias

## 🔒 Reglas de Negocio

1. **Fecha máxima**: No se puede registrar asistencia a futuro
2. **Edición docente**: Solo hasta 7 días atrás
3. **Edición admin**: Sin límite de tiempo
4. **Bloqueo automático**: A los 7 días de la fecha original
5. **Auditoría**: Cada modificación registra usuario y fecha

## 🎨 Características de la UI

- ✅ Diseño responsive (móvil, tablet, desktop)
- ✅ Colores temáticos verdes para docente
- ✅ Badges con indicadores de estado
- ✅ Botones de acción rápida
- ✅ Alertas informativas
- ✅ Spinner de carga durante guardado
- ✅ Mensajes de éxito/error

## 📝 Notas Importantes

- Las asistencias se registran por `asignacion_id`, garantizando que se asocien al curso correcto
- El sistema previene doble registro del mismo estudiante en la misma fecha
- Las observaciones son opcionales pero recomendadas para casos especiales
- El porcentaje de asistencia se calcula en tiempo real cada vez que se carga el módulo

## 🐛 Solución de Problemas

### Error: "No puedes modificar asistencias con más de 7 días"
**Solución**: Contactar a un administrador para modificar asistencias antiguas

### Error: "Asistencia bloqueada"
**Solución**: El registro fue bloqueado automáticamente. Solo administradores pueden editarlo.

### No se muestran estudiantes
**Solución**: Verificar que:
1. Los estudiantes estén inscritos en el curso (`asignacion_estudiantes`)
2. El docente esté asignado al curso (`asignaciones_profesor_curso`)
3. El nuevo endpoint `/asignaciones-con-estudiantes` esté funcionando

## 📞 Soporte

Para problemas o dudas sobre el sistema de asistencias:
- Revisar logs del backend en `backend/attendance-service/app.js`
- Verificar consola del navegador para errores del frontend
- Contactar al equipo de desarrollo
