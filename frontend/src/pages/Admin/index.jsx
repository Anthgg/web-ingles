import React from 'react';
import { Layout } from '../../components/ui';
import useDashboardData from '../../hooks/useDashboardData';
import AdminDashboard from '../../admin/dashboard.jsx';

const AdminPage = () => {
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
      asignaciones,
      calificaciones,
      estudiantes,
      cursosConProfesor,
    },
    setActiveModule,
    showError,
    showSuccess,
    fetchUsuarios,
    fetchClases,
    fetchAsistencias,
    fetchAsignaciones,
    fetchCalificaciones,
    fetchCursosConProfesorNuevo,
    logout,
    updateTwoFactorStatus,
  } = useDashboardData();

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <AdminDashboard
        userInfo={user}
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        onLogout={logout}
        loading={loading}
        error={error}
        success={success}
        setError={showError}
        setSuccess={showSuccess}
        onTwoFactorStatusChange={updateTwoFactorStatus}
        usuarios={usuarios}
        clases={clases}
        asistencias={asistencias}
        asignaciones={asignaciones}
        calificaciones={calificaciones}
        token={token}
        fetchUsuarios={fetchUsuarios}
        fetchClases={fetchClases}
        fetchAsistencias={fetchAsistencias}
        fetchAsignaciones={fetchAsignaciones}
        fetchCalificaciones={fetchCalificaciones}
        showError={showError}
        showSuccess={showSuccess}
        estudiantes={estudiantes}
        cursosConProfesor={cursosConProfesor}
        fetchCursosConProfesorNuevo={fetchCursosConProfesorNuevo}
      />
    </Layout>
  );
};

export default AdminPage;
