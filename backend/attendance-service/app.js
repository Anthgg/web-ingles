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

const SECRET_KEY = config.get('ATTENDANCE_SECRET_KEY') || env.JWT_SECRET;

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

app.get(
  '/asistencias',
  authMiddleware(['administrativo']),
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      'SELECT id, estudiante_id, materia_id, estado, fecha, profesor_id, asignacion_id FROM asistencias ORDER BY fecha DESC, id DESC'
    );
    res.json(rows);
  })
);

app.get(
  '/asistencias/mias',
  authMiddleware(['profesor']),
  asyncHandler(async (req, res) => {
    const { fecha, asignacionId, materiaId } = req.query;
    const params = [req.user.id];
    let query =
      'SELECT id, estudiante_id, materia_id, estado, fecha, profesor_id, asignacion_id FROM asistencias WHERE profesor_id = ?';

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
  '/asistencias/:id',
  authMiddleware(['administrativo', 'profesor']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [[attendance]] = await pool.execute(
      'SELECT id, estudiante_id, materia_id, estado, fecha, profesor_id, asignacion_id FROM asistencias WHERE id = ?',
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
      materia_id,
      estado,
      fecha,
      asignacion_id,
      profesorId,
    } = req.body;

    if (!estudiante_id || !materia_id || !estado) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const normalizedEstado = String(estado).trim().toUpperCase();
    const attendanceDate = fecha || new Date().toISOString().slice(0, 10);
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
      `INSERT INTO asistencias (estudiante_id, materia_id, estado, fecha, profesor_id, asignacion_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        estudiante_id,
        materia_id,
        normalizedEstado,
        attendanceDate,
        targetProfesorId,
        asignacion_id || null,
      ]
    );

    const record = {
      id: result.insertId,
      estudiante_id,
      materia_id,
      estado: normalizedEstado,
      fecha: attendanceDate,
      profesor_id: targetProfesorId,
      asignacion_id: asignacion_id || null,
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
      materia_id,
      estado,
      fecha,
      asignacion_id,
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

    const nextEstado = estado ? String(estado).trim().toUpperCase() : existing.estado;
    const nextFecha = fecha || existing.fecha;
    const nextAsignacionId = asignacion_id ?? existing.asignacion_id;
    const nextEstudianteId = estudiante_id ?? existing.estudiante_id;
    const nextMateriaId = materia_id ?? existing.materia_id;

    await pool.execute(
      `UPDATE asistencias
          SET estudiante_id = ?,
              materia_id = ?,
              estado = ?,
              fecha = ?,
              asignacion_id = ?
        WHERE id = ?`,
      [
        nextEstudianteId,
        nextMateriaId,
        nextEstado,
        nextFecha,
        nextAsignacionId,
        id,
      ]
    );

    const record = {
      id: Number(id),
      estudiante_id: nextEstudianteId,
      materia_id: nextMateriaId,
      estado: nextEstado,
      fecha: nextFecha,
      profesor_id: existing.profesor_id,
      asignacion_id: nextAsignacionId,
    };

    const socket = req.app.get('io');
    socket.to(`profesor:${existing.profesor_id}`).emit('attendance:updated', record);
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

app.use((err, req, res, next) => {
  console.error('Attendance service error:', err);
  const status = err.statusCode || err.status || 500;
  const message = status === 500 ? 'Error interno del servidor' : err.message;
  res.status(status).json({ error: message });
});

httpServer.listen(env.PORT, () => {
  console.log(`Attendance Service running with realtime events on http://localhost:${env.PORT}`);
});

