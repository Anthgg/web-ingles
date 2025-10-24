import React, { useState, useEffect } from 'react';
import { FaEnvelope, FaLock, FaUserGraduate, FaChalkboardTeacher, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import ParticlesBackground from '../components/ParticlesBackground';
import DecorativeShapes from '../components/ui/DecorativeShapes';
import logo from './logo/logo.png';

const Login = ({ onLogin, onVerifyTwoFactor, onRequestOtp, onVerifyOtp, error, loading, success, twoFactorRequired, twoFactorLoading, twoFactorError, onCancelTwoFactor }) => {
  const [isHovering, setIsHovering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [otpChannel, setOtpChannel] = useState('email');
  const [otpRequested, setOtpRequested] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleCodeChange = (value) => {
    const v = String(value || '').replace(/[^0-9]/g, '').slice(0, 6);
    setTwoFactorCode(v);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  const handleTwoFactorSubmit = (e) => {
    e.preventDefault();
    if (otpRequested && onVerifyOtp) {
      onVerifyOtp(twoFactorCode);
    } else if (onVerifyTwoFactor) {
      onVerifyTwoFactor(twoFactorCode);
    }
  };

  const handleSendOtp = async () => {
    if (!onRequestOtp) return;
    const res = await onRequestOtp(otpChannel);
    if (res?.ok) {
      setOtpRequested(true);
      if (res.cooldownSeconds) setCooldown(res.cooldownSeconds);
    }
  };

  useEffect(() => {
    if (!twoFactorRequired) {
      setTwoFactorCode('');
      setOtpRequested(false);
    }
  }, [twoFactorRequired]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setCooldown((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const friendlyTwoFactorError = twoFactorError
    ? (() => {
        const m = String(twoFactorError).toLowerCase();
        if (m.includes('2fa') || m.includes('verificar') || m.includes('inv')) return 'Código 2FA incorrecto';
        return twoFactorError;
      })()
    : '';

  return (
    <div className="auth-page">
      <ParticlesBackground theme="educational" />
      <DecorativeShapes />

      {/* Panel informativo */}
      <div className="auth-page__info d-none d-lg-flex">
        <div className="auth-page__hero">
          <img src={logo} alt="I.E Peruano Japonés 7213" className="auth-page__hero-logo" />
          <h1 className="auth-page__title">
            I.E <span style={{ color: 'var(--accent-color)' }}>Peruano Japonés</span> 7213
          </h1>
          <p className="auth-page__subtitle">
            Plataforma integral para la gestión educativa. Diseñada para conectar estudiantes, docentes y administración.
          </p>
        </div>

        <div className="auth-page__grid">
          <article className="auth-info-card">
            <span className="auth-info-card__icon">
              <FaUserGraduate size={18} />
            </span>
            <h5 className="auth-info-card__title">Estudiantes</h5>
            <p className="auth-info-card__description">
              Consulta tu progreso académico, tus clases programadas y recibe notificaciones en tiempo real para no perderte ninguna actividad.
            </p>
          </article>

          <article className="auth-info-card">
            <span className="auth-info-card__icon" style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.9), rgba(59, 130, 246, 0.85))' }}>
              <FaChalkboardTeacher size={18} />
            </span>
            <h5 className="auth-info-card__title">Docentes</h5>
            <p className="auth-info-card__description">
              Gestiona tus cursos, registra asistencias, planifica evaluaciones y entrega retroalimentación personalizada.
            </p>
          </article>
        </div>

        <footer className="auth-page__footer">
          <span>© {new Date().getFullYear()} I.E Peruano Japonés 7213</span>
          <span>Excelencia académica con valores interculturales.</span>
        </footer>
      </div>

      {/* Panel de formulario */}
      <div className="auth-page__form">
        <div className="auth-card">
          <div className="auth-card__body">
            <div className="auth-card__header">
              <div className="auth-card__header--mobile d-lg-none">
                <img src={logo} alt="I.E Peruano Japonés 7213" className="auth-page__hero-logo" style={{ width: '120px' }} />
                <div className="section-heading">
                  <span className="section-heading__eyebrow">Bienvenido de nuevo</span>
                  <h2 className="section-heading__title" style={{ fontSize: '1.85rem' }}>Accede a tu cuenta</h2>
                  <p className="section-heading__description" style={{ fontSize: '0.9rem' }}>
                    Inicia sesión para continuar con tus tareas, clases y comunicaciones.
                  </p>
                </div>
              </div>

              <div className="d-none d-lg-grid section-heading">
                <span className="section-heading__eyebrow">Bienvenido de nuevo</span>
                <h2 className="section-heading__title">Gestiona tu experiencia educativa</h2>
                <p className="section-heading__description" style={{ fontSize: '0.95rem' }}>
                  Ingresa tus credenciales para acceder al campus virtual. Tus datos permanecen protegidos con autenticación de dos factores.
                </p>
              </div>
            </div>

            {success && (
              <div className="alert auth-feedback auth-feedback--success" role="alert">
                <div className="d-flex align-items-center gap-2">
                  <FaCheckCircle />
                  <span>{success}</span>
                </div>
              </div>
            )}

            {!twoFactorRequired ? (
              <form onSubmit={handleSubmit} className="auth-form">
                <div className="auth-form__field">
                  <label htmlFor="email" className="auth-label">Correo electrónico</label>
                  <div className="auth-input-group">
                    <span className="auth-input-icon">
                      <FaEnvelope size={16} />
                    </span>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="auth-input"
                      placeholder="nombre@ejemplo.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                    />
                  </div>
                </div>

                <div className="auth-form__field">
                  <div className="auth-helper">
                    <label htmlFor="password" className="auth-label mb-0">Contraseña</label>
                    <button type="button" className="btn btn-link p-0 auth-link">¿Olvidaste tu contraseña?</button>
                  </div>
                  <div className="auth-input-group">
                    <span className="auth-input-icon">
                      <FaLock size={16} />
                    </span>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      className="auth-input"
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                    />
                  </div>
                </div>

                <div className="auth-helper auth-checkbox">
                  <div className="form-check mb-0">
                    <input className="form-check-input" type="checkbox" id="rememberMe" />
                    <label className="form-check-label" htmlFor="rememberMe">Mantener sesión iniciada</label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="auth-button"
                  disabled={loading}
                  onMouseEnter={() => setIsHovering(true)}
                  onMouseLeave={() => setIsHovering(false)}
                >
                  {loading ? (
                    <div className="d-flex align-items-center justify-content-center gap-2">
                      <div className="spinner-border spinner-border-sm" role="status" style={{ width: '0.9rem', height: '0.9rem' }}>
                        <span className="visually-hidden">Cargando...</span>
                      </div>
                      <span>Iniciando sesión...</span>
                    </div>
                  ) : (
                    'Iniciar sesión'
                  )}
                </button>

                {error && (
                  <div className="alert auth-feedback auth-feedback--error mb-0" role="alert">
                    <div className="d-flex align-items-center gap-2">
                      <FaExclamationCircle />
                      <span>{error}</span>
                    </div>
                  </div>
                )}
              </form>
            ) : (
              <form onSubmit={handleTwoFactorSubmit} className="auth-form">
                <div className="section-heading" style={{ gap: '0.45rem' }}>
                  <span className="section-heading__eyebrow" style={{ fontSize: '0.75rem' }}>Verificación en dos pasos</span>
                  <h3 className="section-heading__title" style={{ fontSize: '1.35rem' }}>Confirma tu identidad</h3>
                  <p className="section-heading__description" style={{ fontSize: '0.9rem' }}>
                    Ingresa el código de 6 dígitos de tu app autenticadora o solicita un código temporal para continuar.
                  </p>
                </div>

                <div className="auth-form__field">
                  <label htmlFor="twoFactorCode" className="auth-label">Código de verificación</label>
                  <div className="auth-otp-options">
                    <label className="auth-otp-radio">
                      <input className="form-check-input" type="radio" name="otpChannel" value="email" checked={otpChannel === 'email'} onChange={() => setOtpChannel('email')} />
                      Correo
                    </label>
                    <label className="auth-otp-radio">
                      <input className="form-check-input" type="radio" name="otpChannel" value="sms" checked={otpChannel === 'sms'} onChange={() => setOtpChannel('sms')} />
                      SMS
                    </label>
                    <button type="button" className="auth-otp-send" onClick={handleSendOtp} disabled={cooldown > 0}>
                      {cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Enviar código'}
                    </button>
                  </div>

                  <div className="auth-input-group" style={{ justifyContent: 'center' }}>
                    <span className="auth-input-icon" style={{ width: '56px', fontSize: '0.95rem' }}>
                      <FaLock size={16} />
                    </span>
                    <input
                      type="text"
                      id="twoFactorCode"
                      name="twoFactorCode"
                      className="auth-input text-center"
                      placeholder="000000"
                      value={twoFactorCode}
                      onChange={(e) => handleCodeChange(e.target.value)}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      autoFocus
                      required
                      style={{ letterSpacing: '6px', fontWeight: 600, fontSize: '1.25rem' }}
                    />
                  </div>
                </div>

                {friendlyTwoFactorError && (
                  <div className="alert auth-feedback auth-feedback--error" role="alert">
                    <div className="d-flex align-items-center gap-2">
                      <FaExclamationCircle />
                      <span>{friendlyTwoFactorError}</span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="auth-button"
                  disabled={twoFactorLoading}
                >
                  {twoFactorLoading ? (
                    <div className="d-flex align-items-center justify-content-center gap-2">
                      <div className="spinner-border spinner-border-sm" role="status" style={{ width: '0.9rem', height: '0.9rem' }}>
                        <span className="visually-hidden">Verificando...</span>
                      </div>
                      <span>Verificando...</span>
                    </div>
                  ) : (
                    'Confirmar código'
                  )}
                </button>

                <button
                  type="button"
                  className="auth-secondary-button"
                  onClick={onCancelTwoFactor}
                  disabled={twoFactorLoading}
                >
                  Cancelar y volver al inicio de sesión
                </button>
              </form>
            )}

            <div className="auth-divider" />
            <p className="auth-support mb-0">
              ¿Problemas para ingresar? <span>Contacta al administrador</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
