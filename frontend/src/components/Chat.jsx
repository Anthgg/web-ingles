import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { FaPaperPlane, FaSmile, FaImage, FaFile } from 'react-icons/fa';
import axios from 'axios';

const Chat = ({ user, token }) => {
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);

  const chatServiceUrl = 'http://localhost:3010';

  useEffect(() => {
    // Initialize socket
    const newSocket = io(chatServiceUrl);
    setSocket(newSocket);

    // Fetch user's rooms
    fetchRooms();

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socket && activeRoom) {
      socket.emit('join_room', activeRoom.id);
      fetchMessages(activeRoom.id);

      socket.on('receive_message', (message) => {
        setMessages(prev => [...prev, message]);
      });

      return () => {
        socket.off('receive_message');
      };
    }
  }, [socket, activeRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchRooms = async () => {
    try {
      const response = await axios.get(`${chatServiceUrl}/rooms/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRooms(response.data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const fetchMessages = async (roomId) => {
    try {
      const response = await axios.get(`${chatServiceUrl}/messages/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !activeRoom || !socket) return;

    socket.emit('send_message', {
      roomId: activeRoom.id,
      senderId: user.id,
      content: newMessage
    });

    setNewMessage('');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-container d-flex" style={{ height: '600px' }}>
      {/* Rooms sidebar */}
      <div className="rooms-sidebar bg-light p-3" style={{ width: '300px', borderRight: '1px solid #dee2e6' }}>
        <h5>Conversaciones</h5>
        <div className="rooms-list">
          {rooms.map(room => (
            <div
              key={room.id}
              className={`room-item p-2 mb-2 rounded cursor-pointer ${
                activeRoom?.id === room.id ? 'bg-primary text-white' : 'bg-white'
              }`}
              onClick={() => setActiveRoom(room)}
            >
              <div className="fw-bold">{room.name || 'Chat privado'}</div>
              <small className="text-muted">{room.type}</small>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="chat-area flex-grow-1 d-flex flex-column">
        {activeRoom ? (
          <>
            {/* Messages */}
            <div className="messages-container flex-grow-1 p-3 overflow-auto">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`message mb-3 ${
                    message.sender_id === user.id ? 'text-end' : 'text-start'
                  }`}
                >
                  <div
                    className={`message-bubble d-inline-block p-2 rounded ${
                      message.sender_id === user.id
                        ? 'bg-primary text-white'
                        : 'bg-light'
                    }`}
                    style={{ maxWidth: '70%' }}
                  >
                    <div>{message.content}</div>
                    <small className="text-muted">
                      {formatTime(message.sent_at)}
                    </small>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className="message-input-container p-3 border-top">
              <div className="d-flex">
                <input
                  type="text"
                  className="form-control me-2"
                  placeholder="Escribe un mensaje..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button
                  className="btn btn-primary"
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                >
                  <FaPaperPlane />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="d-flex align-items-center justify-content-center h-100 text-muted">
            Selecciona una conversación para comenzar
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;