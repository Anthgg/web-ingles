import React, { useMemo } from 'react';
import './UserInfo.css';

const formatDateTime = (isoDate) => {
  if (!isoDate) {
    return '';
  }
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
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

const UserInfo = ({ active, conversation, isMobile, onBack }) => {
  const { files, name, avatar, about, headline, status } = conversation ?? {};

  const { images, documents } = useMemo(() => {
    const collections = { images: [], documents: [] };
    (files ?? []).forEach((file) => {
      if (file.type === 'image') {
        collections.images.push(file);
      } else {
        collections.documents.push(file);
      }
    });
    return collections;
  }, [files]);

  return (
    <aside
      className={`chat-panel chat-panel--info ${isMobile ? 'chat-panel--mobile' : ''} ${
        active ? 'chat-panel--active' : ''
      }`}
    >
      <div className="user-info">
        <div className="user-info__header">
          <div>
            <h2 className="user-info__title">Detalles</h2>
            <p className="user-info__subtitle">Resumen del contacto seleccionado</p>
          </div>
          {isMobile ? (
            <button type="button" className="user-info__back" onClick={onBack}>
              Cerrar
            </button>
          ) : null}
        </div>

        {conversation ? (
          <>
            <section className="user-info__section">
              <div className="user-info__profile">
                <img className="user-info__avatar" src={avatar} alt={`Avatar de ${name}`} />
                <div>
                  <h3 className="user-info__name">{name}</h3>
                  <p className="user-info__headline">{headline}</p>
                  <span className="user-info__status">{status}</span>
                </div>
              </div>
              {about ? <p className="user-info__about">{about}</p> : null}
            </section>

            <section className="user-info__section">
              <h4 className="user-info__section-title">Archivos recientes</h4>
              {documents.length === 0 ? (
                <p className="user-info__empty">Aún no hay documentos compartidos.</p>
              ) : (
                <ul className="user-info__documents">
                  {documents.map((file) => (
                    <li key={file.id} className="user-info__document">
                      <div className="user-info__document-icon" aria-hidden="true">
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
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                          <path d="M14 2v6h6" />
                          <path d="M16 13H8" />
                          <path d="M16 17H8" />
                          <path d="M10 9H9" />
                        </svg>
                      </div>
                      <div className="user-info__document-meta">
                        <span className="user-info__document-name">{file.name}</span>
                        <span className="user-info__document-details">
                          {formatBytes(file.size)} · {formatDateTime(file.sharedAt)}
                        </span>
                      </div>
                      {file.src ? (
                        <a className="user-info__document-action" href={file.src} download={file.name}>
                          Descargar
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="user-info__section">
              <h4 className="user-info__section-title">Galería</h4>
              {images.length === 0 ? (
                <p className="user-info__empty">Sin imágenes compartidas todavía.</p>
              ) : (
                <div className="user-info__gallery">
                  {images.map((image) => (
                    <figure key={image.id} className="user-info__figure">
                      <img src={image.src} alt={image.name} />
                      <figcaption>{formatDateTime(image.sharedAt)}</figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <div className="user-info__placeholder">
            <p>Selecciona un contacto para ver sus detalles y archivos compartidos.</p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default UserInfo;
