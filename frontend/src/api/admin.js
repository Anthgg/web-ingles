import apiClient from './client';

const USER_BASE = process.env.REACT_APP_USER_BASE_URL || 'http://localhost:3002';
const CLASSES_BASE = process.env.REACT_APP_CLASSES_BASE_URL || 'http://localhost:3005';
const ATTENDANCE_BASE = process.env.REACT_APP_ATTENDANCE_BASE_URL || 'http://localhost:3003';
const GRADES_BASE = process.env.REACT_APP_GRADES_BASE_URL || 'http://localhost:3004';
const ASIGNATION_BASE = process.env.REACT_APP_ASIGNATION_BASE_URL || 'http://localhost:3007';

export const getUsuarios = async () => {
  const response = await apiClient.get(`${USER_BASE}/usuarios`);
  return Array.isArray(response.data) ? response.data : response.data?.data || [];
};

export const getClases = async () => {
  const response = await apiClient.get(`${CLASSES_BASE}/materias`);
  return Array.isArray(response.data) ? response.data : response.data?.data || [];
};

export const getAsistencias = async () => {
  const response = await apiClient.get(`${ATTENDANCE_BASE}/asistencias`);
  return Array.isArray(response.data) ? response.data : response.data?.data || [];
};

export const getAsignaciones = async () => {
  const response = await apiClient.get(`${ASIGNATION_BASE}/asignaciones`);
  const raw = response.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};

export const getCalificaciones = async () => {
  const response = await apiClient.get(`${GRADES_BASE}/calificaciones`);
  return Array.isArray(response.data) ? response.data : response.data?.data || [];
};

export const getCursosConProfesor = async () => {
  const response = await apiClient.get(`${ASIGNATION_BASE}/asignaciones`);
  const dataArray = Array.isArray(response.data) ? response.data : response.data?.data || [];
  return dataArray
    .filter((a) => a.profesor_nombre && a.curso_nombre)
    .map((a) => ({
      nombre: a.curso_nombre,
      profesor: a.profesor_nombre,
      dia_semana: a.dia_semana,
      hora_inicio: a.hora_inicio,
      hora_fin: a.hora_fin,
      fecha_inicio: a.fecha_inicio,
      fecha_fin: a.fecha_fin,
      max_alumnos: a.max_alumnos,
      id: `${a.curso_nombre}-${a.profesor_nombre}`,
    }));
};

export const getCursosConProfesorNuevo = async () => {
  const response = await apiClient.get(`${ASIGNATION_BASE}/cursos-con-profesor`);
  const raw = response.data;
  return Array.isArray(raw)
    ? raw.map((a) => ({
        id: a.id,
        nombre: a.nombre,
        profesor: a.profesor,
        dia_semana: a.dia_semana,
        hora_inicio: a.hora_inicio,
        hora_fin: a.hora_fin,
        fecha_inicio: a.fecha_inicio,
        fecha_fin: a.fecha_fin,
        max_alumnos: a.max_alumnos,
        disponibles: a.disponibles,
      }))
    : [];
};

export const promoteStudentCycle = async ({ estudianteId, cicloId }) => {
  const response = await apiClient.put(`${USER_BASE}/usuarios/${estudianteId}/ciclo`, {
    cicloId,
  });
  return response.data;
};

export const getCiclos = async () => {
  const response = await apiClient.get(`${CLASSES_BASE}/ciclos`);
  return Array.isArray(response.data) ? response.data : response.data?.data || [];
};
