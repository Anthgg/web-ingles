import React, { useState } from 'react';
import { Button, Modal, Form, Card, Container, Row, Col, Badge } from 'react-bootstrap';
import { FaEdit, FaTrash, FaPlus, FaBook, FaGraduationCap, FaFileAlt } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';

const ClasesList = ({ clases, token, fetchClases, showError, showSuccess }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '' });
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
        ? `http://localhost:3005/materias/${formData.id}`
        : 'http://localhost:3005/materias';
      
      const method = editMode ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) throw new Error(editMode ? 'Error al actualizar clase' : 'Error al crear clase');
      
      showSuccess(editMode ? 'Clase actualizada correctamente' : 'Clase creada correctamente');
      fetchClases();
      setShowModal(false);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta clase?')) return;
    
    try {
      const res = await fetch(`http://localhost:3005/materias/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Error al eliminar clase');
      
      showSuccess('Clase eliminada correctamente');
      fetchClases();
    } catch (err) {
      showError(err.message);
    }
  };

  const handleEdit = (clase) => {
    setFormData({
      id: clase.id,
      nombre: clase.nombre,
      descripcion: clase.descripcion
    });
    setEditMode(true);
    setShowModal(true);
  };

  const handleAdd = () => {
    setFormData({ nombre: '', descripcion: '' });
    setEditMode(false);
    setShowModal(true);
  };

  return (
    <Container fluid className="py-4">
      <style jsx>{`
        .class-card {
          transition: all 0.3s ease;
          border: none;
          box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          animation: fadeInUp 0.6s ease forwards;
          opacity: 0;
          transform: translateY(20px);
        }
        
        .class-card:hover {
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
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 700;
        }
        
        .add-btn {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          border: none;
          border-radius: 12px;
          transition: all 0.3s ease;
        }
        
        .add-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(40, 167, 69, 0.3);
        }
        
        .class-badge {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
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
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
        }
        
        .spinner-border-sm {
          width: 1rem;
          height: 1rem;
        }
        
        .description-text {
          color: #6c757d;
          line-height: 1.5;
          max-height: 60px;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
        }
      `}</style>

      {/* Header */}
      <Row className="mb-5">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="header-title display-4 mb-2">
                <FaGraduationCap className="me-3" />
                Gestión de Clases
              </h1>
              <p className="text-muted lead">Administra las clases y materias del sistema</p>
            </div>
            <Button 
              className="add-btn d-flex align-items-center"
              size="lg"
              onClick={handleAdd}
            >
              <FaPlus className="me-2" />
              Nueva Clase
            </Button>
          </div>
        </Col>
      </Row>

      {/* Cards Grid */}
      <Row className="g-4">
        {clases.map((clase, index) => (
          <Col key={clase.id} xl={4} lg={6} md={6} sm={12}>
            <Card 
              className="class-card fade-in-card h-100"
              style={{ '--delay': `${index * 0.1}s` }}
            >
              <Card.Header className="bg-light border-0 d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <FaBook className="text-success me-2" />
                  <Badge className="class-badge">
                    ID: {clase.id}
                  </Badge>
                </div>
                <div>
                  <Button
                    variant="outline-warning"
                    size="sm"
                    className="action-btn me-2"
                    onClick={() => handleEdit(clase)}
                  >
                    <FaEdit />
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    className="action-btn"
                    onClick={() => handleDelete(clase.id)}
                  >
                    <FaTrash />
                  </Button>
                </div>
              </Card.Header>
              
              <Card.Body className="d-flex flex-column">
                <div className="mb-3">
                  <h5 className="card-title text-dark fw-bold mb-2">
                    {clase.nombre}
                  </h5>
                  {clase.descripcion && (
                    <div className="d-flex align-items-start">
                      <FaFileAlt className="text-info me-2 mt-1" style={{ fontSize: '0.8rem' }} />
                      <p className="description-text mb-0">
                        {clase.descripcion}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="mt-auto">
                  <div className="bg-light p-2 rounded text-center">
                    <small className="text-muted">
                      Clase creada en el sistema educativo
                    </small>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Empty State */}
      {clases.length === 0 && (
        <Row className="mt-5">
          <Col className="text-center">
            <FaGraduationCap size={64} className="text-muted mb-3" />
            <h4 className="text-muted">No hay clases registradas</h4>
            <p className="text-muted">Comienza creando tu primera clase</p>
            <Button 
              variant="success" 
              size="lg" 
              onClick={handleAdd}
              className="add-btn"
            >
              <FaPlus className="me-2" />
              Crear Primera Clase
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
            <FaGraduationCap className="me-2" />
            {editMode ? 'Editar Clase' : 'Nueva Clase'}
          </Modal.Title>
        </Modal.Header>
        
        <Modal.Body className="p-4">
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">
                <FaBook className="me-2 text-success" />
                Nombre de la Clase
              </Form.Label>
              <Form.Control
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                required
                className="form-control-lg"
                placeholder="Ej: Inglés Básico, Matemáticas..."
              />
            </Form.Group>
            
            <Form.Group className="mb-4">
              <Form.Label className="fw-semibold">
                <FaFileAlt className="me-2 text-info" />
                Descripción
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="descripcion"
                value={formData.descripcion}
                onChange={handleInputChange}
                className="form-control-lg"
                placeholder="Describe los objetivos y contenido de la clase..."
              />
              <Form.Text className="text-muted">
                Opcional: Añade una descripción detallada de la clase
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
                variant="success"
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
                    <FaBook className="me-2" />
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

export default ClasesList;