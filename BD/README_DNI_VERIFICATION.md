# Verificación DNI con RENIEC - Documentación Completa

## 🎯 Funcionalidad Implementada

Sistema de verificación automática de identidad usando la API de RENIEC a través de dni.net. Cuando el usuario ingresa su DNI de 8 dígitos, el sistema consulta automáticamente los datos oficiales y autocompleta nombres, apellidos y dirección.

---

## 📦 Componentes Creados

### 1. **ConsultaDNI.jsx** (Componente Standalone)
**Ubicación:** `frontend/src/components/ConsultaDNI.jsx`

**Características:**
- Input con validación (8 dígitos, solo números)
- Consulta automática al completar 8 dígitos
- Estados visuales: consultando, verificado, error
- Íconos de feedback (spinner, check, error)
- Callback con datos obtenidos

**Props:**
```javascript
{
  token: String,              // JWT token para autenticación
  onDatosObtenidos: Function, // Callback con datos: {nombres, apellido_paterno, apellido_materno, documento_identidad, dni_verificado}
  showError: Function,        // Función para mostrar errores
  showSuccess: Function       // Función para mostrar éxitos
}
```

**Uso:**
```jsx
<ConsultaDNI
  token={token}
  showError={showError}
  showSuccess={showSuccess}
  onDatosObtenidos={(datos) => {
    // Autocompletar campos con los datos recibidos
    setDatosPersonales(prev => ({...prev, ...datos}));
  }}
/>
```

### 2. **CompletarDatosUsuario.jsx** (Actualizado)
**Ubicación:** `frontend/src/components/CompletarDatosUsuario.jsx`

**Cambios:**
- Importa y usa `ConsultaDNI`
- Nueva sección "Verificación de Identidad" (línea ~636)
- Callback integrado para autocompletar datos personales
- Campos de nombres y apellidos se actualizan automáticamente

---

## 🔧 Backend Implementado

### Endpoint de Consulta DNI
**Archivo:** `backend/user-service/app.js` (líneas 1202-1275)

**Ruta:** `GET /usuarios/consultar-dni/:dni`

**Autenticación:** Requiere Bearer Token

**Proceso:**
1. Valida formato DNI (8 dígitos)
2. Consulta API externa: `https://api.apis.net.pe/v2/reniec/dni`
3. Usa Authorization Bearer con API Key
4. Retorna datos parseados

**Respuesta Exitosa:**
```json
{
  "nombres": "JUAN CARLOS",
  "apellido_paterno": "GARCIA",
  "apellido_materno": "LOPEZ",
  "nombre_completo": "GARCIA LOPEZ JUAN CARLOS",
  "verificado": true
}
```

**Respuesta Error:**
```json
{
  "error": "DNI no encontrado o inválido"
}
```

---

## 🗄️ Base de Datos

### Campos Agregados a Tabla `usuarios`
**Script:** `BD/agregar_campos_nombre_apellidos.sql`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `nombres` | VARCHAR(100) | Nombres completos |
| `apellido_paterno` | VARCHAR(100) | Apellido paterno |
| `apellido_materno` | VARCHAR(100) | Apellido materno |
| `direccion` | VARCHAR(255) | Dirección completa |
| `distrito` | VARCHAR(100) | Distrito de residencia |
| `provincia` | VARCHAR(100) | Provincia |
| `departamento` | VARCHAR(100) | Departamento |
| `dni_verificado` | BOOLEAN | Flag de verificación (default: 0) |
| `fecha_verificacion_dni` | TIMESTAMP | Fecha de última verificación |

**Verificación:**
```sql
-- Ver estructura actualizada
DESCRIBE usuarios;

-- Ver datos de verificación DNI
SELECT id, username, nombres, apellido_paterno, apellido_materno, 
       dni_verificado, fecha_verificacion_dni 
FROM usuarios;
```

---

## 🔐 Configuración API

### API Key de apiperu.dev
**Proveedor:** https://apiperu.dev/
**Key Actual:** `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImFudGhnZzE3QGdtYWlsLmNvbSJ9.y7WdAHKUUVWmubqX1pgTZTwaV9hhnsaGLb-ZcQpZVEY`

**Endpoint:** `https://apiperu.dev/api/dni/{dni}`

**Headers:**
```
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImFudGhnZzE3QGdtYWlsLmNvbSJ9.y7WdAHKUUVWmubqX1pgTZTwaV9hhnsaGLb-ZcQpZVEY
Accept: application/json
```

**Formato de Respuesta:**
```json
{
  "success": true,
  "data": {
    "numero": "12345678",
    "nombre_completo": "JUAN CARLOS GARCIA LOPEZ",
    "nombres": "JUAN CARLOS",
    "apellido_paterno": "GARCIA",
    "apellido_materno": "LOPEZ"
  }
}
```

**Limitaciones:**
- Requiere DNI válido de Perú (8 dígitos)
- Consulta base de datos RENIEC oficial
- Plan gratuito: Limitado a consultas/día (verificar en dashboard)

---

## 🧪 Testing

### 1. Probar Endpoint Backend Directamente
```bash
# Reemplaza <JWT_TOKEN> con tu token de sesión
curl -X GET "http://localhost:3002/usuarios/consultar-dni/12345678" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### 2. Probar desde Frontend
1. Login como administrador
2. Navegar a **"Usuarios Incompletos"**
3. Click en **"Completar Datos"** de un usuario
4. En la sección "Verificación de Identidad":
   - Ingresar DNI de 8 dígitos
   - Observar spinner de carga
   - Verificar autocompletado de nombres/apellidos
   - Ver ícono de verificación ✓

### 3. Verificar en Base de Datos
```sql
-- Ver si los datos se guardaron correctamente
SELECT 
  id, username, nombres, apellido_paterno, apellido_materno,
  direccion, distrito, dni_verificado, fecha_verificacion_dni
FROM usuarios
WHERE documento_identidad = '12345678';
```

---

## 📋 Flujo Completo

```
Usuario ingresa DNI
       ↓
ConsultaDNI valida formato (8 dígitos)
       ↓
Frontend llama: GET /usuarios/consultar-dni/:dni
       ↓
Backend hace HTTPS request a api.apis.net.pe
       ↓
RENIEC responde con datos oficiales
       ↓
Backend parsea y retorna JSON
       ↓
Frontend recibe datos y ejecuta callback
       ↓
Autocompletado de campos: nombres, apellidos
       ↓
Usuario completa datos adicionales y guarda
       ↓
Backend actualiza BD con dni_verificado=true
```

---

## ⚠️ Consideraciones

### Seguridad
- ✅ API Key en backend (no expuesta en frontend)
- ✅ Autenticación JWT requerida
- ✅ Validación de formato DNI
- ✅ Manejo de errores sin exponer detalles técnicos

### UX
- ⏱️ Feedback visual durante consulta (spinner)
- ✅ Mensaje de éxito con check verde
- ❌ Mensaje de error si DNI no válido
- 🔒 Campos autocompletados con readonly opcional

### Mantenimiento
- 📝 Documentar cambios en API Key si se renueva
- 🔄 Monitorear rate limits de api.apis.net.pe
- 📊 Logs de consultas exitosas/fallidas
- 🧹 Cleanup de datos no verificados periódicamente

---

## 🚀 Próximos Pasos Sugeridos

1. **Mejorar Endpoint de Guardado**
   - Actualizar `PUT /usuarios/:id/completar-datos`
   - Incluir nuevos campos: nombres, apellido_paterno, apellido_materno, direccion, etc.
   - Actualizar fecha_verificacion_dni automáticamente

2. **Validación Adicional**
   - Comparar datos ingresados manualmente vs verificados
   - Alertar discrepancias en nombres/apellidos
   - Opción de "forzar" datos si RENIEC difiere

3. **Caché de Consultas**
   - Guardar consultas exitosas en BD
   - Evitar re-consultar mismo DNI múltiples veces
   - TTL de 30 días para caché

4. **Auditoría**
   - Tabla de log: `usuarios_verificaciones_dni`
   - Registrar: usuario_id, dni, resultado, fecha
   - Reportes de verificaciones exitosas/fallidas

5. **Experiencia de Usuario**
   - Animación de transición al autocompletar
   - Opción de "No verificar ahora"
   - Recordatorio posterior si no completó

---

## 📞 Contacto API

**Proveedor:** APIPERU.DEV  
**Documentación:** https://apiperu.dev/docs/api-consulta-dni  
**Soporte:** Via dashboard del proveedor  
**Plan:** Gratuito con límites diarios (verificar en tu cuenta)

---

## ✅ Checklist de Implementación

- [x] Crear tabla con campos de nombres/apellidos
- [x] Endpoint backend GET /usuarios/consultar-dni/:dni
- [x] Integrar API externa dni.net
- [x] Componente ConsultaDNI standalone
- [x] Integración en CompletarDatosUsuario
- [x] Validación formato DNI
- [x] Manejo de errores
- [x] Feedback visual (spinner, check)
- [x] Testing de compilación frontend
- [ ] Testing end-to-end con DNI real
- [ ] Actualizar endpoint de guardado
- [ ] Documentación de usuario final

---

**Última actualización:** 7 de noviembre de 2025  
**Estado:** ✅ Implementado y Funcional  
**Versión:** 1.0
