import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  FaSchool, FaBook, FaChalkboardTeacher, FaUserGraduate, 
  FaExclamationTriangle, FaSearch, FaFilter, FaEnvelope,
  FaChevronDown, FaChevronUp, FaUsers, FaLayerGroup,
  FaGraduationCap, FaCalendarAlt, FaSortAmountDown
} from 'react-icons/fa';

const CursosMaestrosEstudiantes = ({ token, showError }) => {
  const [cursos, setCursos] = useState([]);
  const [estudiantesPorCurso, setEstudiantesPorCurso] = useState({});
  const [expandedCursos, setExpandedCursos] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingEstudiantes, setLoadingEstudiantes] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [sortBy, setSortBy] = useState('nombre');
  const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3007';

  const normalizeText = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    }
    return value;
  };

  const normalizeGrade = (value) => {
    if (value === null || value === undefined) return null;
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) return numeric;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    }
    return value;
  };

  const formatLevelLabel = (level) => {
    if (level === null || level === undefined) return 'Nivel sin definir';
    if (typeof level === 'string') {
      const trimmed = level.trim();
      if (!trimmed) return 'Nivel sin definir';
      return trimmed;
    }
    return 'Nivel sin definir';
  };

  const formatGradeLabel = (grade) => {
    if (grade === null || grade === undefined) return 'Grado sin definir';
    if (typeof grade === 'string') {
      const trimmed = grade.trim();
      if (!trimmed) return 'Grado sin definir';
      return trimmed.toLowerCase().startsWith('grado') ? trimmed : `Grado ${trimmed}`;
    }
    if (Number.isNaN(grade)) return 'Grado sin definir';
    return `Grado ${grade}`;
  };

  const formatSectionLabel = (section) => {
    if (section === null || section === undefined) return 'Sección sin definir';
    if (typeof section === 'string') {
      const trimmed = section.trim();
      if (!trimmed) return 'Sección sin definir';
      return trimmed.toLowerCase().startsWith('sección') || trimmed.toLowerCase().startsWith('seccion')
        ? trimmed
        : `Sección ${trimmed}`;
    }
    return `Sección ${section}`;
  };

  const buildUbicacionResumen = (curso) => [
    formatLevelLabel(curso?.level ?? null),
    formatGradeLabel(curso?.grade_number ?? null),
    formatSectionLabel(curso?.section ?? null),
  ].join(' • ');

  const normalizeDateOnly = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  };

  const isCursoPasado = (curso) => {
    if (!curso) return false;
    const fechaFin = curso.fecha_fin || curso.fechaFin || curso.endDate || null;
    const normalized = normalizeDateOnly(fechaFin);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return normalized ? normalized < today : false;
  };

  const fetchCursos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${apiBaseUrl}/cursos-con-profesor`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = Array.isArray(response.data)
        ? response.data
            .map((item) => {
              const inscritosParsed = Number(item.inscritos);
              const maxParsed = item.max_alumnos != null ? Number(item.max_alumnos) : null;
              return {
                ...item,
                level: normalizeText(item.level),
                section: normalizeText(item.section),
                inscritos: Number.isNaN(inscritosParsed) ? 0 : inscritosParsed,
                max_alumnos: Number.isNaN(maxParsed) ? null : maxParsed,
                grade_number: normalizeGrade(item.grade_number),
              };
            })
            .filter(curso => !isCursoPasado(curso)) // Filtrar solo clases actuales
        : [];
      setCursos(data);
    } catch (error) {
      console.error('Error cargando cursos:', error);
      showError?.('Error al cargar los cursos disponibles');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, token, showError]);

  const fetchEstudiantesCurso = useCallback(async (cursoId) => {
    try {
      setLoadingEstudiantes(prev => ({ ...prev, [cursoId]: true }));
      console.log(`🔍 Intentando cargar estudiantes del curso ${cursoId}`);
      console.log(`📡 URL: ${apiBaseUrl}/asignaciones/${cursoId}/estudiantes`);
      console.log(`🔑 Token disponible:`, !!token);
      
      const response = await axios.get(
        `${apiBaseUrl}/asignaciones/${cursoId}/estudiantes`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const estudiantes = Array.isArray(response.data) ? response.data : [];
      console.log(`✅ Estudiantes del curso ${cursoId}:`, estudiantes);
      setEstudiantesPorCurso(prev => ({ ...prev, [cursoId]: estudiantes }));
      return estudiantes;
    } catch (error) {
      console.error(`❌ Error cargando estudiantes del curso ${cursoId}:`, error);
      console.error('📋 Status:', error.response?.status);
      console.error('📋 Status Text:', error.response?.statusText);
      console.error('📋 Detalles del error:', error.response?.data);
      console.error('📋 Error message:', error.message);
      setEstudiantesPorCurso(prev => ({ ...prev, [cursoId]: [] }));
      showError?.(`Error al cargar estudiantes: ${error.response?.data?.error || error.message}`);
      return [];
    } finally {
      setLoadingEstudiantes(prev => ({ ...prev, [cursoId]: false }));
    }
  }, [apiBaseUrl, token, showError]);

  useEffect(() => {
    if (token) {
      fetchCursos();
    }
  }, [token, fetchCursos]);

  const handleToggleCurso = async (cursoId) => {
    const newExpanded = new Set(expandedCursos);
    if (expandedCursos.has(cursoId)) {
      newExpanded.delete(cursoId);
    } else {
      newExpanded.add(cursoId);
      // Cargar estudiantes si aún no se han cargado
      if (!estudiantesPorCurso[cursoId]) {
        await fetchEstudiantesCurso(cursoId);
      }
    }
    setExpandedCursos(newExpanded);
  };

  if (loading) {
    return (
      <div className="container-fluid px-4 py-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3 text-muted">Cargando información de cursos...</p>
        </div>
      </div>
    );
  }

  // Filter and sort cursos
  const filteredCursos = cursos
    .filter(curso => {
      const matchesSearch = 
        curso.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        curso.profesor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        curso.teacher_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesLevel = filterLevel === 'all' || curso.level === filterLevel;
      
      return matchesSearch && matchesLevel;
    })
    .sort((a, b) => {
      if (sortBy === 'nombre') {
        return (a.nombre || '').localeCompare(b.nombre || '');
      } else if (sortBy === 'inscritos') {
        return (b.inscritos || 0) - (a.inscritos || 0);
      } else if (sortBy === 'profesor') {
        return (a.profesor || a.teacher_name || '').localeCompare(b.profesor || b.teacher_name || '');
      }
      return 0;
    });

  const levels = [...new Set(cursos.map(c => c.level).filter(Boolean))];

  return (
    <div className="container-fluid px-4 py-4">
      <style>{`
        .curso-card {
          border: none;
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.3s ease;
          background: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        
        .curso-card:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          transform: translateY(-2px);
        }
        
        .curso-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .curso-header:hover {
          background: linear-gradient(135deg, #5568d3 0%, #653a8e 100%);
        }
        
        .curso-header-expanded {
          border-bottom: 3px solid #f0f4f8;
        }
        
        .curso-title {
          color: white;
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .curso-subtitle {
          color: rgba(255,255,255,0.9);
          font-size: 0.9rem;
          margin: 0.5rem 0 0 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .badge-modern {
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.85rem;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .badge-students {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .badge-capacity {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
        }
        
        .badge-full {
          background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
          color: #333;
        }
        
        .teacher-card {
          background: linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%);
          border-radius: 12px;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
        }
        
        .teacher-name {
          font-size: 1.1rem;
          font-weight: 600;
          color: #2d3748;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .teacher-email {
          color: #4a5568;
          font-size: 0.9rem;
          margin: 0.5rem 0 0 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .students-section {
          background: #f7fafc;
          border-radius: 12px;
          padding: 1.5rem;
        }
        
        .section-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #2d3748;
          margin: 0 0 1rem 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .student-table {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .student-table thead {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .student-table th {
          padding: 0.75rem 1rem;
          font-weight: 600;
          border: none;
        }
        
        .student-table td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .student-table tbody tr:hover {
          background: #f7fafc;
        }
        
        .student-table tbody tr:last-child td {
          border-bottom: none;
        }
        
        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: #718096;
        }
        
        .empty-state-icon {
          font-size: 3rem;
          opacity: 0.3;
          margin-bottom: 1rem;
        }
        
        .search-filter-bar {
          background: white;
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        
        .search-input {
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          padding: 0.75rem 1rem 0.75rem 2.75rem;
          transition: all 0.3s ease;
        }
        
        .search-input:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          outline: none;
        }
        
        .filter-select {
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          padding: 0.75rem 1rem;
          transition: all 0.3s ease;
        }
        
        .filter-select:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          outline: none;
        }
        
        .stats-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          padding: 1.25rem;
          color: white;
          text-align: center;
        }
        
        .stats-number {
          font-size: 2rem;
          font-weight: 700;
          margin: 0;
        }
        
        .stats-label {
          font-size: 0.9rem;
          opacity: 0.9;
          margin: 0.25rem 0 0 0;
        }
        
        .chevron-icon {
          transition: transform 0.3s ease;
        }
        
        .chevron-icon-rotated {
          transform: rotate(180deg);
        }
      `}</style>

      {/* Header */}
      <div className="mb-4">
        <h2 className="mb-2" style={{ color: '#2d3748', fontWeight: '700' }}>
          <FaSchool className="me-2" style={{ color: '#667eea' }} />
          Cursos Completos
        </h2>
        <p className="text-muted mb-0">Gestión de cursos, maestros y estudiantes asignados</p>
      </div>

      {/* Stats Summary */}
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div className="stats-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <FaBook style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }} />
            <p className="stats-number">{cursos.length}</p>
            <p className="stats-label">Total Cursos</p>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="stats-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <FaChalkboardTeacher style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }} />
            <p className="stats-number">{new Set(cursos.map(c => c.profesor || c.teacher_name).filter(Boolean)).size}</p>
            <p className="stats-label">Profesores</p>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="stats-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <FaUserGraduate style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }} />
            <p className="stats-number">{cursos.reduce((sum, c) => sum + (c.inscritos || 0), 0)}</p>
            <p className="stats-label">Estudiantes</p>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="stats-card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            <FaLayerGroup style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }} />
            <p className="stats-number">{levels.length}</p>
            <p className="stats-label">Niveles</p>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="search-filter-bar">
        <div className="row g-3 align-items-center">
          <div className="col-md-5">
            <div className="position-relative">
              <FaSearch style={{ 
                position: 'absolute', 
                left: '1rem', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: '#a0aec0'
              }} />
              <input
                type="text"
                className="form-control search-input"
                placeholder="Buscar por curso o profesor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-3">
            <select 
              className="form-select filter-select"
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
            >
              <option value="all">Todos los niveles</option>
              {levels.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <select 
              className="form-select filter-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="nombre">Ordenar por Nombre</option>
              <option value="inscritos">Ordenar por Estudiantes</option>
              <option value="profesor">Ordenar por Profesor</option>
            </select>
          </div>
          <div className="col-md-1 text-end">
            <span className="badge badge-modern badge-students">
              {filteredCursos.length} cursos
            </span>
          </div>
        </div>
      </div>

      {/* Cursos List */}
      {filteredCursos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <FaExclamationTriangle />
          </div>
          <h4>No se encontraron cursos</h4>
          <p>Intenta ajustar los filtros de búsqueda</p>
        </div>
      ) : (
        <div className="row g-3">
          {filteredCursos.map((curso) => {
                const cursoId = curso.id || curso._id;
                const inscritos = Number(curso.inscritos || 0);
                const maxAlumnos = curso.max_alumnos != null ? Number(curso.max_alumnos) : null;
                const isExpanded = expandedCursos.has(cursoId);
                const estudiantesDelCurso = estudiantesPorCurso[cursoId] || [];
                const isLoadingEstudiantes = loadingEstudiantes[cursoId] || false;
                const isFull = maxAlumnos && inscritos >= maxAlumnos;
                
                return (
                  <div className="col-12 col-lg-6 col-xl-4" key={cursoId}>
                    <div className="curso-card">
                      <div 
                        className={`curso-header ${isExpanded ? 'curso-header-expanded' : ''}`}
                        onClick={() => handleToggleCurso(cursoId)}
                      >
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <h5 className="curso-title">
                              <FaBook />
                              {curso.nombre}
                            </h5>
                            <p className="curso-subtitle">
                              <FaLayerGroup style={{ fontSize: '0.8rem' }} />
                              {buildUbicacionResumen(curso)}
                            </p>
                            <p className="curso-subtitle">
                              <FaChalkboardTeacher style={{ fontSize: '0.8rem' }} />
                              {curso.profesor || curso.teacher_name || 'Sin asignar'}
                            </p>
                          </div>
                          <div className="d-flex flex-column align-items-end gap-2">
                            <span className={`badge-modern ${isFull ? 'badge-full' : 'badge-students'}`}>
                              <FaUsers style={{ fontSize: '0.9rem' }} />
                              {maxAlumnos ? `${inscritos}/${maxAlumnos}` : `${inscritos}`}
                            </span>
                            <FaChevronDown 
                              className={`chevron-icon ${isExpanded ? 'chevron-icon-rotated' : ''}`}
                              style={{ color: 'white', fontSize: '1.2rem' }}
                            />
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-3">
                          {/* Teacher Card */}
                          <div className="teacher-card">
                            <p className="teacher-name">
                              <FaChalkboardTeacher />
                              {curso.profesor || curso.teacher_name || 'Sin asignar'}
                            </p>
                            {curso.teacher_email && (
                              <p className="teacher-email">
                                <FaEnvelope />
                                {curso.teacher_email}
                              </p>
                            )}
                          </div>

                          {/* Students Section */}
                          <div className="students-section">
                            <p className="section-title">
                              <FaUserGraduate />
                              Estudiantes Inscritos ({inscritos})
                            </p>
                            
                            {inscritos === 0 ? (
                              <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                                <FaUserGraduate style={{ fontSize: '2rem', opacity: 0.3, marginBottom: '0.5rem' }} />
                                <p style={{ margin: 0, fontSize: '0.9rem' }}>No hay estudiantes asignados</p>
                              </div>
                            ) : isLoadingEstudiantes ? (
                              <div className="text-center py-3">
                                <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                                  <span className="visually-hidden">Cargando...</span>
                                </div>
                                <span className="text-muted">Cargando estudiantes...</span>
                              </div>
                            ) : estudiantesDelCurso.length === 0 ? (
                              <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                                <FaUserGraduate style={{ fontSize: '2rem', opacity: 0.3, marginBottom: '0.5rem' }} />
                                <p style={{ margin: 0, fontSize: '0.9rem' }}>No se pudieron cargar los estudiantes</p>
                              </div>
                            ) : (
                              <div className="student-table">
                                <table className="table table-sm mb-0">
                                  <thead>
                                    <tr>
                                      <th style={{ width: '50px' }}>#</th>
                                      <th>Nombre</th>
                                      <th>Email</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {estudiantesDelCurso.map((est, idx) => (
                                      <tr key={est.id || est._id || est.student_id || idx}>
                                        <td>{idx + 1}</td>
                                        <td>
                                          <strong>{est.nombre || est.student_name || est.name || 'Sin nombre'}</strong>
                                        </td>
                                        <td>
                                          <small className="text-muted">
                                            {est.email || est.student_email || 'Sin email'}
                                          </small>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
    );
};

export default CursosMaestrosEstudiantes;
