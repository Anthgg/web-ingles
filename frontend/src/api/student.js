import apiClient from './client';

const ASIGNATION_BASE = process.env.REACT_APP_ASIGNATION_BASE_URL || 'http://localhost:3007';
const ATTENDANCE_BASE = process.env.REACT_APP_ATTENDANCE_BASE_URL || 'http://localhost:3003';

const sanitizeFilters = (filters = {}) => {
  const params = {};
  const {
    estado,
    desde,
    hasta,
    cursoId,
    asignacionId,
    materiaId,
    limit,
  } = filters;

  if (estado && estado !== 'todos') params.estado = estado;
  if (desde) params.desde = desde;
  if (hasta) params.hasta = hasta;
  if (cursoId) params.cursoId = cursoId;
  if (asignacionId) params.asignacionId = asignacionId;
  if (materiaId) params.materiaId = materiaId;
  if (limit) params.limit = limit;
  return params;
};

export const getMisCursos = async () => {
  const response = await apiClient.get(`${ASIGNATION_BASE}/asignaciones/mis-cursos`);
  const raw = response.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};

export const limpiarInscripciones = async () => {
  const response = await apiClient.post(`${ASIGNATION_BASE}/asignaciones/limpiar-inscripciones`);
  return response.data;
};

export const getMisAsistencias = async (filters = {}) => {
  const response = await apiClient.get(`${ATTENDANCE_BASE}/asistencias/estudiante/mias`, {
    params: sanitizeFilters(filters),
  });
  const raw = response.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};
