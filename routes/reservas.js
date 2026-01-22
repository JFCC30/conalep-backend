// routes/reservas.js
const express = require('express');
const Reserva = require('../models/Reserva');
const Sala = require('../models/Sala');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// En el backend, agrega esta ruta temporal en routes/reservas.js
// Ruta temporal para testing - cancelar reserva
router.patch('/:id/cancelar', auth, async (req, res) => {
  try {
    const reserva = await Reserva.findById(req.params.id);
    
    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }

    // Verificar que el usuario es el dueño o es admin
    if (reserva.usuario.toString() !== req.user._id.toString() && req.user.rol !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para cancelar esta reserva'
      });
    }

    // Solo se pueden cancelar reservas pendientes
    if (reserva.estado !== 'pendiente') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden cancelar reservas pendientes'
      });
    }

    reserva.estado = 'cancelada';
    await reserva.save();

    res.json({
      success: true,
      message: 'Reserva cancelada exitosamente',
      data: reserva
    });

  } catch (error) {
    console.error('Error cancelando reserva:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Solicitar reserva (docentes y admin)
router.post('/', auth, requireRole(['admin', 'docente']), async (req, res) => {
  try {
    const { salaId, fechaReserva, horaInicio, horaFin, motivo, grupo, materia } = req.body;

    // Verificar disponibilidad
    const estaDisponible = await Reserva.verificarDisponibilidad(
      salaId, 
      new Date(fechaReserva), 
      horaInicio, 
      horaFin
    );

    if (!estaDisponible) {
      return res.status(400).json({
        success: false,
        message: 'La sala no está disponible en ese horario'
      });
    }

    // Crear reserva
    const reserva = await Reserva.create({
      sala: salaId,
      usuario: req.user._id,
      fechaReserva: new Date(fechaReserva),
      horaInicio,
      horaFin,
      motivo,
      grupo,
      materia
    });

    // Populate para obtener datos relacionados
    await reserva.populate('sala', 'nombre descripcion');
    await reserva.populate('usuario', 'nombre email');

    res.status(201).json({
      success: true,
      message: 'Solicitud de reserva enviada exitosamente',
      data: reserva
    });

  } catch (error) {
    console.error('Error creando reserva:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando reserva: ' + error.message
    });
  }
});

// Obtener mis reservas (usuario loggeado)
router.get('/mis-reservas', auth, async (req, res) => {
  try {
    const reservas = await Reserva.find({ usuario: req.user._id })
      .populate('sala', 'nombre descripcion ubicacion')
      .sort({ fechaReserva: -1, horaInicio: -1 });

    res.json({
      success: true,
      data: reservas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo reservas'
    });
  }
});

// Obtener todas las reservas (solo admin)
router.get('/', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { estado } = req.query;
    const filter = estado ? { estado } : {};
    
    const reservas = await Reserva.find(filter)
      .populate('sala', 'nombre descripcion')
      .populate('usuario', 'nombre email rol')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: reservas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo reservas'
    });
  }
});

// Aprobar/rechazar/resolver reserva (solo admin)
router.patch('/:id/estado', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { estado, comentariosAdmin } = req.body;
    
    // Validar que el estado sea válido
    const estadosValidos = ['pendiente', 'aprobada', 'rechazada', 'cancelada'];
    if (!estado || !estadosValidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido. Debe ser: pendiente, aprobada, rechazada o cancelada'
      });
    }

    // Buscar la reserva
    const reserva = await Reserva.findById(req.params.id);
    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }

    // Actualizar estado
    reserva.estado = estado;

    // Actualizar comentarios del admin (opcional)
    // Si viene comentariosAdmin, guardarlo (puede ser string vacío)
    // Si no viene, mantener el valor actual o dejarlo vacío
    if (comentariosAdmin !== undefined) {
      reserva.comentariosAdmin = comentariosAdmin || '';
    }

    // Actualizar fecha de aprobación si se aprueba
    if (estado === 'aprobada') {
      reserva.fechaAprobacion = new Date();
    } else if (estado !== 'aprobada' && reserva.estado === 'aprobada') {
      // Si se cambia de aprobada a otro estado, limpiar fecha de aprobación
      reserva.fechaAprobacion = null;
    }

    await reserva.save();

    // Retornar reserva actualizada con populate
    const reservaActualizada = await Reserva.findById(req.params.id)
      .populate('sala', 'nombre descripcion')
      .populate('usuario', 'nombre email rol');

    // Mensaje dinámico según el estado
    let mensaje = 'Reserva actualizada exitosamente';
    if (estado === 'aprobada') {
      mensaje = 'Reserva aprobada exitosamente';
    } else if (estado === 'rechazada') {
      mensaje = 'Reserva rechazada exitosamente';
    } else if (estado === 'cancelada') {
      mensaje = 'Reserva cancelada exitosamente';
    }

    res.json({
      success: true,
      message: mensaje,
      data: reservaActualizada
    });

  } catch (error) {
    console.error('Error actualizando reserva:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar reserva',
      error: error.message
    });
  }
});

module.exports = router;