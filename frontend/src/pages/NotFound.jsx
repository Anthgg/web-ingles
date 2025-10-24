import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => (
  <div className="container py-5">
    <div className="text-center">
      <h1 className="display-4 fw-bold text-primary">404</h1>
      <p className="lead">La página que buscas no existe.</p>
      <p className="text-muted">
        Puede que el enlace esté desactualizado o que hayas escrito mal la dirección.
      </p>
      <Link to="/" className="btn btn-outline-primary">
        Ir al inicio
      </Link>
    </div>
  </div>
);

export default NotFoundPage;
