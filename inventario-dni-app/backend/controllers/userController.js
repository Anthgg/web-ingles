const initDb = require('../utils/db');

async function list(req, res) {
  const db = await initDb();
  const users = await db.all('SELECT id, nombre, email, usuario, rol, foto_url, created_at FROM usuarios ORDER BY created_at DESC');
  res.json(users);
}

async function updateProfile(req, res) {
  const { id } = req.params;
  const { nombre, foto_url, rol } = req.body;
  const db = await initDb();
  await db.run('UPDATE usuarios SET nombre=?, foto_url=?, rol=? WHERE id=?', [nombre, foto_url, rol, id]);
  res.json({ message: 'Perfil actualizado' });
}

module.exports = { list, updateProfile };
