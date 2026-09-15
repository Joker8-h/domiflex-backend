const express = require('express');
const router = express.Router();
const planesRepartidorController = require('../CONTROLLERS/PlanesRepartidorController');
const verificarToken = require('../MIDDLEWARE/authmiddleware');
const authorize = require('../MIDDLEWARE/role.middleware');

// Rutas públicas (sin autenticación - para mostrar planes disponibles)
router.get('/activos', planesRepartidorController.getActivos);
router.get('/:id', planesRepartidorController.getById);

// Rutas protegidas (requieren autenticación)
router.use(verificarToken);

// Rutas de administración (solo ADMIN)
router.get('/', authorize(['ADMIN']), planesRepartidorController.getAll);
router.post('/', authorize(['ADMIN']), planesRepartidorController.create);
router.put('/:id', authorize(['ADMIN']), planesRepartidorController.update);
router.delete('/:id', authorize(['ADMIN']), planesRepartidorController.delete);

module.exports = router;
