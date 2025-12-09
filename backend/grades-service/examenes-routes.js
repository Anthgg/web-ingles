/**
 * Módulo de Rutas de Exámenes Avanzadas
 * Sistema de exámenes con validación por nivel educativo
 * 
 * Características:
 * - Primaria: Exámenes BIMESTRALES (4 periodos)
 * - Secundaria: Exámenes TRIMESTRALES (3 periodos)
 * - Validación automática de tipo de examen según nivel
 * - Estados de examen: BORRADOR, ABIERTO, EN_EVALUACION, CERRADO, ANULADO
 * - Bloqueo de edición de notas cuando el examen está cerrado
 * - Historial de cambios para auditoría
 */

const TIPOS_EXAMEN = {
  BIMESTRAL_1: { label: 'Primer Bimestre', periodo: 1, tipo: 'BIMESTRE' },
  BIMESTRAL_2: { label: 'Segundo Bimestre', periodo: 2, tipo: 'BIMESTRE' },
  BIMESTRAL_3: { label: 'Tercer Bimestre', periodo: 3, tipo: 'BIMESTRE' },
  BIMESTRAL_4: { label: 'Cuarto Bimestre', periodo: 4, tipo: 'BIMESTRE' },
  TRIMESTRAL_1: { label: 'Primer Trimestre', periodo: 1, tipo: 'TRIMESTRE' },
  TRIMESTRAL_2: { label: 'Segundo Trimestre', periodo: 2, tipo: 'TRIMESTRE' },
  TRIMESTRAL_3: { label: 'Tercer Trimestre', periodo: 3, tipo: 'TRIMESTRE' },
  PARCIAL: { label: 'Examen Parcial', periodo: null, tipo: 'OTRO' },
  FINAL: { label: 'Examen Final', periodo: null, tipo: 'OTRO' },
  RECUPERACION: { label: 'Recuperación', periodo: null, tipo: 'OTRO' },
  OTRO: { label: 'Otro', periodo: null, tipo: 'OTRO' },
};

const NIVELES_CONFIG = {
  Primaria: {
    tipos_permitidos: ['BIMESTRAL_1', 'BIMESTRAL_2', 'BIMESTRAL_3', 'BIMESTRAL_4', 'PARCIAL', 'FINAL', 'RECUPERACION', 'OTRO'],
    cantidad_periodos: 4,
    tipo_periodo: 'BIMESTRE',
  },
  Secundaria: {
    tipos_permitidos: ['TRIMESTRAL_1', 'TRIMESTRAL_2', 'TRIMESTRAL_3', 'PARCIAL', 'FINAL', 'RECUPERACION', 'OTRO'],
    cantidad_periodos: 3,
    tipo_periodo: 'TRIMESTRE',
  },
  Inicial: {
    tipos_permitidos: ['BIMESTRAL_1', 'BIMESTRAL_2', 'BIMESTRAL_3', 'BIMESTRAL_4', 'OTRO'],
    cantidad_periodos: 4,
    tipo_periodo: 'BIMESTRE',
  },
  Basico: {
    tipos_permitidos: ['BIMESTRAL_1', 'BIMESTRAL_2', 'BIMESTRAL_3', 'BIMESTRAL_4', 'PARCIAL', 'FINAL', 'RECUPERACION', 'OTRO'],
    cantidad_periodos: 4,
    tipo_periodo: 'BIMESTRE',
  },
  Intermedio: {
    tipos_permitidos: ['TRIMESTRAL_1', 'TRIMESTRAL_2', 'TRIMESTRAL_3', 'PARCIAL', 'FINAL', 'RECUPERACION', 'OTRO'],
    cantidad_periodos: 3,
    tipo_periodo: 'TRIMESTRE',
  },
  Avanzado: {
    tipos_permitidos: ['TRIMESTRAL_1', 'TRIMESTRAL_2', 'TRIMESTRAL_3', 'PARCIAL', 'FINAL', 'RECUPERACION', 'OTRO'],
    cantidad_periodos: 3,
    tipo_periodo: 'TRIMESTRE',
  },
};

const ESTADOS_EXAMEN = ['BORRADOR', 'ABIERTO', 'EN_EVALUACION', 'CERRADO', 'ANULADO'];

const ESTADOS_EDITABLES = ['BORRADOR', 'ABIERTO', 'EN_EVALUACION'];
const ESTADOS_NOTAS_PERMITIDAS = ['ABIERTO', 'EN_EVALUACION'];

/**
 * Obtiene la configuración de exámenes para un nivel educativo
 */
const getConfiguracionNivel = (nivel) => {
  if (!nivel) return null;
  const normalizado = nivel.charAt(0).toUpperCase() + nivel.slice(1).toLowerCase();
  return NIVELES_CONFIG[normalizado] || null;
};

/**
 * Valida si un tipo de examen es compatible con el nivel educativo
 */
const validarTipoExamenParaNivel = (nivel, tipoExamen) => {
  const config = getConfiguracionNivel(nivel);
  if (!config) {
    return { valid: false, error: `Nivel educativo no reconocido: ${nivel}` };
  }
  
  if (!config.tipos_permitidos.includes(tipoExamen)) {
    const tiposPermitidos = config.tipos_permitidos
      .map(t => TIPOS_EXAMEN[t]?.label || t)
      .join(', ');
    return {
      valid: false,
      error: `El tipo de examen "${TIPOS_EXAMEN[tipoExamen]?.label || tipoExamen}" no está permitido para el nivel ${nivel}. Tipos permitidos: ${tiposPermitidos}`,
    };
  }
  
  return { valid: true };
};

/**
 * Normaliza el nivel educativo de una asignación
 */
const normalizarNivel = (valor) => {
  if (!valor) return null;
  const lower = String(valor).toLowerCase().trim();
  
  if (lower.includes('primaria') || lower === 'elementary') return 'Primaria';
  if (lower.includes('secundaria') || lower === 'media' || lower === 'bachillerato') return 'Secundaria';
  if (lower.includes('inicial') || lower === 'kinder' || lower === 'preescolar') return 'Inicial';
  if (lower.includes('basico') || lower === 'basic') return 'Basico';
  if (lower.includes('intermedio') || lower === 'intermediate') return 'Intermedio';
  if (lower.includes('avanzado') || lower === 'advanced') return 'Avanzado';
  
  return valor.charAt(0).toUpperCase() + valor.slice(1).toLowerCase();
};

/**
 * Configura las rutas de exámenes avanzadas
 */
const setupExamenesRoutes = (app, { pool, assignationPool, classesPool, usersPool, authMiddleware, asyncHandler, io }) => {
  
  // Helpers
  const toNumberOrNull = (value) => {
    if (value === null || value === undefined) return null;
    const numeric = Number(value);
    return Number.isNaN(numeric) ? null : numeric;
  };

  const toIsoString = (value) => {
    if (!value) return null;
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value.toISOString();
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? (typeof value === 'string' ? value : null) : parsed.toISOString();
  };

  const formatDateKey = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  };

  const computeExamEstado = (nota) => {
    const numeric = Number(nota);
    if (Number.isNaN(numeric)) return null;
    return numeric >= 11 ? 'aprobado' : 'reprobado';
  };

  // Asegurar que las tablas tengan las columnas necesarias
  const ensureExamenesSchema = async () => {
    try {
      // Verificar y agregar columnas faltantes a examenes
      const columnsToAdd = [
        { name: 'nivel_educativo', sql: "ADD COLUMN nivel_educativo VARCHAR(50) DEFAULT NULL AFTER curso_nombre" },
        { name: 'tipo_examen', sql: "ADD COLUMN tipo_examen VARCHAR(50) DEFAULT 'OTRO' AFTER nivel_educativo" },
        { name: 'estado_examen', sql: "ADD COLUMN estado_examen VARCHAR(20) DEFAULT 'BORRADOR' AFTER tipo_examen" },
        { name: 'periodo_academico', sql: "ADD COLUMN periodo_academico VARCHAR(20) DEFAULT NULL AFTER estado_examen" },
        { name: 'fecha_cierre', sql: "ADD COLUMN fecha_cierre DATETIME DEFAULT NULL AFTER fecha" },
        { name: 'peso_porcentaje', sql: "ADD COLUMN peso_porcentaje DECIMAL(5,2) DEFAULT 100.00 AFTER periodo_academico" },
        { name: 'observaciones', sql: "ADD COLUMN observaciones TEXT DEFAULT NULL AFTER peso_porcentaje" },
        { name: 'cerrado_por', sql: "ADD COLUMN cerrado_por INT DEFAULT NULL AFTER observaciones" },
        { name: 'cerrado_at', sql: "ADD COLUMN cerrado_at DATETIME DEFAULT NULL AFTER cerrado_por" },
      ];

      for (const col of columnsToAdd) {
        try {
          const [[exists]] = await pool.query(
            `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'examenes' 
             AND COLUMN_NAME = ?`,
            [col.name]
          );
          if (!exists) {
            await pool.query(`ALTER TABLE examenes ${col.sql}`);
            console.log(`Columna ${col.name} agregada a examenes`);
          }
        } catch (err) {
          console.warn(`No se pudo agregar columna ${col.name}:`, err.message);
        }
      }

      // Verificar columnas en examen_calificaciones
      const calColumnsToAdd = [
        { name: 'observaciones', sql: "ADD COLUMN observaciones TEXT DEFAULT NULL AFTER estado" },
        { name: 'es_recuperacion', sql: "ADD COLUMN es_recuperacion TINYINT(1) DEFAULT 0 AFTER observaciones" },
        { name: 'nota_anterior', sql: "ADD COLUMN nota_anterior DECIMAL(4,2) DEFAULT NULL AFTER es_recuperacion" },
        { name: 'registrado_por', sql: "ADD COLUMN registrado_por INT DEFAULT NULL AFTER nota_anterior" },
      ];

      for (const col of calColumnsToAdd) {
        try {
          const [[exists]] = await pool.query(
            `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'examen_calificaciones' 
             AND COLUMN_NAME = ?`,
            [col.name]
          );
          if (!exists) {
            await pool.query(`ALTER TABLE examen_calificaciones ${col.sql}`);
            console.log(`Columna ${col.name} agregada a examen_calificaciones`);
          }
        } catch (err) {
          console.warn(`No se pudo agregar columna ${col.name}:`, err.message);
        }
      }

      // Crear tabla historial_examenes si no existe
      await pool.query(`
        CREATE TABLE IF NOT EXISTS historial_examenes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          examen_id INT NOT NULL,
          accion VARCHAR(50) NOT NULL,
          usuario_id INT NOT NULL,
          usuario_nombre VARCHAR(255) DEFAULT NULL,
          datos_anteriores JSON DEFAULT NULL,
          datos_nuevos JSON DEFAULT NULL,
          ip_address VARCHAR(45) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_examen_id (examen_id),
          INDEX idx_usuario_id (usuario_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      console.log('Schema de exámenes verificado correctamente');
    } catch (error) {
      console.error('Error verificando schema de exámenes:', error.message);
    }
  };

  // Ejecutar verificación de schema al iniciar
  ensureExamenesSchema();

  // Registrar historial
  const registrarHistorial = async ({ examenId, accion, usuarioId, usuarioNombre, datosAnteriores, datosNuevos, ip }) => {
    try {
      await pool.execute(
        `INSERT INTO historial_examenes (examen_id, accion, usuario_id, usuario_nombre, datos_anteriores, datos_nuevos, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          examenId,
          accion,
          usuarioId,
          usuarioNombre || null,
          datosAnteriores ? JSON.stringify(datosAnteriores) : null,
          datosNuevos ? JSON.stringify(datosNuevos) : null,
          ip || null,
        ]
      );
    } catch (error) {
      console.error('Error registrando historial:', error.message);
    }
  };

  // Obtener nivel educativo de una asignación
  const obtenerNivelAsignacion = async (asignacionId) => {
    try {
      // Primero intentar obtener de la asignación directamente
      const [[asignacion]] = await assignationPool.execute(
        `SELECT classroom_id, curso_nombre FROM asignaciones_profesor_curso WHERE id = ? LIMIT 1`,
        [asignacionId]
      );
      
      if (!asignacion) return null;

      // Si tiene classroom_id, obtener el nivel del classroom
      if (asignacion.classroom_id) {
        const [[classroom]] = await classesPool.execute(
          `SELECT level FROM classrooms WHERE id = ? LIMIT 1`,
          [asignacion.classroom_id]
        );
        if (classroom?.level) {
          return normalizarNivel(classroom.level);
        }
      }

      // Intentar inferir del nombre del curso
      const cursoNombre = asignacion.curso_nombre?.toLowerCase() || '';
      if (cursoNombre.includes('primaria') || cursoNombre.includes('1ro') || cursoNombre.includes('2do') || 
          cursoNombre.includes('3ro') || cursoNombre.includes('4to') || cursoNombre.includes('5to') || 
          cursoNombre.includes('6to')) {
        return 'Primaria';
      }
      if (cursoNombre.includes('secundaria') || cursoNombre.includes('1ero sec') || cursoNombre.includes('2do sec') ||
          cursoNombre.includes('3ero sec') || cursoNombre.includes('4to sec') || cursoNombre.includes('5to sec')) {
        return 'Secundaria';
      }
      if (cursoNombre.includes('inicial') || cursoNombre.includes('kinder')) {
        return 'Inicial';
      }
      if (cursoNombre.includes('basico') || cursoNombre.includes('básico')) {
        return 'Basico';
      }
      if (cursoNombre.includes('intermedio')) {
        return 'Intermedio';
      }
      if (cursoNombre.includes('avanzado')) {
        return 'Avanzado';
      }

      return null;
    } catch (error) {
      console.error('Error obteniendo nivel de asignación:', error.message);
      return null;
    }
  };

  // ==========================================
  // RUTAS DE CONFIGURACIÓN
  // ==========================================

  /**
   * GET /examenes/configuracion
   * Obtiene la configuración de tipos de examen por nivel
   */
  app.get(
    '/examenes/configuracion',
    authMiddleware(['administrativo', 'profesor']),
    asyncHandler(async (req, res) => {
      res.json({
        niveles: NIVELES_CONFIG,
        tipos: TIPOS_EXAMEN,
        estados: ESTADOS_EXAMEN,
      });
    })
  );

  /**
   * GET /examenes/configuracion/:nivel
   * Obtiene la configuración específica para un nivel
   */
  app.get(
    '/examenes/configuracion/:nivel',
    authMiddleware(['administrativo', 'profesor']),
    asyncHandler(async (req, res) => {
      const { nivel } = req.params;
      const config = getConfiguracionNivel(nivel);
      
      if (!config) {
        return res.status(404).json({ error: `Nivel "${nivel}" no encontrado` });
      }

      const tiposDetalle = config.tipos_permitidos.map(tipo => ({
        value: tipo,
        ...TIPOS_EXAMEN[tipo],
      }));

      res.json({
        nivel: normalizarNivel(nivel),
        tipos_permitidos: tiposDetalle,
        cantidad_periodos: config.cantidad_periodos,
        tipo_periodo: config.tipo_periodo,
      });
    })
  );

  /**
   * GET /examenes/v2/asignaciones/:id/metadata
   * Obtiene el nivel educativo y tipos permitidos para una asignación específica
   */
  app.get(
    '/examenes/v2/asignaciones/:id/metadata',
    authMiddleware(['administrativo', 'profesor']),
    asyncHandler(async (req, res) => {
      const asignacionId = toNumberOrNull(req.params.id);
      if (!asignacionId) {
        return res.status(400).json({ error: 'ID de asignación inválido' });
      }

      const [[assignment]] = await assignationPool.execute(
        `SELECT id, profesor_id, profesor_nombre, curso_nombre
           FROM asignaciones_profesor_curso
          WHERE id = ?
          LIMIT 1`,
        [asignacionId]
      );

      if (!assignment) {
        return res.status(404).json({ error: 'Asignación no encontrada' });
      }

      if (
        req.user.rol === 'profesor' &&
        assignment.profesor_id != null &&
        Number(assignment.profesor_id) !== Number(req.user.id)
      ) {
        return res.status(403).json({ error: 'No tienes acceso a esta asignación' });
      }

      const nivelEducativo = await obtenerNivelAsignacion(asignacionId);
      const configNivel = nivelEducativo ? getConfiguracionNivel(nivelEducativo) : null;
      const tiposBase = (configNivel?.tipos_permitidos?.length
        ? configNivel.tipos_permitidos
        : Object.keys(TIPOS_EXAMEN))
        .filter((tipo) => Boolean(TIPOS_EXAMEN[tipo]));

      const tiposDetalle = tiposBase.map((tipo) => ({
        value: tipo,
        ...TIPOS_EXAMEN[tipo],
      }));

      res.json({
        asignacion_id: asignacionId,
        curso_nombre: assignment.curso_nombre || null,
        profesor_id: assignment.profesor_id || null,
        profesor_nombre: assignment.profesor_nombre || null,
        nivel_educativo: nivelEducativo,
        tipo_periodo: configNivel?.tipo_periodo || null,
        cantidad_periodos: configNivel?.cantidad_periodos || null,
        tipos_permitidos: tiposDetalle,
        periodo_sugerido: null,
      });
    })
  );

  // ==========================================
  // RUTAS DE EXÁMENES MEJORADAS
  // ==========================================

  /**
   * GET /examenes/v2
   * Lista exámenes con información extendida
   */
  app.get(
    '/examenes/v2',
    authMiddleware(['administrativo', 'profesor']),
    asyncHandler(async (req, res) => {
      const { asignacionId, profesorId, estado, tipo, nivel, periodo } = req.query;
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

      if (estado) {
        filters.push('e.estado_examen = ?');
        params.push(estado);
      }

      if (tipo) {
        filters.push('e.tipo_examen = ?');
        params.push(tipo);
      }

      if (nivel) {
        filters.push('e.nivel_educativo = ?');
        params.push(nivel);
      }

      if (periodo) {
        filters.push('e.periodo_academico = ?');
        params.push(periodo);
      }

      let query = `
        SELECT
          e.id,
          e.asignacion_id,
          e.profesor_id,
          e.nombre,
          e.descripcion,
          e.fecha,
          e.fecha_cierre,
          e.nivel_educativo,
          e.tipo_examen,
          e.estado_examen,
          e.periodo_academico,
          e.peso_porcentaje,
          e.observaciones,
          e.curso_nombre,
          e.created_at,
          e.updated_at,
          e.cerrado_at,
          e.cerrado_por,
          COUNT(DISTINCT g.estudiante_id) AS total_evaluados,
          AVG(g.nota) AS promedio,
          MIN(g.nota) AS nota_minima,
          MAX(g.nota) AS nota_maxima,
          SUM(CASE WHEN g.nota >= 11 THEN 1 ELSE 0 END) AS aprobados,
          SUM(CASE WHEN g.nota < 11 AND g.nota IS NOT NULL THEN 1 ELSE 0 END) AS reprobados
        FROM examenes e
        LEFT JOIN examen_calificaciones g ON g.examen_id = e.id
      `;

      if (filters.length) {
        query += ` WHERE ${filters.join(' AND ')}`;
      }

      query += ' GROUP BY e.id ORDER BY e.fecha DESC, e.id DESC';

      const [rows] = await pool.execute(query, params);

      // Obtener total de estudiantes inscritos por asignación
      const asignacionIds = [...new Set(rows.map(r => r.asignacion_id).filter(Boolean))];
      const inscritosMap = new Map();
      
      if (asignacionIds.length) {
        const placeholders = asignacionIds.map(() => '?').join(',');
        const [inscritoRows] = await assignationPool.query(
          `SELECT asignacion_id, COUNT(*) as total 
           FROM asignacion_estudiantes 
           WHERE asignacion_id IN (${placeholders})
           GROUP BY asignacion_id`,
          asignacionIds
        );
        inscritoRows.forEach(row => {
          inscritosMap.set(row.asignacion_id, row.total);
        });
      }

      const exams = rows.map((row) => ({
        id: toNumberOrNull(row.id),
        asignacion_id: toNumberOrNull(row.asignacion_id),
        profesor_id: toNumberOrNull(row.profesor_id),
        nombre: row.nombre,
        descripcion: row.descripcion,
        fecha: formatDateKey(row.fecha),
        fecha_cierre: row.fecha_cierre ? toIsoString(row.fecha_cierre) : null,
        nivel_educativo: row.nivel_educativo,
        tipo_examen: row.tipo_examen,
        tipo_examen_label: TIPOS_EXAMEN[row.tipo_examen]?.label || row.tipo_examen,
        estado_examen: row.estado_examen || 'BORRADOR',
        periodo_academico: row.periodo_academico,
        peso_porcentaje: row.peso_porcentaje ? Number(row.peso_porcentaje) : 100,
        observaciones: row.observaciones,
        curso_nombre: row.curso_nombre,
        created_at: toIsoString(row.created_at),
        updated_at: toIsoString(row.updated_at),
        cerrado_at: row.cerrado_at ? toIsoString(row.cerrado_at) : null,
        cerrado_por: toNumberOrNull(row.cerrado_por),
        total_evaluados: toNumberOrNull(row.total_evaluados) || 0,
        total_inscritos: inscritosMap.get(row.asignacion_id) || 0,
        promedio: row.promedio != null ? Number(Number(row.promedio).toFixed(2)) : null,
        nota_minima: row.nota_minima != null ? Number(row.nota_minima) : null,
        nota_maxima: row.nota_maxima != null ? Number(row.nota_maxima) : null,
        aprobados: toNumberOrNull(row.aprobados) || 0,
        reprobados: toNumberOrNull(row.reprobados) || 0,
        puede_editar: ESTADOS_EDITABLES.includes(row.estado_examen || 'BORRADOR'),
        puede_registrar_notas: ESTADOS_NOTAS_PERMITIDAS.includes(row.estado_examen || 'BORRADOR'),
      }));

      res.json(exams);
    })
  );

  /**
   * POST /examenes/v2
   * Crear examen con validación de nivel educativo
   */
  app.post(
    '/examenes/v2',
    authMiddleware(['administrativo', 'profesor']),
    asyncHandler(async (req, res) => {
      const {
        asignacion_id,
        asignacionId,
        nombre,
        descripcion,
        fecha,
        tipo_examen,
        tipoExamen,
        periodo_academico,
        periodoAcademico,
        peso_porcentaje,
        pesoPorcentaje,
        observaciones,
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

      const tipoExamenValue = tipo_examen || tipoExamen || 'OTRO';
      if (!TIPOS_EXAMEN[tipoExamenValue]) {
        return res.status(400).json({ error: `Tipo de examen inválido: ${tipoExamenValue}` });
      }

      const targetProfesorId = req.user.rol === 'profesor'
        ? req.user.id
        : toNumberOrNull(profesorId ?? req.body?.profesor_id);

      if (!targetProfesorId) {
        return res.status(400).json({ error: 'profesorId requerido' });
      }

      // Obtener información de la asignación
      const [[assignment]] = await assignationPool.execute(
        `SELECT id, profesor_id, profesor_nombre, curso_id, curso_nombre, classroom_id
         FROM asignaciones_profesor_curso WHERE id = ? LIMIT 1`,
        [resolvedAsignacionId]
      );

      if (!assignment) {
        return res.status(404).json({ error: 'Asignación no encontrada' });
      }

      // Validar permisos del profesor
      if (req.user.rol === 'profesor') {
        if (assignment.profesor_id != null && Number(assignment.profesor_id) !== Number(req.user.id)) {
          return res.status(403).json({ error: 'No tienes permisos sobre esta asignación' });
        }
      }

      // Obtener y validar nivel educativo
      const nivelEducativo = await obtenerNivelAsignacion(resolvedAsignacionId);
      
      if (nivelEducativo) {
        const validacion = validarTipoExamenParaNivel(nivelEducativo, tipoExamenValue);
        if (!validacion.valid) {
          return res.status(400).json({ 
            error: validacion.error,
            nivel_detectado: nivelEducativo,
            tipo_solicitado: tipoExamenValue,
          });
        }
      }

      const periodoValue = periodo_academico || periodoAcademico || null;
      const pesoValue = peso_porcentaje || pesoPorcentaje || 100;

      const [insertResult] = await pool.execute(
        `INSERT INTO examenes (
          asignacion_id, profesor_id, nombre, descripcion, fecha, curso_nombre,
          nivel_educativo, tipo_examen, estado_examen, periodo_academico, peso_porcentaje, observaciones
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'BORRADOR', ?, ?, ?)`,
        [
          resolvedAsignacionId,
          targetProfesorId,
          sanitizedName,
          descripcion?.trim() || null,
          fechaFormateada,
          assignment.curso_nombre || null,
          nivelEducativo,
          tipoExamenValue,
          periodoValue,
          pesoValue,
          observaciones?.trim() || null,
        ]
      );

      const examenId = insertResult.insertId;

      // Registrar en historial
      await registrarHistorial({
        examenId,
        accion: 'CREADO',
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        datosNuevos: { nombre: sanitizedName, tipo_examen: tipoExamenValue, nivel_educativo: nivelEducativo },
        ip: req.ip,
      });

      // Obtener examen creado
      const [[exam]] = await pool.execute(
        `SELECT * FROM examenes WHERE id = ?`,
        [examenId]
      );

      res.status(201).json({
        id: examenId,
        asignacion_id: resolvedAsignacionId,
        profesor_id: targetProfesorId,
        nombre: exam.nombre,
        descripcion: exam.descripcion,
        fecha: formatDateKey(exam.fecha),
        nivel_educativo: exam.nivel_educativo,
        tipo_examen: exam.tipo_examen,
        tipo_examen_label: TIPOS_EXAMEN[exam.tipo_examen]?.label,
        estado_examen: exam.estado_examen,
        periodo_academico: exam.periodo_academico,
        peso_porcentaje: Number(exam.peso_porcentaje),
        observaciones: exam.observaciones,
        curso_nombre: exam.curso_nombre,
        created_at: toIsoString(exam.created_at),
        puede_editar: true,
        puede_registrar_notas: false,
      });
    })
  );

  /**
   * GET /examenes/v2/:id
   * Obtener detalle completo de un examen
   */
  app.get(
    '/examenes/v2/:id',
    authMiddleware(['administrativo', 'profesor']),
    asyncHandler(async (req, res) => {
      const examenId = toNumberOrNull(req.params.id);
      if (!examenId) {
        return res.status(400).json({ error: 'ID de examen inválido' });
      }

      const [[exam]] = await pool.execute(
        `SELECT * FROM examenes WHERE id = ?`,
        [examenId]
      );

      if (!exam) {
        return res.status(404).json({ error: 'Examen no encontrado' });
      }

      if (req.user.rol === 'profesor' && Number(exam.profesor_id) !== Number(req.user.id)) {
        return res.status(403).json({ error: 'No tienes acceso a este examen' });
      }

      // Obtener participantes
      const [enrollments] = await assignationPool.execute(
        'SELECT estudiante_id FROM asignacion_estudiantes WHERE asignacion_id = ?',
        [exam.asignacion_id]
      );

      const studentIds = enrollments.map(e => e.estudiante_id).filter(Boolean);
      
      let usuarios = [];
      if (studentIds.length) {
        const placeholders = studentIds.map(() => '?').join(',');
        [usuarios] = await usersPool.query(
          `SELECT id, nombre, email, (foto_perfil_imagen IS NOT NULL) AS tiene_foto FROM usuarios WHERE id IN (${placeholders})`,
          studentIds
        );
      }

      const usuariosMap = new Map(usuarios.map(u => [u.id, u]));

      // Obtener calificaciones
      const [calificaciones] = await pool.execute(
        `SELECT * FROM examen_calificaciones WHERE examen_id = ?`,
        [examenId]
      );

      const calificacionesMap = new Map(calificaciones.map(c => [c.estudiante_id, c]));

      const participantes = studentIds.map(estudianteId => {
        const usuario = usuariosMap.get(estudianteId);
        const calificacion = calificacionesMap.get(estudianteId);
        
        return {
          estudiante_id: estudianteId,
          usuario_id: estudianteId,
          nombre: usuario?.nombre || 'Estudiante sin nombre',
          email: usuario?.email || null,
          tiene_foto: usuario?.tiene_foto === 1 || usuario?.tiene_foto === true,
          nota: calificacion?.nota != null ? Number(calificacion.nota) : null,
          estado: calificacion?.estado || null,
          observaciones: calificacion?.observaciones || null,
          es_recuperacion: calificacion?.es_recuperacion === 1,
          nota_anterior: calificacion?.nota_anterior != null ? Number(calificacion.nota_anterior) : null,
          updated_at: calificacion?.updated_at ? toIsoString(calificacion.updated_at) : null,
          calificacion_id: calificacion?.id || null,
        };
      });

      // Calcular estadísticas
      const notasValidas = calificaciones.filter(c => c.nota != null).map(c => Number(c.nota));
      const promedio = notasValidas.length ? notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length : null;
      const aprobados = notasValidas.filter(n => n >= 11).length;
      const reprobados = notasValidas.filter(n => n < 11).length;

      res.json({
        examen: {
          id: exam.id,
          asignacion_id: exam.asignacion_id,
          profesor_id: exam.profesor_id,
          nombre: exam.nombre,
          descripcion: exam.descripcion,
          fecha: formatDateKey(exam.fecha),
          fecha_cierre: exam.fecha_cierre ? toIsoString(exam.fecha_cierre) : null,
          nivel_educativo: exam.nivel_educativo,
          tipo_examen: exam.tipo_examen,
          tipo_examen_label: TIPOS_EXAMEN[exam.tipo_examen]?.label,
          estado_examen: exam.estado_examen || 'BORRADOR',
          periodo_academico: exam.periodo_academico,
          peso_porcentaje: Number(exam.peso_porcentaje || 100),
          observaciones: exam.observaciones,
          curso_nombre: exam.curso_nombre,
          created_at: toIsoString(exam.created_at),
          updated_at: toIsoString(exam.updated_at),
          cerrado_at: exam.cerrado_at ? toIsoString(exam.cerrado_at) : null,
          cerrado_por: exam.cerrado_por,
          puede_editar: ESTADOS_EDITABLES.includes(exam.estado_examen || 'BORRADOR'),
          puede_registrar_notas: ESTADOS_NOTAS_PERMITIDAS.includes(exam.estado_examen || 'BORRADOR'),
        },
        participantes,
        estadisticas: {
          total_inscritos: studentIds.length,
          total_evaluados: notasValidas.length,
          pendientes: studentIds.length - notasValidas.length,
          promedio: promedio ? Number(promedio.toFixed(2)) : null,
          nota_minima: notasValidas.length ? Math.min(...notasValidas) : null,
          nota_maxima: notasValidas.length ? Math.max(...notasValidas) : null,
          aprobados,
          reprobados,
          porcentaje_aprobacion: notasValidas.length ? Number((aprobados / notasValidas.length * 100).toFixed(1)) : null,
        },
      });
    })
  );

  /**
   * PUT /examenes/v2/:id
   * Actualizar examen
   */
  app.put(
    '/examenes/v2/:id',
    authMiddleware(['administrativo', 'profesor']),
    asyncHandler(async (req, res) => {
      const examenId = toNumberOrNull(req.params.id);
      if (!examenId) {
        return res.status(400).json({ error: 'ID de examen inválido' });
      }

      const [[exam]] = await pool.execute('SELECT * FROM examenes WHERE id = ?', [examenId]);
      if (!exam) {
        return res.status(404).json({ error: 'Examen no encontrado' });
      }

      if (req.user.rol === 'profesor' && Number(exam.profesor_id) !== Number(req.user.id)) {
        return res.status(403).json({ error: 'No tienes permisos para editar este examen' });
      }

      if (!ESTADOS_EDITABLES.includes(exam.estado_examen || 'BORRADOR')) {
        return res.status(400).json({ 
          error: `No se puede editar un examen en estado ${exam.estado_examen}`,
          estado_actual: exam.estado_examen,
        });
      }

      const { nombre, descripcion, fecha, tipo_examen, periodo_academico, peso_porcentaje, observaciones } = req.body;

      const updates = [];
      const params = [];
      const datosAnteriores = {};
      const datosNuevos = {};

      if (nombre !== undefined) {
        const nombreTrim = String(nombre).trim();
        if (!nombreTrim) {
          return res.status(400).json({ error: 'El nombre no puede estar vacío' });
        }
        updates.push('nombre = ?');
        params.push(nombreTrim);
        datosAnteriores.nombre = exam.nombre;
        datosNuevos.nombre = nombreTrim;
      }

      if (descripcion !== undefined) {
        updates.push('descripcion = ?');
        params.push(descripcion?.trim() || null);
        datosAnteriores.descripcion = exam.descripcion;
        datosNuevos.descripcion = descripcion?.trim() || null;
      }

      if (fecha !== undefined) {
        const fechaFormateada = formatDateKey(fecha);
        if (!fechaFormateada) {
          return res.status(400).json({ error: 'Fecha inválida' });
        }
        updates.push('fecha = ?');
        params.push(fechaFormateada);
        datosAnteriores.fecha = formatDateKey(exam.fecha);
        datosNuevos.fecha = fechaFormateada;
      }

      if (tipo_examen !== undefined) {
        if (!TIPOS_EXAMEN[tipo_examen]) {
          return res.status(400).json({ error: `Tipo de examen inválido: ${tipo_examen}` });
        }
        if (exam.nivel_educativo) {
          const validacion = validarTipoExamenParaNivel(exam.nivel_educativo, tipo_examen);
          if (!validacion.valid) {
            return res.status(400).json({ error: validacion.error });
          }
        }
        updates.push('tipo_examen = ?');
        params.push(tipo_examen);
        datosAnteriores.tipo_examen = exam.tipo_examen;
        datosNuevos.tipo_examen = tipo_examen;
      }

      if (periodo_academico !== undefined) {
        updates.push('periodo_academico = ?');
        params.push(periodo_academico || null);
      }

      if (peso_porcentaje !== undefined) {
        const peso = Number(peso_porcentaje);
        if (Number.isNaN(peso) || peso < 0 || peso > 100) {
          return res.status(400).json({ error: 'Peso debe estar entre 0 y 100' });
        }
        updates.push('peso_porcentaje = ?');
        params.push(peso);
      }

      if (observaciones !== undefined) {
        updates.push('observaciones = ?');
        params.push(observaciones?.trim() || null);
      }

      if (!updates.length) {
        return res.status(400).json({ error: 'No hay campos para actualizar' });
      }

      updates.push('updated_at = NOW()');
      params.push(examenId);

      await pool.execute(
        `UPDATE examenes SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      await registrarHistorial({
        examenId,
        accion: 'EDITADO',
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        datosAnteriores,
        datosNuevos,
        ip: req.ip,
      });

      const [[updated]] = await pool.execute('SELECT * FROM examenes WHERE id = ?', [examenId]);

      res.json({
        message: 'Examen actualizado correctamente',
        examen: {
          id: updated.id,
          nombre: updated.nombre,
          descripcion: updated.descripcion,
          fecha: formatDateKey(updated.fecha),
          tipo_examen: updated.tipo_examen,
          tipo_examen_label: TIPOS_EXAMEN[updated.tipo_examen]?.label,
          estado_examen: updated.estado_examen,
          updated_at: toIsoString(updated.updated_at),
        },
      });
    })
  );

  /**
   * POST /examenes/v2/:id/abrir
   * Abrir un examen para registro de notas
   */
  app.post(
    '/examenes/v2/:id/abrir',
    authMiddleware(['administrativo', 'profesor']),
    asyncHandler(async (req, res) => {
      const examenId = toNumberOrNull(req.params.id);
      
      const [[exam]] = await pool.execute('SELECT * FROM examenes WHERE id = ?', [examenId]);
      if (!exam) {
        return res.status(404).json({ error: 'Examen no encontrado' });
      }

      if (req.user.rol === 'profesor' && Number(exam.profesor_id) !== Number(req.user.id)) {
        return res.status(403).json({ error: 'No tienes permisos sobre este examen' });
      }

      if (exam.estado_examen !== 'BORRADOR') {
        return res.status(400).json({ 
          error: `Solo se pueden abrir exámenes en estado BORRADOR. Estado actual: ${exam.estado_examen}` 
        });
      }

      await pool.execute(
        'UPDATE examenes SET estado_examen = ?, updated_at = NOW() WHERE id = ?',
        ['ABIERTO', examenId]
      );

      await registrarHistorial({
        examenId,
        accion: 'ABIERTO',
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        datosAnteriores: { estado_examen: exam.estado_examen },
        datosNuevos: { estado_examen: 'ABIERTO' },
        ip: req.ip,
      });

      io?.emit('examen:estado-cambiado', { examenId, estado: 'ABIERTO' });

      res.json({ message: 'Examen abierto para registro de notas', estado: 'ABIERTO' });
    })
  );

  /**
   * POST /examenes/v2/:id/cerrar
   * Cerrar un examen (bloquea edición de notas)
   */
  app.post(
    '/examenes/v2/:id/cerrar',
    authMiddleware(['administrativo', 'profesor']),
    asyncHandler(async (req, res) => {
      const examenId = toNumberOrNull(req.params.id);
      
      const [[exam]] = await pool.execute('SELECT * FROM examenes WHERE id = ?', [examenId]);
      if (!exam) {
        return res.status(404).json({ error: 'Examen no encontrado' });
      }

      if (req.user.rol === 'profesor' && Number(exam.profesor_id) !== Number(req.user.id)) {
        return res.status(403).json({ error: 'No tienes permisos sobre este examen' });
      }

      if (!['ABIERTO', 'EN_EVALUACION'].includes(exam.estado_examen)) {
        return res.status(400).json({ 
          error: `Solo se pueden cerrar exámenes en estado ABIERTO o EN_EVALUACION. Estado actual: ${exam.estado_examen}` 
        });
      }

      await pool.execute(
        `UPDATE examenes SET 
          estado_examen = 'CERRADO', 
          cerrado_por = ?,
          cerrado_at = NOW(),
          updated_at = NOW() 
         WHERE id = ?`,
        [req.user.id, examenId]
      );

      await registrarHistorial({
        examenId,
        accion: 'CERRADO',
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        datosAnteriores: { estado_examen: exam.estado_examen },
        datosNuevos: { estado_examen: 'CERRADO' },
        ip: req.ip,
      });

      io?.emit('examen:estado-cambiado', { examenId, estado: 'CERRADO' });

      res.json({ message: 'Examen cerrado correctamente', estado: 'CERRADO' });
    })
  );

  /**
   * PUT /examenes/v2/:id/calificaciones/:estudianteId
   * Registrar o actualizar nota de un estudiante
   */
  app.put(
    '/examenes/v2/:id/calificaciones/:estudianteId',
    authMiddleware(['administrativo', 'profesor']),
    asyncHandler(async (req, res) => {
      const examenId = toNumberOrNull(req.params.id);
      const estudianteId = toNumberOrNull(req.params.estudianteId);
      const { nota, observaciones, es_recuperacion } = req.body;

      if (!examenId || !estudianteId) {
        return res.status(400).json({ error: 'Datos inválidos' });
      }

      const [[exam]] = await pool.execute('SELECT * FROM examenes WHERE id = ?', [examenId]);
      if (!exam) {
        return res.status(404).json({ error: 'Examen no encontrado' });
      }

      if (req.user.rol === 'profesor' && Number(exam.profesor_id) !== Number(req.user.id)) {
        return res.status(403).json({ error: 'No tienes acceso a este examen' });
      }

      // Validar estado del examen
      if (!ESTADOS_NOTAS_PERMITIDAS.includes(exam.estado_examen || 'BORRADOR')) {
        return res.status(400).json({ 
          error: `No se pueden registrar notas en un examen ${exam.estado_examen}. El examen debe estar ABIERTO o EN_EVALUACION.`,
          estado_actual: exam.estado_examen,
        });
      }

      // Validar nota
      const notaValue = Number(nota);
      if (Number.isNaN(notaValue) || notaValue < 0 || notaValue > 20) {
        return res.status(400).json({ error: 'La nota debe estar entre 0 y 20' });
      }

      // Verificar que el estudiante pertenece a la asignación
      const [[enrollment]] = await assignationPool.execute(
        'SELECT 1 FROM asignacion_estudiantes WHERE asignacion_id = ? AND estudiante_id = ? LIMIT 1',
        [exam.asignacion_id, estudianteId]
      );

      if (!enrollment) {
        return res.status(400).json({ error: 'El estudiante no pertenece a este curso' });
      }

      // Verificar si ya existe calificación
      const [[existingGrade]] = await pool.execute(
        'SELECT * FROM examen_calificaciones WHERE examen_id = ? AND estudiante_id = ?',
        [examenId, estudianteId]
      );

      const estado = computeExamEstado(notaValue);
      const esRecuperacion = es_recuperacion ? 1 : 0;
      const notaAnterior = existingGrade?.nota != null ? Number(existingGrade.nota) : null;

      if (existingGrade) {
        // Actualizar
        await pool.execute(
          `UPDATE examen_calificaciones SET 
            nota = ?, 
            estado = ?, 
            observaciones = ?,
            es_recuperacion = ?,
            nota_anterior = ?,
            registrado_por = ?,
            updated_at = NOW()
           WHERE examen_id = ? AND estudiante_id = ?`,
          [
            notaValue,
            estado,
            observaciones?.trim() || existingGrade.observaciones,
            esRecuperacion,
            esRecuperacion ? notaAnterior : null,
            req.user.id,
            examenId,
            estudianteId,
          ]
        );

        await registrarHistorial({
          examenId,
          accion: 'NOTA_EDITADA',
          usuarioId: req.user.id,
          usuarioNombre: req.user.nombre,
          datosAnteriores: { estudiante_id: estudianteId, nota: notaAnterior },
          datosNuevos: { estudiante_id: estudianteId, nota: notaValue },
          ip: req.ip,
        });
      } else {
        // Insertar
        await pool.execute(
          `INSERT INTO examen_calificaciones 
            (examen_id, estudiante_id, nota, estado, observaciones, es_recuperacion, registrado_por)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [examenId, estudianteId, notaValue, estado, observaciones?.trim() || null, esRecuperacion, req.user.id]
        );

        await registrarHistorial({
          examenId,
          accion: 'NOTA_REGISTRADA',
          usuarioId: req.user.id,
          usuarioNombre: req.user.nombre,
          datosNuevos: { estudiante_id: estudianteId, nota: notaValue },
          ip: req.ip,
        });
      }

      // Actualizar estado del examen a EN_EVALUACION si estaba ABIERTO
      if (exam.estado_examen === 'ABIERTO') {
        await pool.execute(
          'UPDATE examenes SET estado_examen = ? WHERE id = ?',
          ['EN_EVALUACION', examenId]
        );
      }

      // Calcular nuevas estadísticas
      const [[stats]] = await pool.execute(
        `SELECT 
          AVG(nota) as promedio, 
          COUNT(*) as total_evaluados,
          MAX(updated_at) as ultima_actualizacion
         FROM examen_calificaciones WHERE examen_id = ?`,
        [examenId]
      );

      io?.emit('examen:nota-actualizada', { 
        examenId, 
        estudianteId, 
        nota: notaValue,
        estado,
      });

      res.json({
        message: existingGrade ? 'Nota actualizada correctamente' : 'Nota registrada correctamente',
        calificacion: {
          examen_id: examenId,
          estudiante_id: estudianteId,
          nota: notaValue,
          estado,
          observaciones: observaciones?.trim() || null,
          es_recuperacion: esRecuperacion === 1,
          nota_anterior: esRecuperacion ? notaAnterior : null,
        },
        estadisticas: {
          promedio: stats.promedio ? Number(Number(stats.promedio).toFixed(2)) : null,
          total_evaluados: stats.total_evaluados,
          ultima_actualizacion: toIsoString(stats.ultima_actualizacion),
        },
      });
    })
  );

  /**
   * GET /examenes/v2/:id/historial
   * Obtener historial de cambios de un examen
   */
  app.get(
    '/examenes/v2/:id/historial',
    authMiddleware(['administrativo', 'profesor']),
    asyncHandler(async (req, res) => {
      const examenId = toNumberOrNull(req.params.id);

      const [[exam]] = await pool.execute('SELECT profesor_id FROM examenes WHERE id = ?', [examenId]);
      if (!exam) {
        return res.status(404).json({ error: 'Examen no encontrado' });
      }

      if (req.user.rol === 'profesor' && Number(exam.profesor_id) !== Number(req.user.id)) {
        return res.status(403).json({ error: 'No tienes acceso a este examen' });
      }

      const [historial] = await pool.execute(
        `SELECT * FROM historial_examenes WHERE examen_id = ? ORDER BY created_at DESC LIMIT 100`,
        [examenId]
      );

      res.json(historial.map(h => ({
        ...h,
        datos_anteriores: h.datos_anteriores ? JSON.parse(h.datos_anteriores) : null,
        datos_nuevos: h.datos_nuevos ? JSON.parse(h.datos_nuevos) : null,
        created_at: toIsoString(h.created_at),
      })));
    })
  );

  /**
   * DELETE /examenes/v2/:id
   * Eliminar o anular un examen
   */
  app.delete(
    '/examenes/v2/:id',
    authMiddleware(['administrativo']),
    asyncHandler(async (req, res) => {
      const examenId = toNumberOrNull(req.params.id);
      const { anular } = req.query; // Si anular=true, solo cambia estado a ANULADO

      const [[exam]] = await pool.execute('SELECT * FROM examenes WHERE id = ?', [examenId]);
      if (!exam) {
        return res.status(404).json({ error: 'Examen no encontrado' });
      }

      if (anular === 'true') {
        await pool.execute(
          'UPDATE examenes SET estado_examen = ?, updated_at = NOW() WHERE id = ?',
          ['ANULADO', examenId]
        );

        await registrarHistorial({
          examenId,
          accion: 'ANULADO',
          usuarioId: req.user.id,
          usuarioNombre: req.user.nombre,
          datosAnteriores: { estado_examen: exam.estado_examen },
          datosNuevos: { estado_examen: 'ANULADO' },
          ip: req.ip,
        });

        io?.emit('examen:estado-cambiado', { examenId, estado: 'ANULADO' });

        return res.json({ message: 'Examen anulado correctamente' });
      }

      // Eliminar completamente (solo en BORRADOR)
      if (exam.estado_examen !== 'BORRADOR') {
        return res.status(400).json({ 
          error: 'Solo se pueden eliminar exámenes en estado BORRADOR. Use ?anular=true para anular.' 
        });
      }

      await pool.execute('DELETE FROM examen_calificaciones WHERE examen_id = ?', [examenId]);
      await pool.execute('DELETE FROM historial_examenes WHERE examen_id = ?', [examenId]);
      await pool.execute('DELETE FROM examenes WHERE id = ?', [examenId]);

      res.json({ message: 'Examen eliminado correctamente' });
    })
  );

  console.log('Rutas de exámenes v2 configuradas correctamente');
};

module.exports = {
  setupExamenesRoutes,
  TIPOS_EXAMEN,
  NIVELES_CONFIG,
  ESTADOS_EXAMEN,
  getConfiguracionNivel,
  validarTipoExamenParaNivel,
  normalizarNivel,
};
