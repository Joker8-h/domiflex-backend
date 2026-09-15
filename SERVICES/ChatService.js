const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
});
const notificacionesService = require("./NotificacionesService");

const chatService = {

    async initConversacion(data) {
        const existente = await prisma.conversaciones.findFirst({
            where: {
                idPedido: parseInt(data.idPedido),
                idCliente: parseInt(data.idCliente),
                idRepartidor: parseInt(data.idRepartidor)
            }
        });

        if (existente) return existente;

        return await prisma.conversaciones.create({
            data: {
                idPedido: parseInt(data.idPedido),
                idCliente: parseInt(data.idCliente),
                idRepartidor: parseInt(data.idRepartidor),
                estado: 'ACTIVA'
            }
        });
    },

    async enviarMensaje(data) {
        const mensaje = await prisma.mensajes.create({
            data: {
                idConversacion: parseInt(data.idConversacion),
                idRemitente: parseInt(data.idRemitente),
                mensaje: data.mensaje,
                tipo: data.tipo || 'TEXTO'
            }
        });

        // NOTIFICACIÓN AUTOMÁTICA
        try {
            const conversacion = await prisma.conversaciones.findUnique({
                where: { idConversacion: parseInt(data.idConversacion) }
            });

            // El destinatario es quien NO envió el mensaje
            const idDestinatario = conversacion.idCliente === parseInt(data.idRemitente)
                ? conversacion.idRepartidor
                : conversacion.idCliente;

            const remitente = await prisma.usuarios.findUnique({
                where: { idUsuarios: parseInt(data.idRemitente) }
            });

            await notificacionesService.crearNotificacion({
                idUsuario: idDestinatario,
                titulo: "Nuevo Mensaje",
                mensaje: `Tienes un nuevo mensaje de ${remitente.nombre}: "${data.mensaje.substring(0, 30)}${data.mensaje.length > 30 ? '...' : ''}"`,
                tipo: "MENSAJE"
            });
        } catch (notifError) {
            console.error("Error al crear notificación de mensaje:", notifError.message);
        }

        return mensaje;
    },

    async getConversacionesUsuario(idUsuario) {
        // Buscar conversaciones donde el usuario es cliente O repartidor
        return await prisma.conversaciones.findMany({
            where: {
                OR: [
                    { idCliente: idUsuario },
                    { idRepartidor: idUsuario }
                ]
            },
            include: {
                pedido: { select: { idPedido: true, creadoEn: true } },
                cliente: { select: { nombre: true, email: true } },
                repartidor: { select: { nombre: true, email: true } },
                mensajes: {
                    take: 1,
                    orderBy: { fechaEnvio: 'desc' }
                }
            }
        });
    },

    async getMensajes(idConversacion) {
        return await prisma.mensajes.findMany({
            where: { idConversacion: parseInt(idConversacion) },
            orderBy: { fechaEnvio: 'asc' }
        });
    },

    async getConversacionById(id) {
        return await prisma.conversaciones.findUnique({
            where: { idConversacion: parseInt(id) },
            include: {
                pedido: { select: { idPedido: true, creadoEn: true, ruta: true } },
                cliente: { select: { nombre: true, email: true, fotoPerfil: true } },
                repartidor: { select: { nombre: true, email: true, fotoPerfil: true } },
                mensajes: {
                    orderBy: { fechaEnvio: 'asc' }
                }
            }
        });
    }
};

module.exports = chatService;
