# 📱 Flujo Visual de Creación de Grupos

```
┌─────────────────────────────────────────────────────────────────────┐
│                     USUARIO INICIA CREACIÓN                         │
│                                                                     │
│  [Lista de Chats]  →  Click "Nueva Conversación"  →  "👥 Grupo"   │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                          PASO 1: PARTICIPANTES                       │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  ← Nuevo grupo - Participantes                               │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  🔍 Buscar contactos...                                       │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  3 participante(s) seleccionado(s)     ✓ Mínimo alcanzado    │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  ☐  (JD)  Juan Pérez           juan@email.com                │ │
│  │  ☑  (MA)  María García         maria@email.com               │ │
│  │  ☑  (CA)  Carlos López         carlos@email.com              │ │
│  │  ☑  (AN)  Ana Martínez         ana@email.com                 │ │
│  │  ☐  (LU)  Luis Rodríguez       luis@email.com                │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌────────────────────────┐  ┌────────────────────────────────┐   │
│  │     Cancelar           │  │  Siguiente (3/∞)              │   │
│  └────────────────────────┘  └────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
                          [Validación: min 2 participantes]
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                       PASO 2: DETALLES DEL GRUPO                     │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  ← Nuevo grupo - Detalles                                    │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│               ┌─────────────────────────┐                          │
│               │                         │                          │
│               │         ╔═══╗          │  ← Foto del grupo        │
│               │         ║ 📷 ║          │     (Opcional)           │
│               │         ╚═══╝          │     Click para subir     │
│               │    Foto del grupo       │                          │
│               │      (Opcional)         │                          │
│               └─────────────────────────┘                          │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  Nombre del grupo *                                           │ │
│  │  ┌─────────────────────────────────────────────────┐  15/50  │ │
│  │  │ Curso Inglés A1                                 │         │ │
│  │  └─────────────────────────────────────────────────┘         │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  Descripción del grupo                                        │ │
│  │  ┌─────────────────────────────────────────────────┐  42/200 │ │
│  │  │ Grupo para practicar inglés nivel A1           │         │ │
│  │  │ Clases de lunes a viernes                       │         │ │
│  │  │                                                  │         │ │
│  │  └─────────────────────────────────────────────────┘         │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  Participantes seleccionados (3)                              │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │ │
│  │  │ (MA) María   │  │ (CA) Carlos  │  │ (AN) Ana     │       │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘       │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌────────────────────────┐  ┌────────────────────────────────┐   │
│  │       Atrás            │  │    Crear grupo                │   │
│  └────────────────────────┘  └────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
                          [Validación: nombre no vacío]
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         PROCESO DE CREACIÓN                          │
│                                                                     │
│  1. Si hay foto: Upload a /upload-group-photo                      │
│     → Obtiene URL: /uploads/groups/group-1731628800-abc123.jpg     │
│                                                                     │
│  2. POST /rooms con:                                                │
│     {                                                               │
│       name: "Curso Inglés A1",                                      │
│       type: "group",                                                │
│       participants: [{ userId: 2 }, { userId: 3 }, { userId: 4 }], │
│       description: "Grupo para practicar inglés nivel A1...",      │
│       groupPhoto: "/uploads/groups/group-1731628800-abc123.jpg"    │
│     }                                                               │
│                                                                     │
│  3. Backend crea registro en chat_rooms                             │
│  4. Backend crea participantes en chat_participants                 │
│  5. Retorna: { id: 15 }                                             │
│                                                                     │
│  6. Frontend recarga rooms                                          │
│  7. Frontend abre el nuevo grupo                                    │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                        GRUPO CREADO ✓                                │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  [📷]  Curso Inglés A1                    👥 4 miembros  🔔  │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Usuario automáticamente entra al chat del grupo                    │
│  Puede empezar a enviar mensajes                                    │
└─────────────────────────────────────────────────────────────────────┘
```

## 🗄️ Estructura de Base de Datos

```
┌──────────────────────────────────────────────────────────────┐
│                       chat_rooms                             │
├──────────────────┬───────────────────────────────────────────┤
│ Campo            │ Tipo                                      │
├──────────────────┼───────────────────────────────────────────┤
│ id               │ INT (PK, AUTO_INCREMENT)                  │
│ name             │ VARCHAR(255) NOT NULL                     │
│ type             │ VARCHAR(50) NOT NULL                      │
│ description      │ TEXT NULL               ← NUEVO           │
│ group_photo      │ VARCHAR(512) NULL       ← NUEVO           │
│ created_at       │ DATETIME DEFAULT NOW()  ← NUEVO           │
│ updated_at       │ DATETIME ON UPDATE      ← NUEVO           │
└──────────────────┴───────────────────────────────────────────┘

Ejemplo de registro:
┌────┬─────────────────┬───────┬───────────────────┬────────────────────┐
│ id │ name            │ type  │ description       │ group_photo        │
├────┼─────────────────┼───────┼───────────────────┼────────────────────┤
│ 15 │ Curso Inglés A1 │ group │ Grupo para...     │ /uploads/groups... │
└────┴─────────────────┴───────┴───────────────────┴────────────────────┘
```

## 📂 Estructura de Archivos

```
goenglish/
├── BD/
│   ├── agregar_grupos_descripcion_foto.sql    ← NUEVO
│   ├── INSTALAR_GRUPOS_MEJORAS.bat           ← NUEVO
│   └── README_GRUPOS_MEJORAS.md              ← NUEVO
│
├── backend/
│   └── chat-service/
│       ├── app.js                             ← MODIFICADO
│       └── uploads/
│           └── groups/                        ← NUEVO (carpeta)
│               ├── group-1731628800-abc.jpg
│               └── group-1731628900-def.jpg
│
├── frontend/
│   └── src/
│       └── chat/
│           ├── components/
│           │   ├── Chat.jsx                   ← MODIFICADO
│           │   └── UserList.jsx               ← MODIFICADO (grande)
│           ├── hooks/
│           │   └── useChat.js                 ← MODIFICADO
│           └── styles/
│               └── UserList.css               ← MODIFICADO (grande)
│
└── MEJORAS_GRUPOS_RESUMEN.md                  ← NUEVO
```

## 🎯 Estados del Componente

```javascript
// UserList.jsx - Estados
┌─────────────────────────────────────────────────────────────┐
│ Estado                    │ Tipo      │ Propósito           │
├───────────────────────────┼───────────┼─────────────────────┤
│ showNewGroupModal         │ boolean   │ Mostrar modal       │
│ groupStep                 │ number    │ 1 o 2 (paso actual) │
│ selectedParticipants      │ array     │ IDs seleccionados   │
│ groupName                 │ string    │ Nombre del grupo    │
│ groupDescription          │ string    │ Descripción         │
│ groupPhoto                │ File|null │ Archivo de foto     │
│ groupPhotoPreview         │ string|null│ Data URL preview   │
└───────────────────────────┴───────────┴─────────────────────┘
```

## 🔄 Flujo de Datos

```
┌──────────────┐
│  UserList    │  → Estado: groupPhoto (File), groupName, description
└──────┬───────┘
       │ onCreateChat(contact, 'group', participants)
       ↓
┌──────────────┐
│    Chat      │  → 1. Upload foto si existe (POST /upload-group-photo)
└──────┬───────┘     2. Obtiene URL
       │            3. Llama createRoom con todos los parámetros
       ↓
┌──────────────┐
│   useChat    │  → createRoom(name, type, participants, description, photo)
└──────┬───────┘     POST /rooms con body JSON
       │
       ↓
┌──────────────┐
│   Backend    │  → INSERT INTO chat_rooms (name, type, description, group_photo)
└──────┬───────┘     Retorna { id: roomId }
       │
       ↓
┌──────────────┐
│  Frontend    │  → Recarga rooms, selecciona nuevo grupo, abre chat
└──────────────┘
```

## ✅ Checklist de Validaciones

```
PASO 1: Participantes
├─ ☑ Mínimo 2 participantes seleccionados
├─ ☑ Botón "Siguiente" deshabilitado si < 2
└─ ☑ Búsqueda funcional

PASO 2: Detalles
├─ ☑ Nombre no vacío (requerido)
├─ ☑ Nombre máximo 50 caracteres
├─ ☑ Descripción máximo 200 caracteres
├─ ☑ Foto opcional (validada en backend)
├─ ☑ Foto máximo 5MB
├─ ☑ Solo imágenes permitidas
└─ ☑ Botón "Crear" deshabilitado si nombre vacío

BACKEND
├─ ☑ Autenticación requerida
├─ ☑ Participantes validados
├─ ☑ Tipo de archivo validado (imágenes)
├─ ☑ Tamaño validado (5MB max)
└─ ☑ Inserción en BD con campos opcionales
```

---

**Fecha de implementación:** 14 de Noviembre, 2025  
**Versión:** 2.0  
**Estado:** ✅ Completado
