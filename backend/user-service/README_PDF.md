# Reporte PDF de Usuarios - Características

## Diseño Profesional
El endpoint `/api/users/report.pdf` genera un reporte PDF con diseño profesional que incluye:

### Encabezado Institucional
- **Logo**: Imagen del colegio (logo.png)
- **Nombre**: I.E. Peruano Japonés 7213
- **Datos de contacto**:
  - RUC: 20503217032
  - Código Modular: 0588137 - UGEL 01
  - Dirección: Jr. Las Camelias 280, San Juan de Miraflores - Lima
  - Teléfono: (01) 276-3641
  - Email: direccion@ie7213.edu.pe

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
   .text('I.E. Peruano Japonés 7213', 140, logoY + 5);

doc.fontSize(10).font('Helvetica')
   .text('RUC: 20503217032', 140, logoY + 25)
   .text('Código Modular: 0588137 - UGEL 01', 140, logoY + 40)
   .text('Dirección: Jr. Las Camelias 280, San Juan de Miraflores - Lima', 140, logoY + 55)
   .text('Teléfono: (01) 276-3641 | Email: direccion@ie7213.edu.pe', 140, logoY + 70);
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
