const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const initDb = require('../utils/db');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function register(req, res) {
  const { nombre, email, usuario, password, rol } = req.body;
  if (!email || !password || !usuario) return res.status(400).json({ message: 'Datos incompletos' });
  const db = await initDb();
  const existing = await db.get('SELECT * FROM usuarios WHERE email = ? OR usuario = ?', [email, usuario]);
  if (existing) return res.status(400).json({ message: 'El usuario ya existe' });
  const hash = await bcrypt.hash(password, 10);
  await db.run('INSERT INTO usuarios (nombre, email, usuario, password_hash, rol) VALUES (?,?,?,?,?)', [
    nombre || usuario,
    email,
    usuario,
    hash,
    rol || 'usuario'
  ]);
  res.json({ message: 'Usuario creado' });
}

async function login(req, res) {
  const { email, usuario, password } = req.body;
  if (!password || (!email && !usuario)) return res.status(400).json({ message: 'Credenciales faltantes' });
  const db = await initDb();
  const user = await db.get('SELECT * FROM usuarios WHERE email = ? OR usuario = ?', [email, usuario]);
  if (!user) return res.status(401).json({ message: 'Usuario no encontrado' });
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ message: 'Contraseña incorrecta' });
  const token = jwt.sign({ id: user.id, rol: user.rol, nombre: user.nombre, email: user.email }, process.env.JWT_SECRET || 'dev', { expiresIn: '8h' });
  res.json({ token, usuario: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, foto_url: user.foto_url } });
}

module.exports = { register, login };
