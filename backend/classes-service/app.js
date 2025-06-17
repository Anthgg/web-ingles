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
  database: 'instenglish_classes',
  port: 3306,
});

connection.connect(err => {
  if (err) {
    console.error('DB connection error:', err);
  } else {
    console.log('Classes Service DB connected');
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

// Listar clases (todos los roles)
app.get('/materias', authMiddleware(), (req, res) => {
  connection.query('SELECT * FROM materias', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Crear clase (administrativo)
app.post('/materias', authMiddleware(['administrativo']), (req, res) => {
  const { nombre, descripcion } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Faltan datos' });

  connection.query(
    'INSERT INTO materias (nombre, descripcion) VALUES (?, ?)',
    [nombre, descripcion],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: results.insertId, nombre, descripcion });
    }
  );
});

// Editar clase (administrativo)
app.put('/materias/:id', authMiddleware(['administrativo']), (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Faltan datos' });

  connection.query(
    'UPDATE materias SET nombre = ?, descripcion = ? WHERE id = ?',
    [nombre, descripcion, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Clase actualizada' });
    }
  );
});

// Eliminar clase (administrativo)
app.delete('/materias/:id', authMiddleware(['administrativo']), (req, res) => {
  const { id } = req.params;
  connection.query('DELETE FROM materias WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Clase eliminada' });
  });
});

app.listen(3005, () => console.log('Classes Service running on http://localhost:3005'));
