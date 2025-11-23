const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

function auth(requiredRole) {
  return (req, res, next) => {
    const header = req.headers['authorization'];
    if (!header) return res.status(401).json({ message: 'Token requerido' });
    const token = header.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token inválido' });
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev');
      if (requiredRole && decoded.rol !== requiredRole) {
        return res.status(403).json({ message: 'No autorizado' });
      }
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ message: 'Sesión expirada' });
    }
  };
}

module.exports = auth;
