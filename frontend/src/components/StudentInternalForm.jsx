import React, { useCallback, useEffect, useState } from 'react';
import { FaIdBadge, FaSave, FaSearch } from 'react-icons/fa';
import { formsApi } from '../api';

const makeInitialState = () => ({
  dni: '',
  nombres: '',
  apellidos: '',
  telefono: '',
  correo: '',
  direccion: '',
  familiarNombre: '',
  familiarRelacion: '',
  familiarOcupacion: '',
  familiarTelefono: '',
  familiarCorreo: '',
  tipoSangre: '',
  alergias: '',
  enfermedadesCronicas: '',
  seguroMedico: '',
  personaAutorizada: '',
  telefonoEmergencia: '',
});

const StudentInternalForm = ({ showError, showSuccess }) => {
  const [formData, setFormData] = useState(makeInitialState);
  const [codigoInterno, setCodigoInterno] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadCurrentForm = useCallback(async () => {
    setLoading(true);
    try {
      const record = await formsApi.getStudentInternalForm();
      if (record) {
        setCodigoInterno(record.codigoInterno || '');
        setFormData({
          dni: record.dni || '',
          nombres: record.nombres || '',
          apellidos: record.apellidos || '',
          telefono: record.telefono || '',
          correo: record.correo || '',
          direccion: record.direccion || '',
          familiarNombre: record.familiarNombre || '',
          familiarRelacion: record.familiarRelacion || '',
          familiarOcupacion: record.familiarOcupacion || '',
          familiarTelefono: record.familiarTelefono || '',
          familiarCorreo: record.familiarCorreo || '',
          tipoSangre: record.tipoSangre || '',
          alergias: record.alergias || '',
          enfermedadesCronicas: record.enfermedadesCronicas || '',
          seguroMedico: record.seguroMedico || '',
          personaAutorizada: record.personaAutorizada || '',
          telefonoEmergencia: record.telefonoEmergencia || '',
        });
      }
    } catch (error) {
      showError?.(error.message || 'No se pudo cargar tu ficha interna');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadCurrentForm();
  }, [loadCurrentForm]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLookup = async () => {
    if (!formData.dni || formData.dni.trim().length < 8) {
      showError?.('Ingresa un DNI válido para consultar tus nombres');
      return;
    }
    try {
      const data = await formsApi.lookupByDni(formData.dni.trim());
      const nombres = data?.nombres || '';
      const apellidos = [data?.apellidoPaterno, data?.apellidoMaterno].filter(Boolean).join(' ');
      const nombreCompleto = data?.nombreCompleto || [nombres, apellidos].filter(Boolean).join(' ');
      if (!nombreCompleto) {
        showError?.('No se encontraron datos para este DNI');
        return;
      }
      const [nombresExtraidos, ...resto] = nombreCompleto.split(',').map((part) => part.trim());
      if (apellidos) {
        handleChange('apellidos', apellidos);
      } else if (resto.length) {
        handleChange('apellidos', resto.join(' '));
      }
      handleChange('nombres', nombresExtraidos || nombres || nombreCompleto);
      showSuccess?.('Datos cargados automáticamente');
    } catch (error) {
      showError?.(error.message || 'No se pudo consultar el DNI');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await formsApi.saveStudentInternalForm(formData);
      setCodigoInterno(response.codigoInterno || codigoInterno);
      showSuccess?.(response.message || 'Ficha guardada correctamente');
    } catch (error) {
      showError?.(error.message || 'No se pudo guardar la ficha interna');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card shadow-sm border-0">
      <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-0">Ficha Interna del Estudiante</h5>
          <small>Actualiza tu información personal y de emergencia</small>
        </div>
        {codigoInterno && (
          <span className="badge bg-light text-primary">
            <FaIdBadge className="me-2" />
            Código interno: {codigoInterno}
          </span>
        )}
      </div>
      <div className="card-body">
        {loading ? (
          <p className="text-muted">Cargando tus datos…</p>
        ) : (
          <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-md-4">
              <label className="form-label">DNI</label>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  value={formData.dni}
                  onChange={(e) => handleChange('dni', e.target.value)}
                  required
                />
                <button type="button" className="btn btn-outline-secondary" onClick={handleLookup}>
                  <FaSearch />
                </button>
              </div>
            </div>
            <div className="col-md-4">
              <label className="form-label">Nombres</label>
              <input
                type="text"
                className="form-control"
                value={formData.nombres}
                onChange={(e) => handleChange('nombres', e.target.value)}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Apellidos</label>
              <input
                type="text"
                className="form-control"
                value={formData.apellidos}
                onChange={(e) => handleChange('apellidos', e.target.value)}
                required
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Teléfono</label>
              <input
                type="tel"
                className="form-control"
                value={formData.telefono}
                onChange={(e) => handleChange('telefono', e.target.value)}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Correo</label>
              <input
                type="email"
                className="form-control"
                value={formData.correo}
                onChange={(e) => handleChange('correo', e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Dirección</label>
              <input
                type="text"
                className="form-control"
                value={formData.direccion}
                onChange={(e) => handleChange('direccion', e.target.value)}
                required
              />
            </div>

            <div className="col-12">
              <h6 className="text-secondary text-uppercase fw-bold mt-3">Información familiar</h6>
            </div>
            <div className="col-md-4">
              <label className="form-label">Nombre del apoderado</label>
              <input
                type="text"
                className="form-control"
                value={formData.familiarNombre}
                onChange={(e) => handleChange('familiarNombre', e.target.value)}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Relación</label>
              <input
                type="text"
                className="form-control"
                value={formData.familiarRelacion}
                onChange={(e) => handleChange('familiarRelacion', e.target.value)}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Ocupación</label>
              <input
                type="text"
                className="form-control"
                value={formData.familiarOcupacion}
                onChange={(e) => handleChange('familiarOcupacion', e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Teléfono del apoderado</label>
              <input
                type="tel"
                className="form-control"
                value={formData.familiarTelefono}
                onChange={(e) => handleChange('familiarTelefono', e.target.value)}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Correo del apoderado</label>
              <input
                type="email"
                className="form-control"
                value={formData.familiarCorreo}
                onChange={(e) => handleChange('familiarCorreo', e.target.value)}
              />
            </div>

            <div className="col-12">
              <h6 className="text-secondary text-uppercase fw-bold mt-3">Información médica</h6>
            </div>
            <div className="col-md-3">
              <label className="form-label">Tipo de sangre</label>
              <input
                type="text"
                className="form-control"
                value={formData.tipoSangre}
                onChange={(e) => handleChange('tipoSangre', e.target.value)}
                required
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Alergias</label>
              <input
                type="text"
                className="form-control"
                value={formData.alergias}
                onChange={(e) => handleChange('alergias', e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Enfermedades crónicas</label>
              <input
                type="text"
                className="form-control"
                value={formData.enfermedadesCronicas}
                onChange={(e) => handleChange('enfermedadesCronicas', e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Seguro médico</label>
              <input
                type="text"
                className="form-control"
                value={formData.seguroMedico}
                onChange={(e) => handleChange('seguroMedico', e.target.value)}
              />
            </div>

            <div className="col-12">
              <h6 className="text-secondary text-uppercase fw-bold mt-3">Contacto de emergencia</h6>
            </div>
            <div className="col-md-6">
              <label className="form-label">Persona autorizada para recoger</label>
              <input
                type="text"
                className="form-control"
                value={formData.personaAutorizada}
                onChange={(e) => handleChange('personaAutorizada', e.target.value)}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Teléfono de emergencia</label>
              <input
                type="tel"
                className="form-control"
                value={formData.telefonoEmergencia}
                onChange={(e) => handleChange('telefonoEmergencia', e.target.value)}
                required
              />
            </div>

            <div className="col-12 text-end mt-3">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <FaSave className="me-2" />
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default StudentInternalForm;
