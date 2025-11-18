import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../chat/hooks/useChat';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import Header from './components/Header';
import './styles/ModernChat.css';

/**
 * Componente principal del chat moderno
 * Layout completamente responsive con diseño propio
 */
const ModernChat = () => {
  const { user, token } = useAuth();
  const userId = user?.id;

  // Estados UI
  const [theme, setTheme] = useState('light');
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Hook del chat (reutilizamos la lógica del backend)
  const {
    connected,
    rooms,
    currentRoom,
    messages,
    contacts,
    loading,
    error,
    selectRoom,
    sendMessage,
    sendMessageWithAttachments,
    editMessage,
    deleteMessage,
    createRoom,
    sendLocationMessage,
  } = useChat(userId, token);

  // Detectar cambios de tamaño de pantalla
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile && currentRoom) {
        setShowSidebar(false);
      } else if (!mobile) {
        setShowSidebar(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentRoom]);

  // Cargar tema desde localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('chat-theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Toggle tema
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('chat-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Manejar selección de chat
  const handleSelectRoom = (room) => {
    selectRoom(room);
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  // Volver a la lista (móvil)
  const handleBackToList = () => {
    if (isMobile) {
      setShowSidebar(true);
    }
  };

  return (
    <div className={`modern-chat ${theme}`}>
      <div className="modern-chat-container">
        {/* Sidebar - Lista de chats */}
        {(showSidebar || !isMobile) && (
          <Sidebar
            rooms={rooms}
            currentRoom={currentRoom}
            onSelectRoom={handleSelectRoom}
            user={user}
            theme={theme}
            onToggleTheme={toggleTheme}
            connected={connected}
            isMobile={isMobile}
          />
        )}

        {/* Área principal del chat */}
        {(!showSidebar || !isMobile) && currentRoom ? (
          <div className="modern-chat-main">
            <Header
              room={currentRoom}
              onBack={handleBackToList}
              isMobile={isMobile}
              connected={connected}
            />
            <ChatWindow
              messages={messages}
              currentUserId={userId}
              room={currentRoom}
              onSendMessage={sendMessage}
              onSendFiles={sendMessageWithAttachments}
              onSendLocation={sendLocationMessage}
              onEditMessage={editMessage}
              onDeleteMessage={deleteMessage}
              theme={theme}
            />
          </div>
        ) : !showSidebar && isMobile ? (
          <div className="modern-chat-empty">
            <div className="modern-chat-empty-content">
              <div className="modern-chat-empty-icon">💬</div>
              <h2>Selecciona un chat</h2>
              <p>Elige una conversación para comenzar</p>
            </div>
          </div>
        ) : null}

        {/* Pantalla vacía en escritorio */}
        {!currentRoom && !isMobile && (
          <div className="modern-chat-empty">
            <div className="modern-chat-empty-content">
              <div className="modern-chat-empty-icon">💬</div>
              <h2>GoEnglish Chat</h2>
              <p>Selecciona una conversación para comenzar a chatear</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernChat;
