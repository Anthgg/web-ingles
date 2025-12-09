const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const http = require('http');
const { Server } = require('socket.io');
const { str, num } = require('envalid');
const { createConfig } = require('../config');

const app = express();

const config = createConfig({
  serviceName: 'attendance-service',
  serviceRoot: __dirname,
  overrides: {
    ATTENDANCE_SECRET_KEY: str({ default: '' }),
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
  },
  defaults: {
    DB_NAME: 'instenglish_attendance',
    PORT: 3003,
  },
});

const { env, corsOrigins } = config;

app.use(
  cors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true,
  })
);
app.use(express.json());

let cachedJwtSecret;
const resolveJwtSecret = () => {
  if (cachedJwtSecret) {
    return cachedJwtSecret;
  }

  const candidates = [
    config.get('ATTENDANCE_SECRET_KEY'),
    env.JWT_SECRET,
  ]
    .map((value) => (typeof value === 'string' ? value.trim() : value))
    .filter(Boolean);

  const unique = [...new Set(candidates)];

  if (!unique.length) {
    throw new Error('JWT_SECRET no configurado. Define una clave compartida para todos los servicios.');
  }

  if (unique.length > 1) {
    throw new Error('ATTENDANCE_SECRET_KEY y JWT_SECRET no coinciden. Usa un solo secreto compartido.');
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

const stripDiacritics = (value) =>
  typeof value === 'string'
    ? value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
    : value;

const normalizeDateOnly = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
};

const normalizeAttendanceRow = (row) => {
  if (!row) return row;
  const normalized = { ...row };
  if (normalized.fecha) {
    normalized.fecha = normalizeDateOnly(normalized.fecha);
  }
  if (normalized.fecha_modificacion) {
    const parsed = new Date(normalized.fecha_modificacion);
    normalized.fecha_modificacion = Number.isNaN(parsed.getTime())
      ? normalizeDateOnly(normalized.fecha_modificacion)
      : parsed.toISOString();
  }
  return normalized;
};

const mapAttendanceRows = (rows = []) => rows.map((row) => normalizeAttendanceRow(row));

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

const toNumericOrNull = (value) => {
  if (value == null) return null;
  if (typeof value === 'string' && value.trim() === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const resolveAttendanceScopeKey = (asignacionId, cursoId, materiaId) => {
  const asignacion = toNumericOrNull(asignacionId);
  const curso = toNumericOrNull(cursoId);
  const materia = toNumericOrNull(materiaId);

  if (asignacion != null) {
    return `a:${asignacion}`;
  }
  if (curso != null) {
    return `c:${curso}`;
  }
  if (materia != null) {
    return `m:${materia}`;
  }
  return 'm:null';
};

const normalizeRole = (value) => {
  if (!value) return value;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'docente' || normalized === 'teacher') {
    return 'profesor';
  }
  if (normalized === 'alumno' || normalized === 'student') {
    return 'estudiante';
  }
  return normalized;
};

const parseLimit = (value, { min = 10, max = 500, fallback = 150 } = {}) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const bounded = Math.trunc(parsed);
  return Math.min(Math.max(bounded, min), max);
};

const toSafeDateFilter = (value) => {
  if (!value) return null;
  const normalized = normalizeDateOnly(value);
  return normalized || null;
};

const getStudentAttendanceHistory = async ({ estudianteId, filters = {} }) => {
  const numericId = Number(estudianteId);
  if (!Number.isFinite(numericId)) {
    const err = new Error('estudianteId invalido');
    err.status = 400;
    throw err;
  }

  const {
    estado,
    desde,
    hasta,
    cursoId,
    asignacionId,
    materiaId,
    limit,
  } = filters;

  const params = [numericId];
  let query =
    `SELECT id,
            estudiante_id,
            estudiante_nombre,
            materia_id,
            estado,
            fecha,
            profesor_id,
            asignacion_id,
            curso_id,
            curso_nombre,
            observaciones,
            modificado_por,
            fecha_modificacion,
            bloqueado
       FROM asistencias
      WHERE estudiante_id = ?`;

  const normalizedEstado = typeof estado === 'string' ? estado.trim().toLowerCase() : null;
  if (normalizedEstado) {
    query += ' AND estado = ?';
    params.push(normalizedEstado);
  }

  const normalizedDesde = toSafeDateFilter(desde);
  if (normalizedDesde) {
    query += ' AND DATE(fecha) >= ?';
    params.push(normalizedDesde);
  }

  const normalizedHasta = toSafeDateFilter(hasta);
  if (normalizedHasta) {
    query += ' AND DATE(fecha) <= ?';
    params.push(normalizedHasta);
  }

  const normalizedCursoId = toNumericOrNull(cursoId);
  if (normalizedCursoId != null) {
    query += ' AND curso_id = ?';
    params.push(normalizedCursoId);
  }

  const normalizedAsignacionId = toNumericOrNull(asignacionId);
  if (normalizedAsignacionId != null) {
    query += ' AND asignacion_id = ?';
    params.push(normalizedAsignacionId);
  }

  const normalizedMateriaId = toNumericOrNull(materiaId);
  if (normalizedMateriaId != null) {
    query += ' AND materia_id = ?';
    params.push(normalizedMateriaId);
  }

  query += ' ORDER BY fecha DESC, id DESC LIMIT ?';
  params.push(parseLimit(limit));

  const [rows] = await pool.execute(query, params);
  return mapAttendanceRows(rows);
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

  const normalizedAllowedRoles = allowedRoles.map(normalizeRole);

  try {
    const decoded = jwt.verify(parts[1], SECRET_KEY);
    const normalizedRol = normalizeRole(decoded.rol);
    req.user = {
      ...decoded,
      rol: normalizedRol,
      rawRol: decoded.rol,
    };
  } catch (error) {
    return res.status(401).json({ error: 'Token invalido' });
  }

  if (normalizedAllowedRoles.length && !normalizedAllowedRoles.includes(req.user.rol)) {
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

    if (!Array.isArray(rows) || rows.length === 0) {
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
    console.error('Error validating teacher access:', error.message);
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
    const normalizedRol = normalizeRole(decoded.rol);
    socket.user = {
      ...decoded,
      rol: normalizedRol,
      rawRol: decoded.rol,
    };
    socket.join(`rol:${normalizedRol}`);
    if (normalizedRol === 'profesor') {
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

app.get(
  '/asistencias',
  authMiddleware(['administrativo']),
  asyncHandler(async (req, res) => {
    const {
      estado,
      estudianteId,
      cursoId,
      asignacionId,
      materiaId,
      desde,
      hasta,
      limit,
    } = req.query;

    const params = [];
    let query =
      `SELECT id,
              estudiante_id,
              estudiante_nombre,
              materia_id,
              estado,
              fecha,
              profesor_id,
              asignacion_id,
              curso_id,
              curso_nombre,
              observaciones,
              modificado_por,
              fecha_modificacion,
              bloqueado
         FROM asistencias
        WHERE 1 = 1`;

    const normalizedEstado = typeof estado === 'string' ? estado.trim().toLowerCase() : null;
    if (normalizedEstado) {
      query += ' AND estado = ?';
      params.push(normalizedEstado);
    }

    const normalizedEstudianteId = toNumericOrNull(estudianteId);
    if (normalizedEstudianteId != null) {
      query += ' AND estudiante_id = ?';
      params.push(normalizedEstudianteId);
    }

    const normalizedCursoId = toNumericOrNull(cursoId);
    if (normalizedCursoId != null) {
      query += ' AND curso_id = ?';
      params.push(normalizedCursoId);
    }

    const normalizedAsignacionId = toNumericOrNull(asignacionId);
    if (normalizedAsignacionId != null) {
      query += ' AND asignacion_id = ?';
      params.push(normalizedAsignacionId);
    }

    const normalizedMateriaId = toNumericOrNull(materiaId);
    if (normalizedMateriaId != null) {
      query += ' AND materia_id = ?';
      params.push(normalizedMateriaId);
    }

    const normalizedDesde = toSafeDateFilter(desde);
    if (normalizedDesde) {
      query += ' AND DATE(fecha) >= ?';
      params.push(normalizedDesde);
    }

    const normalizedHasta = toSafeDateFilter(hasta);
    if (normalizedHasta) {
      query += ' AND DATE(fecha) <= ?';
      params.push(normalizedHasta);
    }

    query += ' ORDER BY fecha DESC, id DESC';

    if (limit !== undefined) {
      query += ' LIMIT ?';
      params.push(parseLimit(limit, { min: 50, max: 5000, fallback: 1000 }));
    }

    const [rows] = await pool.execute(query, params);
    res.json(mapAttendanceRows(rows));
  })
);

app.get(
  '/asistencias/mias',
  authMiddleware(['profesor']),
  asyncHandler(async (req, res) => {
    const { fecha, asignacionId, materiaId } = req.query;
    const params = [req.user.id];
    let query =
      `SELECT id,
              estudiante_id,
              estudiante_nombre,
              materia_id,
              estado,
              fecha,
              profesor_id,
              asignacion_id,
              curso_id,
              curso_nombre,
              observaciones,
              modificado_por,
              fecha_modificacion,
              bloqueado
         FROM asistencias
        WHERE profesor_id = ?`;

    if (asignacionId) {
      query += ' AND asignacion_id = ?';
      params.push(asignacionId);
    }

    if (materiaId) {
      query += ' AND materia_id = ?';
      params.push(materiaId);
    }

    if (fecha) {
      query += ' AND fecha = ?';
      params.push(fecha);
    }

    query += ' ORDER BY fecha DESC, id DESC';

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  })
);

app.get(
  '/asistencias/estudiante/mias',
  authMiddleware(['estudiante']),
  asyncHandler(async (req, res) => {
    const records = await getStudentAttendanceHistory({
      estudianteId: req.user.id,
      filters: req.query,
    });
    res.json(records);
  })
);

app.get(
  '/asistencias/estudiante/:id',
  authMiddleware(['administrativo']),
  asyncHandler(async (req, res) => {
    const records = await getStudentAttendanceHistory({
      estudianteId: req.params.id,
      filters: req.query,
    });
    res.json(records);
  })
);

app.get(
  '/asistencias/:id',
  authMiddleware(['administrativo', 'profesor']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [[attendance]] = await pool.execute(
      `SELECT id,
              estudiante_id,
              estudiante_nombre,
              materia_id,
              estado,
              fecha,
              profesor_id,
              asignacion_id,
              curso_id,
              curso_nombre,
              observaciones,
              modificado_por,
              fecha_modificacion,
              bloqueado
         FROM asistencias
        WHERE id = ?`,
      [id]
    );

    if (!attendance) {
      return res.status(404).json({ error: 'Asistencia no encontrada' });
    }

    if (
      req.user.rol === 'profesor' &&
      Number(attendance.profesor_id) !== Number(req.user.id)
    ) {
      return res.status(403).json({ error: 'No tienes permisos para acceder a esta asistencia' });
    }

    res.json(attendance);
  })
);

app.post(
  '/asistencias',
  authMiddleware(['administrativo', 'profesor']),
  asyncHandler(async (req, res) => {
    const {
      estudiante_id,
      estudiante_nombre,
      materia_id,
      estado,
      fecha,
      asignacion_id,
      profesorId,
      curso_id,
      curso_nombre,
      observaciones,
      modificado_por,
    } = req.body;

    if (!estudiante_id || !materia_id || !estado) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const normalizedEstado = String(estado).trim().toLowerCase();
    const attendanceDate = normalizeDateOnly(fecha) || new Date().toISOString().slice(0, 10);
    const targetProfesorId = req.user.rol === 'profesor' ? req.user.id : profesorId;

    if (!targetProfesorId) {
      return res.status(400).json({ error: 'profesorId requerido' });
    }

    // Validar si la fecha corresponde al horario del curso (solo si hay curso_id)
    if (curso_id) {
      const [validacionResult] = await classesPool.execute(
        `SELECT fn_es_dia_valido_curso(?, ?) AS es_valido`,
        [curso_id, attendanceDate]
      );

      const esValido = validacionResult[0].es_valido === 1;

      // Solo validar si el curso tiene horarios configurados
      const [horariosExist] = await classesPool.execute(
        `SELECT COUNT(*) as count FROM horarios_curso WHERE curso_id = ? AND activo = TRUE`,
        [curso_id]
      );

      if (horariosExist[0].count > 0 && !esValido) {
        // return res.status(400).json({ 
        //   error: 'Esta fecha no corresponde a un día de clase de este curso' 
        // });
        console.warn(`[Attendance] Advertencia: La fecha ${attendanceDate} no es válida según fn_es_dia_valido_curso para curso ${curso_id}, pero se permite guardar.`);
      }
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

    let duplicateClause = '';
    const duplicateParams = [];
    if (asignacion_id != null) {
      duplicateClause = 'asignacion_id = ?';
      duplicateParams.push(asignacion_id);
    } else if (curso_id != null) {
      duplicateClause = 'asignacion_id IS NULL AND curso_id = ?';
      duplicateParams.push(curso_id);
    } else {
      duplicateClause = 'curso_id IS NULL AND asignacion_id IS NULL AND materia_id = ?';
      duplicateParams.push(materia_id);
    }

    const [existingRows] = await pool.execute(
      `SELECT *
         FROM asistencias
        WHERE estudiante_id = ?
          AND DATE(fecha) = ?
          AND ${duplicateClause}
        LIMIT 1`,
      [estudiante_id, attendanceDate, ...duplicateParams]
    );

    if (existingRows.length > 0) {
      const existing = existingRows[0];
      const previousProfesorId = existing.profesor_id;
      const previousAsignacionId = existing.asignacion_id;

      const nextAsignacionId = asignacion_id ?? existing.asignacion_id;
      const nextCursoId = curso_id ?? existing.curso_id;
      const nextCursoNombre = curso_nombre ?? existing.curso_nombre;
      const nextEstudianteNombre = estudiante_nombre ?? existing.estudiante_nombre;
      const nextObservaciones = observaciones ?? existing.observaciones;
      const nextMateriaId = materia_id ?? existing.materia_id;
      const nextModificadoPor = modificado_por || targetProfesorId;

      await pool.execute(
        `UPDATE asistencias
            SET estudiante_id = ?,
                estudiante_nombre = ?,
                materia_id = ?,
                estado = ?,
                fecha = ?,
                profesor_id = ?,
                asignacion_id = ?,
                curso_id = ?,
                curso_nombre = ?,
                observaciones = ?,
                modificado_por = ?,
                fecha_modificacion = NOW()
          WHERE id = ?`,
        [
          existing.estudiante_id,
          nextEstudianteNombre,
          nextMateriaId,
          normalizedEstado,
          attendanceDate,
          targetProfesorId,
          nextAsignacionId,
          nextCursoId,
          nextCursoNombre,
          nextObservaciones,
          nextModificadoPor,
          existing.id,
        ]
      );

      const [[updatedRecord]] = await pool.execute(
        'SELECT id, estudiante_id, estudiante_nombre, materia_id, estado, fecha, profesor_id, asignacion_id, curso_id, curso_nombre, observaciones, modificado_por FROM asistencias WHERE id = ?',
        [existing.id]
      );

      const socket = req.app.get('io');
      if (updatedRecord) {
        if (updatedRecord.fecha) {
          updatedRecord.fecha = normalizeDateOnly(updatedRecord.fecha);
        }
        if (previousProfesorId && Number(previousProfesorId) !== Number(updatedRecord.profesor_id)) {
          socket.to(`profesor:${previousProfesorId}`).emit('attendance:updated', updatedRecord);
        }
        socket.to(`profesor:${updatedRecord.profesor_id}`).emit('attendance:updated', updatedRecord);

        if (previousAsignacionId && Number(previousAsignacionId) !== Number(updatedRecord.asignacion_id)) {
          socket.to(`asignacion:${previousAsignacionId}`).emit('attendance:updated', updatedRecord);
        }
        if (updatedRecord.asignacion_id) {
          socket.to(`asignacion:${updatedRecord.asignacion_id}`).emit('attendance:updated', updatedRecord);
        }
        socket.emit('attendance:changed', { action: 'updated', record: updatedRecord });
      }

      return res.status(200).json({ message: 'Asistencia actualizada', record: updatedRecord });
    }

    const [result] = await pool.execute(
      `INSERT INTO asistencias (
        estudiante_id, 
        estudiante_nombre, 
        materia_id, 
        estado, 
        fecha, 
        profesor_id, 
        asignacion_id,
        curso_id,
        curso_nombre,
        observaciones,
        modificado_por
      )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        estudiante_id,
        estudiante_nombre || null,
        materia_id,
        normalizedEstado,
        attendanceDate,
        targetProfesorId,
        asignacion_id || null,
        curso_id || null,
        curso_nombre || null,
        observaciones || null,
        modificado_por || targetProfesorId,
      ]
    );

    const record = {
      id: result.insertId,
      estudiante_id,
      estudiante_nombre,
      materia_id,
      estado: normalizedEstado,
      fecha: attendanceDate,
      profesor_id: targetProfesorId,
      asignacion_id: asignacion_id || null,
      curso_id: curso_id || null,
      curso_nombre: curso_nombre || null,
      observaciones: observaciones || null,
      modificado_por: modificado_por || targetProfesorId,
    };

    const socket = req.app.get('io');
    socket.to(`profesor:${targetProfesorId}`).emit('attendance:created', record);
    if (asignacion_id) {
      socket.to(`asignacion:${asignacion_id}`).emit('attendance:created', record);
    }
    socket.emit('attendance:changed', { action: 'created', record });

    res.status(201).json(record);
  })
);

app.put(
  '/asistencias/:id',
  authMiddleware(['administrativo', 'profesor']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      estudiante_id,
      estudiante_nombre,
      materia_id,
      estado,
      fecha,
      asignacion_id,
      curso_id,
      curso_nombre,
      observaciones,
      modificado_por,
    } = req.body;

    const [[existing]] = await pool.execute(
      'SELECT * FROM asistencias WHERE id = ?',
      [id]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Asistencia no encontrada' });
    }

    if (
      req.user.rol === 'profesor' &&
      Number(existing.profesor_id) !== Number(req.user.id)
    ) {
      return res.status(403).json({ error: 'No puedes editar esta asistencia' });
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

    const nextEstado = estado ? String(estado).trim().toLowerCase() : existing.estado;
    const nextFecha = fecha || existing.fecha;
    const nextAsignacionId = asignacion_id ?? existing.asignacion_id;
    const nextEstudianteId = estudiante_id ?? existing.estudiante_id;
    const nextEstudianteNombre = estudiante_nombre ?? existing.estudiante_nombre;
    const nextMateriaId = materia_id ?? existing.materia_id;
    const nextCursoId = curso_id ?? existing.curso_id;
    const nextCursoNombre = curso_nombre ?? existing.curso_nombre;
    const nextObservaciones = observaciones ?? existing.observaciones;
    const nextModificadoPor = modificado_por || req.user.id;
    const previousAsignacionId = existing.asignacion_id;

    const normalizedFecha = normalizeDateOnly(nextFecha);
    const normalizedExistingFecha = normalizeDateOnly(existing.fecha);

    const currentScopeKey = resolveAttendanceScopeKey(
      existing.asignacion_id,
      existing.curso_id,
      existing.materia_id
    );
    const nextScopeKey = resolveAttendanceScopeKey(nextAsignacionId, nextCursoId, nextMateriaId);

    const uniquenessChanged =
      Number(existing.estudiante_id) !== Number(nextEstudianteId) ||
      normalizedExistingFecha !== normalizedFecha ||
      currentScopeKey !== nextScopeKey;

    if (!normalizedFecha) {
      return res.status(400).json({ error: 'Fecha inválida' });
    }

    if (nextCursoId) {
      const [validacionResult] = await classesPool.execute(
        `SELECT fn_es_dia_valido_curso(?, ?) AS es_valido`,
        [nextCursoId, normalizedFecha]
      );

      const esValido = validacionResult[0].es_valido === 1;

      const [horariosExist] = await classesPool.execute(
        `SELECT COUNT(*) as count FROM horarios_curso WHERE curso_id = ? AND activo = TRUE`,
        [nextCursoId]
      );

      if (horariosExist[0].count > 0 && !esValido) {
        return res.status(400).json({ error: 'Esta fecha no corresponde a un día de clase de este curso' });
      }
    }

    if (uniquenessChanged) {
      let updateDuplicateClause = '';
      const updateDuplicateParams = [];
      if (nextAsignacionId != null) {
        updateDuplicateClause = 'asignacion_id = ?';
        updateDuplicateParams.push(nextAsignacionId);
      } else if (nextCursoId != null) {
        updateDuplicateClause = 'asignacion_id IS NULL AND curso_id = ?';
        updateDuplicateParams.push(nextCursoId);
      } else {
        updateDuplicateClause = 'curso_id IS NULL AND asignacion_id IS NULL AND materia_id = ?';
        updateDuplicateParams.push(nextMateriaId);
      }

      const [conflicts] = await pool.execute(
        `SELECT id FROM asistencias
          WHERE id <> ?
            AND estudiante_id = ?
            AND DATE(fecha) = ?
            AND ${updateDuplicateClause}
          LIMIT 1`,
        [id, nextEstudianteId, normalizedFecha, ...updateDuplicateParams]
      );

      if (conflicts.length > 0) {
        return res
          .status(409)
          .json({ error: 'Ya existe una asistencia registrada para este estudiante en esa fecha' });
      }
    }

    await pool.execute(
      `UPDATE asistencias
          SET estudiante_id = ?,
              estudiante_nombre = ?,
              materia_id = ?,
              estado = ?,
              fecha = ?,
              asignacion_id = ?,
              curso_id = ?,
              curso_nombre = ?,
              observaciones = ?,
              modificado_por = ?,
              fecha_modificacion = NOW()
        WHERE id = ?`,
      [
        nextEstudianteId,
        nextEstudianteNombre,
        nextMateriaId,
        nextEstado,
        normalizedFecha,
        nextAsignacionId,
        nextCursoId,
        nextCursoNombre,
        nextObservaciones,
        nextModificadoPor,
        id,
      ]
    );

    const record = {
      id: Number(id),
      estudiante_id: nextEstudianteId,
      estudiante_nombre: nextEstudianteNombre,
      materia_id: nextMateriaId,
      estado: nextEstado,
      fecha: normalizedFecha,
      profesor_id: existing.profesor_id,
      asignacion_id: nextAsignacionId,
      curso_id: nextCursoId,
      curso_nombre: nextCursoNombre,
      observaciones: nextObservaciones,
      modificado_por: nextModificadoPor,
    };

    const socket = req.app.get('io');
    socket.to(`profesor:${existing.profesor_id}`).emit('attendance:updated', record);
    if (previousAsignacionId && Number(previousAsignacionId) !== Number(nextAsignacionId)) {
      socket.to(`asignacion:${previousAsignacionId}`).emit('attendance:updated', record);
    }
    if (nextAsignacionId) {
      socket.to(`asignacion:${nextAsignacionId}`).emit('attendance:updated', record);
    }
    socket.emit('attendance:changed', { action: 'updated', record });

    res.json({ message: 'Asistencia actualizada', record });
  })
);

app.delete(
  '/asistencias/:id',
  authMiddleware(['administrativo', 'profesor']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [[existing]] = await pool.execute(
      'SELECT id, profesor_id, asignacion_id FROM asistencias WHERE id = ?',
      [id]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Asistencia no encontrada' });
    }

    if (
      req.user.rol === 'profesor' &&
      Number(existing.profesor_id) !== Number(req.user.id)
    ) {
      return res.status(403).json({ error: 'No puedes eliminar esta asistencia' });
    }

    await pool.execute('DELETE FROM asistencias WHERE id = ?', [id]);

    const socket = req.app.get('io');
    socket.to(`profesor:${existing.profesor_id}`).emit('attendance:deleted', { id: Number(id) });
    if (existing.asignacion_id) {
      socket.to(`asignacion:${existing.asignacion_id}`).emit('attendance:deleted', { id: Number(id) });
    }
    socket.emit('attendance:changed', { action: 'deleted', id: Number(id) });

    res.json({ message: 'Asistencia eliminada' });
  })
);

// ========================================
// NUEVOS ENDPOINTS PARA HORARIOS Y ESTADÍSTICAS
// ========================================

// Obtener estadísticas de asistencia por estudiante y curso
app.get(
  '/asistencias/estadisticas/estudiante/:id',
  authMiddleware(['administrativo', 'profesor', 'estudiante']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validar acceso: estudiantes solo pueden ver sus propias estadísticas
    if (req.user.rol === 'estudiante' && parseInt(id) !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para ver estas estadísticas' });
    }

    const [stats] = await pool.execute(
      `SELECT * FROM v_estadisticas_estudiante_curso WHERE estudiante_id = ?`,
      [id]
    );

    res.json(stats);
  })
);

// Obtener estadísticas de asistencia por curso y fecha
app.get(
  '/asistencias/estadisticas/curso/:cursoId',
  authMiddleware(['administrativo', 'profesor']),
  asyncHandler(async (req, res) => {
    const { cursoId } = req.params;
    const { fechaInicio, fechaFin } = req.query;

    let query = 'SELECT * FROM v_estadisticas_curso_fecha WHERE curso_id = ?';
    const params = [cursoId];

    if (fechaInicio) {
      query += ' AND fecha >= ?';
      params.push(fechaInicio);
    }

    if (fechaFin) {
      query += ' AND fecha <= ?';
      params.push(fechaFin);
    }

    query += ' ORDER BY fecha DESC';

    const [stats] = await pool.execute(query, params);

    res.json(stats);
  })
);

// Obtener horarios de un curso
app.get(
  '/cursos/:cursoId/horarios',
  authMiddleware(['administrativo', 'profesor', 'estudiante']),
  asyncHandler(async (req, res) => {
    const { cursoId } = req.params;

    const [horarios] = await classesPool.execute(
      `CALL sp_obtener_horarios_curso(?)`,
      [cursoId]
    );

    // El stored procedure retorna el resultado en horarios[0]
    res.json(horarios[0] || []);
  })
);

// Agregar o actualizar horario de un curso
app.post(
  '/cursos/:cursoId/horarios',
  authMiddleware(['administrativo']),
  asyncHandler(async (req, res) => {
    const { cursoId } = req.params;
    const { curso_nombre, dia_semana, hora_inicio, hora_fin } = req.body;

    if (!curso_nombre || !dia_semana) {
      return res.status(400).json({ error: 'curso_nombre y dia_semana son obligatorios' });
    }

    if (dia_semana < 1 || dia_semana > 7) {
      return res.status(400).json({ error: 'dia_semana debe estar entre 1 (Lunes) y 7 (Domingo)' });
    }

    await classesPool.execute(
      `CALL sp_agregar_horario_curso(?, ?, ?, ?, ?)`,
      [cursoId, curso_nombre, dia_semana, hora_inicio || null, hora_fin || null]
    );

    res.json({ message: 'Horario agregado/actualizado correctamente' });
  })
);

// Validar si una fecha es válida para un curso (según sus horarios)
app.get(
  '/cursos/:cursoId/validar-fecha/:fecha',
  authMiddleware(['administrativo', 'profesor']),
  asyncHandler(async (req, res) => {
    const { cursoId, fecha } = req.params;

    const [result] = await classesPool.execute(
      `SELECT fn_es_dia_valido_curso(?, ?) AS es_valido`,
      [cursoId, fecha]
    );

    const esValido = result[0].es_valido === 1;

    res.json({ es_valido: esValido });
  })
);

// Eliminar horario de un curso
app.delete(
  '/cursos/:cursoId/horarios/:diaSemana',
  authMiddleware(['administrativo']),
  asyncHandler(async (req, res) => {
    const { cursoId, diaSemana } = req.params;

    await classesPool.execute(
      `DELETE FROM horarios_curso WHERE curso_id = ? AND dia_semana = ?`,
      [cursoId, diaSemana]
    );

    res.json({ message: 'Horario eliminado correctamente' });
  })
);

app.use((err, req, res, next) => {
  console.error('Attendance service error:', err);
  const status = err.statusCode || err.status || 500;
  const message = status === 500 ? 'Error interno del servidor' : err.message;
  res.status(status).json({ error: message });
});

httpServer.listen(env.PORT, () => {
  console.log(`Attendance Service running with realtime events on http://localhost:${env.PORT}`);
});

