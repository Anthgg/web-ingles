import React, { useCallback, useState, useEffect } from 'react';
import { 
  FaUser, FaChalkboardTeacher, FaClipboardCheck, FaGraduationCap, 
  FaSignOutAlt, FaUserShield, FaCalendarAlt, FaUserGraduate,
  FaTachometerAlt, FaBullhorn, FaEllipsisH, FaRegBell,
  FaChartBar, FaChartPie, FaCog, FaSearch, FaFilter,
  FaHome, FaUsers, FaBookOpen, FaAward, FaChevronDown,
  FaMoon, FaSun, FaBars, FaTimes, FaExpand, FaCompress,
  FaRocket, FaLightbulb, FaFire, FaStar, FaGem, FaCheck
} from 'react-icons/fa';
import UsuariosList from '../components/UsuariosList';
import ClasesList from '../components/ClasesList';
import AsistenciasList from '../components/AsistenciasList';
import CalificacionesList from '../components/CalificacionesList';
import AsignacionProfesores from '../components/AsignacionProfesores';
import ProfesoresAsignaturas from '../components/ProfesoresAsignaturas';
import AsignacionEstudiantes from '../components/AsignacionEstudiantes';

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
  token,
  fetchUsuarios,
  fetchClases,
  fetchAsistencias,
  fetchAsignaciones,
  fetchCalificaciones,
  showError,
  showSuccess,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Persistir tema en localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('dashboard-theme');
    if (savedTheme) {
      setDarkMode(savedTheme === 'dark');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('dashboard-theme', darkMode ? 'dark' : 'light');
    document.body.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handleModuleChange = useCallback((module) => {
    try {
      setActiveModule(module);
    } catch (err) {
      console.error('Error al cambiar módulo:', err);
      showError && showError('Error al cambiar de módulo');
    }
  }, [setActiveModule, showError]);

  const profesores = Array.isArray(usuarios) ? usuarios.filter(u => u.rol === 'profesor' || u.rol === 'docente') : [];
  const cursos = Array.isArray(clases) ? clases : [];
  const estudiantes = Array.isArray(usuarios) ? usuarios.filter(u => u.rol === 'estudiante') : [];

  const statsData = {
    usuarios: usuarios?.length || 0,
    clases: clases?.length || 0,
    profesores: profesores?.length || 0,
    estudiantes: estudiantes?.length || 0
  };

  const menuItems = [
    {
      category: 'Principal',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: FaTachometerAlt, module: null },
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
        { id: 'configuracion', label: 'Configuración', icon: FaCog, module: 'configuracion' },
      ]
    }
  ];

  const getModuleTitle = (module) => {
    const titles = {
      'usuarios': 'Gestión de Usuarios',
      'clases': 'Gestión de Cursos',
      'asistencias': 'Control de Asistencias',
      'calificaciones': 'Gestión de Calificaciones',
      'asignacion': 'Asignación de Profesores',
      'profesores-asignaturas': 'Profesores y Asignaturas',
      'asignacion-estudiantes': 'Asignación de Estudiantes',
      'reportes': 'Reportes del Sistema',
      'configuracion': 'Configuración del Sistema'
    };
    return titles[module] || 'Dashboard Principal';
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  return (
    <>
      <style jsx>{`
        /* Variables CSS para temas */
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

        .minimal-dashboard {
          min-height: 100vh;
          background: var(--bg-secondary);
          color: var(--text-primary);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow-x: hidden;
        }

        .minimal-sidebar {
          background: var(--bg-primary);
          border-right: 1px solid var(--border-color);
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          z-index: 1000;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--shadow-lg);
          overflow-y: auto;
          overflow-x: hidden;
        }

        .sidebar-collapsed {
          width: 80px !important;
        }

        .sidebar-collapsed .nav-text,
        .sidebar-collapsed .category-title,
        .sidebar-collapsed .user-details {
          opacity: 0;
          visibility: hidden;
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
          border-radius: 12px;
          box-shadow: var(--shadow-md);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .minimal-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-xl);
        }

        .stat-card {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 24px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-xl);
          border-color: var(--accent-primary);
        }

        .nav-item {
          margin-bottom: 4px;
        }

        .nav-link-minimal {
          padding: 12px 16px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-weight: 500;
          transition: all 0.2s ease;
          width: 100%;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          overflow: hidden;
        }

        .nav-link-minimal::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          width: 3px;
          background: var(--accent-primary);
          transform: scaleY(0);
          transition: transform 0.2s ease;
        }

        .nav-link-minimal:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          transform: translateX(4px);
        }

        .nav-link-minimal.active {
          background: rgba(59, 130, 246, 0.1);
          color: var(--accent-primary);
        }

        .nav-link-minimal.active::before {
          transform: scaleY(1);
        }

        .icon-wrapper {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .minimal-header {
          background: var(--bg-primary);
          border-bottom: 1px solid var(--border-color);
          padding: 16px 24px;
          position: sticky;
          top: 0;
          z-index: 100;
          backdrop-filter: blur(8px);
        }

        .content-area {
          padding: 24px;
          min-height: calc(100vh - 80px);
        }

        .search-input {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 8px 16px 8px 40px;
          color: var(--text-primary);
          transition: all 0.2s ease;
          width: 300px;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .action-btn {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: var(--bg-secondary);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .action-btn:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          transform: scale(1.05);
        }

        .notification {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 1050;
          min-width: 320px;
          border-radius: 12px;
          backdrop-filter: blur(8px);
          animation: slideInRight 0.3s ease;
        }

        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border-color);
          border-top: 3px solid var(--accent-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .user-menu {
          position: absolute;
          top: 100%;
          right: 0;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          min-width: 200px;
          box-shadow: var(--shadow-lg);
          z-index: 1001;
          animation: fadeInUp 0.2s ease;
        }

        .quick-action {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .quick-action:hover {
          background: var(--bg-tertiary);
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .category-title {
          font-size: 12px;
          text-transform: uppercase;
          font-weight: 600;
          color: var(--text-muted);
          margin: 20px 0 8px 0;
          letter-spacing: 0.5px;
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

        /* Responsive */
        @media (max-width: 768px) {
          .minimal-sidebar {
            transform: translateX(-100%);
          }
          
          .minimal-sidebar.show {
            transform: translateX(0);
          }
          
          .search-input {
            width: 200px;
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
          className={`minimal-sidebar theme-transition ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
          style={{
            width: sidebarCollapsed ? '80px' : '280px'
          }}
        >
          {/* Logo */}
          <div className="p-4 border-bottom" style={{ borderColor: 'var(--border-color)' }}>
            <div className="d-flex align-items-center">
              <div 
                className="d-flex align-items-center justify-content-center me-3"
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'var(--accent-primary)',
                  borderRadius: '10px',
                  color: 'white'
                }}
              >
                <FaGem size={20} />
              </div>
              <div className="nav-text">
                <h5 className="mb-0 fw-bold">GoEnglish</h5>
                <small className="text-muted">Admin Panel</small>
              </div>
              <button 
                className="btn btn-link p-0 ms-auto"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                style={{ color: 'var(--text-secondary)' }}
              >
                {sidebarCollapsed ? <FaExpand size={16} /> : <FaCompress size={16} />}
              </button>
            </div>
          </div>

          {/* User Info */}
          {!sidebarCollapsed && (
            <div className="p-4 border-bottom" style={{ borderColor: 'var(--border-color)' }}>
              <div 
                className="d-flex align-items-center cursor-pointer position-relative"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div 
                  className="d-flex align-items-center justify-content-center me-3"
                  style={{
                    width: '40px',
                    height: '40px',
                    background: 'var(--accent-secondary)',
                    borderRadius: '50%',
                    color: 'white'
                  }}
                >
                  <FaUser size={16} />
                </div>
                <div className="flex-grow-1 user-details">
                  <div className="fw-medium">{userInfo?.nombre || 'Administrador'}</div>
                  <small className="text-muted">{userInfo?.rol || 'Admin'}</small>
                </div>
                <FaChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
              </div>
              
              {showUserMenu && (
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
          )}

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
          className="flex-grow-1"
          style={{ 
            marginLeft: sidebarCollapsed ? '80px' : '280px',
            transition: 'margin-left 0.3s ease'
          }}
        >
          {/* Header */}
          <div className="minimal-header theme-transition">
            <div className="d-flex align-items-center justify-content-between">
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
              
              <div className="d-flex align-items-center gap-3">
                {/* Search */}
                <div className="position-relative">
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
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
                >
                  {darkMode ? <FaSun size={16} /> : <FaMoon size={16} />}
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
              <div className="minimal-card fade-in">
                {activeModule === 'usuarios' && (
                  <UsuariosList 
                    usuarios={usuarios} 
                    token={token} 
                    fetchUsuarios={fetchUsuarios} 
                    showError={showError} 
                    showSuccess={showSuccess} 
                  />
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
                  />
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default Dashboard;