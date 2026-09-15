const pagosService = require("../SERVICES/PagosService");

const pagosController = {
    async create(req, res) {
        try {
            const idUsuario = req.user.id;
            const data = { ...req.body, idUsuario };
            const pago = await pagosService.create(data);
            res.json(pago);
        } catch (error) {
            res.json({ error: error.message });
        }
    },

    async getMyPagos(req, res) {
        try {
            const idUsuario = req.user.id;
            const pagos = await pagosService.getByUser(idUsuario);
            res.json(pagos);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getByPedido(req, res) {
        try {
            const { idPedido } = req.params;
            const pagos = await pagosService.getByPedido(idPedido);
            res.json(pagos);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getByPedidoAndUser(req, res) {
        try {
            const { idPedido, idUsuario } = req.params;
            const pago = await pagosService.getByPedidoAndUser(idPedido, idUsuario);
            if (!pago) return res.status(404).json({ error: "Pago no encontrado para este pedido y usuario" });
            res.json(pago);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getById(req, res) {
        try {
            const { id } = req.params;
            const pago = await pagosService.getById(id);
            if (!pago) return res.status(404).json({ error: "Pago no encontrado" });
            res.json(pago);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async updateConfirmacion(req, res) {
        try {
            const { id } = req.params;
            const { confirmacionCliente, confirmacionRepartidor } = req.body;

            const updateData = {};
            if (confirmacionCliente !== undefined) updateData.confirmacionCliente = confirmacionCliente;
            if (confirmacionRepartidor !== undefined) updateData.confirmacionRepartidor = confirmacionRepartidor;

            const pago = await pagosService.updateConfirmacion(id, updateData);
            res.json(pago);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async confirmarCliente(req, res) {
        try {
            const { id } = req.params;
            const pago = await pagosService.confirmarCliente(id);
            res.json(pago);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async confirmarRepartidor(req, res) {
        try {
            const { id } = req.params;
            const pago = await pagosService.confirmarRepartidor(id);
            res.json(pago);
        } catch (error) {
            const statusCode = error.code === 400 ? 400 : 500;
            res.status(statusCode).json({ error: error.message });
        }
    }
};

module.exports = pagosController;
