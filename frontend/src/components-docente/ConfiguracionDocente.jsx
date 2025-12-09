import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { 
  FaMoon, FaSun, FaUserShield, FaUser, FaEnvelope, FaIdBadge, 
  FaCog, FaQrcode, FaCheck, FaTimes, FaSms, FaPalette, FaShieldAlt,
  FaPhone, FaGlobe
} from 'react-icons/fa';

const ConfiguracionDocente = ({ userInfo, darkMode, toggleTheme, token, showError, showSuccess }) => {
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
  const [countryCode, setCountryCode] = useState('+51');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [loadingPhone, setLoadingPhone] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState('cuenta');

  // Lista de países
  const countries = [
    { code: '+51', name: '🇵🇪 Perú', example: '987654321', length: 9 },
    { code: '+52', name: '🇲🇽 México', example: '5512345678', length: 10 },
    { code: '+1', name: '🇺🇸 USA/Canadá', example: '2025551234', length: 10 },
    { code: '+34', name: '🇪🇸 España', example: '612345678', length: 9 },
    { code: '+54', name: '🇦🇷 Argentina', example: '91123456789', length: 11 },
    { code: '+56', name: '🇨🇱 Chile', example: '912345678', length: 9 },
    { code: '+57', name: '🇨🇴 Colombia', example: '3001234567', length: 10 },
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
      return showError && showError('Ingresa el codigo 2FA para desactivar');
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
        if (data.needsPhone) {
          setShowPhoneForm(true);
          throw new Error(data.message || 'Configura tu número de teléfono');
        }
        throw new Error(data.error || `No se pudo enviar OTP por ${otpChannel}`);
      }
      setOtpRequested(true);
      if (data.cooldownSeconds) setOtpCooldown(data.cooldownSeconds);
      showSuccess && showSuccess(`Código enviado por ${otpChannel}.`);
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

  return (
    <div className="config-docente-container">
      <style>{`
        .config-docente-container {
          min-height: 100%;
          padding: 24px;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          color: #f8fafc;
        }

        .config-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 28px;
        }

        .config-header-icon {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          color: white;
        }

        .config-header h2 {
          margin: 0;
          font-size: 1.8rem;
          font-weight: 700;
          background: linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .config-header p {
          margin: 4px 0 0 0;
          color: rgba(148, 163, 184, 0.8);
          font-size: 0.95rem;
        }

        .config-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          background: rgba(15, 23, 42, 0.5);
          padding: 6px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .config-tab {
          background: transparent;
          border: none;
          padding: 12px 20px;
          border-radius: 10px;
          color: rgba(148, 163, 184, 0.8);
          font-weight: 500;
          font-size: 0.9rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .config-tab:hover {
          color: #f8fafc;
          background: rgba(255, 255, 255, 0.05);
        }

        .config-tab.active {
          background: rgba(99, 102, 241, 0.2);
          color: #a5b4fc;
        }

        .config-card {
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 20px;
          backdrop-filter: blur(12px);
        }

        .config-card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .config-card-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
        }

        .config-card-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #f8fafc;
          margin: 0;
        }

        .config-card-subtitle {
          font-size: 0.85rem;
          color: rgba(148, 163, 184, 0.7);
          margin: 4px 0 0 0;
        }

        .config-info-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          margin-bottom: 12px;
        }

        .config-info-row svg {
          color: #818cf8;
          font-size: 1rem;
        }

        .config-info-label {
          color: rgba(148, 163, 184, 0.8);
          font-size: 0.9rem;
        }

        .config-info-value {
          color: #f8fafc;
          font-weight: 600;
          margin-left: auto;
        }

        .config-btn {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border: none;
          padding: 12px 24px;
          border-radius: 12px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
        }

        .config-btn:hover {
          opacity: 0.9;
        }

        .config-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .config-btn-outline {
          background: transparent;
          border: 1px solid rgba(99, 102, 241, 0.4);
          color: #a5b4fc;
        }

        .config-btn-outline:hover {
          background: rgba(99, 102, 241, 0.1);
        }

        .config-btn-danger {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        }

        .config-btn-success {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
        }

        .config-status-badge {
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .config-status-badge.enabled {
          background: rgba(34, 197, 94, 0.2);
          color: #4ade80;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .config-status-badge.disabled {
          background: rgba(148, 163, 184, 0.2);
          color: #94a3b8;
          border: 1px solid rgba(148, 163, 184, 0.3);
        }

        .config-input {
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 12px 16px;
          color: #f8fafc;
          font-size: 0.95rem;
          width: 100%;
        }

        .config-input:focus {
          outline: none;
          border-color: rgba(99, 102, 241, 0.5);
        }

        .config-input::placeholder {
          color: rgba(148, 163, 184, 0.5);
        }

        .config-select {
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 12px 16px;
          color: #f8fafc;
          font-size: 0.95rem;
          width: 100%;
          cursor: pointer;
        }

        .config-select option {
          background: #1e293b;
          color: #f8fafc;
        }

        .config-code-input {
          display: flex;
          gap: 8px;
        }

        .config-code-input input {
          width: 48px;
          height: 56px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          color: #f8fafc;
          font-size: 1.5rem;
          font-weight: 700;
          text-align: center;
        }

        .config-code-input input:focus {
          outline: none;
          border-color: rgba(99, 102, 241, 0.5);
        }

        .config-qr-container {
          display: flex;
          gap: 24px;
          align-items: flex-start;
          padding: 20px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 16px;
          margin-top: 16px;
        }

        .config-qr-container img {
          width: 160px;
          height: 160px;
          border-radius: 12px;
        }

        .config-secret-code {
          background: rgba(99, 102, 241, 0.1);
          padding: 10px 16px;
          border-radius: 8px;
          font-family: monospace;
          font-size: 0.9rem;
          color: #a5b4fc;
          word-break: break-all;
        }

        .config-alert {
          padding: 16px 20px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .config-alert.success {
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #4ade80;
        }

        .config-alert.info {
          background: rgba(59, 130, 246, 0.15);
          border: 1px solid rgba(59, 130, 246, 0.3);
          color: #60a5fa;
        }

        .config-radio-group {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
        }

        .config-radio {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          padding: 12px 20px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .config-radio.active {
          background: rgba(99, 102, 241, 0.15);
          border-color: rgba(99, 102, 241, 0.4);
        }

        .config-radio input {
          display: none;
        }

        .config-radio-dot {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2px solid rgba(148, 163, 184, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .config-radio.active .config-radio-dot {
          border-color: #818cf8;
        }

        .config-radio.active .config-radio-dot::after {
          content: '';
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #818cf8;
        }

        .config-phone-form {
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .config-phone-form h4 {
          color: #60a5fa;
          font-size: 1rem;
          margin: 0 0 12px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .config-phone-preview {
          background: rgba(99, 102, 241, 0.1);
          padding: 10px 16px;
          border-radius: 8px;
          color: #a5b4fc;
          font-family: monospace;
          margin-top: 8px;
        }

        .config-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        @media (max-width: 768px) {
          .config-grid {
            grid-template-columns: 1fr;
          }
          .config-tabs {
            flex-wrap: wrap;
          }
          .config-qr-container {
            flex-direction: column;
            align-items: center;
          }
        }
      `}</style>

      {/* Header */}
      <div className="config-header">
        <div className="config-header-icon">
          <FaCog />
        </div>
        <div>
          <h2>Configuración</h2>
          <p>Personaliza tu experiencia y seguridad</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="config-tabs">
        <button 
          className={`config-tab ${activeTab === 'cuenta' ? 'active' : ''}`}
          onClick={() => setActiveTab('cuenta')}
        >
          <FaUser /> Mi Cuenta
        </button>
        <button 
          className={`config-tab ${activeTab === 'apariencia' ? 'active' : ''}`}
          onClick={() => setActiveTab('apariencia')}
        >
          <FaPalette /> Apariencia
        </button>
        <button 
          className={`config-tab ${activeTab === 'seguridad' ? 'active' : ''}`}
          onClick={() => setActiveTab('seguridad')}
        >
          <FaShieldAlt /> Seguridad
        </button>
      </div>

      {/* Tab: Mi Cuenta */}
      {activeTab === 'cuenta' && (
        <div className="config-card">
          <div className="config-card-header">
            <div className="config-card-icon" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8' }}>
              <FaUser />
            </div>
            <div>
              <h3 className="config-card-title">Información de la Cuenta</h3>
              <p className="config-card-subtitle">Tus datos personales y de contacto</p>
            </div>
          </div>

          <div className="config-info-row">
            <FaUser />
            <span className="config-info-label">Nombre completo</span>
            <span className="config-info-value">{userInfo?.nombre || 'No disponible'}</span>
          </div>

          <div className="config-info-row">
            <FaEnvelope />
            <span className="config-info-label">Correo electrónico</span>
            <span className="config-info-value">{userInfo?.email || 'No disponible'}</span>
          </div>

          <div className="config-info-row">
            <FaIdBadge />
            <span className="config-info-label">Rol</span>
            <span className="config-info-value" style={{ textTransform: 'capitalize' }}>
              {userInfo?.rol || 'Docente'}
            </span>
          </div>

          <div className="config-info-row">
            <FaPhone />
            <span className="config-info-label">Teléfono</span>
            <span className="config-info-value">
              {loadingPhone ? 'Cargando...' : (userPhone || 'No configurado')}
            </span>
          </div>

          {/* Phone Form */}
          {!userPhone && (
            <div className="config-phone-form" style={{ marginTop: '20px' }}>
              <h4><FaPhone /> Configurar número de teléfono</h4>
              <p style={{ color: 'rgba(148, 163, 184, 0.8)', fontSize: '0.9rem', marginBottom: '16px' }}>
                Agrega tu número para recibir códigos de verificación por SMS.
              </p>
              
              <div className="config-grid">
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'rgba(148, 163, 184, 0.8)', marginBottom: '8px', display: 'block' }}>
                    País
                  </label>
                  <select 
                    className="config-select"
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
                  <label style={{ fontSize: '0.85rem', color: 'rgba(148, 163, 184, 0.8)', marginBottom: '8px', display: 'block' }}>
                    Número
                  </label>
                  <input
                    type="tel"
                    className="config-input"
                    placeholder={selectedCountry.example}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    maxLength="14"
                  />
                </div>
              </div>
              
              <div className="config-phone-preview">
                Número completo: {countryCode}{phoneNumber || selectedCountry.example}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button 
                  className="config-btn config-btn-success"
                  onClick={handleSavePhone}
                  disabled={savingPhone || !phoneNumber}
                >
                  {savingPhone ? 'Guardando...' : <><FaCheck /> Guardar</>}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Apariencia */}
      {activeTab === 'apariencia' && (
        <div className="config-card">
          <div className="config-card-header">
            <div className="config-card-icon" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}>
              <FaPalette />
            </div>
            <div>
              <h3 className="config-card-title">Preferencias de Apariencia</h3>
              <p className="config-card-subtitle">Personaliza el aspecto de la aplicación</p>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '1rem', marginBottom: '12px', color: '#f8fafc' }}>Tema</h4>
            <p style={{ color: 'rgba(148, 163, 184, 0.7)', fontSize: '0.9rem', marginBottom: '16px' }}>
              Selecciona tu preferencia de tema para toda la aplicación.
            </p>
            <button className="config-btn config-btn-outline" onClick={handleToggleTheme}>
              {darkMode ? <><FaSun /> Usar tema claro</> : <><FaMoon /> Usar tema oscuro</>}
            </button>
          </div>
        </div>
      )}

      {/* Tab: Seguridad */}
      {activeTab === 'seguridad' && (
        <>
          {/* 2FA Card */}
          <div className="config-card">
            <div className="config-card-header">
              <div className="config-card-icon" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80' }}>
                <FaUserShield />
              </div>
              <div style={{ flex: 1 }}>
                <h3 className="config-card-title">Autenticación de Dos Factores (2FA)</h3>
                <p className="config-card-subtitle">Protege tu cuenta con un segundo factor de autenticación</p>
              </div>
              <span className={`config-status-badge ${twoFAEnabled ? 'enabled' : 'disabled'}`}>
                {twoFAStatusLoading ? 'Cargando...' : (twoFAEnabled ? 'Habilitada' : 'Deshabilitada')}
              </span>
            </div>

            {!twoFAEnabled ? (
              <>
                <p style={{ color: 'rgba(148, 163, 184, 0.8)', marginBottom: '16px' }}>
                  Usa una aplicación como Google Authenticator o Authy para generar códigos de verificación.
                </p>
                
                <button 
                  className="config-btn"
                  onClick={handleGenerateSecret}
                  disabled={genLoading || twoFAStatusLoading}
                >
                  <FaQrcode /> {genLoading ? 'Generando...' : 'Generar código QR'}
                </button>

                {twoFAQr && (
                  <div className="config-qr-container">
                    <img src={twoFAQr} alt="QR 2FA" />
                    <div style={{ flex: 1 }}>
                      <p style={{ color: 'rgba(148, 163, 184, 0.8)', marginBottom: '12px' }}>
                        Escanea el código QR con tu aplicación de autenticación o ingresa el secreto manualmente:
                      </p>
                      <div className="config-secret-code">{twoFASecret}</div>
                      
                      <div style={{ marginTop: '20px' }}>
                        <label style={{ fontSize: '0.9rem', color: 'rgba(148, 163, 184, 0.8)', marginBottom: '8px', display: 'block' }}>
                          Código de verificación
                        </label>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <input
                            type="text"
                            className="config-input"
                            style={{ width: '160px', textAlign: 'center', letterSpacing: '4px', fontWeight: '600' }}
                            placeholder="000000"
                            value={twoFACode}
                            onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            maxLength="6"
                          />
                          <button 
                            className="config-btn config-btn-success"
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
                <div className="config-alert success">
                  <FaCheck /> La autenticación de dos factores está activa para tu cuenta.
                </div>
                
                <div style={{ marginTop: '20px' }}>
                  <p style={{ color: 'rgba(148, 163, 184, 0.8)', marginBottom: '12px' }}>
                    Para desactivar 2FA, ingresa un código de tu aplicación de autenticación:
                  </p>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="config-input"
                      style={{ width: '160px', textAlign: 'center', letterSpacing: '4px', fontWeight: '600' }}
                      placeholder="000000"
                      value={disableCode}
                      onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength="6"
                    />
                    <button 
                      className="config-btn config-btn-danger"
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
          <div className="config-card">
            <div className="config-card-header">
              <div className="config-card-icon" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
                <FaEnvelope />
              </div>
              <div>
                <h3 className="config-card-title">Verificación por Correo Electrónico</h3>
                <p className="config-card-subtitle">Recibe códigos de verificación en tu correo</p>
              </div>
            </div>

            <p style={{ color: 'rgba(148, 163, 184, 0.8)', marginBottom: '16px' }}>
              Se enviará un código de verificación a tu correo electrónico: <strong style={{ color: '#a5b4fc' }}>{userInfo?.email}</strong>
            </p>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '16px' }}>
              <button 
                className="config-btn"
                onClick={handleSendOtp}
                disabled={otpSending || otpCooldown > 0}
              >
                {otpCooldown > 0 ? `Reenviar en ${otpCooldown}s` : 'Enviar código'}
              </button>
            </div>

            {otpRequested && (
              <div style={{ marginTop: '20px' }}>
                <label style={{ fontSize: '0.9rem', color: 'rgba(148, 163, 184, 0.8)', marginBottom: '8px', display: 'block' }}>
                  Ingresa el código recibido
                </label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="config-input"
                    style={{ width: '160px', textAlign: 'center', letterSpacing: '4px', fontWeight: '600' }}
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength="6"
                  />
                  <button 
                    className="config-btn config-btn-success"
                    onClick={handleVerifyOtp}
                    disabled={!otpCode || otpCode.length < 4}
                  >
                    <FaCheck /> Verificar
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ConfiguracionDocente;
