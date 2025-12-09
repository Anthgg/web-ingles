import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginView from '../inicio/index.jsx';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const {
    authLoading,
    authError,
    authSuccess,
    twoFactorRequired,
    twoFactorLoading,
    twoFactorError,
    login,
    verifyTwoFactor,
    requestOtp,
    verifyOtp,
    cancelTwoFactor,
    setAuthError,
    setAuthSuccess,
    setTwoFactorError,
    user,
  } = useAuth();

  const navigate = useNavigate();

  useEffect(() => {
    setAuthError('');
    setAuthSuccess('');
    setTwoFactorError('');
  }, [setAuthError, setAuthSuccess, setTwoFactorError]);

  useEffect(() => {
    if (!user) return;

    const role = String(user.rol || '').toLowerCase();
    if (role === 'admin' || role === 'administrativo') {
      navigate('/admin?module=usuarios-incompletos', { replace: true });
      return;
    }
    if (role === 'profesor' || role === 'docente') {
      navigate('/docente', { replace: true });
      return;
    }
    if (role === 'alumno' || role === 'estudiante') {
      navigate('/alumno', { replace: true });
      return;
    }

    navigate('/forbidden', { replace: true });
  }, [user, navigate]);

  const handleLogin = async (email, password) => {
    try {
      await login(email, password);
    } catch (_) {
      // Los errores ya se manejan en el contexto
    }
  };

  const handleVerifyTwoFactor = async (code) => {
    try {
      await verifyTwoFactor(code);
    } catch (_) {
      // Manejado por contexto
    }
  };

  const handleRequestOtp = async (channel) => {
    try {
      const result = await requestOtp(channel);
      return result;
    } catch (error) {
      return { ok: false, error: error.message };
    }
  };

  const handleVerifyOtp = async (code) => {
    try {
      const result = await verifyOtp(code);
      return result;
    } catch (error) {
      return { ok: false, error: error.message };
    }
  };

  return (
    <LoginView
      onLogin={handleLogin}
      onVerifyTwoFactor={handleVerifyTwoFactor}
      onRequestOtp={handleRequestOtp}
      onVerifyOtp={handleVerifyOtp}
      error={authError}
      loading={authLoading}
      success={authSuccess}
      twoFactorRequired={twoFactorRequired}
      twoFactorLoading={twoFactorLoading}
      twoFactorError={twoFactorError}
      onCancelTwoFactor={cancelTwoFactor}
    />
  );
};

export default LoginPage;
