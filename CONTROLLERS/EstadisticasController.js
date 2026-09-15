const estadisticasService = require('../SERVICES/EstadisticasService');

class EstadisticasController {
    async getGanancias(req, res) {
        try {
            const { id, rol } = req.user;
            const { periodo } = req.query; // diario, mensual, anual

            // Si es admin, puede ver estadísticas globales
            if (rol.includes('ADMIN')) {
                if (!periodo) {
                    const hoy = await estadisticasService.obtenerGananciasRepartidor(null, 'diario', true);
                    const esteMes = await estadisticasService.obtenerGananciasRepartidor(null, 'mensual', true);
                    // 'semana' is simulated or uses 'mensual' as fallback if service doesn't specifically handle 'semanal' 
                    const estaSemana = await estadisticasService.obtenerGananciasRepartidor(null, 'semanal', true).catch(() => ({ total: 0 }));

                    return res.json({
                        hoy: hoy.total || 0,
                        estaSemana: estaSemana.total || 0,
                        esteMes: esteMes.total || 0
                    });
                }
                const data = await estadisticasService.obtenerGananciasRepartidor(id, periodo, true);
                return res.json(data);
            }

            // Si es repartidor, ver sus ganancias
            if (rol.includes('REPARTIDOR')) {
                if (!periodo) {
                    const hoy = await estadisticasService.obtenerGananciasRepartidor(id, 'diario', false);
                    const esteMes = await estadisticasService.obtenerGananciasRepartidor(id, 'mensual', false);
                    const estaSemana = await estadisticasService.obtenerGananciasRepartidor(id, 'semanal', false).catch(() => ({ total: 0 }));

                    return res.json({
                        hoy: hoy.total || 0,
                        estaSemana: estaSemana.total || 0,
                        esteMes: esteMes.total || 0
                    });
                }
                const data = await estadisticasService.obtenerGananciasRepartidor(id, periodo, false);
                return res.json(data);
            }

            // Si es cliente/comercio, ver sus gastos
            if (rol.includes('CLIENTE') || rol.includes('COMERCIO')) {
                if (!periodo) {
                    const hoy = await estadisticasService.obtenerGastosCliente(id, 'diario', false);
                    const esteMes = await estadisticasService.obtenerGastosCliente(id, 'mensual', false);
                    const estaSemana = await estadisticasService.obtenerGastosCliente(id, 'semanal', false).catch(() => ({ total: 0 }));

                    return res.json({
                        hoy: hoy.total || 0,
                        estaSemana: estaSemana.total || 0,
                        esteMes: esteMes.total || 0
                    });
                }
                const data = await estadisticasService.obtenerGastosCliente(id, periodo, false);
                return res.json(data);
            }

            return res.status(403).json({ message: "No tienes permiso para ver estadísticas" });
        } catch (error) {
            console.error("Error en getGanancias:", error);
            res.status(500).json({ message: "Error al obtener estadísticas" });
        }
    }

    async getIngresosGlobales(req, res) {
        try {
            const { rol } = req.user;
            const { periodo } = req.query;

            if (!rol.includes('ADMIN')) {
                return res.status(403).json({ message: "No tienes permiso para ver ingresos globales" });
            }

            const data = await estadisticasService.obtenerIngresosPlataforma(periodo);
            res.json(data);
        } catch (error) {
            console.error("Error en getIngresosGlobales:", error);
            res.status(500).json({ message: "Error al obtener ingresos globales" });
        }
    }

    async getResumenPedidos(req, res) {
        try {
            const { id, rol } = req.user;
            const { periodo } = req.query;

            // Si se pasa periodo, devolvemos historial para gráficas
            const isGlobal = rol.includes('ADMIN');
            if (periodo) {
                const data = await estadisticasService.obtenerHistorialPedidos(id, rol, periodo, isGlobal);
                return res.json(data);
            }

            // Si no, devolvemos el resumen simple
            const data = await estadisticasService.obtenerResumenPedidos(id, rol, isGlobal);
            res.json(data);
        } catch (error) {
            console.error("Error en getResumenPedidos:", error);
            res.status(500).json({ message: "Error al obtener resumen de pedidos" });
        }
    }

    async getMejoresRutas(req, res) {
        try {
            const { id, rol } = req.user;
            const isGlobal = rol.includes('ADMIN');

            if (!rol.includes('REPARTIDOR') && !rol.includes('ADMIN')) {
                return res.status(403).json({ message: "No tienes permiso para ver mejores rutas" });
            }

            const data = await estadisticasService.obtenerMejoresRutas(id, 5, isGlobal);
            res.json(data);
        } catch (error) {
            console.error("Error en getMejoresRutas:", error);
            res.status(500).json({ message: "Error al obtener mejores rutas" });
        }
    }

    async getOnlineTime(req, res) {
        try {
            const { id } = req.user;
            const { periodo } = req.query; // diario, mensual, anual

            const data = await estadisticasService.obtenerTiempoEnLinea(id, periodo);
            res.json(data);
        } catch (error) {
            console.error("Error en getOnlineTime:", error);
            res.status(500).json({ message: "Error al obtener tiempo en línea" });
        }
    }
}

module.exports = new EstadisticasController();
