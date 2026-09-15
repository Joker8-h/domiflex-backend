const express = require('express');
const router = express.Router();
const iaRutasLogController = require('../CONTROLLERS/IaRutasLogController');
const verificarToken = require('../MIDDLEWARE/authmiddleware');
const authorize = require('../MIDDLEWARE/role.middleware');

// Rutas públicas (consulta sin autenticación)
router.get('/', iaRutasLogController.getAll);
router.get('/estadisticas', iaRutasLogController.getEstadisticas);
router.get('/modelo/:modelo', iaRutasLogController.getByModelo);
router.get('/ruta/:idRuta', iaRutasLogController.getByRuta);
router.get('/:id', iaRutasLogController.getById);

// Aplicar autenticación al resto de rutas
router.use(verificarToken);

// Ruta para crear logs (ADMIN o sistema automatizado)
router.post('/', authorize(['ADMIN', 'REPARTIDOR']), iaRutasLogController.create);

// Ruta de limpieza (solo ADMIN)
router.delete('/limpiar', authorize(['ADMIN']), iaRutasLogController.limpiarAntiguos);

module.exports = router;
