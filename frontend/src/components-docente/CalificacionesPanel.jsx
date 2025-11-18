import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import {
  FaPlus,
  FaClipboardList,
  FaCheckCircle,
  FaTimesCircle,
  FaRegClock,
  FaFileExcel,
  FaFilePdf,
} from 'react-icons/fa';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import apiClient from '../api/client';
import { teacherApi } from '../api';
import './CalificacionesPanel.css';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const NOTE_MIN = 10;
const NOTE_MAX = 20;
const AUTOSAVE_DELAY = 600;

const formatDateForHumans = (value) => {
  if (!value) return 'Sin fecha';
  if (value instanceof Date) {
    return value.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const asDate = new Date(Date.UTC(year, month - 1, day));
    return asDate.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
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

const CalificacionesPanel = ({
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
  const [showModal, setShowModal] = useState(false);
  const [savingExam, setSavingExam] = useState(false);
  const [formValues, setFormValues] = useState({
    nombre: '',
    fecha: '',
    descripcion: '',
    asignacionId: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [gradeErrors, setGradeErrors] = useState({});
  const [savingStudents, setSavingStudents] = useState({});
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const autoSaveRefs = useRef({});
  const toastTimeout = useRef();
  const [toast, setToast] = useState({ show: false, message: '', variant: 'success' });

  const assignmentOptions = useMemo(() => {
    if (!Array.isArray(asignaciones)) {
      return [];
    }
    return asignaciones
      .map((assignment) => {
        const rawId = assignment.asignacion_id ?? assignment.id;
        const idNumber = rawId != null && !Number.isNaN(Number(rawId)) ? Number(rawId) : null;
        return {
          value: idNumber,
          label: buildAssignmentLabel(assignment),
        };
      })
      .filter((option) => option.value != null);
  }, [asignaciones]);

  const estudiantesPorCurso = useMemo(() => {
    if (!Array.isArray(cursos)) {
      return new Map();
    }
    const map = new Map();
    cursos.forEach((cursoInfo) => {
      if (!cursoInfo) return;
      const key = cursoInfo.asignacionIds?.[0] ?? cursoInfo.cursoKey ?? cursoInfo.cursoNombre;
      if (!key) return;
      map.set(key, cursoInfo);
    });
    return map;
  }, [cursos]);

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

  const loadExams = useCallback(async () => {
    try {
      setLoadingExams(true);
      const exams = await teacherApi.getExamList();
      setExamList(exams);
      if (exams.length && !selectedExamId) {
        setSelectedExamId(exams[0].id);
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoadingExams(false);
    }
  }, [handleApiError, selectedExamId]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  const loadExamDetail = useCallback(
    async (examId) => {
      if (!examId) {
        setExamDetail(null);
        return;
      }
      try {
        setLoadingDetail(true);
        const detail = await teacherApi.getExamDetail(examId);
        setExamDetail(detail);
      } catch (error) {
        handleApiError(error);
      } finally {
        setLoadingDetail(false);
      }
    },
    [handleApiError]
  );

  const examData = examDetail?.examen || null;

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
    if (!examDetail || !examDetail.participantes) {
      showToast('Cargamos los datos antes de exportar.', 'danger');
      return;
    }
    try {
      setExportingExcel(true);
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Calificaciones');

      sheet.getCell('A1').value = 'Institución Educativa Peruano Japonés';
      sheet.getCell('A2').value = 'Reporte de calificaciones';
      sheet.getCell('A3').value = examData?.nombre || 'Examen sin nombre';
      sheet.getCell('A4').value = examData?.fecha || '';

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

      examDetail.participantes.forEach((participante) => {
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
      showToast('Exportamos el Excel de calificaciones.', 'success');
    } catch (error) {
      handleApiError(error);
    } finally {
      setExportingExcel(false);
    }
  }, [examDetail, examData, examFileBaseName, handleApiError, showToast]);

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
    setFormValues({ nombre: '', fecha: '', descripcion: '', asignacionId: '' });
    setFormErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    if (!savingExam) {
      setShowModal(false);
    }
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
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
      };
      const created = await teacherApi.createExam(payload);
      setExamList((prev) => [created, ...prev]);
      setSelectedExamId(created.id);
      setShowModal(false);
      showToast('Examen creado correctamente', 'success');
      if (onShowSuccess) {
        onShowSuccess('Examen creado correctamente');
      }
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
      try {
        setSavingStudents((prev) => ({ ...prev, [studentId]: true }));
        const response = await teacherApi.saveExamGrade({
          examId: selectedExamId,
          studentId,
          nota,
        });

        setExamDetail((prev) => {
          if (!prev) return prev;
          const participantes = prev.participantes.map((participante) => {
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
          return {
            ...prev,
            participantes,
            promedio:
              response.promedio != null ? Number(response.promedio) : prev.promedio,
            ultimaActualizacion:
              response.ultimaActualizacion || prev.ultimaActualizacion,
            totalEvaluados:
              response.totalEvaluados != null
                ? Number(response.totalEvaluados)
                : prev.totalEvaluados,
          };
        });

        showToast('Calificaciones guardadas correctamente', 'success');
        if (onShowSuccess) {
          onShowSuccess('Calificaciones guardadas correctamente');
        }
      } catch (error) {
        handleApiError(error);
      } finally {
        setSavingStudents((prev) => ({ ...prev, [studentId]: false }));
      }
    },
    [handleApiError, onShowSuccess, selectedExamId, showToast]
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
      const participantes = prev.participantes.map((participante) => {
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
      setGradeErrors((prev) => ({ ...prev, [studentId]: 'La nota es obligatoria' }));
      return;
    }

    const notaValue = Number(rawValue);
    if (Number.isNaN(notaValue) || notaValue < NOTE_MIN || notaValue > NOTE_MAX) {
      setGradeErrors((prev) => ({ ...prev, [studentId]: `La nota debe estar entre ${NOTE_MIN} y ${NOTE_MAX}` }));
      return;
    }

    autoSaveRefs.current[studentId] = setTimeout(() => {
      triggerAutoSave(studentId, notaValue);
    }, AUTOSAVE_DELAY);
  };

  const promedio = examDetail?.promedio ?? null;
  const promedioProgress = getAverageProgress(promedio);
  const ultimaActualizacion = examDetail?.ultimaActualizacion
    ? formatDateForHumans(examDetail.ultimaActualizacion)
    : 'Pendiente de registro';

  return (
    <div className="calificaciones-panel">
      {toast.show && (
        <div className={`calificaciones-panel__toast calificaciones-panel__toast--${toast.variant}`}>
          {toast.message}
        </div>
      )}

      <header className="calificaciones-panel__header">
        <div className="calificaciones-panel__branding">
          <img src="/logo.png" alt="Logo IEE" className="calificaciones-panel__logo" />
          <div>
            <span className="calificaciones-panel__tag">IEE</span>
            <h2 className="calificaciones-panel__title">Panel de Calificaciones</h2>
            <p className="calificaciones-panel__subtitle">
              {docenteNombre ? `Docente: ${docenteNombre}` : 'Gestión de evaluaciones'}
            </p>
          </div>
        </div>
        <Button className="calificaciones-panel__new-exam" onClick={handleOpenModal}>
          <FaPlus className="me-2" />
          Nuevo examen
        </Button>
      </header>

      <section className="calificaciones-panel__content">
        <div className="calificaciones-panel__list-card">
          <div className="calificaciones-panel__list-header">
            <FaClipboardList className="me-2" /> Lista de exámenes
          </div>
          {loadingExams ? (
            <div className="calificaciones-panel__empty">Cargando exámenes...</div>
          ) : examList.length === 0 ? (
            <div className="calificaciones-panel__empty">
              Aún no has creado exámenes. Empieza con el botón “Nuevo examen”.
            </div>
          ) : (
            <div className="calificaciones-panel__exam-list">
              {examList.map((exam) => {
                const isActive = exam.id === selectedExamId;
                return (
                  <button
                    key={exam.id}
                    type="button"
                    className={`calificaciones-panel__exam-item${isActive ? ' is-active' : ''}`}
                    onClick={() => setSelectedExamId(exam.id)}
                  >
                    <h6>{exam.nombre}</h6>
                    <span>{formatDateForHumans(exam.fecha)}</span>
                    <small>
                      Promedio: {exam.promedio != null ? Number(exam.promedio).toFixed(1) : '—'}
                    </small>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="calificaciones-panel__detail-card">
          {loadingDetail ? (
            <div className="calificaciones-panel__loading">Cargando detalle del examen...</div>
          ) : !examDetail ? (
            <div className="calificaciones-panel__empty">
              Selecciona un examen para ver a los estudiantes inscritos.
            </div>
          ) : (
            <>
              <div className="calificaciones-panel__detail-header">
                <div>
                  <h3>{examDetail.examen?.nombre}</h3>
                  <p>
                    {examDetail.examen?.descripcion || 'Sin descripción registrada'}
                  </p>
                </div>
                <div className="calificaciones-panel__meta">
                  <span>{formatDateForHumans(examDetail.examen?.fecha)}</span>
                  <span>
                    {examDetail.totalInscritos || 0} estudiantes inscritos
                  </span>
                  <div className="calificaciones-panel__actions">
                    <Button
                      variant="outline-secondary"
                      className="calificaciones-panel__action-btn"
                      onClick={handleExportExcel}
                      disabled={exportingExcel || !examDetail?.participantes?.length}
                    >
                      <FaFileExcel />
                      {exportingExcel ? 'Generando...' : 'Exportar Excel'}
                    </Button>
                    <Button
                      variant="outline-secondary"
                      className="calificaciones-panel__action-btn"
                      onClick={handleExportPdf}
                      disabled={exportingPdf || !examDetail?.participantes?.length}
                    >
                      <FaFilePdf />
                      {exportingPdf ? 'Preparando...' : 'Exportar PDF'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="calificaciones-panel__summary">
                <div className="calificaciones-panel__summary-card">
                  <div className="calificaciones-panel__summary-value">
                    {promedio != null ? Number(promedio).toFixed(2) : '—'}
                  </div>
                  <div className="calificaciones-panel__summary-label">Promedio general</div>
                  <div className="calificaciones-panel__progress">
                    <div
                      className="calificaciones-panel__progress-bar"
                      style={{ width: `${promedioProgress}%` }}
                    />
                  </div>
                </div>
                <div className="calificaciones-panel__summary-card">
                  <div className="calificaciones-panel__summary-value">
                    {examDetail.totalEvaluados || 0}
                  </div>
                  <div className="calificaciones-panel__summary-label">Calificaciones registradas</div>
                </div>
                <div className="calificaciones-panel__summary-card">
                  <div className="calificaciones-panel__summary-value">
                    <FaRegClock className="me-2" />
                  </div>
                  <div className="calificaciones-panel__summary-label">
                    Última actualización:
                    <br />
                    <strong>{ultimaActualizacion}</strong>
                  </div>
                </div>
              </div>

              <div className="table-responsive">
                <table className="calificaciones-panel__table">
                  <thead>
                    <tr>
                      <th>Estudiante</th>
                      <th>Nota</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examDetail.participantes.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="calificaciones-panel__empty">
                          No hay estudiantes inscritos para este examen.
                        </td>
                      </tr>
                    ) : (
                      examDetail.participantes.map((participante, index) => {
                        const nota =
                          participante.nota === '' || participante.nota == null
                            ? ''
                            : Number(participante.nota).toFixed(1).replace('.0', '');
                        const estado = computeEstado(
                          participante.nota === '' ? null : participante.nota
                        );
                        const isApproved = estado === 'Aprobado';
                        const rowClass = index % 2 === 0 ? 'row-even' : 'row-odd';
                        const saving = savingStudents[participante.estudiante_id];
                        const errorMessage = gradeErrors[participante.estudiante_id];

                        return (
                          <tr
                            key={participante.estudiante_id}
                            className={`calificaciones-panel__row ${rowClass} ${
                              participante.nota !== '' && participante.nota != null
                                ? isApproved
                                  ? 'row-approved'
                                  : 'row-failed'
                                : ''
                            }`}
                          >
                            <td>
                              <div className="calificaciones-panel__student">
                                <span className="calificaciones-panel__avatar">
                                  {participante.nombre
                                    ?.split(' ')
                                    .map((word) => word[0])
                                    .join('')
                                    .slice(0, 2)
                                    .toUpperCase() || 'ED'}
                                </span>
                                <div>
                                  <strong>{participante.nombre}</strong>
                                  <div className="calificaciones-panel__student-mail">
                                    {participante.email || 'Sin correo registrado'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="calificaciones-panel__nota">
                                <Form.Control
                                  type="number"
                                  min={NOTE_MIN}
                                  max={NOTE_MAX}
                                  step="0.1"
                                  value={nota}
                                  onChange={(event) =>
                                    handleNotaChange(participante.estudiante_id, event.target.value)
                                  }
                                />
                                {saving && (
                                  <span className="calificaciones-panel__nota-status">
                                    Guardando...
                                  </span>
                                )}
                                {!saving && nota !== '' && (
                                  <span className="calificaciones-panel__nota-status is-saved">
                                    Guardado
                                  </span>
                                )}
                                {errorMessage && (
                                  <small className="calificaciones-panel__nota-error">
                                    {errorMessage}
                                  </small>
                                )}
                              </div>
                            </td>
                            <td>
                              <span
                                className={`calificaciones-panel__estado ${
                                  estado === 'Aprobado'
                                    ? 'estado-aprobado'
                                    : estado === 'Reprobado'
                                      ? 'estado-reprobado'
                                      : 'estado-pendiente'
                                }`}
                              >
                                {estado === 'Aprobado' && <FaCheckCircle className="me-1" />}
                                {estado === 'Reprobado' && <FaTimesCircle className="me-1" />}
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
      </section>

      <footer className="calificaciones-panel__footer">
        Última actualización: <strong>{ultimaActualizacion}</strong>
      </footer>

      <Modal show={showModal} onHide={handleCloseModal} centered>
        <Form onSubmit={handleCreateExam}>
          <Modal.Header closeButton>
            <Modal.Title>Nuevo examen</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nombre del examen</Form.Label>
              <Form.Control
                name="nombre"
                value={formValues.nombre}
                onChange={handleFormChange}
                placeholder="Ej. Examen Bimestral"
              />
              {formErrors.nombre && (
                <Form.Text className="text-danger">{formErrors.nombre}</Form.Text>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Fecha</Form.Label>
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
              <Form.Label>Curso / asignación</Form.Label>
              <Form.Select
                name="asignacionId"
                value={formValues.asignacionId}
                onChange={handleFormChange}
              >
                <option value="">Selecciona una opción</option>
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

            <Form.Group>
              <Form.Label>Descripción</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="descripcion"
                value={formValues.descripcion}
                onChange={handleFormChange}
                placeholder="Detalle los temas evaluados, materiales permitidos, etc."
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={handleCloseModal} disabled={savingExam}>
              Cancelar
            </Button>
            <Button type="submit" className="calificaciones-panel__new-exam" disabled={savingExam}>
              {savingExam ? 'Creando...' : 'Crear examen'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default CalificacionesPanel;
