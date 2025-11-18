import React, { useState, useRef, useEffect } from 'react';
import '../styles/MessageBubble.css';

/**
 * Burbuja de mensaje individual
 * Incluye menú contextual con tres puntos para editar/eliminar
 */
const MessageBubble = ({ message, isOwn, onEdit, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');
  const menuRef = useRef(null);
  const bubbleRef = useRef(null);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) &&
          bubbleRef.current && !bubbleRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  // Formatear hora
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  // Manejar edición
  const handleStartEdit = () => {
    setIsEditing(true);
    setEditContent(message.content || '');
    setShowMenu(false);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    await onEdit(message.id, editContent.trim());
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content || '');
  };

  // Manejar eliminación
  const handleDelete = (scope) => {
    onDelete(message.id, scope);
    setShowMenu(false);
  };

  // Renderizar adjuntos
  const renderAttachments = () => {
    if (!message.attachments || message.attachments.length === 0) return null;

    return (
      <div className="modern-bubble-attachments">
        {message.attachments.map((attachment, index) => {
          const isImage = attachment.type === 'image' || attachment.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
          const isVideo = attachment.type === 'video' || attachment.name?.match(/\.(mp4|webm|ogg)$/i);

          if (isImage) {
            return (
              <a 
                key={index}
                href={`http://localhost:3010${attachment.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="modern-bubble-image"
              >
                <img src={`http://localhost:3010${attachment.url}`} alt={attachment.name || 'Imagen'} />
              </a>
            );
          }

          if (isVideo) {
            return (
              <video 
                key={index}
                controls 
                src={`http://localhost:3010${attachment.url}`}
                className="modern-bubble-video"
              >
                Tu navegador no soporta video HTML5.
              </video>
            );
          }

          return (
            <a 
              key={index}
              href={`http://localhost:3010${attachment.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="modern-bubble-file"
            >
              <div className="modern-bubble-file-icon">📄</div>
              <div className="modern-bubble-file-info">
                <span className="modern-bubble-file-name">{attachment.name || 'Archivo'}</span>
                {attachment.size && (
                  <span className="modern-bubble-file-size">
                    {(attachment.size / 1024).toFixed(1)} KB
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
  const renderLocation = () => {
    if (!message.location) return null;

    const { latitude, longitude, label, address, mapUrl } = message.location;
    const href = mapUrl || `https://www.google.com/maps?q=${latitude},${longitude}`;

    return (
      <a 
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="modern-bubble-location"
      >
        <div className="modern-bubble-location-icon">📍</div>
        <div className="modern-bubble-location-info">
          <div className="modern-bubble-location-label">{label || 'Ubicación compartida'}</div>
          {address && <div className="modern-bubble-location-address">{address}</div>}
        </div>
      </a>
    );
  };

  // Si el mensaje está eliminado
  if (message.is_deleted) {
    return (
      <div className={`modern-bubble-wrapper ${isOwn ? 'own' : 'other'}`}>
        <div className="modern-bubble deleted">
          <div className="modern-bubble-deleted-content">
            <span className="modern-bubble-deleted-icon">🚫</span>
            <span className="modern-bubble-deleted-text">Este mensaje fue eliminado</span>
          </div>
          <div className="modern-bubble-meta">
            <span className="modern-bubble-time">{formatTime(message.sent_at)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`modern-bubble-wrapper ${isOwn ? 'own' : 'other'}`}>
      <div className="modern-bubble" ref={bubbleRef}>
        {/* Contenido del mensaje */}
        {isEditing ? (
          <div className="modern-bubble-edit">
            <textarea
              className="modern-bubble-edit-input"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveEdit();
                }
                if (e.key === 'Escape') {
                  handleCancelEdit();
                }
              }}
              autoFocus
            />
            <div className="modern-bubble-edit-actions">
              <button 
                className="modern-bubble-edit-cancel"
                onClick={handleCancelEdit}
              >
                Cancelar
              </button>
              <button 
                className="modern-bubble-edit-save"
                onClick={handleSaveEdit}
                disabled={!editContent.trim()}
              >
                Guardar
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Adjuntos */}
            {renderAttachments()}
            
            {/* Ubicación */}
            {renderLocation()}
            
            {/* Texto del mensaje */}
            {message.content && (
              <div className="modern-bubble-text">
                {message.content}
              </div>
            )}

            {/* Meta info (hora, estado, editado) */}
            <div className="modern-bubble-meta">
              {message.edited_at && (
                <span className="modern-bubble-edited">editado</span>
              )}
              <span className="modern-bubble-time">{formatTime(message.sent_at)}</span>
              {isOwn && (
                <span className="modern-bubble-status">
                  {message.read ? '✓✓' : '✓'}
                </span>
              )}
            </div>
          </>
        )}

        {/* Botón de menú (tres puntos) - Solo para mensajes propios no eliminados */}
        {!isEditing && isOwn && !message.is_deleted && (
          <button
            className="modern-bubble-menu-btn"
            onClick={() => setShowMenu(!showMenu)}
            title="Más opciones"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2"/>
              <circle cx="12" cy="12" r="2"/>
              <circle cx="12" cy="19" r="2"/>
            </svg>
          </button>
        )}

        {/* Menú contextual */}
        {showMenu && (
          <div className={`modern-bubble-menu ${isOwn ? 'own' : 'other'}`} ref={menuRef}>
            <button 
              className="modern-bubble-menu-item"
              onClick={handleStartEdit}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              <span>Editar mensaje</span>
            </button>
            <button 
              className="modern-bubble-menu-item"
              onClick={() => handleDelete('me')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              <span>Eliminar para mí</span>
            </button>
            <button 
              className="modern-bubble-menu-item danger"
              onClick={() => handleDelete('everyone')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
              <span>Eliminar para todos</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
