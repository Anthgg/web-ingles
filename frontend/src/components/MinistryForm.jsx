import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaPlus, FaSave, FaSearch, FaSync, FaTrash } from 'react-icons/fa';
import { formsApi } from '../api';

const makeEmptyInstitution = () => ({
  nombre: '',
  tipoGestion: '',
  nivelEducativo: '',
  turno: '',
  direccion: '',
  ugel: '',
});

const makeEmptyPersonal = () => ({
  nombre: '',
  dni: '',
  cargo: '',
  especialidad: '',
  condicionLaboral: '',
});

const makeEmptyStudent = () => ({
  nombreCompleto: '',
  dni: '',
  sexo: '',
  fechaNacimiento: '',
  grado: '',
  seccion: '',
  anioAcademico: '',
  situacionMatricula: '',
  lenguaMaterna: '',
  tipoDiscapacidad: '',
  academicoNotas: '',
  academicoAsistencia: '',
  academicoPromocion: '',
});

const encodeNotas = (value) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    return trimmed;
  }
};

const decodeNotas = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return '';
  }
};

const MinistryForm = ({ showError, showSuccess }) => {
  const [institution, setInstitution] = useState(makeEmptyInstitution);
  const [personal, setPersonal] = useState([makeEmptyPersonal()]);
  const [students, setStudents] = useState([makeEmptyStudent()]);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('personal');
  const [submitting, setSubmitting] = useState(false);
  const [forms, setForms] = useState([]);
  const [editingCodigo, setEditingCodigo] = useState('');
  const [selectedForm, setSelectedForm] = useState(null);

  const resetForm = useCallback(() => {
    setInstitution(makeEmptyInstitution);
    setPersonal([makeEmptyPersonal()]);
    setStudents([makeEmptyStudent()]);
    setEditingCodigo('');
    setSelectedForm(null);
    setActiveSection('personal');
  }, []);

  const loadForms = useCallback(async () => {
    setLoading(true);
    try {
      const data = await formsApi.listMinistryForms();
      setForms(Array.isArray(data) ? data : []);
    } catch (error) {
      showError?.(error.message || 'No se pudieron cargar los formularios');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  const handleInstitutionChange = (field, value) => {
    setInstitution((prev) => ({ ...prev, [field]: value }));
  };

  const updatePersonalField = (index, field, value) => {
    setPersonal((prev) => prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)));
  };

  const updateStudentField = (index, field, value) => {
    setStudents((prev) => prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)));
  };

  const addPersonalRow = () => setPersonal((prev) => [...prev, makeEmptyPersonal()]);
  const removePersonalRow = (index) => {
    setPersonal((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
  };

  const addStudentRow = () => setStudents((prev) => [...prev, makeEmptyStudent()]);
  const removeStudentRow = (index) => {
    setStudents((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
  };

  const handleLookupPersonal = async (index) => {
    const dni = personal[index]?.dni;
    if (!dni || dni.trim().length < 8) {
      showError?.('Ingresa un DNI válido antes de consultar');
      return;
    }
    try {
      const data = await formsApi.lookupByDni(dni.trim());
      const nombre = data?.nombreCompleto || [data?.nombres, data?.apellidoPaterno, data?.apellidoMaterno].filter(Boolean).join(' ');
      if (!nombre) {
        showError?.('El servicio no devolvió un nombre asociado a ese DNI');
        return;
      }
      updatePersonalField(index, 'nombre', nombre);
      showSuccess?.('Nombre cargado automáticamente');
    } catch (error) {
      showError?.(error.message || 'No fue posible consultar el DNI');
    }
  };

  const handleLookupStudent = async (index) => {
    const dni = students[index]?.dni;
    if (!dni || dni.trim().length < 8) {
      showError?.('Ingresa un DNI válido antes de consultar');
      return;
    }
    try {
      const data = await formsApi.lookupByDni(dni.trim());
      const nombre = data?.nombreCompleto || [data?.nombres, data?.apellidoPaterno, data?.apellidoMaterno].filter(Boolean).join(' ');
      if (!nombre) {
        showError?.('El servicio no devolvió un nombre asociado a ese DNI');
        return;
      }
      updateStudentField(index, 'nombreCompleto', nombre);
      showSuccess?.('Nombre cargado automáticamente');
    } catch (error) {
      showError?.(error.message || 'No fue posible consultar el DNI');
    }
  };

  const buildPayload = () => ({
    institucion: institution,
    personal: personal
      .map((item) => ({
        ...item,
        dni: (item.dni || '').trim(),
        nombre: (item.nombre || '').trim(),
        cargo: (item.cargo || '').trim(),
      }))
      .filter((item) => item.dni && item.nombre && item.cargo),
    estudiantes: students
      .map((item) => ({
        nombreCompleto: (item.nombreCompleto || '').trim(),
        dni: (item.dni || '').trim(),
        sexo: item.sexo || '',
        fechaNacimiento: item.fechaNacimiento || '',
        grado: item.grado || '',
        seccion: item.seccion || '',
        anioAcademico: item.anioAcademico || '',
        situacionMatricula: item.situacionMatricula || '',
        lenguaMaterna: item.lenguaMaterna || '',
        tipoDiscapacidad: item.tipoDiscapacidad || '',
        academico: {
          notas: encodeNotas(item.academicoNotas),
          asistencia: item.academicoAsistencia || '',
          promocion: item.academicoPromocion || '',
        },
      }))
      .filter((item) => item.dni && item.nombreCompleto),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = buildPayload();
    if (!payload.personal.length) {
      showError?.('Registra al menos un miembro del personal');
      return;
    }
    if (!payload.estudiantes.length) {
      showError?.('Registra al menos un estudiante');
      return;
    }

    setSubmitting(true);
    try {
      if (editingCodigo) {
        await formsApi.updateMinistryForm(editingCodigo, payload);
        showSuccess?.('Formulario actualizado correctamente');
      } else {
        const response = await formsApi.createMinistryForm(payload);
        showSuccess?.(`Formulario creado. Código modular: ${response.codigoModular}`);
        setEditingCodigo(response.codigoModular);
      }
      await loadForms();
    } catch (error) {
      showError?.(error.message || 'Error al guardar el formulario');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectForm = async (codigo) => {
    if (!codigo) return;
    setLoading(true);
    try {
      const data = await formsApi.getMinistryForm(codigo);
      setEditingCodigo(data.codigoModular || codigo);
      setSelectedForm(data);
  setActiveSection('personal');
      setInstitution({
        nombre: data?.institucion?.nombre || '',
        tipoGestion: data?.institucion?.tipoGestion || '',
        nivelEducativo: data?.institucion?.nivelEducativo || '',
        turno: data?.institucion?.turno || '',
        direccion: data?.institucion?.direccion || '',
        ugel: data?.institucion?.ugel || '',
      });
      setPersonal((data?.personal || []).map((item) => ({
        nombre: item.nombre || '',
        dni: item.dni || '',
        cargo: item.cargo || '',
        especialidad: item.especialidad || '',
        condicionLaboral: item.condicionLaboral || '',
      })) || [makeEmptyPersonal()]);
      const mappedStudents = (data?.estudiantes || []).map((item) => ({
        nombreCompleto: item.nombreCompleto || '',
        dni: item.dni || '',
        sexo: item.sexo || '',
        fechaNacimiento: item.fechaNacimiento || '',
        grado: item.grado || '',
        seccion: item.seccion || '',
        anioAcademico: item.anioAcademico || '',
        situacionMatricula: item.situacionMatricula || '',
        lenguaMaterna: item.lenguaMaterna || '',
        tipoDiscapacidad: item.tipoDiscapacidad || '',
        academicoNotas: decodeNotas(item?.academico?.notas),
        academicoAsistencia: item?.academico?.asistencia ?? '',
        academicoPromocion: item?.academico?.promocion || '',
      }));
      setStudents(mappedStudents.length ? mappedStudents : [makeEmptyStudent()]);
    } catch (error) {
      showError?.(error.message || 'No se pudo cargar el formulario seleccionado');
    } finally {
      setLoading(false);
    }
  };

  const formSummary = useMemo(() => (
    Array.isArray(forms)
      ? forms.map((item) => ({
          codigo: item.codigoModular,
          nombre: item?.institucion?.nombre || 'Institución sin nombre',
          personal: item?.personal?.length || 0,
          estudiantes: item?.estudiantes?.length || 0,
        }))
      : []
  ), [forms]);

  return (
    <div className="row g-4">
      <div className="col-lg-8">
        <form onSubmit={handleSubmit} className="card shadow-sm border-0">
          <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-0">Formulario del Ministerio</h5>
              <small>{editingCodigo ? `Editando código modular ${editingCodigo}` : 'Crear nuevo registro institucional'}</small>
            </div>
            <div className="d-flex gap-2">
              {editingCodigo && (
                <button
                  type="button"
                  className="btn btn-outline-light btn-sm"
                  onClick={resetForm}
                  disabled={submitting}
                >
                  <FaSync className="me-2" />
                  Nuevo
                </button>
              )}
              <button type="submit" className="btn btn-light btn-sm" disabled={submitting}>
                <FaSave className="me-2" />
                {submitting ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
          <div className="card-body">
            <h6 className="text-secondary text-uppercase fw-bold">Datos de la institución</h6>
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <label className="form-label">Nombre</label>
                <input
                  type="text"
                  className="form-control"
                  value={institution.nombre}
                  onChange={(e) => handleInstitutionChange('nombre', e.target.value)}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Tipo de gestión</label>
                <input
                  type="text"
                  className="form-control"
                  value={institution.tipoGestion}
                  onChange={(e) => handleInstitutionChange('tipoGestion', e.target.value)}
                  required
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Nivel educativo</label>
                <input
                  type="text"
                  className="form-control"
                  value={institution.nivelEducativo}
                  onChange={(e) => handleInstitutionChange('nivelEducativo', e.target.value)}
                  required
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Turno</label>
                <input
                  type="text"
                  className="form-control"
                  value={institution.turno}
                  onChange={(e) => handleInstitutionChange('turno', e.target.value)}
                  required
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">UGEL / DRE</label>
                <input
                  type="text"
                  className="form-control"
                  value={institution.ugel}
                  onChange={(e) => handleInstitutionChange('ugel', e.target.value)}
                  required
                />
              </div>
              <div className="col-12">
                <label className="form-label">Dirección</label>
                <input
                  type="text"
                  className="form-control"
                  value={institution.direccion}
                  onChange={(e) => handleInstitutionChange('direccion', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="card shadow-sm border-0 mb-4">
              <div className="card-header bg-light">
                <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between">
                  <div>
                    <h6 className="text-secondary text-uppercase fw-bold mb-2">Gestión de registros</h6>
                    <p className="text-muted mb-0 small">Selecciona qué tipo de información deseas completar o revisar.</p>
                  </div>
                  <div className="btn-group mt-3 mt-md-0" role="group" aria-label="Cambiar sección">
                    <button
                      type="button"
                      className={`btn btn-sm ${activeSection === 'personal' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setActiveSection('personal')}
                    >
                      Personal educativo
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${activeSection === 'students' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setActiveSection('students')}
                    >
                      Estudiantes
                    </button>
                  </div>
                </div>
              </div>
              <div className="card-body">
                {activeSection === 'personal' && (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="text-secondary text-uppercase fw-bold mb-0">Docentes y personal ({personal.length})</h6>
                      <button type="button" className="btn btn-outline-primary btn-sm" onClick={addPersonalRow}>
                        <FaPlus className="me-2" /> Agregar fila
                      </button>
                    </div>
                    {personal.map((item, index) => (
                      <div className="border rounded p-3 mb-3" key={`personal-${index}`}>
                        <div className="d-flex justify-content-between mb-3">
                          <strong>Personal #{index + 1}</strong>
                          {personal.length > 1 && (
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removePersonalRow(index)}>
                              <FaTrash />
                            </button>
                          )}
                        </div>
                        <div className="row g-3">
                          <div className="col-md-4">
                            <label className="form-label">DNI</label>
                            <div className="input-group">
                              <input
                                type="text"
                                className="form-control"
                                value={item.dni}
                                onChange={(e) => updatePersonalField(index, 'dni', e.target.value)}
                                required
                              />
                              <button type="button" className="btn btn-outline-secondary" onClick={() => handleLookupPersonal(index)}>
                                <FaSearch />
                              </button>
                            </div>
                          </div>
                          <div className="col-md-8">
                            <label className="form-label">Nombre</label>
                            <input
                              type="text"
                              className="form-control"
                              value={item.nombre}
                              onChange={(e) => updatePersonalField(index, 'nombre', e.target.value)}
                              required
                            />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label">Cargo</label>
                            <input
                              type="text"
                              className="form-control"
                              value={item.cargo}
                              onChange={(e) => updatePersonalField(index, 'cargo', e.target.value)}
                              required
                            />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label">Especialidad</label>
                            <input
                              type="text"
                              className="form-control"
                              value={item.especialidad}
                              onChange={(e) => updatePersonalField(index, 'especialidad', e.target.value)}
                            />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label">Condición laboral</label>
                            <input
                              type="text"
                              className="form-control"
                              value={item.condicionLaboral}
                              onChange={(e) => updatePersonalField(index, 'condicionLaboral', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {personal.length === 0 && (
                      <p className="text-muted text-center mb-0">Aún no has agregado personal. Usa "Agregar fila" para comenzar.</p>
                    )}
                  </div>
                )}

                {activeSection === 'students' && (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="text-secondary text-uppercase fw-bold mb-0">Datos del estudiante ({students.length})</h6>
                      <button type="button" className="btn btn-outline-primary btn-sm" onClick={addStudentRow}>
                        <FaPlus className="me-2" /> Agregar fila
                      </button>
                    </div>
                    {students.map((item, index) => (
                      <div className="border rounded p-3 mb-3" key={`student-${index}`}>
                        <div className="d-flex justify-content-between mb-3">
                          <strong>Estudiante #{index + 1}</strong>
                          {students.length > 1 && (
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeStudentRow(index)}>
                              <FaTrash />
                            </button>
                          )}
                        </div>
                        <div className="row g-3">
                          <div className="col-md-4">
                            <label className="form-label">DNI</label>
                            <div className="input-group">
                              <input
                                type="text"
                                className="form-control"
                                value={item.dni}
                                onChange={(e) => updateStudentField(index, 'dni', e.target.value)}
                                required
                              />
                              <button type="button" className="btn btn-outline-secondary" onClick={() => handleLookupStudent(index)}>
                                <FaSearch />
                              </button>
                            </div>
                          </div>
                          <div className="col-md-8">
                            <label className="form-label">Nombre completo</label>
                            <input
                              type="text"
                              className="form-control"
                              value={item.nombreCompleto}
                              onChange={(e) => updateStudentField(index, 'nombreCompleto', e.target.value)}
                              required
                            />
                          </div>
                          <div className="col-md-3">
                            <label className="form-label">Sexo</label>
                            <input
                              type="text"
                              className="form-control"
                              value={item.sexo}
                              onChange={(e) => updateStudentField(index, 'sexo', e.target.value)}
                              required
                            />
                          </div>
                          <div className="col-md-3">
                            <label className="form-label">Fecha de nacimiento</label>
                            <input
                              type="date"
                              className="form-control"
                              value={item.fechaNacimiento}
                              onChange={(e) => updateStudentField(index, 'fechaNacimiento', e.target.value)}
                              required
                            />
                          </div>
                          <div className="col-md-3">
                            <label className="form-label">Grado</label>
                            <input
                              type="text"
                              className="form-control"
                              value={item.grado}
                              onChange={(e) => updateStudentField(index, 'grado', e.target.value)}
                              required
                            />
                          </div>
                          <div className="col-md-3">
                            <label className="form-label">Sección</label>
                            <input
                              type="text"
                              className="form-control"
                              value={item.seccion}
                              onChange={(e) => updateStudentField(index, 'seccion', e.target.value)}
                              required
                            />
                          </div>
                          <div className="col-md-3">
                            <label className="form-label">Año académico</label>
                            <input
                              type="text"
                              className="form-control"
                              value={item.anioAcademico}
                              onChange={(e) => updateStudentField(index, 'anioAcademico', e.target.value)}
                              required
                            />
                          </div>
                          <div className="col-md-3">
                            <label className="form-label">Situación de matrícula</label>
                            <input
                              type="text"
                              className="form-control"
                              value={item.situacionMatricula}
                              onChange={(e) => updateStudentField(index, 'situacionMatricula', e.target.value)}
                              required
                            />
                          </div>
                          <div className="col-md-3">
                            <label className="form-label">Lengua materna</label>
                            <input
                              type="text"
                              className="form-control"
                              value={item.lenguaMaterna}
                              onChange={(e) => updateStudentField(index, 'lenguaMaterna', e.target.value)}
                              required
                            />
                          </div>
                          <div className="col-md-3">
                            <label className="form-label">Tipo de discapacidad</label>
                            <input
                              type="text"
                              className="form-control"
                              value={item.tipoDiscapacidad}
                              onChange={(e) => updateStudentField(index, 'tipoDiscapacidad', e.target.value)}
                            />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label">Notas (JSON o texto)</label>
                            <textarea
                              className="form-control"
                              rows={3}
                              value={item.academicoNotas}
                              onChange={(e) => updateStudentField(index, 'academicoNotas', e.target.value)}
                            />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label">Asistencia (%)</label>
                            <input
                              type="number"
                              className="form-control"
                              min="0"
                              max="100"
                              value={item.academicoAsistencia}
                              onChange={(e) => updateStudentField(index, 'academicoAsistencia', e.target.value)}
                            />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label">Promoción</label>
                            <input
                              type="text"
                              className="form-control"
                              value={item.academicoPromocion}
                              onChange={(e) => updateStudentField(index, 'academicoPromocion', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {students.length === 0 && (
                      <p className="text-muted text-center mb-0">Aún no has agregado estudiantes. Usa "Agregar fila" para comenzar.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>

      <div className="col-lg-4">
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-header bg-light d-flex justify-content-between align-items-center">
            <h6 className="mb-0">Registros existentes</h6>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={loadForms} disabled={loading}>
              <FaSync className="me-2" />
              Actualizar
            </button>
          </div>
          <div className="card-body" style={{ maxHeight: '420px', overflowY: 'auto' }}>
            {loading && <p className="text-muted">Cargando formularios…</p>}
            {!loading && formSummary.length === 0 && (
              <p className="text-muted">Aún no existen registros guardados.</p>
            )}
            {!loading && formSummary.length > 0 && (
              <ul className="list-group list-group-flush">
                {formSummary.map((item) => (
                  <li
                    key={item.codigo}
                    className={`list-group-item list-group-item-action ${editingCodigo === item.codigo ? 'active text-white' : ''}`}
                    onClick={() => handleSelectForm(item.codigo)}
                    role="button"
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{item.codigo}</strong>
                        <div className="small">{item.nombre}</div>
                      </div>
                      <span className="badge bg-secondary">
                        {item.personal} / {item.estudiantes}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {selectedForm && (
          <div className="card shadow-sm border-0">
            <div className="card-header bg-light">
              <h6 className="mb-0">Detalle (solo lectura)</h6>
            </div>
            <div className="card-body">
              <p className="small text-muted mb-2">Código modular: {selectedForm.codigoModular || editingCodigo}</p>
              <p className="fw-bold mb-1">{selectedForm?.institucion?.nombre}</p>
              <p className="mb-2 text-muted">{selectedForm?.institucion?.direccion}</p>
              <p className="mb-1"><strong>Docentes / administrativos:</strong> {selectedForm?.personal?.length ?? 0}</p>
              <p className="mb-0"><strong>Estudiantes:</strong> {selectedForm?.estudiantes?.length ?? 0}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MinistryForm;
