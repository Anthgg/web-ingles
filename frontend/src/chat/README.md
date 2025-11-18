# Sistema de Mensajería - GoEnglish

Sistema de chat completo construido desde cero, integrado con el backend existente.

## 📁 Estructura del Proyecto

```
frontend/src/chat/
├── components/
│   ├── Chat.jsx              # Componente principal
│   ├── ChatHeader.jsx        # Header con info del usuario/sala
│   ├── UserList.jsx          # Lista de conversaciones
│   ├── MessageList.jsx       # Lista de mensajes
│   ├── MessageInput.jsx      # Input para enviar mensajes
│   └── UserInfo.jsx          # Panel lateral con info
├── hooks/
│   └── useChat.js            # Hook principal (WebSocket + API)
├── styles/
│   ├── Chat.css
│   ├── ChatHeader.css
│   ├── UserList.css
│   ├── MessageList.css
│   ├── MessageInput.css
│   └── UserInfo.css
├── utils/
│   └── helpers.js            # Funciones auxiliares
└── index.js                  # Exportaciones
```

## 🚀 Instalación y Uso

### 1. Importar el componente

```jsx
import { Chat } from './chat';

function App() {
  return <Chat />;
}
```

### 2. Asegurar autenticación

El componente requiere que estén disponibles en `localStorage`:
- `token`: Token JWT de autenticación
- `userId`: ID del usuario autenticado

### 3. Backend debe estar corriendo

El chat se conecta a `http://localhost:3010` (chat-service)

## 🎯 Funcionalidades

### ✅ Mensajería en tiempo real
- WebSocket con socket.io
- Mensajes instantáneos
- Estado de conexión visible
- Reconexión automática

### ✅ Gestión de conversaciones
- Crear chats directos
- Buscar conversaciones
- Ver último mensaje
- Timestamp relativo

### ✅ Envío de mensajes
- Texto con Enter (Shift+Enter para nueva línea)
- Imágenes (preview antes de enviar)
- Videos
- Documentos (PDF, Word, Excel, etc.)
- Múltiples archivos (hasta 5 por mensaje)

### ✅ Gestión de mensajes
- Editar mensajes (10 minutos)
- Eliminar para mí
- Eliminar para todos (10 minutos)
- Indicador de editado
- Mensajes agrupados por fecha

### ✅ Interfaz adaptativa
- **Desktop**: 3 columnas (usuarios | chat | info)
- **Móvil**: Navegación tipo WhatsApp/Telegram
  - Vista lista → Vista chat → Vista info
  - Botones de volver en cada vista
  - Sin overlays ni elementos flotantes

### ✅ Panel de información
- Datos del usuario/grupo
- Lista de participantes
- Archivos compartidos organizados:
  - Imágenes (grid)
  - Videos (lista)
  - Documentos (lista)

## 🔌 Integración con Backend

### Endpoints REST usados:

```javascript
GET  /rooms/:userId              // Obtener salas del usuario
GET  /contacts                   // Obtener contactos disponibles
GET  /messages/:roomId           // Obtener mensajes de una sala
POST /rooms                      // Crear nueva sala/chat
POST /rooms/:roomId/attachments  // Subir archivos
PATCH /messages/:messageId       // Editar mensaje
POST /messages/:messageId/delete // Eliminar mensaje
```

### Eventos WebSocket:

**Emisiones del cliente:**
```javascript
socket.emit('join_room', roomId)
socket.emit('leave_room', roomId)
socket.emit('send_message', messageData)
```

**Eventos recibidos:**
```javascript
socket.on('receive_message', message)
socket.on('message_updated', message)
socket.on('message_deleted', data)
socket.on('room_error', error)
```

## 🎨 Diseño y UX

### Desktop (≥768px)
- Layout de 3 columnas
- Lista de usuarios siempre visible
- Panel de info toggleable
- Header fijo sin overlaps

### Móvil (<768px)
- Navegación por pantallas completas
- Transiciones suaves entre vistas
- Sin z-index conflictivos
- Scroll natural sin bloqueos

### Colores principales
- Verde primario: `#10b981` (botones, activo)
- Verde WhatsApp header: `#075e54`
- Fondo chat: `#e5ddd5` (estilo WhatsApp)
- Burbuja propia: `#dcf8c6`
- Burbuja otro: `#ffffff`

## 📱 Responsive Breakpoints

```css
/* Móvil */
@media (max-width: 768px) { ... }

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) { ... }

/* Desktop */
@media (min-width: 1025px) { ... }

/* Desktop grande */
@media (min-width: 1400px) { ... }
```

## 🛠️ Funciones Auxiliares (helpers.js)

- `formatMessageDate()` - Formato de fecha (Hoy, Ayer, DD/MM/YYYY)
- `formatMessageTime()` - Hora (HH:MM)
- `formatLastSeen()` - Tiempo relativo (hace 5m, hace 1h)
- `formatFileSize()` - Tamaño de archivo (KB, MB, GB)
- `getUserInitials()` - Iniciales del usuario
- `getAvatarColor()` - Color de avatar basado en nombre
- `groupMessagesByDate()` - Agrupar mensajes por fecha
- `isImageFile()` / `isVideoFile()` - Detectar tipo de archivo
- Y más...

## ⚙️ Configuración

### Cambiar URL del backend

En `hooks/useChat.js`:

```javascript
const CHAT_SERVICE_URL = 'http://localhost:3010';
```

### Límites de archivos

En el backend (`chat-service/app.js`):

```javascript
MAX_ATTACHMENTS_PER_MESSAGE = 5
MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024  // 25 MB
```

### Ventanas de edición/eliminación

En el backend:

```javascript
EDIT_WINDOW_MS = 10 * 60 * 1000              // 10 minutos
DELETE_EVERYONE_WINDOW_MS = 10 * 60 * 1000   // 10 minutos
```

## 🐛 Debugging

### Ver logs en consola

El hook useChat incluye logs:
- 🟢 Conectado
- 🔴 Desconectado
- 📩 Mensaje recibido
- ✏️ Mensaje editado
- 🗑️ Mensaje eliminado
- ❌ Errores

### Estados comunes

```javascript
const {
  connected,    // Estado de conexión WebSocket
  loading,      // Cargando datos
  error,        // Error actual
  rooms,        // Lista de conversaciones
  messages,     // Mensajes de la sala actual
  currentRoom   // Sala seleccionada
} = useChat(userId, token);
```

## 📋 Checklist de Implementación

- [x] Estructura de carpetas
- [x] Hook useChat (WebSocket + API)
- [x] Componente Chat principal
- [x] ChatHeader con navegación
- [x] UserList con búsqueda y nuevo chat
- [x] MessageList con agrupación por fecha
- [x] MessageInput con archivos
- [x] UserInfo con archivos compartidos
- [x] Estilos CSS responsivos
- [x] Helpers y utilidades
- [x] Integración completa con backend

## 🎉 Características Destacadas

✨ **Sin código del chat anterior** - Todo construido desde cero
✨ **100% integrado con tu backend** - Usa tus endpoints y WebSocket
✨ **Mobile-first** - Experiencia tipo WhatsApp/Telegram
✨ **Sin bugs de UI** - No overlaps, no z-index rotos
✨ **Header fijo correcto** - Sin tapar contenido
✨ **Scroll natural** - Como apps reales
✨ **Código limpio** - Componentes modulares y mantenibles

## 📞 Soporte

Si encuentras problemas:
1. Verifica que el backend esté corriendo en puerto 3010
2. Revisa la consola del navegador
3. Verifica token y userId en localStorage
4. Comprueba la red (WebSocket requiere conexión estable)

---

**Desarrollado para GoEnglish** 🎓
