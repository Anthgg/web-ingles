import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
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
  FaTrophy,
  FaPlus,
  FaTimes,
  FaSync,
  FaIdBadge
} from 'react-icons/fa';
import Configuracion from '../components/Configuracion';
import Chat from '../components/Chat';
import StudentInternalForm from '../components/StudentInternalForm';

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
  const { isDark, toggleTheme } = useTheme();
  const [enrollingId, setEnrollingId] = useState(null);
  const [droppingId, setDroppingId] = useState(null);
  const [refreshingCursos, setRefreshingCursos] = useState(false);

  const cursosInscritos = Array.isArray(misCursos) && misCursos.length ? misCursos : misClases;
  const disponibles = Array.isArray(cursosDisponibles) ? cursosDisponibles : [];
  const totalCursosInscritos = cursosInscritos.length;

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

  const resolverCursoId = (curso = {}) => curso.asignacionId ?? curso.id ?? curso.cursoId ?? curso.materiaId ?? curso.codigo;
  const resolverNombreCurso = (curso = {}) => curso.curso_nombre ?? curso.nombreCurso ?? curso.nombre ?? curso.curso ?? curso.titulo ?? 'Curso sin título';
  const resolverDocenteCurso = (curso = {}) => curso.profesor_nombre ?? curso.docenteNombre ?? curso.profesor ?? curso.docente ?? curso.maestro ?? curso.teacher ?? 'Docente no asignado';
  const resolverHorarioCurso = (curso = {}) => curso.horario ?? curso.horarioDescripcion ?? curso.horarioTexto ?? curso.horarioDetallado ?? curso.horarioCompleto ?? curso.hora ?? null;
  const resolverCuposDisponibles = (curso = {}) => {
    if (curso.cuposDisponibles != null) return curso.cuposDisponibles;
    if (curso.cupos != null) return curso.cupos;
    if (curso.capacidadDisponible != null) return curso.capacidadDisponible;
    if (curso.capacidad != null && curso.inscritos != null) {
      const restantes = curso.capacidad - curso.inscritos;
      return restantes >= 0 ? restantes : 0;
    }
    return null;
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
                  <img
                src="/logo.png"
                alt="Logo IE"
                style={{
                  width: '90px',
                  height: '90px',
                  objectFit: 'contain',
                  marginBottom: '12px',
                  borderRadius: '50%'
                }}
              />
            <h3 className="fw-bold text-white mb-0">I.E Peruano Japonés 7213</h3>
           <br/>
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
                  activeModule === 'seleccionar-curso' ? 'active bg-warning text-dark' : 'text-white'
                }`}
                onClick={() => setActiveModule('seleccionar-curso')}
                style={{
                  borderRadius: '12px',
                  fontWeight: '500',
                  padding: '12px'
                }}
              >
                <FaPlus className="me-3" />
                Seleccionar Curso
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
            <li className="nav-item">
              <button
                className={`nav-link w-100 text-start d-flex align-items-center ${
                  activeModule === 'ficha-interna' ? 'active bg-warning text-dark' : 'text-white'
                }`}
                onClick={() => setActiveModule('ficha-interna')}
                style={{
                  borderRadius: '12px',
                  fontWeight: '500',
                  padding: '12px'
                }}
              >
                <FaIdBadge className="me-3" />
                Ficha interna
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link w-100 text-start d-flex align-items-center ${
                  activeModule === 'chat' ? 'active bg-warning text-dark' : 'text-white'
                }`}
                onClick={() => setActiveModule('chat')}
                style={{
                  borderRadius: '12px',
                  fontWeight: '500',
                  padding: '12px'
                }}
              >
                <FaBell className="me-3" />
                Mensajería
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
          <div className="d-flex align-items-center">
            <img src="/logo.png" alt="Logo I.E Peruano Japonés 7213" className="me-3" style={{height: '40px', width: 'auto'}} />
            <h4 className="mb-0 fw-bold">
              {activeModule === 'mis-clases' && 'Mis Clases'}
              {activeModule === 'mis-asistencias' && 'Mi Registro de Asistencia'}
              {activeModule === 'mis-calificaciones' && 'Mis Calificaciones'}
              {activeModule === 'seleccionar-curso' && 'Seleccionar curso'}
              {activeModule === 'chat' && 'Mensajería'}
              {activeModule === 'ficha-interna' && 'Ficha interna del estudiante'}
              {!activeModule && 'Dashboard Principal'}
            </h4>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb mb-0 small">
                <li className="breadcrumb-item text-muted">I.E Peruano Japonés 7213</li>
                <li className="breadcrumb-item active" aria-current="page">{activeModule || 'Dashboard'}</li>
              </ol>
            </nav>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-light rounded-circle" style={{width: '40px', height: '40px'}}>
              <FaBell />
            </button>
            <button className="btn btn-light rounded-circle" style={{width: '40px', height: '40px'}} onClick={() => setActiveModule('configuracion')}>
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
                          -íBienvenido, {userInfo.nombre}! 
                          <span className="ms-2" role="img" aria-label="wave">­ƒæï</span>
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
                              <small>Cursos</small>
                              <small className="fw-bold">{totalCursosInscritos}</small>
                            </div>
                            <div className="progress" style={{height: '6px'}}>
                              <div className="progress-bar bg-success" style={{
                                width: `${Math.min(totalCursosInscritos * 10, 100)}%`
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
                        <h6 className="text-muted mb-1">Cursos Inscritos</h6>
                        <h3 className="fw-bold mb-0">{totalCursosInscritos}</h3>
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
          
          {/* MÓDULO: SELECCIONAR CURSO */}
          {activeModule === 'seleccionar-curso' && !loading && (
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-header bg-white p-4 border-0">
                <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
                  <div>
                    <h4 className="mb-1 fw-bold d-flex align-items-center">
                      <FaBookOpen className="text-primary me-2" />
                      Seleccionar Curso
                    </h4>
                    <p className="text-muted mb-0">
                      Gestiona los cursos en los que estás inscrito y descubre nuevas opciones disponibles.
                    </p>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-primary-subtle text-primary rounded-pill">
                      {totalCursosInscritos} inscritos
                    </span>
                    <button
                      className="btn btn-outline-primary d-flex align-items-center gap-2"
                      onClick={handleRefreshCursos}
                      disabled={refreshingCursos}
                    >
                      {refreshingCursos ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" />
                          Actualizando...
                        </>
                      ) : (
                        <>
                          <FaSync />
                          Actualizar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="row g-4">
                  <div className="col-lg-6">
                    <h5 className="fw-semibold mb-3 d-flex align-items-center">
                      <FaClipboardCheck className="text-success me-2" />
                      Mis cursos inscritos
                    </h5>
                    {cursosInscritos.length > 0 ? (
                      <div className="list-group">
                        {cursosInscritos.map((curso, index) => {
                          const cursoId = resolverCursoId(curso);
                          const nombreCurso = resolverNombreCurso(curso);
                          const docenteCurso = resolverDocenteCurso(curso);
                          const horarioCurso = resolverHorarioCurso(curso);
                          const descripcionCurso = curso?.descripcion || curso?.descripcionCurso || curso?.detalle;
                          return (
                            <div
                              key={cursoId ?? index}
                              className="list-group-item border-0 rounded-4 shadow-sm mb-3"
                            >
                              <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                                <div>
                                  <h6 className="fw-bold mb-1">{nombreCurso}</h6>
                                  <p className="text-muted mb-1 small">{docenteCurso}</p>
                                  <div className="d-flex flex-wrap gap-2">
                                    {horarioCurso && (
                                      <span className="badge bg-light text-secondary rounded-pill">
                                        {horarioCurso}
                                      </span>
                                    )}
                                  </div>
                                  {descripcionCurso && (
                                    <p className="text-muted mb-0 small mt-2">{descripcionCurso}</p>
                                  )}
                                </div>
                                <button
                                  className="btn btn-outline-danger btn-sm d-flex align-items-center gap-2"
                                  onClick={() => handleCancelarInscripcion(cursoId)}
                                  disabled={droppingId === cursoId}
                                >
                                  {droppingId === cursoId ? (
                                    <>
                                      <span className="spinner-border spinner-border-sm" role="status" />
                                      Cancelando...
                                    </>
                                  ) : (
                                    <>
                                      <FaTimes />
                                      Cancelar
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center border rounded-4 p-4 bg-light">
                        <FaClipboardCheck size={36} className="text-muted mb-3" />
                        <h6 className="fw-semibold">Aún no te has inscrito en cursos</h6>
                        <p className="text-muted mb-0">
                          Explora las opciones disponibles y únete a tus clases favoritas.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="col-lg-6">
                    <h5 className="fw-semibold mb-3 d-flex align-items-center">
                      <FaPlus className="text-primary me-2" />
                      Cursos disponibles
                    </h5>
                    {disponibles.length > 0 ? (
                      <div className="list-group">
                        {disponibles.map((curso, index) => {
                          const cursoId = resolverCursoId(curso);
                          const nombreCurso = resolverNombreCurso(curso);
                          const docenteCurso = resolverDocenteCurso(curso);
                          const horarioCurso = resolverHorarioCurso(curso);
                          const descripcionCurso = curso?.descripcion || curso?.descripcionCurso || curso?.detalle;
                          const cuposCurso = resolverCuposDisponibles(curso);
                          return (
                            <div
                              key={cursoId ?? index}
                              className="list-group-item border-0 rounded-4 shadow-sm mb-3"
                            >
                              <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                                <div>
                                  <h6 className="fw-bold mb-1">{nombreCurso}</h6>
                                  <p className="text-muted mb-1 small">{docenteCurso}</p>
                                  <div className="d-flex flex-wrap gap-2">
                                    {horarioCurso && (
                                      <span className="badge bg-primary-subtle text-primary rounded-pill">
                                        {horarioCurso}
                                      </span>
                                    )}
                                    {cuposCurso != null && (
                                      <span className="badge bg-success-subtle text-success rounded-pill">
                                        {cuposCurso} cupos disponibles
                                      </span>
                                    )}
                                  </div>
                                  {descripcionCurso && (
                                    <p className="text-muted mb-0 small mt-2">{descripcionCurso}</p>
                                  )}
                                </div>
                                <button
                                  className="btn btn-primary btn-sm d-flex align-items-center gap-2"
                                  onClick={() => handleInscribirse(cursoId)}
                                  disabled={enrollingId === cursoId || droppingId === cursoId}
                                >
                                  {enrollingId === cursoId ? (
                                    <>
                                      <span className="spinner-border spinner-border-sm" role="status" />
                                      Inscribiendo...
                                    </>
                                  ) : (
                                    <>
                                      <FaPlus />
                                      Inscribirme
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center border rounded-4 p-4 bg-light">
                        <FaBookOpen size={36} className="text-muted mb-3" />
                        <h6 className="fw-semibold">No hay cursos disponibles por ahora</h6>
                        <p className="text-muted mb-0">
                          Vuelve a intentarlo más tarde o solicita apoyo a administración.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
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
                  <span className="badge bg-primary rounded-pill">{totalCursosInscritos} cursos</span>
                </div>
              </div>
              <div className="card-body">
                {cursosInscritos.length > 0 ? (
                  <div className="row g-4">
                    {cursosInscritos.map((curso, index) => {
                      const cursoId = resolverCursoId(curso);
                      const nombreCurso = resolverNombreCurso(curso);
                      const docenteCurso = resolverDocenteCurso(curso);
                      const horarioCurso = resolverHorarioCurso(curso);
                      const aulaCurso = curso.aula ?? curso.aulaCurso ?? '';
                      const descripcionCurso = curso?.descripcion || curso?.descripcionCurso || curso?.detalle;
                      return (
                        <div key={cursoId ?? index} className="col-md-6 col-lg-4">
                          <div className="card border-0 shadow-sm rounded-4 h-100">
                            <div className="card-body">
                              <h5 className="fw-bold mb-2 text-primary">{nombreCurso}</h5>
                              <p className="text-muted mb-1 small"><strong>Docente:</strong> {docenteCurso}</p>
                              <div className="d-flex flex-wrap gap-2 mb-2">
                                {horarioCurso && (
                                  <span className="badge bg-light text-secondary rounded-pill">
                                    {horarioCurso}
                                  </span>
                                )}
                                {aulaCurso && (
                                  <span className="badge bg-info-subtle text-info rounded-pill">
                                    Aula: {aulaCurso}
                                  </span>
                                )}
                                {/* Estado del curso: activo/inactivo */}
                                {curso.fecha_inicio && curso.fecha_fin && (
                                  (() => {
                                    const inicio = new Date(curso.fecha_inicio);
                                    const fin = new Date(curso.fecha_fin);
                                    const hoy = new Date();
                                    const activo = hoy >= inicio && hoy <= fin;
                                    return (
                                      <span className={`badge rounded-pill ${activo ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                                        {activo ? 'Activo' : 'Inactivo'}
                                      </span>
                                    );
                                  })()
                                )}
                              </div>
                              {/* Fechas de inicio y fin */}
                              {curso.fecha_inicio && (
                                <p className="text-muted mb-0 small">Inicio: {new Date(curso.fecha_inicio).toLocaleDateString()}</p>
                              )}
                              {curso.fecha_fin && (
                                <p className="text-muted mb-0 small">Fin: {new Date(curso.fecha_fin).toLocaleDateString()}</p>
                              )}
                              {/* Estado del aula */}
                              <p className="text-muted mb-0 small">
                                Estado aula: <span className="fw-bold">{aulaCurso ? aulaCurso : 'Sin aula'}</span>
                              </p>
                              {descripcionCurso && (
                                <p className="text-muted mb-0 small mt-2">{descripcionCurso}</p>
                              )}
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
                        <FaBookOpen size={50} className="text-muted" />
                      </div>
                    </div>
                    <h5>No estás inscrito en ningún curso</h5>
                    <p className="text-muted">Contacta con administración para inscribirte en cursos</p>
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
                                {asistencia.presente ? 'Ô£ô Presente' : 'Ô£ù Ausente'}
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

        {activeModule === 'ficha-interna' && !loading && (
          <StudentInternalForm showError={showError} showSuccess={showSuccess} />
        )}

        {activeModule === 'chat' && !loading && (
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-0">
              <Chat user={userInfo} token={token} />
            </div>
          </div>
        )}

        {activeModule === 'configuracion' && !loading && (
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-0">
              <Configuracion
                userInfo={userInfo}
                darkMode={isDark}
                toggleTheme={toggleTheme}
                token={token}
                showError={showError}
                showSuccess={showSuccess}
              />
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
