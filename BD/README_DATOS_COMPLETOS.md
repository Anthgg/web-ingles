# Sistema Completo de Datos de Usuarios - GoEnglish

## 📋 Descripción General

Este sistema proporciona una estructura completa de base de datos para gestionar todos los aspectos de los usuarios del campus virtual GoEnglish, incluyendo datos personales, académicos, laborales, de seguridad y del sistema.

## 🗂️ Estructura de la Base de Datos

### 1. **Datos Personales (tabla `usuarios` - campos adicionales)**

Campos agregados a la tabla existente de usuarios:

- `fecha_nacimiento` - Fecha de nacimiento del usuario
- `genero` - Género (masculino, femenino, otro, prefiero_no_decir)
- `nacionalidad` - Nacionalidad del usuario
- `estado_civil` - Estado civil (soltero, casado, divorciado, viudo, otro)
- `foto_perfil` - URL de la foto de perfil
- `documento_identidad` - Número de documento de identidad
- `tipo_documento` - Tipo de documento (DNI, CE, pasaporte, otro)
- `fecha_creacion_cuenta` - Fecha de creación de la cuenta
- `ultima_actualizacion` - Última actualización de datos

### 2. **Sistema y Seguridad**

#### `usuarios_sesiones`
Registro de sesiones activas e historial:
- Token de sesión
- Información del dispositivo, navegador, sistema operativo
- Dirección IP y ubicación
- Fechas de inicio, expiración y cierre

#### `usuarios_actividad`
Auditoría completa de actividad:
- Acciones realizadas por módulo
- Datos adicionales en formato JSON
- IP y fecha de cada acción

#### `usuarios_intentos_acceso`
Seguridad - registro de intentos de login:
- Intentos exitosos y fallidos
- Razón del fallo
- IP y fecha del intento

### 3. **Contactos de Emergencia**

#### `usuarios_contactos_emergencia`
- Nombre completo del contacto
- Parentesco
- Teléfonos principal y secundario
- Email y dirección
- Indicador de contacto principal

### 4. **Datos Académicos (Estudiantes)**

#### Campos adicionales en `estudiante_datos`:
- `tutor_asignado_id` - ID del docente tutor
- `fecha_ingreso` - Fecha de ingreso al instituto
- `turno` - Turno de estudio (mañana, tarde, noche)
- `modalidad` - Modalidad (presencial, virtual, híbrido)
- `condicion_academica` - Condición (regular, irregular, retirado, egresado)
- `becado` - Si tiene beca
- `tipo_beca` - Tipo de beca
- `porcentaje_beca` - Porcentaje de beca
- `observaciones` - Observaciones generales

#### `estudiante_historial_academico`
Historial por periodos académicos:
- Periodo académico (2024-I, 2024-II, etc.)
- Nivel/grado cursado
- Promedio del periodo
- Créditos aprobados y reprobados
- Porcentaje de asistencia
- Observaciones

#### `estudiante_certificaciones`
Certificaciones y logros:
- Nombre de la certificación
- Institución emisora
- Fechas de obtenención y vencimiento
- Nivel y código de verificación
- Archivo del certificado

### 5. **Datos Laborales (Docentes)**

#### Campos adicionales en `docente_datos`:
- `fecha_ingreso` - Fecha de ingreso a la institución
- `carga_horaria_semanal` - Horas semanales de trabajo
- `titulo_profesional` - Título profesional
- `universidad_egreso` - Universidad de egreso
- `numero_colegiatura` - Número de colegiatura
- `areas_investigacion` - Áreas de investigación
- `publicaciones` - Publicaciones académicas
- `idiomas_domina` - Idiomas que domina
- `nivel_ingles` - Nivel de inglés
- `disponibilidad_horaria` - Horarios disponibles
- `observaciones` - Observaciones generales

#### `docente_formacion_academica`
Historial educativo:
- Grado académico (bachiller, licenciado, magíster, doctor)
- Título obtenido
- Institución y país
- Fechas de inicio y fin
- Indicador si está en curso
- Certificado

#### `docente_experiencia_laboral`
Experiencia profesional:
- Institución y cargo
- Área o departamento
- Descripción de funciones
- Fechas de inicio y fin
- Indicador de trabajo actual
- Motivo de salida

#### `docente_capacitaciones`
Cursos y talleres:
- Nombre de la capacitación
- Institución organizadora
- Tipo (curso, taller, seminario, diplomado)
- Duración en horas
- Fechas y certificado

#### `docente_evaluaciones`
Evaluaciones de desempeño:
- Periodo de evaluación
- Tipo de evaluación (desempeño, estudiantes, pares, directiva)
- Puntajes obtenidos
- Calificación
- Fortalezas y áreas de mejora
- Comentarios del evaluador

### 6. **Datos Administrativos**

#### Campos adicionales en `admin_datos`:
- `area_responsabilidad` - Área de responsabilidad
- `supervisor_id` - ID del supervisor
- `extension_telefonica` - Extensión telefónica
- `horario_atencion` - Horario de atención
- `ubicacion_oficina` - Ubicación de oficina

#### `admin_responsabilidades`
Responsabilidades específicas:
- Nombre de la responsabilidad
- Descripción detallada
- Fechas de asignación y fin
- Indicador de activa
- Prioridad (baja, media, alta, crítica)

### 7. **Documentos y Archivos**

#### `usuarios_documentos`
Gestión de documentos adjuntos:
- Tipo de documento (DNI, certificados, contratos, CV, etc.)
- Nombre y descripción
- URL del archivo
- Tamaño y formato
- Indicadores de público y verificado
- Verificador y fecha

### 8. **Notificaciones y Comunicaciones**

#### `usuarios_notificaciones`
Sistema de notificaciones:
- Tipo (info, aviso, alerta, urgente)
- Título y mensaje
- Enlace relacionado
- Estado de lectura
- Indicador de importante
- Fecha de expiración

### 9. **Preferencias y Configuración**

#### `usuarios_preferencias`
Personalización del sistema:
- Tema (claro, oscuro, auto)
- Idioma preferido
- Zona horaria
- Preferencias de notificaciones (email, push, SMS)
- Privacidad del perfil
- Visibilidad de email y teléfono
- Configuración adicional en JSON

### 10. **Vistas SQL**

#### `vista_estudiantes_completa`
Vista consolidada con todos los datos de estudiantes incluyendo información del tutor.

#### `vista_docentes_completa`
Vista consolidada con todos los datos de docentes.

#### `vista_administradores_completa`
Vista consolidada con todos los datos de administradores incluyendo información del supervisor.

## 📦 Scripts SQL

### `datos_completos_usuarios.sql`
Script completo con todas las tablas y vistas (puede tener errores de duplicados si se ejecuta múltiples veces).

### `agregar_campos_adicionales.sql`
Script optimizado que agrega campos solo si no existen, usando procedimientos almacenados.

## 🚀 Instalación

### Opción 1: Script seguro (recomendado)
```bash
mysql -uroot -p instenglish_auth < agregar_campos_adicionales.sql
```

### Opción 2: Script completo
```bash
mysql -uroot -p instenglish_auth < datos_completos_usuarios.sql
```
⚠️ Nota: Este script puede generar errores si algunos campos ya existen.

## 📊 Datos de Ejemplo

El script incluye datos de ejemplo para:
- Estudiantes con historial académico
- Docentes con formación y experiencia
- Contactos de emergencia
- Preferencias de usuario

## 🔐 Seguridad y Privacidad

El sistema incluye:
- ✅ Auditoría completa de acciones
- ✅ Registro de sesiones e intentos de acceso
- ✅ Control de privacidad por usuario
- ✅ Gestión de documentos con verificación
- ✅ Notificaciones con niveles de urgencia

## 📱 Integración con el Frontend

El componente `ControlDatosUsuario.jsx` consume estos datos mediante el endpoint:
```
GET /usuarios/:id/datos-completos
```

Este endpoint retorna toda la información del usuario según su rol:
- **Estudiantes**: Datos académicos, cursos, certificaciones
- **Docentes**: Formación, experiencia, capacitaciones, evaluaciones
- **Administradores**: Cargo, responsabilidades, permisos

## 🎯 Características Principales

1. **Gestión Completa de Datos**
   - Personales, académicos, laborales
   - Documentos y certificaciones
   - Contactos de emergencia

2. **Seguridad y Auditoría**
   - Registro de sesiones
   - Historial de actividad
   - Intentos de acceso

3. **Comunicación**
   - Sistema de notificaciones
   - Preferencias personalizables

4. **Historial y Seguimiento**
   - Historial académico por periodos
   - Experiencia laboral documentada
   - Evaluaciones de desempeño

## 📝 Notas Importantes

- Todos los campos adicionales son **NULL** por defecto para no afectar registros existentes
- Las relaciones con `usuarios.id` usan `ON DELETE CASCADE` o `SET NULL` según corresponda
- Las vistas SQL facilitan consultas complejas sin joins manuales
- El sistema usa `UTF8MB4` para soportar caracteres especiales y emojis

## 🔄 Mantenimiento

Para agregar más campos en el futuro, usa el procedimiento:
```sql
CALL add_column_if_not_exists('nombre_tabla', 'nombre_columna', 'DEFINICION');
```

## 📧 Soporte

Para problemas o consultas sobre la estructura de datos, revisar:
- Scripts SQL en la carpeta `BD/`
- Documentación de endpoints en `backend/user-service/`
- Componente frontend en `frontend/src/components/ControlDatosUsuario.jsx`

---
**Versión**: 1.0  
**Fecha**: Noviembre 2025  
**Proyecto**: GoEnglish Campus Virtual
