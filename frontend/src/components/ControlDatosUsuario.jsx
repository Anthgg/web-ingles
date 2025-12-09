import React, { useState, useEffect, useMemo } from 'react';
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
  const [filtroEstado, setFiltroEstado] = useState('todos');
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
      activos: data.filter(u => estaActivo(u.activo)).length
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

  const estaActivo = (valor) =>
    valor === 1 || valor === true || valor === '1' || valor === 'true';

  const calcularProgresoPerfil = (datos) => {
    if (!datos) return { avance: 0, pendientes: [] };

    const rol = datos.basicos?.rol;
    const chequeos = [
      { label: 'Nombre', ok: Boolean(datos.basicos?.nombre) },
      { label: 'Email', ok: Boolean(datos.basicos?.email) },
      { label: 'Teléfono', ok: Boolean(datos.basicos?.telefono) },
      { label: 'Dirección', ok: Boolean(datos.basicos?.direccion) },
      { label: 'Rol', ok: Boolean(rol) },
    ];

    if (rol === 'estudiante' && datos.estudiante) {
      chequeos.push(
        { label: 'Matrícula', ok: Boolean(datos.estudiante.matricula) },
        { label: 'Grado', ok: Boolean(datos.estudiante.grado) },
        { label: 'Sección', ok: Boolean(datos.estudiante.seccion) },
        { label: 'Estado académico', ok: Boolean(datos.estudiante.estado_academico) }
      );
    }

    if ((rol === 'docente' || rol === 'profesor') && datos.docente) {
      chequeos.push(
        { label: 'Especialidad', ok: Boolean(datos.docente.especialidad) },
        { label: 'Nivel académico', ok: Boolean(datos.docente.nivel_academico) },
        { label: 'Contrato', ok: Boolean(datos.docente.tipo_contrato) },
        { label: 'Estado laboral', ok: Boolean(datos.docente.estado_laboral) }
      );
    }

    if ((rol === 'admin' || rol === 'administrativo') && datos.admin) {
      chequeos.push(
        { label: 'Cargo', ok: Boolean(datos.admin.cargo) },
        { label: 'Departamento', ok: Boolean(datos.admin.area_departamento) },
        { label: 'Nivel de acceso', ok: Boolean(datos.admin.nivel_acceso) },
        { label: 'Estado administrativo', ok: Boolean(datos.admin.estado_admin) }
      );
    }

    const completados = chequeos.filter(item => item.ok).length;
    const avance = Math.round((completados / Math.max(chequeos.length, 1)) * 100);
    const pendientes = chequeos.filter(item => !item.ok).map(item => item.label);

    return { avance, pendientes };
  };

  const usuariosFiltrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    const ordenados = [...usuarios].sort((a, b) =>
      (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' })
    );

    return ordenados.filter((usuario) => {
      const activoNormalizado = estaActivo(usuario.activo);
      const matchRol = filtroRol === 'todos' || usuario.rol === filtroRol;
      const matchEstado =
        filtroEstado === 'todos' ||
        (filtroEstado === 'activos' && activoNormalizado) ||
        (filtroEstado === 'inactivos' && !activoNormalizado);
      const matchBusqueda =
        term === '' ||
        (usuario.nombre || '').toLowerCase().includes(term) ||
        (usuario.email || '').toLowerCase().includes(term) ||
        obtenerCodigoUsuario(usuario).toLowerCase().includes(term);

      return matchRol && matchEstado && matchBusqueda;
    });
  }, [usuarios, filtroRol, filtroEstado, busqueda]);

  const resumenCalidad = useMemo(() => calcularProgresoPerfil(datosCompletos), [datosCompletos]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-white text-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 p-6">
      {/* Header */}
      <div className="mb-6 rounded-2xl bg-white border border-slate-200 shadow-xl">
        <div className="p-6 md:p-8 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold uppercase tracking-[0.2em]">
                <FaUser />
                Data Ops
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3">
                Control de datos de usuario
              </h1>
              <p className="text-gray-600 max-w-2xl">
                Monitoriza, filtra y corrige la información clave de cada perfil sin salir de este panel.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={cargarUsuarios}
                className="px-5 py-3 bg-white text-indigo-700 font-semibold rounded-xl shadow-lg hover:-translate-y-0.5 transition"
              >
                <div className="flex items-center gap-2">
                  <FaSyncAlt /> Refrescar datos
                </div>
              </button>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {[
              { label: 'Total', value: stats.total, icon: FaUser, tones: 'from-slate-50 to-white', accent: 'text-indigo-600' },
              { label: 'Estudiantes', value: stats.estudiantes, icon: FaUserGraduate, tones: 'from-sky-50 to-white', accent: 'text-sky-500' },
              { label: 'Docentes', value: stats.docentes, icon: FaChalkboardTeacher, tones: 'from-emerald-50 to-white', accent: 'text-emerald-600' },
              { label: 'Admins', value: stats.administradores, icon: FaUserShield, tones: 'from-slate-50 to-white', accent: 'text-slate-600' },
              { label: 'Activos', value: stats.activos, icon: FaCheckCircle, tones: 'from-lime-50 to-white', accent: 'text-lime-600' },
            ].map((item, idx) => (
              <div
                key={idx}
                className={`rounded-2xl bg-gradient-to-br ${item.tones} backdrop-blur border border-slate-200/70 text-slate-800 p-4 shadow-md flex items-center justify-between`}
              >
                <div>
                  <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">{item.label}</p>
                  <p className="text-3xl font-bold text-slate-900">{item.value}</p>
                </div>
                <item.icon className={`text-3xl ${item.accent}`} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel Izquierdo: Lista de Usuarios */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200/70">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600">
                  <FaFilter />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-gray-800 leading-tight">Lista de usuarios</h2>
                  <p className="text-xs text-gray-500">Filtra rápido y elige a quién auditar</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-indigo-600 px-2 py-1 rounded-full bg-indigo-50">
                {usuariosFiltrados.length} resultados
              </span>
            </div>

            {/* Filtros */}
            <div className="space-y-4 mb-6">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, email o código..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl
                           bg-white text-gray-900
                           focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'todos', label: 'Todos' },
                  { value: 'estudiante', label: 'Estudiantes' },
                  { value: 'docente', label: 'Docentes' },
                  { value: 'profesor', label: 'Profesores' },
                  { value: 'admin', label: 'Administradores' },
                ].map((rol) => {
                  const active = filtroRol === rol.value;
                  return (
                    <button
                      key={rol.value}
                      onClick={() => setFiltroRol(rol.value)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                        active
                          ? 'bg-indigo-100 text-indigo-700 border-indigo-200 shadow-sm'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {rol.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'todos', label: 'Estado: todos' },
                  { value: 'activos', label: 'Solo activos' },
                  { value: 'inactivos', label: 'Solo inactivos' },
                ].map((estado) => {
                  const active = filtroEstado === estado.value;
                  return (
                    <button
                      key={estado.value}
                      onClick={() => setFiltroEstado(estado.value)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                        active
                          ? 'bg-green-100 text-green-700 border-green-200 shadow-sm'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {estado.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lista */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
              {usuariosFiltrados.length === 0 ? (
                <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <FaInfoCircle className="text-4xl mx-auto mb-3 text-indigo-400" />
                  <p className="font-semibold">No se encontraron usuarios</p>
                  <p className="text-sm">Prueba con otro filtro o limpia la búsqueda.</p>
                </div>
              ) : (
                usuariosFiltrados.map((usuario) => (
                  <div
                    key={usuario.id}
                    onClick={() => handleSeleccionarUsuario(usuario)}
                    className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border
                              ${usuarioSeleccionado?.id === usuario.id
                        ? 'bg-indigo-50 border-indigo-300 shadow-md'
                        : 'bg-white border-gray-100 hover:-translate-y-0.5 hover:shadow-lg'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-full ${obtenerColorRol(usuario.rol)} shadow-sm`}>
                        {obtenerIconoRol(usuario.rol)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {usuario.nombre}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {usuario.email}
                        </p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`text-[11px] px-2 py-1 rounded-full ${obtenerColorRol(usuario.rol)}`}>
                            {usuario.rol}
                          </span>
                          <span className="text-[11px] font-mono text-gray-600 px-2 py-1 rounded-full bg-gray-100">
                            {obtenerCodigoUsuario(usuario)}
                          </span>
                          <span className={`text-[11px] px-2 py-1 rounded-full ${
                            estaActivo(usuario.activo) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {estaActivo(usuario.activo) ? 'Activo' : 'Inactivo'}
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
            <div className="rounded-2xl bg-gradient-to-br from-white to-slate-50 shadow-xl border border-slate-200/70 p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
                <FaEye className="text-3xl text-indigo-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-700 mb-2">
                Selecciona un usuario
              </h3>
              <p className="text-gray-500">
                Haz clic en un usuario de la lista para revisar y editar sus datos completos.
              </p>
            </div>
          ) : loadingDetails ? (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando detalles...</p>
            </div>
          ) : datosCompletos ? (
            <div className="space-y-4">
              {/* Header del Panel */}
              <div className="bg-white rounded-lg shadow-lg p-6">
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
                          className="text-2xl font-bold bg-gray-100 px-3 py-1 rounded
                                   text-gray-900 border-2 border-blue-500"
                        />
                      ) : (
                        <h2 className="text-2xl font-bold text-gray-900">
                          {datosCompletos.basicos.nombre}
                        </h2>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${obtenerColorRol(datosCompletos.basicos.rol)}`}>
                          {datosCompletos.basicos.rol}
                        </span>
                        <span className="text-sm font-mono text-gray-600">
                          {obtenerCodigoUsuario(datosCompletos.basicos)}
                        </span>
                        {estaActivo(datosCompletos.basicos.activo) ? (
                          <span className="flex items-center gap-1 text-green-600 text-sm">
                            <FaCheckCircle /> Activo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600 text-sm">
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

              <div className="mt-6 space-y-3">
                <div>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Nivel de completitud del perfil</span>
                    <span className="font-semibold text-gray-900">{resumenCalidad.avance}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400"
                      style={{ width: `${resumenCalidad.avance}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {resumenCalidad.pendientes.length === 0 ? (
                    <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 inline-flex items-center gap-2">
                      <FaCheckCircle /> Perfil al día
                    </span>
                  ) : (
                    <>
                      <span className="text-xs text-gray-600">Pendientes:</span>
                      {resumenCalidad.pendientes.slice(0, 4).map((item) => (
                        <span
                          key={item}
                          className="text-xs px-3 py-1 rounded-full bg-amber-100 text-amber-800"
                        >
                          {item}
                        </span>
                      ))}
                      {resumenCalidad.pendientes.length > 4 && (
                        <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                          +{resumenCalidad.pendientes.length - 4} más
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Sección: Datos Básicos */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div
                  onClick={() => toggleSeccion('basico')}
                  className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                >
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
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
                        <p className="text-sm text-gray-500">Email</p>
                        {modoEdicion ? (
                          <input
                            type="email"
                            value={datosEditados.email}
                            onChange={(e) => setDatosEditados({ ...datosEditados, email: e.target.value })}
                            className="font-semibold bg-gray-100 px-2 py-1 rounded text-gray-900"
                          />
                        ) : (
                          <p className="font-semibold text-gray-900">{datosCompletos.basicos.email}</p>
                        )}
                      </div>
                    </div>
                    {datosCompletos.basicos.telefono && (
                      <div className="flex items-center gap-3">
                        <FaPhone className="text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Teléfono</p>
                          <p className="font-semibold text-gray-900">{datosCompletos.basicos.telefono}</p>
                        </div>
                      </div>
                    )}
                    {datosCompletos.basicos.dni && (
                      <div className="flex items-center gap-3">
                        <FaIdCard className="text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">DNI</p>
                          <p className="font-semibold text-gray-900">{datosCompletos.basicos.dni}</p>
                        </div>
                      </div>
                    )}
                    {datosCompletos.basicos.direccion && (
                      <div className="flex items-center gap-3">
                        <FaMapMarkerAlt className="text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Dirección</p>
                          <p className="font-semibold text-gray-900">{datosCompletos.basicos.direccion}</p>
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
                  <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div
                      onClick={() => toggleSeccion('academico')}
                      className="flex items-center justify-between p-4 bg-blue-50 cursor-pointer hover:bg-blue-100"
                    >
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <FaGraduationCap className="text-blue-500" />
                        Información Académica
                      </h3>
                      {seccionesExpandidas.academico ? <FaChevronUp /> : <FaChevronDown />}
                    </div>
                    {seccionesExpandidas.academico && (
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <FaIdCard className="text-3xl text-blue-500 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Matrícula</p>
                            <p className="text-xl font-bold text-gray-900">{datosCompletos.estudiante.matricula}</p>
                          </div>
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <FaBook className="text-3xl text-blue-500 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Grado</p>
                            <p className="text-xl font-bold text-gray-900">{datosCompletos.estudiante.grado || 'N/A'}</p>
                          </div>
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <FaDoorOpen className="text-3xl text-blue-500 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Sección</p>
                            <p className="text-xl font-bold text-gray-900">{datosCompletos.estudiante.seccion || 'N/A'}</p>
                          </div>
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <FaChartLine className="text-3xl text-green-500 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Promedio General</p>
                            <p className="text-xl font-bold text-gray-900">{datosCompletos.estudiante.promedio_general || '0.00'}</p>
                          </div>
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <FaClipboardCheck className="text-3xl text-green-500 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Asistencia</p>
                            <p className="text-xl font-bold text-gray-900">{datosCompletos.estudiante.porcentaje_asistencia}%</p>
                          </div>
                          <div className="text-center p-4 bg-purple-50 rounded-lg">
                            <FaCalendarAlt className="text-3xl text-purple-500 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Estado</p>
                            <p className="text-xl font-bold text-gray-900">{datosCompletos.estudiante.estado_academico}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cursos Matriculados */}
                  {datosCompletos.cursos && datosCompletos.cursos.length > 0 && (
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                      <div
                        onClick={() => toggleSeccion('cursos')}
                        className="flex items-center justify-between p-4 bg-blue-50 cursor-pointer hover:bg-blue-100"
                      >
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <FaBook className="text-blue-500" />
                          Cursos Matriculados ({datosCompletos.cursos.length})
                        </h3>
                        {seccionesExpandidas.cursos ? <FaChevronUp /> : <FaChevronDown />}
                      </div>
                      {seccionesExpandidas.cursos && (
                        <div className="p-6">
                          <div className="space-y-3">
                            {datosCompletos.cursos.map((curso, idx) => (
                              <div key={idx} className="p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-bold text-gray-900">{curso.curso_nombre}</h4>
                                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
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
                                        <p className="text-sm text-gray-500">Nota Final</p>
                                        <p className="text-2xl font-bold text-green-600">{curso.nota_final}</p>
                                      </div>
                                    ) : curso.nota_parcial ? (
                                      <div>
                                        <p className="text-sm text-gray-500">Nota Parcial</p>
                                        <p className="text-2xl font-bold text-blue-600">{curso.nota_parcial}</p>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">Sin nota</span>
                                    )}
                                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold
                                      ${curso.estado_curso === 'Aprobado' ? 'bg-green-100 text-green-800' : ''}
                                      ${curso.estado_curso === 'En curso' ? 'bg-blue-100 text-blue-800' : ''}
                                      ${curso.estado_curso === 'Reprobado' ? 'bg-red-100 text-red-800' : ''}
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
                  <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div
                      onClick={() => toggleSeccion('academico')}
                      className="flex items-center justify-between p-4 bg-green-50 cursor-pointer hover:bg-green-100"
                    >
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <FaBriefcase className="text-green-500" />
                        Información Profesional
                      </h3>
                      {seccionesExpandidas.academico ? <FaChevronUp /> : <FaChevronDown />}
                    </div>
                    {seccionesExpandidas.academico && (
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="p-4 bg-green-50 rounded-lg">
                            <FaGraduationCap className="text-2xl text-green-500 mb-2" />
                            <p className="text-sm text-gray-500">Especialidad</p>
                            <p className="font-bold text-gray-900">{datosCompletos.docente.especialidad || 'N/A'}</p>
                          </div>
                          <div className="p-4 bg-green-50 rounded-lg">
                            <FaAward className="text-2xl text-green-500 mb-2" />
                            <p className="text-sm text-gray-500">Nivel Académico</p>
                            <p className="font-bold text-gray-900">{datosCompletos.docente.nivel_academico}</p>
                          </div>
                          <div className="p-4 bg-green-50 rounded-lg">
                            <FaClock className="text-2xl text-green-500 mb-2" />
                            <p className="text-sm text-gray-500">Años de Experiencia</p>
                            <p className="font-bold text-gray-900">{datosCompletos.docente.años_experiencia} años</p>
                          </div>
                          <div className="p-4 bg-green-50 rounded-lg">
                            <FaBriefcase className="text-2xl text-green-500 mb-2" />
                            <p className="text-sm text-gray-500">Tipo de Contrato</p>
                            <p className="font-bold text-gray-900">{datosCompletos.docente.tipo_contrato}</p>
                          </div>
                          {datosCompletos.docente.horario_entrada && (
                            <div className="p-4 bg-green-50 rounded-lg">
                              <FaClock className="text-2xl text-green-500 mb-2" />
                              <p className="text-sm text-gray-500">Horario</p>
                              <p className="font-bold text-gray-900">
                                {datosCompletos.docente.horario_entrada} - {datosCompletos.docente.horario_salida}
                              </p>
                            </div>
                          )}
                          <div className="p-4 bg-green-50 rounded-lg">
                            <FaCheckCircle className="text-2xl text-green-500 mb-2" />
                            <p className="text-sm text-gray-500">Estado Laboral</p>
                            <p className="font-bold text-gray-900">{datosCompletos.docente.estado_laboral}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cursos Asignados */}
                  {datosCompletos.cursos && datosCompletos.cursos.length > 0 && (
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                      <div
                        onClick={() => toggleSeccion('cursos')}
                        className="flex items-center justify-between p-4 bg-green-50 cursor-pointer hover:bg-green-100"
                      >
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <FaBook className="text-green-500" />
                          Cursos Asignados ({datosCompletos.cursos.length})
                        </h3>
                        {seccionesExpandidas.cursos ? <FaChevronUp /> : <FaChevronDown />}
                      </div>
                      {seccionesExpandidas.cursos && (
                        <div className="p-6">
                          <div className="space-y-3">
                            {datosCompletos.cursos.map((curso, idx) => (
                              <div key={idx} className="p-4 bg-gray-50 rounded-lg border-l-4 border-green-500">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-bold text-gray-900">{curso.curso_nombre}</h4>
                                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-600">
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
                  <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div
                      onClick={() => toggleSeccion('academico')}
                      className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                    >
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <FaShieldAlt className="text-gray-500" />
                        Información Administrativa
                      </h3>
                      {seccionesExpandidas.academico ? <FaChevronUp /> : <FaChevronDown />}
                    </div>
                    {seccionesExpandidas.academico && (
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <FaBriefcase className="text-2xl text-gray-500 mb-2" />
                            <p className="text-sm text-gray-500">Cargo</p>
                            <p className="font-bold text-gray-900">{datosCompletos.admin.cargo}</p>
                          </div>
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <FaBuilding className="text-2xl text-gray-500 mb-2" />
                            <p className="text-sm text-gray-500">Departamento</p>
                            <p className="font-bold text-gray-900">{datosCompletos.admin.area_departamento || 'N/A'}</p>
                          </div>
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <FaShieldAlt className="text-2xl text-gray-500 mb-2" />
                            <p className="text-sm text-gray-500">Nivel de Acceso</p>
                            <p className="font-bold text-gray-900">{datosCompletos.admin.nivel_acceso}</p>
                          </div>
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <FaCalendarAlt className="text-2xl text-gray-500 mb-2" />
                            <p className="text-sm text-gray-500">Fecha de Nombramiento</p>
                            <p className="font-bold text-gray-900">
                              {datosCompletos.admin.fecha_nombramiento ? new Date(datosCompletos.admin.fecha_nombramiento).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <FaCheckCircle className="text-2xl text-gray-500 mb-2" />
                            <p className="text-sm text-gray-500">Estado</p>
                            <p className="font-bold text-gray-900">{datosCompletos.admin.estado_admin}</p>
                          </div>
                          {datosCompletos.admin.ultimo_acceso && (
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <FaClock className="text-2xl text-gray-500 mb-2" />
                              <p className="text-sm text-gray-500">Último Acceso</p>
                              <p className="font-bold text-gray-900">
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
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                      <div
                        onClick={() => toggleSeccion('permisos')}
                        className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                      >
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <FaCog className="text-gray-500" />
                          Permisos de Gestión ({datosCompletos.modulos.length} módulos)
                        </h3>
                        {seccionesExpandidas.permisos ? <FaChevronUp /> : <FaChevronDown />}
                      </div>
                      {seccionesExpandidas.permisos && (
                        <div className="p-6">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Módulo</th>
                                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Leer</th>
                                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Crear</th>
                                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Editar</th>
                                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Eliminar</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {datosCompletos.modulos.map((modulo, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                      <div>
                                        <p className="font-semibold text-gray-900">{modulo.modulo_nombre}</p>
                                        <p className="text-sm text-gray-500">{modulo.modulo_codigo}</p>
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
