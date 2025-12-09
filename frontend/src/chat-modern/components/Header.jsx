import React from 'react';
import UserAvatar from '../../components/UserAvatar';
import '../styles/Header.css';

/**
 * Header del chat
 * Muestra nombre, estado, acciones y botón back en móvil
 */
const Header = ({ room, onBack, isMobile, connected, currentUserId }) => {
  // Obtener iniciales
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Color de avatar
  const getAvatarColor = (name) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
    ];
    const index = (name?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  };

  return (
    <div className="modern-header">
      {/* Botón back en móvil */}
      {isMobile && (
        <button className="modern-header-back" onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
      )}

      {/* Info del contacto/grupo */}
      <div className="modern-header-info">
        <div className="modern-header-avatar">
          {room?.type === 'private' && room.participants ? (
            (() => {
              const otherUser = room.participants.find(p => p.userId !== currentUserId);
              return otherUser ? (
                <UserAvatar 
                  userId={otherUser.userId}
                  nombre={room?.name || 'Chat'}
                  size="md"
                />
              ) : (
                <div style={{ backgroundColor: getAvatarColor(room?.name), width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                  {getInitials(room?.name || 'Chat')}
                </div>
              );
            })()
          ) : (
            <div style={{ backgroundColor: getAvatarColor(room?.name), width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
              {getInitials(room?.name || 'Chat')}
            </div>
          )}
        </div>
        <div className="modern-header-text">
          <h3 className="modern-header-name">{room?.name || 'Chat'}</h3>
          <span className="modern-header-status">
            {room?.typing ? 'escribiendo...' : connected ? 'en línea' : 'desconectado'}
          </span>
        </div>
      </div>

      {/* Acciones */}
      <div className="modern-header-actions">
        <button className="modern-header-btn" title="Buscar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </button>
        <button className="modern-header-btn" title="Más opciones">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="1"/>
            <circle cx="12" cy="5" r="1"/>
            <circle cx="12" cy="19" r="1"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Header;
