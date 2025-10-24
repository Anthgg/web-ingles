import apiClient from './client';

const ASIGNATION_BASE = process.env.REACT_APP_ASIGNATION_BASE_URL || 'http://localhost:3007';

export const getAsignacionesDocente = async () => {
  const response = await apiClient.get(`${ASIGNATION_BASE}/asignaciones`);
  const raw = response.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};
