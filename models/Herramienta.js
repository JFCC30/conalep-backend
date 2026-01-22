// models/Herramienta.js
const mongoose = require('mongoose');

const herramientaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  categoria: {
    type: String,
    required: true,
    trim: true
  },
  descripcion: {
    type: String,
    default: ''
  },
  stockTotal: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  stockDisponible: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  ubicacion: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Asegurar que stockDisponible no sea mayor que stockTotal
herramientaSchema.pre('save', function(next) {
  if (this.stockDisponible > this.stockTotal) {
    this.stockDisponible = this.stockTotal;
  }
  next();
});

module.exports = mongoose.model('Herramienta', herramientaSchema);

