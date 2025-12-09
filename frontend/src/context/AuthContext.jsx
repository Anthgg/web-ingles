import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { jwtDecode } from 'jwt-decode';
import {
  migrateStoredTokenIfNeeded,
  secureReadToken,
  secureStoreToken,
} from '../utils/secureAuth';
import {
  sanitizeWebStorage,
  removeLegacyStorageKeys,
  patchStorageWriters,
} from '../utils/storage';
import { authApi, setAuthToken } from '../api';

const AuthContext = createContext(undefined);

const TOKEN_STORAGE_KEY = 'goenglish:authToken';

const decodeToken = (rawToken) => {
  if (!rawToken) throw new Error('Token vacío');
  const payload = jwtDecode(rawToken);
  if (!payload?.id || !payload?.nombre || !payload?.rol) {
    throw new Error('Token no contiene información válida del usuario');
  }
  return {
    id: payload.id,
    nombre: payload.nombre,
    rol: payload.rol,
    email: payload.email,
    twoFactorEnabled: Boolean(payload.twoFactorEnabled),
    payload,
  };
};

const buildNombre = (basicos = {}, decoded = {}) => {
  const compuesto = [basicos.nombres, basicos.apellido_paterno, basicos.apellido_materno]
    .filter(Boolean)
    .join(' ')
    .trim();

  return basicos.nombre_completo || compuesto || basicos.nombre || decoded.nombre || decoded.email || 'Usuario';
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);

  const [initializing, setInitializing] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorTempToken, setTwoFactorTempToken] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState('');

  const clearTwoFactor = useCallback(() => {
    setTwoFactorRequired(false);
    setTwoFactorTempToken('');
    setTwoFactorError('');
    setTwoFactorLoading(false);
  }, []);

  const bootstrap = useCallback(async () => {
    try {
      patchStorageWriters();
      sanitizeWebStorage();
      removeLegacyStorageKeys();
      await migrateStoredTokenIfNeeded();
      const stored = await secureReadToken();
      if (stored) {
        setToken(stored);
      }
    } catch (error) {
      console.error('Error inicializando autenticación:', error);
    } finally {
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const fetchUserCompleteData = async () => {
      setAuthToken(token);
      if (!token) {
        setUser(null);
        return;
      }
      try {
        const decoded = decodeToken(token);
        console.log('🔐 Token decodificado:', decoded);
        
        // Obtener datos completos para todos los roles
        console.log('📚 Obteniendo datos completos del usuario...');
        try {
          const url = `http://localhost:3002/usuarios/${decoded.id}/datos-completos`;
          console.log('🌐 Llamando a:', url);
          
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('📡 Respuesta status:', response.status);
          
          if (response.ok) {
            const completeData = await response.json();
            console.log('✅ Datos completos recibidos:', completeData);
            console.log('📋 Datos basicos:', completeData.basicos);
            const basicosNormalizados = {
              ...(completeData.basicos || {}),
              nombres: completeData.basicos?.nombres || completeData.basicos?.nombre || decoded.nombre,
              nombre: buildNombre(completeData.basicos, decoded),
              nombre_completo: buildNombre(completeData.basicos, decoded),
              direccion: completeData.basicos?.direccion || completeData.basicos?.direccion_alt || '',
              telefono: completeData.basicos?.telefono || completeData.basicos?.telefono_alt || '',
              documento_identidad: completeData.basicos?.documento_identidad || completeData.basicos?.dni_alt || '',
              departamento: completeData.basicos?.departamento || '',
              provincia: completeData.basicos?.provincia || '',
              distrito: completeData.basicos?.distrito || '',
              tiene_foto_perfil:
                completeData.basicos?.tiene_foto_perfil ||
                (completeData.basicos?.foto_perfil_imagen ? 1 : 0) ||
                (completeData.basicos?.foto_perfil ? 1 : 0),
            };

            
            // Si es estudiante, obtener datos académicos adicionales
            if (decoded.rol === 'estudiante' || decoded.rol === 'alumno') {
              console.log('🎒 Datos estudiante:', completeData.estudiante);
              console.log('📚 Cursos:', completeData.cursos);
              
              // Intentar obtener level y grade del classroom si el estudiante está inscrito en cursos
              const coalesce = (...values) => {
                for (const value of values) {
                  if (value !== undefined && value !== null && value !== '') {
                    return value;
                  }
                }
                return null;
              };

              const normalizeGradeValue = (value) => {
                if (value === undefined || value === null || value === '') {
                  return null;
                }
                if (typeof value === 'number' && Number.isFinite(value)) {
                  return value;
                }
                const text = `${value}`.trim();
                if (!text) {
                  return null;
                }
                const digits = text.match(/\d+/);
                if (digits && digits[0]) {
                  return Number(digits[0]);
                }
                return text;
              };

              let level = null;
              let grade_number = null;
              let section = null;
              let cicloNombre = null;
              
              // Prioridad 1: Datos directos
              level = coalesce(
                completeData.level,
                completeData.nivel,
                completeData.estudiante?.level,
                completeData.estudiante?.nivel,
                completeData.estudiante?.nivel_estudiante,
                completeData.estudiante?.nivelAcademico,
                completeData.basicos?.level,
                completeData.basicos?.nivel,
                completeData.basicos?.nivel_estudiante
              );
              const rawGrade = coalesce(
                completeData.grade_number,
                completeData.grado,
                completeData.estudiante?.grade_number,
                completeData.estudiante?.grado,
                completeData.estudiante?.grado_estudiante,
                completeData.estudiante?.gradoNumero,
                completeData.basicos?.grade_number,
                completeData.basicos?.grado,
                completeData.basicos?.grado_estudiante
              );
              grade_number = normalizeGradeValue(rawGrade);
              section = coalesce(
                completeData.section,
                completeData.seccion,
                completeData.estudiante?.section,
                completeData.estudiante?.seccion,
                completeData.estudiante?.grupo,
                completeData.basicos?.section,
                completeData.basicos?.seccion,
                completeData.basicos?.grupo
              );
              cicloNombre = coalesce(
                completeData.cicloNombre,
                completeData.ciclo_nombre,
                completeData.estudiante?.cicloNombre,
                completeData.estudiante?.ciclo_nombre,
                completeData.basicos?.cicloNombre,
                completeData.basicos?.ciclo_nombre
              );
              
              // Prioridad 2: Si no hay datos, intentar obtener del primer curso inscrito
              if (!level && !grade_number && completeData.cursos && completeData.cursos.length > 0) {
                const primerCurso = completeData.cursos.find(Boolean);
                if (primerCurso) {
                  level = coalesce(
                    primerCurso.level,
                    primerCurso.nivel,
                    primerCurso.nivel_academico,
                    primerCurso.level_name
                  );
                  const courseGrade = coalesce(
                    primerCurso.grade_number,
                    primerCurso.grado,
                    primerCurso.grade,
                    primerCurso.gradeNumber
                  );
                  grade_number = normalizeGradeValue(courseGrade);
                  section = coalesce(primerCurso.section, primerCurso.seccion, primerCurso.grupo);
                }
                console.log('📖 Obteniendo datos del primer curso:', primerCurso);
              }
              
              // Prioridad 3: Hacer consulta adicional a asignaciones para obtener classroom
              if (!level && !grade_number) {
                try {
                  console.log('🔍 Buscando asignaciones del estudiante...');
                  const asignacionesRes = await fetch(`http://localhost:3007/asignaciones/mis-cursos`, {
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    }
                  });
                  
                  if (asignacionesRes.ok) {
                    const misCursos = await asignacionesRes.json();
                    console.log('📚 Mis cursos obtenidos:', misCursos);
                    if (misCursos && misCursos.length > 0) {
                      const primerCurso = misCursos.find(Boolean);
                      if (primerCurso) {
                        level = coalesce(
                          primerCurso.level,
                          primerCurso.nivel,
                          primerCurso.nivel_academico,
                          primerCurso.level_name
                        );
                        const courseGrade = coalesce(
                          primerCurso.grade_number,
                          primerCurso.grado,
                          primerCurso.grade,
                          primerCurso.gradeNumber
                        );
                        grade_number = normalizeGradeValue(courseGrade);
                        section = coalesce(primerCurso.section, primerCurso.seccion, primerCurso.grupo);
                      }
                      console.log('✅ Datos obtenidos del curso:', { level, grade_number, section });
                    }
                  }
                } catch (e) {
                  console.error('Error obteniendo cursos del estudiante:', e);
                }
              }
              
              const combinedUser = {
                ...decoded,
                ...basicosNormalizados, // Incluir nombres, apellidos, tiene_foto_perfil, etc
                level,
                grade_number,
                section,
                cicloNombre,
                datosCompletos: completeData
              };
              console.log('👤 Usuario combinado:', combinedUser);
              console.log('📸 tiene_foto_perfil:', combinedUser.tiene_foto_perfil);
              console.log('🆔 userId:', combinedUser.id);
              console.log('📋 Basicos completos:', basicosNormalizados);
              console.log('🎓 Level extraído:', level);
              console.log('📚 Grade extraído:', grade_number);
              console.log('📝 Section extraído:', section);
              setUser(combinedUser);
            } else {
              // Para otros roles (docente, admin), usar datos básicos completos
              console.log('👨‍💼 Usuario docente/admin, usando datos básicos');
              const combinedUser = {
                ...decoded,
                ...basicosNormalizados, // Incluir nombres, apellidos, tiene_foto_perfil, etc
                datosCompletos: completeData
              };
              console.log('👤 Usuario combinado:', combinedUser);
              console.log('📸 tiene_foto_perfil:', combinedUser.tiene_foto_perfil);
              console.log('🆔 userId:', combinedUser.id);
              console.log('📋 Basicos completos:', basicosNormalizados);
              setUser(combinedUser);
            }
          } else {
            const errorText = await response.text();
            console.error('❌ Error en respuesta:', response.status, errorText);
            // Si falla, usar solo datos del token
            setUser(decoded);
          }
        } catch (fetchError) {
          console.error('❌ Error obteniendo datos completos:', fetchError);
          // Si falla, usar solo datos del token
          setUser(decoded);
        }
      } catch (error) {
        console.error('Error decodificando token:', error);
        setAuthError('Token inválido o expirado');
        setUser(null);
        setToken('');
        setAuthToken('');
        try { window.localStorage.removeItem(TOKEN_STORAGE_KEY); } catch (_) {}
      }
    };
    
    fetchUserCompleteData();
  }, [token]);

  const login = useCallback(async (email, password) => {
    setAuthLoading(true);
    setAuthError('');
    setAuthSuccess('');
    clearTwoFactor();

    try {
      if (!email || !password) {
        throw new Error('Email y contraseña son requeridos');
      }
      const data = await authApi.login(email, password);
      if (data.twoFARequired) {
        if (!data.tempToken) {
          throw new Error('No se pudo iniciar el flujo de verificación 2FA');
        }
        setTwoFactorRequired(true);
        setTwoFactorTempToken(data.tempToken);
        setAuthSuccess('Ingresa el código de autenticación para continuar');
        return { twoFactorRequired: true };
      }
      if (!data.token) {
        throw new Error('No se recibió token del servidor');
      }
      await secureStoreToken(data.token);
      setToken(data.token);
      setAuthSuccess('Login exitoso');
      return { ok: true };
    } catch (error) {
      setAuthError(error.message || 'Error de autenticación');
      console.error('Error en login:', error);
      throw error;
    } finally {
      setAuthLoading(false);
    }
  }, [clearTwoFactor]);

  const verifyTwoFactor = useCallback(async (code) => {
    if (!twoFactorTempToken) {
      const error = new Error('La sesión de verificación ha expirado');
      setTwoFactorError(error.message);
      throw error;
    }
    const normalizedCode = `${code ?? ''}`.trim();
    if (normalizedCode.length < 6) {
      const error = new Error('Ingresa el código de 6 dígitos');
      setTwoFactorError(error.message);
      throw error;
    }

    setTwoFactorLoading(true);
    setTwoFactorError('');

    try {
      const data = await authApi.verifyTwoFactor({ tempToken: twoFactorTempToken, code: normalizedCode });
      if (!data.token) {
        throw new Error('No se recibió token después de verificar 2FA');
      }
      await secureStoreToken(data.token);
      setToken(data.token);
      setAuthSuccess('Login exitoso');
      setTwoFactorRequired(false);
      setTwoFactorTempToken('');
      return { ok: true };
    } catch (error) {
      setTwoFactorError(error.message || 'Código 2FA inválido');
      console.error('Error verificando 2FA:', error);
      throw error;
    } finally {
      setTwoFactorLoading(false);
    }
  }, [twoFactorTempToken]);

  const requestOtp = useCallback(async (channel = 'email') => {
    if (!twoFactorTempToken) {
      const error = new Error('No hay sesión temporal para OTP');
      setTwoFactorError(error.message);
      throw error;
    }
    try {
      const data = await authApi.requestOtp({ channel, tempToken: twoFactorTempToken });
      setAuthSuccess(`Código enviado por ${channel === 'sms' ? 'SMS' : 'correo'}`);
      return { ok: true, ...data };
    } catch (error) {
      setTwoFactorError(error.message || 'No se pudo enviar OTP');
      console.error('Error solicitando OTP:', error);
      throw error;
    }
  }, [twoFactorTempToken]);

  const verifyOtp = useCallback(async (code) => {
    if (!twoFactorTempToken) {
      const error = new Error('No hay sesión temporal para OTP');
      setTwoFactorError(error.message);
      throw error;
    }
    try {
      const data = await authApi.verifyOtp({ tempToken: twoFactorTempToken, code });
      if (!data.token) {
        throw new Error('No se recibió token tras verificar OTP');
      }
      await secureStoreToken(data.token);
      setToken(data.token);
      setAuthSuccess('Login exitoso');
      clearTwoFactor();
      return { ok: true };
    } catch (error) {
      setTwoFactorError(error.message || 'Código OTP incorrecto');
      console.error('Error verificando OTP:', error);
      throw error;
    }
  }, [twoFactorTempToken, clearTwoFactor]);

  const cancelTwoFactor = useCallback(() => {
    clearTwoFactor();
  }, [clearTwoFactor]);

  const logout = useCallback(() => {
    setToken('');
    setUser(null);
    setAuthToken('');
    setAuthSuccess('Sesión cerrada');
    try {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch (error) {
      console.error('Error eliminando token almacenado:', error);
    }
  }, []);

  const updateTwoFactorStatus = useCallback((enabled) => {
    setUser((prev) => (prev ? { ...prev, twoFactorEnabled: enabled } : prev));
  }, []);

  const value = useMemo(() => ({
    token,
    user,
    initializing,
    authLoading,
    authError,
    authSuccess,
    twoFactorRequired,
    twoFactorLoading,
    twoFactorError,
    login,
    logout,
    verifyTwoFactor,
    requestOtp,
    verifyOtp,
    cancelTwoFactor,
    updateTwoFactorStatus,
    setAuthError,
    setAuthSuccess,
    setTwoFactorError,
  }), [
    token,
    user,
    initializing,
    authLoading,
    authError,
    authSuccess,
    twoFactorRequired,
    twoFactorLoading,
    twoFactorError,
    login,
    logout,
    verifyTwoFactor,
    requestOtp,
    verifyOtp,
    cancelTwoFactor,
    updateTwoFactorStatus,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return ctx;
};



