import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import './ReportesPanel.css';

const ReportesPanel = () => {
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const response = await apiClient.get('/api/reports/modules', {
        baseURL: 'http://localhost:3011'
      });
      setModules(response.data.modules || []);
    } catch (err) {
      console.error('Error al cargar módulos:', err);
      setError('Error al cargar los módulos disponibles');
    }
  };

  const handleDownloadReport = async () => {
    if (!selectedModule) {
      setError('Por favor selecciona un módulo');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Usar apiClient para mantener la autenticación consistente
      const response = await apiClient.get(`/api/reports/${selectedModule}.pdf`, {
        baseURL: 'http://localhost:3011',
        responseType: 'blob', // Importante para PDFs
        headers: {
          'Accept': 'application/pdf'
        }
      });

      // Crear el blob desde la respuesta
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte-${selectedModule}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccess('Reporte descargado correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error al descargar reporte:', err);
      setError(err.message || 'Error al descargar el reporte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reportes-panel-container">
      <div className="reportes-panel-header">
        <h2>📊 Generación de Reportes PDF</h2>
        <p className="reportes-panel-subtitle">
          Selecciona el tipo de información que deseas exportar en formato PDF
        </p>
      </div>

      <div className="reportes-panel-content">
        <div className="form-group">
          <label htmlFor="module-select">Tipo de Reporte:</label>
          <select
            id="module-select"
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="form-select"
            disabled={loading}
          >
            <option value="">-- Selecciona un módulo --</option>
            {modules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.name}
              </option>
            ))}
          </select>
        </div>

        <div className="reportes-info-box">
          <h4>📄 Información del Reporte</h4>
          <ul>
            <li>✅ Diseño institucional con logo y datos del colegio</li>
            <li>✅ Información del usuario que genera el reporte</li>
            <li>✅ Fecha y hora de generación automática</li>
            <li>✅ Formato profesional con paginación</li>
            <li>✅ Datos actualizados en tiempo real</li>
          </ul>
        </div>

        {error && (
          <div className="alert alert-error">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            ✅ {success}
          </div>
        )}

        <div className="reportes-actions">
          <button
            onClick={handleDownloadReport}
            disabled={loading || !selectedModule}
            className="btn btn-primary"
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Generando PDF...
              </>
            ) : (
              <>
                📥 Descargar Reporte
              </>
            )}
          </button>

          {selectedModule && (
            <div className="reportes-preview-info">
              <small>
                Se generará un reporte de <strong>{modules.find(m => m.id === selectedModule)?.name}</strong>
              </small>
            </div>
          )}
        </div>

        <div className="reportes-modules-list">
          <h4>📋 Módulos Disponibles:</h4>
          <div className="modules-grid">
            {modules.map((module) => (
              <div
                key={module.id}
                className={`module-card ${selectedModule === module.id ? 'selected' : ''}`}
                onClick={() => setSelectedModule(module.id)}
              >
                <div className="module-icon">
                  {getModuleIcon(module.id)}
                </div>
                <div className="module-name">{module.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function para obtener iconos por módulo
function getModuleIcon(moduleId) {
  const icons = {
    usuarios: '👥',
    asistencias: '📅',
    calificaciones: '📝',
    clases: '📚',
    asignaciones: '🔗'
  };
  return icons[moduleId] || '📄';
}

export default ReportesPanel;
