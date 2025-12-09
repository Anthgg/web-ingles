import React from 'react';
import { getUserInitials, getAvatarColor, isAdminRoleName } from '../utils/helpers';
import UserAvatar from '../../components/UserAvatar';
import '../styles/ChatHeader.css';

/**
 * Header del chat con información del usuario/sala actual
 * y controles de navegación móvil
 */
const ChatHeader = ({ 
  currentRoom, 
  onBack, 
  onToggleUserInfo, 
  showUserInfo,
  showBackButton = false,
  currentUserId,
  onLeaveRoom,
  onDeleteRoom
}) => {
  
  // Obtener información del otro usuario en chat directo
  const getOtherUser = () => {
    if (!currentRoom || !currentRoom.participants) return null;
    
    const otherParticipant = currentRoom.participants.find(
      p => p.userId !== currentUserId
    );
    
    return otherParticipant;
  };

  const otherUser = getOtherUser();
  const displayName = currentRoom?.type === 'private' 
    ? (otherUser?.userName || 'Usuario')
    : (currentRoom?.name || 'Chat');

  const initials = getUserInitials({ nombre: displayName });
  const avatarColor = getAvatarColor(displayName);
  const hasGroupPhoto = currentRoom?.type === 'group' && currentRoom?.group_photo;
  const currentParticipant = currentRoom?.participants?.find(p => p.userId === currentUserId);
  const isGroup = currentRoom?.type === 'group';
  const userIsOwner = currentParticipant?.role === 'owner';
  const userIsAdmin = isAdminRoleName(currentParticipant?.userRole);
  const roomHasOwner = Boolean(currentRoom?.participants?.some(participant => participant.role === 'owner'));
  const userActsAsOwner = userIsOwner || (!roomHasOwner && Boolean(currentParticipant));
  const canLeaveGroup = isGroup && Boolean(currentParticipant);
  const canDeleteRoom = currentRoom && (!isGroup || userActsAsOwner || userIsAdmin);
  const hasMenuActions = canLeaveGroup || canDeleteRoom;

  const [showMenu, setShowMenu] = React.useState(false);
  const menuRef = React.useRef(null);

  const closeMenu = React.useCallback(() => setShowMenu(false), []);

  React.useEffect(() => {
    if (!showMenu) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showMenu]);

  React.useEffect(() => {
    closeMenu();
  }, [currentRoom?.id, closeMenu]);

  const handleMenuAction = (action) => {
    setShowMenu(false);
    if (action === 'leave' && typeof onLeaveRoom === 'function') {
      onLeaveRoom();
    }
    if (action === 'delete' && typeof onDeleteRoom === 'function') {
      onDeleteRoom();
    }
  };

  // Debug: Ver datos del currentRoom
  React.useEffect(() => {
    if (currentRoom) {
      console.log('🔍 ChatHeader - currentRoom:', {
        id: currentRoom.id,
        name: currentRoom.name,
        type: currentRoom.type,
        description: currentRoom.description,
        group_photo: currentRoom.group_photo
      });
    }
  }, [currentRoom]);

  if (!currentRoom) {
    return (
      <div className="chat-header">
        <div className="chat-header-content">
          <h2 className="chat-header-title">Mensajes</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-header">
      <div className="chat-header-content">
        {/* Botón volver */}
        <button 
          onClick={onBack}
          aria-label="Volver a la lista"
          title="Volver a la lista"
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            border: 'none',
            color: 'white',
            padding: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'all 0.3s ease',
            flexShrink: 0,
            width: '40px',
            height: '40px',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.25)';
            e.target.style.transform = 'scale(1.1) translateX(-2px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.15)';
            e.target.style.transform = 'scale(1) translateX(0)';
          }}
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>

        {/* Avatar y nombre */}
        <div 
          className="chat-header-user"
          onClick={onToggleUserInfo}
          role="button"
          tabIndex={0}
          aria-label="Ver información del usuario"
        >
          <div className="chat-header-avatar">
            {hasGroupPhoto ? (
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
                <img 
                  src={`http://localhost:3010${currentRoom.group_photo}`}
                  alt={displayName}
                  className="chat-header-avatar-img"
                  onError={(e) => {
                    console.warn('Error loading group photo in header:', currentRoom.group_photo);
                    e.target.style.display = 'none';
                    e.target.parentElement.style.backgroundColor = avatarColor;
                    e.target.parentElement.innerHTML = initials;
                  }}
                />
              </div>
            ) : currentRoom?.type === 'private' && otherUser ? (
              <UserAvatar 
                userId={otherUser.userId}
                nombre={displayName}
                tieneFoto={otherUser.tieneFotoPerfil === 1 || otherUser.tieneFotoPerfil === true}
                size="md"
              />
            ) : (
              <div style={{ backgroundColor: avatarColor, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '16px', fontWeight: '600', color: 'white' }}>
                {initials}
              </div>
            )}
          </div>
          
          <div className="chat-header-info">
            <h3 className="chat-header-name">{displayName}</h3>
            <p className="chat-header-status">
              {currentRoom.type === 'private' 
                ? 'En línea' 
                : currentRoom.description 
                  ? currentRoom.description.substring(0, 50) + (currentRoom.description.length > 50 ? '...' : '')
                  : `${currentRoom.participants?.length || 0} participantes`
              }
            </p>
          </div>
        </div>

        {/* Botón de información (desktop) */}
        <div className="chat-header-actions">
          <button 
            className={`chat-header-info-btn ${showUserInfo ? 'active' : ''}`}
            onClick={onToggleUserInfo}
            aria-label="Información del chat"
          >
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </button>

          {hasMenuActions && (
            <div className="chat-header-menu" ref={menuRef}>
              <button
                className="chat-header-menu-btn"
                onClick={() => setShowMenu((prev) => !prev)}
                aria-label="Opciones del chat"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </button>

              {showMenu && (
                <div className="chat-header-dropdown">
                  {canLeaveGroup && (
                    <button onClick={() => handleMenuAction('leave')}>
                      Abandonar grupo
                    </button>
                  )}
                  {canDeleteRoom && (
                    <button 
                      className="chat-header-dropdown-danger"
                      onClick={() => handleMenuAction('delete')}
                    >
                      {isGroup ? 'Eliminar grupo' : 'Eliminar chat'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
