// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Acceso denegado. Token requerido.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido. Usuario no encontrado.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    res.status(401).json({
      success: false,
      message: 'Token inválido o expirado.'
    });
  }
};

// Middleware para verificar roles
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción.'
      });
    }
    next();
  };
};

// Middleware para verificar que el usuario sea admin
const adminOnly = (req, res, next) => {
  if (req.user.rol !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Solo administradores pueden realizar esta acción.'
    });
  }
  next();
};

module.exports = { auth, requireRole, adminOnly };