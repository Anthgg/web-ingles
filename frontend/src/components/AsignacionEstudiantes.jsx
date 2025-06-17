import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaUserPlus, FaUserGraduate, FaSave, FaTimes, FaUsers, FaChalkboardTeacher, FaCalendarAlt, FaClock, FaSearch, FaFilter, FaStar, FaGraduationCap, FaBookOpen } from 'react-icons/fa';

const AsignacionEstudiantes = ({ usuarios, profesores, token, showError, showSuccess }) => {
  // Estados
  const [estudiantes, setEstudiantes] = useState([]);
  const [cursosProfesores, setCursosProfesores] = useState([]);
  const [capacidadCursos, setCapacidadCursos] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [formData, setFormData] = useState({
    estudianteId: '',
    profesorId: '',
    asignacionId: ''
  });
  const [showForm, setShowForm] = useState(false);
  const [cursoSeleccionado, setCursoSeleccionado] = useState(null);
  const [animacionActiva, setAnimacionActiva] = useState(false);

  // Obtener estudiantes del listado de usuarios
  useEffect(() => {
    if (usuarios && Array.isArray(usuarios)) {
      const estudiantesFiltrados = usuarios.filter(u => u.rol === 'estudiante');
      setEstudiantes(estudiantesFiltrados);
    }
  }, [usuarios]);

  // Efecto para la animación
  useEffect(() => {
    setAnimacionActiva(true);
    const timer = setTimeout(() => {
      setAnimacionActiva(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  // Cargar cursos con profesores
  const fetchCursosProfesores = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3007'}/cursos-con-profesor`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setCursosProfesores(response.data);
    } catch (error) {
      console.error('Error cargando cursos con profesores:', error);
      showError('Error al cargar los cursos disponibles');
    }
  };

  useEffect(() => {
    fetchCursosProfesores();
  }, [token]);

  // Manejar cambios en el formulario
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Manejar la creación de una nueva asignación
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const cursoSeleccionado = cursosProfesores.find(cp => cp.id.toString() === formData.asignacionId);
    const capacidadActual = capacidadCursos[formData.asignacionId] || 0;
    
    if (cursoSeleccionado && capacidadActual >= cursoSeleccionado.max_alumnos) {
      showError('Este curso ya ha alcanzado su capacidad máxima de alumnos');
      setLoading(false);
      return;
    }
    
    try {
      const estudianteSeleccionado = estudiantes.find(
        e => String(e._id) === String(formData.estudianteId)
      );
      
      const cursoSeleccionado = cursosProfesores.find(cp => cp.id.toString() === formData.asignacionId);

      const payload = {
        estudianteNombre: formData.estudianteId,
        profesorNombre: cursoSeleccionado ? cursoSeleccionado.profesor : 'Profesor no encontrado',
        cursoNombre: cursoSeleccionado ? cursoSeleccionado.nombre : 'Curso no encontrado',
        capacidad: cursoSeleccionado ? cursoSeleccionado.max_alumnos : 30,
        hora_inicio: cursoSeleccionado ? cursoSeleccionado.hora_inicio : '08:00',
        hora_fin: cursoSeleccionado ? cursoSeleccionado.hora_fin : '09:00',
        fecha_inicio: cursoSeleccionado ? cursoSeleccionado.fecha_inicio : '2023-06-01',
        aula: 'Aula 101',
      };

      await axios.post(
        'http://localhost:3009/api/asignaciones-curso',
        payload
      );

      showSuccess('Estudiante asignado correctamente');

      setCapacidadCursos((prevCapacidad) => ({
        ...prevCapacidad,
        [formData.asignacionId]: (prevCapacidad[formData.asignacionId] || 0) + 1
      }));

      setFormData({ estudianteId: '', profesorId: '', asignacionId: '' });
      setShowForm(false);
      setAnimacionActiva(true);
      setTimeout(() => setAnimacionActiva(false), 3000);
    } catch (error) {
      showError(error.response?.data?.message || 'Error al asignar estudiante');
      console.error('Error en asignación:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mostrar detalles de un curso específico
  const verDetallesCurso = (curso) => {
    setCursoSeleccionado(curso);
  };

  // Filtrar cursos
  const filteredCursos = cursosProfesores.filter(curso => {
    const matchesSearch = curso.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         curso.profesor.toLowerCase().includes(searchTerm.toLowerCase());
    
    const capacidadActual = capacidadCursos[curso.id] || 0;
    const porcentaje = (capacidadActual / curso.max_alumnos) * 100;
    
    if (filterStatus === 'disponible') return porcentaje < 100 && matchesSearch;
    if (filterStatus === 'lleno') return porcentaje >= 100 && matchesSearch;
    if (filterStatus === 'casi-lleno') return porcentaje >= 80 && porcentaje < 100 && matchesSearch;
    
    return matchesSearch;
  });

  return (
    <>
      <style jsx>{`
        .modern-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .glass-morphism {
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.18);
        }
        
        .neo-card {
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 20px 20px 60px #d9d9d9, -20px -20px 60px #ffffff;
          border: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .neo-card:hover {
          transform: translateY(-10px);
          box-shadow: 30px 30px 80px #d9d9d9, -30px -30px 80px #ffffff;
        }
        
        .floating-header {
          position: sticky;
          top: 20px;
          z-index: 1000;
          backdrop-filter: blur(20px);
          background: rgba(255, 255, 255, 0.9);
          border-radius: 25px;
          padding: 20px 30px;
          margin-bottom: 30px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        
        .search-container {
          position: relative;
          overflow: hidden;
        }
        
        .search-input {
          border: none;
          background: rgba(103, 126, 234, 0.1);
          border-radius: 25px;
          padding: 15px 50px 15px 20px;
          transition: all 0.3s ease;
          width: 100%;
        }
        
        .search-input:focus {
          background: rgba(103, 126, 234, 0.2);
          box-shadow: 0 0 0 3px rgba(103, 126, 234, 0.2);
          outline: none;
        }
        
        .search-icon {
          position: absolute;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          color: #667eea;
        }
        
        .filter-btn {
          border: 2px solid #667eea;
          background: transparent;
          color: #667eea;
          border-radius: 25px;
          padding: 10px 20px;
          margin: 0 5px;
          transition: all 0.3s ease;
          font-weight: 500;
        }
        
        .filter-btn.active, .filter-btn:hover {
          background: #667eea;
          color: white;
          transform: translateY(-2px);
        }
        
        .course-card {
          background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
          border-radius: 20px;
          padding: 25px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid rgba(103, 126, 234, 0.1);
          position: relative;
          overflow: hidden;
        }
        
        .course-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #667eea, #764ba2);
        }
        
        .course-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 20px 60px rgba(102, 126, 234, 0.2);
        }
        
        .capacity-ring {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: white;
        }
        
        .progress-ring {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: conic-gradient(from 0deg, #667eea 0%, #764ba2 var(--progress, 0%), #e9ecef var(--progress, 0%));
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        
        .progress-ring::before {
          content: '';
          width: 45px;
          height: 45px;
          border-radius: 50%;
          background: white;
          position: absolute;
        }
        
        .progress-text {
          position: relative;
          z-index: 1;
          font-size: 12px;
          font-weight: bold;
          color: #667eea;
        }
        
        .modern-form {
          background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
          border-radius: 25px;
          padding: 30px;
          box-shadow: 0 15px 50px rgba(0,0,0,0.1);
        }
        
        .floating-label {
          position: relative;
          margin-bottom: 25px;
        }
        
        .floating-input {
          width: 100%;
          padding: 15px 20px;
          border: 2px solid #e9ecef;
          border-radius: 15px;
          background: white;
          transition: all 0.3s ease;
          font-size: 16px;
        }
        
        .floating-input:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(103, 126, 234, 0.1);
          outline: none;
        }
        
        .floating-input:focus + .label-text,
        .floating-input:not(:placeholder-shown) + .label-text {
          transform: translateY(-28px) scale(0.8);
          color: #667eea;
        }
        
        .label-text {
          position: absolute;
          left: 20px;
          top: 15px;
          background: white;
          padding: 0 10px;
          color: #6c757d;
          transition: all 0.3s ease;
          pointer-events: none;
        }
        
        .modern-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 15px;
          padding: 15px 30px;
          color: white;
          font-weight: 600;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .modern-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
        }
        
        .modern-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s;
        }
        
        .modern-btn:hover::before {
          left: 100%;
        }
        
        .stats-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 20px;
          padding: 25px;
          color: white;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        
        .stats-card::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
        }
        
        .modal-modern {
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(10px);
        }
        
        .modal-content-modern {
          background: white;
          border-radius: 25px;
          border: none;
          overflow: hidden;
          box-shadow: 0 25px 80px rgba(0,0,0,0.3);
        }
        
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-slide-up {
          animation: slideInUp 0.6s ease-out forwards;
        }
        
        .animate-fade-scale {
          animation: fadeInScale 0.5s ease-out forwards;
        }
      `}</style>

      <div className="min-vh-100" style={{background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'}}>
        {/* Header flotante moderno */}
        <div className="container-fluid px-4 pt-4">
          <div className="floating-header animate-fade-scale">
            <div className="d-flex justify-content-between align-items-center flex-wrap">
              <div className="d-flex align-items-center mb-3 mb-md-0">
                <div className="me-3">
                  <div className="bg-primary bg-opacity-10 rounded-circle p-3 d-inline-flex">
                    <FaGraduationCap className="text-primary" size={24} />
                  </div>
                </div>
                <div>
                  <h1 className="h3 fw-bold mb-1" style={{color: '#2d3748'}}>Asignación de Estudiantes</h1>
                  <p className="text-muted mb-0">Gestiona las asignaciones de manera inteligente</p>
                </div>
              </div>
              
              <div className="d-flex gap-3">
                <button 
                  className={`modern-btn ${showForm ? 'btn-outline-secondary' : ''}`}
                  onClick={() => setShowForm(!showForm)}
                  style={showForm ? {background: '#6c757d', transform: 'none'} : {}}
                >
                  {showForm ? <><FaTimes className="me-2" /> Cancelar</> : <><FaUserPlus className="me-2" /> Nueva Asignación</>}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container-fluid px-4">
          <div className="row g-4">
            {/* Panel principal */}
            <div className="col-lg-8">
              {/* Formulario moderno */}
              {showForm && (
                <div className="animate-slide-up mb-4">
                  <div className="modern-form">
                    <div className="d-flex align-items-center mb-4">
                      <FaBookOpen className="text-primary me-3" size={20} />
                      <h5 className="mb-0 fw-bold">Nueva Asignación</h5>
                    </div>
                    
                    <form onSubmit={handleSubmit}>
                      <div className="row g-4">
                        <div className="col-md-6">
                          <div className="floating-label">
                            <select
                              id="estudianteId"
                              name="estudianteId"
                              className="floating-input"
                              value={formData.estudianteId}
                              onChange={handleChange}
                              required
                              placeholder=" "
                            >
                              <option value="">Seleccionar estudiante...</option>
                              {estudiantes.map(estudiante => (
                                <option key={estudiante._id} value={estudiante.nombre}>
                                  {estudiante.nombre}
                                </option>
                              ))}
                            </select>
                            <label className="label-text">
                              <FaUserGraduate className="me-2" />
                              Estudiante
                            </label>
                          </div>
                        </div>
                        
                        <div className="col-md-6">
                          <div className="floating-label">
                            <select
                              id="asignacionId"
                              name="asignacionId"
                              className="floating-input"
                              value={formData.asignacionId}
                              onChange={(e) => {
                                const selectedCursoProfesor = cursosProfesores.find(cp => cp.id.toString() === e.target.value);
                                setFormData({
                                  ...formData,
                                  asignacionId: e.target.value,
                                  profesorId: selectedCursoProfesor ? profesores.find(p => p.nombre === selectedCursoProfesor.profesor)?._id : ''
                                });
                              }}
                              required
                              placeholder=" "
                            >
                              <option value="">Seleccionar curso...</option>
                              {cursosProfesores.map(cp => {
                                const capacidadActual = capacidadCursos[cp.id] || 0;
                                const estaLleno = capacidadActual >= cp.max_alumnos;
                                
                                return (
                                  <option 
                                    key={cp.id} 
                                    value={cp.id}
                                    disabled={estaLleno}
                                  >
                                    {cp.nombre} - {cp.profesor} ({capacidadActual}/{cp.max_alumnos})
                                  </option>
                                );
                              })}
                            </select>
                            <label className="label-text">
                              <FaChalkboardTeacher className="me-2" />
                              Curso y Profesor
                            </label>
                          </div>
                        </div>
                      </div>
                      
                      <div className="d-flex justify-content-end gap-3 mt-4">
                        <button 
                          type="button" 
                          className="btn btn-outline-secondary rounded-pill px-4"
                          onClick={() => setShowForm(false)}
                        >
                          Cancelar
                        </button>
                        <button 
                          type="submit" 
                          className="modern-btn"
                          disabled={loading}
                        >
                          {loading ? (
                            <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                          ) : (
                            <FaSave className="me-2" />
                          )}
                          {loading ? 'Guardando...' : 'Guardar Asignación'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Controles de búsqueda y filtros */}
              <div className="neo-card p-4 mb-4 animate-slide-up">
                <div className="row g-3 align-items-center">
                  <div className="col-md-6">
                    <div className="search-container">
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Buscar cursos o profesores..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <FaSearch className="search-icon" />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="d-flex flex-wrap justify-content-end">
                      <button 
                        className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('all')}
                      >
                        Todos
                      </button>
                      <button 
                        className={`filter-btn ${filterStatus === 'disponible' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('disponible')}
                      >
                        Disponibles
                      </button>
                      <button 
                        className={`filter-btn ${filterStatus === 'casi-lleno' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('casi-lleno')}
                      >
                        Casi llenos
                      </button>
                      <button 
                        className={`filter-btn ${filterStatus === 'lleno' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('lleno')}
                      >
                        Llenos
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid de cursos */}
              <div className="row g-4">
                {filteredCursos.map((curso, index) => {
                  const capacidadActual = capacidadCursos[curso.id] || 0;
                  const porcentajeOcupacion = (capacidadActual / curso.max_alumnos) * 100;
                  
                  return (
                    <div key={curso.id} className="col-lg-6 animate-slide-up" style={{animationDelay: `${index * 0.1}s`}}>
                      <div 
                        className="course-card h-100 cursor-pointer"
                        onClick={() => verDetallesCurso(curso)}
                      >
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div className="flex-grow-1">
                            <h6 className="fw-bold mb-2" style={{color: '#2d3748'}}>{curso.nombre}</h6>
                            <p className="text-muted mb-1">
                              <FaChalkboardTeacher className="me-2" />
                              {curso.profesor}
                            </p>
                            <p className="text-muted small mb-0">
                              <FaClock className="me-2" />
                              {curso.dia_semana} • {curso.hora_inicio} - {curso.hora_fin}
                            </p>
                          </div>
                          
                          <div className="progress-ring" style={{'--progress': `${porcentajeOcupacion}%`}}>
                            <span className="progress-text">{Math.round(porcentajeOcupacion)}%</span>
                          </div>
                        </div>
                        
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <span className="fw-bold" style={{color: '#667eea'}}>
                              {capacidadActual}/{curso.max_alumnos}
                            </span>
                            <span className="text-muted ms-2">estudiantes</span>
                          </div>
                          
                          <span className={`badge rounded-pill px-3 py-2 ${
                            porcentajeOcupacion >= 100 ? 'bg-danger' : 
                            porcentajeOcupacion >= 80 ? 'bg-warning text-dark' : 'bg-success'
                          }`}>
                            {porcentajeOcupacion >= 100 ? 'Lleno' : 
                             porcentajeOcupacion >= 80 ? 'Casi lleno' : 'Disponible'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredCursos.length === 0 && (
                <div className="text-center py-5">
                  <div className="mb-4">
                    <FaSearch className="text-muted" style={{fontSize: '4rem', opacity: 0.3}} />
                  </div>
                  <h5 className="text-muted">No se encontraron cursos</h5>
                  <p className="text-muted">Intenta ajustar tus filtros de búsqueda</p>
                </div>
              )}
            </div>
            
            {/* Panel lateral con estadísticas */}
            <div className="col-lg-4">
              <div className="sticky-top" style={{top: '140px'}}>
                {/* Estadísticas generales */}
                <div className="stats-card mb-4 animate-fade-scale">
                  <h5 className="fw-bold mb-3">
                    <FaUsers className="me-2" />
                    Resumen General
                  </h5>
                  <div className="row g-3 text-center">
                    <div className="col-6">
                      <div className="h3 fw-bold mb-1">{cursosProfesores.length}</div>
                      <div className="small opacity-75">Cursos Totales</div>
                    </div>
                    <div className="col-6">
                      <div className="h3 fw-bold mb-1">{estudiantes.length}</div>
                      <div className="small opacity-75">Estudiantes</div>
                    </div>
                    <div className="col-6">
                      <div className="h3 fw-bold mb-1">
                        {cursosProfesores.filter(c => (capacidadCursos[c.id] || 0) < c.max_alumnos).length}
                      </div>
                      <div className="small opacity-75">Disponibles</div>
                    </div>
                    <div className="col-6">
                      <div className="h3 fw-bold mb-1">
                        {cursosProfesores.filter(c => (capacidadCursos[c.id] || 0) >= c.max_alumnos).length}
                      </div>
                      <div className="small opacity-75">Completos</div>
                    </div>
                  </div>
                </div>

                {/* Lista compacta de cursos */}
                <div className="neo-card p-4 animate-slide-up">
                  <h6 className="fw-bold mb-3" style={{color: '#2d3748'}}>
                    <FaStar className="me-2 text-warning" />
                    Cursos Destacados
                  </h6>
                  
                  <div className="space-y-3">
                    {cursosProfesores.slice(0, 5).map((curso, index) => {
                      const capacidadActual = capacidadCursos[curso.id] || 0;
                      const porcentaje = (capacidadActual / curso.max_alumnos) * 100;
                      
                      return (
                        <div 
                          key={curso.id} 
                          className="d-flex align-items-center p-3 rounded-3 cursor-pointer"
                          style={{background: '#f8f9fa', transition: 'all 0.3s ease'}}
                          onClick={() => verDetallesCurso(curso)}
                          onMouseEnter={(e) => e.target.style.background = '#e9ecef'}
                          onMouseLeave={(e) => e.target.style.background = '#f8f9fa'}
                        >
                          <div className="me-3">
                            <div 
                              className="rounded-circle d-flex align-items-center justify-content-center"
                              style={{
                                width: '40px', 
                                height: '40px', 
                                background: `linear-gradient(135deg, ${porcentaje >= 100 ? '#dc3545' : porcentaje >= 80 ? '#ffc107' : '#28a745'} 0%, ${porcentaje >= 100 ? '#c82333' : porcentaje >= 80 ? '#e0a800' : '#218838'} 100%)`,
                                color: 'white',
                                fontSize: '12px',
                                fontWeight: 'bold'
                              }}
                            >
                              {Math.round(porcentaje)}%
                            </div>
                          </div>
                          <div className="flex-grow-1">
                            <div className="fw-medium small mb-1">{curso.nombre}</div>
                            <div className="text-muted" style={{fontSize: '0.8rem'}}>
                              {capacidadActual}/{curso.max_alumnos} estudiantes
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal moderno */}
      {cursoSeleccionado && (
        <div className="modal fade show d-block modal-modern" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content modal-content-modern animate-fade-scale">
              <div className="modal-header border-0 pb-2" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
                <div className="text-white">
                  <h5 className="modal-title fw-bold mb-1">
                    <FaBookOpen className="me-2" />
                    {cursoSeleccionado.nombre}
                  </h5>
                  <p className="mb-0 opacity-75">{cursoSeleccionado.profesor}</p>
                </div>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setCursoSeleccionado(null)}
                ></button>
              </div>
              
              <div className="modal-body p-4">
                <div className="row g-4">
                  <div className="col-md-8">
                    <div className="space-y-4">
                      <div className="d-flex align-items-center p-3 rounded-3" style={{background: '#f8f9fa'}}>
                        <div className="bg-primary bg-opacity-10 rounded-circle p-3 me-3">
                          <FaCalendarAlt className="text-primary" />
                        </div>
                        <div>
                          <h6 className="mb-1 fw-bold">Horario</h6>
                          <p className="mb-0 text-muted">{cursoSeleccionado.dia_semana}</p>
                          <p className="mb-0 small">{cursoSeleccionado.hora_inicio} - {cursoSeleccionado.hora_fin}</p>
                        </div>
                      </div>
                      
                      <div className="d-flex align-items-center p-3 rounded-3" style={{background: '#f8f9fa'}}>
                        <div className="bg-success bg-opacity-10 rounded-circle p-3 me-3">
                          <FaUsers className="text-success" />
                        </div>
                        <div>
                          <h6 className="mb-1 fw-bold">Capacidad</h6>
                          <p className="mb-0">
                            <span className="fw-bold text-primary">
                              {(capacidadCursos[cursoSeleccionado.id] || 0)}
                            </span>
                            <span className="text-muted"> de {cursoSeleccionado.max_alumnos} estudiantes</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-md-4 text-center">
                    <div 
                      className="progress-ring mx-auto mb-3" 
                      style={{
                        width: '100px', 
                        height: '100px',
                        '--progress': `${((capacidadCursos[cursoSeleccionado.id] || 0) / cursoSeleccionado.max_alumnos) * 100}%`
                      }}
                    >
                      <div className="progress-text" style={{fontSize: '16px'}}>
                        {Math.round(((capacidadCursos[cursoSeleccionado.id] || 0) / cursoSeleccionado.max_alumnos) * 100)}%
                      </div>
                    </div>
                    <p className="text-muted small">Ocupación actual</p>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer border-0 pt-0">
                <button 
                  type="button" 
                  className="btn btn-outline-secondary rounded-pill px-4" 
                  onClick={() => setCursoSeleccionado(null)}
                >
                  Cerrar
                </button>
                {(capacidadCursos[cursoSeleccionado.id] || 0) < cursoSeleccionado.max_alumnos && (
                  <button 
                    type="button" 
                    className="modern-btn" 
                    onClick={() => {
                      setFormData({
                        ...formData,
                        asignacionId: cursoSeleccionado.id.toString(),
                        profesorId: profesores.find(p => p.nombre === cursoSeleccionado.profesor)?._id || ''
                      });
                      setShowForm(true);
                      setCursoSeleccionado(null);
                    }}
                  >
                    <FaUserPlus className="me-2" />
                    Asignar Estudiante
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AsignacionEstudiantes;