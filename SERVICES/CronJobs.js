const cron = require('node-cron');
const reportesPagoService = require('./ReportesPagoService');

/**
 * Inicializa las tareas automáticas (cron jobs) del sistema
 */
function initCronJobs() {
    // Recordatorio de pago: se ejecuta todos los días a las 8:00 AM
    // Solo envía si faltan 5 días o menos para fin de mes
    cron.schedule('0 8 * * *', async () => {
        try {
            const ahora = new Date();
            const ultimoDiaMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
            const diasRestantes = ultimoDiaMes.getDate() - ahora.getDate();

            if (diasRestantes <= 5) {
                console.log(`[CRON] Enviando recordatorios de pago (faltan ${diasRestantes} días)...`);
                const resultado = await reportesPagoService.enviarRecordatoriosPago();
                console.log(`[CRON] Recordatorios enviados a ${resultado.notificados} repartidores`);
            }
        } catch (error) {
            console.error('[CRON] Error en recordatorios de pago:', error.message);
        }
    });

    // Verificación mensual: se ejecuta el día 1 de cada mes a las 9:00 AM
    // Suspende repartidores que no pagaron el mes anterior
    cron.schedule('0 9 1 * *', async () => {
        try {
            console.log('[CRON] Ejecutando verificación mensual de pagos...');
            const resultado = await reportesPagoService.verificarPagosMensuales();
            console.log(`[CRON] Verificación completada: ${resultado.suspendidos} suspendidos de ${resultado.verificados} verificados`);
        } catch (error) {
            console.error('[CRON] Error en verificación mensual:', error.message);
        }
    });

    console.log('[CRON] Tareas programadas: recordatorios de pago (diario 8AM) y verificación mensual (1ro de mes 9AM)');
}

module.exports = { initCronJobs };
