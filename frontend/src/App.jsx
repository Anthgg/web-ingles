import React, { useState, useEffect, useCallback } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Login from './inicio/index.jsx';
import AdminDashboard from './admin/dashboard.jsx';
import ProfesorPage from './docente/index.jsx';
import AlumnoPage from './alumno/index.jsx';

function App() {
  // Estados principales
  const [token, setToken] = useState('');
  const [userInfo, setUserInfo] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [clases, setClases] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [calificaciones, setCalificaciones] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeModule, setActiveModule] = useState('usuarios');
  const [loading, setLoading] = useState(false);
  const [asignacionesDocente, setAsignacionesDocente] = useState([]);
  const [loadingAsignacionesDocente, setLoadingAsignacionesDocente] = useState(false);
  const [errorAsignacionesDocente, setErrorAsignacionesDocente] = useState('');
  const [estudiantes, setEstudiantes] = useState([]);
  const [cursosConProfesor, setCursosConProfesor] = useState([]);

  // Función auxiliar para decodificar JWT - MOVER A ESTA POSICIÓN
  const decodeToken = useCallback((token) => {
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      throw new Error('Token malformado');
    }
    
    const payload = JSON.parse(atob(tokenParts[1]));
    
    // Validar que el payload tenga los campos necesarios
    if (!payload.id || !payload.nombre || !payload.rol) {
      throw new Error('Token no contiene información válida del usuario');
    }
    
    return payload;
  }, []);

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

  // Funciones de utilidad para mensajes
  const showError = useCallback((message) => {
    setError(message);
    setSuccess('');
  }, []);

  const showSuccess = useCallback((message) => {
    setSuccess(message);
    setError('');
  }, []);

  const clearData = useCallback(() => {
    setUsuarios([]);
    setClases([]);
    setAsistencias([]);
    setAsignaciones([]);
    setCalificaciones([]);
    setAsignacionesDocente([]);
    setEstudiantes([]);
    setCursosConProfesor([]);
    setErrorAsignacionesDocente('');
  }, []);

  // Función de logout
  const handleLogout = useCallback(() => {
    setToken('');
    setUserInfo(null);
    setActiveModule('usuarios');
    clearData();
    setError('');
    setSuccess('');
  }, [clearData]);

  // Funciones de fetch con manejo de errores mejorado
  const fetchUsuarios = useCallback(async () => {
    if (!token) return;
    
    try {
      const res = await fetch('http://localhost:3002/usuarios', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${res.status}: Error al cargar usuarios`);
      }
      
      const data = await res.json();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error en fetchUsuarios:', err);
      showError(err.message);
      setUsuarios([]);
    }
  }, [token, showError]);

  const fetchClases = useCallback(async () => {
    if (!token) return;
    
    try {
      const res = await fetch('http://localhost:3005/materias', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${res.status}: Error al cargar clases`);
      }
      
      const data = await res.json();
      setClases(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error en fetchClases:', err);
      showError(err.message);
      setClases([]);
    }
  }, [token, showError]);

  const fetchAsistencias = useCallback(async () => {
    if (!token) return;
    
    try {
      const res = await fetch('http://localhost:3003/asistencias', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${res.status}: Error al cargar asistencias`);
      }
      
      const data = await res.json();
      setAsistencias(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error en fetchAsistencias:', err);
      showError(err.message);
      setAsistencias([]);
    }
  }, [token, showError]);

  const fetchAsignaciones = useCallback(async () => {
    if (!token) return;
    
    try {
      const res = await fetch('http://localhost:3007/asignaciones', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${res.status}: Error al cargar asignaciones`);
      }
      
      const data = await res.json();
      setAsignaciones(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error en fetchAsignaciones:', err);
      showError(err.message);
      setAsignaciones([]);
    }
  }, [token, showError]);

  const fetchAsignacionesDocente = useCallback(async () => {
    if (!token) return;
    
    setLoadingAsignacionesDocente(true);
    setErrorAsignacionesDocente('');
    
    try {
      const response = await fetch('http://localhost:3007/asignaciones', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text() || 'Error desconocido'}`);
      }
      
      const data = await response.json();
       console.log("Datos de asignaciones de docente:", data);
      
      // Manejar diferentes formatos de respuesta
      let asignacionesData = [];
      if (data && data.data) {
        asignacionesData = data.data; // Formato { data: [...] }
      } else if (Array.isArray(data)) {
        asignacionesData = data; // Formato array directo
      }
      
      setAsignacionesDocente(asignacionesData);
    } catch (err) {
      console.error('Error en fetchAsignacionesDocente:', err);
      setErrorAsignacionesDocente(err.message || 'Error al cargar asignaciones del docente');
    } finally {
      setLoadingAsignacionesDocente(false);
    }
  }, [token]);

  const fetchCalificaciones = useCallback(async () => {
    if (!token) return;
    
    try {
      const res = await fetch('http://localhost:3004/calificaciones', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${res.status}: Error al cargar calificaciones`);
      }
      
      const data = await res.json();
      setCalificaciones(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error en fetchCalificaciones:', err);
      showError(err.message);
      setCalificaciones([]);
    }
  }, [token, showError]);

  // Fetch estudiantes
  const fetchEstudiantes = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:3002/usuarios', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al cargar estudiantes');
      }
      const data = await res.json();
      setEstudiantes(Array.isArray(data) ? data.filter(u => u.rol === 'estudiante' || u.rol === 'alumno') : []);
    } catch (err) {
      console.error('Error en fetchEstudiantes:', err);
      showError('No se pudieron cargar los estudiantes');
      setEstudiantes([]);
    }
  }, [token, showError]);

  // Fetch cursos con profesor asignado
  const fetchCursosConProfesor = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:3007/asignaciones', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al cargar cursos');
      }
      const result = await res.json();
      const dataArray = Array.isArray(result) ? result : (result.data || []);
      const cursos = dataArray
        .filter(a => a.profesor_nombre && a.curso_nombre)
        .map(a => ({
          nombre: a.curso_nombre,
          profesor: a.profesor_nombre,
          dia_semana: a.dia_semana,
          hora_inicio: a.hora_inicio,
          hora_fin: a.hora_fin,
          fecha_inicio: a.fecha_inicio,
          fecha_fin: a.fecha_fin,
          max_alumnos: a.max_alumnos,
          id: `${a.curso_nombre}-${a.profesor_nombre}`
        }));
      // Eliminar duplicados
      const uniqueCursos = [];
      const seen = new Set();
      for (const c of cursos) {
        const key = `${c.nombre}-${c.profesor}`;
        if (!seen.has(key)) {
          uniqueCursos.push(c);
          seen.add(key);
        }
      }
      setCursosConProfesor(uniqueCursos);
    } catch (err) {
      console.error('Error en fetchCursosConProfesor:', err);
      showError('No se pudieron cargar los cursos');
      setCursosConProfesor([]);
    }
  }, [token, showError]);

  // Fetch cursos con profesor, capacidad y cupos disponibles desde el nuevo backend
  const fetchCursosConProfesorNuevo = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3007/cursos-con-profesor', {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al cargar cursos del backend');
      }
      const data = await res.json();
      // El backend ya devuelve { id, nombre, profesor, ... }
      const cursos = Array.isArray(data) ? data.map(a => ({
        id: a.id,
        nombre: a.nombre,
        profesor: a.profesor,
        dia_semana: a.dia_semana,
        hora_inicio: a.hora_inicio,
        hora_fin: a.hora_fin,
        fecha_inicio: a.fecha_inicio,
        fecha_fin: a.fecha_fin,
        max_alumnos: a.max_alumnos,
        disponibles: a.disponibles
      })) : [];
      setCursosConProfesor(cursos);
    } catch (err) {
      console.error('Error en fetchCursosConProfesorNuevo:', err);
      showError('No se pudieron cargar los cursos del backend');
      setCursosConProfesor([]);
    }
  }, [showError]);

  // Función para cargar todos los datos - Versión optimizada
  const fetchAll = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const payload = decodeToken(token);
      const userRole = payload.rol.toLowerCase();
      
      console.log("Cargando datos para el rol:", userRole);
      
      // Carga selectiva de datos según el rol
      if (userRole === 'administrativo') {
        // Si es administrador, carga todo
        await fetchUsuarios();
        await fetchClases();
        await fetchAsistencias();
        await fetchAsignaciones();
        await fetchCalificaciones();
        await fetchEstudiantes();
        await fetchCursosConProfesorNuevo();
      } 
      else if (userRole === 'profesor') {
        // Si es profesor, SOLO carga sus asignaciones
        // Eliminamos las llamadas a servicios que no necesita y generan error 403
        console.log("Cargando solo asignaciones para profesor:", payload.nombre);
        await fetchAsignaciones();
        // No llamamos a fetchCalificaciones() ni otros servicios innecesarios
      }
      else {
        // Estudiantes u otros roles
        await fetchClases();
        await fetchAsignaciones();
        // Otros datos específicos para estudiantes
      }
      
      // Siempre cargar asignaciones de docente si el usuario es profesor
      if (userRole === 'profesor') {
        await fetchAsignacionesDocente();
      }
      
    } catch (err) {
      console.error('Error en fetchAll:', err);
      showError('No se pudieron cargar todos los datos. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [token, fetchUsuarios, fetchClases, fetchAsistencias, fetchAsignaciones, 
      fetchCalificaciones, fetchAsignacionesDocente, fetchEstudiantes, 
      fetchCursosConProfesorNuevo, showError, decodeToken]);

  // Decodificar token y cargar datos cuando cambie el token
  useEffect(() => {
    if (token) {
      try {
        const payload = decodeToken(token);
        setUserInfo({ 
          id: payload.id, 
          nombre: payload.nombre, 
          rol: payload.rol 
        });
        
        // Cargar datos después de establecer userInfo
        fetchAll();
      } catch (err) {
        console.error('Error al decodificar token:', err);
        showError('Token inválido o expirado');
        handleLogout();
      }
    } else {
      setUserInfo(null);
      clearData();
    }
  }, [token, fetchAll, showError, clearData, handleLogout, decodeToken]);

  // Función de login con mejor manejo de errores
  const handleLogin = async (email, password) => {
    if (!email || !password) {
      showError('Email y contraseña son requeridos');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:3001/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || data.message || `Error ${res.status}: Error en el login`);
      }
      
      if (!data.token) {
        throw new Error('No se recibió token del servidor');
      }
      
      setToken(data.token);
      showSuccess('Login exitoso');
    } catch (err) {
      console.error('Error en login:', err);
      showError(err.message || 'Error de conexión al servidor');
    } finally {
      setLoading(false);
    }
  };

  // Pantalla de login
  if (!token) {
    return (
      <Login 
        onLogin={handleLogin} 
        error={error} 
        loading={loading}
        success={success}
      />
    );
  }

  // Pantalla de carga inicial
  if (!userInfo || loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="text-muted">Cargando información del usuario...</p>
        </div>
      </div>
    );
  }

  // Filtrar asignaciones del profesor
  const misAsignaciones = Array.isArray(asignaciones)
    ? asignaciones.filter(a => a.profesor_nombre === userInfo.nombre)
    : [];

  // Función para renderizar la página según el rol
  const renderPageByRole = () => {
    const roleLower = userInfo.rol?.toLowerCase();
    
    switch (roleLower) {
      case 'admin':
      case 'administrativo':
        return (
          <AdminDashboard
            userInfo={userInfo}
            activeModule={activeModule}
            setActiveModule={setActiveModule}
            onLogout={handleLogout}
            loading={loading}
            error={error}
            success={success}
            setError={setError}
            setSuccess={setSuccess}
            usuarios={usuarios}
            clases={clases}
            asistencias={asistencias}
            asignaciones={asignaciones}
            calificaciones={calificaciones}
            token={token}
            fetchUsuarios={fetchUsuarios}
            fetchClases={fetchClases}
            fetchAsistencias={fetchAsistencias}
            fetchAsignaciones={fetchAsignaciones}
            fetchCalificaciones={fetchCalificaciones}
            showError={showError}
            showSuccess={showSuccess}
            estudiantes={estudiantes}
            cursosConProfesor={cursosConProfesor}
            fetchCursosConProfesorNuevo={fetchCursosConProfesorNuevo} // Agregamos esta línea
          />
        );

      case 'profesor':
      case 'docente':
        return (
          <ProfesorPage
            userInfo={userInfo}
            activeModule={activeModule}
            setActiveModule={setActiveModule}
            onLogout={handleLogout}
            token={token}
            clases={clases}
            asistencias={asistencias}
            calificaciones={calificaciones}
            asignaciones={misAsignaciones}
            asignacionesDocente={asignacionesDocente}
            loadingAsignacionesDocente={loadingAsignacionesDocente}
            errorAsignacionesDocente={errorAsignacionesDocente}
            fetchAsignacionesDocente={fetchAsignacionesDocente}
            showError={showError}
            showSuccess={showSuccess}
            loading={loading}
            error={error}
            success={success}
            setError={setError}
            setSuccess={setSuccess}
          />
        );

      case 'alumno':
      case 'estudiante':
        return (
          <AlumnoPage
            userInfo={userInfo}
            activeModule={activeModule}
            setActiveModule={setActiveModule}
            onLogout={handleLogout}
            token={token}
            clases={clases}
            asistencias={asistencias}
            calificaciones={calificaciones}
            asignaciones={asignaciones}
            showError={showError}
            showSuccess={showSuccess}
            loading={loading}
            error={error}
            success={success}
            setError={setError}
            setSuccess={setSuccess}
          />
        );

      default:
        return (
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
            <div className="alert alert-danger" role="alert">
              <h4 className="alert-heading">Acceso Denegado</h4>
              <p>El rol "{userInfo.rol}" no tiene permisos para acceder al sistema.</p>
              <p className="mb-0">Roles válidos: Admin, Administrativo, Profesor, Docente, Alumno, Estudiante</p>
              <hr />
              <button className="btn btn-outline-danger" onClick={handleLogout}>
                Cerrar Sesión
              </button>
            </div>
          </div>
        );
    }
  };

  return renderPageByRole();
}

export default App;