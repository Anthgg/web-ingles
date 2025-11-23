const initDb = require('../utils/db');

async function list(req, res) {
  const db = await initDb();
  const movimientos = await db.all(
    `SELECT m.*, p.nombre as producto FROM movimientos m
     JOIN productos p ON p.id = m.producto_id
     ORDER BY m.created_at DESC`
  );
  res.json(movimientos);
}

async function create(req, res) {
  const { producto_id, tipo, cantidad, descripcion } = req.body;
  const db = await initDb();
  await db.run('INSERT INTO movimientos (producto_id, tipo, cantidad, descripcion) VALUES (?,?,?,?)', [
    producto_id,
    tipo,
    cantidad,
    descripcion
  ]);
  const delta = tipo === 'entrada' ? cantidad : -cantidad;
  await db.run('UPDATE productos SET stock = stock + ? WHERE id=?', [delta, producto_id]);
  res.json({ message: 'Movimiento registrado' });
}

module.exports = { list, create };
