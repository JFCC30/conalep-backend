// routes/herramientas.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Herramienta = require('../models/Herramienta');
const { auth, requireRole } = require('../middleware/auth');

// Obtener todas las herramientas
router.get('/', auth, async (req, res) => {
  try {
    const herramientas = await Herramienta.find({ estaActiva: true })
      .sort({ nombre: 1 });
    
    res.json({ success: true, data: herramientas });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener herramienta por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const herramienta = await Herramienta.findById(req.params.id);
    
    if (!herramienta) {
      return res.status(404).json({ success: false, error: 'Herramienta no encontrada' });
    }
    
    res.json({ success: true, data: herramienta });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Crear nueva herramienta (solo admin)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ success: false, error: 'Solo administradores pueden crear herramientas' });
    }
    
    const herramienta = await Herramienta.create(req.body);
    res.json({ success: true, data: herramienta });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Actualizar herramienta (solo admin)
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ success: false, error: 'Solo administradores pueden actualizar herramientas' });
    }
    
    const herramienta = await Herramienta.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!herramienta) {
      return res.status(404).json({ success: false, error: 'Herramienta no encontrada' });
    }
    
    res.json({ success: true, data: herramienta });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;