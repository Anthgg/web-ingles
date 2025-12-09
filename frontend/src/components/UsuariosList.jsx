import React, { useState } from 'react';
import DatosPersonalesUsuario from './DatosPersonalesUsuario';
import NotificacionDatosPersonales from './NotificacionDatosPersonales';
import ConfirmDialog from './ui/ConfirmDialog';
import UsuarioForm from './UsuarioForm';
import { Alert, Button, Modal, Form, Card, Container, Row, Col, Badge, InputGroup, Spinner } from 'react-bootstrap';
import { FaEdit, FaTrash, FaPlus, FaUser, FaEnvelope, FaUserTag, FaUserGraduate, FaExclamationTriangle, FaSearch, FaFilter, FaDownload, FaLock, FaUnlock, FaChevronLeft, FaChevronRight, FaTimes, FaCheck, FaIdCard, FaUserShield, FaChalkboardTeacher, FaGraduationCap, FaUserTie, FaEllipsisV } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';

const UsuariosList = ({ usuarios, token, fetchUsuarios, showError, showSuccess }) => {
  const [usuarioDatosId, setUsuarioDatosId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', email: '', password: '', rol: 'estudiante' });
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingPersonalUser, setPendingPersonalUser] = useState(null);
  const [personalDataCompleted, setPersonalDataCompleted] = useState(false);
  const [personalAlertUser, setPersonalAlertUser] = useState(null);
  const [showActivationDialog, setShowActivationDialog] = useState(false);
  const [activationUser, setActivationUser] = useState(null);
  const [activationAction, setActivationAction] = useState('');
  const [deactivationReason, setDeactivationReason] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [fotoErrors, setFotoErrors] = useState({});
  const itemsPerPage = 12;

  // Detectar modo oscuro
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detectar cambios en el modo oscuro del sistema o clase en el body
  React.useEffect(() => {
    const checkDarkMode = () => {
      const darkModeClass = document.documentElement.classList.contains('dark') || 
                           document.body.classList.contains('dark-mode') ||
                           document.body.classList.contains('dark');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(darkModeClass || prefersDark);
    };

    checkDarkMode();
    
    // Observer para cambios en las clases del body/html
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    
    // Listener para cambios en preferencia del sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkDarkMode);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkDarkMode);
    };
  }, []);

  // Manejar error de carga de foto
  const handleFotoError = (userId) => {
    setFotoErrors(prev => ({ ...prev, [userId]: true }));
  };

  // Verificar si el usuario tiene foto de perfil
  const tieneFotoPerfil = (usuario) => {
    return (usuario.tiene_foto_perfil || usuario.foto_perfil) && !fotoErrors[usuario.id];
  };

  // Filtered and paginated users
  const filteredUsuarios = usuarios.filter(usuario => {
    const matchesSearch = usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         usuario.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === '' || usuario.rol === roleFilter;
    const matchesStatus = statusFilter === '' || 
                          (statusFilter === 'activo' && usuario.activo) ||
                          (statusFilter === 'inactivo' && !usuario.activo);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalPages = Math.ceil(filteredUsuarios.length / itemsPerPage);
  const paginatedUsuarios = filteredUsuarios.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleFilterChange = () => {
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (formDataFromForm) => {
    setLoading(true);
    try {
      const url = editMode 
        ? `http://localhost:3002/usuarios/${formData.id}`
        : 'http://localhost:3002/usuarios';
      
      const method = editMode ? 'PUT' : 'POST';
      
      // Usar los datos del formulario mejorado
      const body = editMode 
        ? { 
            nombre: formDataFromForm.nombre, 
            rol: formDataFromForm.rol, 
            ...(formDataFromForm.password && { password: formDataFromForm.password }),
            ...(formDataFromForm.nivel && { nivel: formDataFromForm.nivel }),
            ...(formDataFromForm.grado && { grado: formDataFromForm.grado }),
            ...(formDataFromForm.seccion && { seccion: formDataFromForm.seccion }),
            ...(formDataFromForm.documento_identidad && { documento_identidad: formDataFromForm.documento_identidad }),
            ...(formDataFromForm.tipo_documento && { tipo_documento: formDataFromForm.tipo_documento }),
            ...(formDataFromForm.telefono && { telefono: formDataFromForm.telefono }),
            ...(formDataFromForm.estudiante && { estudiante: formDataFromForm.estudiante }),
          }
        : formDataFromForm;
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      let responseData = null;
      try {
        responseData = await res.json();
      } catch (parseError) {
        responseData = null;
      }

      if (!res.ok) {
        const message = responseData?.error || (editMode ? 'Error al actualizar usuario' : 'Error al crear usuario');
        throw new Error(message);
      }

      showSuccess(editMode ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente');
      setShowModal(false);

      // Ya no se muestra el modal de datos personales obligatorios
      // Los datos personales se completan por separado si es necesario

      if (typeof fetchUsuarios === 'function') {
        await Promise.resolve(fetchUsuarios());
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`http://localhost:3002/usuarios/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Error al eliminar usuario');
      
      showSuccess('Usuario eliminado correctamente');
      fetchUsuarios();
    } catch (err) {
      showError(err.message);
    }
  };

  const handleDeleteClick = (usuario) => {
    setUserToDelete(usuario);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      handleDelete(userToDelete.id);
      setUserToDelete(null);
    }
  };

  // Funciones de activación/desactivación
  const handleActivateUser = async (usuario) => {
    setActivationUser(usuario);
    setActivationAction('activar');
    setShowActivationDialog(true);
  };

  const handleDeactivateUser = async (usuario) => {
    setActivationUser(usuario);
    setActivationAction('desactivar');
    setDeactivationReason('');
    setShowActivationDialog(true);
  };

  const confirmActivation = async () => {
    if (!activationUser) return;

    try {
      const endpoint = activationAction === 'activar' ? 'activar' : 'desactivar';
      const body = activationAction === 'desactivar' && deactivationReason 
        ? { motivo: deactivationReason }
        : {};

      const res = await fetch(`http://localhost:3002/usuarios/${activationUser.id}/${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Error al ${activationAction} usuario`);
      }

      showSuccess(data.message || `Usuario ${activationAction === 'activar' ? 'activado' : 'desactivado'} correctamente`);
      setShowActivationDialog(false);
      setActivationUser(null);
      setDeactivationReason('');
      
      if (typeof fetchUsuarios === 'function') {
        await Promise.resolve(fetchUsuarios());
      }
    } catch (err) {
      showError(err.message);
    }
  };

  const handleClosePersonalModal = () => {
    if (pendingPersonalUser?.id) {
      setUsuarioDatosId(pendingPersonalUser.id);
    }
    if (!personalDataCompleted && pendingPersonalUser) {
      setPersonalAlertUser(pendingPersonalUser);
      showError && showError(`Faltan datos personales para ${pendingPersonalUser.nombre}`);
    }
    setPendingPersonalUser(null);
    setPersonalDataCompleted(false);
  };

  const handlePersonalCompleted = () => {
    setPersonalDataCompleted(true);
    setPendingPersonalUser(null);
    setPersonalAlertUser(null);
    setUsuarioDatosId(null);
    if (typeof fetchUsuarios === 'function') {
      fetchUsuarios();
    }
  };

  const handleEdit = (usuario) => {
    setFormData({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      password: '',
      rol: usuario.rol
    });
    setEditMode(true);
    setShowModal(true);
  };

  const handleAdd = () => {
    setFormData({ nombre: '', email: '', password: '', rol: 'estudiante' });
    setEditMode(false);
    setShowModal(true);
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const response = await fetch('http://localhost:3002/api/users/report.pdf', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('No se pudo generar el reporte PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte-usuarios-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showSuccess && showSuccess('Reporte descargado');
    } catch (error) {
      showError && showError(error.message || 'Error al descargar el reporte');
    } finally {
      setDownloading(false);
    }
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'administrativo': return 'danger';
      case 'profesor': return 'primary';
      case 'estudiante': return 'success';
      default: return 'secondary';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'administrativo': return <FaUserTie />;
      case 'profesor': return <FaChalkboardTeacher />;
      case 'estudiante': return <FaGraduationCap />;
      default: return <FaUser />;
    }
  };

  const getRoleGradient = (role) => {
    switch (role) {
      case 'administrativo': return 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';
      case 'profesor': return 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)';
      case 'estudiante': return 'linear-gradient(135deg, #27ae60 0%, #1e8449 100%)';
      default: return 'linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)';
    }
  };

  // Estadísticas rápidas
  const stats = {
    total: usuarios.length,
    activos: usuarios.filter(u => u.activo).length,
    inactivos: usuarios.filter(u => !u.activo).length,
    estudiantes: usuarios.filter(u => u.rol === 'estudiante').length,
    profesores: usuarios.filter(u => u.rol === 'profesor').length,
    administrativos: usuarios.filter(u => u.rol === 'administrativo').length
  };

  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || roleFilter || statusFilter;

  return (
    <div className={`usuarios-panel ${isDarkMode ? 'dark-mode' : ''}`}>
      <style>{`
        .usuarios-panel {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          padding: 2rem;
          transition: all 0.3s ease;
        }

        /* ==================== DARK MODE ==================== */
        .usuarios-panel.dark-mode {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        }

        .usuarios-panel.dark-mode .panel-header {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          box-shadow: 0 10px 40px rgba(79, 70, 229, 0.3);
        }

        .usuarios-panel.dark-mode .stat-card {
          background: #1e293b;
          border: 1px solid #334155;
        }

        .usuarios-panel.dark-mode .stat-info h3 {
          color: #f1f5f9;
        }

        .usuarios-panel.dark-mode .stat-info p {
          color: #94a3b8;
        }

        .usuarios-panel.dark-mode .filter-section {
          background: #1e293b;
          border: 1px solid #334155;
        }

        .usuarios-panel.dark-mode .filter-label {
          color: #cbd5e1;
        }

        .usuarios-panel.dark-mode .search-input,
        .usuarios-panel.dark-mode .filter-select {
          background: #0f172a;
          border-color: #334155;
          color: #f1f5f9;
        }

        .usuarios-panel.dark-mode .search-input::placeholder {
          color: #64748b;
        }

        .usuarios-panel.dark-mode .search-input:focus,
        .usuarios-panel.dark-mode .filter-select:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
        }

        .usuarios-panel.dark-mode .search-icon {
          color: #64748b;
        }

        .usuarios-panel.dark-mode .btn-clear-filters {
          background: #334155;
          color: #cbd5e1;
        }

        .usuarios-panel.dark-mode .btn-clear-filters:hover {
          background: #475569;
          color: #f1f5f9;
        }

        .usuarios-panel.dark-mode .results-count {
          color: #94a3b8;
        }

        .usuarios-panel.dark-mode .results-count strong {
          color: #f1f5f9;
        }

        .usuarios-panel.dark-mode .user-card {
          background: #1e293b;
          border: 1px solid #334155;
        }

        .usuarios-panel.dark-mode .user-card:hover {
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
        }

        .usuarios-panel.dark-mode .user-card-body {
          background: #1e293b;
        }

        .usuarios-panel.dark-mode .user-detail-icon {
          background: #334155;
          color: #a5b4fc;
        }

        .usuarios-panel.dark-mode .user-detail-label {
          color: #64748b;
        }

        .usuarios-panel.dark-mode .user-detail-value {
          color: #f1f5f9;
        }

        .usuarios-panel.dark-mode .badge-active {
          background: rgba(34, 197, 94, 0.2);
          color: #4ade80;
        }

        .usuarios-panel.dark-mode .badge-inactive {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
        }

        .usuarios-panel.dark-mode .badge-no-data {
          background: rgba(251, 191, 36, 0.2);
          color: #fbbf24;
        }

        .usuarios-panel.dark-mode .user-card-footer {
          background: #0f172a;
          border-top-color: #334155;
        }

        .usuarios-panel.dark-mode .btn-edit {
          background: rgba(251, 191, 36, 0.15);
          color: #fbbf24;
        }

        .usuarios-panel.dark-mode .btn-edit:hover {
          background: rgba(251, 191, 36, 0.25);
          color: #fcd34d;
        }

        .usuarios-panel.dark-mode .btn-activate {
          background: rgba(34, 197, 94, 0.15);
          color: #4ade80;
        }

        .usuarios-panel.dark-mode .btn-activate:hover {
          background: rgba(34, 197, 94, 0.25);
          color: #86efac;
        }

        .usuarios-panel.dark-mode .btn-deactivate {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
        }

        .usuarios-panel.dark-mode .btn-deactivate:hover {
          background: rgba(239, 68, 68, 0.25);
          color: #fca5a5;
        }

        .usuarios-panel.dark-mode .btn-data {
          background: rgba(99, 102, 241, 0.15);
          color: #a5b4fc;
        }

        .usuarios-panel.dark-mode .btn-data:hover {
          background: rgba(99, 102, 241, 0.25);
          color: #c7d2fe;
        }

        .usuarios-panel.dark-mode .pagination-container {
          background: #1e293b;
          border: 1px solid #334155;
        }

        .usuarios-panel.dark-mode .page-btn {
          background: #334155;
          color: #cbd5e1;
        }

        .usuarios-panel.dark-mode .page-btn:hover:not(:disabled) {
          background: #6366f1;
          color: white;
        }

        .usuarios-panel.dark-mode .page-btn.active {
          background: #6366f1;
          color: white;
        }

        .usuarios-panel.dark-mode .page-info {
          color: #64748b;
        }

        .usuarios-panel.dark-mode .empty-state {
          background: #1e293b;
          border: 1px solid #334155;
        }

        .usuarios-panel.dark-mode .empty-title {
          color: #f1f5f9;
        }

        .usuarios-panel.dark-mode .empty-text {
          color: #94a3b8;
        }

        .usuarios-panel.dark-mode .alert-personal-data {
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%);
          border: 1px solid rgba(251, 191, 36, 0.3);
        }

        .usuarios-panel.dark-mode .alert-icon {
          background: rgba(251, 191, 36, 0.2);
          color: #fbbf24;
        }

        .usuarios-panel.dark-mode .alert-text {
          color: #fcd34d;
        }

        .usuarios-panel.dark-mode .alert-text strong {
          color: #fde68a;
        }

        .usuarios-panel.dark-mode .datos-personales-container {
          background: #0f172a;
          border-color: #334155;
        }

        /* Modal Dark Mode */
        .usuarios-panel.dark-mode .modal-modern .modal-content {
          background: #1e293b;
          border: 1px solid #334155;
        }

        .usuarios-panel.dark-mode .modal-modern .modal-body {
          background: #1e293b;
        }

        .usuarios-panel.dark-mode .form-label-modern {
          color: #cbd5e1;
        }

        .usuarios-panel.dark-mode .form-control-modern {
          background: #0f172a;
          border-color: #334155;
          color: #f1f5f9;
        }

        .usuarios-panel.dark-mode .form-control-modern:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
        }

        .usuarios-panel.dark-mode .modal-footer-modern {
          background: #0f172a;
          border-top-color: #334155;
        }

        .usuarios-panel.dark-mode .btn-modal-cancel {
          background: #334155;
          color: #cbd5e1;
        }

        .usuarios-panel.dark-mode .btn-modal-cancel:hover {
          background: #475569;
          color: #f1f5f9;
        }

        /* ==================== LIGHT MODE STYLES ==================== */
        .panel-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 24px;
          padding: 2rem 2.5rem;
          margin-bottom: 2rem;
          color: white;
          box-shadow: 0 10px 40px rgba(102, 126, 234, 0.3);
        }

        .panel-title {
          font-size: 2rem;
          font-weight: 700;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .panel-subtitle {
          opacity: 0.9;
          margin-top: 0.5rem;
          font-size: 1.1rem;
        }

        .header-actions {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .btn-header {
          background: rgba(255, 255, 255, 0.2);
          border: 2px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .btn-header:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.5);
          transform: translateY(-2px);
          color: white;
        }

        .btn-header-primary {
          background: white;
          color: #667eea;
          border-color: white;
        }

        .btn-header-primary:hover {
          background: #f8fafc;
          color: #764ba2;
          border-color: white;
        }

        /* Stats Cards */
        .stats-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 1.25rem;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          color: white;
        }

        .stat-info h3 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
          color: #1e293b;
        }

        .stat-info p {
          font-size: 0.85rem;
          color: #64748b;
          margin: 0;
        }

        /* Filter Section */
        .filter-section {
          background: white;
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
        }

        .filter-row {
          display: flex;
          gap: 1rem;
          align-items: flex-end;
          flex-wrap: wrap;
        }

        .filter-group {
          flex: 1;
          min-width: 200px;
        }

        .filter-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #475569;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .search-input {
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          padding: 0.75rem 1rem 0.75rem 2.75rem;
          font-size: 0.95rem;
          transition: all 0.3s ease;
          width: 100%;
          background: white;
        }

        .search-input:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          outline: none;
        }

        .search-wrapper {
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .filter-select {
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          padding: 0.75rem 1rem;
          font-size: 0.95rem;
          transition: all 0.3s ease;
          width: 100%;
          background-color: white;
        }

        .filter-select:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          outline: none;
        }

        .btn-clear-filters {
          background: #f1f5f9;
          border: none;
          color: #64748b;
          padding: 0.75rem 1.25rem;
          border-radius: 12px;
          font-weight: 500;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          white-space: nowrap;
          cursor: pointer;
        }

        .btn-clear-filters:hover {
          background: #e2e8f0;
          color: #475569;
        }

        .filter-badge {
          background: #667eea;
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        /* Results info */
        .results-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding: 0 0.5rem;
        }

        .results-count {
          color: #64748b;
          font-size: 0.95rem;
        }

        .results-count strong {
          color: #1e293b;
        }

        .view-toggle {
          display: flex;
          gap: 0.5rem;
        }

        .view-btn {
          padding: 0.5rem 0.75rem;
          border: 2px solid #e2e8f0;
          background: white;
          border-radius: 8px;
          color: #64748b;
          transition: all 0.3s ease;
        }

        .view-btn:hover, .view-btn.active {
          border-color: #667eea;
          background: #667eea;
          color: white;
        }

        /* User Cards Grid */
        .users-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }

        .user-card {
          background: white;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
          animation: fadeInUp 0.5s ease forwards;
          opacity: 0;
        }

        .user-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1);
        }

        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .user-card-header {
          padding: 1.5rem;
          color: white;
          position: relative;
        }

        .user-avatar-container {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .user-avatar {
          width: 60px;
          height: 60px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 700;
          border: 3px solid rgba(255, 255, 255, 0.3);
          overflow: hidden;
        }

        .user-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .user-avatar-initials {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }

        .user-header-info h5 {
          margin: 0;
          font-weight: 700;
          font-size: 1.1rem;
        }

        .user-header-info .user-email {
          opacity: 0.9;
          font-size: 0.85rem;
          margin-top: 0.25rem;
        }

        .status-indicator {
          position: absolute;
          top: 1rem;
          right: 1rem;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid white;
        }

        .status-indicator.active {
          background: #22c55e;
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
        }

        .status-indicator.inactive {
          background: #ef4444;
        }

        .user-card-body {
          padding: 1.5rem;
        }

        .user-detail-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
          padding: 0.5rem 0;
        }

        .user-detail-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #667eea;
        }

        .user-detail-info {
          flex: 1;
        }

        .user-detail-label {
          font-size: 0.75rem;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .user-detail-value {
          font-weight: 600;
          color: #1e293b;
        }

        .user-badges {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
          flex-wrap: wrap;
        }

        .user-badge {
          padding: 0.35rem 0.75rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .badge-role {
          background: #f1f5f9;
          color: #475569;
        }

        .badge-active {
          background: #dcfce7;
          color: #166534;
        }

        .badge-inactive {
          background: #fef2f2;
          color: #dc2626;
        }

        .badge-no-data {
          background: #fef3c7;
          color: #92400e;
        }

        .user-card-footer {
          padding: 1rem 1.5rem;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          display: flex;
          gap: 0.5rem;
        }

        .btn-action {
          flex: 1;
          padding: 0.6rem;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 600;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          border: none;
          cursor: pointer;
        }

        .btn-action:hover {
          transform: translateY(-2px);
        }

        .btn-edit {
          background: #fef3c7;
          color: #92400e;
        }

        .btn-edit:hover {
          background: #fde68a;
          color: #78350f;
        }

        .btn-activate {
          background: #dcfce7;
          color: #166534;
        }

        .btn-activate:hover {
          background: #bbf7d0;
          color: #14532d;
        }

        .btn-deactivate {
          background: #fef2f2;
          color: #dc2626;
        }

        .btn-deactivate:hover {
          background: #fecaca;
          color: #b91c1c;
        }

        .btn-data {
          background: #e0e7ff;
          color: #4338ca;
        }

        .btn-data:hover {
          background: #c7d2fe;
          color: #3730a3;
        }

        /* Pagination */
        .pagination-container {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.5rem;
          margin-top: 2rem;
          padding: 1rem;
          background: white;
          border-radius: 16px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
        }

        .page-btn {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: none;
          background: #f1f5f9;
          color: #64748b;
          font-weight: 600;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .page-btn:hover:not(:disabled) {
          background: #667eea;
          color: white;
        }

        .page-btn.active {
          background: #667eea;
          color: white;
        }

        .page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .page-info {
          padding: 0 1rem;
          color: #64748b;
          font-size: 0.9rem;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          background: white;
          border-radius: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
        }

        .empty-icon {
          width: 80px;
          height: 80px;
          border-radius: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
          font-size: 2rem;
          color: white;
        }

        .empty-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }

        .empty-text {
          color: #64748b;
          margin-bottom: 1.5rem;
        }

        .btn-empty {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          color: white;
          padding: 0.75rem 2rem;
          border-radius: 12px;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .btn-empty:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
          color: white;
        }

        /* Alert personalizada */
        .alert-personal-data {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: none;
          border-radius: 16px;
          padding: 1rem 1.5rem;
          margin-bottom: 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 4px 15px rgba(251, 191, 36, 0.2);
        }

        .alert-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .alert-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(146, 64, 14, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #92400e;
          font-size: 1.2rem;
        }

        .alert-text strong {
          color: #78350f;
        }

        .btn-alert {
          background: #92400e;
          border: none;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 10px;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .btn-alert:hover {
          background: #78350f;
          color: white;
        }

        /* Modal styles */
        .modal-modern .modal-content {
          border: none;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .modal-modern .modal-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          padding: 1.5rem 2rem;
          color: white;
        }

        .modal-modern .modal-title {
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .modal-modern .modal-body {
          padding: 2rem;
        }

        .modal-modern .btn-close {
          filter: brightness(0) invert(1);
          opacity: 0.8;
        }

        .form-group-modern {
          margin-bottom: 1.5rem;
        }

        .form-label-modern {
          font-weight: 600;
          color: #475569;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .form-control-modern {
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          padding: 0.875rem 1rem;
          font-size: 1rem;
          transition: all 0.3s ease;
        }

        .form-control-modern:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .modal-footer-modern {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          padding: 1.5rem 2rem;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
        }

        .btn-modal-cancel {
          background: #f1f5f9;
          border: none;
          color: #64748b;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .btn-modal-cancel:hover {
          background: #e2e8f0;
          color: #475569;
        }

        .btn-modal-submit {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-modal-submit:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
          color: white;
        }

        .modal-header-warning {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%) !important;
        }

        .modal-header-success {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%) !important;
        }

        .modal-header-danger {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
        }

        /* Datos personales inline */
        .datos-personales-container {
          margin-top: 1rem;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 12px;
          border: 2px dashed #e2e8f0;
        }
      `}</style>

      {/* Alert de datos personales pendientes */}
      {personalAlertUser && (
        <div className="alert-personal-data">
          <div className="alert-content">
            <div className="alert-icon">
              <FaExclamationTriangle />
            </div>
            <div className="alert-text">
              El usuario <strong>{personalAlertUser.nombre}</strong> aún no tiene datos personales registrados.
            </div>
          </div>
          <button
            className="btn-alert"
            onClick={() => {
              const user = personalAlertUser;
              setPersonalDataCompleted(false);
              setPersonalAlertUser(null);
              setPendingPersonalUser(user);
            }}
          >
            Completar ahora
          </button>
        </div>
      )}

      {/* Header */}
      <div className="panel-header">
        <Row className="align-items-center">
          <Col>
            <h1 className="panel-title">
              <FaUserShield size={36} />
              Gestión de Usuarios
            </h1>
            <p className="panel-subtitle">
              Administra usuarios, roles y permisos del sistema educativo
            </p>
          </Col>
          <Col xs="auto">
            <div className="header-actions">
              <button
                className="btn-header"
                onClick={handleDownloadPdf}
                disabled={downloading}
              >
                {downloading ? (
                  <>
                    <Spinner animation="border" size="sm" />
                    Generando...
                  </>
                ) : (
                  <>
                    <FaDownload />
                    Reporte PDF
                  </>
                )}
              </button>
              <button className="btn-header btn-header-primary" onClick={handleAdd}>
                <FaPlus />
                Nuevo Usuario
              </button>
            </div>
          </Col>
        </Row>
      </div>

      {/* Stats Cards */}
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <FaUser />
          </div>
          <div className="stat-info">
            <h3>{stats.total}</h3>
            <p>Total Usuarios</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}>
            <FaCheck />
          </div>
          <div className="stat-info">
            <h3>{stats.activos}</h3>
            <p>Activos</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
            <FaTimes />
          </div>
          <div className="stat-info">
            <h3>{stats.inactivos}</h3>
            <p>Inactivos</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #27ae60 0%, #1e8449 100%)' }}>
            <FaGraduationCap />
          </div>
          <div className="stat-info">
            <h3>{stats.estudiantes}</h3>
            <p>Estudiantes</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)' }}>
            <FaChalkboardTeacher />
          </div>
          <div className="stat-info">
            <h3>{stats.profesores}</h3>
            <p>Profesores</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)' }}>
            <FaUserTie />
          </div>
          <div className="stat-info">
            <h3>{stats.administrativos}</h3>
            <p>Administrativos</p>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filter-section">
        <div className="filter-row">
          <div className="filter-group" style={{ flex: 2 }}>
            <label className="filter-label">
              <FaSearch /> Buscar Usuario
            </label>
            <div className="search-wrapper">
              <FaSearch className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  handleFilterChange();
                }}
              />
            </div>
          </div>
          <div className="filter-group">
            <label className="filter-label">
              <FaFilter /> Rol
            </label>
            <select
              className="filter-select"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                handleFilterChange();
              }}
            >
              <option value="">Todos los roles</option>
              <option value="estudiante">👨‍🎓 Estudiante</option>
              <option value="profesor">👩‍🏫 Profesor</option>
              <option value="administrativo">👨‍💼 Administrativo</option>
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">
              <FaUserShield /> Estado
            </label>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                handleFilterChange();
              }}
            >
              <option value="">Todos</option>
              <option value="activo">✓ Activo</option>
              <option value="inactivo">✗ Inactivo</option>
            </select>
          </div>
          {hasActiveFilters && (
            <div className="filter-group" style={{ flex: 'none' }}>
              <label className="filter-label">&nbsp;</label>
              <button className="btn-clear-filters" onClick={clearFilters}>
                <FaTimes /> Limpiar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results Info */}
      <div className="results-info">
        <span className="results-count">
          Mostrando <strong>{paginatedUsuarios.length}</strong> de <strong>{filteredUsuarios.length}</strong> usuarios
          {hasActiveFilters && <span className="filter-badge ms-2">Filtrado</span>}
        </span>
      </div>

      {/* Users Grid */}
      <div className="users-grid">
        {paginatedUsuarios.map((usuario, index) => (
          <div
            key={usuario.id}
            className="user-card"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div
              className="user-card-header"
              style={{ background: getRoleGradient(usuario.rol) }}
            >
              <div className="user-avatar-container">
                <div className="user-avatar">
                  {tieneFotoPerfil(usuario) ? (
                    <img
                      src={`http://localhost:3002/usuarios/${usuario.id}/foto-perfil`}
                      alt={usuario.nombre}
                      onError={() => handleFotoError(usuario.id)}
                    />
                  ) : (
                    <span className="user-avatar-initials">
                      {usuario.nombre.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="user-header-info">
                  <h5>{usuario.nombre}</h5>
                  <p className="user-email">{usuario.email}</p>
                </div>
              </div>
              <div
                className={`status-indicator ${usuario.activo ? 'active' : 'inactive'}`}
                title={usuario.activo ? 'Usuario activo' : 'Usuario inactivo'}
              />
            </div>

            <div className="user-card-body">
              <div className="user-detail-row">
                <div className="user-detail-icon">
                  <FaIdCard />
                </div>
                <div className="user-detail-info">
                  <span className="user-detail-label">ID Usuario</span>
                  <span className="user-detail-value">{usuario.id}</span>
                </div>
              </div>

              <div className="user-detail-row">
                <div className="user-detail-icon">
                  {getRoleIcon(usuario.rol)}
                </div>
                <div className="user-detail-info">
                  <span className="user-detail-label">Rol</span>
                  <span className="user-detail-value" style={{ textTransform: 'capitalize' }}>
                    {usuario.rol}
                  </span>
                </div>
              </div>

              <div className="user-badges">
                <span className={`user-badge ${usuario.activo ? 'badge-active' : 'badge-inactive'}`}>
                  {usuario.activo ? <><FaCheck /> Activo</> : <><FaTimes /> Inactivo</>}
                </span>
                {!usuario.datos_personales && (
                  <span className="user-badge badge-no-data">
                    <FaExclamationTriangle /> Sin datos personales
                  </span>
                )}
              </div>

              {/* Datos personales inline si se selecciona */}
              {usuarioDatosId === usuario.id && (
                <div className="datos-personales-container">
                  <DatosPersonalesUsuario
                    usuarioId={usuario.id}
                    onSuccess={(msg) => {
                      showSuccess(msg);
                      setUsuarioDatosId(null);
                      fetchUsuarios && fetchUsuarios();
                    }}
                    onError={showError}
                  />
                </div>
              )}
            </div>

            <div className="user-card-footer">
              <button className="btn-action btn-edit" onClick={() => handleEdit(usuario)}>
                <FaEdit /> Editar
              </button>
              {usuario.activo ? (
                <button
                  className="btn-action btn-deactivate"
                  onClick={() => handleDeactivateUser(usuario)}
                >
                  <FaLock /> Desactivar
                </button>
              ) : (
                <button
                  className="btn-action btn-activate"
                  onClick={() => handleActivateUser(usuario)}
                >
                  <FaUnlock /> Activar
                </button>
              )}
              {!usuario.datos_personales && usuarioDatosId !== usuario.id && (
                <button
                  className="btn-action btn-data"
                  onClick={() => setUsuarioDatosId(usuario.id)}
                  title="Completar datos personales"
                >
                  <FaIdCard /> Completar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination-container">
          <button
            className="page-btn"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <FaChevronLeft />
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(page => {
              if (totalPages <= 7) return true;
              if (page === 1 || page === totalPages) return true;
              if (Math.abs(page - currentPage) <= 1) return true;
              return false;
            })
            .map((page, idx, arr) => (
              <React.Fragment key={page}>
                {idx > 0 && arr[idx - 1] !== page - 1 && (
                  <span className="page-info">...</span>
                )}
                <button
                  className={`page-btn ${page === currentPage ? 'active' : ''}`}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              </React.Fragment>
            ))}
          
          <button
            className="page-btn"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <FaChevronRight />
          </button>
        </div>
      )}

      {/* Empty State - No results from filter */}
      {filteredUsuarios.length === 0 && usuarios.length > 0 && (
        <div className="empty-state">
          <div className="empty-icon">
            <FaSearch />
          </div>
          <h3 className="empty-title">No se encontraron usuarios</h3>
          <p className="empty-text">
            Intenta con otros términos de búsqueda o ajusta los filtros
          </p>
          <button className="btn-empty" onClick={clearFilters}>
            <FaTimes className="me-2" />
            Limpiar Filtros
          </button>
        </div>
      )}

      {/* Empty State - No users at all */}
      {usuarios.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">
            <FaUserGraduate />
          </div>
          <h3 className="empty-title">No hay usuarios registrados</h3>
          <p className="empty-text">
            Comienza creando tu primer usuario en el sistema
          </p>
          <button className="btn-empty" onClick={handleAdd}>
            <FaPlus className="me-2" />
            Crear Primer Usuario
          </button>
        </div>
      )}

      {/* Modal Crear/Editar Usuario */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        centered
        size="lg"
        className="modal-modern"
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="d-flex align-items-center gap-2">
            {editMode ? <FaEdit className="text-primary" /> : <FaPlus className="text-success" />}
            <span>{editMode ? 'Editar Usuario' : 'Nuevo Usuario'}</span>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="pt-2">
          <UsuarioForm
            token={token}
            onSave={handleSubmit}
            editingUser={editMode ? formData : null}
            onCancel={() => setShowModal(false)}
          />
        </Modal.Body>
      </Modal>

      {/* Modal Datos Personales Pendientes */}
      <Modal
        show={!!pendingPersonalUser}
        onHide={handleClosePersonalModal}
        centered
        size="lg"
        backdrop="static"
        keyboard={false}
        className="modal-modern"
      >
        <Modal.Header closeButton className="modal-header-warning">
          <Modal.Title>
            <FaExclamationTriangle />
            Datos Personales Obligatorios
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-4 p-3 rounded" style={{ background: '#fef3c7' }}>
            <p className="mb-0">
              Para completar el alta de <strong>{pendingPersonalUser?.nombre}</strong>,
              registra los datos personales requeridos.
            </p>
          </div>
          <DatosPersonalesUsuario
            usuarioId={pendingPersonalUser?.id}
            onSuccess={showSuccess}
            onError={showError}
            onCompleted={handlePersonalCompleted}
          />
        </Modal.Body>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setUserToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="¿Eliminar usuario?"
        message={`¿Estás seguro de que deseas eliminar a "${userToDelete?.nombre}"? Esta acción no se puede deshacer y se perderán todos los datos asociados.`}
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        type="danger"
      />

      {/* Modal Activación/Desactivación */}
      <Modal
        show={showActivationDialog}
        onHide={() => {
          setShowActivationDialog(false);
          setActivationUser(null);
          setDeactivationReason('');
        }}
        centered
        size="md"
        className="modal-modern"
      >
        <Modal.Header
          closeButton
          className={activationAction === 'activar' ? 'modal-header-success' : 'modal-header-danger'}
        >
          <Modal.Title>
            {activationAction === 'activar' ? <FaUnlock /> : <FaLock />}
            {activationAction === 'activar' ? 'Activar Usuario' : 'Desactivar Usuario'}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <p className="mb-4">
            {activationAction === 'activar' ? (
              <>
                ¿Estás seguro de que deseas <strong>activar</strong> al usuario{' '}
                <strong>{activationUser?.nombre}</strong>?
              </>
            ) : (
              <>
                ¿Estás seguro de que deseas <strong>desactivar</strong> al usuario{' '}
                <strong>{activationUser?.nombre}</strong>?
              </>
            )}
          </p>

          {activationAction === 'activar' && (
            <div className="p-3 rounded mb-4" style={{ background: '#dcfce7' }}>
              <small className="text-success">
                <FaCheck className="me-2" />
                Al activar este usuario, podrá iniciar sesión y acceder al sistema nuevamente.
              </small>
            </div>
          )}

          {activationAction === 'desactivar' && (
            <>
              <div className="p-3 rounded mb-4" style={{ background: '#fef2f2' }}>
                <small className="text-danger">
                  <FaExclamationTriangle className="me-2" />
                  Al desactivar este usuario, no podrá iniciar sesión en el sistema hasta que sea reactivado.
                </small>
              </div>

              <div className="form-group-modern">
                <label className="form-label-modern">
                  Motivo de desactivación (opcional)
                </label>
                <textarea
                  className="form-control form-control-modern"
                  rows={3}
                  value={deactivationReason}
                  onChange={(e) => setDeactivationReason(e.target.value)}
                  placeholder="Ej: Suspensión temporal, incumplimiento de normas, solicitud del usuario, etc."
                />
                <small className="text-muted mt-1 d-block">
                  Este motivo quedará registrado en el historial del usuario.
                </small>
              </div>
            </>
          )}

          <div className="modal-footer-modern mt-4">
            <button
              className="btn-modal-cancel"
              onClick={() => {
                setShowActivationDialog(false);
                setActivationUser(null);
                setDeactivationReason('');
              }}
            >
              Cancelar
            </button>
            <button
              className={`btn-modal-submit`}
              style={{
                background:
                  activationAction === 'activar'
                    ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                    : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
              }}
              onClick={confirmActivation}
            >
              {activationAction === 'activar' ? (
                <>
                  <FaCheck /> Confirmar Activación
                </>
              ) : (
                <>
                  <FaLock /> Confirmar Desactivación
                </>
              )}
            </button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default UsuariosList;