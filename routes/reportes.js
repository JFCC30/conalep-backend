// routes/reportes.js
const express = require('express');
const Reporte = require('../models/Reporte');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Crear nuevo reporte (docentes y admin)
router.post('/', auth, requireRole(['admin', 'docente']), async (req, res) => {
  try {
    const { numeroMaquina, titulo, descripcion, prioridad, categoria } = req.body;

    const reporte = await Reporte.create({
      numeroMaquina,
      titulo,
      descripcion,
      prioridad: prioridad || 'media',
      categoria: categoria || 'otros',
      usuario: req.user._id
    });

    await reporte.populate('usuario', 'nombre email rol');

    res.status(201).json({
      success: true,
      message: 'Reporte creado exitosamente',
      data: reporte
    });

  } catch (error) {
    console.error('Error creando reporte:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Obtener mis reportes (usuario loggeado)
router.get('/mis-reportes', auth, async (req, res) => {
  try {
    const reportes = await Reporte.find({ usuario: req.user._id })
      .populate('usuario', 'nombre email rol')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: reportes
    });

  } catch (error) {
    console.error('Error obteniendo reportes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Obtener todos los reportes (solo admin)
router.get('/', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { estado } = req.query;
    const filter = estado ? { estado } : {};

    const reportes = await Reporte.find(filter)
      .populate('usuario', 'nombre email rol')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: reportes
    });

  } catch (error) {
    console.error('Error obteniendo reportes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Actualizar estado de reporte (solo admin)
router.patch('/:id/estado', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { estado, comentariosTecnico } = req.body;

    if (!['pendiente', 'en_proceso', 'resuelto'].includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido'
      });
    }

    const updateData = {
      estado,
      comentariosTecnico: comentariosTecnico || ''
    };

    if (estado === 'resuelto') {
      updateData.fechaResolucion = new Date();
    }

    const reporte = await Reporte.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('usuario', 'nombre email rol');

    if (!reporte) {
      return res.status(404).json({
        success: false,
        message: 'Reporte no encontrado'
      });
    }

    res.json({
      success: true,
      message: `Reporte ${estado === 'resuelto' ? 'resuelto' : 'actualizado'} exitosamente`,
      data: reporte
    });

  } catch (error) {
    console.error('Error actualizando reporte:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;