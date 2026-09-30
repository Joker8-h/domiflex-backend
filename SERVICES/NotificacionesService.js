const prisma = require("../lib/prisma");

const notificacionesService = {
    async crearNotificacion(data) {
        return await prisma.notificacion.create({
            data: {
                idUsuario: parseInt(data.idUsuario),
                titulo: data.titulo,
                mensaje: data.mensaje,
                tipo: data.tipo,
                leido: false
            }
        });
    },

    async obtenerNotificacionesUsuario(idUsuario) {
        return await prisma.notificacion.findMany({
            where: { idUsuario: parseInt(idUsuario) },
            orderBy: { fechaCreacion: 'desc' }
        });
    },

    async marcarComoLeida(idNotificacion) {
        return await prisma.notificacion.update({
            where: { idNotificacion: parseInt(idNotificacion) },
            data: { leido: true }
        });
    },

    async marcarTodasComoLeidas(idUsuario) {
        return await prisma.notificacion.updateMany({
            where: {
                idUsuario: parseInt(idUsuario),
                leido: false
            },
            data: { leido: true }
        });
    },

    async eliminarNotificacion(idNotificacion) {
        return await prisma.notificacion.delete({
            where: { idNotificacion: parseInt(idNotificacion) }
        });
    },

    async obtenerNoLeidasContador(idUsuario) {
        return await prisma.notificacion.count({
            where: {
                idUsuario: parseInt(idUsuario),
                leido: false
            }
        });
    }
};

module.exports = notificacionesService;
