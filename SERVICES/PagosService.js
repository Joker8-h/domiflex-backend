const prisma = require("../lib/prisma");
const notificacionesService = require("./NotificacionesService");

function rolDe(user) {
    const raw = user?.rol?.nombre || user?.rol;
    return String(raw || "").toUpperCase();
}

function denegar(mensaje, status = 403) {
    const error = new Error(mensaje);
    error.status = status;
    throw error;
}

const pagosService = {
    async create(data) {
        const pago = await prisma.pagos.create({
            data: {
                idUsuario: parseInt(data.idUsuario),
                idPedido: parseInt(data.idPedido),
                monto: data.monto,
                tipoPago: data.tipoPago, // PEDIDO, PLAN_REPARTIDOR
                estado: data.estado || 'PENDIENTE',
                confirmacionCliente: data.confirmacionCliente || false,
                confirmacionRepartidor: data.confirmacionRepartidor || false,
                fechaPago: new Date()
            }
        });

        // NOTIFICACIÓN AUTOMÁTICA
        try {
            await notificacionesService.crearNotificacion({
                idUsuario: parseInt(data.idUsuario),
                titulo: "Pago Registrado",
                mensaje: `Tu pago de $${data.monto} por concepto de ${data.tipoPago} ha sido registrado exitosamente.`,
                tipo: "PAGO"
            });
        } catch (notifError) {
            console.error("Error al crear notificación de pago:", notifError.message);
        }

        return pago;
    },

    async getByUser(idUsuario) {
        return await prisma.pagos.findMany({
            where: { idUsuario: parseInt(idUsuario) },
            include: { pedido: true }
        });
    },

    async getByPedido(idPedido, user) {
        const pedido = await prisma.pedidos.findUnique({
            where: { idPedido: parseInt(idPedido) },
            select: { idCliente: true, idRepartidor: true, idComercio: true },
        });
        if (!pedido) denegar("Pedido no encontrado", 404);
        const uid = Number(user?.id);
        const rol = rolDe(user);
        const participa = pedido.idCliente === uid || pedido.idRepartidor === uid || pedido.idComercio === uid;
        if (rol !== "ADMIN" && !participa) denegar("No puedes ver este pago.");
        return await prisma.pagos.findMany({
            where: { idPedido: parseInt(idPedido) },
            include: { usuario: { select: { nombre: true, email: true } } }
        });
    },

    async getByPedidoAndUser(idPedido, idUsuario) {
        return await prisma.pagos.findUnique({
            where: {
                idPedido_idUsuario: {
                    idPedido: parseInt(idPedido),
                    idUsuario: parseInt(idUsuario)
                }
            },
            include: { pedido: true }
        });
    },

    async getById(idPago) {
        return await prisma.pagos.findUnique({
            where: { idPago: parseInt(idPago) },
            include: {
                usuario: { select: { nombre: true, email: true } },
                pedido: true
            }
        });
    },

    async pagoConPedido(idPago) {
        const pago = await prisma.pagos.findUnique({
            where: { idPago: parseInt(idPago) },
            include: { pedido: { select: { idCliente: true, idRepartidor: true } } },
        });
        if (!pago) denegar("Pago no encontrado", 404);
        return pago;
    },

    async updateConfirmacion(idPago, confirmacion, user) {
        if (confirmacion?.confirmacionCliente === true && confirmacion?.confirmacionRepartidor === true) {
            denegar("Cliente y repartidor confirman por separado.");
        }
        if (confirmacion?.confirmacionCliente === true) {
            return this.confirmarCliente(idPago, user);
        }
        if (confirmacion?.confirmacionRepartidor === true) {
            return this.confirmarRepartidor(idPago, user);
        }
        denegar("No puedes cambiar la confirmación de este pago.");
    },

    async confirmarCliente(idPago, user) {
        const pago = await this.pagoConPedido(idPago);
        const uid = Number(user?.id);
        if (rolDe(user) !== "ADMIN" && pago.pedido?.idCliente !== uid) {
            denegar("Solo el cliente del pedido puede confirmar este pago.");
        }

        const nuevoEstado = pago.confirmacionRepartidor ? "COMPLETADO" : "CONFIRMADO_CLIENTE";

        const actualizado = await prisma.pagos.update({
            where: { idPago: parseInt(idPago) },
            data: {
                confirmacionCliente: true,
                estado: nuevoEstado
            }
        });

        try {
            const socketService = require("./SocketService");
            socketService.emitPedido(pago.idPedido, "pago_actualizado", actualizado);
            if (pago.pedido?.idRepartidor) {
                socketService.notifyUser(pago.pedido.idRepartidor, "pago_actualizado", actualizado, "Pago Confirmado por Cliente", `El cliente ha confirmado el pago en efectivo del pedido #${pago.idPedido}.`, "PAGO");
            }
        } catch (e) {
            console.error("Error al emitir evento pago_actualizado:", e.message);
        }

        return actualizado;
    },

    async confirmarRepartidor(idPago, user) {
        const pago = await this.pagoConPedido(idPago);
        const uid = Number(user?.id);
        if (rolDe(user) !== "ADMIN" && pago.pedido?.idRepartidor !== uid) {
            denegar("Solo el repartidor asignado puede confirmar este pago.");
        }
        if (!pago.confirmacionCliente) {
            denegar("El cliente aún no ha confirmado el pago", 400);
        }
        const actualizado = await prisma.pagos.update({
            where: { idPago: parseInt(idPago) },
            data: {
                confirmacionRepartidor: true,
                estado: "COMPLETADO"
            }
        });

        try {
            const socketService = require("./SocketService");
            socketService.emitPedido(pago.idPedido, "pago_actualizado", actualizado);
            socketService.emitPedido(pago.idPedido, "pago_completado", actualizado);
            if (pago.pedido?.idCliente) {
                socketService.notifyUser(pago.pedido.idCliente, "pago_completado", actualizado, "Pago en Efectivo Completado", `El domiciliario ha confirmado la recepción del dinero del pedido #${pago.idPedido}.`, "PAGO");
            }
        } catch (e) {
            console.error("Error al emitir evento pago_completado:", e.message);
        }

        return actualizado;
    }
};

module.exports = pagosService;
