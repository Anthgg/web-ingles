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

// Initialize DB connection
db.configure(config.dbPoolConfig());

const logger = createLogger({ name: 'user-service' });

// Helper to wrap async route handlers and forward errors
const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

// MySQL suele lanzar ER_BAD_FIELD_ERROR (1054) cuando falta una columna
const isBadFieldError = (error) =>
  error?.code === 'ER_BAD_FIELD_ERROR' ||
  error?.errno === 1054 ||
  error?.details?.driverCode === 'ER_BAD_FIELD_ERROR' ||
  error?.details?.driverCode === 1054 ||
  error?.details?.code === 'DB_ERROR' ||
  (typeof error?.message === 'string' &&
    (error.message.includes('ER_BAD_FIELD_ERROR') ||
      error.message.includes('Unknown column') ||
      error.message.includes('Error en la base de datos')));

// ER_NO_SUCH_TABLE (1146) indica que la tabla referenciada no existe
const isMissingTableError = (error) =>
  error?.code === 'ER_NO_SUCH_TABLE' ||
  error?.errno === 1146 ||
  error?.details?.driverCode === 'ER_NO_SUCH_TABLE' ||
  error?.details?.driverCode === 1146;

const DOCENTE_ALLOWED_FIELDS = new Set([
  'carga_horaria_semanal',
  'titulo_profesional',
  'universidad_egreso',
  'numero_colegiatura',
  'areas_investigacion',
  'publicaciones',
  'idiomas_domina',
  'nivel_ingles',
  'disponibilidad_horaria',
  'observaciones',
]);

// Schema para login
const loginSchema = z.object({
  email: z.string().email('Email requerido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

app.use(
  cors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true,
  }),
);
app.use(express.json());
app.use(httpLogger({ logger }));

// Ejecutar backfill de códigos una vez al iniciar el servicio (no bloqueante)
setTimeout(() => {
  backfillCodigosUsuarios().catch((err) =>
    logger.warn({ err }, 'Fallo backfill inicial de códigos'),
  );
}, 500);


let cachedJwtSecret;
const resolveJwtSecret = () => {
  // Aquí va la lógica para obtener el secreto JWT si es necesario
  return cachedJwtSecret || env.USER_SECRET_KEY || env.JWT_SECRET || '';
};

// Backfill de códigos para usuarios existentes
const backfillCodigosUsuarios = async () => {
  try {
    const resEst = await db.query(
      `UPDATE usuarios
         SET codigo_estudiante = CONCAT('EST-', LPAD(id, 6, '0'))
       WHERE (rol IN ('estudiante', 'alumno'))
         AND (codigo_estudiante IS NULL OR codigo_estudiante = '')`,
      [],
      { tag: 'user.backfill.codigo_estudiante' },
    );
    const resDoc = await db.query(
      `UPDATE usuarios
         SET codigo_docente = CONCAT('DOC-', LPAD(id, 6, '0'))
       WHERE (rol IN ('profesor', 'docente'))
         AND (codigo_docente IS NULL OR codigo_docente = '')`,
      [],
      { tag: 'user.backfill.codigo_docente' },
    );
    const resAdm = await db.query(
      `UPDATE usuarios
         SET codigo_admin = CONCAT('ADM-', LPAD(id, 6, '0'))
       WHERE (rol IN ('admin', 'administrativo'))
         AND (codigo_admin IS NULL OR codigo_admin = '')`,
      [],
      { tag: 'user.backfill.codigo_admin' },
    );

    logger.info(
      {
        estudiantes: resEst?.affectedRows ?? 0,
        docentes: resDoc?.affectedRows ?? 0,
        admins: resAdm?.affectedRows ?? 0,
      },
      'Backfill de códigos de usuario completado',
    );
  } catch (error) {
    logger.warn({ err: error }, 'No se pudieron rellenar códigos faltantes (¿faltan columnas?)');
  }
};


const createUserSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  email: z.string().email('Email requerido'),
  rol: z.string().min(1, 'Rol requerido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

const updateUserSchema = z
  .object({
    nombre: z.string().min(1, 'Nombre requerido').optional(),
    rol: z.string().min(1, 'Rol requerido').optional(),
    email: z.string().email('Email inválido').optional(),
    password: z.preprocess(
      (val) => {
        if (typeof val !== 'string') return val;
        const trimmed = val.trim();
        // Algunos navegadores rellenan inputs password con puntos/bullets (••••) solo visuales; los ignoramos
        const maskedLike = /^[.•*]+$/;
        if (trimmed === '' || maskedLike.test(trimmed)) return undefined;
        return trimmed;
      },
      z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
    ),
    activo: z.coerce.boolean().optional(),
    estudiante: z.any().optional(),
    datos_estudiante: z.any().optional(),
    nivel: z.string().optional(),
    grado: z.string().optional(),
    seccion: z.string().optional(),
    matricula: z.string().optional(),
  })
  .passthrough()
  .refine(
    (data) =>
      data.nombre !== undefined ||
      data.rol !== undefined ||
      data.email !== undefined ||
      data.password !== undefined ||
      data.activo !== undefined ||
      data.estudiante !== undefined ||
      data.datos_estudiante !== undefined ||
      data.nivel !== undefined ||
      data.grado !== undefined ||
      data.seccion !== undefined ||
      data.matricula !== undefined,
    { message: 'Sin campos para actualizar' },
  );

const userIdSchema = z.object({
  id: z.coerce.number().int().positive('Id invÃƒÂ¡lido'),
});

const personalDataSchema = z.object({
  usuario_id: z.coerce.number().int().positive('Id de usuario invÃƒÂ¡lido').optional(),
  dni: z.string().min(8, 'DNI invÃƒÂ¡lido').max(20),
  edad: z.coerce.number().int().min(0, 'Edad invÃƒÂ¡lida').max(120, 'Edad invÃƒÂ¡lida'),
  telefono: z.string().min(5, 'TelÃƒÂ©fono invÃƒÂ¡lido').max(30),
  email: z.string().email('Email invÃƒÂ¡lido'),
  direccion: z.string().max(255, 'DirecciÃƒÂ³n muy larga').optional().nullable(),
});

// Schemas para activaciÃƒÂ³n/desactivaciÃƒÂ³n de usuarios
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

const SECRET_KEY = env.USER_SECRET_KEY || env.JWT_SECRET || '';
const ensureAuthenticated = rbac([], { jwtSecret: SECRET_KEY });
const ensureAdmin = rbac(['administrativo', 'admin'], { jwtSecret: SECRET_KEY });
const isAdmin = (user) => (user?.rol === 'administrativo' || user?.rol === 'admin');
const validateUserParams = validator(userIdSchema, { target: 'params' });
const validateCreateUser = validator(createUserSchema);
const validateUpdateUser = validator(updateUserSchema, {
  onError: ({ issues }, req, res) => {
    logger.warn({ requestId: req.id, issues }, 'Validacion de update usuario fallo');
    return res.status(400).json({
      status: 400,
      message: 'Validation failed',
      requestId: req.id,
      details: issues,
    });
  },
});
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
    return res.status(401).json({ error: 'ContraseÃƒÂ±a incorrecta' });
  }

  const token = jwt.sign({ id: user.id, rol: user.rol, nombre: user.nombre }, SECRET_KEY, { expiresIn: '1h' });
  res.json({ token, rol: user.rol, nombre: user.nombre });
}));

const listUsersHandler = asyncHandler(async (req, res) => {
  const fullQuery = `
    SELECT 
      u.id,
      u.nombre,
      u.nombres,
      u.apellido_paterno,
      u.apellido_materno,
      CONCAT_WS(' ', u.nombres, u.apellido_paterno, u.apellido_materno) AS nombre_completo,
      u.email,
      u.rol,
      u.codigo_estudiante,
      u.codigo_docente,
      u.codigo_admin,
      ed.matricula AS matricula_estudiante,
      u.documento_identidad,
      u.tipo_documento,
      u.telefono,
      u.direccion,
      u.departamento,
      u.provincia,
      u.distrito,
      CASE 
        WHEN u.foto_perfil_imagen IS NOT NULL 
          OR (u.foto_perfil IS NOT NULL AND u.foto_perfil <> '') 
        THEN 1 ELSE 0 
      END AS tiene_foto_perfil,
      u.activo,
      u.created_at,
      ed.nivel AS nivel_estudiante,
      ed.grado AS grado_estudiante,
      ed.seccion AS seccion_estudiante
    FROM usuarios u
    LEFT JOIN estudiante_datos ed ON ed.usuario_id = u.id`;

  const fallbackQuery = 'SELECT * FROM usuarios';

  const fetchStudentDataMap = async (ids = []) => {
    if (!Array.isArray(ids) || ids.length === 0) return new Map();
    const placeholders = ids.map(() => '?').join(',');
    try {
      const rows = await db.query(
        `SELECT usuario_id, nivel, grado, seccion, matricula 
           FROM estudiante_datos 
          WHERE usuario_id IN (${placeholders})`,
        ids,
        { tag: 'user.listAll.estudianteDatos' },
      );
      const map = new Map();
      rows.forEach((r) => {
        map.set(Number(r.usuario_id), {
          nivel: r.nivel ?? null,
          grado: r.grado ?? null,
          seccion: r.seccion ?? null,
          matricula: r.matricula ?? null,
        });
      });
      return map;
    } catch (error) {
      logger.warn({ err: error }, 'No se pudo cargar estudiante_datos para la lista de usuarios');
      return new Map();
    }
  };

  try {
    const users = await db.query(fullQuery, [], { tag: 'user.listAll' });
    const ids = users.map((u) => u.id).filter(Boolean);
    const studentMap = await fetchStudentDataMap(ids);
    const enriched = users.map((u) => {
      const est = studentMap.get(Number(u.id)) || {};
      return {
        ...u,
        nivel_estudiante: u.nivel_estudiante ?? est.nivel ?? null,
        grado_estudiante: u.grado_estudiante ?? est.grado ?? null,
        seccion_estudiante: u.seccion_estudiante ?? est.seccion ?? null,
        matricula: u.matricula_estudiante ?? est.matricula ?? null,
      };
    });
    return res.json(enriched);
  } catch (error) {
    if (!isBadFieldError(error)) {
      throw error;
    }
    logger.warn({ err: error }, 'Campos faltantes en usuarios, usando esquema basico');
    const users = await db.query(fallbackQuery, [], { tag: 'user.listAll.basic' });
    const ids = users.map((u) => u.id).filter(Boolean);
    const studentMap = await fetchStudentDataMap(ids);
    const normalized = users.map((u) => {
      const est = studentMap.get(Number(u.id)) || {};
      return {
        ...u,
        nombres: u.nombres ?? null,
        apellido_paterno: u.apellido_paterno ?? null,
        apellido_materno: u.apellido_materno ?? null,
        nombre_completo: u.nombre_completo ?? u.nombre,
        codigo_estudiante: u.codigo_estudiante ?? null,
        codigo_docente: u.codigo_docente ?? null,
        codigo_admin: u.codigo_admin ?? null,
        matricula: u.matricula ?? est.matricula ?? null,

        direccion: u.direccion ?? null,
        departamento: u.departamento ?? null,
        provincia: u.provincia ?? null,
        distrito: u.distrito ?? null,
        tiene_foto_perfil:
          u.tiene_foto_perfil ||
          (u.foto_perfil_imagen ? 1 : 0) ||
          (u.foto_perfil ? 1 : 0) ||
          0,
        nivel_estudiante: u.nivel_estudiante ?? u.nivel ?? est.nivel ?? null,
        grado_estudiante: u.grado_estudiante ?? u.grado ?? est.grado ?? null,
        seccion_estudiante: u.seccion_estudiante ?? u.seccion ?? est.seccion ?? null,
      };
    });
    return res.json(normalized);
  }
});

// Endpoint para todos los usuarios (anteriormente solo incompletos)
const listUsersIncompletosHandler = asyncHandler(async (req, res) => {
  console.log('Hit /usuarios-incompletos');
  const query = `
    SELECT 
      u.id,
      u.nombre,
      COALESCE(u.nombres, u.nombre) AS nombres,
      u.apellido_paterno,
      u.apellido_materno,
      CONCAT_WS(' ', COALESCE(u.nombres, u.nombre), u.apellido_paterno, u.apellido_materno) AS nombre_completo,
      u.email,
      u.rol,
      u.telefono AS telefono,
      u.documento_identidad AS documento_identidad,
      u.tipo_documento,
      u.activo,
      u.created_at,
      u.direccion AS direccion,
      u.departamento,
      u.provincia,
      u.distrito,
      u.codigo_estudiante,
      u.codigo_docente,
      u.codigo_admin,
      CASE 
        WHEN u.foto_perfil_imagen IS NOT NULL 
          OR (u.foto_perfil IS NOT NULL AND u.foto_perfil <> '') 
        THEN 1 ELSE 0 
      END AS tiene_foto_perfil,
      CASE 
        WHEN COALESCE(NULLIF(u.nombres, ''), NULLIF(u.nombre, '')) IS NOT NULL
          AND NULLIF(u.apellido_paterno, '') IS NOT NULL
          AND NULLIF(u.apellido_materno, '') IS NOT NULL
          AND NULLIF(u.documento_identidad, '') IS NOT NULL
          AND NULLIF(u.telefono, '') IS NOT NULL
          AND NULLIF(u.direccion, '') IS NOT NULL
          AND NULLIF(u.departamento, '') IS NOT NULL
          AND NULLIF(u.provincia, '') IS NOT NULL
          AND NULLIF(u.distrito, '') IS NOT NULL
        THEN 1 ELSE 0
      END AS datos_completos,
      CONCAT_WS(', ',
        IF(COALESCE(u.nombres, u.nombre) IS NULL OR COALESCE(u.nombres, u.nombre) = '', 'Nombres', NULL),
        IF(u.apellido_paterno IS NULL OR u.apellido_paterno = '', 'Apellido paterno', NULL),
        IF(u.apellido_materno IS NULL OR u.apellido_materno = '', 'Apellido materno', NULL),
        IF(u.documento_identidad IS NULL OR u.documento_identidad = '', 'Documento', NULL),
        IF(u.telefono IS NULL OR u.telefono = '', 'Telefono', NULL),
        IF(u.direccion IS NULL OR u.direccion = '', 'Direccion', NULL),
        IF(u.departamento IS NULL OR u.departamento = '', 'Departamento', NULL),
        IF(u.provincia IS NULL OR u.provincia = '', 'Provincia', NULL),
        IF(u.distrito IS NULL OR u.distrito = '', 'Distrito', NULL)
      ) AS campos_faltantes
    FROM usuarios u
    ORDER BY 
      u.rol,
      u.id
  `;

  try {
    const users = await db.query(query, [], { tag: 'user.listAll' });
    console.log(`Found ${users.length} users in /usuarios-incompletos`);
    res.json(users);
  } catch (error) {
    if (isBadFieldError(error)) {
      console.warn('Campos faltantes en usuarios (incompletos), usando esquema basico');
      const fallbackQuery = 'SELECT * FROM usuarios';
      const users = await db.query(fallbackQuery, [], { tag: 'user.listAll.basic' });
      const normalized = users.map((u) => {
        const nombres = u.nombres ?? u.nombre ?? null;
        const apellido_paterno = u.apellido_paterno ?? null;
        const apellido_materno = u.apellido_materno ?? null;
        const documento_identidad = u.documento_identidad ?? u.dni_alt ?? null;
        const telefono = u.telefono ?? u.telefono_alt ?? null;
        const direccion = u.direccion ?? u.direccion_alt ?? null;
        const departamento = u.departamento ?? null;
        const provincia = u.provincia ?? null;
        const distrito = u.distrito ?? null;

        const datos_completos =
          !!(nombres &&
             apellido_paterno &&
             apellido_materno &&
             documento_identidad &&
             telefono &&
             direccion &&
             departamento &&
             provincia &&
             distrito);

        const faltantes = [
          nombres ? null : 'Nombres',
          apellido_paterno ? null : 'Apellido paterno',
          apellido_materno ? null : 'Apellido materno',
          documento_identidad ? null : 'Documento',
          telefono ? null : 'Telefono',
          direccion ? null : 'Direccion',
          departamento ? null : 'Departamento',
          provincia ? null : 'Provincia',
          distrito ? null : 'Distrito',
        ].filter(Boolean).join(', ');

        return {
          ...u,
          nombres,
          apellido_paterno,
          apellido_materno,
          nombre_completo: u.nombre_completo ?? u.nombre,
          codigo_estudiante: u.codigo_estudiante ?? null,
          codigo_docente: u.codigo_docente ?? null,
          codigo_admin: u.codigo_admin ?? null,
          direccion,
          departamento,
          provincia,
        distrito,
        telefono,
        documento_identidad,
        tiene_foto_perfil:
          u.tiene_foto_perfil ||
          (u.foto_perfil_imagen ? 1 : 0) ||
          (u.foto_perfil ? 1 : 0) ||
          0,
        datos_completos: datos_completos ? 1 : 0,
        campos_faltantes: faltantes
      };
    });
    return res.json(normalized);
    }
    logger.error({ error: error.message }, 'Error al obtener usuarios');
    res.json([]);
  }
});

// Endpoint para usuarios con datos completos (todos los campos llenos)
const listUsersCompletosHandler = asyncHandler(async (req, res) => {
  console.log('Hit /usuarios/completos');
  const query = `
    SELECT 
      u.id,
      u.nombre,
      u.nombres,
      u.apellido_paterno,
      u.apellido_materno,
      CONCAT_WS(' ', u.nombres, u.apellido_paterno, u.apellido_materno) AS nombre_completo,
      u.email,
      u.rol,
      u.telefono,
      u.documento_identidad,
      u.tipo_documento,
      u.activo,
      u.created_at,
      u.fecha_nacimiento,
      u.genero,
      u.direccion,
      u.departamento,
      u.provincia,
      u.distrito,
      CASE 
        WHEN u.foto_perfil_imagen IS NOT NULL 
          OR (u.foto_perfil IS NOT NULL AND u.foto_perfil <> '') 
        THEN 1 ELSE 0 
      END AS tiene_foto_perfil
    FROM usuarios u
    WHERE 
      COALESCE(NULLIF(u.nombres, ''), NULLIF(u.nombre, '')) IS NOT NULL AND
      NULLIF(u.apellido_paterno, '') IS NOT NULL AND
      NULLIF(u.apellido_materno, '') IS NOT NULL AND
      NULLIF(u.documento_identidad, '') IS NOT NULL AND
      NULLIF(u.telefono, '') IS NOT NULL AND
      NULLIF(u.direccion, '') IS NOT NULL AND
      NULLIF(u.departamento, '') IS NOT NULL AND
      NULLIF(u.provincia, '') IS NOT NULL AND
      NULLIF(u.distrito, '') IS NOT NULL
    ORDER BY 
      u.rol,
      u.id
  `;

  try {
    const users = await db.query(query, [], { tag: 'user.listCompletos' });
    console.log(`Found ${users.length} users in /usuarios/completos`);
    res.json(users);
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener usuarios completos');
    res.json([]);
  }
});

app.get('/usuarios-incompletos', ensureAdmin, listUsersIncompletosHandler);
app.get('/usuarios/completos', ensureAdmin, listUsersCompletosHandler);


const fetchPersonalData = async (userId) => {
  const rows = await db.query(
    `SELECT 
       id AS usuario_id,
       documento_identidad AS dni,
       NULL AS edad,
       telefono,
       email,
       direccion,
       created_at,
       ultima_actualizacion AS updated_at
     FROM usuarios
     WHERE id = ?
     LIMIT 1`,
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
    return res.status(400).json({ error: 'Usuario invalido' });
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

  const campos = [];
  const valores = [];

  if (payload.dni !== undefined) {
    campos.push('documento_identidad = ?');
    valores.push(payload.dni || null);
  }
  if (payload.telefono !== undefined) {
    campos.push('telefono = ?');
    valores.push(payload.telefono || null);
  }
  if (payload.email !== undefined) {
    campos.push('email = ?');
    valores.push(payload.email || null);
  }
  if (payload.direccion !== undefined) {
    campos.push('direccion = ?');
    valores.push(payload.direccion || null);
  }

  if (campos.length === 0) {
    return res.status(400).json({ error: 'Sin campos para actualizar' });
  }

  valores.push(targetUserId);
  await db.query(
    `UPDATE usuarios SET ${campos.join(', ')}, ultima_actualizacion = CURRENT_TIMESTAMP WHERE id = ?`,
    valores,
    { tag: 'user.personalData.updateUsuarios' },
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

  const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
  doc.pipe(res);

  // Encabezado con logo y datos institucionales
  const logoPath = path.join(__dirname, '../../frontend/public/logo.png');
  let logoY = 40;

  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 50, logoY, { width: 100, height: 100 });
  }

  // Datos institucionales (ajustado para no superponerse con el logo)
  doc.fontSize(15).font('Helvetica-Bold')
    .text('I.E. N° 7213 Peruano Japones', 165, logoY + 5);

  doc.fontSize(9).font('Helvetica')
    .text('Codigo Modular: 0874198 | RUC: 20503217032', 165, logoY + 25)
    .text('Nivel: Primaria y Secundaria | Gestion: Publica', 165, logoY + 38)
    .text('UGEL Nº 01 - “ San Juan de Miraflores (Lima Metropolitana)', 165, logoY + 51);

  doc.fontSize(8).font('Helvetica')
    .text('Av. 200 Millas s/n, Urb. Pachacamac (IV Etapa / Sector 1), Villa El Salvador, Lima', 165, logoY + 64)
    .text('Telefono: (01) 293-4417 | Email: japones7213@hotmail.com', 165, logoY + 76);

  // Linea separadora
  doc.moveTo(50, logoY + 105).lineTo(545, logoY + 105).stroke();

  // Titulo del reporte
  doc.fontSize(18).font('Helvetica-Bold')
    .text('REPORTE DE USUARIOS REGISTRADOS', 50, logoY + 120, { align: 'center' });

  // Informacion del reporte
  const now = new Date();
  const fecha = now.toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const hora = now.toLocaleTimeString('es-PE');

  // InformaciÃƒÂ³n del usuario que genera el reporte
  const generadoPor = req.user?.nombre || req.user?.email || 'Usuario del sistema';
  const rolGenerador = req.user?.rol || 'Administrador';

  doc.fontSize(9).font('Helvetica')
    .text(`Fecha de emision: ${fecha}`, 50, logoY + 145)
    .text(`Hora: ${hora}`, 50, logoY + 160)
    .text(`Total de usuarios: ${users.length}`, 50, logoY + 175);

  doc.fontSize(8).font('Helvetica-Oblique').fillColor('#555555')
    .text(`Generado por: ${generadoPor} (${rolGenerador})`, 50, logoY + 190);

  doc.fillColor('#000000');

  // LÃƒÂ­nea separadora antes de la tabla
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
    // Nueva pagina si es necesario
    if (y > doc.page.height - 100) {
      doc.addPage();
      y = 50;

      // Re-dibujar encabezado en nueva pagina
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

    // Color segÃƒÂºn rol
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

  // Pie de pÃƒÂ¡gina
  const pageRange = doc.bufferedPageRange();
  for (let i = pageRange.start; i < pageRange.start + pageRange.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).font('Helvetica')
      .text(`PÃƒÂ¡gina ${i + 1} de ${pageRange.count}`, 50, doc.page.height - 50, { align: 'center' })
      .text('Ã‚Â© I.E. N.Ã‚Âº 7213 Peruano JaponÃƒÂ©s - Sistema de GestiÃƒÂ³n AcadÃƒÂ©mica', 50, doc.page.height - 35, { align: 'center' });
  }

  doc.end();
}));

// PDF individual de usuario
app.get('/api/users/:id/report.pdf', ensureAdmin, asyncHandler(async (req, res) => {
  const userId = Number(req.params.id);
  const [u] = await db.query(
    `SELECT 
      id,
      nombres,
      apellido_paterno,
      apellido_materno,
      CONCAT_WS(' ', nombres, apellido_paterno, apellido_materno) AS nombre_completo,
      nombre,
      email,
      rol,
      documento_identidad,
      tipo_documento,
      telefono,
      direccion,
      departamento,
      provincia,
      distrito,
      fecha_nacimiento,
      genero,
      estado_civil,
      nacionalidad
    FROM usuarios
    WHERE id = ?`,
    [userId],
  );

  // Datos administrativos si aplica
  let adminDatos = null;
  if (u && (u.rol === 'admin' || u.rol === 'administrativo')) {
    const adminRows = await db.query(
      'SELECT cargo, nivel_acceso, area_responsabilidad, extension_telefonica, horario_atencion, ubicacion_oficina, observaciones, area_departamento, permisos_especiales, fecha_nombramiento, ultimo_cambio FROM admin_datos WHERE usuario_id = ? LIMIT 1',
      [userId],
    );
    adminDatos = adminRows[0] || null;
  }

  if (!u) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="usuario_${userId}.pdf"`);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);

  const colors = {
    primary: '#1D4ED8',
    secondary: '#0EA5E9',
    text: '#0F172A',
    muted: '#475569',
    border: '#E2E8F0',
    soft: '#F8FAFC',
  };
  const logoPath = path.resolve(__dirname, '../../frontend/public/logo.png');
  const formatDate = (d) => {
    if (!d) return '-';
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toISOString().slice(0, 10);
  };
  const now = new Date();
  const fullName = (u.nombre_completo || u.nombre || '').trim() || `Usuario #${userId}`;

  // Encabezado institucional con logo
  doc.rect(40, doc.y, doc.page.width - 80, 110).fill(colors.soft);
  doc.moveDown(-0.2);
  const startY = doc.y + 10;
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 50, startY, { width: 70, height: 70, fit: [70, 70] });
  }
  const infoX = 130;
  let lineY = startY;
  doc.fillColor(colors.text).font('Helvetica-Bold').fontSize(13)
    .text('I.E. N° 7213 Peruano Japonés', infoX, lineY, { align: 'left' });
  lineY += 15;
  doc.font('Helvetica').fontSize(10).fillColor(colors.muted)
    .text('Código Modular: 0874198 | RUC: 20503217032', infoX, lineY, { align: 'left' });
  lineY += 13;
  doc.text('Nivel: Primaria y Secundaria | Gestión: Pública', infoX, lineY, { align: 'left' });
  lineY += 13;
  doc.text('UGEL N.º 01 – San Juan de Miraflores (Lima Metropolitana)', infoX, lineY, { align: 'left' });
  lineY += 13;
  doc.text('Dirección: Av. 200 Millas s/n, Urb. Pachacámac (IV Etapa / Sector 1), Villa El Salvador, Lima', infoX, lineY, { align: 'left' });
  lineY += 13;
  doc.text('Teléfono: (01) 293-4417 | Email: japones7213@hotmail.com', infoX, lineY, { align: 'left' });
  doc.y = lineY + 20;
  doc.moveDown(0.5);

  // T?tulo
  doc.fillColor(colors.text).font('Helvetica-Bold').fontSize(18).text(fullName, { align: 'center' });
  doc.moveDown(0.2);
  doc.font('Helvetica').fontSize(12).fillColor(colors.muted).text('Ficha de Usuario', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Generado: ${formatDate(now)} ${now.toLocaleTimeString()}`, { align: 'center' });
  doc.moveDown(0.8);

  const drawSection = (title) => {
    doc.moveDown(0.3);
    doc.fillColor(colors.text).font('Helvetica-Bold').fontSize(13).text(title);
    doc.moveDown(0.15);
    doc.strokeColor(colors.border).lineWidth(1).moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
    doc.moveDown(0.25);
  };

  // Tabla de dos columnas con líneas delimitadoras y menor separación
  const drawGrid = (rows) => {
    const startX = 40;
    const tableWidth = doc.page.width - 80;
    const colWidth = tableWidth / 2;
    const rowHeight = 26;
    let currentY = doc.y;
    rows.forEach(({ label, value }, idx) => {
      const colIndex = idx % 2;
      if (colIndex === 0 && idx !== 0) {
        currentY += rowHeight;
      }
      // salto de página simple
      if (currentY + rowHeight + 50 > doc.page.height) {
        doc.addPage();
        currentY = 50;
      }
      const cellX = startX + colIndex * colWidth;
      doc.lineWidth(0.5).strokeColor(colors.border);
      doc.rect(cellX, currentY, colWidth, rowHeight).stroke();
      doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.muted)
        .text(label, cellX + 8, currentY + 6, { width: colWidth - 16 });
      doc.font('Helvetica').fontSize(10.5).fillColor(colors.text)
        .text(value || '-', cellX + 8, currentY + 15, { width: colWidth - 16, ellipsis: true });
    });
    doc.y = currentY + rowHeight + 8;
  };

  // Datos b?sicos
  drawSection('Datos básicos');
  drawGrid([
    { label: 'Nombre completo', value: fullName },
    { label: 'Usuario del sistema', value: u.nombre },
    { label: 'Correo', value: u.email },
    { label: 'Rol', value: u.rol },
    { label: 'Documento', value: u.documento_identidad || '-' },
    { label: 'Tipo de documento', value: u.tipo_documento || '-' },
    { label: 'Teléfono', value: u.telefono || '-' },
    { label: 'Fecha de nacimiento', value: formatDate(u.fecha_nacimiento) },
    { label: 'Género', value: u.genero || '-' },
    { label: 'Estado civil', value: u.estado_civil || '-' },
    { label: 'Nacionalidad', value: u.nacionalidad || '-' },
    { label: 'Dirección', value: u.direccion || '-' },
    { label: 'Departamento', value: u.departamento || '-' },
    { label: 'Provincia', value: u.provincia || '-' },
    { label: 'Distrito', value: u.distrito || '-' },
  ]);

  if (adminDatos) {
    drawSection('Informacion administrativa');
    drawGrid([
      { label: 'Cargo', value: adminDatos.cargo },
      { label: 'Nivel de acceso', value: adminDatos.nivel_acceso },
      { label: 'Area de responsabilidad', value: adminDatos.area_responsabilidad },
      { label: 'Extension telefonica', value: adminDatos.extension_telefonica },
      { label: 'Horario de atencion', value: adminDatos.horario_atencion },
      { label: 'Ubicacion de oficina', value: adminDatos.ubicacion_oficina },
      { label: 'Departamento', value: adminDatos.departamento },
      { label: 'Permisos especiales', value: adminDatos.permisos_especiales },
      { label: 'Fecha de nombramiento', value: formatDate(adminDatos.fecha_nombramiento) },
      { label: 'Ultimo cambio', value: formatDate(adminDatos.ultimo_cambio) },
      { label: 'Observaciones', value: adminDatos.observaciones || '-' },
    ]);
  }

  doc.end();
}));


const createUserHandler = asyncHandler(async (req, res) => {
  const { nombre, email, password, rol } = req.body;
  const estudiantePayload = req.body.estudiante || req.body.datos_estudiante || {};
  const hash = await bcrypt.hash(password, 10);

  const generateCodigo = (prefix, id) => `${prefix}-${String(id).padStart(6, '0')}`;
  let codigoEstudiante = null;
  let codigoDocente = null;
  let codigoAdmin = null;

  console.log('[createUserHandler] Intentando crear usuario', {
    nombre,
    email,
    rol,
    requestId: req.id || null,
    ip: req.ip,
  });

  try {
    const result = await db.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
      [nombre, email, hash, rol],
      { tag: 'user.create.insert' },
    );

    // Generar códigos automáticos según rol
    const codigoUpdates = [];
    const codigoValues = [];
    if (rol === 'estudiante') {
      codigoUpdates.push('codigo_estudiante = ?');
      codigoEstudiante = generateCodigo('EST', result.insertId);
      codigoValues.push(codigoEstudiante);
    } else if (rol === 'profesor' || rol === 'docente') {
      codigoUpdates.push('codigo_docente = ?');
      codigoDocente = generateCodigo('DOC', result.insertId);
      codigoValues.push(codigoDocente);
    } else if (rol === 'admin' || rol === 'administrativo') {
      codigoUpdates.push('codigo_admin = ?');
      codigoAdmin = generateCodigo('ADM', result.insertId);
      codigoValues.push(codigoAdmin);
    }

    if (codigoUpdates.length) {
      codigoValues.push(result.insertId);
      try {
        await db.query(
          `UPDATE usuarios SET ${codigoUpdates.join(', ')} WHERE id = ?`,
          codigoValues,
          { tag: 'user.create.assignCodes' },
        );
        console.log('[createUserHandler] Códigos generados', {
          userId: result.insertId,
          codigoUpdates,
        });
      } catch (err) {
        codigoEstudiante = rol === 'estudiante' ? null : codigoEstudiante;
        codigoDocente = rol === 'profesor' || rol === 'docente' ? null : codigoDocente;
        codigoAdmin = rol === 'admin' || rol === 'administrativo' ? null : codigoAdmin;
        logger.warn({ err, userId: result.insertId }, 'No se pudo asignar códigos (¿faltan columnas?)');
      }
    }

    // Si es estudiante y vienen datos acad�micos, persistirlos
    if (rol === 'estudiante') {
      const nivel =
        estudiantePayload.nivel_estudiante ??
        estudiantePayload.nivel ??
        req.body.nivel_estudiante ??
        req.body.nivel ??
        null;
      const grado =
        estudiantePayload.grado_estudiante ??
        estudiantePayload.grado ??
        req.body.grado_estudiante ??
        req.body.grado ??
        null;
      const seccion =
        estudiantePayload.seccion_estudiante ??
        estudiantePayload.seccion ??
        req.body.seccion_estudiante ??
        req.body.seccion ??
        null;
      const matricula = estudiantePayload.matricula ?? req.body.matricula ?? null;

      const hasAcademic = nivel || grado || seccion || matricula;
      if (hasAcademic) {
        await db.query(
          `INSERT INTO estudiante_datos (usuario_id, nivel, grado, seccion, matricula)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             nivel = VALUES(nivel),
             grado = VALUES(grado),
             seccion = VALUES(seccion),
             matricula = VALUES(matricula)`,
          [result.insertId, nivel || null, grado || null, seccion || null, matricula || null],
          { tag: 'user.create.estudiante_datos' },
        );
        console.log('[createUserHandler] Datos acad�micos guardados para estudiante', {
          userId: result.insertId,
          nivel,
          grado,
          seccion,
          matricula,
        });
      }
    }

    res.status(201).json({
      id: result.insertId,
      nombre,
      email,
      rol,
      codigo_estudiante: codigoEstudiante,
      codigo_docente: codigoDocente,
      codigo_admin: codigoAdmin,
      created_at: new Date(),
    });
  } catch (error) {
    if (error.details?.code === DB_ERROR_CODES.DUP_ENTRY) {
      return res.status(400).json({ error: 'Email ya registrado' });
    }
    throw error;
  }
});

const upsertEstudianteDatosBasicos = async (userId, effectiveRol, estudiantePayload = {}, body = {}) => {
  if (effectiveRol !== 'estudiante') return;
  const nivel =
    estudiantePayload.nivel_estudiante ??
    estudiantePayload.nivel ??
    body.nivel_estudiante ??
    body.nivel ??
    null;
  const grado =
    estudiantePayload.grado_estudiante ??
    estudiantePayload.grado ??
    body.grado_estudiante ??
    body.grado ??
    null;
  const seccion =
    estudiantePayload.seccion_estudiante ??
    estudiantePayload.seccion ??
    body.seccion_estudiante ??
    body.seccion ??
    null;
  const matricula = estudiantePayload.matricula ?? body.matricula ?? null;

  const hasAcademic = nivel || grado || seccion || matricula;
  if (!hasAcademic) return;

  console.log('[upsertEstudianteDatosBasicos] Datos a guardar', {
    userId,
    nivel,
    grado,
    seccion,
    matricula,
    effectiveRol,
  });

  await db.query(
    `INSERT INTO estudiante_datos (usuario_id, nivel, grado, seccion, matricula)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       nivel = VALUES(nivel),
       grado = VALUES(grado),
       seccion = VALUES(seccion),
       matricula = VALUES(matricula)`,
    [userId, nivel || null, grado || null, seccion || null, matricula || null],
    { tag: 'user.update.estudiante_datos' },
  );
};

const updateUserHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nombre, rol, password, email, activo } = req.body;
  const estudiantePayload = req.body.estudiante || req.body.datos_estudiante || {};

  console.log('[updateUserHandler] Payload recibido', {
    id,
    nombre,
    rol,
    email,
    activo,
    tienePassword: Boolean(password),
    estudiante: estudiantePayload,
    bodyNivel: req.body.nivel ?? req.body.nivel_estudiante ?? null,
    bodyGrado: req.body.grado ?? req.body.grado_estudiante ?? null,
    bodySeccion: req.body.seccion ?? req.body.seccion_estudiante ?? null,
    bodyMatricula: req.body.matricula ?? null,
    passwordLen: typeof password === 'string' ? password.length : 0,
  });

  // Log completo (sin exponer contraseña) para depurar qué llega desde el frontend
  const safeBody = {
    ...req.body,
    password: password ? `*** (${password.length} chars)` : undefined,
  };
  logger.info({ userId: id, body: safeBody }, 'PUT /usuarios/:id payload recibido');

  const campos = [];
  const valores = [];

  if (nombre !== undefined) {
    campos.push('nombre = ?');
    valores.push(nombre);
  }
  if (rol !== undefined) {
    campos.push('rol = ?');
    valores.push(rol);
  }
  if (email !== undefined) {
    campos.push('email = ?');
    valores.push(email);
  }
  if (activo !== undefined) {
    campos.push('activo = ?');
    valores.push(Boolean(activo));
  }

  if (password) {
    const hash = await bcrypt.hash(password, 10);
    campos.push('password = ?');
    valores.push(hash);
  }

  const tieneActualizacionUsuario = campos.length > 0;

  if (tieneActualizacionUsuario) {
    valores.push(id);
    await db.query(
      `UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`,
      valores,
      { tag: password ? 'user.update.withPassword' : 'user.update' },
    );
  }

  // Upsert datos academicos si corresponde
  const [current] = await db.query('SELECT rol FROM usuarios WHERE id = ?', [id]);
  const effectiveRol = rol || current?.rol || null;
  await upsertEstudianteDatosBasicos(id, effectiveRol, estudiantePayload, req.body);

  res.json({
    message: password
      ? 'Usuario actualizado con nueva contraseña'
      : 'Usuario actualizado',
  });
  logger.info(
    {
      userId: id,
      updatedCampos: campos.map((c) => c.split('=')[0].trim()),
      withPassword: Boolean(password),
    },
    'PUT /usuarios/:id actualizado correctamente',
  );
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

// Handler para actualizar datos completos del usuario
const updateDatosCompletosHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { basicos, estudiante, docente, admin } = req.body;

// 1. Actualizar datos básicos directamente en usuarios
  if (basicos) {
    const campos = [];
    const valores = [];

    if (basicos.dni !== undefined) {
      campos.push('documento_identidad = ?');
      valores.push(basicos.dni || null);
    }
    if (basicos.telefono !== undefined) {
      campos.push('telefono = ?');
      valores.push(basicos.telefono || null);
    }
    if (basicos.email !== undefined) {
      campos.push('email = ?');
      valores.push(basicos.email || null);
    }
    if (basicos.direccion !== undefined) {
      campos.push('direccion = ?');
      valores.push(basicos.direccion || null);
    }

    if (campos.length > 0) {
      valores.push(id);
      await db.query(
        `UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`,
        valores,
        { tag: 'user.updateDatosCompletos.basicosUsuarios' }
      );
    }
  }

  // 2. Actualizar datos específicos según rol
  try {
    if (estudiante) {
      await db.query(
        `INSERT INTO estudiante_datos (usuario_id, nivel, matricula, grado, seccion, promedio_general, porcentaje_asistencia, estado_academico)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           nivel = VALUES(nivel),
           matricula = VALUES(matricula),
           grado = VALUES(grado),
           seccion = VALUES(seccion),
           promedio_general = VALUES(promedio_general),
           porcentaje_asistencia = VALUES(porcentaje_asistencia),
           estado_academico = VALUES(estado_academico)`,
        [
          id,
          estudiante.nivel ?? estudiante.nivel_estudiante ?? null,
          estudiante.matricula,
          estudiante.grado,
          estudiante.seccion,
          estudiante.promedio_general,
          estudiante.porcentaje_asistencia,
          estudiante.estado_academico
        ],
        { tag: 'user.updateDatosCompletos.estudiante' }
      );
    } else if (docente) {
      await db.query(
        `INSERT INTO docente_datos (usuario_id, especialidad, nivel_academico, tipo_contrato)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           especialidad = VALUES(especialidad),
           nivel_academico = VALUES(nivel_academico),
           tipo_contrato = VALUES(tipo_contrato)`,
        [
          id,
          docente.especialidad,
          docente.nivel_academico,
          docente.tipo_contrato
        ],
        { tag: 'user.updateDatosCompletos.docente' }
      );
    } else if (admin) {
      await db.query(
        `INSERT INTO admin_datos (usuario_id, cargo, nivel_acceso, area_responsabilidad, extension_telefonica, horario_atencion, ubicacion_oficina, observaciones, area_departamento, permisos_especiales, fecha_nombramiento, ultimo_cambio)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           cargo = VALUES(cargo),
           nivel_acceso = VALUES(nivel_acceso),
           area_responsabilidad = VALUES(area_responsabilidad),
           extension_telefonica = VALUES(extension_telefonica),
           horario_atencion = VALUES(horario_atencion),
           ubicacion_oficina = VALUES(ubicacion_oficina),
            observaciones = VALUES(observaciones),
            area_departamento = VALUES(area_departamento),
            permisos_especiales = VALUES(permisos_especiales),
            fecha_nombramiento = VALUES(fecha_nombramiento),
            ultimo_cambio = VALUES(ultimo_cambio)`,
        [
          id,
          admin.cargo,
          admin.nivel_acceso,
          admin.area_responsabilidad,
          admin.extension_telefonica,
          admin.horario_atencion,
          admin.ubicacion_oficina,
          admin.observaciones,
          admin.area_departamento,
          admin.permisos_especiales,
          admin.fecha_nombramiento,
          admin.ultimo_cambio
        ],
        { tag: 'user.updateDatosCompletos.admin' }
      );
    }
  } catch (error) {
    if (!isMissingTableError(error) && !isBadFieldError(error)) {
      throw error;
    }
    logger.warn({ err: error }, 'Error actualizando tablas especificas (posiblemente no existen), continuando...');
  }

  res.json({ message: 'Datos actualizados correctamente' });
});

app.put('/usuarios/:id/datos-completos', ensureAdmin, updateDatosCompletosHandler);

// Handler para obtener datos completos del usuario seg?n su rol
const getDatosCompletosHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let usuario;

  try {
    const usuarios = await db.query(
      `SELECT u.id,
              u.nombre,
              u.nombres,
              u.apellido_paterno,
              u.apellido_materno,
              CONCAT_WS(' ', u.nombres, u.apellido_paterno, u.apellido_materno) AS nombre_completo,
              u.email,
              u.rol,
              u.activo,
              u.created_at as created_at,
              u.codigo_estudiante,
              u.codigo_docente,
              u.codigo_admin,
              u.fecha_nacimiento,
              u.genero,
              u.nacionalidad,
              u.estado_civil,
              u.foto_perfil,
              u.documento_identidad,
              u.tipo_documento,
              NULLIF(u.telefono, '') AS telefono,
              NULLIF(u.direccion, '') AS direccion,
              NULLIF(u.departamento, '') AS departamento,
              NULLIF(u.provincia, '') AS provincia,
              NULLIF(u.distrito, '') AS distrito,
              CASE WHEN u.foto_perfil_imagen IS NOT NULL THEN 1 ELSE 0 END as tiene_foto_perfil,
              NULL as dni_alt,
              NULL as edad_alt,
              NULL as telefono_alt,
              NULL as direccion_alt
       FROM usuarios u
       WHERE u.id = ?`,
      [id],
      { tag: 'user.getDatosCompletos.basico' }
    );

    usuario = usuarios[0];
    logger.info({ userId: id, rawUsuario: usuario }, 'Datos crudos obtenidos de usuarios/admin_datos');

    // Si faltan campos básicos de ubicación/dirección, reforzamos con un select directo a usuarios
    if (usuario && (!usuario.direccion || !usuario.departamento || !usuario.provincia || !usuario.distrito)) {
      try {
        const [basicUbicacion] = await db.query(
          'SELECT direccion, departamento, provincia, distrito FROM usuarios WHERE id = ?',
          [id],
          { tag: 'user.getDatosCompletos.ubicacionFallback' },
        );
        if (basicUbicacion) {
          usuario = {
            ...usuario,
            direccion: usuario.direccion || basicUbicacion.direccion || null,
            departamento: usuario.departamento || basicUbicacion.departamento || null,
            provincia: usuario.provincia || basicUbicacion.provincia || null,
            distrito: usuario.distrito || basicUbicacion.distrito || null,
          };
          logger.info({ userId: id, ubicacionReforzada: basicUbicacion }, 'Ubicación reforzada desde usuarios');
        }
      } catch (err) {
        logger.warn({ err, userId: id }, 'No se pudo reforzar ubicación desde usuarios');
      }
    }
  } catch (error) {
    if (!isBadFieldError(error) && !isMissingTableError(error)) {
      logger.error({ err: error, userId: id }, 'Error al obtener datos completos');
      return res.status(500).json({ error: 'Error al obtener datos completos del usuario' });
    }
    logger.warn({ err: error, id }, 'Campos o tablas faltantes en usuarios, usando select basico');
    const fallbackRows = await db.query(
      `SELECT u.* FROM usuarios u WHERE u.id = ?`,
      [id],
      { tag: 'user.getDatosCompletos.basicoFallback' }
    );
    usuario = fallbackRows[0];

    // No sobrescribimos ubicaci�n/direcci�n si el SELECT b�sico ya trae esos campos
    if (usuario) {
      usuario = {
        ...usuario,
        nombres: usuario.nombres ?? usuario.nombre ?? null,
        apellido_paterno: usuario.apellido_paterno ?? null,
        apellido_materno: usuario.apellido_materno ?? null,
        nombre_completo: usuario.nombre_completo ?? usuario.nombre,
        codigo_estudiante: usuario.codigo_estudiante ?? null,
        codigo_docente: usuario.codigo_docente ?? null,
        codigo_admin: usuario.codigo_admin ?? null,
        foto_perfil: usuario.foto_perfil ?? null,
        tiene_foto_perfil:
          usuario.tiene_foto_perfil ||
          (usuario.foto_perfil_imagen ? 1 : 0) ||
          (usuario.foto_perfil ? 1 : 0) ||
          0,
        dni_alt: usuario.dni_alt ?? null,
        edad_alt: usuario.edad_alt ?? null,
        telefono_alt: usuario.telefono_alt ?? null,
        direccion_alt: usuario.direccion_alt ?? null,
      };
    }
  }

  if (!usuario) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  const normalizeBasicos = (u) => {
    logger.info(
      {
        userId: id,
        beforeNormalize: {
          direccion: u?.direccion,
          departamento: u?.departamento,
          provincia: u?.provincia,
          distrito: u?.distrito,
        },
      },
      'Normalizando datos basicos (ubicacion)',
    );
    const nombreCompuesto = [
      u.nombres,
      u.apellido_paterno,
      u.apellido_materno,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    const nombreFull = u.nombre_completo || nombreCompuesto || u.nombre;

    const basicos = {
      ...u,
      nombres: u.nombres || u.nombre,
      nombre: nombreFull || u.nombre,
      nombre_completo: nombreFull || u.nombre,
      telefono: u.telefono || u.telefono_alt || null,
      direccion: u.direccion || u.direccion_alt || null,
      departamento: (u.departamento || '').trim() || u.departamento_alt || null,
      provincia: (u.provincia || '').trim() || u.provincia_alt || null,
      distrito: (u.distrito || '').trim() || u.distrito_alt || null,
      documento_identidad: u.documento_identidad || u.dni_alt || null,
      tiene_foto_perfil:
        u.tiene_foto_perfil ||
        (u.foto_perfil_imagen ? 1 : 0) ||
        (u.foto_perfil ? 1 : 0),
    };

    // Si los apellidos no vienen, intenta descomponer el nombre en componentes
    const apP = (basicos.apellido_paterno || '').trim();
    const apM = (basicos.apellido_materno || '').trim();
    if (!apP && !apM && basicos.nombres) {
      const parts = `${basicos.nombres}`.trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 3) {
        basicos.apellido_materno = parts.pop();
        basicos.apellido_paterno = parts.pop();
        basicos.nombres = parts.join(' ');
      } else if (parts.length === 2) {
        basicos.apellido_paterno = parts.pop();
        basicos.nombres = parts.join(' ');
      }
    }

    return basicos;
  };

  usuario = normalizeBasicos(usuario);

  const resultado = {
    basicos: usuario,
    estudiante: null,
    docente: null,
    admin: null,
    cursos: [],
    modulos: []
  };

  const safeQuery = async (query, params, tag) => {
    try {
      return await db.query(query, params, { tag });
    } catch (error) {
      if (isMissingTableError(error) || isBadFieldError(error)) {
        logger.warn({ error: error.message, query, tag }, 'Tabla no existe');
        return [];
      }
      throw error;
    }
  };

  try {
    if (usuario.rol === 'estudiante') {
      const datosEstudiante = await safeQuery(
        'SELECT * FROM estudiante_datos WHERE usuario_id = ?',
        [id],
        'user.getDatosCompletos.estudiante'
      );
      resultado.estudiante = datosEstudiante[0] || null;

      const cursosEstudiante = await safeQuery(
        `SELECT * FROM estudiante_cursos 
         WHERE estudiante_id = ? 
         ORDER BY ciclo_academico DESC, curso_nombre`,
        [id],
        'user.getDatosCompletos.cursosEstudiante'
      );
      resultado.cursos = cursosEstudiante;

    } else if (usuario.rol === 'profesor' || usuario.rol === 'docente') {
      const datosDocente = await safeQuery(
        'SELECT * FROM docente_datos WHERE usuario_id = ?',
        [id],
        'user.getDatosCompletos.docente'
      );
      resultado.docente = datosDocente[0] || null;

      const cursosDocente = await safeQuery(
        `SELECT * FROM docente_cursos 
         WHERE docente_id = ? 
         ORDER BY ciclo_academico DESC, curso_nombre`,
        [id],
        'user.getDatosCompletos.cursosDocente'
      );
      resultado.cursos = cursosDocente;

    } else if (usuario.rol === 'admin' || usuario.rol === 'administrativo') {
      const datosAdmin = await safeQuery(
        'SELECT * FROM admin_datos WHERE usuario_id = ?',
        [id],
        'user.getDatosCompletos.admin'
      );
      resultado.admin = datosAdmin[0] || null;

      const modulosAdmin = await safeQuery(
        `SELECT * FROM admin_modulos 
         WHERE admin_id = ? 
         ORDER BY modulo_nombre`,
        [id],
        'user.getDatosCompletos.modulosAdmin'
      );
      resultado.modulos = modulosAdmin;
    }
  } catch (error) {
    logger.error({ err: error, userId: id }, 'Error al obtener datos completos');
    return res.status(500).json({ error: 'Error al obtener datos completos del usuario' });
  }

  return res.json(resultado);
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

/* ===================== Gestion de Estado y Permisos ===================== */

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
        return res.status(400).json({ error: 'El usuario ya estÃƒÂ¡ activo' });
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

      // No permitir que un admin se desactive asi­ mismo
      if (usuario.id === adminId) {
        return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
      }

      if (!usuario.activo) {
        return res.status(400).json({ error: 'El usuario ya estÃƒÂ¡ desactivado' });
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
      // Construir query dinamicamente solo con los campos proporcionados
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
      const usuarioRows = await db.query('SELECT * FROM usuarios WHERE id = ?', [id]);
      if (!usuarioRows || usuarioRows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const usuario = usuarioRows[0];
      const rolUsuario = usuario.rol;

      // Actualizar datos personales en tabla usuarios
      if (datos_personales && typeof datos_personales === 'object') {
        try {
          const camposActualizar = [];
          const valoresActualizar = [];

          const sanitizar = (v) => (v === undefined ? undefined : (v || '').trim());
          logger.info(
            {
              userId: id,
              payloadUbicacion: {
                direccion: datos_personales?.direccion,
                departamento: datos_personales?.departamento,
                provincia: datos_personales?.provincia,
                distrito: datos_personales?.distrito,
              },
            },
            'Payload recibido para actualizar direccion/ubigeo',
          );

          if (datos_personales.nombres) {
            camposActualizar.push('nombres = ?');
            valoresActualizar.push(datos_personales.nombres.trim());
          }
          if (datos_personales.apellido_paterno) {
            camposActualizar.push('apellido_paterno = ?');
            valoresActualizar.push(datos_personales.apellido_paterno.trim());
          }
          if (datos_personales.apellido_materno) {
            camposActualizar.push('apellido_materno = ?');
            valoresActualizar.push(datos_personales.apellido_materno.trim());
          }
          if (Object.prototype.hasOwnProperty.call(datos_personales, 'direccion')) {
            const direccion = sanitizar(datos_personales.direccion);
            camposActualizar.push('direccion = ?');
            valoresActualizar.push(direccion || null);
          }
          if (Object.prototype.hasOwnProperty.call(datos_personales, 'departamento')) {
            const dep = sanitizar(datos_personales.departamento);
            camposActualizar.push('departamento = ?');
            valoresActualizar.push(dep || null);
          }
          if (Object.prototype.hasOwnProperty.call(datos_personales, 'provincia')) {
            const prov = sanitizar(datos_personales.provincia);
            camposActualizar.push('provincia = ?');
            valoresActualizar.push(prov || null);
          }
          if (Object.prototype.hasOwnProperty.call(datos_personales, 'distrito')) {
            const dist = sanitizar(datos_personales.distrito);
            camposActualizar.push('distrito = ?');
            valoresActualizar.push(dist || null);
          }
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

          const nombreCompleto = [
            datos_personales.nombres,
            datos_personales.apellido_paterno,
            datos_personales.apellido_materno,
          ]
            .filter(Boolean)
            .join(' ')
            .trim();

          if (nombreCompleto) {
            camposActualizar.push('nombre = ?');
            valoresActualizar.push(nombreCompleto);
          }

          if (camposActualizar.length > 0) {
            camposActualizar.push('ultima_actualizacion = CURRENT_TIMESTAMP');
            valoresActualizar.push(id);

            logger.info(
              { userId: id, camposActualizar, valoresActualizar },
              'Ejecutando UPDATE de datos personales',
            );

            await db.query(
              `UPDATE usuarios SET ${camposActualizar.join(', ')} WHERE id = ?`,
              valoresActualizar
            );
          }
        } catch (error) {
          if (!isMissingTableError(error) && !isBadFieldError(error)) {
            throw error;
          }
          logger.warn(
            { err: error, userId: id },
            'Campos faltantes en usuarios, omitiendo update de datos personales',
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

        const nivelEst = datos_estudiante.nivel ?? datos_estudiante.nivel_estudiante;
        if (nivelEst) {
          camposEstudiante.push('nivel = ?');
          valoresEstudiante.push(nivelEst);
        }
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
        try {
          const existeDocente = await db.query(
            'SELECT id FROM docente_datos WHERE usuario_id = ?',
            [id]
          );

          const camposDocente = [];
          const valoresDocente = [];

          const normalizarTexto = (v) =>
            v === undefined || v === null ? undefined : String(v).trim();

          if (datos_docente.titulo_profesional && DOCENTE_ALLOWED_FIELDS.has('titulo_profesional')) {
            camposDocente.push('titulo_profesional = ?');
            valoresDocente.push(normalizarTexto(datos_docente.titulo_profesional));
          }

          if (datos_docente.universidad_egreso && DOCENTE_ALLOWED_FIELDS.has('universidad_egreso')) {
            camposDocente.push('universidad_egreso = ?');
            valoresDocente.push(normalizarTexto(datos_docente.universidad_egreso));
          }

          if (datos_docente.numero_colegiatura && DOCENTE_ALLOWED_FIELDS.has('numero_colegiatura')) {
            camposDocente.push('numero_colegiatura = ?');
            valoresDocente.push(normalizarTexto(datos_docente.numero_colegiatura));
          }

          if (DOCENTE_ALLOWED_FIELDS.has('carga_horaria_semanal') && datos_docente.carga_horaria_semanal !== undefined) {
            camposDocente.push('carga_horaria_semanal = ?');
            valoresDocente.push(Number(datos_docente.carga_horaria_semanal) || 0);
          }

          if (datos_docente.areas_investigacion && DOCENTE_ALLOWED_FIELDS.has('areas_investigacion')) {
            camposDocente.push('areas_investigacion = ?');
            valoresDocente.push(normalizarTexto(datos_docente.areas_investigacion));
          }

          if (datos_docente.publicaciones && DOCENTE_ALLOWED_FIELDS.has('publicaciones')) {
            camposDocente.push('publicaciones = ?');
            valoresDocente.push(normalizarTexto(datos_docente.publicaciones));
          }

          if (datos_docente.idiomas_domina && DOCENTE_ALLOWED_FIELDS.has('idiomas_domina')) {
            camposDocente.push('idiomas_domina = ?');
            valoresDocente.push(normalizarTexto(datos_docente.idiomas_domina));
          }

          if (datos_docente.nivel_ingles && DOCENTE_ALLOWED_FIELDS.has('nivel_ingles')) {
            camposDocente.push('nivel_ingles = ?');
            valoresDocente.push(normalizarTexto(datos_docente.nivel_ingles));
          }

          if (datos_docente.disponibilidad_horaria && DOCENTE_ALLOWED_FIELDS.has('disponibilidad_horaria')) {
            camposDocente.push('disponibilidad_horaria = ?');
            valoresDocente.push(normalizarTexto(datos_docente.disponibilidad_horaria));
          }

          if (datos_docente.observaciones !== undefined && DOCENTE_ALLOWED_FIELDS.has('observaciones')) {
            camposDocente.push('observaciones = ?');
            valoresDocente.push(normalizarTexto(datos_docente.observaciones));
          }

          if (camposDocente.length > 0) {
            if (existeDocente && existeDocente.length > 0) {
              valoresDocente.push(id);
              await db.query(
                `UPDATE docente_datos SET ${camposDocente.join(', ')} WHERE usuario_id = ?`,
                valoresDocente
              );
            } else {
              camposDocente.push('usuario_id = ?');
              valoresDocente.push(id);
              const placeholders = Array(camposDocente.length).fill('?').join(', ');
              const campos = camposDocente.map((c) => c.split(' = ')[0]).join(', ');
              await db.query(
                `INSERT INTO docente_datos (${campos}) VALUES (${placeholders})`,
                valoresDocente
              );
            }
          }
        } catch (error) {
          if (!isMissingTableError(error) && !isBadFieldError(error)) {
            throw error;
          }
          logger.warn(
            { err: error, userId: id },
            'Tabla/columnas de docente_datos faltantes, omitiendo update de docente',
          );
        }
      }

      if ((rolUsuario === 'admin' || rolUsuario === 'administrativo') && datos_admin) {
        // Verificar si ya existe registro
        try {
          const existeAdmin = await db.query(
            'SELECT id FROM admin_datos WHERE usuario_id = ?',
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
        if (datos_admin.area_departamento) {
          camposAdmin.push('area_departamento = ?');
          valoresAdmin.push(datos_admin.area_departamento);
        }
        if (datos_admin.permisos_especiales !== undefined) {
          camposAdmin.push('permisos_especiales = ?');
          valoresAdmin.push(datos_admin.permisos_especiales);
        }
        if (datos_admin.fecha_nombramiento) {
          camposAdmin.push('fecha_nombramiento = ?');
          valoresAdmin.push(datos_admin.fecha_nombramiento);
        }
        if (datos_admin.ultimo_cambio) {
          camposAdmin.push('ultimo_cambio = ?');
          valoresAdmin.push(datos_admin.ultimo_cambio);
        }

          if (camposAdmin.length > 0) {
            if (existeAdmin && existeAdmin.length > 0) {
              // Actualizar
              valoresAdmin.push(id);
              await db.query(
                `UPDATE admin_datos SET ${camposAdmin.join(', ')} WHERE usuario_id = ?`,
                valoresAdmin
              );
            } else {
              // Insertar nuevo
              camposAdmin.push('usuario_id = ?');
              valoresAdmin.push(id);
              const placeholders = Array(camposAdmin.length).fill('?').join(', ');
              const campos = camposAdmin.map(c => c.split(' = ')[0]).join(', ');
              await db.query(
                `INSERT INTO admin_datos (${campos}) VALUES (${placeholders})`,
                valoresAdmin
              );
            }
          }
        } catch (err) {
          if (!isMissingTableError(err) && !isBadFieldError(err)) {
            throw err;
          }
          logger.warn({ err }, 'Tabla admin_datos faltante o columnas distintas, se omite actualizaci\u00f3n admin');
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
      // Validar formato de DNI (8 dÃƒÂ­gitos)
      if (!/^\d{8}$/.test(dni)) {
        return res.status(400).json({ error: 'DNI debe tener 8 dÃƒÂ­gitos' });
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
              // Error de autenticaciÃƒÂ³n
              logger.error({ dni, status: apiRes.statusCode, data }, 'API Key invÃƒÂ¡lido o vencido');
              res.status(500).json({
                error: 'Error de configuraciÃƒÂ³n del servicio de verificaciÃƒÂ³n. Contacte al administrador.',
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
        logger.error({ error: error.message, dni }, 'Error en conexiÃƒÂ³n con API de DNI');
        res.status(500).json({ error: 'Error al conectar con el servicio de consulta de DNI' });
      });

      apiRequest.end();

    } catch (error) {
      logger.error({ error: error.message, dni }, 'Error al consultar DNI');
      res.status(500).json({ error: 'Error al consultar DNI' });
    }
  },
);

/* ===================== GestiÃƒÂ³n de Fotos de Perfil ===================== */

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

      // Verificar tamaÃƒÂ±o (mÃƒÂ¡ximo 5MB)
      if (imagenBuffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'La imagen es muy grande. MÃƒÂ¡ximo 5MB' });
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
        'SELECT foto_perfil_imagen, foto_perfil_tipo, foto_perfil FROM usuarios WHERE id = ?',
        [id],
        { tag: 'user.getFotoPerfil' }
      );

      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const sendBuffer = (buffer, mimeType) => {
        if (!buffer) return false;
        res.setHeader('Content-Type', mimeType || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache por 24 horas
        res.send(buffer);
        return true;
      };

      // Preferimos la imagen en binario (columnas *_imagen y *_tipo)
      if (usuario.foto_perfil_imagen) {
        return sendBuffer(usuario.foto_perfil_imagen, usuario.foto_perfil_tipo);
      }

      // Soporte retro: si solo hay string en foto_perfil, intentamos servirlo
      const fotoPerfil = (usuario.foto_perfil || '').trim();
      if (fotoPerfil) {
        // 1) Data URL completa (data:image/png;base64,XXXX)
        const dataUrlMatch = fotoPerfil.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
        if (dataUrlMatch) {
          const [, mimeType, data] = dataUrlMatch;
          const buffer = Buffer.from(data, 'base64');
          if (sendBuffer(buffer, mimeType)) return;
        }

        // 2) Cadena base64 sin prefijo
        const base64Like = /^[A-Za-z0-9+/]+={0,2}$/;
        if (base64Like.test(fotoPerfil) && fotoPerfil.length > 40) {
          const buffer = Buffer.from(fotoPerfil, 'base64');
          if (sendBuffer(buffer, usuario.foto_perfil_tipo)) return;
        }

        // 3) URL externa: redirigimos
        if (/^https?:\/\//i.test(fotoPerfil)) {
          return res.redirect(fotoPerfil);
        }

        // 4) Ruta de archivo accesible localmente
        const absolutePath = path.isAbsolute(fotoPerfil)
          ? fotoPerfil
          : path.join(__dirname, fotoPerfil);
        if (fs.existsSync(absolutePath)) {
          res.setHeader('Cache-Control', 'public, max-age=86400');
          return fs.createReadStream(absolutePath).pipe(res);
        }
      }

      return res.status(404).json({ error: 'Foto de perfil no encontrada' });

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
  logger.info({ port: env.PORT }, 'User Service en ejecucion');
});

