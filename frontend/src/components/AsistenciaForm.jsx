import React, { useState, useEffect } from 'react';
import { FaUser, FaBookOpen, FaCheck, FaTimes, FaSave, FaPlus, FaUserGraduate, FaClipboardCheck } from 'react-icons/fa';

function AsistenciaForm({ token, onSave, usuarios, clases, editingAsistencia, onCancel }) {
  const [form, setForm] = useState({ estudiante_id: '', materia_id: '', estado: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (editingAsistencia) {
      setForm({
        estudiante_id: editingAsistencia.estudiante_id || '',
        materia_id: editingAsistencia.materia_id || '',
        estado: editingAsistencia.estado || '',
      });
    } else {
      setForm({ estudiante_id: '', materia_id: '', estado: '' });
    }
    setErrors({});
    setTouched({});
  }, [editingAsistencia]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  }

  function handleBlur(e) {
    const { name } = e.target;
    setTouched({ ...touched, [name]: true });
    validateField(name, form[name]);
  }

  function validateField(name, value) {
    let error = '';
    
    if (!value) {
      switch (name) {
        case 'estudiante_id':
          error = 'Selecciona un estudiante';
          break;
        case 'materia_id':
          error = 'Selecciona una clase';
          break;
        case 'estado':
          error = 'Selecciona un estado';
          break;
        default:
          error = 'Este campo es requerido';
      }
    }
    
    setErrors({ ...errors, [name]: error });
    return !error;
  }

  function validateForm() {
    const newErrors = {};
    let isValid = true;

    Object.keys(form).forEach(key => {
      if (!validateField(key, form[key])) {
        isValid = false;
      }
    });

    return isValid;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!validateForm()) {
      setTouched({ estudiante_id: true, materia_id: true, estado: true });
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSave(form);
      // Reset form if adding new asistencia
      if (!editingAsistencia) {
        setForm({ estudiante_id: '', materia_id: '', estado: '' });
        setTouched({});
      }
    } catch (error) {
      console.error('Error al guardar:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const estudiantesOptions = usuarios?.filter(u => u.rol === 'estudiante') || [];

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'presente': return '#10b981';
      case 'ausente': return '#ef4444';
      case 'justificado': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'presente': return <FaCheck size={14} />;
      case 'ausente': return <FaTimes size={14} />;
      case 'justificado': return <FaClipboardCheck size={14} />;
      default: return null;
    }
  };

  return (
    <>
      <style jsx>{`
        .asistencia-form {
          background: var(--bg-primary, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .asistencia-form::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
        }

        .form-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border-color, #e2e8f0);
        }

        .form-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .form-title {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary, #0f172a);
          letter-spacing: -0.025em;
        }

        .form-subtitle {
          margin: 4px 0 0 0;
          font-size: 14px;
          color: var(--text-secondary, #64748b);
        }

        .form-grid {
          display: grid;
          gap: 24px;
        }

        .form-group {
          position: relative;
        }

        .form-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 14px;
          color: var(--text-primary, #0f172a);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .form-select {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid var(--border-color, #e2e8f0);
          border-radius: 12px;
          background: var(--bg-secondary, #f8fafc);
          color: var(--text-primary, #0f172a);
          font-size: 16px;
          transition: all 0.3s ease;
          appearance: none;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
          background-position: right 12px center;
          background-repeat: no-repeat;
          background-size: 16px;
          padding-right: 40px;
        }

        .form-select:focus {
          outline: none;
          border-color: #3b82f6;
          background: var(--bg-primary, #ffffff);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          transform: translateY(-1px);
        }

        .form-select.error {
          border-color: #ef4444;
          background: #fef2f2;
        }

        .form-select.success {
          border-color: #10b981;
          background: #f0fdf4;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #ef4444;
          font-size: 12px;
          margin-top: 6px;
          animation: slideInUp 0.3s ease;
        }

        .estado-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
        }

        .estado-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid var(--border-color, #e2e8f0);
        }

        .btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 14px 24px;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          position: relative;
          overflow: hidden;
        }

        .btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transition: left 0.5s ease;
        }

        .btn:hover::before {
          left: 100%;
        }

        .btn-primary {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
          flex: 1;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.5);
        }

        .btn-primary:active {
          transform: translateY(0);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .btn-secondary {
          background: var(--bg-tertiary, #f1f5f9);
          color: var(--text-secondary, #64748b);
          border: 2px solid var(--border-color, #e2e8f0);
        }

        .btn-secondary:hover {
          background: var(--bg-secondary, #e2e8f0);
          color: var(--text-primary, #0f172a);
          transform: translateY(-1px);
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .form-progress {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          transition: width 0.3s ease;
        }

        /* Animaciones */
        @keyframes slideInUp {
          from {
            transform: translateY(10px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .fade-in {
          animation: fadeIn 0.5s ease;
        }

        /* Estados de validación */
        .form-group.has-error .form-select {
          border-color: #ef4444;
          background: #fef2f2;
        }

        .form-group.has-success .form-select {
          border-color: #10b981;
          background: #f0fdf4;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .asistencia-form {
            padding: 24px;
            margin: 16px;
          }

          .form-actions {
            flex-direction: column;
          }

          .form-title {
            font-size: 20px;
          }
        }
      `}</style>

      <div className="asistencia-form fade-in">
        {/* Header */}
        <div className="form-header">
          <div className="form-icon">
            <FaClipboardCheck size={20} />
          </div>
          <div>
            <h3 className="form-title">
              {editingAsistencia ? 'Editar Asistencia' : 'Nueva Asistencia'}
            </h3>
            <p className="form-subtitle">
              {editingAsistencia ? 'Modifica los datos de la asistencia' : 'Registra una nueva asistencia'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            {/* Estudiante */}
            <div className={`form-group ${touched.estudiante_id ? (errors.estudiante_id ? 'has-error' : 'has-success') : ''}`}>
              <label className="form-label">
                <FaUserGraduate size={14} />
                Estudiante
              </label>
              <select
                name="estudiante_id"
                value={form.estudiante_id}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`form-select ${errors.estudiante_id ? 'error' : touched.estudiante_id && form.estudiante_id ? 'success' : ''}`}
                required
              >
                <option value="">Seleccionar Estudiante</option>
                {estudiantesOptions.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} ({u.email})
                  </option>
                ))}
              </select>
              {touched.estudiante_id && errors.estudiante_id && (
                <div className="error-message">
                  <FaTimes size={12} />
                  {errors.estudiante_id}
                </div>
              )}
            </div>

            {/* Clase */}
            <div className={`form-group ${touched.materia_id ? (errors.materia_id ? 'has-error' : 'has-success') : ''}`}>
              <label className="form-label">
                <FaBookOpen size={14} />
                Clase
              </label>
              <select
                name="materia_id"
                value={form.materia_id}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`form-select ${errors.materia_id ? 'error' : touched.materia_id && form.materia_id ? 'success' : ''}`}
                required
              >
                <option value="">Seleccionar Clase</option>
                {clases?.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              {touched.materia_id && errors.materia_id && (
                <div className="error-message">
                  <FaTimes size={12} />
                  {errors.materia_id}
                </div>
              )}
            </div>

            {/* Estado */}
            <div className={`form-group ${touched.estado ? (errors.estado ? 'has-error' : 'has-success') : ''}`}>
              <label className="form-label">
                <FaClipboardCheck size={14} />
                Estado de Asistencia
              </label>
              <select
                name="estado"
                value={form.estado}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`form-select ${errors.estado ? 'error' : touched.estado && form.estado ? 'success' : ''}`}
                required
                style={{
                  color: form.estado ? getEstadoColor(form.estado) : 'inherit'
                }}
              >
                <option value="">Seleccionar Estado</option>
                <option value="presente" style={{ color: '#10b981' }}>
                  ✓ Presente
                </option>
                <option value="ausente" style={{ color: '#ef4444' }}>
                  ✗ Ausente
                </option>
                <option value="justificado" style={{ color: '#f59e0b' }}>
                  📋 Justificado
                </option>
              </select>
              {touched.estado && errors.estado && (
                <div className="error-message">
                  <FaTimes size={12} />
                  {errors.estado}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="spinner"></div>
                  Guardando...
                </>
              ) : (
                <>
                  {editingAsistencia ? <FaSave size={14} /> : <FaPlus size={14} />}
                  {editingAsistencia ? 'Guardar Cambios' : 'Registrar Asistencia'}
                </>
              )}
            </button>

            {editingAsistencia && (
              <button
                type="button"
                onClick={onCancel}
                className="btn btn-secondary"
                disabled={isSubmitting}
              >
                <FaTimes size={14} />
                Cancelar
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div 
            className="form-progress"
            style={{
              width: `${(Object.values(form).filter(v => v).length / Object.keys(form).length) * 100}%`
            }}
          ></div>
        </form>
      </div>
    </>
  );
}

export default AsistenciaForm;
