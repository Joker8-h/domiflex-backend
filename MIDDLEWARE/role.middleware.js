/**
 * Middleware de autorización basado en roles
 * @param {Array<string>} allowedRoles - Array de roles permitidos (ej: ['ADMIN', 'REPARTIDOR'])
 * @returns {Function} Middleware function
 */
const authorize = (allowedRoles = []) => {
    return (req, res, next) => {
        // Validar que el usuario esté autenticado
        if (!req.user) {
            console.log("RoleMiddleware: Usuario no autenticado (req.user es undefined)");
            return res.status(401).json({
                error: "No autorizado. Token no proporcionado o inválido."
            });
        }

        // Si no se especifican roles, solo requiere autenticación
        if (allowedRoles.length === 0) {
            return next();
        }

        // Normalizar roles permitidos a mayúsculas
        const normalizedAllowedRoles = allowedRoles.map(role => role.toUpperCase().trim());

        // Obtener y normalizar el rol del usuario
        // El token puede traer 'rol' como string ("ADMIN") o el objeto podría estar estructurado diferente
        let rawUserRole = req.user.rol;

        // Si por alguna razón es un objeto (ej: { nombre: "ADMIN" }), tratamos de sacar el nombre
        if (rawUserRole && typeof rawUserRole === 'object' && rawUserRole.nombre) {
            rawUserRole = rawUserRole.nombre;
        }

        const userRole = rawUserRole ? String(rawUserRole).toUpperCase().trim() : null;

        // Validar que el usuario tenga un rol
        if (!userRole) {
            console.log("RoleMiddleware: Usuario autenticado pero sin rol definido en el token", req.user);
            return res.status(403).json({
                error: "Usuario sin rol asignado. Por favor contacte al administrador."
            });
        }

        // Verificar si el rol del usuario está en los roles permitidos
        if (!normalizedAllowedRoles.includes(userRole)) {
            console.log(`RoleMiddleware: Acceso denegado. Rol usuario: '${userRole}', Roles permitidos: [${normalizedAllowedRoles.join(', ')}]`);
            return res.status(403).json({
                error: "Acceso prohibido. No tienes el rol necesario.",
                details: {
                    yourRole: userRole,
                    requiredRoles: normalizedAllowedRoles
                }
            });
        }

        // Usuario autorizado
        next();
    };
};

module.exports = authorize;

