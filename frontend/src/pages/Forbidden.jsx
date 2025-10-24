import React from 'react';
import { Link } from 'react-router-dom';

const ForbiddenPage = () => (
  <div className="container py-5">
    <div className="text-center">
      <h1 className="display-4 fw-bold text-danger">403</h1>
      <p className="lead">No tienes permisos para acceder a esta página.</p>
      <p className="text-muted">
        Si crees que se trata de un error, contacta al administrador del sistema.
      </p>
      <Link to="/" className="btn btn-primary">
        Volver al inicio
      </Link>
    </div>
  </div>
);

export default ForbiddenPage;
