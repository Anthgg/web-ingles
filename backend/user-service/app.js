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

let cachedJwtSecret;
const resolveJwtSecret = () => {
  if (cachedJwtSecret) {
    return cachedJwtSecret;
  }

  const candidates = [
    config.get('USER_SECRET_KEY'),
    env.JWT_SECRET,
  ]
    .map((value) => (typeof value === 'string' ? value.trim() : value))
    .filter(Boolean);

  const unique = [...new Set(candidates)];

  if (!unique.length) {
    throw new Error('JWT_SECRET no configurado. Define una clave compartida para todos los servicios.');
  }

  if (unique.length > 1) {
    throw new Error('USER_SECRET_KEY y JWT_SECRET no coinciden. Usa un solo secreto compartido.');
  }

  cachedJwtSecret = unique[0];
  return cachedJwtSecret;
};

let SECRET_KEY;
try {
  SECRET_KEY = resolveJwtSecret();
} catch (error) {
  logger.error({ err: error }, 'JWT configuration error');
  process.exit(1);
}

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

// Schemas para activación/desactivación de usuarios
const desactivarUsuarioSchema = z.object({
  motivo: z.string().optional()
});

const actualizarPermisoSchema = z.object({
  puede_ver: z.boolean().optional(),
  puede_crear: z.boolean().optional(),
  puede_editar: z.boolean().optional(),
  puede_eliminar: z.boolean().optional(),
  descripcion: z.string().optional()
});

const rolModuloSchema = z.object({
  rol: z.string(),
  modulo: z.string()
});

const ensureAuthenticated = rbac([], { jwtSecret: SECRET_KEY });
const ensureAdmin = rbac(['administrativo', 'admin'], { jwtSecret: SECRET_KEY });
const isAdmin = (user) => (user?.rol === 'administrativo' || user?.rol === 'admin');
const validateUserParams = validator(userIdSchema, { target: 'params' });
const validateCreateUser = validator(createUserSchema);
const validateUpdateUser = validator(updateUserSchema);
const validatePersonalData = validator(personalDataSchema);
const validateDesactivar = validator(desactivarUsuarioSchema);
const validateActualizarPermiso = validator(actualizarPermisoSchema);
const validateRolModulo = validator(rolModuloSchema, { target: 'params' });

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
    'SELECT id, nombre, email, rol, codigo_estudiante, codigo_docente, codigo_admin FROM usuarios',
    [],
    { tag: 'user.listAll' },
  );
  res.json(users);
});

// Endpoint para obtener usuarios con datos incompletos y sus códigos modulares
const listUsersIncompletosHandler = asyncHandler(async (req, res) => {
  const query = `
    SELECT 
      u.id,
      u.nombre,
      u.email,
      u.rol,
      u.codigo_estudiante,
      u.codigo_docente,
      u.codigo_admin,
      udp.dni,
      udp.edad,
      udp.telefono,
      udp.direccion,
      CASE 
        WHEN udp.usuario_id IS NULL THEN 0
        WHEN udp.dni IS NULL OR udp.dni = '' THEN 0
        WHEN udp.edad IS NULL OR udp.edad = 0 THEN 0
        WHEN udp.telefono IS NULL OR udp.telefono = '' THEN 0
        ELSE 1
      END AS datos_completos,
      CASE
        WHEN udp.usuario_id IS NULL THEN 'Todos los datos'
        ELSE CONCAT_WS(', ',
          IF(udp.dni IS NULL OR udp.dni = '', 'DNI', NULL),
          IF(udp.edad IS NULL OR udp.edad = 0, 'Edad', NULL),
          IF(udp.telefono IS NULL OR udp.telefono = '', 'Teléfono', NULL),
          IF(udp.direccion IS NULL OR udp.direccion = '', 'Dirección', NULL)
        )
      END AS campos_faltantes
    FROM usuarios u
    LEFT JOIN usuario_datos_personales udp ON u.id = udp.usuario_id
    ORDER BY 
      datos_completos ASC,
      u.rol,
      u.id
  `;
  
  const users = await db.query(query, [], { tag: 'user.listIncompletos' });
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
  
  // Información del usuario que genera el reporte
  const generadoPor = req.user?.nombre || req.user?.email || 'Usuario del sistema';
  const rolGenerador = req.user?.rol || 'Administrador';
  
  doc.fontSize(9).font('Helvetica')
     .text(`Fecha de emisión: ${fecha}`, 50, logoY + 145)
     .text(`Hora: ${hora}`, 50, logoY + 160)
     .text(`Total de usuarios: ${users.length}`, 50, logoY + 175);
  
  doc.fontSize(8).font('Helvetica-Oblique').fillColor('#555555')
     .text(`Generado por: ${generadoPor} (${rolGenerador})`, 50, logoY + 190);
  
  doc.fillColor('#000000');

  // Línea separadora antes de la tabla
  doc.moveTo(50, logoY + 205).lineTo(545, logoY + 205).stroke();

  // Tabla de usuarios
  const tableTop = logoY + 220;
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
    // La fecha_inscripcion se establece automáticamente con DEFAULT CURRENT_TIMESTAMP
    const result = await db.query(
      'INSERT INTO usuarios (nombre, email, password, rol, fecha_inscripcion) VALUES (?, ?, ?, ?, NOW())',
      [nombre, email, hash, rol],
      { tag: 'user.create.insert' },
    );
    res.status(201).json({ 
      id: result.insertId, 
      nombre, 
      email, 
      rol,
      fecha_inscripcion: new Date()
    });
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

// Handler para obtener datos completos del usuario según su rol
const getDatosCompletosHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // Obtener datos básicos del usuario
    const usuarios = await db.query(
      `SELECT u.id, u.nombre, u.email, u.rol, u.activo, u.fecha_creacion_cuenta as created_at,
              u.codigo_estudiante, u.codigo_docente, u.codigo_admin,
              u.fecha_nacimiento, u.genero, u.nacionalidad, u.estado_civil,
              u.foto_perfil, u.documento_identidad, u.tipo_documento,
              u.fecha_inscripcion,
              CASE WHEN u.foto_perfil_imagen IS NOT NULL THEN 1 ELSE 0 END as tiene_foto_perfil,
              udp.dni, udp.edad, udp.telefono, udp.direccion
       FROM usuarios u
       LEFT JOIN usuario_datos_personales udp ON u.id = udp.usuario_id
       WHERE u.id = ?`,
      [id],
      { tag: 'user.getDatosCompletos.basico' }
    );

    const usuario = usuarios[0];
    
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const resultado = {
      basicos: usuario,
      estudiante: null,
      docente: null,
      admin: null,
      cursos: [],
      modulos: []
    };

    // Función auxiliar para verificar si una tabla existe y hacer query
    const safeQuery = async (query, params, tag) => {
      try {
        return await db.query(query, params, { tag });
      } catch (error) {
        // Si la tabla no existe, retornar array vacío o null
        if (error.code === 'ER_NO_SUCH_TABLE' || error.errno === 1146) {
          logger.warn({ error: error.message, query, tag }, 'Tabla no existe');
          return [];
        }
        throw error;
      }
    };

  // Obtener datos según el rol
  if (usuario.rol === 'estudiante') {
    // Datos de estudiante
    const datosEstudiante = await safeQuery(
      'SELECT * FROM estudiante_datos WHERE usuario_id = ?',
      [id],
      'user.getDatosCompletos.estudiante'
    );
    resultado.estudiante = datosEstudiante[0] || null;

    // Cursos del estudiante
    const cursosEstudiante = await safeQuery(
      `SELECT * FROM estudiante_cursos 
       WHERE estudiante_id = ? 
       ORDER BY ciclo_academico DESC, curso_nombre`,
      [id],
      'user.getDatosCompletos.cursosEstudiante'
    );
    resultado.cursos = cursosEstudiante;

  } else if (usuario.rol === 'profesor' || usuario.rol === 'docente') {
    // Datos de docente
    const datosDocente = await safeQuery(
      'SELECT * FROM docente_datos WHERE usuario_id = ?',
      [id],
      'user.getDatosCompletos.docente'
    );
    resultado.docente = datosDocente[0] || null;

    // Cursos del docente
    const cursosDocente = await safeQuery(
      `SELECT * FROM docente_cursos 
       WHERE docente_id = ? 
       ORDER BY ciclo_academico DESC, curso_nombre`,
      [id],
      'user.getDatosCompletos.cursosDocente'
    );
    resultado.cursos = cursosDocente;

  } else if (usuario.rol === 'admin' || usuario.rol === 'administrativo') {
    // Datos de administrador
    const datosAdmin = await safeQuery(
      'SELECT * FROM admin_datos WHERE usuario_id = ?',
      [id],
      'user.getDatosCompletos.admin'
    );
    resultado.admin = datosAdmin[0] || null;

    // Módulos del administrador
    const modulosAdmin = await safeQuery(
      `SELECT * FROM admin_modulos 
       WHERE admin_id = ? 
       ORDER BY modulo_nombre`,
      [id],
      'user.getDatosCompletos.modulosAdmin'
    );
    resultado.modulos = modulosAdmin;
  }

  res.json(resultado);
  } catch (error) {
    logger.error({ err: error, userId: id }, 'Error al obtener datos completos');
    res.status(500).json({ error: 'Error al obtener datos completos del usuario' });
  }
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
app.get('/usuarios/incompletos', ensureAdmin, listUsersIncompletosHandler);
// Allow authenticated users to view their own complete data, admins can view any user
app.get('/usuarios/:id/datos-completos', ensureAuthenticated, validateUserParams, async (req, res, next) => {
  const targetId = Number(req.params.id);
  // Allow if admin or viewing own data
  if (isAdmin(req.user) || req.user.id === targetId) {
    return next();
  }
  return res.status(403).json({ error: 'No autorizado para ver estos datos' });
}, getDatosCompletosHandler);
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

/* ===================== Gestión de Estado y Permisos ===================== */

// Endpoint para activar un usuario (solo admin)
app.put(
  '/usuarios/:id/activar',
  ensureAdmin,
  validateUserParams,
  async (req, res) => {
    const { id } = req.params;
    const adminId = req.user?.id;
    
    try {
      // Obtener estado actual
      const [usuario] = await db.query('SELECT activo FROM usuarios WHERE id = ?', [id]);
      
      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      if (usuario.activo) {
        return res.status(400).json({ error: 'El usuario ya está activo' });
      }
      
      // Activar usuario
      await db.query('UPDATE usuarios SET activo = TRUE WHERE id = ?', [id]);
      
      // Registrar en el log
      await db.query(
        'INSERT INTO usuarios_estado_log (usuario_id, estado_anterior, estado_nuevo, modificado_por, motivo) VALUES (?, ?, ?, ?, ?)',
        [id, false, true, adminId, 'Usuario activado por administrador']
      );
      
      logger.info({ userId: id, adminId }, 'Usuario activado');
      res.json({ message: 'Usuario activado correctamente', activo: true });
    } catch (error) {
      logger.error({ error: error.message, userId: id }, 'Error al activar usuario');
      res.status(500).json({ error: 'Error al activar usuario' });
    }
  },
);

// Endpoint para desactivar un usuario (solo admin)
app.put(
  '/usuarios/:id/desactivar',
  ensureAdmin,
  validateUserParams,
  validateDesactivar,
  async (req, res) => {
    const { id } = req.params;
    const { motivo } = req.body;
    const adminId = req.user?.id;
    
    try {
      // Obtener estado actual y verificar que no sea el mismo admin
      const [usuario] = await db.query('SELECT id, activo, rol FROM usuarios WHERE id = ?', [id]);
      
      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      // No permitir que un admin se desactive a sí mismo
      if (usuario.id === adminId) {
        return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
      }
      
      if (!usuario.activo) {
        return res.status(400).json({ error: 'El usuario ya está desactivado' });
      }
      
      // Desactivar usuario
      await db.query('UPDATE usuarios SET activo = FALSE WHERE id = ?', [id]);
      
      // Registrar en el log
      await db.query(
        'INSERT INTO usuarios_estado_log (usuario_id, estado_anterior, estado_nuevo, modificado_por, motivo) VALUES (?, ?, ?, ?, ?)',
        [id, true, false, adminId, motivo || 'Usuario desactivado por administrador']
      );
      
      logger.info({ userId: id, adminId, motivo }, 'Usuario desactivado');
      res.json({ message: 'Usuario desactivado correctamente', activo: false });
    } catch (error) {
      logger.error({ error: error.message, userId: id }, 'Error al desactivar usuario');
      res.status(500).json({ error: 'Error al desactivar usuario' });
    }
  },
);

// Endpoint para obtener permisos de un rol
app.get(
  '/permisos/:rol',
  ensureAuthenticated,
  async (req, res) => {
    const { rol } = req.params;
    
    try {
      const permisos = await db.query(
        'SELECT * FROM permisos_rol WHERE rol = ? ORDER BY modulo',
        [rol]
      );
      
      res.json({ rol, permisos });
    } catch (error) {
      logger.error({ error: error.message, rol }, 'Error al obtener permisos');
      res.status(500).json({ error: 'Error al obtener permisos' });
    }
  },
);

// Endpoint para obtener todos los permisos (solo admin)
app.get(
  '/permisos',
  ensureAdmin,
  async (req, res) => {
    try {
      const permisos = await db.query(
        'SELECT * FROM permisos_rol ORDER BY rol, modulo'
      );
      
      // Agrupar por rol
      const permisosPorRol = {};
      permisos.forEach(p => {
        if (!permisosPorRol[p.rol]) {
          permisosPorRol[p.rol] = [];
        }
        permisosPorRol[p.rol].push(p);
      });
      
      res.json({ permisos: permisosPorRol });
    } catch (error) {
      logger.error({ error: error.message }, 'Error al obtener permisos');
      res.status(500).json({ error: 'Error al obtener permisos' });
    }
  },
);

// Endpoint para actualizar permisos de un rol (solo admin)
app.put(
  '/permisos/:rol/:modulo',
  ensureAdmin,
  validateRolModulo,
  validateActualizarPermiso,
  async (req, res) => {
    const { rol, modulo } = req.params;
    const { puede_ver, puede_crear, puede_editar, puede_eliminar, descripcion } = req.body;
    
    try {
      // Construir query dinámicamente solo con los campos proporcionados
      const updates = [];
      const values = [];
      
      if (puede_ver !== undefined) {
        updates.push('puede_ver = ?');
        values.push(puede_ver);
      }
      if (puede_crear !== undefined) {
        updates.push('puede_crear = ?');
        values.push(puede_crear);
      }
      if (puede_editar !== undefined) {
        updates.push('puede_editar = ?');
        values.push(puede_editar);
      }
      if (puede_eliminar !== undefined) {
        updates.push('puede_eliminar = ?');
        values.push(puede_eliminar);
      }
      if (descripcion !== undefined) {
        updates.push('descripcion = ?');
        values.push(descripcion);
      }
      
      if (updates.length === 0) {
        return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
      }
      
      values.push(rol, modulo);
      
      const result = await db.query(
        `UPDATE permisos_rol SET ${updates.join(', ')} WHERE rol = ? AND modulo = ?`,
        values
      );

      if (result.affectedRows === 0) {
        const existe = await db.query(
          'SELECT 1 FROM permisos_rol WHERE rol = ? AND modulo = ? LIMIT 1',
          [rol, modulo]
        );

        if (existe.length === 0) {
          const insertValores = {
            puede_ver: puede_ver ?? false,
            puede_crear: puede_crear ?? false,
            puede_editar: puede_editar ?? false,
            puede_eliminar: puede_eliminar ?? false,
            descripcion: descripcion ?? '',
          };

          await db.query(
            `INSERT INTO permisos_rol (rol, modulo, puede_ver, puede_crear, puede_editar, puede_eliminar, descripcion)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              rol,
              modulo,
              insertValores.puede_ver ? 1 : 0,
              insertValores.puede_crear ? 1 : 0,
              insertValores.puede_editar ? 1 : 0,
              insertValores.puede_eliminar ? 1 : 0,
              insertValores.descripcion,
            ]
          );

          logger.info({ rol, modulo, adminId: req.user?.id }, 'Permiso creado');
          return res.status(201).json({ message: 'Permiso creado correctamente' });
        }

        return res.status(404).json({ error: 'Permiso no encontrado' });
      }
      
      logger.info({ rol, modulo, adminId: req.user?.id }, 'Permisos actualizados');
      res.json({ message: 'Permisos actualizados correctamente' });
    } catch (error) {
      logger.error({ error: error.message, rol, modulo }, 'Error al actualizar permisos');
      res.status(500).json({ error: 'Error al actualizar permisos' });
    }
  },
);

// Endpoint para obtener historial de cambios de estado de un usuario (solo admin)
app.get(
  '/usuarios/:id/historial-estado',
  ensureAdmin,
  validateUserParams,
  async (req, res) => {
    const { id } = req.params;
    
    try {
      const historial = await db.query(
        `SELECT l.*, u.nombre as modificado_por_nombre 
         FROM usuarios_estado_log l
         LEFT JOIN usuarios u ON l.modificado_por = u.id
         WHERE l.usuario_id = ?
         ORDER BY l.created_at DESC`,
        [id]
      );
      
      res.json({ historial });
    } catch (error) {
      logger.error({ error: error.message, userId: id }, 'Error al obtener historial');
      res.status(500).json({ error: 'Error al obtener historial' });
    }
  },
);

// Endpoint para completar/actualizar datos de usuario (admin o el mismo usuario)
app.put(
  '/usuarios/:id/completar-datos',
  ensureAuthenticated,
  validateUserParams,
  async (req, res) => {
    const { id } = req.params;
    const { datos_personales, datos_estudiante, datos_docente, datos_admin } = req.body;
    
    try {
      // Verificar que sea admin o el mismo usuario
      const targetId = parseInt(id);
      if (!isAdmin(req.user) && req.user.id !== targetId) {
        return res.status(403).json({ error: 'No autorizado para modificar estos datos' });
      }

      // Obtener datos del usuario
      const usuario = await db.query('SELECT * FROM usuarios WHERE id = ?', [id]);
      if (!usuario || usuario.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const rolUsuario = usuario[0].rol;

      // Actualizar datos personales en tabla usuarios
      if (datos_personales) {
        const camposActualizar = [];
        const valoresActualizar = [];

        if (datos_personales.fecha_nacimiento) {
          camposActualizar.push('fecha_nacimiento = ?');
          valoresActualizar.push(datos_personales.fecha_nacimiento);
        }
        if (datos_personales.genero) {
          camposActualizar.push('genero = ?');
          valoresActualizar.push(datos_personales.genero);
        }
        if (datos_personales.nacionalidad) {
          camposActualizar.push('nacionalidad = ?');
          valoresActualizar.push(datos_personales.nacionalidad);
        }
        if (datos_personales.estado_civil) {
          camposActualizar.push('estado_civil = ?');
          valoresActualizar.push(datos_personales.estado_civil);
        }
        if (datos_personales.documento_identidad) {
          camposActualizar.push('documento_identidad = ?');
          valoresActualizar.push(datos_personales.documento_identidad);
        }
        if (datos_personales.tipo_documento) {
          camposActualizar.push('tipo_documento = ?');
          valoresActualizar.push(datos_personales.tipo_documento);
        }
        if (datos_personales.telefono !== undefined) {
          camposActualizar.push('telefono = ?');
          valoresActualizar.push(datos_personales.telefono);
        }
        if (datos_personales.foto_perfil !== undefined) {
          camposActualizar.push('foto_perfil = ?');
          valoresActualizar.push(datos_personales.foto_perfil);
        }

        if (camposActualizar.length > 0) {
          camposActualizar.push('ultima_actualizacion = CURRENT_TIMESTAMP');
          valoresActualizar.push(id);
          
          await db.query(
            `UPDATE usuarios SET ${camposActualizar.join(', ')} WHERE id = ?`,
            valoresActualizar
          );
        }
      }

      // Actualizar datos específicos según rol
      if (rolUsuario === 'estudiante' && datos_estudiante) {
        // Verificar si ya existe registro
        const existeEstudiante = await db.query(
          'SELECT id FROM estudiante_datos WHERE usuario_id = ?',
          [id]
        );

        const camposEstudiante = [];
        const valoresEstudiante = [];

        if (datos_estudiante.matricula) {
          camposEstudiante.push('matricula = ?');
          valoresEstudiante.push(datos_estudiante.matricula);
        }
        if (datos_estudiante.grado) {
          camposEstudiante.push('grado = ?');
          valoresEstudiante.push(datos_estudiante.grado);
        }
        if (datos_estudiante.seccion) {
          camposEstudiante.push('seccion = ?');
          valoresEstudiante.push(datos_estudiante.seccion);
        }
        if (datos_estudiante.turno) {
          camposEstudiante.push('turno = ?');
          valoresEstudiante.push(datos_estudiante.turno);
        }
        if (datos_estudiante.modalidad) {
          camposEstudiante.push('modalidad = ?');
          valoresEstudiante.push(datos_estudiante.modalidad);
        }
        if (datos_estudiante.condicion_academica) {
          camposEstudiante.push('condicion_academica = ?');
          valoresEstudiante.push(datos_estudiante.condicion_academica);
        }
        if (datos_estudiante.becado !== undefined) {
          camposEstudiante.push('becado = ?');
          valoresEstudiante.push(datos_estudiante.becado ? 1 : 0);
        }
        if (datos_estudiante.tipo_beca) {
          camposEstudiante.push('tipo_beca = ?');
          valoresEstudiante.push(datos_estudiante.tipo_beca);
        }
        if (datos_estudiante.porcentaje_beca !== undefined) {
          camposEstudiante.push('porcentaje_beca = ?');
          valoresEstudiante.push(datos_estudiante.porcentaje_beca);
        }
        if (datos_estudiante.tutor_nombre) {
          camposEstudiante.push('tutor_nombre = ?');
          valoresEstudiante.push(datos_estudiante.tutor_nombre);
        }
        if (datos_estudiante.tutor_telefono) {
          camposEstudiante.push('tutor_telefono = ?');
          valoresEstudiante.push(datos_estudiante.tutor_telefono);
        }
        if (datos_estudiante.tutor_email) {
          camposEstudiante.push('tutor_email = ?');
          valoresEstudiante.push(datos_estudiante.tutor_email);
        }
        if (datos_estudiante.observaciones !== undefined) {
          camposEstudiante.push('observaciones = ?');
          valoresEstudiante.push(datos_estudiante.observaciones);
        }

        if (camposEstudiante.length > 0) {
          if (existeEstudiante && existeEstudiante.length > 0) {
            // Actualizar
            camposEstudiante.push('updated_at = CURRENT_TIMESTAMP');
            valoresEstudiante.push(id);
            await db.query(
              `UPDATE estudiante_datos SET ${camposEstudiante.join(', ')} WHERE usuario_id = ?`,
              valoresEstudiante
            );
          } else {
            // Insertar nuevo
            camposEstudiante.push('usuario_id = ?');
            valoresEstudiante.push(id);
            const placeholders = Array(camposEstudiante.length).fill('?').join(', ');
            const campos = camposEstudiante.map(c => c.split(' = ')[0]).join(', ');
            await db.query(
              `INSERT INTO estudiante_datos (${campos}) VALUES (${placeholders})`,
              valoresEstudiante
            );
          }
        }
      }

      if ((rolUsuario === 'docente' || rolUsuario === 'profesor') && datos_docente) {
        // Verificar si ya existe registro
        const existeDocente = await db.query(
          'SELECT id FROM docente_datos WHERE docente_id = ?',
          [id]
        );

        // Obtener la fecha de creación del usuario para usar como fecha_ingreso
        const [usuarioInfo] = await db.query(
          'SELECT created_at FROM usuarios WHERE id = ?',
          [id]
        );

        const camposDocente = [];
        const valoresDocente = [];

        if (datos_docente.especialidad) {
          camposDocente.push('especialidad = ?');
          valoresDocente.push(datos_docente.especialidad);
        }
        if (datos_docente.nivel_academico) {
          camposDocente.push('nivel_academico = ?');
          valoresDocente.push(datos_docente.nivel_academico);
        }
        if (datos_docente.titulo_profesional) {
          camposDocente.push('titulo_profesional = ?');
          valoresDocente.push(datos_docente.titulo_profesional);
        }
        if (datos_docente.universidad_egreso) {
          camposDocente.push('universidad_egreso = ?');
          valoresDocente.push(datos_docente.universidad_egreso);
        }
        if (datos_docente.numero_colegiatura) {
          camposDocente.push('numero_colegiatura = ?');
          valoresDocente.push(datos_docente.numero_colegiatura);
        }
        if (datos_docente.carga_horaria_semanal !== undefined) {
          camposDocente.push('carga_horaria_semanal = ?');
          valoresDocente.push(datos_docente.carga_horaria_semanal);
        }
        
        // Siempre guardar fecha_ingreso (usar fecha de creación de cuenta si no existe)
        if (!existeDocente || existeDocente.length === 0) {
          // Solo al insertar por primera vez, usar fecha de creación
          camposDocente.push('fecha_ingreso = ?');
          valoresDocente.push(usuarioInfo?.created_at || new Date());
        } else if (datos_docente.fecha_ingreso) {
          // Si ya existe y se envía una fecha, actualizarla
          camposDocente.push('fecha_ingreso = ?');
          valoresDocente.push(datos_docente.fecha_ingreso);
        }
        
        if (datos_docente.areas_investigacion) {
          camposDocente.push('areas_investigacion = ?');
          valoresDocente.push(datos_docente.areas_investigacion);
        }
        if (datos_docente.idiomas_domina) {
          camposDocente.push('idiomas_domina = ?');
          valoresDocente.push(datos_docente.idiomas_domina);
        }
        if (datos_docente.nivel_ingles) {
          camposDocente.push('nivel_ingles = ?');
          valoresDocente.push(datos_docente.nivel_ingles);
        }
        if (datos_docente.disponibilidad_horaria) {
          camposDocente.push('disponibilidad_horaria = ?');
          valoresDocente.push(datos_docente.disponibilidad_horaria);
        }
        if (datos_docente.observaciones !== undefined) {
          camposDocente.push('observaciones = ?');
          valoresDocente.push(datos_docente.observaciones);
        }

        if (camposDocente.length > 0) {
          if (existeDocente && existeDocente.length > 0) {
            // Actualizar
            valoresDocente.push(id);
            await db.query(
              `UPDATE docente_datos SET ${camposDocente.join(', ')} WHERE docente_id = ?`,
              valoresDocente
            );
          } else {
            // Insertar nuevo
            camposDocente.push('docente_id = ?');
            valoresDocente.push(id);
            const placeholders = Array(camposDocente.length).fill('?').join(', ');
            const campos = camposDocente.map(c => c.split(' = ')[0]).join(', ');
            await db.query(
              `INSERT INTO docente_datos (${campos}) VALUES (${placeholders})`,
              valoresDocente
            );
          }
        }
      }

      if ((rolUsuario === 'admin' || rolUsuario === 'administrativo') && datos_admin) {
        // Verificar si ya existe registro
        const existeAdmin = await db.query(
          'SELECT id FROM admin_datos WHERE admin_id = ?',
          [id]
        );

        const camposAdmin = [];
        const valoresAdmin = [];

        if (datos_admin.cargo) {
          camposAdmin.push('cargo = ?');
          valoresAdmin.push(datos_admin.cargo);
        }
        if (datos_admin.nivel_acceso) {
          camposAdmin.push('nivel_acceso = ?');
          valoresAdmin.push(datos_admin.nivel_acceso);
        }
        if (datos_admin.area_responsabilidad) {
          camposAdmin.push('area_responsabilidad = ?');
          valoresAdmin.push(datos_admin.area_responsabilidad);
        }
        if (datos_admin.extension_telefonica) {
          camposAdmin.push('extension_telefonica = ?');
          valoresAdmin.push(datos_admin.extension_telefonica);
        }
        if (datos_admin.horario_atencion) {
          camposAdmin.push('horario_atencion = ?');
          valoresAdmin.push(datos_admin.horario_atencion);
        }
        if (datos_admin.ubicacion_oficina) {
          camposAdmin.push('ubicacion_oficina = ?');
          valoresAdmin.push(datos_admin.ubicacion_oficina);
        }
        if (datos_admin.observaciones !== undefined) {
          camposAdmin.push('observaciones = ?');
          valoresAdmin.push(datos_admin.observaciones);
        }

        if (camposAdmin.length > 0) {
          if (existeAdmin && existeAdmin.length > 0) {
            // Actualizar
            valoresAdmin.push(id);
            await db.query(
              `UPDATE admin_datos SET ${camposAdmin.join(', ')} WHERE admin_id = ?`,
              valoresAdmin
            );
          } else {
            // Insertar nuevo
            camposAdmin.push('admin_id = ?');
            valoresAdmin.push(id);
            const placeholders = Array(camposAdmin.length).fill('?').join(', ');
            const campos = camposAdmin.map(c => c.split(' = ')[0]).join(', ');
            await db.query(
              `INSERT INTO admin_datos (${campos}) VALUES (${placeholders})`,
              valoresAdmin
            );
          }
        }
      }

      logger.info({ userId: id, rol: rolUsuario }, 'Datos de usuario completados/actualizados');
      res.json({ 
        message: 'Datos actualizados correctamente',
        usuario_id: id 
      });

    } catch (error) {
      logger.error({ error: error.message, userId: id }, 'Error al completar datos');
      res.status(500).json({ error: 'Error al actualizar los datos del usuario' });
    }
  },
);

// Endpoint para consultar DNI en API de dni.net
app.get(
  '/usuarios/consultar-dni/:dni',
  ensureAuthenticated,
  async (req, res) => {
    const { dni } = req.params;
    
    try {
      // Validar formato de DNI (8 dígitos)
      if (!/^\d{8}$/.test(dni)) {
        return res.status(400).json({ error: 'DNI debe tener 8 dígitos' });
      }

      // API Key de dniruc.apisperu.com
      const API_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImFudGhnZzE3QGdtYWlsLmNvbSJ9.y7WdAHKUUVWmubqX1pgTZTwaV9hhnsaGLb-ZcQpZVEY';
      
      // Consultar API de dniruc.apisperu.com
      const https = require('https');
      const options = {
        hostname: 'dniruc.apisperu.com',
        port: 443,
        path: `/api/v1/dni/${dni}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      };

      const apiRequest = https.request(options, (apiRes) => {
        let data = '';

        apiRes.on('data', (chunk) => {
          data += chunk;
        });

        apiRes.on('end', () => {
          try {
            // Log raw response for debugging
            logger.info({ dni, statusCode: apiRes.statusCode, rawData: data.substring(0, 200) }, 'Respuesta de API DNI');
            
            const resultado = JSON.parse(data);
            
            if (apiRes.statusCode === 200 && resultado && resultado.success) {
              // Respuesta exitosa de dniruc.apisperu.com
              // Formato: { success: true, dni: "...", nombres: "...", apellidoPaterno: "...", apellidoMaterno: "..." }
              logger.info({ dni, data: resultado }, 'DNI consultado exitosamente');
              
              const nombreCompleto = `${resultado.nombres || ''} ${resultado.apellidoPaterno || ''} ${resultado.apellidoMaterno || ''}`.trim();
              
              res.json({
                success: true,
                nombres: resultado.nombres || '',
                apellido_paterno: resultado.apellidoPaterno || '',
                apellido_materno: resultado.apellidoMaterno || '',
                nombre_completo: nombreCompleto,
                dni: resultado.dni || dni,
                verificado: true
              });
            } else if (apiRes.statusCode === 401 || apiRes.statusCode === 403) {
              // Error de autenticación
              logger.error({ dni, status: apiRes.statusCode, data }, 'API Key inválido o vencido');
              res.status(500).json({ 
                error: 'Error de configuración del servicio de verificación. Contacte al administrador.',
                success: false 
              });
            } else if (apiRes.statusCode === 404) {
              // DNI no encontrado
              logger.warn({ dni, status: apiRes.statusCode, data }, 'DNI no encontrado');
              res.status(404).json({ 
                error: 'DNI no encontrado en RENIEC',
                success: false 
              });
            } else {
              // Otros errores
              logger.warn({ dni, status: apiRes.statusCode, data }, 'Error al consultar DNI');
              res.status(500).json({ 
                error: resultado.message || 'Error al consultar DNI',
                success: false 
              });
            }
          } catch (parseError) {
            logger.error({ error: parseError.message, dni, rawData: data }, 'Error al parsear respuesta de API');
            res.status(500).json({ error: 'Error al procesar respuesta de la API' });
          }
        });
      });

      apiRequest.on('error', (error) => {
        logger.error({ error: error.message, dni }, 'Error en conexión con API de DNI');
        res.status(500).json({ error: 'Error al conectar con el servicio de consulta de DNI' });
      });

      apiRequest.end();

    } catch (error) {
      logger.error({ error: error.message, dni }, 'Error al consultar DNI');
      res.status(500).json({ error: 'Error al consultar DNI' });
    }
  },
);

/* ===================== Gestión de Fotos de Perfil ===================== */

// Endpoint para subir foto de perfil (el usuario o admin)
app.post(
  '/usuarios/:id/foto-perfil',
  ensureAuthenticated,
  validateUserParams,
  async (req, res) => {
    const { id } = req.params;
    const targetId = parseInt(id);

    try {
      // Verificar permisos: admin o el mismo usuario
      if (!isAdmin(req.user) && req.user.id !== targetId) {
        return res.status(403).json({ error: 'No autorizado para modificar la foto de este usuario' });
      }

      // Verificar que hay datos en el body
      if (!req.body.foto || !req.body.tipo) {
        return res.status(400).json({ error: 'Se requiere foto (base64) y tipo MIME' });
      }

      const { foto, tipo } = req.body;

      // Validar tipo MIME
      const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!tiposPermitidos.includes(tipo.toLowerCase())) {
        return res.status(400).json({ 
          error: 'Tipo de imagen no permitido. Use JPEG, PNG, GIF o WebP' 
        });
      }

      // Convertir base64 a Buffer
      const imagenBuffer = Buffer.from(foto, 'base64');

      // Verificar tamaño (máximo 5MB)
      if (imagenBuffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'La imagen es muy grande. Máximo 5MB' });
      }

      // Guardar en la base de datos
      await db.query(
        'UPDATE usuarios SET foto_perfil_imagen = ?, foto_perfil_tipo = ? WHERE id = ?',
        [imagenBuffer, tipo, targetId],
        { tag: 'user.updateFotoPerfil' }
      );

      res.json({ 
        message: 'Foto de perfil actualizada correctamente',
        tipo: tipo,
        tamano: imagenBuffer.length
      });

    } catch (error) {
      logger.error({ error: error.message, userId: id }, 'Error al actualizar foto de perfil');
      res.status(500).json({ error: 'Error al guardar la foto de perfil' });
    }
  }
);

// Endpoint para obtener foto de perfil
app.get(
  '/usuarios/:id/foto-perfil',
  async (req, res) => {
    const { id } = req.params;

    try {
      const [usuario] = await db.query(
        'SELECT foto_perfil_imagen, foto_perfil_tipo FROM usuarios WHERE id = ?',
        [id],
        { tag: 'user.getFotoPerfil' }
      );

      if (!usuario || !usuario.foto_perfil_imagen) {
        return res.status(404).json({ error: 'Foto de perfil no encontrada' });
      }

      // Establecer tipo de contenido
      res.setHeader('Content-Type', usuario.foto_perfil_tipo || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache por 24 horas
      
      // Enviar la imagen
      res.send(usuario.foto_perfil_imagen);

    } catch (error) {
      logger.error({ error: error.message, userId: id }, 'Error al obtener foto de perfil');
      res.status(500).json({ error: 'Error al obtener la foto de perfil' });
    }
  }
);

// Endpoint para eliminar foto de perfil
app.delete(
  '/usuarios/:id/foto-perfil',
  ensureAuthenticated,
  validateUserParams,
  async (req, res) => {
    const { id } = req.params;
    const targetId = parseInt(id);

    try {
      // Verificar permisos: admin o el mismo usuario
      if (!isAdmin(req.user) && req.user.id !== targetId) {
        return res.status(403).json({ error: 'No autorizado para eliminar la foto de este usuario' });
      }

      await db.query(
        'UPDATE usuarios SET foto_perfil_imagen = NULL, foto_perfil_tipo = NULL WHERE id = ?',
        [targetId],
        { tag: 'user.deleteFotoPerfil' }
      );

      res.json({ message: 'Foto de perfil eliminada correctamente' });

    } catch (error) {
      logger.error({ error: error.message, userId: id }, 'Error al eliminar foto de perfil');
      res.status(500).json({ error: 'Error al eliminar la foto de perfil' });
    }
  }
);

app.use(errorHandler(logger));

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'User Service en ejecución');
});
