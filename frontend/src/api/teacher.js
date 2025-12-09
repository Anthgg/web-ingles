import apiClient from './client';

const ASIGNATION_BASE = process.env.REACT_APP_ASIGNATION_BASE_URL || 'http://localhost:3007';
const ATTENDANCE_BASE = process.env.REACT_APP_ATTENDANCE_BASE_URL || 'http://localhost:3003';
const GRADES_BASE = process.env.REACT_APP_GRADES_BASE_URL || 'http://localhost:3004';

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    searchParams.append(key, value);
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

export const getAsignacionesDocente = async () => {
  const response = await apiClient.get(`${ASIGNATION_BASE}/asignaciones-con-estudiantes`);
  const raw = response.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};

export const getAsistenciasDocente = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const response = await apiClient.get(`${ATTENDANCE_BASE}/asistencias/mias${queryString}`);
  const raw = response.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};

export const getExamList = async (filters = {}) => getExamListV2(filters);

export const createExam = async (payload) => createExamV2(payload);

export const getExamDetail = async (examId) => getExamDetailV2(examId);

export const saveExamGrade = async ({ examId, studentId, nota, observaciones, es_recuperacion }) =>
  saveExamGradeV2({ examId, studentId, nota, observaciones, es_recuperacion });

// ==========================================
// API V2 - Exámenes con validación por nivel
// ==========================================

/**
 * Obtiene la configuración de tipos de examen por nivel educativo
 */
export const getExamenesConfiguracion = async () => {
  const response = await apiClient.get(`${GRADES_BASE}/examenes/configuracion`);
  return response.data;
};

/**
 * Obtiene la configuración específica para un nivel educativo
 */
export const getExamenesConfiguracionNivel = async (nivel) => {
  const response = await apiClient.get(`${GRADES_BASE}/examenes/configuracion/${encodeURIComponent(nivel)}`);
  return response.data;
};

/**
 * Lista exámenes con información extendida (v2)
 */
export const getExamListV2 = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const response = await apiClient.get(`${GRADES_BASE}/examenes/v2${queryString}`);
  const raw = response.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};

/**
 * Crear examen con validación de nivel educativo (v2)
 */
export const createExamV2 = async (payload) => {
  const response = await apiClient.post(`${GRADES_BASE}/examenes/v2`, payload);
  return response.data;
};

/**
 * Obtener detalle completo de un examen (v2)
 */
export const getExamDetailV2 = async (examId) => {
  if (!examId) return null;
  const response = await apiClient.get(`${GRADES_BASE}/examenes/v2/${examId}`);
  return response.data;
};

/**
 * Actualizar examen (v2)
 */
export const updateExamV2 = async (examId, payload) => {
  const response = await apiClient.put(`${GRADES_BASE}/examenes/v2/${examId}`, payload);
  return response.data;
};

/**
 * Abrir un examen para registro de notas
 */
export const abrirExamen = async (examId) => {
  const response = await apiClient.post(`${GRADES_BASE}/examenes/v2/${examId}/abrir`);
  return response.data;
};

/**
 * Cerrar un examen (bloquea edición de notas)
 */
export const cerrarExamen = async (examId) => {
  const response = await apiClient.post(`${GRADES_BASE}/examenes/v2/${examId}/cerrar`);
  return response.data;
};

/**
 * Registrar o actualizar nota de un estudiante (v2)
 */
export const saveExamGradeV2 = async ({ examId, studentId, nota, observaciones, es_recuperacion }) => {
  const response = await apiClient.put(
    `${GRADES_BASE}/examenes/v2/${examId}/calificaciones/${studentId}`,
    { nota, observaciones, es_recuperacion }
  );
  return response.data;
};

/**
 * Obtiene metadata de nivel y tipos permitidos para una asignación
 */
export const getAsignacionExamMetadata = async (asignacionId) => {
  if (!asignacionId) return null;
  const response = await apiClient.get(
    `${GRADES_BASE}/examenes/v2/asignaciones/${asignacionId}/metadata`
  );
  return response.data;
};

/**
 * Obtener historial de cambios de un examen
 */
export const getExamHistorial = async (examId) => {
  const response = await apiClient.get(`${GRADES_BASE}/examenes/v2/${examId}/historial`);
  return response.data;
};

/**
 * Eliminar o anular un examen
 */
export const deleteExam = async (examId, anular = false) => {
  const queryString = anular ? '?anular=true' : '';
  const response = await apiClient.delete(`${GRADES_BASE}/examenes/v2/${examId}${queryString}`);
  return response.data;
};
