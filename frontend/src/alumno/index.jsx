import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  FaUser, FaClipboardCheck, FaGraduationCap, FaSignOutAlt,
  FaBookOpen, FaCog, FaMoon, FaSun, FaChevronLeft, FaChevronRight,
  FaBars, FaAdjust, FaFilter, FaSearch, FaArrowRight,
  FaRegBell, FaTimes, FaCheck, FaCalendarAlt, FaChartLine,
  FaTrophy, FaSync, FaHome, FaClock, FaInfoCircle, FaUsers, FaStar
} from 'react-icons/fa';
import UserAvatar from '../components/UserAvatar';
import ConfiguracionEstudiante from './ConfiguracionEstudiante';
import { Chat } from '../chat';
import EstudianteDashboardLayout from './EstudianteDashboardLayout';

const ASISTENCIA_ESTADO_CONFIG = {
  presente: { label: 'Presentes', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', icon: FaCheck },
  ausente: { label: 'Ausentes', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', icon: FaTimes },
  justificado: { label: 'Justificados', color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)', icon: FaClipboardCheck },
  tardanza: { label: 'Tardanzas', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', icon: FaClock },
  default: { label: 'Sin clasificar', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.12)', icon: FaInfoCircle },
};

const StudentDashboard = ({
  userInfo,
  activeModule,
  setActiveModule,
  onLogout,
  loading,
  error,
  success,
  setError,
  setSuccess,
  misAsistencias = [],
  misCalificaciones = [],
  misCursos = [],
  fetchMisCursos = () => {},
  fetchMisAsistencias = () => {},
  token,
  showError,
  showSuccess
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [claseSeleccionada, setClaseSeleccionada] = useState(null);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [refreshingCursos, setRefreshingCursos] = useState(false);
  const [refreshingAsistencias, setRefreshingAsistencias] = useState(false);
  const [asistenciaEstadoFiltro, setAsistenciaEstadoFiltro] = useState('todos');
  const [rangoAsistencia, setRangoAsistencia] = useState('30');
  const { isDark: darkMode, toggleTheme, highContrast, toggleHighContrast } = useTheme();

  const cursosInscritos = Array.isArray(misCursos) ? misCursos : [];
  const totalCursosInscritos = cursosInscritos.length;

  const parseFecha = (valor) => {
    if (!valor) return null;
    const parsed = new Date(valor);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatFechaLarga = (valor) => {
    const parsed = parseFecha(valor);
    if (!parsed) return 'Fecha sin registro';
    return parsed.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatFechaCorta = (valor) => {
    const parsed = parseFecha(valor);
    if (!parsed) return 'N/D';
    return parsed.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatFechaHora = (valor) => {
    const parsed = parseFecha(valor);
    if (!parsed) return null;
    return parsed.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const asistenciasOrdenadas = useMemo(() => {
    const origen = Array.isArray(misAsistencias) ? misAsistencias : [];
    return [...origen].sort((a, b) => {
      const dateA = parseFecha(a?.fecha) || 0;
      const dateB = parseFecha(b?.fecha) || 0;
      return dateB - dateA;
    });
  }, [misAsistencias]);

  const resumenEstados = useMemo(() => {
    const base = Object.keys(ASISTENCIA_ESTADO_CONFIG).reduce((acc, key) => {
      if (key !== 'default') acc[key] = 0;
      return acc;
    }, {});

    return asistenciasOrdenadas.reduce((acc, asistencia) => {
      const key = String(asistencia?.estado || '').toLowerCase();
      if (acc[key] === undefined) {
        acc[key] = 0;
      }
      acc[key] += 1;
      return acc;
    }, base);
  }, [asistenciasOrdenadas]);

  const asistenciaPorcentaje = useMemo(() => {
    if (!asistenciasOrdenadas.length) return 0;
    const presentes = asistenciasOrdenadas.filter(
      (registro) => String(registro.estado).toLowerCase() === 'presente'
    ).length;
    return Math.round((presentes / asistenciasOrdenadas.length) * 100);
  }, [asistenciasOrdenadas]);

  const filteredAsistencias = useMemo(() => {
    const limiteDias = rangoAsistencia === 'all' ? null : Number(rangoAsistencia);
    const filtroEstado = asistenciaEstadoFiltro === 'todos' ? null : asistenciaEstadoFiltro;

    return asistenciasOrdenadas.filter((registro) => {
      const registroEstado = String(registro.estado || '').toLowerCase();
      if (filtroEstado && registroEstado !== filtroEstado) {
        return false;
      }

      if (limiteDias) {
        const fechaRegistro = parseFecha(registro.fecha);
        if (!fechaRegistro) return false;
        const limite = new Date();
        limite.setDate(limite.getDate() - limiteDias);
        if (fechaRegistro < limite) {
          return false;
        }
      }

      return true;
    });
  }, [asistenciasOrdenadas, asistenciaEstadoFiltro, rangoAsistencia]);

  const ultimasAsistencias = useMemo(() => filteredAsistencias.slice(0, 25), [filteredAsistencias]);

  const coalesce = (...values) => {
    for (const value of values) {
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
    return null;
  };

  const firstCourse = Array.isArray(userInfo?.datosCompletos?.cursos) && userInfo.datosCompletos.cursos.length > 0
    ? userInfo.datosCompletos.cursos.find(Boolean)
    : null;

  const studentLevel = coalesce(
    userInfo?.nivel_estudiante,
    userInfo?.nivel,
    userInfo?.level,
    userInfo?.datosCompletos?.level,
    userInfo?.datosCompletos?.nivel,
    userInfo?.datosCompletos?.estudiante?.level,
    userInfo?.datosCompletos?.estudiante?.nivel,
    userInfo?.datosCompletos?.estudiante?.nivel_estudiante,
    userInfo?.datosCompletos?.basicos?.level,
    userInfo?.datosCompletos?.basicos?.nivel,
    userInfo?.datosCompletos?.basicos?.nivel_estudiante,
    firstCourse?.level,
    firstCourse?.nivel,
    firstCourse?.nivel_academico,
    firstCourse?.level_name
  );

  const rawGrade = coalesce(
    userInfo?.grado_estudiante,
    userInfo?.grado,
    userInfo?.grade_number,
    userInfo?.datosCompletos?.grade_number,
    userInfo?.datosCompletos?.grado,
    userInfo?.datosCompletos?.estudiante?.grade_number,
    userInfo?.datosCompletos?.estudiante?.grado,
    userInfo?.datosCompletos?.estudiante?.grado_estudiante,
    userInfo?.datosCompletos?.basicos?.grade_number,
    userInfo?.datosCompletos?.basicos?.grado,
    userInfo?.datosCompletos?.basicos?.grado_estudiante,
    firstCourse?.grade_number,
    firstCourse?.grado,
    firstCourse?.grade,
    firstCourse?.gradeNumber
  );

  const studentGrade = rawGrade !== undefined && rawGrade !== null && rawGrade !== '' ? rawGrade : null;
  const studentGradeDisplay = studentGrade != null ? String(studentGrade) : null;

  const studentSection = coalesce(
    userInfo?.section,
    userInfo?.seccion,
    userInfo?.datosCompletos?.section,
    userInfo?.datosCompletos?.seccion,
    userInfo?.datosCompletos?.estudiante?.section,
    userInfo?.datosCompletos?.estudiante?.seccion,
    userInfo?.datosCompletos?.estudiante?.grupo,
    userInfo?.datosCompletos?.basicos?.section,
    userInfo?.datosCompletos?.basicos?.seccion,
    userInfo?.datosCompletos?.basicos?.grupo,
    firstCourse?.section,
    firstCourse?.seccion,
    firstCourse?.grupo
  );

  // Menu items para estudiante
  const menuItems = [
    {
      category: 'Mi Aprendizaje',
      items: [
        { id: 'dashboard', label: 'Panel Principal', icon: FaHome, module: null, helper: 'Vista general', description: 'Resumen de tu progreso académico' },
        { id: 'mis-clases', label: 'Mis Clases', icon: FaBookOpen, module: 'mis-clases', helper: 'Cursos activos', description: 'Gestiona tus cursos asignados' },
      ]
    },
    {
      category: 'Mi Rendimiento',
      items: [
        { id: 'mis-asistencias', label: 'Mis Asistencias', icon: FaClipboardCheck, module: 'mis-asistencias', helper: 'Historial completo', description: 'Revisa tu registro de asistencias' },
        { id: 'mis-calificaciones', label: 'Mis Calificaciones', icon: FaTrophy, module: 'mis-calificaciones', helper: 'Notas y promedios', description: 'Consulta tus calificaciones' },
      ]
    },
    {
      category: 'Otros',
      items: [
        { id: 'chat', label: 'Mensajería', icon: FaRegBell, module: 'chat', helper: 'Comunicación', description: 'Mensajes con profesores' },
        { id: 'configuracion', label: 'Configuración', icon: FaCog, module: 'configuracion', helper: 'Preferencias', description: 'Ajusta tu perfil y cuenta' },
      ]
    }
  ];

  // Función para calcular promedio (declarada antes de usarla en studentStats)
  const calcularPromedioValue = useMemo(() => {
    if (misCalificaciones.length === 0) return "N/A";
    const suma = misCalificaciones.reduce((acc, cal) => acc + cal.nota, 0);
    return (suma / misCalificaciones.length).toFixed(1);
  }, [misCalificaciones]);

  // Estadísticas del estudiante
  const studentStats = [
    {
      label: 'Cursos Activos',
      value: totalCursosInscritos,
      helper: 'Asignados actualmente',
      icon: FaBookOpen,
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    },
    {
      label: 'Asistencia General',
      value: `${asistenciaPorcentaje}%`,
      helper: 'Promedio registrado',
      icon: FaClipboardCheck,
      color: '#06b6d4',
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    },
    {
      label: 'Promedio General',
      value: calcularPromedioValue,
      helper: 'Del semestre actual',
      icon: FaTrophy,
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    },
    {
      label: 'Nivel Académico',
      value: studentLevel || 'N/A',
      helper: 'Asignado por la escuela',
      icon: FaGraduationCap,
      color: '#8b5cf6',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    },
  ];

  // Quick actions para estudiante
  const categories = menuItems;
  const flattenedMenu = categories.flatMap((category) =>
    (category.items || []).map((item) => ({
      ...item,
      category: category.category,
    })),
  );
  const quickActionItems = flattenedMenu.slice(0, 4);

  // Module cards para el dashboard
  const moduleCards = categories.map((category) => ({
    title: category.category,
    items: (category.items || []).map((item) => ({
      ...item,
      description: item.description || 'Explora opciones del módulo',
    })),
  }));

  // Greeting basado en la hora
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const hour = currentTime.getHours();
    if (hour < 12) setGreeting('Buenos días');
    else if (hour < 18) setGreeting('Buenas tardes');
    else setGreeting('Buenas noches');
  }, [currentTime]);

  const handleModuleChange = useCallback((module) => {
    try {
      setActiveModule(module);
    } catch (err) {
      console.error('Error al cambiar módulo:', err);
      showError && showError('Error al cambiar de módulo');
    }
  }, [setActiveModule, showError]);

  useEffect(() => {
    if (fetchMisCursos) {
      fetchMisCursos(true);
    }
  }, [fetchMisCursos]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleRefreshCursos = async () => {
    if (!fetchMisCursos) {
      return;
    }
    setRefreshingCursos(true);
    try {
      await fetchMisCursos(true);
    } finally {
      setRefreshingCursos(false);
    }
  };

  const handleRefreshAsistencias = async () => {
    if (!fetchMisAsistencias) {
      return;
    }
    setRefreshingAsistencias(true);
    try {
      const filters = {};
      if (asistenciaEstadoFiltro !== 'todos') {
        filters.estado = asistenciaEstadoFiltro;
      }
      if (rangoAsistencia !== 'all') {
        const dias = Number(rangoAsistencia);
        if (Number.isFinite(dias) && dias > 0) {
          const desde = new Date();
          desde.setDate(desde.getDate() - dias);
          filters.desde = desde.toISOString().slice(0, 10);
        }
      }
      filters.limit = 400;
      await fetchMisAsistencias(true, filters);
      showSuccess && showSuccess('Asistencias sincronizadas con el backend');
    } catch (err) {
      console.error('Error al refrescar asistencias:', err);
      showError && showError('No se pudo actualizar tu historial de asistencias');
    } finally {
      setRefreshingAsistencias(false);
    }
  };

  const calcularPromedio = () => calcularPromedioValue;

  const calcularAsistencia = () => `${asistenciaPorcentaje}%`;

  const resolverCursoId = (curso = {}) => curso.asignacionId ?? curso.id ?? curso.cursoId ?? curso.materiaId ?? curso.codigo;
  const resolverNombreCurso = (curso = {}) => curso.curso_nombre ?? curso.nombreCurso ?? curso.nombre ?? curso.curso ?? curso.titulo ?? 'Curso sin título';
  const resolverDocenteCurso = (curso = {}) => curso.profesor_nombre ?? curso.docenteNombre ?? curso.profesor ?? curso.docente ?? curso.maestro ?? curso.teacher ?? 'Docente no asignado';

  const obtenerNombreDia = (diaNum) => {
    const dias = {
      1: 'Lunes',
      2: 'Martes',
      3: 'Miércoles',
      4: 'Jueves',
      5: 'Viernes',
      6: 'Sábado',
      7: 'Domingo'
    };
    return dias[diaNum] || 'No definido';
  };

  const formatearHora = (hora) => {
    if (!hora) return '';
    // Si ya viene en formato HH:MM o HH:MM:SS
    if (typeof hora === 'string') {
      // Extraer solo HH:MM
      const match = hora.match(/^(\d{1,2}):(\d{2})/);
      if (match) {
        const h = match[1].padStart(2, '0');
        const m = match[2];
        return `${h}:${m}`;
      }
    }
    return String(hora);
  };

  const resolverHorario = (curso = {}) => {
    const diaSemana = curso.dia_semana ?? curso.diaSemana;
    const horaInicio = curso.hora_inicio ?? curso.horaInicio;
    const horaFin = curso.hora_fin ?? curso.horaFin;

    if (!diaSemana || !horaInicio || !horaFin) {
      return 'Por definir';
    }

    // Si diaSemana ya es un nombre (string), usarlo directamente
    const dia = typeof diaSemana === 'string' && isNaN(diaSemana) 
      ? diaSemana 
      : obtenerNombreDia(Number(diaSemana));
    
    const inicio = formatearHora(horaInicio);
    const fin = formatearHora(horaFin);

    return `${dia} ${inicio} - ${fin}`;
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'No definida';
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  const resolverFechas = (curso = {}) => {
    const fechaInicio = curso.fecha_inicio ?? curso.fechaInicio;
    const fechaFin = curso.fecha_fin ?? curso.fechaFin;
    
    const inicio = formatearFecha(fechaInicio);
    const fin = formatearFecha(fechaFin);
    
    return { inicio, fin };
  };

  const handleVerDetalle = (curso) => {
    setClaseSeleccionada(curso);
    setShowDetalleModal(true);
  };

  const handleCerrarDetalle = () => {
    setShowDetalleModal(false);
    setTimeout(() => setClaseSeleccionada(null), 300);
  };

  const getModuleTitle = (module) => {
    const titles = {
      'mis-clases': 'Mis Clases',
      'mis-asistencias': 'Mis Asistencias',
      'mis-calificaciones': 'Mis Calificaciones',
      'chat': 'Mensajería Interna',
      'configuracion': 'Configuración'
    };
    return titles[module] || 'Dashboard del Estudiante';
  };

  return (
    <>
      <style>{`
        /* ========== ESTILOS ADICIONALES PARA CONTENIDO ========== */
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeInUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes gradientFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* ========== LOADING ========== */
        .loading-overlay-estudiante {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.3s ease;
        }

        .spinner-estudiante {
          width: 48px;
          height: 48px;
          border: 4px solid rgba(16, 185, 129, 0.2);
          border-top: 4px solid #10b981;
          border-radius: 50%;
          animation: spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        /* ========== NOTIFICACIONES ========== */
        .notification-estudiante {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 1050;
          min-width: 350px;
          border-radius: 16px;
          backdrop-filter: blur(12px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
          animation: slideInRight 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* ========== MIS CLASES CONTAINER ========== */
        .mis-clases-container {
          animation: fadeInUp 0.5s ease-out;
        }

        .mis-clases-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.1));
          border-radius: 20px;
          border: 1px solid rgba(16, 185, 129, 0.25);
        }

        .header-info h3 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 0.5rem 0;
          color: #f0fdf4;
        }

        .header-info p {
          margin: 0;
          color: #86efac;
          font-size: 0.95rem;
        }

        .btn-refresh-clases {
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .btn-refresh-clases:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
        }

        .btn-refresh-clases:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .clases-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 1.5rem;
        }

        /* ========== CLASE CARD ========== */
        .clase-card {
          background: linear-gradient(145deg, rgba(6, 78, 59, 0.5), rgba(6, 78, 59, 0.3));
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 24px;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          animation: fadeInUp 0.5s ease-out backwards;
        }

        .clase-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #10b981, #06b6d4);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .clase-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 20px 40px rgba(16, 185, 129, 0.2);
          border-color: rgba(16, 185, 129, 0.4);
        }

        .clase-card:hover::before {
          opacity: 1;
        }

        .clase-card-header {
          padding: 24px 24px 16px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .clase-icon-wrapper {
          width: 60px;
          height: 60px;
          border-radius: 18px;
          background: linear-gradient(135deg, #10b981, #059669);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.5rem;
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
        }

        .clase-status-badge {
          padding: 6px 14px;
          border-radius: 20px;
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
          font-size: 0.8rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          animation: pulse 2s ease-in-out infinite;
        }

        .clase-card-body {
          padding: 0 24px 24px;
        }

        .clase-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: #f0fdf4;
          margin-bottom: 20px;
          line-height: 1.4;
        }

        .clase-info-item {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          padding: 12px;
          border-radius: 12px;
          background: rgba(16, 185, 129, 0.08);
          transition: all 0.2s ease;
        }

        .clase-info-item:hover {
          background: rgba(16, 185, 129, 0.15);
          transform: translateX(4px);
        }

        .info-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(16, 185, 129, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #10b981;
          flex-shrink: 0;
        }

        .info-content {
          flex: 1;
        }

        .info-label {
          font-size: 0.75rem;
          color: #86efac;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .info-value {
          font-size: 0.9rem;
          color: #f0fdf4;
          font-weight: 500;
        }

        .clase-progress-section {
          margin-top: 20px;
          padding: 16px;
          background: rgba(16, 185, 129, 0.1);
          border-radius: 14px;
          border: 1px solid rgba(16, 185, 129, 0.15);
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .progress-text {
          font-size: 0.85rem;
          color: #86efac;
        }

        .progress-percent {
          font-size: 1rem;
          color: #10b981;
          font-weight: 700;
        }

        .progress-bar-clase {
          height: 8px;
          background: rgba(16, 185, 129, 0.2);
          border-radius: 999px;
          overflow: hidden;
        }

        .progress-fill-clase {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #06b6d4);
          border-radius: 999px;
          position: relative;
          overflow: hidden;
        }

        .progress-fill-clase::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shimmer 2s infinite;
        }

        .clase-card-footer {
          padding: 16px 24px;
          background: rgba(16, 185, 129, 0.05);
          border-top: 1px solid rgba(16, 185, 129, 0.15);
        }

        .btn-ver-detalle {
          width: 100%;
          padding: 14px 20px;
          border-radius: 14px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          font-weight: 600;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
        }

        .btn-ver-detalle:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.35);
        }

        /* ========== EMPTY STATE ========== */
        .empty-state {
          padding: 60px 20px;
          text-align: center;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(6, 182, 212, 0.05));
          border-radius: 24px;
          border: 2px dashed rgba(16, 185, 129, 0.3);
        }

        .empty-icon-wrapper {
          width: 100px;
          height: 100px;
          margin: 0 auto 24px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.15));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #10b981;
          font-size: 2.5rem;
          position: relative;
        }

        .empty-icon-wrapper::before {
          content: '';
          position: absolute;
          inset: -10px;
          border-radius: 50%;
          border: 2px dashed rgba(16, 185, 129, 0.3);
          animation: rotate 20s linear infinite;
        }

        .empty-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #f0fdf4;
          margin-bottom: 12px;
        }

        .empty-description {
          color: #86efac;
          margin-bottom: 0;
          font-size: 1rem;
        }

        /* ========== ASISTENCIAS PANEL ========== */
        .asistencias-container {
          animation: fadeInUp 0.5s ease-out;
        }

        .asistencias-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.1));
          border-radius: 20px;
          border: 1px solid rgba(16, 185, 129, 0.25);
        }

        .btn-sync-asistencia {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #10b981, #059669);
          color: #fff;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.25);
        }

        .btn-sync-asistencia:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          box-shadow: none;
        }

        .asistencias-filters {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          padding: 20px;
          background: rgba(16, 185, 129, 0.08);
          border-radius: 16px;
          border: 1px solid rgba(16, 185, 129, 0.15);
          margin-bottom: 24px;
        }

        .filter-field label {
          font-weight: 600;
          color: #86efac;
          font-size: 0.85rem;
          display: block;
          margin-bottom: 8px;
        }

        .filter-select {
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(16, 185, 129, 0.25);
          outline: none;
          padding: 12px;
          background: rgba(6, 78, 59, 0.5);
          color: #f0fdf4;
          font-weight: 500;
        }

        .filter-select:focus {
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
        }

        .asistencias-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .summary-card {
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.15);
          border-radius: 16px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .summary-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .summary-info h4 {
          margin: 0;
          font-weight: 700;
          font-size: 1.25rem;
        }

        .summary-info p {
          margin: 0;
          font-size: 0.8rem;
          color: #86efac;
        }

        .asistencias-table {
          background: rgba(6, 78, 59, 0.3);
          border: 1px solid rgba(16, 185, 129, 0.15);
          border-radius: 20px;
          overflow: hidden;
        }

        .asistencia-row {
          display: grid;
          grid-template-columns: 150px 1.2fr auto 1fr;
          gap: 16px;
          padding: 20px;
          border-bottom: 1px solid rgba(16, 185, 129, 0.1);
          align-items: center;
          transition: background 0.2s ease;
        }

        .asistencia-row:hover {
          background: rgba(16, 185, 129, 0.05);
        }

        .asistencia-row:last-child {
          border-bottom: none;
        }

        .date-large {
          font-weight: 700;
          font-size: 1rem;
          color: #f0fdf4;
        }

        .date-sub {
          font-size: 0.8rem;
          color: #86efac;
        }

        .course-name {
          margin: 0;
          font-weight: 600;
          color: #f0fdf4;
        }

        .course-meta {
          margin: 4px 0 0;
          font-size: 0.8rem;
          color: #86efac;
        }

        .estado-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 999px;
          font-weight: 600;
          font-size: 0.85rem;
        }

        .asistencia-observaciones {
          font-size: 0.9rem;
          color: #86efac;
        }

        @media (max-width: 992px) {
          .asistencia-row {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .mis-clases-header,
          .asistencias-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }

          .btn-refresh-clases,
          .btn-sync-asistencia {
            width: 100%;
            justify-content: center;
          }

          .clases-grid {
            grid-template-columns: 1fr;
          }
        }

        /* ========== MODAL DETALLE ========== */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: fadeIn 0.3s ease;
        }

        .modal-content {
          background: linear-gradient(145deg, #064e3b, #022c22);
          border-radius: 28px;
          width: 100%;
          max-width: 900px;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4);
          animation: scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .modal-header {
          padding: 30px;
          border-bottom: 1px solid rgba(16, 185, 129, 0.15);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(16, 185, 129, 0.05);
        }

        .modal-icon-wrapper {
          width: 60px;
          height: 60px;
          border-radius: 18px;
          background: linear-gradient(135deg, #10b981, #059669);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
        }

        .modal-close-btn {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #86efac;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .modal-close-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.4);
          color: #f87171;
          transform: rotate(90deg);
        }

        .modal-body {
          padding: 30px;
          overflow-y: auto;
          flex: 1;
        }

        .modal-body::-webkit-scrollbar {
          width: 8px;
        }

        .modal-body::-webkit-scrollbar-track {
          background: rgba(16, 185, 129, 0.1);
          border-radius: 10px;
        }

        .modal-body::-webkit-scrollbar-thumb {
          background: #10b981;
          border-radius: 10px;
        }

        .detail-card {
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.15);
          border-radius: 20px;
          padding: 24px;
          height: 100%;
          transition: all 0.3s ease;
        }

        .detail-card:hover {
          border-color: rgba(16, 185, 129, 0.3);
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.1);
        }

        .detail-card-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #f0fdf4;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(16, 185, 129, 0.15);
        }

        .detail-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: rgba(16, 185, 129, 0.05);
          border-radius: 12px;
          transition: all 0.2s ease;
        }

        .detail-item:hover {
          background: rgba(16, 185, 129, 0.1);
          transform: translateX(4px);
        }

        .detail-label {
          font-size: 0.9rem;
          color: #86efac;
        }

        .detail-value {
          font-size: 0.95rem;
          color: #f0fdf4;
          font-weight: 600;
        }

        .stats-grid-modal {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .stat-item-modal {
          text-align: center;
          padding: 20px;
          background: rgba(16, 185, 129, 0.05);
          border-radius: 16px;
          transition: all 0.3s ease;
        }

        .stat-item-modal:hover {
          background: rgba(16, 185, 129, 0.1);
          transform: translateY(-4px);
        }

        .stat-icon-modal {
          font-size: 2rem;
          color: #10b981;
          margin-bottom: 12px;
        }

        .stat-label-modal {
          display: block;
          font-size: 0.85rem;
          color: #86efac;
          margin-bottom: 8px;
        }

        .stat-value-modal {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          color: #f0fdf4;
        }

        .progress-section-modal {
          padding: 16px;
          background: rgba(16, 185, 129, 0.05);
          border-radius: 16px;
        }

        .progress-bar-modal {
          height: 12px;
          background: rgba(16, 185, 129, 0.2);
          border-radius: 10px;
          overflow: hidden;
        }

        .progress-fill-modal {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #06b6d4);
          border-radius: 10px;
          position: relative;
          overflow: hidden;
        }

        .progress-fill-modal::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shimmer 2s infinite;
        }

        .modal-footer {
          padding: 20px 30px;
          border-top: 1px solid rgba(16, 185, 129, 0.15);
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          background: rgba(16, 185, 129, 0.03);
        }

        .btn-modal-close {
          padding: 12px 24px;
          border-radius: 12px;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.25);
          color: #86efac;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .btn-modal-close:hover {
          background: rgba(16, 185, 129, 0.25);
          border-color: rgba(16, 185, 129, 0.4);
          color: #f0fdf4;
        }

        @media (max-width: 768px) {
          .modal-content {
            max-width: 100%;
            margin: 0 10px;
            max-height: 95vh;
          }

          .modal-header {
            padding: 20px;
          }

          .modal-body {
            padding: 20px;
          }

          .stats-grid-modal {
            grid-template-columns: 1fr;
          }

          .modal-footer {
            padding: 16px 20px;
          }
        }

        /* ========== CALIFICACIONES PLACEHOLDER ========== */
        .calificaciones-placeholder {
          text-align: center;
          padding: 60px 20px;
        }

        .calificaciones-icon {
          font-size: 4rem;
          color: #10b981;
          opacity: 0.3;
          margin-bottom: 24px;
        }

        .calificaciones-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #f0fdf4;
          margin-bottom: 12px;
        }

        .calificaciones-description {
          color: #86efac;
        }

        /* ========== CHAT CONTAINER ========== */
        .chat-container {
          height: calc(100vh - 200px);
          min-height: 500px;
          display: flex;
          flex-direction: column;
        }
      `}</style>

      <EstudianteDashboardLayout
        userInfo={userInfo}
        menuItems={menuItems}
        activeModule={activeModule}
        onModuleChange={handleModuleChange}
        loading={loading}
        onLogout={onLogout}
        sidebarCollapsed={sidebarCollapsed}
        isMobile={isMobile}
        mobileSidebarOpen={mobileSidebarOpen}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        darkMode={darkMode}
        highContrast={highContrast}
        toggleTheme={toggleTheme}
        toggleHighContrast={toggleHighContrast}
        getModuleTitle={getModuleTitle}
        studentStats={studentStats}
        studentLevel={studentLevel}
        studentGrade={studentGradeDisplay}
        studentSection={studentSection}
      >
        {/* Loading Overlay */}
        {loading && (
          <div className="loading-overlay-estudiante">
            <div className="text-center">
              <div className="spinner-estudiante mb-3"></div>
              <p style={{ color: '#86efac' }}>Cargando...</p>
            </div>
          </div>
        )}

        {/* Notifications */}
        {error && (
          <div className="notification-estudiante">
            <div className="alert alert-danger border-0 shadow mb-0" style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              <div className="d-flex align-items-center">
                <div className="me-3">
                  <div style={{ width: '32px', height: '32px', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FaTimes size={16} />
                  </div>
                </div>
                <div className="flex-grow-1">
                  <strong style={{ color: '#fca5a5' }}>Error</strong>
                  <div style={{ color: '#fecaca' }}>{error}</div>
                </div>
                <button type="button" className="btn-close" onClick={() => setError('')}></button>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="notification-estudiante">
            <div className="alert alert-success border-0 shadow mb-0" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
              <div className="d-flex align-items-center">
                <div className="me-3">
                  <div style={{ width: '32px', height: '32px', background: 'rgba(16, 185, 129, 0.2)', borderRadius: '8px', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FaCheck size={16} />
                  </div>
                </div>
                <div className="flex-grow-1">
                  <strong style={{ color: '#86efac' }}>Éxito</strong>
                  <div style={{ color: '#a7f3d0' }}>{success}</div>
                </div>
                <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
              </div>
            </div>
          </div>
        )}

        {/* Module Content */}
        {activeModule === 'mis-clases' && (
          <div className="mis-clases-container">
            <div className="mis-clases-header">
              <div className="header-info">
                <h3>Mis Clases Asignadas</h3>
                <p>
                  <FaBookOpen className="me-2" />
                  {cursosInscritos.length} {cursosInscritos.length === 1 ? 'clase asignada' : 'clases asignadas'}
                </p>
              </div>
              <button
                className="btn-refresh-clases"
                onClick={handleRefreshCursos}
                disabled={refreshingCursos}
              >
                <FaSync className={refreshingCursos ? 'fa-spin' : ''} />
                {refreshingCursos ? 'Actualizando...' : 'Actualizar Lista'}
              </button>
            </div>

            {cursosInscritos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon-wrapper">
                  <FaBookOpen />
                </div>
                <h4 className="empty-title">Aún no tienes cursos asignados</h4>
                <p className="empty-description">
                  Una vez que el administrador te asigne clases, aparecerán automáticamente aquí.
                </p>
              </div>
            ) : (
              <div className="clases-grid">
                {cursosInscritos.map((curso, index) => (
                  <div key={resolverCursoId(curso)} className="clase-card" style={{ animationDelay: `${index * 0.1}s` }}>
                    <div className="clase-card-header">
                      <div className="clase-icon-wrapper">
                        <FaBookOpen />
                      </div>
                      <div className="clase-status-badge">
                        <span className="status-dot"></span>
                        Activo
                      </div>
                    </div>

                    <div className="clase-card-body">
                      <h5 className="clase-title">{resolverNombreCurso(curso)}</h5>

                      <div className="clase-info-item">
                        <div className="info-icon">
                          <FaUser />
                        </div>
                        <div className="info-content">
                          <span className="info-label">Profesor</span>
                          <span className="info-value">{resolverDocenteCurso(curso)}</span>
                        </div>
                      </div>

                      <div className="clase-info-item">
                        <div className="info-icon">
                          <FaCalendarAlt />
                        </div>
                        <div className="info-content">
                          <span className="info-label">Horario</span>
                          <span className="info-value">{resolverHorario(curso)}</span>
                        </div>
                      </div>

                      <div className="clase-info-item">
                        <div className="info-icon">
                          <FaClock />
                        </div>
                        <div className="info-content">
                          <span className="info-label">Período</span>
                          <span className="info-value">{resolverFechas(curso).inicio} - {resolverFechas(curso).fin}</span>
                        </div>
                      </div>

                      <div className="clase-progress-section">
                        <div className="progress-header">
                          <span className="progress-text">Progreso del curso</span>
                          <span className="progress-percent">0%</span>
                        </div>
                        <div className="progress-bar-clase">
                          <div className="progress-fill-clase" style={{ width: '0%' }}></div>
                        </div>
                      </div>
                    </div>

                    <div className="clase-card-footer">
                      <button className="btn-ver-detalle" onClick={() => handleVerDetalle(curso)}>
                        <FaChartLine />
                        Ver Detalles
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeModule === 'mis-asistencias' && (
          <div className="asistencias-container">
            <div className="asistencias-header">
              <div className="header-info">
                <h3 style={{ color: '#f0fdf4', margin: '0 0 8px 0' }}>Mis Asistencias</h3>
                <p style={{ color: '#86efac', margin: 0 }}>
                  Visualiza lo que registra tu docente o corrige el administrador en tiempo real.
                </p>
              </div>
              <button
                className="btn-sync-asistencia"
                onClick={handleRefreshAsistencias}
                disabled={refreshingAsistencias}
              >
                <FaSync className={refreshingAsistencias ? 'fa-spin' : ''} />
                {refreshingAsistencias ? 'Sincronizando...' : 'Sincronizar'}
              </button>
            </div>

            <div className="asistencias-filters">
              <div className="filter-field">
                <label>Estado</label>
                <select
                  className="filter-select"
                  value={asistenciaEstadoFiltro}
                  onChange={(e) => setAsistenciaEstadoFiltro(e.target.value)}
                >
                  <option value="todos">Todos</option>
                  <option value="presente">Presente</option>
                  <option value="ausente">Ausente</option>
                  <option value="justificado">Justificado</option>
                  <option value="tardanza">Tardanza</option>
                </select>
              </div>
              <div className="filter-field">
                <label>Rango de fechas</label>
                <select
                  className="filter-select"
                  value={rangoAsistencia}
                  onChange={(e) => setRangoAsistencia(e.target.value)}
                >
                  <option value="30">Últimos 30 días</option>
                  <option value="90">Últimos 90 días</option>
                  <option value="365">Último año</option>
                  <option value="all">Todo el historial</option>
                </select>
              </div>
            </div>

            <div className="asistencias-summary">
              {Object.entries(ASISTENCIA_ESTADO_CONFIG)
                .filter(([key]) => key !== 'default')
                .map(([key, config]) => {
                  const EstadoIcon = config.icon;
                  return (
                    <div key={key} className="summary-card">
                      <div className="summary-icon" style={{ background: config.bg, color: config.color }}>
                        <EstadoIcon size={18} />
                      </div>
                      <div className="summary-info">
                        <h4 style={{ color: config.color }}>{resumenEstados[key] || 0}</h4>
                        <p>{config.label}</p>
                      </div>
                    </div>
                  );
                })}
              <div className="summary-card" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                <div className="summary-icon" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
                  <FaClipboardCheck size={18} />
                </div>
                <div className="summary-info">
                  <h4 style={{ color: '#10b981' }}>{asistenciasOrdenadas.length}</h4>
                  <p>Total registros</p>
                </div>
              </div>
            </div>

            <div className="asistencias-table">
              {ultimasAsistencias.length === 0 ? (
                <div className="empty-state" style={{ margin: '20px' }}>
                  <div className="empty-icon-wrapper">
                    <FaClipboardCheck />
                  </div>
                  <h4 className="empty-title">Sin asistencias registradas</h4>
                  <p className="empty-description">
                    Cuando el docente pase lista o el administrador corrija algo, podrás verlo aquí.
                  </p>
                </div>
              ) : (
                ultimasAsistencias.map((registro) => {
                  const estadoKey = String(registro.estado || '').toLowerCase();
                  const config = ASISTENCIA_ESTADO_CONFIG[estadoKey] || ASISTENCIA_ESTADO_CONFIG.default;
                  const EstadoIcon = config.icon;
                  const ultimaActualizacion = formatFechaHora(registro.fecha_modificacion || registro.fecha);
                  return (
                    <div
                      className="asistencia-row"
                      key={`${registro.id || registro.fecha}-${registro.materia_id || registro.curso_id || 'curso'}`}
                    >
                      <div>
                        <span className="date-large">{formatFechaCorta(registro.fecha)}</span>
                        <span className="date-sub d-block">{formatFechaLarga(registro.fecha)}</span>
                      </div>
                      <div>
                        <p className="course-name">{registro.curso_nombre || 'Curso pendiente de nombre'}</p>
                        <p className="course-meta">Última actualización: {ultimaActualizacion || 'Sin registro'}</p>
                      </div>
                      <div>
                        <span className="estado-pill" style={{ background: config.bg, color: config.color }}>
                          <EstadoIcon size={14} />
                          {config.label}
                        </span>
                      </div>
                      <div className="asistencia-observaciones">
                        {registro.observaciones || 'Sin observaciones'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeModule === 'mis-calificaciones' && (
          <div className="calificaciones-placeholder">
            <FaTrophy className="calificaciones-icon" />
            <h3 className="calificaciones-title">Mis Calificaciones</h3>
            <p className="calificaciones-description">Consulta tus calificaciones aquí.</p>
          </div>
        )}

        {activeModule === 'chat' && (
          <div className="chat-container">
            <Chat user={userInfo} token={token} />
          </div>
        )}

        {activeModule === 'configuracion' && (
          <ConfiguracionEstudiante
            userInfo={userInfo}
            darkMode={darkMode}
            toggleTheme={toggleTheme}
            token={token}
            showError={showError}
            showSuccess={showSuccess}
          />
        )}
      </EstudianteDashboardLayout>

      {/* Modal de Detalles de Clase */}
      {showDetalleModal && claseSeleccionada && (
        <div className="modal-overlay" onClick={handleCerrarDetalle}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="d-flex align-items-center gap-3">
                <div className="modal-icon-wrapper">
                  <FaBookOpen size={28} />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', color: '#f0fdf4' }}>{resolverNombreCurso(claseSeleccionada)}</h3>
                  <p style={{ margin: 0, color: '#86efac' }}>Detalles del curso</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={handleCerrarDetalle}>
                <FaTimes size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="row g-4">
                {/* Información General */}
                <div className="col-md-6">
                  <div className="detail-card">
                    <h5 className="detail-card-title">
                      <FaUser className="me-2" style={{ color: '#10b981' }} />
                      Información General
                    </h5>
                    <div className="detail-list">
                      <div className="detail-item">
                        <span className="detail-label">Profesor:</span>
                        <span className="detail-value">{resolverDocenteCurso(claseSeleccionada)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Email:</span>
                        <span className="detail-value">
                          {claseSeleccionada.profesor_email || claseSeleccionada.profesorEmail || 'No disponible'}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Código:</span>
                        <span className="detail-value">{resolverCursoId(claseSeleccionada)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Estado:</span>
                        <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' }}>Activo</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Horario:</span>
                        <span className="detail-value">{resolverHorario(claseSeleccionada)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Estadísticas */}
                <div className="col-md-6">
                  <div className="detail-card">
                    <h5 className="detail-card-title">
                      <FaChartLine className="me-2" style={{ color: '#10b981' }} />
                      Mis Estadísticas
                    </h5>
                    <div className="stats-grid-modal">
                      <div className="stat-item-modal">
                        <FaClipboardCheck className="stat-icon-modal" />
                        <span className="stat-label-modal">Asistencia</span>
                        <span className="stat-value-modal">0%</span>
                      </div>
                      <div className="stat-item-modal">
                        <FaTrophy className="stat-icon-modal" />
                        <span className="stat-label-modal">Promedio</span>
                        <span className="stat-value-modal">N/A</span>
                      </div>
                      <div className="stat-item-modal">
                        <FaCalendarAlt className="stat-icon-modal" />
                        <span className="stat-label-modal">Clases</span>
                        <span className="stat-value-modal">0</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progreso */}
                <div className="col-12">
                  <div className="detail-card">
                    <h5 className="detail-card-title">
                      <FaChartLine className="me-2" style={{ color: '#10b981' }} />
                      Progreso del Curso
                    </h5>
                    <div className="progress-section-modal">
                      <div className="d-flex justify-content-between mb-3">
                        <span style={{ color: '#86efac' }}>Avance del curso</span>
                        <span style={{ fontWeight: 'bold', color: '#10b981' }}>0%</span>
                      </div>
                      <div className="progress-bar-modal">
                        <div className="progress-fill-modal" style={{ width: '0%' }}></div>
                      </div>
                      <p style={{ color: '#86efac', marginTop: '12px', marginBottom: 0, fontSize: '0.9rem' }}>
                        Completa las actividades y asiste a clases para mejorar tu progreso
                      </p>
                    </div>
                  </div>
                </div>

                {/* Descripción */}
                <div className="col-12">
                  <div className="detail-card">
                    <h5 className="detail-card-title">
                      <FaBookOpen className="me-2" style={{ color: '#10b981' }} />
                      Descripción del Curso
                    </h5>
                    <p style={{ color: '#86efac', margin: 0 }}>
                      {claseSeleccionada.descripcion || 'Este curso está diseñado para ayudarte a mejorar tus habilidades en inglés. Aprenderás vocabulario, gramática y conversación de forma práctica y dinámica.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-modal-close" onClick={handleCerrarDetalle}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentDashboard;
