import React, { useEffect, useRef, useState } from 'react';
import { 
  groupMessagesByDate, 
  formatMessageTime,
  getUserInitials,
  getAvatarColor,
  getFileIcon,
  formatFileSize,
  isImageFile,
  isVideoFile,
  buildGoogleMapsUrl
} from '../utils/helpers';
import UserAvatar from '../../components/UserAvatar';
import '../styles/MessageList.css';

/**
 * Lista de mensajes con scroll automático y agrupación por fecha
 */
const MessageList = ({ messages, currentUserId, onEditMessage, onDeleteMessage }) => {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, message: null });
  const prevMessagesLengthRef = useRef(0);

  // Scroll automático al final (solo cuando se añaden nuevos mensajes)
  useEffect(() => {
    // Solo hacer scroll si hay nuevos mensajes
    if (messages.length > prevMessagesLengthRef.current && messagesEndRef.current) {
      // Usar requestAnimationFrame para evitar problemas de rendimiento en móvil
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  // Cerrar menú contextual al hacer clic fuera
  useEffect(() => {
    if (!contextMenu.show) return;
    
    const handleClick = (e) => {
      const menu = document.querySelector('.message-context-menu');
      const button = e.target.closest('.message-options-btn');
      
      if (menu && !menu.contains(e.target) && !button) {
        setContextMenu({ show: false, x: 0, y: 0, message: null });
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', handleClick);
    }, 0);
    
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu.show]);

  // Agrupar mensajes por fecha
  const groupedMessages = groupMessagesByDate(messages);

  // Manejar clic derecho en mensaje
  const handleContextMenu = (e, message) => {
    e.preventDefault();
    
    // Solo mostrar opciones para mensajes propios no eliminados
    if (message.sender_id !== currentUserId || message.is_deleted) return;

    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      message
    });
  };

  // Verificar si un mensaje es reciente (puede editarse)
  const isMessageRecent = (message) => {
    const sentAt = new Date(message.sent_at);
    const now = new Date();
    const diffMinutes = (now - sentAt) / (1000 * 60); // Diferencia en minutos
    return diffMinutes <= 15; // Solo se puede editar en los primeros 15 minutos
  };

  // Iniciar edición
  const handleStartEdit = (message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
    setContextMenu({ show: false, x: 0, y: 0, message: null });
  };

  // Guardar edición
  const handleSaveEdit = async (messageId) => {
    if (!editContent.trim()) return;
    
    await onEditMessage(messageId, editContent);
    setEditingMessageId(null);
    setEditContent('');
  };

  // Cancelar edición
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  // Eliminar mensaje
  const handleDelete = (message, scope) => {
    onDeleteMessage(message.id, scope);
    setContextMenu({ show: false, x: 0, y: 0, message: null });
  };

  // Renderizar adjuntos
  const renderAttachments = (attachments) => {
    if (!attachments || attachments.length === 0) return null;

    return (
      <div className="message-attachments">
        {attachments.map((attachment, index) => {
          const isImage = attachment.type === 'image' || isImageFile(attachment.name);
          const isVideo = attachment.type === 'video' || isVideoFile(attachment.name);

          if (isImage) {
            return (
              <a 
                key={index}
                href={`http://localhost:3010${attachment.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="message-attachment-image"
              >
                <img 
                  src={`http://localhost:3010${attachment.url}`} 
                  alt={attachment.name || 'Imagen'} 
                />
              </a>
            );
          }

          if (isVideo) {
            return (
              <div key={index} className="message-attachment-video">
                <video 
                  controls 
                  src={`http://localhost:3010${attachment.url}`}
                  style={{ maxWidth: '100%', borderRadius: '8px' }}
                >
                  Tu navegador no soporta video HTML5.
                </video>
              </div>
            );
          }

          return (
            <a 
              key={index}
              href={`http://localhost:3010${attachment.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="message-attachment-file"
            >
              <span className="message-attachment-icon">
                {getFileIcon(attachment.type)}
              </span>
              <div className="message-attachment-info">
                <span className="message-attachment-name">
                  {attachment.name || 'Archivo'}
                </span>
                {attachment.size && (
                  <span className="message-attachment-size">
                    {formatFileSize(attachment.size)}
                  </span>
                )}
              </div>
            </a>
          );
        })}
      </div>
    );
  };

  // Renderizar ubicación
  const renderLocation = (location) => {
    if (!location) return null;

    const mapUrl = location.mapUrl || buildGoogleMapsUrl(location.latitude, location.longitude);
    
    // URL para el iframe embebido de Google Maps
    const embedUrl = `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${location.latitude},${location.longitude}&zoom=15`;

    return (
      <div className="message-location-container">
        {/* Mapa embebido */}
        <div className="message-location-map">
          <iframe
            width="100%"
            height="200"
            style={{ border: 0, borderRadius: '12px' }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={embedUrl}
            title="Mapa de ubicación"
          />
        </div>
        
        {/* Información de la ubicación */}
        <a 
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="message-location"
          style={{ marginTop: '8px' }}
        >
          <div className="message-location-icon">📍</div>
          <div className="message-location-info">
            <div className="message-location-label">
              {location.label || 'Ver en Google Maps'}
            </div>
            {location.address && (
              <div className="message-location-address">
                {location.address}
              </div>
            )}
          </div>
        </a>
      </div>
    );
  };

  // Renderizar sticker
  const renderSticker = (sticker) => {
    if (!sticker) return null;

    return (
      <div className="message-sticker">
        <img 
          src={sticker.url} 
          alt={sticker.alt || 'Sticker'} 
        />
      </div>
    );
  };

  // Renderizar mensaje
  const renderMessage = (message) => {
    const isOwn = message.sender_id === currentUserId;
    const isEditing = editingMessageId === message.id;
    const initials = getUserInitials({ nombre: 'Usuario' });
    const avatarColor = getAvatarColor('Usuario');

    return (
      <div 
        key={message.id}
        className={`message ${isOwn ? 'message-own' : 'message-other'}`}
        onContextMenu={(e) => handleContextMenu(e, message)}
      >
        {!isOwn && (
          <div className="message-avatar">
            <UserAvatar 
              userId={message.sender_id}
              nombre={initials}
              size="sm"
              className="rounded-full"
            />
          </div>
        )}

        <div className="message-content-wrapper">
          {message.is_deleted ? (
            <div className="message-deleted">
              <span className="message-deleted-icon">🚫</span>
              <span className="message-deleted-text">Este mensaje fue eliminado</span>
            </div>
          ) : (
            <>
              {isEditing ? (
                <div className="message-edit-form">
                  <textarea
                    className="message-edit-input"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSaveEdit(message.id);
                      }
                      if (e.key === 'Escape') {
                        handleCancelEdit();
                      }
                    }}
                    autoFocus
                  />
                  <div className="message-edit-actions">
                    <button 
                      className="message-edit-cancel"
                      onClick={handleCancelEdit}
                    >
                      Cancelar
                    </button>
                    <button 
                      className="message-edit-save"
                      onClick={() => handleSaveEdit(message.id)}
                      disabled={!editContent.trim()}
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Botón de tres puntos para mensajes propios */}
                  {isOwn && !message.is_deleted && (
                    <button 
                      className="message-options-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Obtener posición relativa al contenedor message-list
                        const buttonRect = e.currentTarget.getBoundingClientRect();
                        const messageListElement = document.querySelector('.message-list');
                        const messageListRect = messageListElement.getBoundingClientRect();
                        
                        // Calcular posición relativa
                        const relativeX = buttonRect.left - messageListRect.left - 210; // Menú a la izquierda
                        const relativeY = buttonRect.top - messageListRect.top;
                        
                        // Verificar si hay espacio abajo para el menú
                        const menuHeight = 150; // Altura aproximada del menú con 3 opciones
                        const spaceBelow = messageListRect.bottom - buttonRect.bottom;
                        
                        const finalY = spaceBelow < menuHeight
                          ? relativeY - menuHeight + buttonRect.height // Mostrar arriba si no hay espacio
                          : relativeY; // Mostrar abajo normalmente
                        
                        setContextMenu({
                          show: true,
                          x: relativeX,
                          y: finalY,
                          message
                        });
                      }}
                      title="Opciones de mensaje"
                    >
                      ⋮
                    </button>
                  )}

                  {/* Adjuntos */}
                  {renderAttachments(message.attachments)}
                  
                  {/* Ubicación */}
                  {renderLocation(message.location)}
                  
                  {/* Sticker */}
                  {renderSticker(message.sticker)}
                  
                  {/* Contenido de texto */}
                  {message.content && (
                    <div className="message-bubble">
                      <p className="message-text">{message.content}</p>
                    </div>
                  )}
                  
                  {/* Info del mensaje */}
                  <div className="message-info">
                    <span className="message-time">
                      {formatMessageTime(message.sent_at)}
                    </span>
                    {message.edited_at && (
                      <span className="message-edited">editado</span>
                    )}
                    {isOwn && (
                      <span className="message-status">✓✓</span>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  if (messages.length === 0) {
    return (
      <div className="message-list-empty">
        <div className="message-list-empty-icon">💬</div>
        <p>No hay mensajes aún</p>
        <p className="message-list-empty-subtitle">Inicia la conversación</p>
      </div>
    );
  }

  return (
    <>
      <div className="message-list" ref={containerRef}>
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date} className="message-group">
            {/* Separador de fecha */}
            <div className="message-date-divider">
              <span>{date}</span>
            </div>

            {/* Mensajes de ese día */}
            {dateMessages.map(renderMessage)}
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Menú contextual */}
      {contextMenu.show && contextMenu.message && (
        <div 
          className="message-context-menu"
          style={{ 
            top: `${contextMenu.y}px`, 
            left: `${contextMenu.x}px` 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Opción de editar - solo para mensajes recientes */}
          {isMessageRecent(contextMenu.message) && (
            <button 
              className="message-context-menu-item"
              onClick={() => handleStartEdit(contextMenu.message)}
            >
              <span className="menu-icon">✏️</span>
              <span>Editar</span>
            </button>
          )}
          <button 
            className="message-context-menu-item"
            onClick={() => handleDelete(contextMenu.message, 'me')}
          >
            <span className="menu-icon">🗑️</span>
            <span>Eliminar para mí</span>
          </button>
          <button 
            className="message-context-menu-item message-context-menu-item-danger"
            onClick={() => handleDelete(contextMenu.message, 'everyone')}
          >
            <span className="menu-icon">⚠️</span>
            <span>Eliminar para todos</span>
          </button>
        </div>
      )}
    </>
  );
};

export default MessageList;
