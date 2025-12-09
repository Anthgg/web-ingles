import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

const API_URL = 'http://localhost:3007/asignaciones';
const PROFESORES_URL = 'http://localhost:3007/profesores';

// Iconos SVG personalizados
const Icons = {
  Edit: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="m18.5 2.5 a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  Trash: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3,6 5,6 21,6"/>
      <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
      <line x1="10" y1="11" x2="10" y2="17"/>
      <line x1="14" y1="11" x2="14" y2="17"/>
    </svg>
  ),
  Plus: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Check: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20,6 9,17 4,12"/>
    </svg>
  ),
  X: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  GraduationCap: () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
      <path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  ),
  User: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Calendar: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Clock: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12,6 12,12 16,14"/>
    </svg>
  ),
  MapPin: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  FileText: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10,9 9,9 8,9"/>
    </svg>
  ),
  Users: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
};

const DIAS_SEMANA = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
];

// Nueva paleta de colores más profesional
const DIA_COLORES = {
  'Lunes': '#2563eb',
  'Martes': '#8b5cf6',
  'Miércoles': '#10b981',
  'Jueves': '#f59e0b',
  'Viernes': '#ef4444',
  'Sábado': '#6366f1',
  'Domingo': '#ec4899'
};

const startsToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const parseDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const ProfesoresAsignaturas = ({ token }) => {
  const [asignaciones, setAsignaciones] = useState([]);
  const [profesores, setProfesores] = useState([]);
  const [clases, setClases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    profesor_nombre: '',
    curso_nombre: '',
    dia_semana: '',
    hora_inicio: '',
    hora_fin: '',
    fecha_inicio: '',
    fecha_fin: '',
    aula: '',
    notas: '',
    max_alumnos: ''
  });

  // Filtros y búsqueda
  const [search, setSearch] = useState('');
  const [filtroClase, setFiltroClase] = useState('');
  const [filtroDia, setFiltroDia] = useState('');

  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const toastTimeout = useRef();

  const today = useMemo(() => startsToday(), []);

  const isPastAssignment = useCallback((assignment) => {
    if (!assignment) return false;
    const fin = parseDate(assignment.fecha_fin || assignment.fechaFin);
    return fin ? fin < today : false;
  }, [today]);

  // Toast helpers
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast({ ...toast, show: false }), 3000);
  };

  // Fetch asignaciones
  const fetchAsignaciones = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setAsignaciones(data.data || []);
    } catch (err) {
      showToast('Error al cargar asignaciones', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Fetch profesores para el select
  const fetchProfesores = async () => {
    try {
      const res = await fetch(PROFESORES_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setProfesores(data || []);
    } catch (err) {
      showToast('Error al cargar profesores', 'danger');
    }
  };

  // Fetch clases/asignaturas para filtro
  const fetchClases = async () => {
    try {
      const res = await fetch('http://localhost:3007/cursos', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setClases(data || []);
    } catch (err) {
      showToast('Error al cargar clases', 'danger');
    }
  };

  useEffect(() => {
    fetchAsignaciones();
    fetchProfesores();
    fetchClases();
    return () => clearTimeout(toastTimeout.current);
    // eslint-disable-next-line
  }, []);

  // Handlers
  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEdit = idx => {
    setEditIdx(idx);
    setShowForm(true);
    setForm({ ...asignacionesFiltradas[idx], max_alumnos: asignacionesFiltradas[idx].max_alumnos || '' });
  };

  const handleCancel = () => {
    setEditIdx(null);
    setShowForm(false);
    setForm({
      profesor_nombre: '',
      curso_nombre: '',
      dia_semana: '',
      hora_inicio: '',
      hora_fin: '',
      fecha_inicio: '',
      fecha_fin: '',
      aula: '',
      notas: '',
      max_alumnos: ''
    });
  };

  // Agregar estados para el modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Modificar el handleDelete
  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      showToast('Asignación eliminada', 'success');
      fetchAsignaciones();
      handleCancel();
    } catch {
      showToast('Error al eliminar', 'danger');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const body = {
        profesorNombre: form.profesor_nombre,
        cursoNombre: form.curso_nombre,
        diaSemana: form.dia_semana,
        horaInicio: form.hora_inicio,
        horaFin: form.hora_fin,
        fechaInicio: form.fecha_inicio,
        fechaFin: form.fecha_fin,
        aula: form.aula,
        notas: form.notas,
        maxAlumnos: form.max_alumnos
      };
      let res;
      if (editIdx !== null) {
        res = await fetch(`${API_URL}/${asignacionesFiltradas[editIdx].id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(body)
        });
      } else {
        res = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(body)
        });
      }
      if (!res.ok) throw new Error();
      showToast(editIdx !== null ? 'Asignación actualizada' : 'Asignación creada', 'success');
      fetchAsignaciones();
      handleCancel();
    } catch {
      showToast('Error al guardar', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Filtro y búsqueda
  const asignacionesActivas = useMemo(
    () => asignaciones.filter((a) => !isPastAssignment(a)),
    [asignaciones, isPastAssignment]
  );

  const asignacionesPasadas = useMemo(
    () => asignaciones.filter((a) => isPastAssignment(a)),
    [asignaciones, isPastAssignment]
  );

  const asignacionesFiltradas = asignacionesActivas.filter(a => {
    const matchSearch =
      a.profesor_nombre.toLowerCase().includes(search.toLowerCase()) ||
      a.curso_nombre.toLowerCase().includes(search.toLowerCase());
    const matchClase = !filtroClase || a.curso_nombre === filtroClase;
    const matchDia = !filtroDia || a.dia_semana === filtroDia;
    return matchSearch && matchClase && matchDia;
  });

  return (
    <div className="container-fluid p-0">
      {/* Nueva notificación tipo toast */}
      {toast.show && (
        <div className="position-fixed top-4 end-0 p-3" style={{ zIndex: 1055 }}>
          <div 
            className="toast show shadow-lg border-0 overflow-hidden" 
            style={{ maxWidth: "350px" }}
            role="alert" 
            aria-live="assertive" 
            aria-atomic="true"
          >
            <div className="d-flex">
              <div className="toast-body p-3 d-flex" style={{ 
                backgroundColor: toast.type === 'success' ? '#effaf5' : '#fff5f7',
                color: toast.type === 'success' ? '#0c6b58' : '#cc1f36'
              }}>
                <div className="me-3 d-flex align-items-center">
                  {toast.type === 'success' ? (
                    <div className="rounded-circle p-2" style={{ backgroundColor: '#d1fae5' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#059669" viewBox="0 0 16 16">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                      </svg>
                    </div>
                  ) : (
                    <div className="rounded-circle p-2" style={{ backgroundColor: '#fee2e2' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#e11d48" viewBox="0 0 16 16">
                        <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div>
                  <strong className="fw-bold d-block mb-1">
                    {toast.type === 'success' ? '¡Éxito!' : 'Error'} 
                  </strong>
                  <span>{toast.message}</span>
                  <button 
                    type="button" 
                    className="btn-close float-end"
                    onClick={() => setToast({ ...toast, show: false })}
                    aria-label="Close"
                  ></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header principal sin botón de nueva asignación */}
      <div className="px-4 py-5 my-2">
        <div className="mb-4">
          <h2 className="fw-bold mb-1 display-6">Horario de clases</h2>
          <p className="text-muted mb-0">Gestión de asignaciones de profesores y cursos</p>
        </div>
        
        {/* Nueva sección de estadísticas */}
        <div className="row g-4 mb-4">
          <div className="col-md-3">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex align-items-center mb-3">
                  <div className="rounded-circle p-2 me-3" style={{ backgroundColor: '#e0f2fe' }}>
                    <Icons.GraduationCap />
                  </div>
                  <h6 className="mb-0 text-secondary">Asignaturas</h6>
                </div>
                <h3 className="mb-0 fw-bold">{clases.length}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex align-items-center mb-3">
                  <div className="rounded-circle p-2 me-3" style={{ backgroundColor: '#fef3c7' }}>
                    <Icons.User />
                  </div>
                  <h6 className="mb-0 text-secondary">Profesores</h6>
                </div>
                <h3 className="mb-0 fw-bold">{profesores.length}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex align-items-center mb-3">
                  <div className="rounded-circle p-2 me-3" style={{ backgroundColor: '#fae8ff' }}>
                    <Icons.Calendar />
                  </div>
                  <h6 className="mb-0 text-secondary">Asignaciones activas</h6>
                </div>
                <div className="d-flex flex-column">
                  <h3 className="mb-0 fw-bold">{asignacionesActivas.length}</h3>
                  <small className="text-muted">{asignacionesPasadas.length} clases finalizadas</small>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex align-items-center mb-3">
                  <div className="rounded-circle p-2 me-3" style={{ backgroundColor: '#d1fae5' }}>
                    <Icons.Clock />
                  </div>
                  <h6 className="mb-0 text-secondary">Días activos</h6>
                </div>
                <h3 className="mb-0 fw-bold">
                  {[...new Set(asignaciones.map(a => a.dia_semana))].length}
                </h3>
              </div>
            </div>
          </div>
        </div>

        {/* Buscador y filtros */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-lg-4">
                <div className="form-floating mb-0">
                  <input
                    type="text"
                    className="form-control border-0 bg-light"
                    id="searchInput"
                    placeholder="Buscar..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  <label htmlFor="searchInput">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#6c757d" className="bi bi-search me-2" viewBox="0 0 16 16">
                      <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
                    </svg>
                    Buscar por profesor o asignatura
                  </label>
                </div>
              </div>
              <div className="col-lg-4">
                <div className="form-floating mb-0">
                  <select
                    className="form-select border-0 bg-light"
                    id="asignaturaSelect"
                    value={filtroClase}
                    onChange={e => setFiltroClase(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {clases.map((c, i) => (
                      <option key={i} value={c.nombre}>{c.nombre}</option>
                    ))}
                  </select>
                  <label htmlFor="asignaturaSelect">Asignatura</label>
                </div>
              </div>
              <div className="col-lg-4">
                <div className="form-floating mb-0">
                  <select
                    className="form-select border-0 bg-light"
                    id="diaSelect"
                    value={filtroDia}
                    onChange={e => setFiltroDia(e.target.value)}
                  >
                    <option value="">Todos</option>
                    {DIAS_SEMANA.map(dia => (
                      <option key={dia} value={dia}>{dia}</option>
                    ))}
                  </select>
                  <label htmlFor="diaSelect">Día de la semana</label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario modal */}
      {showForm && (
        <div className="modal d-block position-fixed top-0 left-0 w-100 h-100" style={{backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050}}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">{editIdx !== null ? 'Editar asignación' : 'Nueva asignación'}</h5>
                <button type="button" className="btn-close" onClick={handleCancel}></button>
              </div>
              <div className="modal-body p-4">
                <form onSubmit={handleSubmit}>
                  <div className="row g-4">
                    <div className="col-md-6">
                      <div className="form-floating mb-3">
                        <select
                          name="profesor_nombre"
                          id="profesorSelect"
                          value={form.profesor_nombre}
                          onChange={handleChange}
                          required
                          disabled={loading}
                          className="form-select"
                        >
                          <option value="">Seleccione...</option>
                          {profesores.map((p, i) => (
                            <option key={i} value={p.nombre}>{p.nombre}</option>
                          ))}
                        </select>
                        <label htmlFor="profesorSelect">Profesor</label>
                      </div>

                      <div className="form-floating mb-3">
                        <input
                          type="text"
                          name="curso_nombre"
                          id="cursoInput"
                          value={form.curso_nombre}
                          onChange={handleChange}
                          required
                          disabled={loading}
                          className="form-control"
                          placeholder="Nombre de la asignatura"
                        />
                        <label htmlFor="cursoInput">Asignatura</label>
                      </div>

                      <div className="form-floating mb-3">
                        <select
                          name="dia_semana"
                          id="diaSelectForm"
                          value={form.dia_semana}
                          onChange={handleChange}
                          required
                          disabled={loading}
                          className="form-select"
                        >
                          <option value="">Seleccione...</option>
                          {DIAS_SEMANA.map(dia => (
                            <option key={dia} value={dia}>{dia}</option>
                          ))}
                        </select>
                        <label htmlFor="diaSelectForm">Día de la semana</label>
                      </div>

                      <div className="row g-2 mb-3">
                        <div className="col-6">
                          <div className="form-floating">
                            <input
                              type="time"
                              name="hora_inicio"
                              id="horaInicioInput"
                              value={form.hora_inicio}
                              onChange={handleChange}
                              required
                              disabled={loading}
                              className="form-control"
                            />
                            <label htmlFor="horaInicioInput">Hora inicio</label>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="form-floating">
                            <input
                              type="time"
                              name="hora_fin"
                              id="horaFinInput"
                              value={form.hora_fin}
                              onChange={handleChange}
                              required
                              disabled={loading}
                              className="form-control"
                            />
                            <label htmlFor="horaFinInput">Hora fin</label>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-md-6">
                      <div className="row g-2 mb-3">
                        <div className="col-6">
                          <div className="form-floating">
                            <input
                              type="date"
                              name="fecha_inicio"
                              id="fechaInicioInput"
                              value={form.fecha_inicio}
                              onChange={handleChange}
                              required
                              disabled={loading}
                              className="form-control"
                            />
                            <label htmlFor="fechaInicioInput">Fecha inicio</label>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="form-floating">
                            <input
                              type="date"
                              name="fecha_fin"
                              id="fechaFinInput"
                              value={form.fecha_fin}
                              onChange={handleChange}
                              required
                              disabled={loading}
                              className="form-control"
                            />
                            <label htmlFor="fechaFinInput">Fecha fin</label>
                          </div>
                        </div>
                      </div>

                      <div className="form-floating mb-3">
                        <input
                          type="text"
                          name="aula"
                          id="aulaInput"
                          value={form.aula}
                          onChange={handleChange}
                          disabled={loading}
                          className="form-control"
                          placeholder="Número o nombre del aula"
                        />
                        <label htmlFor="aulaInput">Aula</label>
                      </div>

                      <div className="form-floating mb-3">
                        <input
                          type="number"
                          name="max_alumnos"
                          id="maxAlumnosInput"
                          value={form.max_alumnos}
                          onChange={handleChange}
                          min="1"
                          disabled={loading}
                          className="form-control"
                          placeholder="Número máximo"
                        />
                        <label htmlFor="maxAlumnosInput">Máximo alumnos</label>
                      </div>

                      <div className="form-floating">
                        <textarea
                          name="notas"
                          id="notasTextarea"
                          value={form.notas}
                          onChange={handleChange}
                          disabled={loading}
                          className="form-control"
                          style={{ height: "100px" }}
                          placeholder="Información adicional..."
                        ></textarea>
                        <label htmlFor="notasTextarea">Notas adicionales</label>
                      </div>
                    </div>
                  </div>

                  <div className="d-flex justify-content-end gap-2 mt-4 pt-4 border-top">
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={loading}
                      className="btn btn-light px-4"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary px-4"
                      style={{ backgroundColor: '#4361ee', borderColor: '#4361ee' }}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Guardando...
                        </>
                      ) : (
                        editIdx !== null ? 'Actualizar' : 'Guardar'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación */}
      {showDeleteModal && (
        <div className="modal d-block position-fixed top-0 left-0 w-100 h-100" style={{backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050}}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)}></button>
              </div>
              <div className="modal-body text-center p-4 pb-5">
                <div className="mb-4 text-danger">
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                  </svg>
                </div>
                <h4 className="mb-3 fw-bold">¿Eliminar esta asignación?</h4>
                <p className="text-muted mb-4">
                  Esta acción no se puede deshacer. La asignación será eliminada permanentemente.
                </p>
                <div className="d-flex justify-content-center gap-3">
                  <button 
                    type="button" 
                    className="btn btn-light px-4 py-2"
                    onClick={() => setShowDeleteModal(false)}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-danger px-4 py-2"
                    onClick={handleDelete}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Eliminando...
                      </>
                    ) : (
                      'Eliminar'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estado vacío mejorado */}
      {asignacionesFiltradas.length === 0 && (
        <div className="container text-center my-5 py-5">
          <div className="p-5 bg-light rounded-3 shadow-sm">
            <div className="py-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" fill="#6c757d" className="bi bi-calendar-x mb-4" viewBox="0 0 16 16">
                <path d="M6.146 7.146a.5.5 0 0 1 .708 0L8 8.293l1.146-1.147a.5.5 0 1 1 .708.708L8.707 9l1.147 1.146a.5.5 0 0 1-.708.708L8 9.707l-1.146 1.147a.5.5 0 0 1-.708-.708L7.293 9 6.146 7.854a.5.5 0 0 1 0-.708z"/>
                <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
              </svg>
              <h2 className="fw-bold mb-3">No hay asignaciones disponibles</h2>
              <p className="text-muted mb-4 mx-auto" style={{ maxWidth: '600px' }}>
                No se encontraron asignaciones que coincidan con los criterios de búsqueda.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* NUEVO DISEÑO: Vista de calendario para las asignaciones */}
      {asignacionesFiltradas.length > 0 && (
        <div className="container-fluid px-4 mb-5">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="mb-0 text-muted">
              Mostrando {asignacionesFiltradas.length} asignaciones 
              {filtroClase && ` de "${filtroClase}"`}
              {filtroDia && ` para el día ${filtroDia}`}
            </h5>
          </div>
          
          {/* Vista de tabla para las asignaciones */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="bg-light">
                  <tr>
                    <th className="border-0 px-4 py-3">Día</th>
                    <th className="border-0 px-4 py-3">Horario</th>
                    <th className="border-0 px-4 py-3">Curso</th>
                    <th className="border-0 px-4 py-3">Profesor</th>
                    <th className="border-0 px-4 py-3">Periodo</th>
                    <th className="border-0 px-4 py-3">Aula</th>
                    <th className="border-0 px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {asignacionesFiltradas.map((asignacion, idx) => {
                    const diaColor = DIA_COLORES[asignacion.dia_semana] || '#4361ee';
                    
                    return (
                      <tr key={asignacion.id} className="border-bottom">
                        <td className="px-4 py-3">
                          <div className="d-flex align-items-center">
                            <div className="rounded-circle p-2 me-3" style={{ 
                              backgroundColor: `${diaColor}20`,
                              width: '36px',
                              height: '36px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <span style={{ color: diaColor, fontWeight: '600' }}>
                                {asignacion.dia_semana.substring(0, 1)}
                              </span>
                            </div>
                            <span className="fw-medium">{asignacion.dia_semana}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="d-flex align-items-center">
                            <div className="rounded p-1 me-2" style={{ backgroundColor: '#f3f4f6' }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" className="text-secondary" viewBox="0 0 16 16">
                                <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
                              </svg>
                            </div>
                            <span className="small fw-medium">
                              {asignacion.hora_inicio?.slice(0,5)} - {asignacion.hora_fin?.slice(0,5)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 fw-medium">
                          {asignacion.curso_nombre}
                        </td>
                        <td className="px-4 py-3">
                          <div className="d-flex align-items-center">
                            <div className="rounded-circle p-1 me-2 bg-light">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="text-secondary" viewBox="0 0 16 16">
                                <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                              </svg>
                            </div>
                            {asignacion.profesor_nombre}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="small">
                            <div>Inicio: <span className="fw-medium">{asignacion.fecha_inicio?.slice(0,10).split('-').reverse().join('/')}</span></div>
                            <div>Fin: <span className="fw-medium">{asignacion.fecha_fin?.slice(0,10).split('-').reverse().join('/')}</span></div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {asignacion.aula ? (
                            <span className="badge bg-light text-dark border py-2 px-3">
                              {asignacion.aula}
                            </span>
                          ) : (
                            <span className="text-muted small">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-end">
                          <div className="btn-group">
                            <button
                              onClick={() => handleEdit(idx)}
                              className="btn btn-sm btn-outline-secondary"
                              title="Editar asignación"
                            >
                              <Icons.Edit />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(asignacion.id)}
                              className="btn btn-sm btn-outline-danger"
                              title="Eliminar asignación"
                            >
                              <Icons.Trash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Vista de tarjetas para días agrupados */}
          <h5 className="mb-3">Distribución por día</h5>
          <div className="row g-4">
            {DIAS_SEMANA.filter(dia => 
              asignacionesFiltradas.some(a => a.dia_semana === dia)
            ).map((dia) => {
              const diaColor = DIA_COLORES[dia];
              const asignacionesDia = asignacionesFiltradas.filter(a => a.dia_semana === dia);
              
              return (
                <div key={dia} className="col-md-6 col-xl-4">
                  <div className="card border-0 shadow-sm overflow-hidden mb-4" 
                       style={{ borderTop: `4px solid ${diaColor}` }}>
                    <div className="card-header border-0 py-3 bg-white d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center">
                        <div className="rounded p-2 me-3" style={{ backgroundColor: `${diaColor}20` }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill={diaColor} viewBox="0 0 16 16">
                            <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                          </svg>
                        </div>
                        <h5 className="mb-0 fw-bold">{dia}</h5>
                      </div>
                      <span className="badge bg-light text-dark border">
                        {asignacionesDia.length} clases
                      </span>
                    </div>
                    <div className="card-body p-0">
                      <div className="list-group list-group-flush">
                        {asignacionesDia.map((asignacion) => (
                          <div key={asignacion.id} className="list-group-item border-0 py-3 px-4">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <span className="badge" style={{ 
                                backgroundColor: `${diaColor}20`,
                                color: diaColor,
                                padding: '0.35rem 0.65rem'
                              }}>
                                {asignacion.hora_inicio?.slice(0,5)} - {asignacion.hora_fin?.slice(0,5)}
                              </span>
                              <div className="small text-muted">
                                {asignacion.aula && `Aula ${asignacion.aula}`}
                              </div>
                            </div>
                            <h6 className="mb-1 fw-bold">{asignacion.curso_nombre}</h6>
                            <div className="d-flex justify-content-between align-items-center">
                              <div className="text-muted small">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="me-1" viewBox="0 0 16 16">
                                  <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                                </svg>
                                {asignacion.profesor_nombre}
                              </div>
                              <div>
                                <button
                                  onClick={() => handleEdit(asignacionesFiltradas.findIndex(a => a.id === asignacion.id))}
                                  className="btn btn-sm btn-link p-0 me-2 text-secondary"
                                  title="Editar"
                                >
                                  <Icons.Edit />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(asignacion.id)}
                                  className="btn btn-sm btn-link p-0 text-danger"
                                  title="Eliminar"
                                >
                                  <Icons.Trash />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfesoresAsignaturas;