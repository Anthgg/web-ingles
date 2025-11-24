import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  FaUser, FaIdCard, FaEnvelope, FaPhone, FaMapMarkerAlt,
  FaCalendarAlt, FaVenusMars, FaGlobeAmericas, FaRing,
  FaCamera, FaSave, FaTimes, FaSpinner, FaCheckCircle,
  FaBook, FaGraduationCap, FaBriefcase, FaAward, FaCertificate,
  FaPlus, FaTrash, FaEdit, FaUserTie, FaBuilding, FaClock,
  FaLanguage, FaChartBar, FaClipboardList, FaFileAlt, FaUserShield,
  FaChevronLeft, FaChevronRight, FaLock, FaSearch
} from 'react-icons/fa';
import Ubigeo from 'peru-ubigeo';

const normalizeText = (text = '') =>
  text
    ? text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
    : '';

const PHONE_CODE_OPTIONS = [
  { code: '+51', label: 'Perú', badge: 'PE' },
  { code: '+57', label: 'Colombia', badge: 'CO' },
  { code: '+56', label: 'Chile', badge: 'CL' },
  { code: '+52', label: 'México', badge: 'MX' },
  { code: '+54', label: 'Argentina', badge: 'AR' },
  { code: '+591', label: 'Bolivia', badge: 'BO' },
  { code: '+58', label: 'Venezuela', badge: 'VE' },
  { code: '+1', label: 'EE.UU./Canadá', badge: 'US' },
  { code: '+34', label: 'España', badge: 'ES' }
];

const splitTelefono = (valor = '') => {
  if (!valor) return { codigo: '+51', numero: '' };
  const trimmed = valor.trim();
  const match = trimmed.match(/^(\+\d{1,4})(.*)$/);
  if (match) {
    return {
      codigo: match[1],
      numero: match[2].trim().replace(/\s+/g, ' '),
    };
  }
  return {
    codigo: '+51',
    numero: trimmed,
  };
};

const buildTelefonoValor = (codigo, numero) => {
  const cleanNumero = numero.trim();
  return cleanNumero ? `${codigo} ${cleanNumero}`.trim() : codigo || '';
};

const limpiarUbicacion = ({ departamento = '', provincia = '', distrito = '' }) => {
  const clean = (v = '') => (v ? `${v}`.trim() : '');
  return {
    departamento: clean(departamento),
    provincia: clean(provincia),
    distrito: clean(distrito),
  };
};

const descomponerNombre = (basicos = {}) => {
  const apP = (basicos.apellido_paterno || '').trim();
  const apM = (basicos.apellido_materno || '').trim();
  const nombresRaw = (basicos.nombres || basicos.nombre_completo || basicos.nombre || '').trim();

  // Si ya hay apellidos explícitos, usamos esos y dejamos los nombres tal cual.
  if (apP || apM) {
    return {
      nombres: nombresRaw || basicos.nombres || '',
      apellido_paterno: apP,
      apellido_materno: apM,
    };
  }

  if (!nombresRaw) {
    return { nombres: '', apellido_paterno: '', apellido_materno: '' };
  }

  const parts = nombresRaw.split(/\s+/).filter(Boolean);
  if (parts.length >= 3) {
    const apellido_materno = parts.pop();
    const apellido_paterno = parts.pop();
    const nombres = parts.join(' ');
    return { nombres, apellido_paterno, apellido_materno };
  }

  if (parts.length === 2) {
    const apellido_paterno = parts.pop();
    const nombres = parts.join(' ');
    return { nombres, apellido_paterno, apellido_materno: '' };
  }

  // Solo un token
  return { nombres: nombresRaw, apellido_paterno: '', apellido_materno: '' };
};

const buildNombreCompleto = (basicos = {}) => {
  const { nombres, apellido_paterno, apellido_materno } = descomponerNombre(basicos);
  const compuesto = [nombres, apellido_paterno, apellido_materno]
    .filter(Boolean)
    .join(' ')
    .trim();

  return basicos.nombre_completo || compuesto || basicos.nombre || 'Usuario';
};

const PhoneCodeSlider = ({ selectedCode = '+51', onSelect }) => {
  const sliderRef = useRef(null);

  const scrollBy = (direction) => {
    if (!sliderRef.current) return;
    sliderRef.current.scrollBy({
      left: direction * 160,
      behavior: 'smooth',
    });
  };

  return (
    <div className="phone-code-slider bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-indigo-500 font-semibold">Código</p>
          <p className="text-sm text-slate-500">Desliza para elegir tu prefijo internacional</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="w-9 h-9 rounded-full border border-slate-200 text-slate-500 hover:text-indigo-500 hover:border-indigo-200 transition"
            onClick={() => scrollBy(-1)}
          >
            {'<'}
          </button>
          <button
            type="button"
            className="w-9 h-9 rounded-full border border-slate-200 text-slate-500 hover:text-indigo-500 hover:border-indigo-200 transition"
            onClick={() => scrollBy(1)}
          >
            {'>'}
          </button>
        </div>
      </div>
      <div
        ref={sliderRef}
        className="flex gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-indigo-100 pb-2"
      >
        {PHONE_CODE_OPTIONS.map((option) => {
          const isActive = option.code === selectedCode;
          return (
            <button
              key={option.code}
              type="button"
              onClick={() => onSelect && onSelect(option.code)}
              className={`min-w-[120px] px-4 py-3 rounded-2xl border text-left transition-all flex flex-col gap-1 ${
                isActive
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-md'
                  : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
              }`}
            >
              <span className="text-xs font-mono uppercase text-slate-500">{option.badge}</span>
              <span className="text-lg font-bold">{option.code}</span>
              <span className="text-xs text-slate-500">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const SectionPanel = ({ icon: Icon, title, subtitle, badge, children }) => (
  <section className="modern-section">
    <div className="modern-section__header">
      <div className="modern-section__title">
        {Icon && (
          <span className="modern-section__icon">
            <Icon />
          </span>
        )}
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {badge && <span className="modern-section__badge">{badge}</span>}
    </div>
    <div className="modern-section__body">{children}</div>
  </section>
);

const HighlightCard = ({ icon: Icon, title, description, tone = 'info', children }) => (
  <div className={`highlight-card highlight-card--${tone}`}>
    <div className="highlight-card__header">
      {Icon && (
        <span className="highlight-card__icon">
          <Icon />
        </span>
      )}
      <div>
        <h4>{title}</h4>
        {description && <p>{description}</p>}
      </div>
    </div>
    <div className="highlight-card__body">{children}</div>
  </div>
);

const UbicacionPeruSlider = ({ value = {}, onChange }) => {
  const [activePanel, setActivePanel] = useState(0);
  const [filters, setFilters] = useState({ departamento: '', provincia: '', distrito: '' });
  const ubigeoInstance = useMemo(() => new Ubigeo(), []);

  const ubicacionTree = useMemo(() => {
    const regiones = ubigeoInstance.getRegions();
    if (!Array.isArray(regiones)) return [];
    return regiones.map((region) => {
      const provincias = typeof region.provinces === 'function' ? region.provinces() : [];
      return {
        id: region.id,
        name: region.name,
        provincias: (provincias || []).map((provincia) => {
          const distritos = typeof provincia.districts === 'function' ? provincia.districts() : [];
          return {
            id: provincia.id,
            name: provincia.name,
            distritos: (distritos || []).map((distrito) => ({
              id: distrito.id,
              name: distrito.name,
            })),
          };
        }),
      };
    });
  }, [ubigeoInstance]);

  const safeValue = {
    departamento: value.departamento || '',
    provincia: value.provincia || '',
    distrito: value.distrito || '',
  };

  const selectedDepartamento = useMemo(() => {
    if (!safeValue.departamento) return null;
    return (
      ubicacionTree.find(
        (dep) =>
          normalizeText(dep.name) === normalizeText(safeValue.departamento) ||
          String(dep.id) === String(safeValue.departamento)
      ) || null
    );
  }, [safeValue.departamento, ubicacionTree]);

  const provincias = selectedDepartamento?.provincias || [];

  const selectedProvincia = useMemo(() => {
    if (!safeValue.provincia) return null;
    return (
      provincias.find(
        (prov) =>
          normalizeText(prov.name) === normalizeText(safeValue.provincia) ||
          String(prov.id) === String(safeValue.provincia)
      ) || null
    );
  }, [safeValue.provincia, provincias]);

  const distritos = selectedProvincia?.distritos || [];

  useEffect(() => {
    if (safeValue.distrito) {
      setActivePanel(2);
    } else if (safeValue.provincia) {
      setActivePanel(1);
    } else {
      setActivePanel(0);
    }
  }, [safeValue.provincia, safeValue.distrito]);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, provincia: '', distrito: '' }));
  }, [selectedDepartamento?.id]);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, distrito: '' }));
  }, [selectedProvincia?.id]);

  const canAccessPanel = (index) => {
    if (index === 0) return true;
    if (index === 1) return Boolean(safeValue.departamento);
    if (index === 2) return Boolean(safeValue.departamento && safeValue.provincia);
    return true;
  };

  const handleSelect = (panelKey, item) => {
    if (!item || typeof onChange !== 'function') return;
    if (panelKey === 'departamento') {
      onChange({ departamento: item.name, provincia: '', distrito: '' });
      setActivePanel(1);
    } else if (panelKey === 'provincia') {
      onChange({ provincia: item.name, distrito: '' });
      setActivePanel(2);
    } else {
      onChange({ distrito: item.name });
    }
  };

  const panels = useMemo(
    () => [
      {
        key: 'departamento',
        title: 'Departamento',
        placeholder: 'Ej: Lima',
        description: 'Selecciona el departamento donde reside el usuario.',
        items: ubicacionTree,
        locked: false,
        selectedValue: safeValue.departamento,
      },
      {
        key: 'provincia',
        title: 'Provincia',
        placeholder: 'Ej: Lima',
        description: 'Elige la provincia según el departamento elegido.',
        items: provincias,
        locked: !selectedDepartamento,
        selectedValue: safeValue.provincia,
      },
      {
        key: 'distrito',
        title: 'Distrito',
        placeholder: 'Ej: Miraflores',
        description: 'Finaliza indicando el distrito correspondiente.',
        items: distritos,
        locked: !selectedProvincia,
        selectedValue: safeValue.distrito,
      },
    ],
    [
      ubicacionTree,
      provincias,
      distritos,
      selectedDepartamento,
      selectedProvincia,
      safeValue.departamento,
      safeValue.provincia,
      safeValue.distrito,
    ]
  );

  const renderPanel = (panel, index) => {
    const filteredItems = (panel.items || []).filter((item) =>
      normalizeText(item.name).includes(normalizeText(filters[panel.key]))
    );
    const selectionCount = filteredItems.length;
    const selectedValue = panel.selectedValue;

    return (
      <div
        key={panel.key}
        className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col h-full transition-all duration-200 ${
          !panel.locked && canAccessPanel(index)
            ? 'hover:shadow-xl hover:-translate-y-0.5'
            : 'opacity-60 pointer-events-none'
        }`}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-400 font-semibold">Paso {index + 1}</p>
            <h4 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <FaMapMarkerAlt className="text-indigo-500" />
              {panel.title}
            </h4>
            <p className="text-sm text-slate-500 mt-1">{panel.description}</p>
          </div>
          <div className="flex flex-col items-end text-xs text-slate-500">
            <span className="px-2 py-1 bg-slate-100 rounded-full font-medium">
              {panel.placeholder}
            </span>
            {selectedValue && (
              <span className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 rounded-full font-semibold">
                <FaCheckCircle className="text-xs" />
                {selectedValue}
              </span>
            )}
          </div>
        </div>

        <div className="relative mb-3">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filters[panel.key]}
            onChange={(e) => setFilters((prev) => ({ ...prev, [panel.key]: e.target.value }))}
            placeholder={`Buscar ${panel.title.toLowerCase()}...`}
            disabled={panel.locked}
            className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 text-sm"
          />
        </div>

        {!canAccessPanel(index) && (
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
            <FaLock />
            <span>Disponible después de seleccionar el paso anterior.</span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>{selectionCount} opciones</span>
          {selectedValue && <span className="text-indigo-500 font-semibold">Seleccionado</span>}
        </div>

        <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar" style={{ maxHeight: '16rem' }}>
          {filteredItems.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No hay resultados para tu búsqueda.</p>
          ) : (
            filteredItems.map((item) => {
              const isSelected = normalizeText(selectedValue) === normalizeText(item.name);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(panel.key, item)}
                  className={`w-full text-left px-3 py-2 rounded-xl border transition-all duration-150 flex items-center justify-between ${
                    isSelected
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-sm'
                      : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-sm font-medium">{item.name}</span>
                  {isSelected && <FaCheckCircle className="text-indigo-500" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="ubicacion-slider-wrapper bg-gradient-to-r from-slate-50 to-indigo-50 border border-indigo-100 rounded-3xl p-6 shadow-inner">
      <div className="flex flex-col gap-2 mb-6">
        <span className="text-xs uppercase tracking-[0.5em] text-indigo-600 font-semibold">Ubicación Perú</span>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <h3 className="text-2xl font-bold text-slate-800">
            Selecciona Departamento, Provincia y Distrito
          </h3>
          <p className="text-sm text-slate-600 max-w-2xl">
            Sigue el flujo paso a paso para asegurar una ubicación oficial compatible con el padrón nacional de
            ubigeo. Cada etapa se desbloquea al completar la anterior.
          </p>
        </div>
      </div>

      <div className="hidden lg:grid lg:grid-cols-3 gap-4">
        {panels.map((panel, index) => renderPanel(panel, index))}
      </div>

      <div className="lg:hidden">
        <div className="relative overflow-hidden">
          <div
            className="flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${activePanel * 100}%)` }}
          >
            {panels.map((panel, index) => (
              <div key={panel.key} className="w-full flex-shrink-0 pr-4 last:pr-0">
                {renderPanel(panel, index)}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <button
            type="button"
            className="p-2 rounded-full bg-white border border-slate-200 shadow-sm disabled:opacity-40"
            onClick={() => setActivePanel((prev) => Math.max(prev - 1, 0))}
            disabled={activePanel === 0}
          >
            <FaChevronLeft />
          </button>

          <div className="flex items-center gap-2">
            {panels.map((panel, index) => (
              <button
                key={panel.key}
                type="button"
                className={`w-3 h-3 rounded-full transition-colors ${
                  activePanel === index ? 'bg-indigo-500' : canAccessPanel(index) ? 'bg-slate-300' : 'bg-slate-200'
                }`}
                onClick={() => canAccessPanel(index) && setActivePanel(index)}
                disabled={!canAccessPanel(index)}
                aria-label={`Ir al paso ${index + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            className="p-2 rounded-full bg-white border border-slate-200 shadow-sm disabled:opacity-40"
            onClick={() =>
              setActivePanel((prev) => Math.min(prev + 1, panels.length - 1))
            }
            disabled={activePanel === panels.length - 1 || !canAccessPanel(activePanel + 1)}
          >
            <FaChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
};

const CompletarDatosUsuario = ({ token, usuarioId, usuarioRol, onClose, onSuccess, showError, showSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [consultandoDNI, setConsultandoDNI] = useState(false);
  const [datosUsuario, setDatosUsuario] = useState(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [previewFoto, setPreviewFoto] = useState(null);
  const [tieneFotoPerfil, setTieneFotoPerfil] = useState(false);
  
  // Datos personales
  const [usuarios, setUsuarios] = useState({
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
  const [nacionalidadCategoria, setNacionalidadCategoria] = useState('peruano');
  const [telefonoCodigo, setTelefonoCodigo] = useState('+51');
  const [telefonoNumero, setTelefonoNumero] = useState('');

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
    observaciones: '',
    area_departamento: '',
    permisos_especiales: '',
    fecha_nombramiento: '',
    ultimo_cambio: ''
  });

  // Listas dinámicas
  const [certificaciones, setCertificaciones] = useState([]);
  const [formacionAcademica, setFormacionAcademica] = useState([]);
  const [experienciaLaboral, setExperienciaLaboral] = useState([]);
  const [capacitaciones, setCapacitaciones] = useState([]);

  useEffect(() => {
    setUsuarios((prev) => ({
      ...prev,
      telefono: buildTelefonoValor(telefonoCodigo, telefonoNumero),
    }));
  }, [telefonoCodigo, telefonoNumero]);

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
      console.log('📥 Datos recibidos para completar usuario:', {
        basicos: data?.basicos,
        estudiante: data?.estudiante,
        docente: data?.docente,
        admin: data?.admin,
      });

      const basicosNormalizados = {
        ...(data.basicos || {}),
        nombres: data.basicos?.nombres || data.basicos?.nombre || '',
        nombre: buildNombreCompleto(data.basicos),
        nombre_completo: buildNombreCompleto(data.basicos),
        direccion: (data.basicos?.direccion || data.basicos?.direccion_alt || data.admin?.direccion || '').trim(),
        telefono: data.basicos?.telefono || data.basicos?.telefono_alt || '',
        documento_identidad: data.basicos?.documento_identidad || data.basicos?.dni_alt || '',
        departamento: (data.basicos?.departamento || data.admin?.departamento || '').trim(),
        provincia: (data.basicos?.provincia || data.admin?.provincia || '').trim(),
        distrito: (data.basicos?.distrito || data.admin?.distrito || '').trim(),
        tiene_foto_perfil:
          data.basicos?.tiene_foto_perfil ||
          (data.basicos?.foto_perfil_imagen ? 1 : 0) ||
          (data.basicos?.foto_perfil ? 1 : 0),
      };

      const nombreDescompuesto = descomponerNombre(basicosNormalizados);
      const ubicacionLimpia = limpiarUbicacion(basicosNormalizados);
      const basicosNormalizadosFinal = {
        ...basicosNormalizados,
        ...nombreDescompuesto,
        ...ubicacionLimpia,
      };
      basicosNormalizadosFinal.nombre = buildNombreCompleto(basicosNormalizadosFinal);
      basicosNormalizadosFinal.nombre_completo = buildNombreCompleto(basicosNormalizadosFinal);

      setDatosUsuario({
        ...data,
        basicos: basicosNormalizadosFinal,
      });
      
      // Verificar si tiene foto de perfil
      if (basicosNormalizadosFinal.tiene_foto_perfil) {
        setTieneFotoPerfil(true);
        setPreviewFoto(`http://localhost:3002/usuarios/${usuarioId}/foto-perfil?t=${Date.now()}`);
      }
      
      // Cargar datos personales
      if (basicosNormalizadosFinal) {
        // Convertir fecha_nacimiento de ISO a formato yyyy-MM-dd
        let fechaNacimiento = basicosNormalizadosFinal.fecha_nacimiento || '';
        if (fechaNacimiento && fechaNacimiento.includes('T')) {
          fechaNacimiento = fechaNacimiento.split('T')[0];
        }

        setUsuarios({
          nombres: basicosNormalizadosFinal.nombres || '',
          apellido_paterno: basicosNormalizadosFinal.apellido_paterno || '',
          apellido_materno: basicosNormalizadosFinal.apellido_materno || '',
          fecha_nacimiento: fechaNacimiento,
          genero: basicosNormalizadosFinal.genero || '',
          nacionalidad: basicosNormalizadosFinal.nacionalidad || '',
          estado_civil: basicosNormalizadosFinal.estado_civil || '',
          documento_identidad: basicosNormalizadosFinal.documento_identidad || '',
          tipo_documento: basicosNormalizadosFinal.tipo_documento || 'DNI',
          telefono: basicosNormalizadosFinal.telefono || '',
          direccion: basicosNormalizadosFinal.direccion || '',
          distrito: basicosNormalizadosFinal.distrito || '',
          provincia: basicosNormalizadosFinal.provincia || '',
          departamento: basicosNormalizadosFinal.departamento || '',
          foto_perfil: basicosNormalizadosFinal.foto_perfil || '',
          dni_verificado: false
        });
        setNacionalidadCategoria(
          basicosNormalizadosFinal.nacionalidad && basicosNormalizadosFinal.nacionalidad.toLowerCase() !== 'peruana'
            ? 'otro'
            : 'peruano'
        );
        const telefonoParsed = splitTelefono(basicosNormalizadosFinal.telefono);
        setTelefonoCodigo(telefonoParsed.codigo);
        setTelefonoNumero(telefonoParsed.numero);
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
        // Convertir fecha_ingreso de ISO a formato yyyy-MM-dd
        let fechaIngreso = data.docente.fecha_ingreso || data.basicos?.created_at || '';
        if (fechaIngreso && fechaIngreso.includes('T')) {
          fechaIngreso = fechaIngreso.split('T')[0];
        }
        
        console.log('Datos docente recibidos:', data.docente);
        console.log('nivel_academico:', data.docente.nivel_academico);
        
        setDatosDocente({
          especialidad: data.docente.especialidad || '',
          nivel_academico: (data.docente.nivel_academico || '').toLowerCase(),
          titulo_profesional: data.docente.titulo_profesional || '',
          universidad_egreso: data.docente.universidad_egreso || '',
          numero_colegiatura: data.docente.numero_colegiatura || '',
          carga_horaria_semanal: data.docente.carga_horaria_semanal || 0,
          fecha_ingreso: fechaIngreso,
          areas_investigacion: data.docente.areas_investigacion || '',
          idiomas_domina: data.docente.idiomas_domina || '',
          nivel_ingles: data.docente.nivel_ingles || '',
          disponibilidad_horaria: data.docente.disponibilidad_horaria || '',
          observaciones: data.docente.observaciones || ''
        });
      }

      if ((usuarioRol === 'admin' || usuarioRol === 'administrativo') && data.admin) {
        // Normalizar fechas a yyyy-MM-dd
        let fechaNom = data.admin.fecha_nombramiento || '';
        if (fechaNom && fechaNom.includes('T')) {
          fechaNom = fechaNom.split('T')[0];
        }
        let ultimoCambio = data.admin.ultimo_cambio || '';
        if (ultimoCambio && ultimoCambio.includes('T')) {
          ultimoCambio = ultimoCambio.split('T')[0];
        }

        const nivelAcceso = (data.admin.nivel_acceso || 'bajo').toLowerCase();

        setDatosAdmin({
          cargo: data.admin.cargo || '',
          nivel_acceso: nivelAcceso,
          area_responsabilidad: data.admin.area_responsabilidad || '',
          extension_telefonica: data.admin.extension_telefonica || '',
          horario_atencion: data.admin.horario_atencion || '',
          ubicacion_oficina: data.admin.ubicacion_oficina || '',
          observaciones: data.admin.observaciones || '',
          area_departamento: data.admin.area_departamento || '',
          permisos_especiales: data.admin.permisos_especiales || '',
          fecha_nombramiento: fechaNom,
          ultimo_cambio: ultimoCambio
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
        setUsuarios(prev => ({
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
    setUsuarios({...usuarios, documento_identidad: dni, dni_verificado: false});
    
    // Consultar automáticamente cuando tenga 8 dígitos
    if (dni.length === 8 && /^\d+$/.test(dni)) {
      consultarDNI(dni);
    }
  };

  const guardarDatos = async () => {
    try {
      setGuardando(true);

      // Validaciones básicas
      if (!usuarios.fecha_nacimiento) {
        showError?.('La fecha de nacimiento es requerida');
        return;
      }

      if (!usuarios.documento_identidad) {
        showError?.('El documento de identidad es requerido');
        return;
      }

      // Construir objeto de actualización según rol
      const datosActualizar = {
        datos_personales: usuarios
      };

      if (usuarioRol === 'estudiante') {
        datosActualizar.datos_estudiante = datosEstudiante;
      } else if (usuarioRol === 'docente' || usuarioRol === 'profesor') {
        datosActualizar.datos_docente = datosDocente;
      } else if (usuarioRol === 'admin' || usuarioRol === 'administrativo') {
        datosActualizar.datos_admin = datosAdmin;
      }

      // Mostrar en consola lo que se envía
      console.log('Datos enviados al backend:', datosActualizar);

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

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

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
  const modalStyles = `
    .datos-modal-overlay {
      position: fixed;
      inset: 0;
      padding: 1.5rem;
      background: rgba(7, 11, 25, 0.85);
      backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .datos-modal-card {
      width: min(1200px, 95vw);
      max-height: 95vh;
      display: flex;
      flex-direction: column;
      border-radius: 32px;
      overflow: hidden;
      border: 1px solid rgba(148, 163, 184, 0.35);
      box-shadow: 0 40px 120px rgba(15, 23, 42, 0.45);
      background: #f8f9ff;
    }
    .datos-modal-header {
      background: linear-gradient(120deg, #5b67d6, #4a51c0 55%, #30387a);
      color: #fff;
      padding: 2rem 2.75rem;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1.5rem;
    }
    .modal-eyebrow {
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.35em;
      color: rgba(255, 255, 255, 0.8);
      margin-bottom: 0.5rem;
    }
    .datos-modal-header h2 {
      margin: 0;
      font-size: 2rem;
      font-weight: 700;
    }
    .datos-modal-subtitle {
      margin: 0.5rem 0 1rem;
      color: rgba(255, 255, 255, 0.85);
      max-width: 520px;
      line-height: 1.4;
    }
    .header-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.75);
    }
    .header-meta span {
      padding: 0.35rem 0.9rem;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.25);
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .status-pill {
      padding: 0.4rem 1rem;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.4);
      font-weight: 600;
      text-transform: capitalize;
    }
    .close-btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.4);
      background: transparent;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
      transition: transform 0.2s ease, background 0.2s ease;
    }
    .close-btn:hover {
      background: rgba(255, 255, 255, 0.15);
      transform: translateY(-2px);
    }
    .datos-modal-body {
      padding: 2rem 2.75rem;
      background: radial-gradient(circle at top right, rgba(99, 102, 241, 0.08), transparent 45%), #f8f9ff;
      overflow-y: auto;
      flex: 1;
    }
    .datos-modal-body::-webkit-scrollbar {
      width: 8px;
    }
    .datos-modal-body::-webkit-scrollbar-thumb {
      background: rgba(99, 102, 241, 0.4);
      border-radius: 999px;
    }
    .modern-section {
      background: #fff;
      border-radius: 24px;
      border: 1px solid rgba(148, 163, 184, 0.25);
      padding: 1.75rem;
      box-shadow: 0 25px 60px rgba(15, 23, 42, 0.08);
    }
    .modern-section:not(:last-child) {
      margin-bottom: 1.5rem;
    }
    .modern-section__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
    }
    .modern-section__title {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
    }
    .modern-section__icon {
      width: 52px;
      height: 52px;
      border-radius: 16px;
      background: rgba(99, 102, 241, 0.1);
      color: #4f46e5;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
    }
    .modern-section__header h3 {
      margin: 0;
      font-size: 1.35rem;
    }
    .modern-section__header p {
      margin: 0.35rem 0 0;
      color: #64748b;
      max-width: 520px;
    }
    .modern-section__badge {
      font-size: 0.85rem;
      padding: 0.4rem 1.1rem;
      border-radius: 999px;
      background: rgba(79, 70, 229, 0.08);
      color: #4c1d95;
      border: 1px solid rgba(79, 70, 229, 0.2);
      font-weight: 600;
    }
    .modern-section__body {
      margin-top: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .highlight-card {
      border-radius: 20px;
      padding: 1.25rem;
      border: 1px solid rgba(148, 163, 184, 0.4);
      background: rgba(248, 250, 252, 0.9);
    }
    .highlight-card--info {
      border-color: rgba(37, 99, 235, 0.35);
      background: rgba(37, 99, 235, 0.08);
    }
    .highlight-card__header {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
      margin-bottom: 1rem;
    }
    .highlight-card__icon {
      width: 46px;
      height: 46px;
      border-radius: 14px;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 25px rgba(37, 99, 235, 0.15);
      color: #2563eb;
      font-size: 1.3rem;
    }
    .highlight-card__header h4 {
      margin: 0;
      font-size: 1.05rem;
    }
    .highlight-card__header p {
      margin: 0.35rem 0 0;
      color: #475569;
      font-size: 0.9rem;
    }
    .foto-uploader {
      border: 1px dashed rgba(99, 102, 241, 0.4);
      border-radius: 22px;
      padding: 1.5rem;
      background: rgba(99, 102, 241, 0.03);
    }
    .section-subtitle {
      font-size: 0.85rem;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: #94a3b8;
      margin: 1rem 0 0.25rem;
    }
    .form-footer {
      background: #fff;
      padding: 1.75rem 2.75rem;
      border-top: 1px solid rgba(148, 163, 184, 0.25);
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
    }
    .btn-secondary,
    .btn-primary {
      border-radius: 14px;
      padding: 0.85rem 1.75rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      border: none;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .btn-secondary {
      background: #fff;
      border: 1px solid rgba(148, 163, 184, 0.5);
      color: #475569;
    }
    .btn-secondary:hover {
      transform: translateY(-1px);
      box-shadow: 0 12px 20px rgba(15, 23, 42, 0.1);
    }
    .btn-primary {
      background: linear-gradient(120deg, #6366f1, #8b5cf6);
      color: #fff;
      box-shadow: 0 15px 30px rgba(99, 102, 241, 0.35);
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 20px 35px rgba(99, 102, 241, 0.4);
    }
    @media (max-width: 768px) {
      .datos-modal-overlay {
        padding: 0.75rem;
      }
      .datos-modal-card {
        max-height: 100vh;
        border-radius: 20px;
      }
      .datos-modal-header {
        flex-direction: column;
        padding: 1.5rem;
      }
      .datos-modal-body {
        padding: 1.5rem;
      }
      .form-footer {
        padding: 1.25rem 1.5rem;
        flex-direction: column;
        gap: 0.75rem;
      }
      .form-footer button {
        width: 100%;
        justify-content: center;
      }
    }
  `;

  const modalTree = (
    <div className="datos-modal-overlay">
      <style>{modalStyles}</style>
      <div className="datos-modal-card">
        <header className="datos-modal-header">
          <div>
            <p className="modal-eyebrow">Ficha dinámica</p>
            <h2>Completar Datos de Usuario</h2>
            <p className="datos-modal-subtitle">
              Mantén la información centralizada y actualizada para {buildNombreCompleto(datosUsuario?.basicos)} ({usuarioRol}).
            </p>
            <div className="header-meta">
              <span>ID #{usuarioId}</span>
              {datosUsuario?.email && <span>{datosUsuario.email}</span>}
            </div>
          </div>
          <div className="header-actions">
            <span className="status-pill">{usuarioRol}</span>
            <button
              onClick={onClose}
              className="close-btn"
              disabled={guardando}
              aria-label="Cerrar formulario"
            >
              <FaTimes />
            </button>
          </div>
        </header>

        <div className="datos-modal-body">
          <SectionPanel
            icon={FaUser}
            title="Identidad y Perfil"
            subtitle="Valida el documento, los datos clave y la ubicación oficial del usuario."
            badge="01"
          >
            <HighlightCard
              icon={FaIdCard}
              title="Documento de identidad"
              description="Verificamos automáticamente la información cuando se trata de DNI RENIEC."
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Documento
                  </label>
                  <select
                    value={usuarios.tipo_documento}
                    onChange={(e) => setUsuarios({ ...usuarios, tipo_documento: e.target.value })}
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
                      <span className="ml-2 text-blue-600 text-xs">
                        <FaSpinner className="inline animate-spin" /> Verificando...
                      </span>
                    )}
                    {usuarios.dni_verificado && (
                      <span className="ml-2 text-green-600 text-xs">
                        <FaCheckCircle className="inline" /> Verificado
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={usuarios.documento_identidad}
                    onChange={handleDNIChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: 12345678"
                    maxLength="8"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {usuarios.tipo_documento === 'DNI' && 'Se verificará automáticamente con RENIEC.'}
                  </p>
                </div>
              </div>
            </HighlightCard>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombres *</label>
                <input
                  type="text"
                  value={usuarios.nombres}
                  onChange={(e) => setUsuarios({ ...usuarios, nombres: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Juan Carlos"
                  required
                  readOnly={consultandoDNI}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Apellido Paterno *</label>
                <input
                  type="text"
                  value={usuarios.apellido_paterno}
                  onChange={(e) => setUsuarios({ ...usuarios, apellido_paterno: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: García"
                  required
                  readOnly={consultandoDNI}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Apellido Materno *</label>
                <input
                  type="text"
                  value={usuarios.apellido_materno}
                  onChange={(e) => setUsuarios({ ...usuarios, apellido_materno: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Pérez"
                  required
                  readOnly={consultandoDNI}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaCalendarAlt className="inline mr-2" /> Fecha de Nacimiento *
                </label>
                <input
                  type="date"
                  value={usuarios.fecha_nacimiento}
                  onChange={(e) => setUsuarios({ ...usuarios, fecha_nacimiento: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaVenusMars className="inline mr-2" /> Género
                </label>
                <select
                  value={usuarios.genero}
                  onChange={(e) => setUsuarios({ ...usuarios, genero: e.target.value })}
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
                  <FaGlobeAmericas className="inline mr-2" /> Nacionalidad
                </label>
                <div className="flex flex-wrap gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setNacionalidadCategoria('peruano');
                      setUsuarios((prev) => ({ ...prev, nacionalidad: 'Peruana' }));
                    }}
                    className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
                      nacionalidadCategoria === 'peruano'
                        ? 'border-green-500 bg-green-50 text-green-700 shadow-sm'
                        : 'border-gray-300 hover:border-green-300 hover:bg-green-50/60'
                    }`}
                  >
                    Peruano(a)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNacionalidadCategoria('otro');
                      setUsuarios((prev) => ({
                        ...prev,
                        nacionalidad:
                          prev.nacionalidad && prev.nacionalidad.toLowerCase() !== 'peruana'
                            ? prev.nacionalidad
                            : '',
                      }));
                    }}
                    className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
                      nacionalidadCategoria === 'otro'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-gray-300 hover:border-indigo-300 hover:bg-indigo-50/60'
                    }`}
                  >
                    Otro país
                  </button>
                </div>
                {nacionalidadCategoria === 'otro' ? (
                  <input
                    type="text"
                    value={usuarios.nacionalidad}
                    onChange={(e) => setUsuarios({ ...usuarios, nacionalidad: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                    placeholder="Ej: Colombiana, Chilena, etc."
                  />
                ) : (
                  <div className="px-4 py-3 border border-green-100 bg-green-50 rounded-xl text-sm text-green-700 flex items-center gap-2">
                    <FaCheckCircle /> Se registrará automáticamente como nacionalidad peruana.
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaRing className="inline mr-2" /> Estado Civil
                </label>
                <select
                  value={usuarios.estado_civil}
                  onChange={(e) => setUsuarios({ ...usuarios, estado_civil: e.target.value })}
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaMapMarkerAlt className="inline mr-2" /> Dirección Completa
                </label>
                <input
                  type="text"
                  value={usuarios.direccion}
                  onChange={(e) => setUsuarios({ ...usuarios, direccion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Av. Principal 123, Urb. Los Jardines"
                />
              </div>
              <div className="md:col-span-3">
                <UbicacionPeruSlider
                  value={{
                    departamento: usuarios.departamento,
                    provincia: usuarios.provincia,
                    distrito: usuarios.distrito,
                  }}
                  onChange={(payload) => setUsuarios((prev) => ({ ...prev, ...payload }))}
                />
              </div>
              <div className="md:col-span-3">
                <div className="foto-uploader">
                  <div className="flex items-center gap-3 mb-4">
                    <FaCamera className="text-indigo-500 text-xl" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800 mb-0">Foto de Perfil</p>
                      <p className="text-xs text-slate-500 mb-0">Formato JPG, PNG, GIF o WebP (máx. 5MB).</p>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4 items-start">
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
                          <p className="text-xs text-gray-500">JPEG, PNG, GIF o WebP (máx. 5MB)</p>
                        </label>
                      </div>
                      {tieneFotoPerfil && (
                        <div className="mt-2 flex items-center text-green-600 text-sm">
                          <FaCheckCircle className="mr-1" /> Foto de perfil configurada
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SectionPanel>

          <SectionPanel
            icon={FaPhone}
            title="Contacto y Accesos"
            subtitle="Configura el prefijo internacional y verifica el correo que utilizará para ingresar."
            badge="02"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaPhone className="inline mr-2" /> Teléfono *
                </label>
                <div className="space-y-4">
                  <PhoneCodeSlider selectedCode={telefonoCodigo} onSelect={setTelefonoCodigo} />
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>¿No ves tu país? Ingresa un prefijo personalizado:</span>
                    <input
                      type="text"
                      value={telefonoCodigo}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/[^0-9]/g, '');
                        setTelefonoCodigo(digitsOnly ? `+${digitsOnly}` : '+');
                      }}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-200"
                      placeholder="+00"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <div className="px-4 py-3 rounded-2xl border border-indigo-200 bg-indigo-50 text-indigo-700 font-semibold text-lg">
                        {telefonoCodigo}
                      </div>
                      <input
                        type="tel"
                        value={telefonoNumero}
                        onChange={(e) => {
                          const sanitized = e.target.value.replace(/[^0-9\s-]/g, '');
                          setTelefonoNumero(sanitized);
                        }}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 text-lg"
                        placeholder="Ingresa el número sin código"
                        required
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      Se guardará como {buildTelefonoValor(telefonoCodigo, telefonoNumero) || telefonoCodigo}.
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaEnvelope className="inline mr-2" /> Email
                </label>
                <input
                  type="email"
                  value={datosUsuario?.email || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
              </div>
            </div>
          </SectionPanel>

          {usuarioRol === 'estudiante' && (
            <SectionPanel
              icon={FaGraduationCap}
              title="Ficha Académica"
              subtitle="Registra los detalles académicos, becas y la información del tutor o apoderado."
              badge="03"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Matrícula *
                  </label>
                  <input
                    type="text"
                    value={datosEstudiante.matricula}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                    placeholder="Ej: 2024-001"
                    title="La matrícula no se puede modificar desde este formulario"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grado/Nivel
                  </label>
                  <input
                    type="text"
                    value={datosEstudiante.grado}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                    placeholder="Ej: Intermedio 2"
                    title="El grado/nivel no se puede modificar desde este formulario"
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
                        value={datosEstudiante.porcentaje_beca === '' ? '' : datosEstudiante.porcentaje_beca}
                        onChange={(e) => {
                          const { value } = e.target;
                          setDatosEstudiante((prev) => ({
                            ...prev,
                            porcentaje_beca: value === '' ? '' : Number(value),
                          }));
                        }}
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
            </SectionPanel>
          )}

          {(usuarioRol === 'docente' || usuarioRol === 'profesor') && (
            <SectionPanel
              icon={FaBriefcase}
              title="Datos Profesionales"
              subtitle="Registra especialidades, títulos, idiomas y disponibilidad docente."
              badge="03"
            >
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
                    value={datosDocente.carga_horaria_semanal === '' ? '' : datosDocente.carga_horaria_semanal}
                    onChange={(e) => {
                      const { value } = e.target;
                      setDatosDocente((prev) => ({
                        ...prev,
                        carga_horaria_semanal: value === '' ? '' : Number(value),
                      }));
                    }}
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
            </SectionPanel>
          )}

          {(usuarioRol === 'admin' || usuarioRol === 'administrativo') && (
            <SectionPanel
              icon={FaUserShield}
              title="Datos Administrativos"
              subtitle="Define el cargo, nivel de acceso y logística interna del equipo administrativo."
              badge="03"
            >
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Departamento</label>
                  <input
                    type="text"
                    value={datosAdmin.area_departamento}
                    onChange={e => setDatosAdmin({...datosAdmin, area_departamento: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Ej: Dirección General / Área interna"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Permisos Especiales</label>
                  <input
                    type="text"
                    value={datosAdmin.permisos_especiales}
                    onChange={e => setDatosAdmin({...datosAdmin, permisos_especiales: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Ej: Permiso X"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Nombramiento</label>
                  <input
                    type="date"
                    value={datosAdmin.fecha_nombramiento}
                    onChange={e => setDatosAdmin({...datosAdmin, fecha_nombramiento: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Último Cambio</label>
                  <input
                    type="date"
                    value={datosAdmin.ultimo_cambio}
                    onChange={e => setDatosAdmin({...datosAdmin, ultimo_cambio: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
            </SectionPanel>
          )}
        </div>

        <footer className="form-footer">
          <button
            onClick={onClose}
            disabled={guardando}
            className="btn-secondary"
          >
            <FaTimes /> Cancelar
          </button>
          <button
            onClick={guardarDatos}
            disabled={guardando}
            className="btn-primary"
          >
            {guardando ? (
              <>
                <FaSpinner className="animate-spin" /> Guardando...
              </>
            ) : (
              <>
                <FaSave /> Guardar Datos
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return modalTree;
  }

  return createPortal(modalTree, document.body);
};

export default CompletarDatosUsuario;
