import React from 'react';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';

const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = '¿Estás seguro?',
  message = 'Esta acción no se puede deshacer.',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger' // danger, warning, info
}) => {
  if (!isOpen) return null;

  const colors = {
    danger: {
      bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      icon: '#ef4444',
      iconBg: 'rgba(239, 68, 68, 0.1)'
    },
    warning: {
      bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      icon: '#f59e0b',
      iconBg: 'rgba(245, 158, 11, 0.1)'
    },
    info: {
      bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      icon: '#3b82f6',
      iconBg: 'rgba(59, 130, 246, 0.1)'
    }
  };

  const currentColor = colors[type] || colors.danger;

  return (
    <>
      <style>{`
        @keyframes modalFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes iconPulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        .confirm-dialog-overlay {
          animation: modalFadeIn 0.2s ease-out;
        }

        .confirm-dialog-content {
          animation: modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .confirm-dialog-icon {
          animation: iconPulse 2s ease-in-out infinite;
        }

        .confirm-btn {
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .confirm-btn::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }

        .confirm-btn:hover::before {
          width: 300px;
          height: 300px;
        }

        .confirm-btn:active {
          transform: scale(0.95);
        }

        .cancel-btn:hover {
          background: rgba(0, 0, 0, 0.05);
          transform: translateY(-2px);
        }
      `}</style>

      {/* Overlay */}
      <div 
        className="confirm-dialog-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}
        onClick={onClose}
      >
        {/* Dialog */}
        <div 
          className="confirm-dialog-content"
          style={{
            background: 'var(--bg-primary, #ffffff)',
            borderRadius: '20px',
            padding: '32px',
            maxWidth: '440px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted, #64748b)',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
              e.currentTarget.style.transform = 'rotate(90deg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'rotate(0deg)';
            }}
          >
            <FaTimes size={18} />
          </button>

          {/* Icon */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div 
              className="confirm-dialog-icon"
              style={{
                width: '80px',
                height: '80px',
                margin: '0 auto',
                background: currentColor.iconBg,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: currentColor.icon
              }}
            >
              <FaExclamationTriangle size={36} />
            </div>
          </div>

          {/* Title */}
          <h3 
            style={{
              textAlign: 'center',
              marginBottom: '12px',
              color: 'var(--text-primary, #0f172a)',
              fontSize: '24px',
              fontWeight: '700'
            }}
          >
            {title}
          </h3>

          {/* Message */}
          <p 
            style={{
              textAlign: 'center',
              color: 'var(--text-muted, #64748b)',
              fontSize: '15px',
              lineHeight: '1.6',
              marginBottom: '32px'
            }}
          >
            {message}
          </p>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="cancel-btn"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '14px 24px',
                border: '2px solid var(--border-color, #e2e8f0)',
                background: 'transparent',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                color: 'var(--text-primary, #0f172a)',
                transition: 'all 0.3s ease'
              }}
            >
              {cancelText}
            </button>

            <button
              className="confirm-btn"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              style={{
                flex: 1,
                padding: '14px 24px',
                border: 'none',
                background: currentColor.bg,
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                color: 'white',
                boxShadow: `0 8px 16px ${currentColor.icon}40`
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ConfirmDialog;
