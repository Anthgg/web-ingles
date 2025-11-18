import React, { useMemo, useState } from 'react';
import './UserList.css';

const formatRelativeTime = (isoDate) => {
  if (!isoDate) {
    return '';
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) {
    return 'Ahora';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} min`;
  }
  if (diffHours < 24) {
    return `${diffHours} h`;
  }
  if (diffDays === 1) {
    return 'Ayer';
  }
  if (diffDays < 7) {
    const formatter = new Intl.DateTimeFormat('es-ES', { weekday: 'short' });
    return formatter.format(date);
  }
  const formatter = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' });
  return formatter.format(date);
};

const getLastMessagePreview = (conversation) => {
  const latest = conversation.messages[conversation.messages.length - 1];
  if (!latest) {
    return '';
  }
  if (latest.text) {
    return latest.text;
  }
  if (latest.attachments.length > 0) {
    const attachment = latest.attachments[0];
    if (attachment.type === 'image') {
      return 'Imagen compartida';
    }
    return 'Archivo adjunto';
  }
  return '';
};

const UserList = ({
  active,
  conversations,
  isMobile,
  onBack,
  onSelectUser,
  selectedUserId,
}) => {
  const [search, setSearch] = useState('');

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return conversations;
    }
    return conversations.filter((conversation) => {
      const haystack = `${conversation.name} ${conversation.headline}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [conversations, search]);

  return (
    <aside
      className={`chat-panel chat-panel--users ${isMobile ? 'chat-panel--mobile' : ''} ${
        active ? 'chat-panel--active' : ''
      }`}
    >
      <div className="user-list__container">
        <div className="user-list__top">
          <div>
            <h2 className="user-list__title">Conversaciones</h2>
            <p className="user-list__subtitle">Selecciona un usuario para continuar</p>
          </div>
          {isMobile ? (
            <button type="button" className="user-list__back" onClick={onBack}>
              Cerrar
            </button>
          ) : null}
        </div>

        <div className="user-list__search">
          <input
            aria-label="Buscar usuarios"
            className="user-list__search-input"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre o rol"
            type="search"
            value={search}
          />
        </div>

        <div className="user-list__items" role="tablist" aria-label="Lista de conversaciones">
          {filteredConversations.map((conversation) => {
            const lastPreview = getLastMessagePreview(conversation);
            const lastActive = formatRelativeTime(conversation.lastActivity);
            const isSelected = conversation.id === selectedUserId;

            return (
              <button
                key={conversation.id}
                type="button"
                className={`user-list__item ${isSelected ? 'user-list__item--active' : ''}`}
                onClick={() => onSelectUser(conversation.id)}
                role="tab"
                aria-selected={isSelected}
              >
                <span className="user-list__avatar" aria-hidden="true">
                  <img src={conversation.avatar} alt="Avatar" />
                  <span className={`user-list__status ${conversation.status.includes('línea') ? 'user-list__status--online' : ''}`} />
                </span>
                <span className="user-list__details">
                  <span className="user-list__row">
                    <span className="user-list__name">{conversation.name}</span>
                    <span className="user-list__time">{lastActive}</span>
                  </span>
                  <span className="user-list__headline">{conversation.headline}</span>
                  {lastPreview ? <span className="user-list__preview">{lastPreview}</span> : null}
                </span>
              </button>
            );
          })}

          {filteredConversations.length === 0 ? (
            <div className="user-list__empty">
              <p>No hay coincidencias con "{search}".</p>
              <button type="button" onClick={() => setSearch('')}>
                Limpiar búsqueda
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
};

export default UserList;
