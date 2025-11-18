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
      clases,
      asistencias,
      calificaciones,
      asignaciones,
      misCursos,
      cursosDisponibles,
    },
    setActiveModule,
    showError,
    showSuccess,
    fetchMisCursos,
    fetchCursosDisponibles,
    inscribirEnCurso,
    cancelarInscripcionCurso,
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
      misClases={clases}
      misCursos={misCursos}
      cursosDisponibles={cursosDisponibles}
      fetchMisCursos={fetchMisCursos}
      fetchCursosDisponibles={fetchCursosDisponibles}
      onInscribirseCurso={inscribirEnCurso}
      onCancelarInscripcionCurso={cancelarInscripcionCurso}
      token={token}
      showError={showError}
      showSuccess={showSuccess}
      onTwoFactorStatusChange={updateTwoFactorStatus}
      asignaciones={asignaciones}
    />
  );
};

export default StudentPage;
