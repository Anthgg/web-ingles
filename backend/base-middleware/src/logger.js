const { randomUUID } = require('crypto');
const pino = require('pino');
const pinoHttp = require('pino-http');

const DEFAULT_LEVEL = process.env.LOG_LEVEL || 'info';

const createLogger = (options = {}) => {
  const {
    level = DEFAULT_LEVEL,
    name = process.env.SERVICE_NAME || 'base-middleware',
    base = {},
    transport,
  } = options;

  return pino({
    level,
    name,
    base: {
      service: name,
      environment: process.env.NODE_ENV || 'development',
      ...base,
    },
    formatters: {
      bindings(bindings) {
        return {
          pid: bindings.pid,
          host: bindings.hostname,
        };
      },
      level(label, number) {
        return { level: label, levelNumber: number };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    transport,
  });
};

const httpLogger = (options = {}) => {
  const logger = options.logger || createLogger(options);

  const http = pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url,
          remoteAddress: req.remoteAddress,
          remotePort: req.remotePort,
          userAgent: req.headers['user-agent'],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
      err(err) {
        return {
          type: err.name,
          message: err.message,
          stack: err.stack,
        };
      },
    },
    customProps(req) {
      return {
        requestId: req.id,
      };
    },
    customLogLevel(res, err) {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  });

  return (req, res, next) => {
    if (!req.id) {
      req.id = randomUUID();
    }
    http(req, res, next);
  };
};

module.exports = {
  createLogger,
  httpLogger,
};
