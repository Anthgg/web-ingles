import React, { useState, useEffect } from 'react';
import {
  FaUser, FaIdCard, FaEnvelope, FaPhone, FaMapMarkerAlt,
  FaCalendarAlt, FaVenusMars, FaGlobeAmericas, FaRing,
  FaCamera, FaSave, FaTimes, FaSpinner, FaCheckCircle,
  FaBook, FaGraduationCap, FaBriefcase, FaAward, FaCertificate,
  FaPlus, FaTrash, FaEdit, FaUserTie, FaBuilding, FaClock,
  FaLanguage, FaChartBar, FaClipboardList, FaFileAlt, FaUserShield
} from 'react-icons/fa';

const CompletarDatosUsuario = ({ token, usuarioId, usuarioRol, onClose, onSuccess, showError, showSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [consultandoDNI, setConsultandoDNI] = useState(false);
  const [datosUsuario, setDatosUsuario] = useState(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [previewFoto, setPreviewFoto] = useState(null);
  const [tieneFotoPerfil, setTieneFotoPerfil] = useState(false);
  
  // Datos personales
  const [datosPersonales, setDatosPersonales] = useState({
    nombres: '',
    apellido_paterno: '',
    apellido_materno: '',
    fecha_nacimiento: '',
    genero: '',
    nacionalidad: '',
    estado_civil: '',
    documento_identidad: '',
    tipo_documento: 'DNI',
    telefono: '',
    direccion: '',
    distrito: '',
    provincia: '',
    departamento: '',
    foto_perfil: '',
    dni_verificado: false
  });

  // Datos específicos por rol
  const [datosEstudiante, setDatosEstudiante] = useState({
    matricula: '',
    grado: '',
    seccion: '',
    turno: 'manana',
    modalidad: 'presencial',
    condicion_academica: 'regular',
    becado: false,
    tipo_beca: '',
    porcentaje_beca: 0,
    tutor_nombre: '',
    tutor_telefono: '',
    tutor_email: '',
    observaciones: ''
  });

  const [datosDocente, setDatosDocente] = useState({
    especialidad: '',
    nivel_academico: '',
    titulo_profesional: '',
    universidad_egreso: '',
    numero_colegiatura: '',
    carga_horaria_semanal: 0,
    fecha_ingreso: '',
    areas_investigacion: '',
    idiomas_domina: '',
    nivel_ingles: '',
    disponibilidad_horaria: '',
    observaciones: ''
  });

  const [datosAdmin, setDatosAdmin] = useState({
    cargo: '',
    nivel_acceso: 'bajo',
    area_responsabilidad: '',
    extension_telefonica: '',
    horario_atencion: '',
    ubicacion_oficina: '',
    observaciones: ''
  });

  // Listas dinámicas
  const [certificaciones, setCertificaciones] = useState([]);
  const [formacionAcademica, setFormacionAcademica] = useState([]);
  const [experienciaLaboral, setExperienciaLaboral] = useState([]);
  const [capacitaciones, setCapacitaciones] = useState([]);

  useEffect(() => {
    if (usuarioId) {
      cargarDatosUsuario();
    }
  }, [usuarioId]);

  const cargarDatosUsuario = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3002/usuarios/${usuarioId}/datos-completos`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Error al cargar datos');

      const data = await response.json();
      setDatosUsuario(data);
      
      // Verificar si tiene foto de perfil
      if (data.basicos && data.basicos.tiene_foto_perfil) {
        setTieneFotoPerfil(true);
        setPreviewFoto(`http://localhost:3002/usuarios/${usuarioId}/foto-perfil?t=${Date.now()}`);
      }
      
      // Cargar datos personales
      if (data.basicos) {
        setDatosPersonales({
          fecha_nacimiento: data.basicos.fecha_nacimiento || '',
          genero: data.basicos.genero || '',
          nacionalidad: data.basicos.nacionalidad || '',
          estado_civil: data.basicos.estado_civil || '',
          documento_identidad: data.basicos.documento_identidad || '',
          tipo_documento: data.basicos.tipo_documento || 'DNI',
          telefono: data.basicos.telefono || '',
          foto_perfil: data.basicos.foto_perfil || ''
        });
      }

      // Cargar datos específicos según rol
      if (usuarioRol === 'estudiante' && data.estudiante) {
        setDatosEstudiante({
          matricula: data.estudiante.matricula || '',
          grado: data.estudiante.grado || '',
          seccion: data.estudiante.seccion || '',
          turno: data.estudiante.turno || 'manana',
          modalidad: data.estudiante.modalidad || 'presencial',
          condicion_academica: data.estudiante.condicion_academica || 'regular',
          becado: data.estudiante.becado || false,
          tipo_beca: data.estudiante.tipo_beca || '',
          porcentaje_beca: data.estudiante.porcentaje_beca || 0,
          tutor_nombre: data.estudiante.tutor_nombre || '',
          tutor_telefono: data.estudiante.tutor_telefono || '',
          tutor_email: data.estudiante.tutor_email || '',
          observaciones: data.estudiante.observaciones || ''
        });
      }

      if ((usuarioRol === 'docente' || usuarioRol === 'profesor') && data.docente) {
        setDatosDocente({
          especialidad: data.docente.especialidad || '',
          nivel_academico: data.docente.nivel_academico || '',
          titulo_profesional: data.docente.titulo_profesional || '',
          universidad_egreso: data.docente.universidad_egreso || '',
          numero_colegiatura: data.docente.numero_colegiatura || '',
          carga_horaria_semanal: data.docente.carga_horaria_semanal || 0,
          fecha_ingreso: data.docente.fecha_ingreso || data.basicos?.created_at?.split('T')[0] || '',
          areas_investigacion: data.docente.areas_investigacion || '',
          idiomas_domina: data.docente.idiomas_domina || '',
          nivel_ingles: data.docente.nivel_ingles || '',
          disponibilidad_horaria: data.docente.disponibilidad_horaria || '',
          observaciones: data.docente.observaciones || ''
        });
      }

      if ((usuarioRol === 'admin' || usuarioRol === 'administrativo') && data.admin) {
        setDatosAdmin({
          cargo: data.admin.cargo || '',
          nivel_acceso: data.admin.nivel_acceso || 'bajo',
          area_responsabilidad: data.admin.area_responsabilidad || '',
          extension_telefonica: data.admin.extension_telefonica || '',
          horario_atencion: data.admin.horario_atencion || '',
          ubicacion_oficina: data.admin.ubicacion_oficina || '',
          observaciones: data.admin.observaciones || ''
        });
      }

    } catch (error) {
      console.error('Error:', error);
      showError?.('Error al cargar datos del usuario');
    } finally {
      setLoading(false);
    }
  };

  const consultarDNI = async (dni) => {
    // Validar que sea DNI de 8 dígitos
    if (!dni || dni.length !== 8 || !/^\d+$/.test(dni)) {
      return;
    }

    try {
      setConsultandoDNI(true);
      const response = await fetch(`http://localhost:3002/usuarios/consultar-dni/${dni}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('DNI no encontrado');
      }

      const data = await response.json();
      
      if (data.success) {
        // Autocompletar nombres y apellidos
        setDatosPersonales(prev => ({
          ...prev,
          nombres: data.nombres || '',
          apellido_paterno: data.apellido_paterno || '',
          apellido_materno: data.apellido_materno || '',
          dni_verificado: true
        }));
        
        showSuccess?.(`DNI verificado: ${data.nombre_completo}`);
      }
    } catch (error) {
      console.error('Error al consultar DNI:', error);
      showError?.('No se pudo verificar el DNI. Por favor ingrese los datos manualmente.');
    } finally {
      setConsultandoDNI(false);
    }
  };

  const handleDNIChange = (e) => {
    const dni = e.target.value;
    setDatosPersonales({...datosPersonales, documento_identidad: dni, dni_verificado: false});
    
    // Consultar automáticamente cuando tenga 8 dígitos
    if (dni.length === 8 && /^\d+$/.test(dni)) {
      consultarDNI(dni);
    }
  };

  const guardarDatos = async () => {
    try {
      setGuardando(true);

      // Validaciones básicas
      if (!datosPersonales.fecha_nacimiento) {
        showError?.('La fecha de nacimiento es requerida');
        return;
      }

      if (!datosPersonales.documento_identidad) {
        showError?.('El documento de identidad es requerido');
        return;
      }

      // Construir objeto de actualización según rol
      const datosActualizar = {
        datos_personales: datosPersonales
      };

      if (usuarioRol === 'estudiante') {
        datosActualizar.datos_estudiante = datosEstudiante;
      } else if (usuarioRol === 'docente' || usuarioRol === 'profesor') {
        datosActualizar.datos_docente = datosDocente;
      } else if (usuarioRol === 'admin' || usuarioRol === 'administrativo') {
        datosActualizar.datos_admin = datosAdmin;
      }

      const response = await fetch(`http://localhost:3002/usuarios/${usuarioId}/completar-datos`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(datosActualizar)
      });

      if (!response.ok) throw new Error('Error al guardar datos');

      showSuccess?.('Datos actualizados correctamente');
      onSuccess?.();
      onClose?.();

    } catch (error) {
      console.error('Error:', error);
      showError?.('Error al guardar los datos. Por favor intente nuevamente.');
    } finally {
      setGuardando(false);
    }
  };

  // Función para manejar la selección de archivo de foto
  const handleFotoChange = async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    // Validar tipo de archivo
    const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!tiposPermitidos.includes(archivo.type)) {
      showError?.('Solo se permiten imágenes en formato JPEG, PNG, GIF o WebP');
      e.target.value = ''; // Limpiar el input
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (archivo.size > 5 * 1024 * 1024) {
      showError?.('La imagen es muy grande. El tamaño máximo es 5MB');
      e.target.value = ''; // Limpiar el input
      return;
    }

    try {
      // Mostrar preview usando Promise
      const preview = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Error al cargar preview'));
        reader.readAsDataURL(archivo);
      });
      
      setPreviewFoto(preview);

      // Subir la foto
      await subirFotoPerfil(archivo);
    } catch (error) {
      console.error('Error en handleFotoChange:', error);
      showError?.(error.message || 'Error al procesar la imagen');
    } finally {
      e.target.value = ''; // Limpiar el input para permitir seleccionar el mismo archivo de nuevo
    }
  };

  // Función para subir la foto al servidor
  const subirFotoPerfil = async (archivo) => {
    setSubiendoFoto(true);

    try {
      // Convertir archivo a base64 usando Promise
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = () => {
          try {
            const result = reader.result.split(',')[1]; // Remover el prefijo data:image/...
            resolve(result);
          } catch (err) {
            reject(new Error('Error al procesar la imagen'));
          }
        };
        
        reader.onerror = () => {
          reject(new Error('Error al leer el archivo'));
        };
        
        reader.readAsDataURL(archivo);
      });

      // Subir al servidor
      const response = await fetch(`http://localhost:3002/usuarios/${usuarioId}/foto-perfil`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          foto: base64,
          tipo: archivo.type
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(errorData.error || 'Error al subir la foto');
      }

      const resultado = await response.json();
      setTieneFotoPerfil(true);
      showSuccess?.('Foto de perfil actualizada correctamente');
      
      return resultado;

    } catch (error) {
      console.error('Error al subir foto:', error);
      showError?.(error.message || 'Error al subir la foto. Por favor intente nuevamente.');
      throw error;
    } finally {
      setSubiendoFoto(false);
    }
  };

  // Función para eliminar la foto de perfil
  const eliminarFotoPerfil = async () => {
    if (!window.confirm('¿Está seguro de eliminar su foto de perfil?')) {
      return;
    }

    try {
      setSubiendoFoto(true);

      const response = await fetch(`http://localhost:3002/usuarios/${usuarioId}/foto-perfil`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Error al eliminar la foto');

      setTieneFotoPerfil(false);
      setPreviewFoto(null);
      showSuccess?.('Foto de perfil eliminada correctamente');

    } catch (error) {
      console.error('Error al eliminar foto:', error);
      showError?.('Error al eliminar la foto. Por favor intente nuevamente.');
    } finally {
      setSubiendoFoto(false);
    }
  };

  const agregarCertificacion = () => {
    setCertificaciones([...certificaciones, {
      id: Date.now(),
      nombre_certificacion: '',
      institucion_emisora: '',
      fecha_obtencion: '',
      nivel: '',
      codigo_verificacion: ''
    }]);
  };

  const eliminarCertificacion = (id) => {
    setCertificaciones(certificaciones.filter(c => c.id !== id));
  };

  const agregarFormacion = () => {
    setFormacionAcademica([...formacionAcademica, {
      id: Date.now(),
      grado_academico: 'licenciado',
      titulo: '',
      institucion: '',
      pais: 'Perú',
      fecha_inicio: '',
      fecha_fin: '',
      en_curso: false
    }]);
  };

  const eliminarFormacion = (id) => {
    setFormacionAcademica(formacionAcademica.filter(f => f.id !== id));
  };

  const agregarExperiencia = () => {
    setExperienciaLaboral([...experienciaLaboral, {
      id: Date.now(),
      institucion: '',
      cargo: '',
      area: '',
      fecha_inicio: '',
      fecha_fin: '',
      actualmente_trabaja: false,
      descripcion_funciones: ''
    }]);
  };

  const eliminarExperiencia = (id) => {
    setExperienciaLaboral(experienciaLaboral.filter(e => e.id !== id));
  };

  const agregarCapacitacion = () => {
    setCapacitaciones([...capacitaciones, {
      id: Date.now(),
      nombre_capacitacion: '',
      institucion_organizadora: '',
      tipo: 'curso',
      duracion_horas: 0,
      fecha_inicio: '',
      fecha_fin: '',
      certificado_obtenido: false
    }]);
  };

  const eliminarCapacitacion = (id) => {
    setCapacitaciones(capacitaciones.filter(c => c.id !== id));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <FaSpinner className="animate-spin text-4xl text-blue-500 mx-auto" />
          <p className="mt-4 text-gray-600">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Completar Datos de Usuario</h2>
            <p className="text-blue-100 text-sm mt-1">
              {datosUsuario?.basicos?.nombre} - {usuarioRol}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
            disabled={guardando}
          >
            <FaTimes className="text-2xl" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Datos Personales */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <FaUser className="mr-2 text-blue-600" />
              Datos Personales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Sección de DNI con verificación */}
              <div className="md:col-span-3 bg-blue-50 p-4 rounded-lg mb-4">
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                  <FaIdCard className="mr-2 text-blue-600" />
                  Documento de Identidad
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Documento
                    </label>
                    <select
                      value={datosPersonales.tipo_documento}
                      onChange={(e) => setDatosPersonales({...datosPersonales, tipo_documento: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="DNI">DNI</option>
                      <option value="CE">Carnet de Extranjería</option>
                      <option value="pasaporte">Pasaporte</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de Documento *
                      {consultandoDNI && (
                        <span className="ml-2 text-blue-600">
                          <FaSpinner className="inline animate-spin" /> Verificando...
                        </span>
                      )}
                      {datosPersonales.dni_verificado && (
                        <span className="ml-2 text-green-600">
                          <FaCheckCircle className="inline" /> Verificado
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={datosPersonales.documento_identidad}
                      onChange={handleDNIChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ej: 12345678"
                      maxLength="8"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {datosPersonales.tipo_documento === 'DNI' && 'Se verificará automáticamente con RENIEC'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Nombres y Apellidos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombres *
                </label>
                <input
                  type="text"
                  value={datosPersonales.nombres}
                  onChange={(e) => setDatosPersonales({...datosPersonales, nombres: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Juan Carlos"
                  required
                  readOnly={consultandoDNI}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Apellido Paterno *
                </label>
                <input
                  type="text"
                  value={datosPersonales.apellido_paterno}
                  onChange={(e) => setDatosPersonales({...datosPersonales, apellido_paterno: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: García"
                  required
                  readOnly={consultandoDNI}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Apellido Materno *
                </label>
                <input
                  type="text"
                  value={datosPersonales.apellido_materno}
                  onChange={(e) => setDatosPersonales({...datosPersonales, apellido_materno: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Pérez"
                  required
                  readOnly={consultandoDNI}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaCalendarAlt className="inline mr-2" />
                  Fecha de Nacimiento *
                </label>
                <input
                  type="date"
                  value={datosPersonales.fecha_nacimiento}
                  onChange={(e) => setDatosPersonales({...datosPersonales, fecha_nacimiento: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaVenusMars className="inline mr-2" />
                  Género
                </label>
                <select
                  value={datosPersonales.genero}
                  onChange={(e) => setDatosPersonales({...datosPersonales, genero: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleccione...</option>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                  <option value="otro">Otro</option>
                  <option value="prefiero_no_decir">Prefiero no decir</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaGlobeAmericas className="inline mr-2" />
                  Nacionalidad
                </label>
                <input
                  type="text"
                  value={datosPersonales.nacionalidad}
                  onChange={(e) => setDatosPersonales({...datosPersonales, nacionalidad: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Peruana"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaRing className="inline mr-2" />
                  Estado Civil
                </label>
                <select
                  value={datosPersonales.estado_civil}
                  onChange={(e) => setDatosPersonales({...datosPersonales, estado_civil: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleccione...</option>
                  <option value="soltero">Soltero(a)</option>
                  <option value="casado">Casado(a)</option>
                  <option value="divorciado">Divorciado(a)</option>
                  <option value="viudo">Viudo(a)</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              {/* Dirección completa */}
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaMapMarkerAlt className="inline mr-2" />
                  Dirección Completa
                </label>
                <input
                  type="text"
                  value={datosPersonales.direccion}
                  onChange={(e) => setDatosPersonales({...datosPersonales, direccion: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Av. Principal 123, Urb. Los Jardines"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Distrito
                </label>
                <input
                  type="text"
                  value={datosPersonales.distrito}
                  onChange={(e) => setDatosPersonales({...datosPersonales, distrito: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: San Isidro"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Provincia
                </label>
                <input
                  type="text"
                  value={datosPersonales.provincia}
                  onChange={(e) => setDatosPersonales({...datosPersonales, provincia: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Lima"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Departamento
                </label>
                <input
                  type="text"
                  value={datosPersonales.departamento}
                  onChange={(e) => setDatosPersonales({...datosPersonales, departamento: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Lima"
                />
              </div>

              {/* Foto de Perfil */}
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <FaCamera className="inline mr-2" />
                  Foto de Perfil
                </label>
                
                <div className="flex flex-col md:flex-row gap-4 items-start">
                  {/* Preview de la foto */}
                  <div className="flex-shrink-0">
                    {previewFoto ? (
                      <div className="relative">
                        <img
                          src={previewFoto}
                          alt="Foto de perfil"
                          className="w-32 h-32 rounded-full object-cover border-4 border-blue-500 shadow-lg"
                        />
                        {subiendoFoto && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                            <FaSpinner className="animate-spin text-white text-2xl" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={eliminarFotoPerfil}
                          disabled={subiendoFoto}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors shadow-lg disabled:opacity-50"
                          title="Eliminar foto"
                        >
                          <FaTrash className="text-xs" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-2 border-dashed border-gray-400">
                        <FaUser className="text-4xl text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Botón para subir foto */}
                  <div className="flex-grow">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                      <input
                        type="file"
                        id="foto-perfil-input"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={handleFotoChange}
                        disabled={subiendoFoto}
                        className="hidden"
                      />
                      <label
                        htmlFor="foto-perfil-input"
                        className={`cursor-pointer ${subiendoFoto ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <FaCamera className="mx-auto text-3xl text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600 mb-1">
                          {subiendoFoto ? 'Subiendo...' : 'Click para seleccionar una imagen'}
                        </p>
                        <p className="text-xs text-gray-500">
                          JPEG, PNG, GIF o WebP (máx. 5MB)
                        </p>
                      </label>
                    </div>
                    
                    {tieneFotoPerfil && (
                      <div className="mt-2 flex items-center text-green-600 text-sm">
                        <FaCheckCircle className="mr-1" />
                        Foto de perfil configurada
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Datos de Contacto */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <FaPhone className="mr-2 text-blue-600" />
              Datos de Contacto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaPhone className="inline mr-2" />
                  Teléfono *
                </label>
                <input
                  type="tel"
                  value={datosPersonales.telefono}
                  onChange={(e) => setDatosPersonales({...datosPersonales, telefono: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: +51 999 999 999"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaEnvelope className="inline mr-2" />
                  Email
                </label>
                <input
                  type="email"
                  value={datosUsuario?.email || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Datos Específicos - ESTUDIANTE */}
          {usuarioRol === 'estudiante' && (
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <FaGraduationCap className="mr-2 text-green-600" />
                Datos Académicos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Matrícula *
                  </label>
                  <input
                    type="text"
                    value={datosEstudiante.matricula}
                    onChange={(e) => setDatosEstudiante({...datosEstudiante, matricula: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: 2024-001"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grado/Nivel
                  </label>
                  <input
                    type="text"
                    value={datosEstudiante.grado}
                    onChange={(e) => setDatosEstudiante({...datosEstudiante, grado: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Intermedio 2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sección
                  </label>
                  <input
                    type="text"
                    value={datosEstudiante.seccion}
                    onChange={(e) => setDatosEstudiante({...datosEstudiante, seccion: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: A"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FaClock className="inline mr-2" />
                    Turno
                  </label>
                  <select
                    value={datosEstudiante.turno}
                    onChange={(e) => setDatosEstudiante({...datosEstudiante, turno: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="manana">Mañana</option>
                    <option value="tarde">Tarde</option>
                    <option value="noche">Noche</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modalidad
                  </label>
                  <select
                    value={datosEstudiante.modalidad}
                    onChange={(e) => setDatosEstudiante({...datosEstudiante, modalidad: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="presencial">Presencial</option>
                    <option value="virtual">Virtual</option>
                    <option value="hibrido">Híbrido</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Condición Académica
                  </label>
                  <select
                    value={datosEstudiante.condicion_academica}
                    onChange={(e) => setDatosEstudiante({...datosEstudiante, condicion_academica: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="regular">Regular</option>
                    <option value="irregular">Irregular</option>
                    <option value="retirado">Retirado</option>
                    <option value="egresado">Egresado</option>
                  </select>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={datosEstudiante.becado}
                      onChange={(e) => setDatosEstudiante({...datosEstudiante, becado: e.target.checked})}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      <FaAward className="inline mr-1" />
                      Becado
                    </span>
                  </label>
                </div>

                {datosEstudiante.becado && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Beca
                      </label>
                      <input
                        type="text"
                        value={datosEstudiante.tipo_beca}
                        onChange={(e) => setDatosEstudiante({...datosEstudiante, tipo_beca: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ej: Beca Excelencia"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Porcentaje de Beca (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={datosEstudiante.porcentaje_beca}
                        onChange={(e) => setDatosEstudiante({...datosEstudiante, porcentaje_beca: parseFloat(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </>
                )}

                <div className="md:col-span-3">
                  <h4 className="font-semibold text-gray-700 mb-3 mt-4">Datos del Tutor/Apoderado</h4>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Tutor
                  </label>
                  <input
                    type="text"
                    value={datosEstudiante.tutor_nombre}
                    onChange={(e) => setDatosEstudiante({...datosEstudiante, tutor_nombre: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono del Tutor
                  </label>
                  <input
                    type="tel"
                    value={datosEstudiante.tutor_telefono}
                    onChange={(e) => setDatosEstudiante({...datosEstudiante, tutor_telefono: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email del Tutor
                  </label>
                  <input
                    type="email"
                    value={datosEstudiante.tutor_email}
                    onChange={(e) => setDatosEstudiante({...datosEstudiante, tutor_email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones
                  </label>
                  <textarea
                    value={datosEstudiante.observaciones}
                    onChange={(e) => setDatosEstudiante({...datosEstudiante, observaciones: e.target.value})}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Datos Específicos - DOCENTE */}
          {(usuarioRol === 'docente' || usuarioRol === 'profesor') && (
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <FaBriefcase className="mr-2 text-purple-600" />
                Datos Profesionales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Especialidad *
                  </label>
                  <input
                    type="text"
                    value={datosDocente.especialidad}
                    onChange={(e) => setDatosDocente({...datosDocente, especialidad: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Enseñanza de Inglés"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nivel Académico
                  </label>
                  <select
                    value={datosDocente.nivel_academico}
                    onChange={(e) => setDatosDocente({...datosDocente, nivel_academico: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccione...</option>
                    <option value="bachiller">Bachiller</option>
                    <option value="licenciado">Licenciado</option>
                    <option value="magister">Magíster</option>
                    <option value="doctor">Doctor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título Profesional
                  </label>
                  <input
                    type="text"
                    value={datosDocente.titulo_profesional}
                    onChange={(e) => setDatosDocente({...datosDocente, titulo_profesional: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Licenciado en Educación"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Universidad de Egreso
                  </label>
                  <input
                    type="text"
                    value={datosDocente.universidad_egreso}
                    onChange={(e) => setDatosDocente({...datosDocente, universidad_egreso: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Colegiatura
                  </label>
                  <input
                    type="text"
                    value={datosDocente.numero_colegiatura}
                    onChange={(e) => setDatosDocente({...datosDocente, numero_colegiatura: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Carga Horaria Semanal
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={datosDocente.carga_horaria_semanal}
                    onChange={(e) => setDatosDocente({...datosDocente, carga_horaria_semanal: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FaCalendarAlt className="inline mr-2" />
                    Fecha de Ingreso
                  </label>
                  <input
                    type="date"
                    value={datosDocente.fecha_ingreso || datosUsuario?.created_at?.split('T')[0] || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    title="Fecha automática de creación de cuenta"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Fecha automática de creación de cuenta
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FaLanguage className="inline mr-2" />
                    Nivel de Inglés
                  </label>
                  <input
                    type="text"
                    value={datosDocente.nivel_ingles}
                    onChange={(e) => setDatosDocente({...datosDocente, nivel_ingles: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: C2, Nativo"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Áreas de Investigación
                  </label>
                  <input
                    type="text"
                    value={datosDocente.areas_investigacion}
                    onChange={(e) => setDatosDocente({...datosDocente, areas_investigacion: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Separar con comas"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Idiomas que Domina
                  </label>
                  <input
                    type="text"
                    value={datosDocente.idiomas_domina}
                    onChange={(e) => setDatosDocente({...datosDocente, idiomas_domina: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Español (nativo), Inglés (C2), Francés (B1)"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Disponibilidad Horaria
                  </label>
                  <textarea
                    value={datosDocente.disponibilidad_horaria}
                    onChange={(e) => setDatosDocente({...datosDocente, disponibilidad_horaria: e.target.value})}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Lunes a Viernes 8am-6pm, Sábados 8am-1pm"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones
                  </label>
                  <textarea
                    value={datosDocente.observaciones}
                    onChange={(e) => setDatosDocente({...datosDocente, observaciones: e.target.value})}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Datos Específicos - ADMIN */}
          {(usuarioRol === 'admin' || usuarioRol === 'administrativo') && (
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <FaUserShield className="mr-2 text-red-600" />
                Datos Administrativos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cargo *
                  </label>
                  <input
                    type="text"
                    value={datosAdmin.cargo}
                    onChange={(e) => setDatosAdmin({...datosAdmin, cargo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Coordinador Académico"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nivel de Acceso
                  </label>
                  <select
                    value={datosAdmin.nivel_acceso}
                    onChange={(e) => setDatosAdmin({...datosAdmin, nivel_acceso: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="bajo">Bajo</option>
                    <option value="medio">Medio</option>
                    <option value="alto">Alto</option>
                    <option value="total">Total</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FaBuilding className="inline mr-2" />
                    Área de Responsabilidad
                  </label>
                  <input
                    type="text"
                    value={datosAdmin.area_responsabilidad}
                    onChange={(e) => setDatosAdmin({...datosAdmin, area_responsabilidad: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Dirección Académica"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FaPhone className="inline mr-2" />
                    Extensión Telefónica
                  </label>
                  <input
                    type="text"
                    value={datosAdmin.extension_telefonica}
                    onChange={(e) => setDatosAdmin({...datosAdmin, extension_telefonica: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: 101"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FaClock className="inline mr-2" />
                    Horario de Atención
                  </label>
                  <input
                    type="text"
                    value={datosAdmin.horario_atencion}
                    onChange={(e) => setDatosAdmin({...datosAdmin, horario_atencion: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: L-V 9am-5pm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FaMapMarkerAlt className="inline mr-2" />
                    Ubicación de Oficina
                  </label>
                  <input
                    type="text"
                    value={datosAdmin.ubicacion_oficina}
                    onChange={(e) => setDatosAdmin({...datosAdmin, ubicacion_oficina: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Piso 2, Oficina 201"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones
                  </label>
                  <textarea
                    value={datosAdmin.observaciones}
                    onChange={(e) => setDatosAdmin({...datosAdmin, observaciones: e.target.value})}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer con botones */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end space-x-3 border-t">
          <button
            onClick={onClose}
            disabled={guardando}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors flex items-center disabled:opacity-50"
          >
            <FaTimes className="mr-2" />
            Cancelar
          </button>
          <button
            onClick={guardarDatos}
            disabled={guardando}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50"
          >
            {guardando ? (
              <>
                <FaSpinner className="mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <FaSave className="mr-2" />
                Guardar Datos
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompletarDatosUsuario;
