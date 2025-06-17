import React, { useState, useEffect } from 'react';
import { 
  FaCalendarAlt, 
  FaTrash, 
  FaEdit, 
  FaPlus, 
  FaSave, 
  FaTimes, 
  FaUser, 
  FaBook, 
  FaClock, 
  FaMapMarkerAlt, 
  FaUsers, 
  FaChalkboardTeacher, 
  FaClipboardList,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUndo 
} from 'react-icons/fa';

const diasSemana = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
];

function getFechasEntreDias(fechaInicio, fechaFin, diaSemana) {
  const fechas = [];
  const dias = {
    'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3,
    'Jueves': 4, 'Viernes': 5, 'Sábado': 6
  };
  let actual = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  actual.setHours(0,0,0,0);
  fin.setHours(0,0,0,0);

  // Buscar el primer día correcto
  while (actual.getDay() !== dias[diaSemana]) {
    actual.setDate(actual.getDate() + 1);
  }
  // Agregar todos los días correctos
  while (actual <= fin) {
    fechas.push(new Date(actual));
    actual.setDate(actual.getDate() + 7);
  }
  return fechas;
}

const AsignacionProfesores = ({
  profesores = [],
  cursos = [],
  asignaciones = [],
  fetchAsignaciones,
  token,
  showError,
  showSuccess
}) => {
  const [form, setForm] = useState({
    profesor: '',
    curso: '',
    dia: '',
    horaInicio: '',
    horaFin: '',
    fechaInicio: '',
    fechaFin: '',
    aula: '',
    notas: '',
    maxAlumnos: ''
  });
  const [errores, setErrores] = useState({});
  const [editIndex, setEditIndex] = useState(null);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [ultimoRegistro, setUltimoRegistro] = useState(null);

  // Limpiar mensaje después de 5 segundos
  useEffect(() => {
    if (mensaje) {
      const timer = setTimeout(() => setMensaje(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [mensaje]);

  // Validaciones en tiempo real
  const validar = (f = form) => {
    const e = {};
    if (!f.profesor) e.profesor = 'Seleccione un profesor';
    if (!f.curso) e.curso = 'Seleccione un curso';
    if (!f.dia) e.dia = 'Seleccione un día';
    if (!f.horaInicio) e.horaInicio = 'Ingrese la hora de inicio';
    if (!f.horaFin) e.horaFin = 'Ingrese la hora de fin';
    if (!f.fechaInicio) e.fechaInicio = 'Ingrese la fecha de inicio';
    if (!f.fechaFin) e.fechaFin = 'Ingrese la fecha de fin';
    
    // Validaciones de fechas
    if (f.fechaInicio && f.fechaFin && new Date(f.fechaFin) < new Date(f.fechaInicio)) {
      e.fechaFin = 'La fecha de fin debe ser posterior a la fecha de inicio';
    }
    
    // Validaciones de horas
    if (f.horaInicio && f.horaFin && f.horaFin <= f.horaInicio) {
      e.horaFin = 'La hora de fin debe ser posterior a la hora de inicio';
    }
    
    // Validación de máximo de alumnos
    if (!f.maxAlumnos) {
      e.maxAlumnos = 'Ingrese la cantidad máxima de alumnos';
    } else if (isNaN(f.maxAlumnos) || parseInt(f.maxAlumnos) <= 0) {
      e.maxAlumnos = 'Ingrese una cantidad válida mayor a 0';
    }
    
    return e;
  };

  const handleChange = e => {
    const { name, value } = e.target;
    const newForm = { ...form, [name]: value };
    setForm(newForm);
    
    // Validar en tiempo real
    const nuevosErrores = validar(newForm);
    setErrores(nuevosErrores);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    
    // Validar formulario
    const eValid = validar();
    setErrores(eValid);
    if (Object.keys(eValid).length > 0) {
      setMensaje('Por favor corrija los errores en el formulario');
      return;
    }

    setLoading(true);
    setMensaje('');
    
    try {
      // Preparar datos para enviar
      const profesorSeleccionado = profesores.find(p => String(p.id) === String(form.profesor));
      const cursoSeleccionado = cursos.find(c => String(c.id) === String(form.curso));

      if (!profesorSeleccionado) {
        throw new Error('Profesor no encontrado');
      }
      if (!cursoSeleccionado) {
        throw new Error('Curso no encontrado');
      }

      const body = {
        profesorId: parseInt(form.profesor),
        profesorNombre: profesorSeleccionado.nombre,
        cursoId: parseInt(form.curso),
        cursoNombre: cursoSeleccionado.nombre,
        diaSemana: form.dia,
        horaInicio: form.horaInicio,
        horaFin: form.horaFin,
        fechaInicio: form.fechaInicio,
        fechaFin: form.fechaFin,
        aula: form.aula.trim(),
        notas: form.notas.trim(),
        maxAlumnos: parseInt(form.maxAlumnos)
      };

      let url = 'http://localhost:3007/asignaciones';
      let method = 'POST';
      
      // Si estamos editando, usar PUT y agregar el ID
      if (editIndex !== null && editId) {
        url = `http://localhost:3007/asignaciones/${editId}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method: method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Error HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      // Mostrar datos del registro recién creado o editado
      setUltimoRegistro({
        ...body,
        id: data.id || editId,
        profesor_nombre: body.profesorNombre,
        curso_nombre: body.cursoNombre,
      });

      const mensajeExito = editIndex !== null ? 'Asignación actualizada exitosamente' : 'Asignación creada exitosamente';
      setMensaje(mensajeExito);
      showSuccess && showSuccess(mensajeExito);

      // Recargar asignaciones
      if (fetchAsignaciones) {
        await fetchAsignaciones();
      }

      // Limpiar formulario
      handleReset();

    } catch (err) {
      console.error('Error en handleSubmit:', err);
      const mensajeError = err.message || 'Error de conexión con el servidor';
      setMensaje(mensajeError);
      showError && showError(mensajeError);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (idx) => {
    if (idx < 0 || idx >= asignaciones.length) {
      showError && showError('Asignación no válida');
      return;
    }

    const a = asignaciones[idx];
    
    // Buscar IDs de profesor y curso
    const profesorId = a.profesor_id || profesores.find(p => p.nombre === (a.profesor_nombre || a.profesor))?.id || '';
    const cursoId = a.curso_id || cursos.find(c => c.nombre === (a.curso_nombre || a.curso))?.id || '';

    setForm({
      profesor: String(profesorId),
      curso: String(cursoId),
      dia: a.dia_semana || a.dia || '',
      horaInicio: a.hora_inicio || a.horaInicio || '',
      horaFin: a.hora_fin || a.horaFin || '',
      fechaInicio: a.fecha_inicio || a.fechaInicio || '',
      fechaFin: a.fecha_fin || a.fechaFin || '',
      aula: a.aula || '',
      notas: a.notas || '',
      maxAlumnos: String(a.max_alumnos || a.maxAlumnos || '')
    });
    
    setEditIndex(idx);
    setEditId(a.id);
    setErrores({});
    setMensaje('');
  };

  const handleDelete = async (idx) => {
    if (idx < 0 || idx >= asignaciones.length) {
      showError && showError('Asignación no válida');
      return;
    }

    const asignacion = asignaciones[idx];
    
    if (!asignacion.id) {
      showError && showError('ID de asignación no válido');
      return;
    }

    if (!window.confirm('¿Está seguro de que desea eliminar esta asignación?')) return;
    
    setLoading(true);
    setMensaje('');
    
    try {
      const res = await fetch(`http://localhost:3006/asignaciones/${asignacion.id}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Error HTTP ${res.status}: ${res.statusText}`);
      }
      
      const mensajeExito = 'Asignación eliminada exitosamente';
      setMensaje(mensajeExito);
      showSuccess && showSuccess(mensajeExito);
      
      // Recargar asignaciones
      if (fetchAsignaciones) {
        await fetchAsignaciones();
      }
      
    } catch (err) {
      console.error('Error en handleDelete:', err);
      const mensajeError = err.message || 'Error de conexión al eliminar';
      setMensaje(mensajeError);
      showError && showError(mensajeError);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({
      profesor: '',
      curso: '',
      dia: '',
      horaInicio: '',
      horaFin: '',
      fechaInicio: '',
      fechaFin: '',
      aula: '',
      notas: '',
      maxAlumnos: ''
    });
    setErrores({});
    setEditIndex(null);
    setEditId(null);
    setMensaje('');
  };

  const cancelEdit = () => {
    handleReset();
  };

  // Componente para mostrar la última asignación con diseño más integrado
  const UltimaAsignacionCard = ({ registro, onClose }) => (
    <div className="mt-4 bg-white border rounded-3 shadow-sm overflow-hidden">
      <div className="bg-success bg-gradient bg-opacity-10 p-3 border-bottom">
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <div className="bg-success text-white rounded-circle p-2" style={{width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <FaCheckCircle size={16} />
            </div>
            <div>
              <h6 className="fw-bold mb-0 text-success">Asignación Registrada</h6>
              <small className="text-muted">ID #{registro.id}</small>
            </div>
          </div>
          <button className="btn btn-sm btn-light rounded-circle" onClick={onClose} title="Cerrar">
            <FaTimes />
          </button>
        </div>
      </div>
      
      <div className="p-3">
        <div className="row g-3 mb-2">
          <div className="col-md-6">
            <div className="card h-100 border-0 bg-light">
              <div className="card-body py-2 px-3">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <FaChalkboardTeacher className="text-primary" size={16} />
                  <h6 className="card-title mb-0 fw-bold">Profesor</h6>
                </div>
                <p className="card-text mb-0">{registro.profesor_nombre}</p>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card h-100 border-0 bg-light">
              <div className="card-body py-2 px-3">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <FaBook className="text-info" size={16} />
                  <h6 className="card-title mb-0 fw-bold">Curso</h6>
                </div>
                <p className="card-text mb-0">{registro.curso_nombre}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="row g-3">
          <div className="col-md-4">
            <div className="d-flex align-items-center gap-2">
              <div className="bg-warning bg-opacity-10 p-1 rounded">
                <FaClock className="text-warning" size={14} />
              </div>
              <div>
                <div className="fw-semibold small">Horario</div>
                <span className="small">{registro.diaSemana || registro.dia} • {registro.horaInicio} - {registro.horaFin}</span>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="d-flex align-items-center gap-2">
              <div className="bg-danger bg-opacity-10 p-1 rounded">
                <FaMapMarkerAlt className="text-danger" size={14} />
              </div>
              <div>
                <div className="fw-semibold small">Ubicación</div>
                <span className="small">{registro.aula || 'No especificada'}</span>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="d-flex align-items-center gap-2">
              <div className="bg-primary bg-opacity-10 p-1 rounded">
                <FaUsers className="text-primary" size={14} />
              </div>
              <div>
                <div className="fw-semibold small">Capacidad</div>
                <span className="small">Máx. {registro.maxAlumnos} alumnos</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-3 pt-2 border-top">
          <div className="d-flex gap-3">
            <div className="small text-muted">
              <FaCalendarAlt className="me-1" size={12} /> Desde: {registro.fechaInicio}
            </div>
            <div className="small text-muted">
              <FaCalendarAlt className="me-1" size={12} /> Hasta: {registro.fechaFin}
            </div>
          </div>
          {registro.notas && (
            <div className="small text-muted mt-2">
              <FaClipboardList className="me-1" size={12} /> {registro.notas}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Modifica fetchAsignaciones para limpiar ultimoRegistro si no hay asignaciones
  useEffect(() => {
    if (asignaciones && asignaciones.length === 0) {
      setUltimoRegistro(null);
    }
  }, [asignaciones]);

  return (
    <div className="container-fluid p-0">
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-primary bg-gradient text-white py-3">
          <div className="d-flex align-items-center">
            <div className="bg-white bg-opacity-25 rounded-circle p-2 me-3" style={{width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <FaCalendarAlt size={18} className="text-white" />
            </div>
            <div>
              <h5 className="mb-0 fw-bold">
                {editIndex !== null ? 'Editar Asignación' : 'Nueva Asignación de Profesor'}
              </h5>
              <small className="opacity-75">Complete el formulario para {editIndex !== null ? 'actualizar' : 'crear'} una asignación</small>
            </div>
          </div>
        </div>

        <div className="card-body p-4">
          {mensaje && (
            <div className={`alert ${mensaje.includes('exitosamente') ? 'alert-success' : 'alert-danger'} alert-dismissible fade show d-flex align-items-center gap-2 mb-4`}>
              <div className={`rounded-circle p-1 ${mensaje.includes('exitosamente') ? 'bg-success' : 'bg-danger'} bg-opacity-25`}>
                {mensaje.includes('exitosamente') ? <FaCheckCircle size={16} /> : <FaExclamationTriangle size={16} />}
              </div>
              <div className="flex-grow-1">{mensaje}</div>
              <button type="button" className="btn-close" onClick={() => setMensaje('')} aria-label="Close"></button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="row g-3 mb-4">
              <div className="col-12">
                <h6 className="fw-bold text-primary mb-3 border-bottom pb-2">
                  <FaUser className="me-2" size={14} />
                  Información del Profesor y Curso
                </h6>
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Profesor *</label>
                <div className="input-group">
                  <span className="input-group-text bg-light">
                    <FaChalkboardTeacher size={16} />
                  </span>
                  <select
                    className={`form-select ${errores.profesor ? 'is-invalid' : ''}`}
                    name="profesor"
                    value={form.profesor}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="">Seleccione un profesor...</option>
                    {profesores.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                  {errores.profesor && <div className="invalid-feedback">{errores.profesor}</div>}
                </div>
              </div>
              
              <div className="col-md-6">
                <label className="form-label fw-semibold">Curso/Materia *</label>
                <div className="input-group">
                  <span className="input-group-text bg-light">
                    <FaBook size={16} />
                  </span>
                  <select
                    className={`form-select ${errores.curso ? 'is-invalid' : ''}`}
                    name="curso"
                    value={form.curso}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="">Seleccione un curso...</option>
                    {cursos.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                  {errores.curso && <div className="invalid-feedback">{errores.curso}</div>}
                </div>
              </div>
            </div>

            <div className="row g-3 mb-4">
              <div className="col-12">
                <h6 className="fw-bold text-primary mb-3 border-bottom pb-2">
                  <FaClock className="me-2" size={14} />
                  Horario y Período
                </h6>
              </div>
              
              <div className="col-md-4">
                <label className="form-label fw-semibold">Día *</label>
                <div className="input-group">
                  <span className="input-group-text bg-light">
                    <FaCalendarAlt size={16} />
                  </span>
                  <select 
                    className={`form-select ${errores.dia ? 'is-invalid' : ''}`}
                    name="dia" 
                    value={form.dia} 
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="">Seleccione...</option>
                    {diasSemana.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  {errores.dia && <div className="invalid-feedback">{errores.dia}</div>}
                </div>
              </div>
              
              <div className="col-md-4">
                <label className="form-label fw-semibold">Hora Inicio *</label>
                <div className="input-group">
                  <span className="input-group-text bg-light">
                    <FaClock size={16} />
                  </span>
                  <input 
                    type="time" 
                    className={`form-control ${errores.horaInicio ? 'is-invalid' : ''}`}
                    name="horaInicio" 
                    value={form.horaInicio} 
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {errores.horaInicio && <div className="invalid-feedback">{errores.horaInicio}</div>}
                </div>
              </div>
              
              <div className="col-md-4">
                <label className="form-label fw-semibold">Hora Fin *</label>
                <div className="input-group">
                  <span className="input-group-text bg-light">
                    <FaClock size={16} />
                  </span>
                  <input 
                    type="time" 
                    className={`form-control ${errores.horaFin ? 'is-invalid' : ''}`}
                    name="horaFin" 
                    value={form.horaFin} 
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {errores.horaFin && <div className="invalid-feedback">{errores.horaFin}</div>}
                </div>
              </div>
              
              <div className="col-md-6">
                <label className="form-label fw-semibold">Fecha Inicio *</label>
                <div className="input-group">
                  <span className="input-group-text bg-light">
                    <FaCalendarAlt size={16} />
                  </span>
                  <input 
                    type="date" 
                    className={`form-control ${errores.fechaInicio ? 'is-invalid' : ''}`}
                    name="fechaInicio" 
                    value={form.fechaInicio} 
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {errores.fechaInicio && <div className="invalid-feedback">{errores.fechaInicio}</div>}
                </div>
              </div>
              
              <div className="col-md-6">
                <label className="form-label fw-semibold">Fecha Fin *</label>
                <div className="input-group">
                  <span className="input-group-text bg-light">
                    <FaCalendarAlt size={16} />
                  </span>
                  <input 
                    type="date" 
                    className={`form-control ${errores.fechaFin ? 'is-invalid' : ''}`}
                    name="fechaFin" 
                    value={form.fechaFin} 
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {errores.fechaFin && <div className="invalid-feedback">{errores.fechaFin}</div>}
                </div>
              </div>
            </div>
            
            <div className="row g-3 mb-4">
              <div className="col-12">
                <h6 className="fw-bold text-primary mb-3 border-bottom pb-2">
                  <FaMapMarkerAlt className="me-2" size={14} />
                  Detalles Adicionales
                </h6>
              </div>
              
              <div className="col-md-4">
                <label className="form-label fw-semibold">Aula</label>
                <div className="input-group">
                  <span className="input-group-text bg-light">
                    <FaMapMarkerAlt size={16} />
                  </span>
                  <input 
                    type="text" 
                    className="form-control"
                    name="aula" 
                    value={form.aula} 
                    onChange={handleChange}
                    placeholder="Ej: Aula 101"
                    disabled={loading}
                  />
                </div>
              </div>
              
              <div className="col-md-4">
                <label className="form-label fw-semibold">Máx. Alumnos *</label>
                <div className="input-group">
                  <span className="input-group-text bg-light">
                    <FaUsers size={16} />
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className={`form-control ${errores.maxAlumnos ? 'is-invalid' : ''}`}
                    name="maxAlumnos"
                    value={form.maxAlumnos}
                    onChange={handleChange}
                    placeholder="30"
                    disabled={loading}
                  />
                  {errores.maxAlumnos && <div className="invalid-feedback">{errores.maxAlumnos}</div>}
                </div>
              </div>
              
              <div className="col-md-4">
                <label className="form-label fw-semibold">Notas</label>
                <div className="input-group">
                  <span className="input-group-text bg-light">
                    <FaClipboardList size={16} />
                  </span>
                  <input 
                    type="text" 
                    className="form-control"
                    name="notas" 
                    value={form.notas} 
                    onChange={handleChange}
                    placeholder="Información adicional (opcional)"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
            
            <div className="d-flex gap-2 justify-content-end border-top pt-4 mt-2">
              <button type="button" className="btn btn-outline-secondary" onClick={handleReset} disabled={loading}>
                <FaTimes className="me-1" size={14} />
                Limpiar
              </button>
              
              {editIndex !== null && (
                <button type="button" className="btn btn-warning" onClick={cancelEdit} disabled={loading}>
                  <FaUndo className="me-1" size={14} />
                  Cancelar Edición
                </button>
              )}
              
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Procesando...
                  </>
                ) : (
                  <>
                    {editIndex !== null ? <FaSave className="me-1" size={14} /> : <FaPlus className="me-1" size={14} />}
                    {editIndex !== null ? 'Actualizar Asignación' : 'Crear Asignación'}
                  </>
                )}
              </button>
            </div>
          </form>
          
          {ultimoRegistro && (
            <div className="mt-4">
              <UltimaAsignacionCard
                registro={ultimoRegistro}
                onClose={() => setUltimoRegistro(null)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AsignacionProfesores;