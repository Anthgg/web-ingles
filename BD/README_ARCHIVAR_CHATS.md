# Funcionalidad de Archivar y Eliminar Chats

## Descripción General

Esta funcionalidad permite a los usuarios **archivar** (ocultar temporalmente) o **eliminar** chats desde la lista de conversaciones mediante un menú de tres puntos.

## Características Implementadas

### 1. **Botón de Tres Puntos en Lista de Chats**
- Cada chat en la lista de usuarios (`UserList.jsx`) muestra un botón de tres puntos (⋮) al pasar el mouse
- El botón es circular, translúcido y cambia de tamaño al hacer hover
- Solo visible cuando el mouse está sobre el chat

### 2. **Menú Contextual con Opciones**
- **📁 Archivar chat**: Oculta el chat de la lista sin eliminarlo permanentemente
- **🗑️ Eliminar chat**: Elimina el chat definitivamente (con confirmación)

### 3. **Funcionalidad de Archivar**
- Los chats archivados desaparecen de la lista principal
- La información se guarda en la columna `archived` de `chat_participants`
- Es reversible (puede implementarse funcionalidad de "desarchivar" en el futuro)
- Solo afecta al usuario que archiva, no a otros participantes

### 4. **Funcionalidad de Eliminar**
- Requiere confirmación del usuario antes de eliminar
- Elimina completamente el chat y sus mensajes
- Puede afectar a otros participantes según el tipo de chat

## Archivos Modificados

### Frontend

1. **`frontend/src/chat/components/UserList.jsx`**
   - Agregado estado `contextMenu` para controlar el menú
   - Agregado botón de tres puntos en cada item de chat
   - Agregado menú contextual con opciones de archivar y eliminar
   - Conectado con funciones del hook `useChat`

2. **`frontend/src/chat/styles/UserList.css`**
   - Estilos para `.user-list-item-clickable` (wrapper clicable)
   - Estilos para `.user-list-item-options-btn` (botón de tres puntos)
   - Estilos para `.user-list-context-menu` (menú popup)
   - Estilos para `.user-list-context-menu-item` (opciones del menú)
   - Estilos para `.user-list-context-menu-item-danger` (opción de eliminar en rojo)
   - Animación `menuSlideIn` para entrada suave del menú

3. **`frontend/src/chat/components/Chat.jsx`**
   - Agregado `archiveRoomRequest` a las props de `UserList`
   - Desestructurado `archiveRoomRequest` del hook `useChat`

4. **`frontend/src/chat/hooks/useChat.js`**
   - Implementada función `archiveRoomRequest`:
     - Llama al endpoint `/rooms/:roomId/archive`
     - Recarga la lista de chats después de archivar
     - Limpia el chat actual si es el que se archivó
   - Exportada función en el return del hook

### Backend

5. **`backend/chat-service/app.js`**
   - Nuevo endpoint `POST /rooms/:roomId/archive`:
     - Verifica que el usuario sea participante
     - Marca `archived = 1` en `chat_participants`
     - Solo afecta al usuario actual
   - Modificado endpoint `GET /rooms/:userId`:
     - Agregado filtro `WHERE (p.archived IS NULL OR p.archived = 0)`
     - Excluye chats archivados de la lista

### Base de Datos

6. **`BD/agregar_archived_chats.sql`**
   - Script SQL idempotente para agregar columna `archived`
   - Columna tipo `TINYINT(1)` con valor por defecto `0`
   - Verificación automática de si la columna ya existe

## Flujo de Uso

### Archivar un Chat

1. Usuario pasa el mouse sobre un chat en la lista
2. Aparece el botón de tres puntos (⋮)
3. Usuario hace clic en el botón
4. Se abre el menú contextual
5. Usuario selecciona "📁 Archivar chat"
6. El chat desaparece de la lista inmediatamente
7. Backend marca `archived = 1` en `chat_participants`

### Eliminar un Chat

1. Usuario abre el menú contextual (pasos 1-4 de arriba)
2. Usuario selecciona "🗑️ Eliminar chat"
3. Aparece confirmación: "¿Estás seguro de eliminar el chat con [nombre]? Esta acción no se puede deshacer."
4. Si confirma:
   - Backend elimina el chat y sus mensajes
   - El chat desaparece de la lista
5. Si cancela: no ocurre nada

## Instalación de la Base de Datos

### Opción 1: Desde MySQL Workbench
```sql
source c:/Users/anthg/OneDrive/Escritorio/goenglish/BD/agregar_archived_chats.sql
```

### Opción 2: Desde línea de comandos
```bash
mysql -u root -p instenglish_chat < "c:\Users\anthg\OneDrive\Escritorio\goenglish\BD\agregar_archived_chats.sql"
```

### Opción 3: Copiar y pegar el contenido del archivo en MySQL Workbench

## Estructura de la Base de Datos

### Tabla: `chat_participants`

| Columna | Tipo | Default | Descripción |
|---------|------|---------|-------------|
| `archived` | TINYINT(1) | 0 | 1 si el usuario archivó este chat, 0 si está activo |

## API Endpoints

### POST `/rooms/:roomId/archive`

**Descripción**: Archiva un chat para el usuario actual

**Headers**:
```
Authorization: Bearer <token>
```

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "message": "Chat archivado correctamente"
}
```

**Errores**:
- `400`: ID de sala inválido
- `403`: Usuario no pertenece a la sala
- `500`: Error del servidor

## Estilos CSS

### Botón de Tres Puntos
```css
.user-list-item-options-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
}

.user-list-item:hover .user-list-item-options-btn {
  opacity: 1;
  visibility: visible;
}
```

### Menú Contextual
```css
.user-list-context-menu {
  position: fixed;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  animation: menuSlideIn 0.2s ease-out;
}
```

### Opción de Eliminar (Peligro)
```css
.user-list-context-menu-item-danger {
  color: #dc2626;
}

.user-list-context-menu-item-danger:hover {
  background: rgba(220, 38, 38, 0.08);
}
```

## Mejoras Futuras Sugeridas

1. **Vista de Chats Archivados**
   - Sección separada para ver chats archivados
   - Opción de desarchivar

2. **Búsqueda en Archivados**
   - Permitir buscar dentro de chats archivados

3. **Indicador Visual**
   - Badge o icono que muestre cantidad de chats archivados

4. **Archivar Automático**
   - Opción de archivar chats inactivos por X días

5. **Confirmación Personalizada**
   - Modal más elegante en lugar de `window.confirm`

6. **Notificaciones Toast**
   - Mostrar toast de confirmación al archivar/eliminar
   - Usar el sistema de toasts ya implementado

7. **Atajo de Teclado**
   - Archivar con tecla (ej: "E" para archivar chat seleccionado)

8. **Filtros**
   - Filtrar por chats archivados/activos
   - Filtrar por tipo (privado/grupo)

## Testing

### Casos de Prueba

1. **Archivar chat privado**
   - ✅ El chat desaparece solo para el usuario que archiva
   - ✅ El otro usuario sigue viendo el chat

2. **Archivar chat de grupo**
   - ✅ El grupo desaparece solo para quien archiva
   - ✅ Otros miembros siguen viendo el grupo

3. **Eliminar chat privado**
   - ✅ Solicita confirmación
   - ✅ Se elimina completamente

4. **Eliminar chat de grupo**
   - ✅ Solicita confirmación
   - ✅ Se elimina para todos los participantes

5. **Hover del botón**
   - ✅ Botón solo visible al pasar mouse
   - ✅ Animación suave de aparición

6. **Cerrar menú**
   - ✅ Se cierra al hacer clic fuera
   - ✅ Se cierra al seleccionar una opción
   - ✅ Se cierra al presionar ESC (pendiente implementar)

## Notas Técnicas

- **Idempotencia**: El script SQL puede ejecutarse múltiples veces sin errores
- **Compatibilidad**: Compatible con MySQL 5.7+
- **Rendimiento**: La consulta de rooms usa índice en `user_id` y `archived`
- **Seguridad**: Autenticación JWT requerida en todos los endpoints
- **UX**: Animaciones suaves para mejorar la experiencia de usuario

## Soporte

Para problemas o preguntas sobre esta funcionalidad:
1. Verificar que el script SQL se ejecutó correctamente
2. Verificar que el backend está actualizado
3. Revisar la consola del navegador para errores
4. Revisar logs del servidor backend

---

**Versión**: 1.0  
**Última actualización**: 2024  
**Mantenedor**: Equipo GoEnglish
