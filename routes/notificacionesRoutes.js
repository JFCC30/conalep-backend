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
    // Usar req.user.id o req.user._id según tu middleware; debe coincidir con User en BD
    const usuarioId = req.user.id ?? req.user._id?.toString();

    if (!pushToken) {
      return res.status(400).json({
        success: false,
        message: 'Token de notificación requerido'
      });
    }

    const tokenDoc = await registrarToken(usuarioId, pushToken, {
      dispositivo: req.body.dispositivo || 'Unknown',
      plataforma: req.body.plataforma || 'unknown'
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
    // Usar req.user.id o req.user._id según tu middleware
    const usuarioId = req.user.id ?? req.user._id?.toString();
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

/**
 * POST /api/notificaciones/enviar-prueba
 * Envía una notificación de prueba al usuario autenticado.
 * Útil para verificar que FCM + backend funcionan antes de producción.
 * Requiere autenticación
 */
router.post('/enviar-prueba', auth, async (req, res) => {
  try {
    const { enviarNotificacionAUsuario } = require('../services/notificacionesService');
    // Usar req.user.id o req.user._id según tu middleware
    const usuarioId = req.user.id ?? req.user._id?.toString();

    const ok = await enviarNotificacionAUsuario(usuarioId, {
      title: '🔔 Prueba CONALEP',
      body: 'Si ves esto, las notificaciones push están funcionando correctamente.',
      data: { tipo: 'prueba' }
    });

    if (!ok) {
      return res.status(400).json({
        success: false,
        message: 'No hay token de notificación registrado para este usuario. Inicia sesión en la app, acepta permisos y vuelve a intentar.'
      });
    }

    res.json({
      success: true,
      message: 'Notificación de prueba enviada. Revisa tu dispositivo.'
    });
  } catch (error) {
    console.error('Error enviando notificación de prueba:', error);
    res.status(500).json({
      success: false,
      message: 'Error enviando notificación de prueba: ' + error.message
    });
  }
});

module.exports = router;
