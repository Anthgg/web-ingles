import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  FaBook,
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaUsers,
  FaRegBell,
  FaCalendarDay,
  FaChevronRight,
  FaInfoCircle,
  FaRegClock,
  FaCalendarCheck,
  FaLayerGroup,
  FaStream,
  FaSyncAlt,
  FaBuilding,
  FaMoon,
  FaSun,
} from 'react-icons/fa';
import { Button } from 'react-bootstrap';
import axios from 'axios';

const getAsignacionUniqueKey = (asignacion) => {
  if (!asignacion) {
    return null;
  }

  const rawAsignacionId = asignacion.asignacion_id ?? asignacion.id;
  const asignacionId = rawAsignacionId != null ? Number(rawAsignacionId) : null;
  const cursoId = asignacion.curso_id != null ? Number(asignacion.curso_id) : null;
  const nombreCurso = typeof asignacion.curso_nombre === 'string'
    ? asignacion.curso_nombre.trim().toLowerCase()
    : typeof asignacion.materia_nombre === 'string'
      ? asignacion.materia_nombre.trim().toLowerCase()
      : '';
  const dia = asignacion.dia_semana != null ? String(asignacion.dia_semana).trim().toLowerCase() : '';
  const horaInicio = asignacion.hora_inicio ? asignacion.hora_inicio.toString().slice(0, 5) : '';
  const horaFin = asignacion.hora_fin ? asignacion.hora_fin.toString().slice(0, 5) : '';
  const aula = asignacion.aula ? asignacion.aula.toString().trim().toLowerCase() : '';
  const seccion = asignacion.seccion || asignacion.grupo || asignacion.seccion_nombre;
  const seccionKey = seccion != null ? String(seccion).trim().toLowerCase() : '';

  const baseParts = [];
  if (!Number.isNaN(asignacionId) && asignacionId !== null) {
    baseParts.push(`a-${asignacionId}`);
  }
  if (!Number.isNaN(cursoId) && cursoId !== null) {
    baseParts.push(`c-${cursoId}`);
  }
  if (!baseParts.length && nombreCurso) {
    baseParts.push(`n-${nombreCurso}`);
  }

  const baseKey = baseParts.join('|');
  const parts = [baseKey, dia, horaInicio, horaFin, aula, seccionKey].filter(Boolean);
  return parts.length ? parts.join('|') : null;
};

const dedupeAsignaciones = (asignaciones = []) => {
  if (!Array.isArray(asignaciones) || asignaciones.length === 0) {
    return [];
  }

  const vistos = new Set();

  return asignaciones.filter((asignacion) => {
    const key = getAsignacionUniqueKey(asignacion);
    if (!key) {
      return true;
    }

    if (vistos.has(key)) {
      return false;
    }

    vistos.add(key);
    return true;
  });
};

const MisAsignacionesDocente = ({   
  asignaciones: initialAsignaciones,
  loading: parentLoading,
  error: parentError,
  token,
  userInfo,
  showError,
  showSuccess 
}) => {
  // Referencias para evitar actualizaciones innecesarias
  const initialDataProcessed = useRef(false);
  const fetchInProgress = useRef(false);

  const [localAsignaciones, setLocalAsignaciones] = useState(initialAsignaciones || []);
  const [loading, setLoading] = useState(parentLoading);
  const [error, setError] = useState(parentError);
  const [cursosPorDia, setCursosPorDia] = useState({});
  const [horarioActivo, setHorarioActivo] = useState(true);
  const [filtroActivo, setFiltroActivo] = useState('todos');
  const [modoOscuro, setModoOscuro] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showCalendario, setShowCalendario] = useState(true);
  
  // Función para organizar cursos por día
  const organizarCursosPorDia = useCallback((asignaciones) => {
    if (!asignaciones || asignaciones.length === 0) return;
    
    const diasOrden = {
      "Lunes": 1, "Martes": 2, "Miércoles": 3, "Jueves": 4,
      "Viernes": 5, "Sábado": 6, "Domingo": 7
    };

    // Agrupar por día
    const porDia = {};
    asignaciones.forEach(asignacion => {
      const dia = asignacion.dia_semana;
      if (!porDia[dia]) {
        porDia[dia] = [];
      }
      porDia[dia].push(asignacion);
    });

    // Ordenar los cursos por hora de inicio para cada día
    Object.keys(porDia).forEach(dia => {
      porDia[dia].sort((a, b) => {
        return a.hora_inicio.localeCompare(b.hora_inicio);
      });
    });

    // Ordenar los días de la semana
    const diasOrdenados = {};
    Object.keys(porDia)
      .sort((a, b) => diasOrden[a] - diasOrden[b])
      .forEach(dia => {
        diasOrdenados[dia] = porDia[dia];
      });

    setCursosPorDia(diasOrdenados);
  }, []);

  // Cargar asignaciones
  const fetchAsignaciones = useCallback(async () => {
    if (!token || !userInfo) {
      setError("No hay información de usuario o token disponible");
      return;
    }
    
    if (fetchInProgress.current) return;
    fetchInProgress.current = true;
    
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:3007/asignaciones', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      let asignacionesData = [];
      if (response.data && response.data.data) {
        asignacionesData = response.data.data;
      } else if (Array.isArray(response.data)) {
        asignacionesData = response.data;
      }
      
  const deduplicated = dedupeAsignaciones(asignacionesData);
  setLocalAsignaciones(deduplicated);
  organizarCursosPorDia(deduplicated);
      
      if (asignacionesData.length > 0) {
        showSuccess && showSuccess('Datos de horario actualizados');
      }
    } catch (err) {
      console.error('Error al cargar asignaciones:', err);
      
      if (err.response && err.response.status === 403) {
        setError('No tienes permisos para ver estas asignaciones.');
        showError && showError('Error de permisos al acceder a tus asignaciones');
      } else {
        setError(err.response?.data?.error || 'Error al cargar las asignaciones.');
        showError && showError('Error al cargar tu horario');
      }
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
    }
  }, [token, userInfo, organizarCursosPorDia, showError, showSuccess]);

  // Efecto inicial para cargar datos
  useEffect(() => {
    if (!initialDataProcessed.current && initialAsignaciones && initialAsignaciones.length > 0) {
  const dedupedInitial = dedupeAsignaciones(initialAsignaciones);
  setLocalAsignaciones(dedupedInitial);
  organizarCursosPorDia(dedupedInitial);
      initialDataProcessed.current = true;
    } else if (!initialDataProcessed.current && token && userInfo && !fetchInProgress.current) {
      fetchAsignaciones();
      initialDataProcessed.current = true;
    }
  }, [initialAsignaciones, token, userInfo, fetchAsignaciones, organizarCursosPorDia]);

  // Obtener el color para cada día
  const getColorForDay = (day) => {
    const colors = {
      "Lunes": "#4361EE",      // Azul
      "Martes": "#3A0CA3",     // Púrpura
      "Miércoles": "#7209B7",  // Violeta
      "Jueves": "#F72585",     // Rosa
      "Viernes": "#4CC9F0",    // Celeste
      "Sábado": "#4D908E",     // Verde azulado
      "Domingo": "#F94144"     // Rojo
    };
    return colors[day] || "#4361EE"; // Azul por defecto
  };

  // Función para obtener el día actual de la semana en español
  const getDiaActual = () => {
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    return days[new Date().getDay()];
  };

  // Calcular estadísticas
  const getStats = useCallback(() => {
    if (!localAsignaciones || localAsignaciones.length === 0) {
      return { totalCursos: 0, diasUnicos: 0, horasTotales: 0 };
    }
    
    const totalCursos = localAsignaciones.length;
    const diasUnicos = new Set(localAsignaciones.map(a => a.dia_semana)).size;
    const horasTotales = localAsignaciones.reduce((total, curso) => {
      if (!curso.hora_inicio || !curso.hora_fin) return total;
      
      try {
        const [horaIni, minIni] = curso.hora_inicio.split(':').map(Number);
        const [horaFin, minFin] = curso.hora_fin.split(':').map(Number);
        const totalMinIni = horaIni * 60 + minIni;
        const totalMinFin = horaFin * 60 + minFin;
        const diffMin = totalMinFin - totalMinIni;
        return total + diffMin;
      } catch (e) {
        return total;
      }
    }, 0);
    
    return {
      totalCursos,
      diasUnicos,
      horasTotales: Math.round(horasTotales / 60)
    };
  }, [localAsignaciones]);
  
  // Filtrar asignaciones
  const asignacionesFiltradas = useCallback(() => {
    if (filtroActivo === 'todos') {
      return localAsignaciones || [];
    } else if (filtroActivo === 'hoy') {
      return (localAsignaciones || []).filter(a => a.dia_semana === getDiaActual());
    }
    return localAsignaciones || [];
  }, [localAsignaciones, filtroActivo]);

  // Calcular valores una vez por renderizado
  const stats = getStats();
  const asignacionesFiltered = asignacionesFiltradas();
  const diaActual = getDiaActual();

  const resumenRapido = useMemo(() => {
    const totalClases = stats.totalCursos || 0;
    const totalHoras = stats.horasTotales || 0;

    let totalEstudiantes = 0;
    if (Array.isArray(localAsignaciones) && localAsignaciones.length > 0) {
      totalEstudiantes = localAsignaciones.reduce((acc, asignacion) => {
        const rawValor = asignacion.total_estudiantes ?? asignacion.estudiantes_asignados ?? asignacion.estudiantes_count ?? asignacion.cantidad_estudiantes ?? asignacion.max_alumnos;
        const numeric = Number(rawValor);
        if (!Number.isNaN(numeric) && numeric > 0) {
          return acc + numeric;
        }
        return acc;
      }, 0);
    }

    return {
      totalClases,
      totalHoras,
      totalEstudiantes: totalEstudiantes > 0 ? totalEstudiantes : null,
    };
  }, [stats, localAsignaciones]);

  // Manejador para actualización manual
  const handleManualUpdate = () => {
    initialDataProcessed.current = false;
    fetchAsignaciones();
  };

  // Control del modo oscuro
  const toggleModoOscuro = () => {
    setModoOscuro(!modoOscuro);
  };

  // Ver detalles de un curso
  const handleVerDetalles = (curso) => {
    setSelectedCourse(curso);
  };

  // Cerrar detalles
  const handleCloseDetails = () => {
    setSelectedCourse(null);
  };

  // Clases CSS basadas en el modo oscuro/claro
  const themeClass = modoOscuro ? 'dark-theme' : 'light-theme';
  
  // Colores del tema
  const themeColors = {
    primary: '#6366F1',
    secondary: modoOscuro ? '#1E1B4B' : '#EEF2FF',
    accent: modoOscuro ? '#A78BFA' : '#7C3AED',
    text: modoOscuro ? '#E0E7FF' : '#1F2937',
    border: modoOscuro ? 'rgba(99, 102, 241, 0.35)' : 'rgba(99, 102, 241, 0.18)',
    cardBg: modoOscuro ? 'rgba(17, 24, 39, 0.82)' : 'rgba(255, 255, 255, 0.78)',
    cardBorder: modoOscuro ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.12)'
  };

  return (
    <div className={`schedule-container ${themeClass}`}>
      {/* Panel lateral y contenido principal */}
      <div className="schedule-layout">
        {/* Panel lateral */}
        <div className="schedule-sidebar">
          <div className="sidebar-header">
            <div className="app-logo">
              <img src="/logo.png" alt="Logo I.E Peruano Japonés 7213" style={{height: '50px', width: 'auto', marginRight: '12px'}} />
              <div className="logo-text">
                 <h1>I.E Peruano Japonés</h1>
                <span>7213</span>
              </div>
            </div>
          </div>

          <div className="sidebar-menu">
            <div className="sidebar-section">
              <span className="section-title">Vistas</span>
              <ul className="menu-list">
                <li className={`menu-item ${horarioActivo ? 'active' : ''}`} onClick={() => setHorarioActivo(true)}>
                  <div className="menu-icon"><FaCalendarCheck /></div>
                  <span>Vista Calendario</span>
                </li>
                <li className={`menu-item ${!horarioActivo ? 'active' : ''}`} onClick={() => setHorarioActivo(false)}>
                  <div className="menu-icon"><FaLayerGroup /></div>
                  <span>Vista Tarjetas</span>
                </li>
              </ul>
            </div>

            <div className="sidebar-section">
              <span className="section-title">Filtros</span>
              <ul className="menu-list">
                <li className={`menu-item ${filtroActivo === 'todos' ? 'active' : ''}`} onClick={() => setFiltroActivo('todos')}>
                  <div className="menu-icon"><FaStream /></div>
                  <span>Todos los días</span>
                </li>
                <li className={`menu-item ${filtroActivo === 'hoy' ? 'active' : ''}`} onClick={() => setFiltroActivo('hoy')}>
                  <div className="menu-icon"><FaCalendarDay /></div>
                  <span>Solo hoy</span>
                </li>
              </ul>
            </div>

            <div className="sidebar-section">
              <span className="section-title">Estadísticas</span>
              <div className="stats-container">
                <div className="stat-item">
                  <div className="stat-icon"><FaBook /></div>
                  <div className="stat-info">
                    <span className="stat-value">{stats.totalCursos}</span>
                    <span className="stat-label">Cursos</span>
                  </div>
                </div>
                
                <div className="stat-item">
                  <div className="stat-icon"><FaCalendarAlt /></div>
                  <div className="stat-info">
                    <span className="stat-value">{stats.diasUnicos}<span className="of-seven">/7</span></span>
                    <span className="stat-label">Días</span>
                  </div>
                </div>
                
                <div className="stat-item">
                  <div className="stat-icon"><FaClock /></div>
                  <div className="stat-info">
                    <span className="stat-value">{stats.horasTotales}h</span>
                    <span className="stat-label">Semanales</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="sidebar-footer">
            <button className="theme-toggle" onClick={toggleModoOscuro}>
              {modoOscuro ? <FaSun /> : <FaMoon />}
              <span>{modoOscuro ? 'Modo claro' : 'Modo oscuro'}</span>
            </button>
            
            <button className="refresh-button" onClick={handleManualUpdate} disabled={loading || fetchInProgress.current}>
              <FaSyncAlt className={loading ? 'spin' : ''} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="schedule-content">
          <div className="dashboard-hero">
            <div className="hero-background" />
            <div className="hero-content">
              <div className="content-header">
                <div className="header-title">
                  <h1>Mi Agenda Docente</h1>
                  <p>Organiza tus clases con una vista clara y moderna</p>
                </div>
                <div className="day-indicator" style={{ borderColor: getColorForDay(diaActual) }}>
                  <div className="day-icon animated" style={{ backgroundColor: getColorForDay(diaActual) }}>
                    <FaCalendarDay />
                    <span className="day-pulse" />
                  </div>
                  <div className="day-text">
                    <span className="day-label">Hoy</span>
                    <span className="day-name">{diaActual}</span>
                  </div>
                </div>
              </div>

              <div className="hero-summary">
                <div className="summary-card">
                  <div className="summary-icon primary">
                    <FaCalendarCheck />
                  </div>
                  <div className="summary-body">
                    <span className="summary-label">Clases activas</span>
                    <span className="summary-value">{resumenRapido.totalClases}</span>
                  </div>
                </div>
                <div className="summary-card">
                  <div className="summary-icon accent">
                    <FaUsers />
                  </div>
                  <div className="summary-body">
                    <span className="summary-label">Estudiantes vinculados</span>
                    <span className="summary-value">
                      {resumenRapido.totalEstudiantes != null ? resumenRapido.totalEstudiantes : '—'}
                    </span>
                  </div>
                </div>
                <div className="summary-card">
                  <div className="summary-icon neutral">
                    <FaRegClock />
                  </div>
                  <div className="summary-body">
                    <span className="summary-label">Horas semanales</span>
                    <span className="summary-value">{resumenRapido.totalHoras}h</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mensaje de carga */}
          {loading && (
            <div className="loading-container">
              <div className="loader"></div>
              <p>Cargando tu horario...</p>
            </div>
          )}

          {/* Mensaje de error */}
          {error && !loading && (
            <div className="error-message">
              <div className="error-icon">
                <FaRegBell />
              </div>
              <div className="error-content">
                <h3>No pudimos cargar tu horario</h3>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Estado vacío */}
          {!loading && !error && (!localAsignaciones || localAsignaciones.length === 0) && (
            <div className="empty-state">
              <div className="empty-icon">
                <FaBook />
              </div>
              <h3>No tienes cursos asignados</h3>
              <p>Todavía no se han registrado cursos para ti en el sistema. Cuando se te asignen cursos, aparecerán aquí.</p>
              <Button 
                className="update-button"
                onClick={handleManualUpdate} 
                disabled={loading || fetchInProgress.current}
              >
                <FaSyncAlt /> Actualizar
              </Button>
            </div>
          )}

          {/* Modal para detalles del curso */}
          {selectedCourse && (
            <div className="course-details-modal">
              <div className="modal-backdrop" onClick={handleCloseDetails}></div>
              <div className="modal-content">
                <div className="modal-header" style={{backgroundColor: getColorForDay(selectedCourse.dia_semana)}}>
                  <h3>{selectedCourse.curso_nombre}</h3>
                  <button className="close-button" onClick={handleCloseDetails}>&times;</button>
                </div>
                <div className="modal-body">
                  <div className="detail-group">
                    <div className="detail-icon">
                      <FaCalendarDay />
                    </div>
                    <div className="detail-content">
                      <span className="detail-label">Día</span>
                      <span className="detail-value">{selectedCourse.dia_semana}</span>
                    </div>
                  </div>
                  
                  <div className="detail-group">
                    <div className="detail-icon">
                      <FaClock />
                    </div>
                    <div className="detail-content">
                      <span className="detail-label">Horario</span>
                      <span className="detail-value">
                        {selectedCourse.hora_inicio?.slice(0,5) || "--:--"} - {selectedCourse.hora_fin?.slice(0,5) || "--:--"}
                      </span>
                    </div>
                  </div>
                  
                  <div className="detail-group">
                    <div className="detail-icon">
                      <FaMapMarkerAlt />
                    </div>
                    <div className="detail-content">
                      <span className="detail-label">Aula</span>
                      <span className="detail-value">{selectedCourse.aula || "No asignada"}</span>
                    </div>
                  </div>
                  
                  <div className="detail-group">
                    <div className="detail-icon">
                      <FaUsers />
                    </div>
                    <div className="detail-content">
                      <span className="detail-label">Capacidad</span>
                      <span className="detail-value">{selectedCourse.max_alumnos || "N/A"} estudiantes</span>
                    </div>
                  </div>
                  
                  <div className="detail-group">
                    <div className="detail-icon">
                      <FaCalendarAlt />
                    </div>
                    <div className="detail-content">
                      <span className="detail-label">Período</span>
                      <span className="detail-value">
                        {new Date(selectedCourse.fecha_inicio).toLocaleDateString()} - 
                        {new Date(selectedCourse.fecha_fin).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  {selectedCourse.notas && (
                    <div className="notes-section">
                      <div className="note-header">
                        <FaInfoCircle />
                        <span>Notas</span>
                      </div>
                      <p>{selectedCourse.notas}</p>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <Button onClick={handleCloseDetails}>Cerrar</Button>
                </div>
              </div>
            </div>
          )}

          {/* Vista de calendario */}
          {horarioActivo && !loading && !error && localAsignaciones.length > 0 && (
            <div className="calendar-view">
              <div className="calendar-header">
                <div className="view-toggle" role="group" aria-label="Cambiar vista agenda">
                  <span className={`toggle-label ${showCalendario ? 'active' : ''}`}>Agenda</span>
                  <button
                    type="button"
                    className={`toggle-switch ${showCalendario ? 'agenda' : 'compacta'}`}
                    onClick={() => setShowCalendario(!showCalendario)}
                    aria-pressed={showCalendario}
                  >
                    <span className="toggle-thumb" />
                  </button>
                  <span className={`toggle-label ${!showCalendario ? 'active' : ''}`}>Compacta</span>
                </div>
              </div>
              
              {showCalendario ? (
                <div className="calendar-grid">
                  {Object.keys(cursosPorDia).map(dia => (
                    <div className="calendar-day" key={dia}>
                      <div className="day-header" style={{backgroundColor: getColorForDay(dia)}}>
                        <h3>{dia}</h3>
                        <span className="class-count">{cursosPorDia[dia].length} clases</span>
                      </div>
                      
                      <div className="day-classes">
                        {cursosPorDia[dia].map((asignacion, index) => (
                          <div 
                            className="class-block" 
                            key={`${asignacion.id || index}-${dia}`}
                            onClick={() => handleVerDetalles(asignacion)}
                            style={{
                              borderLeft: `4px solid ${getColorForDay(dia)}`,
                              backgroundColor: `${getColorForDay(dia)}10`
                            }}
                          >
                            <div className="class-time">
                              <FaRegClock />
                              <span>{asignacion.hora_inicio?.slice(0,5) || "--:--"} - {asignacion.hora_fin?.slice(0,5) || "--:--"}</span>
                            </div>
                            
                            <div className="class-title">
                              <h4>{asignacion.curso_nombre || "Curso sin nombre"}</h4>
                            </div>
                            
                            <div className="class-details">
                              <div className="detail">
                                <FaBuilding />
                                <span>{asignacion.aula || "Sin aula"}</span>
                              </div>
                              
                              <div className="detail">
                                <FaUsers />
                                <span>{asignacion.max_alumnos || "-"} alumnos</span>
                              </div>
                            </div>
                            
                            <button className="view-details">
                              <span>Ver detalles</span>
                              <FaChevronRight />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="compact-view">
                  <div className="time-column">
                    <div className="time-header">Hora</div>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div className="time-slot" key={`time-${i+8}`}>
                        {`${i+8}:00`}
                      </div>
                    ))}
                  </div>
                  
                  {Object.keys(cursosPorDia).map(dia => (
                    <div className="day-column" key={dia}>
                      <div className="day-header" style={{backgroundColor: getColorForDay(dia)}}>{dia}</div>
                      <div className="day-slots">
                        {Array.from({ length: 12 }).map((_, i) => {
                          const hour = i + 8;
                          const classesInHour = cursosPorDia[dia].filter(c => {
                            const startHour = parseInt(c.hora_inicio?.split(':')[0] || 0);
                            return startHour === hour;
                          });
                          
                          return (
                            <div className="time-slot" key={`${dia}-${hour}`}>
                              {classesInHour.map((c, idx) => (
                                <div 
                                  className="compact-class" 
                                  key={`class-${dia}-${hour}-${idx}`}
                                  style={{backgroundColor: `${getColorForDay(dia)}50`}}
                                  onClick={() => handleVerDetalles(c)}
                                >
                                  <span className="compact-time">
                                    {c.hora_inicio?.slice(0,5)} - {c.hora_fin?.slice(0,5)}
                                  </span>
                                  <span className="compact-title">{c.curso_nombre}</span>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Vista de tarjetas */}
          {!horarioActivo && !loading && !error && asignacionesFiltered.length > 0 && (
            <div className="cards-view">
              {asignacionesFiltered.map((asignacion, idx) => (
                <div 
                  className="course-card" 
                  key={`${asignacion.id || idx}-${asignacion.dia_semana || 'sin-dia'}`}
                  onClick={() => handleVerDetalles(asignacion)}
                >
                  <div className="card-header" style={{backgroundColor: getColorForDay(asignacion.dia_semana)}}>
                    <div className="day-badge">
                      <FaCalendarDay />
                      <span>{asignacion.dia_semana}</span>
                    </div>
                    <div className="time-badge">
                      <FaClock />
                      <span>{asignacion.hora_inicio?.slice(0,5)} - {asignacion.hora_fin?.slice(0,5)}</span>
                    </div>
                  </div>
                  
                  <div className="card-body">
                    <h3 className="course-title">{asignacion.curso_nombre}</h3>
                    
                    <div className="card-details">
                      <div className="detail">
                        <FaMapMarkerAlt />
                        <span>{asignacion.aula || "Sin aula"}</span>
                      </div>
                      
                      <div className="detail">
                        <FaCalendarAlt />
                        <span>
                          {new Date(asignacion.fecha_inicio).toLocaleDateString()} - 
                          {new Date(asignacion.fecha_fin).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="detail">
                        <FaUsers />
                        <span>{asignacion.max_alumnos || "-"} estudiantes</span>
                      </div>
                    </div>
                    
                    {asignacion.notas && (
                      <div className="card-notes">
                        <FaInfoCircle />
                        <p>{asignacion.notas}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="card-footer">
                    <button className="details-button">
                      <span>Ver detalles</span>
                      <FaChevronRight />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Estilos CSS integrados */}
  <style>{`
        /* Estilos base */
        :root {
          --primary-color: ${themeColors.primary};
          --secondary-color: ${themeColors.secondary};
          --accent-color: ${themeColors.accent};
          --text-color: ${themeColors.text};
          --border-color: ${themeColors.border};
          --card-bg: ${themeColors.cardBg};
          --card-border: ${themeColors.cardBorder};
          --shadow-sm: 0 4px 12px rgba(99, 102, 241, 0.08);
          --shadow-md: 0 16px 30px rgba(99, 102, 241, 0.12);
          --shadow-lg: 0 28px 55px rgba(79, 70, 229, 0.18);
          --radius-sm: 10px;
          --radius-md: 16px;
          --radius-lg: 22px;
          --transition: all 0.25s ease;
          --sidebar-width: 280px;
          --gradient-start: rgba(99, 102, 241, 0.12);
          --gradient-end: rgba(244, 244, 255, 0.92);
          --bg-gradient: linear-gradient(140deg, var(--gradient-start) 0%, var(--gradient-end) 100%);
        }
        
        .dark-theme {
          --bg-color: rgba(15, 23, 42, 0.94);
          --bg-secondary: rgba(30, 32, 60, 0.82);
          --text-color: #E0E7FF;
          --text-secondary: rgba(203, 213, 225, 0.76);
          --border-color: rgba(99, 102, 241, 0.32);
          --bg-gradient: linear-gradient(160deg, rgba(17, 24, 39, 0.96) 0%, rgba(79, 70, 229, 0.55) 100%);
        }
        
        .light-theme {
          --bg-color: rgba(255, 255, 255, 0.85);
          --bg-secondary: rgba(255, 255, 255, 0.72);
          --text-color: #1F2937;
          --text-secondary: rgba(71, 85, 105, 0.7);
          --border-color: rgba(99, 102, 241, 0.16);
          --bg-gradient: linear-gradient(145deg, rgba(238, 242, 255, 0.9) 0%, rgba(250, 250, 255, 0.68) 100%);
        }
        
        .schedule-container {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: var(--text-color);
          background: transparent;
          min-height: 100vh;
          padding: 1.5rem;
          position: relative;
        }

        /* Layout */
        .schedule-layout {
          display: flex;
          min-height: calc(100vh - 6rem);
          background: rgba(255, 255, 255, 0.94);
          border-radius: var(--radius-lg);
          box-shadow: 0 14px 38px rgba(15, 23, 42, 0.1);
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.2);
          width: 100%;
        }

        /* Sidebar */
        .schedule-sidebar {
          width: var(--sidebar-width);
          background: rgba(248, 249, 255, 0.9);
          border-right: 1px solid rgba(148, 163, 184, 0.2);
          display: flex;
          flex-direction: column;
          max-height: inherit;
          overflow-y: auto;
          padding-bottom: 2rem;
          box-shadow: inset -1px 0 0 rgba(99, 102, 241, 0.04);
        }

        .sidebar-header {
          padding: 1.5rem;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
        }
        
        .logo-icon {
          width: 40px;
          height: 40px;
          background-color: var(--primary-color);
          color: white;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;
        }
        
        .logo-text h1 {
          font-size: 1.2rem;
          font-weight: 600;
          margin: 0;
          line-height: 1.2;
        }
        
        .logo-text span {
          font-size: 0.8rem;
          opacity: 0.8;
        }
        
        .sidebar-menu {
          flex: 1;
          padding: 1.5rem;
        }
        
        .sidebar-section {
          margin-bottom: 2rem;
        }
        
        .section-title {
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          opacity: 0.6;
          margin-bottom: 0.75rem;
          display: block;
        }
        
        .menu-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .menu-item {
          display: flex;
          align-items: center;
          padding: 0.75rem;
          margin-bottom: 0.5rem;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: var(--transition);
          border: 1px solid transparent;
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(10px);
        }
        
        .menu-item:hover {
          background: rgba(99, 102, 241, 0.14);
          border-color: rgba(99, 102, 241, 0.2);
        }
        
        .menu-item.active {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.28), rgba(129, 140, 248, 0.28));
          font-weight: 600;
          color: white;
          border-color: rgba(99, 102, 241, 0.35);
          box-shadow: var(--shadow-sm);
        }
        
        .menu-icon {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;
        }
        
        .stats-container {
          background: rgba(255, 255, 255, 0.14);
          border-radius: var(--radius-lg);
          padding: 1rem;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
          border: 1px solid rgba(255, 255, 255, 0.16);
          backdrop-filter: blur(16px);
        }
        
        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 0.75rem 0.5rem;
          border-radius: var(--radius-sm);
          transition: var(--transition);
        }
        
        .stat-item:hover {
          background: rgba(99, 102, 241, 0.16);
          color: white;
        }
        
        .stat-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.6), rgba(129, 140, 248, 0.6));
          color: white;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.5rem;
        }
        
        .stat-info {
          text-align: center;
        }
        
        .stat-value {
          font-size: 1.25rem;
          font-weight: 600;
          display: block;
          line-height: 1;
          margin-bottom: 0.25rem;
        }
        
        .of-seven {
          font-size: 0.8rem;
          opacity: 0.7;
          font-weight: normal;
        }
        
        .stat-label {
          font-size: 0.75rem;
          opacity: 0.8;
        }
        
        .sidebar-footer {
          padding: 1.5rem;
          border-top: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .theme-toggle, .refresh-button {
          display: flex;
          align-items: center;
          padding: 0.85rem 1.1rem;
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.16);
          color: var(--text-color);
          cursor: pointer;
          transition: var(--transition);
          backdrop-filter: blur(14px);
        }
        
        .theme-toggle:hover, .refresh-button:hover {
          background: rgba(99, 102, 241, 0.18);
          color: white;
        }
        
        .theme-toggle svg, .refresh-button svg {
          margin-right: 0.75rem;
        }
        
        .refresh-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .spin {
          animation: spin 1s infinite linear;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        /* Content */
        .schedule-content {
          flex: 1;
          padding: 2rem;
          background: transparent;
          overflow-y: auto;
        }
        
        .dashboard-hero {
          position: relative;
          border-radius: var(--radius-lg);
          overflow: hidden;
          padding: 2.1rem;
          margin-bottom: 2.5rem;
          background: linear-gradient(125deg, rgba(99, 102, 241, 0.14), rgba(236, 233, 254, 0.55));
          box-shadow: 0 18px 36px rgba(99, 102, 241, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.38);
        }

        .hero-background {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.55), rgba(99, 102, 241, 0.18));
          backdrop-filter: blur(22px);
          opacity: 0.9;
        }

        .hero-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }

        .content-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-title h1 {
          font-size: 2rem;
          font-weight: 700;
          margin: 0 0 0.75rem 0;
          letter-spacing: -0.02em;
        }

        .header-title p {
          margin: 0;
          opacity: 0.8;
          font-size: 0.95rem;
        }

        .day-indicator {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1.25rem;
          border: 1px solid currentColor;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.18);
          color: var(--text-color);
          box-shadow: var(--shadow-sm);
        }

        .day-text {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
        }

        .day-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          opacity: 0.7;
        }

        .day-name {
          font-weight: 600;
          font-size: 1.1rem;
          letter-spacing: 0.03em;
        }

        .day-icon {
          position: relative;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 12px 24px rgba(99, 102, 241, 0.25);
        }

        .day-icon.animated {
          animation: float 3s ease-in-out infinite;
        }

        .day-pulse {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.35);
          animation: pulse 1.8s ease-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        @keyframes pulse {
          0% { transform: scale(0.85); opacity: 0.75; }
          70% { transform: scale(1.1); opacity: 0; }
          100% { opacity: 0; }
        }

        .hero-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
        }

        .summary-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.22);
          box-shadow: var(--shadow-sm);
          backdrop-filter: blur(22px);
          border: 1px solid rgba(255, 255, 255, 0.24);
        }

        .summary-icon {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .summary-icon.primary {
          background: linear-gradient(135deg, #6366F1, #818CF8);
        }

        .summary-icon.accent {
          background: linear-gradient(135deg, #8B5CF6, #C084FC);
        }

        .summary-icon.neutral {
          background: linear-gradient(135deg, #1E40AF, #4F46E5);
        }

        .summary-body {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .summary-label {
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          opacity: 0.7;
        }

        .summary-value {
          font-size: 1.4rem;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        
        /* Estado de carga */
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 400px;
          color: var(--text-secondary);
        }
        
        .loader {
          width: 48px;
          height: 48px;
          border: 4px solid rgba(99, 102, 241, 0.2);
          border-top-color: var(--primary-color);
          border-radius: 50%;
          animation: spin 1s infinite linear;
          margin-bottom: 1rem;
        }
        
        /* Mensaje de error */
        .error-message {
          background-color: #fee2e2;
          border: 1px solid #fecaca;
          border-radius: var(--radius-md);
          padding: 1.5rem;
          display: flex;
          align-items: flex-start;
          margin-bottom: 2rem;
        }
        
        .error-icon {
          background-color: #fef2f2;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ef4444;
          margin-right: 1rem;
          flex-shrink: 0;
        }
        
        .error-content h3 {
          margin-top: 0;
          margin-bottom: 0.5rem;
          color: #b91c1c;
          font-size: 1rem;
        }
        
        .error-content p {
          margin: 0;
          color: #991b1b;
        }
        
        /* Estado vacío */
        .empty-state {
          background-color: var(--bg-secondary);
          border-radius: var(--radius-lg);
          padding: 3rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 500px;
          margin: 0 auto;
        }
        
        .empty-icon {
          width: 80px;
          height: 80px;
          background-color: rgba(99, 102, 241, 0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary-color);
          font-size: 2rem;
          margin-bottom: 1.5rem;
        }
        
        .empty-state h3 {
          margin: 0 0 1rem 0;
          font-size: 1.25rem;
        }
        
        .empty-state p {
          margin: 0 0 1.5rem 0;
          color: var(--text-secondary);
        }
        
        .update-button {
          background-color: var(--primary-color);
          border: none;
          color: white;
          padding: 0.75rem 2rem;
          border-radius: var(--radius-md);
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        /* Vista de calendario */
        .calendar-view {
          margin-bottom: 2rem;
        }
        
        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .view-toggle {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.35rem 0.6rem;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.28);
          box-shadow: var(--shadow-sm);
          backdrop-filter: blur(14px);
        }

        .toggle-label {
          font-size: 0.85rem;
          opacity: 0.6;
          transition: var(--transition);
        }

        .toggle-label.active {
          opacity: 1;
          font-weight: 600;
          color: var(--primary-color);
        }

        .toggle-switch {
          position: relative;
          width: 54px;
          height: 28px;
          background: rgba(99, 102, 241, 0.25);
          border-radius: 999px;
          border: none;
          padding: 0;
          cursor: pointer;
          transition: var(--transition);
          box-shadow: inset 0 4px 12px rgba(79, 70, 229, 0.18);
        }

        .toggle-switch.agenda {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.5), rgba(129, 140, 248, 0.65));
        }

        .toggle-thumb {
          position: absolute;
          top: 3px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: white;
          transition: var(--transition);
          box-shadow: 0 8px 16px rgba(99, 102, 241, 0.28);
        }

        .toggle-switch.agenda .toggle-thumb {
          left: 4px;
        }

        .toggle-switch.compacta .toggle-thumb {
          left: 28px;
        }
        
        /* Calendario normal */
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        
        .calendar-day {
          background: rgba(255, 255, 255, 0.25);
          border-radius: var(--radius-md);
          overflow: hidden;
          box-shadow: var(--shadow-sm);
          height: fit-content;
          backdrop-filter: blur(18px);
          border: 1px solid rgba(255, 255, 255, 0.24);
        }
        
        .day-header {
          padding: 1rem;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .day-header h3 {
          margin: 0;
          font-size: 1.1rem;
        }
        
        .class-count {
          background-color: rgba(255, 255, 255, 0.2);
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.8rem;
        }
        
        .day-classes {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .class-block {
          padding: 1.1rem;
          background: rgba(255, 255, 255, 0.32);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-sm);
          cursor: pointer;
          transition: var(--transition);
          border: 1px solid rgba(255, 255, 255, 0.28);
          backdrop-filter: blur(16px);
        }
        
        .class-block:hover {
          transform: translateY(-6px) scale(1.01);
          box-shadow: var(--shadow-md);
          background: rgba(255, 255, 255, 0.45);
        }
        
        .class-time {
          display: flex;
          align-items: center;
          color: var(--primary-color);
          font-weight: 500;
          margin-bottom: 0.5rem;
        }
        
        .class-time svg {
          margin-right: 0.5rem;
        }
        
        .class-title {
          margin-bottom: 1rem;
        }
        
        .class-title h4 {
          margin: 0;
          font-size: 1.1rem;
          line-height: 1.3;
        }
        
        .class-details {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1rem;
          font-size: 0.85rem;
        }
        
        .detail {
          display: flex;
          align-items: center;
          color: var(--text-secondary);
        }
        
        .detail svg {
          margin-right: 0.5rem;
        }
        
        .view-details {
          background: rgba(99, 102, 241, 0.12);
          border: 1px solid rgba(99, 102, 241, 0.22);
          color: var(--primary-color);
          font-weight: 600;
          padding: 0.35rem 0.85rem;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          border-radius: 999px;
          backdrop-filter: blur(12px);
          transition: var(--transition);
        }

        .view-details:hover {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(129, 140, 248, 0.25));
          color: white;
        }

        .view-details svg {
          margin-left: 0.25rem;
          font-size: 0.9rem;
        }
        
        /* Vista compacta */
        .compact-view {
          display: flex;
          overflow-x: auto;
          background: rgba(255, 255, 255, 0.24);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-sm);
          backdrop-filter: blur(18px);
          border: 1px solid rgba(255, 255, 255, 0.22);
        }
        
        .time-column, .day-column {
          min-width: 120px;
          border-right: 1px solid var(--border-color);
        }
        
        .time-column {
          min-width: 80px;
        }
        
        .time-header, .day-header {
          padding: 0.75rem;
          text-align: center;
          font-weight: 600;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .day-header {
          color: white;
        }
        
        .time-slot {
          height: 60px;
          padding: 0.25rem;
          border-top: 1px solid var(--border-color);
          font-size: 0.8rem;
        }
        
        .time-column .time-slot {
          padding: 0.25rem 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
        }
        
        .compact-class {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.85), rgba(129, 140, 248, 0.85));
          color: white;
          border-radius: var(--radius-sm);
          padding: 0.35rem 0.6rem;
          font-size: 0.75rem;
          cursor: pointer;
          height: 100%;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: center;
          transition: var(--transition);
        }

        .compact-class:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-sm);
        }
        
        .compact-time {
          font-weight: 600;
          display: block;
          margin-bottom: 0.15rem;
        }
        
        .compact-title {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        /* Vista de tarjetas */
        .cards-view {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        
        .course-card {
          background-color: var(--bg-secondary);
          border-radius: var(--radius-md);
          overflow: hidden;
          box-shadow: var(--shadow-sm);
          cursor: pointer;
          transition: var(--transition);
        }
        
        .course-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-lg);
        }
        
        .card-header {
          padding: 1rem;
          color: white;
          display: flex;
          justify-content: space-between;
        }
        
        .day-badge, .time-badge {
          display: flex;
          align-items: center;
          background-color: rgba(255, 255, 255, 0.2);
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.8rem;
        }
        
        .day-badge svg, .time-badge svg {
          margin-right: 0.5rem;
        }
        
        .card-body {
          padding: 1rem;
        }
        
        .course-title {
          font-size: 1.25rem;
          margin: 0 0 1rem 0;
        }
        
        .card-details {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        
        .card-notes {
          background-color: rgba(99, 102, 241, 0.1);
          border-left: 3px solid var(--primary-color);
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: flex-start;
          margin-top: 1rem;
        }
        
        .card-notes svg {
          margin-right: 0.5rem;
          margin-top: 0.25rem;
          color: var(--primary-color);
          flex-shrink: 0;
        }
        
        .card-notes p {
          margin: 0;
          font-size: 0.85rem;
        }
        
        .card-footer {
          padding: 1rem;
          border-top: 1px solid var(--border-color);
        }
        
        .details-button {
          width: 100%;
          background-color: var(--primary-color);
          color: white;
          border: none;
          padding: 0.75rem;
          border-top: 1px solid rgba(255, 255, 255, 0.22);
          font-weight: 500;
          display: flex;
          align-items: center;
          width: 100%;
          background: rgba(255, 255, 255, 0.12);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.25);
          padding: 0.85rem;
          border-radius: var(--radius-md);
          font-weight: 600;
          letter-spacing: 0.01em;
          transition: var(--transition);
          backdrop-filter: blur(12px);
        
        /* Modal de detalles */
        .course-details-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .modal-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(5px);
        }
        
        .modal-content {
          position: relative;
          background-color: var(--bg-secondary);
          border-radius: var(--radius-lg);
          width: 90%;
          max-width: 500px;
          overflow: hidden;
          box-shadow: var(--shadow-lg);
          max-height: 90vh;
          display: flex;
          flex-direction: column;
        }
        
        .modal-header {
          padding: 1.5rem;
          color: white;
          position: relative;
        }
        
        .modal-header h3 {
          margin: 0;
          padding-right: 2rem;
        }
        
        .close-button {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background-color: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          font-size: 1.5rem;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .modal-body {
          padding: 1.5rem;
          overflow-y: auto;
          flex: 1;
        }
        
        .detail-group {
          display: flex;
          align-items: flex-start;
          margin-bottom: 1.25rem;
        }
        
        .detail-icon {
          width: 36px;
          height: 36px;
          background-color: rgba(99, 102, 241, 0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary-color);
          margin-right: 1rem;
          flex-shrink: 0;
        }
        .details-button:hover {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.35), rgba(129, 140, 248, 0.35));
          transform: translateY(-2px);
        }
        
        .detail-label {
          display: block;
          font-size: 0.85rem;
          margin-bottom: 0.25rem;
          color: var(--text-secondary);
        }
        
        .detail-value {
          font-weight: 500;
        }
        
        .notes-section {
          margin-top: 1.5rem;
          background-color: rgba(99, 102, 241, 0.08);
          padding: 1rem;
          border-radius: var(--radius-sm);
        }
        
        .note-header {
          display: flex;
          align-items: center;
          color: var(--primary-color);
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        
        .note-header svg {
          margin-right: 0.5rem;
        }
        
        .notes-section p {
          margin: 0;
          font-size: 0.9rem;
        }
        
        .modal-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: flex-end;
        }
        
        /* Media queries */
        @media (max-width: 1024px) {
          .schedule-container {
            padding: 1.5rem;
          }

          .schedule-layout {
            flex-direction: column;
            min-height: auto;
          }
          
          .schedule-sidebar {
            width: 100%;
            height: auto;
            position: relative;
            border-right: none;
            border-bottom: 1px solid var(--border-color);
          }
          
          .sidebar-menu {
            padding: 1rem;
          }
          
          .stats-container {
            grid-template-columns: repeat(3, 1fr);
          }

          .dashboard-hero {
            padding: 1.75rem;
          }
        }
        
        @media (max-width: 768px) {
          .schedule-container {
            padding: 1rem;
          }

          .dashboard-hero {
            padding: 1.5rem;
          }

          .hero-summary {
            grid-template-columns: 1fr;
          }

          .content-header {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .day-indicator {
            align-items: flex-start;
            margin-top: 1rem;
          }

          .view-toggle {
            margin-top: 1rem;
          }
          
          .calendar-grid {
            grid-template-columns: 1fr;
          }
          
          .cards-view {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default MisAsignacionesDocente;