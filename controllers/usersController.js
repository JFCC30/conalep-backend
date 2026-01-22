// controllers/usersController.js
const User = require('../models/User');

// GET /api/users - Obtener todos los usuarios
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios',
      error: error.message
    });
  }
};

// GET /api/users/:id - Obtener un usuario por ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuario',
      error: error.message
    });
  }
};

// POST /api/users - Crear un nuevo usuario
exports.createUser = async (req, res) => {
  try {
    const { nombre, email, password, rol, departamento, matricula } = req.body;
    
    // Validaciones
    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: nombre, email, password, rol'
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }
    
    const rolesValidos = ['admin', 'docente', 'oficinista', 'alumno'];
    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({
        success: false,
        message: `Rol inválido. Debe ser uno de: ${rolesValidos.join(', ')}`
      });
    }
    
    // Verificar si el email ya existe
    const emailExiste = await User.findOne({ email: email.toLowerCase().trim() });
    if (emailExiste) {
      return res.status(409).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }
    
    // Guardar la contraseña en texto plano antes de hashear (para retornarla)
    const passwordEnTextoPlano = password;
    
    // Crear usuario (el password se hashea automáticamente en el pre-save hook del modelo)
    const newUser = await User.create({
      nombre: nombre.trim(),
      email: email.toLowerCase().trim(),
      password, // Se hashea automáticamente en el modelo
      rol,
      departamento: departamento ? departamento.trim() : null,
      matricula: matricula ? matricula.trim() : null
    });
    
    // Retornar usuario con password en texto plano
    const userResponse = newUser.toObject();
    delete userResponse.password;
    userResponse.password = passwordEnTextoPlano; // Agregar password en texto plano
    
    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: userResponse
    });
  } catch (error) {
    // Manejar error de email duplicado
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al crear usuario',
      error: error.message
    });
  }
};

// PATCH /api/users/:id - Actualizar un usuario
exports.updateUser = async (req, res) => {
  try {
    const { email, departamento, matricula, nombre } = req.body;
    const userId = req.params.id;
    
    // Buscar usuario
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Si se quiere cambiar el email, verificar que no exista
    if (email && email.toLowerCase().trim() !== user.email) {
      const emailExiste = await User.findOne({ 
        email: email.toLowerCase().trim(),
        _id: { $ne: userId }
      });
      
      if (emailExiste) {
        return res.status(409).json({
          success: false,
          message: 'El email ya está registrado por otro usuario'
        });
      }
      
      user.email = email.toLowerCase().trim();
    }
    
    // Actualizar otros campos
    if (nombre !== undefined) user.nombre = nombre.trim();
    if (departamento !== undefined) user.departamento = departamento ? departamento.trim() : null;
    if (matricula !== undefined) user.matricula = matricula ? matricula.trim() : null;
    
    await user.save();
    
    // Retornar usuario sin password
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: userResponse
    });
  } catch (error) {
    // Manejar error de email duplicado
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'El email ya está registrado por otro usuario'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario',
      error: error.message
    });
  }
};

// PATCH /api/users/:id/password - Cambiar contraseña
exports.changePassword = async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.params.id;
    
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña es requerida'
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Guardar la contraseña en texto plano antes de hashear (para retornarla)
    const passwordEnTextoPlano = password;
    
    // Cambiar la contraseña (se hashea automáticamente en el pre-save hook del modelo)
    user.password = password;
    await user.save();
    
    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente',
      data: {
        password: passwordEnTextoPlano // Retornar password en texto plano
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al cambiar contraseña',
      error: error.message
    });
  }
};

// DELETE /api/users/:id - Eliminar un usuario
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUserId = req.user._id.toString();
    
    // No permitir eliminarse a sí mismo
    if (userId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'No puedes eliminar tu propia cuenta'
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    await User.findByIdAndDelete(userId);
    
    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario',
      error: error.message
    });
  }
};
