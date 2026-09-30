const prisma = require("../lib/prisma");

const rolesService = {
    // Obtener todos los roles
    async getAllRoles() {
        return await prisma.roles.findMany({
            include: {
                _count: {
                    select: { usuarios: true }
                }
            }
        });
    },

    // Obtener rol por ID
    async getRoleById(id) {
        return await prisma.roles.findUnique({
            where: { idRol: parseInt(id) },
            include: {
                _count: {
                    select: { usuarios: true }
                }
            }
        });
    },

    // Buscar rol por nombre
    async getRoleByNombre(nombre) {
        return await prisma.roles.findUnique({
            where: { nombre: nombre.toUpperCase() }
        });
    },

    // Crear nuevo rol
    async createRole(data) {
        return await prisma.roles.create({
            data: {
                nombre: data.nombre.toUpperCase()
            }
        });
    },

    // Actualizar rol
    async updateRole(id, data) {
        return await prisma.roles.update({
            where: { idRol: parseInt(id) },
            data: {
                nombre: data.nombre.toUpperCase()
            }
        });
    },

    // Eliminar rol
    async deleteRole(id) {
        // Verificar si hay usuarios con este rol
        const usuarios = await prisma.usuarios.count({
            where: { idRol: parseInt(id) }
        });

        if (usuarios > 0) {
            throw new Error(`No se puede eliminar el rol. Hay ${usuarios} usuario(s) asignado(s) a este rol.`);
        }

        return await prisma.roles.delete({
            where: { idRol: parseInt(id) }
        });
    }
};

module.exports = rolesService;
