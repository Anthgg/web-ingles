import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  FaChalkboardTeacher, FaClipboardCheck,
  FaSignOutAlt, FaUsers, FaTasks, FaBook, FaHome,
  FaCog, FaMoon, FaSun, FaChevronLeft,
  FaBars, FaAdjust, FaFilter, FaSearch,
  FaRegBell, FaTimes, FaCheck, FaLock,
  FaChartLine, FaCalendarAlt, FaCheckCircle, FaInfoCircle, FaFileExcel, FaFilePdf,
} from 'react-icons/fa';
import { Modal, Button, Form } from 'react-bootstrap';
import axios from 'axios';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import MisAsignacionesDocente from '../components-docente/MisAsignacionesDocente';
import CalificacionesPanel from '../components-docente/CalificacionesPanel';
import Configuracion from '../components/Configuracion';
import { Chat } from '../chat';
import './GeneralAttendanceReport.css';

const ATTENDANCE_BASE = process.env.REACT_APP_ATTENDANCE_BASE_URL || 'http://localhost:3003';
const ASIGNATION_BASE = process.env.REACT_APP_ASIGNATION_BASE_URL || 'http://localhost:3007';
const REGISTRY_BASE = process.env.REACT_APP_REGISTRY_BASE_URL || 'http://localhost:3011';

const DEFAULT_ATTENDANCE_REPORT_COLUMNS = [
  { key: 'id', label: 'ID', width: 40 },
  { key: 'student_id', label: 'ID Estudiante', width: 90 },
  { key: 'class_id', label: 'ID Clase', width: 70 },
  { key: 'date', label: 'Fecha', width: 80 },
  { key: 'status', label: 'Estado', width: 70 },
  { key: 'notes', label: 'Notas', width: 100 },
];

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const ATTENDANCE_STATES = [
  { value: 'presente', label: 'Presente', icon: '✅', variant: 'success' },
  { value: 'ausente', label: 'Ausente', icon: '❌', variant: 'danger' },
  { value: 'tardanza', label: 'Tardanza', icon: '⏰', variant: 'warning' },
  { value: 'justificado', label: 'Justificado', icon: '📝', variant: 'info' },
];

const normalizeDate = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split('-').map(Number);
      return new Date(year, month - 1, day);
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  return null;
};

const formatDateKey = (value) => {
  const date = normalizeDate(value);
  if (!date) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatPercentageDisplay = (value) => {
  if (value == null || Number.isNaN(Number(value))) {
    return '—';
  }
  return `${Number(value).toFixed(1)}%`;
};

const getDayNameFromJsIndex = (jsIndex) => DAY_NAMES[jsIndex] || '';

const parseDiaSemana = (value) => {
  if (value == null) {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    if (numeric === 0) {
      return 7;
    }
    return numeric;
  }

  const normalized = value.toString().trim().toLowerCase();
  const map = {
    lunes: 1,
    martes: 2,
    miercoles: 3,
    miércoles: 3,
    wednesday: 3,
    jueves: 4,
    viernes: 5,
    sabado: 6,
    sábado: 6,
    saturday: 6,
    domingo: 7,
    sunday: 7,
    monday: 1,
    tuesday: 2,
    thursday: 4,
    friday: 5,
  };

  return map[normalized] || null;
};

const safeTimestamp = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.getTime();
};

const getAttendanceRecordPriority = (record) => {
  if (!record) {
    return { timestamp: 0, id: 0 };
  }

  const modTime = safeTimestamp(record.fecha_modificacion || record.updated_at);
  const createdTime = safeTimestamp(record.fecha_creacion || record.created_at || record.fecha);
  const timestamp = modTime ?? createdTime ?? 0;
  const id = Number(record.id) || 0;

  return { timestamp, id };
};

const isNewerAttendanceRecord = (candidate, current) => {
  if (!current) return true;
  if (!candidate) return false;

  const candidatePriority = getAttendanceRecordPriority(candidate);
  const currentPriority = getAttendanceRecordPriority(current);

  if (candidatePriority.timestamp !== currentPriority.timestamp) {
    return candidatePriority.timestamp > currentPriority.timestamp;
  }

  return candidatePriority.id > currentPriority.id;
};

const consolidateAttendanceByStudentAndDate = (entries = []) => {
  const store = new Map();

  entries.forEach((entry) => {
    if (!entry || entry.estudiante_id == null) {
      return;
    }

    const dateKey = formatDateKey(entry.fecha);
    if (!dateKey) {
      return;
    }

    const studentId = Number(entry.estudiante_id);
    const mapKey = `${studentId}-${dateKey}`;
    const current = store.get(mapKey);

    if (!current || isNewerAttendanceRecord(entry, current)) {
      store.set(mapKey, entry);
    }
  });

  return store;
};

const getConsolidatedAttendanceArray = (entries = []) =>
  Array.from(consolidateAttendanceByStudentAndDate(entries).values());

const buildAttendanceLookupForDay = (entries = [], targetDate) => {
  const lookup = new Map();
  const normalizedDate = formatDateKey(targetDate);

  if (!normalizedDate) {
    return lookup;
  }

  entries.forEach((entry) => {
    if (!entry || entry.estudiante_id == null) {
      return;
    }

    const dateKey = formatDateKey(entry.fecha);
    if (dateKey !== normalizedDate) {
      return;
    }

    const studentId = Number(entry.estudiante_id);
    const current = lookup.get(studentId);

    if (!current || isNewerAttendanceRecord(entry, current)) {
      lookup.set(studentId, entry);
    }
  });

  return lookup;
};

const buildCourseKeyFromAsignacion = (asignacion) => {
  if (!asignacion) {
    return null;
  }

  const rawAsignacionId = asignacion.asignacion_id ?? asignacion.id;
  const asignacionId = rawAsignacionId != null ? Number(rawAsignacionId) : null;
  const cursoId = asignacion.curso_id != null ? Number(asignacion.curso_id) : null;
  const cursoNombre = typeof asignacion.curso_nombre === 'string'
    ? asignacion.curso_nombre.trim().toLowerCase()
    : typeof asignacion.materia_nombre === 'string'
      ? asignacion.materia_nombre.trim().toLowerCase()
      : null;

  const parts = [];
  if (!Number.isNaN(asignacionId) && asignacionId !== null) {
    parts.push(`a-${asignacionId}`);
  }
  if (!Number.isNaN(cursoId) && cursoId !== null) {
    parts.push(`c-${cursoId}`);
  }
  if (!parts.length && cursoNombre) {
    parts.push(`n-${cursoNombre}`);
  }

  return parts.length ? parts.join('|') : null;
};

const getAsignacionUniqueKey = (asignacion) => {
  if (!asignacion) {
    return null;
  }

  const baseKey = buildCourseKeyFromAsignacion(asignacion) || '';
  const dia = asignacion.dia_semana != null
    ? String(asignacion.dia_semana).trim().toLowerCase()
    : '';
  const horaInicio = asignacion.hora_inicio ? asignacion.hora_inicio.toString().slice(0, 5) : '';
  const horaFin = asignacion.hora_fin ? asignacion.hora_fin.toString().slice(0, 5) : '';
  const aula = typeof asignacion.aula === 'string' ? asignacion.aula.trim().toLowerCase() : '';
  const seccion = asignacion.seccion || asignacion.grupo || asignacion.seccion_nombre;
  const seccionKey = seccion != null ? String(seccion).trim().toLowerCase() : '';

  const parts = [baseKey, dia, horaInicio, horaFin, aula, seccionKey].filter(Boolean);
  return parts.length ? parts.join('|') : null;
};

const TeacherDashboard = ({
  userInfo,
  activeModule,
  setActiveModule,
  onLogout,
  loading,
  error,
  success,
  setError,
  setSuccess,
  usuarios,
  clases,
  asistencias,
  calificaciones,
  asignaciones,
  token,
  showError,
  showSuccess,
  fetchAsistenciasDocente,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { isDark: darkMode, toggleTheme, highContrast, toggleHighContrast } = useTheme();

  // Estados para módulo de asistencias rediseñado
  const [selectedCurso, setSelectedCurso] = useState(null);
  const [selectedFecha, setSelectedFecha] = useState(formatDateKey(new Date()) || '');
  const [asistenciasDelDia, setAsistenciasDelDia] = useState({});
  const [submittingAsistencia, setSubmittingAsistencia] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false); // true = editar día completo
  // eslint-disable-next-line no-unused-vars
  const [horariosPorCurso, setHorariosPorCurso] = useState({}); // Horarios de cada curso
  const [fechasClasePorCurso, setFechasClasePorCurso] = useState({}); // Fechas generadas para cada curso
  const [filtroEstudiantes, setFiltroEstudiantes] = useState('');
  const [edicionActivaPorEstudiante, setEdicionActivaPorEstudiante] = useState({});
  const [estadisticasPorCurso, setEstadisticasPorCurso] = useState({});
  const [showAsistenciaModal, setShowAsistenciaModal] = useState(false);
  const [asistenciasOriginales, setAsistenciasOriginales] = useState({});
  const [exportingAttendanceExcel, setExportingAttendanceExcel] = useState(false);
  const [exportingAttendancePdf, setExportingAttendancePdf] = useState(false);

  const docenteId = useMemo(() => {
    const candidateIds = [
      userInfo?.usuario_id,
      userInfo?.profesor_id,
      userInfo?.docente_id,
      userInfo?.id,
    ];

    for (const candidate of candidateIds) {
      if (candidate == null) {
        continue;
      }
      const numeric = Number(candidate);
      if (!Number.isNaN(numeric)) {
        return numeric;
      }
    }

    return null;
  }, [userInfo]);

  const palette = useMemo(() => {
    const baseLight = {
      background: '#f8fafc',
      surface: '#ffffff',
      border: 'rgba(15, 23, 42, 0.12)',
      text: '#0f172a',
      muted: '#64748b',
      primary: '#2563eb',
      success: '#16a34a',
      warning: '#f59e0b',
      danger: '#dc2626',
      accent: '#7c3aed',
    };

    const baseDark = {
      background: '#0f172a',
      surface: '#1e293b',
      border: 'rgba(148, 163, 184, 0.35)',
      text: '#f8fafc',
      muted: '#cbd5f5',
      primary: '#3b82f6',
      success: '#22c55e',
      warning: '#fbbf24',
      danger: '#f87171',
      accent: '#a855f7',
    };

    const working = darkMode ? baseDark : baseLight;

    if (highContrast) {
      return {
        ...working,
        border: darkMode ? '#f8fafc' : '#0f172a',
        text: darkMode ? '#ffffff' : '#000000',
        muted: darkMode ? '#e2e8f0' : '#0f172a',
        primary: '#ffde03',
        success: '#00e676',
        warning: '#ff9100',
        danger: '#ff1744',
        accent: '#2962ff',
      };
    }

    return working;
  }, [darkMode, highContrast]);

  const rolePermissions = useMemo(() => {
    const map = new Map();

    const rawPermissions = userInfo?.permisos;

    if (Array.isArray(rawPermissions)) {
      rawPermissions.forEach((permiso) => {
        if (!permiso) {
          return;
        }
        const key = permiso.modulo || permiso.nombre || permiso.clave;
        if (!key) {
          return;
        }
        map.set(key, {
          puede_ver: Boolean(permiso.puede_ver ?? permiso.ver),
          puede_crear: Boolean(permiso.puede_crear ?? permiso.crear),
          puede_editar: Boolean(permiso.puede_editar ?? permiso.editar),
          puede_eliminar: Boolean(permiso.puede_eliminar ?? permiso.eliminar),
        });
      });
    } else if (rawPermissions && typeof rawPermissions === 'object') {
      Object.entries(rawPermissions).forEach(([key, value]) => {
        if (!key) {
          return;
        }
        if (value && typeof value === 'object') {
          map.set(key, {
            puede_ver: Boolean(value.puede_ver ?? value.ver),
            puede_crear: Boolean(value.puede_crear ?? value.crear),
            puede_editar: Boolean(value.puede_editar ?? value.editar),
            puede_eliminar: Boolean(value.puede_eliminar ?? value.eliminar),
          });
        } else {
          map.set(key, {
            puede_ver: Boolean(value),
            puede_crear: Boolean(value),
            puede_editar: Boolean(value),
            puede_eliminar: Boolean(value),
          });
        }
      });
    } else if (userInfo?.rol) {
      const normalized = String(userInfo.rol).toLowerCase();
      if (normalized === 'profesor' || normalized === 'docente') {
        map.set('export_asistencias', {
          puede_ver: true,
          puede_crear: true,
          puede_editar: false,
          puede_eliminar: false,
        });
      }
    }

    return map;
  }, [userInfo]);
  const loadingRolePermissions = false;

  const asignacionesDocente = useMemo(() => {
    const listado = Array.isArray(asignaciones) ? asignaciones : [];
    if (!listado.length) {
      return [];
    }

    if (docenteId == null) {
      return listado.filter(Boolean);
    }

    return listado.filter((asignacion) => {
      if (!asignacion) {
        return false;
      }

      const rawProfesorId =
        asignacion.profesor_id ??
        asignacion.profesorId ??
        asignacion.docente_id ??
        asignacion.usuario_id ??
        asignacion.usuarioId ??
        null;

      if (rawProfesorId == null) {
        return true;
      }

      const profesorId = Number(rawProfesorId);
      if (Number.isNaN(profesorId)) {
        return true;
      }

      return profesorId === docenteId;
    });
  }, [asignaciones, docenteId]);

  const misAsignacionesUnicas = useMemo(() => {
    if (!Array.isArray(asignacionesDocente) || !asignacionesDocente.length) {
      return [];
    }

    const seen = new Set();
    const unique = [];

    asignacionesDocente.forEach((asignacion, index) => {
      if (!asignacion) {
        return;
      }
      const key = getAsignacionUniqueKey(asignacion) || `row-${index}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      unique.push(asignacion);
    });

    return unique;
  }, [asignacionesDocente]);

  const estudiantesPorCurso = useMemo(() => {
    if (!Array.isArray(asignacionesDocente) || !asignacionesDocente.length) {
      return {};
    }

    const cursos = {};

    const parseDateValue = (value) => {
      if (!value) {
        return null;
      }
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        return null;
      }
      return parsed;
    };

    const registerStudent = (curso, estudianteRaw) => {
      if (!estudianteRaw) {
        return;
      }

      const idCandidate =
        estudianteRaw.id ??
        estudianteRaw.estudiante_id ??
        estudianteRaw.usuario_id ??
        estudianteRaw.codigo;
      const studentId = idCandidate != null && !Number.isNaN(Number(idCandidate))
        ? Number(idCandidate)
        : null;

      const email =
        estudianteRaw.email ??
        estudianteRaw.correo ??
        estudianteRaw.estudiante_email ??
        estudianteRaw.estudiante_correo ??
        null;

      const key =
        studentId != null
          ? `id-${studentId}`
          : email
            ? `email-${String(email).trim().toLowerCase()}`
            : estudianteRaw.nombre
              ? `nombre-${String(estudianteRaw.nombre).trim().toLowerCase()}`
              : null;

      if (key && curso.estudianteIndex.has(key)) {
        return;
      }

      const fechaInicioCurso =
        estudianteRaw.fechaInicioCurso ??
        estudianteRaw.fecha_inicio_curso ??
        estudianteRaw.fecha_inicio ??
        estudianteRaw.fechaInicio ??
        null;
      const fechaFinCurso =
        estudianteRaw.fechaFinCurso ??
        estudianteRaw.fecha_fin_curso ??
        estudianteRaw.fecha_fin ??
        estudianteRaw.fechaFin ??
        null;

      curso.estudiantes.push({
        id: studentId ?? key ?? `tmp-${curso.estudiantes.length + 1}`,
        nombre:
          estudianteRaw.nombre ??
          estudianteRaw.estudiante_nombre ??
          estudianteRaw.fullName ??
          'Estudiante sin nombre',
        email: email ? String(email).trim() : null,
        telefono: estudianteRaw.telefono ?? estudianteRaw.celular ?? estudianteRaw.phone ?? null,
        estado: estudianteRaw.estado ?? estudianteRaw.estatus ?? null,
        fechaInicioCurso: fechaInicioCurso || null,
        fechaFinCurso: fechaFinCurso || null,
      });

      if (key) {
        curso.estudianteIndex.add(key);
      }
    };

    asignacionesDocente.forEach((asignacion, index) => {
      if (!asignacion) {
        return;
      }

      const courseKey =
        buildCourseKeyFromAsignacion(asignacion) ||
        `curso-${asignacion.curso_id ?? asignacion.materia_id ?? index}`;

      if (!cursos[courseKey]) {
        cursos[courseKey] = {
          cursoKey: courseKey,
          cursoId: asignacion.curso_id ?? asignacion.materia_id ?? null,
          cursoNombre:
            asignacion.curso_nombre ??
            asignacion.materia_nombre ??
            asignacion.nombre_curso ??
            'Curso sin nombre',
          seccion: asignacion.seccion ?? asignacion.grupo ?? asignacion.seccion_nombre ?? null,
          fallbackHorarios: [],
          horarioIndex: new Set(),
          asignacionIds: new Set(),
          estudiantes: [],
          estudianteIndex: new Set(),
          fechaInicio: null,
          fechaFin: null,
          asignaciones: [],
        };
      }

      const curso = cursos[courseKey];
      curso.asignaciones.push(asignacion);

      const asignacionId = asignacion.asignacion_id ?? asignacion.id;
      if (asignacionId != null && !Number.isNaN(Number(asignacionId))) {
        curso.asignacionIds.add(Number(asignacionId));
      }

      const startDate =
        asignacion.fecha_inicio ??
        asignacion.fechaInicio ??
        asignacion.fecha_inicio_curso ??
        asignacion.fechaInicioCurso ??
        null;
      const endDate =
        asignacion.fecha_fin ??
        asignacion.fechaFin ??
        asignacion.fecha_fin_curso ??
        asignacion.fechaFinCurso ??
        null;

      const parsedStart = parseDateValue(startDate);
      const parsedEnd = parseDateValue(endDate);

      if (parsedStart && (!curso.fechaInicio || parsedStart < curso.fechaInicio)) {
        curso.fechaInicio = parsedStart;
      }
      if (parsedEnd && (!curso.fechaFin || parsedEnd > curso.fechaFin)) {
        curso.fechaFin = parsedEnd;
      }

      const horarioClave = [
        asignacion.dia_semana ?? asignacion.diaSemana ?? '',
        asignacion.hora_inicio ?? asignacion.horaInicio ?? '',
        asignacion.hora_fin ?? asignacion.horaFin ?? '',
        asignacion.aula ?? asignacion.salon ?? '',
      ]
        .filter(Boolean)
        .map((value) => String(value).trim().toLowerCase())
        .join('|');

      if (horarioClave && !curso.horarioIndex.has(horarioClave)) {
        curso.horarioIndex.add(horarioClave);
        curso.fallbackHorarios.push({
          dia_semana: asignacion.dia_semana ?? asignacion.diaSemana ?? null,
          hora_inicio: asignacion.hora_inicio ?? asignacion.horaInicio ?? null,
          hora_fin: asignacion.hora_fin ?? asignacion.horaFin ?? null,
          aula: asignacion.aula ?? asignacion.salon ?? null,
        });
      }

      const estudiantesAsignacion = [];

      if (Array.isArray(asignacion.estudiantes)) {
        estudiantesAsignacion.push(...asignacion.estudiantes);
      }
      if (Array.isArray(asignacion.listaEstudiantes)) {
        estudiantesAsignacion.push(...asignacion.listaEstudiantes);
      }
      if (!estudiantesAsignacion.length && asignacion.estudiante_id != null) {
        estudiantesAsignacion.push({
          id: asignacion.estudiante_id,
          nombre: asignacion.estudiante_nombre ?? asignacion.estudiante,
          email: asignacion.estudiante_email ?? asignacion.correo_estudiante ?? asignacion.email,
        });
      }

      estudiantesAsignacion.forEach((estudiante) => registerStudent(curso, estudiante));
    });

    return Object.fromEntries(
      Object.entries(cursos).map(([key, curso]) => {
        const estudiantesOrdenados = curso.estudiantes.sort((a, b) =>
          (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' })
        );

        return [
          key,
          {
            cursoKey: curso.cursoKey,
            cursoId: curso.cursoId != null && !Number.isNaN(Number(curso.cursoId))
              ? Number(curso.cursoId)
              : null,
            cursoNombre: curso.cursoNombre,
            seccion: curso.seccion,
            fallbackHorarios: curso.fallbackHorarios,
            asignacionIds: Array.from(curso.asignacionIds),
            estudiantes: estudiantesOrdenados,
            fechaInicio: curso.fechaInicio ? formatDateKey(curso.fechaInicio) : null,
            fechaFin: curso.fechaFin ? formatDateKey(curso.fechaFin) : null,
            asignaciones: curso.asignaciones,
          },
        ];
      })
    );
  }, [asignacionesDocente]);

  const asignaturasUnicas = useMemo(
    () => Object.values(estudiantesPorCurso),
    [estudiantesPorCurso],
  );

  const misAsignaciones = useMemo(() => {
    if (!Object.keys(estudiantesPorCurso).length) {
      return [];
    }

    const estudiantesGlobal = new Map();

    Object.values(estudiantesPorCurso).forEach((curso) => {
      (curso.estudiantes || []).forEach((estudiante, index) => {
        if (!estudiante) {
          return;
        }

        const rawId = estudiante.id;
        const emailKey = estudiante.email ? String(estudiante.email).trim().toLowerCase() : null;
        const key =
          rawId != null && !Number.isNaN(Number(rawId))
            ? `id-${Number(rawId)}`
            : emailKey
              ? `email-${emailKey}`
              : `tmp-${curso.cursoKey}-${index}`;

        if (!estudiantesGlobal.has(key)) {
          estudiantesGlobal.set(key, estudiante);
        }
      });
    });

    return Array.from(estudiantesGlobal.values());
  }, [estudiantesPorCurso]);

  const attendanceOverview = useMemo(() => {
    const cards = [];
    const missingSchedules = [];

    let presentTotal = 0;
    let absentTotal = 0;
    let tardyTotal = 0;
    let registeredTotal = 0;
    let registeredClassCount = 0;
    let upcomingCount = 0;

    const trendRaw = [];
    const today = new Date();
    const asistenciasLista = Array.isArray(asistencias) ? asistencias : [];

    Object.values(estudiantesPorCurso).forEach((cursoInfo) => {
      if (!cursoInfo) {
        return;
      }

      const courseKey = cursoInfo.cursoKey || cursoInfo.cursoNombre;
      const cursoNombre = cursoInfo.cursoNombre || 'Curso sin nombre';
      const estudiantesCurso = Array.isArray(cursoInfo.estudiantes) ? cursoInfo.estudiantes : [];

      const fechasCurso = fechasClasePorCurso[courseKey] || [];
      if (!fechasCurso.length) {
        missingSchedules.push({
          cursoKey: courseKey,
          cursoNombre,
        });
      }

      fechasCurso.forEach((fechaClase) => {
        if (!fechaClase || !fechaClase.fecha) {
          return;
        }

        const fechaClaseDate = new Date(`${fechaClase.fecha}T00:00:00`);
        const totalEstudiantes = estudiantesCurso.length;

        const asistenciasCurso = asistenciasLista.filter((registro) => {
          if (!registro) {
            return false;
          }
          const registroFecha = formatDateKey(registro.fecha);
          if (registroFecha !== fechaClase.fecha) {
            return false;
          }
          if (cursoInfo.cursoId != null && registro.curso_id != null) {
            return Number(registro.curso_id) === Number(cursoInfo.cursoId);
          }
          if (registro.curso_nombre) {
            return registro.curso_nombre.trim().toLowerCase() === cursoNombre.trim().toLowerCase();
          }
          return estudiantesCurso.some((est) => Number(est.id) === Number(registro.estudiante_id));
        });

        const registrosUnicos = getConsolidatedAttendanceArray(asistenciasCurso);
        const registrados = registrosUnicos.length;
        const presentes = registrosUnicos.filter((registro) => registro.estado === 'presente').length;
        const ausentes = registrosUnicos.filter((registro) => registro.estado === 'ausente').length;
        const tardanzas = registrosUnicos.filter((registro) => registro.estado === 'tardanza').length;
        const porcentajeAsistencia =
          totalEstudiantes > 0 ? Number(((presentes / totalEstudiantes) * 100).toFixed(1)) : null;

        const esHoy = fechaClaseDate && today
          ? formatDateKey(fechaClaseDate) === formatDateKey(today)
          : false;
        const esFutura = fechaClaseDate && today ? fechaClaseDate > today : false;

        let status = {
          type: 'missing',
          label: esHoy ? 'Hoy sin registrar' : 'Sin registrar',
          icon: '⚠️',
          accent: palette.danger,
          gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(239, 68, 68, 0.05))',
          caption: 'Registra la asistencia para mantener el control.',
          locked: false,
        };

        if (esFutura) {
          status = {
            type: 'upcoming',
            label: 'Próxima clase',
            icon: '🗓️',
            accent: palette.primary,
            gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.16), rgba(59, 130, 246, 0.05))',
            caption: 'Esta sesión se habilitará en la fecha programada.',
            locked: true,
          };
          upcomingCount += 1;
        } else if (registrados === totalEstudiantes && totalEstudiantes > 0) {
          status = {
            type: 'complete',
            label: 'Completo',
            icon: '✅',
            accent: palette.success,
            gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(16, 185, 129, 0.06))',
            caption: 'La asistencia está al día.',
            locked: false,
          };
        } else if (registrados > 0) {
          status = {
            type: 'partial',
            label: 'En progreso',
            icon: '⏳',
            accent: palette.warning,
            gradient: 'linear-gradient(135deg, rgba(251, 191, 36, 0.22), rgba(251, 191, 36, 0.08))',
            caption: 'Aún faltan estudiantes por registrar.',
            locked: false,
          };
        }

        cards.push({
          key: `${courseKey}-${fechaClase.fecha}`,
          cursoInfo,
          cursoNombre,
          fechaClase,
          stats: {
            totalEstudiantes,
            registrados,
            presentes,
            ausentes,
            tardanzas,
            porcentajeAsistencia,
          },
          status,
        });

        if (registrados > 0) {
          presentTotal += presentes;
          absentTotal += ausentes;
          tardyTotal += tardanzas;
          registeredTotal += registrados;
          registeredClassCount += 1;

          if (porcentajeAsistencia !== null) {
            trendRaw.push({
              dateValue: fechaClaseDate.getTime(),
              percentage: porcentajeAsistencia,
              label: fechaClaseDate.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
              }),
            });
          }
        }
      });
    });

    trendRaw.sort((a, b) => a.dateValue - b.dateValue);
    const trend = trendRaw.slice(-8);

    return {
      cards,
      missingSchedules,
      totals: {
        presentTotal,
        absentTotal,
        tardyTotal,
        registeredTotal,
        classCount: cards.length,
        registeredClassCount,
        upcomingCount,
      },
      trend,
    };
  }, [asistencias, estudiantesPorCurso, fechasClasePorCurso, palette]);

  const averageAttendance = useMemo(() => {
    if (!attendanceOverview.totals.registeredTotal) {
      return null;
    }
    return (attendanceOverview.totals.presentTotal / attendanceOverview.totals.registeredTotal) * 100;
  }, [attendanceOverview]);

  const summaryCards = useMemo(() => {
    return [
      {
        key: 'avg',
        title: 'Promedio de asistencia',
        value:
          averageAttendance != null && !Number.isNaN(averageAttendance)
            ? `${averageAttendance.toFixed(1)}%`
            : '—',
        subtitle:
          attendanceOverview.totals.registeredTotal > 0
            ? `Basado en ${attendanceOverview.totals.registeredTotal} registros`
            : 'Sin registros recientes',
        icon: <FaChartLine size={20} />,
        iconBg: 'rgba(59, 130, 246, 0.18)',
        iconColor: palette.primary,
      },
      {
        key: 'classes',
        title: 'Clases programadas',
        value: attendanceOverview.totals.classCount,
        subtitle: `${attendanceOverview.totals.registeredClassCount} completadas · ${attendanceOverview.totals.upcomingCount} próximas`,
        icon: <FaCalendarAlt size={20} />,
        iconBg: 'rgba(16, 185, 129, 0.16)',
        iconColor: palette.success,
      },
      {
        key: 'balance',
        title: 'Balance de asistencia',
        value: `${attendanceOverview.totals.presentTotal || 0} presentes`,
  subtitle: `${attendanceOverview.totals.absentTotal || 0} ausentes · ${attendanceOverview.totals.tardyTotal || 0} tardanzas`,
        icon: <FaCheckCircle size={20} />,
        iconBg: 'rgba(251, 191, 36, 0.18)',
        iconColor: palette.warning,
        chart: attendanceOverview.trend,
      },
    ];
  }, [attendanceOverview, averageAttendance, palette]);

  const detailedAttendanceByCourse = useMemo(() => {
    return Object.values(estudiantesPorCurso).map((cursoInfo) => {
      const { cursoKey, cursoNombre, estudiantes } = cursoInfo || {};
      const courseKey = cursoKey || cursoNombre;
      const estudiantesCurso = Array.isArray(estudiantes) ? estudiantes : [];

      const asistenciasCurso = Array.isArray(asistencias)
        ? asistencias.filter((a) => estudiantesCurso.some((est) => est.id === a.estudiante_id))
        : [];

      const registrosUnicos = getConsolidatedAttendanceArray(asistenciasCurso);
      const fechasRegistradas = new Set(registrosUnicos.map((registro) => formatDateKey(registro.fecha)).filter(Boolean));

      const resumen = {
        totalClasesRegistradas: fechasRegistradas.size,
        presentesTotales: registrosUnicos.filter((registro) => registro.estado === 'presente').length,
        ausentesTotales: registrosUnicos.filter((registro) => registro.estado === 'ausente').length,
        tardanzasTotales: registrosUnicos.filter((registro) => registro.estado === 'tardanza').length,
      };

      const estudiantesDetallado = estudiantesCurso.map((estudiante) => {
        const asistenciasEstudiante = registrosUnicos.filter((registro) => registro.estudiante_id === estudiante.id);
        const total = asistenciasEstudiante.length;
        const presentes = asistenciasEstudiante.filter((registro) => registro.estado === 'presente').length;
        const ausentes = asistenciasEstudiante.filter((registro) => registro.estado === 'ausente').length;
        const tardanzas = asistenciasEstudiante.filter((registro) => registro.estado === 'tardanza').length;
        const porcentaje = total > 0 ? Number(((presentes / total) * 100).toFixed(1)) : 0;

        const statsBD = estadisticasPorCurso?.[courseKey]?.[estudiante.id];
        const porcentajeBD = statsBD?.porcentaje_asistencia != null && !Number.isNaN(Number(statsBD?.porcentaje_asistencia))
          ? Number(statsBD.porcentaje_asistencia)
          : null;
        const delta = porcentajeBD != null ? Number((porcentajeBD - porcentaje).toFixed(1)) : null;

        let badgeColor = 'success';
        if (porcentaje < 70) badgeColor = 'danger';
        else if (porcentaje < 85) badgeColor = 'warning';

        return {
          id: estudiante.id,
          nombre: estudiante.nombre,
          email: estudiante.email,
          total,
          presentes,
          ausentes,
          tardanzas,
          porcentaje,
          porcentajeBD,
          delta,
          badgeColor,
          ultimaClase: statsBD?.ultima_clase ? new Date(statsBD.ultima_clase) : null,
        };
      });

      const promedioCurso = estudiantesDetallado.length
        ? Number(
            (
              estudiantesDetallado.reduce((acc, estudiante) => acc + estudiante.porcentaje, 0) /
              estudiantesDetallado.length
            ).toFixed(1)
          )
        : null;

      return {
        key: courseKey,
        cursoNombre,
        estudiantes: estudiantesDetallado,
        resumen: {
          ...resumen,
          promedio: promedioCurso,
        },
      };
    });
  }, [asistencias, estudiantesPorCurso, estadisticasPorCurso]);

  const attendanceStatsOverview = useMemo(() => {
    let cursosConEstudiantes = 0;
    let estudiantesTotal = 0;
    let riesgoAlto = 0;
    let riesgoMedio = 0;
    let acumuladoPromedios = 0;
    let cursosConPromedio = 0;

    detailedAttendanceByCourse.forEach((curso) => {
      if (!curso) {
        return;
      }

      if (Array.isArray(curso.estudiantes) && curso.estudiantes.length) {
        cursosConEstudiantes += 1;
        estudiantesTotal += curso.estudiantes.length;

        curso.estudiantes.forEach((estudiante) => {
          if (estudiante == null || typeof estudiante.porcentaje !== 'number') {
            return;
          }

          if (estudiante.porcentaje < 70) {
            riesgoAlto += 1;
          } else if (estudiante.porcentaje < 85) {
            riesgoMedio += 1;
          }
        });
      }

      if (curso.resumen?.promedio != null && !Number.isNaN(curso.resumen.promedio)) {
        acumuladoPromedios += curso.resumen.promedio;
        cursosConPromedio += 1;
      }
    });

    const promedioGeneral = cursosConPromedio
      ? Number((acumuladoPromedios / cursosConPromedio).toFixed(1))
      : null;

    return {
      cursosConEstudiantes,
      estudiantesTotal,
      riesgoAlto,
      riesgoMedio,
      promedioGeneral,
    };
  }, [detailedAttendanceByCourse]);

  const generalAttendanceRows = useMemo(() => {
    const rows = [];

    detailedAttendanceByCourse.forEach((curso) => {
      if (!curso) {
        return;
      }

      const courseName = curso.cursoNombre || curso.key || 'Curso sin nombre';
      const estudiantesCurso = Array.isArray(curso.estudiantes) ? curso.estudiantes : [];

      estudiantesCurso.forEach((estudiante) => {
        if (!estudiante) {
          return;
        }

        const keyParts = [courseName, estudiante.id, estudiante.email, estudiante.nombre]
          .filter(Boolean)
          .map(String);

        rows.push({
          key: keyParts.length ? keyParts.join('|') : `${courseName}|fila-${rows.length + 1}`,
          curso: courseName,
          estudiante: estudiante.nombre || 'Estudiante sin nombre',
          correo: estudiante.email || '—',
          clasesRegistradas: estudiante.total ?? 0,
          presentes: estudiante.presentes ?? 0,
          ausentes: estudiante.ausentes ?? 0,
          tardanzas: estudiante.tardanzas ?? 0,
          porcentaje: estudiante.total ? Number(estudiante.porcentaje) : null,
          ultimaClase: estudiante.ultimaClase || null,
        });
      });
    });

    rows.sort((a, b) => {
      const cursoA = a.curso || '';
      const cursoB = b.curso || '';
      const compareCurso = cursoA.localeCompare(cursoB, 'es', { sensitivity: 'base' });
      if (compareCurso !== 0) {
        return compareCurso;
      }
      return (a.estudiante || '').localeCompare(b.estudiante || '', 'es', { sensitivity: 'base' });
    });

    return rows;
  }, [detailedAttendanceByCourse]);

  const generalReportTimestamp = useMemo(() => {
    if (!generalAttendanceRows.length) {
      return '';
    }

    return new Date().toLocaleString('es-PE', {
      dateStyle: 'long',
      timeStyle: 'short',
    });
  }, [generalAttendanceRows.length]);

  const attendanceStableCount = Math.max(
    0,
    attendanceStatsOverview.estudiantesTotal -
      attendanceStatsOverview.riesgoAlto -
      attendanceStatsOverview.riesgoMedio,
  );

  const attendancePendingCourses = Math.max(
    0,
    detailedAttendanceByCourse.length - attendanceStatsOverview.cursosConEstudiantes,
  );

  const canExportAttendanceExcel = useMemo(() => {
    if (userInfo?.rol === 'admin' || userInfo?.rol === 'administrativo') {
      return true;
    }
    if (!rolePermissions || typeof rolePermissions.get !== 'function') {
      return false;
    }
    const permiso = rolePermissions.get('export_asistencias');
    if (!permiso) {
      return false;
    }
    return Boolean(
      permiso.puede_ver ||
      permiso.puede_crear ||
      permiso.puede_editar ||
      permiso.puede_eliminar,
    );
  }, [rolePermissions, userInfo]);

  const handleExportAttendanceExcel = useCallback(async () => {
    if (!canExportAttendanceExcel) {
      showError && showError('No tienes permiso para exportar asistencias');
      return;
    }

    if (!token) {
      showError && showError('Sesión no encontrada, vuelve a iniciar sesión e inténtalo otra vez');
      return;
    }

    setExportingAttendanceExcel(true);

    try {
      const { data } = await axios.get(`${REGISTRY_BASE}/api/reports/asistencias/raw`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const columns = Array.isArray(data?.columns) && data.columns.length
        ? data.columns
        : DEFAULT_ATTENDANCE_REPORT_COLUMNS;

      const rows = Array.isArray(data?.rows) ? data.rows : [];
      if (!rows.length) {
        showError && showError('No hay datos de asistencia para exportar');
        return;
      }

      const generatedBy = data?.generatedBy || {
        nombre: userInfo?.nombre || 'Docente',
        rol: userInfo?.rol || 'Docente',
      };
      const generatedAt = data?.generatedAt ? new Date(data.generatedAt) : new Date();

      const workbook = new ExcelJS.Workbook();
      workbook.creator = generatedBy.nombre;
      workbook.created = generatedAt;

      const sheet = workbook.addWorksheet('Asistencias', {
        properties: { defaultRowHeight: 20 },
        pageSetup: { orientation: 'landscape', paperSize: 9 },
      });

      const columnDefinitions = columns.map((col) => ({
        header: col.label,
        key: col.key,
        width: Math.max(Math.round((col.width || 80) / 6), 12),
      }));

      sheet.mergeCells(1, 1, 1, columnDefinitions.length);
      const titleCell = sheet.getCell(1, 1);
      titleCell.value = 'Reporte de Asistencias';
      titleCell.font = { name: 'Poppins', size: 16, bold: true, color: { argb: 'FF123B67' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.getRow(1).height = 26;

      sheet.mergeCells(2, 1, 2, columnDefinitions.length);
      const metaCell = sheet.getCell(2, 1);
      metaCell.value = `Generado por: ${generatedBy.nombre} (${generatedBy.rol}) · ${generatedAt.toLocaleString('es-PE')}`;
      metaCell.font = { name: 'Inter', size: 11, color: { argb: 'FF334155' } };
      metaCell.alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.getRow(2).height = 20;

      sheet.addRow([]);

      sheet.columns = columnDefinitions;

      const headerRowIndex = 4;
      const headerRow = sheet.getRow(headerRowIndex);
      headerRow.font = { name: 'Inter', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF123B67' } };
      headerRow.height = 22;

      const headerBorder = {
        top: { style: 'thin', color: { argb: 'FF0F1F35' } },
        bottom: { style: 'thin', color: { argb: 'FF0F1F35' } },
        left: { style: 'thin', color: { argb: 'FF0F1F35' } },
        right: { style: 'thin', color: { argb: 'FF0F1F35' } },
      };

      columnDefinitions.forEach((col, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = col.header;
        cell.border = headerBorder;
      });

      const baseBorder = {
        top: { style: 'hair', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } },
        left: { style: 'hair', color: { argb: 'FFE2E8F0' } },
        right: { style: 'hair', color: { argb: 'FFE2E8F0' } },
      };

      rows.forEach((item, rowIndex) => {
        const row = sheet.getRow(headerRowIndex + 1 + rowIndex);
        row.height = 20;

        columnDefinitions.forEach((col, columnIndex) => {
          const cell = row.getCell(columnIndex + 1);
          const value = item?.[col.key];
          cell.value = value != null && value !== '' ? value : '—';
          cell.font = { name: 'Inter', size: 10, color: { argb: 'FF0F172A' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          cell.border = baseBorder;

          if (rowIndex % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          }
        });
      });

      sheet.views = [{ state: 'frozen', ySplit: headerRowIndex }];

      const fileDate = formatDateKey(generatedAt) || generatedAt.toISOString().slice(0, 10);
      const safeName = (userInfo?.nombre || 'docente')
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, '_')
        .replace(/^_|_$/g, '');
      const filename = `reporte_asistencias_${safeName || 'docente'}_${fileDate}.xlsx`;

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      saveAs(blob, filename);
      showSuccess && showSuccess('Reporte de asistencias exportado correctamente');
    } catch (error) {
      console.error('Error exportando reporte de asistencias:', error);
      const message = error?.response?.data?.error || 'No se pudo generar el Excel de asistencias';
      showError && showError(message);
    } finally {
      setExportingAttendanceExcel(false);
    }
  }, [canExportAttendanceExcel, token, showError, showSuccess, userInfo]);

  const handleExportAttendancePdf = useCallback(async () => {
    if (!canExportAttendanceExcel) {
      showError && showError('No tienes permiso para exportar asistencias');
      return;
    }

    if (!token) {
      showError && showError('Sesión no encontrada, vuelve a iniciar sesión e inténtalo otra vez');
      return;
    }

    setExportingAttendancePdf(true);

    try {
      const response = await axios.get(`${REGISTRY_BASE}/api/reports/asistencias/docente.pdf`, {
        responseType: 'blob',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/pdf',
        },
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const fileDate = new Date().toISOString().slice(0, 10);
      const safeName = (userInfo?.nombre || 'docente')
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, '_')
        .replace(/^_|_$/g, '');
      const filename = `reporte_asistencias_${safeName || 'docente'}_${fileDate}.pdf`;
      saveAs(blob, filename);
      showSuccess && showSuccess('Reporte de asistencias en PDF descargado correctamente');
    } catch (error) {
      console.error('Error descargando reporte PDF de asistencias:', error);
      const message = error?.response?.data?.error || 'No se pudo generar el PDF de asistencias';
      showError && showError(message);
    } finally {
      setExportingAttendancePdf(false);
    }
  }, [canExportAttendanceExcel, token, showError, showSuccess, userInfo]);

  const estudiantesCursoSeleccionado = useMemo(() => {
    if (!selectedCurso) {
      return [];
    }

    const key = selectedCurso.cursoKey || selectedCurso.nombre;
    const cursoInfo = estudiantesPorCurso[key];
    if (!cursoInfo || !Array.isArray(cursoInfo.estudiantes)) {
      return [];
    }

    return cursoInfo.estudiantes;
  }, [selectedCurso, estudiantesPorCurso]);

  const estudiantesFiltradosModal = useMemo(() => {
    const term = filtroEstudiantes.trim().toLowerCase();
    if (!term) {
      return estudiantesCursoSeleccionado;
    }

    return estudiantesCursoSeleccionado.filter((est) => {
      const nombre = (est.nombre || '').toLowerCase();
      const email = (est.email || '').toLowerCase();
      return nombre.includes(term) || email.includes(term);
    });
  }, [estudiantesCursoSeleccionado, filtroEstudiantes]);

  // Menu items para docente
  const menuItems = [
    {
      category: 'Principal',
      items: [
        { id: 'dashboard', label: 'Panel Principal', icon: FaHome, module: null },
        { id: 'cursos-asignados', label: 'Mis Cursos', icon: FaBook, module: 'cursos-asignados' },
      ]
    },
    {
      category: 'Gestión',
      items: [
        { id: 'asistencias', label: 'Asistencias', icon: FaClipboardCheck, module: 'asistencias' },
        { id: 'estadisticas', label: 'Estadísticas', icon: FaChartLine, module: 'estadisticas' },
        { id: 'calificaciones', label: 'Calificaciones', icon: FaTasks, module: 'calificaciones' },
      ]
    },
    {
      category: 'Comunicación',
      items: [
        { id: 'chat', label: 'Mensajería', icon: FaRegBell, module: 'chat' },
        { id: 'configuracion', label: 'Configuración', icon: FaCog, module: 'configuracion' },
      ]
    }
  ];

  const handleModuleChange = useCallback((module) => {
    try {
      setActiveModule(module);
    } catch (err) {
      console.error('Error al cambiar módulo:', err);
      showError && showError('Error al cambiar de módulo');
    }
  }, [setActiveModule, showError]);

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

  // Cargar estadísticas cuando se activa el módulo de asistencias o estadísticas
  useEffect(() => {
    if ((activeModule === 'asistencias' || activeModule === 'estadisticas') && token) {
      Object.values(estudiantesPorCurso).forEach((cursoInfo) => {
        if (!cursoInfo) {
          return;
        }

        cargarEstadisticasCurso(cursoInfo);
        cargarCalendarioCurso(cursoInfo);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModule, token, estudiantesPorCurso]);

  // Funciones para el nuevo módulo de asistencias
  
  // Cargar calendario consolidado de un curso
  const cargarCalendarioCurso = async (cursoInfo) => {
    if (!cursoInfo) {
      return;
    }

    const {
      cursoNombre,
      cursoKey,
      fallbackHorarios,
      asignacionIds,
      fechaInicio,
      fechaFin,
    } = cursoInfo;

    const courseKey = cursoKey || cursoNombre;
    const fallback = Array.isArray(fallbackHorarios) ? fallbackHorarios.filter(Boolean) : [];
    const sesionesMap = new Map();

    if (token && Array.isArray(asignacionIds) && asignacionIds.length) {
      for (const asignacionId of asignacionIds) {
        if (!asignacionId) {
          continue;
        }

        try {
          const response = await axios.get(
            `${ASIGNATION_BASE}/asignaciones/${asignacionId}/calendario`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          const payload = Array.isArray(response.data)
            ? response.data
            : Array.isArray(response.data?.data)
              ? response.data.data
              : [];

          payload.forEach((sesion) => {
            if (!sesion || !sesion.fecha) {
              return;
            }

            const dia = parseDiaSemana(sesion.dia_semana);
            if (!dia) {
              return;
            }

            const fechaSesion = typeof sesion.fecha === 'string'
              ? sesion.fecha.substring(0, 10)
              : formatDateKey(sesion.fecha);
            if (!fechaSesion) {
              return;
            }

            if (fechaInicio && fechaSesion < fechaInicio) {
              return;
            }
            if (fechaFin && fechaSesion > fechaFin) {
              return;
            }

            const horaInicio = sesion.hora_inicio || sesion.horaInicio || null;
            const horaFin = sesion.hora_fin || sesion.horaFin || null;
            const sesionKey = `${fechaSesion}|${horaInicio || ''}|${horaFin || ''}|${dia}`;
            if (sesionesMap.has(sesionKey)) {
              return;
            }

            const diaJs = dia === 7 ? 0 : dia;
            sesionesMap.set(sesionKey, {
              fecha: fechaSesion,
              dia_semana: dia,
              hora_inicio: horaInicio,
              hora_fin: horaFin,
              diaNombre: getDayNameFromJsIndex(diaJs),
              source: sesion.source || 'calendario',
              asignacionId,
            });
          });
        } catch (error) {
          console.error('Error al obtener calendario de la asignación:', error);
        }
      }
    }

    if (sesionesMap.size) {
      const sesionesOrdenadas = Array.from(sesionesMap.values()).sort((a, b) => {
        const diff = new Date(`${a.fecha}T00:00:00`) - new Date(`${b.fecha}T00:00:00`);
        if (diff !== 0) {
          return diff;
        }
        return (a.hora_inicio || '').localeCompare(b.hora_inicio || '');
      });

      setHorariosPorCurso((prev) => ({
        ...prev,
        [courseKey]: sesionesOrdenadas,
      }));

      setFechasClasePorCurso((prev) => ({
        ...prev,
        [courseKey]: sesionesOrdenadas,
      }));
      return;
    }

    if (fallback.length) {
      generarFechasClase(cursoInfo, fallback);
    } else {
      setHorariosPorCurso((prev) => ({
        ...prev,
        [courseKey]: [],
      }));
      setFechasClasePorCurso((prev) => ({
        ...prev,
        [courseKey]: [],
      }));
    }
  };

  // Generar todas las fechas de clase según el horario y fechas del curso
  const generarFechasClase = (cursoInfo, horarios) => {
    if (!cursoInfo) {
      return;
    }

    const { cursoId, cursoNombre, cursoKey, estudiantes, fechaInicio: fechaInicioConfig, fechaFin: fechaFinConfig } = cursoInfo;

    if (!Array.isArray(horarios) || horarios.length === 0) {
      console.warn(`No hay horarios para el curso ${cursoNombre}`);
      setFechasClasePorCurso((prev) => ({
        ...prev,
        [cursoKey || cursoNombre]: [],
      }));
      return;
    }

    const estudiantesCurso = Array.isArray(estudiantes) ? estudiantes : [];
    const fechaInicioAsignada = fechaInicioConfig || estudiantesCurso[0]?.fechaInicioCurso;
    const fechaFinAsignada = fechaFinConfig || estudiantesCurso[0]?.fechaFinCurso;

    const fechaInicio = normalizeDate(fechaInicioAsignada);
    const fechaFin = normalizeDate(fechaFinAsignada);

    if (!fechaInicio || !fechaFin) {
      console.error(`No se encontraron fechas válidas para el curso ${cursoNombre} (ID: ${cursoId})`);
      setFechasClasePorCurso((prev) => ({
        ...prev,
        [cursoKey || cursoNombre]: [],
      }));
      return;
    }

    if (fechaFin < fechaInicio) {
      console.warn(`El rango de fechas es inválido para el curso ${cursoNombre}`);
      setFechasClasePorCurso((prev) => ({
        ...prev,
        [cursoKey || cursoNombre]: [],
      }));
      return;
    }

    const horarioPorDia = new Map();
    horarios.forEach((horario) => {
      const dia = parseDiaSemana(horario.dia_semana);
      if (dia) {
        horarioPorDia.set(dia, {
          ...horario,
          hora_inicio: horario.hora_inicio || horario.horaInicio || null,
          hora_fin: horario.hora_fin || horario.horaFin || null,
        });
      }
    });

    const diasSemana = [...horarioPorDia.keys()];

    if (diasSemana.length === 0) {
      console.warn(`Los horarios del curso ${cursoNombre} no incluyen días válidos`);
      setFechasClasePorCurso((prev) => ({
        ...prev,
        [cursoKey || cursoNombre]: [],
      }));
      return;
    }

    const fechasClase = [];
    const fechaCursor = new Date(fechaInicio);

    while (fechaCursor <= fechaFin) {
      const diaSemanaJS = fechaCursor.getDay();
      const diaSemanaMySQL = diaSemanaJS === 0 ? 7 : diaSemanaJS;

      if (diasSemana.includes(diaSemanaMySQL)) {
        const horario = horarioPorDia.get(diaSemanaMySQL);
        const claveFecha = formatDateKey(fechaCursor);
        if (claveFecha) {
          fechasClase.push({
            fecha: claveFecha,
            dia_semana: diaSemanaMySQL,
            hora_inicio: horario?.hora_inicio || null,
            hora_fin: horario?.hora_fin || null,
            diaNombre: getDayNameFromJsIndex(diaSemanaJS),
          });
        }
      }

      fechaCursor.setDate(fechaCursor.getDate() + 1);
    }

    setFechasClasePorCurso((prev) => ({
      ...prev,
      [cursoKey || cursoNombre]: fechasClase,
    }));

    console.log(`✓ Generadas ${fechasClase.length} fechas de clase para ${cursoNombre}`);
  };
  
  // Cargar estadísticas por estudiante en un curso
  const cargarEstadisticasCurso = async (cursoInfo) => {
    if (!token || !cursoInfo?.cursoId) return;

    const { cursoId, cursoKey, cursoNombre, estudiantes } = cursoInfo;

    try {
      const estudiantesCurso = Array.isArray(estudiantes) ? estudiantes : [];
      const estadisticasTemp = {};

      for (const estudiante of estudiantesCurso) {
        try {
          const response = await axios.get(
            `${ATTENDANCE_BASE}/asistencias/estadisticas/estudiante/${estudiante.id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          const statsCurso = Array.isArray(response.data)
            ? response.data.find((s) => Number(s.curso_id) === Number(cursoId))
            : null;
          if (statsCurso) {
            estadisticasTemp[estudiante.id] = statsCurso;
          }
        } catch (err) {
          console.error(`Error al cargar estadísticas de ${estudiante.nombre}:`, err);
        }
      }

      setEstadisticasPorCurso((prev) => ({
        ...prev,
        [cursoKey || cursoNombre]: estadisticasTemp,
      }));
    } catch (error) {
      console.error('Error al cargar estadísticas del curso:', error);
    }
  };
  
  const handleOpenAsistenciaModal = async (cursoInfo, fecha = selectedFecha) => {
    if (!cursoInfo) {
      showError && showError('No encontramos la información del curso.');
      return;
    }

    const { cursoId, cursoNombre, cursoKey, asignacionIds, estudiantes } = cursoInfo;
    const nombreCurso = cursoNombre || 'Curso sin nombre';

    const fechaNormalizada = formatDateKey(fecha) || formatDateKey(new Date());
    if (!fechaNormalizada) {
      showError && showError('No fue posible determinar la fecha para la asistencia.');
      return;
    }
    setSelectedCurso({
      id: cursoId,
      nombre: nombreCurso,
      cursoKey: cursoKey || cursoNombre,
      asignacionIds: Array.isArray(asignacionIds) ? asignacionIds.slice() : [],
    });
    setSelectedFecha(fechaNormalizada);
    setFiltroEstudiantes('');

    const cursoKeyLookup = cursoKey || cursoNombre;
    if (!fechasClasePorCurso[cursoKeyLookup] || fechasClasePorCurso[cursoKeyLookup].length === 0) {
      await cargarCalendarioCurso(cursoInfo);
    }

    if (cursoId) {
      await cargarEstadisticasCurso(cursoInfo);
    }

    const estudiantesCurso = Array.isArray(estudiantes) ? estudiantes : [];

    const registrosDelDia = Array.isArray(asistencias)
      ? buildAttendanceLookupForDay(asistencias, fechaNormalizada)
      : new Map();

    const asistenciasIniciales = {};
    estudiantesCurso.forEach((est) => {
      const studentKey = Number(est.id);
      const asistenciaExistente = registrosDelDia.get(studentKey) || registrosDelDia.get(est.id);

      asistenciasIniciales[est.id] = {
        estado: asistenciaExistente?.estado || 'presente',
        observaciones: asistenciaExistente?.observaciones || '',
        id: asistenciaExistente?.id || null,
        bloqueado: asistenciaExistente?.bloqueado || false,
      };
    });

    const copiaOriginal = {};
    const estadoEdicionInicial = {};

    Object.keys(asistenciasIniciales).forEach((estudianteId) => {
      copiaOriginal[estudianteId] = { ...asistenciasIniciales[estudianteId] };
      estadoEdicionInicial[estudianteId] = !asistenciasIniciales[estudianteId].id;
    });

    setAsistenciasDelDia(asistenciasIniciales);
    setAsistenciasOriginales(copiaOriginal);
    setEdicionActivaPorEstudiante(estadoEdicionInicial);
    setModoEdicion(Object.values(asistenciasIniciales).some((asistencia) => asistencia.id !== null));
    setShowAsistenciaModal(true);
  };

  const handleCloseAsistenciaModal = () => {
    setShowAsistenciaModal(false);
    setSelectedCurso(null);
    setAsistenciasDelDia({});
    setAsistenciasOriginales({});
    setEdicionActivaPorEstudiante({});
    setModoEdicion(false);
    setFiltroEstudiantes('');
  };

  const handleAsistenciaChange = (estudianteId, field, value) => {
    setAsistenciasDelDia(prev => ({
      ...prev,
      [estudianteId]: {
        ...prev[estudianteId],
        [field]: value
      }
    }));
  };

  const handleMarcarTodos = (estado) => {
    const nuevasAsistencias = {};
    Object.keys(asistenciasDelDia).forEach(estudianteId => {
      const infoActual = asistenciasDelDia[estudianteId];
      const edicionActiva = edicionActivaPorEstudiante[estudianteId];

      if (!infoActual.bloqueado && (!infoActual.id || edicionActiva)) {
        nuevasAsistencias[estudianteId] = {
          ...infoActual,
          estado
        };
      } else {
        nuevasAsistencias[estudianteId] = infoActual;
      }
    });
    setAsistenciasDelDia(nuevasAsistencias);
  };

  const activarEdicionEstudiante = (estudianteId) => {
    setEdicionActivaPorEstudiante((prev) => ({
      ...prev,
      [estudianteId]: true,
    }));
  };

  const cancelarEdicionEstudiante = (estudianteId) => {
    setAsistenciasDelDia((prev) => ({
      ...prev,
      [estudianteId]: {
        ...asistenciasOriginales[estudianteId],
      },
    }));

    setEdicionActivaPorEstudiante((prev) => ({
      ...prev,
      [estudianteId]: false,
    }));
  };

  const puedeModificarAsistencia = (fechaAsistencia) => {
    const fechaObjetivo = normalizeDate(fechaAsistencia);
    const hoy = normalizeDate(new Date());
    if (!fechaObjetivo || !hoy) {
      return false;
    }

    const diasDiferencia = Math.floor((hoy.getTime() - fechaObjetivo.getTime()) / MS_PER_DAY);
    return userInfo.rol === 'administrativo' || diasDiferencia <= 7;
  };

  const handleSubmitAsistencia = async (e) => {
    e.preventDefault();
    if (!selectedCurso || !token) return;

    setSubmittingAsistencia(true);
    const errores = [];
    const exitos = [];
    const registrosActualizados = new Map();

    try {
      const cursoKey = selectedCurso.cursoKey || selectedCurso.nombre;
      const cursoInfo = estudiantesPorCurso[cursoKey];
      const estudiantesCurso = cursoInfo?.estudiantes || [];
      const cursoIdReferencia = cursoInfo?.cursoId || selectedCurso.id || null;
      
      // Verificar si puede modificar
      if (!puedeModificarAsistencia(selectedFecha)) {
        showError('No puedes modificar asistencias con más de 7 días de antigüedad. Contacta a un administrador.');
        setSubmittingAsistencia(false);
        return;
      }

      for (const estudiante of estudiantesCurso) {
        const asistenciaData = asistenciasDelDia[estudiante.id];
        if (!asistenciaData) continue;

        // Si está bloqueado y no es admin, saltar
        if (asistenciaData.bloqueado && userInfo.rol !== 'administrativo') {
          continue;
        }

        const edicionActiva = edicionActivaPorEstudiante[estudiante.id] ?? !asistenciaData.id;

        if (asistenciaData.id && !edicionActiva) {
          continue;
        }

        try {
          if (asistenciaData.id) {
            // Actualizar asistencia existente
            const response = await axios.put(
              `${ATTENDANCE_BASE}/asistencias/${asistenciaData.id}`,
              {
                fecha: selectedFecha,
                estado: asistenciaData.estado,
                observaciones: asistenciaData.observaciones || null,
                modificado_por: userInfo.id,
                estudiante_id: estudiante.id,
                materia_id: estudiante.cursoId ?? cursoIdReferencia,
                asignacion_id: estudiante.asignacionId || null,
                curso_id: estudiante.cursoId ?? cursoIdReferencia,
                curso_nombre: selectedCurso.nombre
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const updated = response?.data?.record;
            if (updated) {
              registrosActualizados.set(estudiante.id, updated);
            }
          } else {
            // Crear nueva asistencia
            const response = await axios.post(
              `${ATTENDANCE_BASE}/asistencias`,
              {
                estudiante_id: estudiante.id,
                estudiante_nombre: estudiante.nombre,
                materia_id: estudiante.cursoId,
                asignacion_id: estudiante.asignacionId,
                profesor_id: estudiante.profesorId || userInfo.id,
                fecha: selectedFecha,
                estado: asistenciaData.estado,
                observaciones: asistenciaData.observaciones || null,
                modificado_por: userInfo.id,
                curso_id: estudiante.cursoId ?? cursoIdReferencia,
                curso_nombre: selectedCurso.nombre
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const created = response?.data;
            if (created) {
              registrosActualizados.set(estudiante.id, created);
            }
          }
          exitos.push(estudiante.nombre);
        } catch (err) {
          console.error(`Error con ${estudiante.nombre}:`, err);
          errores.push(estudiante.nombre);
        }
      }

      if (exitos.length > 0) {
        showSuccess(`Asistencia registrada para ${exitos.length} estudiante(s)`);
      }
      if (errores.length > 0) {
        showError(`Error al registrar ${errores.length} estudiante(s)`);
      }

      if (registrosActualizados.size > 0) {
        setAsistenciasDelDia((prev) => {
          const next = { ...prev };
          registrosActualizados.forEach((record, estudianteId) => {
            next[estudianteId] = {
              estado: record.estado || prev[estudianteId]?.estado || 'presente',
              observaciones: record.observaciones || prev[estudianteId]?.observaciones || '',
              id: record.id || prev[estudianteId]?.id || null,
              bloqueado:
                record.bloqueado != null
                  ? Boolean(record.bloqueado)
                  : Boolean(prev[estudianteId]?.bloqueado),
            };
          });
          return next;
        });

        setAsistenciasOriginales((prev) => {
          const next = { ...prev };
          registrosActualizados.forEach((record, estudianteId) => {
            next[estudianteId] = {
              estado: record.estado || prev[estudianteId]?.estado || 'presente',
              observaciones: record.observaciones || prev[estudianteId]?.observaciones || '',
              id: record.id || prev[estudianteId]?.id || null,
              bloqueado:
                record.bloqueado != null
                  ? Boolean(record.bloqueado)
                  : Boolean(prev[estudianteId]?.bloqueado),
            };
          });
          return next;
        });
      }

      if (typeof fetchAsistenciasDocente === 'function') {
        try {
          await fetchAsistenciasDocente({ fecha: selectedFecha });
        } catch (refreshError) {
          console.error('Error refrescando asistencias del docente:', refreshError);
        }
      }

      handleCloseAsistenciaModal();
    } catch (err) {
      console.error('Error general:', err);
      showError('Error al procesar las asistencias');
    } finally {
      setSubmittingAsistencia(false);
    }
  };

  const getModuleTitle = (module) => {
    const titles = {
      'cursos-asignados': 'Mis Cursos Asignados',
      'asistencias': 'Control de Asistencias',
      'estadisticas': 'Panel de Estadísticas',
      'calificaciones': 'Gestión de Calificaciones',
      'chat': 'Mensajería Interna',
      'configuracion': 'Configuración del Sistema'
    };
    return titles[module] || 'Dashboard del Docente';
  };

  return (
    <>
      <style>{`
        /* ========== ANIMACIONES ========== */
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
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

        /* ========== VARIABLES PARA DOCENTE (VERDE) ========== */
        :root {
          --docente-primary: #10b981;
          --docente-secondary: #059669;
          --docente-dark: #047857;
          --docente-light: #34d399;
        }

        /* ========== DASHBOARD PRINCIPAL ========== */
        .docente-dashboard {
          min-height: 100vh;
          background: var(--bg-secondary);
          color: var(--text-primary);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: fadeIn 0.5s ease-out;
        }

        /* ========== SIDEBAR DOCENTE (VERDE) ========== */
        .docente-sidebar {
          background: linear-gradient(180deg, #059669 0%, #10b981 50%, #059669 100%);
          background-size: 100% 200%;
          border-right: 1px solid rgba(255, 255, 255, 0.1);
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          z-index: 1000;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
          overflow-y: auto;
          overflow-x: hidden;
          animation: slideInLeft 0.5s ease-out;
        }

        .docente-sidebar::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(180deg, 
            rgba(16, 185, 129, 0.1) 0%, 
            rgba(52, 211, 153, 0.05) 50%, 
            rgba(16, 185, 129, 0.1) 100%);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }

        .docente-sidebar:hover::before {
          opacity: 1;
        }

        .sidebar-collapsed {
          width: 80px !important;
        }

        .sidebar-collapsed .nav-text,
        .sidebar-collapsed .category-title,
        .sidebar-collapsed .user-details {
          opacity: 0;
          visibility: hidden;
          width: 0;
          overflow: hidden;
        }

        /* ========== NAVEGACIÓN ========== */
        .category-title {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 24px 0 12px 12px;
          transition: all 0.3s ease;
        }

        .nav-link-docente {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          margin: 4px 0;
          border-radius: 12px;
          color: rgba(255, 255, 255, 0.8);
          text-decoration: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          border: none;
          background: transparent;
          width: 100%;
          position: relative;
          overflow: hidden;
        }

        .nav-link-docente::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: var(--docente-light);
          transform: scaleY(0);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .nav-link-docente:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          transform: translateX(4px);
        }

        .nav-link-docente.active {
          background: rgba(255, 255, 255, 0.15);
          color: white;
          font-weight: 600;
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
        }

        .nav-link-docente.active::before {
          transform: scaleY(1);
        }

        .nav-icon {
          font-size: 18px;
          transition: all 0.3s ease;
          z-index: 1;
        }

        .nav-link-docente:hover .nav-icon {
          transform: scale(1.2) rotate(5deg);
        }

        .nav-link-docente.active .nav-icon {
          transform: scale(1.15);
          filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.6));
        }

        .icon-wrapper {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .nav-text {
          margin-left: 12px;
          white-space: nowrap;
        }

        /* ========== HEADER ========== */
        .docente-header {
          background: var(--bg-primary);
          border-bottom: 1px solid var(--border-color);
          padding: 16px 32px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          position: static;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* ========== TARJETAS ========== */
        .docente-card {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          box-shadow: var(--shadow-md);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          animation: scaleIn 0.5s ease-out;
          position: relative;
          overflow: hidden;
        }

        .docente-card:hover {
          transform: translateY(-4px) scale(1.01);
          box-shadow: var(--shadow-xl);
          border-color: var(--docente-primary);
        }

        /* ========== TARJETAS DE ESTADÍSTICAS ========== */
        .stat-card-docente {
          background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-tertiary) 100%);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 28px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          animation: fadeInUp 0.6s ease-out backwards;
        }

        .stat-card-docente:nth-child(1) { animation-delay: 0.1s; }
        .stat-card-docente:nth-child(2) { animation-delay: 0.2s; }
        .stat-card-docente:nth-child(3) { animation-delay: 0.3s; }
        .stat-card-docente:nth-child(4) { animation-delay: 0.4s; }

        .stat-card-docente::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 5px;
          background: linear-gradient(90deg, var(--docente-primary), var(--docente-light), var(--docente-primary));
          background-size: 200% 100%;
          animation: gradientFlow 3s ease infinite;
        }

        .stat-card-docente:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 32px rgba(16, 185, 129, 0.2);
        }

        /* ========== BOTONES DE ACCIÓN ========== */
        .action-btn-docente {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          border: 2px solid var(--border-color);
          background: var(--bg-secondary);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }

        .action-btn-docente:hover {
          background: var(--bg-tertiary);
          color: var(--docente-primary);
          border-color: var(--docente-primary);
          transform: scale(1.1) translateY(-2px);
          box-shadow: 0 8px 16px rgba(16, 185, 129, 0.2);
        }

        /* ========== BÚSQUEDA ========== */
        .search-input-docente {
          background: var(--bg-secondary);
          border: 2px solid var(--border-color);
          border-radius: 12px;
          padding: 12px 20px 12px 48px;
          color: var(--text-primary);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          width: 320px;
          font-size: 0.95rem;
        }

        .search-input-docente:focus {
          outline: none;
          border-color: var(--docente-primary);
          background: var(--bg-primary);
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.15);
          transform: translateY(-2px);
        }

        /* ========== NOTIFICACIONES ========== */
        .notification {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 1050;
          min-width: 350px;
          border-radius: 16px;
          backdrop-filter: blur(12px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
          animation: slideInRight 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* ========== LOADING ========== */
        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.15);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.3s ease;
        }

        .spinner-docente {
          width: 48px;
          height: 48px;
          border: 4px solid var(--border-color);
          border-top: 4px solid var(--docente-primary);
          border-radius: 50%;
          animation: spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* ========== MENÚ DE USUARIO ========== */
        .user-menu {
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
          background: var(--bg-primary);
          border: 2px solid var(--border-color);
          border-radius: 12px;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
          min-width: 200px;
          z-index: 1000;
          animation: fadeInUp 0.3s ease;
        }

        /* ========== QUICK ACTIONS ========== */
        .quick-action-docente {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }

        .quick-action-docente:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 32px rgba(16, 185, 129, 0.15);
          border-color: var(--docente-primary);
        }

        .alert-success-subtle {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.25);
          color: #047857;
          border-radius: 12px;
          font-size: 0.9rem;
        }

        .alert-secondary-subtle {
          background: rgba(148, 163, 184, 0.15);
          border: 1px solid rgba(148, 163, 184, 0.4);
          color: #334155;
          border-radius: 12px;
          font-size: 0.9rem;
        }

        .badge-soft-success {
          background: rgba(16, 185, 129, 0.1);
          color: #047857;
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 999px;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 0.25rem 0.6rem;
        }

        .badge-soft-secondary {
          background: rgba(148, 163, 184, 0.15);
          color: #475569;
          border: 1px solid rgba(148, 163, 184, 0.35);
          border-radius: 999px;
          font-size: 0.7rem;
          letter-spacing: 0.04em;
          padding: 0.25rem 0.6rem;
        }

        .badge-soft-danger {
          background: rgba(239, 68, 68, 0.12);
          color: #b91c1c;
          border: 1px solid rgba(239, 68, 68, 0.35);
          border-radius: 999px;
          font-size: 0.7rem;
          padding: 0.25rem 0.6rem;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }

        .attendance-toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          background: var(--bg-primary, #ffffff);
          border: 1px solid var(--border-color, rgba(148, 163, 184, 0.3));
          border-radius: 14px;
          padding: 12px 16px;
        }

        .attendance-toolbar__actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .attendance-toolbar__actions .btn {
          border-radius: 999px;
          font-weight: 600;
        }

        .attendance-toolbar__search {
          max-width: 260px;
          min-width: 200px;
        }

        .attendance-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
        }

        .attendance-card {
          border: 1px solid rgba(15, 118, 110, 0.15);
          border-radius: 16px;
          padding: 18px;
          background: linear-gradient(160deg, rgba(16, 185, 129, 0.08), rgba(255, 255, 255, 0.95));
          box-shadow: 0 12px 24px rgba(15, 118, 110, 0.12);
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: relative;
        }

        .attendance-card__header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .attendance-card__identity {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .attendance-card__avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.95rem;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .attendance-card__name {
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--docente-dark);
        }

        .attendance-card__email {
          font-size: 0.8rem;
          color: #64748b;
        }

        .attendance-card__meta {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .attendance-card__body {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .attendance-status-group {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .attendance-state-btn {
          border-radius: 999px !important;
          padding: 0.4rem 0.8rem;
          font-size: 0.8rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          transition: transform 0.2s ease;
        }

        .attendance-state-btn.active,
        .attendance-state-btn:focus {
          transform: translateY(-1px) scale(1.02);
          box-shadow: 0 6px 16px rgba(15, 118, 110, 0.18);
        }

        .attendance-state-btn__icon {
          font-size: 0.85rem;
        }

        .attendance-card textarea {
          border-radius: 12px;
          font-size: 0.85rem;
          border: 1px solid rgba(148, 163, 184, 0.5);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .attendance-card textarea:focus {
          border-color: var(--docente-primary);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25);
        }

        .attendance-card--locked {
          opacity: 0.6;
        }

        .attendance-card--locked::after {
          content: 'Acceso restringido';
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.85rem;
          color: #1f2937;
          background: rgba(148, 163, 184, 0.2);
          border-radius: 16px;
          pointer-events: none;
        }

        .attendance-empty-state {
          grid-column: 1 / -1;
          background: var(--bg-primary, #ffffff);
          border: 1px dashed var(--border-color, rgba(148, 163, 184, 0.3));
          border-radius: 16px;
          padding: 32px;
          text-align: center;
        }

        @media (max-width: 768px) {
          .attendance-toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .attendance-toolbar__search {
            width: 100%;
            max-width: none;
          }

          .attendance-card {
            padding: 16px;
          }

          .attendance-status-group {
            justify-content: space-between;
          }
        }

        /* ========== RESPONSIVE ========== */
        @media (max-width: 1024px) {
          .docente-sidebar {
            transform: translateX(-100%);
            width: 280px !important;
            z-index: 1050;
          }
          
          .docente-sidebar.show {
            transform: translateX(0);
          }
          
          .main-content-wrapper {
            margin-left: 0 !important;
            width: 100vw !important;
            max-width: 100vw !important;
          }
          
          .docente-header {
            padding: 12px 16px !important;
          }
          
          .docente-header .d-flex {
            flex-wrap: wrap;
            gap: 0.75rem;
          }
          
          .search-input-docente {
            width: 140px;
          }
          
          .action-btn-docente,
          .action-btn {
            width: 40px !important;
            height: 40px !important;
            min-width: 40px;
            min-height: 40px;
          }
          
          .stat-card-docente {
            padding: 18px !important;
          }
          
          .stat-card-docente h3 {
            font-size: 1.75rem !important;
          }
        }
        
        @media (max-width: 768px) {
          .docente-header h1 {
            font-size: 1.25rem !important;
          }
          
          .docente-header img {
            height: 35px !important;
          }
          
          .search-input-docente {
            width: 120px;
            font-size: 14px;
          }
          
          .action-btn-docente,
          .action-btn {
            width: 36px !important;
            height: 36px !important;
            min-width: 36px;
            min-height: 36px;
          }
          
          .stat-card-docente {
            padding: 16px !important;
          }
          
          .stat-card-docente h3 {
            font-size: 1.5rem !important;
          }
          
          .docente-card {
            margin-bottom: 12px;
          }
          
          .table-responsive {
            font-size: 14px;
          }
        }
        
        @media (max-width: 480px) {
          .docente-header {
            padding: 10px 12px !important;
          }
          
          .docente-header h1 {
            font-size: 1.1rem !important;
          }
          
          .docente-header img {
            height: 30px !important;
          }
          
          .search-input-docente {
            width: 100px;
            font-size: 13px;
          }
          
          .action-btn-docente,
          .action-btn {
            width: 32px !important;
            height: 32px !important;
          }
          
          .stat-card-docente h3 {
            font-size: 1.35rem !important;
          }
        }
      `}</style>

      <div className="d-flex docente-dashboard">
        {/* Loading */}
        {loading && (
          <div className="loading-overlay">
            <div className="text-center">
              <div className="spinner-docente mb-3"></div>
              <p className="text-muted">Cargando...</p>
            </div>
          </div>
        )}

        {/* Mobile Overlay */}
        {isMobile && mobileSidebarOpen && (
          <div 
            className="mobile-overlay"
            onClick={() => setMobileSidebarOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1040,
              animation: 'fadeIn 0.3s ease'
            }}
          />
        )}

        {/* Sidebar */}
        <nav
          className={`docente-sidebar ${sidebarCollapsed && !isMobile ? 'sidebar-collapsed' : ''} ${isMobile && mobileSidebarOpen ? 'show' : ''}`}
          style={{
            width: (sidebarCollapsed && !isMobile) ? '80px' : '280px'
          }}
        >
          {/* Logo */}
          <div className="p-4 border-bottom" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '80px' }}>
              {sidebarCollapsed ? (
                <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="I.E Peruano Japonés 7213">
                  <img src="./logo.png" alt="Logo" style={{ width: "48px", height: "48px", objectFit: "contain" }} />
                </div>
              ) : (
                <div className="nav-text text-center" style={{ width: '100%' }}>
                  <img src="./logo.png" alt="Logo" style={{ width: "60px", height: "60px", objectFit: "contain", marginBottom: "5px" }} />
                  <h5 className="mb-0 fw-bold" style={{ color: 'white' }}>I.E Peruano Japonés 7213</h5>
                  <small className="text-muted">Panel del Docente</small>
                </div>
              )}
            </div>
          </div>

          {/* Botón de colapsar/expandir */}
          <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <button 
              className="btn btn-link p-0 w-100"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{ 
                color: 'white',
                background: 'rgba(255, 255, 255, 0.1)',
                height: '36px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
              title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            >
              <div style={{ 
                transition: 'transform 0.3s ease',
                transform: sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
              }}>
                <FaChevronLeft size={14} />
              </div>
            </button>
          </div>

          {/* User Info */}
          <div className="p-4 border-bottom" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            <div 
              className="d-flex align-items-center"
              style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
            >
              <div 
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'var(--docente-light)',
                  borderRadius: '50%',
                  color: 'white',
                  marginRight: sidebarCollapsed ? '0' : '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FaChalkboardTeacher size={16} />
              </div>
              {!sidebarCollapsed && (
                <div className="flex-grow-1 user-details">
                  <div className="fw-medium" style={{ color: 'white' }}>{userInfo?.nombre || 'Docente'}</div>
                  <small className="text-muted">{userInfo?.rol || 'Profesor'}</small>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="p-3 flex-grow-1">
            {menuItems.map((category, categoryIndex) => (
              <div key={categoryIndex}>
                {!sidebarCollapsed && (
                  <div className="category-title">{category.category}</div>
                )}
                <ul className="list-unstyled">
                  {category.items.map((item) => (
                    <li key={item.id} className="nav-item">
                      <button
                        className={`nav-link-docente ${
                          (activeModule === item.module || (!activeModule && item.module === null)) 
                            ? 'active' : ''
                        }`}
                        onClick={() => handleModuleChange(item.module)}
                        disabled={loading}
                      >
                        <div className="icon-wrapper">
                          <item.icon size={16} />
                        </div>
                        <span className="nav-text">{item.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Logout */}
          <div className="p-3 border-top" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            <button
              className="nav-link-docente text-danger"
              onClick={onLogout}
              disabled={loading}
            >
              <div className="icon-wrapper">
                <FaSignOutAlt size={16} />
              </div>
              <span className="nav-text">Cerrar sesión</span>
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <main 
          className="flex-grow-1 main-content-wrapper"
          style={{ 
            marginLeft: (sidebarCollapsed && !isMobile) ? '80px' : (isMobile ? '0' : '280px'),
            transition: 'margin-left 0.3s ease',
            width: (sidebarCollapsed && !isMobile) ? 'calc(100vw - 80px)' : (isMobile ? '100vw' : 'calc(100vw - 280px)'),
            maxWidth: isMobile ? '100vw' : undefined,
            overflowX: 'hidden'
          }}
        >
          {/* Header */}
          <div className="docente-header">
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <img src="/logo.png" alt="Logo" className="me-3" style={{height: '45px', width: 'auto'}} />
                <div>
                  <h1 className="h4 mb-1 fw-bold">{getModuleTitle(activeModule)}</h1>
                  <p className="mb-0 text-muted small">
                    {new Date().toLocaleDateString('es-ES', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
              
              <div className="d-flex align-items-center gap-3">
                {!isMobile && (
                  <div 
                    className="action-btn-docente"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
                  >
                    <FaChevronLeft size={16} style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} />
                  </div>
                )}
                
                {isMobile && (
                  <div 
                    className="action-btn-docente"
                    onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                    title="Menú"
                  >
                    <FaBars size={16} />
                  </div>
                )}
                
                <div className="position-relative">
                  <input
                    type="text"
                    className="search-input-docente"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <FaSearch 
                    className="position-absolute" 
                    style={{ left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} 
                    size={14} 
                  />
                </div>
                
                <div className="action-btn-docente">
                  <FaRegBell size={16} />
                </div>
                
                <div className="action-btn-docente">
                  <FaFilter size={16} />
                </div>
                
                <div className="action-btn-docente" onClick={toggleTheme} title={darkMode ? 'Modo claro' : 'Modo oscuro'}>
                  {darkMode ? <FaSun size={16} /> : <FaMoon size={16} />}
                </div>
                
                <div className="action-btn-docente" onClick={toggleHighContrast} title={highContrast ? 'Desactivar alto contraste' : 'Activar alto contraste'}>
                  <FaAdjust size={16} />
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Notifications */}
            {error && (
              <div className="notification">
                <div className="alert alert-danger border-0 shadow mb-0">
                  <div className="d-flex align-items-center">
                    <div className="me-3">
                      <div style={{ width: '32px', height: '32px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FaTimes size={16} />
                      </div>
                    </div>
                    <div className="flex-grow-1">
                      <strong>Error</strong>
                      <div>{error}</div>
                    </div>
                    <button type="button" className="btn-close" onClick={() => setError('')}></button>
                  </div>
                </div>
              </div>
            )}
            
            {success && (
              <div className="notification">
                <div className="alert alert-success border-0 shadow mb-0">
                  <div className="d-flex align-items-center">
                    <div className="me-3">
                      <div style={{ width: '32px', height: '32px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FaCheck size={16} />
                      </div>
                    </div>
                    <div className="flex-grow-1">
                      <strong>Éxito</strong>
                      <div>{success}</div>
                    </div>
                    <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
                  </div>
                </div>
              </div>
            )}

            {/* Dashboard Content */}
            {!activeModule && !loading && (
              <div className="fade-in">
                {/* Stats */}
                <div className="row g-4 mb-4">
                  <div className="col-lg-3 col-md-6">
                    <div className="stat-card-docente">
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <div>
                          <h3 className="h2 mb-0 fw-bold">{asignaturasUnicas.length}</h3>
                          <p className="mb-0 text-muted">Cursos Asignados</p>
                        </div>
                        <div style={{ width: '48px', height: '48px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', color: 'var(--docente-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FaBook size={24} />
                        </div>
                      </div>
                      <div className="text-muted small">
                        <span className="text-success">Activos</span> este periodo
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-lg-3 col-md-6">
                    <div className="stat-card-docente">
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <div>
                          <h3 className="h2 mb-0 fw-bold">{misAsignaciones.length}</h3>
                          <p className="mb-0 text-muted">Estudiantes</p>
                        </div>
                        <div style={{ width: '48px', height: '48px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FaUsers size={24} />
                        </div>
                      </div>
                      <div className="text-muted small">
                        <span className="text-success">Asignados</span> a sus cursos
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-lg-3 col-md-6">
                    <div className="stat-card-docente">
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <div>
                          <h3 className="h2 mb-0 fw-bold">92%</h3>
                          <p className="mb-0 text-muted">Asistencia</p>
                        </div>
                        <div style={{ width: '48px', height: '48px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FaClipboardCheck size={24} />
                        </div>
                      </div>
                      <div className="text-muted small">
                        <span className="text-success">Promedio</span> mensual
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-lg-3 col-md-6">
                    <div className="stat-card-docente">
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <div>
                          <h3 className="h2 mb-0 fw-bold">B+</h3>
                          <p className="mb-0 text-muted">Calificación</p>
                        </div>
                        <div style={{ width: '48px', height: '48px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FaTasks size={24} />
                        </div>
                      </div>
                      <div className="text-muted small">
                        <span className="text-success">Promedio</span> general
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="docente-card p-4">
                  <h5 className="mb-4 fw-bold">Acciones Rápidas</h5>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <div className="quick-action-docente" onClick={() => handleModuleChange('cursos-asignados')}>
                        <div style={{ width: '64px', height: '64px', background: 'var(--docente-primary)', borderRadius: '16px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                          <FaBook size={24} />
                        </div>
                        <h6 className="fw-bold">Ver Mis Cursos</h6>
                        <p className="text-muted small mb-0">Gestionar cursos asignados</p>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="quick-action-docente" onClick={() => handleModuleChange('asistencias')}>
                        <div style={{ width: '64px', height: '64px', background: '#f59e0b', borderRadius: '16px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                          <FaClipboardCheck size={24} />
                        </div>
                        <h6 className="fw-bold">Tomar Asistencia</h6>
                        <p className="text-muted small mb-0">Registrar asistencias</p>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="quick-action-docente" onClick={() => handleModuleChange('calificaciones')}>
                        <div style={{ width: '64px', height: '64px', background: '#8b5cf6', borderRadius: '16px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                          <FaTasks size={24} />
                        </div>
                        <h6 className="fw-bold">Calificaciones</h6>
                        <p className="text-muted small mb-0">Gestionar notas</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Module Content */}
            {activeModule && !loading && (
              <div className="fade-in">
                {activeModule === 'cursos-asignados' && (
                  <div className="docente-card p-4">
                    <MisAsignacionesDocente 
                      asignaciones={misAsignacionesUnicas}
                      loading={loading}
                      error={error}
                      token={token}
                      userInfo={userInfo}
                      showError={showError}
                      showSuccess={showSuccess}
                    />
                  </div>
                )}
                
                {activeModule === 'asistencias' && (
                  <div className="docente-card" style={{ padding: '30px' }}>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <div>
                        <h4 className="mb-1 text-success">
                          <FaClipboardCheck className="me-2" />
                          Control de Asistencias
                        </h4>
                        <p className="text-muted mb-0">
                          Registra la asistencia de tus estudiantes por curso y fecha
                          <span className="badge bg-success ms-2" style={{fontSize: '10px'}}>
                            📊 Estadísticas en tiempo real desde BD
                          </span>
                        </p>
                      </div>
                    </div>

                    {Object.values(estudiantesPorCurso).length === 0 ? (
                      <div className="text-center py-5">
                        <FaBook size={48} className="text-muted mb-3" />
                        <h5>No hay estudiantes asignados</h5>
                        <p className="text-muted">Aún no tienes estudiantes asignados a tus cursos.</p>
                      </div>
                    ) : (
                      <div>
                        {/* Resumen general de todos los cursos */}
                        <div className="alert alert-info mb-4">
                          <div className="d-flex align-items-center">
                            <FaBook className="me-3" size={24} />
                            <div className="flex-grow-1">
                              <strong>Tienes {Object.values(estudiantesPorCurso).length} curso(s) asignado(s)</strong>
                              <div className="small">
                                Las estadísticas se actualizan automáticamente cada vez que registras asistencias
                              </div>
                            </div>
                          </div>
                          <hr className="my-2" />
                          <div className="small">
                            <strong>💡 Cómo funciona:</strong>
                            <ul className="mb-0 mt-2">
                              <li>✅ Cada curso tiene sus días específicos de clase configurados</li>
                              <li>📅 Solo puedes registrar asistencia en los días que corresponde al curso</li>
                              <li>📊 Las estadísticas muestran datos reales de la base de datos (marcados con "✓ BD")</li>
                              <li>🎨 Colores: 🟢 Verde (≥85%), 🟡 Amarillo (70-84%), 🔴 Rojo (&lt;70%)</li>
                              <li>⏰ Puedes editar asistencias de los últimos 7 días</li>
                            </ul>
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="row g-3">
                            {summaryCards.map((card) => (
                              <div key={card.key} className="col-12 col-md-6 col-xl-4">
                                <div
                                  className="h-100"
                                  style={{
                                    position: 'relative',
                                    borderRadius: '20px',
                                    padding: '24px',
                                    background: `linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(249,250,251,0.96) 65%), ${palette.background}`,
                                    border: `1px solid ${palette.border}`,
                                    boxShadow: '0 12px 24px rgba(15, 23, 42, 0.08)',
                                    overflow: 'hidden',
                                  }}
                                >
                                  <div className="d-flex align-items-start justify-content-between">
                                    <div>
                                      <div className="text-uppercase small fw-semibold text-muted mb-2">{card.title}</div>
                                      <div className="h3 mb-0 fw-bold" style={{ color: palette.text }}>{card.value}</div>
                                    </div>
                                    <div
                                      style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '16px',
                                        background: card.iconBg,
                                        color: card.iconColor,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                      }}
                                    >
                                      {card.icon}
                                    </div>
                                  </div>
                                  <div className="text-muted small mt-3">{card.subtitle}</div>
                                  {Array.isArray(card.chart) && card.chart.length > 0 && (
                                    <div className="d-flex flex-wrap gap-2 align-items-center mt-3" style={{ fontSize: '11px' }}>
                                      {card.chart.slice(-4).map((point, index) => {
                                        const key = `${card.key}-trend-${index}`;
                                        const percentage = point?.percentage != null && !Number.isNaN(Number(point.percentage))
                                          ? Number(point.percentage).toFixed(1)
                                          : '—';
                                        return (
                                          <span
                                            key={key}
                                            className="badge"
                                            style={{
                                              background: 'rgba(59, 130, 246, 0.12)',
                                              color: palette.primary,
                                              borderRadius: '999px',
                                              padding: '6px 10px',
                                            }}
                                          >
                                            {point?.label || '—'} · {percentage}%
                                          </span>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {attendanceOverview.missingSchedules.length > 0 && (
                          <div className="alert alert-warning d-flex align-items-start gap-3 mb-4">
                            <FaInfoCircle className="mt-1" />
                            <div>
                              <strong>Horarios pendientes de configurar</strong>
                              <div className="small text-muted mt-1">
                                {attendanceOverview.missingSchedules.map((missing) => missing.cursoNombre).join(', ')}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="row g-4">
                          {attendanceOverview.cards.length === 0 ? (
                            <div className="col-12">
                              <div
                                className="text-center p-5"
                                style={{
                                  borderRadius: '24px',
                                  border: `1px dashed ${palette.border}`,
                                  background: palette.background,
                                }}
                              >
                                <FaClipboardCheck size={40} className="text-muted mb-3" />
                                <h5 className="fw-bold mb-1" style={{ color: palette.text }}>Aún no hay sesiones programadas</h5>
                                <p className="text-muted mb-0">
                                  Cuando se programen clases aparecerán aquí para registrar la asistencia rápidamente.
                                </p>
                              </div>
                            </div>
                          ) : (
                            attendanceOverview.cards.map((card) => {
                              const { cursoInfo, cursoNombre, fechaClase, stats, status } = card;
                              const courseKey = cursoInfo.cursoKey || cursoNombre;
                              const fecha = fechaClase?.fecha ? `${fechaClase.fecha}T00:00:00` : null;
                              const fechaDate = fecha ? new Date(fecha) : null;
                              const fechaLabel = fechaDate
                                ? fechaDate.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })
                                : fechaClase?.fecha || 'Fecha no disponible';
                              const horario = `${fechaClase?.hora_inicio?.substring(0, 5) || '--:--'} · ${fechaClase?.hora_fin?.substring(0, 5) || '--:--'}`;
                              const progress = stats.totalEstudiantes > 0
                                ? Math.min(100, Math.round((stats.registrados / stats.totalEstudiantes) * 100))
                                : 0;
                              const asistencia = stats.porcentajeAsistencia != null && !Number.isNaN(Number(stats.porcentajeAsistencia))
                                ? Number(stats.porcentajeAsistencia).toFixed(1)
                                : null;
                              const locked = Boolean(status.locked);
                              const handleClick = () => {
                                if (!locked) {
                                  handleOpenAsistenciaModal(cursoInfo, fechaClase?.fecha);
                                }
                              };
                              const badgeBg = 'rgba(255, 255, 255, 0.85)';
                              const badgeColor = status.accent;

                              return (
                                <div key={`${courseKey}-${fechaClase?.fecha || 'sin-fecha'}`} className="col-12 col-lg-6 col-xl-4">
                                  <div
                                    role="button"
                                    tabIndex={locked ? -1 : 0}
                                    onClick={handleClick}
                                    onKeyDown={(event) => {
                                      if (!locked && (event.key === 'Enter' || event.key === ' ')) {
                                        event.preventDefault();
                                        handleClick();
                                      }
                                    }}
                                    className="h-100"
                                    style={{
                                      position: 'relative',
                                      borderRadius: '24px',
                                      padding: '28px',
                                      background: '#ffffff',
                                      border: `1px solid ${palette.border}`,
                                      boxShadow: '0 18px 32px rgba(15, 23, 42, 0.12)',
                                      cursor: locked ? 'not-allowed' : 'pointer',
                                      transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                                      overflow: 'hidden',
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!locked) {
                                        e.currentTarget.style.transform = 'translateY(-6px)';
                                        e.currentTarget.style.boxShadow = '0 22px 44px rgba(15, 23, 42, 0.16)';
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.transform = 'translateY(0)';
                                      e.currentTarget.style.boxShadow = '0 18px 32px rgba(15, 23, 42, 0.12)';
                                    }}
                                  >
                                    <div
                                      style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: status.gradient,
                                        opacity: 0.9,
                                        pointerEvents: 'none',
                                      }}
                                    />
                                    <div style={{ position: 'relative', zIndex: 1 }}>
                                      <div className="d-flex align-items-start justify-content-between">
                                        <div>
                                          <span
                                            className="badge fw-semibold"
                                            style={{
                                              background: badgeBg,
                                              color: badgeColor,
                                              borderRadius: '999px',
                                              padding: '6px 12px',
                                              fontSize: '11px',
                                              letterSpacing: '0.4px',
                                            }}
                                          >
                                            {status.icon} {status.label}
                                          </span>
                                          <h5 className="fw-bold mt-3 mb-1" style={{ color: palette.text }}>
                                            {cursoNombre}
                                          </h5>
                                          <div className="text-muted small">
                                            {fechaLabel.toUpperCase()} · {horario}
                                          </div>
                                        </div>
                                        <div
                                          style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '16px',
                                            background: badgeBg,
                                            color: badgeColor,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                          }}
                                        >
                                          <FaClipboardCheck size={20} />
                                        </div>
                                      </div>

                                      <div className="mt-4">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                          <div className="text-muted small">Progreso del registro</div>
                                          <div className="fw-semibold" style={{ color: palette.text }}>
                                            {progress}% {locked && <FaLock className="ms-1" size={12} />}
                                          </div>
                                        </div>
                                        <div
                                          style={{
                                            height: '6px',
                                            borderRadius: '999px',
                                            background: 'rgba(15, 23, 42, 0.1)',
                                            overflow: 'hidden',
                                          }}
                                        >
                                          <div
                                            style={{
                                              width: `${progress}%`,
                                              height: '100%',
                                              background: status.accent,
                                              transition: 'width 0.3s ease',
                                            }}
                                          />
                                        </div>
                                      </div>

                                      <div className="d-flex flex-wrap gap-2 mt-3" style={{ fontSize: '12px' }}>
                                        <span
                                          className="badge"
                                          style={{
                                            background: 'rgba(16, 185, 129, 0.15)',
                                            color: palette.success,
                                            borderRadius: '10px',
                                            padding: '6px 10px',
                                          }}
                                        >
                                          ✅ Presentes: {stats.presentes}
                                        </span>
                                        <span
                                          className="badge"
                                          style={{
                                            background: 'rgba(239, 68, 68, 0.15)',
                                            color: palette.danger,
                                            borderRadius: '10px',
                                            padding: '6px 10px',
                                          }}
                                        >
                                          ❌ Ausentes: {stats.ausentes}
                                        </span>
                                        {stats.tardanzas > 0 && (
                                          <span
                                            className="badge"
                                            style={{
                                              background: 'rgba(251, 191, 36, 0.18)',
                                              color: palette.warning,
                                              borderRadius: '10px',
                                              padding: '6px 10px',
                                            }}
                                          >
                                            ⏰ Tardanzas: {stats.tardanzas}
                                          </span>
                                        )}
                                      </div>

                                      <div className="mt-4 d-flex justify-content-between align-items-end">
                                        <div>
                                          <div className="text-muted small">Resumen</div>
                                          <div className="fw-semibold" style={{ color: palette.text }}>
                                            {stats.registrados}/{stats.totalEstudiantes} estudiantes registrados
                                          </div>
                                          <div className="small text-muted">
                                            {status.caption}
                                          </div>
                                        </div>
                                        <div className="text-end">
                                          <div className="text-muted small">Asistencia</div>
                                          <div className="fw-bold" style={{ color: palette.text }}>
                                            {asistencia != null ? `${asistencia}%` : '—'}
                                          </div>
                                        </div>
                                      </div>

                                      {locked && (
                                        <div className="mt-3 small text-muted d-flex align-items-center">
                                          <FaLock className="me-1" size={12} />
                                          Se habilitará en la fecha programada
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div> {/* Nueva grilla de tarjetas */}

                        <div className="mt-4 text-end">
                          <button
                            className="btn btn-outline-success btn-sm"
                            onClick={() => handleModuleChange('estadisticas')}
                          >
                            <FaChartLine className="me-2" />
                            Ir al Panel de Estadísticas
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeModule === 'estadisticas' && (
                  <div className="docente-card p-4">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
                      <div>
                        <h4 className="mb-1" style={{ color: palette.text }}>
                          <FaChartLine className="me-2 text-success" />
                          Estadísticas de Asistencia
                        </h4>
                        <p className="text-muted mb-0">
                          Seguimiento consolidado por curso con datos sincronizados desde la base de datos
                        </p>
                      </div>
                      <div className="d-flex flex-wrap align-items-center gap-2">
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={() => handleModuleChange('asistencias')}
                        >
                          <FaClipboardCheck className="me-2" />
                          Ir a Control de Asistencias
                        </Button>
                      </div>
                    </div>

                    <div className="row g-4 mb-4">
                      <div className="col-xl-4 col-md-6">
                        <div className="stat-card-docente h-100">
                          <div className="d-flex align-items-center justify-content-between mb-3">
                            <div>
                              <h3 className="h2 mb-0 fw-bold">{formatPercentageDisplay(attendanceStatsOverview.promedioGeneral)}</h3>
                              <p className="mb-0 text-muted">Promedio general</p>
                            </div>
                            <div
                              style={{
                                width: '48px',
                                height: '48px',
                                background: 'rgba(16, 185, 129, 0.16)',
                                borderRadius: '12px',
                                color: palette.success,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <FaChartLine size={24} />
                            </div>
                          </div>
                          <div className="text-muted small">
                            Basado en {attendanceStatsOverview.cursosConEstudiantes || 0} curso(s) con registros recientes
                          </div>
                        </div>
                      </div>

                      <div className="col-xl-4 col-md-6">
                        <div className="stat-card-docente h-100">
                          <div className="d-flex align-items-center justify-content-between mb-3">
                            <div>
                              <h3 className="h2 mb-0 fw-bold">{attendanceStatsOverview.estudiantesTotal}</h3>
                              <p className="mb-0 text-muted">Estudiantes analizados</p>
                            </div>
                            <div
                              style={{
                                width: '48px',
                                height: '48px',
                                background: 'rgba(59, 130, 246, 0.18)',
                                borderRadius: '12px',
                                color: '#3b82f6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <FaUsers size={24} />
                            </div>
                          </div>
                          <div className="d-flex flex-wrap gap-2" style={{ fontSize: '12px' }}>
                            <span className="badge bg-success">🟢 {attendanceStableCount} estables</span>
                            <span className="badge bg-warning text-dark">🟡 {attendanceStatsOverview.riesgoMedio} en alerta</span>
                            <span className="badge bg-danger">🔴 {attendanceStatsOverview.riesgoAlto} críticos</span>
                          </div>
                        </div>
                      </div>

                      <div className="col-xl-4 col-md-6">
                        <div className="stat-card-docente h-100">
                          <div className="d-flex align-items-center justify-content-between mb-3">
                            <div>
                              <h3 className="h2 mb-0 fw-bold">{detailedAttendanceByCourse.length}</h3>
                              <p className="mb-0 text-muted">Cursos monitoreados</p>
                            </div>
                            <div
                              style={{
                                width: '48px',
                                height: '48px',
                                background: 'rgba(251, 191, 36, 0.2)',
                                borderRadius: '12px',
                                color: '#f59e0b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <FaBook size={24} />
                            </div>
                          </div>
                          <div className="text-muted small">
                            {attendanceStatsOverview.cursosConEstudiantes} con estudiantes activos y {attendancePendingCourses} en espera de registros
                          </div>
                        </div>
                      </div>
                    </div>

                    {detailedAttendanceByCourse.length === 0 && (
                      <div className="text-center py-5">
                        <FaChartLine size={48} className="text-muted mb-3" />
                        <h5 className="fw-bold" style={{ color: palette.text }}>Sin estadísticas disponibles todavía</h5>
                        <p className="text-muted mb-0">Registra asistencias para comenzar a visualizar tendencias y alertas por curso.</p>
                      </div>
                    )}

                    {detailedAttendanceByCourse.length > 0 && (
                      <>
                        <div className="general-attendance-report">
                          <div className="gar-header">
                            <div className="gar-brand">
                              <img src="/logo.png" alt="Logo institucional" />
                              <div className="gar-brand-meta">
                                <span className="gar-brand-name">IEE</span>
                                <span className="gar-brand-subtitle">Institución Educativa</span>
                              </div>
                            </div>
                            <h2 className="gar-title">Reporte de Asistencia General</h2>
                            <div className="gar-actions">
                              {canExportAttendanceExcel && (
                                <>
                                  <button
                                    type="button"
                                    className="gar-export-button"
                                    onClick={handleExportAttendancePdf}
                                    disabled={loadingRolePermissions || exportingAttendancePdf}
                                  >
                                    <FaFilePdf />
                                    <span>{exportingAttendancePdf ? 'Generando…' : 'Exportar PDF'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="gar-export-button"
                                    onClick={handleExportAttendanceExcel}
                                    disabled={loadingRolePermissions || exportingAttendanceExcel}
                                  >
                                    <FaFileExcel />
                                    <span>{exportingAttendanceExcel ? 'Generando…' : 'Exportar Excel'}</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="gar-table-wrapper">
                            {generalAttendanceRows.length > 0 ? (
                              <table className="gar-table">
                                <thead>
                                  <tr>
                                    <th className="text-left">Curso</th>
                                    <th className="text-left">Estudiante</th>
                                    <th className="text-left">Correo</th>
                                    <th className="text-center">Clases Registradas</th>
                                    <th className="text-center">Presentes</th>
                                    <th className="text-center">Ausentes</th>
                                    <th className="text-center">Tardanzas</th>
                                    <th className="text-center">% de Asistencia</th>
                                    <th className="text-center">Última Clase</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {generalAttendanceRows.map((row) => {
                                    const porcentajeValue =
                                      typeof row.porcentaje === 'number' && !Number.isNaN(row.porcentaje)
                                        ? Number(row.porcentaje)
                                        : null;
                                    const porcentajeLabel =
                                      porcentajeValue != null ? formatPercentageDisplay(porcentajeValue) : 'Sin datos';
                                    const perfectAttendance =
                                      porcentajeValue != null && Number(porcentajeValue.toFixed(1)) >= 100;
                                    const lastClassDate =
                                      row.ultimaClase instanceof Date
                                        ? row.ultimaClase
                                        : row.ultimaClase
                                        ? new Date(row.ultimaClase)
                                        : null;
                                    const lastClassLabel =
                                      lastClassDate && !Number.isNaN(lastClassDate.getTime())
                                        ? lastClassDate.toLocaleDateString('es-ES', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                          })
                                        : '—';

                                    return (
                                      <tr key={row.key} className={perfectAttendance ? 'highlight-100' : undefined}>
                                        <td className="text-left">{row.curso}</td>
                                        <td className="text-left">{row.estudiante}</td>
                                        <td className="text-left">{row.correo}</td>
                                        <td className="text-center">{row.clasesRegistradas}</td>
                                        <td className="text-center">{row.presentes}</td>
                                        <td className="text-center">{row.ausentes}</td>
                                        <td className="text-center">{row.tardanzas}</td>
                                        <td className="text-center">{porcentajeLabel}</td>
                                        <td className="text-center">{lastClassLabel}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            ) : (
                              <div className="gar-empty-state">No hay registros de asistencia procesados todavía.</div>
                            )}
                          </div>
                          {generalReportTimestamp && (
                            <div className="gar-footer">Generado el {generalReportTimestamp}</div>
                          )}
                        </div>

                        {detailedAttendanceByCourse.map((curso, index) => {
                          if (!curso) {
                            return null;
                          }

                          const courseKey = curso.key || curso.cursoNombre || `curso-${index}`;
                          const estudiantesOrdenados = Array.isArray(curso.estudiantes)
                            ? [...curso.estudiantes].sort((a, b) => {
                                const first = typeof a?.porcentaje === 'number' ? a.porcentaje : -1;
                                const second = typeof b?.porcentaje === 'number' ? b.porcentaje : -1;
                                return first - second;
                              })
                            : [];
                          const courseName = curso.cursoNombre || 'Curso sin nombre';

                          return (
                            <div key={courseKey} className="mb-4">
                              <div
                                className="p-4 rounded-4"
                                style={{
                                  background: 'linear-gradient(145deg, rgba(255,255,255,0.96) 0%, rgba(249,250,251,0.94) 100%)',
                                  border: `1px solid ${palette.border}`,
                                  boxShadow: '0 18px 32px rgba(15, 23, 42, 0.12)',
                                }}
                              >
                                <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
                                  <div>
                                    <span className="badge bg-light text-success border border-success">
                                      <FaBook className="me-1" /> {curso.cursoNombre || 'Curso sin nombre'}
                                    </span>
                                    <div className="mt-2 text-muted small">
                                      {curso.resumen?.totalClasesRegistradas || 0} clase(s) registradas · {curso.estudiantes?.length || 0} estudiante(s) analizados
                                    </div>
                                  </div>
                                  <div className="text-end">
                                    <div className="text-muted small">Promedio del curso</div>
                                    <div className="h4 mb-0 fw-bold" style={{ color: palette.text }}>
                                      {formatPercentageDisplay(curso.resumen?.promedio)}
                                    </div>
                                    <div className="text-muted small">
                                      Tardanzas registradas: {curso.resumen?.tardanzasTotales || 0}
                                    </div>
                                  </div>
                                </div>

                                <div className="d-flex flex-wrap gap-2 mt-3" style={{ fontSize: '12px' }}>
                                  <span className="badge bg-success">Presentes: {curso.resumen?.presentesTotales || 0}</span>
                                  <span className="badge bg-danger">Ausentes: {curso.resumen?.ausentesTotales || 0}</span>
                                  <span className="badge bg-warning text-dark">Tardanzas: {curso.resumen?.tardanzasTotales || 0}</span>
                                  <span className="badge bg-secondary">Sesiones: {curso.resumen?.totalClasesRegistradas || 0}</span>
                                </div>

                                <div className="table-responsive mt-3">
                                  <table className="table table-hover table-sm align-middle mb-0">
                                    <thead className="table-light">
                                      <tr>
                                        <th className="text-left">Curso</th>
                                        <th className="text-left">Estudiante</th>
                                        <th className="text-left">Correo</th>
                                        <th className="text-center">Clases Registradas</th>
                                        <th className="text-center">Presentes</th>
                                        <th className="text-center">Ausentes</th>
                                        <th className="text-center">Tardanzas</th>
                                        <th className="text-center">% de Asistencia</th>
                                        <th className="text-center">Última Clase</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {estudiantesOrdenados.length === 0 ? (
                                        <tr>
                                          <td colSpan={9} className="text-center text-muted py-4">
                                            Aún no hay registros para este curso.
                                          </td>
                                        </tr>
                                      ) : (
                                        estudiantesOrdenados.map((est) => {
                                          if (!est) {
                                            return null;
                                          }

                                          const percentageValue =
                                            typeof est?.porcentaje === 'number' && !Number.isNaN(est.porcentaje)
                                              ? Number(est.porcentaje)
                                              : null;
                                          const isPerfect =
                                            percentageValue != null && Number(percentageValue.toFixed(1)) >= 100;
                                          const percentageLabel =
                                            percentageValue != null
                                              ? formatPercentageDisplay(percentageValue)
                                              : 'Sin datos';
                                          const ultimaClaseDate =
                                            est.ultimaClase instanceof Date
                                              ? est.ultimaClase
                                              : est.ultimaClase
                                              ? new Date(est.ultimaClase)
                                              : null;
                                          const ultimaClaseLabel =
                                            ultimaClaseDate && !Number.isNaN(ultimaClaseDate.getTime())
                                              ? ultimaClaseDate.toLocaleDateString('es-ES', {
                                                  day: '2-digit',
                                                  month: 'short',
                                                  year: 'numeric',
                                                })
                                              : '—';
                                          const badgeClass =
                                            est.badgeColor === 'warning'
                                              ? 'badge bg-warning text-dark'
                                              : `badge bg-${est.badgeColor || 'secondary'}`;

                                          return (
                                            <tr
                                              key={est.id || est.email || est.nombre}
                                              style={isPerfect ? { backgroundColor: 'rgba(209, 250, 229, 0.65)' } : undefined}
                                            >
                                              <td>{courseName}</td>
                                              <td>{est.nombre || 'Estudiante sin nombre'}</td>
                                              <td>{est.email || '—'}</td>
                                              <td className="text-center">{est.total || 0}</td>
                                              <td className="text-center">{est.presentes || 0}</td>
                                              <td className="text-center">{est.ausentes || 0}</td>
                                              <td className="text-center">{est.tardanzas || 0}</td>
                                              <td className="text-center">
                                                <span className={badgeClass}>
                                                  {percentageLabel}
                                                </span>
                                              </td>
                                              <td className="text-center">{ultimaClaseLabel}</td>
                                            </tr>
                                          );
                                        })
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}

                {activeModule === 'calificaciones' && (
                  <div style={{ padding: '10px 0' }}>
                    <CalificacionesPanel
                      cursos={Object.values(estudiantesPorCurso)}
                      asignaciones={misAsignacionesUnicas}
                      docenteNombre={userInfo?.nombre || userInfo?.usuario_nombre || ''}
                      onShowError={showError}
                      onShowSuccess={showSuccess}
                    />
                  </div>
                )}
                  
                {activeModule === 'chat' && (
                  <div style={{ 
                    height: 'calc(100vh - 200px)', 
                    minHeight: '500px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <Chat user={userInfo} token={token} />
                  </div>
                )}
                  
                {activeModule === 'configuracion' && (
                  <div className="docente-card" style={{ padding: '30px' }}>
                    <Configuracion
                      userInfo={userInfo}
                      darkMode={darkMode}
                      toggleTheme={toggleTheme}
                      token={token}
                      showError={showError}
                      showSuccess={showSuccess}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal para registrar asistencia del día completo */}
      <Modal 
        show={showAsistenciaModal} 
        onHide={handleCloseAsistenciaModal}
        size="lg"
        centered
      >
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title>
            <FaClipboardCheck className="me-2" />
            Registrar Asistencia - {selectedCurso?.nombre}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedCurso && (
            <>
              <div className="alert alert-info mb-3">
                <div className="row">
                  <div className="col-md-6">
                    <strong>📚 Curso:</strong> {selectedCurso.nombre}
                  </div>
                  <div className="col-md-6">
                    <strong>📅 Fecha:</strong>
                    <Form.Control
                      type="date"
                      value={selectedFecha}
                      onChange={(e) => setSelectedFecha(e.target.value)}
                      max={formatDateKey(new Date()) || ''}
                      className="d-inline-block ms-2"
                      style={{ width: 'auto' }}
                    />
                  </div>
                </div>
                {!puedeModificarAsistencia(selectedFecha) && (
                  <div className="alert alert-warning mt-2 mb-0">
                    ⚠️ Esta fecha tiene más de 7 días. Solo administradores pueden modificarla.
                  </div>
                )}
              </div>

              <div className="attendance-toolbar mb-3">
                <div className="attendance-toolbar__actions">
                  <strong className="mb-0">Marcar todos:</strong>
                  <div className="btn-group flex-wrap" role="group">
                    <button 
                      type="button" 
                      className="btn btn-sm btn-outline-success"
                      onClick={() => handleMarcarTodos('presente')}
                    >
                      <FaCheck className="me-1" /> Presente
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleMarcarTodos('ausente')}
                    >
                      <FaTimes className="me-1" /> Ausente
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-sm btn-outline-warning"
                      onClick={() => handleMarcarTodos('tardanza')}
                    >
                      ⏰ Tardanza
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-sm btn-outline-info"
                      onClick={() => handleMarcarTodos('justificado')}
                    >
                      📝 Justificado
                    </button>
                  </div>
                </div>
                <Form.Control
                  type="search"
                  placeholder="Buscar estudiante por nombre o correo"
                  value={filtroEstudiantes}
                  onChange={(e) => setFiltroEstudiantes(e.target.value)}
                  className="attendance-toolbar__search"
                />
              </div>

              {modoEdicion ? (
                <div className="alert alert-success-subtle mb-3">
                  Estás editando asistencias ya registradas. Los cambios se guardarán sobre la marca existente del día.
                </div>
              ) : (
                <div className="alert alert-secondary-subtle mb-3">
                  Primer registro del día. Asegúrate de completar el estado de cada estudiante.
                </div>
              )}

              <Form onSubmit={handleSubmitAsistencia}>
                <div className="attendance-grid">
                  {estudiantesFiltradosModal.map((estudiante) => {
                    const asistenciaData = asistenciasDelDia[estudiante.id] || {};
                    const bloqueado = asistenciaData.bloqueado && userInfo.rol !== 'administrativo';
                    const estadoSeleccionado = asistenciaData.estado || 'presente';
                    const iniciales = estudiante.nombre
                      ? estudiante.nombre.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
                      : 'ED';
                    const tieneRegistroPrevio = Boolean(asistenciaData.id);
                    const editando = edicionActivaPorEstudiante[estudiante.id] ?? !tieneRegistroPrevio;
                    const estadoInfo = ATTENDANCE_STATES.find((state) => state.value === estadoSeleccionado);
                    const puedeEditar = !bloqueado && puedeModificarAsistencia(selectedFecha);

                    return (
                      <div
                        key={estudiante.id}
                        className={`attendance-card ${bloqueado ? 'attendance-card--locked' : ''} ${!editando && tieneRegistroPrevio ? 'attendance-card--readonly' : ''}`}
                      >
                        <div className="attendance-card__header">
                          <div className="attendance-card__identity">
                            <div className="attendance-card__avatar">{iniciales}</div>
                            <div>
                              <div className="attendance-card__name">{estudiante.nombre}</div>
                              {estudiante.email && (
                                <div className="attendance-card__email">{estudiante.email}</div>
                              )}
                            </div>
                          </div>
                          <div className="attendance-card__meta">
                            <span className={`badge ${asistenciaData.id ? 'badge-soft-success' : 'badge-soft-secondary'}`}>
                              {asistenciaData.id ? 'Registrado' : 'Nuevo'}
                            </span>
                            {bloqueado && (
                              <span className="badge badge-soft-danger ms-2">
                                <FaLock className="me-1" /> Bloqueado
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="attendance-card__body">
                          {editando || !tieneRegistroPrevio ? (
                            <>
                              {tieneRegistroPrevio && (
                                <div className="alert alert-success-subtle py-2 px-3 mb-3">
                                  Editando asistencia registrada el día seleccionado.
                                </div>
                              )}
                              <div className="attendance-status-group">
                                {ATTENDANCE_STATES.map((state) => (
                                  <React.Fragment key={`${estudiante.id}-${state.value}`}>
                                    <input
                                      type="radio"
                                      className="btn-check"
                                      name={`estado-${estudiante.id}`}
                                      id={`estado-${estudiante.id}-${state.value}`}
                                      autoComplete="off"
                                      checked={estadoSeleccionado === state.value}
                                      onChange={() => handleAsistenciaChange(estudiante.id, 'estado', state.value)}
                                      disabled={bloqueado}
                                    />
                                    <label
                                      className={`btn btn-sm btn-outline-${state.variant} attendance-state-btn${estadoSeleccionado === state.value ? ' active' : ''}`}
                                      htmlFor={`estado-${estudiante.id}-${state.value}`}
                                    >
                                      <span className="attendance-state-btn__icon">{state.icon}</span>
                                      <span>{state.label}</span>
                                    </label>
                                  </React.Fragment>
                                ))}
                              </div>

                              <Form.Control
                                as="textarea"
                                rows={2}
                                maxLength={200}
                                placeholder="Agregar observación (opcional)"
                                value={asistenciaData.observaciones || ''}
                                onChange={(e) => handleAsistenciaChange(estudiante.id, 'observaciones', e.target.value)}
                                disabled={bloqueado}
                              />

                              {tieneRegistroPrevio && puedeEditar && (
                                <div className="d-flex justify-content-end gap-2 mt-2">
                                  <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => cancelarEdicionEstudiante(estudiante.id)}
                                    disabled={submittingAsistencia}
                                  >
                                    Cancelar
                                  </Button>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="attendance-summary">
                              <div className="d-flex align-items-center justify-content-between mb-2">
                                <span className={`badge bg-${estadoInfo?.variant || 'secondary'}`}>
                                  {estadoInfo?.icon} Asistencia: {estadoInfo?.label || estadoSeleccionado}
                                </span>
                                {!puedeEditar && bloqueado && (
                                  <span className="badge bg-danger-subtle text-danger">Bloqueado por antigüedad</span>
                                )}
                              </div>
                              {asistenciaData.observaciones ? (
                                <p className="mb-2 small text-muted">
                                  <strong>Observaciones:</strong> {asistenciaData.observaciones}
                                </p>
                              ) : (
                                <p className="mb-2 small text-muted fst-italic">Sin observaciones registradas.</p>
                              )}
                              <div className="d-flex justify-content-end">
                                {puedeEditar ? (
                                  <Button
                                    variant="outline-success"
                                    size="sm"
                                    onClick={() => activarEdicionEstudiante(estudiante.id)}
                                    disabled={submittingAsistencia}
                                  >
                                    Editar asistencia
                                  </Button>
                                ) : (
                                  <span className="text-muted small">No editable para tu rol/fecha.</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {estudiantesFiltradosModal.length === 0 && (
                    <div className="attendance-empty-state">
                      <p className="mb-1"><strong>No encontramos estudiantes</strong></p>
                      <p className="text-muted mb-0">Ajusta el filtro o verifica la inscripción del curso.</p>
                    </div>
                  )}
                </div>

                <div className="d-flex justify-content-end gap-2 mt-3">
                  <Button 
                    variant="secondary" 
                    onClick={handleCloseAsistenciaModal}
                    disabled={submittingAsistencia}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    variant="success" 
                    type="submit"
                    disabled={submittingAsistencia || !puedeModificarAsistencia(selectedFecha)}
                  >
                    {submittingAsistencia ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <FaCheck className="me-1" />
                        {modoEdicion ? 'Actualizar Asistencias' : 'Guardar Asistencias'}
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
};

export default TeacherDashboard;
