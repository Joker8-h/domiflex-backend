const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "secreto_super_seguro";
const notificacionesService = require("./NotificacionesService");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class SocketService {
    constructor() {
        this.io = null;
        this.connectedUsers = new Map(); // userId -> { socketId, role, nombre }
    }

    init(server) {
        this.io = new Server(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        this.io.use((socket, next) => {
            const token = socket.handshake.auth.token || socket.handshake.query.token;
            if (!token) {
                return next(new Error("Authentication error: No token provided"));
            }

            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                socket.user = decoded;
                next();
            } catch (err) {
                return next(new Error("Authentication error: Invalid token"));
            }
        });

        this.io.on("connection", (socket) => {
            const { id, rol, nombre } = socket.user;

            console.log(`Usuario conectado: ${nombre || 'Usuario'} (${rol}) - Socket: ${socket.id}`);

            this.connectedUsers.set(id, {
                socketId: socket.id,
                role: rol,
                nombre: nombre || 'Usuario',
                connectedAt: new Date()
            });

            // Registrar inicio de sesión en BD
            this.registrarInicioSesion(id).then(sesionId => {
                socket.sesionId = sesionId;
            });


            // Notificar y Guardar para Admins
            this.notifyAdmins("user_connected", {
                id,
                nombre: nombre || 'Usuario',
                rol,
                socketId: socket.id
            }, "Nueva Conexión", `${nombre || 'Usuario'} se ha conectado al sistema.`);

            socket.on("disconnect", () => {
                const userInfo = this.connectedUsers.get(id);
                console.log(`Usuario desconectado: ${userInfo?.nombre || 'Usuario'} - Socket: ${socket.id}`);
                this.connectedUsers.delete(id);

                // Registrar fin de sesión
                if (socket.sesionId) {
                    this.registrarFinSesion(socket.sesionId);
                }

                this.notifyAdmins("user_disconnected", {
                    id,
                    nombre: userInfo?.nombre || 'Usuario'
                }, "Usuario Desconectado", `${userInfo?.nombre || 'Usuario'} ha salido del sistema.`);
            });

            // ── Lógica de Pedidos en Tiempo Real ──────────────────────────────────

            // Evento para unirse a un pedido específico (sala)
            socket.on("join_pedido", (data) => {
                const { idPedido } = data;
                if (!idPedido) return;
                
                const roomName = `pedido_${idPedido}`;
                socket.join(roomName);
                console.log(`Usuario ${nombre} se unió al pedido: ${roomName}`);
                
                // Notificar a los demás en la sala (opcional)
                socket.to(roomName).emit("user_joined_pedido", {
                    userId: id,
                    nombre: nombre,
                    rol: rol
                });
            });

            // Evento para abandonar la sala del pedido
            socket.on("leave_pedido", (data) => {
                const { idPedido } = data;
                if (idPedido) {
                    socket.leave(`pedido_${idPedido}`);
                    console.log(`Usuario ${nombre} salió del pedido: pedido_${idPedido}`);
                }
            });

            // Evento para que el repartidor envíe su ubicación
            socket.on("repartidor_location_update", (data) => {
                const { idPedido, lat, lng, rumbo } = data;
                
                if (!idPedido || !lat || !lng) return;

                // Solo permitir si el usuario es repartidor (seguridad básica)
                // Nota: En una app real, verificaríamos que sea EL repartidor asignado a ese pedido
                if (rol !== "REPARTIDOR") return;

                const roomName = `pedido_${idPedido}`;
                
                // Reenviar ubicación a todos los clientes en la sala
                this.io.to(roomName).emit("location_updated", {
                    idPedido,
                    lat,
                    lng,
                    rumbo,
                    timestamp: new Date()
                });
                
                console.log(`Ubicación enviada pedido ${idPedido}: ${lat}, ${lng}`);
            });

        });

        console.log("Socket.io inicializado correctamente");
    }

    async notifyAdmins(event, data, dbTitle, dbMessage) {
        if (!this.io) return;

        // 1. Emitir en tiempo real
        for (const [userId, userInfo] of this.connectedUsers.entries()) {
            if (userInfo.role === "ADMIN") {
                this.io.to(userInfo.socketId).emit(event, data);
            }
        }

        // 2. Persistir en la base de datos para todos los administradores
        if (dbTitle && dbMessage) {
            try {
                const admins = await prisma.usuarios.findMany({
                    where: { rol: { nombre: 'ADMIN' } },
                    select: { idUsuarios: true }
                });

                for (const admin of admins) {
                    await notificacionesService.crearNotificacion({
                        idUsuario: admin.idUsuarios,
                        titulo: dbTitle,
                        mensaje: dbMessage,
                        tipo: "SISTEMA"
                    });
                }
            } catch (error) {
                console.error("Error al persistir notificación para admins:", error.message);
            }
        }
    }

    async notifyUser(userId, event, data, dbTitle, dbMessage, type = "SISTEMA") {
        if (!this.io) return;

        // 1. Emitir en tiempo real si está conectado
        const userInfo = this.connectedUsers.get(parseInt(userId));
        if (userInfo) {
            this.io.to(userInfo.socketId).emit(event, data);
        }

        // 2. Persistir en la base de datos
        if (dbTitle && dbMessage) {
            try {
                await notificacionesService.crearNotificacion({
                    idUsuario: parseInt(userId),
                    titulo: dbTitle,
                    mensaje: dbMessage,
                    tipo: type
                });
            } catch (error) {
                console.error(`Error al persistir notificación para usuario ${userId}:`, error.message);
            }
        }
    }

    getOnlineUsers() {
        return Array.from(this.connectedUsers.entries()).map(([id, info]) => ({
            id,
            nombre: info.nombre,
            role: info.role,
            connectedAt: info.connectedAt
        }));
    }

    async notifyNewRegistration(user) {
        const payload = {
            id: user.idUsuarios,
            nombre: user.nombre,
            email: user.email,
            rol: user.rol?.nombre || 'USUARIO',
            fecha: new Date()
        };

        this.notifyAdmins(
            "new_user_registration",
            payload,
            "Nuevo Registro",
            `Se ha registrado un nuevo usuario: ${user.nombre} (${user.rol?.nombre || 'USUARIO'})`
        );
    }

    async notifyNewDocument(user) {
        const payload = {
            id: user.id || user.idUsuarios,
            nombre: user.nombre || 'Usuario',
            fecha: new Date()
        };

        this.notifyAdmins(
            "new_document_uploaded",
            payload,
            "Nueva Documentación",
            `${user.nombre || 'Un usuario'} ha subido nueva documentación para revisión.`
        );
    }

    async registrarInicioSesion(userId) {
        try {
            const sesion = await prisma.sesionesUsuario.create({
                data: { idUsuario: userId }
            });
            return sesion.idSesion;
        } catch (error) {
            console.error("Error al registrar inicio de sesión:", error.message);
            return null;
        }
    }

    async registrarFinSesion(sesionId) {
        try {
            const sesion = await prisma.sesionesUsuario.findUnique({
                where: { idSesion: sesionId }
            });

            if (sesion) {
                const fin = new Date();
                const duracionSegundos = Math.floor((fin - sesion.inicio) / 1000);

                await prisma.sesionesUsuario.update({
                    where: { idSesion: sesionId },
                    data: {
                        fin,
                        duracionSegundos
                    }
                });
            }
        } catch (error) {
            console.error("Error al registrar fin de sesión:", error.message);
        }
    }
}


module.exports = new SocketService();
