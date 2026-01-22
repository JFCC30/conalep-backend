// models/Prestamo.js - VERSIÓN ACTUALIZADA CON SISTEMA DE APROBACIÓN
const mongoose = require('mongoose');

const prestamoSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  herramienta: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Herramienta',
    required: true
  },
  cantidad: {
    type: Number,
    required: true,
    min: 1
  },
  fechaSolicitud: {
    type: Date,
    default: Date.now
  },
  fechaPrestamo: {
    type: Date,
    default: null  // Se establece cuando el admin aprueba y entrega
  },
  fechaDevolucionEstimada: {
    type: Date,
    required: true
  },
  fechaDevolucionReal: {
    type: Date,
    default: null
  },
  estado: {
    type: String,
    enum: ['pendiente', 'aprobado', 'rechazado', 'prestado', 'devuelto', 'atrasado'],
    default: 'pendiente'
  },
  observaciones: {
    type: String,
    default: ''
  },
  motivoRechazo: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Middleware para actualizar estado según fechas
prestamoSchema.pre('save', function(next) {
  // Solo actualizar a atrasado si está prestado y pasó la fecha
  if (this.estado === 'prestado' && this.fechaDevolucionEstimada < new Date() && !this.fechaDevolucionReal) {
    this.estado = 'atrasado';
  }
  next();
});

module.exports = mongoose.model('Prestamo', prestamoSchema);
