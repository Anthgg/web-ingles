// config/index.js
const path = require('path');
const dotenvFlow = require('dotenv-flow');
const {
  cleanEnv,
  str,
  num,
  bool,
  url,
} = require('envalid');

const DEFAULT_NODE_ENV = 'development';

const BASE_SPEC = {
  NODE_ENV: str({
    choices: ['development', 'staging', 'production'],
    desc: 'Entorno de ejecución; controla el comportamiento de logging, cachés y cargado de .env.*',
  }),
  PORT: num({
    default: 3000,
    desc: 'Puerto TCP donde escucha el microservicio. Puede ser sobreescrito por orquestadores.',
  }),
  DB_HOST: str({ desc: 'Host de la base de datos MySQL asignada a este servicio.' }),
  DB_PORT: num({ default: 3306, desc: 'Puerto expuesto por el motor MySQL.' }),
  DB_USER: str({ desc: 'Usuario con privilegios mínimos necesarios para operar el servicio.' }),
  DB_PASSWORD: str({ desc: 'Contraseña del usuario de base de datos. Mantener fuera del control de versiones.' }),
  DB_NAME: str({ desc: 'Nombre de la base de datos lógica utilizada por el servicio.' }),
  DB_POOL_SIZE: num({ default: 10, desc: 'Cantidad máxima de conexiones simultáneas en el pool.' }),
  JWT_SECRET: str({ desc: 'Clave usada para firmar tokens JWT emitidos o validados por el servicio.' }),
  JWT_EXPIRES_IN: str({ default: '8h', desc: 'Duración de expiración de los JWT, compatible con jsonwebtoken.' }),
  CORS_ORIGIN: str({
    default: 'http://localhost:3000',
    desc: 'Lista separada por comas con los orígenes permitidos para peticiones CORS.',
  }),
  OTP_TTL_MINUTES: num({ default: 5 }),
  OTP_SEND_COOLDOWN: num({ default: 60 }),
  OTP_MAX_ATTEMPTS: num({ default: 5 }),
  TWILIO_ACCOUNT_SID: str({ default: '' }),
  TWILIO_AUTH_TOKEN: str({ default: '' }),
  TWILIO_FROM: str({ default: '' }),
  SMTP_HOST: str({ default: '' }),
  SMTP_PORT: num({ default: 587 }),
  SMTP_USER: str({ default: '' }),
  SMTP_PASS: str({ default: '' }),
  SMTP_SECURE: bool({ default: false }),
  FROM_EMAIL: str({ default: '' }),
  TWO_FA_ENCRYPTION_KEY: str({
    default: '',
    desc: 'Clave simétrica para cifrar los secretos de 2FA del usuario. Cambiar por entorno.',
  }),
  TWO_FACTOR_LOGIN_ENABLED: bool({ default: true }),
  SERVICE_NAME: str({ default: '', desc: 'Nombre lógico del microservicio. Se usa para prefijos.' }),
  SERVICE_PREFIX: str({ default: '', desc: 'Prefijo opcional para variables específicas del servicio.' }),
  METRICS_ENDPOINT: url({
    default: 'http://localhost:4318/v1/metrics',
    desc: 'Endpoint OTLP para exportar métricas del servicio.',
  }),
};

const toEnvKey = (prefix, key) => {
  if (!prefix) return key;
  return `${prefix}_${key}`;
};

const normalizePrefix = (value) => {
  if (!value) return '';
  return String(value)
    .trim()
    .replace(/[^0-9a-zA-Z]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
};

const defaultReporter = ({ errors }) => {
  if (!errors || Object.keys(errors).length === 0) {
    return;
  }

  const details = Object.entries(errors)
    .map(([key, err]) => ` • ${key}: ${err.message}`)
    .join('\n');

  throw new Error(`Variables de entorno inválidas:\n${details}`);
};

const parseOrigins = (value) => {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const createConfig = ({
  serviceName,
  serviceRoot = process.cwd(),
  prefix: customPrefix,
  overrides = {},
  defaults = {},
  silent = false,
} = {}) => {
  const nodeEnv = process.env.NODE_ENV || DEFAULT_NODE_ENV;
  const resolvedServiceName = serviceName || process.env.SERVICE_NAME || path.basename(serviceRoot);
  const resolvedPrefix = normalizePrefix(
    customPrefix || process.env.SERVICE_PREFIX || resolvedServiceName,
  );

  dotenvFlow.config({
    node_env: nodeEnv,
    default_node_env: DEFAULT_NODE_ENV,
    path: serviceRoot,
    silent,
  });

  const schema = { ...BASE_SPEC, ...overrides };
  const rawEnv = {};

  Object.keys(schema).forEach((key) => {
    const prefixedKey = toEnvKey(resolvedPrefix, key);
    rawEnv[key] =
      process.env[prefixedKey] !== undefined
        ? process.env[prefixedKey]
        : process.env[key] !== undefined
          ? process.env[key]
          : defaults[key];
  });

  const env = cleanEnv(rawEnv, schema, {
    strict: true,
    reporter: defaultReporter,
  });

  const corsOrigins = parseOrigins(env.CORS_ORIGIN);

  return {
    env,
    corsOrigins,
    isDev: env.NODE_ENV === 'development',
    isStaging: env.NODE_ENV === 'staging',
    isProd: env.NODE_ENV === 'production',
    prefix: resolvedPrefix,
    serviceName: resolvedServiceName,
    dbPoolConfig: (extra = {}) => ({
      host: env.DB_HOST,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      port: env.DB_PORT,
      waitForConnections: true,
      connectionLimit: env.DB_POOL_SIZE,
      queueLimit: 0,
      ...extra,
    }),
    get: (key, fallback = undefined) => {
      const value = env[key];
      return value !== undefined ? value : fallback;
    },
  };
};

module.exports = {
  createConfig,
  BASE_SPEC,
};