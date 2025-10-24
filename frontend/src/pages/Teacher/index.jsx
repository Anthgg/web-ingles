import React from 'react';
import { Layout, Navbar } from '../../components/ui';
import useDashboardData from '../../hooks/useDashboardData';
import TeacherDashboard from '../../docente/index.jsx';

const TeacherPage = () => {
  const {
    state: {
      user,
      token,
      activeModule,
      loading,
      error,
      success,
      usuarios,
      clases,
      asistencias,
      calificaciones,
      asignaciones,
    },
    setActiveModule,
    showError,
    showSuccess,
    logout,
    updateTwoFactorStatus,
  } = useDashboardData();

  if (!user) {
    return null;
  }

  const brand = (
    <div>
      <span className="fw-semibold">Panel Docente</span>
      <small className="d-block text-muted" style={{ fontSize: '0.75rem' }}>
        {user.nombre}
      </small>
    </div>
  );

  const actions = (
    <button type="button" className="btn btn-outline-danger btn-sm" onClick={logout}>
      Cerrar sesión
    </button>
  );

  return (
    <Layout navbar={<Navbar brand={brand} actions={actions} />}>
      <TeacherDashboard
        userInfo={user}
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        onLogout={logout}
        loading={loading}
        error={error}
        success={success}
        setError={showError}
        setSuccess={showSuccess}
        usuarios={usuarios}
        clases={clases}
        asistencias={asistencias}
        calificaciones={calificaciones}
        asignaciones={asignaciones}
        token={token}
        showError={showError}
        showSuccess={showSuccess}
        onTwoFactorStatusChange={updateTwoFactorStatus}
      />
    </Layout>
  );
};

export default TeacherPage;
