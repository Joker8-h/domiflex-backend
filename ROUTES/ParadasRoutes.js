const express = require('express');
const router = express.Router();
const paradasController = require('../CONTROLLERS/ParadasController');
const verificarToken = require('../MIDDLEWARE/authmiddleware');
const authorize = require('../MIDDLEWARE/role.middleware');

// Aplicar autenticación a todas las rutas
router.use(verificarToken);

// Rutas públicas para usuarios autenticados
router.get('/', paradasController.getAll);
router.get('/ruta/:idRuta', paradasController.getByRuta);
router.get('/:id', paradasController.getById);

// Rutas protegidas (repartidores/admin pueden gestionar paradas; clientes/comercios también pueden proponer puntos RECOGIDA/ENTREGA)
router.post('/', authorize(['REPARTIDOR', 'ADMIN', 'CLIENTE', 'COMERCIO']), paradasController.create);
router.put('/:id', authorize(['REPARTIDOR', 'ADMIN', 'CLIENTE', 'COMERCIO']), paradasController.update);
router.delete('/:id', authorize(['REPARTIDOR', 'ADMIN', 'CLIENTE', 'COMERCIO']), paradasController.delete);

module.exports = router;
