import React, { useState, useEffect, useCallback } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FaUser, FaChalkboardTeacher, FaClipboardCheck, FaGraduationCap, FaSignOutAlt, FaLock, FaEnvelope } from 'react-icons/fa';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';

import UsuariosList from './components/UsuariosList';
import ClasesList from './components/ClasesList';
import AsistenciasList from './components/AsistenciasList';
import CalificacionesList from './components/CalificacionesList';

const ParticlesBackground = () => {
  const particlesInit = async (engine) => {
    await loadSlim(engine);
  };

  return (
    <Particles
      id="tsparticles"
      init={particlesInit}
      options={{
        fpsLimit: 60,
        interactivity: {
          events: {
            onClick: {
              enable: true,
              mode: "push",
            },
            onHover: {
              enable: true,
              mode: "repulse",
            },
          },
          modes: {
            push: {
              quantity: 4,
            },
            repulse: {
              distance: 100,
              duration: 0.4,
            },
          },
        },
        particles: {
          color: {
            value: "#ffffff",
          },
          links: {
            color: "#ffffff",
            distance: 150,
            enable: true,
            opacity: 0.3,
            width: 1,
          },
          move: {
            direction: "none",
            enable: true,
            outModes: {
              default: "bounce",
            },
            random: false,
            speed: 2,
            straight: false,
          },
          number: {
            density: {
              enable: true,
            },
            value: 80,
          },
          opacity: {
            value: 0.5,
          },
          shape: {
            type: "circle",
          },
          size: {
            value: { min: 1, max: 3 },
          },
        },
        detectRetina: true,
      }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0
      }}
    />
  );
};

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [userInfo, setUserInfo] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [clases, setClases] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [calificaciones, setCalificaciones] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeModule, setActiveModule] = useState('usuarios');
  const [loading, setLoading] = useState(false);

  // Mostrar/ocultar notificaciones automáticamente
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const showError = (message) => {
    setError(message);
    setSuccess('');
  };

  const showSuccess = (message) => {
    setSuccess(message);
    setError('');
  };

  const clearData = () => {
    setUsuarios([]);
    setClases([]);
    setAsistencias([]);
    setCalificaciones([]);
  };

  const fetchUsuarios = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3002/usuarios', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al cargar usuarios');
      const data = await res.json();
      setUsuarios(data);
    } catch (err) {
      showError(err.message);
      setUsuarios([]);
    }
  }, [token]);

  const fetchClases = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3005/materias', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al cargar clases');
      const data = await res.json();
      setClases(data);
    } catch (err) {
      showError(err.message);
      setClases([]);
    }
  }, [token]);

  const fetchAsistencias = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3003/asistencias', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al cargar asistencias');
      const data = await res.json();
      setAsistencias(data);
    } catch (err) {
      showError(err.message);
      setAsistencias([]);
    }
  }, [token]);

  const fetchCalificaciones = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3004/calificaciones', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al cargar calificaciones');
      const data = await res.json();
      setCalificaciones(data);
    } catch (err) {
      showError(err.message);
      setCalificaciones([]);
    }
  }, [token]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchUsuarios(),
        fetchClases(),
        fetchAsistencias(),
        fetchCalificaciones(),
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchUsuarios, fetchClases, fetchAsistencias, fetchCalificaciones]);

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserInfo({ id: payload.id, nombre: payload.nombre, rol: payload.rol });
        fetchAll();
      } catch {
        showError('Token inválido');
        handleLogout();
      }
    } else {
      setUserInfo(null);
      clearData();
    }
  }, [token, fetchAll]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const form = e.target;
    const email = form.email.value;
    const password = form.password.value;

    try {
      const res = await fetch('http://localhost:3001/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error en login');
      }
      const data = await res.json();
      setToken(data.token);
      localStorage.setItem('token', data.token);
      showSuccess('Login exitoso');
    } catch (err) {
      showError(err.message);
    }
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('token');
    setUserInfo(null);
    clearData();
  };

  if (!token) {
    return (
      <div style={{ 
        position: 'relative', 
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)'
      }}>
        <ParticlesBackground />
        
        <div className="card shadow-lg p-4" style={{ 
          width: '100%', 
          maxWidth: '400px',
          zIndex: 1,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          border: 'none',
          borderRadius: '15px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(5px)',
          animation: 'fadeIn 0.6s ease-out forwards'
        }}>
          <div className="card-body text-center">
            <div style={{
              marginBottom: '2rem',
              color: '#4a4a4a'
            }}>
              <h2 style={{
                fontWeight: '600',
                marginBottom: '0.5rem',
                color: '#343a40'
              }}>
                <span style={{ color: '#0d6efd' }}>GO</span>English
              </h2>
              <p style={{ color: '#6c757d' }}>Sistema de Gestión Académica</p>
            </div>
            
            <form onSubmit={handleLogin}>
              <div className="mb-3">
                <div className="input-group">
                  <span className="input-group-text" style={{
                    backgroundColor: '#f8f9fa',
                    borderRight: 'none',
                    borderTopLeftRadius: '10px',
                    borderBottomLeftRadius: '10px'
                  }}>
                    <FaEnvelope style={{ color: '#6c757d' }} />
                  </span>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="form-control"
                    placeholder="Correo electrónico"
                    required
                    style={{
                      borderLeft: 'none',
                      padding: '10px 15px',
                      backgroundColor: '#f8f9fa',
                      borderTopRightRadius: '10px',
                      borderBottomRightRadius: '10px'
                    }}
                  />
                </div>
              </div>
              <div className="mb-4">
                <div className="input-group">
                  <span className="input-group-text" style={{
                    backgroundColor: '#f8f9fa',
                    borderRight: 'none',
                    borderTopLeftRadius: '10px',
                    borderBottomLeftRadius: '10px'
                  }}>
                    <FaLock style={{ color: '#6c757d' }} />
                  </span>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    className="form-control"
                    placeholder="Contraseña"
                    required
                    style={{
                      borderLeft: 'none',
                      padding: '10px 15px',
                      backgroundColor: '#f8f9fa',
                      borderTopRightRadius: '10px',
                      borderBottomRightRadius: '10px'
                    }}
                  />
                </div>
              </div>
              
              <button 
                type="submit" 
                className="btn btn-primary w-100 py-2"
                style={{
                  borderRadius: '25px',
                  fontWeight: '600',
                  letterSpacing: '0.5px',
                  transition: 'all 0.3s',
                  boxShadow: '0 4px 15px rgba(13, 110, 253, 0.3)',
                  border: 'none',
                  marginBottom: '1rem'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                Iniciar sesión
              </button>
              
              {error && (
                <div className="alert alert-danger mt-3" style={{
                  borderRadius: '10px',
                  border: 'none'
                }}>
                  {error}
                </div>
              )}
            </form>
            
            <div className="mt-4" style={{ color: '#6c757d', fontSize: '0.9rem' }}>
              <p>¿Problemas para ingresar? <a href="#" style={{ color: '#0d6efd', textDecoration: 'none' }}>Contacta al administrador</a></p>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          .input-group:focus-within .input-group-text {
            background-color: #e9ecef !important;
          }
          
          .input-group:focus-within .form-control {
            background-color: white !important;
            box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.1);
          }
        `}</style>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <nav className="d-flex flex-column bg-dark text-white p-3" style={{ width: '250px' }}>
        <div className="d-flex align-items-center mb-4">
          <div className="bg-primary rounded-circle p-2 me-2">
            <FaUser size={20} />
          </div>
          <div>
            <h5 className="mb-0">{userInfo.nombre}</h5>
            <small className="text-muted">{userInfo.rol}</small>
          </div>
        </div>
        
        <hr className="my-2" />
        
        <ul className="nav nav-pills flex-column mb-auto">
          <li className="nav-item mb-2">
            <button
              className={`nav-link w-100 text-start d-flex align-items-center ${
                activeModule === 'usuarios' ? 'active bg-primary' : 'text-white'
              }`}
              onClick={() => setActiveModule('usuarios')}
            >
              <FaUser className="me-2" />
              Usuarios
            </button>
          </li>
          <li className="nav-item mb-2">
            <button
              className={`nav-link w-100 text-start d-flex align-items-center ${
                activeModule === 'clases' ? 'active bg-primary' : 'text-white'
              }`}
              onClick={() => setActiveModule('clases')}
            >
              <FaChalkboardTeacher className="me-2" />
              Clases
            </button>
          </li>
          <li className="nav-item mb-2">
            <button
              className={`nav-link w-100 text-start d-flex align-items-center ${
                activeModule === 'asistencias' ? 'active bg-primary' : 'text-white'
              }`}
              onClick={() => setActiveModule('asistencias')}
            >
              <FaClipboardCheck className="me-2" />
              Asistencias
            </button>
          </li>
          <li className="nav-item mb-2">
            <button
              className={`nav-link w-100 text-start d-flex align-items-center ${
                activeModule === 'calificaciones' ? 'active bg-primary' : 'text-white'
              }`}
              onClick={() => setActiveModule('calificaciones')}
            >
              <FaGraduationCap className="me-2" />
              Calificaciones
            </button>
          </li>
        </ul>
        
        <hr className="my-2" />
        
        <button 
          className="btn btn-outline-light mt-auto d-flex align-items-center justify-content-center" 
          onClick={handleLogout}
        >
          <FaSignOutAlt className="me-2" />
          Cerrar sesión
        </button>
      </nav>

      {/* Main content */}
      <main className="flex-grow-1 p-4 bg-light">
        {/* Notificaciones flotantes */}
        {error && (
          <div className="position-fixed top-0 end-0 m-4" style={{ zIndex: 1000 }}>
            <div className="alert alert-danger alert-dismissible fade show shadow" role="alert">
              <strong>Error!</strong> {error}
              <button type="button" className="btn-close" onClick={() => setError('')}></button>
            </div>
          </div>
        )}
        
        {success && (
          <div className="position-fixed top-0 end-0 m-4" style={{ zIndex: 1000 }}>
            <div className="alert alert-success alert-dismissible fade show shadow" role="alert">
              <strong>Éxito!</strong> {success}
              <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
            </div>
          </div>
        )}

        {/* Contenido del módulo activo */}
        <div className="container-fluid py-3">
          {loading && (
            <div className="text-center my-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          )}
          
          {activeModule === 'usuarios' && (
            <UsuariosList 
              usuarios={usuarios} 
              token={token} 
              fetchUsuarios={fetchUsuarios} 
              showError={showError} 
              showSuccess={showSuccess} 
            />
          )}
          
          {activeModule === 'clases' && (
            <ClasesList 
              clases={clases} 
              token={token} 
              fetchClases={fetchClases} 
              showError={showError} 
              showSuccess={showSuccess} 
            />
          )}
          
          {activeModule === 'asistencias' && (
            <AsistenciasList
              asistencias={asistencias}
              usuarios={usuarios}
              clases={clases}
              token={token}
              fetchAsistencias={fetchAsistencias}
              showError={showError}
              showSuccess={showSuccess}
            />
          )}
          
          {activeModule === 'calificaciones' && (
            <CalificacionesList
              calificaciones={calificaciones}
              usuarios={usuarios}
              clases={clases}
              token={token}
              fetchCalificaciones={fetchCalificaciones}
              showError={showError}
              showSuccess={showSuccess}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;