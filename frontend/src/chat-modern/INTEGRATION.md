# Guía de Integración - Chat Moderno

## 🚀 Cómo usar el nuevo chat en GoEnglish

### Opción 1: Reemplazar el chat existente

En tu archivo de rutas principal (por ejemplo, `src/App.jsx` o donde tengas las rutas):

```jsx
// Antes
import Chat from './chat/components/Chat';

// Después
import ModernChat from './chat-modern/ModernChat';

// En tus rutas
<Route path="/chat" element={<ModernChat />} />
```

### Opción 2: Agregar como ruta alternativa

Mantén ambos chats y agrega una nueva ruta:

```jsx
import Chat from './chat/components/Chat'; // Chat antiguo
import ModernChat from './chat-modern/ModernChat'; // Chat nuevo

<Route path="/chat" element={<Chat />} />
<Route path="/chat-v2" element={<ModernChat />} />
```

### Opción 3: Usar directamente en un componente

```jsx
import React from 'react';
import ModernChat from './chat-modern/ModernChat';

function ChatPage() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ModernChat />
    </div>
  );
}

export default ChatPage;
```

---

## ⚙️ Requisitos

### 1. AuthContext
El chat requiere el contexto de autenticación:

```jsx
import { AuthProvider } from './context/AuthContext';

<AuthProvider>
  <ModernChat />
</AuthProvider>
```

### 2. useChat Hook
El chat utiliza el hook existente en `src/chat/hooks/useChat.js`. No se requieren cambios.

### 3. Backend
El chat funciona con el backend existente (puerto 3010 para archivos). No requiere cambios en el servidor.

---

## 🎨 Personalización

### Cambiar colores del tema

Edita `chat-modern/styles/ModernChat.css`:

```css
:root[data-theme="light"] {
  --accent-primary: #00a884; /* Cambia el verde de acento */
  --bubble-own: #d9fdd3;     /* Color de burbujas propias */
  /* ... más variables */
}
```

### Cambiar ancho del sidebar

Edita `chat-modern/styles/Sidebar.css`:

```css
.modern-sidebar {
  width: 380px; /* Cambia el ancho (por defecto 380px) */
}
```

### Cambiar breakpoint móvil

Edita los archivos CSS y cambia `768px` por el valor deseado:

```css
@media (max-width: 768px) {
  /* Estilos móvil */
}
```

### Personalizar fondo del chat

Edita `chat-modern/styles/ChatWindow.css`:

```css
.modern-chat-window {
  /* Opción 1: Color sólido */
  background-color: #f0f2f5;
  background-image: none;
  
  /* Opción 2: Imagen personalizada */
  background-image: url('/path/to/your/image.jpg');
  background-size: cover;
  
  /* Opción 3: Mantener el patrón SVG actual */
  /* (ya está implementado por defecto) */
}
```

---

## 🧪 Pruebas

### En desarrollo:

1. Inicia el backend:
```bash
cd backend/run
node app.js
```

2. Inicia el frontend:
```bash
cd frontend
npm start
```

3. Navega a la ruta del chat (ej: `http://localhost:3000/chat`)

### Probar responsive:

1. **PC:** Abre el navegador normal (> 1024px)
2. **Tablet:** Abre DevTools, selecciona iPad (768px - 1024px)
3. **Móvil:** Selecciona iPhone/Android (< 768px)

### Probar temas:

1. Haz clic en el botón 🌙/☀️ en el header del sidebar
2. El tema debe cambiar instantáneamente
3. Recarga la página - el tema debe persistir

---

## 🐛 Solución de Problemas

### "Cannot read properties of undefined (reading 'id')"
**Causa:** El contexto de autenticación no está disponible.
**Solución:** Asegúrate de que `<AuthProvider>` envuelve tu aplicación.

### "useChat is not a function"
**Causa:** No se encuentra el hook useChat.
**Solución:** Verifica que el archivo `src/chat/hooks/useChat.js` existe.

### "Failed to load resource: net::ERR_CONNECTION_REFUSED (localhost:3010)"
**Causa:** El backend no está ejecutándose.
**Solución:** Inicia el backend con `node backend/run/app.js`.

### Las imágenes no se muestran
**Causa:** El servidor de archivos no está activo o la ruta es incorrecta.
**Solución:** Verifica que el chat-service está corriendo en el puerto 3010.

### El input se mueve con el teclado en móvil
**Causa:** Problema de CSS.
**Solución:** Verifica que `MessageInput.css` tiene la clase correcta aplicada.

### El menú de tres puntos no aparece en PC
**Causa:** CSS hover no funciona.
**Solución:** Verifica que el CSS de `MessageBubble.css` está cargado correctamente.

---

## 📱 Características Móviles

### Input fijo
El input permanece fijo en la parte inferior cuando aparece el teclado móvil.

### Sin zoom en iOS
Los inputs tienen `font-size: 16px` para prevenir el auto-zoom de iOS.

### Tres puntos siempre visibles
En móvil, el menú de tres puntos está siempre visible (no requiere hover).

### Navegación fluida
- Vista lista → seleccionar chat → vista chat
- Botón back visible solo en móvil
- Transiciones suaves

---

## 🔄 Migración del chat antiguo

Si quieres migrar gradualmente:

1. **Fase 1:** Mantén ambos chats disponibles
2. **Fase 2:** Redirige a usuarios beta al nuevo chat
3. **Fase 3:** Marca el chat antiguo como deprecated
4. **Fase 4:** Elimina el chat antiguo cuando todos usen el nuevo

### Script de migración de estilos (si necesitas copiar customizaciones):

```bash
# Copiar personalizaciones de colores
# Del chat antiguo al nuevo (manual)
```

---

## 📊 Comparación: Chat Antiguo vs Chat Moderno

| Característica | Chat Antiguo | Chat Moderno |
|---------------|--------------|--------------|
| Responsive | Básico | ✅ Completo |
| Temas | No | ✅ Claro/Oscuro |
| Menú contextual | Clic derecho | ✅ Tres puntos |
| Animaciones | Limitadas | ✅ Completas |
| Input móvil | Se mueve | ✅ Fijo |
| Diseño | Simple | ✅ Profesional |
| Breakpoints | Uno | ✅ Tres niveles |
| Backend | Mismo | ✅ Mismo (sin cambios) |

---

## 🎯 Checklist de Implementación

- [ ] Copiar carpeta `chat-modern` a tu proyecto
- [ ] Verificar que `useChat.js` existe
- [ ] Verificar que `AuthContext` está disponible
- [ ] Agregar ruta en tu sistema de routing
- [ ] Iniciar backend en puerto 3010
- [ ] Probar en PC (> 1024px)
- [ ] Probar en tablet (768-1024px)
- [ ] Probar en móvil (< 768px)
- [ ] Probar tema claro
- [ ] Probar tema oscuro
- [ ] Probar envío de mensajes
- [ ] Probar envío de archivos
- [ ] Probar envío de ubicación
- [ ] Probar edición de mensajes
- [ ] Probar eliminación de mensajes
- [ ] Probar menú de tres puntos
- [ ] Verificar que el input no se mueve en móvil
- [ ] Verificar scroll suave

---

## 🚀 ¡Listo!

El chat moderno está completamente implementado y documentado. Solo necesitas integrarlo en tu aplicación siguiendo los pasos de esta guía.

Si tienes alguna pregunta o necesitas personalizar algo, revisa el archivo `README.md` en la carpeta `chat-modern` para la documentación completa del diseño.

**¡Disfruta tu nuevo chat! 💬✨**
