# Control de Datos de Usuario - Sistema GoEnglish

## 📋 Descripción General

Módulo completo de gestión avanzada de información de usuarios del campus virtual educativo. Permite visualizar, editar y administrar datos extendidos de estudiantes, docentes y administradores con una interfaz moderna y responsive.

## ✨ Características Principales

### 🎯 Panel Principal
- **Dashboard interactivo** con estadísticas en tiempo real
- **Tarjetas visuales** mostrando totales de usuarios por rol
- **Filtros avanzados** por rol y búsqueda en tiempo real
- **Lista lateral** de usuarios con scroll personalizado
- **Modo oscuro** completamente compatible

### 👥 Visualización por Roles

#### 🎓 Estudiantes
- **Matrícula**: Número único de matrícula
- **Información académica**: Grado, sección, promedio general
- **Asistencia**: Porcentaje de asistencia
- **Cursos matriculados**: Lista completa con notas parciales y finales
- **Estado académico**: Regular, Irregular, Retirado, Egresado
- **Datos del tutor**: Nombre, teléfono y email del apoderado

#### 👨‍🏫 Docentes
- **Especialidad**: Área de enseñanza
- **Nivel académico**: Licenciado, Magíster, Doctor, Bachiller
- **Experiencia**: Años de experiencia docente
- **Tipo de contrato**: Nombrado, Contratado, Tiempo Completo/Parcial
- **Horario laboral**: Hora de entrada y salida
- **Cursos asignados**: Lista de cursos que enseña con detalles
- **Aulas y horarios**: Ubicación y horarios de cada curso

#### 🛡️ Administradores
- **Cargo**: Posición administrativa
- **Departamento**: Área de trabajo
- **Nivel de acceso**: Total, Alto, Medio, Básico
- **Permisos**: Tabla completa de permisos por módulo
- **Módulos habilitados**: Gestión granular de accesos (CRUD)
- **Último acceso**: Fecha y hora del último ingreso

### 🎨 Diseño y UX

- **Colores diferenciados por rol**:
  - 🔵 Azul para estudiantes
  - 🟢 Verde para docentes
  - ⚫ Gris para administradores
  
- **Secciones expandibles/colapsables**
- **Iconos descriptivos** para cada tipo de información
- **Transiciones suaves** y animaciones
- **Responsive design** adaptado a móviles y tablets
- **Scrollbar personalizado** para mejor experiencia

### ✏️ Edición de Datos

- **Modo edición** con validación visual
- **Actualización en tiempo real**
- **Guardado confirmado** con notificaciones
- **Cancelación segura** sin pérdida de datos

## 🗄️ Estructura de Base de Datos

### Tablas Creadas

1. **`estudiante_datos`**: Información académica de estudiantes
2. **`estudiante_cursos`**: Cursos matriculados por estudiantes
3. **`docente_datos`**: Información profesional de docentes
4. **`docente_cursos`**: Cursos asignados a docentes
5. **`admin_datos`**: Información administrativa
6. **`admin_modulos`**: Permisos y módulos de administradores

### Relaciones

- Todas las tablas tienen FK a `usuarios(id)` con `ON DELETE CASCADE`
- Índices optimizados para búsquedas rápidas
- Campos con valores por defecto razonables
- Timestamps automáticos (`created_at`, `updated_at`)

## 📁 Archivos del Proyecto

### Frontend
```
frontend/src/components/
├── ControlDatosUsuario.jsx     # Componente principal (700+ líneas)
└── UsuariosIncompletos.jsx     # Componente de control de datos
```

### Backend
```
backend/user-service/
└── app.js                       # Endpoints actualizados
    ├── GET /usuarios/:id/datos-completos
    ├── PUT /usuarios/:id
    └── Handler getDatosCompletosHandler
```

### Base de Datos
```
BD/
├── agregar_datos_usuario_extendidos.sql   # Script completo
└── README_CONTROL_DATOS_USUARIO.md        # Este archivo
```

## 🚀 Instalación

### 1. Ejecutar Script SQL

**Método A - MySQL Workbench:**
```sql
1. Abrir MySQL Workbench
2. Conectar a la base de datos
3. Abrir: BD/agregar_datos_usuario_extendidos.sql
4. Ejecutar script completo (Ctrl + Shift + Enter)
```

**Método B - Línea de comandos:**
```cmd
cd BD
mysql -uroot -p instenglish_auth < agregar_datos_usuario_extendidos.sql
```

### 2. Verificar Instalación

```sql
USE instenglish_auth;

-- Verificar tablas creadas
SHOW TABLES LIKE '%datos%';
SHOW TABLES LIKE '%cursos%';
SHOW TABLES LIKE '%modulos%';

-- Ver datos de ejemplo
SELECT * FROM estudiante_datos;
SELECT * FROM docente_datos;
SELECT * FROM admin_datos;
```

### 3. Reiniciar Backend

```bash
# Detener backend (Ctrl+C en la terminal donde corre)
cd backend/run
node app.js
```

### 4. Acceder al Módulo

1. Iniciar sesión como **administrador**
2. Ir al menú lateral → **Sistema** → **Control de Datos Usuario**
3. Seleccionar un usuario de la lista
4. Ver información completa en el panel derecho

## 🔧 API Endpoints

### GET `/usuarios/:id/datos-completos`

Obtiene toda la información de un usuario según su rol.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Response:**
```json
{
  "basicos": {
    "id": 1,
    "nombre": "Usuario",
    "email": "email@example.com",
    "rol": "estudiante",
    "codigo_estudiante": "EST-0001",
    "dni": "12345678",
    "telefono": "999999999"
  },
  "estudiante": {
    "matricula": "MAT-00001",
    "grado": "5to Secundaria",
    "seccion": "A",
    "promedio_general": 15.50,
    "porcentaje_asistencia": 92.50,
    "estado_academico": "Regular"
  },
  "cursos": [
    {
      "curso_nombre": "Inglés Avanzado I",
      "curso_codigo": "ING-501",
      "creditos": 4,
      "nota_parcial": 16.5,
      "estado_curso": "En curso"
    }
  ]
}
```

### PUT `/usuarios/:id`

Actualiza datos básicos del usuario.

**Body:**
```json
{
  "nombre": "Nuevo Nombre",
  "email": "nuevo@email.com",
  "rol": "estudiante",
  "activo": true
}
```

## 📊 Datos de Ejemplo Insertados

### Estudiantes (3)
- ID 7: Jesus abthony - 5to Secundaria A - Promedio 15.50 - 92.5% asistencia
- ID 11: rodri - 4to Secundaria B - Promedio 14.80 - 88.3% asistencia
- ID 16: perro - 3ro Secundaria A - Promedio 16.20 - 95.0% asistencia

### Docentes (3)
- ID 12: Dayanna - Lenguas Extranjeras, Magíster, 8 años exp.
- ID 13: ff - Educación Secundaria, Licenciado, 5 años exp.
- ID 14: roberto - Matemáticas, Doctor, 12 años exp.

### Administradores (2)
- ID 1: admin - Director Administrativo - Nivel Total
- ID 10: Anthonyd - Administrador de Sistema - Nivel Total

### Cursos Insertados
- 3 cursos para estudiantes
- 2 cursos para docentes
- 9 módulos de permisos para administradores

## 🎯 Funcionalidades Avanzadas

### Secciones Expandibles
Cada sección de información puede expandirse/colapsarse:
- ✅ Datos Básicos
- ✅ Información Personal
- ✅ Datos Académicos/Profesionales/Administrativos
- ✅ Cursos/Módulos

### Validación Visual
- ✅ Campos obligatorios marcados
- ✅ Validación en tiempo real
- ✅ Mensajes de error claros
- ✅ Confirmación de guardado

### Búsqueda y Filtros
- 🔍 Búsqueda por nombre, email o código
- 🎯 Filtro por rol (todos, estudiante, docente, admin)
- ⚡ Resultados en tiempo real
- 📊 Contador de resultados

## 🎨 Personalización

### Colores por Rol

```javascript
const obtenerColorRol = (rol) => {
  if (rol === 'estudiante') return 'bg-blue-500 text-white';
  if (rol === 'profesor' || rol === 'docente') return 'bg-green-500 text-white';
  if (rol === 'admin' || rol === 'administrativo') return 'bg-gray-500 text-white';
};
```

### Iconos Personalizados

- 🎓 `FaUserGraduate` - Estudiantes
- 👨‍🏫 `FaChalkboardTeacher` - Docentes
- 🛡️ `FaUserShield` - Administradores
- 📚 `FaBook` - Cursos
- 📊 `FaChartLine` - Estadísticas
- ⚙️ `FaCog` - Configuración

## 🔒 Seguridad

- ✅ Autenticación con JWT requerida
- ✅ Solo administradores pueden acceder
- ✅ Validación de permisos en backend
- ✅ Sanitización de queries (prepared statements)
- ✅ CASCADE DELETE para integridad referencial

## 📱 Responsive Design

### Breakpoints
- **Desktop**: 1024px+
  - Lista lateral fija (33%)
  - Panel de detalles (67%)
  
- **Tablet**: 768px - 1023px
  - Grid adaptativo
  - Secciones apiladas
  
- **Mobile**: < 768px
  - Vista de una columna
  - Menú colapsable
  - Táctil optimizado

## 🐛 Solución de Problemas

### Error: "Usuario no encontrado"
- Verificar que el usuario exista en la tabla `usuarios`
- Comprobar que el ID sea correcto

### No se muestran datos extendidos
- Ejecutar el procedimiento: `CALL obtener_datos_completos_usuario(1);`
- Verificar que las tablas extendidas tengan datos

### Error al guardar cambios
- Verificar token JWT válido
- Comprobar permisos de administrador
- Ver logs del backend

## 📈 Mejoras Futuras

- [ ] Exportar datos a PDF/Excel
- [ ] Importación masiva de datos
- [ ] Gráficos y estadísticas avanzadas
- [ ] Historial de cambios
- [ ] Notificaciones en tiempo real
- [ ] Integración con sistema de mensajería
- [ ] Comparativas entre usuarios
- [ ] Reportes personalizados

## 📞 Soporte Técnico

### Logs Backend
```bash
# Ver logs en tiempo real
cd backend/run
node app.js
# Los logs se muestran en consola
```

### Verificar Estado
```sql
-- Usuarios por rol
SELECT rol, COUNT(*) as total 
FROM usuarios 
GROUP BY rol;

-- Datos extendidos
SELECT 
  'Estudiantes' as Tipo, COUNT(*) as Total FROM estudiante_datos
UNION ALL
SELECT 
  'Docentes' as Tipo, COUNT(*) as Total FROM docente_datos
UNION ALL
SELECT 
  'Administradores' as Tipo, COUNT(*) as Total FROM admin_datos;
```

## 🎓 Casos de Uso

### 1. Consultar historial académico de estudiante
1. Buscar estudiante por nombre o código
2. Seleccionar de la lista
3. Ver promedio, asistencia y cursos matriculados

### 2. Revisar carga académica de docente
1. Filtrar por rol "docente"
2. Seleccionar docente
3. Ver cursos asignados con horarios y aulas

### 3. Gestionar permisos de administrador
1. Filtrar por rol "admin"
2. Seleccionar administrador
3. Ver tabla de permisos por módulo

### 4. Actualizar información de usuario
1. Seleccionar usuario
2. Clic en botón "Editar"
3. Modificar campos deseados
4. Guardar cambios

## ✅ Checklist de Implementación

- [x] Script SQL completo
- [x] Componente React principal
- [x] Endpoint backend `/datos-completos`
- [x] Integración con dashboard
- [x] Datos de ejemplo
- [x] Modo oscuro
- [x] Responsive design
- [x] Validación de formularios
- [x] Manejo de errores
- [x] Documentación completa

---

## 📝 Changelog

### v1.0.0 (2025-11-07)
- ✨ Lanzamiento inicial del módulo
- 📊 6 tablas nuevas en base de datos
- 🎨 Interfaz moderna y responsive
- 🔐 Seguridad con JWT
- 📱 Soporte para móviles
- 🌙 Modo oscuro completo

---

**GoEnglish** - Sistema de Gestión Educativa  
**Módulo**: Control de Datos de Usuario  
**Versión**: 1.0.0  
**Fecha**: 7 de Noviembre, 2025
