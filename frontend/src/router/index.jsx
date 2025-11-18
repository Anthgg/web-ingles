import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import RequireAuth from './RequireAuth';
import RouteErrorBoundary from './RouteErrorBoundary';

const LoginPage = lazy(() => import('../pages/Login'));
const AdminPage = lazy(() => import('../pages/Admin'));
const TeacherPage = lazy(() => import('../pages/Teacher'));
const StudentPage = lazy(() => import('../pages/Student'));
const ForbiddenPage = lazy(() => import('../pages/Forbidden'));
const NotFoundPage = lazy(() => import('../pages/NotFound'));
const ChatPage = lazy(() => import('../chat').then(module => ({ default: module.Chat })));

const PageSpinner = () => (
  <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
    <div className="text-center">
      <div className="spinner-border text-primary mb-3" role="status">
        <span className="visually-hidden">Cargando...</span>
      </div>
      <p className="text-muted mb-0">Cargando contenido...</p>
    </div>
  </div>
);

// Replaced by ChunkAwareFallback

// Fallback que maneja errores de carga de chunks dinámicos (code-splitting)
const ChunkAwareFallback = ({ error, onRetry }) => {
  const isChunkError = Boolean(
    error && (
      error.name === 'ChunkLoadError' ||
      (error.message && error.message.includes('Loading chunk'))
    )
  );

  const handleClick = () => {
    if (isChunkError) {
      window.location.reload();
    } else {
      onRetry();
    }
  };

  return (
    <div className="container py-5">
      <div className="text-center">
        <h2 className="fw-bold text-danger">Algo salió mal</h2>
        <p className="text-muted">
          {isChunkError
            ? 'Se actualizó la app y hay módulos nuevos. Recarga la página para continuar.'
            : (error?.message || 'Error inesperado en este módulo')}
        </p>
        <button type="button" className="btn btn-outline-primary" onClick={handleClick}>
          {isChunkError ? 'Recargar' : 'Reintentar'}
        </button>
      </div>
    </div>
  );
};

const SuspenseWithBoundary = ({ children }) => (
  <RouteErrorBoundary fallback={ChunkAwareFallback}>
    <Suspense fallback={<PageSpinner />}>{children}</Suspense>
  </RouteErrorBoundary>
);

const RoleRedirect = () => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  const role = String(user.rol || '').toLowerCase();
  if (role === 'admin' || role === 'administrativo') {
    return <Navigate to="/admin" replace />;
  }
  if (role === 'profesor' || role === 'docente') {
    return <Navigate to="/docente" replace />;
  }
  if (role === 'alumno' || role === 'estudiante') {
    return <Navigate to="/alumno" replace />;
  }
  return <Navigate to="/forbidden" replace />;
};

const AppRouter = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={(
            <SuspenseWithBoundary>
              <LoginPage />
            </SuspenseWithBoundary>
          )}
        />

        <Route
          path="/"
          element={(
            <RequireAuth>
              <SuspenseWithBoundary>
                <RoleRedirect />
              </SuspenseWithBoundary>
            </RequireAuth>
          )}
        />

        <Route
          path="/chat"
          element={(
            <RequireAuth>
              <SuspenseWithBoundary>
                <ChatPage />
              </SuspenseWithBoundary>
            </RequireAuth>
          )}
        />

        <Route
          path="/admin/*"
          element={(
            <RequireAuth roles={['admin', 'administrativo']}>
              <SuspenseWithBoundary>
                <AdminPage />
              </SuspenseWithBoundary>
            </RequireAuth>
          )}
        />

        <Route
          path="/docente/*"
          element={(
            <RequireAuth roles={['profesor', 'docente']}>
              <SuspenseWithBoundary>
                <TeacherPage />
              </SuspenseWithBoundary>
            </RequireAuth>
          )}
        />

        <Route
          path="/alumno/*"
          element={(
            <RequireAuth roles={['alumno', 'estudiante']}>
              <SuspenseWithBoundary>
                <StudentPage />
              </SuspenseWithBoundary>
            </RequireAuth>
          )}
        />

        <Route
          path="/forbidden"
          element={(
            <SuspenseWithBoundary>
              <ForbiddenPage />
            </SuspenseWithBoundary>
          )}
        />

        <Route
          path="*"
          element={(
            <SuspenseWithBoundary>
              <NotFoundPage />
            </SuspenseWithBoundary>
          )}
        />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default AppRouter;

