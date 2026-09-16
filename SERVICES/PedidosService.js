const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({});
const pricingService = require("./PricingService");
const notificacionesService = require("./NotificacionesService");

const TRANSICIONES_VALIDAS = {
    CREADO: ["ASIGNADO", "CANCELADO"],
    ASIGNADO: ["RECOGIENDO", "CANCELADO"],
    RECOGIENDO: ["EN_CAMINO", "CANCELADO"],
    EN_CAMINO: ["ENTREGADO", "CANCELADO"],
    ENTREGADO: [],
    CANCELADO: []
};

const pedidosService = {
    async crearPedido(idCliente, data) {
        const latRecogida = parseFloat(data.latRecogida);
        const lngRecogida = parseFloat(data.lngRecogida);
        const latEntrega = parseFloat(data.latEntrega);
        const lngEntrega = parseFloat(data.lngEntrega);

        if ([latRecogida, lngRecogida, latEntrega, lngEntrega].some((v) => Number.isNaN(v))) {
            throw new Error("Latitud/longitud de recogida y entrega son obligatorias.");
        }

        const { subtotal, precioFinal, comisionPlataforma, distanciaRecorrida } =
            await pricingService.estimarPrecioPedido({ latRecogida, lngRecogida, latEntrega, lngEntrega });

        const tipoPago = data.tipoPago || "EFECTIVO";

        const pedido = await prisma.$transaction(async (tx) => {
            const creado = await tx.pedidos.create({
                data: {
                    idCliente: parseInt(idCliente),
                    idComercio: data.idComercio ? parseInt(data.idComercio) : null,
                    idRuta: data.idRuta ? parseInt(data.idRuta) : null,
                    idVehiculo: data.idVehiculo ? parseInt(data.idVehiculo) : null,
                    negocioId: data.negocioId ? parseInt(data.negocioId) : null,
                    nombreRecogida: data.nombreRecogida || null,
                    dirRecogida: data.dirRecogida || null,
                    latRecogida,
                    lngRecogida,
                    nombreEntrega: data.nombreEntrega || null,
                    dirEntrega: data.dirEntrega || null,
                    latEntrega,
                    lngEntrega,
                    detallePedido: data.detallePedido || null,
                    distanciaKm: distanciaRecorrida,
                    subtotal,
                    comisionPlataforma,
                    total: precioFinal,
                    tipoPago,
                    estado: "CREADO"
                }
            });

            // Crear items del pedido si se proporcionan
            if (data.items && data.items.length > 0) {
                const itemsData = data.items.map((item) => ({
                    cantidad: item.cantidad || 1,
                    precio: item.precio,
                    pedidoId: creado.idPedido,
                    menuItemId: item.menuItemId,
                }));
                await tx.pedidoItem.createMany({ data: itemsData });
            }

            await tx.pagos.create({
                data: {
                    idPedido: creado.idPedido,
                    idUsuario: parseInt(idCliente),
                    tipoPago: "PEDIDO",
                    monto: precioFinal,
                    estado: "PENDIENTE",
                    confirmacionCliente: false,
                    confirmacionRepartidor: false
                }
            });

            return creado;
        });

        try {
            await notificacionesService.crearNotificacion({
                idUsuario: parseInt(idCliente),
                titulo: "Pedido creado",
                mensaje: `Tu pedido #${pedido.idPedido} fue creado por $${Number(precioFinal).toLocaleString()} COP.`,
                tipo: "PEDIDO"
            });
        } catch (notifError) {
            console.error("Error al crear notificación de pedido:", notifError.message);
        }

        return pedido;
    },

    async asignarRepartidor(idPedido, idRepartidor) {
        const pedido = await prisma.pedidos.findUnique({ where: { idPedido: parseInt(idPedido) } });
        if (!pedido) throw new Error("Pedido no encontrado");
        if (pedido.estado !== "CREADO") {
            throw new Error("Solo se puede asignar repartidor a un pedido en estado CREADO");
        }

        const actualizado = await prisma.pedidos.update({
            where: { idPedido: parseInt(idPedido) },
            data: { idRepartidor: parseInt(idRepartidor), estado: "ASIGNADO" },
            include: { cliente: { select: { nombre: true } }, repartidor: { select: { nombre: true } }, ruta: true, vehiculo: true }
        });

        try {
            await notificacionesService.crearNotificacion({
                idUsuario: parseInt(idRepartidor),
                titulo: "Pedido asignado",
                mensaje: `Se te asignó el pedido #${actualizado.idPedido}.`,
                tipo: "PEDIDO"
            });
        } catch (notifError) {
            console.error("Error al crear notificación de asignación:", notifError.message);
        }

        return actualizado;
    },

    async cambiarEstado(idPedido, estado) {
        const pedido = await prisma.pedidos.findUnique({ where: { idPedido: parseInt(idPedido) } });
        if (!pedido) throw new Error("Pedido no encontrado");

        const siguientes = TRANSICIONES_VALIDAS[pedido.estado] || [];
        if (!siguientes.includes(estado)) {
            throw new Error(`Transición no válida de ${pedido.estado} a ${estado}`);
        }

        return await prisma.pedidos.update({
            where: { idPedido: parseInt(idPedido) },
            data: { estado }
        });
    },

    async getMisPedidos(idCliente) {
        return await prisma.pedidos.findMany({
            where: { idCliente: parseInt(idCliente) },
            include: {
                repartidor: { select: { nombre: true, fotoPerfil: true } },
                ruta: true,
                vehiculo: true,
                negocio: { select: { id: true, nombre: true, imagen: true, tipo: true } },
                items: { include: { menuItem: true } },
            },
            orderBy: { creadoEn: "desc" }
        });
    },

    async getPedidosRepartidor(idRepartidor) {
        return await prisma.pedidos.findMany({
            where: { idRepartidor: parseInt(idRepartidor) },
            include: {
                cliente: { select: { nombre: true, fotoPerfil: true } },
                ruta: true,
                vehiculo: true,
                negocio: { select: { id: true, nombre: true, imagen: true, tipo: true } },
                items: { include: { menuItem: true } },
            },
            orderBy: { creadoEn: "desc" }
        });
    },

    async getById(id) {
        return await prisma.pedidos.findUnique({
            where: { idPedido: parseInt(id) },
            include: {
                cliente: { select: { nombre: true, email: true, fotoPerfil: true } },
                repartidor: { select: { nombre: true, email: true, fotoPerfil: true } },
                ruta: { include: { paradas: { orderBy: { orden: "asc" } } } },
                vehiculo: true,
                negocio: { select: { id: true, nombre: true, imagen: true, tipo: true, direccion: true, telefono: true } },
                items: { include: { menuItem: true } },
            }
        });
    },

    async cancelarPedido(idPedido, idUsuario) {
        const pedido = await this.getById(idPedido);
        if (!pedido) throw new Error("Pedido no encontrado");
        if (pedido.estado === "ENTREGADO") {
            throw new Error("El pedido ya fue entregado y no se puede cancelar");
        }
        if (pedido.estado === "CANCELADO") {
            throw new Error("El pedido ya está cancelado");
        }

        return await prisma.pedidos.update({
            where: { idPedido: parseInt(idPedido) },
            data: { estado: "CANCELADO" }
        });
    }
};

module.exports = pedidosService;
