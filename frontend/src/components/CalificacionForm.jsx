import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Row, Col, Badge } from 'react-bootstrap';
import { FaUser, FaBook, FaStar, FaSave, FaTimes, FaGraduationCap } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';

function CalificacionForm({ token, onSave, usuarios, clases, editingCalificacion, onCancel }) {
  const [form, setForm] = useState({ estudiante_id: '', materia_id: '', calificacion: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingCalificacion) {
      setForm({
        estudiante_id: editingCalificacion.estudiante_id || '',
        materia_id: editingCalificacion.materia_id || '',
        calificacion: editingCalificacion.calificacion || '',
      });
    } else {
      setForm({ estudiante_id: '', materia_id: '', calificacion: '' });
    }
  }, [editingCalificacion]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(form);
      setForm({ estudiante_id: '', materia_id: '', calificacion: '' });
    } catch (error) {
      console.error('Error al guardar:', error);
    } finally {
      setLoading(false);
    }
  }

  const getGradePreview = (grade) => {
    if (!grade) return null;
    const numGrade = parseFloat(grade);
    if (numGrade >= 90) return { text: 'Excelente', variant: 'success' };
    if (numGrade >= 80) return { text: 'Muy Bueno', variant: 'warning' };
    if (numGrade >= 70) return { text: 'Bueno', variant: 'info' };
    return { text: 'Necesita Mejorar', variant: 'danger' };
  };

  const gradePreview = getGradePreview(form.calificacion);

  return (
    <Card className="shadow-lg border-0 overflow-hidden">
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
        
        .grade-preview {
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
      `}</style>

      <Card.Header className="card-header-gradient text-center py-3">
        <h4 className="mb-0 d-flex align-items-center justify-content-center">
          <FaGraduationCap className="me-2" />
          {editingCalificacion ? 'Editar Calificación' : 'Nueva Calificación'}
        </h4>
      </Card.Header>

      <Card.Body className="p-4">
        <Form onSubmit={handleSubmit} className="form-card">
          <Row className="g-3">
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold text-dark">
                  <FaUser className="me-2 text-primary" />
                  Estudiante
                </Form.Label>
                <div className="position-relative">
                  <FaUser className="form-icon" />
                  <Form.Select
                    name="estudiante_id"
                    value={form.estudiante_id}
                    onChange={handleChange}
                    required
                    className="form-control-animated form-control-with-icon"
                    size="lg"
                  >
                    <option value="">Seleccionar Estudiante</option>
                    {usuarios.filter(u => u.rol === 'estudiante').map(u => (
                      <option key={u.id} value={u.id}>
                        {u.nombre} ({u.email})
                      </option>
                    ))}
                  </Form.Select>
                </div>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold text-dark">
                  <FaBook className="me-2 text-info" />
                  Clase
                </Form.Label>
                <div className="position-relative">
                  <FaBook className="form-icon" />
                  <Form.Select
                    name="materia_id"
                    value={form.materia_id}
                    onChange={handleChange}
                    required
                    className="form-control-animated form-control-with-icon"
                    size="lg"
                  >
                    <option value="">Seleccionar Clase</option>
                    {clases.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </Form.Select>
                </div>
              </Form.Group>
            </Col>

            <Col md={8}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold text-dark">
                  <FaStar className="me-2 text-warning" />
                  Calificación (0-100)
                </Form.Label>
                <div className="position-relative">
                  <FaStar className="form-icon" />
                  <Form.Control
                    type="number"
                    name="calificacion"
                    placeholder="Ingresa la calificación"
                    value={form.calificacion}
                    onChange={handleChange}
                    required
                    min="0"
                    max="100"
                    step="0.1"
                    className="form-control-animated form-control-with-icon"
                    size="lg"
                  />
                </div>
                <Form.Text className="text-muted">
                  Ingresa un valor entre 0 y 100
                </Form.Text>
              </Form.Group>
            </Col>

            <Col md={4}>
              {gradePreview && (
                <div className="mb-3">
                  <Form.Label className="fw-semibold text-dark">
                    Vista Previa
                  </Form.Label>
                  <div className="d-flex flex-column align-items-center">
                    <Badge 
                      bg={gradePreview.variant} 
                      className="grade-preview p-3 fs-6"
                    >
                      {form.calificacion}/100
                    </Badge>
                    <small className="text-muted mt-1">
                      {gradePreview.text}
                    </small>
                  </div>
                </div>
              )}
            </Col>
          </Row>

          <Row className="mt-4">
            <Col>
              <div className="d-flex gap-3 justify-content-end">
                {editingCalificacion && (
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
                      {editingCalificacion ? 'Guardar Cambios' : 'Crear Calificación'}
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

export default CalificacionForm;
