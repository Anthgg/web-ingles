import React from 'react';
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
      asignacionesDocente, // Usamos asignacionesDocente para profesores
    },
    setActiveModule,
    showError,
    showSuccess,
    logout,
    updateTwoFactorStatus,
    fetchAsistenciasDocente,
  } = useDashboardData();

  if (!user) {
    return null;
  }

  return (
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
      asignaciones={asignacionesDocente} // Pasamos asignacionesDocente como asignaciones
      token={token}
      showError={showError}
      showSuccess={showSuccess}
      fetchAsistenciasDocente={fetchAsistenciasDocente}
      onTwoFactorStatusChange={updateTwoFactorStatus}
    />
  );
};

export default TeacherPage;
