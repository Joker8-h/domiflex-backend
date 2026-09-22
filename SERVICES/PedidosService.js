const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({});
const pricingService = require("./PricingService");
const socketService = require("./SocketService");
const pushService = require("./PushService");

function anunciarPedido(pedido, titulo, mensaje) {
    const payload = {
        idPedido: pedido.idPedido,
        estado: pedido.estado,
        idCliente: pedido.idCliente,
        idRepartidor: pedido.idRepartidor || null,
    };
    socketService.emitPedido(pedido.idPedido, "pedido_actualizado", payload);
    socketService.emitPedido(pedido.idPedido, "pedido_estado", payload);
    if (pedido.idCliente) {
        socketService.notifyUser(pedido.idCliente, "pedido_actualizado", payload, titulo, mensaje, "PEDIDO");
    }
    if (pedido.idRepartidor && pedido.idRepartidor !== pedido.idCliente) {
        socketService.notifyUser(pedido.idRepartidor, "pedido_actualizado", payload, titulo, mensaje, "PEDIDO");
    }
    pushService.enviarAUsuarios(
        [pedido.idCliente, pedido.idRepartidor],
        titulo,
        mensaje,
        { idPedido: String(pedido.idPedido), estado: pedido.estado || "" }
    );
}

const TRANSICIONES_VALIDAS = {
    CREADO: ["ASIGNADO", "CANCELADO"],
    ASIGNADO: ["RECOGIENDO", "CANCELADO"],
    RECOGIENDO: ["EN_CAMINO", "CANCELADO"],
    EN_CAMINO: ["ENTREGADO", "CANCELADO"],
    ENTREGADO: [],
    CANCELADO: []
};

const pedidosService = {
    /**
     * Precio del pedido = suma(cantidad * precio en BD) + envío.
     * El precio que manda el cliente se ignora. Sin ítems (domicilio suelto)
     * el total es solo la tarifa por distancia.
     */
    async cotizarPedido(data) {
        const latRecogida = parseFloat(data.latRecogida);
        const lngRecogida = parseFloat(data.lngRecogida);
        const latEntrega = parseFloat(data.latEntrega);
        const lngEntrega = parseFloat(data.lngEntrega);

        if ([latRecogida, lngRecogida, latEntrega, lngEntrega].some((v) => Number.isNaN(v))) {
            throw new Error("Latitud/longitud de recogida y entrega son obligatorias.");
        }

        const items = Array.isArray(data.items) ? data.items : [];
        const itemsValidados = [];
        let itemsSubtotal = 0;

        if (items.length > 0) {
            const ids = [...new Set(items.map((item) => parseInt(item.menuItemId, 10)).filter((id) => !Number.isNaN(id)))];
            if (ids.length === 0) throw new Error("Cada ítem necesita un producto válido.");

            const productos = await prisma.producto.findMany({ where: { id: { in: ids } } });
            const porId = new Map(productos.map((p) => [p.id, p]));
            const negocioId = data.negocioId ? parseInt(data.negocioId, 10) : null;

            for (const item of items) {
                const menuItemId = parseInt(item.menuItemId, 10);
                const producto = porId.get(menuItemId);
                if (!producto) throw new Error(`El producto ${menuItemId} no existe.`);
                if (!producto.disponible) throw new Error(`${producto.nombre} no está disponible.`);
                if (negocioId && producto.restauranteId !== negocioId) {
                    throw new Error(`${producto.nombre} no pertenece a este negocio.`);
                }
                const cantidad = parseInt(item.cantidad, 10) || 1;
                if (cantidad < 1 || cantidad > 99) throw new Error(`Cantidad inválida para ${producto.nombre}.`);
                itemsSubtotal += producto.precio * cantidad;
                itemsValidados.push({
                    menuItemId,
                    cantidad,
                    precio: producto.precio,
                    nombre: producto.nombre,
                });
            }
        }

        let negocio = null;
        if (data.negocioId) {
            negocio = await prisma.negocios.findUnique({ where: { id: parseInt(data.negocioId, 10) } });
            if (!negocio || !negocio.activo) throw new Error("Negocio no encontrado.");
            if (items.length > 0 && negocio.envioMinimo > 0 && itemsSubtotal < negocio.envioMinimo) {
                throw new Error(`El pedido mínimo de este negocio es $${negocio.envioMinimo.toLocaleString("es-CO")}.`);
            }
        }

        const envioQuote = await pricingService.estimarPrecioPedido({
            latRecogida, lngRecogida, latEntrega, lngEntrega,
        });

        const envio = negocio ? Number(negocio.costoEnvio) : envioQuote.precioFinal;
        const total = items.length > 0 ? itemsSubtotal + envio : envioQuote.precioFinal;

        return {
            itemsSubtotal,
            envio: items.length > 0 ? envio : envioQuote.precioFinal,
            subtotal: items.length > 0 ? itemsSubtotal : envioQuote.subtotal,
            comisionPlataforma: envioQuote.comisionPlataforma,
            distanciaRecorrida: envioQuote.distanciaRecorrida,
            total,
            precioFinal: total,
            itemsValidados,
            idComercio: negocio ? negocio.ownerId : (data.idComercio ? parseInt(data.idComercio, 10) : null),
            negocioId: negocio ? negocio.id : null,
        };
    },

    async crearPedido(idCliente, data) {
        const cotizacion = await this.cotizarPedido(data);
        const tipoPago = data.tipoPago || "EFECTIVO";

        const pedido = await prisma.$transaction(async (tx) => {
            const creado = await tx.pedidos.create({
                data: {
                    idCliente: parseInt(idCliente),
                    idComercio: cotizacion.idComercio,
                    idRuta: data.idRuta ? parseInt(data.idRuta) : null,
                    idVehiculo: data.idVehiculo ? parseInt(data.idVehiculo) : null,
                    negocioId: cotizacion.negocioId,
                    nombreRecogida: data.nombreRecogida || null,
                    dirRecogida: data.dirRecogida || null,
                    latRecogida: parseFloat(data.latRecogida),
                    lngRecogida: parseFloat(data.lngRecogida),
                    nombreEntrega: data.nombreEntrega || null,
                    dirEntrega: data.dirEntrega || null,
                    latEntrega: parseFloat(data.latEntrega),
                    lngEntrega: parseFloat(data.lngEntrega),
                    detallePedido: data.detallePedido || null,
                    distanciaKm: cotizacion.distanciaRecorrida,
                    subtotal: cotizacion.subtotal,
                    comisionPlataforma: cotizacion.comisionPlataforma,
                    total: cotizacion.total,
                    tipoPago,
                    estado: "CREADO"
                }
            });

            if (cotizacion.itemsValidados.length > 0) {
                await tx.pedidoItem.createMany({
                    data: cotizacion.itemsValidados.map((item) => ({
                        cantidad: item.cantidad,
                        precio: item.precio,
                        pedidoId: creado.idPedido,
                        menuItemId: item.menuItemId,
                    })),
                });
            }

            await tx.pagos.create({
                data: {
                    idPedido: creado.idPedido,
                    idUsuario: parseInt(idCliente),
                    tipoPago: "PEDIDO",
                    monto: cotizacion.total,
                    estado: "PENDIENTE",
                    confirmacionCliente: false,
                    confirmacionRepartidor: false
                }
            });

            return creado;
        });

        const precioFinal = cotizacion.total;

        anunciarPedido(
            pedido,
            "Pedido creado",
            `Tu pedido #${pedido.idPedido} fue creado por $${Number(precioFinal).toLocaleString("es-CO")} COP.`
        );

        return {
            ...pedido,
            desglose: {
                itemsSubtotal: cotizacion.itemsSubtotal,
                envio: cotizacion.envio,
                comisionPlataforma: cotizacion.comisionPlataforma,
                distanciaKm: cotizacion.distanciaRecorrida,
                total: cotizacion.total,
            },
        };
    },

    async asignarRepartidor(idPedido, idRepartidor) {
        const pedido = await prisma.pedidos.findUnique({ where: { idPedido: parseInt(idPedido) } });
        if (!pedido) throw new Error("Pedido no encontrado");
        if (pedido.estado !== "CREADO") {
            throw new Error("Solo se puede asignar repartidor a un pedido en estado CREADO");
        }

        const repartidor = await prisma.usuarios.findUnique({
            where: { idUsuarios: parseInt(idRepartidor) },
            include: { rol: true, vehiculos: { where: { estado: "ACTIVO" }, take: 1 } },
        });
        if (!repartidor || repartidor.rol?.nombre !== "REPARTIDOR") {
            throw new Error("Solo un repartidor puede tomar este pedido.");
        }

        const actualizado = await prisma.pedidos.update({
            where: { idPedido: parseInt(idPedido) },
            data: {
                idRepartidor: repartidor.idUsuarios,
                idVehiculo: pedido.idVehiculo || repartidor.vehiculos[0]?.idVehiculos || null,
                estado: "ASIGNADO",
            },
            include: { cliente: { select: { nombre: true } }, repartidor: { select: { nombre: true } }, ruta: true, vehiculo: true }
        });

        anunciarPedido(actualizado, "Pedido asignado", `El pedido #${actualizado.idPedido} ya tiene domiciliario.`);

        return actualizado;
    },

    async cambiarEstado(idPedido, estado) {
        const pedido = await prisma.pedidos.findUnique({ where: { idPedido: parseInt(idPedido) } });
        if (!pedido) throw new Error("Pedido no encontrado");

        const siguientes = TRANSICIONES_VALIDAS[pedido.estado] || [];
        if (!siguientes.includes(estado)) {
            throw new Error(`Transición no válida de ${pedido.estado} a ${estado}`);
        }

        const actualizado = await prisma.pedidos.update({
            where: { idPedido: parseInt(idPedido) },
            data: { estado }
        });
        anunciarPedido(actualizado, "Pedido actualizado", `El pedido #${actualizado.idPedido} ahora está ${estado}.`);
        return actualizado;
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

    async getPedidosComercio(idUsuario) {
        const uid = parseInt(idUsuario);
        const negocios = await prisma.negocios.findMany({
            where: { ownerId: uid },
            select: { id: true },
        });
        const ids = negocios.map((n) => n.id);
        return await prisma.pedidos.findMany({
            where: {
                OR: [
                    { idComercio: uid },
                    ...(ids.length ? [{ negocioId: { in: ids } }] : []),
                ],
            },
            include: {
                cliente: { select: { nombre: true, telefono: true } },
                repartidor: { select: { nombre: true } },
                negocio: { select: { id: true, nombre: true } },
                items: { include: { menuItem: true } },
            },
            orderBy: { creadoEn: "desc" },
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

    async buscarPedidosDisponibles() {
        return prisma.pedidos.findMany({
            where: { estado: "CREADO", idRepartidor: null },
            include: {
                cliente: { select: { nombre: true } },
                negocio: { select: { id: true, nombre: true, direccion: true } },
            },
            orderBy: { creadoEn: "desc" },
            take: 30,
        });
    },

    async publicarUbicacion(idPedido, idRepartidor, lat, lng) {
        const pedido = await prisma.pedidos.findUnique({ where: { idPedido: parseInt(idPedido) } });
        if (!pedido) throw new Error("Pedido no encontrado");
        if (pedido.idRepartidor !== parseInt(idRepartidor)) {
            throw new Error("Solo el domiciliario asignado puede publicar su ubicación");
        }
        if (!["ASIGNADO", "RECOGIENDO", "EN_CAMINO"].includes(pedido.estado)) {
            throw new Error("Este pedido no está en ruta");
        }
        const punto = { idPedido: pedido.idPedido, lat: Number(lat), lng: Number(lng), timestamp: new Date().toISOString() };
        socketService.emitPedido(pedido.idPedido, "location_updated", punto);
        return punto;
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

    async cancelarPedido(idPedido, idUsuario, rol) {
        const pedido = await this.getById(idPedido);
        if (!pedido) throw new Error("Pedido no encontrado");
        if (pedido.estado === "ENTREGADO") {
            throw new Error("El pedido ya fue entregado y no se puede cancelar");
        }
        if (pedido.estado === "CANCELADO") {
            throw new Error("El pedido ya está cancelado");
        }

        const uid = parseInt(idUsuario);
        const participa = pedido.idCliente === uid || pedido.idRepartidor === uid || pedido.idComercio === uid;
        if (String(rol || "").toUpperCase() !== "ADMIN" && !participa) {
            throw new Error("No puedes cancelar este pedido.");
        }

        const actualizado = await prisma.pedidos.update({
            where: { idPedido: parseInt(idPedido) },
            data: { estado: "CANCELADO" }
        });
        anunciarPedido(actualizado, "Pedido cancelado", `El pedido #${actualizado.idPedido} fue cancelado.`);
        return actualizado;
    },

    async obtenerPedidosPorDiaSemana(dia) {
        const d = parseInt(dia);
        if (Number.isNaN(d) || d < 0 || d > 6) return [];
        try {
            const pedidos = await prisma.pedidos.findMany({
                where: {
                    creadoEn: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0) - d * 24 * 60 * 60 * 1000),
                    },
                },
                select: { idPedido: true, estado: true, total: true, creadoEn: true },
                orderBy: { creadoEn: "desc" },
                take: 50,
            });
            // Filtrar por día de la semana real
            return pedidos.filter((p) => new Date(p.creadoEn).getDay() === d);
        } catch (e) {
            return [];
        }
    }
};

module.exports = pedidosService;
