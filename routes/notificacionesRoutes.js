// routes/notificacionesRoutes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  registrarToken,
  eliminarToken
} = require('../services/notificacionesService');

/**
 * POST /api/notificaciones/registrar-token
 * Registra el token de notificaciones push del dispositivo
 * Requiere autenticación
 */
router.post('/registrar-token', auth, async (req, res) => {
  try {
    // Manejar caso donde req.body puede ser undefined
    if (!req.body) {
      return res.status(400).json({
        success: false,
        message: 'Body de la petición requerido'
      });
    }

    const { pushToken } = req.body;
    const usuarioId = req.user._id.toString(); // Del middleware de autenticación

    if (!pushToken) {
      return res.status(400).json({
        success: false,
        message: 'Token de notificación requerido'
      });
    }

    const tokenDoc = await registrarToken(usuarioId, pushToken, {
      dispositivo: req.body.dispositivo,
      plataforma: req.body.plataforma
    });

    res.json({
      success: true,
      message: 'Token registrado correctamente',
      data: tokenDoc
    });
  } catch (error) {
    console.error('Error registrando token:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error registrando token'
    });
  }
});

/**
 * POST /api/notificaciones/eliminar-token
 * Elimina el token de notificaciones (al cerrar sesión)
 * Requiere autenticación
 */
router.post('/eliminar-token', auth, async (req, res) => {
  try {
    const usuarioId = req.user._id.toString();
    // Manejar caso donde req.body puede ser undefined o null
    // pushToken es opcional - si no se envía, se eliminan todos los tokens del usuario
    const pushToken = (req.body && req.body.pushToken) ? req.body.pushToken : null;

    await eliminarToken(usuarioId, pushToken);

    res.json({
      success: true,
      message: pushToken ? 'Token eliminado correctamente' : 'Todos los tokens eliminados correctamente'
    });
  } catch (error) {
    console.error('Error eliminando token:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando token',
      error: error.message
    });
  }
});

module.exports = router;
