const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');
const { str, num } = require('envalid');
const { createConfig } = require('../config');
const { setupExamenesRoutes } = require('./examenes-routes');

const app = express();

const config = createConfig({
  serviceName: 'grades-service',
  serviceRoot: __dirname,
  overrides: {
    GRADES_SECRET_KEY: str({ default: '' }),
    ASSIGNATION_DB_HOST: str({ default: '' }),
    ASSIGNATION_DB_USER: str({ default: '' }),
    ASSIGNATION_DB_PASSWORD: str({ default: '' }),
    ASSIGNATION_DB_NAME: str({ default: 'instenglish_asignation' }),
    ASSIGNATION_DB_PORT: num({ default: 3306 }),
    ASSIGNATION_DB_POOL_SIZE: num({ default: 10 }),
    CLASSES_DB_HOST: str({ default: '' }),
    CLASSES_DB_USER: str({ default: '' }),
    CLASSES_DB_PASSWORD: str({ default: '' }),
    CLASSES_DB_NAME: str({ default: 'instenglish_classes' }),
    CLASSES_DB_PORT: num({ default: 3306 }),
    CLASSES_DB_POOL_SIZE: num({ default: 10 }),
    AUTH_DB_HOST: str({ default: '' }),
    AUTH_DB_USER: str({ default: '' }),
    AUTH_DB_PASSWORD: str({ default: '' }),
    AUTH_DB_NAME: str({ default: 'instenglish_auth' }),
    AUTH_DB_PORT: num({ default: 3306 }),
    AUTH_DB_POOL_SIZE: num({ default: 10 }),
  },
  defaults: {
    DB_NAME: 'instenglish_grades',
    PORT: 3004,
  },
});

const { env, corsOrigins } = config;

app.use(
  cors({ origin: corsOrigins.length ? corsOrigins : true, credentials: true })
);
app.use(express.json());

let cachedJwtSecret;
const resolveJwtSecret = () => {
  if (cachedJwtSecret) {
    return cachedJwtSecret;
  }

  const candidates = [
    config.get('GRADES_SECRET_KEY'),
    env.JWT_SECRET,
  ]
    .map((value) => (typeof value === 'string' ? value.trim() : value))
    .filter(Boolean);

  const unique = [...new Set(candidates)];

  if (!unique.length) {
    throw new Error('JWT_SECRET no configurado. Define una clave compartida para todos los servicios.');
  }

  if (unique.length > 1) {
    throw new Error('GRADES_SECRET_KEY y JWT_SECRET no coinciden. Usa un solo secreto compartido.');
  }

  cachedJwtSecret = unique[0];
  return cachedJwtSecret;
};

let SECRET_KEY;
try {
  SECRET_KEY = resolveJwtSecret();
} catch (error) {
  console.error('JWT configuration error:', error.message);
  process.exit(1);
}

const pool = mysql.createPool({
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  port: env.DB_PORT,
  waitForConnections: true,
  connectionLimit: env.DB_POOL_SIZE,
  queueLimit: 0,
});

const classesPool = mysql.createPool({
  host: env.CLASSES_DB_HOST || env.DB_HOST,
  user: env.CLASSES_DB_USER || env.DB_USER,
  password: env.CLASSES_DB_PASSWORD || env.DB_PASSWORD,
  database: env.CLASSES_DB_NAME,
  port: env.CLASSES_DB_PORT || env.DB_PORT,
  waitForConnections: true,
  connectionLimit: env.CLASSES_DB_POOL_SIZE || env.DB_POOL_SIZE,
  queueLimit: 0,
});

const usersPool = mysql.createPool({
  host: env.AUTH_DB_HOST || env.DB_HOST,
  user: env.AUTH_DB_USER || env.DB_USER,
  password: env.AUTH_DB_PASSWORD || env.DB_PASSWORD,
  database: env.AUTH_DB_NAME,
  port: env.AUTH_DB_PORT || env.DB_PORT,
  waitForConnections: true,
  connectionLimit: env.AUTH_DB_POOL_SIZE || env.DB_POOL_SIZE,
  queueLimit: 0,
});

const stripDiacritics = (value) =>
  typeof value === 'string'
    ? value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
    : value;

const normalizeLevelKey = (value) =>
  typeof value === 'string' ? stripDiacritics(value).toLowerCase() : value;

const buildClassroomLevelMetadata = (allowedLevels) => {
  const allowedSet = new Set(allowedLevels);
  const normalizedAllowedMap = new Map(
    allowedLevels.map((level) => [normalizeLevelKey(level), level])
  );

  const synonymsMap = new Map();
  const directCanonicalFor = (value) => {
    if (!value) return null;
    const normalized = normalizeLevelKey(value);
    return normalizedAllowedMap.get(normalized) || null;
  };

  const pushSynonyms = (target, synonyms) => {
    const canonicalTarget = directCanonicalFor(target);
    if (!canonicalTarget) return;
    synonyms.forEach((syn) => {
      const key = normalizeLevelKey(syn);
      if (key) {
        synonymsMap.set(key, canonicalTarget);
      }
    });
  };

  pushSynonyms('Inicial', ['Inicial', 'Preescolar', 'Pre escolar', 'Kinder', 'Kindergarten', 'Prekinder', 'Pre-kinder']);
  pushSynonyms('Primaria', ['Primaria', 'Primario', 'Elementary']);
  pushSynonyms('Secundaria', ['Secundaria', 'Media', 'Bachillerato', 'Highschool', 'High School']);
  pushSynonyms('Basico', ['Basico', 'Básico', 'Basic', 'Fundamental']);
  pushSynonyms('Intermedio', ['Intermedio', 'Medio', 'Intermediate']);
  pushSynonyms('Avanzado', ['Avanzado', 'Advanced', 'Superior']);

  const canonicalFor = (value) => {
    if (!value) return null;
    const normalized = normalizeLevelKey(value);
    if (normalizedAllowedMap.has(normalized)) {
      return normalizedAllowedMap.get(normalized);
    }
    if (synonymsMap.has(normalized)) {
      return synonymsMap.get(normalized);
    }
    return null;
  };

  return { allowedLevels, allowedSet, normalizedAllowedMap, synonymsMap, canonicalFor };
};

let classroomLevelMetadataPromise = null;

const getClassroomLevelMetadata = async () => {
  if (classroomLevelMetadataPromise) {
    return classroomLevelMetadataPromise;
  }

  classroomLevelMetadataPromise = (async () => {
    const dbName = env.CLASSES_DB_NAME || env.DB_NAME;
    const fallbackLevels = ['Inicial', 'Primaria', 'Secundaria', 'Basico', 'Intermedio', 'Avanzado'];

    try {
      const [[row]] = await classesPool.query(
        `SELECT COLUMN_TYPE AS columnType
           FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = ?
            AND TABLE_NAME = 'classrooms'
            AND COLUMN_NAME = 'level'
          LIMIT 1`,
        [dbName]
      );

      const columnType = row?.columnType || row?.COLUMN_TYPE || '';
      const enumMatch = columnType.match(/^enum\((.*)\)$/i);
      const extracted = enumMatch
        ? enumMatch[1]
            .split(',')
            .map((item) => item.trim().replace(/^'(.*)'$/, '$1'))
            .filter(Boolean)
        : [];

      const allowedLevels = extracted.length ? extracted : fallbackLevels;
      return buildClassroomLevelMetadata(allowedLevels);
    } catch (error) {
      console.warn('No fue posible cargar metadata de niveles de aulas:', error.message);
      return buildClassroomLevelMetadata(fallbackLevels);
    }
  })();

  return classroomLevelMetadataPromise;
};

// Helper: resolve or create classroom_id from level/grade_number/section
const resolveOrCreateClassroom = async ({ classroom_id, level, grade_number, section }) => {
  if (classroom_id) return classroom_id;

  const rawLevel = typeof level === 'string' ? level.trim() : level;
  const resolvedGrade = grade_number != null && grade_number !== '' ? Number(grade_number) : null;
  const resolvedSection = typeof section === 'string' ? section.trim().toUpperCase() : section;

  if (!rawLevel || resolvedGrade === null || Number.isNaN(resolvedGrade) || !resolvedSection) {
    const err = new Error('classroom_id o level/grade_number/section requeridos');
    err.status = 400;
    throw err;
  }

  const normalizeLevel = (value) => {
    if (!value) return null;
    const lower = value.toLowerCase();
    if (lower.includes('inicial')) return 'Inicial';
    if (lower.includes('primaria')) return 'Primaria';
    if (lower.includes('secundaria')) return 'Secundaria';
    return value;
  };

  const baseLevel = normalizeLevel(rawLevel);
  const rawCandidates = [
    rawLevel,
    baseLevel,
    typeof baseLevel === 'string' ? baseLevel.toUpperCase() : null,
    typeof baseLevel === 'string' ? baseLevel.toLowerCase() : null,
    typeof baseLevel === 'string'
      ? baseLevel
          .toLowerCase()
          .replace(/(^|\s)\S/g, (t) => t.toUpperCase())
      : null,
  ].filter(Boolean);

  const candidateLevels = Array.from(new Set(rawCandidates));

  const metadata = await getClassroomLevelMetadata();
  const toAllowedLevel = (value) => metadata.canonicalFor(value);

  const canonicalLevels = Array.from(
    new Set(candidateLevels.map((candidate) => toAllowedLevel(candidate)).filter(Boolean))
  );

  if (!canonicalLevels.length) {
    const err = new Error(
      `Nivel de aula no reconocido: "${rawLevel}". Niveles permitidos: ${metadata.allowedLevels.join(', ')}`
    );
    err.status = 400;
    err.code = 'CLASSROOM_LEVEL_UNSUPPORTED';
    throw err;
  }

  const searchLevels = Array.from(new Set([...canonicalLevels, ...candidateLevels]));

  const conn = await classesPool.getConnection();
  try {
    for (const candidate of searchLevels) {
      const [[row]] = await conn.query(
        'SELECT id FROM classrooms WHERE level = ? AND grade_number = ? AND section = ? LIMIT 1',
        [candidate, resolvedGrade, resolvedSection]
      );
      if (row && row.id) {
        return row.id;
      }
    }

    let lastError = null;
    for (const candidate of canonicalLevels) {
      try {
        const [res] = await conn.query(
          'INSERT INTO classrooms(level, grade_number, section) VALUES (?,?,?)',
          [candidate, resolvedGrade, resolvedSection]
        );
        return res.insertId;
      } catch (error) {
        lastError = error;
        if (!/Data truncated for column 'level'/i.test(error.message)) {
          throw error;
        }
      }
    }

    throw lastError || new Error('No fue posible crear el registro de aula');
  } finally {
    conn.release();
  }
};

const assignationPool = mysql.createPool({
  host: env.ASSIGNATION_DB_HOST || env.DB_HOST,
  user: env.ASSIGNATION_DB_USER || env.DB_USER,
  password: env.ASSIGNATION_DB_PASSWORD || env.DB_PASSWORD,
  database: env.ASSIGNATION_DB_NAME,
  port: env.ASSIGNATION_DB_PORT || env.DB_PORT,
  waitForConnections: true,
  connectionLimit: env.ASSIGNATION_DB_POOL_SIZE || env.DB_POOL_SIZE,
  queueLimit: 0,
});

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const authMiddleware = (allowedRoles = []) => (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Formato de token invalido' });
  }

  try {
    const decoded = jwt.verify(parts[1], SECRET_KEY);
    req.user = decoded;
  } catch (error) {
    return res.status(401).json({ error: 'Token invalido' });
  }

  if (allowedRoles.length && !allowedRoles.includes(req.user.rol)) {
    return res.status(403).json({ error: 'Permisos insuficientes' });
  }

  next();
};

const ensureTeacherAccess = async ({ profesorId, asignacionId, estudianteId, profesorNombre }) => {
  if (!asignacionId || !estudianteId) {
    return false;
  }

  try {
    const [rows] = await assignationPool.execute(
      `SELECT a.id, a.profesor_id, a.profesor_nombre
         FROM asignaciones_profesor_curso a
         JOIN asignacion_estudiantes ae ON ae.asignacion_id = a.id
        WHERE a.id = ? AND ae.estudiante_id = ?
        LIMIT 1`,
      [asignacionId, estudianteId]
    );

    if (!Array.isArray(rows) || !rows.length) {
      return false;
    }

    const assignment = rows[0];
    if (assignment.profesor_id != null) {
      return Number(assignment.profesor_id) === Number(profesorId);
    }

    if (profesorNombre) {
      return assignment.profesor_nombre?.toLowerCase() === profesorNombre.toLowerCase();
    }
  } catch (error) {
    console.error('Error validating teacher access (grades):', error.message);
  }

  return false;
};

const allowedOrigins = corsOrigins.length ? corsOrigins : true;

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    (socket.handshake.headers.authorization || '').replace('Bearer ', '');

  if (!token) {
    return next(new Error('Token requerido'));
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    socket.user = decoded;
    socket.join(`rol:${decoded.rol}`);
    if (decoded.rol === 'profesor') {
      socket.join(`profesor:${decoded.id}`);
    }
    next();
  } catch (error) {
    next(new Error('Token invalido'));
  }
});

io.on('connection', (socket) => {
  socket.on('subscribe:asignacion', (asignacionId) => {
    if (!asignacionId) return;
    socket.join(`asignacion:${asignacionId}`);
  });

  socket.on('unsubscribe:asignacion', (asignacionId) => {
    if (!asignacionId) return;
    socket.leave(`asignacion:${asignacionId}`);
  });
});

app.set('io', io);

// Configurar rutas de exámenes v2 con validación por nivel educativo
setupExamenesRoutes(app, {
  pool,
  assignationPool,
  classesPool,
  usersPool,
  authMiddleware,
  asyncHandler,
  io,
});

const toNumberOrNull = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
};

const toIsoString = (value) => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return typeof value === 'string' ? value : null;
  }
  return parsed.toISOString();
};

const normalizeDateValue = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split('-').map(Number);
      const asDate = new Date(year, month - 1, day);
      return Number.isNaN(asDate.getTime()) ? null : asDate;
    }

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime())
      ? null
      : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? null
    : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const formatDateKey = (value) => {
  const date = normalizeDateValue(value);
  if (!date) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const computeExamEstado = (nota) => {
  const numeric = Number(nota);
  if (Number.isNaN(numeric)) {
    return null;
  }
  return numeric >= 11 ? 'aprobado' : 'reprobado';
};

const fetchAssignmentById = async (asignacionId) => {
  if (!asignacionId) {
    return null;
  }

  const [[assignment]] = await assignationPool.execute(
    `SELECT id,
      profesor_id,
      profesor_nombre,
      curso_id,
      curso_nombre,
      dia_semana,
      hora_inicio,
      hora_fin,
      aula,
      fecha_inicio,
      fecha_fin,
      max_alumnos,
      classroom_id
       FROM asignaciones_profesor_curso
      WHERE id = ?
      LIMIT 1`,
    [asignacionId]
  );

  return assignment || null;
};

const ensureAssignmentOwnership = async ({ profesorId, asignacionId }) => {
  if (!profesorId || !asignacionId) {
    return false;
  }

  const assignment = await fetchAssignmentById(asignacionId);
  if (!assignment) {
    return false;
  }

  if (assignment.profesor_id == null) {
    return true;
  }

  return Number(assignment.profesor_id) === Number(profesorId);
};

const fetchExamById = async (examenId) => {
  if (!examenId) {
    return null;
  }

  const [[exam]] = await pool.execute(
    `SELECT id,
            asignacion_id,
            profesor_id,
            nombre,
            descripcion,
            fecha,
            curso_nombre,
            created_at,
            updated_at
       FROM examenes
      WHERE id = ?
      LIMIT 1`,
    [examenId]
  );

  return exam || null;
};

const fetchExamParticipants = async (examen) => {
  if (!examen) {
    return [];
  }

  const [enrollments] = await assignationPool.execute(
    'SELECT estudiante_id FROM asignacion_estudiantes WHERE asignacion_id = ?',
    [examen.asignacion_id]
  );

  const studentIds = Array.from(
    new Set(
      (enrollments || [])
        .map((row) => toNumberOrNull(row.estudiante_id))
        .filter((id) => id != null)
    )
  );

  if (!studentIds.length) {
    return [];
  }

  const placeholders = studentIds.map(() => '?').join(',');
  const [users] = await usersPool.query(
    `SELECT id, nombre, email, (foto_perfil_imagen IS NOT NULL) AS tiene_foto
       FROM usuarios
      WHERE id IN (${placeholders})`,
    studentIds
  );

  const usersMap = new Map(users.map((user) => [toNumberOrNull(user.id), user]));

  return studentIds
    .map((id) => {
      const user = usersMap.get(id);
      return {
        estudiante_id: id,
        usuario_id: id,
        nombre: user?.nombre || 'Estudiante sin nombre',
        email: user?.email || null,
        tiene_foto: user?.tiene_foto === 1 || user?.tiene_foto === true,
      };
    })
    .sort((a, b) =>
      (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' })
    );
};

const buildExamDetail = async (examen) => {
  if (!examen) {
    return {
      participantes: [],
      promedio: null,
      ultimaActualizacion: null,
      totalEvaluados: 0,
      totalInscritos: 0,
      totalRegistros: 0,
    };
  }

  const participantesBase = await fetchExamParticipants(examen);

  const [gradeRows] = await pool.execute(
    `SELECT id,
            examen_id,
            estudiante_id,
            nota,
            estado,
            updated_at
       FROM examen_calificaciones
      WHERE examen_id = ?`,
    [examen.id]
  );

  const gradeMap = new Map();
  gradeRows.forEach((row) => {
    const estudianteId = toNumberOrNull(row.estudiante_id);
    if (estudianteId == null) {
      return;
    }
    gradeMap.set(estudianteId, row);
  });

  const participantes = participantesBase.map((student) => {
    const grade = gradeMap.get(student.estudiante_id);
    const nota =
      grade && grade.nota != null && !Number.isNaN(Number(grade.nota))
        ? Number(grade.nota)
        : null;

    return {
      ...student,
      nota,
      estado: grade?.estado || (nota != null ? computeExamEstado(nota) : null),
      updated_at: grade?.updated_at ? toIsoString(grade.updated_at) : null,
      calificacion_id: grade?.id != null ? Number(grade.id) : null,
    };
  });

  gradeMap.forEach((grade, estudianteId) => {
    if (participantes.some((participant) => participant.estudiante_id === estudianteId)) {
      return;
    }

    const nota =
      grade.nota != null && !Number.isNaN(Number(grade.nota))
        ? Number(grade.nota)
        : null;

    participantes.push({
      estudiante_id: estudianteId,
      nombre: 'Estudiante no asignado',
      email: null,
      nota,
      estado: grade.estado || (nota != null ? computeExamEstado(nota) : null),
      updated_at: grade.updated_at ? toIsoString(grade.updated_at) : null,
      calificacion_id: grade.id != null ? Number(grade.id) : null,
      fueraAsignacion: true,
    });
  });

  const notas = gradeRows
    .map((row) => Number(row.nota))
    .filter((value) => !Number.isNaN(value));

  const promedio =
    notas.length > 0
      ? Number((notas.reduce((sum, value) => sum + value, 0) / notas.length).toFixed(2))
      : null;

  const ultimaActualizacionTimestamp = gradeRows.reduce((acc, row) => {
    if (!row.updated_at) {
      return acc;
    }
    const ts = new Date(row.updated_at).getTime();
    if (Number.isNaN(ts)) {
      return acc;
    }
    return Math.max(acc, ts);
  }, 0);

  return {
    participantes,
    promedio,
    ultimaActualizacion:
      ultimaActualizacionTimestamp > 0
        ? new Date(ultimaActualizacionTimestamp).toISOString()
        : null,
    totalEvaluados: notas.length,
    totalInscritos: participantesBase.length,
    totalRegistros: gradeRows.length,
  };
};

app.get(
  '/examenes',
  authMiddleware(['administrativo', 'profesor']),
  asyncHandler(async (req, res) => {
    const { asignacionId, profesorId } = req.query;
    const filters = [];
    const params = [];

    if (req.user.rol === 'profesor') {
      filters.push('e.profesor_id = ?');
      params.push(req.user.id);
    } else if (profesorId) {
      filters.push('e.profesor_id = ?');
      params.push(profesorId);
    }

    if (asignacionId) {
      filters.push('e.asignacion_id = ?');
      params.push(asignacionId);
    }

    let query = `
      SELECT
        e.id,
        e.asignacion_id,
        e.profesor_id,
        e.nombre,
        e.descripcion,
        e.fecha,
        e.curso_nombre,
        e.created_at,
        e.updated_at,
        COUNT(DISTINCT g.estudiante_id) AS total_evaluados,
        AVG(g.nota) AS promedio,
        MAX(g.updated_at) AS ultima_actualizacion
      FROM examenes e
      LEFT JOIN examen_calificaciones g ON g.examen_id = e.id
    `;

    if (filters.length) {
      query += ` WHERE ${filters.join(' AND ')}`;
    }

    query += ' GROUP BY e.id ORDER BY e.fecha DESC, e.id DESC';

    const [rows] = await pool.execute(query, params);

    const exams = rows.map((row) => {
      const promedio =
        row.promedio != null && !Number.isNaN(Number(row.promedio))
          ? Number(Number(row.promedio).toFixed(2))
          : null;

      const totalEvaluados =
        row.total_evaluados != null && !Number.isNaN(Number(row.total_evaluados))
          ? Number(row.total_evaluados)
          : 0;

      const fecha = formatDateKey(row.fecha) || (typeof row.fecha === 'string' ? row.fecha : null);

      return {
        id: toNumberOrNull(row.id),
        asignacion_id: toNumberOrNull(row.asignacion_id),
        profesor_id: toNumberOrNull(row.profesor_id),
        nombre: row.nombre,
        descripcion: row.descripcion,
        fecha,
        curso_nombre: row.curso_nombre,
        created_at: toIsoString(row.created_at),
        updated_at: toIsoString(row.updated_at),
        total_evaluados: totalEvaluados,
        promedio,
        ultima_actualizacion: toIsoString(row.ultima_actualizacion),
      };
    });

    res.json(exams);
  })
);

app.post(
  '/examenes',
  authMiddleware(['administrativo', 'profesor']),
  asyncHandler(async (req, res) => {
    const {
      asignacion_id,
      asignacionId,
      nombre,
      descripcion,
      fecha,
      profesorId,
    } = req.body || {};

    const resolvedAsignacionId = toNumberOrNull(asignacion_id ?? asignacionId);
    if (!resolvedAsignacionId) {
      return res.status(400).json({ error: 'asignacion_id requerido' });
    }

    const sanitizedName = typeof nombre === 'string' ? nombre.trim() : '';
    if (!sanitizedName) {
      return res.status(400).json({ error: 'nombre requerido' });
    }

    const fechaFormateada = formatDateKey(fecha);
    if (!fechaFormateada) {
      return res.status(400).json({ error: 'fecha inválida' });
    }

    const targetProfesorId =
      req.user.rol === 'profesor'
        ? req.user.id
        : toNumberOrNull(profesorId ?? req.body?.profesor_id);

    if (!targetProfesorId) {
      return res.status(400).json({ error: 'profesorId requerido' });
    }

    const assignment = await fetchAssignmentById(resolvedAsignacionId);
    if (!assignment) {
      return res.status(404).json({ error: 'Asignacion no encontrada' });
    }

    if (req.user.rol === 'profesor') {
      const ownsAssignment = await ensureAssignmentOwnership({
        profesorId: req.user.id,
        asignacionId: resolvedAsignacionId,
      });

      if (!ownsAssignment) {
        return res.status(403).json({ error: 'No tienes permisos sobre esta asignacion' });
      }
    } else if (
      assignment.profesor_id != null &&
      targetProfesorId != null &&
      Number(assignment.profesor_id) !== Number(targetProfesorId)
    ) {
      return res.status(400).json({
        error: 'El profesor indicado no coincide con el titular de la asignacion',
      });
    }

    const descripcionLimpia =
      descripcion !== undefined && descripcion !== null
        ? String(descripcion).trim() || null
        : null;

    const [insertResult] = await pool.execute(
      `INSERT INTO examenes (asignacion_id, profesor_id, nombre, descripcion, fecha, curso_nombre)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        resolvedAsignacionId,
        targetProfesorId,
        sanitizedName,
        descripcionLimpia,
        fechaFormateada,
        assignment.curso_nombre || null,
      ]
    );

    const insertedId = insertResult.insertId;
    const exam = await fetchExamById(insertedId);

    res.status(201).json({
      id: toNumberOrNull(exam?.id) || insertedId,
      asignacion_id: resolvedAsignacionId,
      profesor_id: targetProfesorId,
      nombre: exam?.nombre || sanitizedName,
      descripcion: exam?.descripcion ?? descripcionLimpia,
      fecha: exam?.fecha ? formatDateKey(exam.fecha) : fechaFormateada,
      curso_nombre: exam?.curso_nombre || assignment.curso_nombre || null,
      created_at: toIsoString(exam?.created_at),
      updated_at: toIsoString(exam?.updated_at),
    });
  })
);

app.get(
  '/examenes/:id',
  authMiddleware(['administrativo', 'profesor']),
  asyncHandler(async (req, res) => {
    const examenId = toNumberOrNull(req.params.id);

    if (!examenId) {
      return res.status(400).json({ error: 'ID de examen inválido' });
    }

    const exam = await fetchExamById(examenId);
    if (!exam) {
      return res.status(404).json({ error: 'Examen no encontrado' });
    }

    if (req.user.rol === 'profesor' && Number(exam.profesor_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'No tienes acceso a este examen' });
    }

    res.json({
      id: toNumberOrNull(exam.id),
      asignacion_id: toNumberOrNull(exam.asignacion_id),
      profesor_id: toNumberOrNull(exam.profesor_id),
      nombre: exam.nombre,
      descripcion: exam.descripcion,
      fecha: exam.fecha ? formatDateKey(exam.fecha) : null,
      curso_nombre: exam.curso_nombre,
      created_at: toIsoString(exam.created_at),
      updated_at: toIsoString(exam.updated_at),
    });
  })
);

app.get(
  '/examenes/:id/detalle',
  authMiddleware(['administrativo', 'profesor']),
  asyncHandler(async (req, res) => {
    const examenId = toNumberOrNull(req.params.id);

    if (!examenId) {
      return res.status(400).json({ error: 'ID de examen inválido' });
    }

    const exam = await fetchExamById(examenId);
    if (!exam) {
      return res.status(404).json({ error: 'Examen no encontrado' });
    }

    if (req.user.rol === 'profesor' && Number(exam.profesor_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'No tienes acceso a este examen' });
    }

    const detail = await buildExamDetail(exam);

    res.json({
      examen: {
        id: toNumberOrNull(exam.id),
        asignacion_id: toNumberOrNull(exam.asignacion_id),
        profesor_id: toNumberOrNull(exam.profesor_id),
        nombre: exam.nombre,
        descripcion: exam.descripcion,
        fecha: exam.fecha ? formatDateKey(exam.fecha) : null,
        curso_nombre: exam.curso_nombre,
        created_at: toIsoString(exam.created_at),
        updated_at: toIsoString(exam.updated_at),
      },
      participantes: detail.participantes,
      promedio: detail.promedio,
      ultimaActualizacion: detail.ultimaActualizacion,
      totalEvaluados: detail.totalEvaluados,
      totalInscritos: detail.totalInscritos,
      totalRegistros: detail.totalRegistros,
    });
  })
);

app.put(
  '/examenes/:id/calificaciones/:estudianteId',
  authMiddleware(['administrativo', 'profesor']),
  asyncHandler(async (req, res) => {
    const examenId = toNumberOrNull(req.params.id);
    const estudianteId = toNumberOrNull(req.params.estudianteId);
    const notaInput = req.body?.nota;

    if (!examenId || !estudianteId) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }

    const exam = await fetchExamById(examenId);
    if (!exam) {
      return res.status(404).json({ error: 'Examen no encontrado' });
    }

    if (req.user.rol === 'profesor' && Number(exam.profesor_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'No tienes acceso a este examen' });
    }

    const notaValue = Number(notaInput);
    if (Number.isNaN(notaValue)) {
      return res.status(400).json({ error: 'Nota inválida' });
    }
    if (notaValue < 10 || notaValue > 20) {
      return res.status(400).json({ error: 'La nota debe estar entre 10 y 20' });
    }

    if (req.user.rol === 'profesor') {
      const [membership] = await assignationPool.execute(
        'SELECT 1 FROM asignacion_estudiantes WHERE asignacion_id = ? AND estudiante_id = ? LIMIT 1',
        [exam.asignacion_id, estudianteId]
      );

      if (!membership.length) {
        const [existingGrade] = await pool.execute(
          'SELECT 1 FROM examen_calificaciones WHERE examen_id = ? AND estudiante_id = ? LIMIT 1',
          [examenId, estudianteId]
        );

        if (!existingGrade.length) {
          return res
            .status(404)
            .json({ error: 'El estudiante no pertenece a la asignacion del examen' });
        }
      }
    }

    const estado = computeExamEstado(notaValue) || 'reprobado';

    await pool.execute(
      `INSERT INTO examen_calificaciones (examen_id, estudiante_id, nota, estado)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         nota = VALUES(nota),
         estado = VALUES(estado),
         updated_at = CURRENT_TIMESTAMP`,
      [examenId, estudianteId, notaValue, estado]
    );

    const [[savedGrade]] = await pool.execute(
      `SELECT id,
              examen_id,
              estudiante_id,
              nota,
              estado,
              updated_at
         FROM examen_calificaciones
        WHERE examen_id = ? AND estudiante_id = ?
        LIMIT 1`,
      [examenId, estudianteId]
    );

    const [[metrics]] = await pool.execute(
      `SELECT AVG(nota) AS promedio,
              MAX(updated_at) AS ultima_actualizacion,
              COUNT(*) AS totalEvaluados
         FROM examen_calificaciones
        WHERE examen_id = ?`,
      [examenId]
    );

    const socket = req.app.get('io');
    socket.emit('exam-grades:changed', {
      examenId,
      estudianteId,
      nota: notaValue,
      estado,
    });

    res.json({
      message: 'Calificaciones guardadas correctamente',
      calificacion: {
        id: toNumberOrNull(savedGrade?.id),
        examen_id: examenId,
        estudiante_id: estudianteId,
        nota: savedGrade?.nota != null ? Number(savedGrade.nota) : notaValue,
        estado: savedGrade?.estado || estado,
        updated_at: toIsoString(savedGrade?.updated_at),
      },
      promedio:
        metrics?.promedio != null && !Number.isNaN(Number(metrics.promedio))
          ? Number(Number(metrics.promedio).toFixed(2))
          : null,
      ultimaActualizacion: toIsoString(metrics?.ultima_actualizacion),
      totalEvaluados:
        metrics?.totalEvaluados != null && !Number.isNaN(Number(metrics.totalEvaluados))
          ? Number(metrics.totalEvaluados)
          : 0,
    });
  })
);

app.get(
  '/calificaciones',
  authMiddleware(['administrativo', 'profesor']),
  asyncHandler(async (req, res) => {
    const { asignacionId, materiaId, estudianteId } = req.query;
    const filters = [];
    const params = [];

    if (req.user.rol === 'profesor') {
      filters.push('profesor_id = ?');
      params.push(req.user.id);
    }

    if (asignacionId) {
      filters.push('asignacion_id = ?');
      params.push(asignacionId);
    }

    if (materiaId) {
      filters.push('materia_id = ?');
      params.push(materiaId);
    }

    if (estudianteId) {
      filters.push('estudiante_id = ?');
      params.push(estudianteId);
    }

    let query =
      'SELECT id, estudiante_id, materia_id, calificacion, profesor_id, asignacion_id, observaciones FROM calificaciones';

    if (filters.length) {
      query += ' WHERE ' + filters.join(' AND ');
    }

    query += ' ORDER BY id DESC';

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  })
);

app.get(
  '/calificaciones/:estudiante_id',
  authMiddleware(['administrativo', 'profesor', 'estudiante']),
  asyncHandler(async (req, res) => {
    const { estudiante_id } = req.params;

    if (req.user.rol === 'estudiante' && String(req.user.id) !== String(estudiante_id)) {
      return res.status(403).json({ error: 'No tienes permisos para acceder a esta ruta' });
    }

    let query =
      'SELECT id, estudiante_id, materia_id, calificacion, profesor_id, asignacion_id, observaciones FROM calificaciones WHERE estudiante_id = ?';
    const params = [estudiante_id];

    if (req.user.rol === 'profesor') {
      query += ' AND profesor_id = ?';
      params.push(req.user.id);
    }

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  })
);

app.post(
  '/calificaciones',
  authMiddleware(['administrativo', 'profesor']),
  asyncHandler(async (req, res) => {
    const {
      estudiante_id,
      materia_id,
      calificacion,
      asignacion_id,
      observaciones = null,
      profesorId,
    } = req.body;

    if (!estudiante_id || !materia_id || calificacion == null) {
      return res.status(400).json({ error: 'Faltan datos' });
    }

    const targetProfesorId = req.user.rol === 'profesor' ? req.user.id : profesorId;

    if (!targetProfesorId) {
      return res.status(400).json({ error: 'profesorId requerido' });
    }

    if (req.user.rol === 'profesor') {
      if (!asignacion_id) {
        return res.status(400).json({ error: 'asignacion_id requerido para profesores' });
      }

      const allowed = await ensureTeacherAccess({
        profesorId: req.user.id,
        asignacionId: asignacion_id,
        estudianteId: estudiante_id,
        profesorNombre: req.user.nombre,
      });

      if (!allowed) {
        return res.status(403).json({ error: 'El estudiante no pertenece a tu asignacion' });
      }
    }

    const [result] = await pool.execute(
      `INSERT INTO calificaciones (estudiante_id, materia_id, calificacion, profesor_id, asignacion_id, observaciones)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        estudiante_id,
        materia_id,
        calificacion,
        targetProfesorId,
        asignacion_id || null,
        observaciones,
      ]
    );

    const record = {
      id: result.insertId,
      estudiante_id,
      materia_id,
      calificacion,
      profesor_id: targetProfesorId,
      asignacion_id: asignacion_id || null,
      observaciones,
    };

    const socket = req.app.get('io');
    socket.to(`profesor:${targetProfesorId}`).emit('grades:created', record);
    if (asignacion_id) {
      socket.to(`asignacion:${asignacion_id}`).emit('grades:created', record);
    }
    socket.emit('grades:changed', { action: 'created', record });

    res.status(201).json(record);
  })
);

app.put(
  '/calificaciones/:id',
  authMiddleware(['administrativo', 'profesor']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      estudiante_id,
      materia_id,
      calificacion,
      asignacion_id,
      observaciones,
    } = req.body;

    const [[existing]] = await pool.execute(
      'SELECT * FROM calificaciones WHERE id = ?',
      [id]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Calificación no encontrada' });
    }

    if (
      req.user.rol === 'profesor' &&
      Number(existing.profesor_id) !== Number(req.user.id)
    ) {
      return res.status(403).json({ error: 'No puedes editar esta calificación' });
    }

    if (req.user.rol === 'profesor' && asignacion_id && estudiante_id) {
      const allowed = await ensureTeacherAccess({
        profesorId: req.user.id,
        asignacionId: asignacion_id,
        estudianteId: estudiante_id,
        profesorNombre: req.user.nombre,
      });

      if (!allowed) {
        return res.status(403).json({ error: 'El estudiante no pertenece a tu asignacion' });
      }
    }

    const nextEstudianteId = estudiante_id ?? existing.estudiante_id;
    const nextMateriaId = materia_id ?? existing.materia_id;
    const nextCalificacion = calificacion ?? existing.calificacion;
    const nextAsignacionId = asignacion_id ?? existing.asignacion_id;
    const nextObservaciones =
      observaciones !== undefined ? observaciones : existing.observaciones;

    await pool.execute(
      `UPDATE calificaciones
          SET estudiante_id = ?,
              materia_id = ?,
              calificacion = ?,
              asignacion_id = ?,
              observaciones = ?
        WHERE id = ?`,
      [
        nextEstudianteId,
        nextMateriaId,
        nextCalificacion,
        nextAsignacionId,
        nextObservaciones,
        id,
      ]
    );

    const record = {
      id: Number(id),
      estudiante_id: nextEstudianteId,
      materia_id: nextMateriaId,
      calificacion: nextCalificacion,
      profesor_id: existing.profesor_id,
      asignacion_id: nextAsignacionId,
      observaciones: nextObservaciones,
    };

    const socket = req.app.get('io');
    socket.to(`profesor:${existing.profesor_id}`).emit('grades:updated', record);
    if (nextAsignacionId) {
      socket.to(`asignacion:${nextAsignacionId}`).emit('grades:updated', record);
    }
    socket.emit('grades:changed', { action: 'updated', record });

    res.json({ message: 'Calificación actualizada', record });
  })
);

app.delete(
  '/calificaciones/:id',
  authMiddleware(['administrativo', 'profesor']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [[existing]] = await pool.execute(
      'SELECT id, profesor_id, asignacion_id FROM calificaciones WHERE id = ?',
      [id]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Calificación no encontrada' });
    }

    if (
      req.user.rol === 'profesor' &&
      Number(existing.profesor_id) !== Number(req.user.id)
    ) {
      return res.status(403).json({ error: 'No puedes eliminar esta calificación' });
    }

    await pool.execute('DELETE FROM calificaciones WHERE id = ?', [id]);

    const socket = req.app.get('io');
    socket.to(`profesor:${existing.profesor_id}`).emit('grades:deleted', { id: Number(id) });
    if (existing.asignacion_id) {
      socket.to(`asignacion:${existing.asignacion_id}`).emit('grades:deleted', { id: Number(id) });
    }
    socket.emit('grades:changed', { action: 'deleted', id: Number(id) });

    res.json({ message: 'Calificación eliminada' });
  })
);

app.get(
  '/calificaciones/resumen/mis-cursos',
  authMiddleware(['profesor']),
  asyncHandler(async (req, res) => {
    const [rows] = await pool.execute(
      `SELECT asignacion_id,
              materia_id,
              COUNT(*) AS cantidad,
              AVG(calificacion) AS promedio
         FROM calificaciones
        WHERE profesor_id = ?
        GROUP BY asignacion_id, materia_id
        ORDER BY asignacion_id DESC, materia_id ASC`,
      [req.user.id]
    );

    res.json(rows);
  })
);

app.use((err, req, res, next) => {
  console.error('Grades service error:', err);
  const status = err.statusCode || err.status || 500;
  const message = status === 500 ? 'Error interno del servidor' : err.message;
  res.status(status).json({ error: message });
});

httpServer.listen(env.PORT, () => {
  console.log(`Grades Service running with realtime events on http://localhost:${env.PORT}`);
});

