const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const paradasService = {
    // Crear una nueva parada
    async createParada(data) {
        // Validar que la ruta exista antes de crear la parada
        const rutaExiste = await prisma.rutas.findUnique({
            where: { idRuta: parseInt(data.idRuta) }
        });

        if (!rutaExiste) {
            throw new Error(`La ruta con ID ${data.idRuta} no existe.`);
        }

        return await prisma.paradas.create({
            data: {
                idRuta: parseInt(data.idRuta),
                nombre: data.nombre,
                lat: data.lat,
                lng: data.lng,
                orden: parseInt(data.orden),
                kmAcumulado: data.kmAcumulado || null,
                tipo: data.tipo || 'AMBAS'
            }
        });
    },

    // Obtener todas las paradas de una ruta
    async getParadasByRuta(idRuta) {
        return await prisma.paradas.findMany({
            where: { idRuta: parseInt(idRuta) },
            orderBy: { orden: 'asc' }
        });
    },

    // Obtener parada por ID
    async getParadaById(id) {
        return await prisma.paradas.findUnique({
            where: { idParada: parseInt(id) },
            include: {
                ruta: true
            }
        });
    },

    // Actualizar parada
    async updateParada(id, data) {
        return await prisma.paradas.update({
            where: { idParada: parseInt(id) },
            data: {
                nombre: data.nombre,
                lat: data.lat,
                lng: data.lng,
                orden: data.orden ? parseInt(data.orden) : undefined,
                kmAcumulado: data.kmAcumulado,
                tipo: data.tipo
            }
        });
    },

    // Eliminar parada
    async deleteParada(id) {
        // Verificar si la parada está siendo usada en pedidos
        const pedidosCount = await prisma.pedidoParadas.count({
            where: { idParada: parseInt(id) }
        });

        if (pedidosCount > 0) {
            throw new Error(`No se puede eliminar la parada. Hay ${pedidosCount} pedido(s) asociado(s).`);
        }

        return await prisma.paradas.delete({
            where: { idParada: parseInt(id) }
        });
    },

    // Obtener todas las paradas
    async getAllParadas() {
        return await prisma.paradas.findMany({
            include: {
                ruta: {
                    select: {
                        idRuta: true,
                        nombre: true
                    }
                }
            },
            orderBy: [
                { idRuta: 'asc' },
                { orden: 'asc' }
            ]
        });
    },

    // Calcular distancia entre dos coordenadas (fórmula de Haversine)
    calcularDistancia(lat1, lng1, lat2, lng2) {
        const R = 6371; // Radio de la Tierra en km
        const dLat = this.degToRad(lat2 - lat1);
        const dLng = this.degToRad(lng2 - lng1);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.degToRad(lat1)) * Math.cos(this.degToRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return distance; // Distancia en km
    },

    degToRad(deg) {
        return deg * (Math.PI / 180);
    }
};

module.exports = paradasService;
