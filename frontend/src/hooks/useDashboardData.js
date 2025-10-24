import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { adminApi, studentApi, teacherApi } from '../api';
import { useAuth } from '../context/AuthContext';

const initialState = {
  usuarios: [],
  clases: [],
  asistencias: [],
  asignaciones: [],
  calificaciones: [],
  estudiantes: [],
  cursosConProfesor: [],
  misCursos: [],
  cursosDisponibles: [],
  asignacionesDocente: [],
};

export const useDashboardData = () => {
  const {
    token,
    user,
    logout,
    authLoading,
    authError,
    authSuccess,
    updateTwoFactorStatus,
  } = useAuth();

  const [activeModule, setActiveModule] = useState('usuarios');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingAsignacionesDocente, setLoadingAsignacionesDocente] = useState(false);
  const [errorAsignacionesDocente, setErrorAsignacionesDocente] = useState('');
  const [data, setData] = useState(initialState);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const showError = useCallback((message) => {
    if (!mountedRef.current) return;
    setError(message);
    setSuccess('');
  }, []);

  const showSuccess = useCallback((message) => {
    if (!mountedRef.current) return;
    setSuccess(message);
    setError('');
  }, []);

  useEffect(() => {
    if (!(error || success)) return undefined;
    const timeout = setTimeout(() => {
      if (!mountedRef.current) return;
      setError('');
      setSuccess('');
    }, 5000);
    return () => clearTimeout(timeout);
  }, [error, success]);

  const clearData = useCallback(() => {
    setData(initialState);
    setLoadingAsignacionesDocente(false);
    setErrorAsignacionesDocente('');
  }, []);

  const fetchUsuarios = useCallback(async () => {
    if (!token) return [];
    try {
      const usuarios = await adminApi.getUsuarios();
      if (!mountedRef.current) return usuarios;
      setData((prev) => ({ ...prev, usuarios }));
      return usuarios;
    } catch (err) {
      console.error('Error en fetchUsuarios:', err);
      showError(err.message || 'Error al cargar usuarios');
      if (!mountedRef.current) return [];
      setData((prev) => ({ ...prev, usuarios: [] }));
      return [];
    }
  }, [token, showError]);

  const fetchClases = useCallback(async () => {
    if (!token) return [];
    try {
      const clases = await adminApi.getClases();
      if (!mountedRef.current) return clases;
      setData((prev) => ({ ...prev, clases }));
      return clases;
    } catch (err) {
      console.error('Error en fetchClases:', err);
      showError(err.message || 'Error al cargar clases');
      if (!mountedRef.current) return [];
      setData((prev) => ({ ...prev, clases: [] }));
      return [];
    }
  }, [token, showError]);

  const fetchAsistencias = useCallback(async () => {
    if (!token) return [];
    try {
      const asistencias = await adminApi.getAsistencias();
      if (!mountedRef.current) return asistencias;
      setData((prev) => ({ ...prev, asistencias }));
      return asistencias;
    } catch (err) {
      console.error('Error en fetchAsistencias:', err);
      showError(err.message || 'Error al cargar asistencias');
      if (!mountedRef.current) return [];
      setData((prev) => ({ ...prev, asistencias: [] }));
      return [];
    }
  }, [token, showError]);

  const fetchAsignaciones = useCallback(async () => {
    if (!token) return [];
    try {
      const asignaciones = await adminApi.getAsignaciones();
      if (!mountedRef.current) return asignaciones;
      setData((prev) => ({ ...prev, asignaciones }));
      return asignaciones;
    } catch (err) {
      console.error('Error en fetchAsignaciones:', err);
      showError(err.message || 'Error al cargar asignaciones');
      if (!mountedRef.current) return [];
      setData((prev) => ({ ...prev, asignaciones: [] }));
      return [];
    }
  }, [token, showError]);

  const fetchCalificaciones = useCallback(async () => {
    if (!token) return [];
    try {
      const calificaciones = await adminApi.getCalificaciones();
      if (!mountedRef.current) return calificaciones;
      setData((prev) => ({ ...prev, calificaciones }));
      return calificaciones;
    } catch (err) {
      console.error('Error en fetchCalificaciones:', err);
      showError(err.message || 'Error al cargar calificaciones');
      if (!mountedRef.current) return [];
      setData((prev) => ({ ...prev, calificaciones: [] }));
      return [];
    }
  }, [token, showError]);

  const fetchEstudiantes = useCallback(async () => {
    if (!token) return [];
    try {
      const usuarios = await adminApi.getUsuarios();
      const estudiantes = usuarios.filter((u) => u.rol === 'estudiante' || u.rol === 'alumno');
      if (!mountedRef.current) return estudiantes;
      setData((prev) => ({ ...prev, estudiantes }));
      return estudiantes;
    } catch (err) {
      console.error('Error en fetchEstudiantes:', err);
      showError('No se pudieron cargar los estudiantes');
      if (!mountedRef.current) return [];
      setData((prev) => ({ ...prev, estudiantes: [] }));
      return [];
    }
  }, [token, showError]);

  const fetchCursosConProfesor = useCallback(async () => {
    if (!token) return [];
    try {
      const cursosConProfesor = await adminApi.getCursosConProfesor();
      if (!mountedRef.current) return cursosConProfesor;
      setData((prev) => ({ ...prev, cursosConProfesor }));
      return cursosConProfesor;
    } catch (err) {
      console.error('Error en fetchCursosConProfesor:', err);
      showError('No se pudieron cargar los cursos');
      if (!mountedRef.current) return [];
      setData((prev) => ({ ...prev, cursosConProfesor: [] }));
      return [];
    }
  }, [token, showError]);

  const fetchCursosConProfesorNuevo = useCallback(async () => {
    if (!token) return [];
    try {
      const cursosConProfesor = await adminApi.getCursosConProfesorNuevo();
      if (!mountedRef.current) return cursosConProfesor;
      setData((prev) => ({ ...prev, cursosConProfesor }));
      return cursosConProfesor;
    } catch (err) {
      console.error('Error en fetchCursosConProfesorNuevo:', err);
      showError('No se pudieron cargar los cursos del backend');
      if (!mountedRef.current) return [];
      setData((prev) => ({ ...prev, cursosConProfesor: [] }));
      return [];
    }
  }, [token, showError]);

  const fetchAsignacionesDocente = useCallback(async () => {
    if (!token) return [];
    setLoadingAsignacionesDocente(true);
    setErrorAsignacionesDocente('');
    try {
      const asignacionesRaw = await teacherApi.getAsignacionesDocente();
      if (!mountedRef.current) return asignacionesRaw;
      setData((prev) => ({ ...prev, asignacionesDocente: asignacionesRaw }));
      return asignacionesRaw;
    } catch (err) {
      console.error('Error en fetchAsignacionesDocente:', err);
      if (!mountedRef.current) return [];
      setErrorAsignacionesDocente(err.message || 'Error al cargar asignaciones del docente');
      setData((prev) => ({ ...prev, asignacionesDocente: [] }));
      return [];
    } finally {
      if (mountedRef.current) {
        setLoadingAsignacionesDocente(false);
      }
    }
  }, [token]);

  const fetchMisCursos = useCallback(async (silent = false) => {
    if (!token) return [];
    try {
      const misCursos = await studentApi.getMisCursos();
      if (!mountedRef.current) return misCursos;
      setData((prev) => ({ ...prev, misCursos }));
      return misCursos;
    } catch (err) {
      console.error('Error en fetchMisCursos:', err);
      if (!silent) {
        showError(err.message || 'No se pudieron cargar tus cursos');
      }
      if (!mountedRef.current) return [];
      setData((prev) => ({ ...prev, misCursos: [] }));
      return [];
    }
  }, [token, showError]);

  const fetchCursosDisponibles = useCallback(async (silent = false) => {
    if (!token) return [];
    try {
      const cursosDisponibles = await studentApi.getCursosDisponibles();
      if (!mountedRef.current) return cursosDisponibles;
      setData((prev) => ({ ...prev, cursosDisponibles }));
      return cursosDisponibles;
    } catch (err) {
      console.error('Error en fetchCursosDisponibles:', err);
      if (!silent) {
        showError(err.message || 'No se pudieron cargar los cursos disponibles');
      }
      if (!mountedRef.current) return [];
      setData((prev) => ({ ...prev, cursosDisponibles: [] }));
      return [];
    }
  }, [token, showError]);

  const inscribirEnCurso = useCallback(async (asignacionId) => {
    if (!token) return false;
    try {
      await studentApi.inscribirEnCurso({ asignacionId });
      showSuccess('Inscripción completada correctamente');
      await Promise.all([fetchMisCursos(true), fetchCursosDisponibles(true)]);
      return true;
    } catch (err) {
      console.error('Error inscribiendo en curso:', err);
      showError(err.message || 'No se pudo completar la inscripción');
      return false;
    }
  }, [token, fetchMisCursos, fetchCursosDisponibles, showError, showSuccess]);

  const cancelarInscripcionCurso = useCallback(async (asignacionId) => {
    if (!token) return false;
    try {
      await studentApi.cancelarInscripcionCurso({ asignacionId });
      showSuccess('Te has dado de baja del curso correctamente');
      await Promise.all([fetchMisCursos(true), fetchCursosDisponibles(true)]);
      return true;
    } catch (err) {
      console.error('Error cancelando inscripción:', err);
      showError(err.message || 'No se pudo cancelar la inscripción');
      return false;
    }
  }, [token, fetchMisCursos, fetchCursosDisponibles, showError, showSuccess]);

  const fetchAll = useCallback(async () => {
    if (!token || !user) return;
    const role = String(user.rol || '').toLowerCase();
    setLoading(true);
    try {
      if (role === 'admin' || role === 'administrativo') {
        await Promise.all([
          fetchUsuarios(),
          fetchClases(),
          fetchAsistencias(),
          fetchAsignaciones(),
          fetchCalificaciones(),
          fetchEstudiantes(),
          fetchCursosConProfesorNuevo(),
        ]);
      } else if (role === 'profesor' || role === 'docente') {
        await fetchAsignaciones();
        await fetchAsignacionesDocente();
      } else {
        await Promise.all([
          fetchClases(),
          fetchMisCursos(true),
          fetchCursosDisponibles(true),
        ]);
      }
    } catch (err) {
      console.error('Error en fetchAll:', err);
      showError('No se pudieron cargar todos los datos. Por favor, intenta nuevamente.');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [
    token,
    user,
    fetchUsuarios,
    fetchClases,
    fetchAsistencias,
    fetchAsignaciones,
    fetchCalificaciones,
    fetchEstudiantes,
    fetchCursosConProfesorNuevo,
    fetchAsignacionesDocente,
    fetchMisCursos,
    fetchCursosDisponibles,
    showError,
  ]);

  useEffect(() => {
    if (token && user) {
      fetchAll();
    } else {
      clearData();
    }
  }, [token, user, fetchAll, clearData]);

  const state = useMemo(() => ({
    ...data,
    activeModule,
    loading,
    error,
    success,
    authLoading,
    authError,
    authSuccess,
    loadingAsignacionesDocente,
    errorAsignacionesDocente,
    user,
    token,
  }), [
    data,
    activeModule,
    loading,
    error,
    success,
    authLoading,
    authError,
    authSuccess,
    loadingAsignacionesDocente,
    errorAsignacionesDocente,
    user,
    token,
  ]);

  return {
    state,
    setActiveModule,
    showError,
    showSuccess,
    fetchUsuarios,
    fetchClases,
    fetchAsistencias,
    fetchAsignaciones,
    fetchCalificaciones,
    fetchEstudiantes,
    fetchCursosConProfesor,
    fetchCursosConProfesorNuevo,
    fetchAsignacionesDocente,
    fetchMisCursos,
    fetchCursosDisponibles,
    inscribirEnCurso,
    cancelarInscripcionCurso,
    fetchAll,
    logout,
    updateTwoFactorStatus,
  };
};

export default useDashboardData;
