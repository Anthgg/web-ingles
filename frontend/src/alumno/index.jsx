import React from 'react';
import { 
  FaUser, 
  FaClipboardCheck, 
  FaGraduationCap, 
  FaSignOutAlt, 
  FaBookOpen, 
  FaBell, 
  FaCog, 
  FaChartLine,
  FaCalendarAlt,
  FaTrophy
} from 'react-icons/fa';
import ClasesList from '../components/ClasesList';
import CalificacionesList from '../components/CalificacionesList';
import AsistenciasList from '../components/AsistenciasList';        

// ============================================
// DASHBOARD ESPECÍFICO PARA ESTUDIANTES
// Solo muestra funcionalidades relevantes para alumnos
// ============================================

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
  // Props específicas para estudiantes
  misAsistencias = [],
  misCalificaciones = [],
  misClases = [],
  token,
  showError,
  showSuccess
}) => {
  // Calcular estadísticas del estudiante
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

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      {/* SIDEBAR MEJORADO PARA ESTUDIANTES */}
      <nav className="position-fixed shadow-lg" 
        style={{ 
          width: '280px', 
          height: '100vh',
          overflowY: 'auto',
          background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
          zIndex: 1000
        }}>
        <div className="d-flex flex-column h-100 p-4">
          <div className="text-center mb-4 pb-3 border-bottom border-light border-opacity-25">
            <h3 className="fw-bold text-white mb-0">Go<span className="text-warning">English</span></h3>
            <div className="small text-light opacity-75">Panel del Estudiante</div>
          </div>
        
          {/* Perfil del usuario mejorado */}
          <div className="bg-white bg-opacity-10 rounded-4 p-3 mb-4 text-center">
            <div className="mb-3">
              <div className="bg-warning rounded-circle p-2 d-inline-flex mx-auto" style={{width: '60px', height: '60px'}}>
                <FaUser size={36} color="#1e3c72" style={{margin: 'auto'}} />
              </div>
            </div>
            <h5 className="mb-1 text-white">{userInfo.nombre}</h5>
            <span className="badge bg-warning text-dark">
              <FaGraduationCap className="me-1" />
              {userInfo.rol}
            </span>
          </div>
          
          {/* MENÚ MEJORADO PARA ESTUDIANTES */}
          <div className="mb-2 text-uppercase text-light small fw-bold opacity-75 ms-2">
            Mi Aprendizaje
          </div>
          <ul className="nav nav-pills flex-column mb-auto gap-2">
            <li className="nav-item">
              <button
                className={`nav-link w-100 text-start d-flex align-items-center ${
                  activeModule === 'mis-clases' ? 'active bg-warning text-dark' : 'text-white'
                }`}
                onClick={() => setActiveModule('mis-clases')}
                style={{
                  borderRadius: '12px',
                  fontWeight: '500',
                  padding: '12px'
                }}
              >
                <FaBookOpen className="me-3" />
                Mis Clases
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link w-100 text-start d-flex align-items-center ${
                  activeModule === 'mis-asistencias' ? 'active bg-warning text-dark' : 'text-white'
                }`}
                onClick={() => setActiveModule('mis-asistencias')}
                style={{
                  borderRadius: '12px',
                  fontWeight: '500',
                  padding: '12px'
                }}
              >
                <FaClipboardCheck className="me-3" />
                Mi Asistencia
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link w-100 text-start d-flex align-items-center ${
                  activeModule === 'mis-calificaciones' ? 'active bg-warning text-dark' : 'text-white'
                }`}
                onClick={() => setActiveModule('mis-calificaciones')}
                style={{
                  borderRadius: '12px',
                  fontWeight: '500',
                  padding: '12px'
                }}
              >
                <FaGraduationCap className="me-3" />
                Mis Calificaciones
              </button>
            </li>
          </ul>
          
          <div className="mt-auto pt-3 border-top border-light border-opacity-25">
            <button 
              className="btn btn-outline-light w-100 d-flex align-items-center justify-content-center"
              onClick={onLogout}
              style={{
                borderRadius: '12px',
                fontWeight: '500',
                padding: '12px'
              }}
            >
              <FaSignOutAlt className="me-2" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </nav>

      {/* CONTENIDO PRINCIPAL PARA ESTUDIANTES */}
      <main className="flex-grow-1" style={{ 
        marginLeft: '280px',
        backgroundColor: '#f8f9fa',
        padding: '2rem'
      }}>
        {/* Header de navegación */}
        <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 rounded-4 shadow-sm">
          <div>
            <h4 className="mb-0 fw-bold">
              {activeModule === 'mis-clases' && 'Mis Clases'}
              {activeModule === 'mis-asistencias' && 'Mi Registro de Asistencia'}
              {activeModule === 'mis-calificaciones' && 'Mis Calificaciones'}
              {!activeModule && 'Dashboard Principal'}
            </h4>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb mb-0 small">
                <li className="breadcrumb-item"><a href="#" className="text-decoration-none">Go English</a></li>
                <li className="breadcrumb-item active" aria-current="page">{activeModule || 'Dashboard'}</li>
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

        {/* Notificaciones flotantes */}
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

        {/* CONTENIDO ESPECÍFICO SEGÚN EL MÓDULO SELECCIONADO */}
        <div className="container-fluid p-0">
          {/* Tarjeta de bienvenida mejorada */}
          {(!activeModule || activeModule === 'dashboard') && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                  <div className="card-body p-0">
                    <div className="row g-0">
                      <div className="col-md-8 p-4">
                        <h2 className="display-6 fw-bold text-primary mb-2">
                          ¡Bienvenido, {userInfo.nombre}! 
                          <span className="ms-2" role="img" aria-label="wave">👋</span>
                        </h2>
                        <p className="text-muted mb-4">
                          Accede a tus clases, revisa tus calificaciones y controla tu asistencia desde un solo lugar.
                        </p>
                        <div className="d-flex gap-2">
                          <button 
                            className="btn btn-primary px-4 py-2 rounded-pill" 
                            onClick={() => setActiveModule('mis-clases')}
                          >
                            <FaBookOpen className="me-2" /> Ver mis clases
                          </button>
                          <button 
                            className="btn btn-outline-primary px-4 py-2 rounded-pill"
                            onClick={() => setActiveModule('mis-calificaciones')}
                          >
                            <FaGraduationCap className="me-2" /> Ver calificaciones
                          </button>
                        </div>
                      </div>
                      <div className="col-md-4 d-none d-md-block" 
                        style={{ 
                          background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                          padding: '2rem'
                        }}>
                        <div className="text-white">
                          <h4 className="fw-bold mb-3">Mi Progreso</h4>
                          
                          <div className="mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <small>Asistencia</small>
                              <small className="fw-bold">{calcularAsistencia()}</small>
                            </div>
                            <div className="progress" style={{height: '6px'}}>
                              <div className="progress-bar bg-warning" style={{
                                width: calcularAsistencia()
                              }}></div>
                            </div>
                          </div>
                          
                          <div className="mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <small>Promedio</small>
                              <small className="fw-bold">{calcularPromedio()}</small>
                            </div>
                            <div className="progress" style={{height: '6px'}}>
                              <div className="progress-bar bg-info" style={{
                                width: `${(Number(calcularPromedio()) / 10) * 100}%`
                              }}></div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <small>Clases</small>
                              <small className="fw-bold">{misClases.length}</small>
                            </div>
                            <div className="progress" style={{height: '6px'}}>
                              <div className="progress-bar bg-success" style={{
                                width: `${Math.min(misClases.length * 10, 100)}%`
                              }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tarjetas de estadísticas */}
          {(!activeModule || activeModule === 'dashboard') && (
            <div className="row g-4 mb-4">
              <div className="col-md-4">
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="text-muted mb-1">Clases Inscritas</h6>
                        <h3 className="fw-bold mb-0">{misClases.length}</h3>
                      </div>
                      <div className="bg-primary bg-opacity-25 rounded-4 p-3">
                        <FaBookOpen className="text-primary" size={24} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-4">
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="text-muted mb-1">Asistencia</h6>
                        <h3 className="fw-bold mb-0">{calcularAsistencia()}</h3>
                      </div>
                      <div className="bg-success bg-opacity-25 rounded-4 p-3">
                        <FaClipboardCheck className="text-success" size={24} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-4">
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="text-muted mb-1">Promedio General</h6>
                        <h3 className="fw-bold mb-0">{calcularPromedio()}</h3>
                      </div>
                      <div className="bg-warning bg-opacity-25 rounded-4 p-3">
                        <FaGraduationCap className="text-warning" size={24} />
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
              <div className="spinner-grow text-primary me-2" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
              <div className="spinner-grow text-primary me-2" role="status" style={{animationDelay: "0.2s"}}>
                <span className="visually-hidden">Cargando...</span>
              </div>
              <div className="spinner-grow text-primary" role="status" style={{animationDelay: "0.4s"}}>
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          )}
          
          {/* MÓDULO: MIS CLASES */}
          {activeModule === 'mis-clases' && !loading && (
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-header bg-white p-4 border-0">
                <div className="d-flex justify-content-between align-items-center">
                  <h4 className="mb-0 fw-bold d-flex align-items-center">
                    <FaBookOpen className="text-primary me-2" /> 
                    Mis Clases
                  </h4>
                  <span className="badge bg-primary rounded-pill">{misClases.length} clases</span>
                </div>
              </div>
              <div className="card-body">
                {misClases.length > 0 ? (
                  <ClasesList
                    clases={misClases}
                    token={token}
                    onClaseClick={(clase) => {
                      console.log('Clase seleccionada:', clase);
                    }}
                    showError={showError}
                    showSuccess={showSuccess}
                  />
                ) : (
                  <div className="text-center py-5">
                    <div className="mb-3">
                      <div className="bg-light rounded-circle p-3 d-inline-flex">
                        <FaBookOpen size={50} className="text-muted" />
                      </div>
                    </div>
                    <h5>No estás inscrito en ninguna clase</h5>
                    <p className="text-muted">Contacta con administración para inscribirte en clases</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* MÓDULO: MIS ASISTENCIAS */}
          {activeModule === 'mis-asistencias' && !loading && (
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-header bg-white p-4 border-0">
                <div className="d-flex justify-content-between align-items-center">
                  <h4 className="mb-0 fw-bold d-flex align-items-center">
                    <FaClipboardCheck className="text-success me-2" /> 
                    Mi Registro de Asistencia
                  </h4>
                  <span className="badge bg-success rounded-pill">
                    {misAsistencias.filter(a => a.presente).length} de {misAsistencias.length}
                  </span>
                </div>
              </div>
              <div className="card-body">
                {misAsistencias.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>Fecha</th>
                          <th>Clase</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {misAsistencias.map((asistencia, index) => (
                          <tr key={index}>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="bg-light rounded p-2 me-3">
                                  <FaCalendarAlt className="text-primary" />
                                </div>
                                {new Date(asistencia.fecha).toLocaleDateString()}
                              </div>
                            </td>
                            <td>{asistencia.nombreClase}</td>
                            <td>
                              <span className={`badge ${
                                asistencia.presente 
                                  ? 'bg-success-subtle text-success' 
                                  : 'bg-danger-subtle text-danger'
                              } px-3 py-2 rounded-pill`}>
                                {asistencia.presente ? '✓ Presente' : '✗ Ausente'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <div className="mb-3">
                      <div className="bg-light rounded-circle p-3 d-inline-flex">
                        <FaClipboardCheck size={50} className="text-muted" />
                      </div>
                    </div>
                    <h5>No hay registros de asistencia disponibles</h5>
                    <p className="text-muted">Los registros aparecerán una vez que comiences tus clases</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* MÓDULO: MIS CALIFICACIONES */}
          {activeModule === 'mis-calificaciones' && !loading && (
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-header bg-white p-4 border-0">
                <div className="d-flex justify-content-between align-items-center">
                  <h4 className="mb-0 fw-bold d-flex align-items-center">
                    <FaGraduationCap className="text-warning me-2" /> 
                    Mis Calificaciones
                  </h4>
                  <div>
                    <span className="badge bg-warning text-dark rounded-pill">
                      Promedio: {calcularPromedio()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="card-body">
                {misCalificaciones.length > 0 ? (
                  <div className="row">
                    {misCalificaciones.map((calificacion, index) => {
                      const colorClass = 
                        calificacion.nota >= 7 ? 'success' : 
                        calificacion.nota >= 5 ? 'warning' : 'danger';
                      
                      return (
                        <div key={index} className="col-md-6 col-lg-4 mb-3">
                          <div className="card h-100 border-0 shadow-sm">
                            <div className={`card-header bg-${colorClass}-subtle p-3`}>
                              <h5 className="card-title mb-0 fw-bold">{calificacion.nombreClase}</h5>
                              <small className="text-muted">{calificacion.tipo}</small>
                            </div>
                            <div className="card-body text-center p-4">
                              <div className={`display-4 mb-3 text-${colorClass} fw-bold`}>
                                {calificacion.nota}
                              </div>
                              <div className="progress mb-3" style={{height: '8px'}}>
                                <div className={`progress-bar bg-${colorClass}`} 
                                  style={{width: `${(calificacion.nota / 10) * 100}%`}}>
                                </div>
                              </div>
                              <div className="d-flex justify-content-between align-items-center">
                                <FaTrophy className={`text-${colorClass}`} />
                                <small className="text-muted">
                                  {new Date(calificacion.fecha).toLocaleDateString()}
                                </small>
                                <FaChartLine className={`text-${colorClass}`} />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <div className="mb-3">
                      <div className="bg-light rounded-circle p-3 d-inline-flex">
                        <FaGraduationCap size={50} className="text-muted" />
                      </div>
                    </div>
                    <h5>No hay calificaciones disponibles</h5>
                    <p className="text-muted">Las calificaciones aparecerán cuando tus profesores las publiquen</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;