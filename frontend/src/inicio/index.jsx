import React, { useState } from 'react';
import { FaEnvelope, FaLock, FaUserGraduate, FaChalkboardTeacher } from 'react-icons/fa';
import ParticlesBackground from '../components/ParticlesBackground';

const Login = ({ onLogin, error, loading, success }) => {
  const [isHovering, setIsHovering] = useState(false);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    const email = form.email.value;
    const password = form.password.value;
    onLogin(email, password);
  };

  return (
    <div className="login-container" style={{ 
      position: 'relative', 
      minHeight: '100vh',
      display: 'flex',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 50%, #1976d2 100%)'
    }}>
      <ParticlesBackground theme="educational" />
      
      {/* Left Side - Information Panel con diseño más minimalista */}
      <div className="d-none d-lg-flex flex-column justify-content-center align-items-center" 
          style={{ 
            flex: 1, 
            padding: '2rem',
            position: 'relative',
            zIndex: 1
          }}>
        <div className="text-center text-white mb-5">
          <div className="display-4 fw-bold mb-3" style={{textShadow: '1px 1px 10px rgba(0,0,0,0.2)'}}>
            <span style={{ color: '#0d6efd' }}>GO</span>English
          </div>
          <h4 className="mb-4 fw-light" style={{textShadow: '1px 1px 8px rgba(0,0,0,0.3)', letterSpacing: '0.5px'}}>
            Sistema de Gestión Académica
          </h4>
        </div>
        
        <div className="row w-100 gx-4 gy-4">
          <div className="col-md-6">
            <div className="card bg-white bg-opacity-10 text-white border-0" 
                 style={{borderRadius: '10px', backdropFilter: 'blur(10px)'}}>
              <div className="card-body p-3">
                <div className="d-flex align-items-center mb-2">
                  <div className="bg-danger bg-gradient rounded-circle p-2 me-3">
                    <FaUserGraduate size={16} />
                  </div>
                  <h5 className="fw-semibold mb-0">Estudiantes</h5>
                </div>
                <p className="mb-0 small">Accede a tus cursos, calificaciones y mantente al día con tus asignaciones académicas.</p>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card bg-white bg-opacity-10 text-white border-0" 
                 style={{borderRadius: '10px', backdropFilter: 'blur(10px)'}}>
              <div className="card-body p-3">
                <div className="d-flex align-items-center mb-2">
                  <div className="bg-info bg-gradient rounded-circle p-2 me-3">
                    <FaChalkboardTeacher size={16} />
                  </div>
                  <h5 className="fw-semibold mb-0">Docentes</h5>
                </div>
                <p className="mb-0 small">Gestiona tus clases, registra asistencias y administra las calificaciones de tus estudiantes.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-5 text-white text-center">
          <p className="mb-1 opacity-75 small">© {new Date().getFullYear()} GoEnglish</p>
          <p className="small opacity-50">La plataforma líder en gestión educativa</p>
        </div>
      </div>
      
      {/* Right Side - Login Form con diseño minimalista */}
      <div className="d-flex align-items-center justify-content-center" 
          style={{ 
            flex: 1,
            padding: '2rem',
            position: 'relative',
            zIndex: 1
          }}>
        <div className="card shadow-lg" style={{ 
          width: '100%', 
          maxWidth: '420px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          border: 'none',
          borderRadius: '16px',
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)',
          backdropFilter: 'blur(10px)',
          animation: 'fadeIn 0.7s ease-out forwards'
        }}>
          <div className="card-body p-4">
            <div className="text-center d-block d-lg-none mb-4">
              <h3 className="fw-bold">
                <span style={{ color: '#0d6efd' }}>GO</span>English
              </h3>
              <p className="text-muted small">Inicia sesión para continuar</p>
            </div>
            
            <h5 className="mb-4 fw-bold text-center d-none d-lg-block">Bienvenido de nuevo</h5>
            
            {success && (
              <div className="alert alert-success mb-3 py-2" style={{
                fontSize: '0.95rem',
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 12px rgba(25, 135, 84, 0.15)'
              }}>
                <div className="d-flex align-items-center">
                  <i className="fas fa-check-circle me-2"></i>
                  <div>{success}</div>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="email" className="form-label fw-medium mb-2 small">Correo electrónico</label>
                <div className="input-group">
                  <span className="input-group-text border-end-0" style={{
                    backgroundColor: 'transparent',
                    borderTopLeftRadius: '8px',
                    borderBottomLeftRadius: '8px'
                  }}>
                    <FaEnvelope style={{ color: '#6c757d' }} size={14} />
                  </span>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="form-control border-start-0"
                    placeholder="nombre@ejemplo.com"
                    required
                    style={{
                      padding: '10px 12px',
                      backgroundColor: 'transparent',
                      fontSize: '0.95rem',
                      borderTopRightRadius: '8px',
                      borderBottomRightRadius: '8px'
                    }}
                  />
                </div>
              </div>
              
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label htmlFor="password" className="form-label fw-medium mb-0 small">Contraseña</label>
                  <a href="#" className="text-decoration-none small" style={{color: '#0d6efd', fontSize: '0.85rem'}}>¿Olvidaste tu contraseña?</a>
                </div>
                <div className="input-group">
                  <span className="input-group-text border-end-0" style={{
                    backgroundColor: 'transparent',
                    borderTopLeftRadius: '8px',
                    borderBottomLeftRadius: '8px'
                  }}>
                    <FaLock style={{ color: '#6c757d' }} size={14} />
                  </span>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    className="form-control border-start-0"
                    placeholder="••••••••"
                    required
                    style={{
                      padding: '10px 12px',
                      backgroundColor: 'transparent',
                      fontSize: '0.95rem',
                      borderTopRightRadius: '8px',
                      borderBottomRightRadius: '8px'
                    }}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="rememberMe" />
                  <label className="form-check-label small" htmlFor="rememberMe">
                    Mantener sesión iniciada
                  </label>
                </div>
              </div>
              
              <button 
                type="submit" 
                className="btn btn-primary w-100 py-2"
                disabled={loading}
                style={{
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '0.95rem',
                  letterSpacing: '0.3px',
                  transition: 'all 0.3s',
                  boxShadow: isHovering ? '0 6px 15px rgba(13, 110, 253, 0.25)' : '0 3px 10px rgba(13, 110, 253, 0.2)',
                  border: 'none',
                  marginBottom: '1rem',
                  transform: isHovering ? 'translateY(-2px)' : 'none',
                  background: isHovering ? 
                    'linear-gradient(45deg, #0d6efd, #0b5ed7)' : 
                    'linear-gradient(45deg, #0d6efd, #0d6efd)'
                }}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
                {loading ? (
                  <div className="d-flex align-items-center justify-content-center">
                    <div className="spinner-border spinner-border-sm me-2" role="status" style={{width: '0.85rem', height: '0.85rem'}}>
                      <span className="visually-hidden">Cargando...</span>
                    </div>
                    <span>Iniciando sesión...</span>
                  </div>
                ) : (
                  'Iniciar sesión'
                )}
              </button>
              
              {error && (
                <div className="alert alert-danger mt-3 py-2" style={{
                  fontSize: '0.9rem',
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(220, 53, 69, 0.15)'
                }}>
                  <div className="d-flex align-items-center">
                    <i className="fas fa-exclamation-circle me-2"></i>
                    <div>{error}</div>
                  </div>
                </div>
              )}
            </form>
            
            <div className="mt-4 text-center">
              <p className="text-muted mb-0 small">¿Problemas para ingresar? <a href="#" style={{ color: '#0d6efd', textDecoration: 'none', fontWeight: '500' }}>Contacta al administrador</a></p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .input-group:focus-within {
          box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.15);
          border-radius: 8px;
        }
        
        .input-group:focus-within .input-group-text {
          background-color: #fff !important;
          border-color: #86b7fe;
        }
        
        .input-group:focus-within .form-control {
          background-color: #fff !important;
          border-color: #86b7fe;
          box-shadow: none;
        }
        
        .form-control:focus {
          box-shadow: none;
        }
        
        @media (max-width: 992px) {
          .login-container {
            background: linear-gradient(135deg, #0d47a1 0%, #1565c0 100%);
          }
        }
      `}</style>
    </div>
  );
};

export default Login;