import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  FaBook,
  FaBookOpen,
  FaCalendarAlt,
  FaCalendarDay,
  FaChalkboardTeacher,
  FaChevronRight,
  FaClock,
  FaEllipsisH,
  FaFilter,
  FaGraduationCap,
  FaHistory,
  FaLayerGroup,
  FaMapMarkerAlt,
  FaSearch,
  FaSortAmountDown,
  FaStar,
  FaSyncAlt,
  FaUsers,
  FaUserGraduate,
  FaPlay,
  FaTimes,
  FaCheckCircle,
  FaArrowRight,
  FaRegClock,
  FaRegCalendarAlt,
  FaStream,
  FaChartLine,
  FaArchive,
} from 'react-icons/fa';
import UserAvatar from '../components/UserAvatar';

const DAY_ORDER = {
  Lunes: 1,
  Martes: 2,
  Miércoles: 3,
  Jueves: 4,
  Viernes: 5,
  Sábado: 6,
  Domingo: 7,
};

const DAY_COLORS = {
  Lunes: { bg: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: '#3b82f6' },
  Martes: { bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#10b981' },
  Miércoles: { bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#f59e0b' },
  Jueves: { bg: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: '#8b5cf6' },
  Viernes: { bg: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', color: '#ec4899' },
  Sábado: { bg: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', color: '#06b6d4' },
  Domingo: { bg: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)', color: '#f43f5e' },
};

const getUniqueKey = (asignacion) => {
  if (!asignacion) return null;
  const id = asignacion.asignacion_id ?? asignacion.id ?? '';
  const cursoId = asignacion.curso_id ?? '';
  const dia = asignacion.dia_semana ?? '';
  const hora = asignacion.hora_inicio ?? '';
  return `${id}-${cursoId}-${dia}-${hora}`;
};

const formatDate = (dateString) => {
  if (!dateString) return 'No definida';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'No definida';
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'No definida';
  }
};

const MisCursosPanel = ({
  asignaciones = [],
  loading = false,
  userInfo = {},
  onRefresh,
  onSelectCourse,
  showSuccess,
  showError,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDay, setFilterDay] = useState('todos');
  const [sortBy, setSortBy] = useState('dia');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('activos'); // 'activos' o 'terminados'

  // Función para verificar si un curso está activo
  const isCourseActive = useCallback((fechaFin) => {
    if (!fechaFin) return true; // Sin fecha de fin, se considera activo
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(fechaFin);
    endDate.setHours(23, 59, 59, 999);
    return endDate >= today;
  }, []);

  // Deduplicar y procesar asignaciones
  const processedCourses = useMemo(() => {
    if (!Array.isArray(asignaciones) || asignaciones.length === 0) return [];

    // Agrupar por asignacion_id para consolidar estudiantes
    const coursesMap = new Map();
    
    asignaciones.forEach((row) => {
      const asignacionId = row.asignacion_id ?? row.id;
      const key = getUniqueKey(row);
      
      if (!key) return;
      
      if (!coursesMap.has(key)) {
        coursesMap.set(key, {
          ...row,
          id: asignacionId,
          nombre: row.curso_nombre ?? row.materia_nombre ?? 'Curso sin nombre',
          dia: row.dia_semana ?? 'Sin asignar',
          horaInicio: row.hora_inicio?.slice(0, 5) ?? '--:--',
          horaFin: row.hora_fin?.slice(0, 5) ?? '--:--',
          aula: row.aula ?? 'Sin aula',
          fechaInicio: row.fecha_inicio ?? null,
          fechaFin: row.fecha_fin ?? null,
          maxAlumnos: row.max_alumnos ?? 0,
          estudiantesLista: [],
          isActive: isCourseActive(row.fecha_fin),
        });
      }
      
      // Agregar estudiante si existe
      const course = coursesMap.get(key);
      if (row.estudiante_id && !course.estudiantesLista.some(e => e.id === row.estudiante_id)) {
        course.estudiantesLista.push({
          id: row.estudiante_id,
          nombre: row.estudiante_nombre || 'Estudiante',
          email: row.estudiante_email || '',
          fechaInscripcion: row.fecha_inscripcion || null,
          tieneFoto: row.estudiante_tiene_foto === 1 || row.estudiante_tiene_foto === true,
        });
      }
    });

    return Array.from(coursesMap.values()).map(curso => ({
      ...curso,
      estudiantes: curso.estudiantesLista.length,
    }));
  }, [asignaciones, isCourseActive]);

  // Separar cursos activos y terminados
  const { activeCourses, finishedCourses } = useMemo(() => {
    const active = processedCourses.filter(c => c.isActive);
    const finished = processedCourses.filter(c => !c.isActive);
    return { activeCourses: active, finishedCourses: finished };
  }, [processedCourses]);

  // Usar cursos según el tab activo
  const currentCourses = activeTab === 'activos' ? activeCourses : finishedCourses;

  // Filtrar y ordenar
  const filteredCourses = useMemo(() => {
    let result = [...currentCourses];

    // Filtro de búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.nombre.toLowerCase().includes(term) ||
          c.dia.toLowerCase().includes(term) ||
          c.aula.toLowerCase().includes(term)
      );
    }

    // Filtro por día
    if (filterDay !== 'todos') {
      result = result.filter((c) => c.dia === filterDay);
    }

    // Ordenamiento
    result.sort((a, b) => {
      if (sortBy === 'dia') {
        const dayA = DAY_ORDER[a.dia] || 8;
        const dayB = DAY_ORDER[b.dia] || 8;
        if (dayA !== dayB) return dayA - dayB;
        return (a.horaInicio || '').localeCompare(b.horaInicio || '');
      }
      if (sortBy === 'nombre') {
        return a.nombre.localeCompare(b.nombre);
      }
      if (sortBy === 'hora') {
        return (a.horaInicio || '').localeCompare(b.horaInicio || '');
      }
      return 0;
    });

    return result;
  }, [currentCourses, searchTerm, filterDay, sortBy]);

  // Agrupar por día para vista calendario
  const coursesByDay = useMemo(() => {
    const grouped = {};
    filteredCourses.forEach((course) => {
      const day = course.dia || 'Sin asignar';
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(course);
    });
    return grouped;
  }, [filteredCourses]);

  // Estadísticas
  const stats = useMemo(() => {
    const totalCursos = activeCourses.length;
    const cursosTerminados = finishedCourses.length;
    const totalEstudiantes = activeCourses.reduce((sum, c) => {
      const count = Array.isArray(c.estudiantesLista)
        ? c.estudiantesLista.length
        : typeof c.estudiantes === 'number'
        ? c.estudiantes
        : 0;
      return sum + count;
    }, 0);
    const diasActivos = new Set(activeCourses.map((c) => c.dia)).size;
    const horasSemana = activeCourses.reduce((sum, c) => {
      const inicio = c.horaInicio?.split(':').map(Number) || [0, 0];
      const fin = c.horaFin?.split(':').map(Number) || [0, 0];
      const diff = (fin[0] * 60 + fin[1] - (inicio[0] * 60 + inicio[1])) / 60;
      return sum + (diff > 0 ? diff : 0);
    }, 0);

    return { totalCursos, cursosTerminados, totalEstudiantes, diasActivos, horasSemana: Math.round(horasSemana) };
  }, [activeCourses, finishedCourses]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh?.();
      showSuccess?.('Cursos actualizados correctamente');
    } catch (err) {
      showError?.('Error al actualizar los cursos');
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, onRefresh, showSuccess, showError]);

  const handleCourseClick = (course) => {
    setSelectedCourse(course);
    onSelectCourse?.(course);
  };

  const closeModal = () => setSelectedCourse(null);

  const getDayColor = (day) => DAY_COLORS[day] || DAY_COLORS.Lunes;

  return (
    <div className="mis-cursos-panel">
      <style>{`
        .mis-cursos-panel {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          padding: 32px;
          color: #f8fafc;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(56, 189, 248, 0.3); }
          50% { box-shadow: 0 0 40px rgba(56, 189, 248, 0.5); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }

        /* ========== HEADER ========== */
        .mcp-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          gap: 24px;
          flex-wrap: wrap;
          animation: fadeInUp 0.6s ease-out;
        }

        .mcp-header-left {
          flex: 1;
          min-width: 300px;
        }

        .mcp-title-row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 12px;
        }

        .mcp-title-icon {
          width: 56px;
          height: 56px;
          border-radius: 18px;
          background: linear-gradient(135deg, #38bdf8 0%, #6366f1 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 10px 30px rgba(56, 189, 248, 0.3);
        }

        .mcp-title {
          font-size: 2rem;
          font-weight: 800;
          background: linear-gradient(135deg, #f8fafc 0%, #94a3b8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .mcp-subtitle {
          color: rgba(148, 163, 184, 0.9);
          font-size: 1rem;
          margin: 0;
          margin-left: 72px;
        }

        .mcp-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .mcp-refresh-btn {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(15, 23, 42, 0.6);
          color: #38bdf8;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .mcp-refresh-btn:hover {
          background: rgba(56, 189, 248, 0.15);
          border-color: rgba(56, 189, 248, 0.4);
          transform: rotate(180deg);
        }

        .mcp-refresh-btn.spinning svg {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* ========== STATS ========== */
        .mcp-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 32px;
          animation: fadeInUp 0.6s ease-out 0.1s both;
        }

        .mcp-stat-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 20px;
          padding: 24px;
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(20px);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .mcp-stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--stat-gradient);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.4s ease;
        }

        .mcp-stat-card:hover {
          transform: translateY(-5px);
          border-color: rgba(255, 255, 255, 0.12);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .mcp-stat-card:hover::before {
          transform: scaleX(1);
        }

        .mcp-stat-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .mcp-stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--stat-gradient);
          color: white;
          box-shadow: 0 8px 20px var(--stat-shadow);
        }

        .mcp-stat-value {
          font-size: 2.5rem;
          font-weight: 800;
          color: #f8fafc;
          line-height: 1;
          margin-bottom: 6px;
        }

        .mcp-stat-label {
          font-size: 0.9rem;
          color: rgba(148, 163, 184, 0.8);
          font-weight: 500;
        }

        /* ========== TABS ========== */
        .mcp-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          padding: 6px;
          background: rgba(15, 23, 42, 0.5);
          border-radius: 16px;
          width: fit-content;
          animation: fadeInUp 0.6s ease-out 0.15s both;
        }

        .mcp-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 12px;
          border: none;
          background: transparent;
          color: rgba(148, 163, 184, 0.8);
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .mcp-tab:hover {
          color: #f8fafc;
          background: rgba(255, 255, 255, 0.05);
        }

        .mcp-tab.active {
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(14, 165, 233, 0.2) 100%);
          color: #38bdf8;
          box-shadow: 0 4px 15px rgba(56, 189, 248, 0.15);
        }

        .mcp-tab-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 24px;
          padding: 0 8px;
          border-radius: 12px;
          background: rgba(56, 189, 248, 0.2);
          color: #38bdf8;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .mcp-tab-badge-secondary {
          background: rgba(100, 116, 139, 0.3);
          color: #94a3b8;
        }

        .mcp-tab.active .mcp-tab-badge {
          background: rgba(56, 189, 248, 0.3);
          color: #7dd3fc;
        }

        .mcp-tab.active .mcp-tab-badge-secondary {
          background: rgba(56, 189, 248, 0.3);
          color: #7dd3fc;
        }

        /* ========== FILTERS ========== */
        .mcp-filters {
          display: flex;
          gap: 16px;
          margin-bottom: 28px;
          flex-wrap: wrap;
          animation: fadeInUp 0.6s ease-out 0.2s both;
        }

        .mcp-search-box {
          flex: 1;
          min-width: 280px;
          position: relative;
        }

        .mcp-search-input {
          width: 100%;
          padding: 14px 20px 14px 50px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(15, 23, 42, 0.7);
          color: #f8fafc;
          font-size: 0.95rem;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .mcp-search-input:focus {
          outline: none;
          border-color: rgba(56, 189, 248, 0.5);
          box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.1);
        }

        .mcp-search-input::placeholder {
          color: rgba(148, 163, 184, 0.6);
        }

        .mcp-search-icon {
          position: absolute;
          left: 18px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(148, 163, 184, 0.6);
        }

        .mcp-filter-group {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .mcp-filter-select {
          padding: 14px 40px 14px 18px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(15, 23, 42, 0.7);
          color: #f8fafc;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s ease;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 16px;
        }

        .mcp-filter-select:focus {
          outline: none;
          border-color: rgba(56, 189, 248, 0.5);
        }

        .mcp-view-toggle {
          display: flex;
          gap: 4px;
          padding: 4px;
          border-radius: 12px;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .mcp-view-btn {
          padding: 10px 16px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: rgba(148, 163, 184, 0.7);
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .mcp-view-btn.active {
          background: linear-gradient(135deg, #38bdf8 0%, #6366f1 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(56, 189, 248, 0.3);
        }

        .mcp-view-btn:hover:not(.active) {
          color: #f8fafc;
          background: rgba(255, 255, 255, 0.05);
        }

        /* ========== COURSES GRID ========== */
        .mcp-courses-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 24px;
          animation: fadeInUp 0.6s ease-out 0.3s both;
        }

        .mcp-course-card {
          background: rgba(15, 23, 42, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 24px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          backdrop-filter: blur(20px);
        }

        .mcp-course-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.03) 0%, transparent 100%);
          opacity: 0;
          transition: opacity 0.4s ease;
        }

        .mcp-course-card:hover {
          transform: translateY(-8px) scale(1.01);
          border-color: rgba(56, 189, 248, 0.3);
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.35), 0 0 40px rgba(56, 189, 248, 0.1);
        }

        .mcp-course-card:hover::before {
          opacity: 1;
        }

        .mcp-course-header {
          padding: 20px 24px;
          position: relative;
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .mcp-course-day-badge {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          flex-shrink: 0;
          box-shadow: 0 8px 20px var(--day-shadow, rgba(56, 189, 248, 0.3));
        }

        .mcp-course-day-badge .day-abbr {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          opacity: 0.9;
        }

        .mcp-course-day-badge .day-num {
          font-size: 1.1rem;
          line-height: 1;
        }

        .mcp-course-info {
          flex: 1;
          min-width: 0;
        }

        .mcp-course-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #f8fafc;
          margin: 0 0 8px 0;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .mcp-course-time {
          display: flex;
          align-items: center;
          gap: 6px;
          color: rgba(148, 163, 184, 0.9);
          font-size: 0.9rem;
          font-weight: 500;
        }

        .mcp-course-time svg {
          color: var(--day-color, #38bdf8);
        }

        .mcp-course-body {
          padding: 0 24px 20px;
        }

        .mcp-course-dates {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(99, 102, 241, 0.05) 100%);
          border-radius: 14px;
          margin-bottom: 16px;
          border: 1px solid rgba(56, 189, 248, 0.1);
        }

        .mcp-dates-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(56, 189, 248, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #38bdf8;
          flex-shrink: 0;
        }

        .mcp-dates-content {
          flex: 1;
          display: flex;
          flex-wrap: wrap;
          gap: 8px 20px;
        }

        .mcp-date-item {
          display: flex;
          flex-direction: column;
        }

        .mcp-date-label {
          font-size: 0.7rem;
          color: rgba(148, 163, 184, 0.6);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .mcp-date-value {
          font-size: 0.88rem;
          font-weight: 600;
          color: #e2e8f0;
        }

        .mcp-course-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        .mcp-meta-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          background: rgba(15, 23, 42, 0.5);
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .mcp-meta-item:hover {
          background: rgba(56, 189, 248, 0.08);
        }

        .mcp-meta-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(56, 189, 248, 0.1);
          color: #38bdf8;
        }

        .mcp-meta-text {
          flex: 1;
          min-width: 0;
        }

        .mcp-meta-label {
          font-size: 0.75rem;
          color: rgba(148, 163, 184, 0.7);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .mcp-meta-value {
          font-size: 0.95rem;
          font-weight: 600;
          color: #f8fafc;
        }

        .mcp-course-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .mcp-students-preview {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mcp-students-avatars {
          display: flex;
        }

        .mcp-student-avatar {
          margin-left: -10px;
          border: 2px solid rgba(15, 23, 42, 0.9) !important;
          border-radius: 50% !important;
        }

        .mcp-student-avatar:first-child {
          margin-left: 0;
        }

        .mcp-students-avatars .mcp-student-avatar {
          width: 32px !important;
          height: 32px !important;
          min-width: 32px !important;
          font-size: 0.75rem !important;
        }

        .mcp-students-count {
          font-size: 0.85rem;
          color: rgba(148, 163, 184, 0.8);
        }

        .mcp-view-details-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%);
          border: 1px solid rgba(56, 189, 248, 0.2);
          color: #38bdf8;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .mcp-view-details-btn:hover {
          background: linear-gradient(135deg, #38bdf8 0%, #6366f1 100%);
          color: white;
          border-color: transparent;
          transform: translateX(4px);
        }

        /* ========== CALENDAR VIEW ========== */
        .mcp-calendar-view {
          animation: fadeInUp 0.6s ease-out 0.3s both;
        }

        .mcp-day-section {
          margin-bottom: 32px;
        }

        .mcp-day-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .mcp-day-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
        }

        .mcp-day-title {
          font-size: 1.4rem;
          font-weight: 700;
          color: #f8fafc;
          margin: 0;
        }

        .mcp-day-count {
          margin-left: auto;
          padding: 6px 14px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.06);
          font-size: 0.85rem;
          color: rgba(148, 163, 184, 0.8);
        }

        .mcp-day-courses {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        /* ========== EMPTY STATE ========== */
        .mcp-empty-state {
          text-align: center;
          padding: 80px 40px;
          background: rgba(15, 23, 42, 0.5);
          border: 1px dashed rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          animation: fadeInUp 0.6s ease-out;
        }

        .mcp-empty-icon {
          width: 80px;
          height: 80px;
          border-radius: 24px;
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          color: #38bdf8;
        }

        .mcp-empty-title {
          font-size: 1.4rem;
          font-weight: 700;
          color: #f8fafc;
          margin-bottom: 8px;
        }

        .mcp-empty-text {
          color: rgba(148, 163, 184, 0.8);
          font-size: 1rem;
          max-width: 400px;
          margin: 0 auto;
        }

        /* ========== MODAL ========== */
        .mcp-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .mcp-modal {
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          background: linear-gradient(145deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.95) 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 28px;
          overflow: hidden;
          animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 40px 80px rgba(0, 0, 0, 0.5);
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .mcp-modal-header {
          padding: 28px;
          display: flex;
          align-items: center;
          gap: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .mcp-modal-day-badge {
          width: 72px;
          height: 72px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          flex-shrink: 0;
        }

        .mcp-modal-info {
          flex: 1;
        }

        .mcp-modal-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #f8fafc;
          margin: 0 0 8px 0;
        }

        .mcp-modal-schedule {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(148, 163, 184, 0.9);
          font-size: 1rem;
        }

        .mcp-modal-close {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          color: rgba(148, 163, 184, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .mcp-modal-close:hover {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        .mcp-modal-body {
          padding: 28px;
          max-height: 60vh;
          overflow-y: auto;
        }

        .mcp-modal-section {
          margin-bottom: 28px;
        }

        .mcp-modal-section:last-child {
          margin-bottom: 0;
        }

        .mcp-modal-section-title {
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: rgba(148, 163, 184, 0.6);
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .mcp-modal-section-title svg {
          color: #38bdf8;
        }

        .mcp-modal-details-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .mcp-modal-detail {
          padding: 18px;
          background: rgba(15, 23, 42, 0.6);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .mcp-modal-detail-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: rgba(56, 189, 248, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #38bdf8;
          margin-bottom: 12px;
        }

        .mcp-modal-detail-label {
          font-size: 0.8rem;
          color: rgba(148, 163, 184, 0.6);
          margin-bottom: 4px;
        }

        .mcp-modal-detail-value {
          font-size: 1.1rem;
          font-weight: 700;
          color: #f8fafc;
        }

        .mcp-students-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 250px;
          overflow-y: auto;
        }

        .mcp-student-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px;
          background: rgba(15, 23, 42, 0.6);
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.04);
          transition: all 0.3s ease;
        }

        .mcp-student-item:hover {
          background: rgba(56, 189, 248, 0.08);
          border-color: rgba(56, 189, 248, 0.2);
        }

        .mcp-student-avatar-lg {
          width: 44px !important;
          height: 44px !important;
          min-width: 44px !important;
          border-radius: 14px !important;
          flex-shrink: 0;
        }

        .mcp-student-info-container {
          flex: 1;
          min-width: 0;
        }

        .mcp-student-name {
          font-weight: 600;
          color: #f8fafc;
          font-size: 0.95rem;
        }

        .mcp-student-email {
          font-size: 0.8rem;
          color: rgba(148, 163, 184, 0.7);
        }

        .mcp-student-inscription {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: rgba(56, 189, 248, 0.8);
          margin-top: 4px;
          padding: 4px 8px;
          background: rgba(56, 189, 248, 0.08);
          border-radius: 6px;
          width: fit-content;
        }

        .mcp-no-students {
          padding: 32px;
          text-align: center;
          color: rgba(148, 163, 184, 0.6);
          background: rgba(15, 23, 42, 0.4);
          border-radius: 16px;
          border: 1px dashed rgba(255, 255, 255, 0.08);
        }

        /* ========== RESPONSIVE ========== */
        @media (max-width: 1024px) {
          .mcp-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .mis-cursos-panel {
            padding: 20px;
          }

          .mcp-header {
            flex-direction: column;
          }

          .mcp-stats-grid {
            grid-template-columns: 1fr;
          }

          .mcp-filters {
            flex-direction: column;
          }

          .mcp-search-box {
            min-width: 100%;
          }

          .mcp-courses-grid,
          .mcp-day-courses {
            grid-template-columns: 1fr;
          }

          .mcp-course-meta {
            grid-template-columns: 1fr;
          }

          .mcp-modal-details-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Header */}
      <header className="mcp-header">
        <div className="mcp-header-left">
          <div className="mcp-title-row">
            <div className="mcp-title-icon">
              <FaGraduationCap size={26} />
            </div>
            <h1 className="mcp-title">Mis Cursos</h1>
          </div>
          <p className="mcp-subtitle">
            Gestiona y visualiza todos los cursos asignados para este período académico
          </p>
        </div>
        <div className="mcp-header-right">
          <button
            className={`mcp-refresh-btn ${isRefreshing ? 'spinning' : ''}`}
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Actualizar cursos"
          >
            <FaSyncAlt size={18} />
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="mcp-stats-grid">
        <div
          className="mcp-stat-card"
          style={{
            '--stat-gradient': 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',
            '--stat-shadow': 'rgba(56, 189, 248, 0.25)',
          }}
        >
          <div className="mcp-stat-header">
            <div className="mcp-stat-icon">
              <FaBookOpen size={20} />
            </div>
          </div>
          <div className="mcp-stat-value">{stats.totalCursos}</div>
          <div className="mcp-stat-label">Cursos Activos</div>
        </div>

        <div
          className="mcp-stat-card"
          style={{
            '--stat-gradient': 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
            '--stat-shadow': 'rgba(100, 116, 139, 0.25)',
          }}
        >
          <div className="mcp-stat-header">
            <div className="mcp-stat-icon">
              <FaArchive size={20} />
            </div>
          </div>
          <div className="mcp-stat-value">{stats.cursosTerminados}</div>
          <div className="mcp-stat-label">Cursos Terminados</div>
        </div>

        <div
          className="mcp-stat-card"
          style={{
            '--stat-gradient': 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
            '--stat-shadow': 'rgba(168, 85, 247, 0.25)',
          }}
        >
          <div className="mcp-stat-header">
            <div className="mcp-stat-icon">
              <FaUsers size={20} />
            </div>
          </div>
          <div className="mcp-stat-value">{stats.totalEstudiantes}</div>
          <div className="mcp-stat-label">Estudiantes Activos</div>
        </div>

        <div
          className="mcp-stat-card"
          style={{
            '--stat-gradient': 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            '--stat-shadow': 'rgba(249, 115, 22, 0.25)',
          }}
        >
          <div className="mcp-stat-header">
            <div className="mcp-stat-icon">
              <FaClock size={20} />
            </div>
          </div>
          <div className="mcp-stat-value">{stats.horasSemana}h</div>
          <div className="mcp-stat-label">Horas Semanales</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mcp-tabs">
        <button
          className={`mcp-tab ${activeTab === 'activos' ? 'active' : ''}`}
          onClick={() => setActiveTab('activos')}
        >
          <FaBookOpen size={14} />
          Cursos Activos
          <span className="mcp-tab-badge">{activeCourses.length}</span>
        </button>
        <button
          className={`mcp-tab ${activeTab === 'terminados' ? 'active' : ''}`}
          onClick={() => setActiveTab('terminados')}
        >
          <FaHistory size={14} />
          Cursos Terminados
          <span className="mcp-tab-badge mcp-tab-badge-secondary">{finishedCourses.length}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="mcp-filters">
        <div className="mcp-search-box">
          <FaSearch className="mcp-search-icon" size={16} />
          <input
            type="text"
            className="mcp-search-input"
            placeholder="Buscar curso por nombre, día o aula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="mcp-filter-group">
          <select
            className="mcp-filter-select"
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
          >
            <option value="todos">Todos los días</option>
            {Object.keys(DAY_ORDER).map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>

          <select
            className="mcp-filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="dia">Ordenar por día</option>
            <option value="nombre">Ordenar por nombre</option>
            <option value="hora">Ordenar por hora</option>
          </select>
        </div>

        <div className="mcp-view-toggle">
          <button
            className={`mcp-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            <FaLayerGroup size={14} />
            Tarjetas
          </button>
          <button
            className={`mcp-view-btn ${viewMode === 'calendar' ? 'active' : ''}`}
            onClick={() => setViewMode('calendar')}
          >
            <FaCalendarAlt size={14} />
            Calendario
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="mcp-empty-state">
          <div className="mcp-empty-icon">
            <FaSyncAlt size={32} className="spinning" />
          </div>
          <h3 className="mcp-empty-title">Cargando cursos...</h3>
          <p className="mcp-empty-text">Estamos obteniendo tu información académica</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="mcp-empty-state">
          <div className="mcp-empty-icon">
            <FaBookOpen size={36} />
          </div>
          <h3 className="mcp-empty-title">
            {searchTerm || filterDay !== 'todos'
              ? 'No se encontraron cursos'
              : 'Sin cursos asignados'}
          </h3>
          <p className="mcp-empty-text">
            {searchTerm || filterDay !== 'todos'
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Cuando se te asignen cursos, aparecerán aquí'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="mcp-courses-grid">
          {filteredCourses.map((course) => {
            const dayColor = getDayColor(course.dia);
            const studentCount = Array.isArray(course.estudiantesLista)
              ? course.estudiantesLista.length
              : course.estudiantes || 0;

            return (
              <article
                key={course.id}
                className="mcp-course-card"
                onClick={() => handleCourseClick(course)}
                style={{
                  '--day-color': dayColor.color,
                  '--day-shadow': `${dayColor.color}40`,
                }}
              >
                <div className="mcp-course-header">
                  <div
                    className="mcp-course-day-badge"
                    style={{ background: dayColor.bg }}
                  >
                    <span className="day-abbr">{course.dia?.slice(0, 3)}</span>
                    <span className="day-num">
                      <FaCalendarDay size={14} />
                    </span>
                  </div>
                  <div className="mcp-course-info">
                    <h3 className="mcp-course-title">{course.nombre}</h3>
                    <div className="mcp-course-time">
                      <FaClock size={14} />
                      {course.horaInicio} - {course.horaFin}
                    </div>
                  </div>
                </div>

                <div className="mcp-course-body">
                  {/* Fechas del curso */}
                  <div className="mcp-course-dates">
                    <div className="mcp-dates-icon">
                      <FaRegCalendarAlt size={16} />
                    </div>
                    <div className="mcp-dates-content">
                      <div className="mcp-date-item">
                        <span className="mcp-date-label">Inicio</span>
                        <span className="mcp-date-value">{formatDate(course.fechaInicio)}</span>
                      </div>
                      <div className="mcp-date-item">
                        <span className="mcp-date-label">Fin</span>
                        <span className="mcp-date-value">{formatDate(course.fechaFin)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mcp-course-meta">
                    <div className="mcp-meta-item">
                      <div className="mcp-meta-icon">
                        <FaMapMarkerAlt size={14} />
                      </div>
                      <div className="mcp-meta-text">
                        <div className="mcp-meta-label">Aula</div>
                        <div className="mcp-meta-value">{course.aula}</div>
                      </div>
                    </div>
                    <div className="mcp-meta-item">
                      <div className="mcp-meta-icon">
                        <FaUsers size={14} />
                      </div>
                      <div className="mcp-meta-text">
                        <div className="mcp-meta-label">Inscritos</div>
                        <div className="mcp-meta-value">{studentCount} {course.maxAlumnos ? `/ ${course.maxAlumnos}` : ''}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mcp-course-footer">
                    <div className="mcp-students-preview">
                      <div className="mcp-students-avatars">
                        {Array.isArray(course.estudiantesLista) &&
                          course.estudiantesLista.slice(0, 3).map((est, idx) => (
                            <UserAvatar
                              key={est.id || idx}
                              userId={est.id}
                              nombre={est.nombre || 'E'}
                              tieneFoto={est.tieneFoto}
                              size="sm"
                              className="mcp-student-avatar"
                            />
                          ))}
                      </div>
                      {studentCount > 3 && (
                        <span className="mcp-students-count">+{studentCount - 3}</span>
                      )}
                    </div>
                    <button className="mcp-view-details-btn">
                      Ver detalles
                      <FaChevronRight size={12} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mcp-calendar-view">
          {Object.entries(coursesByDay)
            .sort(([a], [b]) => (DAY_ORDER[a] || 8) - (DAY_ORDER[b] || 8))
            .map(([day, courses]) => {
              const dayColor = getDayColor(day);
              return (
                <section key={day} className="mcp-day-section">
                  <header className="mcp-day-header">
                    <div
                      className="mcp-day-icon"
                      style={{ background: dayColor.bg }}
                    >
                      <FaCalendarDay size={18} />
                    </div>
                    <h2 className="mcp-day-title">{day}</h2>
                    <span className="mcp-day-count">
                      {courses.length} {courses.length === 1 ? 'curso' : 'cursos'}
                    </span>
                  </header>
                  <div className="mcp-day-courses">
                    {courses.map((course) => {
                      const studentCount = Array.isArray(course.estudiantesLista)
                        ? course.estudiantesLista.length
                        : course.estudiantes || 0;

                      return (
                        <article
                          key={course.id}
                          className="mcp-course-card"
                          onClick={() => handleCourseClick(course)}
                          style={{
                            '--day-color': dayColor.color,
                            '--day-shadow': `${dayColor.color}40`,
                          }}
                        >
                          <div className="mcp-course-header">
                            <div
                              className="mcp-course-day-badge"
                              style={{ background: dayColor.bg }}
                            >
                              <span className="day-abbr">{course.dia?.slice(0, 3)}</span>
                              <span className="day-num">
                                <FaCalendarDay size={14} />
                              </span>
                            </div>
                            <div className="mcp-course-info">
                              <h3 className="mcp-course-title">{course.nombre}</h3>
                              <div className="mcp-course-time">
                                <FaClock size={14} />
                                {course.horaInicio} - {course.horaFin}
                              </div>
                            </div>
                          </div>

                          <div className="mcp-course-body">
                            {/* Fechas del curso */}
                            <div className="mcp-course-dates">
                              <div className="mcp-dates-icon">
                                <FaRegCalendarAlt size={16} />
                              </div>
                              <div className="mcp-dates-content">
                                <div className="mcp-date-item">
                                  <span className="mcp-date-label">Inicio</span>
                                  <span className="mcp-date-value">{formatDate(course.fechaInicio)}</span>
                                </div>
                                <div className="mcp-date-item">
                                  <span className="mcp-date-label">Fin</span>
                                  <span className="mcp-date-value">{formatDate(course.fechaFin)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="mcp-course-meta">
                              <div className="mcp-meta-item">
                                <div className="mcp-meta-icon">
                                  <FaMapMarkerAlt size={14} />
                                </div>
                                <div className="mcp-meta-text">
                                  <div className="mcp-meta-label">Aula</div>
                                  <div className="mcp-meta-value">{course.aula}</div>
                                </div>
                              </div>
                              <div className="mcp-meta-item">
                                <div className="mcp-meta-icon">
                                  <FaUsers size={14} />
                                </div>
                                <div className="mcp-meta-text">
                                  <div className="mcp-meta-label">Inscritos</div>
                                  <div className="mcp-meta-value">{studentCount} {course.maxAlumnos ? `/ ${course.maxAlumnos}` : ''}</div>
                                </div>
                              </div>
                            </div>

                            <div className="mcp-course-footer">
                              <div className="mcp-students-preview">
                                <div className="mcp-students-avatars">
                                  {Array.isArray(course.estudiantesLista) &&
                                    course.estudiantesLista.slice(0, 3).map((est, idx) => (
                                      <UserAvatar
                                        key={est.id || idx}
                                        userId={est.id}
                                        nombre={est.nombre || 'E'}
                                        tieneFoto={est.tieneFoto}
                                        size="sm"
                                        className="mcp-student-avatar"
                                      />
                                    ))}
                                </div>
                                {studentCount > 3 && (
                                  <span className="mcp-students-count">+{studentCount - 3}</span>
                                )}
                              </div>
                              <button className="mcp-view-details-btn">
                                Ver detalles
                                <FaChevronRight size={12} />
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
        </div>
      )}

      {/* Modal */}
      {selectedCourse && (
        <div className="mcp-modal-overlay" onClick={closeModal}>
          <div className="mcp-modal" onClick={(e) => e.stopPropagation()}>
            <header className="mcp-modal-header">
              <div
                className="mcp-modal-day-badge"
                style={{ background: getDayColor(selectedCourse.dia).bg }}
              >
                <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                  {selectedCourse.dia?.slice(0, 3)}
                </span>
                <FaCalendarDay size={20} />
              </div>
              <div className="mcp-modal-info">
                <h2 className="mcp-modal-title">{selectedCourse.nombre}</h2>
                <div className="mcp-modal-schedule">
                  <FaClock size={14} />
                  {selectedCourse.horaInicio} - {selectedCourse.horaFin}
                </div>
              </div>
              <button className="mcp-modal-close" onClick={closeModal}>
                <FaTimes size={18} />
              </button>
            </header>

            <div className="mcp-modal-body">
              <section className="mcp-modal-section">
                <h3 className="mcp-modal-section-title">
                  <FaChartLine size={14} />
                  Información del Curso
                </h3>
                <div className="mcp-modal-details-grid">
                  <div className="mcp-modal-detail">
                    <div className="mcp-modal-detail-icon">
                      <FaCalendarAlt size={18} />
                    </div>
                    <div className="mcp-modal-detail-label">Día de clase</div>
                    <div className="mcp-modal-detail-value">{selectedCourse.dia}</div>
                  </div>
                  <div className="mcp-modal-detail">
                    <div className="mcp-modal-detail-icon">
                      <FaClock size={18} />
                    </div>
                    <div className="mcp-modal-detail-label">Horario</div>
                    <div className="mcp-modal-detail-value">
                      {selectedCourse.horaInicio} - {selectedCourse.horaFin}
                    </div>
                  </div>
                  <div className="mcp-modal-detail">
                    <div className="mcp-modal-detail-icon">
                      <FaRegCalendarAlt size={18} />
                    </div>
                    <div className="mcp-modal-detail-label">Fecha de inicio</div>
                    <div className="mcp-modal-detail-value">{formatDate(selectedCourse.fechaInicio)}</div>
                  </div>
                  <div className="mcp-modal-detail">
                    <div className="mcp-modal-detail-icon">
                      <FaRegCalendarAlt size={18} />
                    </div>
                    <div className="mcp-modal-detail-label">Fecha de fin</div>
                    <div className="mcp-modal-detail-value">{formatDate(selectedCourse.fechaFin)}</div>
                  </div>
                  <div className="mcp-modal-detail">
                    <div className="mcp-modal-detail-icon">
                      <FaMapMarkerAlt size={18} />
                    </div>
                    <div className="mcp-modal-detail-label">Aula</div>
                    <div className="mcp-modal-detail-value">{selectedCourse.aula}</div>
                  </div>
                  <div className="mcp-modal-detail">
                    <div className="mcp-modal-detail-icon">
                      <FaUsers size={18} />
                    </div>
                    <div className="mcp-modal-detail-label">Estudiantes</div>
                    <div className="mcp-modal-detail-value">
                      {Array.isArray(selectedCourse.estudiantesLista)
                        ? selectedCourse.estudiantesLista.length
                        : selectedCourse.estudiantes || 0}
                    </div>
                  </div>
                </div>
              </section>

              <section className="mcp-modal-section">
                <h3 className="mcp-modal-section-title">
                  <FaUserGraduate size={14} />
                  Lista de Estudiantes
                </h3>
                {Array.isArray(selectedCourse.estudiantesLista) &&
                selectedCourse.estudiantesLista.length > 0 ? (
                  <div className="mcp-students-list">
                    {selectedCourse.estudiantesLista.map((student, idx) => (
                      <div key={student.id || idx} className="mcp-student-item">
                        <UserAvatar
                          userId={student.id}
                          nombre={student.nombre || 'E'}
                          tieneFoto={student.tieneFoto}
                          size="md"
                          className="mcp-student-avatar-lg"
                        />
                        <div className="mcp-student-info-container">
                          <div className="mcp-student-name">
                            {student.nombre || 'Estudiante'}
                          </div>
                          {student.email && (
                            <div className="mcp-student-email">{student.email}</div>
                          )}
                          {student.fechaInscripcion && (
                            <div className="mcp-student-inscription">
                              <FaRegCalendarAlt size={10} />
                              Inscrito: {formatDate(student.fechaInscripcion)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mcp-no-students">
                    <FaUsers size={24} style={{ marginBottom: 12, opacity: 0.5 }} />
                    <p style={{ margin: 0 }}>No hay estudiantes inscritos en este curso</p>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

MisCursosPanel.propTypes = {
  asignaciones: PropTypes.array,
  loading: PropTypes.bool,
  userInfo: PropTypes.object,
  onRefresh: PropTypes.func,
  onSelectCourse: PropTypes.func,
  showSuccess: PropTypes.func,
  showError: PropTypes.func,
};

export default MisCursosPanel;
