// routes/usersRoutes.js
const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { auth, adminOnly } = require('../middleware/auth');

// TODAS las rutas requieren autenticación y ser admin
router.use(auth);  // Aplicar auth a todas las rutas
router.use(adminOnly);  // Aplicar adminOnly a todas las rutas

// Rutas
router.get('/', usersController.getUsers);
router.get('/:id', usersController.getUserById);
router.post('/', usersController.createUser);
router.patch('/:id', usersController.updateUser);
router.patch('/:id/password', usersController.changePassword);
router.delete('/:id', usersController.deleteUser);

module.exports = router;
