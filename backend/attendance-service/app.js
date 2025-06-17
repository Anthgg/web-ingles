const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');
  
const app = express();
app.use(cors());
app.use(express.json());

const SECRET_KEY = 'tu_clave_super_secreta';

const connection = mysql.createConnection({
  host: 'instenglish-auth.c50qcacwip4o.us-east-2.rds.amazonaws.com',
  user: 'admin',
  password: 'GgAnth17',
  database: 'instenglish_attendance',
  port: 3306,
});

connection.connect(err => {
  if (err) {
    console.error('DB connection error:', err);
  } else {
    console.log('Attendance Service DB connected');
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

// Listar asistencias (solo administrativo)
app.get('/asistencias', authMiddleware(['administrativo']), (req, res) => {
  connection.query('SELECT * FROM asistencias', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Obtener asistencias por estudiante
app.get('/asistencias/:estudiante_id', authMiddleware(['administrativo', 'estudiante']), (req, res) => {
  const { estudiante_id } = req.params;

  // Si es estudiante, solo puede ver sus propias asistencias
  if (req.user.rol === 'estudiante' && req.user.id != estudiante_id) {
    return res.status(403).json({ error: 'No tienes permisos para acceder a esta ruta' });
  }

  connection.query(
    'SELECT * FROM asistencias WHERE estudiante_id = ?',
    [estudiante_id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// Crear asistencia (administrativo)
app.post('/asistencias', authMiddleware(['administrativo']), (req, res) => {
  const { estudiante_id, materia_id, estado } = req.body;
  if (!estudiante_id || !materia_id || !estado) return res.status(400).json({ error: 'Faltan datos' });

  connection.query(
    'INSERT INTO asistencias (estudiante_id, materia_id, estado) VALUES (?, ?, ?)',
    [estudiante_id, materia_id, estado],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: results.insertId, estudiante_id, materia_id, estado });
    }
  );
});

// Editar asistencia (administrativo)
app.put('/asistencias/:id', authMiddleware(['administrativo']), (req, res) => {
  const { id } = req.params;
  const { estudiante_id, materia_id, estado } = req.body;
  if (!estudiante_id || !materia_id || !estado) return res.status(400).json({ error: 'Faltan datos' });

  connection.query(
    'UPDATE asistencias SET estudiante_id = ?, materia_id = ?, estado = ? WHERE id = ?',
    [estudiante_id, materia_id, estado, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Asistencia actualizada' });
    }
  );
});

// Eliminar asistencia (administrativo)
app.delete('/asistencias/:id', authMiddleware(['administrativo']), (req, res) => {
  const { id } = req.params;
  connection.query('DELETE FROM asistencias WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Asistencia eliminada' });
  });
});

app.listen(3003, () => console.log('Attendance Service running on http://localhost:3003'));
