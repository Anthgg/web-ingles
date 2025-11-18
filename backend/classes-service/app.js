const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createConfig } = require('../config');

const app = express();
const config = createConfig({
  serviceName: 'classes-service',
  serviceRoot: __dirname,
  defaults: {
    DB_NAME: 'instenglish_classes',
    PORT: 3005,
  },
});

const { env, corsOrigins } = config;

app.use(cors({ origin: corsOrigins.length ? corsOrigins : true, credentials: true }));
app.use(express.json());

let cachedJwtSecret;
const resolveJwtSecret = () => {
  if (cachedJwtSecret) {
    return cachedJwtSecret;
  }

  const candidate = typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : env.JWT_SECRET;

  if (!candidate) {
    throw new Error('JWT_SECRET no configurado. Define una clave compartida para todos los servicios.');
  }

  cachedJwtSecret = candidate;
  return cachedJwtSecret;
};

let SECRET_KEY;
try {
  SECRET_KEY = resolveJwtSecret();
} catch (error) {
  console.error('JWT configuration error:', error.message);
  process.exit(1);
}

// Pool de conexiones
const pool = mysql.createPool({
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  port: env.DB_PORT,
  waitForConnections: true,
  connectionLimit: env.DB_POOL_SIZE,
  queueLimit: 0
});

// Helper async
const asyncHandler = handler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

// Middleware JWT con roles
function authMiddleware(allowedRoles = []) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token requerido' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      req.user = decoded;

      if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.rol)) {
        return res.status(403).json({ error: 'No tienes permiso para acceder a este recurso' });
      }
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido' });
    }
  };
}

/* ===================== Rutas: Materias ===================== */

// Listar materias
app.get('/materias', authMiddleware(['administrativo', 'admin', 'profesor', 'estudiante']), asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM materias');
  res.json(rows);
}));

// Crear materia
app.post('/materias', authMiddleware(['administrativo']), asyncHandler(async (req, res) => {
  const { nombre, descripcion } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });

  const [result] = await pool.execute(
    'INSERT INTO materias (nombre, descripcion) VALUES (?, ?)',
    [nombre, descripcion ?? null]
  );
  res.status(201).json({ id: result.insertId, nombre, descripcion: descripcion ?? null });
}));

// Actualizar materia
app.put('/materias/:id', authMiddleware(['administrativo']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });

  const [r] = await pool.execute(
    'UPDATE materias SET nombre = ?, descripcion = ? WHERE id = ?',
    [nombre, descripcion ?? null, id]
  );
  if (r.affectedRows === 0) return res.status(404).json({ error: 'Materia no encontrada' });
  res.json({ message: 'Materia actualizada correctamente' });
}));

// Eliminar materia
app.delete('/materias/:id', authMiddleware(['administrativo']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [r] = await pool.execute('DELETE FROM materias WHERE id = ?', [id]);
  if (r.affectedRows === 0) return res.status(404).json({ error: 'Materia no encontrada' });
  res.json({ message: 'Materia eliminada correctamente' });
}));

/* ===================== Rutas: Ciclos ===================== */

// Listar ciclos
app.get('/ciclos', authMiddleware(), asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM ciclos');
  res.json(rows);
}));

// Crear ciclo
app.post('/ciclos', authMiddleware(['administrativo']), asyncHandler(async (req, res) => {
  const { nombre, fecha_inicio, fecha_fin } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });

  const [result] = await pool.execute(
    'INSERT INTO ciclos (nombre, fecha_inicio, fecha_fin) VALUES (?, ?, ?)',
    [nombre, fecha_inicio ?? null, fecha_fin ?? null]
  );
  res.status(201).json({ id: result.insertId, nombre, fecha_inicio: fecha_inicio ?? null, fecha_fin: fecha_fin ?? null });
}));

// Asignar materia a ciclo
app.post('/ciclos/:cicloId/materias', authMiddleware(['administrativo']), asyncHandler(async (req, res) => {
  const { cicloId } = req.params;
  const { materia_id } = req.body;
  if (!materia_id) return res.status(400).json({ error: 'ID de materia requerido' });

  await pool.execute(
    'INSERT INTO cursos_ciclos (ciclo_id, materia_id) VALUES (?, ?)',
    [cicloId, materia_id]
  );
  res.status(201).json({ message: 'Materia asignada al ciclo correctamente' });
}));

/* ===================== Rutas: Asignaciones ===================== */

// Asignar alumno a ciclo y curso en transacción
app.post('/asignar-ciclo-curso', authMiddleware(['administrativo']), asyncHandler(async (req, res) => {
  const { alumno_id, ciclo_id, materia_id } = req.body;
  if (!alumno_id || !ciclo_id || !materia_id) {
    return res.status(400).json({ error: 'Todos los IDs son requeridos' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute(
      'INSERT INTO alumnos_ciclos (alumno_id, ciclo_id) VALUES (?, ?)',
      [alumno_id, ciclo_id]
    );

    await conn.execute(
      'INSERT INTO cursos_ciclos (ciclo_id, materia_id) VALUES (?, ?)',
      [ciclo_id, materia_id]
    );

    await conn.commit();
    res.status(201).json({ message: 'Alumno y curso asignados al ciclo correctamente' });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}));

// Materias de un alumno según su ciclo actual
app.get('/alumnos/:alumnoId/materias', authMiddleware(), asyncHandler(async (req, res) => {
  const { alumnoId } = req.params;

  const [cicloRows] = await pool.query(
    'SELECT ciclo_id FROM alumnos_ciclos WHERE alumno_id = ? ORDER BY id DESC LIMIT 1',
    [alumnoId]
  );
  if (!cicloRows.length) return res.status(404).json({ error: 'Alumno no tiene ciclo asignado' });

  const cicloId = cicloRows[0].ciclo_id;

  const [materiasRows] = await pool.query(
    `SELECT m.*, cc.id AS curso_ciclo_id
     FROM cursos_ciclos cc
     JOIN materias m ON cc.materia_id = m.id
     WHERE cc.ciclo_id = ?`,
    [cicloId]
  );

  res.json({ ciclo_id: cicloId, materias: materiasRows });
}));

// ENDPOINT TEMPORAL: Configurar fechas para todos los cursos (SIN AUTENTICACIÓN TEMPORAL)
app.post('/cursos/configurar-fechas-temp', asyncHandler(async (req, res) => {
  const { fecha_inicio, fecha_fin } = req.body;
  
  const inicio = fecha_inicio || '2025-10-01';
  const fin = fecha_fin || '2025-12-31';
  
  await pool.execute(
    'UPDATE cursos SET fecha_inicio = ?, fecha_fin = ? WHERE fecha_inicio IS NULL OR fecha_fin IS NULL',
    [inicio, fin]
  );
  
  const [cursos] = await pool.query('SELECT id, nombre, fecha_inicio, fecha_fin FROM cursos');
  
  res.json({ 
    message: 'Fechas configuradas correctamente',
    cursos: cursos
  });
}));

// ENDPOINT TEMPORAL: Configurar fechas para todos los cursos
app.post('/cursos/configurar-fechas', authMiddleware(['administrativo', 'admin']), asyncHandler(async (req, res) => {
  const { fecha_inicio, fecha_fin } = req.body;
  
  const inicio = fecha_inicio || '2025-10-01';
  const fin = fecha_fin || '2025-12-31';
  
  await pool.execute(
    'UPDATE cursos SET fecha_inicio = ?, fecha_fin = ? WHERE fecha_inicio IS NULL OR fecha_fin IS NULL',
    [inicio, fin]
  );
  
  const [cursos] = await pool.query('SELECT id, nombre, fecha_inicio, fecha_fin FROM cursos');
  
  res.json({ 
    message: 'Fechas configuradas correctamente',
    cursos: cursos
  });
}));

/* ===================== Error handler único ===================== */
app.use((err, req, res, next) => {
  console.error('Error en Classes Service:', err);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Error interno del servidor' : err.message,
    message: env.NODE_ENV === 'development' ? err.message : undefined
  });
});

/* ===================== Inicio del servidor (una sola vez) ===================== */
app.listen(env.PORT, () => {
  console.log(`Servicio de clases escuchando en puerto ${env.PORT}`);
});
