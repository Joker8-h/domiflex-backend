const prisma = require("../lib/prisma");
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

    async getConversacionByPedido(idPedido, userId) {
        const pid = parseInt(idPedido);
        const pedido = await prisma.pedidos.findUnique({
            where: { idPedido: pid },
            select: { idCliente: true, idRepartidor: true }
        });
        if (!pedido) throw new Error("Pedido no encontrado");
        if (!pedido.idRepartidor) return null;

        let conv = await prisma.conversaciones.findFirst({
            where: { idPedido: pid },
            include: {
                cliente: { select: { idUsuarios: true, nombre: true, fotoPerfil: true } },
                repartidor: { select: { idUsuarios: true, nombre: true, fotoPerfil: true } },
                mensajes: {
                    orderBy: { fechaEnvio: 'asc' },
                    include: { remitente: { select: { idUsuarios: true, nombre: true } } }
                }
            }
        });

        if (!conv) {
            conv = await prisma.conversaciones.create({
                data: {
                    idPedido: pid,
                    idCliente: pedido.idCliente,
                    idRepartidor: pedido.idRepartidor,
                    estado: 'ACTIVA'
                },
                include: {
                    cliente: { select: { idUsuarios: true, nombre: true, fotoPerfil: true } },
                    repartidor: { select: { idUsuarios: true, nombre: true, fotoPerfil: true } },
                    mensajes: true
                }
            });
        }
        return conv;
    },

    async enviarMensaje(data) {
        let idConversacion = data.idConversacion ? parseInt(data.idConversacion) : null;
        let idPedido = data.idPedido ? parseInt(data.idPedido) : null;

        if (!idConversacion && idPedido) {
            const conv = await this.getConversacionByPedido(idPedido, data.idRemitente);
            if (conv) idConversacion = conv.idConversacion;
            else throw new Error("Aún no hay repartidor asignado para este pedido.");
        }

        if (!idConversacion) throw new Error("Se requiere idConversacion o idPedido.");

        const mensaje = await prisma.mensajes.create({
            data: {
                idConversacion,
                idRemitente: parseInt(data.idRemitente),
                mensaje: data.mensaje,
                tipo: data.tipo || 'TEXTO'
            },
            include: {
                remitente: { select: { idUsuarios: true, nombre: true } }
            }
        });

        // NOTIFICACIÓN AUTOMÁTICA Y EMISIÓN WEBSOCKET
        try {
            const conversacion = await prisma.conversaciones.findUnique({
                where: { idConversacion }
            });

            if (conversacion) {
                const idDestinatario = conversacion.idCliente === parseInt(data.idRemitente)
                    ? conversacion.idRepartidor
                    : conversacion.idCliente;

                const remitente = mensaje.remitente || await prisma.usuarios.findUnique({
                    where: { idUsuarios: parseInt(data.idRemitente) }
                });

                const socketService = require("./SocketService");
                if (conversacion.idPedido) {
                    socketService.emitPedido(conversacion.idPedido, "nuevo_mensaje", mensaje);
                }
                if (idDestinatario) {
                    socketService.notifyUser(
                        idDestinatario,
                        "nuevo_mensaje",
                        mensaje,
                        "Nuevo Mensaje",
                        `Tienes un nuevo mensaje de ${remitente?.nombre || 'Usuario'}: "${data.mensaje.substring(0, 30)}${data.mensaje.length > 30 ? '...' : ''}"`,
                        "MENSAJE"
                    );
                }
            }
        } catch (notifError) {
            console.error("Error al emitir notificación de mensaje:", notifError.message);
        }

        return mensaje;
    },

    async getConversacionesUsuario(idUsuario) {
        return await prisma.conversaciones.findMany({
            where: {
                OR: [
                    { idCliente: parseInt(idUsuario) },
                    { idRepartidor: parseInt(idUsuario) }
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
            include: {
                remitente: { select: { idUsuarios: true, nombre: true } }
            },
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
                    include: { remitente: { select: { idUsuarios: true, nombre: true } } },
                    orderBy: { fechaEnvio: 'asc' }
                }
            }
        });
    }
};

module.exports = chatService;
