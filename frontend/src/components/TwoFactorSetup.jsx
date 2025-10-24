import React, { useEffect, useState } from 'react';

const parseJsonSafe = async (response) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    return text;
  }
};

const TwoFactorSetup = ({ token, userInfo, onStatusChange, showError, showSuccess }) => {
  const [statusLoading, setStatusLoading] = useState(false);
  const [enabled, setEnabled] = useState(Boolean(userInfo?.twoFactorEnabled));
  const [secretData, setSecretData] = useState(null);
  const [code, setCode] = useState('');
  const [generating, setGenerating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setEnabled(Boolean(userInfo?.twoFactorEnabled));
  }, [userInfo?.twoFactorEnabled]);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    const fetchStatus = async () => {
      setStatusLoading(true);
      try {
        const res = await fetch('http://localhost:3001/2fa/status', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        const raw = await parseJsonSafe(res);

        if (!res.ok) {
          const message = (raw && raw.error) || 'No se pudo obtener el estado de 2FA';
          throw new Error(message);
        }

        const data = raw || {};
        const isEnabled = Boolean(data.enabled);
        setEnabled(isEnabled);
        if (onStatusChange) onStatusChange(isEnabled);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Error obteniendo estado 2FA:', err);
        showError && showError(err.message || 'Error consultando el estado de 2FA');
      } finally {
        if (!controller.signal.aborted) {
          setStatusLoading(false);
        }
      }
    };

    fetchStatus();

    return () => controller.abort();
  }, [token, onStatusChange, showError]);

  const handleGenerateSecret = async () => {
    if (!token) return;

    setGenerating(true);
    setLocalError('');
    setCode('');

    try {
      const res = await fetch('http://localhost:3001/2fa/generate-secret', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const raw = await parseJsonSafe(res);

      if (!res.ok) {
        const message = (raw && raw.error) || 'No se pudo generar un nuevo secreto';
        throw new Error(message);
      }

      const data = raw || {};
      setSecretData({
        secret: data.secret,
        qrCodeDataURL: data.qrCodeDataURL,
        otpauthUrl: data.otpauthUrl,
      });
      showSuccess && showSuccess('Escanea el codigo QR con tu app autenticadora y confirma el codigo.');
    } catch (err) {
      console.error('Error generando doble factor de autenticacion :', err);
      const message = err.message || 'Error generando codigo de autenticacion';
      setLocalError(message);
      showError && showError(message);
    } finally {
      setGenerating(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();

    if (!secretData?.secret) {
      setLocalError('Debes generar el codigo QR antes de confirmar.');
      return;
    }

    if (!code || code.trim().length < 6) {
      setLocalError('Ingresa el codigo de 6 digitos.');
      return;
    }

    setVerifying(true);
    setLocalError('');

    try {
      const res = await fetch('http://localhost:3001/2fa/verify-and-enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ secret: secretData.secret, code }),
      });

      const raw = await parseJsonSafe(res);

      if (!res.ok) {
        const message = (raw && raw.error) || 'No se pudo verificar el codigo 2FA';
        throw new Error(message);
      }

      setEnabled(true);
      setSecretData(null);
      setCode('');
      showSuccess && showSuccess('Autenticación de dos factores habilitada correctamente.');
      if (onStatusChange) onStatusChange(true);
    } catch (err) {
      console.error('Error verificando secreto 2FA:', err);
      const message = err.message || 'Código 2FA inválido';
      setLocalError(message);
      showError && showError(message);
    } finally {
      setVerifying(false);
    }
  };

  const handleCodeChange = (event) => {
    const value = event.target.value.replace(/[^0-9]/g, '');
    setCode(value.slice(0, 6));
  };

  const canGenerate = Boolean(token) && !generating && !verifying;
  const showSetupForm = !enabled && secretData;

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body p-4">
        <h5 className="fw-bold mb-2">Autenticaci�n de dos factores (2FA)</h5>
        <p className="text-muted mb-4">
          Protege tu cuenta utilizando c�digos de verificaci�n generados por Google Authenticator u otra app compatible con TOTP.
        </p>

        {statusLoading ? (
          <div className="d-flex align-items-center gap-2 text-muted mb-3">
            <div className="spinner-border spinner-border-sm" role="status" />
            <span>Consultando estado de seguridad...</span>
          </div>
        ) : enabled ? (
          <div className="alert alert-success border-0">
            <strong>2FA activa.</strong> Cada inicio de sesion requerira tu codigo temporal.
          </div>
        ) : (
          <div className="alert alert-warning border-0">
            <strong>2FA desactivada.</strong> Te recomendamos activar la verificacion en dos pasos para reforzar la seguridad.
          </div>
        )}

        {localError && (
          <div className="alert alert-danger border-0 py-2">
            {localError}
          </div>
        )}

        <div className="d-flex gap-3 flex-column flex-lg-row align-items-start">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canGenerate || enabled}
            onClick={handleGenerateSecret}
          >
            {enabled ? '2FA ya esta activa' : generating ? 'Generando...' : 'Generar codigo QR'}
          </button>

          {showSetupForm && (
            <div className="flex-grow-1">
              <div className="row g-3 align-items-center">
                <div className="col-md-5 text-center">
                  {secretData.qrCodeDataURL ? (
                    <img
                      src={secretData.qrCodeDataURL}
                      alt="Codigo QR 2FA"
                      className="img-fluid border rounded p-2"
                      style={{ maxWidth: '220px' }}
                    />
                  ) : (
                    <div className="text-muted small">No se pudo cargar el codigo QR.</div>
                  )}
                </div>
                <div className="col-md-7">
                  <form onSubmit={handleVerify}>
                    <div className="mb-3">
                      <label className="form-label fw-semibold small text-muted text-uppercase">
                        Codigo de verificacion
                      </label>
                      <input
                        type="text"
                        value={code}
                        onChange={handleCodeChange}
                        className="form-control"
                        placeholder="000000"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        autoFocus
                        required
                      />
                      <small className="text-muted">
                        Introduce el codigo de 6 digitos mostrado en tu aplicacion de autenticacion.
                      </small>
                    </div>
                    <button
                      type="submit"
                      className="btn btn-success"
                      disabled={verifying || code.length < 6}
                    >
                      {verifying ? 'Verificando...' : 'Confirmar y habilitar 2FA'}
                    </button>
                  </form>

                  <div className="mt-3 p-2 bg-light rounded small">
                    <div className="fw-semibold mb-1">Codigo manual:</div>
                    <code>{secretData.secret}</code>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TwoFactorSetup;
