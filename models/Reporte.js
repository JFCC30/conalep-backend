// models/Reporte.js
const mongoose = require('mongoose');

const reporteSchema = new mongoose.Schema({
  numeroMaquina: {
    type: String,
    required: true,
    trim: true
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  titulo: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  descripcion: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  prioridad: {
    type: String,
    enum: ['baja', 'media', 'alta'],
    default: 'media'
  },
  estado: {
    type: String,
    enum: ['pendiente', 'en_proceso', 'resuelto'],
    default: 'pendiente'
  },
  comentariosTecnico: {
    type: String,
    trim: true,
    maxlength: 300
  },
  fechaResolucion: {
    type: Date
  },
  categoria: {
    type: String,
    enum: ['hardware', 'software', 'red', 'periferico', 'otros'],
    default: 'otros'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Reporte', reporteSchema);