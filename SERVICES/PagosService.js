const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
});
const notificacionesService = require("./NotificacionesService");

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

    async getByPedido(idPedido) {
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

    async updateConfirmacion(idPago, confirmacion) {
        // confirmacion: { confirmacionCliente: true } o { confirmacionRepartidor: true }
        return await prisma.pagos.update({
            where: { idPago: parseInt(idPago) },
            data: confirmacion
        });
    },

    async confirmarCliente(idPago) {
        const pago = await prisma.pagos.findUnique({ where: { idPago: parseInt(idPago) } });
        if (!pago) throw new Error("Pago no encontrado");

        const nuevoEstado = pago.confirmacionRepartidor ? 'COMPLETADO' : 'CONFIRMADO_CLIENTE';

        return await prisma.pagos.update({
            where: { idPago: parseInt(idPago) },
            data: {
                confirmacionCliente: true,
                estado: nuevoEstado
            }
        });
    },

    async confirmarRepartidor(idPago) {
        const pago = await prisma.pagos.findUnique({ where: { idPago: parseInt(idPago) } });
        if (!pago) throw new Error("Pago no encontrado");
        if (!pago.confirmacionCliente) {
            const error = new Error("El cliente aún no ha confirmado el pago");
            error.code = 400;
            throw error;
        }
        return await prisma.pagos.update({
            where: { idPago: parseInt(idPago) },
            data: {
                confirmacionRepartidor: true,
                estado: 'COMPLETADO'
            }
        });
    }
};

module.exports = pagosService;
