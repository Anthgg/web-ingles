import React from 'react';
import useDashboardData from '../../hooks/useDashboardData';
import StudentDashboard from '../../alumno/index.jsx';

const StudentPage = () => {
  const {
    state: {
      user,
      token,
      activeModule,
      loading,
      error,
      success,
      asistencias,
      calificaciones,
      asignaciones,
      misCursos,
    },
    setActiveModule,
    showError,
    showSuccess,
    fetchMisCursos,
    fetchMisAsistencias,
    logout,
    updateTwoFactorStatus,
  } = useDashboardData();

  if (!user) {
    return null;
  }

  return (
    <StudentDashboard
      userInfo={user}
      activeModule={activeModule}
      setActiveModule={setActiveModule}
      onLogout={logout}
      loading={loading}
      error={error}
      success={success}
      setError={showError}
      setSuccess={showSuccess}
      misAsistencias={asistencias}
      misCalificaciones={calificaciones}
      misCursos={misCursos}
      fetchMisCursos={fetchMisCursos}
      fetchMisAsistencias={fetchMisAsistencias}
      token={token}
      showError={showError}
      showSuccess={showSuccess}
      onTwoFactorStatusChange={updateTwoFactorStatus}
      asignaciones={asignaciones}
    />
  );
};

export default StudentPage;
