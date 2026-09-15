const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
});

const suscripcionesService = {
    // Planes (Admin)
    async createPlan(data) {
        return await prisma.planesRepartidor.create({
            data: {
                nombre: data.nombre,
                descripcion: data.descripcion,
                tipo: data.tipo, // SEMANAL, MENSUAL
                precio: data.precio,
                maxPedidos: data.maxPedidos ? parseInt(data.maxPedidos) : null,
                porcentajeComision: data.porcentajeComision,
                activo: true
            }
        });
    },

    async getPlanes() {
        return await prisma.planesRepartidor.findMany({
            where: { activo: true }
        });
    },

    // Suscripciones (Repartidor)
    async suscribirse(data) {
        // Calcular fechas
        const fechaInicio = new Date();
        const plan = await prisma.planesRepartidor.findUnique({
            where: { idPlan: parseInt(data.idPlan) }
        });

        if (!plan) throw new Error("Plan no encontrado");

        let fechaFin = new Date();
        if (plan.tipo === 'SEMANAL') {
            fechaFin.setDate(fechaFin.getDate() + 7);
        } else if (plan.tipo === 'MENSUAL') {
            fechaFin.setMonth(fechaFin.getMonth() + 1);
        }

        return await prisma.suscripcionesRepartidor.create({
            data: {
                idUsuario: parseInt(data.idUsuario),
                idPlan: parseInt(data.idPlan),
                fechaInicio,
                fechaFin,
                estado: 'ACTIVA',
                renovacionAutomatica: data.renovacionAutomatica || false
            }
        });
    },

    async getMiSuscripcion(idUsuario) {
        return await prisma.suscripcionesRepartidor.findFirst({
            where: { idUsuario: idUsuario, estado: 'ACTIVA' },
            include: { plan: true }
        });
    },

    async getById(id) {
        return await prisma.suscripcionesRepartidor.findUnique({
            where: { idSuscripcion: parseInt(id) },
            include: {
                usuario: { select: { nombre: true, email: true } },
                plan: true
            }
        });
    }
};

module.exports = suscripcionesService;
