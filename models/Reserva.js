// models/Reserva.js (versión mejorada)
const mongoose = require('mongoose');

const reservaSchema = new mongoose.Schema({
  sala: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sala',
    required: true
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // FECHA Y HORARIOS (lo más importante)
  fechaReserva: {
    type: Date,  // Fecha específica (ej: 2024-01-15)
    required: true
  },
  horaInicio: {
    type: String,  // Formato "HH:MM" (ej: "09:00", "14:30")
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ // Valida formato HH:MM
  },
  horaFin: {
    type: String,  // Formato "HH:MM" 
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  // ESTADO DE LA SOLICITUD
  estado: {
    type: String,
    enum: ['pendiente', 'aprobada', 'rechazada', 'cancelada'],
    default: 'pendiente'
  },
  // INFORMACIÓN ADICIONAL
  motivo: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  grupo: {
    type: String,  // Ej: "6IM1", "4IV5"
    trim: true
  },
  materia: {
    type: String,  // Ej: "Programación", "Redes"
    trim: true
  },
  comentariosAdmin: {
    type: String,
    trim: true,
    default: ''
  },
  fechaAprobacion: {
    type: Date
  }
}, {
  timestamps: true
});

// Índice para evitar reservas duplicadas en misma sala y horario
reservaSchema.index({ 
  sala: 1, 
  fechaReserva: 1, 
  horaInicio: 1 
}, { 
  unique: true,
  partialFilterExpression: { estado: { $in: ['pendiente', 'aprobada'] } }
});

// Método para verificar si hay conflicto de horarios
reservaSchema.statics.verificarDisponibilidad = async function(salaId, fecha, horaInicio, horaFin) {
  const reservasExistentes = await this.find({
    sala: salaId,
    fechaReserva: fecha,
    estado: { $in: ['pendiente', 'aprobada'] },
    $or: [
      { horaInicio: { $lt: horaFin }, horaFin: { $gt: horaInicio } }
    ]
  });
  
  return reservasExistentes.length === 0;
};

module.exports = mongoose.model('Reserva', reservaSchema);