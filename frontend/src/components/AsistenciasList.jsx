import React, { useState } from 'react';
import { FaEdit, FaTrash, FaPlus, FaSearch, FaFilter, FaUserGraduate, FaBookOpen, FaCalendarAlt, FaCheck, FaTimes, FaClipboardCheck, FaClock, FaEye, FaDownload } from 'react-icons/fa';

const AsistenciasList = ({ asistencias, usuarios, clases, token, fetchAsistencias, showError, showSuccess }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ 
    estudiante_id: '', 
    materia_id: '', 
    estado: 'presente',
    fecha: ''
  });
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [sortBy, setSortBy] = useState('fecha');
  const [sortOrder, setSortOrder] = useState('desc');

  // Convierte ISO string a formato local para input datetime-local
  const toLocalDateTime = (dateStr) => {
    if (!dateStr) return '';
    const dt = new Date(dateStr);
    const iso = dt.toISOString();
    return iso.slice(0, 16);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editMode 
        ? `http://localhost:3003/asistencias/${formData.id}`
        : 'http://localhost:3003/asistencias';
      
      const method = editMode ? 'PUT' : 'POST';
      
      const bodyData = {
        estudiante_id: formData.estudiante_id,
        materia_id: formData.materia_id,
        estado: formData.estado,
      };
      if (formData.fecha) bodyData.fecha = formData.fecha;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bodyData)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || (editMode ? 'Error al actualizar asistencia' : 'Error al crear asistencia'));
      }
      
      showSuccess(editMode ? 'Asistencia actualizada correctamente' : 'Asistencia creada correctamente');
      fetchAsistencias();
      setShowModal(false);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta asistencia?')) return;
    
    try {
      const res = await fetch(`http://localhost:3003/asistencias/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Error al eliminar asistencia');
      
      showSuccess('Asistencia eliminada correctamente');
      fetchAsistencias();
    } catch (err) {
      showError(err.message);
    }
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
    setFormData({ 
      estudiante_id: '', 
      materia_id: '', 
      estado: 'presente',
      fecha: ''
    });
    setEditMode(false);
    setShowModal(true);
  };

  const getUsuarioNombre = (id) => {
    const usuario = usuarios.find(u => u.id === id);
    return usuario ? usuario.nombre : 'Desconocido';
  };

  const getClaseNombre = (id) => {
    const clase = clases.find(c => c.id === id);
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

  // Filtros y búsqueda
  const filteredAsistencias = asistencias
    .filter(asistencia => {
      const estudiante = getUsuarioNombre(asistencia.estudiante_id).toLowerCase();
      const clase = getClaseNombre(asistencia.materia_id).toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      
      const matchesSearch = estudiante.includes(searchLower) || clase.includes(searchLower);
      const matchesFilter = filterEstado === '' || asistencia.estado === filterEstado;
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      const order = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'fecha') {
        return order * (new Date(a.fecha) - new Date(b.fecha));
      }
      return order * a[sortBy]?.localeCompare(b[sortBy]);
    });

  return (
    <>
      <style jsx>{`
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

        .header-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 24px;
          margin-top: 24px;
        }

        .stat-item {
          text-align: center;
          padding: 16px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          backdrop-filter: blur(10px);
        }

        .stat-number {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 14px;
          opacity: 0.9;
        }

        .controls-section {
          padding: 24px 32px;
          border-bottom: 1px solid var(--border-color, #e2e8f0);
          background: var(--bg-secondary, #f8fafc);
        }

        .controls-grid {
          display: grid;
          grid-template-columns: 1fr auto auto auto;
          gap: 16px;
          align-items: center;
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

        .asistencias-grid {
          display: grid;
          gap: 16px;
          padding: 24px 32px;
        }

        .asistencia-card {
          background: var(--bg-primary, #ffffff);
          border: 2px solid var(--border-color, #e2e8f0);
          border-radius: 16px;
          padding: 24px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .asistencia-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
          border-color: #3b82f6;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .card-info {
          flex: 1;
        }

        .student-name {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary, #0f172a);
          margin-bottom: 4px;
        }

        .class-name {
          color: var(--text-secondary, #64748b);
          font-size: 14px;
          margin-bottom: 8px;
        }

        .estado-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .fecha-info {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-muted, #6b7280);
          font-size: 13px;
          margin-top: 12px;
        }

        .card-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .icon-btn {
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .icon-btn.edit {
          background: #fef3c7;
          color: #d97706;
        }

        .icon-btn.edit:hover {
          background: #fcd34d;
          transform: scale(1.1);
        }

        .icon-btn.delete {
          background: #fee2e2;
          color: #dc2626;
        }

        .icon-btn.delete:hover {
          background: #fca5a5;
          transform: scale(1.1);
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

        .empty-state {
          text-align: center;
          padding: 64px 32px;
          color: var(--text-muted, #6b7280);
        }

        .empty-icon {
          width: 64px;
          height: 64px;
          background: var(--bg-secondary, #f8fafc);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        }

        /* Animaciones */
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

        /* Responsive */
        @media (max-width: 768px) {
          .asistencias-header {
            padding: 24px;
          }

          .controls-section {
            padding: 16px 24px;
          }

          .controls-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .asistencias-grid {
            padding: 16px 24px;
          }

          .header-stats {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
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

          .card-header {
            flex-direction: column;
            gap: 16px;
          }

          .card-actions {
            align-self: flex-end;
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

          .controls-grid {
            gap: 8px;
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
        {/* Header */}
        <div className="asistencias-header">
          <div className="header-content">
            <div className="header-title">
              <div className="header-icon">
                <FaClipboardCheck size={20} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>
                  Control de Asistencias
                </h1>
                <p style={{ margin: '4px 0 0 0', opacity: 0.9 }}>
                  Gestiona y monitorea la asistencia de estudiantes
                </p>
              </div>
            </div>

            <div className="header-stats">
              <div className="stat-item">
                <div className="stat-number">{asistencias.length}</div>
                <div className="stat-label">Total Registros</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">
                  {asistencias.filter(a => a.estado === 'presente').length}
                </div>
                <div className="stat-label">Presentes</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">
                  {asistencias.filter(a => a.estado === 'ausente').length}
                </div>
                <div className="stat-label">Ausentes</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">
                  {asistencias.filter(a => a.estado === 'justificado').length}
                </div>
                <div className="stat-label">Justificados</div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="controls-section">
          <div className="controls-grid">
            <div className="search-box">
              <input
                type="text"
                className="search-input"
                placeholder="Buscar por estudiante o clase..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <FaSearch className="search-icon" size={16} />
            </div>

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

            <button className="action-btn btn-secondary">
              <FaDownload size={14} />
              Exportar
            </button>

            <button className="action-btn btn-primary" onClick={handleAdd}>
              <FaPlus size={14} />
              Nueva Asistencia
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="asistencias-grid">
          {filteredAsistencias.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <FaClipboardCheck size={24} />
              </div>
              <h3>No hay registros de asistencia</h3>
              <p>Comienza agregando una nueva asistencia</p>
            </div>
          ) : (
            filteredAsistencias.map((asistencia) => {
              const estadoConfig = getEstadoConfig(asistencia.estado);
              const IconComponent = estadoConfig.icon;
              
              return (
                <div key={asistencia.id} className="asistencia-card">
                  <div className="card-header">
                    <div className="card-info">
                      <div className="student-name">
                        {getUsuarioNombre(asistencia.estudiante_id)}
                      </div>
                      <div className="class-name">
                        📚 {getClaseNombre(asistencia.materia_id)}
                      </div>
                      <div
                        className="estado-badge"
                        style={{
                          color: estadoConfig.color,
                          background: estadoConfig.bg
                        }}
                      >
                        <IconComponent size={12} />
                        {estadoConfig.label}
                      </div>
                      <div className="fecha-info">
                        <FaCalendarAlt size={12} />
                        {asistencia.fecha ? new Date(asistencia.fecha).toLocaleString('es-ES') : 'Sin fecha'}
                      </div>
                    </div>
                    <div className="card-actions">
                      <button
                        className="icon-btn edit"
                        onClick={() => handleEdit(asistencia)}
                        title="Editar"
                      >
                        <FaEdit size={14} />
                      </button>
                      <button
                        className="icon-btn delete"
                        onClick={() => handleDelete(asistencia.id)}
                        title="Eliminar"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">
                  {editMode ? 'Editar Asistencia' : 'Nueva Asistencia'}
                </h2>
                <button
                  className="close-btn"
                  onClick={() => setShowModal(false)}
                >
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
                      value={formData.estudiante_id}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Seleccionar estudiante</option>
                      {usuarios.filter(u => u.rol === 'estudiante').map(usuario => (
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
                      value={formData.materia_id}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Seleccionar clase</option>
                      {clases.map(clase => (
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
                      value={formData.estado}
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
                      value={formData.fecha}
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
                  <button
                    type="submit"
                    className="action-btn btn-primary"
                    disabled={loading}
                  >
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
      </div>
    </>
  );
};

export default AsistenciasList;
