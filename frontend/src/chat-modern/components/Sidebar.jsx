import React, { useState } from 'react';
import '../styles/Sidebar.css';

/**
 * Sidebar con lista de chats
 * Muestra foto, nombre, último mensaje y hora
 */
const Sidebar = ({ rooms, currentRoom, onSelectRoom, user, theme, onToggleTheme, connected, isMobile }) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrar chats por búsqueda
  const filteredRooms = rooms.filter(room => {
    const roomName = room.name?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return roomName.includes(query);
  });

  // Obtener iniciales del nombre
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Color de avatar basado en el nombre
  const getAvatarColor = (name) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
    ];
    const index = (name?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  };

  // Formatear hora del último mensaje
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Hoy
    if (diff < 86400000) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    
    // Esta semana
    if (diff < 604800000) {
      return date.toLocaleDateString('es-ES', { weekday: 'short' });
    }
    
    // Más antiguo
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="modern-sidebar">
      {/* Header del sidebar */}
      <div className="modern-sidebar-header">
        <div className="modern-sidebar-user">
          <div 
            className="modern-sidebar-user-avatar"
            style={{ backgroundColor: getAvatarColor(user?.nombre) }}
          >
            {getInitials(user?.nombre || 'Usuario')}
          </div>
          <div className="modern-sidebar-user-info">
            <h3>{user?.nombre || 'Usuario'}</h3>
            <span className={`modern-sidebar-status ${connected ? 'online' : 'offline'}`}>
              {connected ? 'En línea' : 'Desconectado'}
            </span>
          </div>
        </div>
        
        <div className="modern-sidebar-actions">
          <button 
            className="modern-sidebar-btn"
            onClick={onToggleTheme}
            title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="modern-sidebar-search">
        <div className="modern-sidebar-search-container">
          <svg 
            className="modern-sidebar-search-icon" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar conversación..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="modern-sidebar-search-input"
          />
          {searchQuery && (
            <button 
              className="modern-sidebar-search-clear"
              onClick={() => setSearchQuery('')}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Lista de chats */}
      <div className="modern-sidebar-chats">
        {filteredRooms.length === 0 ? (
          <div className="modern-sidebar-empty">
            <p>No hay conversaciones</p>
          </div>
        ) : (
          filteredRooms.map(room => (
            <div
              key={room.id}
              className={`modern-chat-item ${currentRoom?.id === room.id ? 'active' : ''}`}
              onClick={() => onSelectRoom(room)}
            >
              <div 
                className="modern-chat-item-avatar"
                style={{ backgroundColor: getAvatarColor(room.name) }}
              >
                {getInitials(room.name)}
              </div>
              
              <div className="modern-chat-item-content">
                <div className="modern-chat-item-header">
                  <h4 className="modern-chat-item-name">{room.name || 'Sin nombre'}</h4>
                  <span className="modern-chat-item-time">
                    {formatTime(room.last_message_at)}
                  </span>
                </div>
                
                <div className="modern-chat-item-preview">
                  <p className="modern-chat-item-message">
                    {room.last_message || 'Sin mensajes'}
                  </p>
                  {room.unread_count > 0 && (
                    <span className="modern-chat-item-badge">
                      {room.unread_count > 99 ? '99+' : room.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Sidebar;
