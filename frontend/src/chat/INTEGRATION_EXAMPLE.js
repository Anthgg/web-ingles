/**
 * EJEMPLO DE INTEGRACIÓN DEL CHAT
 * 
 * Este archivo muestra cómo integrar el sistema de chat
 * en tu aplicación React existente
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Chat } from './chat';

// Tus otros componentes
// import Dashboard from './components/Dashboard';
// import Login from './components/Login';
// etc...

function App() {
  return (
    <Router>
      <Routes>
        {/* Ruta del chat */}
        <Route path="/chat" element={<Chat />} />
        
        {/* Tus otras rutas */}
        {/* <Route path="/dashboard" element={<Dashboard />} /> */}
        {/* <Route path="/login" element={<Login />} /> */}
        {/* etc... */}
      </Routes>
    </Router>
  );
}

export default App;

/**
 * INTEGRACIÓN COMO COMPONENTE DENTRO DE UNA PÁGINA
 */

/*
import React from 'react';
import { Chat } from './chat';

function MessagesPage() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Tu navbar o header }
      <YourNavbar />
      
      {/* El chat ocupará el resto del espacio }
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Chat />
      </div>
    </div>
  );
}
*/

/**
 * INTEGRACIÓN CON PROTECCIÓN DE RUTA
 */

/*
import React from 'react';
import { Navigate } from 'react-router-dom';
import { Chat } from './chat';

function ProtectedChat() {
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  
  // Si no hay autenticación, redirigir al login
  if (!token || !userId) {
    return <Navigate to="/login" replace />;
  }
  
  return <Chat />;
}

export default ProtectedChat;
*/

/**
 * INTEGRACIÓN CON LAYOUT PERSONALIZADO
 */

/*
import React from 'react';
import { Chat } from './chat';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

function MessagesWithLayout() {
  return (
    <div className="app-container">
      <Topbar />
      <div className="app-body">
        <Sidebar />
        <main className="app-main">
          <Chat />
        </main>
      </div>
    </div>
  );
}
*/

/**
 * VERIFICAR DATOS DE AUTENTICACIÓN
 */

/*
// Antes de usar el chat, asegúrate de tener estos datos en localStorage:

// Después de login exitoso:
localStorage.setItem('token', response.data.token);
localStorage.setItem('userId', response.data.user.id);

// El chat los leerá automáticamente
*/

/**
 * PERSONALIZAR EL COMPONENTE
 */

/*
import React from 'react';
import { useChat } from './chat/hooks/useChat';
import UserList from './chat/components/UserList';
import MessageList from './chat/components/MessageList';
// ... importar otros componentes

function CustomChat() {
  const token = localStorage.getItem('token');
  const userId = parseInt(localStorage.getItem('userId'));
  
  const {
    connected,
    rooms,
    currentRoom,
    messages,
    selectRoom,
    sendMessage,
    // ... otras funciones
  } = useChat(userId, token);
  
  // Aquí puedes crear tu propio layout personalizado
  // usando los componentes y el hook
  
  return (
    <div className="my-custom-chat">
      {/* Tu layout personalizado }
    </div>
  );
}
*/

/**
 * CONFIGURAR BACKEND URL
 */

/*
// Si tu backend no está en localhost:3010,
// edita el archivo: src/chat/hooks/useChat.js

// Línea 4:
const CHAT_SERVICE_URL = 'http://localhost:3010';

// Cámbiala por tu URL:
const CHAT_SERVICE_URL = 'https://tu-dominio.com';
// o
const CHAT_SERVICE_URL = process.env.REACT_APP_CHAT_SERVICE_URL;
*/
