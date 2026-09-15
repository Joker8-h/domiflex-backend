const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const notificacionesService = require("./NotificacionesService");
const aiService = require("./AiObjectRecognitionService");

const documentacionService = {

  // Crear o actualizar documentación por usuario (SIN UNIQUE)
  async upsertDocumentacion(idUsuario, data) {
    if (!idUsuario) {
      throw new Error("idUsuario es obligatorio");
    }

    // Buscar si ya existe documentación del usuario
    const existente = await prisma.documentacion.findFirst({
      where: {
        idUsuario: Number(idUsuario),
      },
      orderBy: {
        fechaSubida: "desc", // toma la más reciente
      },
    });

    // --- LÓGICA DE IA (OCR Y FRAUDE) ---
    console.log("[DocumentacionService] Evaluando IA. Tipo:", data.tipoDocumento, "URL:", data.imagenFrontalUrl ? "SI" : "NO");
    const aiService = require("./AiObjectRecognitionService");
    let initialEstado = "PENDIENTE";
    let initialObservaciones = "Documentación en proceso de revisión.";
    let datosOcr = null;

    // Aceptar tanto "LICENCIA" como "LICENCIA_CONDUCCION"
    const esLicencia = data.tipoDocumento === "LICENCIA" || data.tipoDocumento === "LICENCIA_CONDUCCION" || data.tipoDocumento === "LICENCIA_CONDUCCION";

    if (esLicencia && data.imagenFrontalUrl) {
      console.log(`[DocumentacionService] >>> DISPARANDO IA para ${data.tipoDocumento} <<<`);
      try {
        const validacion = await aiService.verificarAutenticidad(data.imagenFrontalUrl);
        datosOcr = validacion.extracted_data;

        // Autocompletar campos si la IA los encontró y no venían en el request
        if (validacion.extracted_data?.numerolic && !data.numeroDocumento) {
          data.numeroDocumento = validacion.extracted_data.numerolic;
        }
        if (validacion.extracted_data?.fechaexpedicion && !data.fechaExpedicion) {
          data.fechaExpedicion = validacion.extracted_data.fechaexpedicion;
        }

        if (validacion.sospecha_fraude) {
          const missing = validacion.missing_items.join(", ");
          console.log(`[DocumentacionService] RECHAZANDO por IA: faltan [${missing}]`);
          throw new Error(`Documento incompleto o ilegible. No se detectaron: ${missing}. Por favor, toma una foto más clara.`);
        } else if (validacion.confianza > 0.95) {
          initialEstado = "APROBADO";
          initialObservaciones = "APROBACIÓN AUTOMÁTICA IA: Documento verificado con alta confianza.";
        }
      } catch (aiError) {
        console.error("[DocumentacionService] Error en validación IA:", aiError.message);
        throw aiError; // Re-lanzar para que el controlador lo maneje
      }
    }

    if (existente) {
      // UPDATE
      console.log(`[DocumentacionService] Actualizando documento existente ID: ${existente.idDocumentacion}`);
      return await prisma.documentacion.update({
        where: { idDocumentacion: existente.idDocumentacion },
        data: {
          tipoDocumento: data.tipoDocumento,
          numeroDocumento: data.numeroDocumento || existente.numeroDocumento,
          fechaExpedicion: data.fechaExpedicion || existente.fechaExpedicion,
          imagenFrontalUrl: data.imagenFrontalUrl,
          estado: initialEstado,
          observaciones: initialObservaciones,
          datosOcr: datosOcr,
          fechaSubida: new Date(),
        },
      });
    }

    // CREATE
    console.log(`[DocumentacionService] Creando nuevo registro de documentación para usuario: ${idUsuario}`);
    return await prisma.documentacion.create({
      data: {
        idUsuario: Number(idUsuario),
        tipoDocumento: data.tipoDocumento,
        numeroDocumento: data.numeroDocumento || "PENDIENTE_EXTRAER",
        fechaExpedicion: data.fechaExpedicion || "PENDIENTE_EXTRAER",
        imagenFrontalUrl: data.imagenFrontalUrl,
        estado: initialEstado,
        observaciones: initialObservaciones,
        datosOcr: datosOcr,
        fechaSubida: new Date(),
      },
    });
  },

  // Obtener documentación por ID de usuario
  async getByUsuarioId(idUsuario) {
    if (!idUsuario) {
      throw new Error("idUsuario es obligatorio");
    }

    return await prisma.documentacion.findMany({
      where: {
        idUsuario: Number(idUsuario),
      },
      orderBy: {
        fechaSubida: "desc",
      },
      include: {
        usuario: {
          select: {
            idUsuarios: true,
            nombre: true,
            email: true,
            rol: true,
          },
        },
      },
    });
  },

  // Cambiar estado (ADMIN)
  async updateEstado(idDocumentacion, estado, observaciones) {
    if (!idDocumentacion) {
      throw new Error("idDocumentacion es obligatorio");
    }

    if (!estado) {
      throw new Error("estado es obligatorio");
    }

    const actualizada = await prisma.documentacion.update({
      where: {
        idDocumentacion: Number(idDocumentacion),
      },
      data: {
        estado,
        observaciones: observaciones || null,
      },
    });

    // NOTIFICACIÓN AUTOMÁTICA
    try {
      await notificacionesService.crearNotificacion({
        idUsuario: actualizada.idUsuario,
        titulo: `Documentación ${estado === 'APROBADO' ? 'Aprobada' : 'Rechazada'}`,
        mensaje: estado === 'APROBADO'
          ? "¡Felicidades! Tu documentación ha sido aprobada. Ya puedes empezar a realizar pedidos."
          : `Tu documentación ha sido rechazada. Motivo: ${observaciones || 'No especificado'}. Por favor, vuelve a subirla correctamente.`,
        tipo: "SISTEMA"
      });
    } catch (notifError) {
      console.error("Error al crear notificación de documentación:", notifError.message);
    }

    return actualizada;
  },

  async getById(id) {
    return await prisma.documentacion.findUnique({
      where: {
        idDocumentacion: Number(id),
      },
      include: {
        usuario: {
          select: {
            idUsuarios: true,
            nombre: true,
            email: true,
            rol: true,
          },
        },
      },
    });
  },

  // Obtener toda la documentación (ADMIN)
  async getAll() {
    return await prisma.documentacion.findMany({
      orderBy: {
        fechaSubida: "desc",
      },
      include: {
        usuario: {
          select: {
            idUsuarios: true,
            nombre: true,
            email: true,
            rol: true,
          },
        },
      },
    });
  },
};

module.exports = documentacionService;
