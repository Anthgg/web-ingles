import React, { useState } from 'react';
import { Button, Modal, Form, Card, Container, Row, Col, Badge } from 'react-bootstrap';
import { FaEdit, FaTrash, FaPlus, FaUser, FaEnvelope, FaUserTag, FaUserGraduate } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';

const UsuariosList = ({ usuarios, token, fetchUsuarios, showError, showSuccess }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', email: '', password: '', rol: 'estudiante' });
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

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
      
      if (!res.ok) throw new Error(editMode ? 'Error al actualizar usuario' : 'Error al crear usuario');
      
      showSuccess(editMode ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente');
      fetchUsuarios();
      setShowModal(false);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return;
    
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
      <style jsx>{`
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
            <Button 
              className="add-btn d-flex align-items-center"
              size="lg"
              onClick={handleAdd}
            >
              <FaPlus className="me-2" />
              Nuevo Usuario
            </Button>
          </div>
        </Col>
      </Row>

      {/* Cards Grid */}
      <Row className="g-4">
        {usuarios.map((usuario, index) => (
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
                    onClick={() => handleDelete(usuario.id)}
                  >
                    <FaTrash />
                  </Button>
                </div>
              </Card.Header>
              
              <Card.Body>
                <div className="mb-3 text-center">
                  <Badge 
                    bg={getRoleBadgeVariant(usuario.rol)}
                    className="role-badge"
                  >
                    {getRoleIcon(usuario.rol)} {usuario.rol}
                  </Badge>
                </div>
                
                <div className="d-flex align-items-center mb-2">
                  <FaEnvelope className="text-info me-3" />
                  <div className="flex-fill">
                    <small className="text-muted d-block">Email</small>
                    <span className="fw-semibold">{usuario.email}</span>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-top">
                  <small className="text-muted">
                    Usuario activo en el sistema
                  </small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

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
    </Container>
  );
};

export default UsuariosList;