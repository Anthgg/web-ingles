import React from 'react';
import {
  FaUser,
  FaChalkboardTeacher,
  FaClipboardCheck,
  FaGraduationCap,
  FaSignOutAlt,
  FaUsers,
  FaTasks,
  FaBook,
  FaHome,
  FaBell,
  FaCog
} from 'react-icons/fa';
import ClasesList from '../components/ClasesList';
import AsistenciasList from '../components/AsistenciasList';
import CalificacionesList from '../components/CalificacionesList';
import CursosAsignadosDocente from '../components/ProfesoresAsignaturas';
import ProfesoresAsignaturas from '../components/ProfesoresAsignaturas';
import MisAsignacionesDocente from '../components-docente/MisAsignacionesDocente';

const TeacherDashboard = ({
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
  calificaciones,
  asignaciones,
  token,
  showError,
  showSuccess
}) => {
  const misAsignaciones = Array.isArray(asignaciones)
    ? asignaciones.filter(a => a.profesor_nombre === userInfo.nombre)
    : [];

  const asignaturasUnicas = [...new Set(misAsignaciones.map(a => a.curso_nombre))];

  return (
    <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Sidebar navigation */}
      <nav className="position-fixed shadow-lg bg-white text-dark p-4" 
        style={{ 
          width: '280px', 
          height: '100vh',
          overflowY: 'auto',
          borderRight: '1px solid rgba(0,0,0,0.05)',
          zIndex: 1000
        }}>
        <div className="d-flex flex-column h-100">
          {/* Logo y título */}
          <div className="text-center mb-4">
            <h3 className="fw-bold text-success mb-0">Go<span className="text-primary">English</span></h3>
            <div className="small text-muted">Panel del Docente</div>
          </div>

          {/* User info */}
          <div className="bg-light rounded-4 p-3 mb-4">
            <div className="d-flex align-items-center">
              <div className="bg-success rounded-circle p-2 me-3">
                <FaChalkboardTeacher size={24} color="#fff" />
              </div>
              <div>
                <h5 className="mb-0 fw-bold">{userInfo.nombre}</h5>
                <span className="badge bg-success bg-opacity-25 text-success">
                  <FaGraduationCap className="me-1" />
                  {userInfo.rol}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation menu */}
          <div className="mb-2 text-uppercase text-muted small fw-bold ms-2">Menú Principal</div>
          <ul className="nav nav-pills flex-column mb-auto gap-2">
            <li className="nav-item">
              <button
                className={`nav-link w-100 text-start d-flex align-items-center ${
                  activeModule === 'dashboard' ? 'active bg-success' : 'text-dark'
                }`}
                onClick={() => setActiveModule('dashboard')}
                style={{ borderRadius: '12px', fontWeight: '500', padding: '12px' }}
              >
                <FaHome className="me-3" />
                Dashboard
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link w-100 text-start d-flex align-items-center ${
                  activeModule === 'cursos-asignados' ? 'active bg-success' : 'text-dark'
                }`}
                onClick={() => setActiveModule('cursos-asignados')}
                style={{ borderRadius: '12px', fontWeight: '500', padding: '12px' }}
              >
                <FaBook className="me-3" />
                Cursos Asignados
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link w-100 text-start d-flex align-items-center ${
                  activeModule === 'asistencias' ? 'active bg-success' : 'text-dark'
                }`}
                onClick={() => setActiveModule('asistencias')}
                style={{ borderRadius: '12px', fontWeight: '500', padding: '12px' }}
              >
                <FaClipboardCheck className="me-3" />
                Control de Asistencia
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link w-100 text-start d-flex align-items-center ${
                  activeModule === 'calificaciones' ? 'active bg-success' : 'text-dark'
                }`}
                onClick={() => setActiveModule('calificaciones')}
                style={{ borderRadius: '12px', fontWeight: '500', padding: '12px' }}
              >
                <FaTasks className="me-3" />
                Calificaciones
              </button>
            </li>
          </ul>

          <div className="mt-auto pt-3 border-top">
            <button
              className="btn btn-danger w-100 d-flex align-items-center justify-content-center shadow-sm"
              onClick={onLogout}
              style={{ borderRadius: '12px', fontWeight: '500', padding: '12px' }}
            >
              <FaSignOutAlt className="me-2" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-grow-1" style={{ 
        marginLeft: '280px',
        padding: '2rem'
      }}>
        {/* Top navigation */}
        <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 rounded-4 shadow-sm">
          <div>
            <h4 className="mb-0 fw-bold">
              {activeModule === 'cursos-asignados' && 'Mis Cursos Asignados'}
              {activeModule === 'dashboard' && 'Dashboard Principal'}
              {activeModule === 'asistencias' && 'Control de Asistencia'}
              {activeModule === 'calificaciones' && 'Gestión de Calificaciones'}
            </h4>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb mb-0 small">
                <li className="breadcrumb-item"><a href="#" className="text-decoration-none">Go English</a></li>
                <li className="breadcrumb-item active" aria-current="page">{activeModule}</li>
              </ol>
            </nav>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-light rounded-circle" style={{width: '40px', height: '40px'}}>
              <FaBell />
            </button>
            <button className="btn btn-light rounded-circle" style={{width: '40px', height: '40px'}}>
              <FaCog />
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="position-fixed top-0 end-0 m-4" style={{ zIndex: 1050 }}>
            <div className="alert alert-danger alert-dismissible fade show shadow-lg rounded-4" role="alert">
              <strong><FaBell className="me-2" /> Error:</strong> {error}
              <button type="button" className="btn-close" onClick={() => setError('')}></button>
            </div>
          </div>
        )}

        {success && (
          <div className="position-fixed top-0 end-0 m-4" style={{ zIndex: 1050 }}>
            <div className="alert alert-success alert-dismissible fade show shadow-lg rounded-4" role="alert">
              <strong><FaClipboardCheck className="me-2" /> Éxito:</strong> {success}
              <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
            </div>
          </div>
        )}

        {/* Welcome card */}
        {(activeModule === 'dashboard' || !activeModule) && (
          <div className="row g-4 mb-4">
            <div className="col-12">
              <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                <div className="card-body p-0">
                  <div className="row g-0">
                    <div className="col-md-8 p-4">
                      <h2 className="display-6 fw-bold text-success mb-2">¡Bienvenido, Profesor {userInfo.nombre}!</h2>
                      <p className="text-muted mb-4">
                        Desde aquí puede gestionar sus cursos asignados, registrar asistencias y calificaciones.
                      </p>
                      <div className="d-flex gap-2">
                        <button 
                          className="btn btn-success px-4 py-2 rounded-pill" 
                          onClick={() => setActiveModule('cursos-asignados')}
                        >
                          <FaBook className="me-2" /> Ver mis cursos
                        </button>
                        <button className="btn btn-outline-primary px-4 py-2 rounded-pill">
                          <FaUsers className="me-2" /> Ver estudiantes
                        </button>
                      </div>
                    </div>
                    <div className="col-md-4 d-none d-md-block bg-success bg-gradient text-white p-4">
                      <h4 className="fw-bold">Asignaturas asignadas</h4>
                      <div className="mb-3">
                        <div className="progress mb-2" style={{ height: '5px' }}>
                          <div className="progress-bar bg-warning" style={{ width: '70%' }}></div>
                        </div>
                        <small>Progreso del período: 70%</small>
                      </div>
                      {asignaturasUnicas.length > 0 ? (
                        <ul className="list-unstyled">
                          {asignaturasUnicas.map((asignatura, index) => (
                            <li key={index} className="mb-2 d-flex align-items-center">
                              <span className="badge bg-white text-success me-2">
                                {index + 1}
                              </span>
                              {asignatura}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>No hay asignaturas asignadas</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats cards */}
        {(activeModule === 'dashboard' || !activeModule) && (
          <div className="row g-4 mb-4">
            <div className="col-md-3">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="text-muted mb-1">Cursos asignados</h6>
                      <h3 className="fw-bold mb-0">{asignaturasUnicas.length}</h3>
                    </div>
                    <div className="bg-success bg-opacity-25 rounded-4 p-3">
                      <FaBook className="text-success" size={24} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-md-3">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="text-muted mb-1">Estudiantes</h6>
                      <h3 className="fw-bold mb-0">{misAsignaciones.length}</h3>
                    </div>
                    <div className="bg-primary bg-opacity-25 rounded-4 p-3">
                      <FaUsers className="text-primary" size={24} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-md-3">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="text-muted mb-1">Asistencia promedio</h6>
                      <h3 className="fw-bold mb-0">92%</h3>
                    </div>
                    <div className="bg-warning bg-opacity-25 rounded-4 p-3">
                      <FaClipboardCheck className="text-warning" size={24} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-md-3">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="text-muted mb-1">Calificaciones</h6>
                      <h3 className="fw-bold mb-0">B+</h3>
                    </div>
                    <div className="bg-info bg-opacity-25 rounded-4 p-3">
                      <FaTasks className="text-info" size={24} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading spinner */}
        {loading && (
          <div className="d-flex justify-content-center my-5">
            <div className="spinner-grow text-success me-2" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
            <div className="spinner-grow text-success me-2" role="status" style={{animationDelay: "0.2s"}}>
              <span className="visually-hidden">Cargando...</span>
            </div>
            <div className="spinner-grow text-success" role="status" style={{animationDelay: "0.4s"}}>
              <span className="visually-hidden">Cargando...</span>
            </div>
          </div>
        )}

        {/* Render MisAsignacionesDocente when active */}
        {activeModule === 'cursos-asignados' && !loading && (
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <MisAsignacionesDocente 
                asignaciones={misAsignaciones}
                loading={loading}
                error={error}
                token={token}
                userInfo={userInfo}
                showError={showError}
                showSuccess={showSuccess}
              />
            </div>
          </div>
        )}

        {/* Render placeholder for other modules */}
        {activeModule === 'asistencias' && !loading && (
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4 text-center">
              <div className="py-5">
                <FaClipboardCheck size={50} className="text-success opacity-25 mb-3" />
                <h3>Control de Asistencia</h3>
                <p className="text-muted">Gestione la asistencia de sus estudiantes desde aquí.</p>
              </div>
            </div>
          </div>
        )}

        {activeModule === 'calificaciones' && !loading && (
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4 text-center">
              <div className="py-5">
                <FaTasks size={50} className="text-success opacity-25 mb-3" />
                <h3>Gestión de Calificaciones</h3>
                <p className="text-muted">Gestione las calificaciones de sus estudiantes desde aquí.</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TeacherDashboard;