const documentacionService = require("../SERVICES/DocumentacionService");
const cloudinaryService = require("../SERVICES/CloudinaryService");

const documentacionController = {

    // Subir o actualizar documentación (usuario autenticado)
    async upload(req, res) {
        console.log("[DocumentacionController] Entrando a la función upload...");
        try {
            // Validar autenticación
            const idUsuario = req.user.id;
            console.log("[DocumentacionController] Body recibido:", { ...req.body, imagenFrontal: req.body.imagenFrontal ? "(BASE64_DATA)" : "AUSENTE" });
            const data = req.body;

            // Validaciones básicas
            if (!data.tipoDocumento) {
                console.log("[DocumentacionController] ERROR: falta tipoDocumento");
                return res.status(400).json({
                    error: "Faltan campos obligatorios (tipoDocumento)"
                });
            }

            // Si viene una imagen en base64 (como en Moviflex_con_React), la subimos a Cloudinary
            if (data.imagenFrontal && !data.imagenFrontalUrl) {
                console.log("[DocumentacionController] Detectada imagen Base64, subiendo a Cloudinary...");
                try {
                    data.imagenFrontalUrl = await cloudinaryService.subirImagen(data.imagenFrontal, "documentacion");
                    console.log("[DocumentacionController] Imagen cargada a Cloudinary exitosamente:", data.imagenFrontalUrl);
                } catch (error) {
                    console.error("[DocumentacionController] Error subiendo imagen a Cloudinary:", error.message);
                }
            } else {
                console.log("[DocumentacionController] No se requiere carga a Cloudinary (ya hay URL o no hay Base64)");
            }

            // Normalizar campos obligatorios si no vienen pero hay OCR
            const doc = await documentacionService.upsertDocumentacion(
                idUsuario,
                data
            );

            // Mapear respuesta para el frontend (Moviflex_con_React espera datosLicencia)
            const response = {
                message: "Documentación guardada exitosamente",
                doc,
                datosLicencia: doc.datosOcr ? {
                    nombre: doc.datosOcr.nombre || "No detectado",
                    identificacion: doc.datosOcr.numerolic || "No detectado",
                    fechaExpedicion: doc.datosOcr.fechaexpedicion || null,
                    categoria: doc.datosOcr.categoria || "B1"
                } : null
            };

            console.log("[DocumentacionController] Enviando respuesta exitosa al frontend...");

            // Notificar a los admins en tiempo real
            try {
                const socketService = require("../SERVICES/SocketService");
                socketService.notifyNewDocument({ id: idUsuario, nombre: req.user.nombre || 'Usuario' });
            } catch (socketErr) {
                console.error("Error al notificar documento:", socketErr.message);
            }

            res.status(200).json(response);

        } catch (error) {
            console.error("ERROR REAL ", error);

            // Si es un error de validación de la IA o campos faltantes
            if (error.message.includes("Documento incompleto") || error.message.includes("ilegible")) {
                return res.status(400).json({
                    error: error.message
                });
            }

            res.status(500).json({
                error: "Error al guardar la documentación",
                detalle: error.message
            });
        }
    },

    // Obtener mis documentos
    async getMyDocs(req, res) {
        try {
            if (!req.user || !req.user.id) {
                return res.status(401).json({
                    error: "Usuario no autenticado"
                });
            }

            const idUsuario = req.user.id;
            const docs = await documentacionService.getByUsuarioId(idUsuario);

            if (!docs || docs.length === 0) {
                return res.json({
                    message: "No se encontró documentación para este usuario"
                });
            }

            res.status(200).json(docs);

        } catch (error) {
            console.error("ERROR REAL ", error);
            res.status(500).json({
                error: "Error al obtener documentación",
                detalle: error.message
            });
        }
    },

    // Validar documentación (ADMIN)
    async validate(req, res) {
        try {
            const { id } = req.params;
            const { estado, observaciones } = req.body;

            if (!id) {
                return res.status(400).json({
                    error: "idDocumentacion es obligatorio"
                });
            }

            if (!['APROBADO', 'RECHAZADO'].includes(estado)) {
                return res.status(400).json({
                    error: "Estado inválido. Debe ser APROBADO o RECHAZADO"
                });
            }

            const doc = await documentacionService.updateEstado(
                id,
                estado,
                observaciones
            );

            res.status(200).json({
                message: `Documentación marcada como ${estado}`,
                doc
            });

        } catch (error) {
            console.error("ERROR REAL ", error);
            res.status(500).json({
                error: "Error al validar documentación",
                detalle: error.message
            });
        }
    },

    async getById(req, res) {
        try {
            const { id } = req.params;
            const doc = await documentacionService.getById(id);
            if (!doc) return res.status(404).json({ error: "Documentación no encontrada" });
            res.json(doc);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Obtener documentación de un usuario específico (ADMIN)
    async getByUserIdAdmin(req, res) {
        try {
            const { idUsuario } = req.params;
            if (!idUsuario) {
                return res.status(400).json({ error: "idUsuario es obligatorio" });
            }
            const docs = await documentacionService.getByUsuarioId(idUsuario);
            if (!docs || docs.length === 0) {
                return res.json({ message: "No se encontró documentación para este usuario" });
            }
            res.status(200).json(docs);
        } catch (error) {
            console.error("ERROR REAL ", error);
            res.status(500).json({
                error: "Error al obtener documentación del usuario",
                detalle: error.message
            });
        }
    },

    // Obtener toda la documentación (ADMIN)
    async getAll(req, res) {
        try {
            const docs = await documentacionService.getAll();
            // Siempre array: el frontend espera lista (vacía = sin registros)
            return res.status(200).json(Array.isArray(docs) ? docs : []);
        } catch (error) {
            console.error("ERROR REAL ", error);
            res.status(500).json({
                error: "Error al obtener la documentación general",
                detalle: error.message
            });
        }
    }
};

module.exports = documentacionController;
