// server.js - VERSIÓN PARA PRODUCCIÓN (RENDER)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// ====================
// CONFIGURACIÓN CORS PARA PRODUCCIÓN
// ====================
const corsOptions = {
  origin: function (origin, callback) {
    // En desarrollo permitir cualquier origen
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // En producción, definir orígenes permitidos
    const allowedOrigins = [
      'https://conalep-control-app.onrender.com', // Tu frontend si lo subes
      /\.onrender\.com$/, // Todos los dominios de Render
      'exp://', // Para Expo Go
      'http://localhost:19006', // Expo Web
      'http://localhost:8081' // Expo
    ];
    
    if (!origin || allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    })) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ====================
// CONEXIÓN A MONGODB
// ====================
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI no está definida en las variables de entorno');
    }
    
    console.log('🔗 Conectando a MongoDB...');
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Conectado a MongoDB Atlas');
    
    // Manejar eventos de conexión
    mongoose.connection.on('error', err => {
      console.error('❌ Error de conexión a MongoDB:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  Desconectado de MongoDB');
    });
    
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    process.exit(1); // Salir si no se puede conectar a la DB
  }
};

// Iniciar conexión a DB
connectDB();

// ====================
// IMPORTAR RUTAS
// ====================
const herramientasRoutes = require('./routes/herramientasRoutes');
const prestamosRoutes = require('./routes/prestamosRoutes');
const usersRoutes = require('./routes/usersRoutes');

// ====================
// RUTAS DE LA API
// ====================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/salas', require('./routes/salas'));
app.use('/api/reservas', require('./routes/reservas'));
app.use('/api/reportes', require('./routes/reportes'));
app.use('/api/herramientas', herramientasRoutes);
app.use('/api/prestamos', prestamosRoutes);
app.use('/api/users', usersRoutes);

// ====================
// RUTAS DE SISTEMA
// ====================

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: '🚀 API CONALEP - Sistema de Control de Informática',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      auth: '/api/auth',
      salas: '/api/salas',
      reservas: '/api/reservas',
      reportes: '/api/reportes',
      herramientas: '/api/herramientas',
      prestamos: '/api/prestamos',
      users: '/api/users'
    },
    documentation: 'Consulta la documentación para más detalles'
  });
});

// Ruta de salud mejorada
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    const dbStatusText = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    }[dbStatus] || 'unknown';
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbStatusText,
        readyState: dbStatus
      },
      memory: process.memoryUsage(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error.message
    });
  }
});

// Ruta de prueba
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Backend CONALEP funcionando correctamente!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Ruta para crear datos iniciales
app.get('/api/seed', async (req, res) => {
  try {
    console.log('🌱 Verificando datos iniciales...');
    
    // Importar modelos aquí para evitar ciclos
    const User = require('./models/User');
    const Sala = require('./models/Sala');
    const Herramienta = require('./models/Herramienta');
    
    // Verificar si ya existen datos
    const [salasExistentes, usuariosExistentes, herramientasExistentes] = await Promise.all([
      Sala.countDocuments(),
      User.countDocuments(),
      Herramienta.countDocuments()
    ]);
    
    if (salasExistentes > 0 || usuariosExistentes > 0 || herramientasExistentes > 0) {
      return res.json({
        success: true,
        message: '✅ Los datos iniciales ya existen en la base de datos',
        data: {
          salas: salasExistentes,
          usuarios: usuariosExistentes,
          herramientas: herramientasExistentes
        }
      });
    }
    
    console.log('🌱 Creando datos iniciales...');
    
    // 1. Crear salas
    const salas = await Sala.create([
      {
        nombre: 'A',
        descripcion: 'Laboratorio de Computación',
        capacidad: 25,
        ubicacion: 'Edificio Principal de Informatica'
      },
      {
        nombre: 'B',
        descripcion: 'Laboratorio de Computación',
        capacidad: 30,
        ubicacion: 'A lado del edificio de computacion'
      },
      {
        nombre: 'C',
        descripcion: 'Laboratorio de Redes',
        capacidad: 20,
        ubicacion: 'A lado de Crea I'
      }
    ]);
    
    // 2. Crear herramientas
    const herramientas = await Herramienta.create([
      {
        nombre: 'Cable HDMI',
        categoria: 'cable',
        descripcion: 'Cable HDMI 1.8 metros',
        stockTotal: 10,
        stockDisponible: 10,
        ubicacion: 'Cajón 1 - Almacén'
      },
      {
        nombre: 'Adaptador USB-C a HDMI',
        categoria: 'adaptador',
        descripcion: 'Adaptador para conectar laptops USB-C a proyectores',
        stockTotal: 5,
        stockDisponible: 5,
        ubicacion: 'Cajón 2 - Almacén'
      },
      {
        nombre: 'Mouse Inalámbrico',
        categoria: 'periferico',
        descripcion: 'Mouse logitech con receptor USB',
        stockTotal: 8,
        stockDisponible: 8,
        ubicacion: 'Cajón 3 - Almacén'
      },
      {
        nombre: 'Extension Multiple',
        categoria: 'herramienta',
        descripcion: 'Regleta de 6 contactos con protección',
        stockTotal: 4,
        stockDisponible: 4,
        ubicacion: 'Estante Principal'
      },
      {
        nombre: 'Teclado USB',
        categoria: 'periferico',
        descripcion: 'Teclado estándar USB',
        stockTotal: 6,
        stockDisponible: 6,
        ubicacion: 'Cajón 4 - Almacén'
      }
    ]);
    
    // 3. Crear usuarios
    const adminUser = await User.create({
      nombre: 'Administrador CONALEP',
      email: 'admin@conalep.edu.mx',
      password: 'admin123',
      rol: 'admin',
      departamento: 'Sistemas'
    });
    
    const docenteUser = await User.create({
      nombre: 'Profesor Juan Pérez',
      email: 'juan.perez@conalep.edu.mx',
      password: 'docente123',
      rol: 'docente',
      departamento: 'Informática'
    });
    
    const alumnoUser = await User.create({
      nombre: 'Ana García López',
      email: 'alumno@conalep.edu.mx',
      password: 'alumno123',
      rol: 'alumno',
      matricula: '2024001'
    });
    
    res.json({
      success: true,
      message: '✅ Datos iniciales creados exitosamente',
      data: {
        salas: salas.length,
        herramientas: herramientas.length,
        usuarios: 3
      }
    });
    
  } catch (error) {
    console.error('❌ Error creando datos iniciales:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Ruta para crear solo usuario alumno
app.get('/api/seed-alumno', async (req, res) => {
  try {
    const User = require('./models/User');
    
    const alumnoExistente = await User.findOne({ email: 'alumno@conalep.edu.mx' });
    
    if (alumnoExistente) {
      return res.json({
        success: true,
        message: '✅ El usuario alumno ya existe',
        data: alumnoExistente
      });
    }
    
    const alumnoUser = await User.create({
      nombre: 'Ana García López',
      email: 'alumno@conalep.edu.mx',
      password: 'alumno123',
      rol: 'alumno',
      matricula: '2024001'
    });
    
    res.json({
      success: true,
      message: '✅ Usuario alumno creado exitosamente',
      data: {
        user: {
          id: alumnoUser._id,
          nombre: alumnoUser.nombre,
          email: alumnoUser.email,
          rol: alumnoUser.rol,
          matricula: alumnoUser.matricula
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error creando usuario alumno:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ====================
// MANEJO DE ERRORES
// ====================

// 404 - Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.url}`
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('❌ Error no manejado:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';
  
  res.status(statusCode).json({
    success: false,
    message: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ====================
// INICIAR SERVIDOR
// ====================

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`🎯 Servidor corriendo en http://${HOST}:${PORT}`);
  console.log(`🌐 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: ${mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado'}`);
});

// ====================
// MANEJO DE SHUTDOWN
// ====================

// Manejar cierre graceful
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM recibido. Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    mongoose.connection.close(false, () => {
      console.log('✅ Conexión a MongoDB cerrada');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT recibido. Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    mongoose.connection.close(false, () => {
      console.log('✅ Conexión a MongoDB cerrada');
      process.exit(0);
    });
  });
});

// Manejar errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app; // Para testing