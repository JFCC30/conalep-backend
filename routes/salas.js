// routes/salas.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const Sala = require('../models/Sala');
const Reserva = require('../models/Reserva');
const { auth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Obtener todas las salas (público)
router.get('/', async (req, res) => {
  try {
    const salas = await Sala.find({ estaActiva: true });
    res.json({
      success: true,
      data: salas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo salas'
    });
  }
});

// Obtener imagen de una sala (público - sin autenticación)
router.get('/:id/imagen', async (req, res) => {
  try {
    const sala = await Sala.findById(req.params.id);
    if (!sala) {
      return res.status(404).json({
        success: false,
        message: 'Sala no encontrada'
      });
    }

    if (!sala.imagenUrl) {
      return res.status(404).json({
        success: false,
        message: 'La sala no tiene una imagen asignada'
      });
    }

    res.json({
      success: true,
      data: {
        imagenUrl: sala.imagenUrl,
        url: sala.imagenUrl, // Alias para compatibilidad
        nombre: sala.nombre
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo imagen: ' + error.message
    });
  }
});

// Obtener disponibilidad de sala (público)
router.get('/:id/disponibilidad', async (req, res) => {
  try {
    const { fecha } = req.query; // formato: YYYY-MM-DD
    
    if (!fecha) {
      return res.status(400).json({
        success: false,
        message: 'Fecha requerida'
      });
    }

    // Buscar reservas de la sala para esa fecha
    const reservas = await Reserva.find({
      sala: req.params.id,
      fechaReserva: new Date(fecha),
      estado: { $in: ['aprobada', 'pendiente'] } // Solo reservas activas
    })
      .populate('usuario', 'nombre email') // Poblar información del usuario
      .sort({ horaInicio: 1 }); // Ordenar por hora de inicio

    // Formatear respuesta con información del usuario
    const reservasFormateadas = reservas.map(reserva => {
      const reservaObj = reserva.toObject();
      return {
        _id: reservaObj._id,
        horaInicio: reservaObj.horaInicio,
        horaFin: reservaObj.horaFin,
        estado: reservaObj.estado,
        motivo: reservaObj.motivo,
        grupo: reservaObj.grupo,
        materia: reservaObj.materia,
        usuario: {
          _id: reservaObj.usuario._id,
          nombre: reservaObj.usuario.nombre,
          email: reservaObj.usuario.email
        },
        usuarioNombre: reservaObj.usuario.nombre // Campo adicional para facilitar acceso
      };
    });

    res.json({
      success: true,
      data: reservasFormateadas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verificando disponibilidad',
      error: error.message
    });
  }
});

// Obtener sala por ID (público) - Debe ir después de rutas específicas
router.get('/:id', async (req, res) => {
  try {
    const sala = await Sala.findById(req.params.id);
    if (!sala) {
      return res.status(404).json({
        success: false,
        message: 'Sala no encontrada'
      });
    }
    res.json({
      success: true,
      data: sala
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo sala'
    });
  }
});

// Crear sala (solo admin)
router.post('/', auth, requireRole(['admin']), async (req, res) => {
  try {
    const sala = await Sala.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Sala creada exitosamente',
      data: sala
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creando sala: ' + error.message
    });
  }
});

// Subir imagen a una sala (solo admin)
router.post('/:id/imagen', auth, requireRole(['admin']), upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó ningún archivo de imagen'
      });
    }

    const sala = await Sala.findById(req.params.id);
    if (!sala) {
      // Eliminar archivo subido si la sala no existe
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Sala no encontrada'
      });
    }

    // Si ya existe una imagen, eliminar la anterior
    if (sala.imagenUrl) {
      const oldImagePath = path.join(__dirname, '../', sala.imagenUrl);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Guardar la URL de la nueva imagen (relativa a la carpeta pública)
    const imagenUrl = `/uploads/images/salas/${req.file.filename}`;
    sala.imagenUrl = imagenUrl;
    await sala.save();

    res.json({
      success: true,
      message: 'Imagen subida exitosamente',
      data: {
        imagenUrl: imagenUrl
      }
    });
  } catch (error) {
    // Eliminar archivo en caso de error
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Error subiendo imagen: ' + error.message
    });
  }
});

// Eliminar imagen de una sala (solo admin)
router.delete('/:id/imagen', auth, requireRole(['admin']), async (req, res) => {
  try {
    const sala = await Sala.findById(req.params.id);
    if (!sala) {
      return res.status(404).json({
        success: false,
        message: 'Sala no encontrada'
      });
    }

    if (!sala.imagenUrl) {
      return res.status(400).json({
        success: false,
        message: 'La sala no tiene una imagen asignada'
      });
    }

    // Eliminar archivo físico
    const imagePath = path.join(__dirname, '../', sala.imagenUrl);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // Limpiar la URL en la base de datos
    sala.imagenUrl = null;
    await sala.save();

    res.json({
      success: true,
      message: 'Imagen eliminada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error eliminando imagen: ' + error.message
    });
  }
});

module.exports = router;