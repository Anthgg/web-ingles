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
    setAuthToken(token);
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const decoded = decodeToken(token);
      setUser(decoded);
    } catch (error) {
      console.error('Error decodificando token:', error);
      setAuthError('Token inválido o expirado');
      setUser(null);
      setToken('');
      setAuthToken('');
      try { window.localStorage.removeItem(TOKEN_STORAGE_KEY); } catch (_) {}
    }
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
