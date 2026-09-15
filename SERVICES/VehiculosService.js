const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const aiService = require("./AiObjectRecognitionService");

const vehiculosService = {
    // Crear un nuevo vehículo
    async create(data) {
        // Verificar si la placa ya existe
        const existe = await prisma.vehiculos.findUnique({
            where: { placa: data.placa }
        });
        if (existe) {
            throw new Error("Ya existe un vehículo con esa placa.");
        }

        // Validación automática de placa vía IA
        if (data.fotoPlaca) {
            try {
                // Usamos el servicio de IA para verificar la placa
                const validacion = await aiService.verificarPlaca(data.fotoPlaca);

                if (validacion.is_detected && validacion.plate_text) {
                    const placaLimpiaIngresada = data.placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
                    const placaLimpiaDetectada = validacion.plate_text.replace(/[^A-Z0-9]/gi, '').toUpperCase();

                    // Si la placa detectada contiene a la ingresada o viceversa
                    if (placaLimpiaDetectada.includes(placaLimpiaIngresada) || placaLimpiaIngresada.includes(placaLimpiaDetectada)) {
                        data.placaValidada = true;
                        console.log(`[VEHICULOS] Placa ${data.placa} validada automáticamente por IA.`);
                    }
                }
            } catch (err) {
                console.warn("[VEHICULOS] No se pudo validar la placa por IA (servicio lento o caído):", err.message);
                // No lanzamos error para permitir que el registro continúe y sea validado manualmente por Admin
            }
        }

        return await prisma.vehiculos.create({
            data
        });
    },

    // Obtener vehículos de un usuario específico
    async findByUser(idUsuario) {
        return await prisma.vehiculos.findMany({
            where: { idUsuario: idUsuario, estado: 'ACTIVO' },
            include: { usuario: { select: { nombre: true } } }
        });
    },

    // Obtener todos los vehículos (Admin)
    async findAll() {
        return await prisma.vehiculos.findMany({
            include: { usuario: { select: { nombre: true, email: true } } }
        });
    },

    // Eliminar un vehículo (Soporta lógico y físico)
    async delete(idVehiculo, idUsuario, userRole, physical = false) {
        // Verificar existencia
        const vehiculo = await prisma.vehiculos.findUnique({
            where: { idVehiculos: parseInt(idVehiculo) }
        });

        if (!vehiculo) throw new Error("Vehículo no encontrado");

        // Validar permisos: Debe ser el dueño o ADMIN
        if (vehiculo.idUsuario !== idUsuario && userRole !== 'ADMIN') {
            throw new Error("No tienes permiso para eliminar este vehículo");
        }

        if (physical) {
            // Eliminación física
            return await prisma.vehiculos.delete({
                where: { idVehiculos: parseInt(idVehiculo) }
            });
        }

        // Eliminación lógica (por defecto)
        return await prisma.vehiculos.update({
            where: { idVehiculos: parseInt(idVehiculo) },
            data: { estado: 'INACTIVO' }
        });
    },

    // Actualizar estado de un vehículo (Activar/Desactivar)
    async actualizarEstado(idVehiculo, idUsuario, nuevoEstado) {
        const vehiculo = await prisma.vehiculos.findUnique({
            where: { idVehiculos: parseInt(idVehiculo) }
        });

        if (!vehiculo) throw new Error("Vehículo no encontrado");

        // Validar que el usuario sea el dueño (esto se puede expandir si hay roles de admin específicos por vehículo)
        if (vehiculo.idUsuario !== idUsuario) {
            // Se asume que el controller puede validar si es ADMIN antes de llamar
        }

        if (!['ACTIVO', 'INACTIVO'].includes(nuevoEstado)) {
            throw new Error("Estado no válido. Use 'ACTIVO' o 'INACTIVO'.");
        }

        return await prisma.vehiculos.update({
            where: { idVehiculos: parseInt(idVehiculo) },
            data: { estado: nuevoEstado }
        });
    },

    // Obtener un vehículo por su ID
    async getById(idVehiculo) {
        return await prisma.vehiculos.findUnique({
            where: { idVehiculos: parseInt(idVehiculo) },
            include: { usuario: { select: { nombre: true, email: true } } }
        });
    },

    // Validar placa de forma manual (Admin)
    async validarPlacaManual(idVehiculo, validada) {
        return await prisma.vehiculos.update({
            where: { idVehiculos: parseInt(idVehiculo) },
            data: { placaValidada: !!validada }
        });
    },

    // --- FLUJO DE APROBACIÓN DE CAMBIOS ---

    // Crear una solicitud de cambio de vehículo (Repartidor)
    async crearSolicitudCambio(idVehiculo, data) {
        // Verificar que el vehículo existe
        const vehiculo = await this.getById(idVehiculo);
        if (!vehiculo) throw new Error("Vehículo no encontrado");

        // Crear la solicitud
        return await prisma.solicitudCambioVehiculo.create({
            data: {
                idVehiculo: parseInt(idVehiculo),
                marcaNueva: data.marca,
                modeloNuevo: data.modelo,
                capacidadNueva: data.capacidad ? parseInt(data.capacidad) : undefined,
                fotoPlacaNuevaUrl: data.fotoPlacaNuevaUrl,
                fotoAuto1NuevaUrl: data.fotoAuto1NuevaUrl,
                fotoAuto2NuevaUrl: data.fotoAuto2NuevaUrl,
                fotoAuto3NuevaUrl: data.fotoAuto3NuevaUrl,
                estado: 'PENDIENTE'
            }
        });
    },

    // Obtener todas las solicitudes pendientes (Admin)
    async getSolicitudesCambio(estado = 'PENDIENTE') {
        return await prisma.solicitudCambioVehiculo.findMany({
            where: { estado },
            include: {
                vehiculo: {
                    include: {
                        usuario: { select: { nombre: true, email: true } }
                    }
                }
            },
            orderBy: { fechaSolicitud: 'desc' }
        });
    },

    // Procesar una solicitud (Aprobar/Rechazar)
    async procesarSolicitudCambio(idSolicitud, aprobado, observaciones = null) {
        const solicitud = await prisma.solicitudCambioVehiculo.findUnique({
            where: { idSolicitud: parseInt(idSolicitud) },
            include: { vehiculo: true }
        });

        if (!solicitud) throw new Error("Solicitud no encontrada");
        if (solicitud.estado !== 'PENDIENTE') throw new Error("Esta solicitud ya ha sido procesada");

        if (aprobado) {
            // 1. Actualizar el vehículo real (sin modificar la placa)
            await prisma.vehiculos.update({
                where: { idVehiculos: solicitud.idVehiculo },
                data: {
                    marca: solicitud.marcaNueva || undefined,
                    modelo: solicitud.modeloNuevo || undefined,
                    capacidad: solicitud.capacidadNueva || undefined,
                    fotoPlaca: solicitud.fotoPlacaNuevaUrl || undefined,
                    fotoAuto1: solicitud.fotoAuto1NuevaUrl || undefined,
                    fotoAuto2: solicitud.fotoAuto2NuevaUrl || undefined,
                    fotoAuto3: solicitud.fotoAuto3NuevaUrl || undefined
                }
            });

            // 2. Marcar solicitud como aprobada
            return await prisma.solicitudCambioVehiculo.update({
                where: { idSolicitud: parseInt(idSolicitud) },
                data: {
                    estado: 'APROBADO',
                    fechaRevision: new Date(),
                    observaciones: observaciones || "Cambios aplicados correctamente"
                }
            });
        } else {
            // Marcar solicitud como rechazada
            return await prisma.solicitudCambioVehiculo.update({
                where: { idSolicitud: parseInt(idSolicitud) },
                data: {
                    estado: 'RECHAZADO',
                    fechaRevision: new Date(),
                    observaciones: observaciones || "Solicitud rechazada por el administrador"
                }
            });
        }
    }
};

module.exports = vehiculosService;
