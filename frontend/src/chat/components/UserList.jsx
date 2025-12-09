import React, { useState, useMemo } from 'react';
import { 
  getUserDisplayName, 
  getUserInitials, 
  getAvatarColor,
  formatLastSeen,
  truncateText 
} from '../utils/helpers';
import UserAvatar from '../../components/UserAvatar';
import '../styles/UserList.css';

/**
 * Lista de usuarios/salas con búsqueda y último mensaje
 */
const UserList = ({ 
  rooms, 
  currentRoom, 
  onSelectRoom, 
  contacts,
  onCreateChat,
  onClose,
  currentUserId,
  archiveRoomRequest,
  unarchiveRoomRequest,
  loadArchivedRooms,
  deleteRoomRequest
}) => {
  // Debug: Ver qué datos están llegando
  React.useEffect(() => {
    console.log('🔍 UserList - Rooms recibidas:', rooms);
    const groupRooms = rooms.filter(r => r.type === 'group');
    console.log('🔍 UserList - Grupos:', groupRooms.map(g => ({
      id: g.id,
      name: g.name,
      description: g.description,
      group_photo: g.group_photo
    })));
  }, [rooms]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, room: null });
  const [showArchived, setShowArchived] = useState(false); // Estado para mostrar archivados
  const [archivedRooms, setArchivedRooms] = useState([]); // Chats archivados
  const [loadingArchived, setLoadingArchived] = useState(false);
  
  // Estado para nuevo grupo (flujo multi-paso)
  const [groupStep, setGroupStep] = useState(1); // 1: Participantes, 2: Detalles
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupPhoto, setGroupPhoto] = useState(null);
  const [groupPhotoPreview, setGroupPhotoPreview] = useState(null);

  // Cerrar menú contextual al hacer clic fuera
  React.useEffect(() => {
    if (!contextMenu.show) return;
    
    const handleClick = (e) => {
      // Verificar si el clic fue fuera del menú y del botón
      const menu = document.querySelector('.user-list-context-menu');
      const button = e.target.closest('.user-list-item-options-btn');
      
      if (menu && !menu.contains(e.target) && !button) {
        setContextMenu({ show: false, x: 0, y: 0, room: null });
      }
    };
    
    // Pequeño delay para evitar que se cierre inmediatamente al abrir
    setTimeout(() => {
      document.addEventListener('click', handleClick);
    }, 0);
    
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu.show]);

  // Filtrar rooms por búsqueda
  const filteredRooms = useMemo(() => {
    if (!searchQuery.trim()) return rooms;

    const query = searchQuery.toLowerCase();
    return rooms.filter(room => {
      // Buscar en nombre de sala
      if (room.name?.toLowerCase().includes(query)) return true;

      // Buscar en nombres de participantes
      const otherUser = room.participants?.find(p => p.userId !== currentUserId);
      if (otherUser?.userName?.toLowerCase().includes(query)) return true;

      // Buscar en último mensaje
      if (room.lastMessage?.content?.toLowerCase().includes(query)) return true;

      return false;
    });
  }, [rooms, searchQuery, currentUserId]);

  // Filtrar contactos por búsqueda
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;

    const query = searchQuery.toLowerCase();
    return contacts.filter(contact => 
      contact.nombre?.toLowerCase().includes(query) ||
      contact.email?.toLowerCase().includes(query)
    );
  }, [contacts, searchQuery]);

  // Obtener nombre del otro usuario en chat directo
  const getOtherUserName = (room) => {
    if (!room.participants) return room.name || 'Chat';

    const otherUser = room.participants.find(p => p.userId !== currentUserId);
    return otherUser?.userName || room.name || 'Usuario';
  };

  // Renderizar último mensaje
  const renderLastMessage = (message) => {
    if (!message) return 'No hay mensajes';

    if (message.is_deleted) {
      return '🚫 Mensaje eliminado';
    }

    if (message.attachments && message.attachments.length > 0) {
      const attachment = message.attachments[0];
      const prefix = message.sender_id === currentUserId ? 'Tú: ' : '';
      
      switch (attachment.type) {
        case 'image':
          return `${prefix}📷 Imagen`;
        case 'video':
          return `${prefix}🎥 Video`;
        case 'audio':
          return `${prefix}🎵 Audio`;
        default:
          return `${prefix}📎 ${attachment.name || 'Archivo'}`;
      }
    }

    if (message.location) {
      return `${message.sender_id === currentUserId ? 'Tú: ' : ''}📍 Ubicación`;
    }

    if (message.sticker) {
      return `${message.sender_id === currentUserId ? 'Tú: ' : ''}😊 Sticker`;
    }

    const prefix = message.sender_id === currentUserId ? 'Tú: ' : '';
    return truncateText(`${prefix}${message.content}`, 40);
  };

  // Manejar selección de sala
  const handleSelectRoom = (room) => {
    onSelectRoom(room);
    if (onClose) onClose(); // Cerrar en móvil
  };

  // Crear nuevo chat con contacto
  const handleCreateChat = async (contact) => {
    const existingRoom = rooms.find(room => {
      if (room.type !== 'private') return false;
      return room.participants?.some(p => p.userId === contact.id);
    });

    if (existingRoom) {
      handleSelectRoom(existingRoom);
      setShowNewChatModal(false);
      return;
    }

    // Crear nuevo chat
    await onCreateChat(contact);
    setShowNewChatModal(false);
  };

  // Toggle participante en grupo
  const toggleParticipant = (contactId) => {
    setSelectedParticipants(prev => {
      if (prev.includes(contactId)) {
        return prev.filter(id => id !== contactId);
      } else {
        return [...prev, contactId];
      }
    });
  };

  // Manejar cambio de foto del grupo
  const handleGroupPhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar 5MB');
      return;
    }

    setGroupPhoto(file);

    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setGroupPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Remover foto del grupo
  const handleRemoveGroupPhoto = () => {
    setGroupPhoto(null);
    setGroupPhotoPreview(null);
  };

  // Avanzar al siguiente paso (participantes → detalles)
  const handleNextStep = () => {
    if (selectedParticipants.length < 2) {
      alert('Debes seleccionar al menos 2 participantes para crear un grupo');
      return;
    }
    setGroupStep(2);
  };

  // Retroceder al paso anterior (detalles → participantes)
  const handlePreviousStep = () => {
    setGroupStep(1);
  };

  // Crear nuevo grupo (paso final)
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert('Por favor ingresa un nombre para el grupo');
      return;
    }

    if (selectedParticipants.length === 0) {
      alert('Selecciona al menos un participante');
      return;
    }

    // Crear datos del grupo
    const participants = selectedParticipants.map(contactId => ({ userId: contactId }));
    
    await onCreateChat(
      { 
        id: null, 
        nombre: groupName,
        description: groupDescription,
        groupPhoto: groupPhoto // El archivo se subirá en Chat.jsx
      }, 
      'group', 
      participants
    );

    // Resetear estado
    setShowNewGroupModal(false);
    setGroupStep(1);
    setGroupName('');
    setGroupDescription('');
    setGroupPhoto(null);
    setGroupPhotoPreview(null);
    setSelectedParticipants([]);
    setSearchQuery('');
  };

  // Toggle vista de archivados
  const handleToggleArchived = async () => {
    if (!showArchived && loadArchivedRooms) {
      setLoadingArchived(true);
      const archived = await loadArchivedRooms();
      setArchivedRooms(archived);
      setLoadingArchived(false);
    }
    setShowArchived(!showArchived);
  };

  // Desarchivar chat
  const handleUnarchive = async (room) => {
    if (unarchiveRoomRequest) {
      const result = await unarchiveRoomRequest(room.id);
      if (result.ok) {
        // Recargar archivados
        const archived = await loadArchivedRooms();
        setArchivedRooms(archived);
      } else {
        alert(result.error || 'Error al restaurar el chat');
      }
    }
  };

  return (
    <div className="user-list">
      {/* Header */}
      <div className="user-list-header">
        <h2 className="user-list-title">Mensajes</h2>
      </div>

      {/* Botones de acción debajo del título - deslizables */}
      <div className="user-list-actions-container">
        <div className="user-list-actions-row">
          <button 
            className="user-list-action-btn user-list-new-chat-btn"
            onClick={() => setShowNewChatModal(true)}
            aria-label="Nuevo chat"
            title="Nuevo chat"
          >
            <svg 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>Nuevo chat</span>
          </button>

          <button 
            className="user-list-action-btn user-list-new-group-btn"
            onClick={() => setShowNewGroupModal(true)}
            aria-label="Nuevo grupo"
            title="Nuevo grupo"
          >
            <svg 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span>Crear grupo</span>
          </button>

          <button 
            className={`user-list-action-btn user-list-archived-btn ${showArchived ? 'active' : ''}`}
            onClick={handleToggleArchived}
            aria-label={showArchived ? "Ver chats activos" : "Ver archivados"}
            title={showArchived ? "Ver chats activos" : "Ver archivados"}
          >
            <span style={{ fontSize: '18px' }}>{showArchived ? '💬' : '📁'}</span>
            <span>{showArchived ? 'Activos' : 'Archivados'}</span>
          </button>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="user-list-search">
        <svg 
          className="user-list-search-icon"
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input 
          type="text"
          className="user-list-search-input"
          placeholder="Buscar mensajes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button 
            className="user-list-search-clear"
            onClick={() => setSearchQuery('')}
            aria-label="Limpiar búsqueda"
          >
            ×
          </button>
        )}
      </div>

      {/* Lista de chats */}
      <div className="user-list-items">
        {showArchived ? (
          /* Vista de archivados */
          loadingArchived ? (
            <div className="user-list-empty">
              <p>Cargando chats archivados...</p>
            </div>
          ) : archivedRooms.length === 0 ? (
            <div className="user-list-empty">
              <p>No hay chats archivados</p>
            </div>
          ) : (
            archivedRooms.map(room => {
              const displayName = room.type === 'private' 
                ? getOtherUserName(room) 
                : room.name;
              const initials = getUserInitials({ nombre: displayName });
              const avatarColor = getAvatarColor(displayName);

              return (
                <div 
                  key={room.id}
                  className="user-list-item"
                  role="button"
                  tabIndex={0}
                >
                  <div onClick={() => onSelectRoom(room)} className="user-list-item-clickable">
                    <div 
                      className="user-list-item-avatar"
                      style={{ background: avatarColor }}
                    >
                      {initials}
                    </div>
                    
                    <div className="user-list-item-content">
                      <div className="user-list-item-header">
                        <h4 className="user-list-item-name">{displayName}</h4>
                        <span className="user-list-item-archived-badge">📁</span>
                      </div>
                      <p className="user-list-item-message">Chat archivado</p>
                    </div>
                  </div>

                  <button 
                    className="user-list-item-options-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleUnarchive(room);
                    }}
                    title="Restaurar chat"
                  >
                    ↩️
                  </button>
                </div>
              );
            })
          )
        ) : (
          /* Vista normal de chats activos */
          filteredRooms.length === 0 ? (
            <div className="user-list-empty">
              <p>No hay conversaciones</p>
              <button 
                className="user-list-empty-btn"
                onClick={() => setShowNewChatModal(true)}
              >
                Iniciar nuevo chat
              </button>
            </div>
          ) : (
            filteredRooms.map(room => {
            const displayName = room.type === 'private' 
              ? getOtherUserName(room) 
              : room.name;
            const initials = getUserInitials({ nombre: displayName });
            const avatarColor = getAvatarColor(displayName);
            const isActive = currentRoom?.id === room.id;
            const hasGroupPhoto = room.type === 'group' && room.group_photo;
            const otherUser = room.type === 'private' 
              ? room.participants?.find(p => p.userId !== currentUserId)
              : null;

            return (
              <div 
                key={room.id}
                className={`user-list-item ${isActive ? 'active' : ''}`}
                role="button"
                tabIndex={0}
              >
                <div 
                  onClick={() => handleSelectRoom(room)}
                  className="user-list-item-clickable"
                >
                  <div className="user-list-item-avatar">
                    {hasGroupPhoto ? (
                      <img 
                        src={`http://localhost:3010${room.group_photo}`}
                        alt={displayName}
                        className="user-list-item-avatar-img"
                        onError={(e) => {
                          console.warn('Error loading group photo:', room.group_photo);
                          e.target.style.display = 'none';
                          e.target.parentElement.style.backgroundColor = avatarColor;
                          e.target.parentElement.innerHTML = initials;
                        }}
                      />
                    ) : room.type === 'private' && otherUser ? (
                      <UserAvatar 
                        userId={otherUser.userId}
                        nombre={displayName}
                        tieneFoto={otherUser.tieneFotoPerfil === 1 || otherUser.tieneFotoPerfil === true}
                        size="md"
                      />
                    ) : (
                      <div style={{ backgroundColor: avatarColor, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                        {initials}
                      </div>
                    )}
                  </div>
                  
                  <div className="user-list-item-content">
                    <div className="user-list-item-header">
                      <h4 className="user-list-item-name">{displayName}</h4>
                      <span className="user-list-item-time">
                        {formatLastSeen(room.lastMessageAt)}
                      </span>
                    </div>
                    
                    <p className="user-list-item-message">
                      {renderLastMessage(room.lastMessage)}
                    </p>
                  </div>
                </div>

                {/* Botón de tres puntos */}
                <button 
                  className="user-list-item-options-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    
                    // Obtener la posición del botón relativa al contenedor user-list
                    const buttonRect = e.currentTarget.getBoundingClientRect();
                    const userListElement = e.currentTarget.closest('.user-list');
                    const userListRect = userListElement.getBoundingClientRect();
                    
                    // Calcular posición relativa al contenedor - justo al lado izquierdo del botón
                    const relativeX = buttonRect.left - userListRect.left - 190; // Ancho del menú (180px) + margen (10px)
                    
                    // Verificar si hay espacio abajo, si no, mostrar arriba
                    const menuHeight = 100; // Altura aproximada del menú
                    const spaceBelow = userListRect.bottom - buttonRect.bottom;
                    const relativeY = spaceBelow < menuHeight 
                      ? buttonRect.top - userListRect.top - menuHeight 
                      : buttonRect.top - userListRect.top;
                    
                    setContextMenu({
                      show: true,
                      x: relativeX,
                      y: relativeY,
                      room
                    });
                  }}
                  title="Opciones de chat"
                >
                  ⋮
                </button>
              </div>
            );
          }))
        )}
      </div>

      {/* Menú contextual de chat */}
      {contextMenu.show && contextMenu.room && (
        <div 
          className="user-list-context-menu"
          style={{ 
            top: `${contextMenu.y}px`, 
            left: `${contextMenu.x}px`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="user-list-context-menu-item"
            onClick={async () => {
              const room = contextMenu.room;
              setContextMenu({ show: false, x: 0, y: 0, room: null });
              
              if (archiveRoomRequest) {
                const result = await archiveRoomRequest(room.id);
                if (result.ok) {
                  console.log('✅ Chat archivado:', room);
                } else {
                  alert(result.error || 'Error al archivar el chat');
                }
              }
            }}
          >
            <span className="menu-icon">📁</span>
            <span>Archivar chat</span>
          </button>
          <button 
            className="user-list-context-menu-item user-list-context-menu-item-danger"
            onClick={async () => {
              const room = contextMenu.room;
              const confirmDelete = window.confirm(
                `¿Estás seguro de eliminar el chat con ${getUserDisplayName(room)}?\n\nEsta acción no se puede deshacer.`
              );
              
              setContextMenu({ show: false, x: 0, y: 0, room: null });
              
              if (confirmDelete && deleteRoomRequest) {
                const result = await deleteRoomRequest(room.id);
                if (result.ok) {
                  console.log('✅ Chat eliminado:', room);
                } else {
                  alert(result.error || 'Error al eliminar el chat');
                }
              }
            }}
          >
            <span className="menu-icon">🗑️</span>
            <span>Eliminar chat</span>
          </button>
        </div>
      )}

      {/* Modal nuevo chat */}
      {showNewChatModal && (
        <div className="new-chat-modal-overlay" onClick={() => setShowNewChatModal(false)}>
          <div className="new-chat-modal" onClick={e => e.stopPropagation()}>
            <div className="new-chat-modal-header">
              <h3>Nuevo chat</h3>
              <button 
                className="new-chat-modal-close"
                onClick={() => setShowNewChatModal(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="new-chat-modal-search">
              <input 
                type="text"
                placeholder="Buscar contacto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="new-chat-modal-contacts">
              {filteredContacts.length === 0 ? (
                <p className="new-chat-modal-empty">No hay contactos disponibles</p>
              ) : (
                filteredContacts.map(contact => {
                  const initials = getUserInitials(contact);
                  const avatarColor = getAvatarColor(contact.nombre);

                  return (
                    <div 
                      key={contact.id}
                      className="new-chat-modal-contact"
                      onClick={() => handleCreateChat(contact)}
                    >
                      <div className="new-chat-modal-contact-avatar">
                        <UserAvatar 
                          userId={contact.id}
                          nombre={contact.nombre}
                          tieneFoto={contact.tiene_foto_perfil === 1 || contact.tiene_foto_perfil === true}
                          size="md"
                        />
                      </div>
                      
                      <div className="new-chat-modal-contact-info">
                        <h4>{contact.nombre}</h4>
                        <p>{contact.email}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal nuevo grupo */}
      {showNewGroupModal && (
        <div className="new-group-modal">
          {/* PASO 1: Seleccionar participantes */}
          {groupStep === 1 && (
            <>
              <div className="new-group-header">
                <button 
                  className="new-group-back"
                  onClick={() => {
                    setShowNewGroupModal(false);
                    setGroupStep(1);
                    setSelectedParticipants([]);
                    setSearchQuery('');
                  }}
                  aria-label="Cerrar"
                >
                  ←
                </button>
                <h3 className="new-group-title">
                  Nuevo grupo - Participantes
                </h3>
              </div>

              <div className="new-group-search">
                <input 
                  type="text"
                  className="new-group-search-input"
                  placeholder="Buscar contactos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="new-group-participants-count">
                <span>{selectedParticipants.length} participante(s) seleccionado(s)</span>
                {selectedParticipants.length >= 2 && (
                  <span className="new-group-participants-hint">
                    ✓ Mínimo alcanzado
                  </span>
                )}
              </div>

              <div className="new-group-participants">
                {filteredContacts.length === 0 ? (
                  <p className="new-group-empty">No hay contactos disponibles</p>
                ) : (
                  filteredContacts.map(contact => {
                    const initials = getUserInitials(contact);
                    const avatarColor = getAvatarColor(contact.nombre);
                    const isSelected = selectedParticipants.includes(contact.id);

                    return (
                      <div 
                        key={contact.id}
                        className={`new-group-contact ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleParticipant(contact.id)}
                      >
                        <div className="new-group-checkbox">
                          {isSelected && '✓'}
                        </div>

                        <div className="new-group-contact-avatar">
                          <UserAvatar 
                            userId={contact.id}
                            nombre={contact.nombre}
                            tieneFoto={contact.tiene_foto_perfil === 1 || contact.tiene_foto_perfil === true}
                            size="md"
                          />
                        </div>
                        
                        <div className="new-group-contact-info">
                          <h4 className="new-group-contact-name">{contact.nombre}</h4>
                          <p className="new-group-contact-email">{contact.email}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="new-group-actions">
                <button 
                  className="new-group-cancel"
                  onClick={() => {
                    setShowNewGroupModal(false);
                    setGroupStep(1);
                    setSelectedParticipants([]);
                    setSearchQuery('');
                  }}
                >
                  Cancelar
                </button>
                <button 
                  className="new-group-create"
                  onClick={handleNextStep}
                  disabled={selectedParticipants.length < 2}
                >
                  Siguiente ({selectedParticipants.length}/∞)
                </button>
              </div>
            </>
          )}

          {/* PASO 2: Detalles del grupo */}
          {groupStep === 2 && (
            <>
              <div className="new-group-header">
                <button 
                  className="new-group-back"
                  onClick={handlePreviousStep}
                  aria-label="Volver"
                >
                  ←
                </button>
                <h3 className="new-group-title">
                  Nuevo grupo - Detalles
                </h3>
              </div>

              <div className="new-group-form">
                {/* Foto del grupo */}
                <div className="new-group-photo-section">
                  <label htmlFor="groupPhoto" className="new-group-photo-label">
                    {groupPhotoPreview ? (
                      <div className="new-group-photo-preview">
                        <img src={groupPhotoPreview} alt="Preview" />
                        <button 
                          type="button"
                          className="new-group-photo-remove"
                          onClick={(e) => {
                            e.preventDefault();
                            handleRemoveGroupPhoto();
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="new-group-photo-placeholder">
                        <svg 
                          width="48" 
                          height="48" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <polyline points="21 15 16 10 5 21"/>
                        </svg>
                        <span>Foto del grupo</span>
                        <span className="new-group-photo-hint">(Opcional)</span>
                      </div>
                    )}
                  </label>
                  <input 
                    type="file"
                    id="groupPhoto"
                    accept="image/*"
                    onChange={handleGroupPhotoChange}
                    style={{ display: 'none' }}
                  />
                </div>

                {/* Nombre del grupo */}
                <div className="new-group-input-section">
                  <label htmlFor="groupName" className="new-group-label">
                    Nombre del grupo *
                  </label>
                  <input 
                    type="text"
                    id="groupName"
                    className="new-group-input"
                    placeholder="Ej: Curso de Inglés A1"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    autoFocus
                    maxLength={50}
                  />
                  <span className="new-group-char-count">
                    {groupName.length}/50
                  </span>
                </div>

                {/* Descripción del grupo */}
                <div className="new-group-input-section">
                  <label htmlFor="groupDescription" className="new-group-label">
                    Descripción del grupo
                  </label>
                  <textarea 
                    id="groupDescription"
                    className="new-group-textarea"
                    placeholder="Describe el propósito del grupo... (Opcional)"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    maxLength={200}
                    rows={3}
                  />
                  <span className="new-group-char-count">
                    {groupDescription.length}/200
                  </span>
                </div>

                {/* Lista de participantes seleccionados */}
                <div className="new-group-selected-section">
                  <h4 className="new-group-selected-title">
                    Participantes seleccionados ({selectedParticipants.length})
                  </h4>
                  <div className="new-group-selected-list">
                    {selectedParticipants.map(contactId => {
                      const contact = contacts.find(c => c.id === contactId);
                      if (!contact) return null;
                      
                      const initials = getUserInitials(contact);
                      const avatarColor = getAvatarColor(contact.nombre);

                      return (
                        <div key={contactId} className="new-group-selected-item">
                          <div className="new-group-selected-avatar">
                            <UserAvatar 
                              userId={contactId}
                              nombre={contact.nombre}
                              size="sm"
                            />
                          </div>
                          <span className="new-group-selected-name">
                            {contact.nombre}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="new-group-actions">
                <button 
                  className="new-group-cancel"
                  onClick={handlePreviousStep}
                >
                  Atrás
                </button>
                <button 
                  className="new-group-create"
                  onClick={handleCreateGroup}
                  disabled={!groupName.trim()}
                >
                  Crear grupo
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default UserList;
