const { performance } = require('node:perf_hooks');
const mysql = require('mysql2/promise');
const { AppError } = require('../errorHandler');

const DEFAULT_POOL_OPTIONS = {
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  maxIdle: 8,
  idleTimeout: 60_000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 10_000,
};

const TRANSIENT_ERROR_CODES = new Set([
  'ER_LOCK_DEADLOCK',
  'ER_LOCK_WAIT_TIMEOUT',
  'PROTOCOL_CONNECTION_LOST',
  'PROTOCOL_SEQUENCE_TIMEOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'ER_CON_COUNT_ERROR',
  'ETIMEDOUT',
]);

const DB_ERROR_CODES = {
  DEADLOCK: 'DB_DEADLOCK',
  TIMEOUT: 'DB_TIMEOUT',
  CONNECTION: 'DB_CONN_FAIL',
  DUP_ENTRY: 'DB_DUP_ENTRY',
  GENERIC: 'DB_ERROR',
};

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 75;
const MAX_DELAY_MS = 1_200;

let pool = null;
let poolConfig = null;
let shutdownRegistered = false;
let shuttingDown = false;
let activeLogger = createFallbackLogger();

/**
 * @typedef {Object} DbConfigureOptions
 * @property {string} host
 * @property {string} user
 * @property {string} password
 * @property {string} database
 * @property {number|string} [port]
 * @property {number|string} [connectionLimit]
 * @property {number|string} [queueLimit]
 * @property {number|string} [connectTimeout]
 * @property {number|string} [connectTimeout]
 * @property {import('pino').Logger | Console} [logger]
 */

/**
 * @typedef {Object} DbQueryOptions
 * @property {string} [tag] Etiqueta segura para seguimiento en logs.
 */

/**
 * @typedef {Object} DbTransactionOptions
 * @property {string} [tag] Etiqueta segura para seguimiento en logs.
 */

/**
 * @template TRow
 * @typedef {Object} DbTransactionClient
 * @property {(sql: string, params?: ReadonlyArray<unknown>, options?: DbQueryOptions) => Promise<TRow[]>} query
 * @property {import('mysql2/promise').PoolConnection} connection
 * @property {string} tag
 */

function createFallbackLogger() {
  return {
    info: (...args) => console.log(...args),
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
  };
}

/**
 * Inicializa el pool de conexiones reutilizable.
 * @param {DbConfigureOptions} options
 * @returns {import('mysql2/promise').Pool}
 */
function configure(options = {}) {
  if (pool) {
    if (options.logger && options.logger !== activeLogger) {
      activeLogger = options.logger;
    }

    if (options && Object.keys(options).length) {
      const normalizedIncoming = sanitizePoolOptions(options);
      if (!shallowEqualConfig(poolConfig, normalizedIncoming)) {
        activeLogger.warn?.(
          {
            tag: 'db.configure',
            newHost: normalizedIncoming.host,
            newDatabase: normalizedIncoming.database,
          },
          'Intento de reconfigurar el pool de base de datos ignorado: ya existe una instancia activa.',
        );
      }
    }

    return pool;
  }

  const { logger, ...poolOptions } = options;
  if (logger) {
    activeLogger = logger;
  }

  poolConfig = { ...DEFAULT_POOL_OPTIONS, ...sanitizePoolOptions(poolOptions) };
  pool = mysql.createPool(poolConfig);

  registerShutdownHooks();

  activeLogger.info?.(
    {
      tag: 'db.configure',
      host: poolConfig.host,
      database: poolConfig.database,
      connectionLimit: poolConfig.connectionLimit,
      queueLimit: poolConfig.queueLimit,
    },
    'Pool de base de datos inicializado',
  );

  return pool;
}

/**
 * Ejecuta una consulta parametrizada utilizando el pool compartido.
 * @template TRow
 * @param {string} sql
 * @param {ReadonlyArray<unknown>} [params]
 * @param {DbQueryOptions} [options]
 * @returns {Promise<TRow[]>}
 */
async function query(sql, params = [], options = {}) {
  const tag = typeof options.tag === 'string' ? options.tag : 'db.query';

  const executeQuery = async () => {
    const targetPool = ensurePool();
    const statementParams = Array.isArray(params) ? params : [params];
    const [rows] = await targetPool.execute(sql, statementParams);
    return rows;
  };

  return withRetry(executeQuery, { tag, op: 'query' });
}

/**
 * Ejecuta una operación dentro de una transacción con reintentos controlados.
 * @template TResult
 * @param {(client: DbTransactionClient) => Promise<TResult>} workFn
 * @param {DbTransactionOptions} [options]
 * @returns {Promise<TResult>}
 */
async function transaction(workFn, options = {}) {
  const tag = typeof options.tag === 'string' ? options.tag : 'db.transaction';

  const runTransaction = async () => {
    const targetPool = ensurePool();
    const connection = await targetPool.getConnection();

    try {
      await connection.beginTransaction();
      const txClient = createTransactionClient(connection, tag);
      const result = await workFn(txClient);
      await connection.commit();
      return result;
    } catch (error) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        activeLogger.error?.(
          {
            tag: `${tag}.rollback`,
            code: rollbackError.code,
          },
          'Fallo al revertir la transacción de base de datos',
        );
      }
      throw error;
    } finally {
      connection.release();
    }
  };

  return withRetry(runTransaction, { tag, op: 'transaction' });
}

/**
 * Ejecuta una verificación rápida contra la base de datos.
 * @returns {Promise<{ ok: boolean; latencyMs: number; error?: AppError }>}
 */
async function healthCheck() {
  const startedAt = performance.now();

  try {
    await query('SELECT 1', [], { tag: 'db.healthCheck' });
    return { ok: true, latencyMs: performance.now() - startedAt };
  } catch (error) {
    const dbError = error instanceof AppError ? error : mapDbError(error, { tag: 'db.healthCheck' });
    activeLogger.error?.(
      {
        tag: 'db.healthCheck',
        code: dbError.details?.code,
        driverCode: dbError.details?.driverCode,
      },
      'Health check de base de datos fallido',
    );
    return { ok: false, latencyMs: performance.now() - startedAt, error: dbError };
  }
}

/**
 * Cierra el pool activo de forma ordenada.
 * @param {string} [reason]
 * @returns {Promise<void>}
 */
async function close(reason = 'manual') {
  if (!pool || shuttingDown) {
    return;
  }
  shuttingDown = true;

  try {
    await pool.end();
    activeLogger.info?.(
      {
        tag: 'db.close',
        reason,
      },
      'Pool de base de datos cerrado correctamente',
    );
  } catch (error) {
    activeLogger.error?.(
      {
        tag: 'db.close',
        code: error.code,
      },
      'Error al cerrar el pool de base de datos',
    );
  } finally {
    pool = null;
    poolConfig = null;
    shuttingDown = false;
  }
}

function ensurePool() {
  if (!pool) {
    throw new Error('El pool de base de datos no está configurado. Ejecuta configure() primero.');
  }
  return pool;
}

/**
 * @param {import('mysql2/promise').PoolConnection} connection
 * @param {string} parentTag
 * @returns {DbTransactionClient}
 */
function createTransactionClient(connection, parentTag) {
  return {
    query: async (sql, params = [], options = {}) => {
      const statementParams = Array.isArray(params) ? params : [params];
      const [rows] = await connection.execute(sql, statementParams);
      return rows;
    },
    connection,
    tag: parentTag,
  };
}

function registerShutdownHooks() {
  if (shutdownRegistered) {
    return;
  }

  ['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal => {
    process.once(signal, async () => {
      activeLogger.info?.(
        {
          tag: 'db.shutdown',
          signal,
        },
        'Recibida señal de apagado; cerrando pool de base de datos',
      );
      await close(`signal:${signal}`);
      process.exit(0);
    });
  });

  process.once('beforeExit', async () => {
    await close('beforeExit');
  });

  shutdownRegistered = true;
}

function sanitizePoolOptions(options = {}) {
  const sanitized = { ...options };

  ['port', 'connectionLimit', 'queueLimit', 'connectTimeout', 'idleTimeout', 'keepAliveInitialDelay', 'maxIdle'].forEach(key => {
    if (sanitized[key] !== undefined && sanitized[key] !== null) {
      const parsed = Number(sanitized[key]);
      if (!Number.isNaN(parsed)) {
        sanitized[key] = parsed;
      } else {
        delete sanitized[key];
      }
    }
  });

  return sanitized;
}

function shallowEqualConfig(a = {}, b = {}) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (key === 'password') {
      continue;
    }
    if (a[key] !== b[key]) {
      return false;
    }
  }
  return true;
}

async function withRetry(workFn, context = {}) {
  let attempt = 0;

  while (true) {
    try {
      return await workFn();
    } catch (error) {
      const retryable = isTransientError(error);
      if (!retryable || attempt >= MAX_RETRIES) {
        throw mapDbError(error, { ...context, attempt });
      }

      const waitTime = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
      activeLogger.warn?.(
        {
          tag: `${context.tag || 'db.retry'}`,
          op: context.op,
          attempt: attempt + 1,
          waitTime,
          code: error.code,
        },
        'Error transitorio en base de datos, reintentando',
      );

      await wait(waitTime);
      attempt += 1;
    }
  }
}

function isTransientError(error) {
  const code = error && (error.code || error.sqlState || error.errno);
  return Boolean(code && TRANSIENT_ERROR_CODES.has(code));
}

function mapDbError(error, context = {}) {
  if (error instanceof AppError) {
    error.details = {
      ...(error.details || {}),
      context: context.tag,
      attempt: context.attempt,
    };
    return error;
  }

  const driverCode = error && error.code;
  const details = {
    code: DB_ERROR_CODES.GENERIC,
    driverCode,
    context: context.tag,
    attempt: context.attempt,
  };

  // Log completo del error para debugging
  if (context.logger) {
    context.logger.error({
      sqlError: {
        message: error.message,
        sqlMessage: error.sqlMessage,
        sql: error.sql,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState
      }
    }, 'Error SQL detallado');
  }

  let statusCode = 500;
  let message = 'Error en la base de datos.';

  switch (driverCode) {
    case 'ER_LOCK_DEADLOCK':
    case 'ER_LOCK_WAIT_TIMEOUT':
      details.code = DB_ERROR_CODES.DEADLOCK;
      message = 'La operación se interrumpió por un conflicto de bloqueo.';
      statusCode = 409;
      break;
    case 'ETIMEDOUT':
    case 'PROTOCOL_SEQUENCE_TIMEOUT':
      details.code = DB_ERROR_CODES.TIMEOUT;
      message = 'La operación con la base de datos excedió el tiempo límite.';
      statusCode = 504;
      break;
    case 'PROTOCOL_CONNECTION_LOST':
    case 'ECONNRESET':
    case 'ECONNREFUSED':
    case 'ER_CON_COUNT_ERROR':
      details.code = DB_ERROR_CODES.CONNECTION;
      message = 'No fue posible mantener la conexión con la base de datos.';
      statusCode = 503;
      break;
    case 'ER_DUP_ENTRY':
      details.code = DB_ERROR_CODES.DUP_ENTRY;
      message = 'El registro que intenta crear ya existe.';
      statusCode = 409;
      break;
    default:
      break;
  }

  return new AppError(message, statusCode, details);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  configure,
  query,
  transaction,
  healthCheck,
  close,
  getPool: ensurePool,
  ERROR_CODES: DB_ERROR_CODES,
};
