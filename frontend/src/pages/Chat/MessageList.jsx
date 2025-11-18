import React, { useEffect, useMemo, useRef } from 'react';
import './MessageList.css';

const formatTime = (isoDate) => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) {
    return '';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const MessageList = ({ messages }) => {
  const scrollRef = useRef(null);

  const messageGroups = useMemo(() => {
    const dailyGroups = new Map();
    messages.forEach((message) => {
      const key = new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }).format(new Date(message.timestamp));

      if (!dailyGroups.has(key)) {
        dailyGroups.set(key, []);
      }
      dailyGroups.get(key).push(message);
    });
    return Array.from(dailyGroups.entries());
  }, [messages]);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="message-list" ref={scrollRef}>
  {messageGroups.map(([day, dayMessages]) => (
        <div key={day} className="message-day">
          <div className="message-day__label">{day}</div>
          {dayMessages.map((message) => {
            const isMine = message.sender === 'me';
            return (
              <div
                key={message.id}
                className={`message-row ${isMine ? 'message-row--own' : 'message-row--contact'}`}
              >
                <div className="message-bubble">
                  {message.text ? <p className="message-text">{message.text}</p> : null}

                  {message.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className={`message-attachment message-attachment--${attachment.type}`}
                    >
                      {attachment.type === 'image' ? (
                        <img src={attachment.src} alt={attachment.name} />
                      ) : (
                        <div className="message-attachment__file">
                          <span className="message-attachment__icon" aria-hidden="true">
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M14.5 10.5V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5.5" />
                              <path d="M10 13h8" />
                              <path d="M17 10l3 3-3 3" />
                            </svg>
                          </span>
                          <div className="message-attachment__meta">
                            <span className="message-attachment__name">{attachment.name}</span>
                            <span className="message-attachment__size">{formatBytes(attachment.size)}</span>
                          </div>
                          {attachment.src ? (
                            <a
                              className="message-attachment__action"
                              href={attachment.src}
                              download={attachment.name}
                            >
                              Descargar
                            </a>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ))}

                  <span className="message-time">{formatTime(message.timestamp)}</span>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default MessageList;
