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

export const getExamList = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const response = await apiClient.get(`${GRADES_BASE}/examenes${queryString}`);
  const raw = response.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};

export const createExam = async (payload) => {
  const response = await apiClient.post(`${GRADES_BASE}/examenes`, payload);
  return response.data;
};

export const getExamDetail = async (examId) => {
  if (!examId) {
    return null;
  }
  const response = await apiClient.get(`${GRADES_BASE}/examenes/${examId}/detalle`);
  return response.data;
};

export const saveExamGrade = async ({ examId, studentId, nota }) => {
  const response = await apiClient.put(
    `${GRADES_BASE}/examenes/${examId}/calificaciones/${studentId}`,
    { nota }
  );
  return response.data;
};
