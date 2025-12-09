import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import { Form, Button, Card, Row, Col, Alert, Spinner } from 'react-bootstrap';

const DatosPersonalesUsuario = ({ usuarioId, onSuccess, onError, onCompleted }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rol, setRol] = useState('');

  // Estado para todos los campos posibles
  const [formData, setFormData] = useState({
    // Básicos
    dni: '',
    edad: '',
    telefono: '',
    email: '',
    direccion: '',

    // Estudiante
    matricula: '',
    grado: '',
    seccion: '',
    promedio_general: '',
    porcentaje_asistencia: '',
    estado_academico: '',

    // Docente
    especialidad: '',
    nivel_academico: '',
    tipo_contrato: '',

    // Admin
    cargo: '',
    nivel_acceso: '',
    area_responsabilidad: '',
    extension_telefonica: '',
    horario_atencion: '',
    ubicacion_oficina: '',
    observaciones: ''
  });

  const loadData = useCallback(async () => {
    if (!usuarioId) return;
    try {
      setLoading(true);
      // Usar el endpoint de datos completos para obtener todo
      const res = await fetch(`http://localhost:3002/usuarios/${usuarioId}/datos-completos`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Asumiendo token en localStorage
        }
      });

      if (!res.ok) throw new Error('Error al cargar datos');

      const data = await res.json();
      const basicos = data.basicos || {};
      const estudiante = data.estudiante || {};
      const docente = data.docente || {};
      const admin = data.admin || {};

      setRol(basicos.rol || '');

      setFormData({
        // Básicos
        dni: basicos.dni_alt || basicos.documento_identidad || '',
        edad: basicos.edad_alt || '',
        telefono: basicos.telefono_alt || basicos.telefono || '',
        email: basicos.email || '',
        direccion: basicos.direccion_alt || basicos.direccion || '',

        // Estudiante
        matricula: estudiante.matricula || '',
        grado: estudiante.grado || '',
        seccion: estudiante.seccion || '',
        promedio_general: estudiante.promedio_general || '',
        porcentaje_asistencia: estudiante.porcentaje_asistencia || '',
        estado_academico: estudiante.estado_academico || '',

        // Docente
        especialidad: docente.especialidad || '',
        nivel_academico: docente.nivel_academico || '',
        tipo_contrato: docente.tipo_contrato || '',

        // Admin
        cargo: admin.cargo || '',
        nivel_acceso: admin.nivel_acceso || '',
        area_responsabilidad: admin.area_responsabilidad || '',
        extension_telefonica: admin.extension_telefonica || '',
        horario_atencion: admin.horario_atencion || '',
        ubicacion_oficina: admin.ubicacion_oficina || '',
        observaciones: admin.observaciones || ''
      });
    } catch (error) {
      console.error(error);
      onError && onError('No se pudieron cargar los datos del usuario');
    } finally {
      setLoading(false);
    }
  }, [usuarioId, onError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Construir payload según rol
    const payload = {
      basicos: {
        dni: formData.dni,
        edad: formData.edad,
        telefono: formData.telefono,
        email: formData.email,
        direccion: formData.direccion
      }
    };

    if (rol === 'estudiante') {
      payload.estudiante = {
        matricula: formData.matricula,
        grado: formData.grado,
        seccion: formData.seccion,
        promedio_general: formData.promedio_general,
        porcentaje_asistencia: formData.porcentaje_asistencia,
        estado_academico: formData.estado_academico
      };
    } else if (rol === 'profesor' || rol === 'docente') {
      payload.docente = {
        especialidad: formData.especialidad,
        nivel_academico: formData.nivel_academico,
        tipo_contrato: formData.tipo_contrato
      };
    } else if (rol === 'admin' || rol === 'administrativo') {
      payload.admin = {
        cargo: formData.cargo,
        nivel_acceso: formData.nivel_acceso,
        area_responsabilidad: formData.area_responsabilidad,
        extension_telefonica: formData.extension_telefonica,
        horario_atencion: formData.horario_atencion,
        ubicacion_oficina: formData.ubicacion_oficina,
        observaciones: formData.observaciones
      };
    }

    try {
      const res = await fetch(`http://localhost:3002/usuarios/${usuarioId}/datos-completos`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Error al guardar datos');

      onSuccess && onSuccess('Datos actualizados correctamente');
      onCompleted && onCompleted();
      await loadData(); // Recargar para confirmar
    } catch (error) {
      onError && onError(error.message || 'Error al actualizar datos');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-3"><Spinner animation="border" size="sm" /> Cargando formulario...</div>;
  }

  return (
    <Card className="shadow-sm border-0">
      <Card.Header className="bg-white border-bottom-0 pt-4 px-4">
        <h5 className="mb-0 text-primary fw-bold">Completar Datos: {rol.toUpperCase()}</h5>
      </Card.Header>
      <Card.Body className="p-4">
        <Form onSubmit={handleSubmit}>
          {/* Datos Básicos (Comunes) */}
          <h6 className="text-muted mb-3 border-bottom pb-2">Información Personal Básica</h6>
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>DNI / Documento</Form.Label>
                <Form.Control type="text" name="dni" value={formData.dni} onChange={handleChange} required />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Edad</Form.Label>
                <Form.Control type="number" name="edad" value={formData.edad} onChange={handleChange} />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Teléfono</Form.Label>
                <Form.Control type="text" name="telefono" value={formData.telefono} onChange={handleChange} required />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control type="email" name="email" value={formData.email} onChange={handleChange} required />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Dirección</Form.Label>
                <Form.Control type="text" name="direccion" value={formData.direccion} onChange={handleChange} />
              </Form.Group>
            </Col>
          </Row>

          {/* Campos Específicos Estudiante */}
          {rol === 'estudiante' && (
            <>
              <h6 className="text-muted mb-3 border-bottom pb-2 mt-4">Información Académica</h6>
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Matrícula</Form.Label>
                    <Form.Control type="text" name="matricula" value={formData.matricula} onChange={handleChange} />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Grado</Form.Label>
                    <Form.Control type="text" name="grado" value={formData.grado} onChange={handleChange} />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Sección</Form.Label>
                    <Form.Control type="text" name="seccion" value={formData.seccion} onChange={handleChange} />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Promedio General</Form.Label>
                    <Form.Control type="number" step="0.01" name="promedio_general" value={formData.promedio_general} onChange={handleChange} />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>% Asistencia</Form.Label>
                    <Form.Control type="number" name="porcentaje_asistencia" value={formData.porcentaje_asistencia} onChange={handleChange} />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Estado Académico</Form.Label>
                    <Form.Select name="estado_academico" value={formData.estado_academico} onChange={handleChange}>
                      <option value="">Seleccionar...</option>
                      <option value="Regular">Regular</option>
                      <option value="En Riesgo">En Riesgo</option>
                      <option value="Excelente">Excelente</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </>
          )}

          {/* Campos Específicos Docente */}
          {(rol === 'profesor' || rol === 'docente') && (
            <>
              <h6 className="text-muted mb-3 border-bottom pb-2 mt-4">Información Profesional</h6>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Especialidad</Form.Label>
                    <Form.Control type="text" name="especialidad" value={formData.especialidad} onChange={handleChange} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Nivel Académico</Form.Label>
                    <Form.Control type="text" name="nivel_academico" value={formData.nivel_academico} onChange={handleChange} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Tipo de Contrato</Form.Label>
                    <Form.Select name="tipo_contrato" value={formData.tipo_contrato} onChange={handleChange}>
                      <option value="">Seleccionar...</option>
                      <option value="Tiempo Completo">Tiempo Completo</option>
                      <option value="Parcial">Parcial</option>
                      <option value="Por Horas">Por Horas</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </>
          )}

          {/* Campos Específicos Admin */}
          {(rol === 'admin' || rol === 'administrativo') && (
            <>
              <h6 className="text-muted mb-3 border-bottom pb-2 mt-4">Información Administrativa</h6>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Cargo</Form.Label>
                    <Form.Control type="text" name="cargo" value={formData.cargo} onChange={handleChange} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Área</Form.Label>
                    <Form.Control type="text" name="area_responsabilidad" value={formData.area_responsabilidad} onChange={handleChange} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Nivel Acceso</Form.Label>
                    <Form.Select name="nivel_acceso" value={formData.nivel_acceso} onChange={handleChange}>
                      <option value="">Seleccionar...</option>
                      <option value="Total">Total</option>
                      <option value="Parcial">Parcial</option>
                      <option value="Lectura">Solo Lectura</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Extensión Telefónica</Form.Label>
                    <Form.Control type="text" name="extension_telefonica" value={formData.extension_telefonica} onChange={handleChange} />
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>Observaciones</Form.Label>
                    <Form.Control as="textarea" rows={3} name="observaciones" value={formData.observaciones} onChange={handleChange} />
                  </Form.Group>
                </Col>
              </Row>
            </>
          )}

          <div className="d-flex justify-content-end mt-4">
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default DatosPersonalesUsuario;
