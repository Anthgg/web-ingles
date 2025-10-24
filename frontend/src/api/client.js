import axios from 'axios';

let authToken = '';

const apiClient = axios.create({
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const configCopy = { ...config };
  if (authToken && !configCopy.headers.Authorization) {
    configCopy.headers.Authorization = `Bearer ${authToken}`;
  }
  if (!configCopy.headers['Content-Type']) {
    configCopy.headers['Content-Type'] = 'application/json';
  }
  return configCopy;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { data } = error.response;
      const wrappedError = new Error(
        data?.error || data?.message || error.response.statusText || 'Error en la solicitud'
      );
      wrappedError.status = error.response.status;
      wrappedError.payload = data;
      throw wrappedError;
    }
    if (error.request) {
      throw new Error('No se recibió respuesta del servidor');
    }
    throw error;
  }
);

export const setAuthToken = (token) => {
  authToken = token || '';
};

export default apiClient;
