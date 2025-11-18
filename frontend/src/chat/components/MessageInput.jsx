import React, { useState, useRef } from 'react';
import { getFileIcon, formatFileSize, normalizeCoordinateInput, buildGoogleMapsUrl } from '../utils/helpers';
import '../styles/MessageInput.css';

/**
 * Input para enviar mensajes con soporte para texto, archivos e imágenes
 */
const MessageInput = ({ onSendMessage, onSendFiles, onSendLocation = async () => ({ ok: true }), disabled = false }) => {
  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const generalFileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const MAX_FILES = 5;

  const processSelectedFiles = (incomingFiles, inputRef) => {
    const files = Array.from(incomingFiles || []);

    if (files.length === 0) {
      if (inputRef?.current) {
        inputRef.current.value = '';
      }
      return;
    }

    const availableSlots = MAX_FILES - selectedFiles.length;
    if (availableSlots <= 0) {
      alert(`Máximo ${MAX_FILES} archivos por mensaje`);
      if (inputRef?.current) {
        inputRef.current.value = '';
      }
      return;
    }

    const filesToAdd = files.slice(0, availableSlots);
    if (filesToAdd.length < files.length) {
      alert(`Solo puedes adjuntar ${MAX_FILES} archivos por mensaje`);
    }

    setSelectedFiles(prev => [...prev, ...filesToAdd]);

    if (inputRef?.current) {
      inputRef.current.value = '';
    }
  };

  const handleOpenFileSelector = (inputRef) => {
    if (disabled) return;
    inputRef?.current?.click();
  };

  const handleOpenLocationModal = () => {
    if (disabled) return;
    
    // Enviar ubicación automáticamente sin modal
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }

    setIsFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        // Enviar directamente
        await onSendLocation({
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
          label: message.trim() || 'Mi ubicación',
          address: '',
          accuracy: Number.isFinite(accuracy) ? accuracy : null
        });
        
        setIsFetchingLocation(false);
        setMessage(''); // Limpiar el mensaje si había alguno
      },
      (error) => {
        console.error('Error obteniendo ubicación:', error);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            alert('Debes permitir el acceso a tu ubicación para compartirla.');
            break;
          case error.POSITION_UNAVAILABLE:
            alert('Ubicación no disponible en este momento.');
            break;
          case error.TIMEOUT:
            alert('La solicitud de ubicación tardó demasiado. Intenta nuevamente.');
            break;
          default:
            alert('No se pudo obtener tu ubicación.');
            break;
        }
        setIsFetchingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };
  // Manejar envío de mensaje
  const handleSend = async (e) => {
    e?.preventDefault();

    if (disabled) return;

    // Si hay archivos, enviar con archivos
    if (selectedFiles.length > 0) {
      try {
        const result = await onSendFiles(message.trim(), selectedFiles);
        if (result?.error) {
          alert(result.error);
          return;
        }
        setMessage('');
        setSelectedFiles([]);
        setShowEmojiPicker(false);
      } catch (error) {
        console.error('Error enviando archivos:', error);
        alert('No se pudieron enviar los archivos adjuntos');
      }
      return;
    }

    // Si hay texto, enviar mensaje
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
      setShowEmojiPicker(false);
    }

    // Resetear altura del textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // Manejar teclas presionadas
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleTextareaChange = (e) => {
    setMessage(e.target.value);
    
    // Auto-resize
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  // Eliminar archivo seleccionado
  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Emojis comunes
  const commonEmojis = ['😊', '😂', '❤️', '👍', '🎉', '🔥', '✨', '💯', '🙌', '👏'];

  const handleEmojiSelect = (emoji) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="message-input-container">
      {/* Preview de archivos seleccionados */}
      {selectedFiles.length > 0 && (
        <div className="message-input-files-preview">
          {selectedFiles.map((file, index) => {
            const isImage = file.type.startsWith('image/');
            const previewUrl = isImage ? URL.createObjectURL(file) : null;

            return (
              <div key={index} className="message-input-file-item">
                <button 
                  className="message-input-file-remove"
                  onClick={() => handleRemoveFile(index)}
                  aria-label="Eliminar archivo"
                >
                  ×
                </button>
                
                {isImage && previewUrl ? (
                  <img 
                    src={previewUrl} 
                    alt={file.name}
                    className="message-input-file-preview-image"
                  />
                ) : (
                  <div className="message-input-file-preview-icon">
                    {getFileIcon(file.type.split('/')[0])}
                  </div>
                )}
                
                <div className="message-input-file-info">
                  <span className="message-input-file-name">
                    {file.name.length > 20 
                      ? `${file.name.substring(0, 17)}...` 
                      : file.name
                    }
                  </span>
                  <span className="message-input-file-size">
                    {formatFileSize(file.size)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Input principal */}
      <form className="message-input-form" onSubmit={handleSend}>
        <div className="message-input-actions-left">
          {/* Botón foto */}
          <button 
            type="button"
            className="message-input-btn"
            onClick={() => handleOpenFileSelector(imageInputRef)}
            disabled={disabled}
            aria-label="Enviar foto"
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
              <path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/>
              <circle cx="12" cy="13" r="3"/>
            </svg>
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={(e) => processSelectedFiles(e.target.files, imageInputRef)}
            style={{ display: 'none' }}
          />

          {/* Botón video */}
          <button 
            type="button"
            className="message-input-btn"
            onClick={() => handleOpenFileSelector(videoInputRef)}
            disabled={disabled}
            aria-label="Enviar video"
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
              <rect x="3" y="5" width="13" height="14" rx="2" ry="2"/>
              <polygon points="16 7 21 5 21 19 16 17 16 7"/>
            </svg>
          </button>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            capture="environment"
            multiple
            onChange={(e) => processSelectedFiles(e.target.files, videoInputRef)}
            style={{ display: 'none' }}
          />

          {/* Botón archivos */}
          <button 
            type="button"
            className="message-input-btn message-input-attach-btn"
            onClick={() => handleOpenFileSelector(generalFileInputRef)}
            disabled={disabled}
            aria-label="Adjuntar archivos"
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
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>
          <input 
            ref={generalFileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z,.csv"
            onChange={(e) => processSelectedFiles(e.target.files, generalFileInputRef)}
            style={{ display: 'none' }}
          />

          {/* Botón ubicación */}
          <button
            type="button"
            className="message-input-btn message-input-location-btn"
            onClick={handleOpenLocationModal}
            disabled={disabled || isFetchingLocation}
            aria-label={isFetchingLocation ? "Obteniendo ubicación..." : "Compartir ubicación"}
            style={{ opacity: isFetchingLocation ? 0.5 : 1 }}
          >
            {isFetchingLocation ? (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ animation: 'spin 1s linear infinite' }}
              >
                <circle cx="12" cy="12" r="10" opacity="0.25" />
                <path d="M12 2 A10 10 0 0 1 22 12" />
              </svg>
            ) : (
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
                <path d="M21 10c0 6-9 13-9 13s-9-7-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            )}
          </button>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          className="message-input-textarea"
          placeholder="Escribe un mensaje..."
          value={message}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
        />

        <div className="message-input-actions-right">
          {/* Botón de emoji */}
          <div className="message-input-emoji-container">
            <button 
              type="button"
              className="message-input-btn message-input-emoji-btn"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={disabled}
              aria-label="Seleccionar emoji"
            >
              😊
            </button>

            {/* Picker de emojis simple */}
            {showEmojiPicker && (
              <div className="message-input-emoji-picker">
                {commonEmojis.map((emoji, index) => (
                  <button
                    key={index}
                    type="button"
                    className="message-input-emoji-item"
                    onClick={() => handleEmojiSelect(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Botón de enviar */}
          <button 
            type="submit"
            className="message-input-btn message-input-send-btn"
            disabled={disabled || (!message.trim() && selectedFiles.length === 0)}
            aria-label="Enviar mensaje"
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
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default MessageInput;
