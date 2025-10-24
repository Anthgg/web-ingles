const express = require('express');
const cors = require('cors');
const { str } = require('envalid');
const crypto = require('node:crypto');
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

const SECRET_KEY =
  config.get('REGISTRY_JWT_SECRET') ||
  config.get('AUTH_JWT_SECRET') ||
  env.JWT_SECRET;

const DNI_API_URL = config.get('REGISTRY_DNI_API_URL');
const DNI_API_TOKEN = config.get('REGISTRY_DNI_API_TOKEN');
const DNI_APISPERU_TOKEN = config.get('REGISTRY_DNI_APISPERU_TOKEN');
const DNI_APISNETPE_TOKEN = config.get('REGISTRY_DNI_APISNETPE_TOKEN');
const DNI_APIPERUDEV_TOKEN = config.get('REGISTRY_DNI_APIPERUDEV_TOKEN');
const DNI_ENABLE_FALLBACK = (config.get('REGISTRY_DNI_ENABLE_FALLBACK') || 'true').toString().toLowerCase() !== 'false';
const DNI_FAKE_ON_FAIL = (config.get('REGISTRY_DNI_FAKE_ON_FAIL') || 'true').toString().toLowerCase() !== 'false';

if (!SECRET_KEY) {
  logger.warn('JWT_SECRET no configurado: los endpoints protegidos fallarán al validar tokens.');
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
