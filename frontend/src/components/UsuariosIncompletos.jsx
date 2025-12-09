import React, { useState, useEffect, useMemo } from 'react';
import { 
  FaUser, FaCheckCircle, FaTimesCircle, FaSearch, 
  FaFilter, FaIdCard, FaUserGraduate, FaChalkboardTeacher,
  FaUserShield, FaExclamationTriangle, FaInfoCircle, FaEdit,
  FaEye, FaTimes, FaEnvelope, FaPhone, FaMapMarkerAlt,
  FaCalendarAlt, FaBan, FaUnlock, FaSync, FaUserCheck,
  FaListUl, FaThLarge, FaChevronLeft, FaChevronRight,
  FaCamera, FaSortAmountDown, FaSortAmountUp, FaDownload
} from 'react-icons/fa';
import CompletarDatosUsuario from './CompletarDatosUsuario';

const UsuariosIncompletos = ({ token, showError, showSuccess }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroRol, setFiltroRol] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos'); // todos, incompletos, completos
  const [busqueda, setBusqueda] = useState('');
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarDetalles, setMostrarDetalles] = useState(false);
  const [vistaCards, setVistaCards] = useState(true);
  const [ordenamiento, setOrdenamiento] = useState({ campo: 'nombre', direccion: 'asc' });
  const [paginaActual, setPaginaActual] = useState(1);
  const [activandoUsuario, setActivandoUsuario] = useState(null);
  const [fotoErrors, setFotoErrors] = useState({});
  const usuariosPorPagina = 12;
  
  const [stats, setStats] = useState({
    total: 0,
    estudiantes: 0,
    docentes: 0,
    administradores: 0,
    incompletos: 0,
    completos: 0
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
      setFotoErrors({}); // Reset foto errors on reload
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
      incompletos: data.filter(u => !u.datos_completos).length,
      completos: data.filter(u => u.datos_completos).length
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

  const obtenerColorRol = (rol) => {
    if (rol === 'estudiante') return 'from-blue-500 to-blue-600';
    if (rol === 'profesor' || rol === 'docente') return 'from-green-500 to-green-600';
    if (rol === 'admin' || rol === 'administrativo') return 'from-purple-500 to-purple-600';
    return 'from-gray-500 to-gray-600';
  };

  const obtenerInicialesNombre = (nombre) => {
    if (!nombre) return '??';
    const partes = nombre.split(' ').filter(Boolean);
    if (partes.length >= 2) {
      return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
  };

  const calcularProgresoDatos = (usuario) => {
    const camposTotales = 9; // nombres, apellido_paterno, apellido_materno, documento, telefono, direccion, departamento, provincia, distrito
    const camposFaltantes = usuario.campos_faltantes ? usuario.campos_faltantes.split(',').filter(Boolean).length : 0;
    const camposCompletos = camposTotales - camposFaltantes;
    return Math.round((camposCompletos / camposTotales) * 100);
  };

  const manejarActivarDesactivar = async (usuario, accion) => {
    setActivandoUsuario(usuario.id);
    try {
      const response = await fetch(`http://localhost:3002/usuarios/${usuario.id}/${accion}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Error al ${accion} usuario`);
      }

      showSuccess?.(`Usuario ${accion === 'activar' ? 'activado' : 'desactivado'} correctamente`);
      cargarUsuarios();
    } catch (error) {
      showError?.(error.message);
    } finally {
      setActivandoUsuario(null);
    }
  };

  const handleFotoError = (userId) => {
    setFotoErrors(prev => ({ ...prev, [userId]: true }));
  };

  const usuariosFiltrados = useMemo(() => {
    let resultado = usuarios.filter(usuario => {
      const matchRol = filtroRol === 'todos' || usuario.rol === filtroRol;
      const matchEstado = 
        filtroEstado === 'todos' || 
        (filtroEstado === 'incompletos' && !usuario.datos_completos) ||
        (filtroEstado === 'completos' && usuario.datos_completos);
      const matchBusqueda = busqueda === '' || 
        usuario.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        usuario.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
        obtenerCodigoUsuario(usuario).toLowerCase().includes(busqueda.toLowerCase()) ||
        usuario.documento_identidad?.toLowerCase().includes(busqueda.toLowerCase());
      
      return matchRol && matchBusqueda && matchEstado;
    });

    // Ordenamiento
    resultado.sort((a, b) => {
      let valorA, valorB;
      
      switch (ordenamiento.campo) {
        case 'nombre':
          valorA = a.nombre?.toLowerCase() || '';
          valorB = b.nombre?.toLowerCase() || '';
          break;
        case 'rol':
          valorA = a.rol?.toLowerCase() || '';
          valorB = b.rol?.toLowerCase() || '';
          break;
        case 'progreso':
          valorA = calcularProgresoDatos(a);
          valorB = calcularProgresoDatos(b);
          break;
        case 'fecha':
          valorA = new Date(a.created_at || 0);
          valorB = new Date(b.created_at || 0);
          break;
        default:
          valorA = a.nombre?.toLowerCase() || '';
          valorB = b.nombre?.toLowerCase() || '';
      }

      if (ordenamiento.direccion === 'asc') {
        return valorA > valorB ? 1 : -1;
      }
      return valorA < valorB ? 1 : -1;
    });

    return resultado;
  }, [usuarios, filtroRol, filtroEstado, busqueda, ordenamiento]);

  // Paginación
  const totalPaginas = Math.ceil(usuariosFiltrados.length / usuariosPorPagina);
  const usuariosPaginados = usuariosFiltrados.slice(
    (paginaActual - 1) * usuariosPorPagina,
    paginaActual * usuariosPorPagina
  );

  const exportarDatos = () => {
    const datosExportar = usuariosFiltrados.map(u => ({
      Nombre: u.nombre_completo || u.nombre,
      Email: u.email,
      Rol: u.rol,
      Código: obtenerCodigoUsuario(u),
      Estado: u.datos_completos ? 'Completo' : 'Incompleto',
      'Campos Faltantes': u.campos_faltantes || 'Ninguno',
      Activo: u.activo ? 'Sí' : 'No'
    }));

    const csv = [
      Object.keys(datosExportar[0] || {}).join(','),
      ...datosExportar.map(row => Object.values(row).map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `usuarios_incompletos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const obtenerColorEstado = (datosCompletos) => {
    return datosCompletos ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 absolute top-0"></div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 animate-pulse">Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header Profesional */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <FaUserCheck className="text-white text-lg" />
                </div>
                Gestión de Usuarios
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                Administra y completa la información de los usuarios del sistema
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportarDatos}
                className="px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 
                         text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 
                         transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
              >
                <FaDownload className="text-gray-500" />
                Exportar CSV
              </button>
              <button
                onClick={cargarUsuarios}
                className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 
                         transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
              >
                <FaSync className={loading ? 'animate-spin' : ''} />
                Actualizar
              </button>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-100 dark:border-gray-600">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                <FaUser className="text-gray-600 dark:text-gray-300" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                <FaUserGraduate className="text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Estudiantes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.estudiantes}</p>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 border border-emerald-100 dark:border-emerald-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center">
                <FaChalkboardTeacher className="text-emerald-600 dark:text-emerald-300" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Docentes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.docentes}</p>
              </div>
            </div>
          </div>

          <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-4 border border-violet-100 dark:border-violet-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-800 flex items-center justify-center">
                <FaUserShield className="text-violet-600 dark:text-violet-300" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Admins</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.administradores}</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-800 flex items-center justify-center">
                <FaExclamationTriangle className="text-amber-600 dark:text-amber-300" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Pendientes</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.incompletos}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-100 dark:border-green-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-800 flex items-center justify-center">
                <FaCheckCircle className="text-green-600 dark:text-green-300" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Completos</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completos}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de filtros y búsqueda */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, email, código o documento..."
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                       focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Filtro por rol */}
            <select
              value={filtroRol}
              onChange={(e) => { setFiltroRol(e.target.value); setPaginaActual(1); }}
              className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-700 dark:text-white text-sm
                       focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="todos">Todos los roles</option>
              <option value="estudiante">Estudiantes</option>
              <option value="docente">Docentes</option>
              <option value="profesor">Profesores</option>
              <option value="admin">Administradores</option>
            </select>

            {/* Filtro por estado */}
            <select
              value={filtroEstado}
              onChange={(e) => { setFiltroEstado(e.target.value); setPaginaActual(1); }}
              className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-700 dark:text-white text-sm
                       focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="todos">Todos los estados</option>
              <option value="incompletos">Pendientes</option>
              <option value="completos">Completos</option>
            </select>

            {/* Ordenamiento */}
            <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
              <select
                value={ordenamiento.campo}
                onChange={(e) => setOrdenamiento(prev => ({ ...prev, campo: e.target.value }))}
                className="px-3 py-2.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-white text-sm 
                         focus:outline-none border-r border-gray-300 dark:border-gray-600"
              >
                <option value="nombre">Ordenar: Nombre</option>
                <option value="rol">Ordenar: Rol</option>
                <option value="progreso">Ordenar: Progreso</option>
                <option value="fecha">Ordenar: Fecha</option>
              </select>
              <button
                onClick={() => setOrdenamiento(prev => ({ ...prev, direccion: prev.direccion === 'asc' ? 'desc' : 'asc' }))}
                className="px-3 py-2.5 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 
                         text-gray-600 dark:text-gray-300 transition-colors"
              >
                {ordenamiento.direccion === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />}
              </button>
            </div>

            {/* Vista */}
            <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
              <button
                onClick={() => setVistaCards(true)}
                className={`px-3 py-2.5 transition-colors ${vistaCards 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
              >
                <FaThLarge />
              </button>
              <button
                onClick={() => setVistaCards(false)}
                className={`px-3 py-2.5 transition-colors ${!vistaCards 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
              >
                <FaListUl />
              </button>
            </div>
          </div>
        </div>

        {/* Resultados info */}
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            Mostrando <span className="font-medium text-gray-700 dark:text-gray-300">{usuariosPaginados.length}</span> de <span className="font-medium text-gray-700 dark:text-gray-300">{usuariosFiltrados.length}</span> usuarios
          </span>
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium"
            >
              <FaTimes className="text-xs" />
              Limpiar búsqueda
            </button>
          )}
        </div>
      </div>

      {/* Lista de usuarios */}
      {usuariosFiltrados.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
            <FaSearch className="text-2xl text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            No se encontraron resultados
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Intenta ajustar los filtros o términos de búsqueda
          </p>
        </div>
      ) : vistaCards ? (
        /* Vista de Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {usuariosPaginados.map((usuario) => {
            const progreso = calcularProgresoDatos(usuario);
            const tieneFoto = usuario.tiene_foto_perfil && !fotoErrors[usuario.id];
            
            return (
              <div
                key={usuario.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700
                          hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-start gap-3">
                    {/* Foto o Avatar */}
                    <div className="relative flex-shrink-0">
                      {tieneFoto ? (
                        <img
                          src={`http://localhost:3002/usuarios/${usuario.id}/foto-perfil`}
                          alt={usuario.nombre}
                          className="w-12 h-12 rounded-full object-cover border-2 border-gray-100 dark:border-gray-600"
                          onError={() => handleFotoError(usuario.id)}
                        />
                      ) : (
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center
                                      ${usuario.rol === 'estudiante' ? 'bg-blue-100 dark:bg-blue-900/30' : ''}
                                      ${(usuario.rol === 'profesor' || usuario.rol === 'docente') ? 'bg-emerald-100 dark:bg-emerald-900/30' : ''}
                                      ${(usuario.rol === 'admin' || usuario.rol === 'administrativo') ? 'bg-violet-100 dark:bg-violet-900/30' : ''}`}>
                          <span className={`text-sm font-semibold
                                        ${usuario.rol === 'estudiante' ? 'text-blue-600 dark:text-blue-400' : ''}
                                        ${(usuario.rol === 'profesor' || usuario.rol === 'docente') ? 'text-emerald-600 dark:text-emerald-400' : ''}
                                        ${(usuario.rol === 'admin' || usuario.rol === 'administrativo') ? 'text-violet-600 dark:text-violet-400' : ''}`}>
                            {obtenerInicialesNombre(usuario.nombre)}
                          </span>
                        </div>
                      )}
                      {/* Estado indicador */}
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800
                                     ${usuario.activo ? 'bg-green-500' : 'bg-gray-400'}`} />
                    </div>
                    
                    {/* Info usuario */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate text-sm">
                        {usuario.nombre_completo || usuario.nombre}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {usuario.email}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                          ${usuario.rol === 'estudiante' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : ''}
                          ${(usuario.rol === 'profesor' || usuario.rol === 'docente') ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : ''}
                          ${(usuario.rol === 'admin' || usuario.rol === 'administrativo') ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' : ''}
                        `}>
                          {usuario.rol}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contenido */}
                <div className="p-4 space-y-3">
                  {/* Progreso de datos */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-gray-500 dark:text-gray-400">Completitud de datos</span>
                      <span className={`font-semibold ${progreso === 100 ? 'text-green-600' : 'text-amber-600'}`}>
                        {progreso}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          progreso === 100 ? 'bg-green-500' : progreso >= 70 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${progreso}%` }}
                      />
                    </div>
                  </div>

                  {/* Estado */}
                  {usuario.datos_completos ? (
                    <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                      <FaCheckCircle />
                      <span>Información completa</span>
                    </div>
                  ) : (
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-md p-2.5">
                      <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1.5 flex items-center gap-1">
                        <FaExclamationTriangle className="text-xs" />
                        Campos pendientes
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {usuario.campos_faltantes?.split(',').slice(0, 3).map((campo, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-800/30 text-amber-700 dark:text-amber-300 
                                     rounded text-xs"
                          >
                            {campo.trim()}
                          </span>
                        ))}
                        {usuario.campos_faltantes?.split(',').length > 3 && (
                          <span className="px-1.5 py-0.5 text-amber-600 dark:text-amber-400 text-xs">
                            +{usuario.campos_faltantes.split(',').length - 3} más
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setUsuarioSeleccionado(usuario);
                        setMostrarDetalles(true);
                      }}
                      className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 
                               rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors
                               flex items-center justify-center gap-1.5 text-xs font-medium border border-gray-200 dark:border-gray-600"
                    >
                      <FaEye className="text-xs" />
                      Ver
                    </button>
                    <button
                      onClick={() => {
                        setUsuarioSeleccionado(usuario);
                        setMostrarFormulario(true);
                      }}
                      className={`flex-1 px-3 py-2 rounded-md transition-colors
                               flex items-center justify-center gap-1.5 text-xs font-medium
                               ${usuario.datos_completos 
                                 ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                                 : 'bg-amber-500 text-white hover:bg-amber-600'}`}
                    >
                      <FaEdit className="text-xs" />
                      {usuario.datos_completos ? 'Editar' : 'Completar'}
                    </button>
                    <button
                      onClick={() => manejarActivarDesactivar(usuario, usuario.activo ? 'desactivar' : 'activar')}
                      disabled={activandoUsuario === usuario.id}
                      className={`px-3 py-2 rounded-md transition-colors flex items-center justify-center text-xs font-medium border
                                ${usuario.activo 
                                  ? 'bg-white dark:bg-gray-800 text-red-600 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20' 
                                  : 'bg-white dark:bg-gray-800 text-green-600 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20'
                                }`}
                    >
                      {activandoUsuario === usuario.id ? (
                        <FaSync className="animate-spin" />
                      ) : usuario.activo ? (
                        <FaBan />
                      ) : (
                        <FaUnlock />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Vista de Lista/Tabla */
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Completitud
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {usuariosPaginados.map((usuario) => {
                  const progreso = calcularProgresoDatos(usuario);
                  const tieneFoto = usuario.tiene_foto_perfil && !fotoErrors[usuario.id];
                  
                  return (
                    <tr 
                      key={usuario.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            {tieneFoto ? (
                              <img
                                src={`http://localhost:3002/usuarios/${usuario.id}/foto-perfil`}
                                alt={usuario.nombre}
                                className="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-gray-600"
                                onError={() => handleFotoError(usuario.id)}
                              />
                            ) : (
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center
                                            ${usuario.rol === 'estudiante' ? 'bg-blue-100 dark:bg-blue-900/30' : ''}
                                            ${(usuario.rol === 'profesor' || usuario.rol === 'docente') ? 'bg-emerald-100 dark:bg-emerald-900/30' : ''}
                                            ${(usuario.rol === 'admin' || usuario.rol === 'administrativo') ? 'bg-violet-100 dark:bg-violet-900/30' : ''}`}>
                                <span className={`text-xs font-medium
                                              ${usuario.rol === 'estudiante' ? 'text-blue-600 dark:text-blue-400' : ''}
                                              ${(usuario.rol === 'profesor' || usuario.rol === 'docente') ? 'text-emerald-600 dark:text-emerald-400' : ''}
                                              ${(usuario.rol === 'admin' || usuario.rol === 'administrativo') ? 'text-violet-600 dark:text-violet-400' : ''}`}>
                                  {obtenerInicialesNombre(usuario.nombre)}
                                </span>
                              </div>
                            )}
                            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-800
                                           ${usuario.activo ? 'bg-green-500' : 'bg-gray-400'}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {usuario.nombre_completo || usuario.nombre}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {usuario.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                          ${usuario.rol === 'estudiante' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : ''}
                          ${(usuario.rol === 'profesor' || usuario.rol === 'docente') ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : ''}
                          ${(usuario.rol === 'admin' || usuario.rol === 'administrativo') ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' : ''}
                        `}>
                          {usuario.rol}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                            <div
                              className={`h-full rounded-full ${
                                progreso === 100 ? 'bg-green-500' : progreso >= 70 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${progreso}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${
                            progreso === 100 ? 'text-green-600' : 'text-amber-600'
                          }`}>
                            {progreso}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {usuario.datos_completos ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <FaCheckCircle className="text-xs" />
                            Completo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                            <FaExclamationTriangle className="text-xs" />
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setUsuarioSeleccionado(usuario);
                              setMostrarDetalles(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 
                                     dark:hover:bg-gray-700 rounded transition-colors"
                            title="Ver detalles"
                          >
                            <FaEye className="text-sm" />
                          </button>
                          <button
                            onClick={() => {
                              setUsuarioSeleccionado(usuario);
                              setMostrarFormulario(true);
                            }}
                            className={`p-1.5 rounded transition-colors
                                     ${usuario.datos_completos 
                                       ? 'text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                                       : 'text-amber-500 hover:text-amber-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            title={usuario.datos_completos ? 'Editar datos' : 'Completar datos'}
                          >
                            <FaEdit className="text-sm" />
                          </button>
                          <button
                            onClick={() => manejarActivarDesactivar(usuario, usuario.activo ? 'desactivar' : 'activar')}
                            disabled={activandoUsuario === usuario.id}
                            className={`p-1.5 rounded transition-colors ${
                              usuario.activo 
                                ? 'text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700' 
                                : 'text-gray-400 hover:text-green-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                            title={usuario.activo ? 'Desactivar usuario' : 'Activar usuario'}
                          >
                            {activandoUsuario === usuario.id ? (
                              <FaSync className="animate-spin text-sm" />
                            ) : usuario.activo ? (
                              <FaBan className="text-sm" />
                            ) : (
                              <FaUnlock className="text-sm" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-1 py-4">
          <button
            onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
            disabled={paginaActual === 1}
            className="px-3 py-1.5 rounded text-sm font-medium bg-white dark:bg-gray-800 
                     border border-gray-200 dark:border-gray-700 hover:bg-gray-50 
                     dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FaChevronLeft className="text-xs" />
          </button>
          
          {Array.from({ length: Math.min(totalPaginas, 5) }, (_, i) => {
            let pageNum;
            if (totalPaginas <= 5) {
              pageNum = i + 1;
            } else if (paginaActual <= 3) {
              pageNum = i + 1;
            } else if (paginaActual >= totalPaginas - 2) {
              pageNum = totalPaginas - 4 + i;
            } else {
              pageNum = paginaActual - 2 + i;
            }
            
            return (
              <button
                key={pageNum}
                onClick={() => setPaginaActual(pageNum)}
                className={`min-w-[32px] h-8 rounded text-sm font-medium transition-colors ${
                  paginaActual === pageNum
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))}
            disabled={paginaActual === totalPaginas}
            className="px-3 py-1.5 rounded text-sm font-medium bg-white dark:bg-gray-800 
                     border border-gray-200 dark:border-gray-700 hover:bg-gray-50 
                     dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FaChevronRight className="text-xs" />
          </button>
        </div>
      )}

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

      {/* Modal de detalles del usuario */}
      {mostrarDetalles && usuarioSeleccionado && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header del modal */}
            <div className={`bg-gradient-to-r ${obtenerColorRol(usuarioSeleccionado.rol)} p-6 relative`}>
              <button
                onClick={() => {
                  setMostrarDetalles(false);
                  setUsuarioSeleccionado(null);
                }}
                className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full 
                         flex items-center justify-center transition-colors"
              >
                <FaTimes className="text-white" />
              </button>
              
              <div className="flex items-center gap-6">
                <div className="relative">
                  {usuarioSeleccionado.tiene_foto_perfil && !fotoErrors[usuarioSeleccionado.id] ? (
                    <img
                      src={`http://localhost:3002/usuarios/${usuarioSeleccionado.id}/foto-perfil`}
                      alt={usuarioSeleccionado.nombre}
                      className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
                      onError={() => handleFotoError(usuarioSeleccionado.id)}
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg 
                                  bg-white/20 flex items-center justify-center">
                      <span className="text-3xl font-bold text-white">
                        {obtenerInicialesNombre(usuarioSeleccionado.nombre)}
                      </span>
                    </div>
                  )}
                  <span className={`absolute bottom-1 right-1 w-6 h-6 rounded-full border-2 border-white
                                 ${usuarioSeleccionado.activo ? 'bg-green-500' : 'bg-red-500'}`} />
                </div>
                <div className="text-white">
                  <h3 className="text-2xl font-bold">
                    {usuarioSeleccionado.nombre_completo || usuarioSeleccionado.nombre}
                  </h3>
                  <p className="text-white/80 flex items-center gap-2 mt-1">
                    {obtenerIconoRol(usuarioSeleccionado.rol)}
                    {usuarioSeleccionado.rol}
                  </p>
                  <p className="text-white/60 text-sm mt-1">
                    ID: {usuarioSeleccionado.id}
                  </p>
                </div>
              </div>
            </div>

            {/* Contenido del modal */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <FaIdCard className="text-indigo-500 text-xl" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Código</p>
                      <p className="font-mono font-semibold text-gray-900 dark:text-white">
                        {obtenerCodigoUsuario(usuarioSeleccionado)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <FaEnvelope className="text-indigo-500 text-xl" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                      <p className="font-medium text-gray-900 dark:text-white break-all">
                        {usuarioSeleccionado.email}
                      </p>
                    </div>
                  </div>
                  
                  {usuarioSeleccionado.telefono && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <FaPhone className="text-indigo-500 text-xl" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Teléfono</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {usuarioSeleccionado.telefono}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {usuarioSeleccionado.documento_identidad && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <FaIdCard className="text-indigo-500 text-xl" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {usuarioSeleccionado.tipo_documento || 'Documento'}
                        </p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {usuarioSeleccionado.documento_identidad}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {(usuarioSeleccionado.direccion || usuarioSeleccionado.departamento) && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <FaMapMarkerAlt className="text-indigo-500 text-xl" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Ubicación</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {[usuarioSeleccionado.direccion, usuarioSeleccionado.distrito, 
                            usuarioSeleccionado.provincia, usuarioSeleccionado.departamento]
                            .filter(Boolean).join(', ') || 'No especificada'}
                        </p>
                      </div>
                    </div>
                  )}

                  {usuarioSeleccionado.created_at && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <FaCalendarAlt className="text-indigo-500 text-xl" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Fecha de registro</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {new Date(usuarioSeleccionado.created_at).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Estado de datos */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Estado de datos</h4>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-600 dark:text-gray-300">Progreso de completitud</span>
                    <span className={`font-bold ${
                      calcularProgresoDatos(usuarioSeleccionado) === 100 ? 'text-green-500' : 'text-orange-500'
                    }`}>
                      {calcularProgresoDatos(usuarioSeleccionado)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        calcularProgresoDatos(usuarioSeleccionado) === 100 
                          ? 'bg-green-500' 
                          : 'bg-gradient-to-r from-orange-400 to-orange-500'
                      }`}
                      style={{ width: `${calcularProgresoDatos(usuarioSeleccionado)}%` }}
                    />
                  </div>

                  {!usuarioSeleccionado.datos_completos && usuarioSeleccionado.campos_faltantes && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                        Campos pendientes:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {usuarioSeleccionado.campos_faltantes.split(',').map((campo, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 
                                     rounded-full text-sm"
                          >
                            {campo.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {usuarioSeleccionado.datos_completos && (
                    <div className="mt-4 flex items-center gap-2 text-green-600 dark:text-green-400">
                      <FaCheckCircle className="text-xl" />
                      <span className="font-medium">¡Todos los datos están completos!</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setMostrarDetalles(false);
                    setMostrarFormulario(true);
                  }}
                  className={`flex-1 px-4 py-3 rounded-xl transition-colors flex items-center justify-center gap-2 font-medium
                           ${usuarioSeleccionado.datos_completos 
                             ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                             : 'bg-amber-500 text-white hover:bg-amber-600'}`}
                >
                  <FaEdit />
                  {usuarioSeleccionado.datos_completos ? 'Editar Datos' : 'Completar Datos'}
                </button>
                <button
                  onClick={() => manejarActivarDesactivar(
                    usuarioSeleccionado, 
                    usuarioSeleccionado.activo ? 'desactivar' : 'activar'
                  )}
                  disabled={activandoUsuario === usuarioSeleccionado.id}
                  className={`px-4 py-3 rounded-xl transition-colors flex items-center justify-center gap-2 font-medium
                            ${usuarioSeleccionado.activo 
                              ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                              : 'bg-green-100 text-green-600 hover:bg-green-200'
                            }`}
                >
                  {activandoUsuario === usuarioSeleccionado.id ? (
                    <FaSync className="animate-spin" />
                  ) : usuarioSeleccionado.activo ? (
                    <>
                      <FaBan />
                      Desactivar
                    </>
                  ) : (
                    <>
                      <FaUnlock />
                      Activar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsuariosIncompletos;