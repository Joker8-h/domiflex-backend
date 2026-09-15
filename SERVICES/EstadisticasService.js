const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class EstadisticasService {
    /**
     * Obtener ganancias de un repartidor por periodo (diario, mensual, anual)
     * Si idUsuario es 'GLOBAL' y el rol permite, obtiene de toda la plataforma
     */
    async obtenerGananciasRepartidor(idUsuario, periodo = 'mensual', isGlobal = false) {
        const ahora = new Date();
        let fechaInicio;

        if (periodo === 'diario') {
            fechaInicio = new Date(ahora.setHours(0, 0, 0, 0));
        } else if (periodo === 'mensual') {
            fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        } else if (periodo === 'anual') {
            fechaInicio = new Date(ahora.getFullYear(), 0, 1);
        }

        // Buscamos Pagos reales que los clientes hicieron para pedidos de este repartidor
        let whereClause = {
            estado: { in: ['PAGADO', 'CONFIRMADO_REPARTIDOR', 'CONFIRMADO_CLIENTE', 'COMPLETADO'] }
        };

        if (fechaInicio) {
            whereClause.fechaPago = { gte: fechaInicio };
        }

        if (!isGlobal && idUsuario) {
            whereClause.pedido = {
                idRepartidor: idUsuario
            };
        }

        const pagosRegistrados = await prisma.pagos.findMany({
            where: whereClause,
            select: {
                monto: true,
                fechaPago: true
            }
        });

        const factor = isGlobal ? 1 : 0.9;
        const pagosCalculados = pagosRegistrados.map(p => ({
            ...p,
            gananciaNeta: Number(p.monto || 0) * factor,
            // Guardamos la fecha original para que la agrupación funcione correctamente
            fechaAgrupacion: p.fechaPago
        }));

        const totalGanancias = pagosCalculados.reduce((acc, curr) => acc + curr.gananciaNeta, 0);

        // Agrupar por subperiodo para las gráficas usando la nueva estructura
        const historial = this.agruparDatosPorPeriodo(pagosCalculados, periodo, 'gananciaNeta', 'fechaAgrupacion');

        return {
            total: totalGanancias,
            periodo,
            historial
        };
    }

    /**
     * Helper para agrupar datos (ganancias o gastos) por periodo
     */
    agruparDatosPorPeriodo(items, periodo, campoValor) {
        const grupos = {};

        items.forEach(item => {
            let key;
            const fecha = new Date(item.creadoEn || item.fechaPago || new Date());
            if (periodo === 'diario') {
                key = `${fecha.getHours()}:00`;
            } else if (periodo === 'mensual') {
                key = `Día ${fecha.getDate()}`;
            } else if (periodo === 'anual') {
                const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                key = meses[fecha.getMonth()];
            }

            grupos[key] = (grupos[key] || 0) + Number(item[campoValor] || 0);
        });

        return Object.entries(grupos).map(([name, value]) => ({
            name,
            value: Number(value.toFixed(2))
        }));
    }

    /**
     * Obtener gastos de un cliente o ingresos globales por periodo
     */
    async obtenerGastosCliente(idUsuario, periodo = 'mensual', isGlobal = false) {
        const ahora = new Date();
        let fechaInicio;

        if (periodo === 'diario') {
            fechaInicio = new Date(ahora.setHours(0, 0, 0, 0));
        } else if (periodo === 'mensual') {
            fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        } else if (periodo === 'anual') {
            fechaInicio = new Date(ahora.getFullYear(), 0, 1);
        }

        let whereClause = {
            estado: 'PAGADO',
            fechaPago: { gte: fechaInicio }
        };

        if (!isGlobal) {
            whereClause.idUsuario = idUsuario;
        }

        // Buscamos en la tabla Pagos
        const pagos = await prisma.pagos.findMany({
            where: whereClause,
            select: {
                monto: true,
                fechaPago: true
            }
        });

        const total = pagos.reduce((acc, curr) => acc + Number(curr.monto || 0), 0);
        const historial = this.agruparDatosPorPeriodo(pagos, periodo, 'monto');

        return {
            total,
            periodo,
            historial
        };
    }

    /**
     * Obtener ingresos globales de la plataforma a partir de las comisiones aprobadas de los repartidores
     */
    async obtenerIngresosPlataforma(periodo = 'mensual') {
        const ahora = new Date();
        let fechaInicio;

        if (periodo === 'diario') {
            fechaInicio = new Date(ahora.setHours(0, 0, 0, 0));
        } else if (periodo === 'mensual') {
            fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        } else if (periodo === 'anual') {
            fechaInicio = new Date(ahora.getFullYear(), 0, 1);
        }

        const reportes = await prisma.reportesPago.findMany({
            where: {
                estado: 'APROBADO',
                fechaRevision: { gte: fechaInicio }
            },
            select: {
                montoComision: true,
                fechaRevision: true
            }
        });

        const total = reportes.reduce((acc, curr) => acc + Number(curr.montoComision || 0), 0);
        
        // Agrupar por periodo
        const grupos = {};
        reportes.forEach(item => {
            let key;
            const fecha = new Date(item.fechaRevision || new Date());
            if (periodo === 'diario') {
                key = `${fecha.getHours()}:00`;
            } else if (periodo === 'mensual') {
                key = `Día ${fecha.getDate()}`;
            } else if (periodo === 'anual') {
                const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                key = meses[fecha.getMonth()];
            }

            grupos[key] = (grupos[key] || 0) + Number(item.montoComision || 0);
        });

        const historial = Object.entries(grupos).map(([name, value]) => ({
            name,
            value: Number(value.toFixed(2))
        }));

        return {
            total,
            periodo,
            historial
        };
    }

    /**
     * Obtener resumen de pedidos realizados
     */
    async obtenerResumenPedidos(idUsuario, rol, isGlobal = false) {
        if (isGlobal || rol.includes('ADMIN')) {
            const total = await prisma.pedidos.count({
                where: { estado: 'ENTREGADO' }
            });
            return { total, rol: 'ADMIN' };
        }

        if (rol === 'REPARTIDOR' || rol === 'REPARTIDOR_ADMIN') {
            const total = await prisma.pedidos.count({
                where: {
                    vehiculo: {
                        idUsuario: idUsuario
                    },
                    estado: 'ENTREGADO'
                }
            });
            return { total, rol: 'REPARTIDOR' };
        } else {
            const total = await prisma.pedidos.count({
                where: {
                    idCliente: idUsuario,
                    estado: 'ENTREGADO'
                }
            });
            return { total, rol: 'CLIENTE' };
        }
    }

    /**
     * Obtener historial de pedidos por periodo para gráficas de frecuencia
     */
    async obtenerHistorialPedidos(idUsuario, rol, periodo = 'mensual', isGlobal = false) {
        const ahora = new Date();
        let fechaInicio;

        if (periodo === 'diario') {
            fechaInicio = new Date(ahora.setHours(0, 0, 0, 0));
        } else if (periodo === 'mensual') {
            fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        } else if (periodo === 'anual') {
            fechaInicio = new Date(ahora.getFullYear(), 0, 1);
        }

        let pedidos;
        if (isGlobal || rol.includes('ADMIN')) {
            pedidos = await prisma.pedidos.findMany({
                where: {
                    estado: 'ENTREGADO',
                    creadoEn: { gte: fechaInicio }
                },
                select: { creadoEn: true }
            });
        } else if (rol === 'REPARTIDOR' || rol === 'REPARTIDOR_ADMIN') {
            pedidos = await prisma.pedidos.findMany({
                where: {
                    vehiculo: { idUsuario: idUsuario },
                    estado: 'ENTREGADO',
                    creadoEn: { gte: fechaInicio }
                },
                select: { creadoEn: true }
            });
        } else {
            pedidos = await prisma.pedidos.findMany({
                where: {
                    idCliente: idUsuario,
                    estado: 'ENTREGADO',
                    creadoEn: { gte: fechaInicio }
                },
                select: { creadoEn: true }
            });
        }

        const grupos = {};
        pedidos.forEach(v => {
            let key;
            const fecha = new Date(v.creadoEn);
            if (periodo === 'diario') key = `${fecha.getHours()}:00`;
            else if (periodo === 'mensual') key = `Día ${fecha.getDate()}`;
            else if (periodo === 'anual') {
                const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                key = meses[fecha.getMonth()];
            }
            grupos[key] = (grupos[key] || 0) + 1;
        });

        const historial = Object.entries(grupos).map(([name, value]) => ({ name, value }));

        return {
            total: pedidos.length,
            periodo,
            historial
        };
    }

    /**
     * Obtener mejores rutas (más frecuentes)
     */
    async obtenerMejoresRutas(idUsuario, limit = 5, isGlobal = false) {
        let whereClause = { estado: 'ENTREGADO' };
        if (!isGlobal) {
            whereClause.idRepartidor = idUsuario;
        }

        const pedidos = await prisma.pedidos.findMany({
            where: whereClause,
            include: {
                ruta: true
            }
        });

        const conteoRutas = {};
        pedidos.forEach(v => {
            const nombreRuta = v.ruta?.nombre || `Ruta ${v.idRuta}`;
            conteoRutas[nombreRuta] = (conteoRutas[nombreRuta] || 0) + 1;
        });

        return Object.entries(conteoRutas)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    /**
     * Obtener tiempo en línea
     */
    async obtenerTiempoEnLinea(idUsuario, periodo = 'mensual') {
        const ahora = new Date();
        let fechaInicio;

        if (periodo === 'diario') {
            fechaInicio = new Date(ahora.setHours(0, 0, 0, 0));
        } else if (periodo === 'mensual') {
            fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        } else if (periodo === 'anual') {
            fechaInicio = new Date(ahora.getFullYear(), 0, 1);
        }

        const sesiones = await prisma.sesionesUsuario.findMany({
            where: {
                idUsuario: idUsuario,
                inicio: {
                    gte: fechaInicio
                },
                fin: {
                    not: null
                }
            },
            select: {
                duracionSegundos: true,
                inicio: true
            }
        });

        const totalSegundos = sesiones.reduce((acc, curr) => acc + (curr.duracionSegundos || 0), 0);
        const horas = (totalSegundos / 3600).toFixed(2);

        // Agrupar por subperiodo
        const historial = this.agruparSesionesPorPeriodo(sesiones, periodo);

        return {
            totalHoras: horas,
            historial
        };
    }

    agruparSesionesPorPeriodo(sesiones, periodo) {
        const grupos = {};

        sesiones.forEach(s => {
            let key;
            const fecha = new Date(s.inicio);
            if (periodo === 'diario') {
                key = `${fecha.getHours()}:00`;
            } else if (periodo === 'mensual') {
                key = `Día ${fecha.getDate()}`;
            } else if (periodo === 'anual') {
                const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                key = meses[fecha.getMonth()];
            }

            grupos[key] = (grupos[key] || 0) + (s.duracionSegundos || 0) / 3600;
        });

        return Object.entries(grupos).map(([name, value]) => ({
            name,
            value: Number(value.toFixed(2))
        }));
    }
}

module.exports = new EstadisticasService();
