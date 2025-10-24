import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';

const NotificacionDatosPersonales = ({ onAgregar }) => (
  <div className="alert alert-warning d-flex align-items-center gap-2 mb-3">
    <FaExclamationTriangle className="me-2" />
    <span>Este usuario no tiene datos personales registrados.</span>
    <button className="btn btn-sm btn-success ms-3" onClick={onAgregar}>
      Agregar Datos Personales
    </button>
  </div>
);

export default NotificacionDatosPersonales;
