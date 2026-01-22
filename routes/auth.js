// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Verificar que vengan los datos
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }

    // 2. Buscar usuario
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas'
      });
    }

    // 3. Verificar contraseña
    const isPasswordValid = await user.compararPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas'
      });
    }

    // 4. Crear token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        rol: user.rol 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 5. Responder con datos del usuario (sin password)
    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        token,
        user: {
          id: user._id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol,
          departamento: user.departamento
        }
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Registro (opcional, para agregar más usuarios después)
router.post('/register', async (req, res) => {
  try {
    const { nombre, email, password, rol, departamento } = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'El usuario ya existe'
      });
    }

    // Crear nuevo usuario
    const user = await User.create({
      nombre,
      email,
      password, // Se encripta automáticamente en el modelo
      rol: rol || 'alumno',
      departamento
    });

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: {
        user: {
          id: user._id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol
        }
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;