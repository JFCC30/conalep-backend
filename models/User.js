// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  rol: {
    type: String,
    enum: ['admin', 'docente', 'oficinista', 'alumno'],
    default: 'alumno'
  },
  matricula: {
    type: String,
    sparse: true // Para que no sea requerido para todos
  },
  departamento: {
    type: String,
    trim: true
  },
  estaActivo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true // Crea createdAt y updatedAt automáticamente
});

// Encriptar password antes de guardar
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Método para comparar passwords
userSchema.methods.compararPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);