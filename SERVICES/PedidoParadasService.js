const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const pedidoParadasService = {
    // Agregar una parada a un pedido
    async agregarParada(data) {
        const pedido = await prisma.pedidos.findUnique({ where: { idPedido: parseInt(data.idPedido) } });
        if (!pedido) throw new Error("Pedido no encontrado");

        return await prisma.pedidoParadas.create({
            data: {
                idPedido: parseInt(data.idPedido),
                idParada: parseInt(data.idParada),
                orden: parseInt(data.orden ?? 0),
                tipo: data.tipo || "ENTREGA",
                completada: false
            },
            include: { parada: true }
        });
    },

    // Listar paradas de un pedido
    async listarPorPedido(idPedido) {
        return await prisma.pedidoParadas.findMany({
            where: { idPedido: parseInt(idPedido) },
            include: { parada: true },
            orderBy: { orden: "asc" }
        });
    },

    // Obtener una parada específica del pedido
    async getParada(idPedido, idParada) {
        return await prisma.pedidoParadas.findUnique({
            where: {
                idPedido_idParada: {
                    idPedido: parseInt(idPedido),
                    idParada: parseInt(idParada)
                }
            },
            include: { parada: true }
        });
    },

    // Marcar parada como completada / pendiente
    async marcarCompletada(idPedido, idParada, completada = true) {
        const existente = await this.getParada(idPedido, idParada);
        if (!existente) throw new Error("Parada del pedido no encontrada");

        return await prisma.pedidoParadas.update({
            where: {
                idPedido_idParada: {
                    idPedido: parseInt(idPedido),
                    idParada: parseInt(idParada)
                }
            },
            data: { completada: !!completada }
        });
    },

    // Eliminar una parada del pedido
    async eliminarParada(idPedido, idParada) {
        return await prisma.pedidoParadas.delete({
            where: {
                idPedido_idParada: {
                    idPedido: parseInt(idPedido),
                    idParada: parseInt(idParada)
                }
            }
        });
    },

    // Eliminar todas las paradas de un pedido
    async eliminarParadasDePedido(idPedido) {
        return await prisma.pedidoParadas.deleteMany({
            where: { idPedido: parseInt(idPedido) }
        });
    }
};

module.exports = pedidoParadasService;
