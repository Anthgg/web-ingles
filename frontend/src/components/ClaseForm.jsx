import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Row, Col } from 'react-bootstrap';
import { FaBook, FaFileText, FaSave, FaTimes, FaGraduationCap } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';

function ClaseForm({ token, onSave, editingClase, onCancel }) {
  const [form, setForm] = useState({ nombre: '', descripcion: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingClase) {
      setForm({
        nombre: editingClase.nombre || '',
        descripcion: editingClase.descripcion || '',
      });
    } else {
      setForm({ nombre: '', descripcion: '' });
    }
  }, [editingClase]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(form);
      if (!editingClase) {
        setForm({ nombre: '', descripcion: '' });
      }
    } catch (error) {
      console.error('Error al guardar:', error);
    } finally {
      setLoading(false);
    }
  }

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
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
        }
        
        .form-control-animated {
          transition: all 0.3s ease;
          border: 2px solid #e9ecef;
        }
        
        .form-control-animated:focus {
          border-color: #28a745;
          box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25);
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
        
        .btn-success-gradient {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          border: none;
        }
        
        .btn-success-gradient:hover {
          background: linear-gradient(135deg, #228a3c 0%, #1cad85 100%);
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
        
        .spinner-border-sm {
          width: 1rem;
          height: 1rem;
        }
        
        .card-glow {
          box-shadow: 0 0 20px rgba(40, 167, 69, 0.1);
        }
      `}</style>

      <Card.Header className="card-header-gradient text-center py-3">
        <h4 className="mb-0 d-flex align-items-center justify-content-center">
          <FaGraduationCap className="me-2" />
          {editingClase ? 'Editar Clase' : 'Nueva Clase'}
        </h4>
      </Card.Header>

      <Card.Body className="p-4">
        <Form onSubmit={handleSubmit} className="form-card">
          <Row className="g-3">
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold text-dark">
                  <FaBook className="me-2 text-success" />
                  Nombre de la Clase
                </Form.Label>
                <div className="position-relative">
                  <FaBook className="form-icon" />
                  <Form.Control
                    type="text"
                    name="nombre"
                    placeholder="Ej: Inglés Básico, Matemáticas Avanzadas..."
                    value={form.nombre}
                    onChange={handleChange}
                    required
                    className="form-control-animated form-control-with-icon"
                    size="lg"
                  />
                </div>
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold text-dark">
                  <FaFileText className="me-2 text-info" />
                  Descripción
                </Form.Label>
                <div className="position-relative">
                  <FaFileText 
                    className="form-icon" 
                    style={{ 
                      top: '20px',
                      transform: 'translateY(0)'
                    }} 
                  />
                  <Form.Control
                    as="textarea"
                    rows={4}
                    name="descripcion"
                    placeholder="Describe los objetivos, contenido y metodología de la clase..."
                    value={form.descripcion}
                    onChange={handleChange}
                    className="form-control-animated form-control-with-icon"
                    style={{ minHeight: '120px' }}
                  />
                </div>
                <Form.Text className="text-muted">
                  Opcional: Añade una descripción detallada de la clase
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>

          <Row className="mt-4">
            <Col>
              <div className="d-flex gap-3 justify-content-end">
                {editingClase && (
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
                  className="btn-animated btn-success-gradient d-flex align-items-center px-4"
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
                      {editingClase ? 'Guardar Cambios' : 'Crear Clase'}
                    </>
                  )}
                </Button>
              </div>
            </Col>
          </Row>

          {/* Información adicional */}
          <Row className="mt-3">
            <Col>
              <div className="bg-light p-3 rounded">
                <small className="text-muted">
                  <strong>💡 Consejo:</strong> Un nombre claro y una descripción detallada ayudan a los estudiantes a entender mejor el contenido de la clase.
                </small>
              </div>
            </Col>
          </Row>
        </Form>
      </Card.Body>
    </Card>
  );
}

export default ClaseForm;
