import React, { useState, useEffect } from 'react';
import { Search, Edit, Eye, User, Filter, Download, RefreshCw, FileText } from 'lucide-react';
import CompletarDatosUsuario from './CompletarDatosUsuario';
import UserAvatar from './UserAvatar';
import { useAuth } from '../context/AuthContext';

const GestionUsuariosCompletos = () => {
  const { token } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('todos');
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarDetalles, setMostrarDetalles] = useState(false);
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    cargarUsuarios();
  }, []);

  useEffect(() => {
    filtrarUsuarios();
  }, [busqueda, filtroRol, usuarios]);

  const cargarUsuarios = async () => {
    try {
      setCargando(true);
      
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      const response = await fetch('http://localhost:3002/usuarios', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        }
        throw new Error('Error al cargar usuarios');
      }

      const data = await response.json();
      console.log('Total usuarios:', data.length);
      
      // Cargar también la lista de usuarios incompletos
      const responseIncompletos = await fetch('http://localhost:3002/usuarios/incompletos', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      let idsIncompletos = [];
      if (responseIncompletos.ok) {
        const dataIncompletos = await responseIncompletos.json();
        idsIncompletos = dataIncompletos.map(u => u.id);
        console.log('Usuarios incompletos IDs:', idsIncompletos);
      }
      
      // Si el backend marca a todos como incompletos, no filtremos para que el panel no quede vacío.
      const debeFiltrarIncompletos = idsIncompletos.length > 0 && idsIncompletos.length < data.length;
      const usuariosCompletos = debeFiltrarIncompletos
        ? data.filter(u => !idsIncompletos.includes(u.id))
        : data;
      console.log('Usuarios completos:', usuariosCompletos.length);
      console.log('IDs de usuarios completos:', usuariosCompletos.map(u => u.id));
      console.log('Usuario 22 encontrado:', usuariosCompletos.find(u => u.id === 22));
      
      setUsuarios(usuariosCompletos);
      setError('');
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Error al cargar los usuarios');
    } finally {
      setCargando(false);
    }
  };

  const filtrarUsuarios = () => {
    let resultado = [...usuarios];

    // Filtro por búsqueda
    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase();
      resultado = resultado.filter(u =>
        u.nombre?.toLowerCase().includes(termino) ||
        u.email?.toLowerCase().includes(termino) ||
        u.documento_identidad?.toLowerCase().includes(termino)
      );
    }

    // Filtro por rol
    if (filtroRol !== 'todos') {
      resultado = resultado.filter(u => u.rol === filtroRol);
    }

    setUsuariosFiltrados(resultado);
  };

  const abrirEdicion = (usuario) => {
    setUsuarioSeleccionado(usuario);
    setMostrarModal(true);
  };

  const abrirDetalles = async (usuario) => {
    try {
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      const response = await fetch(`http://localhost:3002/usuarios/${usuario.id}/datos-completos`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        }
        throw new Error('Error al cargar detalles');
      }

      const data = await response.json();
      setUsuarioSeleccionado({ ...usuario, detalles: data });
      setMostrarDetalles(true);
    } catch (err) {
      console.error('Error:', err);
      setError('Error al cargar detalles del usuario');
    }
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setUsuarioSeleccionado(null);
    cargarUsuarios(); // Recargar después de editar
  };

  const cerrarDetalles = () => {
    setMostrarDetalles(false);
    setUsuarioSeleccionado(null);
  };

  const descargarPdf = async (usuario) => {
    try {
      setDescargando(true);
      if (!token) throw new Error('No hay token de autenticaci��n');

      // Reusar el generador de PDF del panel de usuarios (backend)
      const response = await fetch(`http://localhost:3002/api/users/${usuario.id}/report.pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/pdf',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (!response.ok) throw new Error('Error al obtener el PDF del usuario');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `usuario_${usuario.id}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.error('Error al generar PDF:', err);
      setError('No se pudo generar el PDF del usuario');
    } finally {
      setDescargando(false);
    }
  };
  const exportarCSV = () => {
    const headers = ['ID', 'Nombre', 'Email', 'Rol', 'Documento', 'Teléfono'];
    const rows = usuariosFiltrados.map(u => [
      u.id,
      u.nombre,
      u.email,
      u.rol,
      u.documento_identidad || '',
      u.telefono || ''
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usuarios_completos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getRolBadgeClass = (rol) => {
    const classes = {
      'administrador': 'bg-purple-50 text-purple-700 border border-purple-100',
      'profesor': 'bg-blue-50 text-blue-700 border border-blue-100',
      'docente': 'bg-blue-50 text-blue-700 border border-blue-100',
      'estudiante': 'bg-emerald-50 text-emerald-700 border border-emerald-100'
    };
    return classes[rol] || 'bg-slate-50 text-slate-700 border border-slate-200';
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 via-white to-slate-100 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-1">Gestión de Usuarios</h1>
        <p className="text-slate-600 text-sm">Usuarios con datos completos: {usuarios.length}</p>
      </div>

      {/* Controles */}
      <div className="bg-white/90 backdrop-blur rounded-2xl shadow-md p-5 mb-6 border border-slate-100">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o documento..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* Filtro por rol */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <select
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value)}
              className="pl-10 pr-8 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-300 appearance-none bg-white text-slate-800 transition"
            >
              <option value="todos">Todos los roles</option>
              <option value="estudiante">Estudiantes</option>
              <option value="profesor">Profesores</option>
              <option value="docente">Docentes</option>
              <option value="administrador">Administradores</option>
            </select>
          </div>

          {/* Botones de acción */}
          <button
            onClick={cargarUsuarios}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition border border-slate-200 shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>

          <button
            onClick={exportarCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Tabla de usuarios */}
      <div className="bg-white/95 backdrop-blur rounded-2xl shadow-lg overflow-hidden border border-slate-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.08em]">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.08em]">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.08em]">
                  Documento
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.08em]">
                  Teléfono
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.08em]">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-[0.08em]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                    <User className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p>No se encontraron usuarios</p>
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserAvatar 
                          userId={usuario.id}
                          nombre={usuario.nombre}
                          tieneFoto={usuario.tiene_foto_perfil}
                          size="md"
                        />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900">{usuario.nombre}</div>
                          <div className="text-sm text-slate-500">{usuario.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRolBadgeClass(usuario.rol)}`}>
                        {usuario.rol}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {usuario.documento_identidad || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {usuario.telefono || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${
                        usuario.activo ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => abrirDetalles(usuario)}
                          className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition border border-transparent hover:border-blue-100"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => descargarPdf(usuario)}
                          className="text-indigo-600 hover:text-indigo-900 p-2 hover:bg-indigo-50 rounded-lg transition border border-transparent hover:border-indigo-100"
                          title={descargando ? 'Generando PDF...' : 'Descargar PDF'}
                          disabled={descargando}
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => abrirEdicion(usuario)}
                          className="text-emerald-600 hover:text-emerald-900 p-2 hover:bg-emerald-50 rounded-lg transition border border-transparent hover:border-emerald-100"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación info */}
      <div className="mt-4 text-sm text-slate-600 text-center">
        Mostrando {usuariosFiltrados.length} de {usuarios.length} usuarios
      </div>

      {/* Modal de edición */}
      {mostrarModal && usuarioSeleccionado && (
        <CompletarDatosUsuario
          token={token}
          usuarioId={usuarioSeleccionado.id}
          usuarioRol={usuarioSeleccionado.rol}
          onClose={cerrarModal}
          onSuccess={cerrarModal}
        />
      )}

      {/* Modal de detalles */}
      {mostrarDetalles && usuarioSeleccionado?.detalles && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white/95 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-slate-900">Detalles del Usuario</h2>
              <button
                onClick={cerrarDetalles}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {/* Datos básicos */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Información Básica</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DetailItem label="Nombre" value={usuarioSeleccionado.detalles.basicos?.nombre} />
                  <DetailItem label="Email" value={usuarioSeleccionado.detalles.basicos?.email} />
                  <DetailItem label="Documento" value={usuarioSeleccionado.detalles.basicos?.documento_identidad} />
                  <DetailItem label="Tipo de documento" value={usuarioSeleccionado.detalles.basicos?.tipo_documento} />
                  <DetailItem label="Teléfono" value={usuarioSeleccionado.detalles.basicos?.telefono} />
                  <DetailItem label="Fecha de nacimiento" value={usuarioSeleccionado.detalles.basicos?.fecha_nacimiento} />
                  <DetailItem label="Género" value={usuarioSeleccionado.detalles.basicos?.genero} />
                  <DetailItem label="Estado civil" value={usuarioSeleccionado.detalles.basicos?.estado_civil} />
                  <DetailItem label="Nacionalidad" value={usuarioSeleccionado.detalles.basicos?.nacionalidad} />
                </div>
              </div>

              {/* Datos específicos del rol */}
              {usuarioSeleccionado.rol === 'estudiante' && usuarioSeleccionado.detalles.estudiante && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Información Académica</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DetailItem label="Matrícula" value={usuarioSeleccionado.detalles.estudiante.matricula} />
                    <DetailItem label="Nivel" value={usuarioSeleccionado.detalles.estudiante.nivel} />
                    <DetailItem label="Grado" value={usuarioSeleccionado.detalles.estudiante.grado} />
                    <DetailItem label="Sección" value={usuarioSeleccionado.detalles.estudiante.seccion} />
                    <DetailItem label="Turno" value={usuarioSeleccionado.detalles.estudiante.turno} />
                    <DetailItem label="Modalidad" value={usuarioSeleccionado.detalles.estudiante.modalidad} />
                    <DetailItem label="Condición académica" value={usuarioSeleccionado.detalles.estudiante.condicion_academica} />
                    <DetailItem label="Becado" value={usuarioSeleccionado.detalles.estudiante.becado ? 'Sí' : 'No'} />
                    {usuarioSeleccionado.detalles.estudiante.becado && (
                      <>
                        <DetailItem label="Tipo de beca" value={usuarioSeleccionado.detalles.estudiante.tipo_beca} />
                        <DetailItem label="Porcentaje de beca" value={`${usuarioSeleccionado.detalles.estudiante.porcentaje_beca}%`} />
                      </>
                    )}
                    <DetailItem label="Tutor" value={usuarioSeleccionado.detalles.estudiante.tutor_nombre} />
                    <DetailItem label="Teléfono del tutor" value={usuarioSeleccionado.detalles.estudiante.tutor_telefono} />
                    <DetailItem label="Email del tutor" value={usuarioSeleccionado.detalles.estudiante.tutor_email} />
                  </div>
                </div>
              )}

              {(usuarioSeleccionado.rol === 'profesor' || usuarioSeleccionado.rol === 'docente') && usuarioSeleccionado.detalles.docente && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Información Profesional</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DetailItem label="Especialidad" value={usuarioSeleccionado.detalles.docente.especialidad} />
                    <DetailItem label="Nivel académico" value={usuarioSeleccionado.detalles.docente.nivel_academico} />
                    <DetailItem label="Título profesional" value={usuarioSeleccionado.detalles.docente.titulo_profesional} />
                    <DetailItem label="Universidad de egreso" value={usuarioSeleccionado.detalles.docente.universidad_egreso} />
                    <DetailItem label="Número de colegiatura" value={usuarioSeleccionado.detalles.docente.numero_colegiatura} />
                    <DetailItem label="Carga horaria semanal" value={`${usuarioSeleccionado.detalles.docente.carga_horaria_semanal} horas`} />
                    <DetailItem label="Fecha de ingreso" value={usuarioSeleccionado.detalles.docente.fecha_ingreso} />
                    <DetailItem label="Nivel de inglés" value={usuarioSeleccionado.detalles.docente.nivel_ingles} />
                    <DetailItem label="Idiomas que domina" value={usuarioSeleccionado.detalles.docente.idiomas_domina} />
                    <DetailItem label="Áreas de investigación" value={usuarioSeleccionado.detalles.docente.areas_investigacion} className="md:col-span-2" />
                    <DetailItem label="Disponibilidad horaria" value={usuarioSeleccionado.detalles.docente.disponibilidad_horaria} className="md:col-span-2" />
                  </div>
                </div>
              )}

              {usuarioSeleccionado.rol === 'administrador' && usuarioSeleccionado.detalles.admin && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Información Administrativa</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DetailItem label="Cargo" value={usuarioSeleccionado.detalles.admin.cargo} />
                    <DetailItem label="Nivel de acceso" value={usuarioSeleccionado.detalles.admin.nivel_acceso} />
                    <DetailItem label="Área de responsabilidad" value={usuarioSeleccionado.detalles.admin.area_responsabilidad} />
                    <DetailItem label="Extensión telefónica" value={usuarioSeleccionado.detalles.admin.extension_telefonica} />
                    <DetailItem label="Horario de atención" value={usuarioSeleccionado.detalles.admin.horario_atencion} />
                    <DetailItem label="Ubicación de oficina" value={usuarioSeleccionado.detalles.admin.ubicacion_oficina} />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  cerrarDetalles();
                  abrirEdicion(usuarioSeleccionado);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-sm"
              >
                Editar
              </button>
              <button
                onClick={cerrarDetalles}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente auxiliar para mostrar detalles
const DetailItem = ({ label, value, className = '' }) => (
  <div className={`${className}`}>
    <dt className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-[0.08em]">{label}</dt>
    <dd className="text-sm text-slate-900">{value || '-'}</dd>
  </div>
);

export default GestionUsuariosCompletos;
