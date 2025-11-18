import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Alert, Spinner, Badge, Tabs, Tab } from 'react-bootstrap';
import { FaShieldAlt, FaEye, FaPlus, FaEdit, FaTrash, FaCheck, FaTimes } from 'react-icons/fa';
import apiClient from '../api/client';

const PermisosPanel = ({ showError, showSuccess }) => {
  const [permisos, setPermisos] = useState({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('administrativo');

  const modulos = [
    { key: 'usuarios', nombre: 'Usuarios', icon: '👥' },
    { key: 'clases', nombre: 'Clases', icon: '📚' },
    { key: 'asistencias', nombre: 'Asistencias', icon: '✓' },
    { key: 'estadisticas', nombre: 'Estadísticas', icon: '📈' },
    { key: 'calificaciones', nombre: 'Calificaciones', icon: '📝' },
    { key: 'asignaciones', nombre: 'Asignaciones', icon: '🔗' },
    { key: 'reportes', nombre: 'Reportes', icon: '📊' },
    { key: 'export_asistencias', nombre: 'Exportar Asistencias', icon: '📥' },
    { key: 'configuracion', nombre: 'Configuración', icon: '⚙️' },
    { key: 'permisos', nombre: 'Permisos', icon: '🔐' },
    { key: 'chat', nombre: 'Chat', icon: '💬' },
    { key: 'wao', nombre: 'WAO', icon: '🚀' }
  ];

  const roles = [
    { key: 'admin', nombre: 'Administrador', color: 'danger', icon: '👑' },
    { key: 'administrativo', nombre: 'Administrativo', color: 'danger', icon: '👨‍💼' },
    { key: 'profesor', nombre: 'Profesor', color: 'primary', icon: '👨‍🏫' },
    { key: 'docente', nombre: 'Docente', color: 'info', icon: '👩‍🏫' },
    { key: 'estudiante', nombre: 'Estudiante', color: 'success', icon: '👨‍🎓' },
    { key: 'alumno', nombre: 'Alumno', color: 'success', icon: '👩‍🎓' }
  ];

  useEffect(() => {
    fetchPermisos();
  }, []);

  const fetchPermisos = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('http://localhost:3002/permisos');
      setPermisos(response.data.permisos || {});
    } catch (error) {
      showError('Error al cargar permisos: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const generateDescripcion = (rol, modulo, permisos) => {
    const acciones = [];
    if (permisos.puede_ver) acciones.push('ver');
    if (permisos.puede_crear) acciones.push('crear');
    if (permisos.puede_editar) acciones.push('editar');
    if (permisos.puede_eliminar) acciones.push('eliminar');

    if (acciones.length === 0) {
      return `Sin acceso a ${modulo}`;
    }
    
    if (acciones.length === 4) {
      return `Gestión completa de ${modulo}`;
    }

    const descripcionesPersonalizadas = {
      profesor: {
        usuarios: 'Solo puede ver lista de estudiantes',
        clases: 'Ver sus clases asignadas',
        asistencias: 'Registrar y editar asistencias de sus clases',
        estadisticas: 'Analiza métricas de asistencia y rendimiento',
        export_asistencias: 'Descarga reportes de asistencia en Excel',
        calificaciones: 'Gestión de calificaciones de sus estudiantes',
        asignaciones: 'Ver sus asignaciones',
        reportes: 'Ver reportes de sus clases',
        chat: 'Puede enviar mensajes',
        wao: 'Acceso al módulo WAO solicitado'
      },
      docente: {
        estadisticas: 'Accede al panel de estadísticas docente',
        export_asistencias: 'Puede exportar asistencia de sus cursos a Excel',
        wao: 'Acceso al módulo WAO solicitado'
      },
      estudiante: {
        clases: 'Ver sus clases asignadas',
        asistencias: 'Ver solo sus propias asistencias',
        calificaciones: 'Ver solo sus propias calificaciones',
        asignaciones: 'Ver sus asignaciones',
        chat: 'Puede enviar mensajes'
      }
    };

    if (descripcionesPersonalizadas[rol]?.[modulo]) {
      return descripcionesPersonalizadas[rol][modulo];
    }

    return `Puede ${acciones.join(', ')} ${modulo}`;
  };

  const updatePermiso = async (rol, modulo, campo, valor) => {
    try {
      setUpdating(true);
      
      // Obtener permisos actuales para generar nueva descripción
      const permisoActual = getPermisoModulo(rol, modulo);
      const permisosActualizados = {
        ...permisoActual,
        [campo]: valor
      };
      
      // Generar nueva descripción basada en los permisos actualizados
      const nuevaDescripcion = generateDescripcion(rol, modulo, permisosActualizados);
      
      await apiClient.put(
        `http://localhost:3002/permisos/${rol}/${modulo}`,
        { 
          [campo]: valor,
          descripcion: nuevaDescripcion
        }
      );
      showSuccess('Permiso actualizado correctamente');
      await fetchPermisos();
    } catch (error) {
      showError('Error al actualizar permiso: ' + (error.response?.data?.error || error.message));
    } finally {
      setUpdating(false);
    }
  };

  const getPermisoModulo = (rol, moduloKey) => {
    const permisosList = permisos[rol] || [];
    return permisosList.find(p => p.modulo === moduloKey) || {
      puede_ver: false,
      puede_crear: false,
      puede_editar: false,
      puede_eliminar: false
    };
  };

  const renderCheckbox = (rol, modulo, campo, valor) => {
    const isAdmin = rol === 'admin' || rol === 'administrativo';
    return (
      <Form.Check
        type="checkbox"
        checked={valor}
        disabled={updating || isAdmin}
        onChange={(e) => updatePermiso(rol, modulo, campo, e.target.checked)}
        className={isAdmin ? 'text-muted' : ''}
        title={isAdmin ? 'Los permisos de administrador no se pueden modificar' : ''}
      />
    );
  };

  const getRoleInfo = (roleKey) => {
    return roles.find(r => r.key === roleKey) || { nombre: roleKey, color: 'secondary', icon: '👤' };
  };

  if (loading) {
    return (
      <Card className="shadow-sm">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Cargando permisos...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div>
      <style>{`
        .permisos-panel {
          animation: fadeIn 0.5s ease-in;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .permissions-table {
          font-size: 0.9rem;
        }
        
        .permissions-table th {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-weight: 600;
          text-align: center;
          padding: 12px 8px;
          border: none;
        }
        
        .permissions-table td {
          text-align: center;
          vertical-align: middle;
          padding: 12px 8px;
        }
        
        .permissions-table tbody tr:hover {
          background-color: #f8f9fa;
        }
        
        .module-name {
          font-weight: 600;
          text-align: left !important;
        }
        
        .permission-icon {
          font-size: 1.1rem;
        }
        
        .admin-lock {
          color: #dc3545;
          font-weight: bold;
        }
        
        .role-tab {
          font-weight: 600;
          padding: 12px 24px;
        }
        
        .summary-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          margin-bottom: 20px;
        }
        
        .permission-badge {
          font-size: 0.8rem;
          padding: 4px 8px;
          margin: 0 2px;
        }
      `}</style>

      <Card className="shadow-sm permisos-panel mb-4">
        <Card.Header className="bg-white border-bottom">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <FaShieldAlt className="text-primary me-2" size={24} />
              <h4 className="mb-0 fw-bold">Panel de Permisos por Rol</h4>
            </div>
            <Button 
              variant="outline-primary" 
              size="sm"
              onClick={fetchPermisos}
              disabled={loading}
            >
              🔄 Recargar
            </Button>
          </div>
          <p className="text-muted mb-0 mt-2">
            Administra los permisos de cada rol en el sistema. El administrador tiene control total.
          </p>
        </Card.Header>

        <Card.Body className="p-0">
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="px-3 pt-3"
            variant="pills"
          >
            {roles.map(rol => {
              const rolePermisos = permisos[rol.key] || [];
              const totalPermisos = rolePermisos.reduce((sum, p) => {
                return sum + (p.puede_ver ? 1 : 0) + (p.puede_crear ? 1 : 0) + 
                       (p.puede_editar ? 1 : 0) + (p.puede_eliminar ? 1 : 0);
              }, 0);

              return (
                <Tab
                  key={rol.key}
                  eventKey={rol.key}
                  title={
                    <span className="role-tab">
                      {rol.icon} {rol.nombre}
                      <Badge bg={rol.color} className="ms-2">{totalPermisos}</Badge>
                    </span>
                  }
                >
                  <div className="p-4">
                    {/* Summary Card */}
                    {(rol.key === 'admin' || rol.key === 'administrativo') && (
                      <Alert variant="danger" className="d-flex align-items-center">
                        <span className="me-2">👑</span>
                        <strong>El Administrador es el Rey:</strong> Tiene control total sobre todos los módulos del sistema. Los permisos no se pueden modificar.
                      </Alert>
                    )}

                    {/* Permissions Table */}
                    <div className="table-responsive">
                      <Table bordered hover className="permissions-table mb-0">
                        <thead>
                          <tr>
                            <th style={{ width: '25%' }}>Módulo</th>
                            <th style={{ width: '15%' }}>
                              <FaEye className="permission-icon me-1" />
                              Ver
                            </th>
                            <th style={{ width: '15%' }}>
                              <FaPlus className="permission-icon me-1" />
                              Crear
                            </th>
                            <th style={{ width: '15%' }}>
                              <FaEdit className="permission-icon me-1" />
                              Editar
                            </th>
                            <th style={{ width: '15%' }}>
                              <FaTrash className="permission-icon me-1" />
                              Eliminar
                            </th>
                            <th style={{ width: '15%' }}>Descripción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {modulos.map(modulo => {
                            const permiso = getPermisoModulo(rol.key, modulo.key);
                            return (
                              <tr key={modulo.key}>
                                <td className="module-name">
                                  <span className="me-2">{modulo.icon}</span>
                                  {modulo.nombre}
                                </td>
                                <td>
                                  {renderCheckbox(rol.key, modulo.key, 'puede_ver', permiso.puede_ver)}
                                </td>
                                <td>
                                  {renderCheckbox(rol.key, modulo.key, 'puede_crear', permiso.puede_crear)}
                                </td>
                                <td>
                                  {renderCheckbox(rol.key, modulo.key, 'puede_editar', permiso.puede_editar)}
                                </td>
                                <td>
                                  {renderCheckbox(rol.key, modulo.key, 'puede_eliminar', permiso.puede_eliminar)}
                                </td>
                                <td>
                                  <small className="text-muted">{permiso.descripcion}</small>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    </div>

                    {/* Permission Summary */}
                    <div className="mt-4 p-3 bg-light rounded">
                      <h6 className="fw-bold mb-3">Resumen de Permisos</h6>
                      <div className="d-flex flex-wrap gap-2">
                        {modulos.map(modulo => {
                          const permiso = getPermisoModulo(rol.key, modulo.key);
                          const activePermisos = [];
                          if (permiso.puede_ver) activePermisos.push('Ver');
                          if (permiso.puede_crear) activePermisos.push('Crear');
                          if (permiso.puede_editar) activePermisos.push('Editar');
                          if (permiso.puede_eliminar) activePermisos.push('Eliminar');

                          if (activePermisos.length === 0) return null;

                          return (
                            <div key={modulo.key} className="d-inline-flex align-items-center">
                              <span className="me-2">{modulo.icon} <strong>{modulo.nombre}:</strong></span>
                              {activePermisos.map((p, i) => (
                                <Badge key={i} bg="primary" className="permission-badge">
                                  {p}
                                </Badge>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </Tab>
              );
            })}
          </Tabs>
        </Card.Body>
      </Card>

      {/* Legend */}
      <Card className="shadow-sm">
        <Card.Body>
          <h6 className="fw-bold mb-3">📖 Leyenda</h6>
          <div className="row">
            <div className="col-md-3">
              <strong><FaEye className="text-info me-2" />Ver:</strong>
              <p className="small text-muted mb-0">Puede visualizar y listar registros</p>
            </div>
            <div className="col-md-3">
              <strong><FaPlus className="text-success me-2" />Crear:</strong>
              <p className="small text-muted mb-0">Puede crear nuevos registros</p>
            </div>
            <div className="col-md-3">
              <strong><FaEdit className="text-warning me-2" />Editar:</strong>
              <p className="small text-muted mb-0">Puede modificar registros existentes</p>
            </div>
            <div className="col-md-3">
              <strong><FaTrash className="text-danger me-2" />Eliminar:</strong>
              <p className="small text-muted mb-0">Puede borrar registros del sistema</p>
            </div>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default PermisosPanel;
