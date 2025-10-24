import apiClient from './client';

const REGISTRY_BASE = process.env.REACT_APP_REGISTRY_BASE_URL || 'http://localhost:3011';

export const lookupByDni = async (dni) => {
  if (!dni) {
    throw new Error('Ingresa un DNI para realizar la consulta');
  }
  const response = await apiClient.get(`${REGISTRY_BASE}/identidad/dni/${dni}`);
  return response.data;
};

export const createMinistryForm = async (payload) => {
  const response = await apiClient.post(`${REGISTRY_BASE}/ministerio/forms`, payload);
  return response.data;
};

export const updateMinistryForm = async (codigoModular, payload) => {
  if (!codigoModular) {
    throw new Error('Código modular requerido para actualizar el formulario');
  }
  const response = await apiClient.put(`${REGISTRY_BASE}/ministerio/forms/${codigoModular}`, payload);
  return response.data;
};

export const listMinistryForms = async () => {
  const response = await apiClient.get(`${REGISTRY_BASE}/ministerio/forms`);
  return response.data;
};

export const getMinistryForm = async (codigoModular) => {
  if (!codigoModular) {
    throw new Error('Código modular requerido');
  }
  const response = await apiClient.get(`${REGISTRY_BASE}/ministerio/forms/${codigoModular}`);
  return response.data;
};

export const saveStudentInternalForm = async (payload) => {
  const response = await apiClient.post(`${REGISTRY_BASE}/students/internal-form`, payload);
  return response.data;
};

export const getStudentInternalForm = async () => {
  const response = await apiClient.get(`${REGISTRY_BASE}/students/internal-form/me`);
  return response.data;
};
