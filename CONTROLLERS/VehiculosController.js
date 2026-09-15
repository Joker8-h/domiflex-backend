const vehiculosService = require("../SERVICES/VehiculosService");
const cloudinaryService = require("../SERVICES/CloudinaryService");
const aiService = require("../SERVICES/AiObjectRecognitionService");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const vehiculosController = {
    async create(req, res) {
        try {
            const { marca, modelo, placa, capacidad, tipo, fotoPlaca, fotoAuto1, fotoAuto2, fotoAuto3 } = req.body;

            const idUsuario = req.user.id;

            let fotoPlacaUrl = null;
            let fotoAuto1Url = null;
            let fotoAuto2Url = null;
            let fotoAuto3Url = null;

            if (fotoPlaca) {
                try {
                    fotoPlacaUrl = await cloudinaryService.subirImagen(fotoPlaca, "vehiculos");
                } catch (err) {
                    console.error("[VEHICULOS] Error al subir foto de placa a Cloudinary:", err.message);
                }
            }
            if (fotoAuto1) {
                try {
                    fotoAuto1Url = await cloudinaryService.subirImagen(fotoAuto1, "vehiculos");
                } catch (err) {
                    console.error("[VEHICULOS] Error al subir foto auto 1 a Cloudinary:", err.message);
                }
            }
            if (fotoAuto2) {
                try {
                    fotoAuto2Url = await cloudinaryService.subirImagen(fotoAuto2, "vehiculos");
                } catch (err) {
                    console.error("[VEHICULOS] Error al subir foto auto 2 a Cloudinary:", err.message);
                }
            }
            if (fotoAuto3) {
                try {
                    fotoAuto3Url = await cloudinaryService.subirImagen(fotoAuto3, "vehiculos");
                } catch (err) {
                    console.error("[VEHICULOS] Error al subir foto auto 3 a Cloudinary:", err.message);
                }
            }

            const nuevoVehiculo = await vehiculosService.create({
                idUsuario,
                marca,
                modelo,
                placa,
                tipo,
                capacidad: parseInt(capacidad),
                fotoPlaca: fotoPlacaUrl,
                fotoAuto1: fotoAuto1Url,
                fotoAuto2: fotoAuto2Url,
                fotoAuto3: fotoAuto3Url
            });
            res.json(nuevoVehiculo);
        } catch (error) {
            res.json({ error: error.message });
        }
    },

    async getMyVehiculos(req, res) {
        try {
            const idUsuario = req.user.id;
            const vehiculos = await vehiculosService.findByUser(idUsuario);
            res.json(vehiculos);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getAll(req, res) {
        try {
            const vehiculos = await vehiculosService.findAll();
            res.json(vehiculos);
        } catch (error) {
            res.json({ error: error.message });
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;
            const idUsuario = req.user.id;
            const userRole = req.user.rol;
            const physical = req.query.physical === 'true';

            await vehiculosService.delete(id, idUsuario, userRole, physical);
            res.json({ message: `Vehículo ${physical ? 'eliminado permanentemente' : 'desactivado'} correctamente` });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    async cambiarEstado(req, res) {
        try {
            const { id } = req.params;
            const { estado } = req.body;
            const idUsuario = req.user.id;

            const vehiculoActualizado = await vehiculosService.actualizarEstado(id, idUsuario, estado);
            res.json({ mensaje: `Vehículo ${estado.toLowerCase()} correctamente`, vehiculo: vehiculoActualizado });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    async getById(req, res) {
        try {
            const { id } = req.params;
            const vehiculo = await vehiculosService.getById(id);
            if (!vehiculo) return res.status(404).json({ error: "Vehículo no encontrado" });
            res.json(vehiculo);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async validarPlacaAdmin(req, res) {
        try {
            const { id } = req.params;
            const { validada } = req.body;

            const vehiculo = await vehiculosService.validarPlacaManual(id, validada);
            res.json({ mensaje: "Estado de placa actualizado", vehiculo });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    async extraerPlaca(req, res) {
        try {
            const { fotoPlaca } = req.body;
            if (!fotoPlaca) return res.status(400).json({ error: "Falta la foto de la placa" });

            // 1. Subir a Cloudinary temporalmente o usar una carpeta específica
            console.log("[VEHICULOS] Subiendo foto de placa a Cloudinary...");
            const fotoUrl = await cloudinaryService.subirImagen(fotoPlaca, "temp_plates");
            console.log("[VEHICULOS] Foto de placa cargada a Cloudinary exitosamente:", fotoUrl);

            // 2. Analizar con IA
            console.log("[VEHICULOS] Llamando a aiService.verificarPlaca...");
            const result = await aiService.verificarPlaca(fotoUrl);
            console.log("[VEHICULOS] Resultado de la IA:", result);

            res.json({
                plate_text: result.plate_text,
                is_detected: result.is_detected,
                fotoUrl: fotoUrl
            });
        } catch (error) {
            console.error("[VEHICULOS] Error al extraer placa:", error);
            res.status(500).json({
                error: "Error al procesar la imagen de la placa",
                details: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    },

    // Solicitud de cambio de vehículo (Repartidor)
    async solicitarCambio(req, res) {
        try {
            const { id } = req.params;
            const { marca, modelo, capacidad, tipo, placaNueva, fotoPlaca, fotoAuto1, fotoAuto2, fotoAuto3 } = req.body;

            let fp = null, fa1 = null, fa2 = null, fa3 = null;
            if (fotoPlaca) fp = await cloudinaryService.subirImagen(fotoPlaca, "vehicle_changes");
            if (fotoAuto1) fa1 = await cloudinaryService.subirImagen(fotoAuto1, "vehicle_changes");
            if (fotoAuto2) fa2 = await cloudinaryService.subirImagen(fotoAuto2, "vehicle_changes");
            if (fotoAuto3) fa3 = await cloudinaryService.subirImagen(fotoAuto3, "vehicle_changes");

            const solicitud = await vehiculosService.crearSolicitudCambio(id, {
                marca, modelo, capacidad, tipo, placaNueva,
                fotoPlacaNuevaUrl: fp,
                fotoAuto1NuevaUrl: fa1,
                fotoAuto2NuevaUrl: fa2,
                fotoAuto3NuevaUrl: fa3
            });

            // Notificar a los administradores
            const socketService = require("../SERVICES/SocketService");
            socketService.notifyAdmins(
                "new_vehicle_change_request",
                {
                    idSolicitud: solicitud.idSolicitud,
                    repartidor: req.user.nombre,
                    fecha: solicitud.fechaSolicitud
                },
                "Solicitud de Cambio de Vehículo",
                `El repartidor ${req.user.nombre} ha solicitado modificar los datos de su vehículo.`
            );

            res.json({ mensaje: "Solicitud de cambio enviada para aprobación del administrador", solicitud });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    // Ver todas las solicitudes (Admin)
    async getSolicitudesCambio(req, res) {
        try {
            const { estado } = req.query;
            const solicitudes = await vehiculosService.getSolicitudesCambio(estado);
            res.json(solicitudes);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Aprobar/Rechazar solicitud (Admin)
    async procesarSolicitud(req, res) {
        try {
            const { id } = req.params;
            const { aprobado, observaciones } = req.body;
            const resultado = await vehiculosService.procesarSolicitudCambio(id, aprobado, observaciones);

            // Notificar al repartidor
            const socketService = require("../SERVICES/SocketService");
            const solicitudCompleta = await prisma.solicitudCambioVehiculo.findUnique({
                where: { idSolicitud: parseInt(id) },
                include: { vehiculo: true }
            });

            if (solicitudCompleta && solicitudCompleta.vehiculo) {
                const titulo = aprobado ? "Solicitud Aprobada" : "Solicitud Rechazada";
                const mensaje = aprobado
                    ? `Tu solicitud de cambio para el vehículo ${solicitudCompleta.vehiculo.marca} ha sido aprobada.`
                    : `Tu solicitud de cambio para el vehículo ${solicitudCompleta.vehiculo.marca} ha sido rechazada. Motivo: ${observaciones || 'No especificado'}`;

                socketService.notifyUser(
                    solicitudCompleta.vehiculo.idUsuario,
                    "vehicle_change_processed",
                    { idSolicitud: id, aprobado, observaciones },
                    titulo,
                    mensaje,
                    aprobado ? "SISTEMA" : "ALERTA"
                );
            }

            res.json({ mensaje: `Solicitud ${aprobado ? 'aprobada' : 'rechazada'} correctamente`, resultado });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    // Obtener conteo de solicitudes pendientes (Admin)
    async getSolicitudesPendientesCount(req, res) {
        try {
            const count = await prisma.solicitudCambioVehiculo.count({
                where: { estado: 'PENDIENTE' }
            });
            res.json({ count });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = vehiculosController;
