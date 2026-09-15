const express = require('express');
const router = express.Router();
const calificacionesController = require('../CONTROLLERS/CalificacionesController');
const verificarToken = require('../MIDDLEWARE/authmiddleware');

router.use(verificarToken);

router.post('/', calificacionesController.create);
router.get('/top-repartidores', calificacionesController.getTopRepartidores);
router.get('/top-clientes', calificacionesController.getTopClientes);
router.get('/:idUsuario/promedio', calificacionesController.getPromedio);
router.get('/:id', calificacionesController.getById);

module.exports = router;
