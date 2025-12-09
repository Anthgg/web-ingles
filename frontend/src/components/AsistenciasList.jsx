import React, { useEffect, useMemo, useState } from 'react';
import ConfirmDialog from './ui/ConfirmDialog';
import {
  FaEdit,
  FaTrash,
  FaPlus,
  FaSearch,
  FaUserGraduate,
  FaBookOpen,
  FaCalendarAlt,
  FaCheck,
  FaTimes,
  FaClipboardCheck,
  FaClock,
  FaDownload,
  FaSync,
  FaInfoCircle
} from 'react-icons/fa';

const API_BASE_URL = 'http://localhost:3003/asistencias';

const toIsoDate = (date) => date.toISOString().slice(0, 10);

const toLocalDateTime = (dateStr) => {
  if (!dateStr) return '';
  const dt = new Date(dateStr);
  if (Number.isNaN(dt.getTime())) {
    return '';
  }
  return dt.toISOString().slice(0, 16);
};

const parseDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  const time = parsed.getTime();
  return Number.isNaN(time) ? null : time;
};

const formatDateTime = (value) => {
  if (!value) return 'Sin fecha';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Sin fecha';
  }
  return parsed.toLocaleString('es-ES', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDateWithOptions = (value, options = {}) => {
  if (!value) return 'Sin fecha';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Sin fecha';
  }
  return parsed.toLocaleDateString('es-ES', options);
};

const buildRangeFromDays = (days = 30) => {
  const today = new Date();
  const startDate = new Date();
  startDate.setDate(today.getDate() - (days - 1));
  return {
    start: toIsoDate(startDate),
    end: toIsoDate(today)
  };
};

const getInitialFormState = () => ({
  estudiante_id: '',
  materia_id: '',
  estado: 'presente',
  fecha: ''
});

const AsistenciasList = ({
  asistencias = [],
  clases = [],
  usuarios = [],
  fetchAsistencias,
  token,
  showError,
  showSuccess
}) => {
  const [formData, setFormData] = useState(getInitialFormState);
  const [editMode, setEditMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterMateria, setFilterMateria] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [rangoFechas, setRangoFechas] = useState('30');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [asistenciaToDelete, setAsistenciaToDelete] = useState(null);
  const [selectedAsistencia, setSelectedAsistencia] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const resolvedAsistencias = useMemo(() => (Array.isArray(asistencias) ? asistencias : []), [asistencias]);
  const resolvedClases = useMemo(() => (Array.isArray(clases) ? clases : []), [clases]);
  const resolvedUsuarios = useMemo(() => (Array.isArray(usuarios) ? usuarios : []), [usuarios]);

  useEffect(() => {
    if (!fechaInicio || !fechaFin) {
      const range = buildRangeFromDays(Number(rangoFechas) || 30);
      setFechaInicio((prev) => prev || range.start);
      setFechaFin((prev) => prev || range.end);
    }
  }, [fechaInicio, fechaFin, rangoFechas]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getBackendFilters = () => {
    const filters = {};
    if (filterEstado) {
      filters.estado = filterEstado;
    }
    if (filterMateria) {
      filters.materiaId = filterMateria;
    }
    if (fechaInicio) {
      filters.desde = fechaInicio;
    }
    if (fechaFin) {
      filters.hasta = fechaFin;
    }
    return filters;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editMode ? `${API_BASE_URL}/${formData.id}` : API_BASE_URL;
      const method = editMode ? 'PUT' : 'POST';
      const payload = {
        estudiante_id: formData.estudiante_id,
        materia_id: formData.materia_id,
        estado: formData.estado
      };
      if (formData.fecha) {
        payload.fecha = formData.fecha;
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error || (editMode ? 'Error al actualizar asistencia' : 'Error al crear asistencia')
        );
      }

      showSuccess && showSuccess(editMode ? 'Asistencia actualizada correctamente' : 'Asistencia creada correctamente');
      setShowModal(false);
      if (fetchAsistencias) {
        await fetchAsistencias(getBackendFilters());
      }
    } catch (err) {
      console.error('Error al guardar asistencia:', err);
      showError && showError(err.message || 'No se pudo guardar la asistencia');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!res.ok) {
        throw new Error('Error al eliminar asistencia');
      }

      showSuccess && showSuccess('Asistencia eliminada correctamente');
      if (fetchAsistencias) {
        await fetchAsistencias(getBackendFilters());
      }
    } catch (err) {
      console.error('Error al eliminar asistencia:', err);
      showError && showError(err.message || 'No se pudo eliminar la asistencia');
    }
  };

  const handleDeleteClick = (asistencia) => {
    setAsistenciaToDelete(asistencia);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!asistenciaToDelete) return;
    await handleDelete(asistenciaToDelete.id);
    setAsistenciaToDelete(null);
    setShowDeleteDialog(false);
  };

  const handleEdit = (asistencia) => {
    setFormData({
      id: asistencia.id,
      estudiante_id: asistencia.estudiante_id,
      materia_id: asistencia.materia_id,
      estado: asistencia.estado,
      fecha: toLocalDateTime(asistencia.fecha)
    });
    setEditMode(true);
    setShowModal(true);
  };

  const handleAdd = () => {
    setFormData(getInitialFormState());
    setEditMode(false);
    setShowModal(true);
  };

  const handleSync = async () => {
    if (!fetchAsistencias) return;
    setSyncing(true);
    try {
      await fetchAsistencias(getBackendFilters());
      setLastSyncedAt(new Date());
      showSuccess && showSuccess('Asistencias sincronizadas');
    } catch (err) {
      console.error('Error al sincronizar asistencias:', err);
      showError && showError('No se pudo sincronizar con el backend');
    } finally {
      setSyncing(false);
    }
  };

  const handleRangePresetChange = (value) => {
    setRangoFechas(value);
    if (value === 'custom') {
      return;
    }
    const days = Number(value) || 30;
    const range = buildRangeFromDays(days);
    setFechaInicio(range.start);
    setFechaFin(range.end);
  };

  const handleFechaInicioChange = (value) => {
    setFechaInicio(value);
    if (rangoFechas !== 'custom') {
      setRangoFechas('custom');
    }
  };

  const handleFechaFinChange = (value) => {
    setFechaFin(value);
    if (rangoFechas !== 'custom') {
      setRangoFechas('custom');
    }
  };

  const getUsuarioNombre = (id) => {
    const usuario = resolvedUsuarios.find((u) => Number(u.id) === Number(id));
    return usuario ? usuario.nombre : 'Desconocido';
  };

  const getClaseNombre = (id) => {
    const clase = resolvedClases.find((c) => Number(c.id) === Number(id));
    return clase ? clase.nombre : 'Desconocida';
  };

  const getEstadoConfig = (estado) => {
    const configs = {
      presente: { color: '#10b981', bg: '#f0fdf4', icon: FaCheck, label: 'Presente' },
      ausente: { color: '#ef4444', bg: '#fef2f2', icon: FaTimes, label: 'Ausente' },
      justificado: { color: '#f59e0b', bg: '#fffbeb', icon: FaClipboardCheck, label: 'Justificado' },
      tardanza: { color: '#8b5cf6', bg: '#faf5ff', icon: FaClock, label: 'Tardanza' }
    };
    return configs[estado] || configs.presente;
  };

  const asistenciasOrdenadas = useMemo(() => {
    return [...resolvedAsistencias].sort((a, b) => {
      const fechaA = parseDate(a?.fecha) || 0;
      const fechaB = parseDate(b?.fecha) || 0;
      return fechaB - fechaA;
    });
  }, [resolvedAsistencias]);

  const filteredAsistencias = useMemo(() => {
    const searchLower = searchTerm.trim().toLowerCase();
    const estadoFiltro = filterEstado.trim().toLowerCase();
    const materiaFiltro = filterMateria ? Number(filterMateria) : null;
    const fechaInicioDate = parseDate(fechaInicio);
    const fechaFinDate = parseDate(fechaFin);

    return asistenciasOrdenadas.filter((asistencia) => {
      if (estadoFiltro && asistencia.estado !== estadoFiltro) {
        return false;
      }

      if (materiaFiltro && Number(asistencia.materia_id) !== materiaFiltro) {
        return false;
      }

      const fechaRegistro = parseDate(asistencia.fecha);
      if (fechaRegistro && fechaInicioDate && fechaRegistro < fechaInicioDate) {
        return false;
      }
      if (fechaRegistro && fechaFinDate && fechaRegistro > fechaFinDate) {
        return false;
      }

      if (searchLower) {
        const estudianteNombre = getUsuarioNombre(asistencia.estudiante_id).toLowerCase();
        const claseNombre = getClaseNombre(asistencia.materia_id).toLowerCase();
        if (!estudianteNombre.includes(searchLower) && !claseNombre.includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  }, [asistenciasOrdenadas, searchTerm, filterEstado, filterMateria, fechaInicio, fechaFin]);

  const resumenEstados = useMemo(() => {
    const base = { presente: 0, ausente: 0, justificado: 0, tardanza: 0 };
    filteredAsistencias.forEach((registro) => {
      const key = registro.estado || 'presente';
      base[key] = (base[key] || 0) + 1;
    });
    return base;
  }, [filteredAsistencias]);

  const resumenCursos = useMemo(() => {
    return filteredAsistencias.reduce((acc, registro) => {
      const key = registro.materia_id ?? 'sin-curso';
      const normalized = String(key);
      acc[normalized] = (acc[normalized] || 0) + 1;
      return acc;
    }, {});
  }, [filteredAsistencias]);

  const topCursos = useMemo(() => {
    return Object.entries(resumenCursos)
      .map(([id, total]) => ({
        id,
        total,
        nombre: id === 'sin-curso' ? 'Sin curso asignado' : getClaseNombre(id)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  }, [resumenCursos]);

  const timelineRecords = useMemo(() => {
    const ordered = [...filteredAsistencias];
    if (sortOrder === 'asc') {
      ordered.reverse();
    }
    return ordered.slice(0, 40);
  }, [filteredAsistencias, sortOrder]);

  useEffect(() => {
    if (!timelineRecords.length) {
      if (selectedAsistencia) {
        setSelectedAsistencia(null);
      }
      return;
    }
    const exists = selectedAsistencia && timelineRecords.some((item) => item.id === selectedAsistencia.id);
    if (!selectedAsistencia || !exists) {
      setSelectedAsistencia(timelineRecords[0]);
    }
  }, [timelineRecords, selectedAsistencia]);

  const detalleActual = selectedAsistencia;
  const totalRegistros = filteredAsistencias.length;
  const totalPresentes = resumenEstados.presente || 0;
  const totalAusentes = resumenEstados.ausente || 0;
  const totalJustificados = resumenEstados.justificado || 0;
  const totalTardanzas = resumenEstados.tardanza || 0;
  const detalleCurso = detalleActual
    ? resolvedClases.find((curso) => Number(curso.id) === Number(detalleActual.materia_id))
    : null;
  const detalleEstudiante = detalleActual
    ? resolvedUsuarios.find((user) => Number(user.id) === Number(detalleActual.estudiante_id))
    : null;
  const ultimaSincronizacionLabel = lastSyncedAt ? formatDateTime(lastSyncedAt) : 'Pendiente';

  return (
    <>
      <style>{`
        .asistencias-container {
          background: var(--bg-primary, #ffffff);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          animation: fadeIn 0.5s ease;
        }

        .asistencias-header {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
          padding: 32px;
          position: relative;
          overflow: hidden;
        }

        .asistencias-header::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 200px;
          height: 200px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          transform: translate(50%, -50%);
        }

        .header-content {
          position: relative;
          z-index: 1;
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 8px;
        }

        .header-icon {
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
        }

        .header-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-top: 12px;
          font-size: 0.95rem;
          opacity: 0.85;
        }

        .header-heading {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }

        .header-subtitle {
          margin: 6px 0 0;
          opacity: 0.9;
        }

        .analytics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
          margin-top: 24px;
        }

        .analytics-card {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          padding: 16px;
          backdrop-filter: blur(6px);
        }

        .analytics-label {
          margin: 0;
          font-size: 0.85rem;
          opacity: 0.85;
        }

        .analytics-value {
          margin: 4px 0 0;
          font-size: 1.75rem;
          font-weight: 700;
        }

        .text-success { color: #10b981; }
        .text-danger { color: #ef4444; }

        .filters-panel {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          padding: 24px 32px;
          border-bottom: 1px solid var(--border-color, #e2e8f0);
          background: var(--bg-primary, #ffffff);
        }

        .filter-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .filter-field label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary, #64748b);
        }

        .search-field {
          grid-column: span 2;
        }

        .date-range-field .date-inputs {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .date-inputs input {
          flex: 1;
          border: 2px solid var(--border-color, #e2e8f0);
          border-radius: 12px;
          padding: 10px 12px;
          background: var(--bg-secondary, #f8fafc);
        }

        .date-separator {
          font-weight: 600;
          color: var(--text-muted, #6b7280);
        }

        .filter-actions {
          display: flex;
          align-items: stretch;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .search-box {
          position: relative;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px 12px 44px;
          border: 2px solid var(--border-color, #e2e8f0);
          border-radius: 12px;
          background: var(--bg-primary, #ffffff);
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .search-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted, #6b7280);
        }

        .filter-select {
          padding: 12px 16px;
          border: 2px solid var(--border-color, #e2e8f0);
          border-radius: 12px;
          background: var(--bg-primary, #ffffff);
          font-size: 14px;
          min-width: 150px;
          transition: all 0.3s ease;
        }

        .filter-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 20px;
          border: none;
          border-radius: 12px;
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          white-space: nowrap;
          min-height: 44px;
          min-width: fit-content;
          box-sizing: border-box;
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .action-btn.compact {
          padding: 8px 12px;
          min-height: 36px;
        }

        .btn-primary {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
          border: 2px solid transparent;
          min-width: 160px;
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
          background: var(--bg-primary, #ffffff);
          color: var(--text-secondary, #64748b);
          border: 2px solid var(--border-color, #e2e8f0);
          min-width: 120px;
        }

        .btn-secondary:hover {
          background: var(--bg-secondary, #f8fafc);
          color: var(--text-primary, #0f172a);
          transform: translateY(-1px);
          border-color: #3b82f6;
        }

        .asistencias-content-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
          padding: 24px 32px 40px;
        }

        .timeline-panel,
        .detail-panel {
          background: var(--bg-primary, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.06);
          display: flex;
          flex-direction: column;
          min-height: 400px;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .panel-subtitle {
          margin: 4px 0 0;
          color: var(--text-muted, #6b7280);
          font-size: 0.9rem;
        }

        .timeline-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow-y: auto;
          padding-right: 8px;
        }

        .timeline-row {
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 16px;
          padding: 16px;
          display: grid;
          grid-template-columns: 140px 1fr auto;
          gap: 16px;
          align-items: center;
          text-align: left;
          background: var(--bg-secondary, #f8fafc);
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .timeline-row.active {
          border-color: #3b82f6;
          background: rgba(59, 130, 246, 0.08);
          box-shadow: 0 10px 20px rgba(59, 130, 246, 0.15);
        }

        .timeline-row:hover {
          transform: translateY(-2px);
        }

        .timeline-date span {
          font-weight: 700;
        }

        .timeline-date small {
          display: block;
          color: var(--text-muted, #6b7280);
          text-transform: capitalize;
        }

        .timeline-info p {
          margin: 4px 0 0;
          color: var(--text-muted, #6b7280);
        }

        .timeline-status {
          border-radius: 999px;
          padding: 8px 14px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          text-transform: capitalize;
        }

        .timeline-empty {
          text-align: center;
          padding: 48px 24px;
          border: 1px dashed var(--border-color, #dbeafe);
          border-radius: 16px;
        }

        .timeline-empty-icon {
          color: var(--text-muted, #6b7280);
          margin-bottom: 12px;
        }

        .detail-body {
          display: grid;
          gap: 12px;
          margin-bottom: 16px;
        }

        .detail-field {
          background: var(--bg-secondary, #f8fafc);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 12px;
          padding: 12px 16px;
        }

        .detail-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-muted, #6b7280);
          margin-bottom: 4px;
        }

        .detail-value {
          margin: 0;
          font-size: 1rem;
        }

        .detail-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .top-courses ul {
          list-style: none;
          padding: 0;
          margin: 12px 0 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .top-courses li {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid var(--border-color, #e2e8f0);
        }

        .capitalize {
          text-transform: capitalize;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: var(--bg-primary, #ffffff);
          border-radius: 20px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          animation: slideUp 0.3s ease;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
          padding: 24px;
          border-radius: 20px 20px 0 0;
          position: relative;
        }

        .modal-title {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
        }

        .close-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 32px;
          height: 32px;
          border: none;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }

        .modal-body {
          padding: 32px;
        }

        .form-group {
          margin-bottom: 24px;
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

        .form-control {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid var(--border-color, #e2e8f0);
          border-radius: 12px;
          background: var(--bg-secondary, #f8fafc);
          font-size: 16px;
          transition: all 0.3s ease;
          box-sizing: border-box;
        }

        .form-control:focus {
          outline: none;
          border-color: #3b82f6;
          background: var(--bg-primary, #ffffff);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .modal-footer {
          padding: 24px 32px;
          border-top: 1px solid var(--border-color, #e2e8f0);
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .modal-footer .action-btn {
          min-width: 120px;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          flex-shrink: 0;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            transform: translateY(30px);
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

        @media (max-width: 768px) {
          .asistencias-header {
            padding: 24px;
          }

          .filters-panel {
            padding: 16px 24px;
            grid-template-columns: 1fr;
          }

          .search-field {
            grid-column: span 1;
          }

          .filter-actions {
            justify-content: flex-start;
          }

          .asistencias-content-grid {
            grid-template-columns: 1fr;
            padding: 16px 24px 32px;
          }

          .timeline-row {
            grid-template-columns: 1fr;
          }

          .modal-content {
            width: 95%;
            margin: 16px;
          }

          .modal-body {
            padding: 24px;
          }

          .modal-footer {
            padding: 16px 24px;
            flex-direction: column;
          }

          .modal-footer .action-btn {
            width: 100%;
            min-width: auto;
          }

          .action-btn {
            min-width: auto;
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .action-btn {
            padding: 10px 14px;
            font-size: 13px;
            min-height: 40px;
            gap: 6px;
          }

          .filter-select {
            min-width: auto;
            width: 100%;
          }

          .btn-primary {
            min-width: 140px;
          }

          .btn-secondary {
            min-width: 100px;
          }
        }

        @media (max-width: 360px) {
          .action-btn {
            padding: 8px 12px;
            font-size: 12px;
            gap: 4px;
          }

          .btn-primary {
            min-width: 120px;
          }

          .btn-secondary {
            min-width: 90px;
          }
        }
      `}</style>

      <div className="asistencias-container">
        <div className="asistencias-header">
          <div className="header-content">
            <div className="header-title">
              <div className="header-icon">
                <FaClipboardCheck size={20} />
              </div>
              <div>
                <h1 className="header-heading">Panel de Control de Asistencias</h1>
                <p className="header-subtitle">
                  Sincroniza lo que registran docentes y los ajustes de coordinación.
                </p>
              </div>
            </div>
            <div className="header-meta">
              <span>
                Última sincronización: <strong>{ultimaSincronizacionLabel}</strong>
              </span>
              <span>
                Mostrando <strong>{totalRegistros}</strong> registros filtrados
              </span>
            </div>
            <div className="analytics-grid">
              <div className="analytics-card">
                <p className="analytics-label">Total registrados</p>
                <p className="analytics-value">{totalRegistros}</p>
              </div>
              <div className="analytics-card">
                <p className="analytics-label">Presentes</p>
                <p className="analytics-value text-success">{totalPresentes}</p>
              </div>
              <div className="analytics-card">
                <p className="analytics-label">Ausentes</p>
                <p className="analytics-value text-danger">{totalAusentes}</p>
              </div>
              <div className="analytics-card">
                <p className="analytics-label">Justificados / Tardanzas</p>
                <p className="analytics-value">
                  {totalJustificados} / {totalTardanzas}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="filters-panel">
          <div className="filter-field search-field">
            <label>Búsqueda rápida</label>
            <div className="search-box">
              <input
                type="text"
                className="search-input"
                placeholder="Nombre del estudiante o curso"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <FaSearch className="search-icon" size={16} />
            </div>
          </div>

          <div className="filter-field">
            <label>Estado</label>
            <select
              className="filter-select"
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="presente">Presente</option>
              <option value="ausente">Ausente</option>
              <option value="justificado">Justificado</option>
              <option value="tardanza">Tardanza</option>
            </select>
          </div>

          <div className="filter-field">
            <label>Curso</label>
            <select
              className="filter-select"
              value={filterMateria}
              onChange={(e) => setFilterMateria(e.target.value)}
            >
              <option value="">Todos los cursos</option>
              {resolvedClases.map((curso) => (
                <option key={curso.id} value={curso.id}>
                  {curso.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label>Rango rápido</label>
            <select
              className="filter-select"
              value={rangoFechas}
              onChange={(e) => handleRangePresetChange(e.target.value)}
            >
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 90 días</option>
              <option value="365">Último año</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          <div className="filter-field date-range-field">
            <label>Entre fechas</label>
            <div className="date-inputs">
              <input type="date" value={fechaInicio || ''} onChange={(e) => handleFechaInicioChange(e.target.value)} />
              <span className="date-separator">→</span>
              <input type="date" value={fechaFin || ''} onChange={(e) => handleFechaFinChange(e.target.value)} />
            </div>
          </div>

          <div className="filter-actions">
            <button
              className="action-btn btn-secondary"
              onClick={handleSync}
              disabled={syncing}
              title="Actualizar registros desde el backend"
              type="button"
            >
              <FaSync size={14} className={syncing ? 'fa-spin' : ''} />
              {syncing ? 'Sincronizando' : 'Sincronizar'}
            </button>

            <button className="action-btn btn-secondary" type="button">
              <FaDownload size={14} />
              Exportar
            </button>

            <button className="action-btn btn-primary" onClick={handleAdd} type="button">
              <FaPlus size={14} />
              Nueva Asistencia
            </button>
          </div>
        </div>

        <div className="asistencias-content-grid">
          <div className="timeline-panel">
            <div className="panel-header">
              <div>
                <h3>Historial registrado</h3>
                <p className="panel-subtitle">Últimos {timelineRecords.length} eventos sincronizados.</p>
              </div>
              <button
                type="button"
                className="action-btn btn-secondary compact"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? 'Recientes primero' : 'Antiguos primero'}
              </button>
            </div>
            {timelineRecords.length === 0 ? (
              <div className="timeline-empty">
                <FaClipboardCheck size={32} className="timeline-empty-icon" />
                <h4>No hay registros con los filtros actuales</h4>
                <p>Prueba ajustando el rango de fechas o sincroniza nuevamente.</p>
              </div>
            ) : (
              <div className="timeline-list">
                {timelineRecords.map((registro) => {
                  const estadoConfig = getEstadoConfig(registro.estado);
                  const IconComponent = estadoConfig.icon;
                  const isActive = detalleActual && registro.id === detalleActual.id;
                  const fechaLabel = formatDateWithOptions(registro.fecha, {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  });
                  return (
                    <button
                      type="button"
                      key={registro.id || `${registro.estudiante_id}-${registro.fecha}`}
                      className={`timeline-row ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedAsistencia(registro)}
                    >
                      <div className="timeline-date">
                        <span className="timeline-day">{fechaLabel}</span>
                        <small>{formatDateWithOptions(registro.fecha, { weekday: 'long' })}</small>
                      </div>
                      <div className="timeline-info">
                        <strong>{getUsuarioNombre(registro.estudiante_id)}</strong>
                        <p>{getClaseNombre(registro.materia_id)}</p>
                      </div>
                      <div className="timeline-status" style={{ color: estadoConfig.color, background: estadoConfig.bg }}>
                        <IconComponent size={12} />
                        {estadoConfig.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="detail-panel">
            {detalleActual ? (
              <>
                <div className="panel-header">
                  <div>
                    <h3>Detalle seleccionado</h3>
                    <p className="panel-subtitle">
                      Actualizado {formatDateTime(detalleActual.fecha_modificacion || detalleActual.fecha)}
                    </p>
                  </div>
                </div>
                <div className="detail-body">
                  <div className="detail-field">
                    <span className="detail-label">Estudiante</span>
                    <p className="detail-value">
                      {detalleEstudiante?.nombre || getUsuarioNombre(detalleActual.estudiante_id)}
                    </p>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Curso</span>
                    <p className="detail-value">
                      {detalleCurso?.nombre || getClaseNombre(detalleActual.materia_id)}
                    </p>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Fecha registrada</span>
                    <p className="detail-value">
                      {formatDateWithOptions(detalleActual.fecha, {
                        weekday: 'long',
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Estado</span>
                    <p className="detail-value capitalize">{detalleActual.estado}</p>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Observaciones</span>
                    <p className="detail-value">
                      {detalleActual.observaciones || 'Sin observaciones registradas.'}
                    </p>
                  </div>
                </div>
                <div className="detail-actions">
                  <button className="action-btn btn-primary" onClick={() => handleEdit(detalleActual)}>
                    <FaEdit size={14} /> Editar registro
                  </button>
                  <button className="action-btn btn-secondary" onClick={() => handleDeleteClick(detalleActual)}>
                    <FaTrash size={14} /> Eliminar
                  </button>
                </div>
                <div className="top-courses">
                  <h4>Cursos con más registros en el filtro</h4>
                  {topCursos.length === 0 ? (
                    <p className="panel-subtitle">Aún no hay suficientes datos.</p>
                  ) : (
                    <ul>
                      {topCursos.map((curso) => (
                        <li key={curso.id}>
                          <span>{curso.nombre}</span>
                          <strong>{curso.total}</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : (
              <div className="timeline-empty">
                <FaInfoCircle size={32} className="timeline-empty-icon" />
                <h4>Selecciona una asistencia</h4>
                <p>Haz clic en cualquier evento del historial para ver los detalles completos.</p>
              </div>
            )}
          </div>
        </div>

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">{editMode ? 'Editar Asistencia' : 'Nueva Asistencia'}</h2>
                <button className="close-btn" onClick={() => setShowModal(false)}>
                  <FaTimes size={14} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">
                      <FaUserGraduate size={14} />
                      Estudiante
                    </label>
                    <select
                      className="form-control"
                      name="estudiante_id"
                      value={formData.estudiante_id ?? ''}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Seleccionar estudiante</option>
                      {resolvedUsuarios
                        .filter((u) => u.rol === 'estudiante')
                        .map((usuario) => (
                          <option key={usuario.id} value={usuario.id}>
                            {usuario.nombre}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <FaBookOpen size={14} />
                      Clase
                    </label>
                    <select
                      className="form-control"
                      name="materia_id"
                      value={formData.materia_id ?? ''}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Seleccionar clase</option>
                      {resolvedClases.map((clase) => (
                        <option key={clase.id} value={clase.id}>
                          {clase.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <FaClipboardCheck size={14} />
                      Estado
                    </label>
                    <select
                      className="form-control"
                      name="estado"
                      value={formData.estado ?? ''}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="presente">Presente</option>
                      <option value="ausente">Ausente</option>
                      <option value="justificado">Justificado</option>
                      <option value="tardanza">Tardanza</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <FaCalendarAlt size={14} />
                      Fecha y Hora
                    </label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      name="fecha"
                      value={formData.fecha ?? ''}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="action-btn btn-secondary"
                    onClick={() => setShowModal(false)}
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="action-btn btn-primary" disabled={loading}>
                    {loading ? (
                      <>
                        <div className="spinner"></div>
                        Guardando...
                      </>
                    ) : (
                      'Guardar'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false);
            setAsistenciaToDelete(null);
          }}
          onConfirm={confirmDelete}
          title="¿Eliminar asistencia?"
          message="¿Estás seguro de que deseas eliminar esta asistencia? Esta acción no se puede deshacer."
          confirmText="Sí, eliminar"
          cancelText="Cancelar"
          type="danger"
        />
      </div>
    </>
  );
};

export default AsistenciasList;
