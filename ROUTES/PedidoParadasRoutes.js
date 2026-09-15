const express = require('express');
const router = express.Router();
const pedidoParadasController = require('../CONTROLLERS/PedidoParadasController');
const verificarToken = require('../MIDDLEWARE/authmiddleware');
const authorize = require('../MIDDLEWARE/role.middleware');

// Aplicar autenticación a todas las rutas
router.use(verificarToken);

// Rutas de consulta (todos los usuarios autenticados)
router.get('/pedido/:idPedido', pedidoParadasController.getByPedido);
router.get('/:idPedido/:idParada', pedidoParadasController.getParada);

// Rutas para gestionar paradas (repartidores y admin)
router.post('/', authorize(['REPARTIDOR', 'ADMIN']), pedidoParadasController.create);
router.put('/completar', authorize(['REPARTIDOR', 'ADMIN']), pedidoParadasController.completar);
router.delete('/:idPedido/:idParada', authorize(['REPARTIDOR', 'ADMIN']), pedidoParadasController.delete);

module.exports = router;
