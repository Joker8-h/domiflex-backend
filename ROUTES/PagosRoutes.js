const express = require('express');
const router = express.Router();
const pagosController = require('../CONTROLLERS/PagosController');
const verificarToken = require('../MIDDLEWARE/authmiddleware');

router.use(verificarToken);

router.post('/wompi/checkout', pagosController.checkoutWompi);
router.post('/', pagosController.create);
router.get('/', pagosController.getMyPagos);
router.get('/pedido/:idPedido', pagosController.getByPedido);
router.get('/pedido/:idPedido/usuario/:idUsuario', pagosController.getByPedidoAndUser);
router.put('/confirmarCliente/:id', pagosController.confirmarCliente);
router.put('/confirmarRepartidor/:id', pagosController.confirmarRepartidor);
router.get('/:id', pagosController.getById);
router.patch('/:id/confirmacion', pagosController.updateConfirmacion);

module.exports = router;
