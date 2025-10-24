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
  serviceName: 'asignation-service',
  serviceRoot: __dirname,
  overrides: {
    ASIGNATION_SECRET_KEY: str({ default: '' }),
    AUTH_DB_HOST: str({ default: '' }),
    AUTH_DB_USER: str({ default: '' }),
    AUTH_DB_PASSWORD: str({ default: '' }),
    AUTH_DB_NAME: str({ default: 'instenglish_auth' }),
    AUTH_DB_PORT: num({ default: 3306 }),
    AUTH_DB_POOL_SIZE: num({ default: 10 }),
    CLASSES_DB_HOST: str({ default: '' }),
    CLASSES_DB_USER: str({ default: '' }),
    CLASSES_DB_PASSWORD: str({ default: '' }),
    CLASSES_DB_NAME: str({ default: 'instenglish_classes' }),
    CLASSES_DB_PORT: num({ default: 3306 }),
    CLASSES_DB_POOL_SIZE: num({ default: 10 }),
  },
  defaults: {
    DB_NAME: 'instenglish_asignation',
    PORT: 3007,
  },
});

const { env, corsOrigins } = config;
const allowedOrigins = corsOrigins.length ? corsOrigins : ['http://localhost:3000'];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

const SECRET_KEY = config.get('ASIGNATION_SECRET_KEY') || env.JWT_SECRET;

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

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins.length ? allowedOrigins : '*',
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
    if (decoded.rol === 'estudiante') {
      socket.join(`estudiante:${decoded.id}`);
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

// Helper: resolve or create classroom_id from level/grade_number/section
const resolveOrCreateClassroom = async ({ classroom_id, level, grade_number, section }) => {
  if (classroom_id) return classroom_id;

  const rawLevel = typeof level === 'string' ? level.trim() : level;
  const resolvedGrade = grade_number != null && grade_number !== '' ? Number(grade_number) : null;
  const resolvedSection = typeof section === 'string' ? section.trim().toUpperCase() : section;

  if (!rawLevel || resolvedGrade === null || Number.isNaN(resolvedGrade) || !resolvedSection) {
    throw Object.assign(new Error('classroom_id o level/grade_number/section requeridos'), { status: 400 });
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
    const error = new Error(
      `Nivel de aula no reconocido: "${rawLevel}". Niveles permitidos: ${metadata.allowedLevels.join(', ')}`
    );
    error.status = 400;
    error.code = 'CLASSROOM_LEVEL_UNSUPPORTED';
    throw error;
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
        // Continue trying next candidate when enum mismatch
      }
    }

    throw lastError || new Error('No fue posible crear el registro de aula');
  } finally {
    conn.release();
  }
};

const resolveProfesor = async ({ profesorId, profesorNombre }) => {
  let resolvedId = profesorId || null;
  let resolvedNombre = profesorNombre || null;

  if (resolvedId && !resolvedNombre) {
    const [rows] = await usersPool.execute(
      'SELECT nombre FROM usuarios WHERE id = ? AND rol = "profesor" LIMIT 1',
      [resolvedId]
    );
    if (!rows.length) {
      throw Object.assign(new Error('Profesor no encontrado'), { status: 400 });
    }
    resolvedNombre = rows[0].nombre;
  }

  if (!resolvedId && resolvedNombre) {
    const [rows] = await usersPool.execute(
      'SELECT id FROM usuarios WHERE nombre = ? AND rol = "profesor" LIMIT 1',
      [resolvedNombre]
    );
    if (!rows.length) {
      throw Object.assign(new Error('Profesor no encontrado'), { status: 400 });
    }
    resolvedId = rows[0].id;
  }

  if (!resolvedId || !resolvedNombre) {
    throw Object.assign(new Error('profesorId o profesorNombre requeridos'), { status: 400 });
  }

  return { profesorId: resolvedId, profesorNombre: resolvedNombre };
};

const enrichAssignmentsWithClassroom = async (assignments = []) => {
  if (!Array.isArray(assignments) || assignments.length === 0) {
    return assignments;
  }

  const classroomIds = Array.from(
    new Set(
      assignments
        .map((assignment) => (assignment.classroom_id != null ? Number(assignment.classroom_id) : null))
        .filter((id) => id != null && !Number.isNaN(id))
    )
  );

  const classroomMap = new Map();
  if (classroomIds.length > 0) {
    const placeholders = classroomIds.map(() => '?').join(',');
    const [classrooms] = await classesPool.query(
      `SELECT id, level, grade_number, section FROM classrooms WHERE id IN (${placeholders})`,
      classroomIds
    );
    classrooms.forEach((classroom) => {
      classroomMap.set(Number(classroom.id), classroom);
    });
  }

  return assignments.map((assignment) => {
    const classroom = assignment.classroom_id != null ? classroomMap.get(Number(assignment.classroom_id)) : null;
    const rawGrade = classroom?.grade_number ?? null;
    const numericGrade = rawGrade != null ? Number(rawGrade) : null;
    const resolvedGrade = numericGrade != null && !Number.isNaN(numericGrade) ? numericGrade : rawGrade ?? null;
    return {
      ...assignment,
      level: classroom?.level ?? null,
      grade_number: resolvedGrade,
      section: classroom?.section ?? null,
    };
  });
};

const fetchAssignment = async (id) => {
  const [[assignment]] = await pool.execute(
    `SELECT id, profesor_id, profesor_nombre, curso_id, curso_nombre,
            dia_semana, hora_inicio, hora_fin, fecha_inicio, fecha_fin,
            aula, notas, max_alumnos, classroom_id
       FROM asignaciones_profesor_curso
      WHERE id = ?`,
    [id]
  );
  if (!assignment) {
    return null;
  }
  const [enriched] = await enrichAssignmentsWithClassroom([assignment]);
  return enriched || null;
};

const countEnrollments = async (asignacionId) => {
  const [[row]] = await pool.execute(
    'SELECT COUNT(*) AS total FROM asignacion_estudiantes WHERE asignacion_id = ?',
    [asignacionId]
  );
  return Number(row?.total || 0);
};

const studentIsEnrolled = async (asignacionId, estudianteId) => {
  const [[row]] = await pool.execute(
    'SELECT 1 FROM asignacion_estudiantes WHERE asignacion_id = ? AND estudiante_id = ? LIMIT 1',
    [asignacionId, estudianteId]
  );
  return Boolean(row);
};

const broadcastAssignmentChange = (action, assignment = {}, extra = {}) => {
  const payload = { action, assignment, ...extra };
  io.emit('assignments:changed', payload);
  if (assignment?.profesor_id) {
    io.to(`profesor:${assignment.profesor_id}`).emit(`assignments:${action}`, payload);
  }
  if (assignment?.id) {
    io.to(`asignacion:${assignment.id}`).emit(`assignments:${action}`, payload);
  }
};

app.get(
  '/asignaciones',
  authMiddleware(['administrativo', 'profesor']),
  asyncHandler(async (req, res) => {
    const { cursoId, profesorId, diaSemana } = req.query;
    const filters = [];
    const params = [];

    if (req.user.rol === 'profesor') {
      filters.push('(a.profesor_id = ? OR a.profesor_nombre = ?)');
      params.push(req.user.id, req.user.nombre);
    }

    if (profesorId) {
      filters.push('a.profesor_id = ?');
      params.push(profesorId);
    }

    if (cursoId) {
      filters.push('a.curso_id = ?');
      params.push(cursoId);
    }

    if (diaSemana) {
      filters.push('a.dia_semana = ?');
      params.push(diaSemana);
    }

    let query = `
      SELECT a.id, a.profesor_id, a.profesor_nombre, a.curso_id, a.curso_nombre,
             a.dia_semana, a.hora_inicio, a.hora_fin, a.fecha_inicio, a.fecha_fin,
             a.aula, a.notas, a.max_alumnos, a.classroom_id
        FROM asignaciones_profesor_curso a`;

    if (filters.length) {
      query += ' WHERE ' + filters.join(' AND ');
    }

    query += ' ORDER BY a.fecha_inicio DESC, a.hora_inicio ASC';

    const [rows] = await pool.execute(query, params);
    const enriched = await enrichAssignmentsWithClassroom(rows);
    res.json({ success: true, data: enriched, count: enriched.length });
  })
);

app.get(
  '/asignaciones/mis-cursos',
  authMiddleware(['estudiante']),
  asyncHandler(async (req, res) => {
    const estudianteId = req.user.id;

    const [rows] = await pool.execute(
      `SELECT a.id, a.profesor_id, a.profesor_nombre, a.curso_id, a.curso_nombre,
              a.dia_semana, a.hora_inicio, a.hora_fin, a.fecha_inicio, a.fecha_fin,
              a.aula, a.notas, a.max_alumnos,
              COUNT(ae.id) AS inscritos,
              MAX(se.fecha_inscripcion) as fecha_inscripcion
         FROM asignaciones_profesor_curso a
         JOIN asignacion_estudiantes se
           ON se.asignacion_id = a.id AND se.estudiante_id = ?
         LEFT JOIN asignacion_estudiantes ae
           ON ae.asignacion_id = a.id
  GROUP BY a.id, a.profesor_id, a.profesor_nombre, a.curso_id, a.curso_nombre,
           a.dia_semana, a.hora_inicio, a.hora_fin, a.fecha_inicio, a.fecha_fin,
           a.aula, a.notas, a.max_alumnos
        ORDER BY a.fecha_inicio DESC, a.hora_inicio ASC`,
      [estudianteId]
    );

    res.json(rows);
  })
);

app.get(
  '/asignaciones/disponibles',
  authMiddleware(['estudiante']),
  asyncHandler(async (req, res) => {
    const estudianteId = req.user.id;

    const [rows] = await pool.execute(
      `SELECT a.id, a.profesor_id, a.profesor_nombre, a.curso_id, a.curso_nombre,
              a.dia_semana, a.hora_inicio, a.hora_fin, a.fecha_inicio, a.fecha_fin,
              a.aula, a.notas, a.max_alumnos,
              COUNT(ae.id) AS inscritos,
              CASE
                WHEN a.max_alumnos IS NULL THEN NULL
                ELSE a.max_alumnos - COUNT(ae.id)
              END AS cupos_disponibles,
              SUM(CASE WHEN ae.estudiante_id = ? THEN 1 ELSE 0 END) AS esta_inscrito
         FROM asignaciones_profesor_curso a
         LEFT JOIN asignacion_estudiantes ae
           ON ae.asignacion_id = a.id
        WHERE a.fecha_fin IS NULL OR a.fecha_fin >= CURDATE()
        GROUP BY a.id
        HAVING esta_inscrito = 0
           AND (a.max_alumnos IS NULL OR cupos_disponibles > 0)
        ORDER BY a.fecha_inicio ASC, a.hora_inicio ASC`,
      [estudianteId]
    );

    res.json(rows);
  })
);

app.get(
  '/asignaciones/:id',
  authMiddleware(['administrativo', 'profesor', 'estudiante']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const assignment = await fetchAssignment(id);

    if (!assignment) {
      return res.status(404).json({ error: 'No encontrada' });
    }

    if (
      req.user.rol === 'profesor' &&
      assignment.profesor_id != null &&
      Number(assignment.profesor_id) !== Number(req.user.id)
    ) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    if (req.user.rol === 'estudiante') {
      const belongs = await studentIsEnrolled(id, req.user.id);
      if (!belongs) {
        return res.status(403).json({ error: 'Permisos insuficientes' });
      }
    }

    res.json(assignment);
  })
);

app.post(
  '/asignaciones/:id/inscripcion',
  authMiddleware(['estudiante']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const estudianteId = req.user.id;

    const assignment = await fetchAssignment(id);
    if (!assignment) {
      return res.status(404).json({ error: 'Asignacion no encontrada' });
    }

    const alreadyEnrolled = await studentIsEnrolled(id, estudianteId);
    if (alreadyEnrolled) {
      return res.status(409).json({ error: 'Ya estas inscrito en este curso' });
    }

    const total = await countEnrollments(id);
    if (assignment.max_alumnos != null && total >= assignment.max_alumnos) {
      return res.status(409).json({ error: 'No hay cupos disponibles' });
    }

    await pool.execute(
      'INSERT INTO asignacion_estudiantes (asignacion_id, estudiante_id) VALUES (?, ?)',
      [id, estudianteId]
    );

    const inscritos = total + 1;
    const cuposRestantes = assignment.max_alumnos != null
      ? Math.max(assignment.max_alumnos - inscritos, 0)
      : null;

    broadcastAssignmentChange('student-added', assignment, {
      estudiante_id: estudianteId,
      inscritos,
      cupos_restantes: cuposRestantes,
    });

    res.status(201).json({
      message: 'Inscripcion registrada',
      assignment,
      inscritos,
      cuposRestantes,
    });
  })
);

app.delete(
  '/asignaciones/:id/inscripcion',
  authMiddleware(['estudiante']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const estudianteId = req.user.id;

    const assignment = await fetchAssignment(id);
    if (!assignment) {
      return res.status(404).json({ error: 'Asignacion no encontrada' });
    }

    const [result] = await pool.execute(
      'DELETE FROM asignacion_estudiantes WHERE asignacion_id = ? AND estudiante_id = ?',
      [id, estudianteId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'No estabas inscrito en este curso' });
    }

    const inscritos = await countEnrollments(id);
    const cuposRestantes = assignment.max_alumnos != null
      ? Math.max(assignment.max_alumnos - inscritos, 0)
      : null;

    broadcastAssignmentChange('student-removed', assignment, {
      estudiante_id: estudianteId,
      inscritos,
      cupos_restantes: cuposRestantes,
    });

    res.json({
      message: 'Inscripcion cancelada',
      assignment,
      inscritos,
      cuposRestantes,
    });
  })
);

app.post(
  '/asignaciones',
  authMiddleware(['administrativo']),
  asyncHandler(async (req, res) => {
    const {
      profesorId,
      profesorNombre,
      cursoId,
      cursoNombre,
      classroom_id,
      level,
      grade_number,
      section,
      diaSemana,
      horaInicio,
      horaFin,
      fechaInicio,
      fechaFin,
      aula = null,
      notas = null,
      maxAlumnos,
    } = req.body;

    if (
      !diaSemana ||
      !horaInicio ||
      !horaFin ||
      !fechaInicio ||
      !fechaFin ||
      !maxAlumnos
    ) {
      return res.status(400).json({ error: 'Campos requeridos incompletos' });
    }

    const profesor = await resolveProfesor({ profesorId, profesorNombre });
    let classroomId = null;
    try {
      classroomId = await resolveOrCreateClassroom({ classroom_id, level, grade_number, section });
    } catch (e) {
      const status = e.status || 400;
      return res.status(status).json({ error: e.message });
    }
    const effectiveCursoNombre = cursoNombre || null;

    const [result] = await pool.execute(
      `INSERT INTO asignaciones_profesor_curso
         (profesor_id, profesor_nombre, curso_id, curso_nombre, classroom_id, dia_semana, hora_inicio, hora_fin, fecha_inicio, fecha_fin, aula, notas, max_alumnos)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        profesor.profesorId,
        profesor.profesorNombre,
        cursoId || null,
        effectiveCursoNombre,
        classroomId,
        diaSemana,
        horaInicio,
        horaFin,
        fechaInicio,
        fechaFin,
        aula,
        notas,
        maxAlumnos,
      ]
    );

    const assignment = {
      id: result.insertId,
      profesor_id: profesor.profesorId,
      profesor_nombre: profesor.profesorNombre,
      curso_id: cursoId || null,
      curso_nombre: effectiveCursoNombre,
      classroom_id: classroomId,
      dia_semana: diaSemana,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      aula,
      notas,
      max_alumnos: maxAlumnos,
    };

    broadcastAssignmentChange('created', assignment);

    res.status(201).json({ message: 'Creado', assignment });
  })
);

app.put(
  '/asignaciones/:id',
  authMiddleware(['administrativo']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      profesorId,
      profesorNombre,
      cursoId,
      cursoNombre,
      classroom_id,
      level,
      grade_number,
      section,
      diaSemana,
      horaInicio,
      horaFin,
      fechaInicio,
      fechaFin,
      aula = null,
      notas = null,
      maxAlumnos,
    } = req.body;

    const existing = await fetchAssignment(id);
    if (!existing) {
      return res.status(404).json({ error: 'No encontrada' });
    }

    if (
      !diaSemana ||
      !horaInicio ||
      !horaFin ||
      !fechaInicio ||
      !fechaFin ||
      !maxAlumnos
    ) {
      return res.status(400).json({ error: 'Campos requeridos incompletos' });
    }

    const profesor = await resolveProfesor({
      profesorId: profesorId ?? existing.profesor_id,
      profesorNombre: profesorNombre ?? existing.profesor_nombre,
    });

    const nextCursoId = cursoId ?? existing.curso_id;
    const nextCursoNombre = cursoNombre ?? existing.curso_nombre;
    let classroomId = existing.classroom_id || null;
    try {
      classroomId = await resolveOrCreateClassroom({ classroom_id: classroom_id ?? existing.classroom_id, level, grade_number, section });
    } catch (e) {
      const status = e.status || 400;
      return res.status(status).json({ error: e.message });
    }

    await pool.execute(
      `UPDATE asignaciones_profesor_curso SET
         profesor_id = ?,
         profesor_nombre = ?,
         curso_id = ?,
         curso_nombre = ?,
         classroom_id = ?,
         dia_semana = ?,
         hora_inicio = ?,
         hora_fin = ?,
         fecha_inicio = ?,
         fecha_fin = ?,
         aula = ?,
         notas = ?,
         max_alumnos = ?
       WHERE id = ?`,
      [
        profesor.profesorId,
        profesor.profesorNombre,
        nextCursoId,
        nextCursoNombre,
        classroomId,
        diaSemana,
        horaInicio,
        horaFin,
        fechaInicio,
        fechaFin,
        aula,
        notas,
        maxAlumnos,
        id,
      ]
    );

    const assignment = {
      id: Number(id),
      profesor_id: profesor.profesorId,
      profesor_nombre: profesor.profesorNombre,
      curso_id: nextCursoId,
      curso_nombre: nextCursoNombre,
      classroom_id: classroomId,
      dia_semana: diaSemana,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      aula,
      notas,
      max_alumnos: maxAlumnos,
    };

    broadcastAssignmentChange('updated', assignment);

    res.json({ message: 'Actualizado', assignment });
  })
);

app.delete(
  '/asignaciones/:id',
  authMiddleware(['administrativo']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const assignment = await fetchAssignment(id);
    if (!assignment) {
      return res.status(404).json({ error: 'No encontrada' });
    }

    await pool.execute('DELETE FROM asignaciones_profesor_curso WHERE id = ?', [id]);
    await pool.execute('DELETE FROM asignacion_estudiantes WHERE asignacion_id = ?', [id]);

    broadcastAssignmentChange('deleted', { id: Number(id), profesor_id: assignment.profesor_id });

    res.json({ message: 'Eliminada' });
  })
);

app.get(
  '/asignaciones/:id/estudiantes',
  authMiddleware(['administrativo', 'profesor']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const assignment = await fetchAssignment(id);
    if (!assignment) {
      return res.status(404).json({ error: 'Asignacion no encontrada' });
    }

    if (
      req.user.rol === 'profesor' &&
      assignment.profesor_id != null &&
      Number(assignment.profesor_id) !== Number(req.user.id)
    ) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    const [rows] = await pool.execute(
      `SELECT ae.id, ae.estudiante_id, ae.fecha_inscripcion
         FROM asignacion_estudiantes ae
        WHERE ae.asignacion_id = ?
        ORDER BY ae.id DESC`,
      [id]
    );

    res.json(rows);
  })
);

app.post(
  '/asignaciones/:id/estudiantes',
  authMiddleware(['administrativo', 'profesor']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { estudianteId } = req.body;

    if (!estudianteId) {
      return res.status(400).json({ error: 'estudianteId requerido' });
    }

    const assignment = await fetchAssignment(id);
    if (!assignment) {
      return res.status(404).json({ error: 'Asignacion no encontrada' });
    }

    if (
      req.user.rol === 'profesor' &&
      assignment.profesor_id != null &&
      Number(assignment.profesor_id) !== Number(req.user.id)
    ) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    const total = await countEnrollments(id);
    if (assignment.max_alumnos != null && total >= assignment.max_alumnos) {
      return res.status(409).json({ error: 'No hay cupos disponibles' });
    }

    await pool.execute(
      'INSERT IGNORE INTO asignacion_estudiantes (asignacion_id, estudiante_id) VALUES (?, ?)',
      [id, estudianteId]
    );

    broadcastAssignmentChange('student-added', assignment, { estudiante_id: estudianteId });

    res.status(201).json({ message: 'Estudiante vinculado' });
  })
);

app.delete(
  '/asignaciones/:id/estudiantes/:estudianteId',
  authMiddleware(['administrativo', 'profesor']),
  asyncHandler(async (req, res) => {
    const { id, estudianteId } = req.params;

    const assignment = await fetchAssignment(id);
    if (!assignment) {
      return res.status(404).json({ error: 'Asignacion no encontrada' });
    }

    if (
      req.user.rol === 'profesor' &&
      assignment.profesor_id != null &&
      Number(assignment.profesor_id) !== Number(req.user.id)
    ) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    await pool.execute(
      'DELETE FROM asignacion_estudiantes WHERE asignacion_id = ? AND estudiante_id = ?',
      [id, estudianteId]
    );

    broadcastAssignmentChange('student-removed', assignment, { estudiante_id: Number(estudianteId) });

    res.json({ message: 'Estudiante desvinculado' });
  })
);

app.get(
  '/profesores',
  authMiddleware(),
  asyncHandler(async (req, res) => {
    const [rows] = await pool.execute(
      'SELECT DISTINCT profesor_id, profesor_nombre AS nombre FROM asignaciones_profesor_curso ORDER BY profesor_nombre'
    );
    res.json(rows);
  })
);

app.get(
  '/cursos',
  authMiddleware(),
  asyncHandler(async (req, res) => {
    const [rows] = await pool.execute(
      'SELECT DISTINCT curso_id, curso_nombre AS nombre FROM asignaciones_profesor_curso ORDER BY curso_nombre'
    );
    res.json(rows);
  })
);

app.get(
  '/todos-cursos',
  authMiddleware(),
  asyncHandler(async (req, res) => {
    const [rows] = await pool.execute('SELECT id, nombre FROM cursos ORDER BY nombre');
    res.json(rows);
  })
);

app.get(
  '/cursos-con-profesor',
  authMiddleware(),
  asyncHandler(async (req, res) => {
    const [rows] = await pool.execute(
      `SELECT 
          apc.id,
          apc.curso_id,
          apc.curso_nombre AS nombre,
          apc.profesor_id,
          apc.profesor_nombre AS profesor,
          apc.classroom_id,
          CONCAT(apc.curso_nombre, '|', apc.profesor_nombre) AS curso_profesor_key,
          apc.dia_semana,
          apc.hora_inicio,
          apc.hora_fin,
          apc.fecha_inicio,
          apc.fecha_fin,
          apc.max_alumnos,
          COUNT(ae.id) AS inscritos
        FROM asignaciones_profesor_curso apc
        LEFT JOIN asignacion_estudiantes ae ON ae.asignacion_id = apc.id
       WHERE apc.profesor_nombre IS NOT NULL
         AND apc.curso_nombre IS NOT NULL
       GROUP BY apc.id
       ORDER BY apc.curso_nombre`
    );

    const classroomIds = Array.from(
      new Set(
        rows
          .map((row) => (row.classroom_id ? Number(row.classroom_id) : null))
          .filter((id) => id !== null)
      )
    );

    const classroomMap = new Map();
    if (classroomIds.length) {
      const placeholders = classroomIds.map(() => '?').join(',');
      const [classrooms] = await classesPool.query(
        `SELECT id, level, grade_number, section FROM classrooms WHERE id IN (${placeholders})`,
        classroomIds
      );
      classrooms.forEach((classroom) => {
        classroomMap.set(Number(classroom.id), classroom);
      });
    }

    const enriched = rows.map((row) => {
      const classroom = row.classroom_id ? classroomMap.get(Number(row.classroom_id)) : null;
      const inscritos = Number(row.inscritos || 0);
      const maxAlumnos = row.max_alumnos != null ? Number(row.max_alumnos) : null;
      return {
        ...row,
        inscritos,
        disponibles: maxAlumnos != null ? Math.max(maxAlumnos - inscritos, 0) : null,
        level: classroom?.level || null,
        grade_number: classroom?.grade_number || null,
        section: classroom?.section || null,
      };
    });

    res.json(enriched);
  })
);

app.get(
  '/profesores/:id/agenda',
  authMiddleware(['administrativo', 'profesor']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (req.user.rol === 'profesor' && Number(req.user.id) !== Number(id)) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    const [rows] = await pool.execute(
      `SELECT id, curso_nombre, dia_semana, hora_inicio, hora_fin, fecha_inicio, fecha_fin, aula
         FROM asignaciones_profesor_curso
        WHERE profesor_id = ? OR profesor_nombre = ?
        ORDER BY fecha_inicio DESC, hora_inicio ASC`,
      [id, req.user.nombre]
    );

    res.json(rows);
  })
);

app.get('/test', (req, res) => {
  res.json({ message: 'Servidor funcionando correctamente', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('Asignation service error:', err);
  const status = err.statusCode || err.status || 500;
  const message = status === 500 ? 'Error interno del servidor' : err.message;
  res.status(status).json({ error: message });
});

httpServer.listen(env.PORT, () => {
  console.log(`API de Asignaciones con eventos en tiempo real corriendo en http://localhost:${env.PORT}`);
});

