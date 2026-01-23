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
    const { pushToken } = req.body; // Opcional

    await eliminarToken(usuarioId, pushToken);

    res.json({
      success: true,
      message: 'Token eliminado correctamente'
    });
  } catch (error) {
    console.error('Error eliminando token:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando token'
    });
  }
});

module.exports = router;
