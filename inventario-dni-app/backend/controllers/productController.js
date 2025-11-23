const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const initDb = require('../utils/db');

async function list(req, res) {
  const { categoria, stockMinimo, search } = req.query;
  const db = await initDb();
  let query = 'SELECT * FROM productos WHERE 1=1';
  const params = [];
  if (categoria) { query += ' AND categoria = ?'; params.push(categoria); }
  if (stockMinimo) { query += ' AND stock <= ?'; params.push(Number(stockMinimo)); }
  if (search) {
    query += ' AND (nombre LIKE ? OR sku LIKE ? OR proveedor LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const productos = await db.all(query + ' ORDER BY created_at DESC', params);
  res.json(productos);
}

async function create(req, res) {
  const { nombre, categoria, precio, stock, sku, proveedor, fecha_ingreso } = req.body;
  const db = await initDb();
  await db.run(
    'INSERT INTO productos (nombre, categoria, precio, stock, sku, proveedor, fecha_ingreso) VALUES (?,?,?,?,?,?,?)',
    [nombre, categoria, precio, stock, sku, proveedor, fecha_ingreso]
  );
  res.json({ message: 'Producto registrado' });
}

async function update(req, res) {
  const { id } = req.params;
  const { nombre, categoria, precio, stock, sku, proveedor, fecha_ingreso } = req.body;
  const db = await initDb();
  await db.run(
    'UPDATE productos SET nombre=?, categoria=?, precio=?, stock=?, sku=?, proveedor=?, fecha_ingreso=? WHERE id=?',
    [nombre, categoria, precio, stock, sku, proveedor, fecha_ingreso, id]
  );
  res.json({ message: 'Producto actualizado' });
}

async function remove(req, res) {
  const { id } = req.params;
  const db = await initDb();
  await db.run('DELETE FROM productos WHERE id=?', [id]);
  res.json({ message: 'Producto eliminado' });
}

async function exportCsv(req, res) {
  const db = await initDb();
  const productos = await db.all('SELECT * FROM productos ORDER BY nombre');
  const filePath = path.join(__dirname, '..', 'productos.csv');
  const csvWriter = createCsvWriter({
    path: filePath,
    header: [
      { id: 'nombre', title: 'Nombre' },
      { id: 'categoria', title: 'Categoría' },
      { id: 'precio', title: 'Precio' },
      { id: 'stock', title: 'Stock' },
      { id: 'sku', title: 'SKU' },
      { id: 'proveedor', title: 'Proveedor' },
      { id: 'fecha_ingreso', title: 'FechaIngreso' }
    ]
  });
  await csvWriter.writeRecords(productos);
  res.download(filePath, 'productos.csv');
}

module.exports = { list, create, update, remove, exportCsv };
