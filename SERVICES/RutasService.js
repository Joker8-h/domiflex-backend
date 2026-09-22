const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
});

const rutasService = {
    // Crear una nueva ruta
    async createRuta(data) {
        // Validar campos requeridos
        if (!data.nombre || data.nombre.trim() === '') {
            throw new Error('El nombre de la ruta es requerido.');
        }

        if (!data.descripcion || data.descripcion.trim() === '') {
            throw new Error('La descripción de la ruta es requerida.');
        }

        return await prisma.rutas.create({
            data: {
                nombre: data.nombre.trim(),
                descripcion: data.descripcion.trim(),
                origen: data.origen || 'MANUAL',
                estado: 'DISPONIBLE'
            }
        });
    },

    // Agregar parada a una ruta
    async addParada(idRuta, data) {
        // Verificar que la ruta exista
        const rutaExiste = await prisma.rutas.findUnique({
            where: { idRuta: parseInt(idRuta) }
        });

        if (!rutaExiste) {
            throw new Error(`La ruta con ID ${idRuta} no existe.`);
        }

        // Validar campos requeridos de la parada
        if (!data.nombre || data.nombre.trim() === '') {
            throw new Error('El nombre de la parada es requerido.');
        }

        if (data.lat === undefined || data.lng === undefined) {
            throw new Error('Las coordenadas (lat, lng) son requeridas.');
        }

        if (data.orden === undefined || data.orden < 0) {
            throw new Error('El orden de la parada es requerido y debe ser un número positivo.');
        }

        return await prisma.paradas.create({
            data: {
                idRuta: parseInt(idRuta),
                nombre: data.nombre.trim(),
                lat: data.lat,
                lng: data.lng,
                orden: parseInt(data.orden),
                tipo: data.tipo || 'AMBAS'
            }
        });
    },

    // Obtener todas las rutas con sus paradas
    async getRutas() {
        return await prisma.rutas.findMany({
            include: {
                paradas: {
                    orderBy: { orden: 'asc' }
                }
            }
        });
    },

    // Obtener una ruta por ID
    async getRutaById(id) {
        return await prisma.rutas.findUnique({
            where: { idRuta: parseInt(id) },
            include: {
                paradas: {
                    orderBy: { orden: 'asc' }
                }
            }
        });
    },

    async updateRuta(id, data) {
        return await prisma.rutas.update({
            where: { idRuta: parseInt(id) },
            data: {
                nombre: data.nombre,
                descripcion: data.descripcion,
                origen: data.origen,
                estado: data.estado
            }
        });
    },

    async deleteRuta(id) {
        const idRuta = parseInt(id);

        // Verificar si la ruta existe
        const ruta = await prisma.rutas.findUnique({
            where: { idRuta }
        });

        if (!ruta) {
            throw new Error(`La ruta con ID ${id} no existe.`);
        }

        // Verificar si tiene pedidos asociados
        const pedidosCount = await prisma.pedidos.count({
            where: { idRuta }
        });

        if (pedidosCount > 0) {
            throw new Error(`No se puede eliminar la ruta. Tiene ${pedidosCount} pedido(s) asociado(s). Debe eliminar los pedidos primero.`);
        }

        // Verificar si tiene paradas asociadas
        const paradasCount = await prisma.paradas.count({
            where: { idRuta }
        });

        if (paradasCount > 0) {
            throw new Error(`No se puede eliminar la ruta. Tiene ${paradasCount} parada(s) asociada(s). Debe eliminar las paradas primero.`);
        }

        // Verificar si tiene logs de IA asociados
        const iaLogsCount = await prisma.iaRutasLog.count({
            where: { idRuta }
        });

        if (iaLogsCount > 0) {
            throw new Error(`No se puede eliminar la ruta. Tiene ${iaLogsCount} registro(s) de IA asociado(s).`);
        }

        return await prisma.rutas.delete({
            where: { idRuta }
        });
    },

    async getMisRutasFrecuentes(idUsuario) {
        // Estrategia: Buscar "Pedidos" donde el vehículo pertenezca al usuario,
        // y agrupar por idRuta. Como Prisma no hace "DISTINCT ON" complejo fácilmente con include,
        // hacemos un findMany de pedidos y extraemos las rutas únicas.

        const pedidosDelRepartidor = await prisma.pedidos.findMany({
            where: {
                vehiculo: {
                    idUsuario: parseInt(idUsuario)
                }
            },
            select: {
                idRuta: true
            },
            distinct: ['idRuta'] // Traer ids de rutas únicos
        });

        const idsRutas = pedidosDelRepartidor.map(v => v.idRuta);

        if (idsRutas.length === 0) return [];

        // Ahora traemos los detalles de esas rutas
        return await prisma.rutas.findMany({
            where: {
                idRuta: { in: idsRutas }
            },
            include: {
                paradas: {
                    orderBy: { orden: 'asc' }
                }
            }
        });
    },

    async calcularRutasOptimas(origen, destino, preferencia = 'FASTEST', k = 3) {
        const OPTIMIZER_URL = process.env.OPTIMIZER_URL || '';
        if (!OPTIMIZER_URL) throw new Error("OPTIMIZER_URL no está configurada.");
        try {
            const response = await fetch(`${OPTIMIZER_URL}/route-options`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    origin: origen,
                    destination: destino,
                    preference: preferencia,
                    k: k
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Error en el servicio de rutas Python');
            }

            return await response.json();
        } catch (error) {
            console.error('Error al conectar con optimizer:', error.message);
            throw error;
        }
    }
};

module.exports = rutasService;
