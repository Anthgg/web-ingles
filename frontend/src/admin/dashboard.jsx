import React, { useCallback, useEffect, useState, lazy, Suspense } from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  FaUser, FaChalkboardTeacher, FaClipboardCheck,
  FaSignOutAlt, FaCalendarAlt, FaUserGraduate,
  FaTachometerAlt, FaRegBell,
  FaChartBar, FaCog, FaSearch, FaFilter,
  FaUsers, FaBookOpen, FaAward, FaChevronDown,
  FaMoon, FaSun, FaTimes, FaExpand, FaCompress,
  FaCheck, FaChevronLeft, FaBars, FaAdjust,
  FaFileAlt
} from 'react-icons/fa';
import ProfesoresAsignaturas from '../components/ProfesoresAsignaturas';
import AsignacionEstudiantes from '../components/AsignacionEstudiantes';
import RegistroUsuario from '../components/RegistroUsuario';
import DatosPersonalesUsuario from '../components/DatosPersonalesUsuario';
import SugerenciasPanel from '../components/SugerenciasPanel';
import ReportesChart from '../components/ReportesChart';
import Chat from '../components/Chat';

// Lazy loaded components
const UsuariosList = lazy(() => import('../components/UsuariosList'));
const ClasesList = lazy(() => import('../components/ClasesList'));
const AsistenciasList = lazy(() => import('../components/AsistenciasList'));
const CalificacionesList = lazy(() => import('../components/CalificacionesList'));
const AsignacionProfesores = lazy(() => import('../components/AsignacionProfesores'));
const Configuracion = lazy(() => import('../components/Configuracion'));
const MinistryForm = lazy(() => import('../components/MinistryForm'));

const Dashboard = ({
  userInfo,
  activeModule,
  setActiveModule,
  onLogout,
  loading,
  error,
  success,
  setError,
  setSuccess,
  usuarios,
  clases,
  asistencias,
  asignaciones,
  calificaciones,
  estudiantes,
  cursosConProfesor,
  token,
  fetchUsuarios,
  fetchClases,
  fetchAsistencias,
  fetchAsignaciones,
  fetchCalificaciones,
  fetchCursosConProfesorNuevo,
  showError,
  showSuccess,
}) => {
  // All logic and hooks go here, not in the props destructuring
  // State declarations
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRegistro] = useState(false);
  const [tipoRegistro] = useState('estudiante');
  const [usuarioCreadoId, setUsuarioCreadoId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [ciclos, setCiclos] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { isDark: darkMode, toggleTheme, highContrast, toggleHighContrast, customColors, updateCustomColors } = useTheme();

  // Fetch functions and datasets are received via props from App.jsx

  // Derived data
  const profesores = Array.isArray(usuarios) ? usuarios.filter(u => u.rol === 'profesor' || u.rol === 'docente') : [];
  const cursos = Array.isArray(clases) ? clases : [];
  const estudiantesLista = Array.isArray(usuarios) ? usuarios.filter(u => u.rol === 'estudiante') : [];
  const statsData = {
    usuarios: usuarios?.length || 0,
    clases: clases?.length || 0,
    profesores: profesores?.length || 0,
    estudiantes: estudiantesLista?.length || 0
  };

  // Menu items
  const menuItems = [
    {
      category: 'Principal',
      items: [
        { id: 'dashboard', label: 'Panel Principal', icon: FaTachometerAlt, module: null },
        { id: 'usuarios', label: 'Usuarios', icon: FaUsers, module: 'usuarios' },
        { id: 'clases', label: 'Cursos', icon: FaBookOpen, module: 'clases' },
        { id: 'asistencias', label: 'Asistencias', icon: FaClipboardCheck, module: 'asistencias' },
        { id: 'calificaciones', label: 'Calificaciones', icon: FaAward, module: 'calificaciones' },
      ]
    },
    {
      category: 'Asignaciones',
      items: [
        { id: 'asignacion', label: 'Asignar Profesores', icon: FaCalendarAlt, module: 'asignacion' },
        { id: 'profesores-asignaturas', label: 'Prof. & Asignaturas', icon: FaChalkboardTeacher, module: 'profesores-asignaturas' },
        { id: 'asignacion-estudiantes', label: 'Asignar Estudiantes', icon: FaUserGraduate, module: 'asignacion-estudiantes' },
      ]
    },
    {
      category: 'Sistema',
      items: [
        { id: 'reportes', label: 'Reportes', icon: FaChartBar, module: 'reportes' },
  { id: 'ministerio', label: 'Form. Ministerio', icon: FaFileAlt, module: 'ministerio-form' },
        { id: 'chat', label: 'Mensajería', icon: FaRegBell, module: 'chat' },
        { id: 'configuracion', label: 'Configuración', icon: FaCog, module: 'configuracion' },
      ]
    }
  ];

  // Handlers
  const handleModuleChange = useCallback((module) => {
    try {
      setActiveModule(module);
    } catch (err) {
      console.error('Error al cambiar módulo:', err);
      showError && showError('Error al cambiar de módulo');
    }
  }, [setActiveModule, showError]);

  const handleRegistroSuccess = async (msg) => {
    showSuccess(msg);
    try {
      const res = await fetch(`http://localhost:3002/usuarios?rol=${tipoRegistro}`);
      const lista = await res.json();
      if (Array.isArray(lista) && lista.length > 0) {
        setUsuarioCreadoId(lista[lista.length - 1].id);
      }
    } catch {}
  };

  useEffect(() => {
    fetch('http://localhost:3005/ciclos', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setCiclos(data))
      .catch(() => setCiclos([]));
  }, [token]);

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileSidebarOpen(false); // Close mobile sidebar on desktop
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Set custom colors
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--custom-primary', customColors.primary);
    root.style.setProperty('--custom-secondary', customColors.secondary);
  }, [customColors]);

  const getModuleTitle = (module) => {
    const titles = {
      'usuarios': 'Gestión de Usuarios',
      'clases': 'Gestión de Cursos y Materias',
      'asistencias': 'Control de Asistencias',
      'calificaciones': 'Gestión de Calificaciones',
      'asignacion': 'Asignación de Profesores',
      'profesores-asignaturas': 'Profesores y Asignaturas',
      'asignacion-estudiantes': 'Asignación de Estudiantes',
      'reportes': 'Reportes del Sistema',
  'ministerio-form': 'Formulario del Ministerio',
      'configuracion': 'Configuración del Sistema',
      'chat': 'Mensajería Interna'
    };
    return titles[module] || 'Dashboard Principal';
  };

  // Función para promover estudiante al siguiente ciclo
  const handlePromote = async (estudianteId) => {
    try {
      // Buscar estudiante actual
      const estudiante = usuarios.find(u => String(u.id) === String(estudianteId));
      if (!estudiante) {
        showError('Estudiante no encontrado');
        return;
      }
      // Buscar ciclo actual y siguiente
      const cicloActualIdx = ciclos.findIndex(c => String(c.id) === String(estudiante.cicloId));
      const cicloSiguiente = ciclos[cicloActualIdx + 1];
      if (!cicloSiguiente) {
        showError('No hay ciclo siguiente disponible');
        return;
      }
      // Actualizar ciclo en backend
      const res = await fetch(`http://localhost:3002/usuarios/${estudianteId}/ciclo`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cicloId: cicloSiguiente.id })
      });
      if (!res.ok) {
        showError('Error al promover ciclo');
        return;
      }
      showSuccess('Estudiante promovido correctamente');
      // Refrescar usuarios
      if (fetchUsuarios) fetchUsuarios();
    } catch (err) {
      showError('Error al promover ciclo');
    }
  };

  return (
    <>
  <style>{`
        /* ========== ANIMACIONES MODERNAS ========== */
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes fadeInUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }

        @keyframes gradientFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        /* ========== VARIABLES CSS PARA TEMAS ========== */
        :global([data-theme="light"]) {
          --bg-primary: #ffffff;
          --bg-secondary: #f8fafc;
          --bg-tertiary: #f1f5f9;
          --text-primary: #0f172a;
          --text-secondary: #475569;
          --text-muted: #94a3b8;
          --border-color: #e2e8f0;
          --accent-primary: #3b82f6;
          --accent-secondary: #8b5cf6;
          --accent-success: #10b981;
          --accent-warning: #f59e0b;
          --accent-danger: #ef4444;
          --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        :global([data-theme="dark"]) {
          --bg-primary: #0f172a;
          --bg-secondary: #1e293b;
          --bg-tertiary: #334155;
          --text-primary: #f8fafc;
          --text-secondary: #cbd5e1;
          --text-muted: #64748b;
          --border-color: #334155;
          --accent-primary: #3b82f6;
          --accent-secondary: #8b5cf6;
          --accent-success: #10b981;
          --accent-warning: #f59e0b;
          --accent-danger: #ef4444;
          --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
          --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
          --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.6);
        }

        :global(body) {
          overflow-x: hidden;
        }

        /* ========== DASHBOARD PRINCIPAL ========== */
        .minimal-dashboard {
          min-height: 100vh;
          background: var(--bg-secondary);
          color: var(--text-primary);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow-x: hidden;
          animation: fadeIn 0.5s ease-out;
          width: 100vw;
          max-width: 100vw;
        }

        /* ========== SIDEBAR MEJORADO ========== */
        .minimal-sidebar {
          background: linear-gradient(180deg, #1a237e 0%, #283593 50%, #1a237e 100%);
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
          backdrop-filter: blur(10px);
        }

        .minimal-sidebar::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(180deg, 
            rgba(59, 130, 246, 0.1) 0%, 
            rgba(139, 92, 246, 0.05) 50%, 
            rgba(59, 130, 246, 0.1) 100%);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }

        .minimal-sidebar:hover::before {
          opacity: 1;
        }
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
          transition: opacity 0.2s ease, visibility 0.2s ease;
        }

        .sidebar-collapsed .icon-wrapper,
        .sidebar-collapsed .nav-icon {
          transition: transform 0.3s ease;
        }

        /* Mostrar los elementos cuando no está colapsado */
        .minimal-sidebar:not(.sidebar-collapsed) .nav-text,
        .minimal-sidebar:not(.sidebar-collapsed) .category-title,
        .minimal-sidebar:not(.sidebar-collapsed) .user-details {
          opacity: 1;
          visibility: visible;
          transition: opacity 0.3s ease 0.2s, visibility 0.3s ease 0.2s;
        }

        .main-content-wrapper {
          height: 100vh;
          overflow-y: auto;
          overflow-x: hidden;
          position: relative;
        }

        .minimal-card {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          box-shadow: var(--shadow-md);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          animation: scaleIn 0.5s ease-out;
          position: relative;
          overflow: hidden;
        }

        .minimal-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.1), transparent);
          transition: left 0.6s ease;
        }

        .minimal-card:hover::before {
          left: 100%;
        }

        .minimal-card:hover {
          transform: translateY(-4px) scale(1.01);
          box-shadow: var(--shadow-xl);
          border-color: var(--accent-primary);
        }

        /* ========== TARJETAS DE ESTADÍSTICAS MEJORADAS ========== */
        .stat-card {
          background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-tertiary) 100%);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 28px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          animation: fadeInUp 0.6s ease-out backwards;
        }

        .stat-card:nth-child(1) { animation-delay: 0.1s; }
        .stat-card:nth-child(2) { animation-delay: 0.2s; }
        .stat-card:nth-child(3) { animation-delay: 0.3s; }
        .stat-card:nth-child(4) { animation-delay: 0.4s; }

        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 5px;
          background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary), var(--accent-primary));
          background-size: 200% 100%;
          animation: gradientFlow 3s ease infinite;
        }

        .stat-card::after {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.4s ease, transform 0.4s ease;
          pointer-events: none;
        }

        .stat-card:hover::after {
          opacity: 1;
          transform: scale(1.2);
        }

        .stat-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 20px 40px -15px rgba(59, 130, 246, 0.3);
          border-color: var(--accent-primary);
        }

        .stat-icon {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .stat-card:hover .stat-icon {
          transform: rotate(10deg) scale(1.15);
          animation: bounce 0.6s ease;
        }

        /* ========== NAVEGACIÓN MEJORADA ========== */
        .nav-item {
          margin-bottom: 6px;
          animation: slideInLeft 0.4s ease-out backwards;
        }

        .nav-item:nth-child(1) { animation-delay: 0.1s; }
        .nav-item:nth-child(2) { animation-delay: 0.15s; }
        .nav-item:nth-child(3) { animation-delay: 0.2s; }
        .nav-item:nth-child(4) { animation-delay: 0.25s; }
        .nav-item:nth-child(5) { animation-delay: 0.3s; }

        .nav-link-minimal {
          padding: 14px 18px;
          border-radius: 12px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.8);
          font-weight: 500;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          width: 100%;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 14px;
          position: relative;
          overflow: hidden;
          cursor: pointer;
        }

        .nav-link-minimal::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          width: 4px;
          background: linear-gradient(180deg, var(--accent-primary), var(--accent-secondary));
          transform: scaleY(0);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 0 4px 4px 0;
        }

        .nav-link-minimal::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          transform: translate(-50%, -50%);
          transition: width 0.6s ease, height 0.6s ease;
        }

        .nav-link-minimal:hover::after {
          width: 300px;
          height: 300px;
        }

        .nav-link-minimal:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
          transform: translateX(6px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .nav-link-minimal.active {
          background: rgba(59, 130, 246, 0.25);
          color: #ffffff;
          font-weight: 600;
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
        }

        .nav-link-minimal.active::before {
          transform: scaleY(1);
        }

        .nav-icon {
          font-size: 18px;
          transition: all 0.3s ease;
          z-index: 1;
        }

        .nav-link-minimal:hover .nav-icon {
          transform: scale(1.2) rotate(5deg);
        }

        .nav-link-minimal.active .nav-icon {
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

        /* ========== HEADER MEJORADO ========== */
        .minimal-header {
          background: var(--bg-primary);
          border-bottom: 1px solid var(--border-color);
          padding: 16px 32px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          position: sticky;
          top: 0;
          z-index: 100;
          backdrop-filter: blur(12px);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: slideInFromTop 0.5s ease-out;
        }

        @keyframes slideInFromTop {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .minimal-header:hover {
          box-shadow: 0 6px 20px rgba(0,0,0,0.12);
        }

        .content-area {
          padding: 32px;
          min-height: calc(100vh - 80px);
          animation: fadeIn 0.6s ease-out;
        }

        /* ========== BÚSQUEDA MEJORADA ========== */
        .search-input {
          background: var(--bg-secondary);
          border: 2px solid var(--border-color);
          border-radius: 12px;
          padding: 12px 20px 12px 48px;
          color: var(--text-primary);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          width: 320px;
          font-size: 0.95rem;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--accent-primary);
          background: var(--bg-primary);
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
          transform: translateY(-2px);
        }

        .search-input::placeholder {
          color: var(--text-muted);
          transition: opacity 0.3s ease;
        }

        .search-input:focus::placeholder {
          opacity: 0.5;
        }

        /* ========== BOTONES DE ACCIÓN MEJORADOS ========== */
        .action-btn {
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

        .action-btn::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(59, 130, 246, 0.2);
          transform: translate(-50%, -50%);
          transition: width 0.4s ease, height 0.4s ease;
        }

        .action-btn:hover::before {
          width: 100px;
          height: 100px;
        }

        .action-btn:hover {
          background: var(--bg-tertiary);
          color: var(--accent-primary);
          border-color: var(--accent-primary);
          transform: scale(1.1) translateY(-2px);
          box-shadow: 0 8px 16px rgba(59, 130, 246, 0.2);
        }

        .action-btn:active {
          transform: scale(0.95);
        }

        /* ========== NOTIFICACIONES MEJORADAS ========== */
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

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
          animation: slideInRight 0.3s ease;
        }

        /* ========== LOADING MEJORADO ========== */
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

        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid var(--border-color);
          border-top: 4px solid var(--accent-primary);
          border-radius: 50%;
          animation: spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        /* ========== MENÚ DE USUARIO MEJORADO ========== */
        .user-menu {
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
          background: var(--bg-primary);
          border: 2px solid var(--border-color);
          border-radius: 16px;
          min-width: 240px;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
          z-index: 1001;
          animation: scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
        }

        .user-menu::before {
          content: '';
          position: absolute;
          top: -8px;
          right: 20px;
          width: 16px;
          height: 16px;
          background: var(--bg-primary);
          border-left: 2px solid var(--border-color);
          border-top: 2px solid var(--border-color);
          transform: rotate(45deg);
        }

        /* ========== QUICK ACTIONS MEJORADAS ========== */
        /* ========== QUICK ACTIONS MEJORADAS ========== */
        .quick-action {
          background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-tertiary) 100%);
          border: 2px solid var(--border-color);
          border-radius: 20px;
          padding: 28px;
          text-align: center;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }

        .quick-action::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.1), transparent);
          transition: left 0.6s ease;
        }

        .quick-action:hover::before {
          left: 100%;
        }

        .quick-action:hover {
          background: var(--bg-primary);
          border-color: var(--accent-primary);
          transform: translateY(-6px) scale(1.02);
          box-shadow: 0 16px 40px rgba(59, 130, 246, 0.15);
        }

        .category-title {
          font-size: 11px;
          text-transform: uppercase;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.6);
          margin: 24px 0 12px 0;
          letter-spacing: 1px;
          padding: 0 18px;
          position: relative;
        }

        .category-title::after {
          content: '';
          position: absolute;
          left: 18px;
          bottom: -6px;
          width: 30px;
          height: 2px;
          background: linear-gradient(90deg, var(--accent-primary), transparent);
          border-radius: 2px;
        }

        /* Animaciones */
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes fadeInUp {
          from {
            transform: translateY(10px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .fade-in {
          animation: fadeIn 0.3s ease;
        }

        .theme-transition {
          transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
        }

        /* High Contrast Mode */
        [data-high-contrast="true"] {
          --bg-primary: #ffffff;
          --bg-secondary: #f8f9fa;
          --bg-tertiary: #e9ecef;
          --text-primary: #000000;
          --text-secondary: #000000;
          --text-muted: #333333;
          --accent-primary: #000000;
          --accent-secondary: #000000;
          --accent-success: #000000;
          --accent-warning: #000000;
          --accent-danger: #000000;
          --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.5);
          --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
          --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
        }

        [data-high-contrast="true"][data-theme="dark"] {
          --bg-primary: #000000;
          --bg-secondary: #111111;
          --bg-tertiary: #222222;
          --text-primary: #ffffff;
          --text-secondary: #ffffff;
          --text-muted: #cccccc;
          --accent-primary: #ffffff;
          --accent-secondary: #ffffff;
          --accent-success: #ffffff;
          --accent-warning: #ffffff;
          --accent-danger: #ffffff;
        }
        
        /* Responsive */
        @media (max-width: 1024px) {
          .minimal-sidebar {
            transform: translateX(-100%);
            width: 280px !important;
          }
          
          .minimal-sidebar.show {
            transform: translateX(0);
          }
          
          .search-input {
            width: 150px;
          }
          
          .main-content-wrapper {
            margin-left: 0 !important;
            width: 100vw !important;
            max-width: 100vw !important;
          }
          
          .minimal-header .d-flex {
            flex-wrap: wrap;
            gap: 1rem;
          }
          
          .action-btn {
            width: 36px;
            height: 36px;
          }
        }
        
        @media (max-width: 576px) {
          .search-input {
            width: 120px;
          }
          
          .stat-card h3 {
            font-size: 1.5rem;
          }
        }
      `}</style>

      <div className="minimal-dashboard d-flex">
        {/* Loading Overlay */}
        {loading && (
          <div className="loading-overlay">
            <div className="text-center">
              <div className="spinner mb-3"></div>
              <p className="text-muted">Cargando...</p>
            </div>
          </div>
        )}

        {/* Sidebar */}
        <nav
          className={`minimal-sidebar theme-transition ${sidebarCollapsed && !isMobile ? 'sidebar-collapsed' : ''} ${isMobile && mobileSidebarOpen ? 'show' : ''}`}
          style={{
            width: (sidebarCollapsed && !isMobile) ? '80px' : '280px'
          }}
        >
          {/* Logo */}
          <div className="p-4 border-bottom" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '80px' }}>
              {sidebarCollapsed ? (
                // Logo pequeño cuando está colapsado
                <div 
                  style={{
                    width: '48px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                  }}
                  title="I.E Peruano Japonés 7213"
                >
                  <img 
                    src="./logo.png" 
                    alt="Logo" 
                    style={{ 
                      width: "48px", 
                      height: "48px", 
                      objectFit: "contain",
                      transition: 'all 0.3s ease'
                    }}
                  />
                </div>
              ) : (
                // Logo y texto completo cuando está expandido
                <div className="nav-text text-center" style={{ width: '100%' }}>
                  <img 
                    src="./logo.png" 
                    alt="Logo" 
                    style={{ 
                      width: "60px", 
                      height: "60px", 
                      objectFit: "contain", 
                      marginBottom: "5px",
                      transition: 'all 0.3s ease'
                    }}
                  />
                  <h5 className="mb-0 fw-bold" style={{ color: 'white' }}>I.E Peruano Japonés 7213</h5>
                  <small className="text-muted">Admin Panel</small>
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
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
              aria-label={sidebarCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
              aria-expanded={!sidebarCollapsed}
            >
              <div style={{ 
                transition: 'transform 0.3s ease',
                transform: sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FaChevronLeft size={14} />
              </div>
            </button>
          </div>

          {/* User Info */}
          <div className="p-4 border-bottom" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            <div 
              className="d-flex align-items-center cursor-pointer position-relative"
              onClick={() => !sidebarCollapsed && setShowUserMenu(!showUserMenu)}
              style={{ 
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                transition: 'all 0.3s ease'
              }}
            >
              <div 
                className="d-flex align-items-center justify-content-center"
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'var(--accent-secondary)',
                  borderRadius: '50%',
                  color: 'white',
                  marginRight: sidebarCollapsed ? '0' : '12px',
                  flexShrink: 0,
                  transition: 'all 0.3s ease'
                }}
              >
                <FaUser size={16} />
              </div>
              {!sidebarCollapsed && (
                <>
                  <div className="flex-grow-1 user-details">
                    <div className="fw-medium" style={{ color: 'white' }}>{userInfo?.nombre || 'Administrador'}</div>
                    <small className="text-muted">{userInfo?.rol || 'Admin'}</small>
                  </div>
                  <FaChevronDown size={12} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                </>
              )}
            </div>
              
            {showUserMenu && !sidebarCollapsed && (
              <div className="user-menu">
                <div className="p-3">
                  <button className="btn btn-outline-primary btn-sm w-100 mb-2">
                    <FaUser className="me-2" size={12} /> Perfil
                  </button>
                  <button className="btn btn-outline-secondary btn-sm w-100">
                    <FaCog className="me-2" size={12} /> Configuración
                  </button>
                </div>
              </div>
            )}
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
                        className={`nav-link-minimal ${
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
          <div className="p-3 border-top" style={{ borderColor: 'var(--border-color)' }}>
            <button
              className="nav-link-minimal text-danger"
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
            marginLeft: (sidebarCollapsed && !isMobile) ? '80px' : '280px',
            transition: 'margin-left 0.3s ease',
            position: 'relative',
            zIndex: 1,
            width: (sidebarCollapsed && !isMobile) ? 'calc(100vw - 80px)' : 'calc(100vw - 280px)',
            maxWidth: (sidebarCollapsed && !isMobile) ? 'calc(100vw - 80px)' : 'calc(100vw - 280px)'
          }}
          role="main"
          aria-label="Contenido principal del dashboard"
        >
          {/* Header */}
          <div className="minimal-header theme-transition">
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <img src="/logo.png" alt="Logo I.E Peruano Japonés 7213" className="me-3" style={{height: '45px', width: 'auto'}} />
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
                {/* Sidebar toggle for desktop */}
                {!isMobile && (
                  <div 
                    className="action-btn"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
                    aria-label={sidebarCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
                    aria-expanded={!sidebarCollapsed}
                    role="button"
                    tabIndex={0}
                  >
                    <FaChevronLeft size={16} style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} />
                  </div>
                )}
                
                {/* Hamburger menu for mobile */}
                {isMobile && (
                  <div 
                    className="action-btn"
                    onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                    title="Menú"
                    aria-label="Abrir menú lateral"
                    role="button"
                    tabIndex={0}
                  >
                    <FaBars size={16} />
                  </div>
                )}
                
                {/* Search */}
                <div className="position-relative">
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Buscar en el dashboard"
                  />
                  <FaSearch 
                    className="position-absolute" 
                    style={{ 
                      left: '12px', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)'
                    }} 
                    size={14} 
                  />
                </div>
                
                {/* Actions */}
                <div className="action-btn">
                  <FaRegBell size={16} />
                </div>
                
                <div className="action-btn">
                  <FaFilter size={16} />
                </div>
                
                <div 
                  className="action-btn"
                  onClick={toggleTheme}
                  title={darkMode ? 'Modo claro' : 'Modo oscuro'}
                  aria-label={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                  role="button"
                  tabIndex={0}
                >
                  {darkMode ? <FaSun size={16} /> : <FaMoon size={16} />}
                </div>
                
                <div 
                  className="action-btn"
                  onClick={toggleHighContrast}
                  title={highContrast ? 'Desactivar alto contraste' : 'Activar alto contraste'}
                  aria-label={highContrast ? 'Desactivar modo alto contraste' : 'Activar modo alto contraste'}
                  role="button"
                  tabIndex={0}
                >
                  <FaAdjust size={16} />
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4" style={{ maxWidth: '100%', overflow: 'hidden' }}>
            {/* Notifications */}
            {error && (
              <div className="notification">
                <div className="alert alert-danger border-0 shadow mb-0">
                  <div className="d-flex align-items-center">
                    <div className="me-3">
                      <div 
                        className="d-flex align-items-center justify-content-center"
                        style={{
                          width: '32px',
                          height: '32px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          borderRadius: '8px',
                          color: 'var(--accent-danger)'
                        }}
                      >
                        <FaTimes size={16} />
                      </div>
                    </div>
                    <div className="flex-grow-1">
                      <strong>Error</strong>
                      <div>{error}</div>
                    </div>
                    <button 
                      type="button" 
                      className="btn-close" 
                      onClick={() => setError('')}
                    ></button>
                  </div>
                </div>
              </div>
            )}
            
            {success && (
              <div className="notification">
                <div className="alert alert-success border-0 shadow mb-0">
                  <div className="d-flex align-items-center">
                    <div className="me-3">
                      <div 
                        className="d-flex align-items-center justify-content-center"
                        style={{
                          width: '32px',
                          height: '32px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          borderRadius: '8px',
                          color: 'var(--accent-success)'
                        }}
                      >
                        <FaCheck size={16} />
                      </div>
                    </div>
                    <div className="flex-grow-1">
                      <strong>Éxito</strong>
                      <div>{success}</div>
                    </div>
                    <button 
                      type="button" 
                      className="btn-close" 
                      onClick={() => setSuccess('')}
                    ></button>
                  </div>
                </div>
              </div>
            )}

            {/* Dashboard Content */}
            {!activeModule && !loading && (
              <div className="fade-in">
                {/* Panel de Sugerencias */}
                <SugerenciasPanel activeModule={activeModule} />

                {/* Stats */}
                <div className="row g-4 mb-4">
                  <div className="col-lg-3 col-md-6">
                    <div className="stat-card">
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <div>
                          <h3 className="h2 mb-0 fw-bold">{statsData.usuarios}</h3>
                          <p className="mb-0 text-muted">Total Usuarios</p>
                        </div>
                        <div 
                          className="d-flex align-items-center justify-content-center"
                          style={{
                            width: '48px',
                            height: '48px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            borderRadius: '12px',
                            color: 'var(--accent-primary)'
                          }}
                        >
                          <FaUsers size={24} />
                        </div>
                      </div>
                      <div className="text-muted small">
                        <span className="text-success">+12%</span> vs mes anterior
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-lg-3 col-md-6">
                    <div className="stat-card">
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <div>
                          <h3 className="h2 mb-0 fw-bold">{statsData.clases}</h3>
                          <p className="mb-0 text-muted">Cursos Activos</p>
                        </div>
                        <div 
                          className="d-flex align-items-center justify-content-center"
                          style={{
                            width: '48px',
                            height: '48px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            borderRadius: '12px',
                            color: 'var(--accent-success)'
                          }}
                        >
                          <FaBookOpen size={24} />
                        </div>
                      </div>
                      <div className="text-muted small">
                        <span className="text-success">+8%</span> vs mes anterior
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-lg-3 col-md-6">
                    <div className="stat-card">
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <div>
                          <h3 className="h2 mb-0 fw-bold">{statsData.profesores}</h3>
                          <p className="mb-0 text-muted">Profesores</p>
                        </div>
                        <div 
                          className="d-flex align-items-center justify-content-center"
                          style={{
                            width: '48px',
                            height: '48px',
                            background: 'rgba(245, 158, 11, 0.1)',
                            borderRadius: '12px',
                            color: 'var(--accent-warning)'
                          }}
                        >
                          <FaChalkboardTeacher size={24} />
                        </div>
                      </div>
                      <div className="text-muted small">
                        <span className="text-success">+15%</span> vs mes anterior
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-lg-3 col-md-6">
                    <div className="stat-card">
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <div>
                          <h3 className="h2 mb-0 fw-bold">{statsData.estudiantes}</h3>
                          <p className="mb-0 text-muted">Estudiantes</p>
                        </div>
                        <div 
                          className="d-flex align-items-center justify-content-center"
                          style={{
                            width: '48px',
                            height: '48px',
                            background: 'rgba(139, 92, 246, 0.1)',
                            borderRadius: '12px',
                            color: 'var(--accent-secondary)'
                          }}
                        >
                          <FaUserGraduate size={24} />
                        </div>
                      </div>
                      <div className="text-muted small">
                        <span className="text-success">+5%</span> vs mes anterior
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="minimal-card p-4">
                  <h5 className="mb-4 fw-bold">Acciones Rápidas</h5>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <div className="quick-action" onClick={() => handleModuleChange('usuarios')}>
                        <div 
                          className="d-flex align-items-center justify-content-center mx-auto mb-3"
                          style={{
                            width: '64px',
                            height: '64px',
                            background: 'var(--accent-primary)',
                            borderRadius: '16px',
                            color: 'white'
                          }}
                        >
                          <FaUsers size={24} />
                        </div>
                        <h6 className="fw-bold">Gestionar Usuarios</h6>
                        <p className="text-muted small mb-0">Administrar usuarios del sistema</p>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="quick-action" onClick={() => handleModuleChange('clases')}>
                        <div 
                          className="d-flex align-items-center justify-content-center mx-auto mb-3"
                          style={{
                            width: '64px',
                            height: '64px',
                            background: 'var(--accent-success)',
                            borderRadius: '16px',
                            color: 'white'
                          }}
                        >
                          <FaBookOpen size={24} />
                        </div>
                        <h6 className="fw-bold">Gestionar Cursos</h6>
                        <p className="text-muted small mb-0">Administrar cursos y contenido</p>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="quick-action" onClick={() => handleModuleChange('asignacion-estudiantes')}>
                        <div 
                          className="d-flex align-items-center justify-content-center mx-auto mb-3"
                          style={{
                            width: '64px',
                            height: '64px',
                            background: 'var(--accent-secondary)',
                            borderRadius: '16px',
                            color: 'white'
                          }}
                        >
                          <FaUserGraduate size={24} />
                        </div>
                        <h6 className="fw-bold">Asignar Estudiantes</h6>
                        <p className="text-muted small mb-0">Gestionar asignaciones</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Module Content */}
            {activeModule && !loading && (
              <div className="fade-in">
                {/* Panel de Sugerencias para módulos activos */}
                <SugerenciasPanel activeModule={activeModule} />
                
                <div className="minimal-card">
                <Suspense fallback={
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Cargando...</span>
                    </div>
                    <p className="mt-3">Cargando módulo...</p>
                  </div>
                }>
                {activeModule === 'usuarios' && (
                  <React.Fragment>
                    {showRegistro && !usuarioCreadoId && (
                      <RegistroUsuario
                        tipo={tipoRegistro}
                        onSuccess={handleRegistroSuccess}
                        onError={showError}
                      />
                    )}
                    {usuarioCreadoId && (
                      <DatosPersonalesUsuario
                        usuarioId={usuarioCreadoId}
                        onSuccess={showSuccess}
                        onError={showError}
                      />
                    )}
                    <UsuariosList
                      usuarios={usuarios}
                      token={token}
                      fetchUsuarios={fetchUsuarios}
                      showError={showError}
                      showSuccess={showSuccess}
                    />
                  </React.Fragment>
                )}
                
                {activeModule === 'clases' && (
                  <ClasesList 
                    clases={clases} 
                    token={token} 
                    fetchClases={fetchClases} 
                    showError={showError} 
                    showSuccess={showSuccess} 
                  />
                )}
                
                {activeModule === 'asistencias' && (
                  <AsistenciasList
                    asistencias={asistencias}
                    usuarios={usuarios}
                    clases={clases}
                    token={token}
                    fetchAsistencias={fetchAsistencias}
                    showError={showError}
                    showSuccess={showSuccess}
                  />
                )}
                
                {activeModule === 'calificaciones' && (
                  <CalificacionesList
                    calificaciones={calificaciones}
                    usuarios={usuarios}
                    clases={clases}
                    token={token}
                    fetchCalificaciones={fetchCalificaciones}
                    showError={showError}
                    showSuccess={showSuccess}
                    onPromote={handlePromote}
                  />
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
                
                {activeModule === 'asignacion' && (
                  <AsignacionProfesores
                    profesores={profesores}
                    cursos={cursos}
                    asignaciones={asignaciones}
                    fetchAsignaciones={fetchAsignaciones}
                    token={token}
                    showError={showError}
                    showSuccess={showSuccess}
                  />
                )}
                
                {activeModule === 'profesores-asignaturas' && (
                  <ProfesoresAsignaturas
                    token={token}
                    showError={showError}
                    showSuccess={showSuccess}
                  />
                )}
                
                {activeModule === 'asignacion-estudiantes' && (
                  <AsignacionEstudiantes
                    usuarios={usuarios}
                    profesores={profesores}
                    token={token}
                    showError={showError}
                    showSuccess={showSuccess}
                    ciclos={ciclos}
                  />
                )}
                
                {activeModule === 'reportes' && (
                  <ReportesChart
                    usuarios={usuarios}
                    clases={clases}
                    asistencias={asistencias}
                    calificaciones={calificaciones}
                  />
                )}

                {activeModule === 'ministerio-form' && (
                  <MinistryForm
                    showError={showError}
                    showSuccess={showSuccess}
                  />
                )}
                
                {activeModule === 'chat' && (
                  <Chat user={userInfo} token={token} />
                )}
                </Suspense>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default Dashboard;
