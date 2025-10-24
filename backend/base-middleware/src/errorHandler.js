class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

const buildErrorResponse = (err, req) => {
  const statusCode = err.statusCode || err.status || 500;
  const isServerError = statusCode >= 500;
  const exposeStack = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

  return {
    status: statusCode,
    message: err.message || (isServerError ? 'Internal server error' : 'Request failed'),
    trace: exposeStack && err.stack ? err.stack.split('\n').map(line => line.trim()) : undefined,
    details: err.details,
    path: req.originalUrl,
    requestId: req.id,
  };
};

const errorHandler = (logger) => (err, req, res, next) => {
  if (!err) {
    return next();
  }

  const response = buildErrorResponse(err, req);

  if (logger) {
    logger.error({
      err,
      requestId: req.id,
      status: response.status,
      path: req.originalUrl,
    }, err.message);
  }

  res.status(response.status).json({
    status: response.status,
    message: response.message,
    requestId: response.requestId,
    details: response.details,
    trace: response.trace,
  });
};

module.exports = {
  AppError,
  errorHandler,
};
