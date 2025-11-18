import React, { useState, useEffect } from 'react';
import {
  FaUser, FaUserGraduate, FaChalkboardTeacher, FaUserShield,
  FaSearch, FaFilter, FaEdit, FaSave, FaTimes, FaIdCard,
  FaEnvelope, FaPhone, FaMapMarkerAlt, FaCalendarAlt,
  FaBook, FaChartLine, FaClipboardCheck, FaClock, FaAward,
  FaBriefcase, FaGraduationCap, FaCog, FaCheckCircle, FaTimesCircle,
  FaInfoCircle, FaEye, FaChevronRight, FaBuilding, FaShieldAlt,
  FaDoorOpen, FaSyncAlt, FaChevronUp, FaChevronDown
} from 'react-icons/fa';

const ControlDatosUsuario = ({ token, showError, showSuccess }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [datosCompletos, setDatosCompletos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [filtroRol, setFiltroRol] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [modoEdicion, setModoEdicion] = useState(false);
  const [datosEditados, setDatosEditados] = useState({});
  const [seccionesExpandidas, setSeccionesExpandidas] = useState({
    basico: true,
    personal: true,
    academico: true,
    cursos: true,
    permisos: true
  });

  const [stats, setStats] = useState({
    total: 0,
    estudiantes: 0,
    docentes: 0,
    administradores: 0,
    activos: 0
  });

  useEffect(() => {
    cargarUsuarios();
  }, [token]);

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3002/usuarios', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Error al cargar usuarios');

      const data = await response.json();
      setUsuarios(data);
      calcularEstadisticas(data);
    } catch (error) {
      console.error('Error:', error);
      showError?.('Error al cargar la lista de usuarios');
    } finally {
      setLoading(false);
    }
  };

  const cargarDatosCompletos = async (usuarioId) => {
    try {
      setLoadingDetails(true);
      const response = await fetch(`http://localhost:3002/usuarios/${usuarioId}/datos-completos`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Error al cargar datos');

      const data = await response.json();
      setDatosCompletos(data);
      setDatosEditados({
        nombre: data.basicos.nombre,
        email: data.basicos.email,
        rol: data.basicos.rol,
        activo: data.basicos.activo
      });
    } catch (error) {
      console.error('Error:', error);
      showError?.('Error al cargar datos completos del usuario');
    } finally {
      setLoadingDetails(false);
    }
  };

  const calcularEstadisticas = (data) => {
    const stats = {
      total: data.length,
      estudiantes: data.filter(u => u.rol === 'estudiante').length,
      docentes: data.filter(u => u.rol === 'profesor' || u.rol === 'docente').length,
      administradores: data.filter(u => u.rol === 'admin' || u.rol === 'administrativo').length,
      activos: data.filter(u => u.activo === 1 || u.activo === true).length
    };
    setStats(stats);
  };

  const handleSeleccionarUsuario = (usuario) => {
    setUsuarioSeleccionado(usuario);
    setModoEdicion(false);
    cargarDatosCompletos(usuario.id);
  };

  const handleGuardarCambios = async () => {
    try {
      const response = await fetch(`http://localhost:3002/usuarios/${usuarioSeleccionado.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(datosEditados)
      });

      if (!response.ok) throw new Error('Error al guardar');

      showSuccess?.('Datos actualizados correctamente');
      setModoEdicion(false);
      cargarUsuarios();
      cargarDatosCompletos(usuarioSeleccionado.id);
    } catch (error) {
      console.error('Error:', error);
      showError?.('Error al guardar los cambios');
    }
  };

  const toggleSeccion = (seccion) => {
    setSeccionesExpandidas(prev => ({
      ...prev,
      [seccion]: !prev[seccion]
    }));
  };

  const obtenerColorRol = (rol) => {
    if (rol === 'estudiante') return 'bg-blue-500 text-white';
    if (rol === 'profesor' || rol === 'docente') return 'bg-green-500 text-white';
    if (rol === 'admin' || rol === 'administrativo') return 'bg-gray-500 text-white';
    return 'bg-gray-400 text-white';
  };

  const obtenerIconoRol = (rol) => {
    if (rol === 'estudiante') return <FaUserGraduate className="text-2xl" />;
    if (rol === 'profesor' || rol === 'docente') return <FaChalkboardTeacher className="text-2xl" />;
    if (rol === 'admin' || rol === 'administrativo') return <FaUserShield className="text-2xl" />;
    return <FaUser className="text-2xl" />;
  };

  const obtenerCodigoUsuario = (usuario) => {
    if (usuario.codigo_estudiante) return usuario.codigo_estudiante;
    if (usuario.codigo_docente) return usuario.codigo_docente;
    if (usuario.codigo_admin) return usuario.codigo_admin;
    return 'N/A';
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
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                <FaUser className="text-blue-500" />
                Control de Datos de Usuario
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Gestión completa de información de usuarios del campus virtual
              </p>
            </div>
            <button
              onClick={cargarUsuarios}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-md"
            >
              Actualizar
            </button>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-lg shadow-md text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total Usuarios</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <FaUser className="text-4xl opacity-50" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-400 to-blue-500 p-4 rounded-lg shadow-md text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Estudiantes</p>
                  <p className="text-3xl font-bold">{stats.estudiantes}</p>
                </div>
                <FaUserGraduate className="text-4xl opacity-50" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-lg shadow-md text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Docentes</p>
                  <p className="text-3xl font-bold">{stats.docentes}</p>
                </div>
                <FaChalkboardTeacher className="text-4xl opacity-50" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-500 to-gray-600 p-4 rounded-lg shadow-md text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Administradores</p>
                  <p className="text-3xl font-bold">{stats.administradores}</p>
                </div>
                <FaUserShield className="text-4xl opacity-50" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 rounded-lg shadow-md text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Activos</p>
                  <p className="text-3xl font-bold">{stats.activos}</p>
                </div>
                <FaCheckCircle className="text-4xl opacity-50" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel Izquierdo: Lista de Usuarios */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <FaFilter className="text-blue-500" />
              Lista de Usuarios
            </h2>

            {/* Filtros */}
            <div className="space-y-4 mb-6">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, email o código..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <select
                value={filtroRol}
                onChange={(e) => setFiltroRol(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
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

            {/* Lista */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
              {usuariosFiltrados.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FaInfoCircle className="text-4xl mx-auto mb-2" />
                  <p>No se encontraron usuarios</p>
                </div>
              ) : (
                usuariosFiltrados.map((usuario) => (
                  <div
                    key={usuario.id}
                    onClick={() => handleSeleccionarUsuario(usuario)}
                    className={`p-4 rounded-lg cursor-pointer transition-all duration-200
                              ${usuarioSeleccionado?.id === usuario.id
                        ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 shadow-md'
                        : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-full ${obtenerColorRol(usuario.rol)}`}>
                        {obtenerIconoRol(usuario.rol)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                          {usuario.nombre}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {usuario.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-1 rounded-full ${obtenerColorRol(usuario.rol)}`}>
                            {usuario.rol}
                          </span>
                          <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                            {obtenerCodigoUsuario(usuario)}
                          </span>
                        </div>
                      </div>
                      <FaChevronRight className="text-gray-400" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Panel Derecho: Detalles del Usuario */}
        <div className="lg:col-span-2">
          {!usuarioSeleccionado ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
              <FaEye className="text-6xl text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-400 dark:text-gray-500 mb-2">
                Selecciona un usuario
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Haz clic en un usuario de la lista para ver sus datos completos
              </p>
            </div>
          ) : loadingDetails ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Cargando detalles...</p>
            </div>
          ) : datosCompletos ? (
            <div className="space-y-4">
              {/* Header del Panel */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-full ${obtenerColorRol(datosCompletos.basicos.rol)}`}>
                      {obtenerIconoRol(datosCompletos.basicos.rol)}
                    </div>
                    <div>
                      {modoEdicion ? (
                        <input
                          type="text"
                          value={datosEditados.nombre}
                          onChange={(e) => setDatosEditados({ ...datosEditados, nombre: e.target.value })}
                          className="text-2xl font-bold bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded
                                   text-gray-900 dark:text-white border-2 border-blue-500"
                        />
                      ) : (
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {datosCompletos.basicos.nombre}
                        </h2>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${obtenerColorRol(datosCompletos.basicos.rol)}`}>
                          {datosCompletos.basicos.rol}
                        </span>
                        <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                          {obtenerCodigoUsuario(datosCompletos.basicos)}
                        </span>
                        {datosCompletos.basicos.activo ? (
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                            <FaCheckCircle /> Activo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600 dark:text-red-400 text-sm">
                            <FaTimesCircle /> Inactivo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {modoEdicion ? (
                      <>
                        <button
                          onClick={handleGuardarCambios}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 
                                   transition-colors flex items-center gap-2"
                        >
                          <FaSave /> Guardar
                        </button>
                        <button
                          onClick={() => setModoEdicion(false)}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 
                                   transition-colors flex items-center gap-2"
                        >
                          <FaTimes /> Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setModoEdicion(true)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                                 transition-colors flex items-center gap-2"
                      >
                        <FaEdit /> Editar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Sección: Datos Básicos */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <div
                  onClick={() => toggleSeccion('basico')}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FaIdCard className="text-blue-500" />
                    Datos Básicos
                  </h3>
                  {seccionesExpandidas.basico ? <FaChevronUp /> : <FaChevronDown />}
                </div>
                {seccionesExpandidas.basico && (
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <FaEnvelope className="text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                        {modoEdicion ? (
                          <input
                            type="email"
                            value={datosEditados.email}
                            onChange={(e) => setDatosEditados({ ...datosEditados, email: e.target.value })}
                            className="font-semibold bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-white"
                          />
                        ) : (
                          <p className="font-semibold text-gray-900 dark:text-white">{datosCompletos.basicos.email}</p>
                        )}
                      </div>
                    </div>
                    {datosCompletos.basicos.telefono && (
                      <div className="flex items-center gap-3">
                        <FaPhone className="text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Teléfono</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{datosCompletos.basicos.telefono}</p>
                        </div>
                      </div>
                    )}
                    {datosCompletos.basicos.dni && (
                      <div className="flex items-center gap-3">
                        <FaIdCard className="text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">DNI</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{datosCompletos.basicos.dni}</p>
                        </div>
                      </div>
                    )}
                    {datosCompletos.basicos.direccion && (
                      <div className="flex items-center gap-3">
                        <FaMapMarkerAlt className="text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Dirección</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{datosCompletos.basicos.direccion}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sección específica según rol */}
              {datosCompletos.basicos.rol === 'estudiante' && datosCompletos.estudiante && (
                <>
                  {/* Datos Académicos */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                    <div
                      onClick={() => toggleSeccion('academico')}
                      className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    >
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FaGraduationCap className="text-blue-500" />
                        Información Académica
                      </h3>
                      {seccionesExpandidas.academico ? <FaChevronUp /> : <FaChevronDown />}
                    </div>
                    {seccionesExpandidas.academico && (
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <FaIdCard className="text-3xl text-blue-500 mx-auto mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Matrícula</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{datosCompletos.estudiante.matricula}</p>
                          </div>
                          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <FaBook className="text-3xl text-blue-500 mx-auto mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Grado</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{datosCompletos.estudiante.grado || 'N/A'}</p>
                          </div>
                          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <FaDoorOpen className="text-3xl text-blue-500 mx-auto mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Sección</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{datosCompletos.estudiante.seccion || 'N/A'}</p>
                          </div>
                          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <FaChartLine className="text-3xl text-green-500 mx-auto mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Promedio General</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{datosCompletos.estudiante.promedio_general || '0.00'}</p>
                          </div>
                          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <FaClipboardCheck className="text-3xl text-green-500 mx-auto mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Asistencia</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{datosCompletos.estudiante.porcentaje_asistencia}%</p>
                          </div>
                          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <FaCalendarAlt className="text-3xl text-purple-500 mx-auto mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Estado</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{datosCompletos.estudiante.estado_academico}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cursos Matriculados */}
                  {datosCompletos.cursos && datosCompletos.cursos.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                      <div
                        onClick={() => toggleSeccion('cursos')}
                        className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30"
                      >
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <FaBook className="text-blue-500" />
                          Cursos Matriculados ({datosCompletos.cursos.length})
                        </h3>
                        {seccionesExpandidas.cursos ? <FaChevronUp /> : <FaChevronDown />}
                      </div>
                      {seccionesExpandidas.cursos && (
                        <div className="p-6">
                          <div className="space-y-3">
                            {datosCompletos.cursos.map((curso, idx) => (
                              <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-l-4 border-blue-500">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-bold text-gray-900 dark:text-white">{curso.curso_nombre}</h4>
                                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                                      <span className="flex items-center gap-1">
                                        <FaIdCard /> {curso.curso_codigo}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <FaAward /> {curso.creditos} créditos
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <FaCalendarAlt /> {curso.ciclo_academico}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    {curso.nota_final ? (
                                      <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Nota Final</p>
                                        <p className="text-2xl font-bold text-green-600">{curso.nota_final}</p>
                                      </div>
                                    ) : curso.nota_parcial ? (
                                      <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Nota Parcial</p>
                                        <p className="text-2xl font-bold text-blue-600">{curso.nota_parcial}</p>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">Sin nota</span>
                                    )}
                                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold
                                      ${curso.estado_curso === 'Aprobado' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}
                                      ${curso.estado_curso === 'En curso' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : ''}
                                      ${curso.estado_curso === 'Reprobado' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : ''}
                                    `}>
                                      {curso.estado_curso}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Datos de Docente */}
              {(datosCompletos.basicos.rol === 'docente' || datosCompletos.basicos.rol === 'profesor') && datosCompletos.docente && (
                <>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                    <div
                      onClick={() => toggleSeccion('academico')}
                      className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30"
                    >
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FaBriefcase className="text-green-500" />
                        Información Profesional
                      </h3>
                      {seccionesExpandidas.academico ? <FaChevronUp /> : <FaChevronDown />}
                    </div>
                    {seccionesExpandidas.academico && (
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <FaGraduationCap className="text-2xl text-green-500 mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Especialidad</p>
                            <p className="font-bold text-gray-900 dark:text-white">{datosCompletos.docente.especialidad || 'N/A'}</p>
                          </div>
                          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <FaAward className="text-2xl text-green-500 mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Nivel Académico</p>
                            <p className="font-bold text-gray-900 dark:text-white">{datosCompletos.docente.nivel_academico}</p>
                          </div>
                          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <FaClock className="text-2xl text-green-500 mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Años de Experiencia</p>
                            <p className="font-bold text-gray-900 dark:text-white">{datosCompletos.docente.años_experiencia} años</p>
                          </div>
                          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <FaBriefcase className="text-2xl text-green-500 mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Tipo de Contrato</p>
                            <p className="font-bold text-gray-900 dark:text-white">{datosCompletos.docente.tipo_contrato}</p>
                          </div>
                          {datosCompletos.docente.horario_entrada && (
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                              <FaClock className="text-2xl text-green-500 mb-2" />
                              <p className="text-sm text-gray-500 dark:text-gray-400">Horario</p>
                              <p className="font-bold text-gray-900 dark:text-white">
                                {datosCompletos.docente.horario_entrada} - {datosCompletos.docente.horario_salida}
                              </p>
                            </div>
                          )}
                          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <FaCheckCircle className="text-2xl text-green-500 mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Estado Laboral</p>
                            <p className="font-bold text-gray-900 dark:text-white">{datosCompletos.docente.estado_laboral}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cursos Asignados */}
                  {datosCompletos.cursos && datosCompletos.cursos.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                      <div
                        onClick={() => toggleSeccion('cursos')}
                        className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30"
                      >
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <FaBook className="text-green-500" />
                          Cursos Asignados ({datosCompletos.cursos.length})
                        </h3>
                        {seccionesExpandidas.cursos ? <FaChevronUp /> : <FaChevronDown />}
                      </div>
                      {seccionesExpandidas.cursos && (
                        <div className="p-6">
                          <div className="space-y-3">
                            {datosCompletos.cursos.map((curso, idx) => (
                              <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-l-4 border-green-500">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-bold text-gray-900 dark:text-white">{curso.curso_nombre}</h4>
                                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                                      <span className="flex items-center gap-1">
                                        <FaIdCard /> {curso.curso_codigo}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <FaBook /> {curso.grado} - {curso.seccion}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <FaClock /> {curso.horario}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <FaDoorOpen /> Aula {curso.aula}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <FaUserGraduate /> {curso.total_estudiantes} estudiantes
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <FaCalendarAlt /> {curso.ciclo_academico}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Datos de Administrador */}
              {(datosCompletos.basicos.rol === 'admin' || datosCompletos.basicos.rol === 'administrativo') && datosCompletos.admin && (
                <>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                    <div
                      onClick={() => toggleSeccion('academico')}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FaShieldAlt className="text-gray-500" />
                        Información Administrativa
                      </h3>
                      {seccionesExpandidas.academico ? <FaChevronUp /> : <FaChevronDown />}
                    </div>
                    {seccionesExpandidas.academico && (
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <FaBriefcase className="text-2xl text-gray-500 mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Cargo</p>
                            <p className="font-bold text-gray-900 dark:text-white">{datosCompletos.admin.cargo}</p>
                          </div>
                          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <FaBuilding className="text-2xl text-gray-500 mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Departamento</p>
                            <p className="font-bold text-gray-900 dark:text-white">{datosCompletos.admin.departamento || 'N/A'}</p>
                          </div>
                          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <FaShieldAlt className="text-2xl text-gray-500 mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Nivel de Acceso</p>
                            <p className="font-bold text-gray-900 dark:text-white">{datosCompletos.admin.nivel_acceso}</p>
                          </div>
                          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <FaCalendarAlt className="text-2xl text-gray-500 mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Fecha de Nombramiento</p>
                            <p className="font-bold text-gray-900 dark:text-white">
                              {datosCompletos.admin.fecha_nombramiento ? new Date(datosCompletos.admin.fecha_nombramiento).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <FaCheckCircle className="text-2xl text-gray-500 mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Estado</p>
                            <p className="font-bold text-gray-900 dark:text-white">{datosCompletos.admin.estado_admin}</p>
                          </div>
                          {datosCompletos.admin.ultimo_acceso && (
                            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <FaClock className="text-2xl text-gray-500 mb-2" />
                              <p className="text-sm text-gray-500 dark:text-gray-400">Último Acceso</p>
                              <p className="font-bold text-gray-900 dark:text-white">
                                {new Date(datosCompletos.admin.ultimo_acceso).toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Módulos y Permisos */}
                  {datosCompletos.modulos && datosCompletos.modulos.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                      <div
                        onClick={() => toggleSeccion('permisos')}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <FaCog className="text-gray-500" />
                          Permisos de Gestión ({datosCompletos.modulos.length} módulos)
                        </h3>
                        {seccionesExpandidas.permisos ? <FaChevronUp /> : <FaChevronDown />}
                      </div>
                      {seccionesExpandidas.permisos && (
                        <div className="p-6">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-100 dark:bg-gray-700">
                                <tr>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Módulo</th>
                                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">Leer</th>
                                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">Crear</th>
                                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">Editar</th>
                                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">Eliminar</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {datosCompletos.modulos.map((modulo, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-4 py-3">
                                      <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">{modulo.modulo_nombre}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{modulo.modulo_codigo}</p>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      {modulo.puede_leer ? (
                                        <FaCheckCircle className="text-green-500 mx-auto text-xl" />
                                      ) : (
                                        <FaTimesCircle className="text-red-500 mx-auto text-xl" />
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      {modulo.puede_crear ? (
                                        <FaCheckCircle className="text-green-500 mx-auto text-xl" />
                                      ) : (
                                        <FaTimesCircle className="text-red-500 mx-auto text-xl" />
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      {modulo.puede_editar ? (
                                        <FaCheckCircle className="text-green-500 mx-auto text-xl" />
                                      ) : (
                                        <FaTimesCircle className="text-red-500 mx-auto text-xl" />
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      {modulo.puede_eliminar ? (
                                        <FaCheckCircle className="text-green-500 mx-auto text-xl" />
                                      ) : (
                                        <FaTimesCircle className="text-red-500 mx-auto text-xl" />
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Estilos personalizados para scrollbar */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-track {
          background: #374151;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #6b7280;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </div>
  );
};

export default ControlDatosUsuario;
