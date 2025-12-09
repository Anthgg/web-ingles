import React, { useMemo, useState } from 'react';
import { 
  getUserInitials, 
  getAvatarColor,
  getFileIcon,
  formatFileSize,
  isImageFile,
  isVideoFile,
  isAdminRoleName
} from '../utils/helpers';
import UserAvatar from '../../components/UserAvatar';
import '../styles/UserInfo.css';

/**
 * Panel con información del usuario y archivos compartidos
 */
const UserInfo = ({ 
  currentRoom, 
  messages, 
  contacts = [],
  onClose, 
  showCloseButton = false, 
  currentUserId, 
  onRemoveParticipant, 
  onAddParticipants,
  onLeaveRoom, 
  onDeleteRoom 
}) => {

  // Obtener el otro usuario en chat directo
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
  const isGroup = currentRoom?.type === 'group';
  const currentParticipant = currentRoom?.participants?.find(p => p.userId === currentUserId);
  const userIsOwner = currentParticipant?.role === 'owner';
  const userIsAdmin = isAdminRoleName(currentParticipant?.userRole);
  const roomHasOwner = Boolean(currentRoom?.participants?.some(participant => participant.role === 'owner'));
  const userActsAsOwner = userIsOwner || (!roomHasOwner && Boolean(currentParticipant));
  const canRemoveMembers = isGroup && (userActsAsOwner || userIsAdmin);
  const canLeaveGroup = isGroup && Boolean(currentParticipant);
  const canDeleteRoom = currentRoom && (!isGroup || userActsAsOwner || userIsAdmin);

  // Estado para modal de agregar participantes
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState([]);

  // Obtener contactos disponibles (que no están en el grupo)
  const availableContacts = useMemo(() => {
    if (!contacts || !currentRoom?.participants) return [];
    
    const participantIds = currentRoom.participants.map(p => p.userId);
    return contacts.filter(contact => !participantIds.includes(contact.id));
  }, [contacts, currentRoom]);

  const handleShowAddParticipantsModal = () => {
    setSelectedContacts([]);
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setSelectedContacts([]);
  };

  const handleToggleContact = (contactId) => {
    setSelectedContacts(prev => {
      if (prev.includes(contactId)) {
        return prev.filter(id => id !== contactId);
      } else {
        return [...prev, contactId];
      }
    });
  };

  const handleConfirmAddParticipants = async () => {
    if (selectedContacts.length === 0) return;
    
    const result = await onAddParticipants(selectedContacts);
    if (result?.ok) {
      handleCloseAddModal();
    }
  };

  // Obtener archivos compartidos
  const sharedFiles = useMemo(() => {
    if (!messages || messages.length === 0) return [];

    const files = [];
    
    messages.forEach(message => {
      if (message.attachments && message.attachments.length > 0) {
        message.attachments.forEach(attachment => {
          files.push({
            ...attachment,
            messageId: message.id,
            sentAt: message.sent_at,
            senderId: message.sender_id
          });
        });
      }
    });

    // Ordenar por fecha más reciente
    return files.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
  }, [messages]);

  // Filtrar por tipo
  const images = sharedFiles.filter(f => f.type === 'image' || isImageFile(f.name));
  const videos = sharedFiles.filter(f => f.type === 'video' || isVideoFile(f.name));
  const documents = sharedFiles.filter(f => 
    !['image', 'video', 'audio'].includes(f.type) && 
    !isImageFile(f.name) && 
    !isVideoFile(f.name)
  );

  if (!currentRoom) {
    return (
      <div className="user-info">
        <div className="user-info-empty">
          Selecciona un chat para ver su información
        </div>
      </div>
    );
  }

  return (
    <div className="user-info">
      {/* Header con botón de retroceder */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb'
      }}>
        <button 
          onClick={onClose}
          aria-label="Volver"
          style={{
            background: 'none',
            border: 'none',
            color: '#6b7280',
            padding: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'background-color 0.2s',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#e5e7eb';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
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
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#111827',
          margin: 0
        }}>Información</h3>
      </div>

      {/* Información del usuario/grupo */}
      <div className="user-info-profile">
        <div 
          className="user-info-avatar"
        >
          {hasGroupPhoto ? (
            <img 
              src={`http://localhost:3010${currentRoom.group_photo}`}
              alt={displayName}
              className="user-info-avatar-img"
              onError={(e) => {
                console.warn('Error loading group photo in info:', currentRoom.group_photo);
                e.target.style.display = 'none';
                e.target.parentElement.style.backgroundColor = avatarColor;
                e.target.parentElement.innerHTML = `<span style="font-size: 36px; font-weight: 600; color: white;">${initials}</span>`;
              }}
            />
          ) : currentRoom?.type === 'private' && otherUser ? (
            <UserAvatar 
              userId={otherUser.userId}
              nombre={displayName}
              tieneFoto={otherUser.tieneFotoPerfil === 1 || otherUser.tieneFotoPerfil === true}
              size="2xl"
            />
          ) : (
            <div style={{ backgroundColor: avatarColor, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '36px', fontWeight: '600', color: 'white' }}>
              {initials}
            </div>
          )}
        </div>
        
        <h3 className="user-info-name">{displayName}</h3>
        
        {currentRoom.type === 'private' && otherUser && (
          <p className="user-info-role">{otherUser.userRole || 'Usuario'}</p>
        )}

        {currentRoom.type !== 'private' && (
          <p className="user-info-participants">
            {currentRoom.participants?.length || 0} participantes
          </p>
        )}
      </div>

      {/* Descripción del grupo (si existe) */}
      {currentRoom.type === 'group' && currentRoom.description && (
        <div className="user-info-section">
          <h4 className="user-info-section-title">Descripción del grupo</h4>
          <div className="user-info-group-description">
            <p>{currentRoom.description}</p>
          </div>
        </div>
      )}

      {/* Participantes (para grupos) */}
      {currentRoom.type !== 'private' && currentRoom.participants && (
        <div className="user-info-section">
          <div className="user-info-participants-header">
            <h4 className="user-info-section-title">
              Participantes ({currentRoom.participants.length})
            </h4>
            {canRemoveMembers && onAddParticipants && (
              <button
                className="user-info-add-participants-btn"
                onClick={() => handleShowAddParticipantsModal()}
                title="Agregar participantes"
              >
                + Agregar
              </button>
            )}
          </div>
          <div className="user-info-participants-list">
            {currentRoom.participants.map((participant, index) => {
              const participantName = participant.userName || 'Usuario';
              const participantInitials = getUserInitials({ nombre: participantName });
              const participantColor = getAvatarColor(participantName);
              const formattedRole = (() => {
                const baseRole = participant.role === 'owner' ? 'Propietario' : 'Miembro';
                const additionalRole = participant.userRole ? participant.userRole : null;
                const normalizedAdditionalRole = additionalRole
                  ? additionalRole.charAt(0).toUpperCase() + additionalRole.slice(1)
                  : null;

                if (participant.role === 'owner' && normalizedAdditionalRole) {
                  return `${baseRole} · ${normalizedAdditionalRole}`;
                }
                return normalizedAdditionalRole || baseRole;
              })();
              const allowRemove = canRemoveMembers && participant.userId !== currentUserId && typeof onRemoveParticipant === 'function' && (participant.role !== 'owner' || userIsAdmin);

              return (
                <div key={index} className="user-info-participant-item">
                  <div className="user-info-participant-avatar">
                    <UserAvatar 
                      userId={participant.userId}
                      nombre={participantName}
                      tieneFoto={participant.tieneFotoPerfil === 1 || participant.tieneFotoPerfil === true}
                      size="md"
                    />
                  </div>
                  <div className="user-info-participant-info">
                    <span className="user-info-participant-name">
                      {participantName}
                      {participant.userId === currentUserId && ' (tú)'}
                    </span>
                    <span className="user-info-participant-role">
                      {formattedRole}
                    </span>
                  </div>
                  {allowRemove && (
                    <button
                      className="user-info-participant-remove-btn"
                      onClick={() => onRemoveParticipant(participant)}
                      aria-label={`Eliminar a ${participantName}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

          {(canLeaveGroup || canDeleteRoom) && (
            <div className="user-info-section">
              <h4 className="user-info-section-title">Acciones</h4>
              <div className="user-info-actions">
                {canLeaveGroup && typeof onLeaveRoom === 'function' && (
                  <button className="user-info-action-btn" onClick={onLeaveRoom}>
                    Abandonar grupo
                  </button>
                )}
                {canDeleteRoom && typeof onDeleteRoom === 'function' && (
                  <button
                    className="user-info-action-btn user-info-action-danger"
                    onClick={onDeleteRoom}
                  >
                    {isGroup ? 'Eliminar grupo' : 'Eliminar chat'}
                  </button>
                )}
              </div>
            </div>
          )}

      {/* Archivos compartidos */}
      {sharedFiles.length > 0 && (
        <div className="user-info-section">
          <h4 className="user-info-section-title">
            Archivos compartidos ({sharedFiles.length})
          </h4>

          {/* Imágenes */}
          {images.length > 0 && (
            <div className="user-info-media-section">
              <h5 className="user-info-media-title">Imágenes ({images.length})</h5>
              <div className="user-info-media-grid">
                {images.slice(0, 9).map((file, index) => (
                  <a 
                    key={index}
                    href={`http://localhost:3010${file.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="user-info-media-item"
                  >
                    <img 
                      src={`http://localhost:3010${file.url}`} 
                      alt={file.name || 'Imagen'} 
                    />
                  </a>
                ))}
              </div>
              {images.length > 9 && (
                <p className="user-info-media-more">
                  +{images.length - 9} más
                </p>
              )}
            </div>
          )}

          {/* Videos */}
          {videos.length > 0 && (
            <div className="user-info-media-section">
              <h5 className="user-info-media-title">Videos ({videos.length})</h5>
              <div className="user-info-files-list">
                {videos.slice(0, 5).map((file, index) => (
                  <a 
                    key={index}
                    href={`http://localhost:3010${file.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="user-info-file-item"
                  >
                    <span className="user-info-file-icon">
                      {getFileIcon('video')}
                    </span>
                    <div className="user-info-file-info">
                      <span className="user-info-file-name">
                        {file.name || 'Video'}
                      </span>
                      {file.size && (
                        <span className="user-info-file-size">
                          {formatFileSize(file.size)}
                        </span>
                      )}
                    </div>
                  </a>
                ))}
              </div>
              {videos.length > 5 && (
                <p className="user-info-media-more">
                  +{videos.length - 5} más
                </p>
              )}
            </div>
          )}

          {/* Documentos */}
          {documents.length > 0 && (
            <div className="user-info-media-section">
              <h5 className="user-info-media-title">Documentos ({documents.length})</h5>
              <div className="user-info-files-list">
                {documents.slice(0, 10).map((file, index) => (
                  <a 
                    key={index}
                    href={`http://localhost:3010${file.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="user-info-file-item"
                  >
                    <span className="user-info-file-icon">
                      {getFileIcon(file.type)}
                    </span>
                    <div className="user-info-file-info">
                      <span className="user-info-file-name">
                        {file.name || 'Documento'}
                      </span>
                      {file.size && (
                        <span className="user-info-file-size">
                          {formatFileSize(file.size)}
                        </span>
                      )}
                    </div>
                  </a>
                ))}
              </div>
              {documents.length > 10 && (
                <p className="user-info-media-more">
                  +{documents.length - 10} más
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Si no hay archivos */}
      {sharedFiles.length === 0 && (
        <div className="user-info-section">
          <h4 className="user-info-section-title">Archivos compartidos</h4>
          <p className="user-info-empty-text">
            No hay archivos compartidos aún
          </p>
        </div>
      )}

      {/* Modal para agregar participantes */}
      {showAddModal && (
        <div className="add-participants-modal-overlay" onClick={handleCloseAddModal}>
          <div className="add-participants-modal" onClick={(e) => e.stopPropagation()}>
            <div className="add-participants-modal-header">
              <h3>Agregar participantes</h3>
              <button className="add-participants-modal-close" onClick={handleCloseAddModal}>✕</button>
            </div>
            <div className="add-participants-modal-body">
              {availableContacts.length === 0 ? (
                <p className="add-participants-empty">No hay contactos disponibles para agregar</p>
              ) : (
                <div className="add-participants-list">
                  {availableContacts.map(contact => {
                    const isSelected = selectedContacts.includes(contact.id);
                    const contactName = contact.nombre || 'Usuario';
                    const contactInitials = getUserInitials({ nombre: contactName });
                    const contactColor = getAvatarColor(contactName);

                    return (
                      <div 
                        key={contact.id} 
                        className={`add-participants-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleToggleContact(contact.id)}
                      >
                        <div className="add-participants-avatar">
                          <UserAvatar 
                            userId={contact.id}
                            nombre={contactName}
                            tieneFoto={contact.tiene_foto_perfil === 1 || contact.tiene_foto_perfil === true}
                            size="md"
                          />
                        </div>
                        <div className="add-participants-info">
                          <span className="add-participants-name">{contactName}</span>
                          {contact.rol && (
                            <span className="add-participants-role">
                              {contact.rol.charAt(0).toUpperCase() + contact.rol.slice(1)}
                            </span>
                          )}
                        </div>
                        <div className="add-participants-checkbox">
                          {isSelected && '✓'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="add-participants-modal-footer">
              <button 
                className="add-participants-btn-cancel" 
                onClick={handleCloseAddModal}
              >
                Cancelar
              </button>
              <button 
                className="add-participants-btn-confirm" 
                onClick={handleConfirmAddParticipants}
                disabled={selectedContacts.length === 0}
              >
                Agregar ({selectedContacts.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserInfo;
