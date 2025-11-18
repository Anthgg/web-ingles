# Chat Moderno - Documentación de Diseño

## 📋 Descripción General

Interfaz de mensajería moderna, limpia y completamente responsive, inspirada en WhatsApp Web pero con diseño propio. Utiliza el backend existente del proyecto GoEnglish sin modificaciones.

---

## 🎨 Características del Diseño

### Estructura General

#### **Layout de Dos Columnas (PC)**
```
┌─────────────────────────────────────────┐
│  Sidebar (380px)  │   Chat Principal    │
│                   │                     │
│  - Header usuario │  - Header chat      │
│  - Buscador       │  - Área mensajes    │
│  - Lista chats    │  - Input mensaje    │
│                   │                     │
└─────────────────────────────────────────┘
```

#### **Layout Móvil (< 768px)**
```
Vista Lista          Vista Chat
┌─────────────┐     ┌─────────────┐
│  Sidebar    │ →   │  ← Header   │
│  (100%)     │     │  Mensajes   │
│             │     │  Input      │
└─────────────┘     └─────────────┘
```

---

## 📐 Breakpoints Responsive

### **Desktop (> 1024px)**
- Layout de dos columnas fijas
- Sidebar: 380px de ancho
- Chat: Flexible (resto del espacio)
- Burbujas: máx 65% del ancho
- Menú de tres puntos: visible al hover

### **Tablet (769px - 1024px)**
- Layout de dos columnas adaptativo
- Sidebar: 350px de ancho
- Chat: Flexible
- Burbujas: máx 70% del ancho

### **Móvil (≤ 768px)**
- **Vista única a pantalla completa**
- Vista predeterminada: Lista de chats (100%)
- Al seleccionar chat: Oculta sidebar, muestra chat (100%)
- Header con botón "back" visible
- Input fijo inferior (no se mueve con teclado)
- Burbujas: máx 80% del ancho
- Menú de tres puntos: **siempre visible** (no requiere hover)

### **Móvil Pequeño (≤ 480px)**
- Optimizaciones adicionales de tamaño
- Font-size mínimo de 16px en inputs (previene zoom iOS)
- Botones más compactos
- Burbujas: máx 85% del ancho

---

## 🎭 Sistema de Temas

### **Tema Claro (Light)**
- Fondo principal: `#f0f2f5`
- Fondo secundario: `#ffffff`
- Texto: `#111b21`
- Burbujas propias: `#d9fdd3` (verde claro)
- Burbujas otros: `#ffffff` (blanco)
- Acento: `#00a884` (verde WhatsApp)

### **Tema Oscuro (Dark)**
- Fondo principal: `#0b141a`
- Fondo secundario: `#202c33`
- Texto: `#e9edef`
- Burbujas propias: `#005c4b` (verde oscuro)
- Burbujas otros: `#202c33` (gris oscuro)
- Acento: `#00a884` (verde)

### **Cambio de Tema**
- Toggle en el header del sidebar (🌙/☀️)
- Persistencia en `localStorage`
- Transiciones suaves entre temas

---

## 💬 Componentes Principales

### **1. Sidebar** (`Sidebar.jsx`)
**Ubicación:** Columna izquierda (PC) / Pantalla completa (móvil)

**Elementos:**
- **Header usuario:**
  - Avatar circular con iniciales
  - Nombre del usuario
  - Estado (en línea/desconectado)
  - Botón de cambio de tema
- **Buscador:**
  - Input con icono de búsqueda
  - Botón de limpiar (×) cuando hay texto
  - Filtrado en tiempo real
- **Lista de chats:**
  - Avatar con iniciales
  - Nombre del chat
  - Último mensaje (preview)
  - Hora/fecha relativa
  - Badge de mensajes no leídos
  - Resaltado del chat activo
  - Scroll independiente

**Responsive:**
- PC: 380px fijo
- Móvil: 100% ancho, se oculta al abrir chat

---

### **2. Header** (`Header.jsx`)
**Ubicación:** Parte superior del área de chat

**Elementos PC:**
- Avatar del contacto/grupo
- Nombre
- Estado (en línea, escribiendo, desconectado)
- Botones de acción (buscar, más opciones)

**Elementos Móvil (adicional):**
- **Botón "Back" (←):** Vuelve a la lista de chats
- Visible solo en móvil

---

### **3. ChatWindow** (`ChatWindow.jsx`)
**Ubicación:** Área principal de chat

**Elementos:**
- **Área de mensajes:**
  - Scroll suave e independiente
  - Fondo con patrón sutil
  - Separadores de fecha
  - Agrupación de mensajes por día
  - Auto-scroll al recibir mensaje
- **Botón scroll al final:**
  - Aparece al scrollear hacia arriba
  - Posición fija flotante
  - Animación de entrada
- **MessageInput:**
  - Fijo en la parte inferior
  - No se desplaza con el teclado móvil

---

### **4. MessageBubble** (`MessageBubble.jsx`)
**El componente más importante - Incluye el menú contextual**

#### **Estructura de la Burbuja:**
```
┌─────────────────────────┐
│  [⋮] <- Tres puntos     │  (Solo mensajes propios)
│                         │
│  [Adjuntos/Ubicación]   │
│  Texto del mensaje      │
│                         │
│  editado · 10:30 · ✓✓  │
└─────────────────────────┘
```

#### **Botón de Tres Puntos:**
- **Posición:**
  - Mensajes propios: Arriba a la derecha (right: -10px)
  - Mensajes ajenos: Arriba a la izquierda (left: -10px)
- **Visibilidad:**
  - **PC:** Aparece al hacer hover sobre la burbuja
  - **Móvil:** **Siempre visible** (no requiere hover)
- **Estilo:**
  - Botón circular (28px × 28px)
  - Fondo blanco con sombra
  - Icono de tres puntos verticales (⋮)
  - Animación al hover (escala 1.1)
  - Color de acento al hover

#### **Menú Contextual:**
**Se despliega al hacer clic en los tres puntos**

**Opciones:**
1. **Editar mensaje**
   - Icono: lápiz (✏️)
   - Abre editor inline
   - Solo para mensajes propios
   
2. **Eliminar para mí**
   - Icono: papelera (🗑️)
   - Elimina solo para el usuario actual
   
3. **Eliminar para todos**
   - Icono: papelera con líneas
   - Elimina para todos los participantes
   - Estilo danger (rojo)

**Comportamiento:**
- Animación de entrada: `scaleIn` (0.15s)
- Posición adaptativa según burbuja (izq/der)
- Cierre automático al hacer clic fuera
- Sombra elevada
- Hover sobre cada opción

#### **Modo Edición:**
- Textarea inline
- Botones "Cancelar" y "Guardar"
- Enter para guardar, Escape para cancelar
- Focus automático

#### **Adjuntos Soportados:**
- **Imágenes:** Preview grande, clickeable
- **Videos:** Player HTML5 con controles
- **Archivos:** Icono + nombre + tamaño
- **Ubicación:** Icono de pin + etiqueta + dirección + link a Google Maps

#### **Mensajes Eliminados:**
- Fondo gris opaco
- Icono 🚫
- Texto: "Este mensaje fue eliminado"

---

### **5. MessageInput** (`MessageInput.jsx`)
**Ubicación:** Parte inferior fija del chat

#### **Estructura:**
```
┌─────────────────────────────────────────┐
│  [Preview de archivos adjuntos]        │
├─────────────────────────────────────────┤
│  😊 📎 📍 │ [Textarea] │ [Enviar ➤]    │
└─────────────────────────────────────────┘
```

#### **Elementos:**
- **Botones izquierda:**
  1. Emoji picker (😊)
  2. Adjuntar archivos (📎)
  3. Compartir ubicación (📍)
  
- **Textarea central:**
  - Auto-resize vertical
  - Máx altura: 120px
  - Enter: enviar / Shift+Enter: nueva línea
  - Placeholder: "Escribe un mensaje..."
  
- **Botón enviar:**
  - Circular con icono de avión
  - Color acento (verde)
  - Deshabilitado si no hay contenido
  - Animación al hover

#### **Preview de Archivos:**
- Thumbnails de 80x80px
- Scroll horizontal
- Botón × para eliminar
- Preview de imágenes

#### **Emoji Picker:**
- Popup flotante arriba del input
- Grid de 6 columnas (PC) / 5 (móvil)
- 12 emojis comunes
- Cierre al seleccionar emoji

#### **Modal de Ubicación:**
- Backdrop oscuro semi-transparente
- Modal centrado (máx 480px)
- Campos:
  - Latitud
  - Longitud
  - Etiqueta (opcional)
  - Dirección (opcional)
- Botón "Usar mi ubicación actual" (geolocalización)
- Botones "Cancelar" y "Enviar ubicación"

#### **Responsive:**
- **Móvil:**
  - Input fijo (position fixed en móvil)
  - Previene desplazamiento con teclado
  - Botones más compactos
  - Font-size 16px (previene zoom iOS)

---

## 🎬 Animaciones

### **Mensajes:**
- **Propios:** `slideInRight` (desde derecha)
- **Otros:** `slideInLeft` (desde izquierda)
- Duración: 0.3s ease

### **Menú contextual:**
- **Aparición:** `scaleIn` (0.15s)
- **Opciones hover:** background + transform scale(0.98)

### **Burbujas:**
- **Hover:** sombra elevada
- **Tres puntos:** opacidad 0 → 1 (PC) / siempre 1 (móvil)

### **Botones:**
- **Hover:** background + scale(1.05)
- **Active:** scale(0.95)
- Transiciones suaves (0.2s)

### **Modales:**
- **Backdrop:** `fadeIn` (0.2s)
- **Contenido:** `scaleIn` (0.2s)

---

## 📱 Comportamiento Móvil Específico

### **Navegación:**
1. Usuario abre app → Ve lista de chats (Sidebar)
2. Toca un chat → Sidebar se oculta, aparece ChatWindow con botón back
3. Toca botón back → Vuelve a la lista de chats

### **Input en Móvil:**
- **Posición fija:** No se mueve cuando aparece el teclado
- **Padding bottom:** Espacio para el teclado virtual
- **Font-size 16px:** Previene auto-zoom en iOS
- **Botones compactos:** 32-36px en lugar de 40px

### **Burbujas en Móvil:**
- **Tres puntos siempre visibles:** No requiere hover
- **Menú contextual táctil:** Optimizado para dedos
- **Ancho máximo 85%:** Mejor legibilidad

---

## 🔌 Integración con Backend

### **Hook useChat:**
Reutiliza completamente el hook existente (`useChat.js`):
- `messages`: Array de mensajes
- `rooms`: Lista de salas/chats
- `currentRoom`: Sala activa
- `sendMessage()`: Enviar texto
- `sendMessageWithAttachments()`: Enviar archivos
- `sendLocationMessage()`: Enviar ubicación
- `editMessage()`: Editar mensaje
- `deleteMessage()`: Eliminar mensaje

### **Estados en Tiempo Real:**
- Conexión WebSocket
- Estados de conexión (connected)
- Estados de escritura (typing)
- Mensajes leídos/entregados

### **Multimedia:**
- Archivos servidos desde: `http://localhost:3010`
- Tipos soportados: imágenes, videos, audios, PDFs, documentos

---

## 🎨 Variables CSS

Todas las variables están en `ModernChat.css`:

```css
/* Ejemplo de variables del tema claro */
--bg-primary: #f0f2f5;
--bg-secondary: #ffffff;
--text-primary: #111b21;
--bubble-own: #d9fdd3;
--accent-primary: #00a884;
--shadow-md: 0 2px 8px rgba(11, 20, 26, 0.12);
```

---

## 📂 Estructura de Archivos

```
chat-modern/
├── ModernChat.jsx              # Componente principal
├── components/
│   ├── Sidebar.jsx             # Lista de chats
│   ├── Header.jsx              # Header del chat
│   ├── ChatWindow.jsx          # Área de mensajes
│   ├── MessageBubble.jsx       # Burbuja con menú contextual ⭐
│   └── MessageInput.jsx        # Input de mensaje
└── styles/
    ├── ModernChat.css          # Variables y estilos globales
    ├── Sidebar.css             # Estilos del sidebar
    ├── Header.css              # Estilos del header
    ├── ChatWindow.css          # Estilos del área de chat
    ├── MessageBubble.css       # Estilos de burbujas ⭐
    └── MessageInput.css        # Estilos del input
```

---

## 🚀 Uso

### **Integración en la App:**

```jsx
import ModernChat from './chat-modern/ModernChat';

function App() {
  return (
    <div className="App">
      <ModernChat />
    </div>
  );
}
```

### **Cambiar Tema:**
El usuario puede cambiar el tema con el botón en el header del sidebar. El tema se guarda en `localStorage`.

### **Responsive:**
El diseño se adapta automáticamente según el ancho de la ventana. Los breakpoints están definidos en los archivos CSS.

---

## ✨ Características Destacadas

1. **Menú contextual con tres puntos** - Principal innovación
2. **Diseño 100% responsive** - PC y móvil completamente diferentes
3. **Tema claro/oscuro** - Con persistencia
4. **Animaciones suaves** - Experiencia fluida
5. **Input fijo en móvil** - No se mueve con el teclado
6. **Scroll independiente** - Sidebar y chat separados
7. **Preview de archivos** - Antes de enviar
8. **Ubicación en tiempo real** - Geolocalización integrada
9. **Burbujas modernas** - Estilo WhatsApp mejorado
10. **Backend sin cambios** - Usa el sistema existente

---

## 📝 Notas Técnicas

### **Prevención de Zoom en iOS:**
```css
@media (max-width: 480px) {
  input, textarea {
    font-size: 16px; /* Mínimo para prevenir zoom */
  }
}
```

### **Scroll Suave:**
```javascript
scrollToBottom() {
  messagesEndRef.current?.scrollIntoView({ 
    behavior: 'smooth' 
  });
}
```

### **Cierre de Menú al Click Fuera:**
```javascript
useEffect(() => {
  const handleClickOutside = (event) => {
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setShowMenu(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [showMenu]);
```

---

## 🎯 Puntos Clave del Diseño

### **Tres Puntos en Burbujas (CRÍTICO):**
- Posición: arriba y al costado de la burbuja
- PC: `opacity: 0` normal, `opacity: 1` al hover
- Móvil: `opacity: 1` siempre (sin hover)
- Menú con animación `scaleIn`
- 3 opciones: Editar, Eliminar para mí, Eliminar para todos

### **Diferenciación PC vs Móvil:**
- **PC:** Dos columnas, sidebar fijo, hover interactions
- **Móvil:** Una vista a la vez, botón back, touch interactions

### **Fondo del Chat:**
- Patrón sutil SVG embebido
- Diferente para tema claro y oscuro
- Opacidad baja para no distraer

---

## 🏆 Resumen

Esta interfaz es una implementación completa de un chat moderno con:
- ✅ Diseño propio (no reutiliza el anterior)
- ✅ 100% responsive con breakpoints claros
- ✅ Menú contextual funcional con tres puntos
- ✅ Tema claro y oscuro
- ✅ Animaciones suaves
- ✅ Integración completa con backend existente
- ✅ Optimizaciones móviles (input fijo, sin zoom iOS)
- ✅ Documentación completa

El diseño está listo para producción y puede ser usado directamente en la aplicación GoEnglish.
