const jwt = require('jsonwebtoken');
const { getUserPermissions, hasPermission } = require('../config/permissions');

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Access denied. Token missing.' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
    req.user = {
      ...decoded,
      permissions: getUserPermissions(decoded),
    };
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Permission denied.' });
    }
    return next();
  };
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user || !hasPermission(req.user, permission)) {
      return res.status(403).json({ message: 'Permission denied.', requiredPermission: permission });
    }
    return next();
  };
}

module.exports = { verifyToken, allowRoles, requirePermission, hasPermission, getUserPermissions };
