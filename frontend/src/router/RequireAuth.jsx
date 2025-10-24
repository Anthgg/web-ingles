import React from 'react';
import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SpinnerFullScreen = () => (
  <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
    <div className="text-center">
      <div className="spinner-border text-primary mb-3" role="status">
        <span className="visually-hidden">Cargando...</span>
      </div>
      <p className="text-muted mb-0">Validando sesión...</p>
    </div>
  </div>
);

const RequireAuth = ({ roles, children }) => {
  const { token, user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return <SpinnerFullScreen />;
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles?.length && user) {
    const normalizedRole = String(user.rol || '').toLowerCase();
    const allowed = roles.map((role) => role.toLowerCase());
    if (!allowed.includes(normalizedRole)) {
      return <Navigate to="/forbidden" replace />;
    }
  }

  return children;
};

RequireAuth.propTypes = {
  roles: PropTypes.arrayOf(PropTypes.string),
  children: PropTypes.node.isRequired,
};

RequireAuth.defaultProps = {
  roles: undefined,
};

export default RequireAuth;
