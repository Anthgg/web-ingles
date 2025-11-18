# Sistema de Foto de Perfil y Fecha de Inscripción

## Descripción

Este sistema agrega funcionalidades para:
1. **Almacenar fotos de perfil**: Las imágenes se guardan directamente en la base de datos
2. **Registrar fecha de inscripción**: Se guarda automáticamente cuando se crea un usuario

## Instalación

### 1. Ejecutar el script SQL

```bash
mysql -u root -p < BD/agregar_foto_fecha_inscripcion.sql
```

O desde MySQL Workbench/phpMyAdmin, ejecutar el archivo `agregar_foto_fecha_inscripcion.sql`

### 2. Reiniciar el servicio de usuarios

```bash
cd backend/run
node app.js
```

## Campos Agregados a la Tabla `usuarios`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `foto_perfil_imagen` | MEDIUMBLOB | Imagen de perfil almacenada en formato binario (hasta 16MB) |
| `foto_perfil_tipo` | VARCHAR(50) | Tipo MIME de la imagen (image/jpeg, image/png, etc.) |
| `fecha_inscripcion` | DATETIME | Fecha y hora en que el usuario se registró |

## API Endpoints

### 1. Subir Foto de Perfil

**POST** `/usuarios/:id/foto-perfil`

**Autorización**: El mismo usuario o admin

**Body**:
```json
{
  "foto": "base64_encoded_image_string",
  "tipo": "image/jpeg"
}
```

**Tipos permitidos**: 
- `image/jpeg`
- `image/jpg`
- `image/png`
- `image/gif`
- `image/webp`

**Tamaño máximo**: 5MB

**Respuesta exitosa**:
```json
{
  "message": "Foto de perfil actualizada correctamente",
  "tipo": "image/jpeg",
  "tamano": 245678
}
```

### 2. Obtener Foto de Perfil

**GET** `/usuarios/:id/foto-perfil`

**Autorización**: Público (cualquiera puede ver fotos de perfil)

**Respuesta**: Imagen binaria con headers apropiados

**Ejemplo de uso en HTML**:
```html
<img src="http://localhost:3002/usuarios/10/foto-perfil" alt="Foto de perfil" />
```

### 3. Eliminar Foto de Perfil

**DELETE** `/usuarios/:id/foto-perfil`

**Autorización**: El mismo usuario o admin

**Respuesta exitosa**:
```json
{
  "message": "Foto de perfil eliminada correctamente"
}
```

### 4. Obtener Datos Completos (incluye fecha de inscripción)

**GET** `/usuarios/:id/datos-completos`

**Autorización**: El mismo usuario o admin

**Respuesta incluye**:
```json
{
  "basicos": {
    "id": 10,
    "nombre": "Juan Pérez",
    "email": "juan@example.com",
    "fecha_inscripcion": "2025-11-07T15:30:00.000Z",
    "tiene_foto_perfil": 1,
    ...
  },
  ...
}
```

## Uso desde el Frontend (React)

### Subir Foto de Perfil

```javascript
const subirFotoPerfil = async (usuarioId, archivo) => {
  // Convertir archivo a base64
  const reader = new FileReader();
  reader.readAsDataURL(archivo);
  
  reader.onload = async () => {
    const base64 = reader.result.split(',')[1]; // Remover el prefijo data:image/...
    
    const response = await fetch(`http://localhost:3002/usuarios/${usuarioId}/foto-perfil`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        foto: base64,
        tipo: archivo.type
      })
    });
    
    if (!response.ok) throw new Error('Error al subir foto');
    
    const data = await response.json();
    console.log('Foto subida:', data);
  };
};

// Uso en un componente
<input 
  type="file" 
  accept="image/jpeg,image/png,image/gif,image/webp"
  onChange={(e) => {
    const archivo = e.target.files[0];
    if (archivo) {
      subirFotoPerfil(usuarioId, archivo);
    }
  }}
/>
```

### Mostrar Foto de Perfil

```javascript
const FotoPerfil = ({ usuarioId }) => {
  const [tieneFoto, setTieneFoto] = useState(false);
  
  useEffect(() => {
    // Verificar si el usuario tiene foto
    fetch(`http://localhost:3002/usuarios/${usuarioId}/foto-perfil`)
      .then(res => {
        setTieneFoto(res.ok);
      });
  }, [usuarioId]);
  
  return (
    <div>
      {tieneFoto ? (
        <img 
          src={`http://localhost:3002/usuarios/${usuarioId}/foto-perfil`}
          alt="Foto de perfil"
          style={{ width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover' }}
        />
      ) : (
        <div style={{ width: '150px', height: '150px', borderRadius: '50%', backgroundColor: '#ccc' }}>
          Sin foto
        </div>
      )}
    </div>
  );
};
```

## Fecha de Inscripción

### Al Crear un Usuario

La fecha de inscripción se registra automáticamente:

```javascript
const crearUsuario = async (datos) => {
  const response = await fetch('http://localhost:3002/usuarios', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      nombre: 'Juan Pérez',
      email: 'juan@example.com',
      password: 'password123',
      rol: 'estudiante'
    })
  });
  
  const data = await response.json();
  // data incluirá fecha_inscripcion automáticamente
  console.log('Usuario creado el:', data.fecha_inscripcion);
};
```

### Mostrar Tiempo desde la Inscripción

```javascript
const TiempoInscrito = ({ fechaInscripcion }) => {
  const calcularTiempo = () => {
    const inicio = new Date(fechaInscripcion);
    const ahora = new Date();
    const diferencia = ahora - inicio;
    
    const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
    const meses = Math.floor(dias / 30);
    const años = Math.floor(dias / 365);
    
    if (años > 0) return `${años} año${años > 1 ? 's' : ''}`;
    if (meses > 0) return `${meses} mes${meses > 1 ? 'es' : ''}`;
    return `${dias} día${dias > 1 ? 's' : ''}`;
  };
  
  return (
    <div>
      <strong>Inscrito hace:</strong> {calcularTiempo()}
    </div>
  );
};
```

## Migración de Datos Existentes

El script SQL automáticamente:
- Asigna la fecha de `created_at` como `fecha_inscripcion` para usuarios existentes
- Si no tienen `created_at`, usa la fecha actual
- Usuarios existentes sin foto tendrán `foto_perfil_imagen = NULL`

## Optimizaciones

- Las fotos se guardan en formato MEDIUMBLOB (hasta 16MB)
- Se incluye caché de 24 horas para las fotos (reduce carga del servidor)
- Índice en `fecha_inscripcion` para consultas rápidas
- Validación de tamaño (máximo 5MB por seguridad)
- Validación de tipos MIME permitidos

## Consideraciones

1. **Tamaño de la Base de Datos**: Guardar imágenes en la BD aumenta su tamaño. Para producción con muchos usuarios, considera usar almacenamiento externo (S3, Cloudinary, etc.)

2. **Backup**: Asegúrate de incluir las imágenes en tus backups de la base de datos

3. **Rendimiento**: Para mejor rendimiento con muchas imágenes, considera:
   - Usar CDN para servir las imágenes
   - Implementar thumbnails/miniaturas
   - Comprimir imágenes antes de guardarlas

4. **Alternativa URL**: El campo `foto_perfil` (VARCHAR) se mantiene para compatibilidad. Puedes seguir usando URLs externas si lo prefieres.

## Solución de Problemas

### Error: "La imagen es muy grande"
- Comprime la imagen antes de subirla
- Usa formatos más eficientes (WebP en lugar de PNG)

### Error: "Tipo de imagen no permitido"
- Verifica que el archivo sea JPEG, PNG, GIF o WebP
- Algunos navegadores pueden usar tipos MIME diferentes

### La imagen no se muestra
- Verifica que el usuario tenga foto: campo `tiene_foto_perfil = 1`
- Revisa la consola del navegador por errores CORS
- Verifica que el token de autorización sea válido

## Contacto

Para reportar problemas o sugerencias, contacta al equipo de desarrollo.
