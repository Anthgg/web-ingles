import React, { useState } from 'react';
import DatosPersonalesUsuario from './DatosPersonalesUsuario';
import NotificacionDatosPersonales from './NotificacionDatosPersonales';
import ConfirmDialog from './ui/ConfirmDialog';
import { Alert, Button, Modal, Form, Card, Container, Row, Col, Badge } from 'react-bootstrap';
import { FaEdit, FaTrash, FaPlus, FaUser, FaEnvelope, FaUserTag, FaUserGraduate, FaExclamationTriangle } from 'react-icons/fa';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingPersonalUser, setPendingPersonalUser] = useState(null);
  const [personalDataCompleted, setPersonalDataCompleted] = useState(false);
  const [personalAlertUser, setPersonalAlertUser] = useState(null);
  const [showActivationDialog, setShowActivationDialog] = useState(false);
  const [activationUser, setActivationUser] = useState(null);
  const [activationAction, setActivationAction] = useState(''); // 'activar' o 'desactivar'
  const [deactivationReason, setDeactivationReason] = useState('');
  const itemsPerPage = 9;

  // Filtered and paginated users
  const filteredUsuarios = usuarios.filter(usuario => {
    const matchesSearch = usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         usuario.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === '' || usuario.rol === roleFilter;
    return matchesSearch && matchesRole;
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editMode 
        ? `http://localhost:3002/usuarios/${formData.id}`
        : 'http://localhost:3002/usuarios';
      
      const method = editMode ? 'PUT' : 'POST';
      
      const body = editMode 
        ? { nombre: formData.nombre, rol: formData.rol, ...(formData.password && { password: formData.password }) }
        : formData;
      
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

      if (!editMode && responseData?.id) {
        setPendingPersonalUser(responseData);
        setPersonalDataCompleted(false);
        setPersonalAlertUser(responseData);
        setUsuarioDatosId(responseData.id);
      }

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
      case 'administrativo': return '👨‍💼';
      case 'profesor': return '👩‍🏫';
      case 'estudiante': return '👨‍🎓';
      default: return '👤';
    }
  };

  return (
    <Container fluid className="py-4">
  <style>{`
        .user-card {
          transition: all 0.3s ease;
          border: none;
          box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          animation: fadeInUp 0.6s ease forwards;
          opacity: 0;
          transform: translateY(20px);
        }
        
        .user-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }
        
        .fade-in-card {
          animation-delay: var(--delay);
        }
        
        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .action-btn {
          transition: all 0.2s ease;
          border-radius: 8px;
          border: none;
          padding: 8px 12px;
          margin: 0 2px;
        }
        
        .action-btn:hover {
          transform: translateY(-2px);
        }
        
        .header-title {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 700;
        }
        
        .add-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 12px;
          transition: all 0.3s ease;
        }
        
        .add-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
        }
        
        .role-badge {
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 0.9rem;
        }
        
        .modal-content {
          border: none;
          border-radius: 20px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        
        .modal-header {
          border-bottom: 1px solid #e9ecef;
          border-radius: 20px 20px 0 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .modal-header-warning {
          background: linear-gradient(135deg, #fbd786 0%, #f7797d 100%);
          color: #212529;
        }
        
        .spinner-border-sm {
          width: 1rem;
          height: 1rem;
        }
        
        .user-avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 1.2rem;
        }
        
        .user-info {
          flex: 1;
        }
      `}</style>

      {personalAlertUser && (
        <Row className="mb-4">
          <Col>
            <Alert variant="warning" className="d-flex align-items-center justify-content-between gap-3 mb-0">
              <div className="d-flex align-items-center gap-2">
                <FaExclamationTriangle className="text-warning" />
                <span>
                  El usuario <strong>{personalAlertUser.nombre}</strong> aún no tiene datos personales registrados. Completa la ficha para evitar inconsistencias.
                </span>
              </div>
              <Button
                variant="outline-warning"
                size="sm"
                onClick={() => {
                  const user = personalAlertUser;
                  setPersonalDataCompleted(false);
                  setPersonalAlertUser(null);
                  setPendingPersonalUser(user);
                }}
              >
                Completar ahora
              </Button>
            </Alert>
          </Col>
        </Row>
      )}

      {/* Header */}
      <Row className="mb-5">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="header-title display-4 mb-2">
                <FaUserGraduate className="me-3" />
                Gestión de Usuarios
              </h1>
              <p className="text-muted lead">Administra los usuarios del sistema educativo</p>
            </div>
            <div className="d-flex align-items-center gap-3">
              <Button
                variant="outline-primary"
                size="lg"
                onClick={handleDownloadPdf}
                disabled={downloading}
              >
                {downloading ? 'Generando...' : 'Reporte PDF'}
              </Button>
              <Button 
                className="add-btn d-flex align-items-center"
                size="lg"
                onClick={handleAdd}
              >
                <FaPlus className="me-2" />
                Nuevo Usuario
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Filters */}
      <Row className="mb-4">
        <Col md={6}>
          <Form.Group>
            <Form.Label>Buscar por nombre o email</Form.Label>
            <Form.Control
              type="text"
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                handleFilterChange();
              }}
            />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label>Filtrar por rol</Form.Label>
            <Form.Select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                handleFilterChange();
              }}
            >
              <option value="">Todos los roles</option>
              <option value="estudiante">Estudiante</option>
              <option value="profesor">Profesor</option>
              <option value="administrativo">Administrativo</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={2} className="d-flex align-items-end">
          <Button
            variant="outline-secondary"
            onClick={() => {
              setSearchTerm('');
              setRoleFilter('');
              setCurrentPage(1);
            }}
            className="w-100"
          >
            Limpiar
          </Button>
        </Col>
      </Row>

      {/* Results info */}
      <Row className="mb-3">
        <Col>
          <small className="text-muted">
            Mostrando {paginatedUsuarios.length} de {filteredUsuarios.length} usuarios
          </small>
        </Col>
      </Row>

      {/* Cards Grid */}
      <Row className="g-4">
        {paginatedUsuarios.map((usuario, index) => (
          <Col key={usuario.id} xl={4} lg={6} md={6} sm={12}>
            <Card 
              className="user-card fade-in-card h-100"
              style={{ '--delay': `${index * 0.1}s` }}
            >
              <Card.Header className="bg-light border-0 d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <div className="user-avatar me-3">
                    {usuario.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-info">
                    <h6 className="mb-1 fw-bold">{usuario.nombre}</h6>
                    <small className="text-muted">ID: {usuario.id}</small>
                  </div>
                </div>
                <div>
                  <Button
                    variant="outline-warning"
                    size="sm"
                    className="action-btn me-2"
                    onClick={() => handleEdit(usuario)}
                  >
                    <FaEdit />
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    className="action-btn"
                    onClick={() => handleDeleteClick(usuario)}
                  >
                    <FaTrash />
                  </Button>
                </div>
              </Card.Header>
              <Card.Body>
                <div className="mb-3 d-flex justify-content-center gap-2">
                  <Badge 
                    bg={getRoleBadgeVariant(usuario.rol)}
                    className="role-badge"
                  >
                    {getRoleIcon(usuario.rol)} {usuario.rol}
                  </Badge>
                  <Badge 
                    bg={usuario.activo ? 'success' : 'danger'}
                    className="role-badge"
                  >
                    {usuario.activo ? '✓ Activo' : '✗ Inactivo'}
                  </Badge>
                </div>
                <div className="d-flex align-items-center mb-2">
                  <FaEnvelope className="text-info me-3" />
                  <div className="flex-fill">
                    <small className="text-muted d-block">Email</small>
                    <span className="fw-semibold">{usuario.email}</span>
                  </div>
                </div>
                
                {/* Botones de activación/desactivación */}
                <div className="mt-3 pt-3 border-top">
                  {usuario.activo ? (
                    <Button
                      variant="warning"
                      size="sm"
                      className="w-100"
                      onClick={() => handleDeactivateUser(usuario)}
                    >
                      🔒 Desactivar Usuario
                    </Button>
                  ) : (
                    <Button
                      variant="success"
                      size="sm"
                      className="w-100"
                      onClick={() => handleActivateUser(usuario)}
                    >
                      🔓 Activar Usuario
                    </Button>
                  )}
                </div>
                
                {/* Notificación si no tiene datos personales */}
                {!usuario.datos_personales && (
                  <div className="mt-2">
                    <NotificacionDatosPersonales onAgregar={() => setUsuarioDatosId(usuario.id)} />
                  </div>
                )}
                {/* Formulario de datos personales si se selecciona */}
                {usuarioDatosId === usuario.id && (
                  <DatosPersonalesUsuario
                    usuarioId={usuario.id}
                    onSuccess={showSuccess}
                    onError={showError}
                  />
                )}
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Pagination */}
      {totalPages > 1 && (
        <Row className="mt-4">
          <Col className="d-flex justify-content-center">
            <nav>
              <ul className="pagination">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <li key={page} className={`page-item ${page === currentPage ? 'active' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                  </button>
                </li>
              </ul>
            </nav>
          </Col>
        </Row>
      )}

      {/* Empty State */}
      {filteredUsuarios.length === 0 && usuarios.length > 0 && (
        <Row className="mt-5">
          <Col className="text-center">
            <FaUserGraduate size={64} className="text-muted mb-3" />
            <h4 className="text-muted">No se encontraron usuarios</h4>
            <p className="text-muted">Intenta con otros filtros de búsqueda</p>
            <Button 
              variant="secondary" 
              onClick={() => {
                setSearchTerm('');
                setRoleFilter('');
                setCurrentPage(1);
              }}
            >
              Limpiar Filtros
            </Button>
          </Col>
        </Row>
      )}

      {/* Empty State */}
      {usuarios.length === 0 && (
        <Row className="mt-5">
          <Col className="text-center">
            <FaUserGraduate size={64} className="text-muted mb-3" />
            <h4 className="text-muted">No hay usuarios registrados</h4>
            <p className="text-muted">Comienza creando tu primer usuario</p>
            <Button 
              variant="primary" 
              size="lg" 
              onClick={handleAdd}
              className="add-btn"
            >
              <FaPlus className="me-2" />
              Crear Primer Usuario
            </Button>
          </Col>
        </Row>
      )}

      {/* Modal */}
      <Modal 
        show={showModal} 
        onHide={() => setShowModal(false)}
        centered
        size="md"
      >
        <Modal.Header closeButton className="modal-header">
          <Modal.Title>
            <FaUserGraduate className="me-2" />
            {editMode ? 'Editar Usuario' : 'Nuevo Usuario'}
          </Modal.Title>
        </Modal.Header>
        
        <Modal.Body className="p-4">
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">
                <FaUser className="me-2 text-primary" />
                Nombre Completo
              </Form.Label>
              <Form.Control
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                required
                className="form-control-lg"
                placeholder="Ej: Juan Pérez García"
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">
                <FaEnvelope className="me-2 text-info" />
                Correo Electrónico
              </Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={editMode}
                className="form-control-lg"
                placeholder="ejemplo@correo.com"
              />
              {editMode && (
                <Form.Text className="text-muted">
                  El email no se puede modificar
                </Form.Text>
              )}
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">
                <FaUserTag className="me-2 text-warning" />
                Rol del Usuario
              </Form.Label>
              <Form.Select
                name="rol"
                value={formData.rol}
                onChange={handleInputChange}
                required
                className="form-control-lg"
              >
                <option value="estudiante">👨‍🎓 Estudiante</option>
                <option value="profesor">👩‍🏫 Profesor</option>
                <option value="administrativo">👨‍💼 Administrativo</option>
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-4">
              <Form.Label className="fw-semibold">
                Contraseña
              </Form.Label>
              <Form.Control
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required={!editMode}
                className="form-control-lg"
                placeholder={editMode ? "Nueva contraseña (opcional)" : "Contraseña segura"}
              />
              <Form.Text className="text-muted">
                {editMode 
                  ? "Deja vacío para mantener la contraseña actual" 
                  : "Mínimo 6 caracteres"
                }
              </Form.Text>
            </Form.Group>
            
            <div className="d-flex gap-3 justify-content-end">
              <Button 
                variant="secondary" 
                onClick={() => setShowModal(false)}
                size="lg"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                variant="primary"
                disabled={loading}
                size="lg"
                className="px-4"
              >
                {loading ? (
                  <>
                    <div className="spinner-border spinner-border-sm me-2" role="status" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <FaUser className="me-2" />
                    Guardar
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      <Modal
        show={!!pendingPersonalUser}
        onHide={handleClosePersonalModal}
        centered
        size="lg"
        backdrop="static"
        keyboard={false}
      >
  <Modal.Header closeButton className="modal-header modal-header-warning">
          <Modal.Title className="d-flex align-items-center gap-2">
            <FaExclamationTriangle />
            Datos personales obligatorios
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <p className="text-muted">
            Para completar el alta de <strong>{pendingPersonalUser?.nombre}</strong>, registra los datos personales requeridos.
          </p>
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

      {/* Activation/Deactivation Dialog */}
      <Modal
        show={showActivationDialog}
        onHide={() => {
          setShowActivationDialog(false);
          setActivationUser(null);
          setDeactivationReason('');
        }}
        centered
        size="md"
      >
        <Modal.Header closeButton className={activationAction === 'desactivar' ? 'bg-warning' : 'bg-success text-white'}>
          <Modal.Title>
            {activationAction === 'activar' ? '🔓 Activar Usuario' : '🔒 Desactivar Usuario'}
          </Modal.Title>
        </Modal.Header>
        
        <Modal.Body className="p-4">
          <p className="mb-3">
            {activationAction === 'activar' ? (
              <>¿Estás seguro de que deseas <strong>activar</strong> al usuario <strong>{activationUser?.nombre}</strong>?</>
            ) : (
              <>¿Estás seguro de que deseas <strong>desactivar</strong> al usuario <strong>{activationUser?.nombre}</strong>?</>
            )}
          </p>

          {activationAction === 'activar' && (
            <Alert variant="success">
              <small>
                Al activar este usuario, podrá iniciar sesión y acceder al sistema nuevamente.
              </small>
            </Alert>
          )}

          {activationAction === 'desactivar' && (
            <>
              <Alert variant="warning">
                <small>
                  Al desactivar este usuario, no podrá iniciar sesión en el sistema hasta que sea reactivado.
                </small>
              </Alert>
              
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Motivo de desactivación (opcional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={deactivationReason}
                  onChange={(e) => setDeactivationReason(e.target.value)}
                  placeholder="Ej: Suspensión temporal, incumplimiento de normas, solicitud del usuario, etc."
                />
                <Form.Text className="text-muted">
                  Este motivo quedará registrado en el historial del usuario.
                </Form.Text>
              </Form.Group>
            </>
          )}

          <div className="d-flex gap-3 justify-content-end mt-4">
            <Button 
              variant="secondary" 
              onClick={() => {
                setShowActivationDialog(false);
                setActivationUser(null);
                setDeactivationReason('');
              }}
            >
              Cancelar
            </Button>
            <Button 
              variant={activationAction === 'activar' ? 'success' : 'warning'}
              onClick={confirmActivation}
            >
              {activationAction === 'activar' ? '✓ Confirmar Activación' : '⚠ Confirmar Desactivación'}
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default UsuariosList;