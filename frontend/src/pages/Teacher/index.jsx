import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaChalkboardTeacher, FaClipboardCheck, FaCog, FaComments, FaHome, FaTable, FaUserCircle } from 'react-icons/fa';
import useDashboardData from '../../hooks/useDashboardData';
import DocenteDashboardLayout from '../../docente/DocenteDashboardLayout.jsx';
import DocenteAsistenciasPanel from '../../components-docente/AsistenciasDocente.jsx';
import MisCursosPanel from '../../components-docente/MisCursosPanel.jsx';
import NotasPanel from '../../components-docente/NotasPanel.jsx';
import ConfiguracionDocente from '../../components-docente/ConfiguracionDocente.jsx';
import PerfilDocente from '../../components-docente/PerfilDocente.jsx';
import { Chat } from '../../chat';

const TeacherPage = () => {
  const {
    state: {
      user,
      token,
      activeModule,
      loading,
      asistencias,
      asignacionesDocente,
      loadingAsignacionesDocente,
    },
    setActiveModule,
    logout,
    fetchAsistenciasDocente,
    showError,
    showSuccess,
  } = useDashboardData();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') return;
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = useMemo(
    () => [
      {
        category: 'Panel',
        items: [
          { id: 'dashboard', label: 'Inicio', icon: FaHome, module: null },
          { id: 'asistencias', label: 'Asistencias', icon: FaClipboardCheck, module: 'asistencias' },
          { id: 'mis-cursos', label: 'Mis Cursos', icon: FaChalkboardTeacher, module: 'mis-cursos' },
          { id: 'calificaciones', label: 'Exámenes', icon: FaTable, module: 'calificaciones' },
          { id: 'chat', label: 'Mensajes', icon: FaComments, module: 'chat' },
          { id: 'perfil', label: 'Mi Perfil', icon: FaUserCircle, module: 'perfil' },
          { id: 'configuracion', label: 'Configuración', icon: FaCog, module: 'configuracion' },
        ],
      },
    ],
    [],
  );

  const getModuleTitle = useCallback((module) => {
    switch (module) {
      case 'asistencias':
        return 'Control de asistencias';
      case 'mis-cursos':
        return 'Mis cursos asignados';
      case 'calificaciones':
        return 'Gestión de exámenes';
      case 'chat':
        return 'Mensajes';
      case 'perfil':
        return 'Mi Perfil';
      case 'configuracion':
        return 'Configuración';
      default:
        return 'Panel del Docente';
    }
  }, []);

  const renderContent = () => {
    if (activeModule === 'asistencias') {
      return (
        <DocenteAsistenciasPanel
          asignaciones={asignacionesDocente}
          asistencias={asistencias}
          token={token}
          loading={loading}
          loadingAsignaciones={loadingAsignacionesDocente}
          fetchAsistenciasDocente={fetchAsistenciasDocente}
          showError={showError}
          showSuccess={showSuccess}
          userInfo={user}
        />
      );
    }

    if (activeModule === 'mis-cursos') {
      return (
        <MisCursosPanel
          asignaciones={asignacionesDocente}
          loading={loadingAsignacionesDocente}
          userInfo={user}
          showSuccess={showSuccess}
          showError={showError}
        />
      );
    }

    if (activeModule === 'calificaciones') {
      return (
        <NotasPanel
          cursos={asignacionesDocente}
          asignaciones={asignacionesDocente}
          docenteNombre={user?.nombre || ''}
          onShowError={showError}
          onShowSuccess={showSuccess}
        />
      );
    }

    if (activeModule === 'chat') {
      return (
        <div style={{
          height: 'calc(100vh - 200px)',
          minHeight: '500px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Chat user={user} token={token} />
        </div>
      );
    }

    if (activeModule === 'perfil') {
      return (
        <PerfilDocente
          userInfo={user}
          token={token}
          showError={showError}
          showSuccess={showSuccess}
        />
      );
    }

    if (activeModule === 'configuracion') {
      return (
        <ConfiguracionDocente
          userInfo={user}
          darkMode={darkMode}
          toggleTheme={() => setDarkMode((prev) => !prev)}
          token={token}
          showError={showError}
          showSuccess={showSuccess}
        />
      );
    }

    // Módulo Inicio (null) - se muestra el dashboard por defecto del layout
    return null;
  };

  if (!user) {
    return null;
  }

  return (
    <DocenteDashboardLayout
      userInfo={user}
      menuItems={menuItems}
      activeModule={activeModule}
      onModuleChange={setActiveModule}
      loading={loading}
      onLogout={logout}
      sidebarCollapsed={sidebarCollapsed}
      isMobile={isMobile}
      mobileSidebarOpen={mobileSidebarOpen}
      onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
      onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      darkMode={darkMode}
      highContrast={highContrast}
      toggleTheme={() => setDarkMode((prev) => !prev)}
      toggleHighContrast={() => setHighContrast((prev) => !prev)}
      getModuleTitle={getModuleTitle}
    >
      {renderContent()}
    </DocenteDashboardLayout>
  );
};

export default TeacherPage;
