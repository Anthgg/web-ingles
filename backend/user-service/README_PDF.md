# Reporte PDF de Usuarios - Características

## Diseño Profesional
El endpoint `/api/users/report.pdf` genera un reporte PDF con diseño profesional que incluye:

### Encabezado Institucional
- **Logo**: Imagen del colegio (logo.png)
- **Nombre**: I.E. N.º 7213 Peruano Japonés
- **Datos de contacto**:
  - Código Modular: 0874198
  - RUC: 20503217032
  - Nivel: Primaria y Secundaria
  - Tipo de gestión: Pública (Gobierno)
  - UGEL N.º 01 – San Juan de Miraflores (Lima Metropolitana)
  - Dirección: Av. 200 Millas s/n, Urb. Pachacámac (IV Etapa / Sector 1), Villa El Salvador, Lima
  - Teléfono: (01) 293-4417
  - Email: japones7213@hotmail.com
  - Localidad: Cerca al Parque Pachacámac, zona sur de Villa El Salvador

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
doc.fontSize(15).font('Helvetica-Bold')
   .text('I.E. N.º 7213 Peruano Japonés', 140, logoY + 5);

doc.fontSize(9).font('Helvetica')
   .text('Código Modular: 0874198 | RUC: 20503217032', 140, logoY + 23)
   .text('Nivel: Primaria y Secundaria | Gestión: Pública', 140, logoY + 36)
   .text('UGEL N.º 01 – San Juan de Miraflores (Lima Metropolitana)', 140, logoY + 49);

doc.fontSize(8).font('Helvetica')
   .text('Av. 200 Millas s/n, Urb. Pachacámac (IV Etapa / Sector 1), Villa El Salvador, Lima', 140, logoY + 62)
   .text('Teléfono: (01) 293-4417 | Email: japones7213@hotmail.com', 140, logoY + 74);
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
