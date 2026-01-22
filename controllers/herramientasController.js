// controllers/herramientasController.js
const Herramienta = require('../models/Herramienta');

// Obtener todas las herramientas
exports.getHerramientas = async (req, res) => {
  try {
    const herramientas = await Herramienta.find().sort({ nombre: 1 });
    res.json({
      success: true,
      data: herramientas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo herramientas',
      error: error.message
    });
  }
};

// Obtener herramienta por ID
exports.getHerramientaById = async (req, res) => {
  try {
    const herramienta = await Herramienta.findById(req.params.id);
    if (!herramienta) {
      return res.status(404).json({
        success: false,
        message: 'Herramienta no encontrada'
      });
    }
    res.json({
      success: true,
      data: herramienta
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo herramienta',
      error: error.message
    });
  }
};

// Crear nueva herramienta (solo admin)
exports.crearHerramienta = async (req, res) => {
  try {
    const { nombre, categoria, descripcion, stockTotal, ubicacion } = req.body;

    if (!nombre || !categoria || stockTotal === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, categoría y stock total son requeridos'
      });
    }

    const nuevaHerramienta = new Herramienta({
      nombre,
      categoria,
      descripcion: descripcion || '',
      stockTotal: parseInt(stockTotal),
      stockDisponible: parseInt(stockTotal), // Al crear, todo el stock está disponible
      ubicacion: ubicacion || ''
    });

    await nuevaHerramienta.save();

    res.status(201).json({
      success: true,
      message: 'Herramienta creada exitosamente',
      data: nuevaHerramienta
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creando herramienta',
      error: error.message
    });
  }
};

// Actualizar herramienta (solo admin)
exports.actualizarHerramienta = async (req, res) => {
  try {
    const { nombre, categoria, descripcion, stockTotal, ubicacion } = req.body;
    const herramienta = await Herramienta.findById(req.params.id);

    if (!herramienta) {
      return res.status(404).json({
        success: false,
        message: 'Herramienta no encontrada'
      });
    }

    // Actualizar campos
    if (nombre) herramienta.nombre = nombre;
    if (categoria) herramienta.categoria = categoria;
    if (descripcion !== undefined) herramienta.descripcion = descripcion;
    if (ubicacion !== undefined) herramienta.ubicacion = ubicacion;
    
    // Si se actualiza el stock total, ajustar el disponible
    if (stockTotal !== undefined) {
      const nuevoStockTotal = parseInt(stockTotal);
      const diferencia = nuevoStockTotal - herramienta.stockTotal;
      herramienta.stockTotal = nuevoStockTotal;
      // Ajustar stock disponible manteniendo la diferencia
      herramienta.stockDisponible = Math.max(0, herramienta.stockDisponible + diferencia);
      
      // Asegurar que disponible no sea mayor que total
      if (herramienta.stockDisponible > herramienta.stockTotal) {
        herramienta.stockDisponible = herramienta.stockTotal;
      }
    }

    await herramienta.save();

    res.json({
      success: true,
      message: 'Herramienta actualizada exitosamente',
      data: herramienta
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error actualizando herramienta',
      error: error.message
    });
  }
};

// Eliminar herramienta (solo admin)
exports.eliminarHerramienta = async (req, res) => {
  try {
    const herramienta = await Herramienta.findById(req.params.id);

    if (!herramienta) {
      return res.status(404).json({
        success: false,
        message: 'Herramienta no encontrada'
      });
    }

    // Verificar si hay préstamos activos
    const Prestamo = require('../models/Prestamo');
    const prestamosActivos = await Prestamo.countDocuments({
      herramienta: herramienta._id,
      estado: { $in: ['prestado', 'atrasado'] }
    });

    if (prestamosActivos > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar la herramienta. Tiene ${prestamosActivos} préstamo(s) activo(s)`
      });
    }

    await Herramienta.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Herramienta eliminada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error eliminando herramienta',
      error: error.message
    });
  }
};

// Gestionar stock (aumentar o disminuir)
exports.gestionarStock = async (req, res) => {
  try {
    const { operacion, cantidad } = req.body;
    const herramienta = await Herramienta.findById(req.params.id);

    if (!herramienta) {
      return res.status(404).json({
        success: false,
        message: 'Herramienta no encontrada'
      });
    }

    if (!operacion || !cantidad || cantidad <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Operación y cantidad válida son requeridas'
      });
    }

    const cantidadNum = parseInt(cantidad);

    if (operacion === 'aumentar') {
      herramienta.stockTotal += cantidadNum;
      herramienta.stockDisponible += cantidadNum;
    } else if (operacion === 'disminuir') {
      if (cantidadNum > herramienta.stockDisponible) {
        return res.status(400).json({
          success: false,
          message: `No puedes disminuir más de ${herramienta.stockDisponible} unidades (stock disponible)`
        });
      }
      herramienta.stockTotal -= cantidadNum;
      herramienta.stockDisponible -= cantidadNum;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Operación inválida. Use "aumentar" o "disminuir"'
      });
    }

    // Validar que no queden valores negativos
    if (herramienta.stockTotal < 0) herramienta.stockTotal = 0;
    if (herramienta.stockDisponible < 0) herramienta.stockDisponible = 0;
    if (herramienta.stockDisponible > herramienta.stockTotal) {
      herramienta.stockDisponible = herramienta.stockTotal;
    }

    await herramienta.save();

    res.json({
      success: true,
      message: `Stock ${operacion === 'aumentar' ? 'aumentado' : 'disminuido'} exitosamente`,
      data: herramienta
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error gestionando stock',
      error: error.message
    });
  }
};

