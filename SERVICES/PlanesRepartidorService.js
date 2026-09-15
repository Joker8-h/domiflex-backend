const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const planesRepartidorService = {
    // Obtener todos los planes
    async getAllPlanes() {
        return await prisma.planesRepartidor.findMany({
            include: {
                _count: {
                    select: { suscripciones: true }
                }
            }
        });
    },

    // Obtener solo planes activos
    async getPlanesActivos() {
        return await prisma.planesRepartidor.findMany({
            where: { activo: true }
        });
    },

    // Obtener plan por ID
    async getPlanById(id) {
        return await prisma.planesRepartidor.findUnique({
            where: { idPlan: parseInt(id) },
            include: {
                suscripciones: {
                    include: {
                        usuario: {
                            select: {
                                idUsuarios: true,
                                nombre: true,
                                email: true
                            }
                        }
                    }
                },
                _count: {
                    select: { suscripciones: true }
                }
            }
        });
    },

    // Crear nuevo plan
    async createPlan(data) {
        return await prisma.planesRepartidor.create({
            data: {
                nombre: data.nombre,
                descripcion: data.descripcion,
                tipo: data.tipo,
                precio: data.precio,
                maxPedidos: data.maxPedidos || null,
                porcentajeComision: data.porcentajeComision || null,
                activo: data.activo !== undefined ? data.activo : true
            }
        });
    },

    // Actualizar plan
    async updatePlan(id, data) {
        return await prisma.planesRepartidor.update({
            where: { idPlan: parseInt(id) },
            data: {
                nombre: data.nombre,
                descripcion: data.descripcion,
                tipo: data.tipo,
                precio: data.precio,
                maxPedidos: data.maxPedidos,
                porcentajeComision: data.porcentajeComision,
                activo: data.activo
            }
        });
    },

    // Eliminar plan (soft delete - desactivar)
    async deletePlan(id) {
        // Verificar si hay suscripciones activas
        const suscripcionesActivas = await prisma.suscripcionesRepartidor.count({
            where: {
                idPlan: parseInt(id),
                estado: 'ACTIVA'
            }
        });

        if (suscripcionesActivas > 0) {
            throw new Error(`No se puede eliminar el plan. Hay ${suscripcionesActivas} suscripción(es) activa(s).`);
        }

        // Soft delete - desactivar el plan
        return await prisma.planesRepartidor.update({
            where: { idPlan: parseInt(id) },
            data: { activo: false }
        });
    },

    // Eliminar plan definitivamente (hard delete)
    async hardDeletePlan(id) {
        // Verificar si hay suscripciones
        const suscripciones = await prisma.suscripcionesRepartidor.count({
            where: { idPlan: parseInt(id) }
        });

        if (suscripciones > 0) {
            throw new Error(`No se puede eliminar el plan. Hay ${suscripciones} suscripción(es) asociada(s).`);
        }

        return await prisma.planesRepartidor.delete({
            where: { idPlan: parseInt(id) }
        });
    }
};

module.exports = planesRepartidorService;
