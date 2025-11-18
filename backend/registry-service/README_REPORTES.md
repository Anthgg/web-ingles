# Sistema de Reportes PDF Dinámico

## 📋 Descripción

Sistema centralizado y extensible para generar reportes PDF de cualquier módulo del campus. Los reportes se generan automáticamente con diseño institucional profesional.

## ✨ Características

### 🎨 Diseño Profesional
- Logo institucional del colegio
- Encabezado con información completa:
  - I.E. N.º 7213 Peruano Japonés
  - Código Modular: 0874198
  - RUC: 20503217032
  - Dirección: Av. 200 Millas s/n Villa El Salvador
- Colores institucionales
- Paginación automática
- Pie de página con número de páginas

### 📊 Módulos Disponibles

El sistema incluye reportes para los siguientes módulos:

1. **👥 Usuarios** (`/api/reports/usuarios.pdf`)
   - Listado completo de usuarios del sistema
   - Colores diferenciados por rol (admin, profesor, estudiante)
   - Columnas: ID, Nombre, Email, Rol, Estado

2. **📅 Asistencias** (`/api/reports/asistencias.pdf`)
   - Registro de asistencias de estudiantes
   - Columnas: ID, ID Estudiante, ID Clase, Fecha, Estado, Notas

3. **📝 Calificaciones** (`/api/reports/calificaciones.pdf`)
   - Calificaciones de estudiantes
   - Columnas: ID, ID Estudiante, ID Asignación, Nota, Retroalimentación

4. **📚 Clases** (`/api/reports/clases.pdf`)
   - Materias y cursos disponibles
   - Columnas: ID, Nombre, Descripción

5. **🔗 Asignaciones** (`/api/reports/asignaciones.pdf`)
   - Asignación de estudiantes a clases
   - Columnas: ID, ID Estudiante, ID Clase, Fecha Asignación

### 🔐 Seguridad
- Requiere autenticación JWT
- Solo administradores pueden generar reportes
- Registra quién generó cada reporte

### 📄 Metadata Automática
Cada reporte incluye:
- Fecha y hora de generación
- Total de registros
- Nombre del usuario que lo generó
- Rol del usuario

## 🚀 Uso

### Backend - Endpoints

#### Obtener lista de módulos disponibles
```http
GET http://localhost:3011/api/reports/modules
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "modules": [
    {
      "id": "usuarios",
      "name": "Usuarios",
      "endpoint": "/api/reports/usuarios.pdf"
    },
    {
      "id": "asistencias",
      "name": "Asistencias",
      "endpoint": "/api/reports/asistencias.pdf"
    }
    // ... más módulos
  ]
}
```

#### Generar reporte PDF
```http
GET http://localhost:3011/api/reports/{module}.pdf
Authorization: Bearer {token}
```

Ejemplo:
```http
GET http://localhost:3011/api/reports/usuarios.pdf
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Frontend - Componente

El componente `ReportesPanel` proporciona una interfaz amigable para:
- Ver todos los módulos disponibles
- Seleccionar el tipo de reporte
- Descargar el PDF con un solo clic
- Ver información sobre el contenido del reporte

**Ubicación:** `frontend/src/components/ReportesPanel.jsx`

**Uso en dashboard:**
```jsx
import ReportesPanel from '../components/ReportesPanel';

// En el render:
{activeModule === 'reportes' && <ReportesPanel />}
```

## 🔧 Agregar Nuevos Módulos

Para agregar un nuevo módulo de reporte, edita el objeto `REPORT_MODULES` en `backend/registry-service/app.js`:

```javascript
const REPORT_MODULES = {
  // ... módulos existentes
  
  nuevo_modulo: {
    name: 'Nombre del Módulo',
    endpoint: 'http://localhost:PUERTO/ruta',
    headers: (token) => ({ Authorization: `Bearer ${token}` }),
    dataKey: null, // o la key si los datos están anidados
    columns: [
      { key: 'id', label: 'ID', width: 40 },
      { key: 'campo1', label: 'Campo 1', width: 100 },
      { key: 'campo2', label: 'Campo 2', width: 150 }
    ]
  }
};
```

**¡Eso es todo!** El nuevo módulo aparecerá automáticamente en:
- El endpoint `/api/reports/modules`
- La interfaz de usuario
- Estará disponible en `/api/reports/nuevo_modulo.pdf`

## 📦 Dependencias

### Backend
```json
{
  "pdfkit": "^0.13.0",
  "axios": "^1.x.x"
}
```

### Instalación
```bash
cd backend/registry-service
npm install pdfkit axios
```

## 🎨 Personalización

### Colores por Rol (Módulo Usuarios)
Puedes personalizar los colores de los roles editando `roleColors` en la configuración del módulo:

```javascript
roleColors: {
  admin: '#e74c3c',        // Rojo
  profesor: '#3498db',     // Azul
  estudiante: '#2ecc71',   // Verde
  administrativo: '#9b59b6' // Morado
}
```

### Diseño Institucional
Para cambiar el logo o la información institucional, edita la función `addInstitutionalHeader`:

```javascript
function addInstitutionalHeader(doc, title, logoPath) {
  // Personaliza aquí el encabezado
  doc.fontSize(16).text('TU INSTITUCIÓN');
  // ...
}
```

## 🔒 Seguridad y Permisos

El sistema utiliza middleware RBAC:
- `rbac.ensureAuthenticated`: Verifica que el usuario esté autenticado
- `rbac.ensureAdmin`: Verifica que el usuario sea administrador

Para permitir que otros roles generen reportes, modifica los middlewares:

```javascript
app.get(
  '/api/reports/:module.pdf',
  rbac.ensureAuthenticated,
  // Remover rbac.ensureAdmin para permitir a todos los usuarios autenticados
  async (req, res) => { ... }
);
```

## 📊 Ejemplo de Salida

Cada PDF incluye:

```
┌─────────────────────────────────────────────────┐
│  [LOGO]    I.E. N.º 7213 Peruano Japonés       │
│            Código Modular: 0874198               │
│            RUC: 20503217032                      │
│            Av. 200 Millas s/n                    │
│                                                  │
│  Reporte: Usuarios                              │
├─────────────────────────────────────────────────┤
│  Fecha: 26/10/2025    Total: 45 usuarios       │
│  Generado por: Juan Pérez (admin)              │
├────┬────────────┬─────────────────┬──────┬─────┤
│ ID │   Nombre   │      Email      │ Rol  │ Est │
├────┼────────────┼─────────────────┼──────┼─────┤
│  1 │ Juan P.    │ juan@inst.edu   │admin │ act │
│  2 │ María G.   │ maria@inst.edu  │prof  │ act │
│ .. │ ...        │ ...             │ ...  │ ... │
└────┴────────────┴─────────────────┴──────┴─────┘
                    Página 1 de 3
```

## 🐛 Solución de Problemas

### El reporte está vacío
- Verifica que el endpoint del módulo devuelva datos
- Revisa los permisos JWT en el servicio fuente
- Comprueba que `dataKey` esté configurado correctamente

### El logo no aparece
- Verifica que el archivo exista en `frontend/public/logo.png`
- Comprueba los permisos de lectura del archivo

### Error 401 o 403
- Verifica que el token JWT sea válido
- Confirma que el usuario tenga rol de administrador
- Revisa que el middleware de autenticación esté funcionando

## 📝 Logs

Los errores se registran con el logger:
```javascript
logger.error({ error: error.message }, 'Error generando reporte PDF');
```

Revisa los logs del registry-service para debugging.

## 🚀 Futuras Mejoras

Ideas para extender el sistema:
- [ ] Filtros adicionales (rango de fechas, búsqueda)
- [ ] Exportación a Excel/CSV
- [ ] Gráficos y estadísticas en PDF
- [ ] Reportes programados (envío automático)
- [ ] Templates personalizables por institución
- [ ] Reportes con imágenes y fotos de estudiantes
- [ ] Firma digital en reportes oficiales

## 📞 Soporte

Para problemas o sugerencias, contacta al equipo de desarrollo del campus.

---

**Versión:** 1.0.0  
**Última actualización:** Octubre 2025  
**Mantenedor:** Campus Development Team
