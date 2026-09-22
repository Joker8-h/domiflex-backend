const pedidosService = require("../SERVICES/PedidosService");
const documentacionService = require("../SERVICES/DocumentacionService");
const pricingService = require("../SERVICES/PricingService");

const pedidosController = {
    // La creación del pedido vive aquí (flujo cliente → pedido directo).
    // Firma del service: crearPedido(idCliente, data)
    async crearPedido(req, res) {
        try {
            const idUsuario = req.user.id;

            // Verificar estado de documentación
            const docs = await documentacionService.getByUsuarioId(idUsuario);
            if (docs && docs.estado === 'RECHAZADO') {
                return res.status(403).json({
                    error: "No puedes crear pedidos. Tu documentación ha sido rechazada. Por favor, actualízala."
                });
            }

            const idCliente = req.body.idCliente || idUsuario;
            const nuevoPedido = await pedidosService.crearPedido(idCliente, req.body);
            res.json(nuevoPedido);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    async cotizar(req, res) {
        try {
            const cotizacion = await pedidosService.cotizarPedido(req.body);
            res.json(cotizacion);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    // Alias compat: POST /api/pedidos
    async create(req, res) {
        return this.crearPedido(req, res);
    },

    async search(req, res) {
        try {
            // Si el service expone búsqueda, usarla; si no, listar los pedidos del usuario.
            if (typeof pedidosService.buscarPedidos === 'function') {
                const pedidos = await pedidosService.buscarPedidos(req.query);
                return res.json(pedidos);
            }
            const idUsuario = req.user.id;
            const rol = req.user.rol?.toUpperCase();
            const pedidos = rol === 'REPARTIDOR'
                ? await pedidosService.buscarPedidosDisponibles()
                : await pedidosService.getMisPedidos(idUsuario);
            res.json(pedidos);
        } catch (error) {
            res.json({ error: error.message });
        }
    },

    async getById(req, res) {
        try {
            const { id } = req.params;
            const pedido = await pedidosService.getById(id);
            if (!pedido) return res.json({ error: "Pedido no encontrado" });
            res.json(pedido);
        } catch (error) {
            res.json({ error: error.message });
        }
    },

    async asignar(req, res) {
        try {
            const { id } = req.params;
            const { idRepartidor } = req.body;
            const idUsuario = req.user.id;
            const pedido = await pedidosService.asignarRepartidor(id, idRepartidor || idUsuario);
            res.json({ message: "Pedido asignado", pedido });
        } catch (error) {
            res.json({ error: error.message });
        }
    },

    async publicarUbicacion(req, res) {
        try {
            const punto = await pedidosService.publicarUbicacion(
                req.params.id,
                req.user.id,
                req.body.lat,
                req.body.lng
            );
            res.json(punto);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    async cambiarEstado(req, res) {
        try {
            const { id } = req.params;
            const { estado } = req.body;
            const pedido = await pedidosService.cambiarEstado(id, estado);
            res.json({ message: `Pedido actualizado a ${estado}`, pedido });
        } catch (error) {
            res.json({ error: error.message });
        }
    },

    async cancelar(req, res) {
        try {
            const { id } = req.params;
            const idUsuario = req.user.id;
            const rol = req.user.rol?.nombre || req.user.rol;
            const pedido = await pedidosService.cancelarPedido(id, idUsuario, rol);
            res.json({ message: "Pedido cancelado", pedido });
        } catch (error) {
            res.json({ error: error.message });
        }
    },

    async getMisPedidos(req, res) {
        try {
            const idUsuario = req.user.id;
            const rol = req.user.rol?.toUpperCase();

            let pedidos;
            if (rol === 'REPARTIDOR') {
                pedidos = await pedidosService.getPedidosRepartidor(idUsuario);
            } else if (rol === 'COMERCIO') {
                pedidos = await pedidosService.getPedidosComercio(idUsuario);
            } else if (rol === 'CLIENTE') {
                pedidos = await pedidosService.getMisPedidos(idUsuario);
            } else {
                // Para ADMIN o si no hay rol claro, traer pedidos del repartidor por defecto
                pedidos = await pedidosService.getPedidosRepartidor(idUsuario);
            }

            res.json(pedidos);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getPedidosPorDia(req, res) {
        try {
            const { dia } = req.params;
            const pedidos = await pedidosService.obtenerPedidosPorDiaSemana(dia);
            res.json(pedidos);
        } catch (error) {
            // Fallback silencioso para dashboard: no romper UI con 501
            res.json([]);
        }
    },

    async estimarPrecio(req, res) {
        try {
            const { latRecogida, lngRecogida, latEntrega, lngEntrega } = req.query;

            const estimacion = await pricingService.estimarPrecioPedido({
                latRecogida: parseFloat(latRecogida),
                lngRecogida: parseFloat(lngRecogida),
                latEntrega: parseFloat(latEntrega),
                lngEntrega: parseFloat(lngEntrega)
            });

            res.json(estimacion);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = pedidosController;
