const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET','POST','PUT','DELETE'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true
}));
app.use(express.json());

const SECRET_KEY = 'tu_clave_super_secreta';

const connection = mysql.createConnection({
  host: 'instenglish-auth.c50qcacwip4o.us-east-2.rds.amazonaws.com',
  user: 'admin',
  password: 'GgAnth17',
  database: 'instenglish_asignation',
  port: 3306,
});

connection.connect(err => {
  if (err) console.error('DB error:', err);
  else console.log('DB conectada');
});

// Middleware de debugging ANTES de las rutas
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('Headers:', req.headers.authorization ? 'Token presente' : 'Sin token');
  next();
});

function authMiddleware(allowedRoles = []) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log('Auth header:', authHeader ? 'Presente' : 'Ausente');
    
    if (!authHeader) return res.status(401).json({ error: 'Token requerido' });

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      console.log('Formato de token inválido');
      return res.status(401).json({ error: 'Formato de token inválido' });
    }

    jwt.verify(parts[1], SECRET_KEY, (err, decoded) => {
      if (err) {
        console.log('Token inválido:', err.message);
        return res.status(401).json({ error: 'Token inválido' });
      }
      
      req.user = decoded;
      console.log('Usuario autenticado:', { id: decoded.id, nombre: decoded.nombre, rol: decoded.rol });
      
      if (allowedRoles.length && !allowedRoles.includes(req.user.rol)) {
        console.log(`Rol ${req.user.rol} no permitido. Roles permitidos:`, allowedRoles);
        return res.status(403).json({ error: 'Permisos insuficientes' });
      }
      next();
    });
  };
}

// Rutas de asignaciones (acceso: administrativo y profesor)
app.get('/asignaciones', authMiddleware(['administrativo','profesor']), (req, res) => {
  console.log('Obteniendo asignaciones para usuario:', req.user);
  
  let query = `
    SELECT id, profesor_nombre, curso_nombre, dia_semana, hora_inicio, hora_fin, 
           fecha_inicio, fecha_fin, aula, notas, max_alumnos
    FROM asignaciones_profesor_curso
  `;
  let params = [];

  // Si el usuario es profesor, solo mostrar sus asignaciones
  if (req.user.rol === 'profesor') {
    query += ' WHERE profesor_nombre = ?';
    params.push(req.user.nombre);
    console.log('Filtrando por profesor:', req.user.nombre);
  }

  console.log('Query SQL:', query);
  console.log('Parámetros:', params);

  connection.query(query, params, (err, results) => {
    if (err) {
      console.error('Error en consulta:', err);
      return res.status(500).json({ error: err.message });
    }
    console.log('Resultados encontrados:', results.length);
    console.log('Datos:', results);
    res.json({ success: true, data: results, count: results.length });
  });
});

app.get('/asignaciones/:id', authMiddleware(['administrativo','profesor','estudiante']), (req, res) => {
  const id = req.params.id;
  console.log('Obteniendo asignación específica:', id);
  
  connection.query(
    `SELECT * FROM asignaciones_profesor_curso WHERE id = ?`, [id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!results.length) return res.status(404).json({ error: 'No encontrada' });
      res.json(results[0]);
    }
  );
});

app.post('/asignaciones', authMiddleware(['administrativo']), (req, res) => {
  console.log('Creando nueva asignación:', req.body);
  
  const {
    profesorNombre: profesor_nombre,
    cursoNombre: curso_nombre,
    diaSemana: dia_semana,
    horaInicio: hora_inicio,
    horaFin: hora_fin,
    fechaInicio: fecha_inicio,
    fechaFin: fecha_fin,
    aula=null, notas=null,
    maxAlumnos: max_alumnos
  } = req.body;

  if (!profesor_nombre || !curso_nombre || !dia_semana || !hora_inicio ||
      !hora_fin || !fecha_inicio || !fecha_fin || !max_alumnos) {
    return res.status(400).json({ error: 'Campos requeridos incompletos', received: req.body });
  }

  connection.query(
    `INSERT INTO asignaciones_profesor_curso 
     (profesor_nombre, curso_nombre, dia_semana, hora_inicio, hora_fin, fecha_inicio, fecha_fin, aula, notas, max_alumnos)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [profesor_nombre, curso_nombre, dia_semana, hora_inicio, hora_fin, fecha_inicio, fecha_fin, aula, notas, max_alumnos],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: results.insertId, message: 'Creado' });
    }
  );
});

app.put('/asignaciones/:id', authMiddleware(['administrativo']), (req, res) => {
  const id = req.params.id;
  console.log('Actualizando asignación:', id, req.body);
  
  const {
    profesorNombre: profesor_nombre,
    cursoNombre: curso_nombre,
    diaSemana: dia_semana,
    horaInicio: hora_inicio,
    horaFin: hora_fin,
    fechaInicio: fecha_inicio,
    fechaFin: fecha_fin,
    aula=null, notas=null,
    maxAlumnos: max_alumnos
  } = req.body;

  if (!profesor_nombre || !curso_nombre || !dia_semana || !hora_inicio ||
      !hora_fin || !fecha_inicio || !fecha_fin || !max_alumnos) {
    return res.status(400).json({ error: 'Campos requeridos incompletos' });
  }

  connection.query(
    `UPDATE asignaciones_profesor_curso SET
       profesor_nombre=?, curso_nombre=?, dia_semana=?, hora_inicio=?, hora_fin=?, fecha_inicio=?, fecha_fin=?, aula=?, notas=?, max_alumnos=?
     WHERE id = ?`,
    [profesor_nombre, curso_nombre, dia_semana, hora_inicio, hora_fin, fecha_inicio, fecha_fin, aula, notas, max_alumnos, id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.affectedRows === 0) return res.status(404).json({ error: 'No encontrada' });
      res.json({ message: 'Actualizado' });
    }
  );
});

app.delete('/asignaciones/:id', authMiddleware(['administrativo']), (req, res) => {
  const id = req.params.id;
  console.log('Eliminando asignación:', id);
  
  connection.query('DELETE FROM asignaciones_profesor_curso WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.affectedRows === 0) return res.status(404).json({ error: 'No encontrada' });
    res.json({ message: 'Eliminada' });
  });
});

// Rutas auxiliares: profesores y cursos
app.get('/profesores', authMiddleware(), (req, res) => {
  connection.query(
    'SELECT DISTINCT profesor_nombre AS nombre FROM asignaciones_profesor_curso ORDER BY profesor_nombre',
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

app.get('/cursos', authMiddleware(), (req, res) => {
  connection.query(
    'SELECT DISTINCT curso_nombre AS nombre FROM asignaciones_profesor_curso ORDER BY curso_nombre',
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// Nueva ruta: obtener todos los cursos desde la tabla 'cursos'
app.get('/todos-cursos', authMiddleware(), (req, res) => {
  connection.query(
    'SELECT id, nombre FROM cursos ORDER BY nombre',
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

app.get('/cursos-con-profesor', authMiddleware(), (req, res) => {
  connection.query(
    `SELECT 
        id, 
        curso_nombre AS nombre, 
        profesor_nombre AS profesor,
        CONCAT(curso_nombre, '|', profesor_nombre) AS curso_profesor_key,
        dia_semana, 
        hora_inicio, 
        hora_fin, 
        fecha_inicio, 
        fecha_fin, 
        max_alumnos
     FROM asignaciones_profesor_curso
     WHERE profesor_nombre IS NOT NULL 
     AND curso_nombre IS NOT NULL
     ORDER BY curso_nombre`,
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// Ruta de prueba para verificar que el servidor funciona
app.get('/test', (req, res) => {
  res.json({ message: 'Servidor funcionando correctamente', timestamp: new Date().toISOString() });
});



app.listen(3007, () => console.log('API de Asignaciones con JWT corriendo en http://localhost:3007'));