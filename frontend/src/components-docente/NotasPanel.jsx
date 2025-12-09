import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Form, Modal, OverlayTrigger, Tooltip } from 'react-bootstrap';
import {
  FaPlus,
  FaClipboardList,
  FaCheckCircle,
  FaTimesCircle,
  FaRegClock,
  FaFileExcel,
  FaFilePdf,
  FaChartLine,
  FaUsers,
  FaTrophy,
  FaSearch,
  FaCalendarAlt,
  FaBook,
  FaChevronRight,
  FaChevronDown,
  FaStar,
  FaMedal,
  FaEdit,
  FaTrash,
  FaFilter,
  FaEye,
  FaLock,
  FaUnlock,
  FaSync,
  FaInfoCircle,
} from 'react-icons/fa';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import apiClient from '../api/client';
import { teacherApi } from '../api';
import UserAvatar from '../components/UserAvatar';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const NOTE_MIN = 10;
const NOTE_MAX = 20;
const AUTOSAVE_DELAY = 600;

const EXAM_STATE_META = {
  BORRADOR: {
    label: 'Borrador',
    textColor: '#94a3b8',
    bgColor: 'rgba(148, 163, 184, 0.15)',
    borderColor: 'rgba(148, 163, 184, 0.4)',
  },
  ABIERTO: {
    label: 'Abierto',
    textColor: '#0ea5e9',
    bgColor: 'rgba(14, 165, 233, 0.2)',
    borderColor: 'rgba(14, 165, 233, 0.4)',
  },
  EN_EVALUACION: {
    label: 'En evaluación',
    textColor: '#fbbf24',
    bgColor: 'rgba(251, 191, 36, 0.18)',
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  CERRADO: {
    label: 'Cerrado',
    textColor: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.18)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  ANULADO: {
    label: 'Anulado',
    textColor: '#f87171',
    bgColor: 'rgba(248, 113, 113, 0.18)',
    borderColor: 'rgba(248, 113, 113, 0.4)',
  },
  DEFAULT: {
    label: 'Sin estado',
    textColor: '#cbd5f5',
    bgColor: 'rgba(203, 213, 245, 0.18)',
    borderColor: 'rgba(203, 213, 245, 0.4)',
  },
};

const getEstadoMeta = (estado) => EXAM_STATE_META[estado] || EXAM_STATE_META.DEFAULT;

const formatDateForHumans = (value) => {
  if (!value) return 'Sin fecha';
  if (value instanceof Date) {
    return value.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const asDate = new Date(Date.UTC(year, month - 1, day));
    return asDate.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
  return String(value);
};

const computeEstado = (nota) => {
  if (nota == null || Number.isNaN(Number(nota))) {
    return 'Pendiente';
  }
  return Number(nota) >= 11 ? 'Aprobado' : 'Reprobado';
};

const buildAssignmentLabel = (assignment = {}) => {
  const parts = [];
  if (assignment.curso_nombre || assignment.materia_nombre) {
    parts.push(assignment.curso_nombre || assignment.materia_nombre);
  }
  if (assignment.seccion || assignment.grupo) {
    parts.push(`Sección ${assignment.seccion || assignment.grupo}`);
  }
  if (assignment.dia_semana || assignment.diaSemana) {
    const dayIndex = Number(assignment.dia_semana ?? assignment.diaSemana);
    if (!Number.isNaN(dayIndex) && dayIndex >= 0 && dayIndex <= 6) {
      parts.push(DAY_NAMES[dayIndex] || assignment.dia_semana);
    }
  }
  if (assignment.hora_inicio || assignment.hora_fin) {
    const start = assignment.hora_inicio || assignment.horaInicio;
    const end = assignment.hora_fin || assignment.horaFin;
    if (start || end) {
      parts.push([start, end].filter(Boolean).join(' - '));
    }
  }
  return parts.filter(Boolean).join(' • ') || 'Asignación sin nombre';
};

const getAverageProgress = (promedio) => {
  if (promedio == null || Number.isNaN(Number(promedio))) {
    return 0;
  }
  const clamped = Math.min(Math.max(Number(promedio), NOTE_MIN), NOTE_MAX);
  return ((clamped - NOTE_MIN) / (NOTE_MAX - NOTE_MIN)) * 100;
};

const getGradeColor = (nota) => {
  if (nota == null || Number.isNaN(Number(nota))) return '#64748b';
  const n = Number(nota);
  if (n >= 17) return '#22c55e';
  if (n >= 14) return '#38bdf8';
  if (n >= 11) return '#fbbf24';
  return '#ef4444';
};

const NotasPanel = ({
  cursos = [],
  asignaciones = [],
  docenteNombre = '',
  onShowError,
  onShowSuccess,
}) => {
  const [examList, setExamList] = useState([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [examDetail, setExamDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [configuracion, setConfiguracion] = useState({ niveles: {}, tipos: {}, estados: [] });
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [nivelFilters, setNivelFilters] = useState(null);
  const [estadoFilters, setEstadoFilters] = useState(null);
  const [tipoFilters, setTipoFilters] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [savingExam, setSavingExam] = useState(false);
  const [formValues, setFormValues] = useState({
    nombre: '',
    fecha: '',
    descripcion: '',
    asignacionId: '',
    tipo_examen: '',
    periodo_academico: '',
    peso_porcentaje: 100,
    observaciones: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [gradeErrors, setGradeErrors] = useState({});
  const [savingStudents, setSavingStudents] = useState({});
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('todos');
  const [estadoLoading, setEstadoLoading] = useState(false);
  const [selectedAssignmentMetadata, setSelectedAssignmentMetadata] = useState(null);
  const autoSaveRefs = useRef({});
  const toastTimeout = useRef();
  const [toast, setToast] = useState({ show: false, message: '', variant: 'success' });
  const assignmentMetadataCache = useRef({});

  const assignmentOptions = useMemo(() => {
    if (!Array.isArray(asignaciones)) {
      return [];
    }
    
    // Función para verificar si un curso está activo por fechas
    const isCourseActive = (fechaFin) => {
      if (!fechaFin) return true; // Sin fecha de fin, se considera activo
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(fechaFin);
      endDate.setHours(23, 59, 59, 999);
      return endDate >= today;
    };
    
    // Crear un Map para eliminar duplicados por asignacion_id
    const uniqueMap = new Map();
    
    asignaciones.forEach((assignment) => {
      const rawId = assignment.asignacion_id ?? assignment.id;
      const idNumber = rawId != null && !Number.isNaN(Number(rawId)) ? Number(rawId) : null;
      
      if (idNumber == null) return;
      
      // Filtrar por fecha_fin del curso (igual que MisCursosPanel)
      const fechaFin = assignment.fecha_fin;
      if (!isCourseActive(fechaFin)) return;
      
      // Solo agregar si no existe ya
      if (!uniqueMap.has(idNumber)) {
        uniqueMap.set(idNumber, {
          value: idNumber,
          label: buildAssignmentLabel(assignment),
        });
      }
    });
    
    return Array.from(uniqueMap.values());
  }, [asignaciones]);

  const nivelOptions = useMemo(() => {
    const levels = configuracion?.niveles || {};
    return Object.keys(levels).sort();
  }, [configuracion?.niveles]);

  const tipoOptions = useMemo(() => {
    const fromAssignment = selectedAssignmentMetadata?.tipos_permitidos;
    if (Array.isArray(fromAssignment) && fromAssignment.length) {
      return fromAssignment;
    }
    const tipos = configuracion?.tipos || {};
    return Object.entries(tipos).map(([value, meta]) => ({
      value,
      label: meta?.label || value,
      periodo: meta?.periodo || null,
      tipo: meta?.tipo || null,
    }));
  }, [configuracion?.tipos, selectedAssignmentMetadata]);

  const estadoOptions = configuracion?.estados || [];

  const showToast = useCallback((message, variant = 'success') => {
    setToast({ show: true, message, variant });
    clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(
      () => setToast((prev) => ({ ...prev, show: false })),
      2800
    );
  }, []);

  useEffect(() => () => {
    Object.values(autoSaveRefs.current).forEach((timeoutId) => clearTimeout(timeoutId));
    clearTimeout(toastTimeout.current);
  }, []);

  const handleApiError = useCallback(
    (error) => {
      const message = error?.message || 'Ocurrió un error inesperado';
      if (onShowError) {
        onShowError(message);
      }
      showToast(message, 'danger');
    },
    [onShowError, showToast]
  );

  const fetchAssignmentMetadata = useCallback(
    async (asignacionId) => {
      if (!asignacionId) return null;
      if (assignmentMetadataCache.current[asignacionId]) {
        return assignmentMetadataCache.current[asignacionId];
      }
      try {
        const metadata = await teacherApi.getAsignacionExamMetadata(asignacionId);
        assignmentMetadataCache.current[asignacionId] = metadata;
        return metadata;
      } catch (error) {
        handleApiError(error);
        return null;
      }
    },
    [handleApiError]
  );

  const handleAssignmentSelect = useCallback(
    async (value) => {
      setFormValues((prev) => ({ ...prev, asignacionId: value }));
      setFormErrors((prev) => ({ ...prev, asignacionId: undefined }));

      if (!value) {
        setSelectedAssignmentMetadata(null);
        return;
      }

      const numericId = Number(value);
      const metadata = await fetchAssignmentMetadata(Number.isNaN(numericId) ? value : numericId);
      if (!metadata) {
        setSelectedAssignmentMetadata(null);
        return;
      }

      setSelectedAssignmentMetadata(metadata);
      const allowedTypes = metadata.tipos_permitidos || [];
      setFormValues((prev) => {
        const currentTypeValid = allowedTypes.some((tipo) => tipo.value === prev.tipo_examen);
        return {
          ...prev,
          tipo_examen: currentTypeValid
            ? prev.tipo_examen
            : allowedTypes[0]?.value || prev.tipo_examen,
          periodo_academico:
            prev.periodo_academico || metadata.periodo_sugerido || prev.periodo_academico,
        };
      });
    },
    [fetchAssignmentMetadata]
  );

  const loadExams = useCallback(async () => {
    try {
      setLoadingExams(true);
      const exams = await teacherApi.getExamListV2({
        estado: estadoFilters || undefined,
        nivel: nivelFilters || undefined,
        tipo: tipoFilters || undefined,
      });
      setExamList(exams);
      setSelectedExamId((prev) => (prev != null ? prev : exams[0]?.id ?? null));
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoadingExams(false);
    }
  }, [estadoFilters, handleApiError, nivelFilters, tipoFilters]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoadingConfig(true);
        const data = await teacherApi.getExamenesConfiguracion();
        setConfiguracion({
          niveles: data?.niveles || {},
          tipos: data?.tipos || {},
          estados: data?.estados || [],
        });
      } catch (error) {
        handleApiError(error);
      } finally {
        setLoadingConfig(false);
      }
    };
    fetchConfig();
  }, [handleApiError]);

  const loadExamDetail = useCallback(
    async (examId) => {
      if (!examId) {
        setExamDetail(null);
        return;
      }
      try {
        setLoadingDetail(true);
        const detail = await teacherApi.getExamDetailV2(examId);
        setExamDetail(detail);
      } catch (error) {
        handleApiError(error);
      } finally {
        setLoadingDetail(false);
      }
    },
    [handleApiError]
  );

  const handleCambiarEstado = useCallback(
    async (accion) => {
      if (!selectedExamId) return;
      try {
        setEstadoLoading(true);
        if (accion === 'ABIERTO') {
          await teacherApi.abrirExamen(selectedExamId);
          showToast('Examen abierto para registro de notas', 'success');
        } else if (accion === 'CERRAR') {
          await teacherApi.cerrarExamen(selectedExamId);
          showToast('Examen cerrado correctamente', 'success');
        }
        await loadExamDetail(selectedExamId);
        await loadExams();
      } catch (error) {
        handleApiError(error);
      } finally {
        setEstadoLoading(false);
      }
    },
    [handleApiError, loadExamDetail, loadExams, selectedExamId, showToast]
  );

  const examData = examDetail?.examen || null;
  const participantes = examDetail?.participantes || [];
  const estadisticas = examDetail?.estadisticas || {};
  const examStateMeta = getEstadoMeta(examData?.estado_examen);
  const tipoExamenLabel = examData?.tipo_examen
    ? configuracion?.tipos?.[examData.tipo_examen]?.label || examData.tipo_examen
    : null;
  const puedeRegistrarNotas = Boolean(examData?.puede_registrar_notas);
  const nivelDetectado = (examData?.nivel_educativo || selectedAssignmentMetadata?.nivel_educativo || null);

  const examFileBaseName = useMemo(() => {
    if (!examData) {
      return 'calificaciones-examen';
    }
    const slugify = (value) =>
      String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-');
    const parts = [examData.nombre, examData.fecha, 'calificaciones']
      .map((value) => slugify(value))
      .filter(Boolean);
    return parts.length ? parts.join('-') : 'calificaciones-examen';
  }, [examData]);

  const handleExportExcel = useCallback(async () => {
    if (!examDetail || !participantes.length) {
      showToast('Carga los datos antes de exportar.', 'danger');
      return;
    }
    try {
      setExportingExcel(true);
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Calificaciones');

      sheet.getCell('A1').value = 'Reporte de Calificaciones';
      sheet.getCell('A2').value = examData?.nombre || 'Examen sin nombre';
      sheet.getCell('A3').value = `Fecha: ${formatDateForHumans(examData?.fecha)}`;
      sheet.getCell('A4').value = `Docente: ${docenteNombre || 'Sin especificar'}`;

      ['A1', 'A2', 'A3', 'A4'].forEach((cellKey) => {
        const cell = sheet.getCell(cellKey);
        cell.font = { bold: true };
      });

      sheet.addRow([]);
      const headerRow = sheet.addRow([
        'Estudiante',
        'Correo',
        'Nota',
        'Estado',
        'Última modificación',
      ]);
      headerRow.font = { bold: true };

      participantes.forEach((participante) => {
        sheet.addRow([
          participante.nombre || 'Estudiante sin nombre',
          participante.email || '',
          participante.nota != null && !Number.isNaN(Number(participante.nota))
            ? Number(participante.nota)
            : '',
          participante.estado ? participante.estado.toUpperCase() : 'PENDIENTE',
          participante.updated_at || '',
        ]);
      });

      sheet.getColumn(1).width = 36;
      sheet.getColumn(2).width = 32;
      sheet.getColumn(3).width = 12;
      sheet.getColumn(4).width = 14;
      sheet.getColumn(5).width = 24;

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      saveAs(blob, `${examFileBaseName}.xlsx`);
      showToast('Excel exportado correctamente.', 'success');
    } catch (error) {
      handleApiError(error);
    } finally {
      setExportingExcel(false);
    }
  }, [examDetail, examData, examFileBaseName, docenteNombre, handleApiError, showToast]);

  const handleExportPdf = useCallback(async () => {
    if (!selectedExamId) {
      showToast('Selecciona un examen antes de exportar.', 'danger');
      return;
    }
    try {
      setExportingPdf(true);
      const response = await apiClient.get(
        `http://localhost:3011/api/reports/examenes/${selectedExamId}.pdf`,
        {
          responseType: 'blob',
          headers: {
            Accept: 'application/pdf',
          },
        }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      saveAs(blob, `${examFileBaseName}.pdf`);
      showToast('PDF descargado correctamente.', 'success');
    } catch (error) {
      handleApiError(error);
    } finally {
      setExportingPdf(false);
    }
  }, [examFileBaseName, handleApiError, selectedExamId, showToast]);

  useEffect(() => {
    loadExamDetail(selectedExamId);
    Object.values(autoSaveRefs.current).forEach((timeoutId) => clearTimeout(timeoutId));
    autoSaveRefs.current = {};
  }, [loadExamDetail, selectedExamId]);

  const handleOpenModal = () => {
    setFormValues({
      nombre: '',
      fecha: '',
      descripcion: '',
      asignacionId: '',
      tipo_examen: '',
      periodo_academico: '',
      peso_porcentaje: 100,
      observaciones: '',
    });
    setFormErrors({});
    setSelectedAssignmentMetadata(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    if (!savingExam) {
      setShowModal(false);
    }
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    if (name === 'asignacionId') {
      handleAssignmentSelect(value);
      return;
    }
    setFormValues((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formValues.nombre || !formValues.nombre.trim()) {
      errors.nombre = 'Ingresa un nombre para el examen';
    }
    if (!formValues.fecha) {
      errors.fecha = 'Selecciona la fecha del examen';
    }
    if (!formValues.asignacionId) {
      errors.asignacionId = 'Selecciona el curso asociado';
    }
    if (!formValues.tipo_examen) {
      errors.tipo_examen = 'Selecciona el tipo de examen';
    }
    if (formValues.peso_porcentaje == null || formValues.peso_porcentaje === '') {
      errors.peso_porcentaje = 'Define el peso porcentual';
    } else {
      const peso = Number(formValues.peso_porcentaje);
      if (Number.isNaN(peso) || peso <= 0 || peso > 100) {
        errors.peso_porcentaje = 'El peso debe estar entre 1 y 100';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateExam = async (event) => {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }
    try {
      setSavingExam(true);
      const payload = {
        nombre: formValues.nombre.trim(),
        fecha: formValues.fecha,
        descripcion: formValues.descripcion?.trim() || null,
        asignacion_id: Number(formValues.asignacionId),
        tipo_examen: formValues.tipo_examen,
        periodo_academico: formValues.periodo_academico || null,
        peso_porcentaje: Number(formValues.peso_porcentaje) || 100,
        observaciones: formValues.observaciones?.trim() || null,
      };
      const created = await teacherApi.createExamV2(payload);
      setExamList((prev) => [created, ...prev]);
      setSelectedExamId(created.id);
      setShowModal(false);
      showToast('Examen creado correctamente', 'success');
      if (onShowSuccess) {
        onShowSuccess('Examen creado correctamente');
      }
      await loadExams();
      setSelectedExamId(created.id);
    } catch (error) {
      handleApiError(error);
    } finally {
      setSavingExam(false);
    }
  };

  const triggerAutoSave = useCallback(
    async (studentId, nota) => {
      if (!selectedExamId) {
        return;
      }
      if (!puedeRegistrarNotas) {
        showToast('El examen no permite registrar notas en su estado actual.', 'danger');
        return;
      }
      try {
        setSavingStudents((prev) => ({ ...prev, [studentId]: true }));
        const response = await teacherApi.saveExamGradeV2({
          examId: selectedExamId,
          studentId,
          nota,
        });

        setExamDetail((prev) => {
          if (!prev) return prev;
          const updatedParticipantes = (prev.participantes || []).map((participante) => {
            if (participante.estudiante_id !== studentId) {
              return participante;
            }
            return {
              ...participante,
              nota: response.calificacion?.nota ?? nota,
              estado: computeEstado(response.calificacion?.nota ?? nota),
              updated_at: response.calificacion?.updated_at || participante.updated_at,
            };
          });
          const responseStats = response.estadisticas || {};
          return {
            ...prev,
            participantes: updatedParticipantes,
            estadisticas: {
              ...prev.estadisticas,
              ...responseStats,
            },
          };
        });

        showToast('Nota guardada', 'success');
      } catch (error) {
        handleApiError(error);
      } finally {
        setSavingStudents((prev) => ({ ...prev, [studentId]: false }));
      }
    },
    [handleApiError, puedeRegistrarNotas, selectedExamId, showToast]
  );

  const handleNotaChange = (studentId, rawValue) => {
    setGradeErrors((prev) => {
      if (prev[studentId]) {
        const next = { ...prev };
        delete next[studentId];
        return next;
      }
      return prev;
    });

    setExamDetail((prev) => {
      if (!prev) return prev;
      const participantes = (prev.participantes || []).map((participante) => {
        if (participante.estudiante_id !== studentId) {
          return participante;
        }
        const nota = rawValue === '' ? '' : Number(rawValue);
        return {
          ...participante,
          nota: rawValue === '' || Number.isNaN(nota) ? '' : nota,
          estado:
            rawValue === '' || Number.isNaN(nota)
              ? 'Pendiente'
              : computeEstado(nota),
        };
      });
      return { ...prev, participantes };
    });

    if (autoSaveRefs.current[studentId]) {
      clearTimeout(autoSaveRefs.current[studentId]);
    }

    if (rawValue === '') {
      return;
    }

    const notaValue = Number(rawValue);
    if (Number.isNaN(notaValue) || notaValue < NOTE_MIN || notaValue > NOTE_MAX) {
      setGradeErrors((prev) => ({ ...prev, [studentId]: `Nota: ${NOTE_MIN}-${NOTE_MAX}` }));
      return;
    }

    autoSaveRefs.current[studentId] = setTimeout(() => {
      triggerAutoSave(studentId, notaValue);
    }, AUTOSAVE_DELAY);
  };

  // Filter participants based on search and tab
  const filteredParticipants = useMemo(() => {
    if (!participantes.length) return [];
    
    let filtered = participantes;
    
    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.nombre?.toLowerCase().includes(term) ||
        p.email?.toLowerCase().includes(term)
      );
    }
    
    // Filter by tab
    if (activeTab === 'aprobados') {
      filtered = filtered.filter(p => computeEstado(p.nota) === 'Aprobado');
    } else if (activeTab === 'reprobados') {
      filtered = filtered.filter(p => computeEstado(p.nota) === 'Reprobado');
    } else if (activeTab === 'pendientes') {
      filtered = filtered.filter(p => computeEstado(p.nota) === 'Pendiente');
    }
    
    return filtered;
  }, [participantes, searchTerm, activeTab]);

  // Stats calculation
  const stats = useMemo(() => {
    const participants = participantes;
    if (!participants.length) {
      return {
        total: estadisticas?.total_inscritos || 0,
        aprobados: estadisticas?.aprobados || 0,
        reprobados: estadisticas?.reprobados || 0,
        pendientes: estadisticas?.pendientes || (estadisticas?.total_inscritos || 0),
        promedio: estadisticas?.promedio ?? null,
      };
    }

    const aprobados = participants.filter((p) => computeEstado(p.nota) === 'Aprobado').length;
    const reprobados = participants.filter((p) => computeEstado(p.nota) === 'Reprobado').length;
    const pendientes = participants.filter((p) => computeEstado(p.nota) === 'Pendiente').length;
    const promedioCalc = (() => {
      const notas = participants
        .map((p) => (p.nota == null || p.nota === '' ? null : Number(p.nota)))
        .filter((n) => n != null && !Number.isNaN(n));
      if (!notas.length) return null;
      return Number((notas.reduce((acc, val) => acc + val, 0) / notas.length).toFixed(2));
    })();

    return {
      total: estadisticas?.total_inscritos || participants.length,
      aprobados,
      reprobados,
      pendientes,
      promedio: estadisticas?.promedio ?? promedioCalc,
    };
  }, [estadisticas, participantes]);

  const promedio = stats.promedio ?? null;
  const promedioProgress = getAverageProgress(promedio);

  return (
    <div className="notas-panel">
      <style>
        {`
          .notas-panel {
            position: relative;
            min-height: 100%;
          }

          /* Toast */
          .notas-toast {
            position: fixed;
            top: 24px;
            right: 24px;
            z-index: 1000;
            padding: 14px 24px;
            border-radius: 14px;
            font-weight: 600;
            font-size: 0.9rem;
            backdrop-filter: blur(12px);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
            animation: slideInRight 0.3s ease;
          }

          .notas-toast--success {
            background: rgba(34, 197, 94, 0.2);
            border: 1px solid rgba(34, 197, 94, 0.3);
            color: #22c55e;
          }

          .notas-toast--danger {
            background: rgba(239, 68, 68, 0.2);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #ef4444;
          }

          @keyframes slideInRight {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }

          /* Header */
          .notas-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 28px;
            flex-wrap: wrap;
            gap: 16px;
          }

          .notas-header-info {
            display: flex;
            align-items: center;
            gap: 16px;
          }

          .notas-header-icon {
            width: 56px;
            height: 56px;
            border-radius: 16px;
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            color: #a855f7;
          }

          .notas-header-text h2 {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.85) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }

          .notas-header-text p {
            margin: 4px 0 0 0;
            color: rgba(148, 163, 184, 0.8);
            font-size: 0.9rem;
          }

          .notas-btn-new {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            border: none;
            padding: 14px 24px;
            border-radius: 14px;
            color: #fff;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
          }

          .notas-btn-new:hover {
            box-shadow: 0 12px 35px rgba(99, 102, 241, 0.4);
          }

          /* Main Grid Layout */
          .notas-grid {
            display: grid;
            grid-template-columns: 320px 1fr;
            gap: 24px;
          }

          @media (max-width: 1024px) {
            .notas-grid {
              grid-template-columns: 1fr;
            }
          }

          /* Sidebar - Exam List */
          .notas-sidebar {
            background: rgba(15, 23, 42, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 20px;
            padding: 20px;
            backdrop-filter: blur(12px);
          }

          .notas-sidebar-filters {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-bottom: 18px;
          }

          .notas-sidebar-filters select {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.08);
            color: #f8fafc;
            border-radius: 12px;
            padding: 10px 12px;
            font-size: 0.85rem;
          }

          .filter-reset-btn {
            background: transparent;
            border: 1px dashed rgba(255, 255, 255, 0.2);
            border-radius: 999px;
            color: rgba(248, 250, 252, 0.8);
            padding: 8px 14px;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.2s ease;
            align-self: flex-start;
          }

          .filter-reset-btn:hover {
            border-color: rgba(56, 189, 248, 0.6);
            color: #38bdf8;
          }

          .notas-sidebar-header {
            display: flex;
            align-items: center;
            gap: 10px;
            padding-bottom: 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            margin-bottom: 16px;
            color: #f8fafc;
            font-weight: 600;
          }

          .notas-exam-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-height: 500px;
            overflow-y: auto;
          }

          .notas-exam-list::-webkit-scrollbar {
            width: 6px;
          }

          .notas-exam-list::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 3px;
          }

          .notas-exam-list::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.15);
            border-radius: 3px;
          }

          .notas-exam-item {
            background: rgba(15, 23, 42, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 14px;
            padding: 14px 16px;
            cursor: pointer;
            transition: background 0.15s ease, border-color 0.15s ease;
            text-align: left;
            width: 100%;
          }

          .notas-exam-item:hover {
            background: rgba(15, 23, 42, 0.6);
            border-color: rgba(99, 102, 241, 0.3);
          }

          .notas-exam-item.active {
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%);
            border-color: rgba(99, 102, 241, 0.4);
            box-shadow: 0 8px 25px rgba(99, 102, 241, 0.15);
          }

          .notas-exam-item h6 {
            margin: 0 0 6px 0;
            font-size: 0.95rem;
            font-weight: 600;
            color: #f8fafc;
          }

          .notas-exam-item-tags {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-bottom: 6px;
          }

          .notas-state-chip,
          .notas-nivel-chip {
            display: inline-flex;
            align-items: center;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 0.72rem;
            font-weight: 600;
            border: 1px solid transparent;
          }

          .notas-nivel-chip {
            background: rgba(148, 163, 184, 0.15);
            color: rgba(248, 250, 252, 0.85);
            border-color: rgba(148, 163, 184, 0.4);
          }

          .notas-exam-item-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.8rem;
            color: rgba(148, 163, 184, 0.7);
          }

          .notas-exam-item-avg {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 8px;
            border-radius: 6px;
            background: rgba(99, 102, 241, 0.2);
            color: #a5b4fc;
            font-weight: 600;
          }

          /* Main Content Area */
          .notas-content {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          /* Stats Cards */
          .notas-stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          }

          @media (max-width: 768px) {
            .notas-stats {
              grid-template-columns: repeat(2, 1fr);
            }
          }

          .notas-stat-card {
            background: rgba(15, 23, 42, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 20px;
            position: relative;
            overflow: hidden;
          }

          .notas-stat-card:hover {
            border-color: rgba(255, 255, 255, 0.12);
          }

          .notas-stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: var(--stat-color);
          }

          .notas-stat-icon {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 12px;
            font-size: 1.1rem;
          }

          .notas-stat-value {
            font-size: 2rem;
            font-weight: 800;
            background: var(--stat-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            line-height: 1;
            margin-bottom: 4px;
          }

          .notas-stat-label {
            font-size: 0.85rem;
            color: rgba(148, 163, 184, 0.8);
            font-weight: 500;
          }

          /* Exam Detail Card */
          .notas-detail {
            background: rgba(15, 23, 42, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 20px;
            padding: 24px;
            backdrop-filter: blur(12px);
          }

          .notas-detail-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 20px;
            margin-bottom: 24px;
            flex-wrap: wrap;
          }

          .notas-detail-info h3 {
            margin: 0 0 8px 0;
            font-size: 1.3rem;
            font-weight: 700;
            color: #f8fafc;
          }

          .notas-detail-info p {
            margin: 0;
            color: rgba(148, 163, 184, 0.8);
            font-size: 0.9rem;
          }

          .notas-detail-meta {
            margin-top: 12px;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .notas-state-pill {
            align-self: flex-start;
            padding: 6px 14px;
            border-radius: 999px;
            border: 1px solid transparent;
            font-weight: 600;
            font-size: 0.8rem;
          }

          .notas-meta-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 12px;
            padding: 14px;
            border-radius: 14px;
            background: rgba(15, 23, 42, 0.45);
            border: 1px solid rgba(255, 255, 255, 0.06);
          }

          .notas-meta-grid small {
            display: block;
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: rgba(148, 163, 184, 0.7);
            margin-bottom: 2px;
          }

          .notas-meta-grid strong {
            font-size: 0.95rem;
            color: #f8fafc;
          }

          .notas-detail-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          }

          .notas-warning-banner {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            border-radius: 12px;
            background: rgba(239, 68, 68, 0.12);
            border: 1px solid rgba(239, 68, 68, 0.2);
            color: #fecaca;
            margin-bottom: 16px;
          }

          .notas-action-btn {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 10px 16px;
            color: #e2e8f0;
            font-weight: 500;
            font-size: 0.85rem;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
          }

          .notas-action-btn:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(99, 102, 241, 0.4);
            color: #fff;
          }

          .notas-action-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .notas-action-btn svg {
            color: #a5b4fc;
          }

          /* Search and Filter */
          .notas-toolbar {
            display: flex;
            gap: 16px;
            margin-bottom: 20px;
            flex-wrap: wrap;
          }

          .notas-search {
            position: relative;
            flex: 1;
            min-width: 240px;
          }

          .notas-search input {
            width: 100%;
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 12px 16px 12px 44px;
            color: #f8fafc;
            font-size: 0.9rem;
          }

          .notas-search input::placeholder {
            color: rgba(148, 163, 184, 0.6);
          }

          .notas-search input:focus {
            outline: none;
            border-color: rgba(99, 102, 241, 0.5);
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
          }

          .notas-search-icon {
            position: absolute;
            left: 16px;
            top: 50%;
            transform: translateY(-50%);
            color: rgba(148, 163, 184, 0.6);
          }

          .notas-tabs {
            display: flex;
            gap: 8px;
            background: rgba(15, 23, 42, 0.4);
            padding: 6px;
            border-radius: 12px;
          }

          .notas-tab {
            background: transparent;
            border: none;
            padding: 10px 18px;
            border-radius: 10px;
            color: rgba(148, 163, 184, 0.8);
            font-weight: 500;
            font-size: 0.85rem;
            cursor: pointer;
          }

          .notas-tab:hover {
            color: #f8fafc;
          }

          .notas-tab.active {
            background: rgba(99, 102, 241, 0.2);
            color: #a5b4fc;
          }

          /* Table */
          .notas-table-wrapper {
            overflow-x: auto;
            border-radius: 14px;
            border: 1px solid rgba(255, 255, 255, 0.08);
          }

          .notas-table {
            width: 100%;
            border-collapse: collapse;
          }

          .notas-table thead {
            background: rgba(15, 23, 42, 0.8);
          }

          .notas-table th {
            padding: 16px 18px;
            text-align: left;
            font-weight: 600;
            font-size: 0.85rem;
            color: rgba(148, 163, 184, 0.9);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          }

          .notas-table td {
            padding: 16px 18px;
            vertical-align: middle;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          }

          .notas-table tbody tr:hover {
            background: rgba(255, 255, 255, 0.03);
          }

          .notas-table tbody tr.row-aprobado {
            background: rgba(34, 197, 94, 0.08);
          }

          .notas-table tbody tr.row-aprobado:hover {
            background: rgba(34, 197, 94, 0.12);
          }

          .notas-table tbody tr.row-reprobado {
            background: rgba(239, 68, 68, 0.08);
          }

          .notas-table tbody tr.row-reprobado:hover {
            background: rgba(239, 68, 68, 0.12);
          }

          /* Student Cell */
          .notas-student {
            display: flex;
            align-items: center;
            gap: 14px;
          }

          .notas-student-info strong {
            display: block;
            color: #f8fafc;
            font-weight: 600;
            margin-bottom: 2px;
          }

          .notas-student-info span {
            font-size: 0.8rem;
            color: rgba(148, 163, 184, 0.7);
          }

          /* Grade Input */
          .notas-grade-wrapper {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .notas-grade-input {
            width: 90px;
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 10px;
            padding: 10px 14px;
            color: #f8fafc;
            font-size: 1rem;
            font-weight: 600;
            text-align: center;
          }

          .notas-grade-input:focus {
            outline: none;
            border-color: rgba(99, 102, 241, 0.5);
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
          }

          .notas-grade-input::placeholder {
            color: rgba(148, 163, 184, 0.5);
          }

          .notas-grade-status {
            font-size: 0.75rem;
            color: rgba(148, 163, 184, 0.7);
          }

          .notas-grade-status.saving {
            color: #fbbf24;
          }

          .notas-grade-status.saved {
            color: #22c55e;
          }

          .notas-grade-error {
            font-size: 0.75rem;
            color: #ef4444;
          }

          /* Status Badge */
          .notas-status {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px;
            border-radius: 999px;
            font-weight: 600;
            font-size: 0.8rem;
          }

          .notas-status.aprobado {
            background: rgba(34, 197, 94, 0.15);
            color: #22c55e;
          }

          .notas-status.reprobado {
            background: rgba(239, 68, 68, 0.15);
            color: #ef4444;
          }

          .notas-status.pendiente {
            background: rgba(148, 163, 184, 0.15);
            color: #94a3b8;
          }

          /* Empty State */
          .notas-empty {
            text-align: center;
            padding: 48px 24px;
            color: rgba(148, 163, 184, 0.7);
          }

          .notas-empty-icon {
            width: 80px;
            height: 80px;
            border-radius: 20px;
            background: rgba(99, 102, 241, 0.1);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 16px;
            font-size: 2rem;
            color: #6366f1;
          }

          .notas-empty h4 {
            margin: 0 0 8px 0;
            color: #f8fafc;
            font-weight: 600;
          }

          /* Loading */
          .notas-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 48px;
            gap: 16px;
          }

          .notas-spinner {
            width: 48px;
            height: 48px;
            border: 3px solid rgba(99, 102, 241, 0.2);
            border-top-color: #6366f1;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          /* Modal Styles Override */
          .notas-modal .modal-content {
            background: linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.9) 100%);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            backdrop-filter: blur(20px);
            color: #f8fafc;
          }

          .notas-modal .modal-header {
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding: 20px 24px;
          }

          .notas-modal .modal-title {
            font-weight: 700;
            font-size: 1.25rem;
          }

          .notas-modal .modal-body {
            padding: 24px;
          }

          .notas-modal .modal-footer {
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            padding: 16px 24px;
          }

          .notas-modal .btn-close {
            filter: invert(1);
          }

          .notas-modal .form-label {
            color: rgba(148, 163, 184, 0.9);
            font-weight: 500;
            margin-bottom: 8px;
          }

          .notas-modal .form-control,
          .notas-modal .form-select {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 12px;
            color: #f8fafc;
            padding: 12px 16px;
          }

          .notas-modal .form-control:focus,
          .notas-modal .form-select:focus {
            background: rgba(15, 23, 42, 0.7);
            border-color: rgba(99, 102, 241, 0.5);
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
            color: #f8fafc;
          }

          .notas-modal .form-select option {
            background: #0f172a;
            color: #f8fafc;
          }

          .notas-modal .text-danger {
            color: #ef4444 !important;
            font-size: 0.8rem;
          }

          .assignment-meta-hint {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 14px;
            border-radius: 12px;
            background: rgba(59, 130, 246, 0.12);
            border: 1px solid rgba(59, 130, 246, 0.3);
            color: #bfdbfe;
            margin-bottom: 16px;
            font-size: 0.85rem;
          }

          .assignment-meta-hint svg {
            color: #93c5fd;
          }

          /* Progress bar for average */
          .notas-avg-progress {
            height: 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            overflow: hidden;
            margin-top: 8px;
          }

          .notas-avg-progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #22c55e, #16a34a);
            border-radius: 4px;
            transition: width 0.5s ease;
          }
        `}
      </style>

      {/* Toast Notification */}
      {toast.show && (
        <div className={`notas-toast notas-toast--${toast.variant}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="notas-header">
        <div className="notas-header-info">
          <div className="notas-header-icon">
            <FaClipboardList />
          </div>
          <div className="notas-header-text">
            <h2>Gestión de Notas</h2>
            <p>Administra las calificaciones de tus estudiantes</p>
          </div>
        </div>
        <button className="notas-btn-new" onClick={handleOpenModal}>
          <FaPlus />
          Nuevo Examen
        </button>
      </div>

      {/* Main Grid */}
      <div className="notas-grid">
        {/* Sidebar - Exam List */}
        <div className="notas-sidebar">
          <div className="notas-sidebar-header">
            <FaBook />
            <span>Mis Exámenes</span>
          </div>

          <div className="notas-sidebar-filters">
            <Form.Select
              value={nivelFilters || ''}
              onChange={(e) => setNivelFilters(e.target.value || null)}
              disabled={loadingConfig}
            >
              <option value="">Todos los niveles</option>
              {nivelOptions.map((nivel) => (
                <option key={nivel} value={nivel}>
                  {nivel}
                </option>
              ))}
            </Form.Select>

            <Form.Select
              value={estadoFilters || ''}
              onChange={(e) => setEstadoFilters(e.target.value || null)}
              disabled={loadingConfig}
            >
              <option value="">Todos los estados</option>
              {estadoOptions.map((estado) => (
                <option key={estado} value={estado}>
                  {getEstadoMeta(estado).label}
                </option>
              ))}
            </Form.Select>

            <Form.Select
              value={tipoFilters || ''}
              onChange={(e) => setTipoFilters(e.target.value || null)}
              disabled={loadingConfig}
            >
              <option value="">Todos los tipos</option>
              {tipoOptions.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </Form.Select>

            {(nivelFilters || estadoFilters || tipoFilters) && (
              <button
                type="button"
                className="filter-reset-btn"
                onClick={() => {
                  setNivelFilters(null);
                  setEstadoFilters(null);
                  setTipoFilters(null);
                }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
          
          {loadingExams ? (
            <div className="notas-loading">
              <div className="notas-spinner" />
              <span>Cargando...</span>
            </div>
          ) : examList.length === 0 ? (
            <div className="notas-empty">
              <div className="notas-empty-icon">
                <FaClipboardList />
              </div>
              <h4>Sin exámenes</h4>
              <p>Crea tu primer examen para comenzar</p>
            </div>
          ) : (
            <div className="notas-exam-list">
              {examList.map((exam) => (
                <button
                  key={exam.id}
                  type="button"
                  className={`notas-exam-item ${selectedExamId === exam.id ? 'active' : ''}`}
                  onClick={() => setSelectedExamId(exam.id)}
                >
                  <h6>{exam.nombre}</h6>
                  <div className="notas-exam-item-tags">
                    <span
                      className="notas-state-chip"
                      style={{
                        color: getEstadoMeta(exam.estado_examen).textColor,
                        backgroundColor: getEstadoMeta(exam.estado_examen).bgColor,
                        borderColor: getEstadoMeta(exam.estado_examen).borderColor,
                      }}
                    >
                      {getEstadoMeta(exam.estado_examen).label}
                    </span>
                    {exam.nivel_educativo && (
                      <span className="notas-nivel-chip">{exam.nivel_educativo}</span>
                    )}
                  </div>
                  <div className="notas-exam-item-meta">
                    <span>{formatDateForHumans(exam.fecha)}</span>
                    <span className="notas-exam-item-avg">
                      <FaStar style={{ fontSize: '0.7rem' }} />
                      {exam.promedio != null ? Number(exam.promedio).toFixed(1) : '—'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="notas-content">
          {/* Stats */}
          <div className="notas-stats">
            <div 
              className="notas-stat-card" 
              style={{ '--stat-color': '#6366f1', '--stat-gradient': 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              <div className="notas-stat-icon" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8' }}>
                <FaUsers />
              </div>
              <div className="notas-stat-value">{stats.total}</div>
              <div className="notas-stat-label">Estudiantes</div>
            </div>
            
            <div 
              className="notas-stat-card" 
              style={{ '--stat-color': '#22c55e', '--stat-gradient': 'linear-gradient(135deg, #22c55e, #16a34a)' }}
            >
              <div className="notas-stat-icon" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80' }}>
                <FaCheckCircle />
              </div>
              <div className="notas-stat-value">{stats.aprobados}</div>
              <div className="notas-stat-label">Aprobados</div>
            </div>
            
            <div 
              className="notas-stat-card" 
              style={{ '--stat-color': '#ef4444', '--stat-gradient': 'linear-gradient(135deg, #ef4444, #dc2626)' }}
            >
              <div className="notas-stat-icon" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
                <FaTimesCircle />
              </div>
              <div className="notas-stat-value">{stats.reprobados}</div>
              <div className="notas-stat-label">Reprobados</div>
            </div>
            
            <div 
              className="notas-stat-card" 
              style={{ '--stat-color': '#fbbf24', '--stat-gradient': 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
            >
              <div className="notas-stat-icon" style={{ background: 'rgba(251, 191, 36, 0.2)', color: '#fcd34d' }}>
                <FaChartLine />
              </div>
              <div className="notas-stat-value">
                {promedio != null ? Number(promedio).toFixed(1) : '—'}
              </div>
              <div className="notas-stat-label">Promedio</div>
              {promedio != null && (
                <div className="notas-avg-progress">
                  <div 
                    className="notas-avg-progress-bar" 
                    style={{ width: `${promedioProgress}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Detail Card */}
          <div className="notas-detail">
            {loadingDetail ? (
              <div className="notas-loading">
                <div className="notas-spinner" />
                <span>Cargando detalles...</span>
              </div>
            ) : !examDetail ? (
              <div className="notas-empty">
                <div className="notas-empty-icon">
                  <FaEye />
                </div>
                <h4>Selecciona un examen</h4>
                <p>Elige un examen de la lista para ver y editar las calificaciones</p>
              </div>
            ) : (
              <>
                {/* Detail Header */}
                <div className="notas-detail-header">
                  <div className="notas-detail-info">
                    <h3>{examData?.nombre || 'Examen'}</h3>
                    <p>
                      <FaCalendarAlt style={{ marginRight: 6 }} />
                      {formatDateForHumans(examData?.fecha)} • {stats.total} estudiantes inscritos
                    </p>
                    <div className="notas-detail-meta">
                      <span
                        className="notas-state-pill"
                        style={{
                          color: examStateMeta.textColor,
                          backgroundColor: examStateMeta.bgColor,
                          borderColor: examStateMeta.borderColor,
                        }}
                      >
                        {examStateMeta.label}
                      </span>
                      <div className="notas-meta-grid">
                        <div>
                          <small>Tipo de examen</small>
                          <strong>{tipoExamenLabel || '—'}</strong>
                        </div>
                        <div>
                          <small>Nivel</small>
                          <strong>{examData?.nivel_educativo || 'Sin definir'}</strong>
                        </div>
                        <div>
                          <small>Periodo</small>
                          <strong>{examData?.periodo_academico || 'No asignado'}</strong>
                        </div>
                        <div>
                          <small>Peso (%)</small>
                          <strong>{examData?.peso_porcentaje ?? 100}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="notas-detail-actions">
                    <div className="d-flex flex-wrap gap-2">
                      <OverlayTrigger
                        placement="bottom"
                        overlay={<Tooltip>Permite registrar notas</Tooltip>}
                      >
                        <span>
                          <button
                            className="notas-action-btn"
                            onClick={() => handleCambiarEstado('ABIERTO')}
                            disabled={examData?.estado_examen !== 'BORRADOR' || estadoLoading}
                          >
                            <FaUnlock />
                            {estadoLoading ? 'Procesando...' : 'Abrir'}
                          </button>
                        </span>
                      </OverlayTrigger>
                      <OverlayTrigger
                        placement="bottom"
                        overlay={<Tooltip>Bloquea las notas actuales</Tooltip>}
                      >
                        <span>
                          <button
                            className="notas-action-btn"
                            onClick={() => handleCambiarEstado('CERRAR')}
                            disabled={!['ABIERTO', 'EN_EVALUACION'].includes(examData?.estado_examen) || estadoLoading}
                          >
                            <FaLock />
                            {estadoLoading ? 'Procesando...' : 'Cerrar'}
                          </button>
                        </span>
                      </OverlayTrigger>
                      <OverlayTrigger
                        placement="bottom"
                        overlay={<Tooltip>Refrescar detalle</Tooltip>}
                      >
                        <span>
                          <button
                            className="notas-action-btn"
                            onClick={() => loadExamDetail(selectedExamId)}
                          >
                            <FaSync />
                            Sincronizar
                          </button>
                        </span>
                      </OverlayTrigger>
                      <button 
                        className="notas-action-btn"
                        onClick={handleExportExcel}
                        disabled={exportingExcel || !examDetail?.participantes?.length}
                      >
                        <FaFileExcel />
                        {exportingExcel ? 'Generando...' : 'Excel'}
                      </button>
                      <button 
                        className="notas-action-btn"
                        onClick={handleExportPdf}
                        disabled={exportingPdf || !examDetail?.participantes?.length}
                      >
                        <FaFilePdf />
                        {exportingPdf ? 'Generando...' : 'PDF'}
                      </button>
                    </div>
                  </div>
                </div>

                {!puedeRegistrarNotas && (
                  <div className="notas-warning-banner">
                    <FaLock />
                    <span>
                      Este examen está {examStateMeta.label.toLowerCase()} y no permite editar notas.
                    </span>
                  </div>
                )}

                {/* Search and Filter */}
                <div className="notas-toolbar">
                  <div className="notas-search">
                    <FaSearch className="notas-search-icon" />
                    <input 
                      type="text"
                      placeholder="Buscar estudiante..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="notas-tabs">
                    <button 
                      className={`notas-tab ${activeTab === 'todos' ? 'active' : ''}`}
                      onClick={() => setActiveTab('todos')}
                    >
                      Todos ({stats.total})
                    </button>
                    <button 
                      className={`notas-tab ${activeTab === 'aprobados' ? 'active' : ''}`}
                      onClick={() => setActiveTab('aprobados')}
                    >
                      Aprobados ({stats.aprobados})
                    </button>
                    <button 
                      className={`notas-tab ${activeTab === 'reprobados' ? 'active' : ''}`}
                      onClick={() => setActiveTab('reprobados')}
                    >
                      Reprobados ({stats.reprobados})
                    </button>
                    <button 
                      className={`notas-tab ${activeTab === 'pendientes' ? 'active' : ''}`}
                      onClick={() => setActiveTab('pendientes')}
                    >
                      Pendientes ({stats.pendientes})
                    </button>
                  </div>
                </div>

                {/* Students Table */}
                <div className="notas-table-wrapper">
                  <table className="notas-table">
                    <thead>
                      <tr>
                        <th>Estudiante</th>
                        <th>Nota</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredParticipants.length === 0 ? (
                        <tr>
                          <td colSpan={3}>
                            <div className="notas-empty">
                              <p>No se encontraron estudiantes</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredParticipants.map((participante) => {
                          const nota =
                            participante.nota === '' || participante.nota == null
                              ? ''
                              : Number(participante.nota);
                          const estado = computeEstado(
                            participante.nota === '' ? null : participante.nota
                          );
                          const saving = savingStudents[participante.estudiante_id];
                          const errorMessage = gradeErrors[participante.estudiante_id];
                          const rowClass = estado === 'Aprobado' 
                            ? 'row-aprobado' 
                            : estado === 'Reprobado' 
                              ? 'row-reprobado' 
                              : '';

                          return (
                            <tr key={participante.estudiante_id} className={rowClass}>
                              <td>
                                <div className="notas-student">
                                  <UserAvatar 
                                    userId={participante.usuario_id || participante.estudiante_id}
                                    nombre={participante.nombre}
                                    tieneFoto={participante.tiene_foto || participante.tieneFoto}
                                    size="sm"
                                  />
                                  <div className="notas-student-info">
                                    <strong>{participante.nombre}</strong>
                                    <span>{participante.email || 'Sin correo'}</span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="notas-grade-wrapper">
                                  <input 
                                    type="number"
                                    className="notas-grade-input"
                                    min={NOTE_MIN}
                                    max={NOTE_MAX}
                                    step="0.1"
                                    value={nota}
                                    placeholder="—"
                                    onChange={(e) => handleNotaChange(participante.estudiante_id, e.target.value)}
                                    disabled={!puedeRegistrarNotas}
                                  />
                                  {saving && (
                                    <span className="notas-grade-status saving">Guardando...</span>
                                  )}
                                  {!saving && nota !== '' && !errorMessage && (
                                    <span className="notas-grade-status saved">✓ Guardado</span>
                                  )}
                                  {errorMessage && (
                                    <span className="notas-grade-error">{errorMessage}</span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <span className={`notas-status ${estado.toLowerCase()}`}>
                                  {estado === 'Aprobado' && <FaCheckCircle />}
                                  {estado === 'Reprobado' && <FaTimesCircle />}
                                  {estado === 'Pendiente' && <FaRegClock />}
                                  {estado}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Create Exam Modal */}
      <Modal show={showModal} onHide={handleCloseModal} centered className="notas-modal">
        <Form onSubmit={handleCreateExam}>
          <Modal.Header closeButton>
            <Modal.Title>
              <FaPlus style={{ marginRight: 10 }} />
              Crear Nuevo Examen
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nombre del examen</Form.Label>
              <Form.Control
                name="nombre"
                value={formValues.nombre}
                onChange={handleFormChange}
                placeholder="Ej. Examen Parcial, Quiz Unidad 3..."
              />
              {formErrors.nombre && (
                <Form.Text className="text-danger">{formErrors.nombre}</Form.Text>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Fecha del examen</Form.Label>
              <Form.Control
                type="date"
                name="fecha"
                value={formValues.fecha}
                onChange={handleFormChange}
              />
              {formErrors.fecha && (
                <Form.Text className="text-danger">{formErrors.fecha}</Form.Text>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Curso / Asignación</Form.Label>
              <Form.Select
                name="asignacionId"
                value={formValues.asignacionId}
                onChange={handleFormChange}
              >
                <option value="">Selecciona un curso</option>
                {assignmentOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Form.Select>
              {formErrors.asignacionId && (
                <Form.Text className="text-danger">{formErrors.asignacionId}</Form.Text>
              )}
            </Form.Group>

            {selectedAssignmentMetadata && (
              <div className="assignment-meta-hint">
                <FaInfoCircle />
                <div>
                  <strong>Nivel detectado:</strong> {selectedAssignmentMetadata.nivel_educativo || 'Sin datos'}
                  <br />
                  <small>
                    Tipos permitidos: {selectedAssignmentMetadata.tipos_permitidos?.map((tipo) => tipo.label).join(', ') || 'Todos'}
                  </small>
                </div>
              </div>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Tipo de examen</Form.Label>
              <Form.Select
                name="tipo_examen"
                value={formValues.tipo_examen}
                onChange={handleFormChange}
              >
                <option value="">Selecciona el tipo</option>
                {tipoOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Form.Select>
              {formErrors.tipo_examen && (
                <Form.Text className="text-danger">{formErrors.tipo_examen}</Form.Text>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Periodo académico</Form.Label>
              <Form.Control
                name="periodo_academico"
                value={formValues.periodo_academico}
                onChange={handleFormChange}
                placeholder="Ej. 2025-B1, 2025-T2"
              />
              <Form.Text className="text-muted">
                Define el periodo {selectedAssignmentMetadata?.tipo_periodo?.toLowerCase() || 'académico'} que corresponde a este examen.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Peso porcentual</Form.Label>
              <Form.Control
                type="number"
                name="peso_porcentaje"
                min="1"
                max="100"
                value={formValues.peso_porcentaje}
                onChange={handleFormChange}
              />
              {formErrors.peso_porcentaje && (
                <Form.Text className="text-danger">{formErrors.peso_porcentaje}</Form.Text>
              )}
            </Form.Group>

            <Form.Group>
              <Form.Label>Descripción (opcional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="descripcion"
                value={formValues.descripcion}
                onChange={handleFormChange}
                placeholder="Temas evaluados, materiales permitidos..."
              />
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label>Observaciones (visibles solo para docentes)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="observaciones"
                value={formValues.observaciones}
                onChange={handleFormChange}
                placeholder="Notas internas, recordatorios o reglas específicas"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button 
              variant="outline-secondary" 
              onClick={handleCloseModal} 
              disabled={savingExam}
              style={{ borderRadius: 10 }}
            >
              Cancelar
            </Button>
            <button 
              type="submit" 
              className="notas-btn-new" 
              disabled={savingExam}
              style={{ padding: '10px 20px' }}
            >
              {savingExam ? 'Creando...' : 'Crear Examen'}
            </button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default NotasPanel;
