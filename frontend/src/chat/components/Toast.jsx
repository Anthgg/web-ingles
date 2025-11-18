import React, { useEffect } from 'react';
import '../styles/Toast.css';

/**
 * Componente de notificación flotante (Toast)
 * Muestra mensajes temporales en la esquina de la pantalla
 */
const Toast = ({ message, type = 'info', duration = 3000, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'user-left':
        return '👋';
      case 'user-joined':
        return '👤';
      case 'group-created':
        return '🎉';
      case 'user-removed':
        return '🚫';
      default:
        return 'ℹ️';
    }
  };

  const getClassName = () => {
    const baseClass = 'toast';
    const typeClass = `toast-${type}`;
    return `${baseClass} ${typeClass}`;
  };

  return (
    <div className={getClassName()}>
      <div className="toast-icon">{getIcon()}</div>
      <div className="toast-content">
        <p className="toast-message">{message}</p>
      </div>
      <button className="toast-close" onClick={onClose}>
        ×
      </button>
    </div>
  );
};

/**
 * Contenedor de todas las notificaciones activas
 */
export const ToastContainer = ({ toasts, onRemove }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
};

export default Toast;
