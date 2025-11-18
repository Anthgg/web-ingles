import React, { useState, useRef } from 'react';
import '../styles/MessageInput.css';

/**
 * Input moderno para enviar mensajes
 * Soporte para texto, archivos, ubicación, emojis
 */
const MessageInput = ({ onSendMessage, onSendFiles, onSendLocation, disabled }) => {
  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationForm, setLocationForm] = useState({ latitude: '', longitude: '', label: '', address: '' });
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const MAX_FILES = 5;

  // Auto-resize textarea
  const handleTextChange = (e) => {
    setMessage(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  // Enviar mensaje
  const handleSend = async (e) => {
    e?.preventDefault();
    if (disabled) return;

    // Enviar con archivos
    if (selectedFiles.length > 0) {
      try {
        await onSendFiles(message.trim(), selectedFiles);
        setMessage('');
        setSelectedFiles([]);
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      } catch (error) {
        console.error('Error enviando archivos:', error);
      }
      return;
    }

    // Enviar solo texto
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  // Manejar teclas
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Manejar archivos
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const availableSlots = MAX_FILES - selectedFiles.length;
    if (availableSlots <= 0) {
      alert(`Máximo ${MAX_FILES} archivos por mensaje`);
      return;
    }

    const filesToAdd = files.slice(0, availableSlots);
    setSelectedFiles(prev => [...prev, ...filesToAdd]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Eliminar archivo
  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Ubicación actual
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }

    setIsFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocationForm(prev => ({
          ...prev,
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
          label: prev.label || 'Ubicación compartida'
        }));
        setIsFetchingLocation(false);
      },
      (error) => {
        console.error('Error obteniendo ubicación:', error);
        alert('No se pudo obtener tu ubicación');
        setIsFetchingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Enviar ubicación
  const handleSendLocation = async () => {
    const lat = parseFloat(locationForm.latitude);
    const lng = parseFloat(locationForm.longitude);

    if (!lat || !lng || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert('Coordenadas inválidas');
      return;
    }

    const payload = {
      latitude: lat,
      longitude: lng,
      label: locationForm.label || 'Ubicación compartida',
      address: locationForm.address || null,
      mapUrl: `https://www.google.com/maps?q=${lat},${lng}`
    };

    try {
      await onSendLocation(payload);
      setShowLocationModal(false);
      setLocationForm({ latitude: '', longitude: '', label: '', address: '' });
    } catch (error) {
      console.error('Error enviando ubicación:', error);
      alert('No se pudo enviar la ubicación');
    }
  };

  // Emojis comunes
  const emojis = ['😊', '😂', '❤️', '👍', '🎉', '🔥', '✨', '💯', '🙌', '👏', '😍', '🥰'];

  return (
    <div className="modern-input-container">
      {/* Preview de archivos */}
      {selectedFiles.length > 0 && (
        <div className="modern-input-files-preview">
          {selectedFiles.map((file, index) => {
            const isImage = file.type.startsWith('image/');
            return (
              <div key={index} className="modern-input-file-item">
                <button 
                  className="modern-input-file-remove"
                  onClick={() => handleRemoveFile(index)}
                >
                  ×
                </button>
                {isImage ? (
                  <img src={URL.createObjectURL(file)} alt={file.name} />
                ) : (
                  <div className="modern-input-file-icon">📄</div>
                )}
                <span className="modern-input-file-name">
                  {file.name.length > 15 ? `${file.name.substring(0, 12)}...` : file.name}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Input principal */}
      <form className="modern-input-form" onSubmit={handleSend}>
        {/* Botones de acción izquierda */}
        <div className="modern-input-actions-left">
          <button
            type="button"
            className="modern-input-btn"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={disabled}
            title="Emojis"
          >
            😊
          </button>

          <button
            type="button"
            className="modern-input-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            title="Adjuntar archivos"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>

          <button
            type="button"
            className="modern-input-btn"
            onClick={() => setShowLocationModal(true)}
            disabled={disabled}
            title="Compartir ubicación"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 6-9 13-9 13s-9-7-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          className="modern-input-textarea"
          placeholder="Escribe un mensaje..."
          value={message}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
        />

        {/* Botón enviar */}
        <button
          type="submit"
          className="modern-input-send"
          disabled={disabled || (!message.trim() && selectedFiles.length === 0)}
          title="Enviar mensaje"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </form>

      {/* Picker de emojis */}
      {showEmojiPicker && (
        <div className="modern-emoji-picker">
          {emojis.map((emoji, index) => (
            <button
              key={index}
              type="button"
              className="modern-emoji-item"
              onClick={() => {
                setMessage(prev => prev + emoji);
                setShowEmojiPicker(false);
                textareaRef.current?.focus();
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Modal de ubicación */}
      {showLocationModal && (
        <div className="modern-location-modal-backdrop">
          <div className="modern-location-modal">
            <div className="modern-location-modal-header">
              <h3>Compartir ubicación</h3>
              <button onClick={() => setShowLocationModal(false)}>×</button>
            </div>

            <div className="modern-location-modal-body">
              <div className="modern-location-field">
                <label>Latitud</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="-12.046374"
                  value={locationForm.latitude}
                  onChange={(e) => setLocationForm({ ...locationForm, latitude: e.target.value })}
                />
              </div>

              <div className="modern-location-field">
                <label>Longitud</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="-77.042793"
                  value={locationForm.longitude}
                  onChange={(e) => setLocationForm({ ...locationForm, longitude: e.target.value })}
                />
              </div>

              <div className="modern-location-field">
                <label>Etiqueta (opcional)</label>
                <input
                  type="text"
                  placeholder="Academia, oficina, etc."
                  value={locationForm.label}
                  onChange={(e) => setLocationForm({ ...locationForm, label: e.target.value })}
                />
              </div>

              <div className="modern-location-field">
                <label>Dirección (opcional)</label>
                <input
                  type="text"
                  placeholder="Av. Principal 123"
                  value={locationForm.address}
                  onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                />
              </div>

              <button
                type="button"
                className="modern-location-current-btn"
                onClick={handleUseCurrentLocation}
                disabled={isFetchingLocation}
              >
                {isFetchingLocation ? 'Obteniendo ubicación...' : '📍 Usar mi ubicación actual'}
              </button>
            </div>

            <div className="modern-location-modal-footer">
              <button
                type="button"
                className="modern-location-cancel"
                onClick={() => setShowLocationModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="modern-location-send"
                onClick={handleSendLocation}
                disabled={!locationForm.latitude || !locationForm.longitude}
              >
                Enviar ubicación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageInput;
