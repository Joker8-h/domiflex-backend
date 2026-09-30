const chatService = require("../SERVICES/ChatService");

const chatController = {
    async init(req, res) {
        try {

            const conversacion = await chatService.initConversacion(req.body);
            res.json(conversacion);
        } catch (error) {
            res.json({ error: error.message });
        }
    },

    async enviarMensaje(req, res) {
        try {
            const idRemitente = req.user.id;
            const data = { ...req.body, idRemitente };
            const mensaje = await chatService.enviarMensaje(data);
            res.json(mensaje);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    async getConversacionByPedido(req, res) {
        try {
            const { idPedido } = req.params;
            const conversacion = await chatService.getConversacionByPedido(idPedido, req.user.id);
            res.json(conversacion);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    async getMisConversaciones(req, res) {
        try {
            const idUsuario = req.user.id;
            const conversaciones = await chatService.getConversacionesUsuario(idUsuario);
            res.json(conversaciones);
        } catch (error) {
            res.json({ error: error.message });
        }
    },

    async getMensajes(req, res) {
        try {
            const { id } = req.params;
            const mensajes = await chatService.getMensajes(id);
            res.json(mensajes);
        } catch (error) {
            res.json({ error: error.message });
        }
    },

    async getConversacionById(req, res) {
        try {
            const { id } = req.params;
            const conversacion = await chatService.getConversacionById(id);
            if (!conversacion) return res.status(404).json({ error: "Conversación no encontrada" });
            res.json(conversacion);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = chatController;
