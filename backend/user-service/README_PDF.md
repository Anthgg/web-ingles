# Reporte PDF de Usuarios - Características

## Diseño Profesional
El endpoint `/api/users/report.pdf` genera un reporte PDF con diseño profesional que incluye:

### Encabezado Institucional
- **Logo**: Imagen del colegio (logo.png)
- **Nombre**: Institución Educativa GoEnglish
- **Datos de contacto**:
  - RUC: 20601234567
  - Dirección: Av. Educación 123, Lima - Perú
  - Teléfono: (01) 234-5678
  - Email: contacto@goenglish.edu.pe

### Información del Reporte
- Fecha de emisión (formato: día mes año)
- Hora de generación
- Total de usuarios registrados

### Tabla de Usuarios
- **Encabezado con fondo oscuro** (#2c3e50)
- **Filas alternadas** (gris claro/blanco) para mejor legibilidad
- **Columnas**:
  - ID
  - NOMBRE
  - EMAIL
  - ROL (coloreado según tipo):
    - 🔴 Administrativo (rojo)
    - 🔵 Profesor (azul)
    - 🟢 Estudiante (verde)

### Características Adicionales
- **Paginación automática**: Nueva página cuando se llena
- **Re-encabezado**: El header de la tabla se repite en cada página
- **Pie de página**: 
  - Número de página (Página X de Y)
  - Copyright institucional
- **Formato**: A4
- **Márgenes**: 50px

## Personalización
Para personalizar los datos institucionales, edita las siguientes líneas en `app.js`:

```javascript
// Línea ~230
doc.fontSize(16).font('Helvetica-Bold')
   .text('Institución Educativa GoEnglish', 140, logoY + 5);

doc.fontSize(10).font('Helvetica')
   .text('RUC: 20601234567', 140, logoY + 25)
   .text('Dirección: Av. Educación 123, Lima - Perú', 140, logoY + 40)
   .text('Teléfono: (01) 234-5678 | Email: contacto@goenglish.edu.pe', 140, logoY + 55);
```

## Logo
El logo debe estar ubicado en:
```
frontend/public/logo.png
```

Dimensiones recomendadas: 300x300px (se redimensiona a 80px de ancho)

## Uso
```bash
# Desde el frontend
GET http://localhost:3002/api/users/report.pdf
Authorization: Bearer {admin_token}
```

El endpoint requiere permisos de **administrador** (`ensureAdmin` middleware).
