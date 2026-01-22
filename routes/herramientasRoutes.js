// routes/herramientasRoutes.js
const express = require('express');
const router = express.Router();
const herramientasController = require('../controllers/herramientasController');
const { auth, adminOnly } = require('../middleware/auth');

// Rutas públicas (solo lectura)
router.get('/', herramientasController.getHerramientas);
router.get('/:id', herramientasController.getHerramientaById);

// Rutas protegidas (solo admin)
router.post('/', auth, adminOnly, herramientasController.crearHerramienta);
router.put('/:id', auth, adminOnly, herramientasController.actualizarHerramienta);
router.delete('/:id', auth, adminOnly, herramientasController.eliminarHerramienta);
router.patch('/:id/stock', auth, adminOnly, herramientasController.gestionarStock);

module.exports = router;

