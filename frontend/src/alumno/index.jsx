import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  FaUser, FaClipboardCheck, FaGraduationCap, FaSignOutAlt,
  FaBookOpen, FaBell, FaCog, FaMoon, FaSun, FaChevronLeft,
  FaBars, FaAdjust, FaFilter, FaSearch,
  FaRegBell, FaTimes, FaCheck, FaCalendarAlt, FaChartLine,
  FaTrophy, FaPlus, FaSync, FaIdBadge, FaHome
} from 'react-icons/fa';
import Configuracion from '../components/Configuracion';
import { Chat } from '../chat';
import StudentInternalForm from '../components/StudentInternalForm';

const StudentDashboard = ({
  userInfo,
  activeModule,
  setActiveModule,
  onLogout,
  loading,
  error,
  success,
  setError,
  setSuccess,
  misAsistencias = [],
  misCalificaciones = [],
  misClases = [],
  misCursos = [],
  cursosDisponibles = [],
  fetchMisCursos = () => {},
  fetchCursosDisponibles = () => {},
  onInscribirseCurso,
  onCancelarInscripcionCurso,
  token,
  showError,
  showSuccess
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [enrollingId, setEnrollingId] = useState(null);
  const [droppingId, setDroppingId] = useState(null);
  const [refreshingCursos, setRefreshingCursos] = useState(false);
  const { isDark: darkMode, toggleTheme, highContrast, toggleHighContrast } = useTheme();

  const cursosInscritos = Array.isArray(misCursos) && misCursos.length ? misCursos : misClases;
  const disponibles = Array.isArray(cursosDisponibles) ? cursosDisponibles : [];
  const totalCursosInscritos = cursosInscritos.length;

  // Menu items para estudiante
  const menuItems = [
    {
      category: 'Mi Aprendizaje',
      items: [
        { id: 'dashboard', label: 'Panel Principal', icon: FaHome, module: null },
        { id: 'mis-clases', label: 'Mis Clases', icon: FaBookOpen, module: 'mis-clases' },
        { id: 'seleccionar-curso', label: 'Inscribir Cursos', icon: FaPlus, module: 'seleccionar-curso' },
      ]
    },
    {
      category: 'Mi Rendimiento',
      items: [
        { id: 'mis-asistencias', label: 'Mis Asistencias', icon: FaClipboardCheck, module: 'mis-asistencias' },
        { id: 'mis-calificaciones', label: 'Mis Calificaciones', icon: FaTrophy, module: 'mis-calificaciones' },
      ]
    },
    {
      category: 'Otros',
      items: [
        { id: 'chat', label: 'Mensajería', icon: FaRegBell, module: 'chat' },
        { id: 'configuracion', label: 'Configuración', icon: FaCog, module: 'configuracion' },
      ]
    }
  ];

  const handleModuleChange = useCallback((module) => {
    try {
      setActiveModule(module);
    } catch (err) {
      console.error('Error al cambiar módulo:', err);
      showError && showError('Error al cambiar de módulo');
    }
  }, [setActiveModule, showError]);

  useEffect(() => {
    if (fetchMisCursos) {
      fetchMisCursos(true);
    }
    if (fetchCursosDisponibles) {
      fetchCursosDisponibles(true);
    }
  }, [fetchMisCursos, fetchCursosDisponibles]);

  useEffect(() => {
    if (activeModule === 'seleccionar-curso') {
      if (fetchMisCursos) {
        fetchMisCursos(true);
      }
      if (fetchCursosDisponibles) {
        fetchCursosDisponibles(true);
      }
    }
  }, [activeModule, fetchMisCursos, fetchCursosDisponibles]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleRefreshCursos = async () => {
    if (!fetchMisCursos && !fetchCursosDisponibles) {
      return;
    }
    setRefreshingCursos(true);
    try {
      if (fetchMisCursos) {
        await fetchMisCursos(true);
      }
      if (fetchCursosDisponibles) {
        await fetchCursosDisponibles(true);
      }
    } finally {
      setRefreshingCursos(false);
    }
  };

  const handleInscribirse = async (asignacionId) => {
    if (!onInscribirseCurso) return;
    setEnrollingId(asignacionId);
    try {
      await onInscribirseCurso(asignacionId);
    } finally {
      setEnrollingId(null);
    }
  };

  const handleCancelarInscripcion = async (asignacionId) => {
    if (!onCancelarInscripcionCurso) return;
    setDroppingId(asignacionId);
    try {
      await onCancelarInscripcionCurso(asignacionId);
    } finally {
      setDroppingId(null);
    }
  };

  const calcularPromedio = () => {
    if (misCalificaciones.length === 0) return "N/A";
    const suma = misCalificaciones.reduce((acc, cal) => acc + cal.nota, 0);
    return (suma / misCalificaciones.length).toFixed(1);
  };

  const calcularAsistencia = () => {
    if (misAsistencias.length === 0) return "0%";
    const presentes = misAsistencias.filter(a => a.presente).length;
    return Math.round((presentes / misAsistencias.length) * 100) + "%";
  };

  const resolverCursoId = (curso = {}) => curso.asignacionId ?? curso.id ?? curso.cursoId ?? curso.materiaId ?? curso.codigo;
  const resolverNombreCurso = (curso = {}) => curso.curso_nombre ?? curso.nombreCurso ?? curso.nombre ?? curso.curso ?? curso.titulo ?? 'Curso sin título';
  const resolverDocenteCurso = (curso = {}) => curso.profesor_nombre ?? curso.docenteNombre ?? curso.profesor ?? curso.docente ?? curso.maestro ?? curso.teacher ?? 'Docente no asignado';

  const getModuleTitle = (module) => {
    const titles = {
      'mis-clases': 'Mis Clases',
      'seleccionar-curso': 'Inscribir en Cursos',
      'mis-asistencias': 'Mis Asistencias',
      'mis-calificaciones': 'Mis Calificaciones',
      'chat': 'Mensajería Interna',
      'configuracion': 'Configuración'
    };
    return titles[module] || 'Dashboard del Estudiante';
  };

  return (
    <>
      <style>{`
        /* ========== ANIMACIONES ========== */
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeInUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes gradientFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        /* ========== VARIABLES PARA ESTUDIANTE (AZUL) ========== */
        :root {
          --estudiante-primary: #3b82f6;
          --estudiante-secondary: #2563eb;
          --estudiante-dark: #1e40af;
          --estudiante-light: #60a5fa;
        }

        /* ========== DASHBOARD PRINCIPAL ========== */
        .estudiante-dashboard {
          min-height: 100vh;
          background: var(--bg-secondary);
          color: var(--text-primary);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: fadeIn 0.5s ease-out;
        }

        /* ========== SIDEBAR ESTUDIANTE (AZUL) ========== */
        .estudiante-sidebar {
          background: linear-gradient(180deg, #1e40af 0%, #3b82f6 50%, #1e40af 100%);
          background-size: 100% 200%;
          border-right: 1px solid rgba(255, 255, 255, 0.1);
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          z-index: 1000;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
          overflow-y: auto;
          overflow-x: hidden;
          animation: slideInLeft 0.5s ease-out;
        }

        .estudiante-sidebar::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(180deg, 
            rgba(59, 130, 246, 0.1) 0%, 
            rgba(96, 165, 250, 0.05) 50%, 
            rgba(59, 130, 246, 0.1) 100%);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }

        .estudiante-sidebar:hover::before {
          opacity: 1;
        }

        .sidebar-collapsed {
          width: 80px !important;
        }

        .sidebar-collapsed .nav-text,
        .sidebar-collapsed .category-title,
        .sidebar-collapsed .user-details {
          opacity: 0;
          visibility: hidden;
          width: 0;
          overflow: hidden;
        }

        /* ========== NAVEGACIÓN ========== */
        .category-title {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 24px 0 12px 12px;
          transition: all 0.3s ease;
        }

        .nav-link-estudiante {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          margin: 4px 0;
          border-radius: 12px;
          color: rgba(255, 255, 255, 0.8);
          text-decoration: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          border: none;
          background: transparent;
          width: 100%;
          position: relative;
          overflow: hidden;
        }

        .nav-link-estudiante::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: var(--estudiante-light);
          transform: scaleY(0);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .nav-link-estudiante:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          transform: translateX(4px);
        }

        .nav-link-estudiante.active {
          background: rgba(255, 255, 255, 0.15);
          color: white;
          font-weight: 600;
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
        }

        .nav-link-estudiante.active::before {
          transform: scaleY(1);
        }

        .nav-icon {
          font-size: 18px;
          transition: all 0.3s ease;
          z-index: 1;
        }

        .nav-link-estudiante:hover .nav-icon {
          transform: scale(1.2) rotate(5deg);
        }

        .nav-link-estudiante.active .nav-icon {
          transform: scale(1.15);
          filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.6));
        }

        .icon-wrapper {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .nav-text {
          margin-left: 12px;
          white-space: nowrap;
        }

        /* ========== HEADER ========== */
        .estudiante-header {
          background: var(--bg-primary);
          border-bottom: 1px solid var(--border-color);
          padding: 16px 32px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          position: static;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* ========== TARJETAS ========== */
        .estudiante-card {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          box-shadow: var(--shadow-md);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          animation: scaleIn 0.5s ease-out;
          position: relative;
          overflow: hidden;
        }

        .estudiante-card:hover {
          transform: translateY(-4px) scale(1.01);
          box-shadow: var(--shadow-xl);
          border-color: var(--estudiante-primary);
        }

        /* ========== TARJETAS DE ESTADÍSTICAS ========== */
        .stat-card-estudiante {
          background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-tertiary) 100%);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 28px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          animation: fadeInUp 0.6s ease-out backwards;
        }

        .stat-card-estudiante:nth-child(1) { animation-delay: 0.1s; }
        .stat-card-estudiante:nth-child(2) { animation-delay: 0.2s; }
        .stat-card-estudiante:nth-child(3) { animation-delay: 0.3s; }
        .stat-card-estudiante:nth-child(4) { animation-delay: 0.4s; }

        .stat-card-estudiante::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 5px;
          background: linear-gradient(90deg, var(--estudiante-primary), var(--estudiante-light), var(--estudiante-primary));
          background-size: 200% 100%;
          animation: gradientFlow 3s ease infinite;
        }

        .stat-card-estudiante:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 32px rgba(59, 130, 246, 0.2);
        }

        /* ========== BOTONES DE ACCIÓN ========== */
        .action-btn-estudiante {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          border: 2px solid var(--border-color);
          background: var(--bg-secondary);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }

        .action-btn-estudiante:hover {
          background: var(--bg-tertiary);
          color: var(--estudiante-primary);
          border-color: var(--estudiante-primary);
          transform: scale(1.1) translateY(-2px);
          box-shadow: 0 8px 16px rgba(59, 130, 246, 0.2);
        }

        /* ========== BÚSQUEDA ========== */
        .search-input-estudiante {
          background: var(--bg-secondary);
          border: 2px solid var(--border-color);
          border-radius: 12px;
          padding: 12px 20px 12px 48px;
          color: var(--text-primary);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          width: 320px;
          font-size: 0.95rem;
        }

        .search-input-estudiante:focus {
          outline: none;
          border-color: var(--estudiante-primary);
          background: var(--bg-primary);
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
          transform: translateY(-2px);
        }

        /* ========== NOTIFICACIONES ========== */
        .notification {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 1050;
          min-width: 350px;
          border-radius: 16px;
          backdrop-filter: blur(12px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
          animation: slideInRight 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* ========== LOADING ========== */
        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.15);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.3s ease;
        }

        .spinner-estudiante {
          width: 48px;
          height: 48px;
          border: 4px solid var(--border-color);
          border-top: 4px solid var(--estudiante-primary);
          border-radius: 50%;
          animation: spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* ========== MENÚ DE USUARIO ========== */
        .user-menu {
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
          background: var(--bg-primary);
          border: 2px solid var(--border-color);
          border-radius: 12px;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
          min-width: 200px;
          z-index: 1000;
          animation: fadeInUp 0.3s ease;
        }

        /* ========== QUICK ACTIONS ========== */
        .quick-action-estudiante {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }

        .quick-action-estudiante:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 32px rgba(59, 130, 246, 0.15);
          border-color: var(--estudiante-primary);
        }

        /* ========== CURSO CARD ========== */
        .curso-card {
          background: var(--bg-primary);
          border: 2px solid var(--border-color);
          border-radius: 16px;
          padding: 20px;
          transition: all 0.3s ease;
          height: 100%;
        }

        .curso-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(59, 130, 246, 0.15);
          border-color: var(--estudiante-primary);
        }

        /* ========== RESPONSIVE ========== */
        @media (max-width: 1024px) {
          .estudiante-sidebar {
            transform: translateX(-100%);
            width: 280px !important;
            z-index: 1050;
          }
          
          .estudiante-sidebar.show {
            transform: translateX(0);
          }
          
          .main-content-wrapper {
            margin-left: 0 !important;
            width: 100vw !important;
            max-width: 100vw !important;
          }
          
          .estudiante-header {
            padding: 12px 16px !important;
          }
          
          .estudiante-header .d-flex {
            flex-wrap: wrap;
            gap: 0.75rem;
          }
          
          .search-input-estudiante {
            width: 140px;
          }
          
          .action-btn-estudiante,
          .action-btn {
            width: 40px !important;
            height: 40px !important;
            min-width: 40px;
            min-height: 40px;
          }
          
          .stat-card-estudiante {
            padding: 18px !important;
          }
          
          .stat-card-estudiante h3 {
            font-size: 1.75rem !important;
          }
        }
        
        @media (max-width: 768px) {
          .estudiante-header h1 {
            font-size: 1.25rem !important;
          }
          
          .estudiante-header img {
            height: 35px !important;
          }
          
          .search-input-estudiante {
            width: 120px;
            font-size: 14px;
          }
          
          .action-btn-estudiante,
          .action-btn {
            width: 36px !important;
            height: 36px !important;
            min-width: 36px;
            min-height: 36px;
          }
          
          .stat-card-estudiante {
            padding: 16px !important;
          }
          
          .stat-card-estudiante h3 {
            font-size: 1.5rem !important;
          }
          
          .estudiante-card {
            margin-bottom: 12px;
          }
          
          .table-responsive {
            font-size: 14px;
          }
        }
        
        @media (max-width: 480px) {
          .estudiante-header {
            padding: 10px 12px !important;
          }
          
          .estudiante-header h1 {
            font-size: 1.1rem !important;
          }
          
          .estudiante-header img {
            height: 30px !important;
          }
          
          .search-input-estudiante {
            width: 100px;
            font-size: 13px;
          }
          
          .action-btn-estudiante,
          .action-btn {
            width: 32px !important;
            height: 32px !important;
          }
          
          .stat-card-estudiante h3 {
            font-size: 1.35rem !important;
          }
        }
      `}</style>

      <div className="d-flex estudiante-dashboard">
        {/* Loading */}
        {loading && (
          <div className="loading-overlay">
            <div className="text-center">
              <div className="spinner-estudiante mb-3"></div>
              <p className="text-muted">Cargando...</p>
            </div>
          </div>
        )}

        {/* Mobile Overlay */}
        {isMobile && mobileSidebarOpen && (
          <div 
            className="mobile-overlay"
            onClick={() => setMobileSidebarOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1040,
              animation: 'fadeIn 0.3s ease'
            }}
          />
        )}

        {/* Sidebar */}
        <nav
          className={`estudiante-sidebar ${sidebarCollapsed && !isMobile ? 'sidebar-collapsed' : ''} ${isMobile && mobileSidebarOpen ? 'show' : ''}`}
          style={{
            width: (sidebarCollapsed && !isMobile) ? '80px' : '280px'
          }}
        >
          {/* Logo */}
          <div className="p-4 border-bottom" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '80px' }}>
              {sidebarCollapsed ? (
                <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="I.E Peruano Japonés 7213">
                  <img src="./logo.png" alt="Logo" style={{ width: "48px", height: "48px", objectFit: "contain" }} />
                </div>
              ) : (
                <div className="nav-text text-center" style={{ width: '100%' }}>
                  <img src="./logo.png" alt="Logo" style={{ width: "60px", height: "60px", objectFit: "contain", marginBottom: "5px" }} />
                  <h5 className="mb-0 fw-bold" style={{ color: 'white' }}>I.E Peruano Japonés 7213</h5>
                  <small className="text-muted">Panel del Estudiante</small>
                </div>
              )}
            </div>
          </div>

          {/* Botón de colapsar/expandir */}
          <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <button 
              className="btn btn-link p-0 w-100"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{ 
                color: 'white',
                background: 'rgba(255, 255, 255, 0.1)',
                height: '36px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
              title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            >
              <div style={{ 
                transition: 'transform 0.3s ease',
                transform: sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
              }}>
                <FaChevronLeft size={14} />
              </div>
            </button>
          </div>

          {/* User Info */}
          <div className="p-4 border-bottom" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            <div 
              className="d-flex align-items-center"
              style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
            >
              <div 
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'var(--estudiante-light)',
                  borderRadius: '50%',
                  color: 'white',
                  marginRight: sidebarCollapsed ? '0' : '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FaGraduationCap size={16} />
              </div>
              {!sidebarCollapsed && (
                <div className="flex-grow-1 user-details">
                  <div className="fw-medium" style={{ color: 'white' }}>{userInfo?.nombre || 'Estudiante'}</div>
                  <small className="text-muted">{userInfo?.rol || 'Alumno'}</small>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="p-3 flex-grow-1">
            {menuItems.map((category, categoryIndex) => (
              <div key={categoryIndex}>
                {!sidebarCollapsed && (
                  <div className="category-title">{category.category}</div>
                )}
                <ul className="list-unstyled">
                  {category.items.map((item) => (
                    <li key={item.id} className="nav-item">
                      <button
                        className={`nav-link-estudiante ${
                          (activeModule === item.module || (!activeModule && item.module === null)) 
                            ? 'active' : ''
                        }`}
                        onClick={() => handleModuleChange(item.module)}
                        disabled={loading}
                      >
                        <div className="icon-wrapper">
                          <item.icon size={16} />
                        </div>
                        <span className="nav-text">{item.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Logout */}
          <div className="p-3 border-top" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            <button
              className="nav-link-estudiante text-danger"
              onClick={onLogout}
              disabled={loading}
            >
              <div className="icon-wrapper">
                <FaSignOutAlt size={16} />
              </div>
              <span className="nav-text">Cerrar sesión</span>
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <main 
          className="flex-grow-1 main-content-wrapper"
          style={{ 
            marginLeft: (sidebarCollapsed && !isMobile) ? '80px' : (isMobile ? '0' : '280px'),
            transition: 'margin-left 0.3s ease',
            width: (sidebarCollapsed && !isMobile) ? 'calc(100vw - 80px)' : (isMobile ? '100vw' : 'calc(100vw - 280px)'),
            maxWidth: isMobile ? '100vw' : undefined,
            overflowX: 'hidden'
          }}
        >
          {/* Header */}
          <div className="estudiante-header">
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <img src="/logo.png" alt="Logo" className="me-3" style={{height: '45px', width: 'auto'}} />
                <div>
                  <h1 className="h4 mb-1 fw-bold">{getModuleTitle(activeModule)}</h1>
                  <p className="mb-0 text-muted small">
                    {new Date().toLocaleDateString('es-ES', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
              
              <div className="d-flex align-items-center gap-3">
                {!isMobile && (
                  <div 
                    className="action-btn-estudiante"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
                  >
                    <FaChevronLeft size={16} style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} />
                  </div>
                )}
                
                {isMobile && (
                  <div 
                    className="action-btn-estudiante"
                    onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                    title="Menú"
                  >
                    <FaBars size={16} />
                  </div>
                )}
                
                <div className="position-relative">
                  <input
                    type="text"
                    className="search-input-estudiante"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <FaSearch 
                    className="position-absolute" 
                    style={{ left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} 
                    size={14} 
                  />
                </div>
                
                <div className="action-btn-estudiante">
                  <FaRegBell size={16} />
                </div>
                
                <div className="action-btn-estudiante">
                  <FaFilter size={16} />
                </div>
                
                <div className="action-btn-estudiante" onClick={toggleTheme} title={darkMode ? 'Modo claro' : 'Modo oscuro'}>
                  {darkMode ? <FaSun size={16} /> : <FaMoon size={16} />}
                </div>
                
                <div className="action-btn-estudiante" onClick={toggleHighContrast} title={highContrast ? 'Desactivar alto contraste' : 'Activar alto contraste'}>
                  <FaAdjust size={16} />
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Notifications */}
            {error && (
              <div className="notification">
                <div className="alert alert-danger border-0 shadow mb-0">
                  <div className="d-flex align-items-center">
                    <div className="me-3">
                      <div style={{ width: '32px', height: '32px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FaTimes size={16} />
                      </div>
                    </div>
                    <div className="flex-grow-1">
                      <strong>Error</strong>
                      <div>{error}</div>
                    </div>
                    <button type="button" className="btn-close" onClick={() => setError('')}></button>
                  </div>
                </div>
              </div>
            )}
            
            {success && (
              <div className="notification">
                <div className="alert alert-success border-0 shadow mb-0">
                  <div className="d-flex align-items-center">
                    <div className="me-3">
                      <div style={{ width: '32px', height: '32px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FaCheck size={16} />
                      </div>
                    </div>
                    <div className="flex-grow-1">
                      <strong>Éxito</strong>
                      <div>{success}</div>
                    </div>
                    <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
                  </div>
                </div>
              </div>
            )}

            {/* Dashboard Content */}
            {!activeModule && !loading && (
              <div className="fade-in">
                {/* Stats */}
                <div className="row g-4 mb-4">
                  <div className="col-lg-3 col-md-6">
                    <div className="stat-card-estudiante">
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <div>
                          <h3 className="h2 mb-0 fw-bold">{totalCursosInscritos}</h3>
                          <p className="mb-0 text-muted">Cursos Inscritos</p>
                        </div>
                        <div style={{ width: '48px', height: '48px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', color: 'var(--estudiante-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FaBookOpen size={24} />
                        </div>
                      </div>
                      <div className="text-muted small">
                        <span className="text-success">Activos</span> este semestre
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-lg-3 col-md-6">
                    <div className="stat-card-estudiante">
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <div>
                          <h3 className="h2 mb-0 fw-bold">{calcularAsistencia()}</h3>
                          <p className="mb-0 text-muted">Asistencia</p>
                        </div>
                        <div style={{ width: '48px', height: '48px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FaClipboardCheck size={24} />
                        </div>
                      </div>
                      <div className="text-muted small">
                        <span className="text-success">Total</span> registrada
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-lg-3 col-md-6">
                    <div className="stat-card-estudiante">
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <div>
                          <h3 className="h2 mb-0 fw-bold">{calcularPromedio()}</h3>
                          <p className="mb-0 text-muted">Promedio</p>
                        </div>
                        <div style={{ width: '48px', height: '48px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FaTrophy size={24} />
                        </div>
                      </div>
                      <div className="text-muted small">
                        <span className="text-success">General</span> del semestre
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-lg-3 col-md-6">
                    <div className="stat-card-estudiante">
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <div>
                          <h3 className="h2 mb-0 fw-bold">{disponibles.length}</h3>
                          <p className="mb-0 text-muted">Cursos Disponibles</p>
                        </div>
                        <div style={{ width: '48px', height: '48px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FaPlus size={24} />
                        </div>
                      </div>
                      <div className="text-muted small">
                        <span className="text-success">Para</span> inscribirse
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="estudiante-card p-4">
                  <h5 className="mb-4 fw-bold">Acciones Rápidas</h5>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <div className="quick-action-estudiante" onClick={() => handleModuleChange('mis-clases')}>
                        <div style={{ width: '64px', height: '64px', background: 'var(--estudiante-primary)', borderRadius: '16px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                          <FaBookOpen size={24} />
                        </div>
                        <h6 className="fw-bold">Ver Mis Clases</h6>
                        <p className="text-muted small mb-0">Acceder a mis cursos</p>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="quick-action-estudiante" onClick={() => handleModuleChange('mis-calificaciones')}>
                        <div style={{ width: '64px', height: '64px', background: '#f59e0b', borderRadius: '16px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                          <FaTrophy size={24} />
                        </div>
                        <h6 className="fw-bold">Ver Calificaciones</h6>
                        <p className="text-muted small mb-0">Revisar mis notas</p>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="quick-action-estudiante" onClick={() => handleModuleChange('seleccionar-curso')}>
                        <div style={{ width: '64px', height: '64px', background: '#8b5cf6', borderRadius: '16px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                          <FaPlus size={24} />
                        </div>
                        <h6 className="fw-bold">Inscribir Curso</h6>
                        <p className="text-muted small mb-0">Matricularme en cursos</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Module Content */}
            {activeModule && !loading && (
              <div className="fade-in">
                <div className="estudiante-card p-4">
                  {activeModule === 'mis-clases' && (
                    <div>
                      <h3 className="mb-4">Mis Clases</h3>
                      {cursosInscritos.length === 0 ? (
                        <div className="text-center py-5">
                          <FaBookOpen size={50} className="text-primary opacity-25 mb-3" />
                          <h5>No tienes clases inscritas</h5>
                          <p className="text-muted">Ve a "Inscribir Cursos" para matricularte</p>
                          <button className="btn btn-primary" onClick={() => handleModuleChange('seleccionar-curso')}>
                            <FaPlus className="me-2" /> Inscribir en Curso
                          </button>
                        </div>
                      ) : (
                        <div className="row g-3">
                          {cursosInscritos.map((curso) => (
                            <div key={resolverCursoId(curso)} className="col-md-6 col-lg-4">
                              <div className="curso-card">
                                <h5 className="fw-bold mb-3">{resolverNombreCurso(curso)}</h5>
                                <p className="text-muted mb-2">
                                  <FaUser className="me-2" />
                                  {resolverDocenteCurso(curso)}
                                </p>
                                <div className="d-flex justify-content-between align-items-center mt-3">
                                  <button className="btn btn-sm btn-outline-primary">Ver Detalle</button>
                                  <button 
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleCancelarInscripcion(resolverCursoId(curso))}
                                    disabled={droppingId === resolverCursoId(curso)}
                                  >
                                    {droppingId === resolverCursoId(curso) ? 'Cancelando...' : 'Cancelar'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {activeModule === 'seleccionar-curso' && (
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <h3 className="mb-0">Cursos Disponibles</h3>
                        <button 
                          className="btn btn-primary"
                          onClick={handleRefreshCursos}
                          disabled={refreshingCursos}
                        >
                          <FaSync className={`me-2 ${refreshingCursos ? 'fa-spin' : ''}`} />
                          Actualizar
                        </button>
                      </div>
                      {disponibles.length === 0 ? (
                        <div className="text-center py-5">
                          <FaBookOpen size={50} className="text-primary opacity-25 mb-3" />
                          <h5>No hay cursos disponibles</h5>
                          <p className="text-muted">En este momento no hay cursos disponibles para inscripción</p>
                        </div>
                      ) : (
                        <div className="row g-3">
                          {disponibles.map((curso) => (
                            <div key={resolverCursoId(curso)} className="col-md-6 col-lg-4">
                              <div className="curso-card">
                                <h5 className="fw-bold mb-3">{resolverNombreCurso(curso)}</h5>
                                <p className="text-muted mb-2">
                                  <FaUser className="me-2" />
                                  {resolverDocenteCurso(curso)}
                                </p>
                                <button 
                                  className="btn btn-primary w-100 mt-3"
                                  onClick={() => handleInscribirse(resolverCursoId(curso))}
                                  disabled={enrollingId === resolverCursoId(curso)}
                                >
                                  {enrollingId === resolverCursoId(curso) ? (
                                    <>Inscribiendo...</>
                                  ) : (
                                    <><FaPlus className="me-2" /> Inscribirse</>
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeModule === 'mis-asistencias' && (
                    <div className="text-center py-5">
                      <FaClipboardCheck size={50} className="text-primary opacity-25 mb-3" />
                      <h3>Mis Asistencias</h3>
                      <p className="text-muted">Revisa tu historial de asistencias aquí.</p>
                    </div>
                  )}

                  {activeModule === 'mis-calificaciones' && (
                    <div className="text-center py-5">
                      <FaTrophy size={50} className="text-primary opacity-25 mb-3" />
                      <h3>Mis Calificaciones</h3>
                      <p className="text-muted">Consulta tus calificaciones aquí.</p>
                    </div>
                  )}
                  
                  {activeModule === 'chat' && (
                    <div style={{ 
                      height: 'calc(100vh - 200px)', 
                      minHeight: '500px',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <Chat user={userInfo} token={token} />
                    </div>
                  )}
                  
                  {activeModule === 'configuracion' && (
                    <Configuracion
                      userInfo={userInfo}
                      darkMode={darkMode}
                      toggleTheme={toggleTheme}
                      token={token}
                      showError={showError}
                      showSuccess={showSuccess}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default StudentDashboard;
