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
    console.error('Error DB Auth:', err);
  } else {
    console.log('Auth Service DB conectado');
  }
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Faltan datos' });

  connection.query('SELECT * FROM usuarios WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(401).json({ error: 'Usuario no encontrado' });

    const user = results[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Contraseña incorrecta' });

    const token = jwt.sign({ id: user.id, nombre: user.nombre, rol: user.rol }, SECRET_KEY, { expiresIn: '8h' });
    res.json({ token, nombre: user.nombre, rol: user.rol });
  });
});

app.listen(3001, () => console.log('Auth Service corriendo en http://localhost:3001'));
