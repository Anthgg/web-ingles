import React, { useState, useEffect } from 'react';
import { 
  FaUser, FaCheckCircle, FaTimesCircle, FaSearch, 
  FaFilter, FaIdCard, FaUserGraduate, FaChalkboardTeacher,
  FaUserShield, FaExclamationTriangle, FaInfoCircle, FaEdit
} from 'react-icons/fa';
import CompletarDatosUsuario from './CompletarDatosUsuario';

const UsuariosIncompletos = ({ token, showError, showSuccess }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroRol, setFiltroRol] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    estudiantes: 0,
    docentes: 0,
    administradores: 0,
    incompletos: 0
  });

  useEffect(() => {
    cargarUsuarios();
  }, [token]);

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3002/usuarios/incompletos', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar usuarios');
      }

      const data = await response.json();
      setUsuarios(data);
      calcularEstadisticas(data);
    } catch (error) {
      console.error('Error:', error);
      showError?.('Error al cargar la lista de usuarios incompletos');
    } finally {
      setLoading(false);
    }
  };

  const calcularEstadisticas = (data) => {
    const stats = {
      total: data.length,
      estudiantes: data.filter(u => u.rol === 'estudiante').length,
      docentes: data.filter(u => u.rol === 'profesor' || u.rol === 'docente').length,
      administradores: data.filter(u => u.rol === 'admin' || u.rol === 'administrativo').length,
      incompletos: data.filter(u => !u.datos_completos).length
    };
    setStats(stats);
  };

  const obtenerCodigoUsuario = (usuario) => {
    if (usuario.codigo_estudiante) return usuario.codigo_estudiante;
    if (usuario.codigo_docente) return usuario.codigo_docente;
    if (usuario.codigo_admin) return usuario.codigo_admin;
    return 'Sin código';
  };

  const obtenerIconoRol = (rol) => {
    if (rol === 'estudiante') return <FaUserGraduate className="text-blue-500" />;
    if (rol === 'profesor' || rol === 'docente') return <FaChalkboardTeacher className="text-green-500" />;
    if (rol === 'admin' || rol === 'administrativo') return <FaUserShield className="text-purple-500" />;
    return <FaUser />;
  };

  const obtenerColorEstado = (datosCompletos) => {
    return datosCompletos ? 'text-green-600' : 'text-red-600';
  };

  const usuariosFiltrados = usuarios.filter(usuario => {
    const matchRol = filtroRol === 'todos' || usuario.rol === filtroRol;
    const matchBusqueda = busqueda === '' || 
      usuario.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      usuario.email.toLowerCase().includes(busqueda.toLowerCase()) ||
      obtenerCodigoUsuario(usuario).toLowerCase().includes(busqueda.toLowerCase());
    
    return matchRol && matchBusqueda;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <FaExclamationTriangle className="text-yellow-500" />
              Control de Datos de Usuarios
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Usuarios que necesitan completar sus datos personales
            </p>
          </div>
          <button
            onClick={cargarUsuarios}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Actualizar
          </button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Usuarios</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</p>
              </div>
              <FaUser className="text-3xl text-blue-500" />
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Estudiantes</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.estudiantes}</p>
              </div>
              <FaUserGraduate className="text-3xl text-blue-500" />
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Docentes</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.docentes}</p>
              </div>
              <FaChalkboardTeacher className="text-3xl text-green-500" />
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Admins</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.administradores}</p>
              </div>
              <FaUserShield className="text-3xl text-purple-500" />
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Incompletos</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.incompletos}</p>
              </div>
              <FaExclamationTriangle className="text-3xl text-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o código..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <FaFilter className="text-gray-400" />
            <select
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todos">Todos los roles</option>
              <option value="estudiante">Estudiantes</option>
              <option value="docente">Docentes</option>
              <option value="profesor">Profesores</option>
              <option value="admin">Administradores</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Estado Datos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Campos Faltantes
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    <FaInfoCircle className="inline-block mr-2 text-2xl" />
                    No se encontraron usuarios con los filtros aplicados
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((usuario) => (
                  <tr 
                    key={usuario.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                          {obtenerIconoRol(usuario.rol)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {usuario.nombre}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            ID: {usuario.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FaIdCard className="text-blue-500" />
                        <span className="text-sm font-mono font-semibold text-gray-900 dark:text-white">
                          {obtenerCodigoUsuario(usuario)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${usuario.rol === 'estudiante' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : ''}
                        ${(usuario.rol === 'profesor' || usuario.rol === 'docente') ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}
                        ${(usuario.rol === 'admin' || usuario.rol === 'administrativo') ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : ''}
                      `}>
                        {usuario.rol}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {usuario.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {usuario.datos_completos ? (
                          <>
                            <FaCheckCircle className="text-green-500 text-xl" />
                            <span className="text-sm font-medium text-green-600 dark:text-green-400">
                              Completo
                            </span>
                          </>
                        ) : (
                          <>
                            <FaTimesCircle className="text-red-500 text-xl" />
                            <span className="text-sm font-medium text-red-600 dark:text-red-400">
                              Incompleto
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {!usuario.datos_completos && usuario.campos_faltantes ? (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          <ul className="list-disc list-inside">
                            {usuario.campos_faltantes.split(',').map((campo, idx) => (
                              <li key={idx}>{campo.trim()}</li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <span className="text-sm text-green-600 dark:text-green-400">
                          ✓ Todos los campos completos
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setUsuarioSeleccionado(usuario);
                          setMostrarFormulario(true);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        <FaEdit />
                        Completar Datos
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Información adicional */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <FaInfoCircle className="text-blue-500 text-xl mt-1 flex-shrink-0" />
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <p className="font-semibold mb-2">Información sobre códigos modulares:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>EST-XXXX:</strong> Códigos para estudiantes</li>
              <li><strong>DOC-XXXX:</strong> Códigos para docentes/profesores</li>
              <li><strong>ADM-XXXX:</strong> Códigos para administradores</li>
            </ul>
            <p className="mt-3">
              Los usuarios con datos incompletos deben completar su información personal 
              (DNI, edad, teléfono, dirección) desde su perfil.
            </p>
          </div>
        </div>
      </div>

      {/* Modal para completar datos */}
      {mostrarFormulario && usuarioSeleccionado && (
        <CompletarDatosUsuario
          token={token}
          usuarioId={usuarioSeleccionado.id}
          usuarioRol={usuarioSeleccionado.rol}
          onClose={() => {
            setMostrarFormulario(false);
            setUsuarioSeleccionado(null);
          }}
          onSuccess={() => {
            cargarUsuarios();
            showSuccess?.('Datos actualizados correctamente');
          }}
          showError={showError}
          showSuccess={showSuccess}
        />
      )}
    </div>
  );
};

export default UsuariosIncompletos;
