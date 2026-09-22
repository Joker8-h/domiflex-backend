const express = require('express');
const router = express.Router();
const pedidosController = require('../CONTROLLERS/PedidosController');
const verificarToken = require('../MIDDLEWARE/authmiddleware');
const authorize = require('../MIDDLEWARE/role.middleware');

router.use(verificarToken);

// Crear pedido: Cliente, Comercio, Admin (la creación vive en PedidosController.crearPedido)
router.post('/', authorize(['CLIENTE', 'COMERCIO', 'ADMIN', 'REPARTIDOR']), pedidosController.crearPedido);

router.post('/cotizar', authorize(['CLIENTE', 'COMERCIO', 'ADMIN', 'REPARTIDOR']), pedidosController.cotizar);

// Buscar pedidos: Público autenticado
router.get('/buscar', pedidosController.search);

// Ver mis pedidos (Repartidor / Cliente / Comercio)
router.get('/mis-pedidos', authorize(['REPARTIDOR', 'CLIENTE', 'COMERCIO', 'ADMIN']), pedidosController.getMisPedidos);

// Asignar repartidor
router.post('/:id/asignar', authorize(['REPARTIDOR', 'ADMIN', 'COMERCIO']), pedidosController.asignar);
router.post('/:id/ubicacion', authorize(['REPARTIDOR']), pedidosController.publicarUbicacion);

// Cambiar estado (ASIGNADO, RECOGIENDO, EN_CAMINO, ENTREGADO)
router.post('/:id/estado', authorize(['REPARTIDOR', 'ADMIN']), pedidosController.cambiarEstado);

// Cancelar pedido
router.post('/:id/cancelar', authorize(['REPARTIDOR', 'CLIENTE', 'COMERCIO', 'ADMIN']), pedidosController.cancelar);

// Estimar precio de entrega
router.get('/:id/estimar-precio', pedidosController.estimarPrecio);

// Estadísticas de pedidos por día (antes de /:id para evitar colisión)
router.get('/dia/:dia', authorize(['ADMIN']), pedidosController.getPedidosPorDia);

// Ver detalle pedido
router.get('/:id', pedidosController.getById);

module.exports = router;
