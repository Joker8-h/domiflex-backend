const express = require('express');
const router = express.Router();
const documentacionController = require('../CONTROLLERS/DocumentacionController');
const verificarToken = require('../MIDDLEWARE/authmiddleware');
const authorize = require('../MIDDLEWARE/role.middleware');

// Rutas para Repartidor
router.post('/documentacion_subir', verificarToken, authorize(['REPARTIDOR']), documentacionController.upload);
router.get('/documentacion_mis', verificarToken, authorize(['REPARTIDOR', 'ADMIN']), documentacionController.getMyDocs);

// Rutas para Admin (Validación)
router.patch('/documentacion_validate/:id', verificarToken, authorize(['ADMIN']), documentacionController.validate);

// Obtener TODA la documentacion de todos los usuarios (Admin)
router.get('/todos', verificarToken, authorize(['ADMIN']), documentacionController.getAll);

// Ver documentacion de un usuario especifico (Admin)
router.get('/usuario/:idUsuario', verificarToken, authorize(['ADMIN']), documentacionController.getByUserIdAdmin);

// Ver detalle documentacion
router.get('/:id', verificarToken, authorize(['ADMIN']), documentacionController.getById);

module.exports = router;
