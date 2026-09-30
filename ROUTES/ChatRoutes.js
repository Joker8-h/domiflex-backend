const express = require('express');
const router = express.Router();
const chatController = require('../CONTROLLERS/ChatController');
const verificarToken = require('../MIDDLEWARE/authmiddleware');

router.use(verificarToken);

// Iniciar conversacion
router.post('/conversaciones', chatController.init);

// Enviar mensaje
router.post('/mensajes', chatController.enviarMensaje);

// Ver mis conversaciones
router.get('/conversaciones', chatController.getMisConversaciones);

// Ver detalle conversacion
router.get('/conversaciones/:id', chatController.getConversacionById);

// Ver mensajes de una conversacion
router.get('/conversaciones/:id/mensajes', chatController.getMensajes);

// Obtener o inicializar conversacion de un pedido directo
router.get('/pedido/:idPedido', chatController.getConversacionByPedido);

module.exports = router;
