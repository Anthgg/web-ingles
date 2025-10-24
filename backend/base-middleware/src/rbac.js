const jwt = require('jsonwebtoken');

const defaultExtractToken = (req) => {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header) return null;
  const [scheme, value] = header.split(' ');
  if (!/^Bearer$/i.test(scheme)) return null;
  return value;
};

const normalizeRoles = (user) => {
  if (!user) return [];
  if (Array.isArray(user.roles)) return user.roles;
  const fallback = user.rol || user.role;
  return fallback ? [fallback] : [];
};

const rbac = (allowedRoles = [], options = {}) => {
  const {
    jwtSecret,
    jwtOptions = {},
    extractToken = defaultExtractToken,
    getUser = req => req.user,
    onUnauthorized,
    onForbidden,
  } = options;

  return (req, res, next) => {
    try {
      let user = getUser(req);

      const hasJwtSecret = jwtSecret !== undefined && jwtSecret !== null;

      if (!user && hasJwtSecret) {
        const token = extractToken(req);
        if (!token) {
          if (onUnauthorized) return onUnauthorized(req, res, next);
          return res.status(401).json({ status: 401, message: 'Authorization token required', requestId: req.id });
        }

        try {
          user = jwt.verify(token, jwtSecret, jwtOptions);
          req.user = user;
        } catch (error) {
          if (onUnauthorized) return onUnauthorized(req, res, next, error);
          return res.status(401).json({ status: 401, message: 'Invalid authorization token', requestId: req.id });
        }
      }

      if (!user) {
        if (onUnauthorized) return onUnauthorized(req, res, next);
        return res.status(401).json({ status: 401, message: 'User context missing', requestId: req.id });
      }

      const roles = normalizeRoles(user);
      if (allowedRoles.length && !roles.some(role => allowedRoles.includes(role))) {
        if (onForbidden) return onForbidden(req, res, next, roles);
        return res.status(403).json({ status: 403, message: 'Insufficient permissions', requestId: req.id, details: { roles } });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

module.exports = {
  rbac,
};
