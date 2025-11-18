import React from 'react';
import './ChatHeader.css';

const ChatHeader = ({
  currentView,
  isMobile,
  onBack,
  onOpenInfo,
  onOpenUsers,
  selectedConversation,
}) => {
  const title = (() => {
    if (currentView === 'users') {
      return 'Usuarios';
    }
    if (currentView === 'info') {
      return selectedConversation?.name ?? 'Información';
    }
    return selectedConversation?.name ?? 'Mensajería';
  })();

  const status = (() => {
    if (currentView === 'users') {
      return `${selectedConversation ? 'En conversación con' : 'Selecciona un usuario'}`;
    }
    if (currentView === 'info') {
      return selectedConversation?.headline ?? selectedConversation?.status ?? '';
    }
    return selectedConversation?.status ?? 'En línea';
  })();

  return (
    <header className="chat-header">
      <div className="chat-header__inner">
        <div className="chat-header__left">
          {isMobile && currentView !== 'chat' ? (
            <button type="button" className="chat-header__action" onClick={onBack}>
              <span className="chat-header__icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </span>
              Volver
            </button>
          ) : (
            <button type="button" className="chat-header__action" onClick={onOpenUsers}>
              <span className="chat-header__icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="8" cy="7" r="4" />
                  <path d="M20 8v6" />
                  <path d="M23 11h-6" />
                </svg>
              </span>
              {isMobile ? 'Usuarios' : 'Contactos'}
            </button>
          )}
        </div>

        <div className="chat-header__center">
          <button
            type="button"
            className={`chat-header__title ${currentView === 'chat' ? 'chat-header__title--active' : ''}`}
            onClick={currentView === 'chat' ? onOpenInfo : undefined}
            title={currentView === 'chat' ? 'Ver información del usuario' : undefined}
          >
            <span className="chat-header__name">{title}</span>
            {status ? <span className="chat-header__status">{status}</span> : null}
          </button>
        </div>

        <div className="chat-header__right">
          {currentView === 'chat' ? (
            <button type="button" className="chat-header__action" onClick={onOpenInfo}>
              <span className="chat-header__icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09A1.65 1.65 0 0 0 11 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </span>
              Perfil
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
};

export default ChatHeader;
