const prisma = require("../lib/prisma");

const iaRutasLogService = {
    // Crear un nuevo log
    async createLog(data) {
        return await prisma.iaRutasLog.create({
            data: {
                idRuta: parseInt(data.idRuta),
                prompt: data.prompt,
                parametrosJson: data.parametrosJson || null,
                modeloIa: data.modeloIa || null
            }
        });
    },

    // Obtener todos los logs de una ruta
    async getLogsByRuta(idRuta) {
        return await prisma.iaRutasLog.findMany({
            where: { idRuta: parseInt(idRuta) },
            orderBy: { fechaGeneracion: 'desc' },
            include: {
                ruta: {
                    select: {
                        idRuta: true,
                        nombre: true,
                        descripcion: true
                    }
                }
            }
        });
    },

    // Obtener un log por ID
    async getLogById(id) {
        return await prisma.iaRutasLog.findUnique({
            where: { id: parseInt(id) },
            include: {
                ruta: {
                    select: {
                        idRuta: true,
                        nombre: true,
                        descripcion: true,
                        estado: true
                    }
                }
            }
        });
    },

    // Obtener todos los logs
    async getAllLogs(limit = 100) {
        return await prisma.iaRutasLog.findMany({
            take: limit,
            orderBy: { fechaGeneracion: 'desc' },
            include: {
                ruta: {
                    select: {
                        idRuta: true,
                        nombre: true
                    }
                }
            }
        });
    },

    // Obtener logs por modelo de IA
    async getLogsByModelo(modeloIa) {
        return await prisma.iaRutasLog.findMany({
            where: { modeloIa: modeloIa },
            orderBy: { fechaGeneracion: 'desc' },
            include: {
                ruta: {
                    select: {
                        idRuta: true,
                        nombre: true
                    }
                }
            }
        });
    },

    // Obtener estadísticas de uso de IA
    async getEstadisticas() {
        const totalLogs = await prisma.iaRutasLog.count();

        const porModelo = await prisma.iaRutasLog.groupBy({
            by: ['modeloIa'],
            _count: {
                modeloIa: true
            }
        });

        const rutasMasGeneradas = await prisma.iaRutasLog.groupBy({
            by: ['idRuta'],
            _count: {
                idRuta: true
            },
            orderBy: {
                _count: {
                    idRuta: 'desc'
                }
            },
            take: 10
        });

        return {
            totalGeneraciones: totalLogs,
            porModelo: porModelo,
            rutasMasGeneradas: rutasMasGeneradas
        };
    },

    // Eliminar logs antiguos (limpieza)
    async limpiarLogsAntiguos(diasAntiguos = 90) {
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() - diasAntiguos);

        return await prisma.iaRutasLog.deleteMany({
            where: {
                fechaGeneracion: {
                    lt: fechaLimite
                }
            }
        });
    }
};

module.exports = iaRutasLogService;
