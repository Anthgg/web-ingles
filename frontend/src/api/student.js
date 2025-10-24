import apiClient from './client';

const ASIGNATION_BASE = process.env.REACT_APP_ASIGNATION_BASE_URL || 'http://localhost:3007';

export const getMisCursos = async () => {
  const response = await apiClient.get(`${ASIGNATION_BASE}/asignaciones/mis-cursos`);
  const raw = response.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};

export const getCursosDisponibles = async () => {
  const response = await apiClient.get(`${ASIGNATION_BASE}/asignaciones/disponibles`);
  const raw = response.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};

export const inscribirEnCurso = async ({ asignacionId }) => {
  const response = await apiClient.post(`${ASIGNATION_BASE}/asignaciones/${asignacionId}/inscripcion`);
  return response.data;
};

export const cancelarInscripcionCurso = async ({ asignacionId }) => {
  const response = await apiClient.delete(`${ASIGNATION_BASE}/asignaciones/${asignacionId}/inscripcion`);
  return response.data;
};
