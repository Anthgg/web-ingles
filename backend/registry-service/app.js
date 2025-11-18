const express = require('express');
const cors = require('cors');
const { str } = require('envalid');
const crypto = require('node:crypto');
const { createConfig } = require('../config');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
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
  serviceName: 'registry-service',
  serviceRoot: __dirname,
  overrides: {
    REGISTRY_DNI_API_URL: str({ default: 'https://dniruc.apisperu.com/api/v1/dni' }),
    REGISTRY_DNI_API_TOKEN: str({ default: '' }),
    // Fallback providers (optional tokens)
    REGISTRY_DNI_APISPERU_TOKEN: str({ default: '' }),
    REGISTRY_DNI_APISNETPE_TOKEN: str({ default: '' }),
    REGISTRY_DNI_APIPERUDEV_TOKEN: str({ default: '' }),
    REGISTRY_DNI_ENABLE_FALLBACK: str({ default: 'true' }),
    // Dev-only: return mock data if all providers fail
    REGISTRY_DNI_FAKE_ON_FAIL: str({ default: 'true' }),
    REGISTRY_JWT_SECRET: str({ default: '' }),
    AUTH_JWT_SECRET: str({ default: '' }),
  },
  defaults: {
    DB_NAME: 'instenglish_registry',
    PORT: 3011,
  },
});

const { env, corsOrigins } = config;

const logger = createLogger({ name: 'registry-service' });

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
    ['REGISTRY_JWT_SECRET', config.get('REGISTRY_JWT_SECRET')],
    ['AUTH_JWT_SECRET', config.get('AUTH_JWT_SECRET')],
    ['JWT_SECRET', env.JWT_SECRET],
  ]
    .map(([label, value]) => {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? [label, trimmed] : null;
      }
      return value ? [label, value] : null;
    })
    .filter(Boolean);

  if (!candidates.length) {
    throw new Error('JWT_SECRET no configurado. Define una clave compartida para todos los servicios.');
  }

  const uniqueValues = [...new Set(candidates.map(([, value]) => value))];

  if (uniqueValues.length > 1) {
    const labels = candidates.map(([label]) => label).join(', ');
    throw new Error(`${labels} no coinciden. Usa un solo secreto compartido.`);
  }

  cachedJwtSecret = uniqueValues[0];
  return cachedJwtSecret;
};

let SECRET_KEY;
try {
  SECRET_KEY = resolveJwtSecret();
} catch (error) {
  logger.error({ err: error }, 'JWT configuration error');
  process.exit(1);
}

const DNI_API_URL = config.get('REGISTRY_DNI_API_URL');
const DNI_API_TOKEN = config.get('REGISTRY_DNI_API_TOKEN');
const DNI_APISPERU_TOKEN = config.get('REGISTRY_DNI_APISPERU_TOKEN');
const DNI_APISNETPE_TOKEN = config.get('REGISTRY_DNI_APISNETPE_TOKEN');
const DNI_APIPERUDEV_TOKEN = config.get('REGISTRY_DNI_APIPERUDEV_TOKEN');
const DNI_ENABLE_FALLBACK = (config.get('REGISTRY_DNI_ENABLE_FALLBACK') || 'true').toString().toLowerCase() !== 'false';
const DNI_FAKE_ON_FAIL = (config.get('REGISTRY_DNI_FAKE_ON_FAIL') || 'true').toString().toLowerCase() !== 'false';

db.configure({
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  port: env.DB_PORT,
  connectionLimit: env.DB_POOL_SIZE,
  logger,
});

const CODE_TARGETS = {
  modular: { table: 'ministerio_instituciones', column: 'codigo_modular' },
  personal: { table: 'ministerio_personal', column: 'codigo_personal' },
  student: { table: 'ministerio_estudiantes', column: 'codigo_estudiante' },
  internal: { table: 'student_internal_forms', column: 'codigo_interno' },
};

const generateBaseCode = (length) => {
  const raw = crypto.randomBytes(Math.ceil(length * 0.75)).toString('base64');
  return raw.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, length);
};

const ensureValidTargetKey = (key) => {
  if (!CODE_TARGETS[key]) {
    throw new Error(`Clave de generación de código no soportada: ${key}`);
  }
};

const generateUniqueCode = async ({ key, prefix, length = 8, tx = null }) => {
  ensureValidTargetKey(key);
  const { table, column } = CODE_TARGETS[key];
  const executor = tx ? tx.query.bind(tx) : db.query;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = `${prefix}-${generateBaseCode(length)}`;
    const rows = await executor(`SELECT 1 FROM ${table} WHERE ${column} = ? LIMIT 1`, [code]);
    if (!rows.length) {
      return code;
    }
  }
  throw new Error(`No se pudo generar un código único para ${key}`);
};

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const ensureAuthenticated = rbac([], { jwtSecret: SECRET_KEY });
const ensureAdmin = rbac(['administrativo', 'admin'], { jwtSecret: SECRET_KEY });
const ensureStudent = rbac(['alumno', 'estudiante'], { jwtSecret: SECRET_KEY });
const ensureAdminOrTeacher = rbac(['administrativo', 'admin', 'profesor'], { jwtSecret: SECRET_KEY });

const institutionSchema = z.object({
  nombre: z.string().min(1, 'Nombre de la institución requerido'),
  tipoGestion: z.string().min(1, 'Tipo de gestión requerido'),
  nivelEducativo: z.string().min(1, 'Nivel educativo requerido'),
  turno: z.string().min(1, 'Turno requerido'),
  direccion: z.string().min(1, 'Dirección requerida'),
  ugel: z.string().min(1, 'UGEL o DRE requerido'),
});

const personalSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  dni: z.string().min(8, 'DNI inválido').max(15),
  cargo: z.string().min(1, 'Cargo requerido'),
  especialidad: z.string().optional().nullable(),
  condicionLaboral: z.string().optional().nullable(),
});

const notasSchema = z.union([
  z.array(z.object({
    curso: z.string().min(1),
    nota: z.number({ invalid_type_error: 'La nota debe ser numérica' }).min(0).max(20).optional(),
  })).transform((items) => items.map((item) => ({ ...item, nota: item.nota ?? null }))),
  z.record(z.any()),
  z.string(),
]).optional();

const academicSchema = z.object({
  notas: notasSchema,
  asistencia: z.union([
    z.number({ invalid_type_error: 'La asistencia debe ser numérica' }),
    z.string(),
  ]).optional().nullable(),
  promocion: z.string().optional().nullable(),
});

const studentSchema = z.object({
  nombreCompleto: z.string().min(1, 'Nombre completo requerido'),
  dni: z.string().min(8, 'DNI inválido').max(15),
  sexo: z.string().min(1, 'Sexo requerido'),
  fechaNacimiento: z.string().min(4, 'Fecha de nacimiento requerida'),
  grado: z.string().min(1, 'Grado requerido'),
  seccion: z.string().min(1, 'Sección requerida'),
  anioAcademico: z.string().min(1, 'Año académico requerido'),
  situacionMatricula: z.string().min(1, 'Situación de matrícula requerida'),
  lenguaMaterna: z.string().min(1, 'Lengua materna requerida'),
  tipoDiscapacidad: z.string().optional().nullable(),
  academico: academicSchema.optional(),
});

const createMinistryFormSchema = z.object({
  institucion: institutionSchema,
  personal: z.array(personalSchema).min(1, 'Incluye al menos un miembro del personal'),
  estudiantes: z.array(studentSchema).min(1, 'Incluye al menos un estudiante'),
});

const updateMinistryFormSchema = z.object({
  institucion: institutionSchema.optional(),
  personal: z.array(personalSchema).optional(),
  estudiantes: z.array(studentSchema).optional(),
});

const internalFormSchema = z.object({
  dni: z.string().min(8, 'DNI inválido').max(15),
  nombres: z.string().min(1, 'Nombres requeridos'),
  apellidos: z.string().min(1, 'Apellidos requeridos'),
  telefono: z.string().min(6, 'Teléfono requerido'),
  correo: z.string().email('Correo inválido').optional().nullable(),
  direccion: z.string().min(1, 'Dirección requerida'),
  familiarNombre: z.string().min(1, 'Nombre del apoderado requerido'),
  familiarRelacion: z.string().min(1, 'Relación con el apoderado requerida'),
  familiarOcupacion: z.string().optional().nullable(),
  familiarTelefono: z.string().min(6, 'Teléfono del apoderado requerido'),
  familiarCorreo: z.string().email('Correo del apoderado inválido').optional().nullable(),
  tipoSangre: z.string().min(1, 'Tipo de sangre requerido'),
  alergias: z.string().optional().nullable(),
  enfermedadesCronicas: z.string().optional().nullable(),
  seguroMedico: z.string().optional().nullable(),
  personaAutorizada: z.string().min(1, 'Persona autorizada requerida'),
  telefonoEmergencia: z.string().min(6, 'Teléfono de emergencia requerido'),
});

const normalizeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
};

const normalizeNotas = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch (error) {
    return null;
  }
};

const normalizeAsistencia = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return null;
  return Math.min(Math.max(numeric, 0), 100);
};

const slugify = (value, fallback = 'archivo') => {
  const base = String(value || '').toLowerCase();
  const cleaned = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return cleaned || fallback;
};

const formatReadableDate = (value) => {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const mapAcademicRecord = (record) => ({
  notas: (() => {
    if (!record?.notas) return null;
    try {
      const parsed = JSON.parse(record.notas);
      return parsed;
    } catch (error) {
      return record.notas;
    }
  })(),
  asistencia: record?.asistencia_porcentaje != null ? Number(record.asistencia_porcentaje) : null,
  promocion: record?.promocion_estado || null,
});

// Simple mock generator for DNI data in development
const buildFakeDniPayload = (dni) => {
  const NAMES = ['Juan', 'María', 'Carlos', 'Lucía', 'Ana', 'José', 'Daniela', 'Pedro'];
  const LASTNAMES = ['Pérez', 'García', 'Rodríguez', 'Fernández', 'López', 'Gómez', 'Sánchez', 'Torres'];
  const n = Number(String(dni).slice(-2)) || 0;
  const nombres = NAMES[n % NAMES.length];
  const apellidoPaterno = LASTNAMES[n % LASTNAMES.length];
  const apellidoMaterno = LASTNAMES[(n + 3) % LASTNAMES.length];
  const nombreCompleto = `${nombres} ${apellidoPaterno} ${apellidoMaterno}`.replace(/\s+/g, ' ').trim();
  return {
    dni,
    nombres,
    apellidoPaterno,
    apellidoMaterno,
    razonSocial: null,
    nombreCompleto,
    raw: { mock: true, provider: 'dev-fake', dni },
    provider: 'dev-fake',
  };
};

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

// Multi-provider DNI lookup with graceful fallback
app.get('/identidad/dni/:dni', ensureAuthenticated, asyncHandler(async (req, res) => {
  const { dni } = req.params;
  if (!dni || String(dni).length < 8) {
    return res.status(400).json({ error: 'DNI invǭlido' });
  }

  const providers = [];
  if (DNI_API_URL) providers.push({ url: DNI_API_URL, token: DNI_API_TOKEN || '' });
  if (DNI_ENABLE_FALLBACK) {
    providers.push(
      { url: 'https://dniruc.apisperu.com/api/v1/dni/:dni', token: DNI_APISPERU_TOKEN || DNI_API_TOKEN || '' },
      { url: 'https://api.apis.net.pe/v2/reniec/dni?numero=:dni', token: DNI_APISNETPE_TOKEN || DNI_API_TOKEN || '' },
      { url: 'https://apiperu.dev/api/dni/:dni', token: DNI_APIPERUDEV_TOKEN || DNI_API_TOKEN || '' },
    );
  }

  let lastError = null;
  for (const provider of providers) {
    try {
      const url = new URL(provider.url);
      if (url.pathname.includes(':dni') || url.pathname.includes('{dni}')) {
        url.pathname = url.pathname.replace(':dni', dni).replace('{dni}', dni);
      }
      if (!url.searchParams.has('numero') && url.searchParams.toString().toLowerCase().includes('numero=')) {
        // already present
      } else if (url.search && url.search.includes('{dni}')) {
        url.search = url.search.replace('{dni}', dni);
      } else if (!url.searchParams.has('numero')) {
        url.searchParams.set('numero', dni);
      }

      const headers = { 'Content-Type': 'application/json' };
      const token = provider.token || '';
      if (token) {
        if (url.hostname.includes('apis.net.pe')) {
          headers.Authorization = `Bearer ${token}`;
        } else if (url.hostname.includes('dniruc.apisperu.com') || url.hostname.includes('apiperu.dev')) {
          url.searchParams.set('token', token);
        } else {
          headers.token = token;
        }
      }

      const response = await fetch(url, { headers });
      if (!response.ok) {
        const payload = await response.text();
        logger.warn({ dni, status: response.status, provider: url.hostname, payload }, 'Consulta DNI fallida');
        lastError = new Error(`Proveedor ${url.hostname} devolvi�� ${response.status}`);
        continue;
      }

      const raw = await response.json();
      const data = raw && typeof raw === 'object' && raw.data ? raw.data : raw;
      const nombre = data.nombres || data.nombre || data.fullname || '';
      const apellidoPaterno = data.apellidoPaterno || data.apellido_paterno || '';
      const apellidoMaterno = data.apellidoMaterno || data.apellido_materno || '';
      const razonSocial = data.razonSocial || data.razon_social || '';

      const fullNameCandidates = [
        `${nombre} ${apellidoPaterno} ${apellidoMaterno}`.trim(),
        `${apellidoPaterno} ${apellidoMaterno}, ${nombre}`.trim(),
        razonSocial,
        nombre,
      ].map((value) => value.replace(/\s+/g, ' ').trim()).filter(Boolean);

      const fullName = fullNameCandidates[0] || null;
      return res.json({
        dni,
        nombres: nombre || null,
        apellidoPaterno: apellidoPaterno || null,
        apellidoMaterno: apellidoMaterno || null,
        razonSocial: razonSocial || null,
        nombreCompleto: fullName,
        raw,
        provider: new URL(provider.url).hostname,
      });
    } catch (err) {
      lastError = err;
      logger.warn({ dni, provider: provider.url, err: err?.message }, 'Error consultando proveedor DNI');
      continue;
    }
  }

  // Dev fallback: return mock data to unblock local development
  if (DNI_FAKE_ON_FAIL && config.isDev) {
    const mock = buildFakeDniPayload(dni);
    logger.warn({ dni, providersTried: providers.map(p => p.url), note: 'Usando datos mock en desarrollo' }, 'DNI mock dev');
    return res.json(mock);
  }

  return res.status(502).json({ error: 'No fue posible validar el DNI con los proveedores configurados', details: lastError?.message || undefined });
}));

app.get('/identidad/dni/:dni', ensureAuthenticated, asyncHandler(async (req, res) => {
  const { dni } = req.params;
  if (!dni || String(dni).length < 8) {
    return res.status(400).json({ error: 'DNI inválido' });
  }

  const url = new URL(DNI_API_URL);
  if (url.pathname.includes(':dni') || url.pathname.includes('{dni}')) {
    url.pathname = url.pathname.replace(':dni', dni).replace('{dni}', dni);
  }
  if (!url.searchParams.has('numero') && url.searchParams.toString().toLowerCase().includes('numero=')) {
    // Already present in template
  } else if (url.search && url.search.includes('{dni}')) {
    url.search = url.search.replace('{dni}', dni);
  } else if (!url.searchParams.has('numero')) {
    url.searchParams.set('numero', dni);
  }

  const headers = { 'Content-Type': 'application/json' };
  if (DNI_API_TOKEN) {
    if (url.hostname.includes('apis.net.pe')) {
      headers.Authorization = `Bearer ${DNI_API_TOKEN}`;
    } else if (url.hostname.includes('dniruc.apisperu.com') || url.hostname.includes('apiperu.dev')) {
      url.searchParams.set('token', DNI_API_TOKEN);
    } else {
      headers.token = DNI_API_TOKEN;
    }
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const payload = await response.text();
    logger.warn({ dni, status: response.status, payload }, 'Consulta DNI fallida');
    return res.status(502).json({ error: 'No fue posible validar el DNI con el servicio externo' });
  }

  const data = await response.json();
  const nombre = data.nombres || data.nombre || data.fullname || '';
  const apellidoPaterno = data.apellidoPaterno || data.apellido_paterno || '';
  const apellidoMaterno = data.apellidoMaterno || data.apellido_materno || '';
  const razonSocial = data.razonSocial || data.razon_social || '';

  const fullNameCandidates = [
    `${nombre} ${apellidoPaterno} ${apellidoMaterno}`.trim(),
    `${apellidoPaterno} ${apellidoMaterno}, ${nombre}`.trim(),
    razonSocial,
    nombre,
  ].map((value) => value.replace(/\s+/g, ' ').trim()).filter(Boolean);

  const fullName = fullNameCandidates[0] || null;

  res.json({
    dni,
    nombres: nombre || null,
    apellidoPaterno: apellidoPaterno || null,
    apellidoMaterno: apellidoMaterno || null,
    razonSocial: razonSocial || null,
    nombreCompleto: fullName,
    raw: data,
  });
}));

app.post(
  '/ministerio/forms',
  ensureAdmin,
  validator(createMinistryFormSchema),
  asyncHandler(async (req, res) => {
    const { institucion, personal, estudiantes } = req.body;

    const codigoModular = await generateUniqueCode({ key: 'modular', prefix: 'MOD' });

    const result = await db.transaction(async (tx) => {
      const insertInstitution = await tx.query(
        `INSERT INTO ministerio_instituciones (
          codigo_modular, nombre, tipo_gestion, nivel_educativo, turno, direccion, ugel
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          codigoModular,
          institucion.nombre,
          institucion.tipoGestion,
          institucion.nivelEducativo,
          institucion.turno,
          institucion.direccion,
          institucion.ugel,
        ],
      );

      const institucionId = insertInstitution.insertId;

      const personalInsertados = [];
      for (const persona of personal) {
        const codigoPersonal = await generateUniqueCode({ key: 'personal', prefix: 'PER', tx });
        await tx.query(
          `INSERT INTO ministerio_personal (
            institucion_id, codigo_personal, nombre, dni, cargo, especialidad, condicion_laboral
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            institucionId,
            codigoPersonal,
            persona.nombre,
            persona.dni,
            persona.cargo,
            persona.especialidad ?? null,
            persona.condicionLaboral ?? null,
          ],
        );
        personalInsertados.push({ ...persona, codigoPersonal });
      }

      const estudiantesInsertados = [];
      for (const estudiante of estudiantes) {
        const codigoEstudiante = await generateUniqueCode({ key: 'student', prefix: 'EST', tx });
        const fechaNacimiento = normalizeDate(estudiante.fechaNacimiento);

        const insertEstudiante = await tx.query(
          `INSERT INTO ministerio_estudiantes (
            institucion_id, codigo_estudiante, nombre_completo, dni, sexo, fecha_nacimiento, grado, seccion,
            anio_academico, situacion_matricula, lengua_materna, tipo_discapacidad
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            institucionId,
            codigoEstudiante,
            estudiante.nombreCompleto,
            estudiante.dni,
            estudiante.sexo,
            fechaNacimiento,
            estudiante.grado,
            estudiante.seccion,
            estudiante.anioAcademico,
            estudiante.situacionMatricula,
            estudiante.lenguaMaterna,
            estudiante.tipoDiscapacidad ?? null,
          ],
        );

        const estudianteId = insertEstudiante.insertId;
        const academico = estudiante.academico || {};

        await tx.query(
          `INSERT INTO ministerio_estudiante_academico (
            estudiante_id, notas, asistencia_porcentaje, promocion_estado
          ) VALUES (?, ?, ?, ?)`,
          [
            estudianteId,
            normalizeNotas(academico.notas),
            normalizeAsistencia(academico.asistencia),
            academico.promocion ?? null,
          ],
        );

        estudiantesInsertados.push({
          ...estudiante,
          codigoEstudiante,
          fechaNacimiento,
        });
      }

      return {
        institucionId,
        personal: personalInsertados,
        estudiantes: estudiantesInsertados,
      };
    });

    res.status(201).json({
      codigoModular,
      institucionId: result.institucionId,
      personal: result.personal,
      estudiantes: result.estudiantes,
    });
  }),
);

app.put(
  '/ministerio/forms/:codigo',
  ensureAdmin,
  validator(updateMinistryFormSchema),
  asyncHandler(async (req, res) => {
    const { codigo } = req.params;
    const { institucion, personal, estudiantes } = req.body;

    const [existing] = await db.query(
      'SELECT id FROM ministerio_instituciones WHERE codigo_modular = ? LIMIT 1',
      [codigo],
      { tag: 'registry.forms.findByCodigo' },
    );

    if (!existing) {
      return res.status(404).json({ error: 'Formulario no encontrado' });
    }

    await db.transaction(async (tx) => {
      if (institucion) {
        await tx.query(
          `UPDATE ministerio_instituciones
             SET nombre = ?, tipo_gestion = ?, nivel_educativo = ?, turno = ?, direccion = ?, ugel = ?, updated_at = NOW()
           WHERE id = ?`,
          [
            institucion.nombre,
            institucion.tipoGestion,
            institucion.nivelEducativo,
            institucion.turno,
            institucion.direccion,
            institucion.ugel,
            existing.id,
          ],
        );
      }

      if (Array.isArray(personal)) {
        await tx.query('DELETE FROM ministerio_personal WHERE institucion_id = ?', [existing.id]);
        for (const persona of personal) {
          const codigoPersonal = await generateUniqueCode({ key: 'personal', prefix: 'PER', tx });
          await tx.query(
            `INSERT INTO ministerio_personal (
              institucion_id, codigo_personal, nombre, dni, cargo, especialidad, condicion_laboral
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              existing.id,
              codigoPersonal,
              persona.nombre,
              persona.dni,
              persona.cargo,
              persona.especialidad ?? null,
              persona.condicionLaboral ?? null,
            ],
          );
        }
      }

      if (Array.isArray(estudiantes)) {
        await tx.query('DELETE FROM ministerio_estudiantes WHERE institucion_id = ?', [existing.id]);
        for (const estudiante of estudiantes) {
          const codigoEstudiante = await generateUniqueCode({ key: 'student', prefix: 'EST', tx });
          const fechaNacimiento = normalizeDate(estudiante.fechaNacimiento);

          const insertEstudiante = await tx.query(
            `INSERT INTO ministerio_estudiantes (
              institucion_id, codigo_estudiante, nombre_completo, dni, sexo, fecha_nacimiento, grado, seccion,
              anio_academico, situacion_matricula, lengua_materna, tipo_discapacidad
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              existing.id,
              codigoEstudiante,
              estudiante.nombreCompleto,
              estudiante.dni,
              estudiante.sexo,
              fechaNacimiento,
              estudiante.grado,
              estudiante.seccion,
              estudiante.anioAcademico,
              estudiante.situacionMatricula,
              estudiante.lenguaMaterna,
              estudiante.tipoDiscapacidad ?? null,
            ],
          );

          const estudianteId = insertEstudiante.insertId;
          const academico = estudiante.academico || {};

          await tx.query(
            `INSERT INTO ministerio_estudiante_academico (
              estudiante_id, notas, asistencia_porcentaje, promocion_estado
            ) VALUES (?, ?, ?, ?)`,
            [
              estudianteId,
              normalizeNotas(academico.notas),
              normalizeAsistencia(academico.asistencia),
              academico.promocion ?? null,
            ],
          );
        }
      }
    });

    res.json({ message: 'Formulario actualizado correctamente', codigoModular: codigo });
  }),
);

const buildInstitutionPayload = ({ instituciones, personal, estudiantes }) => {
  const personalByInstitution = personal.reduce((acc, item) => {
    const key = item.institucion_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push({
      codigoPersonal: item.codigo_personal,
      nombre: item.nombre,
      dni: item.dni,
      cargo: item.cargo,
      especialidad: item.especialidad,
      condicionLaboral: item.condicion_laboral,
    });
    return acc;
  }, {});

  const estudiantesByInstitution = estudiantes.reduce((acc, item) => {
    const key = item.institucion_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push({
      codigoEstudiante: item.codigo_estudiante,
      nombreCompleto: item.nombre_completo,
      dni: item.dni,
      sexo: item.sexo,
      fechaNacimiento: item.fecha_nacimiento,
      grado: item.grado,
      seccion: item.seccion,
      anioAcademico: item.anio_academico,
      situacionMatricula: item.situacion_matricula,
      lenguaMaterna: item.lengua_materna,
      tipoDiscapacidad: item.tipo_discapacidad,
      academico: mapAcademicRecord(item),
    });
    return acc;
  }, {});

  return instituciones.map((inst) => ({
    codigoModular: inst.codigo_modular,
    institucion: {
      nombre: inst.nombre,
      tipoGestion: inst.tipo_gestion,
      nivelEducativo: inst.nivel_educativo,
      turno: inst.turno,
      direccion: inst.direccion,
      ugel: inst.ugel,
      createdAt: inst.created_at,
      updatedAt: inst.updated_at,
    },
    personal: personalByInstitution[inst.id] || [],
    estudiantes: estudiantesByInstitution[inst.id] || [],
  }));
};

/* ===================== Sistema de Reportes PDF ===================== */

const REPORT_MODULES = {
  usuarios: {
    name: 'Usuarios',
    endpoint: 'http://localhost:3002/usuarios',
    headers: (token) => ({ Authorization: `Bearer ${token}` }),
    dataKey: null,
    columns: [
      { key: 'id', label: 'ID', width: 40 },
      { key: 'nombre', label: 'Nombre', width: 120 },
      { key: 'email', label: 'Email', width: 150 },
      { key: 'rol', label: 'Rol', width: 80 },
      { key: 'estado', label: 'Estado', width: 60 },
    ],
    roleColors: {
      admin: '#e74c3c',
      profesor: '#3498db',
      estudiante: '#2ecc71',
      administrativo: '#9b59b6',
    },
  },
  asistencias: {
    name: 'Asistencias',
    endpoint: 'http://localhost:3003/attendances',
    headers: (token) => ({ Authorization: `Bearer ${token}` }),
    dataKey: null,
    columns: [
      { key: 'id', label: 'ID', width: 40 },
      { key: 'student_id', label: 'ID Estudiante', width: 90 },
      { key: 'class_id', label: 'ID Clase', width: 70 },
      { key: 'date', label: 'Fecha', width: 80 },
      { key: 'status', label: 'Estado', width: 70 },
      { key: 'notes', label: 'Notas', width: 100 },
    ],
  },
  calificaciones: {
    name: 'Calificaciones',
    endpoint: 'http://localhost:3004/grades',
    headers: (token) => ({ Authorization: `Bearer ${token}` }),
    dataKey: null,
    columns: [
      { key: 'id', label: 'ID', width: 40 },
      { key: 'student_id', label: 'ID Estudiante', width: 90 },
      { key: 'assignment_id', label: 'ID Asignación', width: 90 },
      { key: 'score', label: 'Nota', width: 50 },
      { key: 'feedback', label: 'Retroalimentación', width: 150 },
    ],
  },
  clases: {
    name: 'Clases',
    endpoint: 'http://localhost:3005/materias',
    headers: (token) => ({ Authorization: `Bearer ${token}` }),
    dataKey: null,
    columns: [
      { key: 'id', label: 'ID', width: 40 },
      { key: 'nombre', label: 'Nombre', width: 150 },
      { key: 'descripcion', label: 'Descripción', width: 200 },
    ],
  },
  asignaciones: {
    name: 'Asignaciones',
    endpoint: 'http://localhost:3007/asignaciones',
    headers: (token) => ({ Authorization: `Bearer ${token}` }),
    dataKey: null,
    columns: [
      { key: 'id', label: 'ID', width: 40 },
      { key: 'student_id', label: 'ID Estudiante', width: 90 },
      { key: 'class_id', label: 'ID Clase', width: 70 },
      { key: 'assignment_date', label: 'Fecha Asignación', width: 100 },
    ],
  },
};

async function fetchReportModuleData({ moduleKey, token, throwOnError = false }) {
  const moduleConfig = REPORT_MODULES[moduleKey];

  if (!moduleConfig) {
    const error = new Error('Módulo no válido');
    error.status = 400;
    error.availableModules = Object.keys(REPORT_MODULES);
    throw error;
  }

  if (!token) {
    const error = new Error('Token no proporcionado');
    error.status = 401;
    throw error;
  }

  let data = [];

  try {
    const response = await axios.get(moduleConfig.endpoint, {
      headers: typeof moduleConfig.headers === 'function'
        ? moduleConfig.headers(token)
        : moduleConfig.headers,
    });

    const payload = moduleConfig.dataKey
      ? response.data?.[moduleConfig.dataKey]
      : response.data;

    data = Array.isArray(payload) ? payload : [];
  } catch (error) {
    logger.error(
      { error: error.message, module: moduleKey },
      'Error al obtener datos para reporte',
    );

    if (throwOnError) {
      const status = error?.response?.status || 502;
      const message =
        error?.response?.data?.error || 'No fue posible obtener datos del módulo solicitado';
      const requestError = new Error(message);
      requestError.status = status;
      throw requestError;
    }

    data = [];
  }

  return { moduleConfig, data };
}

function addInstitutionalHeader(doc, title, logoPath) {
  const logoY = 40;

  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 50, logoY, { width: 100, height: 100 });
  }

  doc.fontSize(16)
    .font('Helvetica-Bold')
    .fillColor('#2c3e50')
    .text('I.E. N.º 7213 Peruano Japonés', 165, logoY);

  doc.fontSize(8).font('Helvetica').fillColor('#34495e');

  const infoLines = [
    'Código Modular: 0874198',
    'RUC: 20503217032',
    'Nivel: Primaria y Secundaria',
    'Tipo de gestión: Pública (Gobierno)',
    'UGEL: N.º 01 - San Juan de Miraflores (Lima Metropolitana)',
    'Dirección: Av. 200 Millas s/n, Urbanización Pachacámac (IV Etapa / Sector 1)',
    'Distrito: Villa El Salvador, Lima, Perú',
    'Teléfono: (01) 293-4417',
    'Correo electrónico: japones7213@hotmail.com',
    'Referencia: Cerca al Parque Pachacámac, zona sur de Villa El Salvador',
  ];

  let infoY = logoY + 20;
  const textOptions = { width: 360, lineGap: 1 };

  infoLines.forEach((line) => {
    doc.text(line, 165, infoY, textOptions);
    infoY = doc.y + 4;
  });

  doc.fontSize(14)
    .font('Helvetica-Bold')
    .fillColor('#2c3e50')
    .text(`Reporte: ${title}`, 50, Math.max(infoY + 15, logoY + 120));

  return Math.max(infoY + 45, logoY + 150);
}

function addReportMetadata(doc, y, totalRecords, generatedBy) {
  const now = new Date();
  const fecha = now.toLocaleDateString('es-PE');
  const hora = now.toLocaleTimeString('es-PE');

  doc.fontSize(9)
    .font('Helvetica')
    .fillColor('#7f8c8d')
    .text(`Fecha: ${fecha}`, 50, y)
    .text(`Hora: ${hora}`, 200, y)
    .text(`Total de registros: ${totalRecords}`, 350, y);

  doc.fontSize(8)
    .font('Helvetica-Oblique')
    .fillColor('#95a5a6')
    .text(`Generado por: ${generatedBy.nombre} (${generatedBy.rol})`, 50, y + 15);

  return y + 35;
}

function drawTableRow(doc, y, columns, data, options = {}) {
  const { isHeader = false, bgColor = null, textColor = '#2c3e50' } = options;
  let x = 50;
  const rowHeight = 25;

  if (bgColor) {
    doc.rect(50, y, 500, rowHeight).fill(bgColor);
  }

  doc.fillColor(textColor);
  doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica');
  doc.fontSize(isHeader ? 10 : 9);

  columns.forEach((col) => {
    const value = isHeader ? col.label : (data[col.key] ?? '-');
    const text = String(value).substring(0, 30);
    doc.text(text, x, y + 7, { width: col.width - 5, ellipsis: true });
    x += col.width;
  });

  return y + rowHeight;
}

function streamModuleReportPdf({
  res,
  moduleKey,
  moduleConfig,
  data,
  generatedBy,
  filename,
  title,
}) {
  const pdfTitle = title || moduleConfig.name || 'Reporte';
  const rawFilename = filename || `${slugify(`${pdfTitle}-${Date.now()}`)}.pdf`;
  const finalFilename = rawFilename.toLowerCase().endsWith('.pdf')
    ? rawFilename
    : `${rawFilename}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${finalFilename}"`);

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
  });

  doc.pipe(res);

  const logoPath = path.join(__dirname, '../../frontend/public/logo.png');
  let currentY = addInstitutionalHeader(doc, pdfTitle, logoPath);

  currentY = addReportMetadata(doc, currentY, data.length, generatedBy);

  doc.moveTo(50, currentY).lineTo(550, currentY).stroke('#bdc3c7');
  currentY += 15;

  currentY = drawTableRow(doc, currentY, moduleConfig.columns, {}, {
    isHeader: true,
    bgColor: '#2c3e50',
    textColor: '#ffffff',
  });

  data.forEach((item, index) => {
    if (currentY > 700) {
      doc.addPage();
      currentY = 50;

      currentY = drawTableRow(doc, currentY, moduleConfig.columns, {}, {
        isHeader: true,
        bgColor: '#2c3e50',
        textColor: '#ffffff',
      });
    }

    const bgColor = index % 2 === 0 ? '#ecf0f1' : '#ffffff';
    let textColor = '#2c3e50';

    if (moduleKey === 'usuarios' && item.rol && moduleConfig.roleColors) {
      textColor = moduleConfig.roleColors[item.rol] || '#2c3e50';
    }

    currentY = drawTableRow(doc, currentY, moduleConfig.columns, item, {
      bgColor,
      textColor,
    });
  });

  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i += 1) {
    doc.switchToPage(i);
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#95a5a6')
      .text(`Página ${i + 1} de ${pageCount}`, 50, doc.page.height - 50, {
        align: 'center',
      });
  }

  doc.end();
}

app.get(
  '/api/reports/:module.pdf',
  ensureAuthenticated,
  ensureAdmin,
  asyncHandler(async (req, res) => {
    const { module } = req.params;
    const token = req.headers.authorization?.split(' ')[1];

    try {
      const { moduleConfig, data } = await fetchReportModuleData({ moduleKey: module, token });

      const generatedBy = {
        nombre: req.user?.nombre || req.user?.email || 'Usuario del sistema',
        rol: req.user?.rol || 'Administrador',
      };

      const timestamp = new Date().toISOString().slice(0, 10);
      const filenameBase = slugify(`reporte-${module}-${timestamp}`, 'reporte');

      streamModuleReportPdf({
        res,
        moduleKey: module,
        moduleConfig,
        data,
        generatedBy,
        filename: `${filenameBase}.pdf`,
      });
    } catch (error) {
      const status = error.status || 500;
      const responseBody = {
        error: error.message || 'Error generando reporte PDF',
      };

      if (error.availableModules) {
        responseBody.availableModules = error.availableModules;
      }

      res.status(status).json(responseBody);
    }
  }),
);

app.get(
  '/api/reports/asistencias/docente.pdf',
  ensureAuthenticated,
  ensureAdminOrTeacher,
  asyncHandler(async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    try {
      const { moduleConfig, data } = await fetchReportModuleData({
        moduleKey: 'asistencias',
        token,
        throwOnError: true,
      });

      const roleLabel = req.user?.rol || 'Docente';
      const generatedBy = {
        nombre: req.user?.nombre || req.user?.email || 'Usuario del sistema',
        rol: roleLabel,
      };

      const timestamp = new Date().toISOString().slice(0, 10);
      const filenameBase = slugify(`asistencias-${roleLabel}-${timestamp}`, 'reporte-asistencias');

      streamModuleReportPdf({
        res,
        moduleKey: 'asistencias',
        moduleConfig,
        data,
        generatedBy,
        filename: `${filenameBase}.pdf`,
        title: 'Reporte de Asistencias',
      });
    } catch (error) {
      const status = error.status || 500;
      const message = error.message || 'No fue posible generar el reporte de asistencias';
      res.status(status).json({ error: message });
    }
  }),
);

app.get(
  '/api/reports/asistencias/raw',
  ensureAuthenticated,
  ensureAdminOrTeacher,
  asyncHandler(async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    try {
      const { moduleConfig, data } = await fetchReportModuleData({
        moduleKey: 'asistencias',
        token,
        throwOnError: true,
      });

      res.json({
        module: moduleConfig.name,
        columns: moduleConfig.columns.map(({ key, label, width }) => ({ key, label, width })),
        rows: data,
        count: data.length,
        generatedAt: new Date().toISOString(),
        generatedBy: {
          nombre: req.user?.nombre || req.user?.email || 'Usuario del sistema',
          rol: req.user?.rol || 'Docente',
        },
      });
    } catch (error) {
      const status = error.status || 500;
      const message = error.message || 'No fue posible obtener los datos de asistencias';
      res.status(status).json({ error: message });
    }
  }),
);

app.get(
  '/api/reports/examenes/:examenId.pdf',
  ensureAuthenticated,
  ensureAdminOrTeacher,
  asyncHandler(async (req, res) => {
    const { examenId } = req.params;
    const numericId = Number(examenId);

    if (!numericId) {
      return res.status(400).json({ error: 'Identificador de examen inválido' });
    }

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    let detail;
    try {
      const response = await axios.get(`http://localhost:3004/examenes/${numericId}/detalle`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      detail = response.data;
    } catch (error) {
      const status = error?.response?.status || 500;
      const message = error?.response?.data?.error || 'No fue posible obtener los datos del examen';
      logger.error({ examenId: numericId, error: error.message }, 'Error consultando calificaciones de examen');
      return res.status(status).json({ error: message });
    }

    const examInfo = detail?.examen || {};
    const participantes = Array.isArray(detail?.participantes) ? detail.participantes : [];
    const promedio = detail?.promedio != null && !Number.isNaN(Number(detail.promedio))
      ? Number(detail.promedio).toFixed(2)
      : '—';
    const totalEvaluados = detail?.totalEvaluados != null ? Number(detail.totalEvaluados) : 0;
    const totalInscritos = detail?.totalInscritos != null ? Number(detail.totalInscritos) : participantes.length;

    const fileBase = slugify(`${examInfo.nombre || 'examen'}-${examInfo.fecha || numericId}`, 'calificaciones-examen');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileBase}.pdf"`);

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });
    doc.pipe(res);

    const logoPath = path.join(__dirname, '../../frontend/public/logo.png');
    let currentY = addInstitutionalHeader(doc, 'Calificaciones de examen', logoPath);

    const generatedBy = {
      nombre: req.user?.nombre || req.user?.email || 'Usuario del sistema',
      rol: req.user?.rol || 'Docente',
    };
    currentY = addReportMetadata(doc, currentY, participantes.length, generatedBy);

    doc.moveTo(50, currentY).lineTo(550, currentY).stroke('#bdc3c7');
    currentY += 18;

    doc.font('Helvetica-Bold').fontSize(12).fillColor('#2c3e50');
    doc.text(examInfo.nombre || 'Examen sin nombre', 50, currentY);
    currentY += 16;

    doc.font('Helvetica').fontSize(10).fillColor('#34495e');
    doc.text(`Fecha: ${formatReadableDate(examInfo.fecha)}`, 50, currentY);
    currentY += 14;
    doc.text(`Curso: ${examInfo.curso_nombre || '—'}`, 50, currentY);
    currentY += 14;
    doc.text(`Promedio general: ${promedio}`, 50, currentY);
    currentY += 14;
    doc.text(`Calificaciones registradas: ${totalEvaluados} de ${totalInscritos}`, 50, currentY);
    currentY += 20;

    const columns = [
      { key: 'nombre', label: 'Estudiante', width: 220 },
      { key: 'email', label: 'Correo', width: 140 },
      { key: 'nota', label: 'Nota', width: 60 },
      { key: 'estado', label: 'Estado', width: 80 },
    ];

    currentY = drawTableRow(doc, currentY, columns, {}, {
      isHeader: true,
      bgColor: '#2c3e50',
      textColor: '#ffffff',
    });

    participantes.forEach((participante, index) => {
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
        currentY = drawTableRow(doc, currentY, columns, {}, {
          isHeader: true,
          bgColor: '#2c3e50',
          textColor: '#ffffff',
        });
      }

      const row = {
        nombre: participante.nombre || 'Estudiante sin nombre',
        email: participante.email || '—',
        nota:
          participante.nota != null && !Number.isNaN(Number(participante.nota))
            ? Number(participante.nota).toFixed(2)
            : '—',
        estado: participante.estado ? participante.estado.toUpperCase() : 'PENDIENTE',
      };

      const bgColor = index % 2 === 0 ? '#ecf0f1' : '#ffffff';
      currentY = drawTableRow(doc, currentY, columns, row, { bgColor });
    });

    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i += 1) {
      doc.switchToPage(i);
      doc.fontSize(8)
        .font('Helvetica')
        .fillColor('#95a5a6')
        .text(`Página ${i + 1} de ${pageCount}`, 50, doc.page.height - 50, { align: 'center' });
    }

    doc.end();
  }),
);

app.get(
  '/api/reports/modules',
  ensureAuthenticated,
  ensureAdmin,
  asyncHandler(async (req, res) => {
    const modules = Object.keys(REPORT_MODULES).map((key) => ({
      id: key,
      name: REPORT_MODULES[key].name,
      endpoint: `/api/reports/${key}.pdf`,
    }));

    res.json({ modules });
  }),
);

app.get(
  '/ministerio/forms',
  ensureAdmin,
  asyncHandler(async (req, res) => {
    const instituciones = await db.query('SELECT * FROM ministerio_instituciones ORDER BY created_at DESC');
    if (!instituciones.length) {
      return res.json([]);
    }

    const institucionIds = instituciones.map((inst) => inst.id);

    const personal = await db.query(
      `SELECT * FROM ministerio_personal WHERE institucion_id IN (${institucionIds.map(() => '?').join(',')})`,
      institucionIds,
    );

    const estudiantes = await db.query(
      `SELECT e.*, a.notas, a.asistencia_porcentaje, a.promocion_estado
         FROM ministerio_estudiantes e
         LEFT JOIN ministerio_estudiante_academico a ON a.estudiante_id = e.id
        WHERE e.institucion_id IN (${institucionIds.map(() => '?').join(',')})`,
      institucionIds,
    );

    res.json(buildInstitutionPayload({ instituciones, personal, estudiantes }));
  }),
);

app.get(
  '/ministerio/forms/:codigo',
  ensureAdmin,
  asyncHandler(async (req, res) => {
    const { codigo } = req.params;

    const instituciones = await db.query(
      'SELECT * FROM ministerio_instituciones WHERE codigo_modular = ? LIMIT 1',
      [codigo],
    );

    if (!instituciones.length) {
      return res.status(404).json({ error: 'Formulario no encontrado' });
    }

    const institucion = instituciones[0];

    const personal = await db.query(
      'SELECT * FROM ministerio_personal WHERE institucion_id = ?',
      [institucion.id],
    );

    const estudiantes = await db.query(
      `SELECT e.*, a.notas, a.asistencia_porcentaje, a.promocion_estado
         FROM ministerio_estudiantes e
         LEFT JOIN ministerio_estudiante_academico a ON a.estudiante_id = e.id
        WHERE e.institucion_id = ?`,
      [institucion.id],
    );

    const payload = buildInstitutionPayload({
      instituciones: [institucion],
      personal,
      estudiantes,
    });

    res.json(payload[0]);
  }),
);

app.post(
  '/students/internal-form',
  ensureStudent,
  validator(internalFormSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const [existing] = await db.query(
      'SELECT codigo_interno FROM student_internal_forms WHERE user_id = ? LIMIT 1',
      [userId],
    );

    const codigoInterno = existing?.codigo_interno || await generateUniqueCode({ key: 'internal', prefix: 'FIC' });

    await db.query(
      `INSERT INTO student_internal_forms (
        user_id, codigo_interno, dni, nombres, apellidos, telefono, correo, direccion,
        familiar_nombre, familiar_relacion, familiar_ocupacion, familiar_telefono, familiar_correo,
        tipo_sangre, alergias, enfermedades_cronicas, seguro_medico, persona_autorizada, telefono_emergencia
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        dni = VALUES(dni),
        nombres = VALUES(nombres),
        apellidos = VALUES(apellidos),
        telefono = VALUES(telefono),
        correo = VALUES(correo),
        direccion = VALUES(direccion),
        familiar_nombre = VALUES(familiar_nombre),
        familiar_relacion = VALUES(familiar_relacion),
        familiar_ocupacion = VALUES(familiar_ocupacion),
        familiar_telefono = VALUES(familiar_telefono),
        familiar_correo = VALUES(familiar_correo),
        tipo_sangre = VALUES(tipo_sangre),
        alergias = VALUES(alergias),
        enfermedades_cronicas = VALUES(enfermedades_cronicas),
        seguro_medico = VALUES(seguro_medico),
        persona_autorizada = VALUES(persona_autorizada),
        telefono_emergencia = VALUES(telefono_emergencia),
        updated_at = NOW()`,
      [
        userId,
        codigoInterno,
        req.body.dni,
        req.body.nombres,
        req.body.apellidos,
        req.body.telefono,
        req.body.correo ?? null,
        req.body.direccion,
        req.body.familiarNombre,
        req.body.familiarRelacion,
        req.body.familiarOcupacion ?? null,
        req.body.familiarTelefono,
        req.body.familiarCorreo ?? null,
        req.body.tipoSangre,
        req.body.alergias ?? null,
        req.body.enfermedadesCronicas ?? null,
        req.body.seguroMedico ?? null,
        req.body.personaAutorizada,
        req.body.telefonoEmergencia,
      ],
    );

    res.json({
      codigoInterno,
      message: existing ? 'Ficha actualizada correctamente' : 'Ficha creada correctamente',
    });
  }),
);

// Admin: obtener ficha interna de cualquier usuario por id
// Admin: crear/actualizar ficha interna para cualquier usuario (por ejemplo desde panel administrativo)

app.get(
  '/students/internal-form/me',
  ensureStudent,
  asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const [record] = await db.query(
      'SELECT * FROM student_internal_forms WHERE user_id = ? LIMIT 1',
      [userId],
    );

    if (!record) {
      return res.json(null);
    }

    res.json({
      codigoInterno: record.codigo_interno,
      dni: record.dni,
      nombres: record.nombres,
      apellidos: record.apellidos,
      telefono: record.telefono,
      correo: record.correo,
      direccion: record.direccion,
      familiarNombre: record.familiar_nombre,
      familiarRelacion: record.familiar_relacion,
      familiarOcupacion: record.familiar_ocupacion,
      familiarTelefono: record.familiar_telefono,
      familiarCorreo: record.familiar_correo,
      tipoSangre: record.tipo_sangre,
      alergias: record.alergias,
      enfermedadesCronicas: record.enfermedades_cronicas,
      seguroMedico: record.seguro_medico,
      personaAutorizada: record.persona_autorizada,
      telefonoEmergencia: record.telefono_emergencia,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    });
  }),
);

app.use(errorHandler(logger));

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'Registry Service en ejecución');
});
