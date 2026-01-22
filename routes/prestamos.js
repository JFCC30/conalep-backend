// routes/prestamos.js
const { auth, requireRole } = require('../middleware/auth');
const express = require('express');
const router = express.Router();
const Prestamo = require('../models/Prestamo');
const Herramienta = require('../models/Herramienta');
const User = require('../models/User');

// Obtener todos los préstamos (admin)
router.get('./', auth, async (req, res) => {
  try {
    const { estado } = req.query;
    let filtro = {};
    
    if (estado) {
      filtro.estado = estado;
    }
    
    const prestamos = await Prestamo.find(filtro)
      .populate('usuario', 'nombre email rol matricula departamento')
      .populate('herramienta', 'nombre categoria descripcion')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: prestamos });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener mis préstamos
router.get('/mis-prestamos', auth, async (req, res) => {
  try {
    const prestamos = await Prestamo.find({ usuario: req.user.id })
      .populate('herramienta', 'nombre categoria descripcion ubicacion')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: prestamos });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Crear nuevo préstamo
router.post('/', auth, async (req, res) => {
  try {
    const { herramientaId, cantidad, observaciones, diasPrestamo = 7 } = req.body;
    
    // Verificar que la herramienta existe y tiene stock
    const herramienta = await Herramienta.findById(herramientaId);
    if (!herramienta) {
      return res.status(404).json({ success: false, error: 'Herramienta no encontrada' });
    }
    
    if (herramienta.stockDisponible < cantidad) {
      return res.status(400).json({ 
        success: false, 
        error: `Stock insuficiente. Solo hay ${herramienta.stockDisponible} disponibles` 
      });
    }
    
    // Calcular fecha de devolución estimada
    const fechaDevolucionEstimada = new Date();
    fechaDevolucionEstimada.setDate(fechaDevolucionEstimada.getDate() + diasPrestamo);
    
    const prestamo = await Prestamo.create({
      herramienta: herramientaId,
      usuario: req.user.id,
      cantidad,
      fechaDevolucionEstimada,
      observaciones
    });
    
    const prestamoPopulado = await Prestamo.findById(prestamo._id)
      .populate('usuario', 'nombre email rol')
      .populate('herramienta', 'nombre categoria descripcion');
    
    res.json({ success: true, data: prestamoPopulado });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Devolver préstamo
router.patch('/:id/devolver', auth, async (req, res) => {
  try {
    const { devueltoEnBuenEstado = true, comentariosDevolucion = '' } = req.body;
    
    const prestamo = await Prestamo.findById(req.params.id)
      .populate('herramienta');
    
    if (!prestamo) {
      return res.status(404).json({ success: false, error: 'Préstamo no encontrado' });
    }
    
    // Verificar que el préstamo no esté ya devuelto
    if (prestamo.estado === 'devuelto') {
      return res.status(400).json({ success: false, error: 'El préstamo ya fue devuelto' });
    }
    
    prestamo.estado = 'devuelto';
    prestamo.fechaDevolucionReal = new Date();
    prestamo.devueltoEnBuenEstado = devueltoEnBuenEstado;
    prestamo.comentariosDevolucion = comentariosDevolucion;
    
    await prestamo.save();
    
    res.json({ success: true, data: prestamo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cancelar préstamo (solo admin o el propio usuario)
router.patch('/:id/cancelar', auth, async (req, res) => {
  try {
    const prestamo = await Prestamo.findById(req.params.id);
    
    if (!prestamo) {
      return res.status(404).json({ success: false, error: 'Préstamo no encontrado' });
    }
    
    // Verificar permisos
    if (req.user.rol !== 'admin' && prestamo.usuario.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'No tienes permisos para cancelar este préstamo' });
    }
    
    prestamo.estado = 'devuelto';
    prestamo.fechaDevolucionReal = new Date();
    prestamo.comentariosDevolucion = 'Cancelado por el usuario';
    
    await prestamo.save();
    
    res.json({ success: true, data: prestamo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;