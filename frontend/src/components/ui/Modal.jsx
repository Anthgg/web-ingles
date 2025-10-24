import React from 'react';
import PropTypes from 'prop-types';
import './modal.css';

const Modal = ({ title, children, footer, open, onClose }) => {
  if (!open) return null;
  return (
    <div className="app-modal__backdrop" role="presentation" onClick={onClose}>
      <div className="app-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {title && <div className="app-modal__header"><h4>{title}</h4></div>}
        <div className="app-modal__body">{children}</div>
        {footer && <div className="app-modal__footer">{footer}</div>}
      </div>
    </div>
  );
};

Modal.propTypes = {
  title: PropTypes.node,
  children: PropTypes.node,
  footer: PropTypes.node,
  open: PropTypes.bool,
  onClose: PropTypes.func,
};

Modal.defaultProps = {
  title: null,
  children: null,
  footer: null,
  open: false,
  onClose: undefined,
};

export default Modal;
