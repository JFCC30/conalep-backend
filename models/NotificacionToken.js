// models/NotificacionToken.js
const mongoose = require('mongoose');

const notificacionTokenSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  pushToken: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  dispositivo: {
    type: String, // Opcional: nombre del dispositivo
    default: 'Unknown'
  },
  plataforma: {
    type: String, // 'ios' o 'android'
    default: 'unknown'
  },
  activo: {
    type: Boolean,
    default: true
  },
  ultimaActividad: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índice compuesto para búsquedas rápidas
notificacionTokenSchema.index({ usuario: 1, activo: 1 });

module.exports = mongoose.model('NotificacionToken', notificacionTokenSchema);
