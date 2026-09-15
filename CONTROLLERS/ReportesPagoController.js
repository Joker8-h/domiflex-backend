const reportesPagoService = require('../SERVICES/ReportesPagoService');
const EmailService = require('../SERVICES/EmailService');

class ReportesPagoController {
    /**
     * GET /api/reportes-pago/comision
     * Repartidor obtiene su comisión acumulada del mes
     */
    async getComisionAcumulada(req, res) {
        try {
            const { id } = req.user;
            const data = await reportesPagoService.obtenerComisionAcumulada(id);
            res.json(data);
        } catch (error) {
            console.error('Error en getComisionAcumulada:', error);
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * POST /api/reportes-pago
     * Repartidor envía comprobante de pago
     */
    async crearReporte(req, res) {
        try {
            const { id, rol } = req.user;

            if (!rol.includes('REPARTIDOR')) {
                return res.status(403).json({ message: 'Solo los repartidores pueden enviar reportes de pago' });
            }

            const reporte = await reportesPagoService.crearReporte(id, req.body);

            // Capturar la cantidad enviada por el repartidor (si está presente)
            const cantidadEnviada = req.body.cantidad || 'No especificada';

            // Enviar email al admin
            try {
                await EmailService.enviarNotificacionReportePago(
                    reporte.usuario.nombre,
                    reporte.montoComision,
                    reporte.fotoComprobante,
                    cantidadEnviada
                );
            } catch (emailError) {
                console.error('[ReportesPago] Error enviando email:', emailError.message);
            }

            res.status(201).json(reporte);
        } catch (error) {
            console.error('Error en crearReporte:', error);
            res.status(400).json({ message: error.message });
        }
    }

    /**
     * GET /api/reportes-pago
     * Listar reportes (Admin: todos, Repartidor: propios)
     */
    async listarReportes(req, res) {
        try {
            const { id, rol } = req.user;
            const filtros = {
                estado: req.query.estado,
                mes: req.query.mes
            };

            const reportes = await reportesPagoService.obtenerReportes(id, rol, filtros);
            res.json(reportes);
        } catch (error) {
            console.error('Error en listarReportes:', error);
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * PUT /api/reportes-pago/:id/aprobar
     * Admin aprueba reporte
     */
    async aprobarReporte(req, res) {
        try {
            const { rol } = req.user;

            if (!rol.includes('ADMIN')) {
                return res.status(403).json({ message: 'Solo administradores pueden aprobar reportes' });
            }

            const reporte = await reportesPagoService.aprobarReporte(req.params.id);
            res.json({ message: 'Reporte aprobado exitosamente', reporte });
        } catch (error) {
            console.error('Error en aprobarReporte:', error);
            res.status(400).json({ message: error.message });
        }
    }

    /**
     * PUT /api/reportes-pago/:id/rechazar
     * Admin rechaza reporte
     */
    async rechazarReporte(req, res) {
        try {
            const { rol } = req.user;

            if (!rol.includes('ADMIN')) {
                return res.status(403).json({ message: 'Solo administradores pueden rechazar reportes' });
            }

            const reporte = await reportesPagoService.rechazarReporte(req.params.id, req.body.observaciones);
            res.json({ message: 'Reporte rechazado', reporte });
        } catch (error) {
            console.error('Error en rechazarReporte:', error);
            res.status(400).json({ message: error.message });
        }
    }

    /**
     * POST /api/reportes-pago/verificar-mensuales
     * Admin ejecuta verificación mensual de pagos
     */
    async verificarPagosMensuales(req, res) {
        try {
            const { rol } = req.user;

            if (!rol.includes('ADMIN')) {
                return res.status(403).json({ message: 'Solo administradores pueden ejecutar esta acción' });
            }

            const resultado = await reportesPagoService.verificarPagosMensuales();
            res.json(resultado);
        } catch (error) {
            console.error('Error en verificarPagosMensuales:', error);
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * POST /api/reportes-pago/enviar-recordatorios
     * Admin envía recordatorios a repartidores que no han pagado
     */
    async enviarRecordatorios(req, res) {
        try {
            const { rol } = req.user;

            if (!rol.includes('ADMIN')) {
                return res.status(403).json({ message: 'Solo administradores pueden enviar recordatorios' });
            }

            const resultado = await reportesPagoService.enviarRecordatoriosPago();
            res.json({
                message: `Recordatorios enviados a ${resultado.notificados} repartidores. Faltan ${resultado.diasRestantes} días para fin de mes.`,
                ...resultado
            });
        } catch (error) {
            console.error('Error en enviarRecordatorios:', error);
            res.status(500).json({ message: error.message });
        }
    }
}

module.exports = new ReportesPagoController();
