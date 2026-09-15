const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
});

const calificacionesService = {
    async create(data) {
        // Validar que el usuario sea parte del pedido (pendiente)
        return await prisma.calificaciones.create({
            data: {
                idPedido: parseInt(data.idPedido),
                idCalificador: parseInt(data.idCalificador),
                idCalificado: parseInt(data.idCalificado),
                puntuacion: parseInt(data.puntuacion),
                comentario: data.comentario
            }
        });
    },

    async getPromedioUsuario(idUsuario) {
        const agregacion = await prisma.calificaciones.aggregate({
            where: { idCalificado: parseInt(idUsuario) },
            _avg: { puntuacion: true },
            _count: { idCalificacion: true }
        });

        return {
            promedio: agregacion._avg.puntuacion || 0,
            total: agregacion._count.idCalificacion || 0
        };
    },

    async _getTopUsersByRole(roleNames, limit = 5) {
        try {
            const possibleNames = Array.isArray(roleNames)
                ? roleNames.map(n => n.toUpperCase().trim())
                : [roleNames.toUpperCase().trim()];

            console.log(`[TOP RANKING] Buscando top para roles: ${possibleNames.join(', ')}`);

            // Obtenemos TODOS los usuarios calificados con sus roles
            const allRatedUsers = await prisma.$queryRaw`
                SELECT 
                    u.idUsuarios, 
                    u.nombre, 
                    u.email, 
                    u.fotoPerfil, 
                    u.telefono,
                    r.nombre as rolNombre,
                    AVG(c.puntuacion) as promedioEstrellas,
                    COUNT(c.idCalificacion) as totalResenas
                FROM Usuarios u
                JOIN Calificaciones c ON u.idUsuarios = c.idCalificado
                JOIN Roles r ON u.idRol = r.idRol
                GROUP BY u.idUsuarios, u.nombre, u.email, u.fotoPerfil, u.telefono, r.nombre
                ORDER BY promedioEstrellas DESC, totalResenas DESC
            `;

            console.log(`[TOP RANKING] Total usuarios calificados encontrados: ${allRatedUsers.length}`);
            allRatedUsers.forEach(u => {
                console.log(`  - ${u.nombre} | Rol: "${u.rolNombre}" | Promedio: ${u.promedioEstrellas} | Reseñas: ${u.totalResenas}`);
            });

            // Convertir BigInt a Number (MySQL raw queries devuelven BigInt)
            const serializable = allRatedUsers.map(user => {
                const converted = {};
                for (const [key, value] of Object.entries(user)) {
                    if (typeof value === 'bigint') {
                        converted[key] = Number(value);
                    } else {
                        converted[key] = value;
                    }
                }
                return converted;
            });

            // Filtramos en JS para mayor flexibilidad
            const filtered = serializable
                .filter(u => {
                    const dbRole = (u.rolNombre || "").toUpperCase().trim();
                    return possibleNames.some(name => dbRole.includes(name));
                })
                .slice(0, limit)
                .map(user => ({
                    ...user,
                    promedioEstrellas: parseFloat(Number(user.promedioEstrellas || 0).toFixed(2)),
                    totalResenas: Number(user.totalResenas || 0)
                }));

            console.log(`[TOP RANKING] Filtrados para ${possibleNames.join(', ')}: ${filtered.length} usuarios`);

            return filtered;
        } catch (error) {
            console.error("Error en _getTopUsersByRole (queryRaw):", error);
            return [];
        }
    },

    async getTopRepartidores(limit = 5) {
        return this._getTopUsersByRole(['REPARTIDOR', 'REPARTIDOR'], limit);
    },

    async getTopClientes(limit = 5) {
        return this._getTopUsersByRole(['CLIENTE', 'CUSTOMER'], limit);
    }
};

module.exports = calificacionesService;
