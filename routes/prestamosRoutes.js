// routes/prestamosRoutes.js - VERSIÓN ACTUALIZADA CON SISTEMA DE APROBACIÓN
const express = require('express');
const router = express.Router();
const prestamosController = require('../controllers/prestamosController');
const { auth, adminOnly } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.get('/mis-prestamos', auth, prestamosController.getMisPrestamos);
router.post('/', auth, prestamosController.crearPrestamo);
router.patch('/:id/cancelar', auth, prestamosController.cancelarPrestamo);

// Rutas solo para admin
router.get('/', auth, adminOnly, prestamosController.getPrestamos);
router.patch('/:id/aprobar', auth, adminOnly, prestamosController.aprobarPrestamo);
router.patch('/:id/rechazar', auth, adminOnly, prestamosController.rechazarPrestamo);
router.patch('/:id/devolver', auth, adminOnly, prestamosController.devolverPrestamo);

module.exports = router;
