import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { 
  FaMoon, FaSun, FaUserShield, FaUser, FaEnvelope, FaIdBadge, 
  FaCog, FaQrcode, FaCheck, FaTimes, FaSms, FaPalette, FaShieldAlt,
  FaPhone, FaGlobe, FaGraduationCap, FaBookOpen, FaBell, FaLock
} from 'react-icons/fa';

const ConfiguracionEstudiante = ({ userInfo, darkMode, toggleTheme, token, showError, showSuccess }) => {
  // 2FA state
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFAStatusLoading, setTwoFAStatusLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [twoFASecret, setTwoFASecret] = useState('');
  const [twoFAQr, setTwoFAQr] = useState('');
  const [twoFAOtpUrl, setTwoFAOtpUrl] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);

  // OTP (SMS/Email) state
  const [otpChannel, setOtpChannel] = useState('email');
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpSending, setOtpSending] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  // Teléfono state
  const [userPhone, setUserPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+52');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [loadingPhone, setLoadingPhone] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState('cuenta');

  // Notificaciones state
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifCalificaciones, setNotifCalificaciones] = useState(true);
  const [notifAsistencias, setNotifAsistencias] = useState(true);

  // Lista de países
  const countries = [
    { code: '+52', name: '🇲🇽 México', example: '5512345678', length: 10 },
    { code: '+1', name: '🇺🇸 USA/Canadá', example: '2025551234', length: 10 },
    { code: '+34', name: '🇪🇸 España', example: '612345678', length: 9 },
    { code: '+54', name: '🇦🇷 Argentina', example: '91123456789', length: 11 },
    { code: '+56', name: '🇨🇱 Chile', example: '912345678', length: 9 },
    { code: '+57', name: '🇨🇴 Colombia', example: '3001234567', length: 10 },
    { code: '+51', name: '🇵🇪 Perú', example: '987654321', length: 9 },
    { code: '+58', name: '🇻🇪 Venezuela', example: '4121234567', length: 10 },
    { code: '+593', name: '🇪🇨 Ecuador', example: '991234567', length: 9 },
    { code: '+55', name: '🇧🇷 Brasil', example: '11987654321', length: 11 },
  ];

  const selectedCountry = countries.find(c => c.code === countryCode) || countries[0];
  const hasToken = useMemo(() => Boolean(token && typeof token === 'string'), [token]);

  const callAuth = useCallback(async (path, options = {}) => {
    if (!hasToken) throw new Error('Token no disponible');
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`http://localhost:3001${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error || data?.message || `Error ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return data;
  }, [hasToken, token]);

  // Load 2FA status
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!hasToken) return;
      setTwoFAStatusLoading(true);
      try {
        const data = await callAuth('/2fa/status');
        if (mounted) setTwoFAEnabled(Boolean(data?.enabled));
      } catch (e) {
        // no-op
      } finally {
        if (mounted) setTwoFAStatusLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [callAuth, hasToken]);

  // Load user phone
  useEffect(() => {
    let mounted = true;
    const loadPhone = async () => {
      if (!hasToken) return;
      setLoadingPhone(true);
      try {
        const data = await callAuth('/user/phone');
        if (mounted && data?.telefono) {
          const phone = data.telefono;
          setUserPhone(phone);
          const match = phone.match(/^(\+\d{1,4})(\d+)$/);
          if (match) {
            setCountryCode(match[1]);
            setPhoneNumber(match[2]);
          } else {
            setPhoneNumber(phone.replace(/^\+/, ''));
          }
        }
      } catch (e) {
        console.error('Error cargando teléfono:', e);
      } finally {
        if (mounted) setLoadingPhone(false);
      }
    };
    loadPhone();
    return () => { mounted = false; };
  }, [callAuth, hasToken]);

  // Cooldown timer
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const t = setInterval(() => setOtpCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [otpCooldown]);

  const handleToggleTheme = () => {
    try {
      toggleTheme && toggleTheme();
      showSuccess && showSuccess('Tema actualizado');
    } catch (e) {
      showError && showError('No se pudo cambiar el tema');
    }
  };

  const handleGenerateSecret = async () => {
    if (!hasToken) return showError && showError('Token no disponible');
    setGenLoading(true);
    try {
      const data = await callAuth('/2fa/generate-secret', { method: 'POST' });
      setTwoFASecret(data?.secret || '');
      setTwoFAQr(data?.qrCodeDataURL || '');
      setTwoFAOtpUrl(data?.otpauthUrl || '');
      showSuccess && showSuccess('Se generó el secreto 2FA');
    } catch (e) {
      showError && showError(e.message || 'No se pudo generar el secreto 2FA');
    } finally {
      setGenLoading(false);
    }
  };

  const handleVerifyEnable = async () => {
    const code = String(twoFACode || '').trim();
    if (code.length < 6 || !twoFASecret) {
      return showError && showError('Ingresa el código y genera el secreto primero');
    }
    setVerifyLoading(true);
    try {
      await callAuth('/2fa/verify-and-enable', {
        method: 'POST',
        body: JSON.stringify({ secret: twoFASecret, code })
      });
      setTwoFAEnabled(true);
      setTwoFACode('');
      showSuccess && showSuccess('Autenticación de dos factores habilitada');
    } catch (e) {
      if (e && e.status === 400) {
        showError && showError('Código 2FA incorrecto');
      } else {
        showError && showError('No se pudo habilitar 2FA');
      }
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    const code = String(disableCode || '').trim();
    if (code.length < 6) {
      return showError && showError('Ingresa el código 2FA para desactivar');
    }
    setDisableLoading(true);
    try {
      await callAuth('/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ code })
      });
      setTwoFAEnabled(false);
      setTwoFASecret('');
      setTwoFAQr('');
      setTwoFAOtpUrl('');
      setTwoFACode('');
      setDisableCode('');
      showSuccess && showSuccess('2FA desactivado correctamente');
    } catch (e) {
      if (e && e.status === 400) {
        showError && showError('Código 2FA incorrecto');
      } else {
        showError && showError('No se pudo desactivar 2FA');
      }
    } finally {
      setDisableLoading(false);
    }
  };

  const handleSavePhone = async () => {
    const number = String(phoneNumber || '').trim();
    if (!number) {
      return showError && showError('Ingresa tu número de teléfono');
    }
    if (!/^\d{6,14}$/.test(number)) {
      return showError && showError('El número debe contener entre 6 y 14 dígitos');
    }
    
    const fullPhone = countryCode + number;
    setSavingPhone(true);
    try {
      await callAuth('/user/phone', {
        method: 'PUT',
        body: JSON.stringify({ telefono: fullPhone })
      });
      setUserPhone(fullPhone);
      setShowPhoneForm(false);
      showSuccess && showSuccess('Teléfono guardado correctamente');
    } catch (e) {
      showError && showError(e.message || 'No se pudo guardar el teléfono');
    } finally {
      setSavingPhone(false);
    }
  };

  const handleSendOtp = async () => {
    // Prevenir múltiples envíos si ya está en proceso o en cooldown
    if (otpSending || otpCooldown > 0) {
      return;
    }

    if (otpChannel === 'sms' && !userPhone) {
      setShowPhoneForm(true);
      showError && showError('Primero debes configurar tu número de teléfono');
      return;
    }

    setOtpSending(true);
    try {
      const res = await fetch('http://localhost:3001/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: otpChannel, email: userInfo?.email })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Manejar específicamente el error 429 (Too Many Requests)
        if (res.status === 429) {
          const waitTime = data.cooldownSeconds || data.retryAfter || 60;
          setOtpCooldown(waitTime);
          throw new Error(`Demasiadas solicitudes. Espera ${waitTime} segundos antes de intentar de nuevo.`);
        }
        // Manejar error 503 (Service Unavailable) - servicio de correo/SMS no configurado
        if (res.status === 503) {
          throw new Error('El servicio de verificación no está disponible en este momento. Contacta al administrador.');
        }
        // Manejar error 500 o errores de autenticación del servicio
        if (res.status === 500 || (data.error && data.error.includes('Authenticate'))) {
          throw new Error('El servicio de envío de códigos no está configurado. Contacta al administrador.');
        }
        if (data.needsPhone) {
          setShowPhoneForm(true);
          throw new Error(data.message || 'Configura tu número de teléfono');
        }
        throw new Error(data.error || data.message || `No se pudo enviar OTP por ${otpChannel}`);
      }
      setOtpRequested(true);
      // Establecer cooldown mínimo de 60 segundos para evitar spam
      const cooldown = data.cooldownSeconds || 60;
      setOtpCooldown(cooldown);
      showSuccess && showSuccess(`Código enviado por ${otpChannel}. Espera ${cooldown}s para reenviar.`);
    } catch (e) {
      showError && showError(e.message || 'No se pudo enviar OTP');
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = String(otpCode || '').trim();
    if (code.length < 4) return showError && showError('Ingresa el código OTP');
    try {
      const res = await fetch('http://localhost:3001/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userInfo?.email, code })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Código OTP inválido');
      }
      setOtpCode('');
      showSuccess && showSuccess('Código verificado');
    } catch (e) {
      showError && showError(e.message || 'Código OTP inválido');
    }
  };

  // Extraer información del estudiante
  const studentLevel = userInfo?.nivel_estudiante || userInfo?.nivel || userInfo?.level || 'No asignado';
  const studentGrade = userInfo?.grado_estudiante || userInfo?.grado || userInfo?.grade_number || 'N/A';
  const studentSection = userInfo?.section || userInfo?.seccion || 'N/A';

  return (
    <div className="config-estudiante-container">
      <style>{`
        .config-estudiante-container {
          min-height: 100%;
          padding: 24px;
          background: linear-gradient(135deg, #022c22 0%, #064e3b 50%, #022c22 100%);
          color: #f0fdf4;
          animation: fadeIn 0.4s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .config-header-estudiante {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 28px;
          animation: slideInUp 0.5s ease-out;
        }

        .config-header-icon-estudiante {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.6rem;
          color: white;
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.35);
        }

        .config-header-estudiante h2 {
          margin: 0;
          font-size: 1.9rem;
          font-weight: 700;
          background: linear-gradient(135deg, #f0fdf4 0%, #86efac 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .config-header-estudiante p {
          margin: 4px 0 0 0;
          color: rgba(134, 239, 172, 0.8);
          font-size: 0.95rem;
        }

        .config-tabs-estudiante {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          background: rgba(6, 78, 59, 0.4);
          padding: 6px;
          border-radius: 16px;
          border: 1px solid rgba(16, 185, 129, 0.15);
          animation: slideInUp 0.5s ease-out 0.1s backwards;
        }

        .config-tab-estudiante {
          background: transparent;
          border: none;
          padding: 12px 20px;
          border-radius: 12px;
          color: rgba(134, 239, 172, 0.7);
          font-weight: 500;
          font-size: 0.9rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
        }

        .config-tab-estudiante:hover {
          color: #f0fdf4;
          background: rgba(16, 185, 129, 0.1);
        }

        .config-tab-estudiante.active {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(6, 182, 212, 0.2));
          color: #86efac;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }

        .config-card-estudiante {
          background: rgba(6, 78, 59, 0.35);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 24px;
          padding: 24px;
          margin-bottom: 20px;
          backdrop-filter: blur(12px);
          animation: slideInUp 0.5s ease-out 0.2s backwards;
          transition: all 0.3s ease;
        }

        .config-card-estudiante:hover {
          border-color: rgba(16, 185, 129, 0.35);
          box-shadow: 0 8px 32px rgba(16, 185, 129, 0.12);
        }

        .config-card-header-estudiante {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(16, 185, 129, 0.15);
        }

        .config-card-icon-estudiante {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
        }

        .config-card-title-estudiante {
          font-size: 1.15rem;
          font-weight: 600;
          color: #f0fdf4;
          margin: 0;
        }

        .config-card-subtitle-estudiante {
          font-size: 0.85rem;
          color: rgba(134, 239, 172, 0.6);
          margin: 4px 0 0 0;
        }

        .config-info-row-estudiante {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          background: rgba(16, 185, 129, 0.08);
          border-radius: 14px;
          margin-bottom: 12px;
          transition: all 0.2s ease;
        }

        .config-info-row-estudiante:hover {
          background: rgba(16, 185, 129, 0.15);
          transform: translateX(4px);
        }

        .config-info-row-estudiante svg {
          color: #10b981;
          font-size: 1.1rem;
        }

        .config-info-label-estudiante {
          color: rgba(134, 239, 172, 0.8);
          font-size: 0.9rem;
        }

        .config-info-value-estudiante {
          color: #f0fdf4;
          font-weight: 600;
          margin-left: auto;
        }

        .config-btn-estudiante {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: none;
          padding: 12px 24px;
          border-radius: 14px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .config-btn-estudiante:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }

        .config-btn-estudiante:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .config-btn-outline-estudiante {
          background: transparent;
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #86efac;
          box-shadow: none;
        }

        .config-btn-outline-estudiante:hover {
          background: rgba(16, 185, 129, 0.1);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }

        .config-btn-danger-estudiante {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .config-btn-success-estudiante {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
        }

        .config-status-badge-estudiante {
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .config-status-badge-estudiante.enabled {
          background: rgba(34, 197, 94, 0.2);
          color: #4ade80;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .config-status-badge-estudiante.disabled {
          background: rgba(134, 239, 172, 0.15);
          color: #86efac;
          border: 1px solid rgba(134, 239, 172, 0.2);
        }

        .config-input-estudiante {
          background: rgba(6, 78, 59, 0.6);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 12px;
          padding: 12px 16px;
          color: #f0fdf4;
          font-size: 0.95rem;
          width: 100%;
          transition: all 0.2s ease;
        }

        .config-input-estudiante:focus {
          outline: none;
          border-color: rgba(16, 185, 129, 0.5);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
        }

        .config-input-estudiante::placeholder {
          color: rgba(134, 239, 172, 0.4);
        }

        .config-select-estudiante {
          background: rgba(6, 78, 59, 0.6);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 12px;
          padding: 12px 16px;
          color: #f0fdf4;
          font-size: 0.95rem;
          width: 100%;
          cursor: pointer;
        }

        .config-select-estudiante option {
          background: #064e3b;
          color: #f0fdf4;
        }

        .config-qr-container-estudiante {
          display: flex;
          gap: 24px;
          align-items: flex-start;
          padding: 20px;
          background: rgba(16, 185, 129, 0.08);
          border-radius: 18px;
          margin-top: 16px;
          border: 1px solid rgba(16, 185, 129, 0.15);
        }

        .config-qr-container-estudiante img {
          width: 160px;
          height: 160px;
          border-radius: 14px;
          border: 2px solid rgba(16, 185, 129, 0.3);
        }

        .config-secret-code-estudiante {
          background: rgba(16, 185, 129, 0.15);
          padding: 12px 16px;
          border-radius: 10px;
          font-family: monospace;
          font-size: 0.9rem;
          color: #86efac;
          word-break: break-all;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .config-alert-estudiante {
          padding: 16px 20px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .config-alert-estudiante.success {
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #4ade80;
        }

        .config-alert-estudiante.info {
          background: rgba(6, 182, 212, 0.15);
          border: 1px solid rgba(6, 182, 212, 0.3);
          color: #22d3ee;
        }

        .config-radio-group-estudiante {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
        }

        .config-radio-estudiante {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          padding: 12px 20px;
          background: rgba(16, 185, 129, 0.08);
          border-radius: 12px;
          border: 1px solid rgba(16, 185, 129, 0.15);
          transition: all 0.2s ease;
        }

        .config-radio-estudiante:hover {
          background: rgba(16, 185, 129, 0.15);
        }

        .config-radio-estudiante.active {
          background: rgba(16, 185, 129, 0.2);
          border-color: rgba(16, 185, 129, 0.4);
        }

        .config-radio-estudiante input {
          display: none;
        }

        .config-radio-dot-estudiante {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2px solid rgba(134, 239, 172, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .config-radio-estudiante.active .config-radio-dot-estudiante {
          border-color: #10b981;
        }

        .config-radio-estudiante.active .config-radio-dot-estudiante::after {
          content: '';
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #10b981;
        }

        .config-phone-form-estudiante {
          background: rgba(6, 182, 212, 0.1);
          border: 1px solid rgba(6, 182, 212, 0.3);
          border-radius: 18px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .config-phone-form-estudiante h4 {
          color: #22d3ee;
          font-size: 1rem;
          margin: 0 0 12px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .config-phone-preview-estudiante {
          background: rgba(16, 185, 129, 0.15);
          padding: 10px 16px;
          border-radius: 10px;
          color: #86efac;
          font-family: monospace;
          margin-top: 12px;
        }

        .config-grid-estudiante {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .config-toggle-row-estudiante {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          background: rgba(16, 185, 129, 0.08);
          border-radius: 14px;
          margin-bottom: 12px;
        }

        .config-toggle-info-estudiante {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .config-toggle-info-estudiante svg {
          color: #10b981;
        }

        .config-toggle-estudiante {
          position: relative;
          width: 50px;
          height: 26px;
          background: rgba(134, 239, 172, 0.2);
          border-radius: 13px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .config-toggle-estudiante.active {
          background: #10b981;
        }

        .config-toggle-estudiante::after {
          content: '';
          position: absolute;
          top: 3px;
          left: 3px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .config-toggle-estudiante.active::after {
          left: 27px;
        }

        .academic-info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-top: 16px;
        }

        .academic-info-card {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.1));
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 16px;
          padding: 16px;
          text-align: center;
        }

        .academic-info-card svg {
          font-size: 1.5rem;
          color: #10b981;
          margin-bottom: 8px;
        }

        .academic-info-card .label {
          font-size: 0.8rem;
          color: rgba(134, 239, 172, 0.7);
          margin-bottom: 4px;
        }

        .academic-info-card .value {
          font-size: 1.1rem;
          font-weight: 700;
          color: #f0fdf4;
        }

        @media (max-width: 768px) {
          .config-grid-estudiante {
            grid-template-columns: 1fr;
          }
          .config-tabs-estudiante {
            flex-wrap: wrap;
          }
          .config-qr-container-estudiante {
            flex-direction: column;
            align-items: center;
          }
          .config-radio-group-estudiante {
            flex-direction: column;
          }
          .academic-info-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>

      {/* Header */}
      <div className="config-header-estudiante">
        <div className="config-header-icon-estudiante">
          <FaCog />
        </div>
        <div>
          <h2>Mi Configuración</h2>
          <p>Personaliza tu experiencia de aprendizaje</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="config-tabs-estudiante">
        <button 
          className={`config-tab-estudiante ${activeTab === 'cuenta' ? 'active' : ''}`}
          onClick={() => setActiveTab('cuenta')}
        >
          <FaUser /> Mi Perfil
        </button>
        <button 
          className={`config-tab-estudiante ${activeTab === 'apariencia' ? 'active' : ''}`}
          onClick={() => setActiveTab('apariencia')}
        >
          <FaPalette /> Apariencia
        </button>
        <button 
          className={`config-tab-estudiante ${activeTab === 'notificaciones' ? 'active' : ''}`}
          onClick={() => setActiveTab('notificaciones')}
        >
          <FaBell /> Notificaciones
        </button>
        <button 
          className={`config-tab-estudiante ${activeTab === 'seguridad' ? 'active' : ''}`}
          onClick={() => setActiveTab('seguridad')}
        >
          <FaShieldAlt /> Seguridad
        </button>
      </div>

      {/* Tab: Mi Perfil */}
      {activeTab === 'cuenta' && (
        <>
          <div className="config-card-estudiante">
            <div className="config-card-header-estudiante">
              <div className="config-card-icon-estudiante" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
                <FaUser />
              </div>
              <div>
                <h3 className="config-card-title-estudiante">Información Personal</h3>
                <p className="config-card-subtitle-estudiante">Tus datos de estudiante</p>
              </div>
            </div>

            <div className="config-info-row-estudiante">
              <FaUser />
              <span className="config-info-label-estudiante">Nombre completo</span>
              <span className="config-info-value-estudiante">{userInfo?.nombre || 'No disponible'}</span>
            </div>

            <div className="config-info-row-estudiante">
              <FaEnvelope />
              <span className="config-info-label-estudiante">Correo electrónico</span>
              <span className="config-info-value-estudiante">{userInfo?.email || 'No disponible'}</span>
            </div>

            <div className="config-info-row-estudiante">
              <FaIdBadge />
              <span className="config-info-label-estudiante">Rol</span>
              <span className="config-info-value-estudiante" style={{ textTransform: 'capitalize' }}>
                Estudiante
              </span>
            </div>

            <div className="config-info-row-estudiante">
              <FaPhone />
              <span className="config-info-label-estudiante">Teléfono</span>
              <span className="config-info-value-estudiante">
                {loadingPhone ? 'Cargando...' : (userPhone || 'No configurado')}
              </span>
            </div>
          </div>

          {/* Información Académica */}
          <div className="config-card-estudiante">
            <div className="config-card-header-estudiante">
              <div className="config-card-icon-estudiante" style={{ background: 'rgba(6, 182, 212, 0.2)', color: '#06b6d4' }}>
                <FaGraduationCap />
              </div>
              <div>
                <h3 className="config-card-title-estudiante">Información Académica</h3>
                <p className="config-card-subtitle-estudiante">Tu perfil de estudiante en la escuela</p>
              </div>
            </div>

            <div className="academic-info-grid">
              <div className="academic-info-card">
                <FaGraduationCap />
                <div className="label">Nivel Académico</div>
                <div className="value">{studentLevel}</div>
              </div>
              <div className="academic-info-card">
                <FaBookOpen />
                <div className="label">Grado</div>
                <div className="value">{studentGrade}</div>
              </div>
              <div className="academic-info-card">
                <FaIdBadge />
                <div className="label">Sección</div>
                <div className="value">{studentSection}</div>
              </div>
            </div>
          </div>

          {/* Phone Form */}
          {!userPhone && (
            <div className="config-phone-form-estudiante">
              <h4><FaPhone /> Configurar número de teléfono</h4>
              <p style={{ color: 'rgba(134, 239, 172, 0.7)', fontSize: '0.9rem', marginBottom: '16px' }}>
                Agrega tu número para recibir notificaciones importantes.
              </p>
              
              <div className="config-grid-estudiante">
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'rgba(134, 239, 172, 0.7)', marginBottom: '8px', display: 'block' }}>
                    País
                  </label>
                  <select 
                    className="config-select-estudiante"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                  >
                    {countries.map(country => (
                      <option key={country.code} value={country.code}>
                        {country.name} ({country.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'rgba(134, 239, 172, 0.7)', marginBottom: '8px', display: 'block' }}>
                    Número
                  </label>
                  <input
                    type="tel"
                    className="config-input-estudiante"
                    placeholder={selectedCountry.example}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    maxLength="14"
                  />
                </div>
              </div>
              
              <div className="config-phone-preview-estudiante">
                Número completo: {countryCode}{phoneNumber || selectedCountry.example}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button 
                  className="config-btn-estudiante config-btn-success-estudiante"
                  onClick={handleSavePhone}
                  disabled={savingPhone || !phoneNumber}
                >
                  {savingPhone ? 'Guardando...' : <><FaCheck /> Guardar</>}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Tab: Apariencia */}
      {activeTab === 'apariencia' && (
        <div className="config-card-estudiante">
          <div className="config-card-header-estudiante">
            <div className="config-card-icon-estudiante" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa' }}>
              <FaPalette />
            </div>
            <div>
              <h3 className="config-card-title-estudiante">Preferencias de Apariencia</h3>
              <p className="config-card-subtitle-estudiante">Personaliza el aspecto de tu dashboard</p>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '1rem', marginBottom: '12px', color: '#f0fdf4' }}>Tema de la aplicación</h4>
            <p style={{ color: 'rgba(134, 239, 172, 0.6)', fontSize: '0.9rem', marginBottom: '16px' }}>
              Elige entre el tema claro u oscuro según tu preferencia.
            </p>
            <button className="config-btn-estudiante config-btn-outline-estudiante" onClick={handleToggleTheme}>
              {darkMode ? <><FaSun /> Cambiar a tema claro</> : <><FaMoon /> Cambiar a tema oscuro</>}
            </button>
          </div>

          <div className="config-alert-estudiante info">
            <FaGlobe /> El tema seleccionado se aplicará en todas las secciones del dashboard.
          </div>
        </div>
      )}

      {/* Tab: Notificaciones */}
      {activeTab === 'notificaciones' && (
        <div className="config-card-estudiante">
          <div className="config-card-header-estudiante">
            <div className="config-card-icon-estudiante" style={{ background: 'rgba(249, 115, 22, 0.2)', color: '#fb923c' }}>
              <FaBell />
            </div>
            <div>
              <h3 className="config-card-title-estudiante">Preferencias de Notificaciones</h3>
              <p className="config-card-subtitle-estudiante">Configura cómo quieres recibir tus notificaciones</p>
            </div>
          </div>

          <div className="config-toggle-row-estudiante">
            <div className="config-toggle-info-estudiante">
              <FaEnvelope />
              <div>
                <div style={{ color: '#f0fdf4', fontWeight: '500' }}>Notificaciones por correo</div>
                <div style={{ color: 'rgba(134, 239, 172, 0.6)', fontSize: '0.85rem' }}>Recibe alertas en tu email</div>
              </div>
            </div>
            <div 
              className={`config-toggle-estudiante ${notifEmail ? 'active' : ''}`}
              onClick={() => setNotifEmail(!notifEmail)}
            />
          </div>

          <div className="config-toggle-row-estudiante">
            <div className="config-toggle-info-estudiante">
              <FaBell />
              <div>
                <div style={{ color: '#f0fdf4', fontWeight: '500' }}>Notificaciones push</div>
                <div style={{ color: 'rgba(134, 239, 172, 0.6)', fontSize: '0.85rem' }}>Alertas en el navegador</div>
              </div>
            </div>
            <div 
              className={`config-toggle-estudiante ${notifPush ? 'active' : ''}`}
              onClick={() => setNotifPush(!notifPush)}
            />
          </div>

          <div style={{ borderTop: '1px solid rgba(16, 185, 129, 0.15)', margin: '20px 0', paddingTop: '20px' }}>
            <h4 style={{ fontSize: '1rem', marginBottom: '16px', color: '#f0fdf4' }}>Tipos de notificaciones</h4>
          </div>

          <div className="config-toggle-row-estudiante">
            <div className="config-toggle-info-estudiante">
              <FaGraduationCap />
              <div>
                <div style={{ color: '#f0fdf4', fontWeight: '500' }}>Calificaciones</div>
                <div style={{ color: 'rgba(134, 239, 172, 0.6)', fontSize: '0.85rem' }}>Cuando se publiquen nuevas notas</div>
              </div>
            </div>
            <div 
              className={`config-toggle-estudiante ${notifCalificaciones ? 'active' : ''}`}
              onClick={() => setNotifCalificaciones(!notifCalificaciones)}
            />
          </div>

          <div className="config-toggle-row-estudiante">
            <div className="config-toggle-info-estudiante">
              <FaBookOpen />
              <div>
                <div style={{ color: '#f0fdf4', fontWeight: '500' }}>Asistencias</div>
                <div style={{ color: 'rgba(134, 239, 172, 0.6)', fontSize: '0.85rem' }}>Resumen semanal de asistencia</div>
              </div>
            </div>
            <div 
              className={`config-toggle-estudiante ${notifAsistencias ? 'active' : ''}`}
              onClick={() => setNotifAsistencias(!notifAsistencias)}
            />
          </div>
        </div>
      )}

      {/* Tab: Seguridad */}
      {activeTab === 'seguridad' && (
        <>
          {/* 2FA Card */}
          <div className="config-card-estudiante">
            <div className="config-card-header-estudiante">
              <div className="config-card-icon-estudiante" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80' }}>
                <FaUserShield />
              </div>
              <div style={{ flex: 1 }}>
                <h3 className="config-card-title-estudiante">Autenticación de Dos Factores (2FA)</h3>
                <p className="config-card-subtitle-estudiante">Protege tu cuenta con un segundo factor de autenticación</p>
              </div>
              <span className={`config-status-badge-estudiante ${twoFAEnabled ? 'enabled' : 'disabled'}`}>
                {twoFAStatusLoading ? 'Cargando...' : (twoFAEnabled ? 'Habilitada' : 'Deshabilitada')}
              </span>
            </div>

            {!twoFAEnabled ? (
              <>
                <p style={{ color: 'rgba(134, 239, 172, 0.7)', marginBottom: '16px' }}>
                  Usa una aplicación como Google Authenticator o Authy para generar códigos de verificación.
                </p>
                
                <button 
                  className="config-btn-estudiante"
                  onClick={handleGenerateSecret}
                  disabled={genLoading || twoFAStatusLoading}
                >
                  <FaQrcode /> {genLoading ? 'Generando...' : 'Generar código QR'}
                </button>

                {twoFAQr && (
                  <div className="config-qr-container-estudiante">
                    <img src={twoFAQr} alt="QR 2FA" />
                    <div style={{ flex: 1 }}>
                      <p style={{ color: 'rgba(134, 239, 172, 0.7)', marginBottom: '12px' }}>
                        Escanea el código QR con tu aplicación de autenticación o ingresa el secreto manualmente:
                      </p>
                      <div className="config-secret-code-estudiante">{twoFASecret}</div>
                      
                      <div style={{ marginTop: '20px' }}>
                        <label style={{ fontSize: '0.9rem', color: 'rgba(134, 239, 172, 0.7)', marginBottom: '8px', display: 'block' }}>
                          Código de verificación
                        </label>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <input
                            type="text"
                            className="config-input-estudiante"
                            style={{ width: '160px', textAlign: 'center', letterSpacing: '4px', fontWeight: '600' }}
                            placeholder="000000"
                            value={twoFACode}
                            onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            maxLength="6"
                          />
                          <button 
                            className="config-btn-estudiante config-btn-success-estudiante"
                            onClick={handleVerifyEnable}
                            disabled={verifyLoading || !twoFACode || twoFACode.length < 6}
                          >
                            {verifyLoading ? 'Verificando...' : <><FaCheck /> Verificar</>}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="config-alert-estudiante success">
                  <FaCheck /> La autenticación de dos factores está activa para tu cuenta.
                </div>
                
                <div style={{ marginTop: '20px' }}>
                  <p style={{ color: 'rgba(134, 239, 172, 0.7)', marginBottom: '12px' }}>
                    Para desactivar 2FA, ingresa un código de tu aplicación de autenticación:
                  </p>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="config-input-estudiante"
                      style={{ width: '160px', textAlign: 'center', letterSpacing: '4px', fontWeight: '600' }}
                      placeholder="000000"
                      value={disableCode}
                      onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength="6"
                    />
                    <button 
                      className="config-btn-estudiante config-btn-danger-estudiante"
                      onClick={handleDisable2FA}
                      disabled={disableLoading || !disableCode || disableCode.length < 6}
                    >
                      {disableLoading ? 'Desactivando...' : <><FaTimes /> Desactivar</>}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* OTP Card */}
          <div className="config-card-estudiante">
            <div className="config-card-header-estudiante">
              <div className="config-card-icon-estudiante" style={{ background: 'rgba(6, 182, 212, 0.2)', color: '#22d3ee' }}>
                <FaEnvelope />
              </div>
              <div>
                <h3 className="config-card-title-estudiante">Verificación por Correo Electrónico</h3>
                <p className="config-card-subtitle-estudiante">Recibe códigos de verificación en tu correo</p>
              </div>
            </div>

            <p style={{ color: 'rgba(134, 239, 172, 0.7)', marginBottom: '16px' }}>
              Se enviará un código de verificación a tu correo electrónico: <strong>{userInfo?.email}</strong>
            </p>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '16px' }}>
              <button 
                className="config-btn-estudiante"
                onClick={handleSendOtp}
                disabled={otpSending || otpCooldown > 0}
              >
                {otpCooldown > 0 ? `Reenviar en ${otpCooldown}s` : 'Enviar código de prueba'}
              </button>
            </div>

            {otpRequested && (
              <div style={{ marginTop: '20px' }}>
                <label style={{ fontSize: '0.9rem', color: 'rgba(134, 239, 172, 0.7)', marginBottom: '8px', display: 'block' }}>
                  Ingresa el código recibido
                </label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="config-input-estudiante"
                    style={{ width: '160px', textAlign: 'center', letterSpacing: '4px', fontWeight: '600' }}
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength="6"
                  />
                  <button 
                    className="config-btn-estudiante config-btn-success-estudiante"
                    onClick={handleVerifyOtp}
                    disabled={!otpCode || otpCode.length < 4}
                  >
                    <FaCheck /> Verificar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Password Change Hint */}
          <div className="config-card-estudiante">
            <div className="config-card-header-estudiante">
              <div className="config-card-icon-estudiante" style={{ background: 'rgba(249, 115, 22, 0.2)', color: '#fb923c' }}>
                <FaLock />
              </div>
              <div>
                <h3 className="config-card-title-estudiante">Cambiar Contraseña</h3>
                <p className="config-card-subtitle-estudiante">Actualiza tu contraseña periódicamente</p>
              </div>
            </div>

            <p style={{ color: 'rgba(134, 239, 172, 0.7)', marginBottom: '16px' }}>
              Para cambiar tu contraseña, contacta a tu profesor o administrador del sistema.
            </p>

            <div className="config-alert-estudiante info">
              <FaShieldAlt /> Recomendamos cambiar tu contraseña cada 3 meses para mayor seguridad.
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ConfiguracionEstudiante;
