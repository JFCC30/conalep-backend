// models/Sala.js (versión simplificada)
const mongoose = require('mongoose');

const salaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    unique: true,
    enum: ['A', 'B', 'C']
  },
  descripcion: {
    type: String,
    required: true
  },
  capacidad: {
    type: Number,
    required: true
  },
  ubicacion: {
    type: String,
    trim: true
  },
  estaActiva: {
    type: Boolean,
    default: true
  },
  imagenUrl: {
    type: String,
    default: null
  },
  imagenPublicId: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Sala', salaSchema);