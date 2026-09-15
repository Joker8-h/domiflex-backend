const pedidoParadasService = require("../SERVICES/PedidoParadasService");

const pedidoParadasController = {
    // Obtener paradas de un pedido (@@id [idPedido, idParada])
    async getByPedido(req, res) {
        try {
            const { idPedido } = req.params;
            const paradas = await pedidoParadasService.listarPorPedido(idPedido);
            res.json(paradas);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Obtener una parada específica del pedido
    async getParada(req, res) {
        try {
            const { idPedido, idParada } = req.params;
            const parada = await pedidoParadasService.getParada(idPedido, idParada);

            if (!parada) {
                return res.status(404).json({ error: "Parada del pedido no encontrada" });
            }

            res.json(parada);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Agregar una parada al pedido (tipo RECOGIDA/ENTREGA/AMBAS)
    async create(req, res) {
        try {
            const parada = await pedidoParadasService.agregarParada(req.body);
            res.status(201).json({
                message: "Parada del pedido creada exitosamente",
                parada
            });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    // Marcar parada como completada / pendiente
    async completar(req, res) {
        try {
            const { idPedido, idParada, completada } = req.body;

            const parada = await pedidoParadasService.marcarCompletada(
                idPedido,
                idParada,
                completada !== undefined ? completada : true
            );

            res.json({
                message: "Parada actualizada exitosamente",
                parada
            });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    // Eliminar una parada del pedido
    async delete(req, res) {
        try {
            const { idPedido, idParada } = req.params;
            await pedidoParadasService.eliminarParada(idPedido, idParada);
            res.json({ message: "Parada del pedido eliminada exitosamente" });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
};

module.exports = pedidoParadasController;
