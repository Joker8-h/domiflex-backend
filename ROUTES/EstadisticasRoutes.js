const express = require('express');
const router = express.Router();
const estadisticasController = require('../CONTROLLERS/EstadisticasController');
const verificarToken = require('../MIDDLEWARE/authmiddleware');

router.use(verificarToken);

router.get('/ganancias', estadisticasController.getGanancias);
router.get('/ingresos', estadisticasController.getIngresosGlobales);
router.get('/pedidos', estadisticasController.getResumenPedidos);
router.get('/rutas', estadisticasController.getMejoresRutas);
router.get('/online-time', estadisticasController.getOnlineTime);

module.exports = router;
