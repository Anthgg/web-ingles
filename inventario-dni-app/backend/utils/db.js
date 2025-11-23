const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbPath = path.resolve(__dirname, '..', process.env.DB_PATH || '../database/inventario.sqlite');
let dbPromise;

async function bootstrap(db) {
  await db.exec(`PRAGMA foreign_keys = ON;`);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      usuario TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'usuario',
      foto_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      categoria TEXT NOT NULL,
      precio REAL NOT NULL,
      stock INTEGER NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      proveedor TEXT,
      fecha_ingreso DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS movimientos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      cantidad INTEGER NOT NULL,
      descripcion TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(producto_id) REFERENCES productos(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS consultas_dni (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dni TEXT NOT NULL,
      nombres TEXT,
      apellidos TEXT,
      estado TEXT,
      usuario_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
    );
  `);

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@local';
  const adminUser = process.env.ADMIN_USUARIO || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const admin = await db.get('SELECT id FROM usuarios WHERE email = ? OR usuario = ?', [adminEmail, adminUser]);
  if (!admin) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await db.run(
      'INSERT INTO usuarios (nombre, email, usuario, password_hash, rol) VALUES (?,?,?,?,?)',
      ['Administrador', adminEmail, adminUser, hash, 'admin']
    );
    console.log('Usuario administrador inicial creado');
  }
}

async function initDb() {
  if (!dbPromise) {
    if (!fs.existsSync(path.dirname(dbPath))) {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }
    dbPromise = open({ filename: dbPath, driver: sqlite3.Database }).then(async db => {
      await bootstrap(db);
      return db;
    });
  }
  return dbPromise;
}

module.exports = initDb;
