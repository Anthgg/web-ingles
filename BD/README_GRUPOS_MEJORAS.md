# Mejoras de Grupos - Chat

## Descripción
Esta actualización agrega campos adicionales a la tabla `chat_rooms` para soportar grupos con descripción y foto.

## Nuevos Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `description` | TEXT NULL | Descripción del grupo (opcional) |
| `group_photo` | VARCHAR(512) NULL | URL de la foto del grupo (opcional) |
| `created_at` | DATETIME | Fecha de creación del grupo (automática) |
| `updated_at` | DATETIME NULL | Fecha de última actualización (automática) |

## Instalación

### Opción 1: Script Automático (Recomendado)
1. Ejecuta el archivo `INSTALAR_GRUPOS_MEJORAS.bat`
2. Ingresa la contraseña de MySQL cuando se solicite
3. Verifica que el script se ejecute sin errores

### Opción 2: Manual
1. Abre MySQL Workbench o tu cliente SQL preferido
2. Conecta a la base de datos `instenglish_chat`
3. Ejecuta el script `agregar_grupos_descripcion_foto.sql`

## Verificación

Después de la instalación, puedes verificar que las columnas se agregaron correctamente:

```sql
USE instenglish_chat;

DESCRIBE chat_rooms;
```

Deberías ver las columnas `description`, `group_photo`, `created_at` y `updated_at` en la tabla.

## Compatibilidad

✅ **Compatible con versión anterior**: Los campos son opcionales (NULL), por lo que los grupos existentes seguirán funcionando sin problemas.

✅ **Sin pérdida de datos**: Este script solo agrega columnas, no modifica ni elimina datos existentes.

## Uso en el Backend

Después de ejecutar el script, el backend podrá:

1. **Crear grupos con descripción y foto**:
```javascript
POST /rooms
{
  "name": "Grupo de Estudio",
  "type": "group",
  "description": "Grupo para practicar inglés",
  "groupPhoto": "/uploads/groups/photo.jpg",
  "participants": [...]
}
```

2. **Actualizar información del grupo**:
```javascript
PATCH /rooms/:roomId
{
  "name": "Nuevo nombre",
  "description": "Nueva descripción",
  "groupPhoto": "/uploads/groups/new-photo.jpg"
}
```

## Notas Técnicas

- Las fotos se subirán al servidor y se almacenará la URL relativa
- La descripción tiene un límite de 65,535 caracteres (TEXT)
- Las fechas `created_at` y `updated_at` se gestionan automáticamente
- Los campos son opcionales para mantener compatibilidad

## Troubleshooting

### Error: "Table doesn't exist"
- Verifica que la base de datos `instenglish_chat` existe
- Ejecuta primero el script de creación inicial de tablas

### Error: "Access denied"
- Verifica las credenciales de MySQL
- Asegúrate de tener permisos de ALTER TABLE

### Columnas ya existen
- El script es seguro para ejecutar múltiples veces
- No hay problema si las columnas ya están creadas
