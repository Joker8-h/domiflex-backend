const express = require('express');
const router = express.Router();
const vehiculosController = require('../CONTROLLERS/VehiculosController');
const verificarToken = require('../MIDDLEWARE/authmiddleware');
const authorize = require('../MIDDLEWARE/role.middleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Crear vehículo: Solo Repartidores y Admin (tipos: MOTO/BICICLETA/CARRO/FURGON)
router.post('/', authorize(['REPARTIDOR', 'ADMIN']), vehiculosController.create);

// Ver mis vehículos: Solo Repartidores
router.get('/mis-vehiculos', authorize(['REPARTIDOR']), vehiculosController.getMyVehiculos);

// Ver todos los vehículos: Solo Admin
router.get('/', authorize(['ADMIN']), vehiculosController.getAll);

// Ver detalle vehículo: Admin y Repartidor
router.get('/:id', authorize(['REPARTIDOR', 'ADMIN']), vehiculosController.getById);

// Eliminar vehículo
router.delete('/:id', authorize(['REPARTIDOR', 'ADMIN']), vehiculosController.delete);

// Activar/Desactivar vehículo
router.patch('/:id/estado', authorize(['REPARTIDOR', 'ADMIN']), vehiculosController.cambiarEstado);

// Validar placa (Admin)
router.patch('/:id/validar-placa', authorize(['ADMIN']), vehiculosController.validarPlacaAdmin);

// Extraer placa de foto (Solo repartidores y Admin)
router.post('/extraer-placa', authorize(['REPARTIDOR', 'ADMIN']), vehiculosController.extraerPlaca);

// --- FLUJO DE APROBACIÓN DE CAMBIOS ---

// Solicitar cambio de vehículo: Solo Repartidores
router.post('/:id/solicitar-cambio', authorize(['REPARTIDOR']), vehiculosController.solicitarCambio);

// Ver solicitudes de cambio: Solo Admin
router.get('/solicitudes/pendientes', authorize(['ADMIN']), vehiculosController.getSolicitudesCambio);

// Ver conteo de solicitudes pendientes: Solo Admin
router.get('/solicitudes/pendientes/count', authorize(['ADMIN']), vehiculosController.getSolicitudesPendientesCount);

// Procesar solicitud de cambio: Solo Admin
router.patch('/solicitudes/:id/procesar', authorize(['ADMIN']), vehiculosController.procesarSolicitud);

module.exports = router;
