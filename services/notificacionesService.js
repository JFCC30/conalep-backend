// services/notificacionesService.js
const { Expo } = require('expo-server-sdk');
const NotificacionToken = require('../models/NotificacionToken');

// Crear cliente de Expo
const expo = new Expo();

/**
 * Envía una notificación push a un usuario específico
 * @param {string} usuarioId - ID del usuario destinatario
 * @param {Object} notificacion - Objeto con title, body, data
 * @returns {Promise<boolean>} - true si se envió correctamente
 */
async function enviarNotificacionAUsuario(usuarioId, notificacion) {
  try {
    // Buscar tokens activos del usuario
    const tokens = await NotificacionToken.find({
      usuario: usuarioId,
      activo: true
    });

    if (tokens.length === 0) {
      console.log(`⚠️ Usuario ${usuarioId} no tiene tokens de notificación registrados`);
      return false;
    }

    // Preparar mensajes para enviar
    const mensajes = [];
    for (const tokenDoc of tokens) {
      // Verificar que el token es válido
      if (!Expo.isExpoPushToken(tokenDoc.pushToken)) {
        console.warn(`⚠️ Token inválido: ${tokenDoc.pushToken}`);
        // Marcar token como inactivo
        await NotificacionToken.findByIdAndUpdate(tokenDoc._id, { activo: false });
        continue;
      }

      mensajes.push({
        to: tokenDoc.pushToken,
        sound: 'default',
        title: notificacion.title,
        body: notificacion.body,
        data: notificacion.data || {},
        priority: 'high',
        channelId: 'default' // Para Android
      });
    }

    if (mensajes.length === 0) {
      return false;
    }

    // Enviar notificaciones en chunks (Expo limita a 100 por request)
    const chunks = expo.chunkPushNotifications(mensajes);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error enviando chunk de notificaciones:', error);
      }
    }

    // Verificar errores en los tickets
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (ticket.status === 'error') {
        console.error(`Error en notificación ${i}:`, ticket.message);
        // Si el token es inválido, marcarlo como inactivo
        if (ticket.details?.error === 'DeviceNotRegistered') {
          const tokenDoc = tokens[i];
          if (tokenDoc) {
            await NotificacionToken.findByIdAndUpdate(tokenDoc._id, { activo: false });
          }
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error enviando notificación:', error);
    return false;
  }
}

/**
 * Envía notificaciones a todos los administradores
 * @param {Object} notificacion - Objeto con title, body, data
 * @returns {Promise<number>} - Número de administradores notificados
 */
async function enviarNotificacionAAdmins(notificacion) {
  try {
    const User = require('../models/User');
    
    // Buscar todos los administradores
    const admins = await User.find({ rol: 'admin' });
    
    let notificados = 0;
    for (const admin of admins) {
      const enviado = await enviarNotificacionAUsuario(admin._id.toString(), notificacion);
      if (enviado) notificados++;
    }

    return notificados;
  } catch (error) {
    console.error('Error enviando notificaciones a admins:', error);
    return 0;
  }
}

/**
 * Registra un token de notificación para un usuario
 * @param {string} usuarioId - ID del usuario
 * @param {string} pushToken - Token de Expo Push Notifications
 * @param {Object} metadata - Información adicional (dispositivo, plataforma)
 * @returns {Promise<Object>} - Token guardado
 */
async function registrarToken(usuarioId, pushToken, metadata = {}) {
  try {
    // Verificar que el token es válido
    if (!Expo.isExpoPushToken(pushToken)) {
      throw new Error('Token de notificación inválido');
    }

    // Buscar si ya existe el token
    let tokenDoc = await NotificacionToken.findOne({ pushToken });

    if (tokenDoc) {
      // Actualizar si es del mismo usuario o cambiar de usuario
      tokenDoc.usuario = usuarioId;
      tokenDoc.activo = true;
      tokenDoc.ultimaActividad = new Date();
      if (metadata.dispositivo) tokenDoc.dispositivo = metadata.dispositivo;
      if (metadata.plataforma) tokenDoc.plataforma = metadata.plataforma;
      await tokenDoc.save();
    } else {
      // Crear nuevo token
      tokenDoc = await NotificacionToken.create({
        usuario: usuarioId,
        pushToken,
        dispositivo: metadata.dispositivo || 'Unknown',
        plataforma: metadata.plataforma || 'unknown',
        activo: true
      });
    }

    return tokenDoc;
  } catch (error) {
    console.error('Error registrando token:', error);
    throw error;
  }
}

/**
 * Elimina un token de notificación (al cerrar sesión)
 * @param {string} usuarioId - ID del usuario
 * @param {string} pushToken - Token a eliminar (opcional, si no se proporciona elimina todos)
 * @returns {Promise<boolean>}
 */
async function eliminarToken(usuarioId, pushToken = null) {
  try {
    if (pushToken) {
      // Eliminar token específico
      await NotificacionToken.findOneAndDelete({
        usuario: usuarioId,
        pushToken
      });
    } else {
      // Eliminar todos los tokens del usuario
      await NotificacionToken.deleteMany({ usuario: usuarioId });
    }
    return true;
  } catch (error) {
    console.error('Error eliminando token:', error);
    return false;
  }
}

module.exports = {
  enviarNotificacionAUsuario,
  enviarNotificacionAAdmins,
  registrarToken,
  eliminarToken
};
