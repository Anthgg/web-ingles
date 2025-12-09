import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Row, Col, Badge, Alert, Spinner, InputGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { 
  FaUser, 
  FaEnvelope, 
  FaLock, 
  FaUserTag, 
  FaSave, 
  FaTimes, 
  FaGraduationCap,
  FaChalkboardTeacher,
  FaUserShield,
  FaEye,
  FaEyeSlash,
  FaCheckCircle,
  FaExclamationTriangle,
  FaMoon,
  FaSun
} from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';

function UsuarioForm({ token, onSave, editingUser, onCancel }) {
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    rol: '',
    nivel: 'primaria',
    grado: '1',
    seccion: '',
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  
  // Estado para modo oscuro
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detectar modo oscuro del sistema o de la aplicación
  useEffect(() => {
    const checkDarkMode = () => {
      const darkModeClass = document.documentElement.classList.contains('dark') || 
                           document.body.classList.contains('dark-mode') ||
                           document.body.classList.contains('dark');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(darkModeClass || prefersDark);
    };

    checkDarkMode();
    
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkDarkMode);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkDarkMode);
    };
  }, []);

  useEffect(() => {
    if (editingUser) {
      setForm({
        nombre: editingUser.nombre || '',
        email: editingUser.email || '',
        password: '',
        confirmPassword: '',
        rol: editingUser.rol || '',
        nivel: editingUser.nivel || editingUser.nivel_estudiante || 'primaria',
        grado: editingUser.grado || editingUser.grado_estudiante || '1',
        seccion: editingUser.seccion || editingUser.seccion_estudiante || '',
      });
      setErrors({});
      setTouched({});
    } else {
      setForm({
        nombre: '',
        email: '',
        password: '',
        confirmPassword: '',
        rol: '',
        nivel: 'primaria',
        grado: '1',
        seccion: '',
      });
      setErrors({});
      setTouched({});
    }
  }, [editingUser]);

  // Validación en tiempo real
  const validateField = (name, value) => {
    switch (name) {
      case 'nombre':
        if (!value.trim()) return 'El nombre es requerido';
        if (value.trim().length < 3) return 'El nombre debe tener al menos 3 caracteres';
        return '';
      case 'email':
        if (!editingUser && !value.trim()) return 'El email es requerido';
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email inválido';
        return '';
      case 'password':
        if (!editingUser && !value) return 'La contraseña es requerida';
        if (value && value.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
        return '';
      case 'confirmPassword':
        if (!editingUser && !value) return 'Confirma la contraseña';
        if (value && value !== form.password) return 'Las contraseñas no coinciden';
        return '';
      case 'rol':
        if (!value) return 'Selecciona un rol';
        return '';
      default:
        return '';
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched({ ...touched, [name]: true });
    const error = validateField(name, value);
    setErrors({ ...errors, [name]: error });
  };

  function handleChange(e) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    
    // Validar en tiempo real si el campo ya fue tocado
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors({ ...errors, [name]: error });
    }
    
    // Validar confirmPassword cuando cambia password
    if (name === 'password' && touched.confirmPassword) {
      const confirmError = value !== form.confirmPassword ? 'Las contraseñas no coinciden' : '';
      setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
    }
  }

  const validateForm = () => {
    const newErrors = {};
    Object.keys(form).forEach(key => {
      const error = validateField(key, form[key]);
      if (error) newErrors[key] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!validateForm()) {
      setTouched(Object.keys(form).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
      return;
    }
    
    setLoading(true);

    try {
      // Preparar payload según el schema del backend
      const payload = {
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        rol: form.rol,
      };

      // Solo incluir password si hay valor (requerido en creación, opcional en edición)
      if (form.password) {
        payload.password = form.password;
      }

      // Incluir datos de estudiante si el rol es estudiante
      if (form.rol === 'estudiante') {
        payload.nivel = form.nivel;
        payload.grado = form.grado;
        payload.seccion = form.seccion;
        payload.estudiante = {
          nivel_estudiante: form.nivel,
          grado_estudiante: form.grado,
          seccion_estudiante: form.seccion,
        };
      }

      await onSave(payload);

      if (!editingUser) {
        setForm({
          nombre: '',
          email: '',
          password: '',
          confirmPassword: '',
          rol: '',
          nivel: 'primaria',
          grado: '1',
          seccion: '',
        });
        setTouched({});
        setErrors({});
      }
    } catch (error) {
      console.error('Error al guardar:', error);
    } finally {
      setLoading(false);
    }
  }

  const obtenerCodigoUsuario = (usuario) => {
    if (!usuario) return null;
    return usuario.codigo_estudiante || usuario.codigo_docente || usuario.codigo_admin || null;
  };

  const codigoUsuario = editingUser ? obtenerCodigoUsuario(editingUser) : null;

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'administrativo': 
      case 'admin': 
        return 'danger';
      case 'profesor': 
      case 'docente': 
        return 'primary';
      case 'estudiante': 
      case 'alumno': 
        return 'success';
      default: return 'secondary';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'administrativo': 
      case 'admin': 
        return <FaUserShield className="me-2" />;
      case 'profesor': 
      case 'docente': 
        return <FaChalkboardTeacher className="me-2" />;
      case 'estudiante': 
      case 'alumno': 
        return <FaGraduationCap className="me-2" />;
      default: return <FaUser className="me-2" />;
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'administrativo': 
      case 'admin': 
        return 'Administrador';
      case 'profesor': 
      case 'docente': 
        return 'Profesor';
      case 'estudiante': 
      case 'alumno': 
        return 'Estudiante';
      default: return role;
    }
  };

  const getPasswordStrength = (password) => {
    if (!password) return { level: 0, label: '', color: '' };
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 1) return { level: 20, label: 'Muy débil', color: '#ef4444' };
    if (strength === 2) return { level: 40, label: 'Débil', color: '#f97316' };
    if (strength === 3) return { level: 60, label: 'Aceptable', color: '#eab308' };
    if (strength === 4) return { level: 80, label: 'Fuerte', color: '#22c55e' };
    return { level: 100, label: 'Muy fuerte', color: '#10b981' };
  };

  const passwordStrength = getPasswordStrength(form.password);

  const renderTooltip = (message) => (
    <Tooltip id="tooltip">{message}</Tooltip>
  );

  return (
    <Card className={`shadow-lg border-0 mb-4 usuario-form-card ${isDarkMode ? 'dark-mode' : ''}`}>

      <style>{`
        /* ===== MODO CLARO (Default) ===== */
        .usuario-form-card {
          border-radius: 20px;
          background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .form-section {
          background: rgba(124, 58, 237, 0.03);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
          border: 1px solid rgba(124, 58, 237, 0.08);
          transition: all 0.3s ease;
        }

        .section-title {
          font-size: 0.85rem;
          font-weight: 600;
          color: #7c3aed;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .form-control-modern {
          border-radius: 12px;
          border: 2px solid #e5e7eb;
          background: #ffffff;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          padding: 12px 16px;
          font-size: 0.95rem;
          color: #1f2937;
        }

        .form-control-modern:focus {
          border-color: #7c3aed;
          box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.15);
          background: #ffffff;
        }

        .form-control-modern.is-invalid {
          border-color: #ef4444;
          box-shadow: none;
        }

        .form-control-modern.is-invalid:focus {
          box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.15);
        }

        .form-control-modern.is-valid {
          border-color: #22c55e;
        }

        .form-control-with-icon {
          padding-left: 48px;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          font-size: 1.1rem;
          transition: color 0.2s;
          z-index: 4;
        }

        .form-group:focus-within .input-icon {
          color: #7c3aed;
        }

        .form-label-modern {
          font-weight: 600;
          color: #374151;
          font-size: 0.9rem;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: color 0.3s ease;
        }

        .required-asterisk {
          color: #ef4444;
          font-weight: bold;
        }

        .btn-primary-modern {
          background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
          border: none;
          border-radius: 12px;
          padding: 14px 32px;
          font-weight: 600;
          font-size: 1rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35);
          color: white;
        }

        .btn-primary-modern:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(124, 58, 237, 0.45);
          background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
        }

        .btn-primary-modern:active {
          transform: translateY(0);
        }

        .btn-primary-modern:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .btn-outline-modern {
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 12px 24px;
          font-weight: 600;
          color: #6b7280;
          background: transparent;
          transition: all 0.2s;
        }

        .btn-outline-modern:hover {
          border-color: #9ca3af;
          background: #f9fafb;
          color: #374151;
        }

        .role-card {
          border: 2px solid #e5e7eb;
          border-radius: 16px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: #ffffff;
          text-align: center;
        }

        .role-card:hover {
          border-color: #7c3aed;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(124, 58, 237, 0.15);
        }

        .role-card.selected {
          border-color: #7c3aed;
          background: linear-gradient(145deg, rgba(124, 58, 237, 0.05) 0%, rgba(124, 58, 237, 0.1) 100%);
          box-shadow: 0 4px 15px rgba(124, 58, 237, 0.2);
        }

        .role-card.selected .role-icon {
          color: #7c3aed;
        }

        .role-icon {
          font-size: 2rem;
          color: #9ca3af;
          margin-bottom: 8px;
          transition: all 0.3s;
        }

        .role-label {
          font-weight: 600;
          font-size: 0.9rem;
          color: #374151;
          transition: color 0.3s ease;
        }

        .password-toggle {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 4px;
          z-index: 5;
          transition: color 0.2s;
        }

        .password-toggle:hover {
          color: #7c3aed;
        }

        .strength-bar {
          height: 4px;
          background: #e5e7eb;
          border-radius: 2px;
          overflow: hidden;
          margin-top: 8px;
        }

        .strength-fill {
          height: 100%;
          transition: all 0.3s ease;
          border-radius: 2px;
        }

        .strength-label {
          font-size: 0.75rem;
          margin-top: 4px;
          font-weight: 500;
        }

        .codigo-badge {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          color: white;
          padding: 8px 16px;
          border-radius: 10px;
          font-family: 'Consolas', monospace;
          font-size: 0.95rem;
          letter-spacing: 1px;
        }

        .user-preview {
          background: linear-gradient(145deg, #f8fafc 0%, #f1f5f9 100%);
          border-radius: 16px;
          padding: 20px;
          border: 1px dashed #cbd5e1;
          transition: all 0.3s ease;
        }

        .preview-avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          color: white;
          margin: 0 auto 12px;
        }

        .error-text {
          color: #ef4444;
          font-size: 0.8rem;
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .form-select-modern {
          border-radius: 12px;
          border: 2px solid #e5e7eb;
          padding: 12px 16px;
          font-size: 0.95rem;
          background-color: #ffffff;
          transition: all 0.3s;
          color: #1f2937;
        }

        .form-select-modern:focus {
          border-color: #7c3aed;
          box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.15);
        }

        /* ===== MODO OSCURO ===== */
        .usuario-form-card.dark-mode {
          background: linear-gradient(145deg, #1e1e2e 0%, #2d2d44 100%);
          border: 1px solid #3d3d5c;
        }

        .usuario-form-card.dark-mode .form-section {
          background: rgba(139, 92, 246, 0.08);
          border: 1px solid rgba(139, 92, 246, 0.15);
        }

        .usuario-form-card.dark-mode .section-title {
          color: #a78bfa;
        }

        .usuario-form-card.dark-mode .form-label-modern {
          color: #e5e5e5;
        }

        .usuario-form-card.dark-mode .form-control-modern {
          background: #2d2d44;
          border-color: #4a4a6a;
          color: #f0f0f0;
        }

        .usuario-form-card.dark-mode .form-control-modern::placeholder {
          color: #8888aa;
        }

        .usuario-form-card.dark-mode .form-control-modern:focus {
          background: #3d3d5c;
          border-color: #8b5cf6;
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.25);
        }

        .usuario-form-card.dark-mode .form-control-modern:disabled {
          background: #1e1e2e;
          color: #6b6b8a;
        }

        .usuario-form-card.dark-mode .form-select-modern {
          background-color: #2d2d44;
          border-color: #4a4a6a;
          color: #f0f0f0;
        }

        .usuario-form-card.dark-mode .form-select-modern:focus {
          background-color: #3d3d5c;
          border-color: #8b5cf6;
        }

        .usuario-form-card.dark-mode .form-select-modern option {
          background-color: #2d2d44;
          color: #f0f0f0;
        }

        .usuario-form-card.dark-mode .role-card {
          background: #2d2d44;
          border-color: #4a4a6a;
        }

        .usuario-form-card.dark-mode .role-card:hover {
          border-color: #8b5cf6;
          box-shadow: 0 8px 20px rgba(139, 92, 246, 0.2);
        }

        .usuario-form-card.dark-mode .role-card.selected {
          background: linear-gradient(145deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.25) 100%);
          border-color: #8b5cf6;
          box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
        }

        .usuario-form-card.dark-mode .role-card.selected .role-icon {
          color: #a78bfa;
        }

        .usuario-form-card.dark-mode .role-icon {
          color: #6b6b8a;
        }

        .usuario-form-card.dark-mode .role-label {
          color: #e5e5e5;
        }

        .usuario-form-card.dark-mode .input-icon {
          color: #6b6b8a;
        }

        .usuario-form-card.dark-mode .form-group:focus-within .input-icon {
          color: #a78bfa;
        }

        .usuario-form-card.dark-mode .password-toggle {
          color: #6b6b8a;
        }

        .usuario-form-card.dark-mode .password-toggle:hover {
          color: #a78bfa;
        }

        .usuario-form-card.dark-mode .btn-outline-modern {
          border-color: #4a4a6a;
          color: #b0b0c0;
        }

        .usuario-form-card.dark-mode .btn-outline-modern:hover {
          border-color: #6b6b8a;
          background: #3d3d5c;
          color: #e5e5e5;
        }

        .usuario-form-card.dark-mode .btn-primary-modern {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);
        }

        .usuario-form-card.dark-mode .btn-primary-modern:hover:not(:disabled) {
          background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
          box-shadow: 0 8px 25px rgba(139, 92, 246, 0.5);
        }

        .usuario-form-card.dark-mode .user-preview {
          background: linear-gradient(145deg, #2d2d44 0%, #3d3d5c 100%);
          border-color: #4a4a6a;
        }

        .usuario-form-card.dark-mode .user-preview h5 {
          color: #f0f0f0;
        }

        .usuario-form-card.dark-mode .user-preview p {
          color: #8888aa !important;
        }

        .usuario-form-card.dark-mode .strength-bar {
          background: #3d3d5c;
        }

        .usuario-form-card.dark-mode .codigo-badge {
          background: linear-gradient(135deg, #3d3d5c 0%, #4a4a6a 100%);
        }

        .usuario-form-card.dark-mode .text-muted {
          color: #8888aa !important;
        }

        .usuario-form-card.dark-mode .text-success {
          color: #4ade80 !important;
        }

        .usuario-form-card.dark-mode .border-top {
          border-color: #4a4a6a !important;
        }

        .dark-mode-toggle {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: 2px solid #e5e7eb;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          color: #6b7280;
          z-index: 10;
        }

        .dark-mode-toggle:hover {
          border-color: #7c3aed;
          color: #7c3aed;
          transform: rotate(15deg);
        }

        .usuario-form-card.dark-mode .dark-mode-toggle {
          border-color: #4a4a6a;
          color: #fbbf24;
        }

        .usuario-form-card.dark-mode .dark-mode-toggle:hover {
          border-color: #fbbf24;
          color: #fbbf24;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        .shake {
          animation: shake 0.3s ease-in-out;
        }

        .fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Botón de modo oscuro */}
      <button 
        type="button"
        className="dark-mode-toggle"
        onClick={() => setIsDarkMode(!isDarkMode)}
        title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        {isDarkMode ? <FaSun size={18} /> : <FaMoon size={18} />}
      </button>

      <Card.Body className="p-4 p-md-5">
        <Form onSubmit={handleSubmit} noValidate>
          
          {/* Header con código si está editando */}
          {editingUser && codigoUsuario && (
            <div className="text-center mb-4 fade-in">
              <small className="text-muted d-block mb-2">Código de Usuario</small>
              <span className="codigo-badge">{codigoUsuario}</span>
            </div>
          )}

          {/* Sección: Información Básica */}
          <div className="form-section">
            <div className="section-title">
              <FaUser /> Información Básica
            </div>

            <Row className="g-3">
              <Col md={12}>
                <Form.Group className="form-group">
                  <Form.Label className="form-label-modern">
                    Nombre Completo <span className="required-asterisk">*</span>
                  </Form.Label>
                  <div className="position-relative">
                    <FaUser className="input-icon" />
                    <Form.Control
                      type="text"
                      name="nombre"
                      placeholder="Ingresa el nombre completo"
                      className={`form-control-modern form-control-with-icon ${
                        touched.nombre ? (errors.nombre ? 'is-invalid' : 'is-valid') : ''
                      }`}
                      value={form.nombre}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      required
                    />
                  </div>
                  {touched.nombre && errors.nombre && (
                    <div className="error-text">
                      <FaExclamationTriangle size={12} /> {errors.nombre}
                    </div>
                  )}
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group className="form-group">
                  <Form.Label className="form-label-modern">
                    Correo Electrónico {!editingUser && <span className="required-asterisk">*</span>}
                  </Form.Label>
                  <div className="position-relative">
                    <FaEnvelope className="input-icon" />
                    <Form.Control
                      type="email"
                      name="email"
                      placeholder="correo@ejemplo.com"
                      className={`form-control-modern form-control-with-icon ${
                        touched.email ? (errors.email ? 'is-invalid' : form.email ? 'is-valid' : '') : ''
                      }`}
                      value={form.email}
                      disabled={!!editingUser}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      required={!editingUser}
                    />
                  </div>
                  {touched.email && errors.email && (
                    <div className="error-text">
                      <FaExclamationTriangle size={12} /> {errors.email}
                    </div>
                  )}
                </Form.Group>
              </Col>
            </Row>
          </div>

          {/* Sección: Rol del Usuario */}
          <div className="form-section">
            <div className="section-title">
              <FaUserTag /> Rol del Usuario <span className="required-asterisk">*</span>
            </div>

            <Row className="g-3">
              {['administrativo', 'profesor', 'estudiante'].map((rol) => (
                <Col key={rol} xs={4}>
                  <div
                    className={`role-card ${form.rol === rol ? 'selected' : ''}`}
                    onClick={() => {
                      handleChange({ target: { name: 'rol', value: rol } });
                      setTouched({ ...touched, rol: true });
                    }}
                  >
                    <div className="role-icon">
                      {rol === 'administrativo' && <FaUserShield />}
                      {rol === 'profesor' && <FaChalkboardTeacher />}
                      {rol === 'estudiante' && <FaGraduationCap />}
                    </div>
                    <div className="role-label">{getRoleLabel(rol)}</div>
                    {form.rol === rol && (
                      <FaCheckCircle 
                        className="mt-2" 
                        style={{ color: '#7c3aed' }} 
                      />
                    )}
                  </div>
                </Col>
              ))}
            </Row>
            {touched.rol && errors.rol && (
              <div className="error-text mt-2">
                <FaExclamationTriangle size={12} /> {errors.rol}
              </div>
            )}
          </div>

          {/* Sección: Datos Académicos (solo para estudiantes) */}
          {form.rol === 'estudiante' && (
            <div className="form-section fade-in">
              <div className="section-title">
                <FaGraduationCap /> Datos Académicos
              </div>

              <Row className="g-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="form-label-modern">Nivel</Form.Label>
                    <Form.Select
                      name="nivel"
                      value={form.nivel}
                      onChange={handleChange}
                      className="form-select-modern"
                    >
                      <option value="primaria">Primaria</option>
                      <option value="secundaria">Secundaria</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="form-label-modern">Grado</Form.Label>
                    <Form.Select
                      name="grado"
                      value={form.grado}
                      onChange={handleChange}
                      className="form-select-modern"
                    >
                      {(form.nivel === 'secundaria' 
                        ? ['1', '2', '3', '4', '5'] 
                        : ['1', '2', '3', '4', '5', '6']
                      ).map((g) => (
                        <option key={g} value={g}>{g}° {form.nivel === 'secundaria' ? 'Secundaria' : 'Primaria'}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="form-label-modern">Sección</Form.Label>
                    <Form.Control
                      type="text"
                      name="seccion"
                      placeholder="A, B, C..."
                      className="form-control-modern"
                      value={form.seccion}
                      onChange={handleChange}
                      maxLength={5}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>
          )}

          {/* Sección: Seguridad */}
          <div className="form-section">
            <div className="section-title">
              <FaLock /> Seguridad
            </div>

            <Row className="g-3">
              <Col md={6}>
                <Form.Group className="form-group">
                  <Form.Label className="form-label-modern">
                    Contraseña {!editingUser && <span className="required-asterisk">*</span>}
                  </Form.Label>
                  <div className="position-relative">
                    <FaLock className="input-icon" />
                    <Form.Control
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder={editingUser ? 'Nueva contraseña (opcional)' : 'Mínimo 6 caracteres'}
                      className={`form-control-modern form-control-with-icon ${
                        touched.password ? (errors.password ? 'is-invalid' : form.password ? 'is-valid' : '') : ''
                      }`}
                      value={form.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      required={!editingUser}
                      style={{ paddingRight: '48px' }}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  {form.password && (
                    <>
                      <div className="strength-bar">
                        <div
                          className="strength-fill"
                          style={{
                            width: `${passwordStrength.level}%`,
                            backgroundColor: passwordStrength.color,
                          }}
                        />
                      </div>
                      <div className="strength-label" style={{ color: passwordStrength.color }}>
                        {passwordStrength.label}
                      </div>
                    </>
                  )}
                  {touched.password && errors.password && (
                    <div className="error-text">
                      <FaExclamationTriangle size={12} /> {errors.password}
                    </div>
                  )}
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="form-group">
                  <Form.Label className="form-label-modern">
                    Confirmar Contraseña {!editingUser && <span className="required-asterisk">*</span>}
                  </Form.Label>
                  <div className="position-relative">
                    <FaLock className="input-icon" />
                    <Form.Control
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      placeholder="Repite la contraseña"
                      className={`form-control-modern form-control-with-icon ${
                        touched.confirmPassword 
                          ? (errors.confirmPassword ? 'is-invalid' : form.confirmPassword ? 'is-valid' : '') 
                          : ''
                      }`}
                      value={form.confirmPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      required={!editingUser}
                      style={{ paddingRight: '48px' }}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  {touched.confirmPassword && errors.confirmPassword && (
                    <div className="error-text">
                      <FaExclamationTriangle size={12} /> {errors.confirmPassword}
                    </div>
                  )}
                  {form.confirmPassword && form.password === form.confirmPassword && !errors.confirmPassword && (
                    <div className="text-success mt-1" style={{ fontSize: '0.8rem' }}>
                      <FaCheckCircle size={12} className="me-1" /> Las contraseñas coinciden
                    </div>
                  )}
                </Form.Group>
              </Col>
            </Row>
          </div>

          {/* Vista Previa del Usuario */}
          {form.nombre && form.rol && (
            <div className="user-preview mb-4 fade-in">
              <div className="text-center">
                <div 
                  className="preview-avatar"
                  style={{ 
                    background: form.rol === 'administrativo' ? 'linear-gradient(135deg, #dc2626, #ef4444)' :
                               form.rol === 'profesor' ? 'linear-gradient(135deg, #2563eb, #3b82f6)' :
                               'linear-gradient(135deg, #16a34a, #22c55e)'
                  }}
                >
                  {getRoleIcon(form.rol)}
                </div>
                <h5 className="mb-1 fw-bold">{form.nombre}</h5>
                <Badge bg={getRoleBadgeVariant(form.rol)} className="px-3 py-2">
                  {getRoleLabel(form.rol)}
                </Badge>
                {form.email && (
                  <p className="text-muted small mt-2 mb-0">{form.email}</p>
                )}
              </div>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="d-flex justify-content-end gap-3 pt-3 border-top">
            {editingUser && (
              <Button
                type="button"
                className="btn-outline-modern"
                onClick={onCancel}
                disabled={loading}
              >
                <FaTimes className="me-2" />
                Cancelar
              </Button>
            )}

            <Button
              type="submit"
              className="btn-primary-modern"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <FaSave className="me-2" />
                  {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </>
              )}
            </Button>
          </div>

        </Form>
      </Card.Body>

    </Card>
  );
}

export default UsuarioForm;
