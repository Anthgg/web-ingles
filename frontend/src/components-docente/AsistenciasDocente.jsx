import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  FaCalendarAlt,
  FaCalendarDay,
  FaChalkboardTeacher,
  FaCheck,
  FaClipboardCheck,
  FaClock,
  FaEllipsisH,
  FaSearch,
  FaTimes,
  FaUserGraduate,
  FaUsers,
} from 'react-icons/fa';
import UserAvatar from '../components/UserAvatar';

const ATTENDANCE_BASE = process.env.REACT_APP_ATTENDANCE_BASE_URL || 'http://localhost:3003';
const ATTENDANCE_ENDPOINT = `${ATTENDANCE_BASE}/asistencias`;

const STATE_OPTIONS = [
  { value: 'presente', label: 'Presente', color: '#10b981' },
  { value: 'ausente', label: 'Ausente', color: '#ef4444' },
  { value: 'justificado', label: 'Justificado', color: '#f59e0b' },
];

const DAY_ORDER = {
  lunes: 1,
  martes: 2,
  miércoles: 3,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sábado: 6,
  sabado: 6,
  domingo: 7,
};

const DAY_NAME_TO_JS_INDEX = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miércoles: 3,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sábado: 6,
  sabado: 6,
};

const normalizeDateOnly = (value) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

const buildAsignaciones = (rows = []) => {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const map = new Map();

  rows.forEach((row) => {
    const rawId = row.asignacion_id ?? row.id ?? row.asignacionId ?? row.asignacion;
    if (rawId == null) {
      return;
    }
    const asignacionId = Number(rawId);
    const key = Number.isNaN(asignacionId) ? String(rawId) : asignacionId;

    if (!map.has(key)) {
      map.set(key, {
        asignacion_id: key,
        curso_id: row.curso_id ?? row.materia_id ?? null,
        curso_nombre: row.curso_nombre || row.materia_nombre || row.nombre_curso || 'Curso sin nombre',
        materia_id: row.materia_id ?? row.curso_id ?? null,
        profesor_id: row.profesor_id ?? null,
        profesor_nombre: row.profesor_nombre || '',
        dia_semana: row.dia_semana || '',
        hora_inicio: row.hora_inicio || '',
        hora_fin: row.hora_fin || '',
        aula: row.aula || '',
        max_alumnos: row.max_alumnos ?? null,
        fecha_inicio: row.fecha_inicio || row.fechaInicio || null,
        fecha_fin: row.fecha_fin || row.fechaFin || null,
        estudiantes: [],
      });
    }

    const group = map.get(key);
    const estudianteId = row.estudiante_id ?? row.estudianteId;
    if (estudianteId != null) {
      const normalizedId = Number(estudianteId);
      if (!group.estudiantes.some((est) => est.id === normalizedId)) {
        group.estudiantes.push({
          id: normalizedId,
          nombre: row.estudiante_nombre || row.estudianteName || 'Estudiante sin nombre',
          email: row.estudiante_email || '',
          tieneFoto: row.estudiante_tiene_foto ?? row.tieneFoto ?? false,
        });
      }
    }
  });

  return Array.from(map.values()).sort((a, b) => String(a.curso_nombre).localeCompare(String(b.curso_nombre)));
};

const stripAccents = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const buildCoursesCatalog = (assignments = []) => {
  if (!Array.isArray(assignments) || assignments.length === 0) return [];
  const map = new Map();

  assignments.forEach((assign) => {
    const baseKey = assign.curso_id ?? assign.materia_id ?? assign.asignacion_id;
    const courseKey = baseKey != null ? String(baseKey) : `asig-${assign.asignacion_id}`;
    if (!map.has(courseKey)) {
      map.set(courseKey, {
        courseKey,
        curso_id: assign.curso_id ?? assign.materia_id ?? null,
        curso_nombre: assign.curso_nombre || assign.materia_nombre || 'Curso sin nombre',
        fecha_inicio: assign.fecha_inicio || null,
        fecha_fin: assign.fecha_fin || null,
        horarios: [],
        totalEstudiantes: 0,
      });
    }

    const course = map.get(courseKey);
    const estudiantesCount =
      Array.isArray(assign.estudiantes) && assign.estudiantes.length
        ? assign.estudiantes.length
        : assign.max_alumnos || 0;

    course.totalEstudiantes = Math.max(course.totalEstudiantes, estudiantesCount);
    
    // Update fecha_fin if this assignment has one (use the latest one)
    if (assign.fecha_fin) {
      if (!course.fecha_fin || assign.fecha_fin > course.fecha_fin) {
        course.fecha_fin = assign.fecha_fin;
      }
    }
    if (assign.fecha_inicio) {
      if (!course.fecha_inicio || assign.fecha_inicio < course.fecha_inicio) {
        course.fecha_inicio = assign.fecha_inicio;
      }
    }

    course.horarios.push({
      asignacion_id: assign.asignacion_id,
      dia_semana: assign.dia_semana,
      hora_inicio: assign.hora_inicio,
      hora_fin: assign.hora_fin,
      aula: assign.aula,
    });
  });

  return Array.from(map.values())
    .map((course) => ({
      ...course,
      horarios: course.horarios.sort((a, b) => {
        const dayA = DAY_ORDER[String(a.dia_semana || '').toLowerCase()] || 10;
        const dayB = DAY_ORDER[String(b.dia_semana || '').toLowerCase()] || 10;
        if (dayA !== dayB) return dayA - dayB;
        return String(a.hora_inicio || '').localeCompare(String(b.hora_inicio || ''));
      }),
    }))
    .sort((a, b) => String(a.curso_nombre).localeCompare(String(b.curso_nombre)));
};

const formatDateLocal = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildSessionOptions = (course, rangeDays = 30) => {
  if (!course || !Array.isArray(course.horarios)) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Use fecha_fin as limit if available, otherwise use rangeDays
  let limit;
  if (course.fecha_fin) {
    const fechaFin = new Date(course.fecha_fin);
    fechaFin.setHours(23, 59, 59, 999);
    limit = fechaFin;
  } else {
    limit = new Date(today);
    limit.setDate(limit.getDate() + rangeDays);
  }
  
  const sessions = [];

  course.horarios.forEach((horario) => {
    const dayKey = stripAccents(horario.dia_semana || '');
    const dayIndex = DAY_NAME_TO_JS_INDEX[dayKey];
    if (dayIndex == null) return;
    const cursor = new Date(today);
    const currentDay = cursor.getDay();
    const shift = (dayIndex - currentDay + 7) % 7;
    cursor.setDate(cursor.getDate() + shift);

    while (cursor <= limit) {
      sessions.push({
        asignacion_id: horario.asignacion_id,
        date: formatDateLocal(cursor),
        label: cursor.toLocaleDateString('es-ES', {
          weekday: 'long',
          day: '2-digit',
          month: 'short',
        }),
        hora_inicio: horario.hora_inicio,
        hora_fin: horario.hora_fin,
        aula: horario.aula,
      });
      cursor.setDate(cursor.getDate() + 7);
    }
  });

  return sessions.sort((a, b) => a.date.localeCompare(b.date));
};

const matchesAssignmentDay = (dateString, assignmentDay) => {
  if (!dateString || !assignmentDay) return true;
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return false;
  const targetIndex = DAY_NAME_TO_JS_INDEX[stripAccents(assignmentDay)] ?? null;
  return targetIndex == null || parsed.getDay() === targetIndex;
};

// Helper function to check if a course is still active (not finished)
const isCourseActive = (fechaFin) => {
  if (!fechaFin) return true; // No end date means always active
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(fechaFin);
  endDate.setHours(23, 59, 59, 999);
  return endDate >= today;
};

const DocenteAsistenciasPanel = ({
  asignaciones,
  asistencias,
  token,
  loading,
  loadingAsignaciones,
  fetchAsistenciasDocente,
  showError,
  showSuccess,
  userInfo,
}) => {
  // Fix: Use JSON.stringify to avoid infinite loop if asignaciones reference changes but content is same
  const assignments = useMemo(() => buildAsignaciones(asignaciones), [JSON.stringify(asignaciones)]);
  const allCourses = useMemo(() => buildCoursesCatalog(assignments), [assignments]);
  
  // Filter to show only active courses (fecha_fin >= today or no fecha_fin)
  const courses = useMemo(
    () => allCourses.filter((course) => isCourseActive(course.fecha_fin)),
    [allCourses]
  );
  
  const [selectedCourseKey, setSelectedCourseKey] = useState(null);
  const [selectedAsignacionId, setSelectedAsignacionId] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [attendanceDraft, setAttendanceDraft] = useState({});
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const normalizedSelectedDate = normalizeDateOnly(selectedDate);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.courseKey === selectedCourseKey),
    [courses, selectedCourseKey],
  );

  const sessionOptions = useMemo(
    () => (selectedCourse ? buildSessionOptions(selectedCourse) : []),
    [selectedCourse],
  );

  const selectedAsignacion = useMemo(
    () => assignments.find((item) => String(item.asignacion_id) === String(selectedAsignacionId)),
    [assignments, selectedAsignacionId],
  );

  useEffect(() => {
    if (!courses.length) {
      setSelectedCourseKey(null);
      setSelectedAsignacionId(null);
      setSelectedDate('');
      return;
    }
    if (selectedCourseKey && !courses.some((course) => course.courseKey === selectedCourseKey)) {
      setSelectedCourseKey(null);
      setSelectedAsignacionId(null);
      setSelectedDate('');
    }
  }, [courses, selectedCourseKey]);

  const estudiantesAsignacion = selectedAsignacion?.estudiantes ?? [];

  const attendanceMap = useMemo(() => {
    const map = new Map();
    if (!selectedAsignacion || !selectedDate) return map;
    const normalizedDate = normalizedSelectedDate;
    (asistencias || []).forEach((record) => {
      const recordDate = normalizeDateOnly(record?.fecha);
      const matchesAsignacion =
        (record?.asignacion_id != null &&
          String(record.asignacion_id) === String(selectedAsignacion.asignacion_id)) ||
        (record?.asignacion_id == null &&
          selectedAsignacion.curso_id != null &&
          record?.curso_id != null &&
          Number(record.curso_id) === Number(selectedAsignacion.curso_id));

      if (matchesAsignacion && recordDate && normalizedDate && recordDate === normalizedDate) {
        map.set(Number(record.estudiante_id), {
          id: record.id,
          estado: record.estado || 'ausente',
          observaciones: record.observaciones || '',
        });
      }
    });
    return map;
  }, [JSON.stringify(asistencias), selectedAsignacion, selectedDate]);

  useEffect(() => {
    if (!selectedAsignacion) {
      setAttendanceDraft({});
      return;
    }

    setAttendanceDraft(() => {
      const base = {};
      estudiantesAsignacion.forEach((est) => {
        const existing = attendanceMap.get(est.id);
        base[est.id] = {
          estado: existing?.estado || 'ausente',
          observaciones: existing?.observaciones || '',
          recordId: existing?.id || null,
        };
      });
      return base;
    });
  }, [selectedAsignacion, estudiantesAsignacion, attendanceMap]);

  useEffect(() => {
    if (!sessionOptions.length) {
      setSelectedAsignacionId(null);
      return;
    }
    const exists = sessionOptions.some(
      (session) =>
        String(session.asignacion_id) === String(selectedAsignacionId) && session.date === normalizedSelectedDate,
    );
    if (!exists) {
      const first = sessionOptions[0];
      setSelectedAsignacionId(first.asignacion_id);
      setSelectedDate(first.date);
    }
  }, [sessionOptions, selectedAsignacionId, normalizedSelectedDate]);

  const filteredEstudiantes = useMemo(() => {
    if (!filter) return estudiantesAsignacion;
    const term = filter.toLowerCase();
    return estudiantesAsignacion.filter((est) =>
      [est.nombre, est.email].filter(Boolean).some((value) => value.toLowerCase().includes(term)),
    );
  }, [estudiantesAsignacion, filter]);

  const summary = useMemo(() => {
    const totals = {
      total: estudiantesAsignacion.length,
      presente: 0,
      ausente: 0,
      justificado: 0,
    };
    estudiantesAsignacion.forEach((est) => {
      const estado = attendanceDraft[est.id]?.estado || 'ausente';
      if (totals[estado] != null) {
        totals[estado] += 1;
      }
    });
    return totals;
  }, [estudiantesAsignacion, attendanceDraft]);

  const handleStateChange = (estudianteId, estado) => {
    setAttendanceDraft((prev) => ({
      ...prev,
      [estudianteId]: {
        ...prev[estudianteId],
        estado,
      },
    }));
  };

  const handleObservationChange = (estudianteId, value) => {
    setAttendanceDraft((prev) => ({
      ...prev,
      [estudianteId]: {
        ...prev[estudianteId],
        observaciones: value,
      },
    }));
  };

  const handleBulkState = (estado) => {
    setAttendanceDraft((prev) => {
      const next = { ...prev };
      estudiantesAsignacion.forEach((est) => {
        next[est.id] = {
          ...(next[est.id] || {}),
          estado,
        };
      });
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedCourse || !selectedAsignacion || !selectedDate) {
      showError && showError('Selecciona un curso, un día y una fecha antes de guardar');
      return;
    }

    const diaAsignado = selectedAsignacion?.dia_semana || 'día asignado';
    if (!matchesAssignmentDay(selectedDate, diaAsignado)) {
      showError && showError(`Solo puedes tomar asistencia el ${diaAsignado}. Ajusta la fecha para continuar.`);
      return;
    }

    if (!estudiantesAsignacion.length) {
      showError && showError('No hay estudiantes asignados a este curso');
      return;
    }

    setSaving(true);
    try {
      for (const estudiante of estudiantesAsignacion) {
        const draft = attendanceDraft[estudiante.id];
        const existing = attendanceMap.get(estudiante.id);
        if (!draft) continue;
        const currentEstado = draft.estado || 'ausente';
        const observaciones = draft.observaciones || '';
        if (
          existing &&
          existing.estado === currentEstado &&
          (existing.observaciones || '') === observaciones
        ) {
          continue;
        }

        const payload = {
          estudiante_id: estudiante.id,
          estudiante_nombre: estudiante.nombre,
          estado: currentEstado,
          fecha: selectedDate,
          asignacion_id: selectedAsignacion.asignacion_id,
          profesorId: userInfo?.id,
          curso_id: selectedAsignacion.curso_id,
          curso_nombre: selectedAsignacion.curso_nombre,
          materia_id: selectedAsignacion.materia_id || selectedAsignacion.curso_id,
        };

        if (observaciones) {
          payload.observaciones = observaciones;
        }

        const url = existing ? `${ATTENDANCE_ENDPOINT}/${existing.id}` : ATTENDANCE_ENDPOINT;
        const method = existing ? 'PUT' : 'POST';
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'No se pudo guardar la asistencia');
        }
      }

      showSuccess && showSuccess('Asistencia guardada correctamente');
      await fetchAsistenciasDocente?.({
        asignacionId: selectedAsignacion.asignacion_id,
        desde: selectedDate,
        hasta: selectedDate,
      });
    } catch (error) {
      console.error('Error guardando asistencia del docente:', error);
      showError && showError(error.message || 'Error al guardar la asistencia');
    } finally {
      setSaving(false);
    }
  };

  const noAssignments = !courses.length && !loadingAsignaciones;
  const readyForAttendance = Boolean(selectedAsignacion && selectedDate);
  const invalidDateForClass =
    readyForAttendance && !matchesAssignmentDay(selectedDate, selectedAsignacion?.dia_semana);

  return (
    <section className="docente-attendance-panel">
      <style>{`
        .docente-attendance-panel {
          display: flex;
          flex-direction: column;
          gap: 28px;
          animation: fadeInPanel 0.5s ease-out;
        }

        @keyframes fadeInPanel {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.4); }
          50% { box-shadow: 0 0 20px 5px rgba(56, 189, 248, 0.2); }
        }

        .dap-section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .dap-section-icon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(99, 102, 241, 0.15) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #38bdf8;
        }

        .dap-section-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #f8fafc;
          margin: 0;
        }

        .dap-section-subtitle {
          font-size: 0.8rem;
          color: rgba(148, 163, 184, 0.7);
          margin: 0;
        }

        .dap-course-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 18px;
        }

        .course-card {
          border-radius: 22px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(15, 23, 42, 0.6);
          padding: 22px;
          text-align: left;
          color: #f8fafc;
          display: flex;
          flex-direction: column;
          gap: 16px;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          cursor: pointer;
          backdrop-filter: blur(10px);
        }

        .course-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #38bdf8 0%, #6366f1 50%, #a855f7 100%);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s ease;
        }

        .course-card:hover {
          transform: translateY(-5px);
          border-color: rgba(56, 189, 248, 0.4);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
        }

        .course-card:hover::before {
          transform: scaleX(1);
        }

        .course-card.active {
          border-color: #38bdf8;
          box-shadow: 0 16px 35px rgba(56, 189, 248, 0.15);
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%);
        }

        .course-card.active::before {
          transform: scaleX(1);
        }

        .course-card-header {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .course-card-icon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(99, 102, 241, 0.12) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #38bdf8;
          flex-shrink: 0;
          transition: all 0.3s ease;
        }

        .course-card:hover .course-card-icon {
          transform: scale(1.08);
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.3) 0%, rgba(99, 102, 241, 0.2) 100%);
        }

        .course-card-info {
          flex: 1;
          min-width: 0;
        }

        .course-card-info strong {
          display: block;
          font-size: 1.05rem;
          font-weight: 700;
          margin-bottom: 6px;
          color: #f8fafc;
        }

        .course-card-meta {
          display: flex;
          gap: 14px;
          color: rgba(148, 163, 184, 0.8);
          font-size: 0.82rem;
          flex-wrap: wrap;
        }

        .course-card-meta span {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .course-days {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-top: 12px;
          border-top: 1px dashed rgba(255, 255, 255, 0.08);
        }

        .course-day-item {
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(226, 232, 240, 0.8);
          font-size: 0.88rem;
          padding: 8px 12px;
          background: rgba(15, 23, 42, 0.4);
          border-radius: 10px;
          transition: all 0.2s ease;
        }

        .course-day-item:hover {
          background: rgba(56, 189, 248, 0.08);
        }

        .course-day-item svg {
          color: #38bdf8;
        }

        .dap-schedule-selector {
          background: rgba(15, 23, 42, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 22px;
          padding: 24px;
          backdrop-filter: blur(10px);
        }

        .dap-schedule-grid {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 16px;
        }

        .schedule-chip {
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(15, 23, 42, 0.5);
          padding: 14px 20px;
          color: #f8fafc;
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 0.88rem;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .schedule-chip:hover {
          border-color: rgba(56, 189, 248, 0.4);
          transform: translateY(-2px);
        }

        .schedule-chip.active {
          border-color: #38bdf8;
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(99, 102, 241, 0.08) 100%);
          box-shadow: 0 8px 25px rgba(56, 189, 248, 0.15);
        }

        .schedule-chip strong {
          font-size: 0.95rem;
        }

        .schedule-chip small {
          color: rgba(148, 163, 184, 0.7);
        }

        .dap-toolbar {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 18px;
        }

        .dap-sessions {
          background: rgba(15, 23, 42, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 22px;
          padding: 24px;
          backdrop-filter: blur(10px);
        }

        .session-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 14px;
          margin-top: 16px;
        }

        .session-chip {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(15, 23, 42, 0.5);
          padding: 18px;
          color: #f8fafc;
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 6px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
        }

        .session-chip::after {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 0;
          background: #38bdf8;
          border-radius: 0 3px 3px 0;
          transition: height 0.3s ease;
        }

        .session-chip:hover {
          transform: translateY(-3px);
          border-color: rgba(56, 189, 248, 0.35);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2);
        }

        .session-chip:hover::after {
          height: 50%;
        }

        .session-chip.active {
          border-color: #38bdf8;
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(15, 23, 42, 0.7) 100%);
          box-shadow: 0 10px 30px rgba(56, 189, 248, 0.12);
        }

        .session-chip.active::after {
          height: 60%;
        }

        .session-chip strong {
          text-transform: capitalize;
          font-size: 0.95rem;
        }

        .session-chip small {
          color: rgba(148, 163, 184, 0.7);
          font-size: 0.78rem;
        }

        .dap-tile {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 20px;
          padding: 22px;
          backdrop-filter: blur(10px);
        }

        .dap-label {
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: rgba(148, 163, 184, 0.7);
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .dap-label svg {
          color: #38bdf8;
        }

        .dap-select,
        .dap-input {
          width: 100%;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(15, 23, 42, 0.7);
          color: #f7fafc;
          padding: 14px 16px;
          font-size: 0.95rem;
          transition: all 0.2s ease;
        }

        .dap-input:focus {
          border-color: rgba(56, 189, 248, 0.5);
          outline: none;
          box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.1);
        }

        .dap-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .dap-summary-card {
          border-radius: 16px;
          padding: 16px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(15, 23, 42, 0.5);
          text-align: center;
          transition: all 0.3s ease;
        }

        .dap-summary-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.12);
        }

        .dap-summary-card strong {
          font-size: 2rem;
          font-weight: 800;
          display: block;
          margin-bottom: 4px;
        }

        .dap-summary-card small {
          font-size: 0.8rem;
          font-weight: 600;
        }

        .dap-table-wrapper {
          background: rgba(15, 23, 42, 0.6);
          border-radius: 22px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 20px;
          overflow-x: auto;
          backdrop-filter: blur(10px);
        }

        .dap-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          min-width: 680px;
        }

        .dap-table th {
          text-align: left;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(148, 163, 184, 0.7);
          padding: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(15, 23, 42, 0.3);
        }

        .dap-table th:first-child {
          border-radius: 12px 0 0 0;
        }

        .dap-table th:last-child {
          border-radius: 0 12px 0 0;
        }

        .dap-table td {
          padding: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          transition: background 0.2s ease;
        }

        .dap-table tbody tr:hover td {
          background: rgba(56, 189, 248, 0.04);
        }

        .dap-table tbody tr:last-child td {
          border-bottom: none;
        }

        .dap-observacion {
          width: 100%;
          min-width: 200px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(15, 23, 42, 0.5);
          color: #f7fafc;
          padding: 12px 14px;
          font-size: 0.9rem;
          transition: all 0.2s ease;
        }

        .dap-observacion:focus {
          border-color: rgba(56, 189, 248, 0.4);
          outline: none;
          background: rgba(15, 23, 42, 0.7);
        }

        .dap-actions {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          justify-content: flex-end;
          margin-top: 12px;
          padding-top: 20px;
          border-top: 1px dashed rgba(255, 255, 255, 0.08);
        }

        .dap-action-btn {
          border-radius: 14px;
          padding: 14px 24px;
          font-size: 0.85rem;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.08em;
          border: 1px solid transparent;
          background: rgba(15, 23, 42, 0.6);
          color: #f8fafc;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }

        .dap-action-btn:hover:not(:disabled) {
          transform: translateY(-3px);
        }

        .dap-action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .dap-action-btn.light {
          border-color: rgba(34, 197, 94, 0.4);
          color: #4ade80;
        }

        .dap-action-btn.light:hover:not(:disabled) {
          background: rgba(34, 197, 94, 0.12);
          box-shadow: 0 8px 25px rgba(34, 197, 94, 0.15);
        }

        .dap-action-btn.warning {
          border-color: rgba(249, 115, 22, 0.4);
          color: #fb923c;
        }

        .dap-action-btn.warning:hover:not(:disabled) {
          background: rgba(249, 115, 22, 0.12);
          box-shadow: 0 8px 25px rgba(249, 115, 22, 0.15);
        }

        .dap-action-btn.secondary {
          border-color: rgba(148, 163, 184, 0.3);
          color: #94a3b8;
        }

        .dap-action-btn.secondary:hover:not(:disabled) {
          background: rgba(148, 163, 184, 0.1);
          box-shadow: 0 8px 25px rgba(148, 163, 184, 0.1);
        }

        .dap-action-btn.primary {
          background: linear-gradient(135deg, #38bdf8 0%, #6366f1 100%);
          border: none;
          color: #0f172a;
          font-weight: 800;
          box-shadow: 0 8px 25px rgba(56, 189, 248, 0.25);
        }

        .dap-action-btn.primary:hover:not(:disabled) {
          box-shadow: 0 12px 35px rgba(56, 189, 248, 0.35);
          transform: translateY(-3px);
        }

        .dap-empty {
          padding: 50px 30px;
          text-align: center;
          color: rgba(148, 163, 184, 0.7);
          background: rgba(15, 23, 42, 0.4);
          border-radius: 20px;
          border: 1px dashed rgba(255, 255, 255, 0.1);
        }

        .dap-empty p {
          font-size: 1rem;
          margin-bottom: 8px;
          color: rgba(226, 232, 240, 0.9);
        }

        .dap-empty small {
          font-size: 0.85rem;
          color: rgba(148, 163, 184, 0.6);
        }

        .dap-select-state {
          appearance: none;
          background-color: rgba(15, 23, 42, 0.7);
          border: 2px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 10px 36px 10px 14px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          outline: none;
          transition: all 0.25s ease;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
          background-size: 16px;
        }

        .dap-select-state:hover {
          background-color: rgba(15, 23, 42, 0.9);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .dap-select-state:focus {
          border-color: rgba(56, 189, 248, 0.5);
          box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
        }

        .dap-select-state option {
          background-color: #0f172a;
          color: #f8fafc;
          padding: 10px;
        }

        .student-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .student-avatar {
          width: 38px !important;
          height: 38px !important;
          min-width: 38px !important;
          border-radius: 12px !important;
          flex-shrink: 0;
        }

        .student-info {
          flex: 1;
          min-width: 0;
        }

        .student-name {
          font-weight: 600;
          font-size: 0.95rem;
          color: #f8fafc;
          margin-bottom: 2px;
        }

        .student-email {
          font-size: 0.8rem;
          color: rgba(148, 163, 184, 0.7);
        }

        @media (max-width: 768px) {
          .dap-course-grid {
            grid-template-columns: 1fr;
          }

          .dap-summary {
            grid-template-columns: 1fr;
          }

          .dap-actions {
            flex-direction: column;
          }

          .dap-action-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <div className="dap-section-header">
        <div className="dap-section-icon">
          <FaChalkboardTeacher size={20} />
        </div>
        <div>
          <h3 className="dap-section-title">Selecciona un curso</h3>
          <p className="dap-section-subtitle">Elige el curso para registrar asistencia</p>
        </div>
      </div>
      {courses.length === 0 ? (
        <div className="dap-empty">
          <p className="mb-1">No tienes cursos asignados todavía.</p>
          <small>Cuando tengas cursos podrás registrar la asistencia desde este panel.</small>
        </div>
      ) : (
        <div className="dap-course-grid">
          {courses.map((course) => (
            <button
              key={course.courseKey}
              type="button"
              className={`course-card ${selectedCourseKey === course.courseKey ? 'active' : ''}`}
              onClick={() => {
                setSelectedCourseKey(course.courseKey);
                setSelectedAsignacionId(null);
                setSelectedDate('');
              }}
              disabled={loadingAsignaciones}
            >
              <div className="course-card-header">
                <div className="course-card-icon">
                  <FaClipboardCheck size={18} />
                </div>
                <div>
                  <strong>{course.curso_nombre}</strong>
                  <div className="course-card-meta">
                    <span>
                      <FaCalendarAlt size={12} className="me-1" />
                      {course.horarios.length} {course.horarios.length === 1 ? 'día' : 'días'}
                    </span>
                    <span>
                      <FaUsers size={12} className="me-1" />
                      {course.totalEstudiantes || '0'} estudiantes
                    </span>
                  </div>
                </div>
              </div>
              <div className="course-days">
                {course.horarios.map((horario) => (
                  <div key={horario.asignacion_id} className="course-day-item">
                    <FaClock size={12} />
                    <span>
                      {horario.dia_semana || 'Día no asignado'} ·{' '}
                      {horario.hora_inicio?.slice(0, 5) || '--:--'}-
                      {horario.hora_fin?.slice(0, 5) || '--:--'}
                    </span>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedCourse && selectedCourse.horarios.length > 0 && (
        <div className="dap-schedule-selector">
          <div className="dap-label">
            <FaCalendarAlt />
            Selecciona el día de clase
          </div>
          <div className="dap-schedule-grid">
            {selectedCourse.horarios.map((horario) => (
              <button
                type="button"
                key={horario.asignacion_id}
                className={`schedule-chip ${String(selectedAsignacionId) === String(horario.asignacion_id) ? 'active' : ''
                  }`}
                onClick={() => setSelectedAsignacionId(horario.asignacion_id)}
              >
                <strong>{horario.dia_semana || 'Día sin asignar'}</strong>
                <span>
                  {horario.hora_inicio?.slice(0, 5) || '--:--'} - {horario.hora_fin?.slice(0, 5) || '--:--'}
                </span>
                {horario.aula && <small>Aula {horario.aula}</small>}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedCourse && sessionOptions.length > 0 && (
        <div className="dap-sessions">
          <div className="dap-label">
            <FaCalendarDay />
            Próximas clases en los próximos 30 días
          </div>
          <div className="session-grid">
            {sessionOptions.map((session) => {
              const isActive =
                String(selectedAsignacionId) === String(session.asignacion_id) &&
                normalizedSelectedDate === session.date;
              return (
                <button
                  key={`${session.asignacion_id}-${session.date}`}
                  type="button"
                  className={`session-chip ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedAsignacionId(session.asignacion_id);
                    setSelectedDate(session.date);
                  }}
                >
                  <strong style={{ textTransform: 'capitalize' }}>{session.label}</strong>
                  <span>
                    {session.hora_inicio?.slice(0, 5) || '--:--'} - {session.hora_fin?.slice(0, 5) || '--:--'}
                  </span>
                  {session.aula && <small>Aula {session.aula}</small>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {readyForAttendance && (
        <div className="dap-toolbar">
          <div className="dap-tile">
            <div className="dap-label">
              <FaCalendarDay />
              Fecha de asistencia
            </div>
            <input
              type="date"
              className="dap-input"
              value={selectedDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
            {selectedAsignacion?.dia_semana && (
              <small
                style={{
                  color: invalidDateForClass ? '#fca5a5' : 'rgba(226, 232, 240, 0.75)',
                  fontWeight: invalidDateForClass ? 600 : 400,
                }}
              >
                Solo puedes tomar asistencia el día {selectedAsignacion.dia_semana}.
              </small>
            )}
          </div>

          <div className="dap-tile">
            <div className="dap-label">
              <FaSearch />
              Buscar estudiante
            </div>
            <input
              type="text"
              className="dap-input"
              placeholder="Nombre o correo"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
          </div>

          <div className="dap-tile">
            <div className="dap-label">
              <FaClock />
              Resumen del día
            </div>
            <div className="dap-summary">
              {STATE_OPTIONS.map((state) => (
                <div key={state.value} className="dap-summary-card" style={{ color: state.color }}>
                  <strong>{summary[state.value]}</strong>
                  <small style={{ color: '#e2e8f0' }}>{state.label}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!noAssignments && !readyForAttendance && (
        <div className="dap-empty">
          <p className="mb-1">Selecciona un curso y un día específico para registrar la asistencia.</p>
          <small>Primero elige una tarjeta de curso y luego una fecha sugerida en “Próximas clases”.</small>
        </div>
      )}

      {!noAssignments && readyForAttendance && (
        <>
          {invalidDateForClass && (
            <div className="dap-empty" style={{ padding: '16px', marginTop: '-12px' }}>
              <p className="mb-1">Solo puedes tomar asistencia el día {selectedAsignacion?.dia_semana}.</p>
              <small>Elige una fecha sugerida en “Próximas clases” o ajusta la fecha al día correcto.</small>
            </div>
          )}
          <div className="dap-table-wrapper">
            {filteredEstudiantes.length === 0 ? (
              <div className="dap-empty">
                <p>No hay estudiantes que coincidan con la búsqueda.</p>
              </div>
            ) : (
              <table className="dap-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Estudiante</th>
                    <th>Estado</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEstudiantes.map((estudiante, index) => {
                    const estadoActual = attendanceDraft[estudiante.id]?.estado || 'ausente';
                    return (
                      <tr key={estudiante.id}>
                        <td style={{ width: '50px', textAlign: 'center', fontWeight: 600 }}>{index + 1}</td>
                        <td>
                          <div className="student-row">
                            <UserAvatar
                              userId={estudiante.id}
                              nombre={estudiante.nombre}
                              tieneFoto={estudiante.tieneFoto}
                              size="sm"
                              className="student-avatar"
                            />
                            <div className="student-info">
                              <div className="student-name">{estudiante.nombre}</div>
                              {estudiante.email && (
                                <div className="student-email">{estudiante.email}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="dap-state-selector">
                            <select
                              className="dap-select-state"
                              value={estadoActual}
                              onChange={(e) => handleStateChange(estudiante.id, e.target.value)}
                              style={{
                                borderColor: STATE_OPTIONS.find((s) => s.value === estadoActual)?.color || 'rgba(255,255,255,0.2)',
                                color: STATE_OPTIONS.find((s) => s.value === estadoActual)?.color || '#f8fafc',
                              }}
                            >
                              {STATE_OPTIONS.map((state) => (
                                <option key={state.value} value={state.value}>
                                  {state.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="dap-observacion"
                            placeholder="Opcional"
                            value={attendanceDraft[estudiante.id]?.observaciones || ''}
                            onChange={(event) => handleObservationChange(estudiante.id, event.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="dap-actions">
            <button
              type="button"
              className="dap-action-btn light"
              onClick={() => handleBulkState('presente')}
              disabled={saving || !filteredEstudiantes.length}
            >
              <FaCheck className="me-2" />
              Marcar todos presentes
            </button>
            <button
              type="button"
              className="dap-action-btn warning"
              onClick={() => handleBulkState('ausente')}
              disabled={saving || !filteredEstudiantes.length}
            >
              <FaTimes className="me-2" />
              Todos ausentes
            </button>
            <button
              type="button"
              className="dap-action-btn secondary"
              onClick={() => handleBulkState('justificado')}
              disabled={saving || !filteredEstudiantes.length}
            >
              <FaEllipsisH className="me-2" />
              Todos justificados
            </button>
            <button
              type="button"
              className="dap-action-btn primary"
              onClick={handleSave}
              disabled={saving || loading || !filteredEstudiantes.length || invalidDateForClass}
            >
              <FaClipboardCheck className="me-2" />
              {saving ? 'Guardando...' : 'Guardar asistencia'}
            </button>
          </div>
        </>
      )}
    </section>
  );
};

DocenteAsistenciasPanel.propTypes = {
  asignaciones: PropTypes.array,
  asistencias: PropTypes.array,
  token: PropTypes.string,
  loading: PropTypes.bool,
  loadingAsignaciones: PropTypes.bool,
  fetchAsistenciasDocente: PropTypes.func,
  showError: PropTypes.func,
  showSuccess: PropTypes.func,
  userInfo: PropTypes.object,
};

DocenteAsistenciasPanel.defaultProps = {
  asignaciones: [],
  asistencias: [],
  token: '',
  loading: false,
  loadingAsignaciones: false,
  fetchAsistenciasDocente: null,
  showError: null,
  showSuccess: null,
  userInfo: null,
};

export default DocenteAsistenciasPanel;
