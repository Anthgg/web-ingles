import { useState, useEffect, useCallback, useRef } from 'react';
import io from 'socket.io-client';
import { normalizeCoordinateInput, buildGoogleMapsUrl } from '../utils/helpers';

const CHAT_SERVICE_URL = 'http://localhost:3010';

/**
 * Hook principal para manejar toda la lógica del chat
 * Conecta con el backend existente usando WebSockets y REST API
 */
export const useChat = (userId, token) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);
  
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const toastIdCounter = useRef(0);

  // Función para agregar toast
  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastIdCounter.current;
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  // Función para remover toast
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Inicializar conexión WebSocket
  useEffect(() => {
    if (!userId || !token) return;

    const newSocket = io(CHAT_SERVICE_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('🟢 Conectado al chat service');
      setConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', () => {
      console.log('🔴 Desconectado del chat service');
      setConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('❌ Error de conexión:', err.message);
      setError('Error de conexión');
      setConnected(false);
    });

    newSocket.on('receive_message', (message) => {
      console.log('📩 Nuevo mensaje recibido:', message);
      
      // Agregar mensaje a la lista si es de la sala actual
      setMessages(prev => {
        // Evitar duplicados
        if (prev.some(m => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });

      // Actualizar último mensaje en rooms
      setRooms(prev => prev.map(room => {
        if (room.id === message.room_id) {
          return {
            ...room,
            lastMessage: message,
            lastMessageAt: message.sent_at
          };
        }
        return room;
      }));
    });

    newSocket.on('message_updated', (message) => {
      console.log('✏️ Mensaje actualizado:', message);
      setMessages(prev => prev.map(m => m.id === message.id ? message : m));
    });

    newSocket.on('message_deleted', (data) => {
      console.log('🗑️ Mensaje eliminado:', data);
      const { message, scope } = data;
      
      if (scope === 'everyone') {
        // Marcar como eliminado
        setMessages(prev => prev.map(m => 
          m.id === message.id ? { ...m, is_deleted: true, content: 'Este mensaje fue eliminado' } : m
        ));
      } else {
        // Eliminar solo para el usuario actual
        setMessages(prev => prev.filter(m => m.id !== message.id));
      }
    });

    // Eventos de grupo
    newSocket.on('user_joined_group', (data) => {
      console.log('👤 Usuario se unió al grupo:', data);
      const { userName, roomName } = data;
      addToast(`${userName} se unió a ${roomName}`, 'user-joined', 4000);
      
      // Recargar rooms para actualizar participantes
      loadRooms();
    });

    newSocket.on('user_left_group', (data) => {
      console.log('👋 Usuario salió del grupo:', data);
      const { userName, roomName } = data;
      addToast(`${userName} salió de ${roomName}`, 'user-left', 4000);
      
      // Recargar rooms para actualizar participantes
      loadRooms();
    });

    newSocket.on('user_removed_from_group', (data) => {
      console.log('🚫 Usuario removido del grupo:', data);
      const { userName, roomName, removedBy } = data;
      addToast(`${userName} fue removido de ${roomName}`, 'user-removed', 4000);
      
      // Recargar rooms para actualizar participantes
      loadRooms();
    });

    newSocket.on('group_created', (data) => {
      console.log('🎉 Grupo creado:', data);
      const { roomName, createdBy } = data;
      addToast(`Grupo "${roomName}" creado`, 'group-created', 4000);
      
      // Recargar rooms
      loadRooms();
    });

    newSocket.on('added_to_group', (data) => {
      console.log('➕ Agregado a grupo:', data);
      const { roomName } = data;
      addToast(`Fuiste agregado al grupo "${roomName}"`, 'success', 4000);
      
      // Recargar rooms
      loadRooms();
    });

    newSocket.on('participants_added', (data) => {
      console.log('➕ Participantes agregados:', data);
      const { participants } = data;
      const count = participants?.length || 0;
      addToast(`${count} participante(s) agregado(s)`, 'success', 4000);
      
      // Recargar rooms
      loadRooms();
    });

    newSocket.on('group_deleted', (data) => {
      console.log('🗑️ Grupo eliminado:', data);
      const { roomName } = data;
      addToast(`El grupo "${roomName}" ha sido eliminado`, 'warning', 4000);
      
      // Recargar rooms
      loadRooms();
      // Si estábamos en ese grupo, volver a lista
      if (currentRoom && currentRoom.id === data.roomId) {
        selectRoom(null);
      }
    });

    newSocket.on('room_error', (data) => {
      console.error('❌ Error de sala:', data);
      setError(data.error);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [userId, token, addToast]); // Agregar addToast a dependencias

  // Cargar rooms del usuario
  const loadRooms = useCallback(async () => {
    if (!userId || !token) return;

    setLoading(true);
    try {
      const response = await fetch(`${CHAT_SERVICE_URL}/rooms/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar salas');
      }

      const data = await response.json();
      console.log('📦 Rooms loaded:', data);
      console.log('📊 Total rooms:', data.length);
      
      // Debug detallado de cada sala
      data.forEach((room, index) => {
        console.log(`Room ${index + 1}:`, {
          id: room.id,
          name: room.name,
          type: room.type,
          description: room.description || 'Sin descripción',
          group_photo: room.group_photo || 'Sin foto',
          participants: room.participants?.length || 0
        });
      });
      
      // Debug: verificar si hay grupos con fotos
      const groupsWithPhotos = data.filter(r => r.type === 'group' && r.group_photo);
      if (groupsWithPhotos.length > 0) {
        console.log('📷 Groups with photos:', groupsWithPhotos.map(g => ({
          id: g.id,
          name: g.name,
          photo: g.group_photo
        })));
      } else {
        console.log('⚠️ No hay grupos con fotos');
      }
      
      // Debug: verificar si hay grupos con descripción
      const groupsWithDescription = data.filter(r => r.type === 'group' && r.description);
      if (groupsWithDescription.length > 0) {
        console.log('📝 Groups with description:', groupsWithDescription.map(g => ({
          id: g.id,
          name: g.name,
          description: g.description
        })));
      } else {
        console.log('⚠️ No hay grupos con descripción');
      }
      
      setRooms(data);
      setError(null);
      let shouldClearMessages = false;
      setCurrentRoom((prev) => {
        if (!prev) {
          return prev;
        }
        const updatedRoom = data.find((room) => room.id === prev.id);
        if (!updatedRoom) {
          shouldClearMessages = true;
          return null;
        }
        return updatedRoom;
      });
      if (shouldClearMessages) {
        setMessages([]);
      }
      return data;
    } catch (err) {
      console.error('Error loading rooms:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId, token]);

  // Cargar contactos
  const loadContacts = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${CHAT_SERVICE_URL}/contacts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar contactos');
      }

      const data = await response.json();
      setContacts(data);
    } catch (err) {
      console.error('Error loading contacts:', err);
    }
  }, [token]);

  // Cargar mensajes de una sala
  const loadMessages = useCallback(async (roomId) => {
    if (!roomId || !token) return;

    setLoading(true);
    try {
      const response = await fetch(`${CHAT_SERVICE_URL}/messages/${roomId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar mensajes');
      }

      const data = await response.json();
      setMessages(data);
      setError(null);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Unirse a una sala
  const joinRoom = useCallback((roomId) => {
    if (!socket || !roomId) return;

    console.log('🚪 Uniéndose a sala:', roomId);
    socket.emit('join_room', roomId);
    
    // Cargar mensajes de la sala
    loadMessages(roomId);
  }, [socket, loadMessages]);

  // Salir de una sala
  const leaveRoom = useCallback((roomId) => {
    if (!socket || !roomId) return;

    console.log('🚪 Saliendo de sala:', roomId);
    socket.emit('leave_room', roomId);
  }, [socket]);

  // Seleccionar una sala
  const selectRoom = useCallback((room) => {
    if (currentRoom?.id) {
      leaveRoom(currentRoom.id);
    }
    
    setCurrentRoom(room);
    setMessages([]);
    
    if (room?.id) {
      joinRoom(room.id);
    }
  }, [currentRoom, joinRoom, leaveRoom]);

  // Enviar mensaje de texto
  const sendMessage = useCallback((content, metadata = {}, messageType = 'text') => {
    if (!socket || !currentRoom) return;

    const normalizedContent = typeof content === 'string' ? content.trim() : '';
    const hasRichPayload = metadata && (
      (Array.isArray(metadata.attachments) && metadata.attachments.length > 0) ||
      metadata.location ||
      metadata.sticker
    );

    if (!normalizedContent && !hasRichPayload) {
      return;
    }

    const messageData = {
      roomId: currentRoom.id,
      senderId: userId,
      content: normalizedContent,
      messageType: messageType || 'text',
      metadata
    };

    console.log('📤 Enviando mensaje:', messageData);
    socket.emit('send_message', messageData);
  }, [socket, currentRoom, userId]);

  // Subir archivos
  const uploadAttachments = useCallback(async (files) => {
    if (!currentRoom || !token || !files || files.length === 0) return null;

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(`${CHAT_SERVICE_URL}/rooms/${currentRoom.id}/attachments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Error al subir archivos');
      }

      const data = await response.json();
      return data.attachments;
    } catch (err) {
      console.error('Error uploading attachments:', err);
      setError(err.message);
      return null;
    }
  }, [currentRoom, token]);

  // Enviar mensaje con archivos
  const sendMessageWithAttachments = useCallback(async (content, files) => {
    if (!socket || !currentRoom) return;

    // Subir archivos primero
    const attachments = await uploadAttachments(files);
    
    if (!attachments) {
      setError('Error al subir archivos');
      return;
    }

    // Enviar mensaje con attachments
    const messageData = {
      roomId: currentRoom.id,
      senderId: userId,
      content: content.trim() || '',
      messageType: attachments[0]?.type || 'file',
      attachments,
      metadata: { attachments }
    };

    console.log('📤 Enviando mensaje con archivos:', messageData);
    socket.emit('send_message', messageData);
  }, [socket, currentRoom, userId, uploadAttachments]);

  const sendLocationMessage = useCallback(async (location) => {
    if (!socket || !currentRoom || !location) {
      return { ok: false, error: 'Sala inválida' };
    }

    const latitude = normalizeCoordinateInput(location.latitude);
    const longitude = normalizeCoordinateInput(location.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return { ok: false, error: 'Ubicación inválida' };
    }

    const accuracyValue = normalizeCoordinateInput(location.accuracy);
    const accuracy = Number.isFinite(accuracyValue) && accuracyValue >= 0 ? accuracyValue : null;
    const label = typeof location.label === 'string' && location.label.trim()
      ? location.label.trim()
      : 'Ubicación compartida';
    const address = typeof location.address === 'string' && location.address.trim()
      ? location.address.trim()
      : null;
    const mapUrl = (typeof location.mapUrl === 'string' && location.mapUrl.trim())
      ? location.mapUrl.trim()
      : buildGoogleMapsUrl(latitude, longitude);

    const locationPayload = {
      latitude,
      longitude,
      accuracy,
      label,
      address,
      mapUrl
    };

    console.log('🗺️ Ubicación a enviar:', locationPayload);

    const metadata = {
      location: locationPayload
    };

    sendMessage(label, metadata, 'location');
    return { ok: true };
  }, [socket, currentRoom, sendMessage]);

  // Editar mensaje
  const editMessage = useCallback(async (messageId, newContent) => {
    if (!token || !newContent.trim()) return;

    try {
      const response = await fetch(`${CHAT_SERVICE_URL}/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newContent.trim() })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al editar mensaje');
      }

      const updatedMessage = await response.json();
      setMessages(prev => prev.map(m => m.id === messageId ? updatedMessage : m));
      return updatedMessage;
    } catch (err) {
      console.error('Error editing message:', err);
      setError(err.message);
      return null;
    }
  }, [token]);

  // Eliminar mensaje
  const deleteMessage = useCallback(async (messageId, scope = 'me') => {
    if (!token) return;

    try {
      const response = await fetch(`${CHAT_SERVICE_URL}/messages/${messageId}/delete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ scope })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar mensaje');
      }

      if (scope === 'me') {
        setMessages(prev => prev.filter(m => m.id !== messageId));
      }
      
      return true;
    } catch (err) {
      console.error('Error deleting message:', err);
      setError(err.message);
      return false;
    }
  }, [token]);

  const leaveRoomRequest = useCallback(async (roomId) => {
    const targetRoomId = roomId || currentRoom?.id;

    if (!token || !targetRoomId) {
      return { ok: false, error: 'Sala inválida' };
    }

    try {
      const response = await fetch(`${CHAT_SERVICE_URL}/rooms/${targetRoomId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Error al abandonar la sala');
      }

      const data = await response.json();

      if (currentRoom?.id === targetRoomId) {
        setCurrentRoom(null);
        setMessages([]);
      }

      await loadRooms();

      return { ok: true, ...data };
    } catch (err) {
      console.error('Error leaving room:', err);
      setError(err.message);
      return { ok: false, error: err.message };
    }
  }, [token, currentRoom, loadRooms]);

  const removeParticipantRequest = useCallback(async (roomId, participantId) => {
    const targetRoomId = roomId || currentRoom?.id;

    if (!token || !targetRoomId || !participantId) {
      return { ok: false, error: 'Datos inválidos' };
    }

    try {
      const response = await fetch(`${CHAT_SERVICE_URL}/rooms/${targetRoomId}/participants/${participantId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Error al eliminar integrante');
      }

      const data = await response.json();

      await loadRooms();

      return { ok: true, ...data };
    } catch (err) {
      console.error('Error removing participant:', err);
      setError(err.message);
      return { ok: false, error: err.message };
    }
  }, [token, currentRoom, loadRooms]);

  // Agregar participantes a un grupo
  const addParticipantsRequest = useCallback(async (roomId, participantIds) => {
    const targetRoomId = roomId || currentRoom?.id;

    if (!token || !targetRoomId || !participantIds || participantIds.length === 0) {
      return { ok: false, error: 'Datos inválidos' };
    }

    try {
      const response = await fetch(`${CHAT_SERVICE_URL}/rooms/${targetRoomId}/participants`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ participantIds })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Error al agregar participantes');
      }

      const data = await response.json();
      
      addToast(`${participantIds.length} participante(s) agregado(s)`, 'success');
      await loadRooms();

      return { ok: true, ...data };
    } catch (err) {
      console.error('Error adding participants:', err);
      setError(err.message);
      addToast(err.message, 'error');
      return { ok: false, error: err.message };
    }
  }, [token, currentRoom, loadRooms, addToast]);

  // Archivar chat (ocultar de la lista sin eliminarlo)
  const archiveRoomRequest = useCallback(async (roomId) => {
    if (!token || !roomId) {
      return { ok: false, error: 'Chat inválido' };
    }

    try {
      const response = await fetch(`${CHAT_SERVICE_URL}/rooms/${roomId}/archive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Error al archivar el chat');
      }

      const data = await response.json();

      // Si archivamos el chat actual, limpiarlo
      if (currentRoom?.id === roomId) {
        setCurrentRoom(null);
        setMessages([]);
      }

      // Recargar lista de chats para ocultar el archivado
      await loadRooms();

      return { ok: true, ...data };
    } catch (err) {
      console.error('Error archiving room:', err);
      setError(err.message);
      return { ok: false, error: err.message };
    }
  }, [token, currentRoom, loadRooms]);

  // Desarchivar chat (mostrar de nuevo en la lista)
  const unarchiveRoomRequest = useCallback(async (roomId) => {
    if (!token || !roomId) {
      return { ok: false, error: 'Chat inválido' };
    }

    try {
      const response = await fetch(`${CHAT_SERVICE_URL}/rooms/${roomId}/unarchive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Error al desarchivar el chat');
      }

      const data = await response.json();
      await loadRooms();

      return { ok: true, ...data };
    } catch (err) {
      console.error('Error unarchiving room:', err);
      setError(err.message);
      return { ok: false, error: err.message };
    }
  }, [token, loadRooms]);

  // Cargar chats archivados
  const loadArchivedRooms = useCallback(async () => {
    if (!userId || !token) return [];

    try {
      const response = await fetch(`${CHAT_SERVICE_URL}/rooms/${userId}/archived`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar chats archivados');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error loading archived rooms:', err);
      setError(err.message);
      return [];
    }
  }, [userId, token]);

  const deleteRoomRequest = useCallback(async (roomId) => {
    const targetRoomId = roomId || currentRoom?.id;

    if (!token || !targetRoomId) {
      return { ok: false, error: 'Sala inválida' };
    }

    try {
      const response = await fetch(`${CHAT_SERVICE_URL}/rooms/${targetRoomId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Error al eliminar el chat');
      }

      const data = await response.json();

      if (currentRoom?.id === targetRoomId) {
        setCurrentRoom(null);
        setMessages([]);
      }

      await loadRooms();

      return { ok: true, ...data };
    } catch (err) {
      console.error('Error deleting room:', err);
      setError(err.message);
      return { ok: false, error: err.message };
    }
  }, [token, currentRoom, loadRooms]);

  // Crear nueva sala/chat directo
  const createRoom = useCallback(async (name, type, participants, description = null, groupPhoto = null) => {
    if (!token) return null;

    try {
      const response = await fetch(`${CHAT_SERVICE_URL}/rooms`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          name, 
          type, 
          participants,
          description,
          groupPhoto
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear sala');
      }

      const data = await response.json();
      
      // Recargar rooms
      const updatedRooms = await loadRooms();
      
      // Buscar la sala creada
      const newRoom = Array.isArray(updatedRooms)
        ? updatedRooms.find(r => r.id === data.id)
        : rooms.find(r => r.id === data.id);
      
      return newRoom || { id: data.id, name, type, participants: [] };
    } catch (err) {
      console.error('Error creating room:', err);
      setError(err.message);
      return null;
    }
  }, [token, loadRooms, rooms]);

  // Cargar datos iniciales
  useEffect(() => {
    if (userId && token) {
      loadRooms();
      loadContacts();
    }
  }, [userId, token, loadRooms, loadContacts]);

  return {
    // Estado
    socket,
    connected,
    rooms,
    currentRoom,
    messages,
    contacts,
    loading,
    error,
    toasts,
    
    // Acciones
    selectRoom,
    sendMessage,
    sendMessageWithAttachments,
    editMessage,
    deleteMessage,
    leaveRoomRequest,
    removeParticipantRequest,
    archiveRoomRequest,
    unarchiveRoomRequest,
    loadArchivedRooms,
    deleteRoomRequest,
    addParticipantsRequest,
    sendLocationMessage,
    createRoom,
    loadRooms,
    loadContacts,
    removeToast,
    
    // Refs
    messagesEndRef
  };
};
