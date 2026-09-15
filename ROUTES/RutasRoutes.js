const express = require('express');
const router = express.Router();
const rutasController = require('../CONTROLLERS/RutasController');
const verificarToken = require('../MIDDLEWARE/authmiddleware');
const authorize = require('../MIDDLEWARE/role.middleware');

router.use(verificarToken);

// Crear ruta: ADMIN y REPARTIDOR
router.post('/', authorize(['ADMIN', 'REPARTIDOR']), rutasController.create);

// Agregar parada a ruta: ADMIN, REPARTIDOR, CLIENTE y COMERCIO (puntos RECOGIDA/ENTREGA)
router.post('/:id/paradas', authorize(['ADMIN', 'REPARTIDOR', 'CLIENTE', 'COMERCIO']), rutasController.addParada);

// Listar rutas: Público (Autenticado)
router.get('/', rutasController.getAll);

// Mis Rutas Frecuentes (Repartidor)
router.get('/mis-rutas', authorize(['REPARTIDOR']), rutasController.getMisRutas);

// Ver detalle ruta
router.get('/:id', rutasController.getById);

// Actualizar ruta
router.put('/:id', authorize(['ADMIN', 'REPARTIDOR']), rutasController.update);

// Eliminar ruta
router.delete('/:id', authorize(['ADMIN', 'REPARTIDOR']), rutasController.delete);

module.exports = router;
