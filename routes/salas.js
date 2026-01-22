// routes/salas.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const Sala = require('../models/Sala');
const Reserva = require('../models/Reserva');
const { auth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');

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
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó ningún archivo de imagen'
      });
    }

    // Buscar la sala
    const sala = await Sala.findById(id);
    if (!sala) {
      return res.status(404).json({
        success: false,
        message: 'Sala no encontrada'
      });
    }

    // Si ya existe una imagen en Cloudinary, eliminar la anterior
    if (sala.imagenPublicId) {
      try {
        await cloudinary.uploader.destroy(sala.imagenPublicId);
      } catch (error) {
        console.error('Error eliminando imagen anterior de Cloudinary:', error);
        // No fallar si no se puede eliminar la anterior
      }
    }

    // Subir a Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'conalep/salas', // Organizar en carpetas
          public_id: `sala-${id}-${Date.now()}`, // Nombre único
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 800, crop: 'limit' }, // Redimensionar si es muy grande
            { quality: 'auto' }, // Optimización automática
            { format: 'auto' } // Formato automático (webp si es compatible)
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      // Enviar el buffer de la imagen
      uploadStream.end(req.file.buffer);
    });

    // Actualizar la sala con la URL de Cloudinary
    sala.imagenUrl = uploadResult.secure_url; // URL pública segura (HTTPS)
    sala.imagenPublicId = uploadResult.public_id; // Guardar para poder eliminar después
    await sala.save();

    res.json({
      success: true,
      message: 'Imagen subida correctamente',
      data: {
        imagenUrl: uploadResult.secure_url,
        url: uploadResult.secure_url // Compatibilidad con frontend
      }
    });

  } catch (error) {
    console.error('Error subiendo imagen:', error);
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

    // Si la imagen está en Cloudinary, eliminarla
    if (sala.imagenPublicId) {
      try {
        await cloudinary.uploader.destroy(sala.imagenPublicId);
      } catch (error) {
        console.error('Error eliminando imagen de Cloudinary:', error);
        // Continuar aunque falle la eliminación en Cloudinary
      }
    }

    // Limpiar la URL y publicId en la base de datos
    sala.imagenUrl = null;
    sala.imagenPublicId = null;
    await sala.save();

    res.json({
      success: true,
      message: 'Imagen eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando imagen:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando imagen: ' + error.message
    });
  }
});

module.exports = router;