import React, { useCallback, useEffect, useMemo, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FaMoon, FaSun, FaUserShield, FaUser, FaEnvelope, FaIdBadge, FaCog, FaQrcode, FaCheck, FaTimes, FaSms } from 'react-icons/fa';
import CodeInput from './CodeInput';
import { useTheme } from '../context/ThemeContext';

const Configuracion = ({ userInfo, darkMode, toggleTheme, token, showError, showSuccess }) => {
  const { customColors, updateCustomColors } = useTheme();
  const handleToggleTheme = () => {
    try {
      toggleTheme && toggleTheme();
      showSuccess && showSuccess('Tema actualizado');
    } catch (e) {
      showError && showError('No se pudo cambiar el tema');
    }
  };

  const handleColorChange = () => {
    updateCustomColors({ primary: primaryColor, secondary: secondaryColor });
    showSuccess && showSuccess('Colores personalizados actualizados');
  };

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

  // Custom colors state
  const [primaryColor, setPrimaryColor] = useState(customColors.primary);
  const [secondaryColor, setSecondaryColor] = useState(customColors.secondary);

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
        // no-op; puede que el usuario aún no tenga 2FA
      } finally {
        if (mounted) setTwoFAStatusLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [callAuth, hasToken]);

  // Cooldown timer for OTP resend
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const t = setInterval(() => setOtpCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [otpCooldown]);

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
      // Mensaje amigable para códigos inválidos
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

  // OTP send (SMS/Email)
  const handleSendOtp = async () => {
    setOtpSending(true);
    try {
      const res = await fetch('http://localhost:3001/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: otpChannel, email: userInfo?.email })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || `No se pudo enviar OTP por ${otpChannel}`;
        throw new Error(msg);
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

  // OTP verify (SMS/Email)
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
        const msg = data.error || 'Código OTP inválido';
        throw new Error(msg);
      }
      setOtpCode('');
      showSuccess && showSuccess('Código verificado');
    } catch (e) {
      showError && showError(e.message || 'Código OTP inválido');
    }
  };

  return (
    <div className="p-4">
      <style>{`
        .config-card { border: none; box-shadow: 0 8px 24px rgba(0,0,0,0.08); border-radius: 16px; }
        .section-title { font-weight: 700; }
        .muted { color: #64748b; }
      `}</style>

      <div className="d-flex align-items-center mb-4">
        <FaCog className="me-2" />
        <h3 className="mb-0">Configuración del Sistema</h3>
      </div>

      {/* Preferencias de Apariencia */}
      <div className="card config-card mb-4">
        <div className="card-body">
          <h5 className="section-title mb-3">Apariencia</h5>
          <p className="muted mb-3">Selecciona tu preferencia de tema para toda la aplicación.</p>
          <button className="btn btn-outline-primary me-2" onClick={handleToggleTheme}>
            {darkMode ? (<><FaSun className="me-2"/> Usar tema claro</>) : (<><FaMoon className="me-2"/> Usar tema oscuro</>)}
          </button>
          
          <h6 className="mt-4 mb-3">Colores Personalizados</h6>
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label htmlFor="primaryColor" className="form-label">Color Primario</label>
              <input
                type="color"
                className="form-control form-control-color"
                id="primaryColor"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                title="Selecciona el color primario"
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="secondaryColor" className="form-label">Color Secundario</label>
              <input
                type="color"
                className="form-control form-control-color"
                id="secondaryColor"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                title="Selecciona el color secundario"
              />
            </div>
          </div>
          <button className="btn btn-outline-secondary" onClick={handleColorChange}>
            Aplicar Colores
          </button>
        </div>
      </div>

      {/* Información de la Cuenta */}
      <div className="card config-card mb-4">
        <div className="card-body">
          <h5 className="section-title mb-3">Cuenta</h5>
          <div className="row g-3">
            <div className="col-md-4 d-flex align-items-center"><FaUser className="me-2"/> Nombre: <span className="ms-2 fw-semibold">{userInfo?.nombre || '-'}</span></div>
            <div className="col-md-4 d-flex align-items-center"><FaIdBadge className="me-2"/> Rol: <span className="ms-2 fw-semibold text-capitalize">{userInfo?.rol || '-'}</span></div>
            <div className="col-md-4 d-flex align-items-center"><FaEnvelope className="me-2"/> Email: <span className="ms-2 fw-semibold">{userInfo?.email || '-'}</span></div>
          </div>
        </div>
      </div>

      {/* Seguridad: 2FA */}
      <div className="card config-card">
        <div className="card-body">
          <h5 className="section-title mb-3">Seguridad</h5>
          <div className="d-flex align-items-center mb-2">
            <FaUserShield className="me-2"/>
            <span>Autenticación de dos factores</span>
            <span className={`badge ms-3 ${twoFAEnabled ? 'bg-success' : 'bg-secondary'}`}>
              {twoFAEnabled ? 'Habilitada' : 'Deshabilitada'}
            </span>
          </div>

          {!twoFAEnabled && (
            <div className="mb-2">
              <button className="btn btn-outline-primary me-2" onClick={handleGenerateSecret} disabled={genLoading || twoFAStatusLoading}>
                <FaQrcode className="me-2"/> {genLoading ? 'Generando...' : 'Generar secreto 2FA'}
              </button>
            </div>
          )}

          {(twoFAQr && !twoFAEnabled) && (
            <div className="row g-3 align-items-start mb-2">
              <div className="col-auto">
                <img src={twoFAQr} alt="QR 2FA" style={{ width: 160, height: 160 }} />
              </div>
              <div className="col">
                <div className="mb-2"><strong>Secreto:</strong> <code>{twoFASecret}</code></div>
                <div className="mb-3 small text-muted" style={{wordBreak:'break-all'}}>{twoFAOtpUrl}</div>
                <div className="d-flex align-items-center gap-2" style={{maxWidth: 360}}>
                  <CodeInput value={twoFACode} onChange={setTwoFACode} autoFocus length={6} />
                  <button className="btn btn-success" onClick={handleVerifyEnable} disabled={verifyLoading || !twoFACode || twoFACode.length < 6}>
                    {verifyLoading ? 'Verificando...' : (<><FaCheck className="me-1"/> Verificar</>)}
                  </button>
                </div>
              </div>
            </div>
          )}

          {twoFAEnabled && (
            <>
              <div className="alert alert-success d-flex align-items-center mt-3" role="alert">
                <FaCheck className="me-2"/> 2FA activo para tu cuenta.
              </div>
              <div className="mt-3" style={{maxWidth: 360}}>
                <label className="form-label">Codigo 2FA</label>
                <div className="d-flex align-items-center gap-2">
                  <CodeInput value={disableCode} onChange={setDisableCode} length={6} />
                  <button className="btn btn-outline-danger" onClick={handleDisable2FA} disabled={disableLoading || !disableCode || disableCode.length < 6}>
                    {disableLoading ? 'Desactivando...' : (<><FaTimes className="me-1"/> Desactivar</>)}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* OTP por SMS o Email */}
      <div className="card config-card mt-4">
        <div className="card-body">
          <h5 className="section-title mb-3">OTP por SMS o Correo</h5>
          <p className="muted mb-2">Recibe un código OTP por el canal elegido para validar tu contacto.</p>

          <div className="d-flex align-items-center mb-3">
            <div className="form-check form-check-inline">
              <input className="form-check-input" type="radio" name="otpCh" id="cfgOtpEmail" checked={otpChannel==='email'} onChange={() => setOtpChannel('email')} />
              <label className="form-check-label" htmlFor="cfgOtpEmail"><FaEnvelope className="me-1"/> Correo</label>
            </div>
            <div className="form-check form-check-inline">
              <input className="form-check-input" type="radio" name="otpCh" id="cfgOtpSms" checked={otpChannel==='sms'} onChange={() => setOtpChannel('sms')} />
              <label className="form-check-label" htmlFor="cfgOtpSms"><FaSms className="me-1"/> SMS</label>
            </div>
            <button className="btn btn-outline-primary btn-sm ms-2" onClick={handleSendOtp} disabled={otpSending || otpCooldown>0}>
              {otpCooldown>0 ? `Reenviar en ${otpCooldown}s` : 'Enviar código'}
            </button>
          </div>

          <div className="d-flex align-items-center gap-2" style={{maxWidth: 360}}>
            <CodeInput value={otpCode} onChange={setOtpCode} length={6} />
            <button className="btn btn-primary" onClick={handleVerifyOtp} disabled={!otpRequested || !otpCode || otpCode.length < 4}>
              Verificar
            </button>
          </div>

          <div className="small text-muted mt-2">Usa este paso para validar tu correo o teléfono. No reemplaza tu 2FA por app a menos que lo desactives.</div>
        </div>
      </div>
    </div>
  );
};

export default Configuracion;
