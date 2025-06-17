import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Row, Col, Badge } from 'react-bootstrap';
import { FaUser, FaEnvelope, FaLock, FaUserTag, FaSave, FaTimes, FaUserGraduate } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';

function UsuarioForm({ token, onSave, editingUser, onCancel }) {
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingUser) {
      setForm({
        nombre: editingUser.nombre || '',
        email: editingUser.email || '',
        password: '',
        rol: editingUser.rol || '',
      });
    } else {
      setForm({ nombre: '', email: '', password: '', rol: '' });
    }
  }, [editingUser]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(form);
      if (!editingUser) {
        setForm({ nombre: '', email: '', password: '', rol: '' });
      }
    } catch (error) {
      console.error('Error al guardar:', error);
    } finally {
      setLoading(false);
    }
  }

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
    <Card className="shadow-lg border-0 overflow-hidden mb-4">
      <style jsx>{`
        .form-card {
          transition: all 0.3s ease;
          animation: slideInDown 0.5s ease-out;
        }
        
        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .card-header-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .form-control-animated {
          transition: all 0.3s ease;
          border: 2px solid #e9ecef;
        }
        
        .form-control-animated:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
          transform: scale(1.02);
        }
        
        .btn-animated {
          transition: all 0.3s ease;
          border-radius: 10px;
          font-weight: 600;
        }
        
        .btn-animated:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }
        
        .btn-primary-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
        }
        
        .btn-primary-gradient:hover {
          background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
        }
        
        .form-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #6c757d;
          z-index: 10;
        }
        
        .form-control-with-icon {
          padding-left: 40px;
        }
        
        .role-preview {
          animation: bounceIn 0.5s ease;
        }
        
        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .spinner-border-sm {
          width: 1rem;
          height: 1rem;
        }
        
        .password-hint {
          background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
          border-left: 4px solid #ff6b6b;
        }
      `}</style>

      <Card.Header className="card-header-gradient text-center py-3">
        <h4 className="mb-0 d-flex align-items-center justify-content-center">
          <FaUserGraduate className="me-2" />
          {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
        </h4>
      </Card.Header>

      <Card.Body className="p-4">
        <Form onSubmit={handleSubmit} className="form-card">
          <Row className="g-3">
            <Col md={8}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold text-dark">
                  <FaUser className="me-2 text-primary" />
                  Nombre Completo
                </Form.Label>
                <div className="position-relative">
                  <FaUser className="form-icon" />
                  <Form.Control
                    type="text"
                    name="nombre"
                    placeholder="Ej: Juan Pérez García"
                    value={form.nombre}
                    onChange={handleChange}
                    required
                    className="form-control-animated form-control-with-icon"
                    size="lg"
                  />
                </div>
              </Form.Group>
            </Col>

            <Col md={4}>
              {form.rol && (
                <div className="mb-3">
                  <Form.Label className="fw-semibold text-dark">
                    Vista Previa
                  </Form.Label>
                  <div className="d-flex flex-column align-items-center">
                    <Badge 
                      bg={getRoleBadgeVariant(form.rol)} 
                      className="role-preview p-3 fs-6"
                    >
                      {getRoleIcon(form.rol)} {form.rol}
                    </Badge>
                  </div>
                </div>
              )}
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold text-dark">
                  <FaEnvelope className="me-2 text-info" />
                  Correo Electrónico
                </Form.Label>
                <div className="position-relative">
                  <FaEnvelope className="form-icon" />
                  <Form.Control
                    type="email"
                    name="email"
                    placeholder="ejemplo@correo.com"
                    value={form.email}
                    onChange={handleChange}
                    required={!editingUser}
                    disabled={!!editingUser}
                    className="form-control-animated form-control-with-icon"
                    size="lg"
                  />
                </div>
                {editingUser && (
                  <Form.Text className="text-muted">
                    El email no se puede modificar
                  </Form.Text>
                )}
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold text-dark">
                  <FaUserTag className="me-2 text-warning" />
                  Rol del Usuario
                </Form.Label>
                <div className="position-relative">
                  <FaUserTag className="form-icon" />
                  <Form.Select
                    name="rol"
                    value={form.rol}
                    onChange={handleChange}
                    required
                    className="form-control-animated form-control-with-icon"
                    size="lg"
                  >
                    <option value="">Seleccionar rol</option>
                    <option value="administrativo">👨‍💼 Administrativo</option>
                    <option value="profesor">👩‍🏫 Profesor</option>
                    <option value="estudiante">👨‍🎓 Estudiante</option>
                  </Form.Select>
                </div>
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold text-dark">
                  <FaLock className="me-2 text-danger" />
                  Contraseña
                </Form.Label>
                <div className="position-relative">
                  <FaLock className="form-icon" />
                  <Form.Control
                    type="password"
                    name="password"
                    placeholder={editingUser ? "Nueva contraseña (opcional)" : "Contraseña segura"}
                    value={form.password}
                    onChange={handleChange}
                    required={!editingUser}
                    className="form-control-animated form-control-with-icon"
                    size="lg"
                  />
                </div>
                <Form.Text className="text-muted">
                  {editingUser 
                    ? "Deja vacío para mantener la contraseña actual" 
                    : "Mínimo 6 caracteres, incluye letras y números"
                  }
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>

          {editingUser && (
            <Row className="mt-3">
              <Col>
                <div className="password-hint p-3 rounded">
                  <small className="text-dark">
                    <strong>🔒 Seguridad:</strong> Si cambias la contraseña, el usuario tendrá que iniciar sesión nuevamente.
                  </small>
                </div>
              </Col>
            </Row>
          )}

          <Row className="mt-4">
            <Col>
              <div className="d-flex gap-3 justify-content-end">
                {editingUser && (
                  <Button
                    type="button"
                    variant="outline-secondary"
                    size="lg"
                    onClick={onCancel}
                    className="btn-animated d-flex align-items-center"
                  >
                    <FaTimes className="me-2" />
                    Cancelar
                  </Button>
                )}
                
                <Button
                  type="submit"
                  className="btn-animated btn-primary-gradient d-flex align-items-center px-4"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="spinner-border spinner-border-sm me-2" role="status" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <FaSave className="me-2" />
                      {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                    </>
                  )}
                </Button>
              </div>
            </Col>
          </Row>
        </Form>
      </Card.Body>
    </Card>
  );
}

export default UsuarioForm;
