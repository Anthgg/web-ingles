const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { str } = require('envalid');
const { createConfig } = require('../config');
const {
  createLogger,
  httpLogger,
  errorHandler,
  validator,
  rbac,
  z,
  db,
} = require('@campus/base-middleware');

const app = express();
const config = createConfig({
  serviceName: 'user-service',
  serviceRoot: __dirname,
  overrides: {
    USER_SECRET_KEY: str({ default: '' }),
  },
  defaults: {
    DB_NAME: 'instenglish_auth',
    PORT: 3002,
  },
});

const { env, corsOrigins } = config;

const logger = createLogger({ name: 'user-service' });

app.use(
  cors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true,
  }),
);
app.use(express.json());
app.use(httpLogger({ logger }));

const SECRET_KEY = config.get('USER_SECRET_KEY') || env.JWT_SECRET;

db.configure({
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  port: env.DB_PORT,
  connectionLimit: env.DB_POOL_SIZE,
  logger,
});

const { ERROR_CODES: DB_ERROR_CODES } = db;

const ensurePersonalDataTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS usuario_datos_personales (
      usuario_id INT PRIMARY KEY,
      dni VARCHAR(20) NOT NULL,
      edad INT NOT NULL,
      telefono VARCHAR(30) NOT NULL,
      email VARCHAR(255) NOT NULL,
      direccion VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_usuario_datos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
};

ensurePersonalDataTable().catch((error) => {
  logger.error({ err: error }, 'No se pudo asegurar la tabla usuario_datos_personales');
});

// Mejora: se centraliza el manejo de errores y consultas con async/await para respuestas predecibles en usuario.
const asyncHandler = handler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

const createUserSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  rol: z.string().min(1, 'Rol requerido'),
});

const updateUserSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  rol: z.string().min(1, 'Rol requerido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
});

const userIdSchema = z.object({
  id: z.coerce.number().int().positive('Id inválido'),
});

const personalDataSchema = z.object({
  usuario_id: z.coerce.number().int().positive('Id de usuario inválido').optional(),
  dni: z.string().min(8, 'DNI inválido').max(20),
  edad: z.coerce.number().int().min(0, 'Edad inválida').max(120, 'Edad inválida'),
  telefono: z.string().min(5, 'Teléfono inválido').max(30),
  email: z.string().email('Email inválido'),
  direccion: z.string().max(255, 'Dirección muy larga').optional().nullable(),
});

const ensureAuthenticated = rbac([], { jwtSecret: SECRET_KEY });
const ensureAdmin = rbac(['administrativo', 'admin'], { jwtSecret: SECRET_KEY });
const isAdmin = (user) => (user?.rol === 'administrativo' || user?.rol === 'admin');
const validateUserParams = validator(userIdSchema, { target: 'params' });
const validateCreateUser = validator(createUserSchema);
const validateUpdateUser = validator(updateUserSchema);
const validatePersonalData = validator(personalDataSchema);

app.post('/login', validator(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const users = await db.query(
    'SELECT id, nombre, password, rol FROM usuarios WHERE email = ?',
    [email],
    { tag: 'user.login.findByEmail' },
  );
  if (!users.length) {
    return res.status(401).json({ error: 'Usuario no encontrado' });
  }

  const user = users[0];
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  const token = jwt.sign({ id: user.id, rol: user.rol, nombre: user.nombre }, SECRET_KEY, { expiresIn: '1h' });
  res.json({ token, rol: user.rol, nombre: user.nombre });
}));

const listUsersHandler = asyncHandler(async (req, res) => {
  const users = await db.query(
    'SELECT id, nombre, email, rol FROM usuarios',
    [],
    { tag: 'user.listAll' },
  );
  res.json(users);
});

const fetchPersonalData = async (userId) => {
  const rows = await db.query(
    'SELECT usuario_id, dni, edad, telefono, email, direccion, created_at, updated_at FROM usuario_datos_personales WHERE usuario_id = ? LIMIT 1',
    [userId],
    { tag: 'user.personalData.findByUserId' },
  );
  return rows.length ? rows[0] : null;
};

const mapPersonalData = (row) => {
  if (!row) return null;
  return {
    usuarioId: row.usuario_id,
    dni: row.dni,
    edad: row.edad,
    telefono: row.telefono,
    email: row.email,
    direccion: row.direccion,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const getPersonalDataHandler = (resolver) => asyncHandler(async (req, res) => {
  const targetUserId = resolver(req);
  if (!targetUserId) {
    return res.status(400).json({ error: 'Usuario inválido' });
  }
  const data = await fetchPersonalData(targetUserId);
  res.json(mapPersonalData(data));
});

const savePersonalDataHandler = asyncHandler(async (req, res) => {
  const payload = req.body;
  const targetUserId = payload.usuario_id ?? req.user?.id;

  if (!targetUserId) {
    return res.status(400).json({ error: 'usuario_id requerido' });
  }

  if (payload.usuario_id && !isAdmin(req.user)) {
    return res.status(403).json({ error: 'No tienes permiso para modificar datos de otro usuario' });
  }

  await db.query(
    `INSERT INTO usuario_datos_personales (usuario_id, dni, edad, telefono, email, direccion)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       dni = VALUES(dni),
       edad = VALUES(edad),
       telefono = VALUES(telefono),
       email = VALUES(email),
       direccion = VALUES(direccion),
       updated_at = CURRENT_TIMESTAMP`,
    [
      targetUserId,
      payload.dni,
      payload.edad,
      payload.telefono,
      payload.email,
      payload.direccion ?? null,
    ],
    { tag: 'user.personalData.upsert' },
  );

  const data = await fetchPersonalData(targetUserId);
  res.status(200).json({ message: 'Datos personales guardados', data: mapPersonalData(data) });
});

// PDF report: lista de usuarios (solo admin)
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

app.get('/api/users/report.pdf', ensureAdmin, asyncHandler(async (req, res) => {
  const users = await db.query('SELECT id, nombre, email, rol FROM usuarios ORDER BY id');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="reporte-usuarios.pdf"');

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(res);

  // Encabezado con logo y datos institucionales
  const logoPath = path.join(__dirname, '../../frontend/public/logo.png');
  let logoY = 40;
  
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 50, logoY, { width: 100, height: 100 });
  }

  // Datos institucionales (ajustado para no superponerse con el logo)
  doc.fontSize(15).font('Helvetica-Bold')
     .text('I.E. N.º 7213 Peruano Japonés', 165, logoY + 5);
  
  doc.fontSize(9).font('Helvetica')
     .text('Código Modular: 0874198 | RUC: 20503217032', 165, logoY + 25)
     .text('Nivel: Primaria y Secundaria | Gestión: Pública', 165, logoY + 38)
     .text('UGEL N.º 01 – San Juan de Miraflores (Lima Metropolitana)', 165, logoY + 51);
  
  doc.fontSize(8).font('Helvetica')
     .text('Av. 200 Millas s/n, Urb. Pachacámac (IV Etapa / Sector 1), Villa El Salvador, Lima', 165, logoY + 64)
     .text('Teléfono: (01) 293-4417 | Email: japones7213@hotmail.com', 165, logoY + 76);

  // Línea separadora
  doc.moveTo(50, logoY + 105).lineTo(545, logoY + 105).stroke();

  // Título del reporte
  doc.fontSize(18).font('Helvetica-Bold')
     .text('REPORTE DE USUARIOS REGISTRADOS', 50, logoY + 120, { align: 'center' });

  // Información del reporte
  const now = new Date();
  const fecha = now.toLocaleDateString('es-PE', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const hora = now.toLocaleTimeString('es-PE');
  
  doc.fontSize(9).font('Helvetica')
     .text(`Fecha de emisión: ${fecha}`, 50, logoY + 145)
     .text(`Hora: ${hora}`, 50, logoY + 160)
     .text(`Total de usuarios: ${users.length}`, 50, logoY + 175);

  // Línea separadora antes de la tabla
  doc.moveTo(50, logoY + 195).lineTo(545, logoY + 195).stroke();

  // Tabla de usuarios
  const tableTop = logoY + 210;
  const itemX = 50;
  const colWidths = { id: 40, nombre: 180, email: 180, rol: 85 };

  // Encabezado de tabla con fondo
  doc.rect(itemX, tableTop, 495, 20).fillAndStroke('#2c3e50', '#2c3e50');
  
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff')
     .text('ID', itemX + 5, tableTop + 5, { width: colWidths.id })
     .text('NOMBRE', itemX + colWidths.id + 5, tableTop + 5, { width: colWidths.nombre })
     .text('EMAIL', itemX + colWidths.id + colWidths.nombre + 5, tableTop + 5, { width: colWidths.email })
     .text('ROL', itemX + colWidths.id + colWidths.nombre + colWidths.email + 5, tableTop + 5, { width: colWidths.rol });

  doc.fillColor('#000000');

  // Contenido de la tabla
  let y = tableTop + 25;
  let rowColor = true;

  for (const u of users) {
    // Nueva página si es necesario
    if (y > doc.page.height - 100) {
      doc.addPage();
      y = 50;
      
      // Re-dibujar encabezado en nueva página
      doc.rect(itemX, y, 495, 20).fillAndStroke('#2c3e50', '#2c3e50');
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff')
         .text('ID', itemX + 5, y + 5, { width: colWidths.id })
         .text('NOMBRE', itemX + colWidths.id + 5, y + 5, { width: colWidths.nombre })
         .text('EMAIL', itemX + colWidths.id + colWidths.nombre + 5, y + 5, { width: colWidths.email })
         .text('ROL', itemX + colWidths.id + colWidths.nombre + colWidths.email + 5, y + 5, { width: colWidths.rol });
      doc.fillColor('#000000');
      y += 25;
      rowColor = true;
    }

    // Alternar color de filas
    if (rowColor) {
      doc.rect(itemX, y - 2, 495, 20).fill('#f8f9fa');
    }
    rowColor = !rowColor;

    // Contenido de la fila
    doc.fontSize(9).font('Helvetica').fillColor('#000000')
       .text(String(u.id), itemX + 5, y + 3, { width: colWidths.id })
       .text(u.nombre || '-', itemX + colWidths.id + 5, y + 3, { width: colWidths.nombre - 10, ellipsis: true })
       .text(u.email || '-', itemX + colWidths.id + colWidths.nombre + 5, y + 3, { width: colWidths.email - 10, ellipsis: true });
    
    // Color según rol
    const rolColors = {
      'administrativo': '#e74c3c',
      'profesor': '#3498db',
      'estudiante': '#2ecc71'
    };
    doc.fillColor(rolColors[u.rol] || '#95a5a6')
       .text((u.rol || '-').toUpperCase(), itemX + colWidths.id + colWidths.nombre + colWidths.email + 5, y + 3, { width: colWidths.rol });
    
    doc.fillColor('#000000');
    y += 20;
  }

  // Pie de página
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).font('Helvetica')
       .text(`Página ${i + 1} de ${pageCount}`, 50, doc.page.height - 50, { align: 'center' })
       .text('© I.E. N.º 7213 Peruano Japonés - Sistema de Gestión Académica', 50, doc.page.height - 35, { align: 'center' });
  }

  doc.end();
}));

const createUserHandler = asyncHandler(async (req, res) => {
  const { nombre, email, password, rol } = req.body;
  const hash = await bcrypt.hash(password, 10);

  try {
    const result = await db.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
      [nombre, email, hash, rol],
      { tag: 'user.create.insert' },
    );
    res.status(201).json({ id: result.insertId, nombre, email, rol });
  } catch (error) {
    if (error.details?.code === DB_ERROR_CODES.DUP_ENTRY) {
      return res.status(400).json({ error: 'Email ya registrado' });
    }
    throw error;
  }
});

const updateUserHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nombre, rol, password } = req.body;

  if (password) {
    const hash = await bcrypt.hash(password, 10);
    await db.query(
      'UPDATE usuarios SET nombre = ?, rol = ?, password = ? WHERE id = ?',
      [nombre, rol, hash, id],
      { tag: 'user.update.withPassword' },
    );
    return res.json({ message: 'Usuario actualizado con nueva contraseña' });
  }

  await db.query(
    'UPDATE usuarios SET nombre = ?, rol = ? WHERE id = ?',
    [nombre, rol, id],
    { tag: 'user.update' },
  );
  res.json({ message: 'Usuario actualizado' });
});

const deleteUserHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await db.query(
    'DELETE FROM usuarios WHERE id = ?',
    [id],
    { tag: 'user.delete' },
  );
  res.json({ message: 'Usuario eliminado' });
});

app.get('/api/users', ensureAdmin, listUsersHandler);
app.post('/api/users', ensureAdmin, validateCreateUser, createUserHandler);
app.put('/api/users/:id', ensureAdmin, validateUserParams, validateUpdateUser, updateUserHandler);
app.delete('/api/users/:id', ensureAdmin, validateUserParams, deleteUserHandler);

app.get('/api/users/me/personal-data', ensureAuthenticated, getPersonalDataHandler((req) => req.user?.id));
app.get('/api/users/:id/personal-data', ensureAdmin, validateUserParams, getPersonalDataHandler((req) => Number(req.params.id)));
app.post('/api/users/:id/personal-data', ensureAdmin, validateUserParams, (req, res, next) => {
  req.body.usuario_id = Number(req.params.id);
  return next();
}, validatePersonalData, savePersonalDataHandler);

// Mantener rutas anteriores para compatibilidad con el frontend existente
app.get('/usuarios', ensureAdmin, listUsersHandler);
app.post('/usuarios', ensureAdmin, validateCreateUser, createUserHandler);
app.put('/usuarios/:id', ensureAdmin, validateUserParams, validateUpdateUser, updateUserHandler);
app.delete('/usuarios/:id', ensureAdmin, validateUserParams, deleteUserHandler);
app.get('/datos-personales', ensureAuthenticated, getPersonalDataHandler((req) => req.user?.id));
app.get('/datos-personales/:id', ensureAdmin, validateUserParams, getPersonalDataHandler((req) => Number(req.params.id)));
app.post('/datos-personales', ensureAuthenticated, validatePersonalData, savePersonalDataHandler);

app.get('/healthz', asyncHandler(async (req, res) => {
  const result = await db.healthCheck();
  if (result.ok) {
    return res.status(200).json({ status: 'ok', latencyMs: Number(result.latencyMs.toFixed(2)) });
  }

  return res.status(503).json({
    status: 'error',
    code: result.error?.details?.code ?? 'DB_HEALTH_FAIL',
  });
}));

app.use(errorHandler(logger));

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'User Service en ejecución');
});
