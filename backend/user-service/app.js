const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

const SECRET_KEY = 'tu_clave_super_secreta';

const connection = mysql.createConnection({
  host: 'instenglish-auth.c50qcacwip4o.us-east-2.rds.amazonaws.com',
  user: 'admin',
  password: 'GgAnth17',
  database: 'instenglish_auth',
  port: 3306,
});

connection.connect(err => {
  if (err) {
    console.error('Error DB User:', err);
  } else {
    console.log('User Service DB conectado');
  }
});

// Middleware auth con roles
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

// Ruta login para autenticar usuario y devolver token y rol
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ error: 'Faltan datos' });

  connection.query('SELECT * FROM usuarios WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(401).json({ error: 'Usuario no encontrado' });

    const user = results[0];

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return res.status(401).json({ error: 'Contraseña incorrecta' });

    const token = jwt.sign(
      { id: user.id, rol: user.rol, nombre: user.nombre },
      SECRET_KEY,
      { expiresIn: '1h' }
    );

    res.json({ token, rol: user.rol, nombre: user.nombre });
  });
});

// Listar usuarios (administrativo)
app.get('/usuarios', authMiddleware(['administrativo']), (req, res) => {
  connection.query('SELECT id, nombre, email, rol FROM usuarios', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Crear usuario con password hasheado (administrativo)
app.post('/usuarios', authMiddleware(['administrativo']), async (req, res) => {
  const { nombre, email, password, rol } = req.body;
  if (!nombre || !email || !password || !rol) return res.status(400).json({ error: 'Faltan datos' });

  try {
    const hash = await bcrypt.hash(password, 10);
    connection.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
      [nombre, email, hash, rol],
      (err, results) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email ya registrado' });
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: results.insertId, nombre, email, rol });
      }
    );
  } catch {
    res.status(500).json({ error: 'Error al hashear contraseña' });
  }
});

// Editar usuario (administrativo)
app.put('/usuarios/:id', authMiddleware(['administrativo']), async (req, res) => {
  const { id } = req.params;
  const { nombre, rol, password } = req.body;
  if (!nombre || !rol) return res.status(400).json({ error: 'Faltan datos' });

  if (password) {
    try {
      const hash = await bcrypt.hash(password, 10);
      connection.query(
        'UPDATE usuarios SET nombre = ?, rol = ?, password = ? WHERE id = ?',
        [nombre, rol, hash, id],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ message: 'Usuario actualizado con contraseña' });
        }
      );
    } catch {
      res.status(500).json({ error: 'Error al hashear contraseña' });
    }
  } else {
    connection.query(
      'UPDATE usuarios SET nombre = ?, rol = ? WHERE id = ?',
      [nombre, rol, id],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Usuario actualizado' });
      }
    );
  }
});

// Eliminar usuario (administrativo)
app.delete('/usuarios/:id', authMiddleware(['administrativo']), (req, res) => {
  const { id } = req.params;
  connection.query('DELETE FROM usuarios WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Usuario eliminado' });
  });
});

app.listen(3002, () => console.log('User Service corriendo en http://localhost:3002'));
