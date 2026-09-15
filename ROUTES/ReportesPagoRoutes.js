const express = require('express');
const router = express.Router();
const reportesPagoController = require('../CONTROLLERS/ReportesPagoController');
const authMiddleware = require('../MIDDLEWARE/authmiddleware');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Repartidor: obtener comisión acumulada del mes
router.get('/comision', reportesPagoController.getComisionAcumulada);

// Repartidor: enviar comprobante de pago
router.post('/', reportesPagoController.crearReporte);

// Listar reportes (Admin: todos, Repartidor: propios)
router.get('/', reportesPagoController.listarReportes);

// Admin: aprobar reporte
router.put('/:id/aprobar', reportesPagoController.aprobarReporte);

// Admin: rechazar reporte
router.put('/:id/rechazar', reportesPagoController.rechazarReporte);

// Admin: verificar pagos mensuales (suspender morosos)
router.post('/verificar-mensuales', reportesPagoController.verificarPagosMensuales);

// Admin: enviar recordatorios de pago a repartidores
router.post('/enviar-recordatorios', reportesPagoController.enviarRecordatorios);

module.exports = router;
