import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../hooks/useChat';
import ChatHeader from './ChatHeader';
import UserList from './UserList';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UserInfo from './UserInfo';
import { ToastContainer } from './Toast';
import '../styles/Chat.css';

/**
 * Componente principal del chat
 * Orquesta todos los subcomponentes y maneja el estado global
 */
const Chat = () => {
  // Obtener autenticación del contexto
  const { user, token } = useAuth();
  const userId = user?.id;

  // Hook principal del chat
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
    leaveRoomRequest,
    removeParticipantRequest,
    addParticipantsRequest,
    archiveRoomRequest,
    unarchiveRoomRequest,
    loadArchivedRooms,
    deleteRoomRequest,
    sendLocationMessage,
    toasts,
    removeToast,
  } = useChat(userId, token);

  // Estados de UI
  const [showUserList, setShowUserList] = useState(true);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [mobileView, setMobileView] = useState(window.innerWidth < 768 ? 'list' : 'chat'); // 'list', 'chat', 'info'

  // Detectar tamaño de pantalla (sin currentRoom en dependencias para evitar bucle)
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      
      if (!isMobile) {
        // En desktop, mostrar siempre la lista
        setShowUserList(true);
        setMobileView('chat');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Manejar cambio de sala seleccionada en móvil (efecto separado)
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      if (currentRoom) {
        setMobileView('chat');
      } else {
        setMobileView('list');
      }
    }
  }, [currentRoom]);

  // Cerrar panel de información cuando cambia la sala o no hay sala
  useEffect(() => {
    if (!currentRoom) {
      setShowUserInfo(false);
      setMobileView('list');
    } else {
      // Cerrar info cuando cambia de sala
      setShowUserInfo(false);
      const isMobile = window.innerWidth < 768;
      if (!isMobile) {
        // En desktop mantener cerrado al cambiar de sala
        setShowUserInfo(false);
      }
    }
  }, [currentRoom]);

  // Cuando se selecciona una sala en móvil, cambiar a vista de chat
  const handleSelectRoom = (room) => {
    selectRoom(room);
    
    if (window.innerWidth < 768) {
      setMobileView('chat');
      setShowUserInfo(false);
    }
  };

  // Volver a lista de usuarios (móvil)
  const handleBackToList = () => {
    setMobileView('list');
    selectRoom(null);
  };

  // Abrir información del usuario (móvil)
  const handleOpenUserInfo = () => {
    if (window.innerWidth < 768) {
      setMobileView('info');
    } else {
      setShowUserInfo(!showUserInfo);
    }
  };

  // Cerrar información del usuario (móvil)
  const handleCloseUserInfo = () => {
    setMobileView('chat');
    setShowUserInfo(false);
  };

  // Crear nuevo chat o grupo
  const handleCreateChat = async (contact, type = 'private', participants = null) => {
    try {
      // Si es un grupo
      if (type === 'group' && participants) {
        let groupPhotoUrl = null;

        // Si hay una foto del grupo, subirla primero
        if (typeof contact.groupPhoto === 'string' && contact.groupPhoto.trim()) {
          groupPhotoUrl = contact.groupPhoto.trim();
        } else if (contact.groupPhoto instanceof File) {
          const formData = new FormData();
          formData.append('photo', contact.groupPhoto);

          try {
            const response = await fetch('http://localhost:3010/upload-group-photo', {
              method: 'POST',
              headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: formData
            });

            if (response.ok) {
              const data = await response.json();
              groupPhotoUrl = data.url;
            } else {
              const errorText = await response.text();
              console.error('Error al subir la foto del grupo:', response.status, errorText);
            }
          } catch (uploadError) {
            console.error('Error al subir la foto del grupo:', uploadError);
            // Continuar sin la foto si falla
          }
        }

        // Crear el grupo con los datos
        const newRoom = await createRoom(
          contact.nombre,
          'group',
          participants,
          contact.description || null,
          groupPhotoUrl
        );

        if (newRoom) {
          handleSelectRoom(newRoom);
        }
        return;
      }

      // Si es un chat directo
      const newRoom = await createRoom(
        contact.nombre,
        'private',
        [
          { userId: contact.id },
          { userId }
        ]
      );

      if (newRoom) {
        handleSelectRoom(newRoom);
      }
    } catch (error) {
      console.error('Error creando chat:', error);
      alert('Error al crear el chat. Por favor intenta nuevamente.');
    }
  };

  const handleLeaveRoom = async () => {
    if (!currentRoom || currentRoom.type !== 'group') {
      return;
    }

    const confirmation = window.confirm(`¿Deseas abandonar el grupo "${currentRoom.name}"?`);
    if (!confirmation) {
      return;
    }

    const result = await leaveRoomRequest(currentRoom.id);
    if (!result.ok) {
      alert(result.error || 'No se pudo abandonar el grupo');
      return;
    }

    selectRoom(null);
    setMobileView('list');
  };

  const handleDeleteRoom = async () => {
    if (!currentRoom) {
      return;
    }

    const isGroup = currentRoom.type === 'group';
    const label = isGroup ? 'grupo' : 'chat';
    const confirmation = window.confirm(`¿Eliminar este ${label}? Esta acción no se puede deshacer.`);
    if (!confirmation) {
      return;
    }

    const result = await deleteRoomRequest(currentRoom.id);
    if (!result.ok) {
      alert(result.error || `No se pudo eliminar el ${label}`);
      return;
    }

    selectRoom(null);
    setMobileView('list');
  };

  const handleRemoveParticipant = async (participant) => {
    if (!currentRoom || !participant || !participant.userId) {
      return;
    }

    const displayName = participant.userName || participant.nombre || 'este integrante';
    
    // Crear toast de confirmación personalizado
    const confirmed = window.confirm(`¿Eliminar a ${displayName} del grupo?`);
    if (!confirmed) {
      return;
    }

    const result = await removeParticipantRequest(currentRoom.id, participant.userId);
    if (!result.ok) {
      // Ya no usar alert, el hook ya muestra toast de error
      console.error('Error al eliminar participante:', result.error);
    } else {
      // Opcional: mostrar toast de éxito (el evento socket ya lo hace)
      console.log('Participante eliminado exitosamente');
    }
  };

  const handleAddParticipants = async (participantIds) => {
    if (!currentRoom || !participantIds || participantIds.length === 0) {
      return;
    }

    const result = await addParticipantsRequest(currentRoom.id, participantIds);
    if (!result.ok) {
      console.error('Error al agregar participantes:', result.error);
    }
    return result;
  };

  const handleSendLocationMessage = async (locationData) => {
    const result = await sendLocationMessage(locationData);
    if (!result?.ok) {
      alert(result?.error || 'No se pudo enviar la ubicación');
    }
    return result; // Retornar el resultado para que MessageInput lo pueda verificar
  };

  // Renderizar estado de conexión
  const renderConnectionStatus = () => {
    if (loading) {
      return (
        <div className="chat-status-banner chat-status-loading">
          Cargando...
        </div>
      );
    }

    if (error) {
      return (
        <div className="chat-status-banner chat-status-error">
          ⚠️ {error}
        </div>
      );
    }

    if (!connected) {
      return (
        <div className="chat-status-banner chat-status-disconnected">
          🔴 Desconectado - Reconectando...
        </div>
      );
    }

    return null;
  };

  // Verificar autenticación
  if (!user || !token) {
    return (
      <div className="chat-error-container">
        <div className="chat-error">
          <h2>No autorizado</h2>
          <p>Debes iniciar sesión para acceder al chat.</p>
          <p style={{ fontSize: '14px', color: '#9ca3af', marginTop: '8px' }}>
            Usuario: {user ? '✓' : '✗'} | Token: {token ? '✓' : '✗'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* Banner de estado */}
      {renderConnectionStatus()}

      {/* Layout principal */}
      <div className="chat-layout">
        {/* Lista de usuarios/salas (sidebar izquierdo) */}
        <div className={`chat-sidebar chat-sidebar-left ${mobileView === 'list' ? 'mobile-visible' : ''}`}>
          <UserList 
            rooms={rooms}
            currentRoom={currentRoom}
            onSelectRoom={handleSelectRoom}
            contacts={contacts}
            onCreateChat={handleCreateChat}
            onClose={() => setMobileView('chat')}
            currentUserId={userId}
            archiveRoomRequest={archiveRoomRequest}
            unarchiveRoomRequest={unarchiveRoomRequest}
            loadArchivedRooms={loadArchivedRooms}
            deleteRoomRequest={deleteRoomRequest}
          />
        </div>

        {/* Área principal del chat */}
        <div className={`chat-main ${mobileView === 'chat' ? 'mobile-visible' : ''}`}>
          {/* Contenido del chat */}
          {currentRoom ? (
            <>
              {/* Header */}
              <ChatHeader 
                currentRoom={currentRoom}
                onBack={handleBackToList}
                onToggleUserInfo={handleOpenUserInfo}
                showUserInfo={showUserInfo}
                currentUserId={userId}
                onLeaveRoom={handleLeaveRoom}
                onDeleteRoom={handleDeleteRoom}
              />
              
              {/* Lista de mensajes */}
              <MessageList 
                messages={messages}
                currentUserId={userId}
                onEditMessage={editMessage}
                onDeleteMessage={deleteMessage}
              />

              {/* Input de mensajes */}
              <MessageInput 
                onSendMessage={sendMessage}
                onSendFiles={sendMessageWithAttachments}
                onSendLocation={handleSendLocationMessage}
                disabled={!connected}
              />
            </>
          ) : (
            <div className="chat-empty">
              <div className="chat-empty-icon">💬</div>
              <h2>No hay conversación seleccionada</h2>
              <p>Selecciona una conversación para comenzar a chatear</p>
              
              <button 
                onClick={handleBackToList}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '16px 32px',
                  borderRadius: '16px',
                  fontSize: '17px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginTop: '24px',
                  minWidth: '240px',
                  boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 12px 32px rgba(102, 126, 234, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.4)';
                }}
              >
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  style={{ flexShrink: 0 }}
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Ver lista de chats
              </button>
            </div>
          )}
        </div>

        {/* Panel de información del usuario (sidebar derecho) */}
        <div className={`chat-sidebar chat-sidebar-right ${showUserInfo || mobileView === 'info' ? 'visible' : ''} ${mobileView === 'info' ? 'mobile-visible' : ''}`}>
          <UserInfo 
            currentRoom={currentRoom}
            messages={messages}
            contacts={contacts}
            onClose={handleCloseUserInfo}
            showCloseButton={mobileView === 'info'}
            currentUserId={userId}
            onRemoveParticipant={handleRemoveParticipant}
            onAddParticipants={handleAddParticipants}
            onLeaveRoom={handleLeaveRoom}
            onDeleteRoom={handleDeleteRoom}
          />
        </div>
      </div>

      {/* Notificaciones flotantes */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default Chat;
