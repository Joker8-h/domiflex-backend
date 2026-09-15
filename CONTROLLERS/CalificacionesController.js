const calificacionesService = require("../SERVICES/CalificacionesService");

const calificacionesController = {
    async create(req, res) {
        try {
            const idCalificador = req.user.id;
            const data = { ...req.body, idCalificador };
            // DomiFlex: usa idPedido según schema.prisma
            const nueva = await calificacionesService.create(data);
            res.json(nueva);
        } catch (error) {
            res.json({ error: error.message });
        }
    },

    async getPromedio(req, res) {
        try {
            const { idUsuario } = req.params;
            const promedio = await calificacionesService.getPromedioUsuario(idUsuario);
            res.json({ promedio });
        } catch (error) {
            res.json({ error: error.message });
        }
    },

    async getById(req, res) {
        try {
            const { id } = req.params;
            const calificacion = await calificacionesService.getById(id);
            if (!calificacion) return res.status(404).json({ error: "Calificación no encontrada" });
            res.json(calificacion);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getTopRepartidores(req, res) {
        try {
            console.log("[CONTROLLER] getTopRepartidores called");
            const top = await calificacionesService.getTopRepartidores(5);
            console.log("[CONTROLLER] getTopRepartidores result:", JSON.stringify(top));
            res.json(top);
        } catch (error) {
            console.error("[CONTROLLER] Error getTopRepartidores:", error);
            res.status(500).json({ error: error.message });
        }
    },

    async getTopClientes(req, res) {
        try {
            const top = await calificacionesService.getTopClientes(5);
            res.json(top);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = calificacionesController;
