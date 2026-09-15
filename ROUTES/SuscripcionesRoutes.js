const express = require('express');
const router = express.Router();
const suscripcionesController = require('../CONTROLLERS/SuscripcionesController');
const verificarToken = require('../MIDDLEWARE/authmiddleware');
const authorize = require('../MIDDLEWARE/role.middleware');

router.use(verificarToken);

// Crear Plan: Solo Admin
router.post('/planes', authorize(['ADMIN']), suscripcionesController.createPlan);

// Ver planes: Público (o autenticado)
router.get('/planes', suscripcionesController.getPlanes);

// Suscribirse: Repartidor
// NOTA: SERVICES/SuscripcionesService.js aún no estaba migrado por el otro agente
// al momento de este cambio (usaba el modelo antiguo de planes/suscripciones y
// otro nombre para maxPedidos).
// El controller mantiene los nombres de métodos (createPlan/getPlanes/suscribirse/
// getMiSuscripcion/getById) y el otro agente debe exponerlos contra
// PlanesRepartidor/SuscripcionesRepartidor con maxPedidos.
router.post('/suscribirse', authorize(['REPARTIDOR']), suscripcionesController.suscribirse);

// Ver mi suscripción
router.get('/mi-suscripcion', authorize(['REPARTIDOR']), suscripcionesController.getMiSuscripcion);

// Ver detalle de una suscripción
router.get('/:id', authorize(['REPARTIDOR', 'ADMIN']), suscripcionesController.getById);

module.exports = router;
