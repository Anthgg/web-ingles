const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const SECRET_KEY = 'tu_clave_super_secreta';

const connection = mysql.createConnection({
  host: 'locinstenglish-auth.c50qcacwip4o.us-east-2.rds.amazonaws.comalhost',
  user: 'admin',
  password: 'GgAnth17',
  database: 'instenglish_grades',
  port: 3306,
});

connection.connect(err => {
  if (err) {
    console.error('DB connection error:', err);
  } else {
    console.log('Grades Service DB connected');
  }
});

function authMiddleware(allowedRoles = []) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token requerido' });

    const token = authHeader.split(' ')[1];
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
      if (err) return res.status(401).json({ error: 'Token inválido' });
      req.user = decoded;

      if (allowedRoles.length && !allowedRoles.includes(req.user.rol)) {
        return res.status(403).json({ error: 'No tienes permisos para acceder a esta ruta' });
      }
      next();
    });
  };
}

// Listar calificaciones (solo administrativo)
app.get('/calificaciones', authMiddleware(['administrativo']), (req, res) => {
  connection.query('SELECT * FROM calificaciones', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Obtener calificaciones por estudiante
app.get('/calificaciones/:estudiante_id', authMiddleware(['administrativo', 'estudiante']), (req, res) => {
  const { estudiante_id } = req.params;

  // Si es estudiante, solo puede ver sus calificaciones
  if (req.user.rol === 'estudiante' && req.user.id != estudiante_id) {
    return res.status(403).json({ error: 'No tienes permisos para acceder a esta ruta' });
  }

  connection.query(
    'SELECT * FROM calificaciones WHERE estudiante_id = ?',
    [estudiante_id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// Crear calificación (administrativo)
app.post('/calificaciones', authMiddleware(['administrativo']), (req, res) => {
  const { estudiante_id, materia_id, calificacion } = req.body;
  if (!estudiante_id || !materia_id || calificacion == null) return res.status(400).json({ error: 'Faltan datos' });

  connection.query(
    'INSERT INTO calificaciones (estudiante_id, materia_id, calificacion) VALUES (?, ?, ?)',
    [estudiante_id, materia_id, calificacion],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: results.insertId, estudiante_id, materia_id, calificacion });
    }
  );
});

// Editar calificación (administrativo)
app.put('/calificaciones/:id', authMiddleware(['administrativo']), (req, res) => {
  const { id } = req.params;
  const { estudiante_id, materia_id, calificacion } = req.body;
  if (!estudiante_id || !materia_id || calificacion == null) return res.status(400).json({ error: 'Faltan datos' });

  connection.query(
    'UPDATE calificaciones SET estudiante_id = ?, materia_id = ?, calificacion = ? WHERE id = ?',
    [estudiante_id, materia_id, calificacion, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Calificación actualizada' });
    }
  );
});

// Eliminar calificación (administrativo)
app.delete('/calificaciones/:id', authMiddleware(['administrativo']), (req, res) => {
  const { id } = req.params;
  connection.query('DELETE FROM calificaciones WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Calificación eliminada' });
  });
});

app.listen(3004, () => console.log('Grades Service running on http://localhost:3004'));
