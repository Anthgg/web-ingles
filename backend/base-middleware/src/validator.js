const { ZodError } = require('zod');

const parseTarget = (req, target) => {
  switch (target) {
    case 'params':
      return req.params;
    case 'query':
      return req.query;
    case 'headers':
      return req.headers;
    case 'body':
    default:
      return req.body;
  }
};

const validator = (schema, options = {}) => {
  const {
    target = 'body',
    parse = true,
    onError,
  } = options;

  if (!schema || typeof schema.safeParse !== 'function') {
    throw new TypeError('validator middleware expects a Zod schema');
  }

  return (req, res, next) => {
    try {
      const data = parseTarget(req, target);
      const result = schema.safeParse(data);

      if (!result.success) {
        const issues = result.error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        }));

        if (onError) {
          return onError({ issues, target, error: result.error }, req, res, next);
        }

        return res.status(400).json({
          status: 400,
          message: 'Validation failed',
          requestId: req.id,
          details: issues,
        });
      }

      if (parse) {
        switch (target) {
          case 'params':
            req.params = result.data;
            break;
          case 'query':
            req.query = result.data;
            break;
          case 'headers':
            req.headers = result.data;
            break;
          case 'body':
          default:
            req.body = result.data;
            break;
        }
      }

      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          status: 400,
          message: 'Validation failed',
          requestId: req.id,
          details: error.issues,
        });
      }

      return next(error);
    }
  };
};

module.exports = {
  validator,
};
