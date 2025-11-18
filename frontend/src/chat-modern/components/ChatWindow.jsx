import React, { useRef, useEffect, useState } from 'react';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import '../styles/ChatWindow.css';

/**
 * Ventana principal del chat
 * Área de mensajes con scroll + input inferior
 */
const ChatWindow = ({ 
  messages, 
  currentUserId, 
  room,
  onSendMessage, 
  onSendFiles, 
  onSendLocation,
  onEditMessage, 
  onDeleteMessage,
  theme 
}) => {
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Auto-scroll al final
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Detectar si el usuario scrolleó hacia arriba
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    setShowScrollButton(!isNearBottom);
  };

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // Agrupar mensajes por fecha
  const groupMessagesByDate = (messages) => {
    const groups = {};
    
    messages.forEach(message => {
      const date = new Date(message.sent_at);
      const dateKey = date.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    
    return groups;
  };

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="modern-chat-window">
      {/* Área de mensajes */}
      <div 
        className="modern-messages-container" 
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {Object.keys(groupedMessages).length === 0 ? (
          <div className="modern-messages-empty">
            <div className="modern-messages-empty-icon">💬</div>
            <p>No hay mensajes aún</p>
            <p className="modern-messages-empty-subtitle">Envía el primer mensaje</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date} className="modern-message-group">
              {/* Separador de fecha */}
              <div className="modern-date-divider">
                <span>{date}</span>
              </div>

              {/* Mensajes del día */}
              {dateMessages.map(message => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={message.sender_id === currentUserId}
                  onEdit={onEditMessage}
                  onDelete={onDeleteMessage}
                />
              ))}
            </div>
          ))
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Botón de scroll al final */}
      {showScrollButton && (
        <button 
          className="modern-scroll-to-bottom"
          onClick={() => scrollToBottom()}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m18 15-6 6-6-6"/>
          </svg>
        </button>
      )}

      {/* Input de mensaje */}
      <MessageInput
        onSendMessage={onSendMessage}
        onSendFiles={onSendFiles}
        onSendLocation={onSendLocation}
        disabled={!room}
      />
    </div>
  );
};

export default ChatWindow;
