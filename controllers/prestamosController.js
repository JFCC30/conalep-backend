// controllers/prestamosController.js - VERSIÓN ACTUALIZADA CON SISTEMA DE APROBACIÓN
const Prestamo = require('../models/Prestamo');
const Herramienta = require('../models/Herramienta');
const { enviarNotificacionAAdmins, enviarNotificacionAUsuario } = require('../services/notificacionesService');

// Obtener todos los préstamos (admin)
exports.getPrestamos = async (req, res) => {
  try {
    const { estado } = req.query;
    const query = estado ? { estado } : {};
    
    const prestamos = await Prestamo.find(query)
      .populate('usuario', 'nombre email rol matricula departamento')
      .populate('herramienta', 'nombre categoria descripcion ubicacion stockTotal stockDisponible')
      .sort({ fechaSolicitud: -1 });

    res.json({
      success: true,
      data: prestamos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo préstamos',
      error: error.message
    });
  }
};

// Obtener mis préstamos
exports.getMisPrestamos = async (req, res) => {
  try {
    const prestamos = await Prestamo.find({ usuario: req.user._id })
      .populate('herramienta', 'nombre categoria descripcion ubicacion')
      .sort({ fechaSolicitud: -1 });

    res.json({
      success: true,
      data: prestamos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo mis préstamos',
      error: error.message
    });
  }
};

// Crear préstamo (solicitud) - NO actualiza stock todavía
exports.crearPrestamo = async (req, res) => {
  try {
    const { herramientaId, cantidad, diasPrestamo, observaciones } = req.body;

    if (!herramientaId || !cantidad || !diasPrestamo) {
      return res.status(400).json({
        success: false,
        message: 'Herramienta, cantidad y días de préstamo son requeridos'
      });
    }

    const herramienta = await Herramienta.findById(herramientaId);
    if (!herramienta) {
      return res.status(404).json({
        success: false,
        message: 'Herramienta no encontrada'
      });
    }

    // Verificar stock disponible (pero NO actualizar todavía)
    if (cantidad > herramienta.stockDisponible) {
      return res.status(400).json({
        success: false,
        message: `Solo hay ${herramienta.stockDisponible} unidades disponibles`
      });
    }

    // Calcular fecha de devolución estimada
    const fechaDevolucionEstimada = new Date();
    fechaDevolucionEstimada.setDate(fechaDevolucionEstimada.getDate() + parseInt(diasPrestamo));

    // Crear préstamo con estado 'pendiente'
    const nuevoPrestamo = new Prestamo({
      usuario: req.user._id,
      herramienta: herramientaId,
      cantidad: parseInt(cantidad),
      fechaDevolucionEstimada,
      observaciones: observaciones || '',
      estado: 'pendiente'  // Estado inicial
    });

    await nuevoPrestamo.save();

    // Poblar datos para la respuesta
    await nuevoPrestamo.populate('herramienta', 'nombre categoria descripcion ubicacion');

    // ✅ ENVIAR NOTIFICACIÓN A ADMINS
    await enviarNotificacionAAdmins({
      title: '🔧 Nueva Solicitud de Préstamo',
      body: `${req.user.nombre} ha solicitado ${cantidad} ${herramienta.nombre}`,
      data: {
        tipo: 'prestamo',
        prestamoId: nuevoPrestamo._id.toString(),
        herramientaId: herramientaId,
        accion: 'nueva'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Solicitud de préstamo creada exitosamente. Esperando aprobación del administrador.',
      data: nuevoPrestamo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creando solicitud de préstamo',
      error: error.message
    });
  }
};

// Aprobar préstamo (solo admin) - Aquí SÍ se actualiza el stock
exports.aprobarPrestamo = async (req, res) => {
  try {
    const prestamo = await Prestamo.findById(req.params.id)
      .populate('herramienta');

    if (!prestamo) {
      return res.status(404).json({
        success: false,
        message: 'Préstamo no encontrado'
      });
    }

    if (prestamo.estado !== 'pendiente') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden aprobar préstamos pendientes'
      });
    }

    const herramienta = await Herramienta.findById(prestamo.herramienta._id);
    
    // Verificar stock disponible nuevamente
    if (prestamo.cantidad > herramienta.stockDisponible) {
      return res.status(400).json({
        success: false,
        message: `No hay suficiente stock disponible. Solo hay ${herramienta.stockDisponible} unidades`
      });
    }

    // Actualizar préstamo
    prestamo.estado = 'prestado';
    prestamo.fechaPrestamo = new Date();
    await prestamo.save();

    // Actualizar stock disponible de la herramienta
    herramienta.stockDisponible -= prestamo.cantidad;
    await herramienta.save();

    // Poblar datos para la respuesta
    await prestamo.populate('usuario', 'nombre email');
    await prestamo.populate('herramienta', 'nombre categoria descripcion ubicacion');

    // ✅ ENVIAR NOTIFICACIÓN AL USUARIO
    await enviarNotificacionAUsuario(prestamo.usuario._id.toString(), {
      title: '✅ Préstamo Aprobado',
      body: `Tu solicitud de préstamo de ${prestamo.herramienta.nombre} ha sido aprobada`,
      data: {
        tipo: 'prestamo',
        prestamoId: prestamo._id.toString(),
        estado: 'prestado',
        accion: 'aprobado'
      }
    });

    res.json({
      success: true,
      message: 'Préstamo aprobado y entregado exitosamente',
      data: prestamo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error aprobando préstamo',
      error: error.message
    });
  }
};

// Rechazar préstamo (solo admin)
exports.rechazarPrestamo = async (req, res) => {
  try {
    const { motivoRechazo } = req.body;
    const prestamo = await Prestamo.findById(req.params.id)
      .populate('usuario', 'nombre email')
      .populate('herramienta', 'nombre');

    if (!prestamo) {
      return res.status(404).json({
        success: false,
        message: 'Préstamo no encontrado'
      });
    }

    if (prestamo.estado !== 'pendiente') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden rechazar préstamos pendientes'
      });
    }

    // Actualizar préstamo
    prestamo.estado = 'rechazado';
    prestamo.motivoRechazo = motivoRechazo || '';
    await prestamo.save();

    // ✅ ENVIAR NOTIFICACIÓN AL USUARIO
    await enviarNotificacionAUsuario(prestamo.usuario._id.toString(), {
      title: '❌ Préstamo Rechazado',
      body: `Tu solicitud de préstamo de ${prestamo.herramienta.nombre} ha sido rechazada`,
      data: {
        tipo: 'prestamo',
        prestamoId: prestamo._id.toString(),
        estado: 'rechazado',
        accion: 'rechazado',
        motivoRechazo: motivoRechazo || ''
      }
    });

    res.json({
      success: true,
      message: 'Préstamo rechazado exitosamente',
      data: prestamo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error rechazando préstamo',
      error: error.message
    });
  }
};

// Devolver préstamo (solo admin)
exports.devolverPrestamo = async (req, res) => {
  try {
    const prestamo = await Prestamo.findById(req.params.id)
      .populate('herramienta');

    if (!prestamo) {
      return res.status(404).json({
        success: false,
        message: 'Préstamo no encontrado'
      });
    }

    if (prestamo.estado !== 'prestado' && prestamo.estado !== 'atrasado') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden devolver préstamos que están prestados o atrasados'
      });
    }

    // Actualizar préstamo
    prestamo.estado = 'devuelto';
    prestamo.fechaDevolucionReal = new Date();
    await prestamo.save();

    // Restaurar stock disponible
    const herramienta = await Herramienta.findById(prestamo.herramienta._id);
    herramienta.stockDisponible += prestamo.cantidad;
    
    // Asegurar que no exceda el stock total
    if (herramienta.stockDisponible > herramienta.stockTotal) {
      herramienta.stockDisponible = herramienta.stockTotal;
    }
    
    await herramienta.save();

    res.json({
      success: true,
      message: 'Préstamo devuelto exitosamente',
      data: prestamo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error devolviendo préstamo',
      error: error.message
    });
  }
};

// Cancelar préstamo (usuario o admin)
exports.cancelarPrestamo = async (req, res) => {
  try {
    const prestamo = await Prestamo.findById(req.params.id)
      .populate('herramienta');

    if (!prestamo) {
      return res.status(404).json({
        success: false,
        message: 'Préstamo no encontrado'
      });
    }

    // Verificar que el usuario sea el dueño del préstamo o admin
    if (prestamo.usuario.toString() !== req.user._id.toString() && req.user.rol !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para cancelar este préstamo'
      });
    }

    // Solo se pueden cancelar préstamos pendientes
    if (prestamo.estado !== 'pendiente') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden cancelar préstamos pendientes'
      });
    }

    // Eliminar préstamo (no se actualiza stock porque nunca se prestó)
    await Prestamo.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Préstamo cancelado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cancelando préstamo',
      error: error.message
    });
  }
};
